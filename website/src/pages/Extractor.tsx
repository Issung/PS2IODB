import { useState, useCallback, useMemo } from "react";
import './Extractor.scss';
import { loadFile, ExtractedSave, extractedSaveToModelFiles } from '../extractor';
import { ModelView } from '../components/ModelView/ModelView';
import { FileModelLoader } from '../components/ModelView/FileModelLoader';

/**
 * The Extractor page allows users to open PS2 memory card files
 * and view/extract save icons.
 */
function Extractor() {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saves, setSaves] = useState<ExtractedSave[]>([]);
    const [selectedSave, setSelectedSave] = useState<ExtractedSave | null>(null);

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadFileAndProcess(files[0]);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const loadFileAndProcess = async (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setSaves([]);
        setSelectedSave(null);
        setLoading(true);

        try {
            const extractedSaves = await loadFile(selectedFile);
            setSaves(extractedSaves);
            if (extractedSaves.length === 1) {
                setSelectedSave(extractedSaves[0]);
            } else if (extractedSaves.length > 0) {
                setSelectedSave(extractedSaves[0]);
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
    }, []);

    const handleSaveSelect = useCallback((save: ExtractedSave) => {
        setSelectedSave(save);
    }, []);

    // Create a ModelLoader for the selected save
    const modelLoader = useMemo(() => {
        if (!selectedSave?.iconSys || selectedSave.icons.size === 0) {
            return null;
        }
        const modelFiles = extractedSaveToModelFiles(selectedSave);
        return new FileModelLoader(modelFiles);
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
            </header>

            {/* Main content */}
            <div className="extractor-main">
                {/* Left panel - Directory listing */}
                <div className="directory-panel">
                    {!file && !loading && (
                        <div className="drop-zone">
                            <p>Drop a PS2 memory card (.ps2) or save file (.psu) here</p>
                            <p className="hint">or use the "Open File" button above</p>
                        </div>
                    )}

                    {loading && (
                        <div className="loading-message">
                            <div className="spinner"></div>
                            <p>Loading...</p>
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
                                        <th>Icons</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saves.map((save, index) => (
                                        <tr
                                            key={index}
                                            onClick={() => handleSaveSelect(save)}
                                            className={selectedSave === save ? 'selected' : ''}
                                        >
                                            <td className="dir-name">{save.directoryName}</td>
                                            <td className="title">{save.title}</td>
                                            <td className="icon-count">{save.icons.size}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right panel - Icon viewer */}
                <div className="viewer-panel">
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
                </div>
            </div>

            {/* Status bar */}
            <footer className="extractor-footer">
                {saves.length > 0 && (
                    <span>{saves.length} save{saves.length !== 1 ? 's' : ''} found</span>
                )}
                {selectedSave && (
                    <span>Selected: {selectedSave.directoryName}</span>
                )}
            </footer>
        </div>
    );
}

export default Extractor;

