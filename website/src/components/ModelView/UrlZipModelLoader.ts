import JSZip from "jszip";
import { AnimationData } from "../../model/AnimationData";
import { IconSys } from "../../model/IconSys";
import { groupStatesByFilename, IconState, ModelLoader } from "./ModelLoader";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

/**
 * URL-based model loader that loads from a single zip file per icon.
 * Used in production/release mode to reduce the number of HTTP requests, and also
 * reduce the amount of files in a deployment, due to cloudflare's 20,000 file limit.
 * Each icon directory contains an "icon.zip" file with all the icon assets.
 */
export class UrlZipModelLoader implements ModelLoader {
    private iconcode: string;
    private iconSys: IconSys;
    private filesMap: Map<string, Blob>;
    private currentAssets: ResolvedModelAssets | undefined;

    private constructor(iconcode: string, iconSys: IconSys, filesMap: Map<string, Blob>) {
        this.iconcode = iconcode;
        this.iconSys = iconSys;
        this.filesMap = filesMap;
    }

    /**
     * Create a UrlZipModelLoader instance by fetching and extracting the icon.zip.
     * @param iconcode The iconcode to load
     * @returns A fully initialized UrlZipModelLoader instance
     */
    static async create(iconcode: string): Promise<UrlZipModelLoader> {
        const url = `/icons/${iconcode}/icon.zip`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch icon.zip: ${response.status}`);
        }

        // Check content type to detect SPA fallback (404 returning HTML)
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('application/zip')) {
            throw new Error(`Unexpected content type for icon.zip: ${contentType}`);
        }

        const zipData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);
        const filesMap = new Map<string, Blob>();
        let iconSys: IconSys | undefined;

        // Extract all files from the zip
        const filePromises: Promise<void>[] = [];

        zip.forEach((filename, zipEntry) => {
            const promise = (async () => {
                if (filename === 'iconsys.json') {
                    const text = await zipEntry.async('text');
                    if (!text.startsWith('{')) {
                        throw new Error('iconsys.json is not valid JSON');
                    }
                    iconSys = JSON.parse(text) as IconSys;
                } else if (filename.endsWith('.png')) {
                    const blob = await zipEntry.async('blob');
                    filesMap.set(filename, new Blob([blob], { type: 'image/png' }));
                } else {
                    const blob = await zipEntry.async('blob');
                    filesMap.set(filename, blob);
                }
            })();

            filePromises.push(promise);
        });

        await Promise.all(filePromises);

        if (!iconSys) {
            throw new Error('iconsys.json not found in the zip archive');
        }

        return new UrlZipModelLoader(iconcode, iconSys, filesMap);
    }

    getIconSys(): IconSys {
        return this.iconSys;
    }

    getStates(): IconState[] {
        return groupStatesByFilename(this.iconSys.normal, this.iconSys.copy, this.iconSys.delete);
    }

    getDefaultState(): IconState {
        return this.getStates()[0];
    }

    async loadState(state: IconState): Promise<ResolvedModelAssets> {
        this.currentAssets?.dispose();
        this.currentAssets = await this.resolveState(state);
        return this.currentAssets;
    }

    dispose(): void {
        this.currentAssets?.dispose();
        this.currentAssets = undefined;
    }

    private async resolveState(state: IconState): Promise<ResolvedModelAssets> {
        const icoFilename = state.filename;
        const objFilename = `${icoFilename}.obj`;
        const animFilename = `${icoFilename}.anim`;

        // 1. Load and parse OBJ file
        const objBlob = this.requireFile(objFilename, 'OBJ file');
        const objContent = await this.readBlobAsText(objBlob);

        // 2. Find MTL filename from OBJ content (mtllib directive)
        const mtllibLine = objContent.split('\n').find(l => l.startsWith('mtllib '));
        const mtlFilename = mtllibLine?.substring('mtllib '.length).trim();
        if (!mtlFilename) {
            throw new Error(`OBJ file ${objFilename} does not specify an MTL file (missing mtllib directive)`);
        }

        const mtlBlob = this.requireFile(mtlFilename, 'MTL file');
        let mtlContent = await this.readBlobAsText(mtlBlob);

        // 3. Find texture filename from MTL content (map_Kd directive)
        const mapKdLine = mtlContent.split('\n').find(l => l.trim().startsWith('map_Kd '));
        if (!mapKdLine) {
            throw new Error(`MTL file ${mtlFilename} does not specify a texture (missing map_Kd directive)`);
        }

        const textureFilename = mapKdLine.trim().substring('map_Kd '.length).trim();
        if (!textureFilename) {
            throw new Error(`MTL file ${mtlFilename} has empty map_Kd directive`);
        }

        const textureBlob = this.requireFile(textureFilename, 'Texture file');
        const textureBlobUrl = URL.createObjectURL(textureBlob);

        // Remove texture reference from MTL - we apply it manually
        mtlContent = mtlContent.replace(mapKdLine, '# map_Kd removed for blob loading');
        const mtlBlobContent = new Blob([mtlContent], { type: 'text/plain' });
        const mtlBlobUrl = URL.createObjectURL(mtlBlobContent);

        // 4. Animation is optional
        const animBlob = this.findFile(animFilename);
        let animContent: AnimationData | undefined;
        if (animBlob) {
            const animText = await this.readBlobAsText(animBlob);
            if (animText.startsWith('{')) {
                animContent = JSON.parse(animText) as AnimationData;
            }
        }

        return new ResolvedModelAssets(
            objContent,
            mtlBlobUrl,
            textureBlobUrl,
            textureFilename.replace(/\.[^.]+$/, ''),
            animContent,
            this.iconSys,
            this.getStates(),
            state,
        );
    }

    private findFile(filename: string): Blob | undefined {
        if (this.filesMap.has(filename)) {
            return this.filesMap.get(filename);
        }
        const lowerFilename = filename.toLowerCase();
        let result: Blob | undefined = undefined;
        this.filesMap.forEach((value, key) => {
            if (key.toLowerCase() === lowerFilename) {
                result = value;
            }
        });
        return result;
    }

    private requireFile(filename: string, description: string): Blob {
        const blob = this.findFile(filename);
        if (!blob) {
            throw new Error(`${description} not found: ${filename}`);
        }
        return blob;
    }

    private async readBlobAsText(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
        });
    }
}

