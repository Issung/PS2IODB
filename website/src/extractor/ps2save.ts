/**
 * Interface for working with various PS2 save file formats.
 * Ported from ps2save.py
 */

import { BinaryReader, roundUp } from './utils';
import { 
    PS2MC_DIRENT_LENGTH, 
    DirEntry, 
    unpackDirEntry, 
    modeIsDir, 
    modeIsFile,
    DF_EXISTS
} from './ps2mcDir';

export class PS2SaveError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PS2SaveError';
    }
}

export class PS2SaveCorrupt extends PS2SaveError {
    constructor(message: string) {
        super(`Corrupt save file: ${message}`);
        this.name = 'PS2SaveCorrupt';
    }
}

/**
 * Information about a file within a save.
 */
export interface SaveFileEntry {
    entry: DirEntry;
    data: Uint8Array;
}

/**
 * Represents a loaded PS2 save file.
 */
export interface PS2SaveFile {
    directory: DirEntry;
    files: SaveFileEntry[];
}

/**
 * Detect the format of a PS2 save file.
 */
export function detectSaveFormat(data: Uint8Array): string | null {
    if (data.length < PS2MC_DIRENT_LENGTH * 3) {
        return null;
    }

    // Check for EMS/PSU format (no magic, just valid directory entries)
    if (isPsuFormat(data)) {
        return 'psu';
    }

    // Check for MAX Drive format
    const magic = new TextDecoder('ascii').decode(data.subarray(0, 12));
    if (magic === 'Ps2PowerSave') {
        return 'max';
    }

    // Check for SharkPort format
    if (data[0] === 0x0d && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x00) {
        const spsCheck = new TextDecoder('ascii').decode(data.subarray(4, 17));
        if (spsCheck === 'SharkPortSave') {
            return 'sps';
        }
    }

    // Check for CodeBreaker format
    if (data[0] === 0x43 && data[1] === 0x46 && data[2] === 0x55 && data[3] === 0x00) {
        return 'cbs';
    }

    return null;
}

/**
 * Check if data looks like a PSU/EMS format save.
 */
function isPsuFormat(data: Uint8Array): boolean {
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
 * Load a PSU/EMS format save file.
 */
export function loadPsuSave(data: Uint8Array): PS2SaveFile {
    const CLUSTER_SIZE = 1024;
    
    if (data.length < PS2MC_DIRENT_LENGTH * 3) {
        throw new PS2SaveCorrupt('File too small to be a PSU save');
    }

    const reader = new BinaryReader(data.buffer, true);
    reader.seek(data.byteOffset);

    // Read directory entry
    const direntData = reader.readBytes(PS2MC_DIRENT_LENGTH);
    const dirent = unpackDirEntry(direntData);

    // Read . entry
    const dotentData = reader.readBytes(PS2MC_DIRENT_LENGTH);
    const dotent = unpackDirEntry(dotentData);

    // Read .. entry
    const dotdotentData = reader.readBytes(PS2MC_DIRENT_LENGTH);
    const dotdotent = unpackDirEntry(dotdotentData);

    if (!modeIsDir(dirent.mode) || !modeIsDir(dotent.mode) || !modeIsDir(dotdotent.mode) || dirent.length < 2) {
        throw new PS2SaveCorrupt('Not a valid PSU save file');
    }

    // Adjust length to exclude . and .. entries
    const fileCount = dirent.length - 2;
    const files: SaveFileEntry[] = [];

    for (let i = 0; i < fileCount; i++) {
        const entData = reader.readBytes(PS2MC_DIRENT_LENGTH);
        const ent = unpackDirEntry(entData);
        
        if (!modeIsFile(ent.mode)) {
            throw new PS2SaveCorrupt('Unexpected directory in save file');
        }

        const fileLen = ent.length;
        const fileData = reader.readBytes(fileLen);
        
        // Skip padding to cluster boundary
        const padding = roundUp(fileLen, CLUSTER_SIZE) - fileLen;
        if (padding > 0) {
            reader.skip(padding);
        }

        files.push({ entry: ent, data: fileData });
    }

    // Modify directory entry to reflect actual file count
    const adjustedDirent = { ...dirent, length: fileCount };

    return {
        directory: adjustedDirent,
        files
    };
}

