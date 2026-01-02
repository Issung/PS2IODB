import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Link } from "react-router-dom";
import { ContextMenu, ContextMenuItem, useContextMenu, useLongPress } from '../components/ContextMenu';
import { FileModelLoader } from '../components/ModelView/FileModelLoader';
import { ModelView } from '../components/ModelView/ModelView';
import { loadFile } from '../extractor';
import {
    SaveStorage,
    StoredSave,
    StoredSaveMetadata,
    storedSaveToModelFiles,
} from "../storage";
import './Extractor.scss';

/** Props for the SaveRow component. */
interface SaveRowProps {
    save: StoredSaveMetadata;
    isSelected: boolean;
    onSelect: () => void;
    onContextMenu: (x: number, y: number, saveId: string) => void;
}

/** A single row in the saves table with long-press support. */
function SaveRow({ save, isSelected, onSelect, onContextMenu }: SaveRowProps) {
    const longPressHandlers = useLongPress(onContextMenu, save.id);

    return (
        <tr
            onClick={onSelect}
            className={isSelected ? 'selected' : ''}
            {...longPressHandlers}
        >
            <td className="unread-indicator">
                {!save.viewed && <span className="unread-dot" title="Not yet viewed">●</span>}
            </td>
            <td className="dir-name">{save.directory}</td>
            <td className="title">{save.title}</td>
            <td className="status">{save.hasError ? '❌' : '✓'}</td>
        </tr>
    );
}

/**
 * The Extractor page allows users to open PS2 memory card files
 * and view/extract save icons.
 */
