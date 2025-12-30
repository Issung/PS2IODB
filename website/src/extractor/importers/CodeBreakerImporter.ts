import pako from 'pako';
import { parsePS2Icon, PS2Icon } from '../ps2icon';
import { decodeTitle, IconSysData, parseIconSys } from '../ps2iconsys';
import {
    DF_0400,
    DF_DIR,
    DF_EXISTS,
    DF_FILE,
    DF_RWX,
    modeIsFile,
    TimeOfDay
} from '../ps2mcDir';
import { PS2SaveCorrupt } from '../ps2save';
import { BinaryReader, zeroTerminate } from '../utils';
import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

/**
 * Initial permutation state ("S") for the RC4 stream cipher
 * used to encrypt and decrypt CodeBreaker saves.
 */
const PS2SAVE_CBS_RC4S: number[] = [
    0x5f, 0x1f, 0x85, 0x6f, 0x31, 0xaa, 0x3b, 0x18,
    0x21, 0xb9, 0xce, 0x1c, 0x07, 0x4c, 0x9c, 0xb4,
    0x81, 0xb8, 0xef, 0x98, 0x59, 0xae, 0xf9, 0x26,
    0xe3, 0x80, 0xa3, 0x29, 0x2d, 0x73, 0x51, 0x62,
    0x7c, 0x64, 0x46, 0xf4, 0x34, 0x1a, 0xf6, 0xe1,
    0xba, 0x3a, 0x0d, 0x82, 0x79, 0x0a, 0x5c, 0x16,
    0x71, 0x49, 0x8e, 0xac, 0x8c, 0x9f, 0x35, 0x19,
    0x45, 0x94, 0x3f, 0x56, 0x0c, 0x91, 0x00, 0x0b,
    0xd7, 0xb0, 0xdd, 0x39, 0x66, 0xa1, 0x76, 0x52,
    0x13, 0x57, 0xf3, 0xbb, 0x4e, 0xe5, 0xdc, 0xf0,
    0x65, 0x84, 0xb2, 0xd6, 0xdf, 0x15, 0x3c, 0x63,
    0x1d, 0x89, 0x14, 0xbd, 0xd2, 0x36, 0xfe, 0xb1,
    0xca, 0x8b, 0xa4, 0xc6, 0x9e, 0x67, 0x47, 0x37,
    0x42, 0x6d, 0x6a, 0x03, 0x92, 0x70, 0x05, 0x7d,
    0x96, 0x2f, 0x40, 0x90, 0xc4, 0xf1, 0x3e, 0x3d,
    0x01, 0xf7, 0x68, 0x1e, 0xc3, 0xfc, 0x72, 0xb5,
    0x54, 0xcf, 0xe7, 0x41, 0xe4, 0x4d, 0x83, 0x55,
    0x12, 0x22, 0x09, 0x78, 0xfa, 0xde, 0xa7, 0x06,
    0x08, 0x23, 0xbf, 0x0f, 0xcc, 0xc1, 0x97, 0x61,
    0xc5, 0x4a, 0xe6, 0xa0, 0x11, 0xc2, 0xea, 0x74,
    0x02, 0x87, 0xd5, 0xd1, 0x9d, 0xb7, 0x7e, 0x38,
    0x60, 0x53, 0x95, 0x8d, 0x25, 0x77, 0x10, 0x5e,
    0x9b, 0x7f, 0xd8, 0x6e, 0xda, 0xa2, 0x2e, 0x20,
    0x4f, 0xcd, 0x8f, 0xcb, 0xbe, 0x5a, 0xe0, 0xed,
    0x2c, 0x9a, 0xd4, 0xe2, 0xaf, 0xd0, 0xa9, 0xe8,
    0xad, 0x7a, 0xbc, 0xa8, 0xf2, 0xee, 0xeb, 0xf5,
    0xa6, 0x99, 0x28, 0x24, 0x6c, 0x2b, 0x75, 0x5d,
    0xf8, 0xd3, 0x86, 0x17, 0xfb, 0xc0, 0x7b, 0xb3,
    0x58, 0xdb, 0xc7, 0x4b, 0xff, 0x04, 0x50, 0xe9,
    0x88, 0x69, 0xc9, 0x2a, 0xab, 0xfd, 0x5b, 0x1b,
    0x8a, 0xd9, 0xec, 0x27, 0x44, 0x0e, 0x33, 0xc8,
    0x6b, 0x93, 0x32, 0x48, 0xb6, 0x30, 0x43, 0xa5
];

