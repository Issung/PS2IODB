/**
 * IndexedDB helpers for the storage module.
 */

export const DB_NAME = 'PS2IODB_SaveStorage';
export const DB_VERSION = 1;
export const STORE_NAME = 'saves';

/** localStorage key for remembering last-selected save */
export const LAST_SELECTED_KEY = 'ps2iodb:lastSelectedSave';

/** Promisify an IDBRequest. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Open the database, creating object stores if needed. */
export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

