import React, { useMemo } from 'react';
import './FilterTypeSelect.scss'
import { useNavigate } from 'react-router-dom';

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

export const FilterTypeSelect = ({filterType}: IFilterTypeSelectProps) => {
    const navigate = useNavigate();
    const getDisplayName = (type: FilterType) => {
        type ??= FilterTypeDefault;

        return type == FilterType.alphabetical ? 'Alphabetical 🔠' :
            type == FilterType.category ? 'Category 🏷️' :
            type == FilterType.search ? 'Search 🔎':
            //type == FilterType.contributors ? 'Contributors 👥':
            (() => { throw new Error(`Unknown FilterType value '${type}'.`)})();
    };

    return (
        <div id="FilterTypeSelect" className="row justify-content-center">
            <div className="col d-flex justify-content-center">
                {Object.values(FilterType).map((type) => (
                    <React.Fragment key={type}>
                        <input
                            type="radio"
                            className="btn-check"
                            name="filter-options"
                            id={type}
                            checked={(filterType ?? FilterTypeDefault) === type}
                            onChange={() => { navigate(`/browse/${type}`); }}
                        />
                        <label className="btn btn-secondary" htmlFor={type}>
                            <p>{getDisplayName(type)}</p>
                        </label>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

