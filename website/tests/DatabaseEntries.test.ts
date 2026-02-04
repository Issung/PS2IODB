import fs from 'fs';
import { Icons } from "../src/model/Titles";
import { AnimationData } from "../src/model/AnimationData";

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

// Tests that test the 2 sources of truth, the GameList file and the icon folders, making sure they match up.
describe("Database Entries Tests", () => 
{
    // Assert that all entries in GameList either have just `name` populated, or if `code` is populated then `icons` is too.
    test('Icons should have correct number of params', () => {
        Icons.forEach(icon => {
            expect(icon.name).toBeDefined();
            
            if (icon.code === undefined)
            {
                expect(icon.uniqueStates, `${icon.name} code is unset, variantCount should be too.`).toBeUndefined();
                expect(icon.contributors.length, `${icon.name} code is unset, contributors should be empty.`).toBe(0);
            }
            else
            {
                expect(icon.uniqueStates, `${icon.name} code is set, variantCount should be too.`).toBeDefined();
                expect(icon.contributors.length, `${icon.name} code is set, contributors should not be empty.`).toBeGreaterThan(0);
            }
        })
    });
        
    // Assert all iconsys.json files are valid json.
    test('All iconsys.json files are valid JSON', () => {
        Icons
        .filter(i => i.code)
        .forEach(icon => {
            const path = `./public/icons/${icon.code}/iconsys.json`;

            expect(fs.existsSync(path), `iconsys.json should exist at path ${path}.`).toBe(true);
            
            const buffer = fs.readFileSync(path, 'utf-8');
            expect(() => JSON.parse(buffer), `${icon.code}/iconsys.icon should be parsable`).not.toThrow();
        });
    });

    // Assert that /public/icons only has directories, no files, links, sockets, etc.
    test('Icons directory contains only directories', () => {
        // Read the contents of the directory
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        // Get all items that aren't directories.
        const items = directoryItems
            .filter((entry) => !entry.isDirectory())
            .map((entry) => entry.name);

        console.log('Non directory items in icons folder:')
        console.log(items);

        expect(items.length, "Directory /public/icons directory should only contain directories.").toBe(0);
    });

    // Assert that all items in GameList that have `code` populated have a /public/icons directory matching the `code` value.
    test('All icons should have matching directory', () => {
        // Read the contents of the directory
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        Icons.forEach(icon => {
            if (icon.code != undefined)
            {
                expect(iconDirectories, `Icon with code '${icon.code}' does not appear to have a matching directory.`).toContain(icon.code);
            }
        });
    });

    // Assert all directories in /public/icons have a GameList entry with `code` matching the directory name.
    test('All icon directories have 1 icon record', () => {
        // Read the contents of the directory
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        iconDirectories.forEach(directory => {
            let iconsWithMatchingCode = Icons.filter(icon => icon.code === directory).length;
            expect(iconsWithMatchingCode > 0, `Directory '${directory}' does not have an icon record.`).toBe(true);
            expect(iconsWithMatchingCode == 1, `Directory '${directory}' has more than 1 icon record.`).toBe(true);
        });
    });

    test('All icon directories has expected files', () => {
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        iconDirectories.forEach(iconDirectory => {
            let directory = `./public/icons/${iconDirectory}`;
            let files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);

            expect(files.filter(f => f == 'iconsys.json').length, `${directory} must have 1 and only 1 iconsys.json file.`).toBe(1);
            expect(files.some(f => f.endsWith('.obj'), `${directory} must have atleast one obj file.`)).toBe(true);
            expect(files.some(f => f.endsWith('.png'), `${directory} must have atleast one png file.`)).toBe(true);
            expect(files.some(f => f.endsWith('.mtl'), `${directory} must have atleast one mtl file.`)).toBe(true);
        });
    });

    test('Icon entries have atleast the amount of objs as icon count', () => {
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconFolders = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        iconFolders.forEach(folder => {
            const iconCount = Icons.filter(i => i.code == folder)[0].uniqueStates!;
            let directory = `./public/icons/${folder}`;
            let files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);
            let objFiles = files.filter(file => file.endsWith('.obj'));
            expect(objFiles.length, `Icon folder ${folder} must have at least the amount of icons specifed in GameList.`).toBeGreaterThanOrEqual(iconCount);
        });
    });

    test('Icon directories do not contain directories', () => {
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        const nestedDirs: string[] = [];

        iconDirectories.forEach(iconDirectory => {
            const directory = `./public/icons/${iconDirectory}`;
            const items = fs.readdirSync(directory, { withFileTypes: true });
            const nested = items.filter(e => e.isDirectory()).map(e => e.name);
            nested.forEach(n => nestedDirs.push(`${iconDirectory}/${n}`));
        });

        console.log('Nested directories found in icon folders:');
        console.log(nestedDirs);

        expect(nestedDirs.length, 'No icon directory should contain any directories.').toBe(0);
    });

    test('Icon directories are not empty', () => {
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        const emptyDirs: string[] = [];

        iconDirectories.forEach(iconDirectory => {
            const directory = `./public/icons/${iconDirectory}`;
            const items = fs.readdirSync(directory, { withFileTypes: true });
            if (items.length === 0) emptyDirs.push(iconDirectory);
        });

        console.log('Empty icon directories found:');
        console.log(emptyDirs);

        expect(emptyDirs.length, 'No empty directories should be present in the icons directory.').toBe(0);
    });

    test('Icons with animationVersion should have matching .anim file version', () => {
        const issues: string[] = [];

        Icons
            .filter(i => i.code && i.animationVersion !== undefined)
            .forEach(icon => {
                const directory = `./public/icons/${icon.code}`;
                const files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);
                const animFile = files.find(f => f.endsWith('.anim'));

                if (!animFile) {
                    issues.push(`${icon.code}: has animationVersion=${icon.animationVersion} but no .anim file`);
                    return;
                }

                const animPath = `${directory}/${animFile}`;
                const animContent = fs.readFileSync(animPath, 'utf-8');
                const animData: AnimationData = JSON.parse(animContent);

                // In .anim files: undefined = V1, 2 = V2
                // In Titles.ts: 1 = V1, 2 = V2, null = static animation
                const fileVersion = animData.version === undefined ? 1 : animData.version;

                // Check if animation is static (all frames have identical vertexData)
                const isStatic = isStaticAnimation(animData);

                if (icon.animationVersion === null) {
                    // If marked as static in Titles.ts, verify the animation is actually static
                    if (!isStatic) {
                        issues.push(`${icon.code}: Titles.ts has null (static), but .anim file has different frames`);
                    }
                } else if (icon.animationVersion !== fileVersion) {
                    issues.push(`${icon.code}: Titles.ts has ${icon.animationVersion}, .anim file has ${fileVersion}`);
                }
            });

        console.log('Icons -> .anim file version issues:');
        console.log(issues);

        expect(issues.length, 'All icons with animationVersion should have matching .anim file version.').toBe(0);
    });

    test('Icon directories with .anim files should have correct animationVersion in Titles.ts', () => {
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        const issues: string[] = [];

        iconDirectories.forEach(iconDirectory => {
            const directory = `./public/icons/${iconDirectory}`;
            const files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);
            const animFile = files.find(f => f.endsWith('.anim'));

            if (animFile) {
                const icon = Icons.find(i => i.code === iconDirectory);
                if (!icon) {
                    return; // No matching icon entry, other tests will catch this
                }

                const animPath = `${directory}/${animFile}`;
                const animContent = fs.readFileSync(animPath, 'utf-8');
                const animData: AnimationData = JSON.parse(animContent);

                // In .anim files: undefined = V1, 2 = V2
                // In Titles.ts: 1 = V1, 2 = V2, null = static animation
                const expectedVersion = animData.version === undefined ? 1 : animData.version;
                const isStatic = isStaticAnimation(animData);

                if (icon.animationVersion === undefined) {
                    issues.push(`${iconDirectory}: missing animationVersion, expected ${isStatic ? 'null (static)' : expectedVersion}`);
                } else if (icon.animationVersion === null) {
                    // If marked as static, verify the animation is actually static
                    if (!isStatic) {
                        issues.push(`${iconDirectory}: has animationVersion=null (static), but .anim file has different frames`);
                    }
                } else if (icon.animationVersion !== expectedVersion) {
                    issues.push(`${iconDirectory}: has animationVersion=${icon.animationVersion}, expected ${isStatic ? 'null (static)' : expectedVersion}`);
                }
            }
        });

        console.log('.anim files -> Titles.ts version issues:');
        console.log(issues);

        expect(issues.length, 'All icon directories with .anim files should have correct animationVersion in Titles.ts.').toBe(0);
    });
});