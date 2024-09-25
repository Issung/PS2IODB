import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconLabel, IconSearch, IconSortAZ } from '@tabler/icons-react';

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
    new SelectItem(FilterType.alphabetical, 'Alphabetical', <IconSortAZ style={{height: 30}}/>),
    new SelectItem(FilterType.category, 'Category', <IconLabel/>),
    new SelectItem(FilterType.search, 'Search', <IconSearch/>),
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

