/**
 * Script to find icon directories whose .obj files are missing vertex color data.
 *
 * Icons exported by older versions of the extractor wrote plain `v x y z` rows,
 * while current exports write `v x y z r g b #a`. Such icons need re-exporting.
 *
 * Usage:
 *   npx tsx scripts/find-missing-vertex-colors.ts
 *
 * Output: CSV format with title name, icon name (directory), and slug
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Icons } from '../src/model/Titles';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

interface IconInfo {
    slug: string;
    objFiles: string[];
}

/** Get all immediate subdirectories in the icons directory */
function getIconDirectories(): string[] {
    const entries = fs.readdirSync(ICONS_DIR, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}

/** Find all .obj files in a specific icon directory (non-recursive) */
function findObjFilesInDir(dirPath: string): string[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.obj'))
        .map(entry => path.join(dirPath, entry.name));
}

/** Whether every one of an OBJ's vertex rows carries color data. Null if it has no vertex rows at all. */
function objHasVertexColors(objPath: string): boolean | null {
    try {
        const content = fs.readFileSync(objPath, 'utf-8');
        let foundVertex = false;

        for (const line of content.split('\n')) {
            if (!line.startsWith('v ')) {
                continue;
            }

            foundVertex = true;

            // A colored vertex row is `v x y z r g b #a`, an uncolored one is just `v x y z`.
            const components = line.split('#')[0].trim().split(/\s+/);
            if (components.length < 7) {
                return false;
            }
        }

        return foundVertex ? true : null;
    } catch (error) {
        console.error(`Error reading ${objPath}:`, error);
        return null;
    }
}

/** Escape CSV field - wrap in quotes if contains comma, quote, or newline */
function escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

function main() {
    const missing: IconInfo[] = [];
    const empty: IconInfo[] = [];

    for (const slug of getIconDirectories()) {
        const objFiles = findObjFilesInDir(path.join(ICONS_DIR, slug));
        if (objFiles.length === 0) {
            continue;
        }

        const results = objFiles.map(objHasVertexColors);
        const fileNames = objFiles.map(f => path.basename(f));

        if (results.some(r => r === false)) {
            missing.push({ slug, objFiles: fileNames });
        } else if (results.every(r => r === null)) {
            empty.push({ slug, objFiles: fileNames });
        }
    }

    console.log('Title,Icon Name,Slug');

    for (const icon of missing) {
        const iconDbEntry = Icons.find(i => i.code == icon.slug);
        console.log(`${escapeCSV(iconDbEntry?.title.name ?? '')},${escapeCSV(iconDbEntry?.name ?? '')},${escapeCSV(icon.slug)}`);
    }

    if (empty.length > 0) {
        console.error(`\n${empty.length} icon(s) have .obj files with no vertex rows at all:`);
        for (const icon of empty) {
            console.error(`  ${icon.slug}: ${icon.objFiles.join(', ')}`);
        }
    }

    console.error(`\nFound ${missing.length} icons missing vertex color data.`);
}

main();
