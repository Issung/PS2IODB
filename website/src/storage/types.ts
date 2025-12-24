import { IconSys } from '../model/IconSys';

/** Metadata for a stored save (excludes file data for listing). */
export interface StoredSaveMetadata {
    id: string;
    directory: string;
    title: string;
    storedAt: number;
    hasError: boolean;
}

/** Error information for a save that failed to parse. */
export interface SaveError {
    message: string;
    details?: string;
}

/** File data for a successfully parsed save. */
export interface SaveFiles {
    /** The iconsys.json content. */
    iconSys: IconSys;
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

