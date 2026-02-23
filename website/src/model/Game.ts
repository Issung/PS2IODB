import { Contributor } from "./Contributor";
import { Icon } from "./Icon";
import { AnimationVersion, Title } from "./Title";

export class Game extends Title {
    constructor(name: string);
    constructor(name: string, iconFactory?: (game: Title) => Icon[] | null);
    constructor(name: string, code?: string, variantCount?: number, contributor?: Contributor | Contributor[], animation?: AnimationVersion);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Title) => Icon[] | null),
        variantCount?: number,
        contributor?: Contributor | Contributor[],
        animation?: AnimationVersion
    ) {
        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                super(name, codeOrIconFactory, variantCount, contributor, animation);
            }
            else if (codeOrIconFactory instanceof Function)
            {
                super(name, codeOrIconFactory);
            }
            else
            {
                throw new Error('Unknown type for codeOrIcons in Game constructor.');
            }
        }
        else
        {
            super(name);
        }
    }
}
