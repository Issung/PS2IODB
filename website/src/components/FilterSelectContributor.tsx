import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { Contributors } from '../model/Contributors';
import { IconList } from '../model/GameList';
import { Contributor } from '../model/Contributor';

export const AlphabeticalFilterDefault = 'misc';

interface FilterSelectContributorProps {
    contributor: string | undefined;
};

class Temp {
    constructor(
        public contributor: Contributor,
        public gameCount: number
    ) { }
}

const items = Object
    .values(Contributors)
    .map(contributor => {
        let gameCount = IconList.filter(i => i.contributor == contributor).length;
        return new Temp(contributor, gameCount);
    })
    .sort((c1, c2) => c2.gameCount - c1.gameCount)
    .map(p => new SelectItem(
            p.contributor.name,
            `${p.contributor.name} [${p.gameCount}]`,
            `Titles contributed by ${p.contributor.name}`,
        )
    );

export const FilterSelectContributor = ({contributor}: FilterSelectContributorProps) => {
    const navigate = useNavigate();

    return <Select
        groupName='contributorfilter'
        items={items}
        defaultKey={AlphabeticalFilterDefault}
        selectedKey={contributor}
        onChange={newFilter => navigate(`/browse/contributor/${newFilter}`)}
        col="col-md-12 col-lg-8 col-xxl-9"
    />
};

