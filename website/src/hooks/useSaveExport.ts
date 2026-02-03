import JSZip from 'jszip';
import { useCallback } from 'react';
import { bmpToPngBlob } from '../extractor';
import { SaveFiles, StoredSave, storedSaveToModelFiles } from '../storage';
import { formatAnim, formatIconSys } from '../utils/JsonFormatter';

export interface UseSaveExportResult {
    /** Extract a save to a downloadable zip file. */
    extractToZip: (stored: StoredSave) => Promise<void>;
    /** Extract all saves to a single zip file with each save in its own folder. */
    extractAllToZip: (saves: StoredSave[]) => Promise<void>;
    /** Copy iconsys.json to clipboard. */
    copyIconSys: (stored: StoredSave) => Promise<void>;
    /** Copy the first .anim file to clipboard. */
    copyFirstAnim: (stored: StoredSave) => Promise<void>;
}

/**
 * Hook for exporting save data to zip files or clipboard.
 */
export function useSaveExport(): UseSaveExportResult {
    const extractToZip = useCallback(async (stored: StoredSave) => {
        if (stored.hasError || !stored.files) {
            console.error('Cannot extract save: no files available');
            return;
        }

        const zip = new JSZip();
        await addFilesToZip(zip, stored.files);
        await downloadZip(zip, createSaveBaseName(stored) + '.zip');
    }, []);

    const extractAllToZip = useCallback(async (saves: StoredSave[]) => {
        // Filter to only valid saves with files
        const validSaves = saves.filter(s => !s.hasError && s.files);
        if (validSaves.length === 0) {
            console.error('No valid saves to extract');
            return;
        }

        const zip = new JSZip();

        // Track folder names to handle duplicates (Windows-style: name, name (1), name (2), etc.)
        const folderNameCounts = new Map<string, number>();

        const getFolderName = (stored: StoredSave): string => {
            const baseName = createSaveBaseName(stored);
            const count = folderNameCounts.get(baseName) ?? 0;
            folderNameCounts.set(baseName, count + 1);

            if (count === 0) {
                return baseName;
            }
            return `${baseName} (${count})`;
        };

        for (const stored of validSaves) {
            if (!stored.files) continue;

            const folderName = getFolderName(stored);
            const folder = zip.folder(folderName);
            if (!folder) {
                console.warn(`Failed to create folder '${folderName}' in zip for save:`, stored);
                continue;
            }

            await addFilesToZip(folder, stored.files);
        }

        const now = new Date();
        const day = now.getDate();
        const month = now.toLocaleString('en-US', { month: 'short' });
        const year = now.getFullYear();
        const hour = now.getHours() % 12 || 12;
        const minute = now.getMinutes().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'pm' : 'am';
        const timestamp = `${day} ${month} ${year} ${hour}.${minute}${ampm}`;

        await downloadZip(zip, `PS2IODB Extracted Save Icons ${timestamp}.zip`);
    }, []);

    const copyIconSys = useCallback(async (stored: StoredSave) => {
        if (stored.hasError || !stored.files) {
            console.error('Cannot copy iconsys: no files available');
            return;
        }
        const modelFiles = storedSaveToModelFiles(stored.files);
        const json = formatIconSys(modelFiles.iconSys);
        await navigator.clipboard.writeText(json);
    }, []);

    const copyFirstAnim = useCallback(async (stored: StoredSave) => {
        if (stored.hasError || !stored.files) {
            console.error('Cannot copy anim: no files available');
            return;
        }
        const modelFiles = storedSaveToModelFiles(stored.files);
        // Find the first .anim file
        for (const [filename, blob] of Array.from(modelFiles.files.entries())) {
            if (filename.endsWith('.anim')) {
                const animContent = await blob.text();
                const animData = JSON.parse(animContent);
                const json = formatAnim(animData);
                await navigator.clipboard.writeText(json);
                return;
            }
        }
        console.error('No .anim file found');
    }, []);

    return {
        extractToZip,
        extractAllToZip,
        copyIconSys,
        copyFirstAnim,
    };
}

/**
 * Clean filename for use in export.
 * Some games have extra directories for the files which messes up our storage, e.g. Rayman Revolution.
 */
