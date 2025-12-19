/**
 * PS2 Memory Card and Save File Extractor
 *
 * This module provides functionality to parse PS2 memory card images
 * and save files to extract icon data for viewing.
 */

export * from './utils';
export * from './ps2mcDir';
export * from './ps2mc';
export * from './ps2save';
export * from './ps2iconsys';
export * from './ps2icon';
export * from './iconToThree';

import { PS2MemoryCard, SaveInfo, PS2MC_MAGIC } from './ps2mc';
import { loadPsuSave, detectSaveFormat, PS2SaveFile } from './ps2save';
import { parseIconSys, IconSysData, bgColorToHex, decodeTitle } from './ps2iconsys';
import { parsePS2Icon, PS2Icon } from './ps2icon';

/**
 * Information about a parsed save with icon data.
 */
export interface ExtractedSave {
    directoryName: string;
    title: string;
    iconSys: IconSysData | null;
    icons: Map<string, PS2Icon>;
}

/**
 * Load and parse a memory card or save file.
 */
export async function loadFile(file: File): Promise<ExtractedSave[]> {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // First, check if it's a memory card image
    // The magic string is "Sony PS2 Memory Card Format " (28 characters with trailing space)
    const magic = new TextDecoder('ascii').decode(data.subarray(0, 28));
    console.log('File magic:', JSON.stringify(magic), 'Expected:', JSON.stringify(PS2MC_MAGIC));

    if (magic === PS2MC_MAGIC || magic.startsWith('Sony PS2 Memory Card Format')) {
        return loadMemoryCard(buffer);
    }

    // Otherwise, try save file formats
    const format = detectSaveFormat(data);
    if (format === 'psu') {
        return [await loadPsuSaveFile(data)];
    }

    throw new Error(`Unsupported file format. Magic found: "${magic.substring(0, 30)}". Supported formats: .ps2 (memory card), .psu (EMS save)`);
}

/**
 * Load a PS2 memory card image.
 */
function loadMemoryCard(buffer: ArrayBuffer): ExtractedSave[] {
    const mc = new PS2MemoryCard(buffer);
    const saves = mc.getSaveDirectories();
    const results: ExtractedSave[] = [];

    for (const save of saves) {
        const extracted = extractSaveData(mc, save);
        if (extracted) {
            results.push(extracted);
        }
    }

    return results;
}

/**
 * Extract icon data from a save on the memory card.
 */
function extractSaveData(mc: PS2MemoryCard, save: SaveInfo): ExtractedSave | null {
    try {
        let iconSys: IconSysData | null = null;
        const icons = new Map<string, PS2Icon>();

        console.log(`Processing save: ${save.directory.name}, files:`, save.files.map(f => f.name));

        // Find and parse icon.sys (case insensitive)
        const iconSysData = mc.readFile(save, 'icon.sys');
        // icon.sys format is 964 bytes, but file on disk may be padded larger
        if (iconSysData && iconSysData.length >= 964) {
            // Only use first 964 bytes (the actual icon.sys format)
            const iconSysTrimmed = iconSysData.length === 964 ? iconSysData : iconSysData.subarray(0, 964);
            iconSys = parseIconSys(iconSysTrimmed);
            console.log(`icon.sys parsed: normal=${iconSys.iconFileNormal}, copy=${iconSys.iconFileCopy}, delete=${iconSys.iconFileDelete}`);

            // Parse each icon file
            const iconFiles = [iconSys.iconFileNormal, iconSys.iconFileCopy, iconSys.iconFileDelete];
            for (const iconFile of iconFiles) {
                if (iconFile && !icons.has(iconFile)) {
                    const iconData = mc.readFile(save, iconFile);
                    if (iconData && iconData.length > 0) {
                        console.log(`Reading icon file ${iconFile}: ${iconData.length} bytes`);
                        try {
                            const icon = parsePS2Icon(iconData);
                            icons.set(iconFile, icon);
                            console.log(`Parsed icon ${iconFile}: ${icon.vertexCount} vertices, texture type ${icon.textureType}`);
                        } catch (e) {
                            console.warn(`Failed to parse icon ${iconFile}:`, e);
                        }
                    } else {
                        console.log(`Icon file not found or empty: ${iconFile}`);
                    }
                }
            }
        } else {
            console.log(`icon.sys not found or invalid size in ${save.directory.name}`);
        }

        // Get title
        let title = save.directory.name;
        if (iconSys) {
            const decoded = decodeTitle(iconSys.titleRaw, iconSys.titleLineOffset);
            title = decoded.line1 + (decoded.line2 ? ' ' + decoded.line2 : '');
        }

        console.log(`Save ${save.directory.name}: ${icons.size} icons parsed`);

        return {
            directoryName: save.directory.name,
            title,
            iconSys,
            icons
        };
    } catch (e) {
        console.warn(`Failed to extract save ${save.directory.name}:`, e);
        return null;
    }
}

/**
 * Load a PSU format save file.
 */
async function loadPsuSaveFile(data: Uint8Array): Promise<ExtractedSave> {
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

