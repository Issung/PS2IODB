import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconSearch, IconSortAZ, IconTag, IconUsers } from '@tabler/icons-react';
import { useBrowseNavigate } from '../hooks/useBrowseNavigate';

export enum FilterType {
    Alphabetical = "alphabetical",
    Category = "category",
    Search = "search",
    Contributor = "contributor",
};

export const FilterTypeDefault = FilterType.Category;

interface IFilterTypeSelectProps {
    filterType: FilterType | undefined;
};

const filterTypes = [
    new SelectItem(FilterType.Alphabetical, 'Alphabetical', 'Browse titles alphabetically', <IconSortAZ style={{height: 30}}/>),
    new SelectItem(FilterType.Category, 'Category', 'Browse titles by categories', <IconTag/>),
    new SelectItem(FilterType.Contributor, 'Contributor', 'Browse contributed titles by contributor', <IconUsers/>),
    new SelectItem(FilterType.Search, 'Search', 'Browse titles with text search', <IconSearch/>),
];

export const FilterTypeSelect = ({filterType}: IFilterTypeSelectProps) => {
    const navigate = useBrowseNavigate();

    return <Select
        groupName='filtertype'
        items={filterTypes}
        defaultKey={FilterTypeDefault}
        selectedKey={filterType}
        onChange={newFilterType => navigate(newFilterType as FilterType)}
    />
};

