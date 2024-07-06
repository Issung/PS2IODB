import { Contributor } from "./Contributor";

export const enum IconTypes {
    Normal = 1,
    Copy = 1 << 1,
    Delete = 1 << 2,

    All = Normal | Copy | Delete,
}

export class Game {
    /**
     * The name/title of the game in the closest thing to English.
     */
    public name: string;

    /**
     * The 'code' of the game. A shortened URL-friendly identifier for this game to be known as.
     */
    public code?: string;

    /**
     * The number of unique save icons this game has.
     */
    public icons?: number;

    /**
     * The index of this game in the overall GameList.
     * Set from GameList.tsx, after the collection's initialisation.
     * Used as key in the DOM.
     */
    public index: number = 0;

    /**
     * Contributor of the icon, can be left `undefined` for anonymous contributions.
     */
    public contributor: Contributor | undefined;

    /**
     * Constructor.
     * Either populate just `name` to indicate the game is not yet uploaded, or populate all fields to indicate it is.
     * @param name The name/title of the game.
     * @param code The 'code' of the game. A shortened URL-friendly identifier for the game.
     * @param icons The number of unique save icons this game has.
     */
    constructor(
        name: string,
        code?: string,
        icons?: number,
        contributor?: Contributor
    ) 
    {
        this.name = name;
        this.code = code;
        this.icons = icons;
        this.contributor = contributor;
    }
}