interface CbsFileEntry {
    name: string;
    mode: number;
    size: number;
    created: TimeOfDay;
    modified: TimeOfDay;
    data: Uint8Array;
}

/**
 * Importer for CodeBreaker format save files.
 */
export class CodeBreakerImporter implements SaveImporter {
    readonly name = 'CodeBreaker Save';

    /**
     * Check if this importer can handle the given file data.
     * CodeBreaker format starts with "CFU\0" magic (0x43, 0x46, 0x55, 0x00).
     */
    handles(data: Uint8Array): boolean {
        if (data.length < 4) {
            return false;
        }
        return data[0] === 0x43 && data[1] === 0x46 && data[2] === 0x55 && data[3] === 0x00;
    }

    /**
     * Load and parse a CodeBreaker format save file.
     */
    load(data: Uint8Array): ImportedSave[] {
        const reader = new BinaryReader(data.buffer, true);
        reader.seek(data.byteOffset);

        // Check magic
        const magic = reader.readBytes(4);
        if (magic[0] !== 0x43 || magic[1] !== 0x46 || magic[2] !== 0x55 || magic[3] !== 0x00) {
            throw new PS2SaveCorrupt('Not a CodeBreaker save file');
        }

        // Read header
        const _d04 = reader.readUint32();
        const hlen = reader.readUint32();

        if (hlen < 92 + 32) {
            throw new PS2SaveCorrupt('Header length too short');
        }

        const dlen = reader.readUint32();  // Decompressed length
        const flen = reader.readUint32();  // File/compressed length
        const dirnameBytes = reader.readBytes(32);
        const dirname = zeroTerminate(dirnameBytes);
        const createdBytes = reader.readBytes(8);
        let created = CodeBreakerImporter.unpackCbsTod(createdBytes);
        const modifiedBytes = reader.readBytes(8);
        let modified = CodeBreakerImporter.unpackCbsTod(modifiedBytes);
        const _d44 = reader.readUint32();
        const _d48 = reader.readUint32();
        let dirmode = reader.readUint32();
        const _d50 = reader.readUint32();
        const _d54 = reader.readUint32();
        const _d58 = reader.readUint32();
        const titleBytes = reader.readBytes(hlen - 92);
        const _title = zeroTerminate(titleBytes);

        // Validate/fix directory mode and timestamps
        if ((dirmode & DF_DIR) === 0) {
            dirmode = DF_RWX | DF_DIR | DF_0400 | DF_EXISTS;
        }
        if (CodeBreakerImporter.todIsZero(created)) {
            created = CodeBreakerImporter.todNow();
        }
        if (CodeBreakerImporter.todIsZero(modified)) {
            modified = CodeBreakerImporter.todNow();
        }

        // Read and decrypt body
        // flen can be total file length or length of compressed body
        const remainingBytes = data.length - reader.position;
        const bytesToRead = Math.min(flen, remainingBytes);
        let body = reader.readBytes(bytesToRead);

        const clen = body.length;
        if (clen !== flen && clen !== flen - hlen) {
            throw new PS2SaveCorrupt('Unexpected end of file');
        }

        // RC4 decrypt
        body = CodeBreakerImporter.rc4Crypt(PS2SAVE_CBS_RC4S, body);

        // Zlib decompress
        let decompressed: Uint8Array;
        try {
            decompressed = pako.inflate(body);
        } catch (e) {
            throw new PS2SaveCorrupt(`Failed to decompress: ${e}`);
        }

        if (decompressed.length < dlen) {
            throw new PS2SaveCorrupt('Decompressed data too short');
        }

        // Parse files from decompressed body
        const files: CbsFileEntry[] = [];
        let offset = 0;

        while (offset < decompressed.length) {
            if (decompressed.length - offset < 64) {
                break; // Not enough data for a file header
            }

            // Parse file header: <8s8sLHHLL32s (64 bytes)
            const fileReader = new BinaryReader(decompressed.buffer, true);
            fileReader.seek(decompressed.byteOffset + offset);

            const fileCreatedBytes = fileReader.readBytes(8);
            const fileModifiedBytes = fileReader.readBytes(8);
            const size = fileReader.readUint32();
            const mode = fileReader.readUint16();
            const _h06 = fileReader.readUint16();
            const _h08 = fileReader.readUint32();
            const _h0C = fileReader.readUint32();
            const nameBytes = fileReader.readBytes(32);

            let fileCreated = CodeBreakerImporter.unpackCbsTod(fileCreatedBytes);
            let fileModified = CodeBreakerImporter.unpackCbsTod(fileModifiedBytes);
            const name = zeroTerminate(nameBytes);

            offset += 64;

            // Read file data
            if (decompressed.length - offset < size) {
                throw new PS2SaveCorrupt('Unexpected end of file data');
            }

            const fileData = decompressed.slice(offset, offset + size);
            offset += size;

            // Validate mode
            if (!modeIsFile(mode)) {
                // Some saves may have incorrect mode flags, try to fix it
                const fixedMode = DF_FILE | DF_EXISTS | DF_RWX;
                files.push({
                    name,
                    mode: fixedMode,
                    size,
                    created: CodeBreakerImporter.todIsZero(fileCreated) ? CodeBreakerImporter.todNow() : fileCreated,
                    modified: CodeBreakerImporter.todIsZero(fileModified) ? CodeBreakerImporter.todNow() : fileModified,
                    data: fileData
                });
            } else {
                files.push({
                    name,
                    mode,
                    size,
                    created: CodeBreakerImporter.todIsZero(fileCreated) ? CodeBreakerImporter.todNow() : fileCreated,
                    modified: CodeBreakerImporter.todIsZero(fileModified) ? CodeBreakerImporter.todNow() : fileModified,
                    data: fileData
                });
            }
        }

        // Build ImportedSave
        let iconSys: IconSysData | null = null;
        const icons = new Map<string, PS2Icon>();

        // Find icon.sys
        const iconSysFile = files.find(f => f.name === 'icon.sys');
        if (iconSysFile && iconSysFile.data.length === 964) {
            iconSys = parseIconSys(iconSysFile.data);

            // Parse each icon file
            const iconFiles = [iconSys.iconFileNormal, iconSys.iconFileCopy, iconSys.iconFileDelete];
            for (const iconFileName of iconFiles) {
                if (iconFileName && !icons.has(iconFileName)) {
                    const iconFileEntry = files.find(f => f.name === iconFileName);
                    if (iconFileEntry && iconFileEntry.data.length > 0) {
                        try {
                            const icon = parsePS2Icon(iconFileEntry.data);
                            icons.set(iconFileName, icon);
                        } catch (e) {
                            console.warn(`Failed to parse icon ${iconFileName}:`, e);
                        }
                    }
                }
            }
        }

        // Get title
        let title = dirname;
        if (iconSys) {
            const decoded = decodeTitle(iconSys.titleRaw, iconSys.titleLineOffset);
            title = decoded.line1 + (decoded.line2 ? ' ' + decoded.line2 : '');
        }

        return [{
            directoryName: dirname,
            title,
            iconSys,
            icons
        }];
    }

