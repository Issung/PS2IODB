/**
 * Storage for parsed PS2 save icons.
 *
 * Each save contains either the generated model files (for successful parses)
 * or error information (for failed parses).
 */

import { IconSys } from '../model/IconSys';
import { openDatabase, requestToPromise, STORE_NAME, LAST_SELECTED_KEY } from './db';
import { StoredSave, StoredSaveMetadata, SaveError } from './types';

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
     * @param files Map of filename -> Blob (obj, mtl, png, anim files)
     */
    async saveSuccess(
        directory: string,
        title: string,
        iconSys: IconSys,
        files: Map<string, Blob>,
    ): Promise<StoredSaveMetadata> {
        const id = crypto.randomUUID();
        const filesRecord: Record<string, ArrayBuffer | string> = {};

        // Convert Blobs to ArrayBuffer/string for storage
        const entries = Array.from(files.entries());
        for (const [filename, blob] of entries) {
            if (filename.endsWith('.obj') || filename.endsWith('.mtl') || filename.endsWith('.anim')) {
                filesRecord[filename] = await blob.text();
            } else {
                filesRecord[filename] = await blob.arrayBuffer();
            }
        }

        const save: StoredSave = {
            id,
            directory,
            title,
            storedAt: Date.now(),
            hasError: false,
            files: { iconSys, files: filesRecord },
        };

        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.put(save));

        this.setLastSelectedId(id);
        return { id, directory, title, storedAt: save.storedAt, hasError: false };
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

        const save: StoredSave = {
            id,
            directory,
            title,
            storedAt: Date.now(),
            hasError: true,
            error,
        };

        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await requestToPromise(store.put(save));

        return { id, directory, title, storedAt: save.storedAt, hasError: true };
    }

    /** Load a save by ID. */
    async load(id: string): Promise<StoredSave | null> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const result = await requestToPromise(store.get(id));
        return (result as StoredSave | undefined) ?? null;
    }

    /** List all stored saves (metadata only, no file data). */
    async list(): Promise<StoredSaveMetadata[]> {
        const db = await this.dbPromise;
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const saves = await requestToPromise(store.getAll()) as StoredSave[];

        return saves.map(({ id, directory, title, storedAt, hasError }) => ({
            id,
            directory,
            title,
            storedAt,
            hasError,
        }));
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

