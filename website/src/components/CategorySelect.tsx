import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';

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
    new SelectItem(Category.all, 'All', '📃'),
    new SelectItem(Category.uploaded, 'Uploaded', '📁'),
    new SelectItem(Category.icons1, '1 Icon', '1️⃣'),
    new SelectItem(Category.icons2, '2 Icons', '2️⃣'),
    new SelectItem(Category.icons3, '3 Icons', '3️⃣'),
    new SelectItem(Category.missing, 'Missing', '🫥'),
];

export const CategorySelect = ({category}: ICategorySelectProps) => {
    const navigate = useNavigate();

    return <Select
        selectedKey={category}
        items={categories}
        defaultKey={CategoryDefault}
        onChange={newCategory => navigate(`/browse/category/${newCategory}`)}
    />
};

