import JSZip from "jszip";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ModelView, ModelFiles } from "../components/ModelView";
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
            let objFilename: string | undefined;

            // Extract all files from the zip
            const filePromises: Promise<void>[] = [];
            
            zip.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;
                
                // Get just the filename (handle nested folders)
                const filename = relativePath.split('/').pop() || relativePath;
                
                const promise = (async () => {
                    if (filename === 'iconsys.json') {
                        const text = await zipEntry.async('text');
                        if (text.startsWith('{')) {
                            iconSys = JSON.parse(text) as IconSys;
                        }
                    } else if (filename.endsWith('.png')) {
                        const blob = await zipEntry.async('blob');
                        filesMap.set(filename, new Blob([blob], { type: 'image/png' }));
                    } else {
                        const blob = await zipEntry.async('blob');
                        filesMap.set(filename, blob);
                        
                        // Track the first OBJ file we find
                        if (filename.endsWith('.obj') && !objFilename) {
                            objFilename = filename;
                        }
                    }
                })();
                
                filePromises.push(promise);
            });

            await Promise.all(filePromises);

            // If we have iconsys, use its normal variant as the obj filename
            if (iconSys?.normal) {
                objFilename = `${iconSys.normal}.obj`;
            }

            if (!objFilename) {
                throw new Error('No .obj file found in the zip archive.');
            }

            if (!filesMap.has(objFilename)) {
                throw new Error(`OBJ file "${objFilename}" not found in the zip archive.`);
            }

            const result: ModelFiles = {
                files: filesMap,
                objFilename,
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

    // Memoize the source to prevent unnecessary re-renders of ModelView
    const modelSource = useMemo(() => {
        if (!modelFiles) return undefined;
        return { type: 'files' as const, files: modelFiles };
    }, [modelFiles]);

    console.log('Upload', { modelFiles, isLoading });

    return (
        <div id="upload">
            <Link id="back" to="/">← Home</Link>

            {!modelFiles ? (
                <div className="upload-container">
                    <h2>Upload Icon Assets</h2>
                    <p>Upload a zip file containing PS2 icon assets to preview them.</p>
                    <p className="hint">
                        The zip should contain: <code>.obj</code>, <code>.mtl</code>, <code>.png</code> files,
                        and optionally <code>.anim</code> and <code>iconsys.json</code> files.
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
            ) : modelSource && (
                <>
                    <div id="title">
                        <h5>Uploaded Icon</h5>
                        <h6>{fileName}</h6>
                        <button onClick={handleReset} className="reset-button">
                            Upload Different File
                        </button>
                    </div>

                    <ModelView source={modelSource} />
                </>
            )}
        </div>
    );
};

export default Upload;

