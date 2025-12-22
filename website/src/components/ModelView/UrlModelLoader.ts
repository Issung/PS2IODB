import { AnimationData } from "../../model/AnimationData";
import { IconSys } from "../../model/IconSys";
import { ModelLoader } from "./ModelLoader";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

/**
 * URL-based model loader.
 * Fetches model data from the server using the iconcode.
 */
export class UrlModelLoader implements ModelLoader {
    private iconcode: string;
    private iconSys: IconSys;
    private currentAssets: ResolvedModelAssets | undefined;

    private constructor(iconcode: string, iconSys: IconSys) {
        this.iconcode = iconcode;
        this.iconSys = iconSys;
    }

    /**
     * Create a UrlModelLoader instance by fetching the iconSys data.
     * @param iconcode The iconcode to load
     * @returns A fully initialized UrlModelLoader instance
     */
    static async create(iconcode: string): Promise<UrlModelLoader> {
        const url = `/icons/${iconcode}/iconsys.json`;
        const iconSys = await UrlModelLoader.fetchJson<IconSys>(url);
        return new UrlModelLoader(iconcode, iconSys);
    }

    getIconSys(): IconSys {
        return this.iconSys;
    }

    getVariants(): string[] {
        return Array.from(new Set([this.iconSys.normal, this.iconSys.copy, this.iconSys.delete]));
    }

    getDefaultVariant(): string {
        return this.iconSys.normal;
    }

    async loadVariant(variant: string): Promise<ResolvedModelAssets> {
        this.currentAssets?.dispose();

        const baseUrl = `/icons/${this.iconcode}`;
        
        // Fetch OBJ content
        const objResponse = await fetch(`${baseUrl}/${variant}.obj`);
        if (!objResponse.ok) {
            throw new Error(`Failed to fetch OBJ file: ${objResponse.status}`);
        }
        const objContent = await objResponse.text();

        // Parse MTL filename from OBJ
        const mtllibLine = objContent.split('\n').find(l => l.startsWith('mtllib '));
        const mtlFilename = mtllibLine?.substring('mtllib '.length).trim();

        if (!mtlFilename) {
            throw new Error(`OBJ file does not specify an MTL file (missing mtllib directive)`);
        }

        // Fetch MTL content
        const mtlResponse = await fetch(`${baseUrl}/${mtlFilename}`);
        if (!mtlResponse.ok) {
            throw new Error(`Failed to fetch MTL file: ${mtlResponse.status}`);
        }
        let mtlContent = await mtlResponse.text();

        // Find texture reference
        const mapKdLine = mtlContent.split('\n').find(l => l.trim().startsWith('map_Kd '));
        if (!mapKdLine) {
            throw new Error(`MTL file does not specify a texture (missing map_Kd directive)`);
        }

        const textureFilename = mapKdLine.trim().substring('map_Kd '.length).trim();
        if (!textureFilename) {
            throw new Error(`MTL file has empty map_Kd directive`);
        }

        // Fetch texture and create blob URL
        const textureResponse = await fetch(`${baseUrl}/${textureFilename}`);
        if (!textureResponse.ok) {
            throw new Error(`Failed to fetch texture file: ${textureResponse.status}`);
        }
        const textureBlob = await textureResponse.blob();
        const textureBlobUrl = URL.createObjectURL(textureBlob);

        // Remove texture reference from MTL (we apply it manually)
        mtlContent = mtlContent.replace(mapKdLine, '# map_Kd removed for blob loading');

        // Create blob URL for MTL
        const mtlBlob = new Blob([mtlContent], { type: 'text/plain' });
        const mtlBlobUrl = URL.createObjectURL(mtlBlob);

        // Fetch and parse animation data (optional)
        let animContent: AnimationData | undefined;
        try {
            animContent = await UrlModelLoader.fetchJson<AnimationData>(`${baseUrl}/${variant}.anim`);
        } catch {
            // Animation not available
        }

        this.currentAssets = new ResolvedModelAssets(
            objContent,
            mtlBlobUrl,
            textureBlobUrl,
            textureFilename.replace(/\.[^.]+$/, ''),
            animContent,
            this.iconSys,
            this.getVariants(),
            variant,
        );

        return this.currentAssets;
    }

    dispose(): void {
        this.currentAssets?.dispose();
        this.currentAssets = undefined;
    }

    /**
     * Fetches JSON from a URL, with checks to avoid parsing non-JSON responses (e.g., SPA fallback HTML).
     * @param url The URL to fetch
     * @returns The parsed JSON
     * @throws Error if the response is not valid JSON
     */
    private static async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType?.startsWith('application/json')) {
            // Explicit JSON content-type
            return await response.json() as T;
        } else if (contentType === null || contentType.length === 0) {
            // No content-type header (e.g., cached response), fall back to text check
            const text = await response.text();
            if (text.startsWith('{')) {
                return JSON.parse(text) as T;
            }
        }
        // Content-type is present but not JSON (e.g., text/html from SPA fallback)
        throw new Error(`Response from ${url} is not JSON`);
    }
}