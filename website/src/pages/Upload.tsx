import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { FileModelLoader } from "../components/ModelView/FileModelLoader";
import { ModelLoader } from "../components/ModelView/ModelLoader";
import { ModelView } from "../components/ModelView/ModelView";
import './Upload.scss';

/**
 * Upload page that allows users to upload a zip file containing icon assets
 * and view them using the ModelView component.
 *
 * Note: This page handles pre-processed zip files (OBJ/MTL/PNG), not raw PS2 saves.
 * These are not stored in IndexedDB as they can't be re-parsed from raw icon files.
 * Use the Extractor page to import raw PS2 memory card files.
 */
const Upload = () => {
    const [loader, setLoader] = useState<ModelLoader | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFileName, setCurrentFileName] = useState<string | null>(null);

    /**
     * Process a zip file and create a model loader.
     */
    const processFile = async (file: File) => {
        setIsLoading(true);
        setError(undefined);
        setLoader(undefined);
        setCurrentFileName(null);

        try {
            // Parse the zip and create a loader
            const newLoader = await FileModelLoader.fromZipFile(file);
            setLoader(newLoader);
            setCurrentFileName(newLoader.getModelFiles().iconSys.title ?? file.name);
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

    const handleReset = useCallback(() => {
        setLoader(undefined);
        setError(undefined);
        setCurrentFileName(null);
    }, []);

    return (
        <div id="upload">
            <Link id="back" to="/">← Home</Link>

            {!loader ? (
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
                        <h6>{currentFileName}</h6>
                        <button onClick={handleReset} className="reset-button">
                            Upload Different File
                        </button>
                    </div>

                    <div className="model-view-fullscreen">
                        <ModelView loader={loader} />
                    </div>
                </>
            )}
        </div>
    );
};

export default Upload;

