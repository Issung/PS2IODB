/**
 * Script to create icon.zip files for each icon directory in public/icons.
 * This is used in production/release mode to reduce HTTP requests.
 *
 * Usage:
 *   npx tsx scripts/create-icon-zips.ts [--delete-originals]
 *
 * Options:
 *   --delete-originals  Delete the original files after creating the zip (for deployment)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

function findIconDirectories(baseDir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(baseDir)) {
        console.error(`Directory does not exist: ${baseDir}`);
        process.exit(1);
    }

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const iconDir = path.join(baseDir, entry.name);
            const iconsysPath = path.join(iconDir, 'iconsys.json');
            if (fs.existsSync(iconsysPath)) {
                results.push(iconDir);
            }
        }
    }

    return results;
}

async function createIconZip(iconDir: string, deleteOriginals: boolean): Promise<{ files: number; size: number }> {
    const zip = new JSZip();
    const files = fs.readdirSync(iconDir);
    let fileCount = 0;

    // Add all files to the zip (except existing icon.zip)
    for (const file of files) {
        if (file === 'icon.zip') continue;

        const filePath = path.join(iconDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            const content = fs.readFileSync(filePath);
            zip.file(file, content);
            fileCount++;
        }
    }

    // Generate the zip
    const zipContent = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    });

    // Write the zip file
    const zipPath = path.join(iconDir, 'icon.zip');
    fs.writeFileSync(zipPath, zipContent);

    // Delete original files if requested
    if (deleteOriginals) {
        for (const file of files) {
            if (file === 'icon.zip') continue;

            const filePath = path.join(iconDir, file);
            const stat = fs.statSync(filePath);

            if (stat.isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    }

    return { files: fileCount, size: zipContent.length };
}

async function main() {
    const deleteOriginals = process.argv.includes('--delete-originals');
    const startTime = performance.now();

    console.log(`Creating icon.zip files in: ${ICONS_DIR}`);
    if (deleteOriginals) {
        console.log('Will delete original files after zipping.');
    }

    const iconDirs = findIconDirectories(ICONS_DIR);
    console.log(`Found ${iconDirs.length} icon directories. Processing in parallel...`);

    // Process all icons in parallel
    const results = await Promise.all(
        iconDirs.map(iconDir => createIconZip(iconDir, deleteOriginals))
    );

    // Aggregate results
    const totalFiles = results.reduce((sum, r) => sum + r.files, 0);
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    console.log(`\nDone in ${elapsed}s!`);
    console.log(`Processed: ${results.length} icon directories`);
    console.log(`Total files zipped: ${totalFiles}`);
    console.log(`Total zip size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);

