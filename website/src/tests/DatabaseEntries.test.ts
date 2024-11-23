import fs from 'fs';
import { IconList } from "../model/GameList";

// Tests that test the 2 sources of truth, the GameList file and the icon folders, making sure they match up.
describe("Database Entries Tests", () => 
{
    // Assert that all entries in GameList either have just `name` populated, or if `code` is populated then `icons` is too.
    test('Icons should have correct number of params', () => {
        IconList.forEach(icon => {
            expect(icon.name).toBeDefined();
            
            if (icon.code === undefined)
                {
                    expect(icon.variantCount, "If code is unset, variantCount should be too.").toBeUndefined();
                    expect(icon.contributor, "If code is unset, contributor should be too.").toBeUndefined();
                }
                else
                {
                    expect(icon.variantCount, "If code is set, variantCount should be too.").toBeDefined();
                    expect(icon.contributor, "If code is set, contributor should be too.").toBeDefined();
                }
            })
        });
        
        // Assert all iconsys.json files are valid json.
        test('All iconsys.json files are valid JSON', () => {
            IconList
            .filter(i => i.code)
            .forEach(icon => {
                const filePath = `./public/icons/${icon.code}/iconsys.json`;

                expect(fs.existsSync(filePath)).toBe(true);
                
                const buffer = fs.readFileSync(filePath, 'utf-8');
                expect(() => JSON.parse(buffer)).not.toThrow();
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

        IconList.forEach(icon => {
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
            let iconsWithMatchingCode = IconList.filter(icon => icon.code === directory).length;
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
            const iconCount = IconList.filter(i => i.code == folder)[0].variantCount!;
            let directory = `./public/icons/${folder}`;
            let files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);
            let objFiles = files.filter(file => file.endsWith('.obj'));
            expect(objFiles.length, "Icon folder must have at least the amount of icons specifed in GameList.").toBeGreaterThanOrEqual(iconCount);
        });
    });
});