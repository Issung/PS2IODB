/**
 * Script to find all iconsys.json files that reference icon files that don't exist.
 * Checks the 'normal', 'copy', and 'delete' fields and verifies that at least one
 * file with that base name exists (e.g., icon.ico.obj, icon.ico.mtl, icon.ico.png).
 *
 * Usage:
 *   npx tsx scripts/find-missing-icon-files.ts
 *
 * Output format (CSV):
 *   icon,missingFile
 *   ssx,ssx2.ico
 *   ssx,ssx3.ico
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

interface IconSys {
    normal?: string;
    copy?: string;
    delete?: string;
}

interface MissingFile {
    icon: string;
    missingFile: string;
}

function findIconsysFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const iconsysPath = path.join(dir, entry.name, 'iconsys.json');
            if (fs.existsSync(iconsysPath)) {
                results.push(iconsysPath);
            }
        }
    }

    return results;
}

function getFilesInDirectory(dir: string): string[] {
    const files: string[] = [];
    try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            files.push(entry.toLowerCase());
        }
    } catch {
        // Directory doesn't exist or can't be read
    }
    return files;
}

function iconFileExists(iconDir: string, iconName: string, filesInDir: string[]): boolean {
    if (!iconName) return true;

    // Check if any file starts with the icon name (case-insensitive)
    const lowerIconName = iconName.toLowerCase();

    for (const file of filesInDir) {
        if (file.startsWith(lowerIconName + '.')) {
            return true;
        }
    }

    return false;
}

function checkIconsys(iconsysPath: string): MissingFile[] {
    const missing: MissingFile[] = [];
    const iconDir = path.dirname(iconsysPath);
    const iconName = path.basename(iconDir);

    try {
        const content = fs.readFileSync(iconsysPath, 'utf-8');
        const iconsys: IconSys = JSON.parse(content);
        const filesInDir = getFilesInDirectory(iconDir);

        const fieldsToCheck: (keyof IconSys)[] = ['normal', 'copy', 'delete'];

        for (const field of fieldsToCheck) {
            const iconFile = iconsys[field];
            if (iconFile && !iconFileExists(iconDir, iconFile, filesInDir)) {
                missing.push({ icon: iconName, missingFile: iconFile });
            }
        }
    } catch (error) {
        console.error(`Error processing ${iconsysPath}:`, error);
    }

    return missing;
}

function main() {
    console.log('icon,missingFile');

    const iconsysFiles = findIconsysFiles(ICONS_DIR);
    const allMissing: MissingFile[] = [];

    for (const iconsysPath of iconsysFiles) {
        const missing = checkIconsys(iconsysPath);
        allMissing.push(...missing);
    }

    for (const { icon, missingFile } of allMissing) {
        console.log(`${icon},${missingFile}`);
    }

    if (allMissing.length === 0) {
        console.error('\nNo missing icon files found.');
    } else {
        console.error(`\nFound ${allMissing.length} missing icon file references.`);
    }
}

main();

