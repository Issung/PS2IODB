import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';
import { IconCircle1, IconCircle2, IconCircle3, IconCircles, IconCirclesFilled, IconHelpOctagon, IconQuestionMark } from '@tabler/icons-react';

export enum Category {
    all = "all",
    uploaded = "uploaded",
    icons1 = "icons1",
    icons2 = "icons2",
    icons3 = "icons3",
    missing = "missing",
};

export const CategoryDefault = Category.uploaded;

interface ICategorySelectProps {
    category: Category | undefined;
};

const categories = [
    new SelectItem(Category.all, 'All', 'List all titles', <IconCircles/>),
    new SelectItem(Category.uploaded, 'Uploaded', 'Titles with icons uploaded', <IconCirclesFilled/>),
    new SelectItem(Category.icons1, '1 Icon', 'Titles with 1 icon', <IconCircle1/>),
    new SelectItem(Category.icons2, '2 Icons', 'Titles with 2 icons', <IconCircle2/>),
    new SelectItem(Category.icons3, '3 Icons', 'Titles with 3 icons', <IconCircle3/>),
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

