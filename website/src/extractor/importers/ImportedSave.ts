import { IconSys } from "../../model/IconSys";

/**
 * Information about an imported save with raw icon file binaries.
 * The icon files are stored as raw binary data so they can be re-parsed
 * when extraction code is updated.
 */
export interface ImportedSave {
    iconSys: IconSys | null;
    /** Map of icon filename -> raw .ico file binary data */
    iconFiles: Map<string, Uint8Array>;
}
