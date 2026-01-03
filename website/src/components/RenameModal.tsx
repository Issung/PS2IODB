import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface RenameModalProps {
    /** Whether the modal is visible. */
    isOpen: boolean;
    /** The current title to edit. */
    currentTitle: string;
    /** Called when the user confirms the rename. */
    onConfirm: (newTitle: string) => void;
    /** Called when the user cancels. */
    onCancel: () => void;
}

/**
 * A modal for renaming a save.
 * Pre-selects all text on open, and handles Enter/Escape keys.
 */
export function RenameModal({
    isOpen,
    currentTitle,
    onConfirm,
    onCancel,
}: RenameModalProps) {
    const [title, setTitle] = useState(currentTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset title when modal opens with a new currentTitle
    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle);
        }
    }, [isOpen, currentTitle]);

    // Auto-select all text when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small delay to ensure the input is focused and rendered
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const trimmed = title.trim();
        if (trimmed) {
            onConfirm(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
        // Note: Escape is handled by the Modal component
    };

    const footer = (
        <>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
            >
                Cancel
            </button>
            <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={!title.trim()}
            >
                Rename
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            title="Rename Save"
            onClose={onCancel}
            footer={footer}
        >
            <label htmlFor="rename-input">Title</label>
            <input
                ref={inputRef}
                id="rename-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new title"
            />
        </Modal>
    );
}

