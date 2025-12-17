import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconCircleNumber1, IconCircleNumber2, IconCircleNumber3, IconCircles, IconCirclesFilled, IconHelpOctagon } from '@tabler/icons-react';

export enum Category {
    all = "all",
    uploaded = "uploaded",
    states1 = "states1",
    states2 = "states2",
    states3 = "states3",
    missing = "missing",
};

export const CategoryDefault = Category.uploaded;

interface ICategorySelectProps {
    category: Category | undefined;
};

const categories = [
    new SelectItem(Category.all, 'All', 'List all titles', <IconCircles/>),
    new SelectItem(Category.uploaded, 'Uploaded', 'Titles with icons uploaded', <IconCirclesFilled/>),
    new SelectItem(Category.states1, '1 State', 'Icons with 1 unique state', <IconCircleNumber1/>),
    new SelectItem(Category.states2, '2 States', 'Icons with 2 unique states', <IconCircleNumber2/>),
    new SelectItem(Category.states3, '3 States', 'Icons with 3 unique states', <IconCircleNumber3/>),
    new SelectItem(Category.missing, 'Missing', 'Titles that haven\'t yet been uploaded', <IconHelpOctagon/>),
];

export const FilterSelectCategory = ({category}: ICategorySelectProps) => {
    const navigate = useNavigate();

    return <Select
        groupName='categoryfilter'
        selectedKey={category}
        items={categories}
        defaultKey={CategoryDefault}
        onChange={newCategory => navigate(`/browse/category/${newCategory}`)}
    />
};

