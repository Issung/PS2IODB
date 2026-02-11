import { IconSys } from "../../model/IconSys";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

/**
 * Represents a state of an icon (Idle/Copy/Delete).
 * Each state may reference the same or different .ico file.
 */
export interface IconState {
    /** Display name for the state: "Idle", "Copy", or "Delete" */
    stateName: 'Idle' | 'Copy' | 'Delete';
    /** The .ico filename this state uses */
    filename: string;
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
