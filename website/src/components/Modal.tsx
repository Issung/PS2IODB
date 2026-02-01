import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.scss';

export interface ModalProps {
    /** Whether the modal is visible. */
    isOpen: boolean;
    /** Title displayed in the modal header. If not provided, the header is hidden. */
    title?: string;
    /** Called when the modal should close (X button, overlay click, or Escape key). */
    onClose: () => void;
    /** Content to display in the modal body. */
    children: React.ReactNode;
    /** Optional footer content (typically buttons). */
    footer?: React.ReactNode;
    /** Whether clicking the overlay closes the modal. Default: true */
    closeOnOverlayClick?: boolean;
    /** Whether pressing Escape closes the modal. Default: true */
    closeOnEscape?: boolean;
    /** Optional className for the modal container. */
    className?: string;
    /** Optional className for the overlay element. */
    overlayClassName?: string;
    /** Optional container element to render the modal into via portal. */
    portalContainer?: HTMLElement | null;
    /**
     * When true, children are rendered directly in the overlay without the standard modal wrapper.
     * Use for custom fullscreen overlays like the texture viewer.
     */
    bare?: boolean;
}

/**
 * A general-purpose modal component.
 * Can be used for confirmations, forms, text entry, or any custom content.
 * Optionally renders into a portal container to escape parent stacking contexts.
 */
export function Modal({
    isOpen,
    title,
    onClose,
    children,
    footer,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
    overlayClassName,
    portalContainer,
    bare = false,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Focus trap - focus the modal when it opens
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = () => {
        if (closeOnOverlayClick) {
            onClose();
        }
    };

    const overlayClasses = ['ps2-modal-overlay', overlayClassName].filter(Boolean).join(' ');

    // Bare mode: render children directly in the overlay (for custom fullscreen overlays)
    if (bare) {
        const bareContent = (
            <div
                ref={modalRef}
                className={overlayClasses}
                onClick={handleOverlayClick}
                tabIndex={-1}
            >
                {children}
            </div>
        );

        if (portalContainer) {
            return createPortal(bareContent, portalContainer);
        }
        return bareContent;
    }

    // Standard modal with header/body/footer structure
    const modalContent = (
        <div className={overlayClasses} onClick={handleOverlayClick}>
            <div
                ref={modalRef}
                className={`ps2-modal ${className ?? ''}`}
                onClick={e => e.stopPropagation()}
                tabIndex={-1}
            >
                {title && (
                    <div className="ps2-modal-header">
                        <h5>{title}</h5>
                        <button
                            type="button"
                            className="ps2-modal-close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="ps2-modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="ps2-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    // If a portal container is provided, render into it; otherwise render inline
    if (portalContainer) {
        return createPortal(modalContent, portalContainer);
    }

    return modalContent;
}

