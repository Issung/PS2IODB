import { AnimationVersion } from "./AnimationVersion";
import { Contributor } from "./Contributor";
import { Title } from "./Title";
import { UniqueStatesCount } from "./UniqueStatesCount";

/**
 * An icon for a game. Most games have just 1 icon, but some
 * like SF3 have a unique icon for each character, or have regional differences.
 */
export class Icon {
    public readonly contributors: Contributor[];

    /**
     * For use as a key in React rendering, a combination of the title's index in the TitleList, and this icon's index within the title.
     * In the format: `${titleIndex}-${iconIndex}`
     * Set from GameList.tsx, after the collection's initialisation.
     */
    public index: string = '';

    /**
     * Constructor.
     * Either populate just `name` to indicate the game is not yet uploaded, or populate all fields to indicate it is.
     * @param title The title/game this icon belongs to.
     * @param name The name/title of the game.
     * @param code The 'code' of the game. A shortened URL-friendly identifier for the game.
     * @param uniqueStatesCount The number of unique states this save icon has (for idle/copy/delete states in the UI). If multiple states are visually identical, count them as one.
     * @param contributor A single contributor or an array of contributors for this icon.
     * @param animationVersion The animation version. null = static animations, 1 = V1 (needs re-contributing), 2 = V2 animation, 3 = V3 animation.
     */
    constructor(
        public readonly title: Title,
        public readonly name: string,
        public readonly code?: string,
        public readonly uniqueStatesCount?: UniqueStatesCount,
        contributor?: Contributor | Contributor[],
        public readonly animationVersion?: AnimationVersion
    ) {
        this.contributors = contributor ? (Array.isArray(contributor) ? contributor : [contributor]) : [];
    }
}