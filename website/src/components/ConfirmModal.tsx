import { useCallback, useEffect } from 'react';
import { Modal } from './Modal';

export interface ConfirmModalProps {
    /** Whether the modal is visible. */
    isOpen: boolean;
    /** Title displayed in the modal header. */
    title: string;
    /** Message displayed in the modal body. */
    message: string;
    /** Text for the confirm button. Default: "Confirm" */
    confirmText?: string;
    /** Text for the cancel button. Default: "Cancel" */
    cancelText?: string;
    /** Whether the confirm action is dangerous (renders button in red). */
    danger?: boolean;
    /** Called when confirm button is clicked. */
    onConfirm: () => void;
    /** Called when cancel button is clicked or modal is closed. */
    onCancel: () => void;
}

/**
 * A confirmation modal built on top of the base Modal component.
 * Displays a modal dialog with title, message, and confirm/cancel buttons.
 * Supports Enter to confirm (Escape to cancel is handled by Modal).
 */
export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    // Handle Enter key to confirm
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
        }
    }, [onConfirm]);

    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    const footer = (
        <>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
            >
                {cancelText}
            </button>
            <button
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
            >
                {confirmText}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            title={title}
            onClose={onCancel}
            footer={footer}
        >
            <p>{message}</p>
        </Modal>
    );
}

