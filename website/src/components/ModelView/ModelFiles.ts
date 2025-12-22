import { IconSys } from "../../model/IconSys";

/**
 * Represents a set of uploaded model files.
 * Requires an iconsys.json file which defines the variants and their filenames.
 */
export class ModelFiles {
    constructor(
        /** Map of filename to File/Blob, e.g. { "icon00.ico.obj": File, "icon00.ico.mtl": File, ... } */
        readonly files: Map<string, Blob>,
        /** IconSys data from iconsys.json - required for file-based loading */
        readonly iconSys: IconSys,
    ) {}
}