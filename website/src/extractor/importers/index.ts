export { CodeBreakerImporter } from './CodeBreakerImporter';
export { EmsPsuImporter } from './EmsPsuImporter';
export type { ImportedSave } from './ImportedSave';
export { MaxDriveImporter as MaxImporter } from './MaxImporter';
export { MemcardImporter } from './MemcardImporter';
export { PsvImporter } from './PsvImporter';
export type { SaveImporter } from './SaveImporter';
export { SharkPortImporter } from './SharkPortImporter';

import { CodeBreakerImporter } from './CodeBreakerImporter';
import { EmsPsuImporter } from './EmsPsuImporter';
import { MaxDriveImporter } from './MaxImporter';
import { MemcardImporter } from './MemcardImporter';
import { PsvImporter } from './PsvImporter';
import { SaveImporter } from './SaveImporter';
import { SharkPortImporter } from './SharkPortImporter';

/**
 * List of all registered save importers.
 * Importers are checked in order, so more specific formats should come first.
 */
export const importers: SaveImporter[] = [
    new MemcardImporter(),

    new CodeBreakerImporter(),
    new SharkPortImporter(),
    new PsvImporter(),
    new MaxDriveImporter(),
    new EmsPsuImporter(),  // Import EMS/PSU last since it has no magic bytes - uses heuristics based upon directory structure.
];

