import JSZip from 'jszip';
import { useCallback } from 'react';
import { StoredSave, storedSaveToModelFiles } from '../storage';
import { formatAnim, formatIconSys } from '../utils/JsonFormatter';

/**
 * Clean filename for use in export.
 * Some games have extra directories for the files which messes up our storage, e.g. Rayman Revolution.
 * Matches Python iconexport.py clean_icon_filename function.
 */
function cleanIconFilename(filename: string): string {
    return filename.replace(/\\/g, '_').replace(/\//g, '-');
}

export interface UseSaveExportResult {
    /** Extract a save to a downloadable zip file. */
    extractToZip: (stored: StoredSave) => Promise<void>;
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

        // Convert to ModelFiles to get OBJ/MTL/PNG/ANIM files
        const modelFiles = storedSaveToModelFiles(stored.files);
        const iconSys = modelFiles.iconSys;

        // Create zip file with all model files
        const zip = new JSZip();

        // Add iconsys.json with compact formatting (arrays on single lines)
        zip.file('iconsys.json', formatIconSys(iconSys));

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
                    // Replace any texture references with cleaned filenames
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

                zip.file(cleanedFilename, content);
            })();
            filePromises.push(promise);
        });
        await Promise.all(filePromises);

        // Generate and download zip
        const zipContent = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        // Use directory name for the zip filename, sanitized for filesystem
        const safeDir = stored.directory.replace(/[\/\\:*?"<>|\0]/g, '_')
        const safeName = stored.title.replace(/[\/\\:*?"<>|\0]/g, ' ')
        a.download = `${safeDir} ${safeName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        copyIconSys,
        copyFirstAnim,
    };
}

