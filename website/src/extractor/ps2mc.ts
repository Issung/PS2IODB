/**
 * PS2 Memory Card filesystem implementation.
 * Ported from ps2mc.py
 */

import { BinaryReader, divRoundUp } from './utils';
import { 
    PS2MC_DIRENT_LENGTH, 
    DirEntry, 
    unpackDirEntry, 
    modeIsDir, 
    modeIsFile,
    DF_EXISTS
} from './ps2mcDir';

export const PS2MC_MAGIC = "Sony PS2 Memory Card Format ";
export const PS2MC_FAT_ALLOCATED_BIT = 0x80000000;
export const PS2MC_FAT_CHAIN_END = 0xFFFFFFFF;
export const PS2MC_FAT_CHAIN_END_UNALLOC = 0x7FFFFFFF;
export const PS2MC_FAT_CLUSTER_MASK = 0x7FFFFFFF;
export const PS2MC_MAX_INDIRECT_FAT_CLUSTERS = 32;
export const PS2MC_CLUSTER_SIZE = 1024;

export class PS2MCError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PS2MCError';
    }
}

export class PS2MCCorrupt extends PS2MCError {
    constructor(message: string) {
        super(`Corrupt memory card: ${message}`);
        this.name = 'PS2MCCorrupt';
    }
}

/**
 * Information about a save directory on the memory card.
 */
export interface SaveInfo {
    directory: DirEntry;
    files: DirEntry[];
}

/**
 * PS2 Memory Card filesystem reader.
 */
export class PS2MemoryCard {
    private reader: BinaryReader;
    
    // Superblock fields
    public version: string = '';
    public pageSize: number = 0;
    public pagesPerCluster: number = 0;
    public pagesPerEraseBlock: number = 0;
    public clustersPerCard: number = 0;
    public allocatableClusterOffset: number = 0;
    public allocatableClusterEnd: number = 0;
    public rootdirFatCluster: number = 0;
    public goodBlock1: number = 0;
    public goodBlock2: number = 0;
    public indirectFatClusterList: Uint32Array = new Uint32Array(32);
    
    // Derived values
    public spareSize: number = 0;
    public rawPageSize: number = 0;
    public clusterSize: number = 0;
    public entriesPerCluster: number = 0;

    constructor(buffer: ArrayBuffer) {
        this.reader = new BinaryReader(buffer, true);
        this.readSuperblock();
    }

    private readSuperblock(): void {
        if (this.reader.length < 0x154) {
            throw new PS2MCCorrupt('File too small to be a PS2 memory card');
        }

        // Read magic - it should be "Sony PS2 Memory Card Format " (28 chars with trailing space)
        const magicBytes = this.reader.readBytes(28);
        const magic = new TextDecoder('ascii').decode(magicBytes);
        if (!magic.startsWith('Sony PS2 Memory Card Format')) {
            throw new PS2MCCorrupt(`Not a PS2 memory card image. Got: "${magic}"`);
        }

        // Read version (12 bytes)
        this.version = this.reader.readFixedString(12);
        
        this.pageSize = this.reader.readUint16();
        this.pagesPerCluster = this.reader.readUint16();
        this.pagesPerEraseBlock = this.reader.readUint16();
        this.reader.skip(2); // unused
        this.clustersPerCard = this.reader.readUint32();
        this.allocatableClusterOffset = this.reader.readUint32();
        this.allocatableClusterEnd = this.reader.readUint32();
        this.rootdirFatCluster = this.reader.readUint32();
        this.goodBlock1 = this.reader.readUint32();
        this.goodBlock2 = this.reader.readUint32();
        
        this.reader.skip(8); // 8 bytes reserved
        
        // Read indirect FAT cluster list (32 entries, 128 bytes)
        for (let i = 0; i < 32; i++) {
            this.indirectFatClusterList[i] = this.reader.readUint32();
        }
        
        // Skip bad erase block list (128 bytes) and last 4 bytes
        this.reader.skip(128 + 4);
        
        this.calculateDerived();
    }

    private calculateDerived(): void {
        this.spareSize = divRoundUp(this.pageSize, 128) * 4;
        this.rawPageSize = this.pageSize + this.spareSize;
        this.clusterSize = this.pageSize * this.pagesPerCluster;
        this.entriesPerCluster = (this.pageSize * this.pagesPerCluster) / 4;
    }

    /**
     * Check if the file has ECC data by examining file size.
     */
    private hasECC(): boolean {
        const expectedWithECC = this.rawPageSize * this.pagesPerCluster * this.clustersPerCard;
        const expectedWithoutECC = this.pageSize * this.pagesPerCluster * this.clustersPerCard;
        
        // If file size matches with ECC, use ECC; otherwise assume no ECC
        return this.reader.length >= expectedWithECC;
    }

    /**
     * Read a cluster from the memory card.
     */
    readCluster(n: number): Uint8Array {
        const hasECC = this.hasECC();
        if (hasECC) {
            // With ECC: need to read each page and strip spare data
            const result = new Uint8Array(this.clusterSize);
            const startPage = n * this.pagesPerCluster;
            for (let i = 0; i < this.pagesPerCluster; i++) {
                const pageOffset = (startPage + i) * this.rawPageSize;
                this.reader.seek(pageOffset);
                const pageData = this.reader.readBytes(this.pageSize);
                result.set(pageData, i * this.pageSize);
            }
            return result;
        } else {
            // Without ECC: direct read
            this.reader.seek(n * this.clusterSize);
            return this.reader.readBytes(this.clusterSize);
        }
    }

