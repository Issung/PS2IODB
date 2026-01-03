import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFile } from '../extractor';
import {
    SaveStorage,
    StoredSave,
    StoredSaveMetadata,
} from '../storage';

export interface UseSaveStorageResult {
    /** List of all saves metadata. */
    saves: StoredSaveMetadata[];
    /** Currently selected save ID. */
    selectedSaveId: string | null;
    /** Full data for the selected save. */
    selectedSaveData: StoredSave | null;
    /** Whether we're restoring from storage on mount. */
    isRestoring: boolean;
    /** Whether we're loading a file. */
    loading: boolean;
    /** Error message if something failed. */
    error: string | null;
    /** Select a save by ID. */
    selectSave: (id: string) => Promise<void>;
    /** Load and process a file. */
    loadFileAndProcess: (file: File) => Promise<void>;
    /** Delete a save by ID. */
    deleteSave: (id: string) => Promise<void>;
    /** Clear all saves. */
    clearAll: () => Promise<void>;
    /** Load a save by ID (without selecting). */
    loadSave: (id: string) => Promise<StoredSave | null>;
}

/**
 * Hook to manage save storage state and operations.
 * Handles loading, selecting, deleting, and clearing saves.
 */
export function useSaveStorage(): UseSaveStorageResult {
    const storageRef = useRef<SaveStorage>(new SaveStorage());
    const storage = storageRef.current;

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saves, setSaves] = useState<StoredSaveMetadata[]>([]);
    const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
    const [selectedSaveData, setSelectedSaveData] = useState<StoredSave | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);

    /** Select a save and load its data. */
    const selectSave = useCallback(async (id: string, currentSaves?: StoredSaveMetadata[]) => {
        const stored = await storage.load(id);
        if (!stored) return;

        setSelectedSaveId(id);
        setSelectedSaveData(stored);
        storage.setLastSelectedId(id);

        // Mark as viewed and update local state
        if (!stored.viewed) {
            await storage.markViewed(id);
            setSaves(prev => {
                const savesToUpdate = currentSaves ?? prev;
                return savesToUpdate.map(s => s.id === id ? { ...s, viewed: true } : s);
            });
        }
    }, [storage]);

    // Load all saves from storage on mount
    useEffect(() => {
        const restoreFromStorage = async () => {
            try {
                const list = await storage.list();
                setSaves(list);

                // Try to select the last-selected save
                const lastSelectedId = storage.getLastSelectedId();
                if (lastSelectedId && list.some((s) => s.id === lastSelectedId)) {
                    await selectSave(lastSelectedId, list);
                }
            } catch (err) {
                console.error('Failed to restore from storage:', err);
            } finally {
                setIsRestoring(false);
            }
        };
        restoreFromStorage();

        return () => {
            storage.dispose();
        };
    }, [storage, selectSave]);

    /** Load a file and extract saves from it, adding to storage. */
    const loadFileAndProcess = useCallback(async (selectedFile: File) => {
        setError(null);
        setLoading(true);

        try {
            const importedSaves = await loadFile(selectedFile);
            const newSaveIds: string[] = [];

            for (const extracted of importedSaves) {
                const directory = extracted.iconSys?.directory ?? 'Unknown';
                const title = extracted.iconSys?.title ?? directory;

                try {
                    if (!extracted.iconSys) {
                        throw new Error('No iconSys data found');
                    }
                    const metadata = await storage.saveSuccess(
                        directory,
                        title,
                        extracted.iconSys,
                        extracted.iconFiles,
                    );
                    newSaveIds.push(metadata.id);
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    const metadata = await storage.saveError(
                        directory,
                        title,
                        { message: errorMsg },
                    );
                    newSaveIds.push(metadata.id);
                }
            }

            // Refresh the full list from storage
            const updatedList = await storage.list();
            setSaves(updatedList);

            // Select the first newly added save
            if (newSaveIds.length > 0) {
                const firstNewSave = updatedList.find(s => s.id === newSaveIds[0] && !s.hasError)
                    ?? updatedList.find(s => s.id === newSaveIds[0]);
                if (firstNewSave) {
                    await selectSave(firstNewSave.id, updatedList);
                }
            }
        } catch (err) {
            console.error('Failed to parse file:', err);
            setError(err instanceof Error ? err.message : 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    }, [storage, selectSave]);

    /** Delete a save by ID. */
    const deleteSave = useCallback(async (id: string) => {
        try {
            await storage.delete(id);
            setSaves((prev) => prev.filter((s) => s.id !== id));
            if (selectedSaveId === id) {
                setSelectedSaveId(null);
                setSelectedSaveData(null);
            }
        } catch (err) {
            console.error('Failed to delete save:', err);
        }
    }, [storage, selectedSaveId]);

    /** Clear all saves. */
    const clearAll = useCallback(async () => {
        try {
            await storage.clear();
            setSaves([]);
            setSelectedSaveId(null);
            setSelectedSaveData(null);
        } catch (err) {
            console.error('Failed to clear saves:', err);
        }
    }, [storage]);

    /** Load a save by ID without selecting it. */
    const loadSave = useCallback(async (id: string): Promise<StoredSave | null> => {
        return storage.load(id);
    }, [storage]);

    return {
        saves,
        selectedSaveId,
        selectedSaveData,
        isRestoring,
        loading,
        error,
        selectSave,
        loadFileAndProcess,
        deleteSave,
        clearAll,
        loadSave,
    };
}

