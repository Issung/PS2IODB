/**
 * Functions for working with PS2 memory card directory entries.
 * Ported from ps2mc_dir.py
 */

import { BinaryReader, zeroTerminateBytes } from './utils';

export const PS2MC_DIRENT_LENGTH = 512;

// Directory entry mode flags
export const DF_READ = 0x0001;
export const DF_WRITE = 0x0002;
export const DF_EXECUTE = 0x0004;
export const DF_RWX = DF_READ | DF_WRITE | DF_EXECUTE;
export const DF_PROTECTED = 0x0008;
export const DF_FILE = 0x0010;
export const DF_DIR = 0x0020;
export const DF_O_DCREAT = 0x0040;
export const DF_0080 = 0x0080;
export const DF_0100 = 0x0100;
export const DF_O_CREAT = 0x0200;
export const DF_0400 = 0x0400;
export const DF_POCKETSTN = 0x0800;
export const DF_PSX = 0x1000;
export const DF_HIDDEN = 0x2000;
export const DF_4000 = 0x4000;
export const DF_EXISTS = 0x8000;

/**
 * Time-of-day structure from PS2 memory card.
 */
export interface TimeOfDay {
    seconds: number;
    minutes: number;
    hours: number;
    day: number;
    month: number;
    year: number;
}

/**
 * Directory entry structure.
 */
export interface DirEntry {
    mode: number;
    unknown: number;
    length: number;
    created: TimeOfDay;
    cluster: number;       // first cluster / parent entry for . and ..
    parentEntry: number;
    modified: TimeOfDay;
    attr: number;
    name: string;
    nameBytes: Uint8Array;
}

/**
 * Unpack a time-of-day structure from 8 bytes.
 */
export function unpackTod(data: Uint8Array, offset: number = 0): TimeOfDay {
    // Format: xBBBBBH - skip 1 byte, then 5 bytes, then 2 bytes for year
    const reader = new BinaryReader(data.buffer, true);
    reader.seek(data.byteOffset + offset);
    reader.skip(1); // Skip first byte
    return {
        seconds: reader.readUint8(),
        minutes: reader.readUint8(),
        hours: reader.readUint8(),
        day: reader.readUint8(),
        month: reader.readUint8(),
        year: reader.readUint16()
    };
}

/**
 * Unpack a directory entry from 512 bytes.
 * Format: <HHL8sLL8sL28x448s
 */
export function unpackDirEntry(data: Uint8Array): DirEntry {
    if (data.length < PS2MC_DIRENT_LENGTH) {
        throw new Error(`Directory entry too short: ${data.length} < ${PS2MC_DIRENT_LENGTH}`);
    }
    
    const reader = new BinaryReader(data.buffer, true);
    reader.seek(data.byteOffset);

    const mode = reader.readUint16();
    const unknown = reader.readUint16();
    const length = reader.readUint32();
    
    const createdBytes = reader.readBytes(8);
    const created = unpackTod(createdBytes);
    
    const cluster = reader.readUint32();
    const parentEntry = reader.readUint32();
    
    const modifiedBytes = reader.readBytes(8);
    const modified = unpackTod(modifiedBytes);
    
    const attr = reader.readUint32();
    
    reader.skip(28); // 28 bytes of padding
    
    const nameBytes = reader.readBytes(448);
    const name = new TextDecoder('ascii').decode(zeroTerminateBytes(nameBytes));

    return {
        mode,
        unknown,
        length,
        created,
        cluster,
        parentEntry,
        modified,
        attr,
        name,
        nameBytes: zeroTerminateBytes(nameBytes)
    };
}

export function modeIsFile(mode: number): boolean {
    return (mode & (DF_FILE | DF_DIR | DF_EXISTS)) === (DF_FILE | DF_EXISTS);
}

export function modeIsDir(mode: number): boolean {
    return (mode & (DF_FILE | DF_DIR | DF_EXISTS)) === (DF_DIR | DF_EXISTS);
}

export function modeIsPsxDir(mode: number): boolean {
    return (mode & (DF_PSX | DF_DIR | DF_EXISTS)) === (DF_PSX | DF_DIR | DF_EXISTS);
}

