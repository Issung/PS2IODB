import { useCallback, useEffect, useRef, useState } from 'react';
import './ContextMenu.scss';

/** A single item in the context menu. */
export interface ContextMenuItem {
    /** Unique identifier for the item. */
    id: string;
    /** Display label for the item. */
    label: string;
    /** Optional icon to display before the label. */
    icon?: React.ReactNode;
    /** Whether the item is disabled. */
    disabled?: boolean;
    /** Whether this is a dangerous/destructive action (renders in red). */
    danger?: boolean;
}

export interface ContextMenuState {
    /** Whether the menu is visible. */
    visible: boolean;
    /** X position of the menu. */
    x: number;
    /** Y position of the menu. */
    y: number;
    /** Optional data to pass to the handler. */
    data?: unknown;
}

export interface ContextMenuProps {
    /** The menu items to display. */
    items: ContextMenuItem[];
    /** Current state of the menu (visibility, position). */
    state: ContextMenuState;
    /** Called when a menu item is clicked. */
    onItemClick: (itemId: string, data?: unknown) => void;
    /** Called when the menu should close. */
    onClose: () => void;
}

/** Initial state for a closed context menu. */
export const initialContextMenuState: ContextMenuState = {
    visible: false,
    x: 0,
    y: 0,
};

/**
 * Hook to manage context menu state.
 * Returns state and handlers to show/close the menu.
 */
export function useContextMenu() {
    const [state, setState] = useState<ContextMenuState>(initialContextMenuState);

    const show = useCallback((x: number, y: number, data?: unknown) => {
        setState({ visible: true, x, y, data });
    }, []);

    const close = useCallback(() => {
        setState(initialContextMenuState);
    }, []);

    return { state, show, close };
}

/** Default long-press duration in milliseconds. */
const LONG_PRESS_DURATION = 500;

/** Props returned by useLongPress hook to spread on elements. */
export interface LongPressHandlers {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * Hook to handle long-press for touch devices.
 * Returns event handlers to spread on an element.
 * @param onLongPress Callback when long-press is detected, receives touch coordinates
 * @param data Optional data to pass through to the callback
 * @param duration Long-press duration in ms (default: 500)
 */
export function useLongPress<T = unknown>(
    onLongPress: (x: number, y: number, data: T) => void,
    data: T,
    duration: number = LONG_PRESS_DURATION,
): LongPressHandlers {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        touchStartRef.current = null;
    }, []);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };

        timerRef.current = setTimeout(() => {
            if (touchStartRef.current) {
                onLongPress(touchStartRef.current.x, touchStartRef.current.y, data);
            }
            clear();
        }, duration);
    }, [onLongPress, data, duration, clear]);

    const onTouchEnd = useCallback((_e: React.TouchEvent) => {
        clear();
    }, [clear]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        // Cancel if moved too far from start position
        if (touchStartRef.current) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartRef.current.x);
            const dy = Math.abs(touch.clientY - touchStartRef.current.y);
            if (dx > 10 || dy > 10) {
                clear();
            }
        }
    }, [clear]);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onLongPress(e.clientX, e.clientY, data);
    }, [onLongPress, data]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { onTouchStart, onTouchEnd, onTouchMove, onContextMenu };
}

/**
 * A reusable context menu component.
 * Renders a floating menu at the specified position.
 */
export function ContextMenu({ items, state, onItemClick, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!state.visible) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Use setTimeout to avoid closing immediately on the same click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [state.visible, onClose]);

    // Adjust position to stay within viewport
    useEffect(() => {
        if (!state.visible || !menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = state.x;
        let adjustedY = state.y;

        if (rect.right > viewportWidth) {
            adjustedX = viewportWidth - rect.width - 8;
        }
        if (rect.bottom > viewportHeight) {
            adjustedY = viewportHeight - rect.height - 8;
        }

        if (adjustedX !== state.x || adjustedY !== state.y) {
            menu.style.left = `${adjustedX}px`;
            menu.style.top = `${adjustedY}px`;
        }
    }, [state.visible, state.x, state.y]);

    if (!state.visible) return null;

    const handleItemClick = (item: ContextMenuItem) => {
        if (item.disabled) return;
        onItemClick(item.id, state.data);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: state.x, top: state.y }}
        >
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className={`context-menu-item${item.disabled ? ' disabled' : ''}${item.danger ? ' danger' : ''}`}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                >
                    {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                    <span className="context-menu-label">{item.label}</span>
                </button>
            ))}
        </div>
    );
}

