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
    private iconSys: IconSys | undefined;
    private currentAssets: ResolvedModelAssets | undefined;

    constructor(iconcode: string) {
        this.iconcode = iconcode;
    }

    async initialize(): Promise<void> {
        const url = `/icons/${this.iconcode}/iconsys.json`;
        const response = await fetch(url);
        const text = await response.text();

        if (text.startsWith('{')) {
            this.iconSys = JSON.parse(text) as IconSys;
        } else {
            throw new Error(`IconSys JSON response did not start with '{'.`);
        }
    }

    getIconSys(): IconSys | undefined {
        return this.iconSys;
    }

    getVariants(): string[] {
        if (!this.iconSys) return [];
        return Array.from(new Set([this.iconSys.normal, this.iconSys.copy, this.iconSys.delete]));
    }

    getDefaultVariant(): string {
        return this.iconSys?.normal ?? '';
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

        // Fetch and parse animation data
        let animContent: AnimationData | undefined;
        try {
            const animResponse = await fetch(`${baseUrl}/${variant}.anim`);
            if (animResponse.ok) {
                const contentType = animResponse.headers.get('content-type');
                if (contentType?.startsWith('application/json')) {
                    // Explicit JSON content-type
                    animContent = await animResponse.json() as AnimationData;
                } else if (contentType === null || contentType.length === 0) {
                    // No content-type header (e.g., cached response), fall back to text check
                    const animText = await animResponse.text();
                    if (animText.startsWith('{')) {
                        animContent = JSON.parse(animText) as AnimationData;
                    }
                }
                // If content-type is present but not JSON (e.g., text/html from SPA fallback), skip
            }
        } catch {
            // Animation not available or failed to parse
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
}