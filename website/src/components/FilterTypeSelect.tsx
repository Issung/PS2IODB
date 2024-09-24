import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';

export enum FilterType {
    alphabetical = "alphabetical",
    category = "category",
    search = "search",
    //contributors = "contributors",
};

export const FilterTypeDefault = FilterType.category;

interface IFilterTypeSelectProps {
    filterType: FilterType | undefined;
};

const filterTypes = [
    new SelectItem(FilterType.alphabetical, 'Alphabetical', '🔠'),
    new SelectItem(FilterType.category, 'Category', '🏷️'),
    new SelectItem(FilterType.search, 'Search', '🔎'),
];

export const FilterTypeSelect = ({filterType}: IFilterTypeSelectProps) => {
    const navigate = useNavigate();

    return <Select
        items={filterTypes}
        defaultKey={FilterTypeDefault}
        selectedKey={filterType}
        onChange={newFilterType => navigate(`/browse/${newFilterType}`)}
    />
};

