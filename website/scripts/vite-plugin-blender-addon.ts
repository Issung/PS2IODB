import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { parse } from 'smol-toml';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

/** Source of the Blender add-on, kept in the repository at /blender/ps2iodb. */
const addonDir = fileURLToPath(new URL('../../blender/ps2iodb', import.meta.url));

/**
 * Folder the add-on is published in. It is a Blender extension repository: users add `index.json`'s URL in Blender's
 * preferences and Blender tells them when a new version is out. See https://docs.blender.org/manual/en/latest/advanced/extensions/creating_repository/static_repository.html
 */
export const blenderAddonDir = 'downloads/blender';
export const blenderAddonIndexPath = `${blenderAddonDir}/index.json`;
export const blenderAddonIndexUrl = `https://ps2iodb.com/${blenderAddonIndexPath}`;

/** Files that are text, their line endings are normalised so the zip is the same whatever OS builds it. */
const textExtensions = ['.py', '.toml', '.md', '.txt', ''];

/** Every file gets this timestamp so the zip only changes when the add-on's contents do. */
const fixedDate = new Date('2000-01-01T00:00:00Z');

export interface BlenderAddonBuild {
    version: string;
    /** Path of the zip, relative to the site root. Includes the version, so caches never serve an old one. */
    zipPath: string;
    zip: Uint8Array;
    /** Blender extension repository listing, the same as `blender --command extension server-generate` writes. */
    index: string;
}

/**
 * Zip the add-on with its files at the root of the zip, the layout Blender expects (`blender_manifest.toml` at the
 * top level), and generate the repository listing for it. Python caches are left out.
 */
export async function buildBlenderAddon(): Promise<BlenderAddonBuild> {
    const manifest = parse(readFileSync(path.join(addonDir, 'blender_manifest.toml'), 'utf-8')) as Record<string, unknown>;
    const version = manifest.version as string;
    const zipName = `${manifest.id}-${version}.zip`;

    const zip = new JSZip();
    const add = (dir: string) => {
        const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== '__pycache__') {
                    add(fullPath);
                }
            } else if (!entry.name.endsWith('.pyc')) {
                const name = path.relative(addonDir, fullPath).split(path.sep).join('/');
                const content = textExtensions.includes(path.extname(entry.name))
                    ? readFileSync(fullPath, 'utf-8').replace(/\r\n/g, '\n')
                    : readFileSync(fullPath);
                zip.file(name, content, { date: fixedDate, createFolders: false });
            }
        }
    };
    add(addonDir);
    const zipContent = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

    // The manifest's fields plus where to download the zip, how big it is and its hash.
    const { build: _, ...listing } = manifest;
    const index = {
        version: 'v1',
        blocklist: [],
        data: [{
            ...listing,
            archive_url: `./${zipName}`,
            archive_size: zipContent.length,
            archive_hash: `sha256:${createHash('sha256').update(zipContent).digest('hex')}`,
        }],
    };

    return {
        version,
        zipPath: `${blenderAddonDir}/${zipName}`,
        zip: zipContent,
        index: JSON.stringify(index, null, 2),
    };
}

/**
 * Builds the Blender add-on download and its extension repository listing from its source, so the site always offers
 * the version in the repository and nothing has to be committed. The dev server builds them on request, production
 * builds emit them into dist. The version, repository URL and download path are available to the site as
 * `__BLENDER_ADDON_VERSION__`, `__BLENDER_ADDON_INDEX_URL__` and `__BLENDER_ADDON_ZIP__`.
 */
export function blenderAddon(): Plugin {
    let build: BlenderAddonBuild;
    return {
        name: 'blender-addon',
        async config() {
            build = await buildBlenderAddon();
            return {
                define: {
                    __BLENDER_ADDON_VERSION__: JSON.stringify(build.version),
                    __BLENDER_ADDON_INDEX_URL__: JSON.stringify(blenderAddonIndexUrl),
                    __BLENDER_ADDON_ZIP__: JSON.stringify(`/${build.zipPath}`),
                },
            };
        },
        configureServer(server) {
            server.middlewares.use(`/${blenderAddonDir}`, async (req, res, next) => {
                // Rebuild on every request so edits to the add-on show up without restarting the server.
                const current = await buildBlenderAddon();
                // Blender adds query parameters (its version and platform) when fetching from a repository.
                const file = req.url?.split('?')[0];
                if (file === `/${path.basename(blenderAddonIndexPath)}`) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(current.index);
                } else if (file === `/${path.basename(current.zipPath)}`) {
                    res.setHeader('Content-Type', 'application/zip');
                    res.end(current.zip);
                } else {
                    next();
                }
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: build.zipPath, source: build.zip });
            this.emitFile({ type: 'asset', fileName: blenderAddonIndexPath, source: build.index });
        },
    };
}
