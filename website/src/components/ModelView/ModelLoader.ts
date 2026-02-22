import { IconSys } from "../../model/IconSys";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

/**
 * Represents a state of an icon (Idle/Copy/Delete).
 * Each state may reference the same or different .ico file.
 * When multiple states share the same filename, they are grouped together
 * with a combined display label (e.g., "Idle & Delete").
 */
export interface IconState {
    /** Display label for the state(s). May be combined like "Idle & Delete" if they share a filename. */
    displayLabel: string;
    /** The .ico filename this state uses */
    filename: string;
}

/**
 * Groups icon states by filename and creates combined display labels for shared states.
 * @param normal The filename for the Idle/normal state
 * @param copy The filename for the Copy state
 * @param del The filename for the Delete state
 * @returns Array of IconState with combined labels for states sharing the same file
 */
export function groupStatesByFilename(normal: string, copy: string, del: string): IconState[] {
    // Group state names by their filename
    const filenameToStates = new Map<string, string[]>();

    const addState = (filename: string, stateName: string) => {
        const existing = filenameToStates.get(filename) || [];
        existing.push(stateName);
        filenameToStates.set(filename, existing);
    };

    // Add states in order: Idle, Copy, Delete
    addState(normal, 'Idle');
    addState(copy, 'Copy');
    addState(del, 'Delete');

    // Convert to IconState array, preserving order of first occurrence
    const result: IconState[] = [];
    const seenFilenames = new Set<string>();

    // Process in original order to maintain Idle -> Copy -> Delete priority
    for (const filename of [normal, copy, del]) {
        if (seenFilenames.has(filename)) continue;
        seenFilenames.add(filename);

        const stateNames = filenameToStates.get(filename)!;
        const displayLabel = stateNames.join(' & ');
        result.push({ displayLabel, filename });
    }

    return result;
}

/**
 * Interface for loading model data from various sources.
 * Implementations handle the specifics of URL-based vs file-based loading,
 * but present a unified interface to the rest of the application.
 */
export interface ModelLoader {
    /**
     * Get the IconSys data for this model (lighting, background colors, etc.).
     */
    getIconSys(): IconSys;

    /**
     * Get the list of available states for this model.
     * Returns states with unique filenames (deduped).
     */
    getStates(): IconState[];

    /**
     * Get the default state (Idle/normal).
     */
    getDefaultState(): IconState;

    /**
     * Load a specific state and return the resolved assets.
     * @param state The state to load
     */
    loadState(state: IconState): Promise<ResolvedModelAssets>;

    /**
     * Clean up any resources (blob URLs, etc.).
     */
    dispose(): void;
}

export { ResolvedModelAssets };