    /**
     * Read an allocatable cluster (offset by allocatableClusterOffset).
     */
    readAllocatableCluster(n: number): Uint8Array {
        return this.readCluster(n + this.allocatableClusterOffset);
    }

    /**
     * Read a FAT cluster with the correct offset calculation.
     * Returns the FAT array and the cluster number.
     */
    private readFatCluster(fatClusterIndex: number): { fat: DataView, cluster: number } {
        // Get the indirect offset within the indirect FAT cluster
        const indirectOffset = fatClusterIndex % this.entriesPerCluster;
        // Which indirect FAT cluster to read from
        const indirectClusterIndex = Math.floor(fatClusterIndex / this.entriesPerCluster);

        // Read indirect FAT cluster
        const indirectClusterNum = this.indirectFatClusterList[indirectClusterIndex];
        const indirectFat = this.readCluster(indirectClusterNum);
        const indirectView = new DataView(indirectFat.buffer, indirectFat.byteOffset);

        // Get the actual FAT cluster number
        const fatClusterNum = indirectView.getUint32(indirectOffset * 4, true);

        // Read the FAT cluster
        const fat = this.readCluster(fatClusterNum);
        return {
            fat: new DataView(fat.buffer, fat.byteOffset),
            cluster: fatClusterNum
        };
    }

    /**
     * Lookup a FAT entry (follows the chain from a cluster).
     */
    lookupFat(n: number): number {
        const offset = n % this.entriesPerCluster;
        const fatClusterIndex = Math.floor(n / this.entriesPerCluster);

        const { fat } = this.readFatCluster(fatClusterIndex);
        return fat.getUint32(offset * 4, true);
    }

    /**
     * Read file data by following FAT chain.
     */
    readFileData(firstCluster: number, length: number): Uint8Array {
        if (firstCluster === 0xFFFFFFFF || length === 0) {
            return new Uint8Array(0);
        }

        const result = new Uint8Array(length);
        let bytesRead = 0;
        let cluster = firstCluster;

        while (bytesRead < length && cluster !== PS2MC_FAT_CHAIN_END) {
            const clusterData = this.readAllocatableCluster(cluster);
            const bytesToCopy = Math.min(this.clusterSize, length - bytesRead);
            result.set(clusterData.subarray(0, bytesToCopy), bytesRead);
            bytesRead += bytesToCopy;

            // Get next cluster in chain
            const next = this.lookupFat(cluster);
            if ((next & PS2MC_FAT_ALLOCATED_BIT) === 0) {
                break; // Not allocated, end of chain
            }
            cluster = next & ~PS2MC_FAT_ALLOCATED_BIT;
            if (cluster === PS2MC_FAT_CHAIN_END_UNALLOC) {
                break;
            }
        }

        return result;
    }

    /**
     * Read directory entries from a directory cluster.
     */
    readDirectory(firstCluster: number, entryCount: number): DirEntry[] {
        const entries: DirEntry[] = [];
        const totalBytes = entryCount * PS2MC_DIRENT_LENGTH;
        const data = this.readFileData(firstCluster, totalBytes);

        for (let i = 0; i < entryCount; i++) {
            const offset = i * PS2MC_DIRENT_LENGTH;
            const entryData = data.subarray(offset, offset + PS2MC_DIRENT_LENGTH);
            entries.push(unpackDirEntry(entryData));
        }

        return entries;
    }

    /**
     * Get the root directory.
     */
    getRootDirectory(): DirEntry[] {
        // Read first entry to get length
        const cluster = this.readAllocatableCluster(0);
        const firstEntry = unpackDirEntry(cluster.subarray(0, PS2MC_DIRENT_LENGTH));
        return this.readDirectory(0, firstEntry.length);
    }

    /**
     * Get all save directories on the card.
     */
    getSaveDirectories(): SaveInfo[] {
        const saves: SaveInfo[] = [];
        const rootDir = this.getRootDirectory();

        for (const entry of rootDir) {
            // Skip . and .. and non-directories
            if (entry.name === '.' || entry.name === '..') continue;
            if (!modeIsDir(entry.mode)) continue;
            if (!(entry.mode & DF_EXISTS)) continue;

            // Read directory contents
            const files = this.readDirectory(entry.cluster, entry.length);

            saves.push({
                directory: entry,
                files: files.filter(f => modeIsFile(f.mode) && (f.mode & DF_EXISTS))
            });
        }

        return saves;
    }

    /**
     * Read a file from a save directory.
     * Uses case-insensitive matching for filename.
     */
    readFile(saveDir: SaveInfo, filename: string): Uint8Array | null {
        const lowerFilename = filename.toLowerCase();
        const file = saveDir.files.find(f => f.name.toLowerCase() === lowerFilename);
        if (!file) {
            console.log(`File not found: "${filename}" in ${saveDir.directory.name}. Available files:`, saveDir.files.map(f => f.name));
            return null;
        }

        console.log(`Reading file "${file.name}": cluster=${file.cluster}, length=${file.length}, mode=0x${file.mode.toString(16)}`);

        const data = this.readFileData(file.cluster, file.length);
        console.log(`Read ${data.length} bytes from "${file.name}"`);
        return data;
    }
}

