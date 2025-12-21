import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ModelView, FileModelLoader } from "../components/ModelView";
import { ModelLoader } from "../components/ModelLoader";
import './Upload.scss';

/**
 * Upload page that allows users to upload a zip file containing icon assets
 * and view them using the ModelView component.
 */
const Upload = () => {
    const [loader, setLoader] = useState<ModelLoader | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | undefined>(undefined);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(undefined);
        setLoader(undefined);
        setFileName(file.name);

        try {
            const newLoader = await FileModelLoader.fromZipFile(file);
            setLoader(newLoader);
        } catch (e) {
            console.error('Error processing zip file:', e);
            setError(e instanceof Error ? e.message : 'Unknown error processing zip file');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReset = useCallback(() => {
        setLoader(undefined);
        setError(undefined);
        setFileName(undefined);
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

                    {fileName && <p className="file-name">Selected: {fileName}</p>}
                    {error && <p className="error">{error}</p>}
                </div>
            ) : (
                <>
                    <div id="title">
                        <h5>Uploaded Icon</h5>
                        <h6>{fileName}</h6>
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

