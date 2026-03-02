import { AnimationVersion } from "./AnimationVersion";
import { Contributor } from "./Contributor";
import { Icon } from "./Icon";
import { UniqueStatesCount } from "./UniqueStatesCount";

export class Title {
    /**
     * The name/title of the game in the closest thing to English.
     */
    public name: string;

    /**
     * `Icon[]` = The icons for this title.
     *
     * `null` = This title has been verified to have no icons. Set to null by using the `iconFactory` lambda.
     */
    public icons: Icon[] | null;

    /**
     * The index of this game in the overall GameList.
     * Set from GameList.tsx, after the collection's initialisation.
     * Used as key in the DOM.
     */
    public index: string = '';

    constructor(name: string);
    constructor(name: string, iconFactory?: (game: Title) => Icon[] | null);
    constructor(name: string, code?: string, uniqueStatesCount?: number, contributor?: Contributor | Contributor[], animation?: AnimationVersion);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Title) => Icon[] | null),
        uniqueStatesCount?: UniqueStatesCount,
        contributor?: Contributor | Contributor[],
        animation?: AnimationVersion
    )
    {
        this.name = name;
        this.icons = [];

        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                this.icons = [new Icon(this, name, codeOrIconFactory, uniqueStatesCount, contributor, animation)];
            }
            else if (codeOrIconFactory instanceof Function)
            {
                this.icons = codeOrIconFactory(this);
            }
            else
            {
                throw new Error('Unknown type for codeOrIcons in Game constructor.');
            }
        }
        else
        {
            this.icons = [new Icon(this, name)];
        }
    }
}
