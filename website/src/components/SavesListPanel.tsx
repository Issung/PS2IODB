import { useCallback, useEffect } from 'react';
import { StoredSaveMetadata } from '../storage';
import { SaveRow } from './SaveRow';

export interface SavesListPanelProps {
    /** List of saves to display. */
    saves: StoredSaveMetadata[];
    /** Currently selected save ID. */
    selectedSaveId: string | null;
    /** Whether the file is currently loading. */
    loading: boolean;
    /** Whether we're restoring from storage. */
    isRestoring: boolean;
    /** Error message to display, if any. */
    error: string | null;
    /** Called when a save is selected. */
    onSaveSelect: (save: StoredSaveMetadata) => void;
    /** Called when context menu is triggered on a save. */
    onContextMenu: (x: number, y: number, saveId: string) => void;
    /** Called when rename is requested for the selected save. */
    onRename?: (save: StoredSaveMetadata) => void;
    /** Called when delete is requested for the selected save. */
    onDelete?: (save: StoredSaveMetadata) => void;
    /** Called when extract is requested for the selected save. */
    onExtract?: (save: StoredSaveMetadata) => void;
}

/**
 * Panel component that displays the list of saves.
 * Shows loading state, errors, empty state, or the saves table.
 * Supports keyboard navigation: Up/Down to select, R to rename, Delete to delete, E to extract.
 */
export function SavesListPanel({
    saves,
    selectedSaveId,
    loading,
    isRestoring,
    error,
    onSaveSelect,
    onContextMenu,
    onRename,
    onDelete,
    onExtract,
}: SavesListPanelProps
) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't handle if user is typing in an input or modal is open
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }
        // Don't handle if a modal is open (check for modal backdrop)
        if (document.querySelector('.modal-backdrop')) {
            return;
        }

        if (saves.length === 0) return;

        const currentIndex = saves.findIndex(s => s.id === selectedSaveId);

        switch (e.key) {
            case 'ArrowUp': {
                e.preventDefault();
                if (currentIndex > 0) {
                    onSaveSelect(saves[currentIndex - 1]);
                } else if (currentIndex === -1 && saves.length > 0) {
                    // Nothing selected, select last
                    onSaveSelect(saves[saves.length - 1]);
                }
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                if (currentIndex < saves.length - 1) {
                    onSaveSelect(saves[currentIndex + 1]);
                } else if (currentIndex === -1 && saves.length > 0) {
                    // Nothing selected, select first
                    onSaveSelect(saves[0]);
                }
                break;
            }
            case 'r':
            case 'R': {
                // Don't intercept Ctrl+R (browser refresh)
                if (e.ctrlKey) break;
                if (selectedSaveId && onRename) {
                    const save = saves.find(s => s.id === selectedSaveId);
                    if (save) {
                        e.preventDefault();
                        onRename(save);
                    }
                }
                break;
            }
            case 'Delete': {
                if (selectedSaveId && onDelete) {
                    const save = saves.find(s => s.id === selectedSaveId);
                    if (save) {
                        e.preventDefault();
                        onDelete(save);
                    }
                }
                break;
            }
            case 'e':
            case 'E': {
                if (selectedSaveId && onExtract) {
                    const save = saves.find(s => s.id === selectedSaveId);
                    if (save) {
                        e.preventDefault();
                        onExtract(save);
                    }
                }
                break;
            }
        }
    }, [saves, selectedSaveId, onSaveSelect, onRename, onDelete, onExtract]);

    // Global keyboard listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div
            className="saves-list-panel"
        >
            {saves.length === 0 && !loading && !isRestoring && (
                <div className="drop-zone">
                    <p>Drop a PS2 memory card (.ps2) or supported save file (.cbs, .max, .psu, .psv, .sps, .xps) here</p>
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
                                    onSelect={() => onSaveSelect(save)}
                                    onContextMenu={onContextMenu}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

