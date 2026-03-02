import { AnimationVersion } from "./AnimationVersion";
import { Contributor } from "./Contributor";
import { Icon } from "./Icon";
import { Title } from "./Title";
import { UniqueStatesCount } from "./UniqueStatesCount";

export class Game extends Title {
    constructor(name: string);
    constructor(name: string, iconFactory?: (game: Title) => Icon[] | null);
    constructor(name: string, code?: string, uniqueStatesCount?: number, contributor?: Contributor | Contributor[], animation?: AnimationVersion);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Title) => Icon[] | null),
        uniqueStatesCount?: UniqueStatesCount,
        contributor?: Contributor | Contributor[],
        animation?: AnimationVersion
    ) {
        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                super(name, codeOrIconFactory, uniqueStatesCount, contributor, animation);
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
