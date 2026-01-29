/**
 * Script to normalize all iconsys.json and .anim files to JavaScript formatting style.
 *
 * Differences from Python export:
 * - LF line endings instead of CRLF.
 * - No trailing .0 on whole numbers (e.g., 1 instead of 1.0).
 * - No spaces after commas in arrays (except single-line formatted ones).
 * - Tab indentation instead of spaces.
 * - Japanese characters written as UTF-8 instead of escaped \uXXXX.
 * - Single-line formatting for specific arrays/objects (light arrays, vertexData, keys).
 *
 * Further normalisation could still be performed on the obj files to remove trailing zeroes too.
 *
 * Usage:
 *   npx tsx scripts/normalize-json.ts                      (default: public/icons)
 *   npx tsx scripts/normalize-json.ts /path/to/directory   (search directory recursively, includes glob pattern support)
 *
 * Glob patterns must be quoted on Windows. Supports wildcards like * and ** for matching.
 *
 * Decided not to run this as it only reduced size of the icons folder by 2.7%, the added
 * history to the Git repo would likely be more annoying to deal with than that extra 2.7%.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { formatIconSys, formatAnim } from '../src/utils/JsonFormatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

interface Stats {
    processed: number;
    modified: number;
    errors: number;
}

/** Check if a string contains glob special characters */
function isGlobPattern(str: string): boolean {
    return /[*?[\]{}!]/.test(str);
}

/** Find files matching our target patterns in a directory recursively */
function findFilesInDir(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && pattern.test(entry.name)) {
                results.push(fullPath);
            }
        }
    }

    walk(dir);
    return results;
}

/** Find files using glob pattern or directory search */
async function findFiles(input: string): Promise<string[]> {
    if (isGlobPattern(input)) {
        // Use glob for pattern matching
        const files = await glob(input, {
            absolute: true,
            nodir: true,
            windowsPathsNoEscape: true
        });
        return files;
    } else {
        // Check if it's a directory or file
        const stats = fs.statSync(input);
        if (stats.isDirectory()) {
            // Search directory for iconsys.json and .anim files
            const pattern = /^(iconsys\.json|.*\.anim)$/;
            return findFilesInDir(input, pattern);
        } else if (stats.isFile()) {
            // Single file
            return [path.resolve(input)];
        }
    }
    return [];
}

function normalizeFile(filePath: string, baseDir: string, stats: Stats): void {
    try {
        const originalContent = fs.readFileSync(filePath, 'utf-8');

        // Parse JSON
        const data = JSON.parse(originalContent);

        // Determine which formatter to use based on file type
        const fileName = path.basename(filePath);
        let newContent: string;

        if (fileName === 'iconsys.json') {
            newContent = formatIconSys(data);
        } else if (fileName.endsWith('.anim')) {
            newContent = formatAnim(data);
        } else {
            // Fallback - shouldn't happen with our pattern
            newContent = JSON.stringify(data, null, '\t');
        }

        // Ensure LF line endings and trailing newline
        newContent = newContent.replace(/\r\n/g, '\n');
        if (!newContent.endsWith('\n')) {
            newContent += '\n';
        }

        // Compare with original (normalize for comparison)
        const originalNormalized = originalContent.replace(/\r\n/g, '\n');

        if (newContent !== originalNormalized) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            stats.modified++;
            console.log(`Modified: ${path.relative(baseDir, filePath)}`);
        }

        stats.processed++;
    } catch (error) {
        stats.errors++;
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function main() {
    const args = process.argv.slice(2);

    // Determine input path - use argument or default to icons directory
    const inputPath = args[0] || DEFAULT_ICONS_DIR;
    const resolvedInput = path.resolve(inputPath);

    console.log('Normalizing JSON files in:', resolvedInput);

    // Determine base directory for relative path display
    let baseDir: string;
    if (isGlobPattern(inputPath)) {
        // For glob patterns, use the first non-glob part as base
        const parts = inputPath.split(/[*?[\]{}]/)[0];
        baseDir = path.dirname(path.resolve(parts)) || process.cwd();
    } else if (fs.existsSync(resolvedInput) && fs.statSync(resolvedInput).isDirectory()) {
        baseDir = resolvedInput;
    } else {
        baseDir = path.dirname(resolvedInput);
    }

    // Find all files
    const files = await findFiles(resolvedInput);

    // Filter to only iconsys.json and .anim files if using glob (user might want other patterns)
    const targetFiles = files.filter(f => {
        const name = path.basename(f);
        return name === 'iconsys.json' || name.endsWith('.anim');
    });

    console.log(`Found ${targetFiles.length} files to process`);

    if (targetFiles.length === 0) {
        console.log('No iconsys.json or .anim files found.');
        return;
    }

    const stats: Stats = {
        processed: 0,
        modified: 0,
        errors: 0
    };

    // Process files
    for (const file of targetFiles) {
        normalizeFile(file, baseDir, stats);
    }

    console.log('');
    console.log('=== Summary ===');
    console.log(`Processed: ${stats.processed}`);
    console.log(`Modified:  ${stats.modified}`);
    console.log(`Errors:    ${stats.errors}`);
}

main();

