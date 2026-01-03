/**
 * Storage for PS2 save icons.
 *
 * Each save contains either the raw icon files (for successful parses)
 * or error information (for failed parses).
 * Icons are re-parsed when viewed.
 */

import { IconSys } from '../model/IconSys';
import { openDatabase, requestToPromise, STORE_NAME, LAST_SELECTED_KEY } from './db';
import { StoredSave, StoredSaveMetadata, SaveError, SaveFiles } from './types';

export class SaveStorage {
    private readonly dbPromise: Promise<IDBDatabase>;
    private db: IDBDatabase | null = null;

    constructor() {
        this.dbPromise = openDatabase().then((db) => {
            this.db = db;
            return db;
        });
    }

    /** Close the database connection. */
    dispose(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Save a successfully parsed save.
     * @param directory The save directory name (e.g. "BADATA-SYSTEM")
     * @param title The decoded save title
     * @param iconSys The IconSys data
     * @param iconFiles Raw icon file binaries for re-parsing when viewing
     */
    async saveSuccess(
        directory: string,
        title: string,
        iconSys: IconSys,
        iconFiles: Map<string, Uint8Array>,
    ): Promise<StoredSaveMetadata> {
        const id = crypto.randomUUID();
        const storedAt = Date.now();

        // Convert icon files to ArrayBuffer for storage
        const iconFilesRecord: Record<string, ArrayBuffer> = {};
        iconFiles.forEach((data, filename) => {
            iconFilesRecord[filename] = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        });

        const files = new SaveFiles(iconSys, iconFilesRecord);
        const save = new StoredSave(id, directory, title, storedAt, false, files);

        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.put(save));

        this.setLastSelectedId(id);
        return new StoredSaveMetadata(id, directory, title, storedAt, false, false);
    }

    /**
     * Save a failed parse with error information.
     * @param directory The save directory name
     * @param title The save title (may be partial or directory name)
     * @param error The error information
     */
    async saveError(
        directory: string,
        title: string,
        error: SaveError,
    ): Promise<StoredSaveMetadata> {
        const id = crypto.randomUUID();
        const storedAt = Date.now();

        const save = new StoredSave(id, directory, title, storedAt, false, undefined, error);

        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.put(save));

        return new StoredSaveMetadata(id, directory, title, storedAt, true, false);
    }

    /** Load a save by ID. */
    async load(id: string): Promise<StoredSave | null> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const result = await requestToPromise(store.get(id));
        return this.hydrateStoredSave(result) ?? null;
    }

    /** List all stored saves (metadata only, no file data). */
    async list(): Promise<StoredSaveMetadata[]> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const saves = await requestToPromise(store.getAll()) as StoredSave[];

        return saves.map((save) => new StoredSaveMetadata(
            save.id,
            save.directory,
            save.title,
            save.storedAt,
            save.error !== undefined,
            save.viewed ?? false,
        ));
    }

    /** Mark a save as viewed. */
    async markViewed(id: string): Promise<void> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        const raw = await requestToPromise(store.get(id));
        if (raw && !raw.viewed) {
            raw.viewed = true;
            await requestToPromise(store.put(raw));
        }
    }

    /** Hydrate a plain object from IndexedDB into a proper StoredSave instance. */
    private hydrateStoredSave(raw: unknown): StoredSave | undefined {
        if (!raw || typeof raw !== 'object') return undefined;
        const obj = raw as Record<string, unknown>;

        let files: SaveFiles | undefined;
        if (obj.files && typeof obj.files === 'object') {
            const f = obj.files as Record<string, unknown>;
            files = new SaveFiles(
                f.iconSys as IconSys,
                f.iconFiles as Record<string, ArrayBuffer>,
            );
        }

        let error: SaveError | undefined;
        if (obj.error && typeof obj.error === 'object') {
            const e = obj.error as Record<string, unknown>;
            error = new SaveError(e.message as string, e.details as string | undefined);
        }

        return new StoredSave(
            obj.id as string,
            obj.directory as string,
            obj.title as string,
            obj.storedAt as number,
            (obj.viewed as boolean) ?? false,
            files,
            error,
        );
    }

    /** Delete a save by ID. */
    async delete(id: string): Promise<void> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.delete(id));

        if (this.getLastSelectedId() === id) {
            this.setLastSelectedId(null);
        }
    }

    /** Rename a save by ID. */
    async rename(id: string, newTitle: string): Promise<void> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        const save = await requestToPromise(store.get(id));
        if (save) {
            save.title = newTitle;
            await requestToPromise(store.put(save));
        }
    }

    /** Clear all saves. */
    async clear(): Promise<void> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.clear());
        this.setLastSelectedId(null);
    }

    /** Get the ID of the last-selected save. */
    getLastSelectedId(): string | null {
        return localStorage.getItem(LAST_SELECTED_KEY);
    }

    /** Set or clear the last-selected save ID. */
    setLastSelectedId(id: string | null): void {
        if (id) {
            localStorage.setItem(LAST_SELECTED_KEY, id);
        } else {
            localStorage.removeItem(LAST_SELECTED_KEY);
        }
    }
}