    /**
     * RC4 encrypt/decrypt using the given permutation state.
     */
    private static rc4Crypt(s: number[], t: Uint8Array): Uint8Array {
        // Make copies to avoid modifying input
        const sCopy = [...s];
        const result = new Uint8Array(t.length);

        let j = 0;
        for (let ii = 0; ii < t.length; ii++) {
            const i = (ii + 1) % 256;
            j = (j + sCopy[i]) % 256;
            // Swap s[i] and s[j]
            [sCopy[i], sCopy[j]] = [sCopy[j], sCopy[i]];
            result[ii] = t[ii] ^ sCopy[(sCopy[i] + sCopy[j]) % 256];
        }
        return result;
    }

    /**
     * Unpack a time-of-day structure from 8 bytes (CodeBreaker format).
     * CodeBreaker uses raw bytes without the padding byte that PS2MC uses.
     */
    private static unpackCbsTod(data: Uint8Array): TimeOfDay {
        // Format is 8 bytes: seconds, minutes, hours, day, month, 0, year (2 bytes LE)
        return {
            seconds: data[0],
            minutes: data[1],
            hours: data[2],
            day: data[3],
            month: data[4],
            year: data[5] | (data[6] << 8) // Little-endian 16-bit year starting at byte 5
        };
    }

    /**
     * Check if a TimeOfDay represents time 0 (uninitialized).
     */
    private static todIsZero(tod: TimeOfDay): boolean {
        return tod.seconds === 0 && tod.minutes === 0 && tod.hours === 0 &&
               tod.day === 0 && tod.month === 0 && tod.year === 0;
    }

    /**
     * Get current time as a TimeOfDay.
     */
    private static todNow(): TimeOfDay {
        const now = new Date();
        return {
            seconds: now.getSeconds(),
            minutes: now.getMinutes(),
            hours: now.getHours(),
            day: now.getDate(),
            month: now.getMonth() + 1,
            year: now.getFullYear()
        };
    }
}

