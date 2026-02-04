/**
 * Script to identify static animations and update Titles.ts to set their animation parameter to `null`.
 * 
 * A static animation is one where the `vertexData` property is the exact same across all frames.
 * These icons don't actually animate, they just have animation metadata that should be nullified.
 * 
 * Usage:
 *   npx tsx scripts/index-static-animations.ts           (dry run - shows what would change)
 *   npx tsx scripts/index-static-animations.ts --apply   (apply changes to Titles.ts)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnimationData } from '../src/model/AnimationData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');
const TITLES_FILE = path.resolve(__dirname, '..', 'src', 'model', 'Titles.ts');

/** Check if an animation is static (all frames have identical vertexData) */
function isStaticAnimation(animData: AnimationData): boolean {
    if (!animData.frames || animData.frames.length < 2) {
        return true; // Single frame or no frames = static
    }

    const firstVertexData = JSON.stringify(animData.frames[0].vertexData);
    
    for (let i = 1; i < animData.frames.length; i++) {
        if (JSON.stringify(animData.frames[i].vertexData) !== firstVertexData) {
            return false; // Found a frame with different vertexData
        }
    }

    return true;
}

/** Find all .anim files in a directory recursively */
function findAnimFiles(dir: string): string[] {
    const results: string[] = [];
    
    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.anim')) {
                results.push(fullPath);
            }
        }
    }
    
    walk(dir);
    return results;
}

/** Get the directory code from an anim file path */
function getDirectoryCode(animPath: string): string {
    const relativePath = path.relative(ICONS_DIR, animPath);
    const dirName = relativePath.split(path.sep)[0];
    return dirName;
}

/** Find all static animation directory codes */
function findStaticAnimationCodes(): Set<string> {
    const animFiles = findAnimFiles(ICONS_DIR);

    // Group anim files by directory code
    const animFilesByCode = new Map<string, string[]>();
    for (const animFile of animFiles) {
        const code = getDirectoryCode(animFile);
        if (!animFilesByCode.has(code)) {
            animFilesByCode.set(code, []);
        }
        animFilesByCode.get(code)!.push(animFile);
    }

    // Only mark as static if ALL anim files in the directory are static
    const staticCodes = new Set<string>();
    for (const [code, files] of animFilesByCode) {
        let allStatic = true;
        for (const animFile of files) {
            try {
                const content = fs.readFileSync(animFile, 'utf-8');
                const animData: AnimFile = JSON.parse(content);

                if (!isStaticAnimation(animData)) {
                    allStatic = false;
                    break;
                }
            } catch (error) {
                console.error(`Error reading ${animFile}:`, error);
                allStatic = false;
                break;
            }
        }
        if (allStatic) {
            staticCodes.add(code);
        }
    }

    return staticCodes;
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Update Titles.ts to set animation to null for static animations */
function updateTitlesFile(staticCodes: Set<string>, apply: boolean): { changeCount: number; unmatchedCodes: string[] } {
    let titlesContent = fs.readFileSync(TITLES_FILE, 'utf-8');
    let changeCount = 0;
    const unmatchedCodes: string[] = [];

    for (const code of staticCodes) {
        const escapedCode = escapeRegex(code);
        // Match patterns like: `code`, 1, Contributors.Xxx, 1) or `code`, 1, Contributors.Xxx, 2)
        // The animation value is the last parameter before the closing paren
        const patterns = [
            // new Game(`Name`, `code`, N, Contributors.X, 1) - direct game constructor
            // Note: \s* around commas to handle inconsistent spacing like "1 ,Contributors"
            new RegExp(`(\`${escapedCode}\`\\s*,\\s*\\d+\\s*,\\s*Contributors\\.[A-Za-z0-9]+\\s*,\\s*)(1|2)(\\))`, 'g'),
            // new Game(`Name`, `code`, N, [Contributors.X, Contributors.Y], 1) - array contributors
            new RegExp(`(\`${escapedCode}\`\\s*,\\s*\\d+\\s*,\\s*\\[[^\\]]+\\]\\s*,\\s*)(1|2)(\\))`, 'g'),
        ];

        let matched = false;
        for (const pattern of patterns) {
            const matches = titlesContent.match(pattern);
            if (matches) {
                const newContent = titlesContent.replace(pattern, '$1null$3');
                if (newContent !== titlesContent) {
                    changeCount++;
                    matched = true;
                    console.log(`Found static animation: ${code} (animation value -> null)`);
                    titlesContent = newContent;
                }
            }
        }

        if (!matched) {
            unmatchedCodes.push(code);
        }
    }

    if (apply && changeCount > 0) {
        fs.writeFileSync(TITLES_FILE, titlesContent, 'utf-8');
        console.log(`\nApplied ${changeCount} changes to Titles.ts`);
    }

    return { changeCount, unmatchedCodes };
}

async function main() {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');

    console.log('Scanning for static animations...\n');

    const staticCodes = findStaticAnimationCodes();
    console.log(`Found ${staticCodes.size} directories with static animations:\n`);

    const { changeCount, unmatchedCodes } = updateTitlesFile(staticCodes, apply);

    console.log(`\n=== Summary ===`);
    console.log(`Static animation directories: ${staticCodes.size}`);
    console.log(`Titles.ts entries to update: ${changeCount}`);

    if (unmatchedCodes.length > 0) {
        console.log(`\n=== Unmatched codes (${unmatchedCodes.length}) ===`);
        console.log(`These directories have static animations but no matching entry in Titles.ts with animation value 1 or 2:`);
        for (const code of unmatchedCodes) {
            console.log(`  - ${code}`);
        }
    }

    if (!apply && changeCount > 0) {
        console.log(`\nRun with --apply to make changes: npx tsx scripts/index-static-animations.ts --apply`);
    }
}

main();

