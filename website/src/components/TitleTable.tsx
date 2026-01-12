import { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../model/Icon';
import { Title as TitleModel } from "../model/Title";
import Title from './Title';
import './TitleTable.scss';

type TitleTableProps = {
    titles: TitleModel[];
    iconsFilter?: (icon: Icon) => boolean;
}

const TitleTable = ({ titles, iconsFilter }: TitleTableProps) => {
    const navigate = useNavigate();

    const handleClick = (e: MouseEvent<HTMLElement>) => {
        const anchor = (e.target as HTMLElement).closest('a');
        if (anchor && anchor.href) {
            const url = new URL(anchor.href);
            // Only handle internal navigation
            if (url.origin === window.location.origin) {
                e.preventDefault();
                navigate(url.pathname);
            }
        }
    };

    return (
        <div id="TitleTable" onClick={handleClick}>
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