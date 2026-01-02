import { ModelFiles } from '../components/ModelView/ModelFiles';
import { iconFilesToModelFiles } from '../extractor';
import { SaveFiles } from './types';

/**
 * Convert stored save files to ModelFiles by re-parsing the raw icon binaries.
 * This is called when viewing a stored save.
 */
export function storedSaveToModelFiles(saveFiles: SaveFiles): ModelFiles {
    // Convert ArrayBuffer back to Uint8Array Map
    const iconFilesMap = new Map<string, Uint8Array>();
    for (const [filename, buffer] of Object.entries(saveFiles.iconFiles)) {
        iconFilesMap.set(filename, new Uint8Array(buffer));
    }

    return iconFilesToModelFiles(saveFiles.iconSys, iconFilesMap);
}

/**
 * Convert raw icon files to ModelFiles by parsing and generating OBJ/MTL/PNG/ANIM files.
 * Re-exported from extractor for convenience.
 */
export { iconFilesToModelFiles } from '../extractor';

