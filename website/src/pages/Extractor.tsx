import { useCallback, useMemo, useState } from "react";
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Group, Panel, Separator } from "react-resizable-panels";
import { ConfirmModal } from '../components/ConfirmModal';
import { ContextMenu, ContextMenuItem, useContextMenu } from '../components/ContextMenu';
import { ExtractorHeader } from '../components/ExtractorHeader';
import { FileModelLoader } from '../components/ModelView/FileModelLoader';
import { RenameModal } from '../components/RenameModal';
import { SavesListPanel } from '../components/SavesListPanel';
import { SaveViewerPanel } from '../components/SaveViewerPanel';
import { useSaveExport, useSaveStorage } from '../hooks';
import { storedSaveToModelFiles } from "../storage";
import './Extractor.scss';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="error-boundary-fallback">
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. You can try:</p>
            <div className="error-boundary-actions">
                <button type="button" onClick={resetErrorBoundary}>
                    Try Again
                </button>
                <button type="button" onClick={() => window.location.reload()}>
                    Reload Page
                </button>
            </div>
            <details className="error-boundary-details">
                <summary>Error details</summary>
                <pre>{error.message}</pre>
            </details>
        </div>
    );
}

const saveContextMenuItems: ContextMenuItem[] = [
    { id: 'extract-zip', label: 'Extract & Download Assets in .zip', shortcut: 'E' },
    { id: 'rename', label: 'Rename', shortcut: 'R' },
    { id: 'delete', label: 'Delete', danger: true, shortcut: 'Del' },
    ...(!import.meta.env.DEV ? [] : [
        { id: 'copy-iconsys', label: 'DEV - Copy iconsys.json' },
        { id: 'copy-anim', label: 'DEV - Copy first .anim' },
    ]),
];

/**
 * The Extractor page allows users to open PS2 memory card files
 * and view/extract save icons.
 */
