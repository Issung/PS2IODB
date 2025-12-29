/**
 * CodeBreaker save file importer (stub).
 * Handles loading and parsing CodeBreaker format save files.
 */

import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

/**
 * Importer for CodeBreaker format save files.
 * Currently a stub - load() is not implemented.
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
     * @throws Error - Not yet implemented
     */
    load(_data: Uint8Array): ImportedSave[] {
        throw new Error('CodeBreaker format loading is not yet implemented');
    }
}

