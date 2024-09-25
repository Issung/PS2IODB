import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';

export const AlphabeticalFilterDefault = 'misc';

interface IAlphabeticalFilterSelectProps {
    filter: string | undefined;
};

const items = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .map(char => new SelectItem(
        char === '#' ? 'misc' : char,
        char,
        /* tooltip: */ char === '#' ? 'Titles starting with numeric or miscellaneous characters' : `Titles starting with '${char}'`
    ));

export const FilterSelectAlphabetical = ({filter}: IAlphabeticalFilterSelectProps) => {
    const navigate = useNavigate();

    return <Select
        items={items}
        defaultKey={AlphabeticalFilterDefault}
        selectedKey={filter}
        onChange={newFilter => navigate(`/browse/alphabetical/${newFilter}`)}
        col="col-md-12 col-lg-8 col-xxl-9"
    />
};

