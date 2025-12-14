import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Implement hash scrolling.
 * Doesn't work as usual in SPAs either because the navigation is not real or the components don't exist yet.
 */
export function HashScroller() {
    const { hash } = useLocation();

    useEffect(() => {
        if (!hash) return;

        const id = hash.replace("#", "");

        // Allow time for the element to exist
        requestAnimationFrame(() => {
            const el = document.getElementById(id);
            el?.scrollIntoView({ behavior: "smooth" });
        });
    }, [hash]);

    return null;
}
