import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';

export interface ExtractorHeaderProps {
    /** Number of saves currently loaded. */
    savesCount: number;
    /** Called when files are selected for import. */
    onFilesImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Called when the Extract All button is clicked. */
    onExtractAllClick: () => void;
    /** Whether the Extract All operation is in progress. */
    isExtractingAll: boolean;
    /** Called when the clear button is clicked. */
    onClearClick: () => void;
}

/**
 * Header component for the Extractor page.
 * Displays logo, title, file import button, and clear button.
 */
export function ExtractorHeader({ savesCount, onFilesImport, onExtractAllClick, isExtractingAll, onClearClick }: ExtractorHeaderProps) {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <header className="extractor-header">
            <Link to="/">
                <img id="logo-full" src="/images/logo-full-min.svg" height="40px" alt="PS2IODB Logo"/>
            </Link>
            <h1>Icon Extractor</h1>
            <button
                type="button"
                className="help-button"
                onClick={() => setShowHelp(true)}
                aria-label="Help"
                title="How to use the Extractor"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </button>
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
                    <>
                        <button
                            type="button"
                            className="extract-all-button"
                            onClick={onExtractAllClick}
                            disabled={isExtractingAll}
                        >
                            {isExtractingAll && <span className="button-spinner" />}
                            {isExtractingAll ? 'Extracting...' : 'Extract All'}
                        </button>
                        <button
                            type="button"
                            className="clear-button"
                            onClick={onClearClick}
                        >
                            Clear
                        </button>
                    </>
                )}
            </div>

            <Modal
                isOpen={showHelp}
                title="PS2IODB Extractor Guide"
                onClose={() => setShowHelp(false)}
                className="extractor-help-modal"
            >
                <div className="extractor-help-content">
                    <p>
                        The PS2IODB Icon Extractor allows you to extract assets from PS2 saves save icons in the formats PS2IODB requires to host them.
                        Once assets are extracted they can be contributed to the website for everyone to enjoy - attributed to you!
                    </p>

                    <p>
                        Icons can be imported from many formats, once loaded in they can be inspected, renamed, deleted, extracted individually, or extracted all together.
                    </p>

                    <p>
                        Right-click (or tap-hold on mobile) to view functions on save rows, and learn the keyboard shortcuts for an optimal workflow!
                    </p>

                    <h3>Recommended Workflow</h3>
                    <ol>
                        <li>
                            <strong>Import your save files</strong> — Drag and drop or use the "Import File" button to load your PS2 save files.
                        </li>
                        <li>
                            <strong>Rename each save</strong> — Double-click on a save's name to rename it. Use a URL-friendly "slug" format:
                            <ul>
                                <li>All lowercase letters</li>
                                <li>No spaces or special characters</li>
                                <li>Use hyphens for variations (e.g., region or save type)</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Extract all</strong> — Once all saves are renamed, click "Extract All" to download a ZIP file ready for contribution.
                        </li>
                    </ol>

                    <h3>Slug Examples</h3>
                    <p>
                        The slug is is part of the URL to navigate to a specific icon, for example: <a href="https://ps2iodb.com/icon/devilmaycry3" target="_blank">ps2iodb.com/icon/devilmaycry3</a>.
                    </p>
                    <p>
                        The site admin has to add all icons to the index by hand, so well-named (informative an matching existing patterns) help optimise this process.
                    </p>
                    <p>
                        If you are re-contributing an icon already on the site, use the existing slug.
                    </p>

                    <p>Look at existing icons on the site for inspiration. Here are some examples:</p>
                    <ul className="slug-examples">
                        <li><code>finalfantasyx</code></li>
                        <li><code>tekken5</code></li>
                        <li>
                            Some titles have different icons for different regions:
                            <ul>
                                <li><code>taikodrummaster-jp</code></li>
                                <li><code>taikodrummaster-na</code></li>
                            </ul>
                        </li>
                        <li>
                            Some titles have different icons for different revisions:
                            <ul>
                                <li><code>dragonballzbudokai3</code></li>
                                <li><code>dragonballzbudokai3-grestesthitsversion</code></li>
                            </ul>
                        </li>
                        <li>
                            Some titles have different icons for different conditions:
                            <ul>
                                <li><code>ghirensambitionaxis-earthcampaign</code></li>
                                <li><code>ghirensambitionaxis-zeoncampaign</code></li>
                            </ul>
                        </li>
                        <li>
                            Some titles separate data for profiles,  settings or different modes like so:
                            <ul>
                                <li><code>xg3extremegracing-savedata</code></li>
                                <li><code>xg3extremegracing-settings</code></li>
                            </ul>
                        </li>
                    </ul>

                    <p className="help-note">
                        The entire index (all titles & slugs) can be viewed <a target="_blank" href="https://github.com/Issung/PS2IODB/blob/main/website/src/model/Titles.ts">here</a>.
                    </p>
                </div>
            </Modal>
        </header>
    );
}