function cleanIconFilename(filename: string): string {
    return filename.replace(/\\/g, '_').replace(/\//g, '-');
}

/**
 * Generate a zip file and trigger a download with the given filename.
 */
async function downloadZip(zip: JSZip, filename: string): Promise<void> {
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Create a filesystem-safe base name for a save, combining directory and title.
 * Used for zip filenames and folder names within combined zips.
 */
function createSaveBaseName(stored: StoredSave): string {
    const safeDir = stored.directory.replace(/[\/\\:*?"<>|\0]/g, '_');
    const safeName = stored.title.replace(/[\/\\:*?"<>|\0]/g, ' ');
    return `${safeDir} ${safeName}`;
}

/** Processed file ready to be added to zip. */
interface ProcessedFile {
    /** Cleaned filename (e.g. "icon00.ico.png") */
    filename: string;
    /** File content */
    content: string | ArrayBuffer;
}

/**
 * Add all files from a save to a zip or folder.
 * Handles iconsys.json, OBJ, MTL, PNG, and ANIM files with proper formatting.
 * Deduplicates identical PNG textures to reduce zip size.
 * @param target can be either a zip or a folder in a zip, they use the same interface.
 */
async function addFilesToZip(target: JSZip, files: SaveFiles): Promise<void> {
    const modelFiles = storedSaveToModelFiles(files);

    // Add iconsys.json with compact formatting
    target.file('iconsys.json', formatIconSys(modelFiles.iconSys));

    // First pass: Process all files and collect them
    // BMP textures are converted to PNG to match existing icons on the site.
    // Clean filenames to handle games with subdirectories in icon paths
    const processedFiles = new Map<string, ProcessedFile>();

    const filePromises: Promise<void>[] = [];
    modelFiles.files.forEach((blob, filename) => {
        const promise = (async () => {
            let cleanedFilename = cleanIconFilename(filename);
            let content: string | ArrayBuffer = await blob.arrayBuffer();

            // For MTL files, update the texture reference to use PNG and cleaned filename
            if (filename.endsWith('.mtl')) {
                const mtlContent = await blob.text();
                content = mtlContent.replace(
                    /^(map_Kd\s+)(.+)$/m,
                    (_, prefix, texPath) => {
                        // Change .bmp to .png in the texture reference
                        const pngPath = texPath.replace(/\.bmp$/i, '.png');
                        return prefix + cleanIconFilename(pngPath);
                    }
                );
            }
            // For BMP files, convert to PNG for export
            else if (filename.endsWith('.bmp')) {
                const pngBlob = await bmpToPngBlob(blob);
                content = await pngBlob.arrayBuffer();
                cleanedFilename = cleanedFilename.replace(/\.bmp$/i, '.png');
            }
            // For ANIM files, reformat JSON with compact formatting
            else if (filename.endsWith('.anim')) {
                const animContent = await blob.text();
                const animData = JSON.parse(animContent);
                content = formatAnim(animData);
            }

            processedFiles.set(cleanedFilename, { filename: cleanedFilename, content });
        })();

        filePromises.push(promise);
    });

    await Promise.all(filePromises);

    // Second pass: Deduplicate identical PNG files
    // Find all PNG files and compute their hashes
    const pngFiles: string[] = [];
    const pngHashes: string[] = [];

    const processedEntries = Array.from(processedFiles.entries());
    for (const [filename, file] of processedEntries) {
        if (filename.endsWith('.png')) {
            pngFiles.push(filename);
            const hash = await hashArrayBuffer(file.content as ArrayBuffer);
            pngHashes.push(hash);
        }
    }

    // Find duplicates and build a map of which MTL files need their references updated
    const duplicates = findDuplicates(pngHashes);
    const mtlRemapping = new Map<string, string>(); // Map: duplicate MTL -> remaining MTL
    const filesToSkip = new Set<string>(); // PNG and MTL files to skip (duplicates)

    for (const [remainIdx, removeIdx] of duplicates) {
        const remainPng = pngFiles[remainIdx];
        const removePng = pngFiles[removeIdx];

        // Mark duplicate PNG and MTL for skipping
        filesToSkip.add(removePng);
        const removeMtl = removePng.replace(/\.png$/, '.mtl');
        filesToSkip.add(removeMtl);

        // Map the OBJ file's MTL reference to the remaining MTL
        const remainMtl = remainPng.replace(/\.png$/, '.mtl');
        mtlRemapping.set(removeMtl, remainMtl);
    }

    // Third pass: Add files to zip, updating OBJ mtllib references as needed
    for (const [filename, file] of processedEntries) {
        // Skip duplicate PNG and MTL files
        if (filesToSkip.has(filename)) {
            continue;
        }

        let content = file.content;

        // For OBJ files, check if the mtllib reference needs to be updated
        if (filename.endsWith('.obj') && typeof content === 'string') {
            content = content.replace(
                /^mtllib (.+)$/m,
                (match, mtlFilename) => {
                    const remappedMtl = mtlRemapping.get(mtlFilename);
                    return remappedMtl ? `mtllib ${remappedMtl}` : match;
                }
            );
        }

        target.file(filename, content);
    }
}

/**
 * Compute a hash of an ArrayBuffer for deduplication.
 * Uses SubtleCrypto SHA-256 when available, falls back to simple hash.
 */
async function hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
    if (crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: simple hash based on content
    const bytes = new Uint8Array(buffer);
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) - hash) + bytes[i];
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
}

/**
 * Find duplicates in a list of hashes.
 * Returns a list of [remainIndex, removeIndex] tuples.
 * Matches Python iconexport.py find_duplicates logic.
 */
function findDuplicates(hashes: string[]): Array<[number, number]> {
    const count = hashes.length;
    const duplicates: Array<[number, number]> = [];

    if (count === 1) {
        // No comparison needed
    } else if (count === 2) {
        if (hashes[0] === hashes[1]) {
            duplicates.push([0, 1]);
        }
    } else if (count === 3) {
        // Order matters: compare in specific order to "collapse" duplicates correctly
        if (hashes[1] === hashes[2]) {
            duplicates.push([1, 2]);
        }
        if (hashes[0] === hashes[2]) {
            duplicates.push([0, 2]);
        }
        if (hashes[0] === hashes[1]) {
            duplicates.push([0, 1]);
        }
    }

    return duplicates;
}