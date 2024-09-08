import { Contributor } from "./Contributor";
import { Icon } from "./Icon";

export class Game {
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
    constructor(name: string, iconFactory?: (game: Game) => Icon[]);
    constructor(name: string, code?: string, variantCount?: number, contributor?: Contributor);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Game) => Icon[]),
        variantCount?: number,
        contributor?: Contributor
    )
    {
        this.name = name;
        this.icons = [];
        
        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                this.icons = [new Icon(this, name, codeOrIconFactory, variantCount, contributor)];
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