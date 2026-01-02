import { IconSys } from '../../model/IconSys';
import { lzariDecode } from '../lzari';
import { parseIconSys } from '../ps2iconsys';
import { BinaryReader, roundUp, zeroTerminate } from '../utils';
import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

const PS2SAVE_MAX_MAGIC = 'Ps2PowerSave';
const HEADER_SIZE = 0x5C; // 92 bytes

interface MaxFileEntry {
    name: string;
    data: Uint8Array;
}

/**
 * Importer for MAX Drive format save files.
 */
export class MaxDriveImporter implements SaveImporter {
    readonly name = 'MAX Drive Save';

    /**
     * Check if this importer can handle the given file data.
     * MAX Drive format starts with "Ps2PowerSave" magic.
     */
    handles(data: Uint8Array): boolean {
        if (data.length < 12) {
            return false;
        }
        const magic = new TextDecoder('ascii').decode(data.subarray(0, 12));
        return magic === PS2SAVE_MAX_MAGIC;
    }

    /**
     * Load and parse a MAX Drive format save file.
     */
    load(data: Uint8Array): ImportedSave[] {
        if (data.length < HEADER_SIZE) {
            throw new Error('MAX Drive save file too short');
        }

        const reader = new BinaryReader(data.buffer, true);

        // Parse header: <12sL32s32sLLL
        // magic (12), crc (4), dirname (32), iconsysname (32), clen (4), dirlen (4), length (4)
        const magicBytes = reader.readBytes(12);
        const magic = new TextDecoder('ascii').decode(magicBytes);
        if (magic !== PS2SAVE_MAX_MAGIC) {
            throw new Error('Not a MAX Drive save file');
        }

        reader.skip(4); // crc - we don't verify it
        const dirnameBytes = reader.readBytes(32);
        const dirname = zeroTerminate(dirnameBytes);
        reader.skip(32); // iconsysname - not needed for parsing
        const clen = reader.readUint32();
        const dirlen = reader.readUint32();
        const length = reader.readUint32();

        // Read compressed data
        let compressedData: Uint8Array;
        if (clen === length) {
            // Some saves have the uncompressed size here instead of compressed size
            compressedData = new Uint8Array(data.buffer, reader.position);
        } else {
            compressedData = reader.readBytes(clen - 4);
        }

        // Decompress data
        const decompressed = lzariDecode(compressedData, length);

        // Parse decompressed files
        const files = this.parseFiles(decompressed, dirlen);

        // Build ImportedSave result
        return [this.buildImportedSave(dirname, files)];
    }

    /**
     * Parse files from decompressed data.
     * Each file entry: <L32s (length 4 bytes, name 32 bytes)
     */
    private parseFiles(data: Uint8Array, fileCount: number): MaxFileEntry[] {
        const files: MaxFileEntry[] = [];
        let offset = 0;

        for (let i = 0; i < fileCount; i++) {
            if (data.length - offset < 36) {
                throw new Error('Unexpected end of decompressed data');
            }

            const view = new DataView(data.buffer, data.byteOffset + offset, 36);
            const fileLen = view.getUint32(0, true);
            const nameBytes = new Uint8Array(data.buffer, data.byteOffset + offset + 4, 32);
            const name = zeroTerminate(nameBytes);
            offset += 36;

            const fileData = data.subarray(offset, offset + fileLen);
            if (fileData.length !== fileLen) {
                throw new Error('Unexpected end of file data');
            }

            files.push({ name, data: fileData });
            offset += fileLen;

            // Align to 16-byte boundary (with 8-byte adjustment)
            offset = roundUp(offset + 8, 16) - 8;
        }

        return files;
    }

    /**
     * Build an ImportedSave from parsed files.
     */
    private buildImportedSave(dirname: string, files: MaxFileEntry[]): ImportedSave {
        let iconSys: IconSys | null = null;
        const iconFiles = new Map<string, Uint8Array>();

        // Find icon.sys
        const iconSysFile = files.find(f => f.name === 'icon.sys');
        if (iconSysFile && iconSysFile.data.length === 964) {
            iconSys = parseIconSys(iconSysFile.data);
            iconSys.directory = dirname;

            // Collect raw icon file binaries
            const iconFileNames = [iconSys.normal, iconSys.copy, iconSys.delete];
            for (const iconFileName of iconFileNames) {
                if (iconFileName && !iconFiles.has(iconFileName)) {
                    const iconFileEntry = files.find(f => f.name === iconFileName);
                    if (iconFileEntry && iconFileEntry.data.length > 0) {
                        iconFiles.set(iconFileName, iconFileEntry.data);
                    }
                }
            }
        }

        return {
            iconSys,
            iconFiles
        };
    }
}
