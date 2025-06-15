import React from 'react';
import { useBrowseNavigate } from '../hooks/useBrowseNavigate';
import { FilterType } from './FilterTypeSelect';

interface BrowseLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    filterType: FilterType;
    filter?: string;
    children: React.ReactNode;
}

const BrowseLink: React.FC<BrowseLinkProps> = ({ filterType, filter, children, ...rest }) => {
    const navigate = useBrowseNavigate();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        navigate(filterType, filter);
    };

    return (
        <a href="#" onClick={handleClick} {...rest}>
            {children}
        </a>
    );
};

export default BrowseLink;
