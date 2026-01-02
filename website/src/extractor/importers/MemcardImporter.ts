/**
 * PS2 Memory Card importer.
 * Handles loading and parsing PS2 memory card images.
 */

import { IconSys } from '../../model/IconSys';
import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';
import { parseIconSys } from '../ps2iconsys';
import { PS2MC_MAGIC, PS2MemoryCard, SaveInfo } from '../ps2mc';

/**
 * Importer for PS2 memory card images.
 */
export class MemcardImporter implements SaveImporter {
    readonly name = 'PS2 Memory Card';

    /**
     * Check if this importer can handle the given file data.
     */
    handles(data: Uint8Array): boolean {
        if (data.length < 28) {
            return false;
        }
        const magic = new TextDecoder('ascii').decode(data.subarray(0, 28));
        return magic === PS2MC_MAGIC || magic.startsWith('Sony PS2 Memory Card Format');
    }

    /**
     * Load and parse a PS2 memory card image.
     */
    load(data: Uint8Array): ImportedSave[] {
        const mc = new PS2MemoryCard(data.buffer as ArrayBuffer);
        const saves = mc.getSaveDirectories();
        const results: ImportedSave[] = [];

        for (const save of saves) {
            const extracted = this.extractSaveData(mc, save);
            if (extracted) {
                results.push(extracted);
            }
        }

        return results;
    }

    /**
     * Extract icon data from a save on the memory card.
     */
    private extractSaveData(mc: PS2MemoryCard, save: SaveInfo): ImportedSave | null {
        try {
            let iconSys: IconSys | null = null;
            const iconFiles = new Map<string, Uint8Array>();

            console.log(`Processing save: ${save.directory.name}, files:`, save.files.map(f => f.name));

            // Find and parse icon.sys (case insensitive)
            const iconSysData = mc.readFile(save, 'icon.sys');
            // icon.sys format is 964 bytes, but file on disk may be padded larger
            if (iconSysData && iconSysData.length >= 964) {
                // Only use first 964 bytes (the actual icon.sys format)
                const iconSysTrimmed = iconSysData.length === 964 ? iconSysData : iconSysData.subarray(0, 964);
                iconSys = parseIconSys(iconSysTrimmed);
                iconSys.directory = save.directory.name;
                console.log(`icon.sys parsed: normal=${iconSys.normal}, copy=${iconSys.copy}, delete=${iconSys.delete}`);

                // Collect raw icon file binaries
                const iconFileNames = [iconSys.normal, iconSys.copy, iconSys.delete];
                for (const iconFileName of iconFileNames) {
                    if (iconFileName && !iconFiles.has(iconFileName)) {
                        const iconData = mc.readFile(save, iconFileName);
                        if (iconData && iconData.length > 0) {
                            console.log(`Reading icon file ${iconFileName}: ${iconData.length} bytes`);
                            iconFiles.set(iconFileName, iconData);
                        } else {
                            console.log(`Icon file not found or empty: ${iconFileName}`);
                        }
                    }
                }
            } else {
                console.log(`icon.sys not found or invalid size in ${save.directory.name}`);
            }

            console.log(`Save ${save.directory.name}: ${iconFiles.size} icon files collected`);

            return {
                iconSys,
                iconFiles
            };
        } catch (e) {
            console.warn(`Failed to extract save ${save.directory.name}:`, e);
            return null;
        }
    }
}

