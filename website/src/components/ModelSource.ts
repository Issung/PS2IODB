import { IconSys } from "../model/IconSys";

/**
 * Represents a set of uploaded model files.
 * The OBJ file references the MTL file by name, and MTL references the texture.
 * We need all files to rewrite the references to blob URLs.
 */
export interface ModelFiles {
    /** Map of filename to File/Blob, e.g. { "icon00.ico.obj": File, "icon00.ico.mtl": File, ... } */
    files: Map<string, Blob>;
    
    /** The filename of the main OBJ file to load */
    objFilename: string;
    
    /** Optional IconSys data (for lighting, background colors, etc.) */
    iconSys?: IconSys;
}

/**
 * URL-based model source - fetches from server.
 */
export interface UrlModelSource {
    type: 'url';
    iconcode: string;
}

/**
 * File-based model source - uses uploaded files.
 */
export interface FileModelSource {
    type: 'files';
    files: ModelFiles;
}

/**
 * A model can be loaded from either a URL (existing behavior) or from uploaded files.
 */
export type ModelSource = UrlModelSource | FileModelSource;

/**
 * Parsed model assets ready for Three.js loading.
 * All file references have been resolved to blob URLs.
 */
export interface ResolvedModelAssets {
    /** Blob URL for the OBJ file (or the raw content) */
    objContent: string;
    
    /** Blob URL for the MTL file (with texture reference rewritten to blob URL) */
    mtlBlobUrl: string;
    
    /** Blob URL for the texture image */
    textureBlobUrl: string | undefined;
    
    /** The filename of the texture (for display purposes) */
    textureFilename: string | undefined;
    
    /** Animation data if available */
    animContent: string | undefined;
    
    /** IconSys data */
    iconSys: IconSys | undefined;
    
    /** Available variants (for URL mode, derived from iconsys) */
    variants: string[];
    
    /** Currently selected variant filename (without extension) */
    currentVariant: string;
}

/**
 * Helper function to extract the filename from a path or mtllib/map_Kd line.
 * e.g. "mtllib icon00.ico.mtl" -> "icon00.ico.mtl"
 * e.g. "map_Kd icon00.ico.png" -> "icon00.ico.png"
 */
export function extractFilename(line: string, prefix: string): string | undefined {
    if (line.startsWith(prefix)) {
        return line.substring(prefix.length).trim();
    }
    return undefined;
}

/**
 * Finds a file in the ModelFiles by filename (case-insensitive).
 */
export function findFileByName(files: ModelFiles, filename: string): Blob | undefined {
    // Try exact match first
    if (files.files.has(filename)) {
        return files.files.get(filename);
    }

    // Try case-insensitive match
    const lowerFilename = filename.toLowerCase();
    let result: Blob | undefined = undefined;
    files.files.forEach((value, key) => {
        if (key.toLowerCase() === lowerFilename) {
            result = value;
        }
    });

    return result;
}

/**
 * Reads a Blob as text.
 */
export async function readBlobAsText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });
}

/**
 * Resolves uploaded files into assets ready for Three.js loading.
 * Handles the OBJ → MTL → PNG reference chain by creating blob URLs.
 * @param modelFiles The uploaded model files
 * @param variantOverride Optional variant name to load (e.g., "icon01.ico"). If not specified, uses modelFiles.objFilename.
 */
export async function resolveModelFiles(modelFiles: ModelFiles, variantOverride?: string): Promise<ResolvedModelAssets> {
    const { files, iconSys } = modelFiles;

    // Determine which OBJ file to load
    const objFilename = variantOverride ? `${variantOverride}.obj` : modelFiles.objFilename;

    // 1. Read OBJ content
    const objBlob = findFileByName(modelFiles, objFilename);
    if (!objBlob) {
        throw new Error(`OBJ file not found: ${objFilename}`);
    }
    const objContent = await readBlobAsText(objBlob);

    // 2. Find MTL filename from OBJ content
    const mtllibLine = objContent.split('\n').find(l => l.startsWith('mtllib '));
    const mtlFilename = mtllibLine ? extractFilename(mtllibLine, 'mtllib ') : undefined;

    let mtlBlobUrl: string = '';
    let textureBlobUrl: string | undefined;
    let textureFilename: string | undefined;

    if (mtlFilename) {
        const mtlBlob = findFileByName(modelFiles, mtlFilename);
        if (mtlBlob) {
            let mtlContent = await readBlobAsText(mtlBlob);

            // 3. Find texture filename from MTL content
            const mapKdLine = mtlContent.split('\n').find(l => l.trim().startsWith('map_Kd '));
            if (mapKdLine) {
                textureFilename = extractFilename(mapKdLine.trim(), 'map_Kd ');
                if (textureFilename) {
                    const textureBlob = findFileByName(modelFiles, textureFilename);
                    if (textureBlob) {
                        textureBlobUrl = URL.createObjectURL(textureBlob);
                        // Remove the texture reference from MTL - we'll apply it manually after loading
                        // This avoids MTLLoader's path resolution issues with blob URLs
                        mtlContent = mtlContent.replace(mapKdLine, '# map_Kd removed for blob loading');
                    }
                }
            }

            // Create blob URL for the modified MTL content
            const mtlBlobContent = new Blob([mtlContent], { type: 'text/plain' });
            mtlBlobUrl = URL.createObjectURL(mtlBlobContent);
        }
    }

    // 4. Try to find animation file (same name as OBJ but with .anim extension)
    const animFilename = objFilename.replace(/\.obj$/i, '.anim');
    const animBlob = findFileByName(modelFiles, animFilename);
    const animContent = animBlob ? await readBlobAsText(animBlob) : undefined;

    // 5. Derive variant name from OBJ filename (remove extension)
    const currentVariant = objFilename.replace(/\.obj$/i, '');

    // 6. Find all available variants from uploaded files
    // If iconSys is present, use its variants; otherwise, detect from .obj files
    let variants: string[];
    if (iconSys) {
        variants = Array.from(new Set([iconSys.normal, iconSys.copy, iconSys.delete]));
    } else {
        // Find all .obj files and extract variant names
        variants = Array.from(files.keys())
            .filter(name => name.toLowerCase().endsWith('.obj'))
            .map(name => name.replace(/\.obj$/i, ''));
    }

    return {
        objContent,
        mtlBlobUrl,
        textureBlobUrl,
        textureFilename: textureFilename?.replace(/\.[^.]+$/, ''), // Remove extension for display
        animContent,
        iconSys,
        variants,
        currentVariant
    };
}

/**
 * Revokes all blob URLs in a ResolvedModelAssets to prevent memory leaks.
 */
export function revokeModelAssets(assets: ResolvedModelAssets): void {
    if (assets.mtlBlobUrl) {
        URL.revokeObjectURL(assets.mtlBlobUrl);
    }
    if (assets.textureBlobUrl) {
        URL.revokeObjectURL(assets.textureBlobUrl);
    }
}

