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
}

/**
 * Panel component that displays the list of saves.
 * Shows loading state, errors, empty state, or the saves table.
 */
export function SavesListPanel({
    saves,
    selectedSaveId,
    loading,
    isRestoring,
    error,
    onSaveSelect,
    onContextMenu,
}: SavesListPanelProps
) {
    return (
        <>
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
        </>
    );
}