function Extractor() {
    const {
        saves,
        selectedSaveId,
        selectedSaveData,
        isRestoring,
        loading,
        error,
        selectSave,
        loadFileAndProcess,
        deleteSave,
        renameSave,
        clearAll,
        loadSave,
    } = useSaveStorage();

    const { extractToZip, extractAllToZip, copyIconSys, copyFirstAnim } = useSaveExport();

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [renameState, setRenameState] = useState<{ saveId: string; currentTitle: string } | null>(null);
    const [deleteState, setDeleteState] = useState<{ saveId: string; title: string } | null>(null);
    const [isExtractingAll, setIsExtractingAll] = useState(false);
    const contextMenu = useContextMenu();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadFileAndProcess(files[0]);
        }
    }, [loadFileAndProcess]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const handleFilesImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            for (let i = 0; i < files.length; ++i) {
                await loadFileAndProcess(files[i]);
            }
        }
    }, [loadFileAndProcess]);

    const handleClearAll = useCallback(async () => {
        setShowClearConfirm(false);
        await clearAll();
    }, [clearAll]);

    const handleExtractToZip = useCallback(async (saveId: string) => {
        const stored = await loadSave(saveId);
        if (stored) {
            await extractToZip(stored);
        }
    }, [loadSave, extractToZip]);

    const handleExtractAll = useCallback(async () => {
        setIsExtractingAll(true);
        try {
            const loadedSaves = await Promise.all(
                saves.map(save => loadSave(save.id))
            );
            const validSaves = loadedSaves.filter(s => s != null);
            if (validSaves.length > 0) {
                await extractAllToZip(validSaves);
            }
        } finally {
            setIsExtractingAll(false);
        }
    }, [saves, loadSave, extractAllToZip]);

    const handleSaveContextMenu = useCallback((x: number, y: number, saveId: string) => {
        contextMenu.show(x, y, saveId);
    }, [contextMenu]);

    const handleContextMenuItemClick = useCallback(async (itemId: string, data?: unknown) => {
        const saveId = data as string;
        if (!saveId) return;

        const save = saves.find(s => s.id === saveId);
        if (!save) return;

        // Rename and delete don't need to load the full save data
        if (itemId === 'rename') {
            setRenameState({ saveId, currentTitle: save.title });
            return;
        }

        if (itemId === 'delete') {
            setDeleteState({ saveId, title: save.title });
            return;
        }

        const stored = await loadSave(saveId);
        if (!stored) return;

        switch (itemId) {
            case 'extract-zip':
                await extractToZip(stored);
                break;
            case 'copy-iconsys':
                await copyIconSys(stored);
                break;
            case 'copy-anim':
                await copyFirstAnim(stored);
                break;
        }
    }, [saves, loadSave, extractToZip, copyIconSys, copyFirstAnim]);

    // Handlers for rename modal
    const handleRenameConfirm = useCallback(async (newTitle: string) => {
        if (renameState) {
            await renameSave(renameState.saveId, newTitle);
            setRenameState(null);
        }
    }, [renameState, renameSave]);

    const handleRenameCancel = useCallback(() => {
        setRenameState(null);
    }, []);

    // Handlers for delete confirmation modal
    const handleDeleteConfirm = useCallback(async () => {
        if (deleteState) {
            await deleteSave(deleteState.saveId);
            setDeleteState(null);
        }
    }, [deleteState, deleteSave]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteState(null);
    }, []);

    // Handlers for keyboard shortcuts in SavesListPanel
    const handleRenameRequest = useCallback((save: { id: string; title: string }) => {
        setRenameState({ saveId: save.id, currentTitle: save.title });
    }, []);

    const handleDeleteRequest = useCallback((save: { id: string; title: string }) => {
        setDeleteState({ saveId: save.id, title: save.title });
    }, []);

    const handleExtractRequest = useCallback(async (save: { id: string }) => {
        const stored = await loadSave(save.id);
        if (stored) {
            await extractToZip(stored);
        }
    }, [loadSave, extractToZip]);

    // Create a ModelLoader for the selected save by re-parsing icons
    // Memoized to prevent re-parsing on every render (e.g., when context menu opens)
    // Returns { loader, error } to handle parsePS2Icon failures gracefully
    // React-compiler doesn't auto-memoise this for some reason so we're doing it manually.
    const modelLoaderResult = useMemo(() => {
        if (!selectedSaveData || selectedSaveData.hasError || !selectedSaveData.files) {
            return { loader: null, error: null };
        }

        try {
            // Re-parse raw icon files to generate OBJ/MTL/BMP/ANIM
            const modelFiles = storedSaveToModelFiles(selectedSaveData.files);
            return { loader: new FileModelLoader(modelFiles), error: null };
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error parsing icon file';
            console.error('Error parsing icon files:', e);
            return { loader: null, error: errorMessage };
        }
    }, [selectedSaveData]);

    const modelLoader = modelLoaderResult.loader;
    const modelLoaderError = modelLoaderResult.error;

    // Generate clear confirmation message
    const clearMessage = `Are you sure you want to remove all ${saves.length} saved ${saves.length === 1 ? 'item' : 'items'}? This action cannot be undone.`;

    const handleDownload = useCallback(() => {
        if (selectedSaveId) {
            handleExtractToZip(selectedSaveId);
        }
    }, [selectedSaveId, handleExtractToZip]);

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="extractor-page" onDrop={handleDrop} onDragOver={handleDragOver}>
                {/* Header */}
                <ExtractorHeader
                    savesCount={saves.length}
                    onFilesImport={handleFilesImport}
                    onExtractAllClick={handleExtractAll}
                    isExtractingAll={isExtractingAll}
                    onClearClick={() => setShowClearConfirm(true)}
                />

                <Group orientation="horizontal" className="extractor-main">
                    <Panel defaultSize="50%" minSize="200px" className="directory-panel">
                        <SavesListPanel
                            saves={saves}
                            selectedSaveId={selectedSaveId}
                            loading={loading}
                            isRestoring={isRestoring}
                            error={error}
                            onSaveSelect={(save) => selectSave(save.id)}
                            onContextMenu={handleSaveContextMenu}
                            onRename={handleRenameRequest}
                            onDelete={handleDeleteRequest}
                            onExtract={handleExtractRequest}
                        />
                    </Panel>

                    <Separator className="resize-handle" />

                    <Panel minSize="300px" className="viewer-panel">
                        <SaveViewerPanel
                            selectedSaveData={selectedSaveData}
                            modelLoader={modelLoader}
                            modelLoaderError={modelLoaderError}
                            hasSaves={saves.length > 0}
                            onDownload={handleDownload}
                        />
                    </Panel>
                </Group>

                <ConfirmModal
                    isOpen={showClearConfirm}
                    title="Clear All Saves"
                    message={clearMessage}
                    confirmText="Clear All"
                    danger={true}
                    onConfirm={handleClearAll}
                    onCancel={() => setShowClearConfirm(false)}
                />

                <RenameModal
                    isOpen={renameState !== null}
                    currentTitle={renameState?.currentTitle ?? ''}
                    onConfirm={handleRenameConfirm}
                    onCancel={handleRenameCancel}
                />

                <ConfirmModal
                    isOpen={deleteState !== null}
                    title="Delete Save"
                    message={`Are you sure you want to delete "${deleteState?.title ?? ''}"? This action cannot be undone.`}
                    confirmText="Delete"
                    danger={true}
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />

                <ContextMenu
                    items={saveContextMenuItems}
                    state={contextMenu.state}
                    onItemClick={handleContextMenuItemClick}
                    onClose={contextMenu.close}
                />
            </div>
        </ErrorBoundary>
    );
}

export default Extractor;

