import { readdirSync, readFileSync } from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

/** Source of the Blender add-on, kept in the repository at /blender/ps2iodb. */
const addonDir = fileURLToPath(new URL('../../blender/ps2iodb', import.meta.url));

/** Where the add-on zip is served from, linked to from the FAQ page. */
export const blenderAddonPath = 'downloads/ps2iodb-blender-addon.zip';

/**
 * Zip the add-on's files at the root of the zip, which is the layout Blender expects when installing an extension
 * from disk (`blender_manifest.toml` at the top level). Python caches are left out.
 */
async function zipAddon(): Promise<Uint8Array> {
    const zip = new JSZip();
    const add = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== '__pycache__') {
                    add(fullPath);
                }
            } else if (!entry.name.endsWith('.pyc')) {
                zip.file(path.relative(addonDir, fullPath).split(path.sep).join('/'), readFileSync(fullPath));
            }
        }
    };
    add(addonDir);
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/**
 * Builds the Blender add-on download from its source, so the site always offers the version in the repository and no
 * zip has to be committed. The dev server zips it on request, production builds emit it into dist.
 */
export function blenderAddon(): Plugin {
    return {
        name: 'blender-addon',
        configureServer(server) {
            server.middlewares.use(`/${blenderAddonPath}`, async (_req, res) => {
                res.setHeader('Content-Type', 'application/zip');
                res.end(await zipAddon());
            });
        },
        async generateBundle() {
            this.emitFile({ type: 'asset', fileName: blenderAddonPath, source: await zipAddon() });
        },
    };
}
