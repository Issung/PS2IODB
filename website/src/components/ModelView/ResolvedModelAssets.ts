import { AnimationData } from "../../model/AnimationData";
import { IconSys } from "../../model/IconSys";
import { IconState } from "./ModelLoader";

/**
 * Parsed model assets ready for Three.js loading.
 * All file references have been resolved to blob URLs.
 */
export class ResolvedModelAssets {
    constructor(
        /** OBJ file content as text */
        readonly objContent: string,
        /** Blob URL for the MTL file (with texture reference rewritten) */
        readonly mtlBlobUrl: string,
        /** Blob URL for the texture image */
        readonly textureBlobUrl: string,
        /** The filename of the texture (for display purposes) */
        readonly textureFilename: string,
        /** Animation data if available */
        readonly animContent: AnimationData | undefined,
        /** IconSys data */
        readonly iconSys: IconSys,
        /** Available states (with unique filenames) */
        readonly states: IconState[],
        /** Currently selected state */
        readonly currentState: IconState,
    ) {}

    /**
     * Revokes all blob URLs to prevent memory leaks.
     */
    dispose(): void {
        URL.revokeObjectURL(this.mtlBlobUrl);
        URL.revokeObjectURL(this.textureBlobUrl);
    }
}