function Extractor() {
    const storageRef = useRef<SaveStorage>(new SaveStorage());
    const storage = storageRef.current;

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saves, setSaves] = useState<StoredSaveMetadata[]>([]);
    const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
    const [selectedSaveData, setSelectedSaveData] = useState<StoredSave | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const contextMenu = useContextMenu();

    // Context menu items for saves
    const saveContextMenuItems: ContextMenuItem[] = useMemo(() => [
        { id: 'delete', label: 'Delete', danger: true },
    ], []);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Select a save and load its data. */
    const selectSave = async (id: string, currentSaves?: StoredSaveMetadata[]) => {
        const stored = await storage.load(id);
        if (!stored) return;

        setSelectedSaveId(id);
        setSelectedSaveData(stored);
        storage.setLastSelectedId(id);

        // Mark as viewed and update local state
        if (!stored.viewed) {
            await storage.markViewed(id);
            const savesToUpdate = currentSaves ?? saves;
            setSaves(savesToUpdate.map(s => s.id === id ? { ...s, viewed: true } : s));
        }
    };

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadFileAndProcess(files[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    /**
     * Load a file and extract saves from it, adding to storage.
     */
    const loadFileAndProcess = async (selectedFile: File) => {
        setError(null);
        setLoading(true);

        try {
            const importedSaves = await loadFile(selectedFile);
            const newSaveIds: string[] = [];

            for (const extracted of importedSaves) {
                // Get directory and title from iconSys if available
                const directory = extracted.iconSys?.directory ?? 'Unknown';
                const title = extracted.iconSys?.title ?? directory;

                try {
                    if (!extracted.iconSys) {
                        throw new Error('No iconSys data found');
                    }
                    // Store raw icon files for re-parsing when viewing
                    const metadata = await storage.saveSuccess(
                        directory,
                        title,
                        extracted.iconSys,
                        extracted.iconFiles,
                    );
                    newSaveIds.push(metadata.id);
                } catch (err) {
                    // Store with error info
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
    };

    const handleFilesImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            for (let i = 0; i < files.length; ++i) {
                await loadFileAndProcess(files[i]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSaveSelect = async (save: StoredSaveMetadata) => {
        await selectSave(save.id);
    };

    const handleSaveDelete = async (id: string) => {
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
    };

    const handleClearAll = async () => {
        setShowClearConfirm(false);
        try {
            await storage.clear();
            setSaves([]);
            setSelectedSaveId(null);
            setSelectedSaveData(null);
        } catch (err) {
            console.error('Failed to clear saves:', err);
        }
    };

    const handleSaveContextMenu = useCallback((x: number, y: number, saveId: string) => {
        contextMenu.show(x, y, saveId);
    }, [contextMenu]);

    const handleContextMenuItemClick = (itemId: string, data?: unknown) => {
        const saveId = data as string;
        if (itemId === 'delete' && saveId) {
            handleSaveDelete(saveId);
        }
    };

    // Create a ModelLoader for the selected save by re-parsing icons
    const modelLoader = useMemo(() => {
        if (!selectedSaveData || selectedSaveData.hasError || !selectedSaveData.files) {
            return null;
        }

        // Re-parse raw icon files to generate OBJ/MTL/PNG/ANIM
        const modelFiles = storedSaveToModelFiles(selectedSaveData.files);
        return new FileModelLoader(modelFiles);
    }, [selectedSaveData]);

    return (
        <div className="extractor-page" onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Header */}
            <header className="extractor-header">
                <Link to="/">
                    <img id="logo-full" src="/images/logo-full-min.svg" height="40px" alt="PS2IODB Logo"/>
                </Link>
                <h1>Icon Extractor</h1>
                <div className="file-input-section">
                    <label htmlFor="mc-file-input" className="file-input-label">
                        <span>Import File</span>
                        <input
                            id="mc-file-input"
                            type="file"
                            accept=".ps2,.psu,.max,.sps,.xps,.cbs,.psv"
                            multiple
                            onChange={handleFilesImport}
                        />
                    </label>
                    {saves.length > 0 && (
                        <button
                            type="button"
                            className="clear-button"
                            onClick={() => setShowClearConfirm(true)}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* Main content */}
            <Group orientation="horizontal" className="extractor-main">
                {/* Left panel - Directory listing */}
                <Panel defaultSize="40%" minSize="200px" className="directory-panel">
                    {saves.length === 0 && !loading && !isRestoring && (
                        <div className="drop-zone">
                            <p>Drop a PS2 memory card (.ps2) or save file (.psu) here</p>
                            <p className="hint">or use the "Open File" button above</p>
                        </div>
                    )}

                    {(loading || isRestoring) && (
                        <div className="loading-message">
                            <div className="spinner"></div>
                            <p>{isRestoring ? 'Restoring...' : 'Loading...'}</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {saves.length > 0 && (
                        <div className="saves-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Directory</th>
                                        <th>Title</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saves.map((save) => (
                                        <SaveRow
                                            key={save.id}
                                            save={save}
                                            isSelected={selectedSaveId === save.id}
                                            onSelect={() => handleSaveSelect(save)}
                                            onContextMenu={handleSaveContextMenu}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <Separator className="resize-handle" />

                {/* Right panel - Icon viewer */}
                <Panel minSize="300px" className="viewer-panel">
                    {selectedSaveData && (
                        <>
                            {/* Title display */}
                            <div className="save-title">
                                <h2>{selectedSaveData.title}</h2>
                            </div>

                            {/* 3D Icon viewer */}
                            {modelLoader && (
                                <ModelView loader={modelLoader} hideControls={false} />
                            )}

                            {!modelLoader && (
                                <div className="no-icon-message">
                                    No icons available for this save
                                </div>
                            )}
                        </>
                    )}

                    {!selectedSaveData && saves.length > 0 && (
                        <div className="no-selection-message">
                            Select a save from the list to view its icon
                        </div>
                    )}
                </Panel>
            </Group>

            {/* Clear confirmation modal */}
            {showClearConfirm && (
                <div className="confirm-modal-overlay" onClick={() => setShowClearConfirm(false)}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-modal-header">
                            <h5>Clear All Saves</h5>
                            <button
                                type="button"
                                className="confirm-modal-close"
                                onClick={() => setShowClearConfirm(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="confirm-modal-body">
                            <p>Are you sure you want to remove all {saves.length} saved {saves.length === 1 ? 'item' : 'items'}? This action cannot be undone.</p>
                        </div>
                        <div className="confirm-modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save context menu */}
            <ContextMenu
                items={saveContextMenuItems}
                state={contextMenu.state}
                onItemClick={handleContextMenuItemClick}
                onClose={contextMenu.close}
            />
        </div>
    );
}

export default Extractor;

