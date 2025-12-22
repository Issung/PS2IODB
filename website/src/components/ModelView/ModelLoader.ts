import { IconSys } from "../../model/IconSys";
import { ResolvedModelAssets } from "./ResolvedModelAssets";

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
     * Get the list of available variants for this model.
     */
    getVariants(): string[];

    /**
     * Get the current/default variant name.
     */
    getDefaultVariant(): string;

    /**
     * Load a specific variant and return the resolved assets.
     * @param variant The variant name to load (e.g., "icon00.ico")
     */
    loadVariant(variant: string): Promise<ResolvedModelAssets>;

    /**
     * Clean up any resources (blob URLs, etc.).
     */
    dispose(): void;
}

export { ResolvedModelAssets };
