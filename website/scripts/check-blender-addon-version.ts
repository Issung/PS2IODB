/**
 * Fails if the Blender add-on in blender/ps2iodb has changed from the version published on ps2iodb.com without its
 * version being bumped. Blender only offers users an update when the version number goes up, so a forgotten bump would
 * leave everyone on the old add-on.
 *
 * Compares file contents rather than zip hashes, so changes to how the zip is compressed don't count.
 * Passes (with a warning) if the published version can't be fetched, e.g. before the first release or when offline.
 *
 * Usage: npx tsx scripts/check-blender-addon-version.ts [index.json URL, defaults to the live site]
 */
import JSZip from 'jszip';
import { blenderAddonIndexUrl, buildBlenderAddon } from './vite-plugin-blender-addon';

async function filesOf(zipData: Uint8Array | ArrayBuffer): Promise<Map<string, string>> {
    const zip = await JSZip.loadAsync(zipData);
    const files = new Map<string, string>();
    for (const file of Object.values(zip.files)) {
        if (!file.dir) {
            files.set(file.name, (await file.async('string')).replace(/\r\n/g, '\n'));
        }
    }
    return files;
}

async function main() {
    const indexUrl = process.argv[2] ?? blenderAddonIndexUrl;
    const local = await buildBlenderAddon();

    let published: { version: string; archive_url: string } | undefined;
    let zipData: ArrayBuffer;
    try {
        const response = await fetch(indexUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        published = (await response.json()).data[0];
        const zipResponse = await fetch(new URL(published!.archive_url, indexUrl));
        if (!zipResponse.ok) {
            throw new Error(`HTTP ${zipResponse.status} fetching ${published!.archive_url}`);
        }
        zipData = await zipResponse.arrayBuffer();
    } catch (e) {
        console.warn(`Couldn't fetch the published add-on from ${indexUrl} (${e}), skipping the version check.`);
        return;
    }

    if (published!.version !== local.version) {
        console.log(`Blender add-on version ${local.version} differs from published ${published!.version}.`);
        return;
    }

    const [localFiles, publishedFiles] = await Promise.all([filesOf(local.zip), filesOf(zipData)]);
    const names = new Set([...localFiles.keys(), ...publishedFiles.keys()]);
    const changed = [...names].filter(name => localFiles.get(name) !== publishedFiles.get(name)).sort();
    if (changed.length === 0) {
        console.log(`Blender add-on ${local.version} matches the published version.`);
        return;
    }

    console.error(
        `The Blender add-on has changed since version ${local.version} was published, but its version hasn't been bumped.\n` +
        `Changed files: ${changed.join(', ')}\n` +
        `Increase "version" in blender/ps2iodb/blender_manifest.toml and add an entry to blender/CHANGELOG.md.`
    );
    // Not process.exit(), which crashes Node on Windows while fetch's connections are still closing.
    process.exitCode = 1;
}

main();
