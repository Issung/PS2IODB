import { IconSys } from '../model/IconSys';

/** Metadata for a stored save (excludes file data for listing). */
export interface StoredSaveMetadata {
    id: string;
    directory: string;
    title: string;
    storedAt: number;
    hasError: boolean;
    /** Whether this save has been viewed by the user. */
    viewed: boolean;
}

/** Error information for a save that failed to parse. */
export interface SaveError {
    message: string;
    details?: string;
}

/** File data for a successfully parsed save. */
export interface SaveFiles {
    /** The icon.sys parsed data. */
    iconSys: IconSys;
    /** Raw icon file binaries for re-parsing when extraction code changes. */
    iconFiles: Record<string, ArrayBuffer>;
    /** Map of filename -> file data (ArrayBuffer for binary, string for text). */
    files: Record<string, ArrayBuffer | string>;
}

/** A stored save - either has files or an error. */
export interface StoredSave extends StoredSaveMetadata {
    /** Present if parsing succeeded. */
    files?: SaveFiles;
    /** Present if parsing failed. */
    error?: SaveError;
}

