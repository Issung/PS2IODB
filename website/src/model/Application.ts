import { Contributor } from "./Contributor";
import { Icon } from "./Icon";
import { Title } from "./Title";

export class Application extends Title {
    constructor(name: string);
    constructor(name: string, iconFactory?: (game: Title) => Icon[]);
    constructor(name: string, code?: string, variantCount?: number, contributor?: Contributor);
    constructor(
        name: string,
        codeOrIconFactory?: string | ((game: Title) => Icon[]),
        variantCount?: number,
        contributor?: Contributor
    ) {
        if (codeOrIconFactory)
        {
            if (typeof codeOrIconFactory == 'string')
            {
                super(name, codeOrIconFactory, variantCount, contributor);
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
