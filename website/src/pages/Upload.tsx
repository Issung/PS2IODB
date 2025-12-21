import JSZip from "jszip";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ModelView, FileModelLoader, type ModelFiles } from "../components/ModelView";
import { IconSys } from "../model/IconSys";
import './Upload.scss';

/**
 * Upload page that allows users to upload a zip file containing icon assets
 * and view them using the ModelView component.
 */
const Upload = () => {
    const [modelFiles, setModelFiles] = useState<ModelFiles | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | undefined>(undefined);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(undefined);
        setModelFiles(undefined);
        setFileName(file.name);

        try {
            const zip = await JSZip.loadAsync(file);
            const filesMap = new Map<string, Blob>();
            let iconSys: IconSys | undefined;

            // Extract all files from the zip
            const filePromises: Promise<void>[] = [];

            zip.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;

                // Get just the filename (handle nested folders)
                const filename = relativePath.split('/').pop() || relativePath;

                const promise = (async () => {
                    if (filename === 'iconsys.json') {
                        const text = await zipEntry.async('text');
                        if (!text.startsWith('{')) {
                            throw new Error('iconsys.json is not valid JSON');
                        }
                        iconSys = JSON.parse(text) as IconSys;
                    } else if (filename.endsWith('.png')) {
                        const blob = await zipEntry.async('blob');
                        filesMap.set(filename, new Blob([blob], { type: 'image/png' }));
                    } else {
                        const blob = await zipEntry.async('blob');
                        filesMap.set(filename, blob);
                    }
                })();

                filePromises.push(promise);
            });

            await Promise.all(filePromises);

            // Require iconsys.json
            if (!iconSys) {
                throw new Error('iconsys.json not found in the zip archive. This file is required.');
            }

            const result: ModelFiles = {
                files: filesMap,
                iconSys
            };

            setModelFiles(result);
        } catch (e) {
            console.error('Error processing zip file:', e);
            setError(e instanceof Error ? e.message : 'Unknown error processing zip file');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReset = useCallback(() => {
        setModelFiles(undefined);
        setError(undefined);
        setFileName(undefined);
    }, []);

    // Create loader for ModelView
    const loader = useMemo(() => {
        if (!modelFiles) return undefined;
        return new FileModelLoader(modelFiles);
    }, [modelFiles]);

    return (
        <div id="upload">
            <Link id="back" to="/">← Home</Link>

            {!modelFiles ? (
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
            ) : loader && (
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

