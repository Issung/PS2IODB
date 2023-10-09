import fs from 'fs';
import { GameList } from "../model/GameList";
import { dir } from 'console';
import exp from 'constants';

// Tests that test the 2 sources of truth, the GameList file and the icon folders, making sure they match up.
describe("Database Entries Tests", () => 
{
    // Assert that all entries in GameList either have just `name` populated, or if `code` is populated then `icons` is too.
    test('GameList entries have correct number of params', () => {
        GameList.forEach(game => {
            expect(game.name).not.toBeUndefined();

            if (game.code === undefined)
            {
                expect(game.icons, "A gamelist entry with no code set should also have no icon count set.").toBeUndefined();
            }
            else
            {
                expect(game.icons, "A gamelist entry with code set should also have icon count set.").not.toBeUndefined();
            }
        })
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

    // Asser that all items in GameList that have `code` populated have a /public/icons directory matching the `code` value.
    test('All populated GameList entries have matching icon directory', () => {
        // Read the contents of the directory
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        GameList.forEach(game => {
            if (game.code != undefined)
            {
                expect(iconDirectories, `GameList entry '${game.code}' does not appear to have a matching directory.`).toContain(game.code);
            }
        });
    });

    // Assert all directories in /public/icons have a GameList entry with `code` matching the directory name.
    test('All icon directories have populated GameList entry', () => {
        // Read the contents of the directory
        const directoryItems = fs.readdirSync('./public/icons', { withFileTypes: true });

        const iconDirectories = directoryItems
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        iconDirectories.forEach(directory => {
            let gameListHasMatchingEntry = GameList.some(game => game.code === directory);
            expect(gameListHasMatchingEntry, `Directory '${directory}' doesn't seem to have a GameList entry.`).toBe(true);
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
            const iconCount = GameList.filter(g => g.code == folder)[0].icons!;
            let directory = `./public/icons/${folder}`;
            let files = fs.readdirSync(directory, { withFileTypes: true }).map(e => e.name);
            let objFiles = files.filter(file => file.endsWith('.obj'));
            expect(objFiles.length, "Icon folder must have at least the amount of icons specifed in GameList.").toBeGreaterThanOrEqual(iconCount);
        });
    });
});