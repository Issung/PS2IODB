import JSZip from "jszip";
import { IconSys } from "../model/IconSys";

/**
 * Represents a set of uploaded model files.
 * Requires an iconsys.json file which defines the variants and their filenames.
 */
export class ModelFiles {
    constructor(
        /** Map of filename to File/Blob, e.g. { "icon00.ico.obj": File, "icon00.ico.mtl": File, ... } */
        readonly files: Map<string, Blob>,
        /** IconSys data from iconsys.json - required for file-based loading */
        readonly iconSys: IconSys,
    ) {}
}

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
        readonly textureBlobUrl: string | undefined,
        /** The filename of the texture (for display purposes) */
        readonly textureFilename: string | undefined,
        /** Animation data if available */
        readonly animContent: string | undefined,
        /** IconSys data */
        readonly iconSys: IconSys | undefined,
        /** Available variants */
        readonly variants: string[],
        /** Currently selected variant filename (without extension) */
        readonly currentVariant: string,
    ) {}

    /**
     * Revokes all blob URLs to prevent memory leaks.
     */
    dispose(): void {
        if (this.mtlBlobUrl) {
            URL.revokeObjectURL(this.mtlBlobUrl);
        }
        if (this.textureBlobUrl) {
            URL.revokeObjectURL(this.textureBlobUrl);
        }
    }
}

/**
 * Interface for loading model data from various sources.
 * Implementations handle the specifics of URL-based vs file-based loading,
 * but present a unified interface to the rest of the application.
 */
export interface ModelLoader {
    /**
     * Load the initial data and return the available variants.
     * This should be called first before loadVariant().
     */
    initialize(): Promise<void>;

    /**
     * Get the IconSys data for this model (lighting, background colors, etc.).
     */
    getIconSys(): IconSys | undefined;

    /**
     * Get the list of available variants for this model.
     */
    getVariants(): string[];

    /**
     * Get the current/default variant name.
     */
    getDefaultVariant(): string;

    /**
     * Load a specific variant and return the resolved assets.
     * @param variant The variant name to load (e.g., "icon00.ico")
     */
    loadVariant(variant: string): Promise<ResolvedModelAssets>;

    /**
     * Clean up any resources (blob URLs, etc.).
     */
    dispose(): void;
}

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

        let mtlBlobUrl = '';
        let textureBlobUrl: string | undefined;
        let textureFilename: string | undefined;

        if (mtlFilename) {
            // Fetch MTL content
            const mtlResponse = await fetch(`${baseUrl}/${mtlFilename}`);
            if (mtlResponse.ok) {
                let mtlContent = await mtlResponse.text();

                // Find texture reference
                const mapKdLine = mtlContent.split('\n').find(l => l.trim().startsWith('map_Kd '));
                if (mapKdLine) {
                    textureFilename = mapKdLine.trim().substring('map_Kd '.length).trim();
                    if (textureFilename) {
                        // Fetch texture and create blob URL
                        const textureResponse = await fetch(`${baseUrl}/${textureFilename}`);
                        if (textureResponse.ok) {
                            const textureBlob = await textureResponse.blob();
                            textureBlobUrl = URL.createObjectURL(textureBlob);
                        }
                        // Remove texture reference from MTL (we apply it manually)
                        mtlContent = mtlContent.replace(mapKdLine, '# map_Kd removed for blob loading');
                    }
                }

                // Create blob URL for MTL
                const mtlBlob = new Blob([mtlContent], { type: 'text/plain' });
                mtlBlobUrl = URL.createObjectURL(mtlBlob);
            }
        }

        // Fetch animation data
        let animContent: string | undefined;
        try {
            const animResponse = await fetch(`${baseUrl}/${variant}.anim`);
            if (animResponse.ok) {
                animContent = await animResponse.text();
                if (!animContent.startsWith('{')) {
                    animContent = undefined;
                }
            }
        } catch {
            // Animation not available
        }

        this.currentAssets = new ResolvedModelAssets(
            objContent,
            mtlBlobUrl,
            textureBlobUrl,
            textureFilename?.replace(/\.[^.]+$/, ''),
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
        const textureFilename = mapKdLine?.trim().substring('map_Kd '.length).trim();

        let textureBlobUrl: string | undefined;
        if (textureFilename) {
            const textureBlob = this.requireFile(textureFilename, 'Texture file');
            textureBlobUrl = URL.createObjectURL(textureBlob);
            // Remove texture reference from MTL - we apply it manually to avoid MTLLoader path issues
            mtlContent = mtlContent.replace(mapKdLine!, '# map_Kd removed for blob loading');
        }

        const mtlBlobContent = new Blob([mtlContent], { type: 'text/plain' });
        const mtlBlobUrl = URL.createObjectURL(mtlBlobContent);

        // 4. Animation is optional
        const animBlob = this.findFile(animFilename);
        const animContent = animBlob ? await this.readBlobAsText(animBlob) : undefined;

        return new ResolvedModelAssets(
            objContent,
            mtlBlobUrl,
            textureBlobUrl,
            textureFilename?.replace(/\.[^.]+$/, ''),
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

