import './ContributorList.scss'
import { Contributor } from '../model/Contributor';
import { Contributors } from '../model/Contributors';
import { Icons } from '../model/Titles';
import { IconTrophyFilled } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Utils } from '../utils/Utils';

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
        let gameCount = Icons.filter(i => i.contributor == contributor).length;
        return new ContributorData(contributor, gameCount);
    })
    .sort((c1, c2) => c2.gameCount - c1.gameCount);

const ContributorListItem = ({position, data} : {position: number, data: ContributorData}) => {
    const posStyle = useMemo(() => position <= 3 ? `pos${position}` : undefined, [position]);   // pos${x} if top 3.

    return (
        <Link
            to={`/browse/contributor/${data.contributor.name}`}
            title={`View ${data.gameCount} titles with icons contributed by ${data.contributor.name}`}
        >
            <div className={`row contributor ${posStyle && 'top3'} ${posStyle}`}>
                <div className="col-2 placement">
                    {position == 1 ? <IconTrophyFilled/> : Utils.ordinalSuffixOf(position)}
                </div>
                <div className="col-8">
                    {data.contributor.name}
                </div>
                <div className="col-2">
                    {data.gameCount}
                </div>
            </div>
        </Link>
    );
}

export const ContributorList = () => {
    return <>
        <div className="row">
            <h1 style={{fontSize: 50, textAlign: 'left'}}>Contributors</h1>
        </div>
        <div id="ContributorList" className="row">
            <div className="col-md-9 col-lg-7 col-xl-5 px-4">
                <div className="row">
                    <ContributorListItem position={1} data={contributorData[0]} />
                    <ContributorListItem position={2} data={contributorData[1]} />
                    <ContributorListItem position={3} data={contributorData[2]} />
                    {contributorData.slice(3).map((d, index) => 
                        <ContributorListItem position={4 + index} data={d}/>
                    )}
                </div>
            </div>
        </div>
    </>
};

