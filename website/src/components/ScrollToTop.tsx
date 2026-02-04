import { IconArrowUp } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import './ScrollToTop.scss';

interface ScrollToTopProps {
    /** A query seleftor string to select the desired element to observe and scroll to. */
    elementSelector: string;
}

/**
 * A floating button that appears when the target element is off-screen.
 * Clicking it smoothly scrolls back to the target element.
 */
export function ScrollToTop({ elementSelector }: ScrollToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const targetElement = document.querySelector(elementSelector);
        if (!targetElement) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show button when target has scrolled above the viewport
                // boundingClientRect.bottom < 0 means the element is above the viewport
                setIsVisible(entry.boundingClientRect.bottom < 0);
            },
            {
                threshold: 0,
            }
        );

        observer.observe(targetElement);

        return () => observer.disconnect();
    }, [elementSelector]);

    const handleClick = () => {
        const targetElement = document.querySelector(elementSelector);
        targetElement?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <button
            className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
            onClick={handleClick}
            aria-label="Scroll to top"
            title="Scroll to Browse section"
        >
            <IconArrowUp size={24} />
        </button>
    );
}

