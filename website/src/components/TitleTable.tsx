import './TitleTable.scss'
import { Title } from '../model/Title';
import TitleRow from './TitleRow';
import IconRow from './IconRow';
import React from 'react';
import RowBase, { Trait } from './RowBase';

type TitleTableProps = {
    games: Title[];
}

const TitleTable = ({ games }: TitleTableProps) => {
    console.log("GameTable", games);
    return (
        <div id="GameTable">
            <ol style={{paddingLeft: 0}}>
                {games.map(title => {
                    if (title.icons.length > 1)
                    {
                        return <React.Fragment key={title.index}>
                            <RowBase 
                                title={title.name}
                                contributed={title.icons.some(i => i.code)}
                                circle={Trait.MultiIcon}
                                tooltip="This title has multiple icons"
                            />
                            <div className="icons-grid" style={{gridTemplateRows: `repeat(${title.icons.length}, auto)`}}>
                                <div className="line" style={{gridRow: `1 / span ${title.icons.length}`}}>
                                </div>
                                {title.icons.map(icon => <IconRow icon={icon} key={icon.index}/>)}
                            </div>
                        </React.Fragment>
                    }
                    else
                    {
                        return <TitleRow game={title} key={title.index}/>
                    }
                })}
            </ol>
        </div>
    );
}

export default TitleTable;