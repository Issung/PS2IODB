import { SaveFiles } from './types';

/**
 * Convert stored save files back to a Map<string, Blob> for use with ModelFiles.
 */
export function storedFilesToBlobMap(files: SaveFiles['files']): Map<string, Blob> {
    const blobMap = new Map<string, Blob>();

    for (const [filename, data] of Object.entries(files)) {
        if (typeof data === 'string') {
            blobMap.set(filename, new Blob([data], { type: 'text/plain' }));
        } else {
            const type = filename.endsWith('.png') ? 'image/png' : 'application/octet-stream';
            blobMap.set(filename, new Blob([data], { type }));
        }
    }

    return blobMap;
}

