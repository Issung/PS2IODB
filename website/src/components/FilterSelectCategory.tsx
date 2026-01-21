import { IconBox, IconCircleNumber1, IconCircleNumber2, IconCircleNumber3, IconCirclePlus, IconCircles, IconCirclesFilled, IconDeviceGamepad2, IconFileBroken, IconHelpOctagon, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectItem } from './Select';

export enum Category {
    all = "all",
    uploaded = "uploaded",
    multipleIcons = "multipleIcons",
    states1 = "states1",
    states2 = "states2",
    states3 = "states3",
    missing = "missing",
    games = "games",
    applications = "applications",
    animated = "animated",
    static = "static",
    brokenAnimation = "brokenAnimation",
};

export const CategoryDefault = Category.all;

interface ICategorySelectProps {
    category: Category | undefined;
};

const categories = [
    new SelectItem(Category.all, 'All', 'List all titles', <IconCircles/>),
    new SelectItem(Category.uploaded, 'Uploaded', 'Titles with icons uploaded', <IconCirclesFilled/>),
    new SelectItem(Category.multipleIcons, 'Multiple Icons', 'Titles with multiple icons', <IconCirclePlus/>),
    new SelectItem(Category.states1, '1 State', 'Icons with 1 unique state', <IconCircleNumber1/>),
    new SelectItem(Category.states2, '2 States', 'Icons with 2 unique states', <IconCircleNumber2/>),
    new SelectItem(Category.states3, '3 States', 'Icons with 3 unique states', <IconCircleNumber3/>),
    new SelectItem(Category.missing, 'Missing', 'Titles that haven\'t yet been uploaded', <IconHelpOctagon/>),
    new SelectItem(Category.games, 'Games', 'Game titles', <IconDeviceGamepad2/>),
    new SelectItem(Category.applications, 'Applications', 'Applications', <IconBox/>),
    new SelectItem(Category.animated, 'Animated', 'Icons with animation', <IconPlayerPlay/>),
    new SelectItem(Category.static, 'Static', 'Icons with no animation', <IconPlayerPause/>),
    new SelectItem(Category.brokenAnimation, 'Broken Animation', 'Icons needing recontribution due to outdated animation data', <IconFileBroken/>),
];

export const FilterSelectCategory = ({category}: ICategorySelectProps) => {
    const navigate = useNavigate();

    return <Select
        groupName='categoryfilter'
        selectedKey={category}
        items={categories}
        defaultKey={CategoryDefault}
        onChange={newCategory => navigate(`/browse/category/${newCategory}`)}
        // Limit width to make buttons layout a bit more natural.
        maxWidth={936}
    />
};

