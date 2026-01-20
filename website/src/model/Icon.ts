import { Contributor } from "./Contributor";
import { AnimationValue, Title } from "./Title";

/**
 * An icon for a game. Most games have just 1 icon, but some 
 * like SF3 have a unique icon for each character, or have regional differences.
 */
export class Icon {
    public title: Title;
    public name: string;
    public code?: string;
    public uniqueStates?: number;
    public contributor?: Contributor;
    public animationVersion?: AnimationValue;

    /**
     * For use as a key in React rendering, a combination of the title's index in the TitleList, and this icon's index within the title.
     * In the format: `${titleIndex}-${iconIndex}`
     * Set from GameList.tsx, after the collection's initialisation.
     */
    public index: string = '';
    
    /**
     * Constructor.
     * Either populate just `name` to indicate the game is not yet uploaded, or populate all fields to indicate it is.
     * @param name The name/title of the game.
     * @param code The 'code' of the game. A shortened URL-friendly identifier for the game.
     * @param states The number of unique states this save icon has (for idle/copy/delete states in the UI). If multiple states are visually identical, count them as one.
     * @param animation The animation version. 1 = V1 (needs re-contributing), 2 = V2 animation.
     */
    constructor(
        game: Title,
        name: string,
        code?: string,
        states?: number,
        contributor?: Contributor,
        animation?: AnimationValue
    ) 
    {
        this.title = game;
        this.name = name;
        this.code = code;
        this.uniqueStates = states;
        this.contributor = contributor;
        this.animationVersion = animation;
    }
}