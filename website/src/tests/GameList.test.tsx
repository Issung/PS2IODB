import exp from "constants";
import { GameList } from "../GameList";
import fs from 'fs';

test('GameList entries have correct number of params', () => {
    GameList.forEach(game => {
        expect(game.name).not.toBeUndefined();

        if (game.code === undefined) {
            expect(game.icons).toBeUndefined();
        }
        else {
            expect(game.icons).not.toBeUndefined();
        }
    })
});

test('get folders', () => {
    // Read the contents of the directory
    const contents = fs.readdirSync('./public/icons', { withFileTypes: true });

    // Filter out only the directories
    const folders = contents
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

    console.log(folders);
});
