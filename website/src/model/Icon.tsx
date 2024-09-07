import { Contributor } from "./Contributor";
import { Game } from "./Game";

/**
 * An icon for a game. Most games have just 1 icon, but some 
 * like SF3 have a unique icon for each character, or have regional differences.
 */
export class Icon {
    public game: Game;
    public name: string;
    public code?: string;
    public variantCount?: number;
    public contributor?: Contributor;

    /**
     * The index of this game in the overall GameList.
     * Set from GameList.tsx, after the collection's initialisation.
     * Used as key in the DOM.
     */
    public index: string = '';
    
    /**
     * Constructor.
     * Either populate just `name` to indicate the game is not yet uploaded, or populate all fields to indicate it is.
     * @param name The name/title of the game.
     * @param code The 'code' of the game. A shortened URL-friendly identifier for the game.
     * @param variantCount The number of unique save icons this game has.
     */
    constructor(
        game: Game,
        name: string,
        code?: string,
        variantCount?: number,
        contributor?: Contributor,
    ) 
    {
        this.game = game;
        this.name = name;
        this.code = code;
        this.variantCount = variantCount;
        this.contributor = contributor;
    }
}