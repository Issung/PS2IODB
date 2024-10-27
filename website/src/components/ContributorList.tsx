import { Link } from 'react-router-dom';
import { Contributors } from '../model/Contributors';
import { IconList } from '../model/GameList';
import { Contributor } from '../model/Contributor';
import './ContributorList.scss'

export const AlphabeticalFilterDefault = 'misc';

class ContributorData {
    constructor(
        public contributor: Contributor,
        public gameCount: number
    ) { }
}

const contributorData = Object
    .values(Contributors)
    .map(contributor => {
        let gameCount = IconList.filter(i => i.contributor == contributor).length;
        return new ContributorData(contributor, gameCount);
    })
    .sort((c1, c2) => c2.gameCount - c1.gameCount);

const ContributorListItem = ({data} : {data: ContributorData}) => {
    return <Link to={`/browse/contributor/${data.contributor.name}`} title={`View ${data.gameCount} titles contributed by ${data.contributor.name}.`}>
        [{data.gameCount}] {data.contributor.name}
    </Link>;
}

export const ContributorList = () => {
    return <div id="ContributorList">
        <h1 style={{fontSize: 50}}>Contributors</h1>
        <h1><ContributorListItem data={contributorData[0]}/></h1>
        <h2><ContributorListItem data={contributorData[1]}/></h2>
        <h3><ContributorListItem data={contributorData[2]}/></h3>
        {contributorData.slice(3).map(c => 
            <h4>
                <ContributorListItem data={c}/>
            </h4>
        )}
    </div>
};

