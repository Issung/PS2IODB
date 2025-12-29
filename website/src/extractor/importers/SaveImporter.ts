import { ImportedSave } from './ImportedSave';

/**
 * Interface for PS2 save file importers.
 * Importers implement this interface to handle specific save file formats.
 */
export interface SaveImporter {
    /**
     * The name of this importer for display/logging purposes.
     */
    readonly name: string;

    /**
     * Check if this importer can handle the given file data.
     * @param data The raw file data as a Uint8Array
     * @returns true if this importer can handle the file
     */
    handles(data: Uint8Array): boolean;

    /**
     * Load and parse the save file data.
     * @param data The raw file data as a Uint8Array
     * @returns An array of extracted saves
     */
    load(data: Uint8Array): ImportedSave[];
}

