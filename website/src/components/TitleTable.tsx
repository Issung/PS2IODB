import React from 'react';
import { Icon } from '../model/Icon';
import { Title } from '../model/Title';
import IconRow from './IconRow';
import RowBase, { Trait } from './RowBase';
import TitleRow from './TitleRow';
import './TitleTable.scss';

type TitleTableProps = {
    titles: Title[];
    iconsFilter?: (icon: Icon) => boolean;
}

const TitleTable = ({ titles, iconsFilter }: TitleTableProps) => {
    console.log("TitleTable", titles);
    return (
        <div id="TitleTable">
            <ol style={{paddingLeft: 0}}>
                {titles.map(title => {
                    if (title.icons.length > 1)
                    {
                        const icons = iconsFilter ? title.icons.filter(iconsFilter) : title.icons;

                        return <React.Fragment key={title.index}>
                            <RowBase 
                                title={title.name}
                                contributed={title.icons.some(i => i.code)}
                                circle={Trait.MultiIcon}
                                tooltip="This title has multiple icons"
                            />
                            <div className="icons-grid" style={{gridTemplateRows: `repeat(${icons.length}, auto)`}}>
                                <div className="line" style={{gridRow: `1 / span ${icons.length}`}}>
                                </div>
                                {icons.map(icon => <IconRow icon={icon} key={icon.index}/>)}
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