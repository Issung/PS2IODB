import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconSearch, IconSortAZ, IconTag } from '@tabler/icons-react';

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
    new SelectItem(FilterType.alphabetical, 'Alphabetical', 'Browse titles alphabetically', <IconSortAZ style={{height: 30}}/>),
    new SelectItem(FilterType.category, 'Category', 'Browse titles by categories', <IconTag/>),
    new SelectItem(FilterType.search, 'Search', 'Browse titles with text search', <IconSearch/>),
];

export const FilterTypeSelect = ({filterType}: IFilterTypeSelectProps) => {
    const navigate = useNavigate();

    return <Select
        groupName='filtertype'
        items={filterTypes}
        defaultKey={FilterTypeDefault}
        selectedKey={filterType}
        onChange={newFilterType => navigate(`/browse/${newFilterType}`)}
    />
};

