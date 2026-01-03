import { useCallback, useMemo, useState } from "react";
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

/**
 * The Extractor page allows users to open PS2 memory card files
 * and view/extract save icons.
 */
function Extractor() {
    // Storage hook for managing saves
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

    // Export hook for zip and clipboard operations
    const { extractToZip, copyIconSys, copyFirstAnim } = useSaveExport();

    // Local UI state
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [renameState, setRenameState] = useState<{ saveId: string; currentTitle: string } | null>(null);
    const [deleteState, setDeleteState] = useState<{ saveId: string; title: string } | null>(null);
    const contextMenu = useContextMenu();

    // Context menu items for saves
    const saveContextMenuItems: ContextMenuItem[] = useMemo(() => [
        { id: 'extract-zip', label: 'Extract & Download Assets in .zip', shortcut: 'E' },
        { id: 'rename', label: 'Rename', shortcut: 'F2' },
        { id: 'delete', label: 'Delete', danger: true, shortcut: 'Del' },
        ...(!import.meta.env.DEV ? [] : [
            { id: 'copy-iconsys', label: 'DEV - Copy iconsys.json' },
            { id: 'copy-anim', label: 'DEV - Copy first .anim' },
        ]),
    ], []);

    // Handle file drop
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
    const modelLoader = useMemo(() => {
        if (!selectedSaveData || selectedSaveData.hasError || !selectedSaveData.files) {
            return null;
        }

        // Re-parse raw icon files to generate OBJ/MTL/PNG/ANIM
        const modelFiles = storedSaveToModelFiles(selectedSaveData.files);
        return new FileModelLoader(modelFiles);
    }, [selectedSaveData]);

    // Generate clear confirmation message
    const clearMessage = `Are you sure you want to remove all ${saves.length} saved ${saves.length === 1 ? 'item' : 'items'}? This action cannot be undone.`;

    const handleDownload = useCallback(() => {
        if (selectedSaveId) {
            handleExtractToZip(selectedSaveId);
        }
    }, [selectedSaveId, handleExtractToZip]);

    return (
        <div className="extractor-page" onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Header */}
            <ExtractorHeader
                savesCount={saves.length}
                onFilesImport={handleFilesImport}
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
    );
}

export default Extractor;

