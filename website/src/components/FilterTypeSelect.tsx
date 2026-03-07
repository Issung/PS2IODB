import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconDice5, IconSearch, IconSortAZ, IconTag, IconUsers } from '@tabler/icons-react';
import { navigateToRandomIcon } from '../utils/RandomIcon';

export enum FilterType {
    alphabetical = "alphabetical",
    category = "category",
    search = "search",
    contributor = "contributor",
    random = "random",
};

export const FilterTypeDefault = FilterType.category;

interface IFilterTypeSelectProps {
    filterType: FilterType | undefined;
};

const filterTypes = [
    new SelectItem(FilterType.alphabetical, 'Alphabetical', 'Browse titles alphabetically', <IconSortAZ style={{height: 30}}/>),
    new SelectItem(FilterType.category, 'Category', 'Browse titles by categories', <IconTag/>),
    new SelectItem(FilterType.contributor, 'Contributor', 'Browse contributed titles by contributor', <IconUsers/>),
    new SelectItem(FilterType.search, 'Search', 'Browse titles with text search', <IconSearch/>),
    new SelectItem(FilterType.random, 'Random', 'View a random contributed icon', <IconDice5/>),
];

export const FilterTypeSelect = ({filterType}: IFilterTypeSelectProps) => {
    const navigate = useNavigate();

    return <Select
        groupName='filtertype'
        items={filterTypes}
        defaultKey={FilterTypeDefault}
        selectedKey={filterType}
        onChange={newFilterType => {
            if (newFilterType === FilterType.random) {
                navigateToRandomIcon(navigate);
            } else {
                navigate(`/browse/${newFilterType}`);
            }
        }}
    />
};

