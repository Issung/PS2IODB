/**
 * MAX Drive save file importer (stub).
 * Handles loading and parsing MAX Drive format save files.
 */

import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

/**
 * Importer for MAX Drive format save files.
 * Currently a stub - load() is not implemented.
 */
export class MaxImporter implements SaveImporter {
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
        return magic === 'Ps2PowerSave';
    }

    /**
     * Load and parse a MAX Drive format save file.
     * @throws Error - Not yet implemented
     */
    load(_data: Uint8Array): ImportedSave[] {
        throw new Error('MAX Drive format loading is not yet implemented');
    }
}

