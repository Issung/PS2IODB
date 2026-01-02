import { IconSys } from '../model/IconSys';

/** Error information for a save that failed to parse. */
export class SaveError {
    constructor(
        public readonly message: string,
        public readonly details?: string,
    ) {}
}

/** File data for a successfully parsed save. */
export class SaveFiles {
    constructor(
        /** The icon.sys parsed data. */
        public readonly iconSys: IconSys,
        /** Raw icon file binaries for re-parsing when viewing. */
        public readonly iconFiles: Record<string, ArrayBuffer>,
    ) {}
}

/** A stored save - either has files or an error. */
export class StoredSave {
    constructor(
        public readonly id: string,
        public readonly directory: string,
        public readonly title: string,
        public readonly storedAt: number,
        public viewed: boolean,
        /** Present if parsing succeeded. */
        public readonly files?: SaveFiles,
        /** Present if parsing failed. */
        public readonly error?: SaveError,
    ) {}

    /** Whether this save has an error. */
    get hasError(): boolean {
        return this.error !== undefined;
    }
}

/** Metadata for a stored save (excludes file data for listing). */
export class StoredSaveMetadata {
    constructor(
        public readonly id: string,
        public readonly directory: string,
        public readonly title: string,
        public readonly storedAt: number,
        public readonly hasError: boolean,
        public readonly viewed: boolean,
    ) {}
}

