/**
 * SharkPort save file importer (stub).
 * Handles loading and parsing SharkPort/X-Port format save files.
 */

import { ImportedSave } from './ImportedSave';
import { SaveImporter } from './SaveImporter';

/**
 * Importer for SharkPort format save files.
 * Currently a stub - load() is not implemented.
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
     * @throws Error - Not yet implemented
     */
    load(_data: Uint8Array): ImportedSave[] {
        throw new Error('SharkPort format loading is not yet implemented');
    }
}

