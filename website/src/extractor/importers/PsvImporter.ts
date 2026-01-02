import { IconSys } from '../../model/IconSys';
import { parseIconSys } from '../ps2iconsys';
import { modeIsDir, TimeOfDay } from '../ps2mcDir';
import { BinaryReader, zeroTerminate } from '../utils';
import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

// PSV magic: "\x00VSP" (little-endian)
const PSV_MAGIC = new Uint8Array([0x00, 0x56, 0x53, 0x50]);

// Header sizes
const PSV_HEADER_SIZE = 64; // 4 + 4 + 40 + 8 + 4 + 4 = 64 bytes
const PS2_HEADER_SIZE = 40; // 10 * 4 = 40 bytes
const PS2_FILE_INFO_SIZE = 56; // 8 + 8 + 4 + 4 + 32 = 56 bytes
const PS2_FILE_OFFSET_SIZE = 4;
const PS1_HEADER_SIZE = 60; // 4 + 4 + 20 + 4 + 4 + 20 + 4 = 60 bytes

interface PsvFileInfo {
    created: TimeOfDay;
    modified: TimeOfDay;
    size: number;
    mode: number;
    filename: string;
}

interface PsvFile {
    info: PsvFileInfo;
    data: Uint8Array;
}

/**
 * Importer for PSV format save files.
 */
export class PsvImporter implements SaveImporter {
    readonly name = 'PSV (PS Vita/PS3) Save';

    /**
     * Check if this importer can handle the given file data.
     * PSV format starts with "\x00VSP" magic.
     */
    handles(data: Uint8Array): boolean {
        if (data.length < PSV_HEADER_SIZE) {
            return false;
        }
        return data[0] === PSV_MAGIC[0] &&
               data[1] === PSV_MAGIC[1] &&
               data[2] === PSV_MAGIC[2] &&
               data[3] === PSV_MAGIC[3];
    }

    /**
     * Load and parse a PSV format save file.
     */
    load(data: Uint8Array): ImportedSave[] {
        const reader = new BinaryReader(data.buffer, true);
        reader.seek(data.byteOffset);

        // Read PSV header: <4sI40s8xII
        // magic (4), version (4), signature (40), padding (8), unknown (4), save_type (4)
        const magic = reader.readBytes(4);
        if (magic[0] !== PSV_MAGIC[0] || magic[1] !== PSV_MAGIC[1] ||
            magic[2] !== PSV_MAGIC[2] || magic[3] !== PSV_MAGIC[3]) {
            throw new Error('Not a PSV file');
        }

        const version = reader.readUint32();
        if (version !== 0) {
            throw new Error(`Wrong PSV version: ${version}`);
        }

        reader.skip(40); // signature
        reader.skip(8);  // padding
        reader.skip(4);  // unknown (possibly size of next section)
        const saveType = reader.readUint32();

        if (saveType === 2) {
            return this.loadPs2(reader, data);
        } else if (saveType === 1) {
            throw new Error('PS1 saves are not supported');
        } else {
            throw new Error(`PSV save type ${saveType} not recognized`);
        }
    }

    /**
     * Load PS2 save data from PSV format.
     */
    private loadPs2(reader: BinaryReader, data: Uint8Array): ImportedSave[] {
        // Read PS2 header: <IIIIIIIIII
        reader.skip(4); // unknown
        reader.skip(4); // sys_pos
        reader.skip(4); // sys_size
        reader.skip(4); // icon1_pos
        reader.skip(4); // icon1_size
        reader.skip(4); // icon2_pos
        reader.skip(4); // icon2_size
        reader.skip(4); // icon3_pos
        reader.skip(4); // icon3_size
        const filesCount = reader.readUint32();

        // Read root directory info
        const rootDirInfo = PsvImporter.readPs2FileInfo(reader);
        if (!modeIsDir(rootDirInfo.mode)) {
            throw new Error('PSV root file is not a directory');
        }

        // Read file infos and offsets
        const files: { info: PsvFileInfo; offset: number }[] = [];
        for (let i = 0; i < filesCount; i++) {
            const fileInfo = PsvImporter.readPs2FileInfo(reader);
            const fileOffset = reader.readUint32();
            
            if (modeIsDir(fileInfo.mode)) {
                throw new Error('PSV format does not support subdirectories');
            }
            
            files.push({ info: fileInfo, offset: fileOffset });
        }

        // Read file data
        const psvFiles: PsvFile[] = [];
        for (const { info, offset } of files) {
            reader.seek(data.byteOffset + offset);
            const fileData = reader.readBytes(info.size);
            psvFiles.push({ info, data: fileData });
        }

        return [this.buildImportedSave(rootDirInfo.filename, psvFiles)];
    }

    /**
     * Build an ImportedSave from parsed files.
     */
    private buildImportedSave(dirname: string, files: PsvFile[]): ImportedSave {
        let iconSys: IconSys | null = null;
        const iconFiles = new Map<string, Uint8Array>();

        // Find icon.sys
        const iconSysFile = files.find(f => f.info.filename === 'icon.sys');
        if (iconSysFile && iconSysFile.data.length === 964) {
            iconSys = parseIconSys(iconSysFile.data);
            iconSys.directory = dirname;

            // Collect raw icon file binaries
            const iconFileNames = [iconSys.normal, iconSys.copy, iconSys.delete];
            for (const iconFileName of iconFileNames) {
                if (iconFileName && !iconFiles.has(iconFileName)) {
                    const iconFileEntry = files.find(f => f.info.filename === iconFileName);
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

    /**
     * Unpack time-of-day from 8 bytes in PSV format.
     * Same structure as PS2 memory card TOD.
     */
    private static unpackPsvTod(reader: BinaryReader): TimeOfDay {
        reader.skip(1); // Skip first byte
        const seconds = reader.readUint8();
        const minutes = reader.readUint8();
        const hours = reader.readUint8();
        const day = reader.readUint8();
        const month = reader.readUint8();
        const year = reader.readUint16();
        return { seconds, minutes, hours, day, month, year };
    }

    /**
     * Read PS2 file info from PSV format.
     */
    private static readPs2FileInfo(reader: BinaryReader): PsvFileInfo {
        const created = PsvImporter.unpackPsvTod(reader);
        const modified = PsvImporter.unpackPsvTod(reader);
        const size = reader.readUint32();
        const mode = reader.readUint32();
        const filenameBytes = reader.readBytes(32);
        const filename = zeroTerminate(filenameBytes);

        return { created, modified, size, mode, filename };
    }
}

