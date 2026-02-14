/**
 * Script to find icon directories that have more than 1 .anim file
 * where all .anim files share the same `vertexData` values.
 * 
 * This can help identify icons which have the "Combat Queen" issue of the icon exports not respecting animation frame shape ids.
 * 
 * Usage:
 *   npx tsx scripts/find-same-vertex-anims.ts
 * 
 * Output: CSV format with title name, icon name (directory), and slug
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnimationData } from '../src/model/AnimationData';
import { Icons } from '../src/model/Titles';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

interface IconInfo {
    slug: string;
    title: string;
    animFiles: string[];
}

/** Get all immediate subdirectories in the icons directory */
function getIconDirectories(): string[] {
    const entries = fs.readdirSync(ICONS_DIR, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}

/** Find all .anim files in a specific icon directory (non-recursive) */
function findAnimFilesInDir(dirPath: string): string[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.anim'))
        .map(entry => path.join(dirPath, entry.name));
}

/** Get all vertexData from an animation file, flattened and stringified */
function getVertexDataSignature(animPath: string): string | null {
    try {
        const content = fs.readFileSync(animPath, 'utf-8');
        const animData: AnimationData = JSON.parse(content);
        
        if (!animData.frames || animData.frames.length === 0) {
            return null;
        }

        // Collect all vertexData from all frames
        const allVertexData = animData.frames.map(frame => JSON.stringify(frame.vertexData));
        return JSON.stringify(allVertexData);
    } catch (error) {
        console.error(`Error reading ${animPath}:`, error);
        return null;
    }
}

/** Check if all anim files in a directory have the same vertexData */
function allAnimsHaveSameVertexData(animFiles: string[]): boolean {
    if (animFiles.length < 2) {
        return false; // Need at least 2 files to compare
    }

    const firstSignature = getVertexDataSignature(animFiles[0]);
    if (firstSignature === null) {
        return false;
    }

    for (let i = 1; i < animFiles.length; i++) {
        const signature = getVertexDataSignature(animFiles[i]);
        if (signature === null || signature !== firstSignature) {
            return false;
        }
    }

    return true;
}

/** Get the title from iconsys.json */
function getTitleFromIconsys(dirPath: string): string {
    const iconsysPath = path.join(dirPath, 'iconsys.json');
    try {
        if (fs.existsSync(iconsysPath)) {
            const content = fs.readFileSync(iconsysPath, 'utf-8');
            const iconsys = JSON.parse(content);
            return iconsys.title || '';
        }
    } catch (error) {
        // Ignore errors, return empty string
    }
    return '';
}

/** Escape CSV field - wrap in quotes if contains comma, quote, or newline */
function escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

async function main() {
    console.log('Scanning for icon directories with multiple identical .anim files...\n');

    const iconDirs = getIconDirectories();
    const matchingIcons: IconInfo[] = [];

    for (const slug of iconDirs) {
        const dirPath = path.join(ICONS_DIR, slug);
        const animFiles = findAnimFilesInDir(dirPath);

        // Only check directories with more than 1 .anim file
        if (animFiles.length > 1) {
            if (allAnimsHaveSameVertexData(animFiles)) {
                const title = getTitleFromIconsys(dirPath);
                matchingIcons.push({
                    slug,
                    title,
                    animFiles: animFiles.map(f => path.basename(f))
                });
            }
        }
    }

    console.log(`Found ${matchingIcons.length} directories with multiple .anim files having identical vertexData:\n`);

    // Output CSV
    console.log('Title,Icon Name,Slug');

    for (const icon of matchingIcons) {
        const iconDbEntry = Icons.find(i => i.code == icon.slug)!;

        console.log(`${escapeCSV(iconDbEntry?.title.name)},${escapeCSV(iconDbEntry?.name)},${escapeCSV(icon.slug)}`);
    }
}

main();

