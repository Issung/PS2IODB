import { StoredSave } from '../storage';
import { ModelLoader } from './ModelView/ModelLoader';
import { ModelView } from './ModelView/ModelView';

export interface SaveViewerPanelProps {
    /** The selected save data, or null if none selected. */
    selectedSaveData: StoredSave | null;
    /** The model loader for the selected save, or null if not available. */
    modelLoader: ModelLoader | null;
    /** Error message if the model loader failed to parse icon files. */
    modelLoaderError: string | null;
    /** Whether there are any saves loaded. */
    hasSaves: boolean;
    /** Called when the download button is clicked. */
    onDownload: () => void;
}

/**
 * Panel component that displays the 3D icon viewer.
 * Shows the save title, model viewer, or appropriate placeholder message.
 */
export function SaveViewerPanel({
    selectedSaveData,
    modelLoader,
    modelLoaderError,
    hasSaves,
    onDownload,
}: SaveViewerPanelProps) {
    if (selectedSaveData) {
        return (
            <>
                {/* Title display */}
                <div className="save-title">
                    <h2>{selectedSaveData.title}</h2>
                </div>

                {/* 3D Icon viewer */}
                {modelLoader && (
                    <ModelView
                        loader={modelLoader}
                        hideControls={false}
                        onDownload={onDownload}
                    />
                )}

                {/* Error parsing icon files */}
                {modelLoaderError && (
                    <div className="icon-error-message">
                        <p><strong>Error loading icon</strong></p>
                        <pre>{modelLoaderError}</pre>
                    </div>
                )}

                {/* No loader and no error - icons not available */}
                {!modelLoader && !modelLoaderError && (
                    <div className="no-icon-message">
                        No icons available for this save
                    </div>
                )}
            </>
        );
    }

    if (hasSaves) {
        return (
            <div className="no-selection-message">
                Select a save from the list to view its icon
            </div>
        );
    }

    return null;
}

