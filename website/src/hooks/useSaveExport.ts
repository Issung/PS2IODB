import JSZip from 'jszip';
import { useCallback } from 'react';
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

/**
 * Add all files from a save to a zip or folder.
 * Handles iconsys.json, OBJ, MTL, PNG, and ANIM files with proper formatting.
 * @param target can be either a zip or a folder in a zip, they use the same interface.
 */
async function addFilesToZip(target: JSZip, files: SaveFiles): Promise<void> {
    const modelFiles = storedSaveToModelFiles(files);

    // Add iconsys.json with compact formatting
    target.file('iconsys.json', formatIconSys(modelFiles.iconSys));

    // Add all model files (OBJ, MTL, PNG, ANIM)
    // Clean filenames to handle games with subdirectories in icon paths
    const filePromises: Promise<void>[] = [];
    modelFiles.files.forEach((blob, filename) => {
        const promise = (async () => {
            const cleanedFilename = cleanIconFilename(filename);
            let content: string | ArrayBuffer = await blob.arrayBuffer();

            // For MTL files, update the texture reference to use the cleaned filename
            if (filename.endsWith('.mtl')) {
                const mtlContent = await blob.text();
                content = mtlContent.replace(
                    /^(map_Kd\s+)(.+)$/m,
                    (_, prefix, texPath) => prefix + cleanIconFilename(texPath)
                );
            }
            // For ANIM files, reformat JSON with compact formatting
            else if (filename.endsWith('.anim')) {
                const animContent = await blob.text();
                const animData = JSON.parse(animContent);
                content = formatAnim(animData);
            }

            target.file(cleanedFilename, content);
        })();
        
        filePromises.push(promise);
    });

    await Promise.all(filePromises);
}