/**
 * PS2 save file importers.
 * Provides classes for importing various PS2 save file formats.
 */

export type { ImportedSave } from './ImportedSave';
export type { SaveImporter } from './SaveImporter';
export { PsuImporter } from './PsuImporter';
export { MemcardImporter } from './MemcardImporter';
export { MaxImporter } from './MaxImporter';
export { SharkPortImporter } from './SharkPortImporter';
export { CodeBreakerImporter } from './CodeBreakerImporter';

import { SaveImporter } from './SaveImporter';
import { MemcardImporter } from './MemcardImporter';
import { PsuImporter } from './PsuImporter';
import { MaxImporter } from './MaxImporter';
import { SharkPortImporter } from './SharkPortImporter';
import { CodeBreakerImporter } from './CodeBreakerImporter';

/**
 * List of all registered save importers.
 * Importers are checked in order, so more specific formats should come first.
 * Note: MAX, SharkPort, and CodeBreaker are stubs - they detect but don't load.
 */
export const importers: SaveImporter[] = [
    new MemcardImporter(),
    new MaxImporter(),
    new SharkPortImporter(),
    new CodeBreakerImporter(),
    new PsuImporter(),  // PSU last since it has no magic bytes - uses heuristics based upon directory structure.
];

