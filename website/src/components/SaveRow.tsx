import { LongPressHandlers, useLongPress } from './ContextMenu';
import { StoredSaveMetadata } from '../storage';

/** Props for the SaveRow component. */
export interface SaveRowProps {
    /** The save metadata to display. */
    save: StoredSaveMetadata;
    /** Whether this row is currently selected. */
    isSelected: boolean;
    /** Called when the row is clicked. */
    onSelect: () => void;
    /** Called when context menu is triggered (right-click or long-press). */
    onContextMenu: (x: number, y: number, saveId: string) => void;
}

/**
 * A single row in the saves table with long-press support.
 * Displays save directory, title, and status with unread indicator.
 */
export function SaveRow({ save, isSelected, onSelect, onContextMenu }: SaveRowProps) {
    // Wrap onContextMenu to also select the row
    const handleContextMenu = (x: number, y: number, saveId: string) => {
        onSelect();
        onContextMenu(x, y, saveId);
    };

    const longPressHandlers: LongPressHandlers = useLongPress(handleContextMenu, save.id);

    return (
        <tr
            onClick={onSelect}
            className={isSelected ? 'selected' : ''}
            {...longPressHandlers}
        >
            <td className="unread-indicator">
                {!save.viewed && <span className="unread-dot" title="Not yet viewed">●</span>}
            </td>
            <td className="dir-name">{save.directory}</td>
            <td className="title">{save.title}</td>
            <td className="status">{save.hasError ? '❌' : '✓'}</td>
        </tr>
    );
}

