import { Link } from 'react-router-dom';

export interface ExtractorHeaderProps {
    /** Number of saves currently loaded. */
    savesCount: number;
    /** Called when files are selected for import. */
    onFilesImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Called when the clear button is clicked. */
    onClearClick: () => void;
}

/**
 * Header component for the Extractor page.
 * Displays logo, title, file import button, and clear button.
 */
export function ExtractorHeader({ savesCount, onFilesImport, onClearClick }: ExtractorHeaderProps) {
    return (
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
                        onChange={onFilesImport}
                    />
                </label>
                {savesCount > 0 && (
                    <button
                        type="button"
                        className="clear-button"
                        onClick={onClearClick}
                    >
                        Clear
                    </button>
                )}
            </div>
        </header>
    );
}

