import { Icon } from '../model/Icon';
import { Title as TitleModel } from "../model/Title";
import Title from './Title';
import './TitleTable.scss';

type TitleTableProps = {
    titles: TitleModel[];
    iconsFilter?: (icon: Icon) => boolean;
}

const TitleTable = ({ titles, iconsFilter }: TitleTableProps) => {
    console.log("TitleTable", titles);
    return (
        <div id="TitleTable">
            <ol style={{paddingLeft: 0}}>
                {titles.map(title => 
                    <Title
                        key={title.index}
                        title={title}
                        iconsFilter={iconsFilter}
                    />
                )}
            </ol>
        </div>
    );
}

export default TitleTable;