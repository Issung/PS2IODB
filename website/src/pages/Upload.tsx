import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FileModelLoader } from "../components/ModelView/FileModelLoader";
import { ModelLoader } from "../components/ModelView/ModelLoader";
import { ModelFiles } from "../components/ModelView/ModelFiles";
import { ModelView } from "../components/ModelView/ModelView";
import './Upload.scss';
import {
    SaveStorage,
    StoredSaveMetadata,
    storedFilesToBlobMap,
} from "../storage";

/**
 * Upload page that allows users to upload a zip file containing icon assets
 * and view them using the ModelView component.
 */
const Upload = () => {
    const storageRef = useRef<SaveStorage>(new SaveStorage());
    const storage = storageRef.current;

    const [loader, setLoader] = useState<ModelLoader | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(true);
    const [currentSave, setCurrentSave] = useState<StoredSaveMetadata | null>(null);

    // Restore from IndexedDB on mount, dispose on unmount
    useEffect(() => {
        const restoreFromStorage = async () => {
            try {
                const lastSelectedId = storage.getLastSelectedId();
                if (lastSelectedId) {
                    const stored = await storage.load(lastSelectedId);
                    if (stored?.files) {
                        const blobMap = storedFilesToBlobMap(stored.files.files);
                        const modelFiles = new ModelFiles(blobMap, stored.files.iconSys);
                        setLoader(new FileModelLoader(modelFiles));
                        setCurrentSave({
                            id: stored.id,
                            directory: stored.directory,
                            title: stored.title,
                            storedAt: stored.storedAt,
                            hasError: stored.hasError,
                            viewed: stored.viewed ?? true,
                        });
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

    /**
     * Process a zip file and create a model loader.
     */
    const processFile = async (file: File) => {
        setIsLoading(true);
        setError(undefined);
        setLoader(undefined);
        setCurrentSave(null);

        try {
            // Parse the zip and create a loader
            const newLoader = await FileModelLoader.fromZipFile(file);
            const modelFiles = newLoader.getModelFiles();

            // Store the parsed files
            const metadata = await storage.saveSuccess(
                file.name,
                modelFiles.iconSys.title ?? file.name,
                modelFiles.iconSys,
                modelFiles.files,
            );
            storage.setLastSelectedId(metadata.id);

            setLoader(newLoader);
            setCurrentSave(metadata);
        } catch (e) {
            console.error('Error processing zip file:', e);
            setError(e instanceof Error ? e.message : 'Unknown error processing zip file');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await processFile(file);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReset = useCallback(async () => {
        setLoader(undefined);
        setError(undefined);
        setCurrentSave(null);
        storage.setLastSelectedId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div id="upload">
            <Link id="back" to="/">← Home</Link>

            {isRestoring ? (
                <div className="upload-container">
                    <h2>Restoring...</h2>
                    <p>Loading previously uploaded file...</p>
                </div>
            ) : !loader ? (
                <div className="upload-container">
                    <h2>Upload Icon Assets</h2>
                    <p>Upload a zip file containing PS2 icon assets to preview them.</p>
                    <p className="hint">
                        The zip must contain <code>iconsys.json</code> and the referenced <code>.obj</code>, <code>.mtl</code>, <code>.png</code> files.
                        Animation files (<code>.anim</code>) are optional.
                    </p>

                    <label className="file-input-label">
                        <input
                            type="file"
                            accept=".zip"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                        />
                        <span className="file-input-button">
                            {isLoading ? 'Loading...' : 'Choose ZIP File'}
                        </span>
                    </label>

                    {error && <p className="error">{error}</p>}
                </div>
            ) : (
                <>
                    <div id="title">
                        <h5>Uploaded Icon</h5>
                        <h6>{currentSave?.title ?? currentSave?.directory}</h6>
                        <button onClick={handleReset} className="reset-button">
                            Upload Different File
                        </button>
                    </div>

                    <ModelView loader={loader} />
                </>
            )}
        </div>
    );
};

export default Upload;

