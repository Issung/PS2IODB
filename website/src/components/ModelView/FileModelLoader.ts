import JSZip from "jszip";
import { AnimationData } from "../../model/AnimationData";
import { IconSys } from "../../model/IconSys";
import { ModelLoader } from "./ModelLoader";
import { ModelFiles } from "./ModelFiles";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

/**
 * File-based model loader.
 * Uses uploaded files from the user.
 * Requires iconSys to be present in the model files.
 */
export class FileModelLoader implements ModelLoader {
    private modelFiles: ModelFiles;
    private currentAssets: ResolvedModelAssets | undefined;

    constructor(modelFiles: ModelFiles) {
        this.modelFiles = modelFiles;
    }

    /**
     * Create a FileModelLoader from a zip file.
     * The zip must contain iconsys.json and the referenced .obj, .mtl, .png files.
     * Animation files (.anim) are optional.
     * @param file The zip file to load
     * @returns A FileModelLoader instance ready to use
     */
    static async fromZipFile(file: File): Promise<FileModelLoader> {
        const zip = await JSZip.loadAsync(file);
        const filesMap = new Map<string, Blob>();
        let iconSys: IconSys | undefined;

        // Extract all files from the zip
        const filePromises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;

            // Get just the filename (handle nested folders)
            const filename = relativePath.split('/').pop() || relativePath;

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

        // Require iconsys.json
        if (!iconSys) {
            throw new Error('iconsys.json not found in the zip archive. This file is required.');
        }

        return new FileModelLoader(new ModelFiles(filesMap, iconSys));
    }

    async initialize(): Promise<void> {
        // Load the default variant
        this.currentAssets = await this.resolveVariant(this.modelFiles.iconSys.normal);
    }

    getIconSys(): IconSys {
        return this.modelFiles.iconSys;
    }

    getVariants(): string[] {
        const iconSys = this.modelFiles.iconSys;
        return Array.from(new Set([iconSys.normal, iconSys.copy, iconSys.delete]));
    }

    getDefaultVariant(): string {
        return this.modelFiles.iconSys.normal;
    }

    async loadVariant(variant: string): Promise<ResolvedModelAssets> {
        this.currentAssets?.dispose();

        this.currentAssets = await this.resolveVariant(variant);
        return this.currentAssets;
    }

    dispose(): void {
        this.currentAssets?.dispose();
        this.currentAssets = undefined;
    }

    /**
     * Resolves a variant from uploaded files into assets ready for Three.js.
     * Reads file references from OBJ/MTL content to find the correct files.
     */
    private async resolveVariant(variant: string): Promise<ResolvedModelAssets> {
        const { iconSys } = this.modelFiles;
        const objFilename = `${variant}.obj`;
        const animFilename = `${variant}.anim`;

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
        // Remove texture reference from MTL - we apply it manually to avoid MTLLoader path issues
        mtlContent = mtlContent.replace(mapKdLine, '# map_Kd removed for blob loading');

        const mtlBlobContent = new Blob([mtlContent], { type: 'text/plain' });
        const mtlBlobUrl = URL.createObjectURL(mtlBlobContent);

        // 4. Animation is optional - parse JSON to AnimationData
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
            iconSys,
            this.getVariants(),
            variant,
        );
    }

    /**
     * Finds a file in the files map by filename (case-insensitive).
     */
    private findFile(filename: string): Blob | undefined {
        const files = this.modelFiles.files;
        if (files.has(filename)) {
            return files.get(filename);
        }

        const lowerFilename = filename.toLowerCase();
        let result: Blob | undefined = undefined;
        files.forEach((value, key) => {
            if (key.toLowerCase() === lowerFilename) {
                result = value;
            }
        });

        return result;
    }

    /**
     * Finds a file in the files map by filename (case-insensitive).
     * Throws an error if the file is not found.
     */
    private requireFile(filename: string, description: string): Blob {
        const blob = this.findFile(filename);
        if (!blob) {
            throw new Error(`${description} not found: ${filename}`);
        }
        return blob;
    }

    /**
     * Reads a Blob as text.
     */
    private async readBlobAsText(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
        });
    }
}