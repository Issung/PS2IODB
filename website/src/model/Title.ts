import { Contributor } from "./Contributor";
import { Icon } from "./Icon";

/**
 * `undefined` = no animation (whether or not animation files are present).
 * 
 * `1` = Atleast one of the icon states has an animation & the icon is using V1 animation data.
 * 
 * `2` = Atleast one of the icon states has an animation & the icon is using V2 animation data.
 **/
export type AnimationValue = undefined | 1 | 2;

export class Title {
    /**
     * The name/title of the game in the closest thing to English.
     */
    public name: string;

    public icons: Icon[];

    /**
     * The index of this game in the overall GameList.
     * Set from GameList.tsx, after the collection's initialisation.
     * Used as key in the DOM.
     */
    public index: string = '';

    constructor(name: string);
    constructor(name: string, iconFactory?: (game: Title) => Icon[]);
    constructor(name: string, code?: string, variantCount?: number, contributor?: Contributor, animation?: AnimationValue);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Title) => Icon[]),
        variantCount?: number,
        contributor?: Contributor,
        animation?: AnimationValue
    )
    {
        this.name = name;
        this.icons = [];
        
        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                this.icons = [new Icon(this, name, codeOrIconFactory, variantCount, contributor, animation)];
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