import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import './Extractor.scss';
import { loadFile, ExtractedSave, extractedSaveToModelFiles } from '../extractor';
import { ModelView } from '../components/ModelView/ModelView';
import { FileModelLoader } from '../components/ModelView/FileModelLoader';
import { ModelFiles } from '../components/ModelView/ModelFiles';
import {
    SaveStorage,
    StoredSaveMetadata,
    StoredSave,
    storedFilesToBlobMap,
} from "../storage";

/**
 * Represents either a freshly extracted save or one loaded from storage.
 */
interface DisplaySave {
    id: string;
    directory: string;
    title: string;
    hasError: boolean;
    error?: { message: string; details?: string };
    /** Present for freshly extracted saves. */
    extracted?: ExtractedSave;
    /** Present for saves loaded from storage. */
    stored?: StoredSave;
}

/**
 * The Extractor page allows users to open PS2 memory card files
 * and view/extract save icons.
 */
function Extractor() {
    const storageRef = useRef<SaveStorage>(new SaveStorage());
    const storage = storageRef.current;

    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saves, setSaves] = useState<DisplaySave[]>([]);
    const [selectedSave, setSelectedSave] = useState<DisplaySave | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);
    const [storedSaves, setStoredSaves] = useState<StoredSaveMetadata[]>([]);

    // Restore saves from IndexedDB on mount, dispose on unmount
    useEffect(() => {
        const restoreFromStorage = async () => {
            try {
                const list = await storage.list();
                setStoredSaves(list);

                // Try to restore the last-selected save
                const lastSelectedId = storage.getLastSelectedId();
                const candidateId =
                    (lastSelectedId && list.some((s) => s.id === lastSelectedId))
                        ? lastSelectedId
                        : (list[0]?.id ?? null);

                if (candidateId) {
                    const stored = await storage.load(candidateId);
                    if (stored) {
                        const displaySave = storedToDisplaySave(stored);
                        setSaves([displaySave]);
                        setSelectedSave(displaySave);
                    }
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

    /** Convert a StoredSave to DisplaySave. */
    const storedToDisplaySave = (stored: StoredSave): DisplaySave => ({
        id: stored.id,
        directory: stored.directory,
        title: stored.title,
        hasError: stored.hasError,
        error: stored.error,
        stored,
    });

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
     * Load a file and extract saves from it.
     */
    const loadFileAndProcess = async (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setSaves([]);
        setSelectedSave(null);
        setLoading(true);

        try {
            const extractedSaves = await loadFile(selectedFile);
            const displaySaves: DisplaySave[] = [];

            for (const extracted of extractedSaves) {
                try {
                    // Convert to model files and store
                    const modelFiles = extractedSaveToModelFiles(extracted);
                    const metadata = await storage.saveSuccess(
                        extracted.directoryName,
                        extracted.title,
                        modelFiles.iconSys,
                        modelFiles.files,
                    );

                    displaySaves.push({
                        id: metadata.id,
                        directory: extracted.directoryName,
                        title: extracted.title,
                        hasError: false,
                        extracted,
                    });
                } catch (err) {
                    // Store with error info
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    const metadata = await storage.saveError(
                        extracted.directoryName,
                        extracted.title,
                        { message: errorMsg },
                    );

                    displaySaves.push({
                        id: metadata.id,
                        directory: extracted.directoryName,
                        title: extracted.title,
                        hasError: true,
                        error: { message: errorMsg },
                    });
                }
            }

            setSaves(displaySaves);
            setStoredSaves(await storage.list());

            if (displaySaves.length > 0) {
                const firstGood = displaySaves.find(s => !s.hasError) ?? displaySaves[0];
                setSelectedSave(firstGood);
                storage.setLastSelectedId(firstGood.id);
            }
        } catch (err) {
            console.error('Failed to parse file:', err);
            setError(err instanceof Error ? err.message : 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            loadFileAndProcess(files[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStoredSaveClick = async (id: string) => {
        try {
            const stored = await storage.load(id);
            if (!stored) return;

            storage.setLastSelectedId(id);
            const displaySave = storedToDisplaySave(stored);
            setSaves([displaySave]);
            setSelectedSave(displaySave);
            setFile(null);
        } catch (err) {
            console.error('Failed to load stored save:', err);
        }
    };

    const handleStoredSaveDelete = async (id: string) => {
        try {
            await storage.delete(id);
            setStoredSaves((prev) => prev.filter((s) => s.id !== id));
            setSaves((prev) => prev.filter((s) => s.id !== id));
            if (selectedSave?.id === id) {
                setSelectedSave(null);
            }
        } catch (err) {
            console.error('Failed to delete stored save:', err);
        }
    };

    const handleSaveSelect = useCallback((save: DisplaySave) => {
        setSelectedSave(save);
        storage.setLastSelectedId(save.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Create a ModelLoader for the selected save
    const modelLoader = useMemo(() => {
        if (!selectedSave || selectedSave.hasError) return null;

        // If freshly extracted, use extracted data
        if (selectedSave.extracted) {
            const modelFiles = extractedSaveToModelFiles(selectedSave.extracted);
            return new FileModelLoader(modelFiles);
        }

        // If from storage, reconstruct from stored files
        if (selectedSave.stored?.files) {
            const blobMap = storedFilesToBlobMap(selectedSave.stored.files.files);
            const modelFiles = new ModelFiles(blobMap, selectedSave.stored.files.iconSys);
            return new FileModelLoader(modelFiles);
        }

        return null;
    }, [selectedSave]);

	    return (
	        <div className="extractor-page" onDrop={handleDrop} onDragOver={handleDragOver}>
	            {/* Header */}
	            <header className="extractor-header">
	                <h1>PS2 Icon Extractor</h1>
	                <div className="file-input-section">
	                    <label htmlFor="mc-file-input" className="file-input-label">
	                        <span>Open File</span>
	                        <input
	                            id="mc-file-input"
	                            type="file"
	                            accept=".ps2,.psu,.max,.sps,.xps,.cbs,.psv"
	                            onChange={handleFileChange}
	                        />
	                    </label>
	                    {file && <span className="file-name">{file.name}</span>}
	                </div>
                {storedSaves.length > 0 && (
                    <div className="stored-files">
                        <span className="label">Recent saves:</span>
                        <ul>
                            {storedSaves.map((stored) => (
                                <li
                                    key={stored.id}
                                    className={stored.id === selectedSave?.id ? 'active' : undefined}
                                >
                                    <button
                                        type="button"
                                        className="stored-file-button"
                                        onClick={() => handleStoredSaveClick(stored.id)}
                                    >
                                        {stored.title || stored.directory}
                                    </button>
                                    <button
                                        type="button"
                                        className="stored-file-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStoredSaveDelete(stored.id);
                                        }}
                                    >
                                        X
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
	            </header>

            {/* Main content */}
            <Group orientation="horizontal" className="extractor-main">
                {/* Left panel - Directory listing */}
                <Panel defaultSize="40%" minSize="200px" className="directory-panel">
                    {!file && !loading && !isRestoring && (
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
                                        <th>Directory</th>
                                        <th>Title</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saves.map((save) => (
                                        <tr
                                            key={save.id}
                                            onClick={() => handleSaveSelect(save)}
                                            className={selectedSave?.id === save.id ? 'selected' : ''}
                                        >
                                            <td className="dir-name">{save.directory}</td>
                                            <td className="title">{save.title}</td>
                                            <td className="status">{save.hasError ? '❌' : '✓'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <Separator className="resize-handle" />

                {/* Right panel - Icon viewer */}
                <Panel minSize="300px" className="viewer-panel">
                    {selectedSave && (
                        <>
                            {/* Title display */}
                            <div className="save-title">
                                <h2>{selectedSave.title}</h2>
                            </div>

                            {/* 3D Icon viewer */}
                            {modelLoader && (
                                <ModelView loader={modelLoader} embedded={true} hideControls={false} />
                            )}

                            {!modelLoader && (
                                <div className="no-icon-message">
                                    No icons available for this save
                                </div>
                            )}
                        </>
                    )}

                    {!selectedSave && saves.length > 0 && (
                        <div className="no-selection-message">
                            Select a save from the list to view its icon
                        </div>
                    )}
                </Panel>
            </Group>

            {/* Status bar */}
            <footer className="extractor-footer">
                {saves.length > 0 && (
                    <span>{saves.length} save{saves.length !== 1 ? 's' : ''} found</span>
                )}
                {selectedSave && (
                    <span>Selected: {selectedSave.directory}</span>
                )}
            </footer>
        </div>
    );
}

export default Extractor;

