import { GameList } from "../GameList";
import fs from 'fs';

// Tests that test the 2 sources of truth, the GameList file and the icon folders, making sure they match up.
describe("Database Entries Tests", () => 
{
    // Assert that all entries in GameList either have just `name` populated, or if `code` is populated then `icons` is too.
    test('GameList entries have correct number of params', () => {
        GameList.forEach(game => {
            expect(game.name).not.toBeUndefined();

            if (game.code === undefined)
            {
                expect(game.icons).toBeUndefined();
            }
            else
            {
                expect(game.icons).not.toBeUndefined();
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

        expect(items.length).toBe(0);

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
                expect(iconDirectories).toContain(game.code);
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
            expect(gameListHasMatchingEntry).toBe(true);
        });
    });

    // TODO: Assert icon directory has 1 iconsys.json file.
    // TODO: Assert each icon directory's files matches what is specified inside the iconsys.json file.
});