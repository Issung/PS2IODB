import { ModelLoader } from "./ModelLoader";
import { UrlModelLoader } from "./UrlModelLoader";
import { UrlZipModelLoader } from "./UrlZipModelLoader";

/**
 * Whether the application is running in ZIP mode.
 * In ZIP mode, icons are loaded from a single icon.zip file per icon directory
 * instead of making individual HTTP requests for each asset file.
 *
 * ZIP mode is enabled:
 * - In production builds (mode === 'production')
 * - When running dev server with `npm run start:zip` (mode === 'zip')
 */
export const isZipMode = import.meta.env.MODE === 'production' || import.meta.env.MODE === 'zip';

/**
 * Creates the appropriate URL-based model loader based on the current mode.
 * 
 * In ZIP mode (production/zip), uses UrlZipModelLoader which fetches a single
 * icon.zip file containing all assets.
 * 
 * In development mode, uses UrlModelLoader which fetches individual files.
 * 
 * @param iconcode The iconcode to load
 * @returns A ModelLoader instance
 */
export async function createUrlModelLoader(iconcode: string): Promise<ModelLoader> {
    if (isZipMode) {
        return UrlZipModelLoader.create(iconcode);
    }
    return UrlModelLoader.create(iconcode);
}

