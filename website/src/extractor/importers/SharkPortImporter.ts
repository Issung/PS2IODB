import { IconSys } from '../../model/IconSys';
import { parseIconSys } from '../ps2iconsys';
import { modeIsDir, modeIsFile, TimeOfDay } from '../ps2mcDir';
import { PS2SaveCorrupt, PS2SaveFile, SaveFileEntry } from '../ps2save';
import { BinaryReader, zeroTerminate } from '../utils';
import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

const PS2SAVE_SPS_MAGIC = new Uint8Array([0x0d, 0x00, 0x00, 0x00, 0x53, 0x68, 0x61, 0x72, 0x6b, 0x50, 0x6f, 0x72, 0x74, 0x53, 0x61, 0x76, 0x65]); // "SharkPortSave" with prefix

/**
 * Importer for SharkPort format save files.
 */
export class SharkPortImporter implements SaveImporter {
    readonly name = 'SharkPort Save';

    /**
     * Check if this importer can handle the given file data.
     * SharkPort format starts with 0x0d000000 followed by "SharkPortSave" magic.
     */
    handles(data: Uint8Array): boolean {
        if (data.length < 17) {
            return false;
        }

        // Check header bytes
        if (data[0] !== 0x0d || data[1] !== 0x00 || data[2] !== 0x00 || data[3] !== 0x00) {
            return false;
        }

        const magic = new TextDecoder('ascii').decode(data.subarray(4, 17));
        return magic === 'SharkPortSave';
    }

    /**
     * Load and parse a SharkPort format save file.
     */
    load(data: Uint8Array): ImportedSave[] {
        const save = SharkPortImporter.loadSharkPortSave(data);

        let iconSys: IconSys | null = null;
        const iconFiles = new Map<string, Uint8Array>();

        // Find icon.sys
        const iconSysFile = save.files.find(f => f.entry.name === 'icon.sys');
        if (iconSysFile && iconSysFile.data.length === 964) {
            iconSys = parseIconSys(save.directory.name, iconSysFile.data);

            // Collect raw icon file binaries
            const iconFileNames = [iconSys.normal, iconSys.copy, iconSys.delete];
            for (const iconFileName of iconFileNames) {
                if (iconFileName && !iconFiles.has(iconFileName)) {
                    const iconFileEntry = save.files.find(f => f.entry.name === iconFileName);
                    if (iconFileEntry && iconFileEntry.data.length > 0) {
                        iconFiles.set(iconFileName, iconFileEntry.data);
                    }
                }
            }
        }

        return [{
            iconSys,
            iconFiles
        }];
    }

    /**
     * Read a long string (prefixed with 32-bit length) from the reader.
     */
    private static readLongString(reader: BinaryReader): Uint8Array {
        const length = reader.readUint32();
        return reader.readBytes(length);
    }

    /**
     * Unpack a time-of-day structure from 8 bytes (SharkPort format).
     * Same format as PS2 memory card TOD.
     */
    private static unpackTod(data: Uint8Array): TimeOfDay {
        // Format: xBBBBBH - skip 1 byte, then 5 bytes, then 2 bytes for year
        const reader = new BinaryReader(data.buffer, true);
        reader.seek(data.byteOffset);
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
     * Swap bytes in a 16-bit mode value.
     * SharkPort stores mode values with bytes swapped.
     */
    private static swapModeBytes(mode: number): number {
        return Math.floor(mode / 256) % 256 + (mode % 256) * 256;
    }

    /**
     * Load a SharkPort format save file.
     */
    private static loadSharkPortSave(data: Uint8Array): PS2SaveFile {
        const reader = new BinaryReader(data.buffer, true);
        reader.seek(data.byteOffset);

        // Read and verify magic
        const magic = reader.readBytes(17);
        for (let i = 0; i < 17; i++) {
            if (magic[i] !== PS2SAVE_SPS_MAGIC[i]) {
                throw new PS2SaveCorrupt('Not a SharkPort/X-Port save file.');
            }
        }

        // Read header info
        const _savetype = reader.readUint32();
        const _dirname = SharkPortImporter.readLongString(reader);
        const _datestamp = SharkPortImporter.readLongString(reader);
        const _comment = SharkPortImporter.readLongString(reader);

        // Read file length
        const _flen = reader.readUint32();

        // Read directory entry header (98 bytes minimum)
        // Format: <H64sL8xH2x8s8s
        const hlen = reader.readUint16();
        const dirnameBytes = reader.readBytes(64);
        let dirlen = reader.readUint32();
        reader.skip(8); // 8 bytes padding
        let dirmode = reader.readUint16();
        reader.skip(2); // 2 bytes padding
        const createdBytes = reader.readBytes(8);
        const modifiedBytes = reader.readBytes(8);

        // Skip remaining header bytes
        if (hlen < 98) {
            throw new PS2SaveCorrupt('Header length too short.');
        }
        reader.skip(hlen - 98);

        const dirname = zeroTerminate(dirnameBytes);
        const created = SharkPortImporter.unpackTod(createdBytes);
        const modified = SharkPortImporter.unpackTod(modifiedBytes);

        // Mode values are byte swapped
        dirmode = SharkPortImporter.swapModeBytes(dirmode);
        dirlen -= 2; // Exclude . and .. entries

        if (!modeIsDir(dirmode) || dirlen < 0) {
            throw new PS2SaveCorrupt('Bad values in directory entry.');
        }

        const directory = {
            mode: dirmode,
            unknown: 0,
            length: dirlen,
            created,
            cluster: 0,
            parentEntry: 0,
            modified,
            attr: 0,
            name: dirname,
            nameBytes: new TextEncoder().encode(dirname)
        };

        const files: SaveFileEntry[] = [];

        for (let i = 0; i < dirlen; i++) {
            // Read file entry header (98 bytes minimum)
            // Format: <H64sL8xH2x8s8s
            const fileHlen = reader.readUint16();
            const nameBytes = reader.readBytes(64);
            const flen = reader.readUint32();
            reader.skip(8); // 8 bytes padding
            let mode = reader.readUint16();
            reader.skip(2); // 2 bytes padding
            const fileCreatedBytes = reader.readBytes(8);
            const fileModifiedBytes = reader.readBytes(8);

            if (fileHlen < 98) {
                throw new PS2SaveCorrupt('Header length too short.');
            }
            reader.skip(fileHlen - 98);

            const name = zeroTerminate(nameBytes);
            const fileCreated = SharkPortImporter.unpackTod(fileCreatedBytes);
            const fileModified = SharkPortImporter.unpackTod(fileModifiedBytes);
            mode = SharkPortImporter.swapModeBytes(mode);

            if (!modeIsFile(mode)) {
                throw new PS2SaveCorrupt('Subdirectories not supported in SharkPort saves.');
            }

            const fileData = reader.readBytes(flen);

            files.push({
                entry: {
                    mode,
                    unknown: 0,
                    length: flen,
                    created: fileCreated,
                    cluster: 0,
                    parentEntry: 0,
                    modified: fileModified,
                    attr: 0,
                    name,
                    nameBytes: new TextEncoder().encode(name)
                },
                data: fileData
            });
        }

        // Ignore 4 byte checksum at the end

        return { directory, files };
    }
}

