import { ExtractedSave } from '.';
import { parsePS2Icon, PS2Icon } from '../ps2icon';
import { decodeTitle, IconSysData, parseIconSys } from '../ps2iconsys';
import { loadPsuSave } from '../ps2save';

/**
 * Static class for importing PSU format save files.
 */
export class PsuImporter {
    /**
     * Load and parse a PSU format save file.
     */
    static load(data: Uint8Array): ExtractedSave {
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

        return {
            directoryName: save.directory.name,
            title,
            iconSys,
            icons
        };
    }
}

