/**
 * Interface for working with PS2 icon.sys files.
 * Ported from ps2iconsys.py
 */

import { IconSys } from '../model/IconSys';
import { BinaryReader, zeroTerminateBytes } from './utils';

const PS2_ICON_SYS_MAGIC = 'PS2D';
const ICON_SYS_SIZE = 964;

export class IconSysError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IconSysError';
    }
}

export class IconSysCorrupt extends IconSysError {
    constructor(message: string) {
        super(`Corrupt icon.sys: ${message}`);
        this.name = 'IconSysCorrupt';
    }
}

/**
 * Parse an icon.sys file.
 */
export function parseIconSys(directory: string, data: Uint8Array): IconSys {
    if (data.length !== ICON_SYS_SIZE) {
        throw new IconSysCorrupt(`Invalid size: ${data.length} != ${ICON_SYS_SIZE}`);
    }

    const reader = new BinaryReader(data.buffer, true);
    reader.seek(data.byteOffset);

    // Read magic (4 bytes)
    const magic = reader.readFixedString(4);
    if (magic !== PS2_ICON_SYS_MAGIC) {
        throw new IconSysCorrupt(`Invalid magic: "${magic}" != "${PS2_ICON_SYS_MAGIC}"`);
    }

    reader.skip(2); // unknown
    const titleLineOffset = reader.readUint16();
    reader.skip(4); // unknown
    const backgroundTransparency = reader.readUint32();

    // Read background colors (4 corners, each 4 uint32s = 16 values)
    const bgColors: [number[], number[], number[], number[]] = [[], [], [], []];
    for (let corner = 0; corner < 4; corner++) {
        for (let i = 0; i < 4; i++) {
            bgColors[corner].push(reader.readUint32());
        }
    }

    // Read light directions (3 lights, each 4 floats)
    const lightDirs: [number[], number[], number[]] = [[], [], []];
    for (let light = 0; light < 3; light++) {
        for (let i = 0; i < 4; i++) {
            lightDirs[light].push(reader.readFloat32());
        }
    }

    // Read light colors (3 lights + ambient, each 4 floats)
    const lightColors: [number[], number[], number[]] = [[], [], []];
    for (let light = 0; light < 3; light++) {
        for (let i = 0; i < 4; i++) {
            lightColors[light].push(reader.readFloat32());
        }
    }
    const ambientLightColor: number[] = [];
    for (let i = 0; i < 4; i++) {
        ambientLightColor.push(reader.readFloat32());
    }

    // Read title (68 bytes, Shift-JIS encoded)
    const titleRaw = zeroTerminateBytes(reader.readBytes(68));
    const { line1, line2 } = decodeTitle(titleRaw, titleLineOffset);
    const title = line1 + (line2 ? ' ' + line2 : '');

    // Read icon filenames (64 bytes each)
    const iconFileNormal = reader.readFixedString(64);
    const iconFileCopy = reader.readFixedString(64);
    const iconFileDelete = reader.readFixedString(64);

    // JSON stringify outputs properties in the order they were set. Preserve the order from the Python code here.
    const iconSys = new IconSys();
    iconSys.directory = directory;
    iconSys.title = title;
    iconSys.normal = iconFileNormal;
    iconSys.copy = iconFileCopy;
    iconSys.delete = iconFileDelete;
    iconSys.bgOpacity = backgroundTransparency;
    iconSys.bgColTL = bgColorToHex(bgColors[0]);
    iconSys.bgColTR = bgColorToHex(bgColors[1]);
    iconSys.bgColBL = bgColorToHex(bgColors[2]);
    iconSys.bgColBR = bgColorToHex(bgColors[3]);
    iconSys.light1Dir = lightDirs[0];
    iconSys.light2Dir = lightDirs[1];
    iconSys.light3Dir = lightDirs[2];
    iconSys.light1Col = lightColors[0];
    iconSys.light2Col = lightColors[1];
    iconSys.light3Col = lightColors[2];
    iconSys.ambiLightCol = ambientLightColor;

    return iconSys;
}

/**
 * Convert icon.sys background color (0-255 ints) to hex color string.
 */
export function bgColorToHex(color: number[]): string {
    const r = Math.min(255, color[0]);
    const g = Math.min(255, color[1]);
    const b = Math.min(255, color[2]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Decode Shift-JIS title to a display string.
 * For simplicity, we'll use TextDecoder with 'shift_jis' if available,
 * otherwise fall back to a basic conversion.
 */
export function decodeTitle(titleRaw: Uint8Array, lineOffset: number): { line1: string; line2: string } {
    try {
        const decoder = new TextDecoder('shift_jis');
        const fullTitle = decoder.decode(titleRaw);
        
        // Split at line offset (character position)
        const line1 = fullTitle.substring(0, lineOffset);
        const line2 = fullTitle.substring(lineOffset);
        
        return { line1: line1.trim(), line2: line2.trim() };
    } catch {
        // Fallback: basic ASCII extraction
        const decoder = new TextDecoder('ascii', { fatal: false });
        const fullTitle = decoder.decode(titleRaw);
        return { line1: fullTitle.trim(), line2: '' };
    }
}

