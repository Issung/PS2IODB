/**
 * PSU/EMS save file importer.
 * Handles loading and parsing PSU format save files.
 */

import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';
import { parsePS2Icon, PS2Icon } from '../ps2icon';
import { decodeTitle, IconSysData, parseIconSys } from '../ps2iconsys';
import { PS2MC_DIRENT_LENGTH, unpackDirEntry, modeIsDir } from '../ps2mcDir';
import { loadPsuSave } from '../ps2save';

/**
 * Importer for PSU/EMS format save files.
 */
export class PsuImporter implements SaveImporter {
    readonly name = 'PSU/EMS Save';

    /**
     * Check if this importer can handle the given file data.
     * PSU format has no magic - it's detected by valid directory entry structure.
     */
    handles(data: Uint8Array): boolean {
        if (data.length < PS2MC_DIRENT_LENGTH * 3) {
            return false;
        }

        try {
            const dirent = unpackDirEntry(data.subarray(0, PS2MC_DIRENT_LENGTH));
            const dotent = unpackDirEntry(data.subarray(PS2MC_DIRENT_LENGTH, PS2MC_DIRENT_LENGTH * 2));
            const dotdotent = unpackDirEntry(data.subarray(PS2MC_DIRENT_LENGTH * 2, PS2MC_DIRENT_LENGTH * 3));

            return modeIsDir(dirent.mode) &&
                   modeIsDir(dotent.mode) &&
                   modeIsDir(dotdotent.mode) &&
                   dirent.length >= 2 &&
                   dotent.name === '.' &&
                   dotdotent.name === '..';
        } catch {
            return false;
        }
    }

    /**
     * Load and parse a PSU format save file.
     */
    load(data: Uint8Array): ImportedSave[] {
        const save = loadPsuSave(data);

        let iconSys: IconSysData | null = null;
        const icons = new Map<string, PS2Icon>();

        // Find icon.sys
        const iconSysFile = save.files.find(f => f.entry.name === 'icon.sys');
        if (iconSysFile && iconSysFile.data.length === 964) {
            iconSys = parseIconSys(iconSysFile.data);

            // Parse each icon file
            const iconFiles = [iconSys.iconFileNormal, iconSys.iconFileCopy, iconSys.iconFileDelete];
            for (const iconFile of iconFiles) {
                if (iconFile && !icons.has(iconFile)) {
                    const iconFileEntry = save.files.find(f => f.entry.name === iconFile);
                    if (iconFileEntry && iconFileEntry.data.length > 0) {
                        try {
                            const icon = parsePS2Icon(iconFileEntry.data);
                            icons.set(iconFile, icon);
                        } catch (e) {
                            console.warn(`Failed to parse icon ${iconFile}:`, e);
                        }
                    }
                }
            }
        }

        // Get title
        let title = save.directory.name;
        if (iconSys) {
            const decoded = decodeTitle(iconSys.titleRaw, iconSys.titleLineOffset);
            title = decoded.line1 + (decoded.line2 ? ' ' + decoded.line2 : '');
        }

        return [{
            directoryName: save.directory.name,
            title,
            iconSys,
            icons
        }];
    }
}

