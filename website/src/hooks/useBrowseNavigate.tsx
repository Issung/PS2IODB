import React, { createContext, useContext } from "react";
import { FilterType } from "../components/FilterTypeSelect";
import { useNavigate, useSearchParams } from "react-router-dom";

// Define the function signature
type BrowseNavigateFunction = (filterType: FilterType, filter?: string | undefined) => void;
export enum BrowseNavigateStrategy { Path, SearchParams };

// Create the context with a default dummy implementation
const BrowseNavigateContext = createContext<BrowseNavigateFunction>(() => {
    throw new Error("useBrowseNavigate must be used within a <BrowseNavigateProvider>");
});

export const BrowseNavigateProvider: React.FC<{
    children: React.ReactNode;
    strategy: BrowseNavigateStrategy;
}> = ({ children, strategy }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const func: BrowseNavigateFunction = (filterType, filter) => {
        if (strategy == BrowseNavigateStrategy.Path) {
            navigate(`/browse/${filterType}/${filter ?? ''}`);
        }
        else if (strategy == BrowseNavigateStrategy.SearchParams) {
            if (!filter) {
                searchParams.delete('filter');
            }
            else {
                searchParams.set('filter', filter);
            }

            searchParams.set('filterType', filterType);

            setSearchParams(searchParams);
        }
        else {
            throw new Error('Unkown BrowseNavigationStrategy.');
        }
    };

    return (
        <BrowseNavigateContext.Provider value={func}>
            {children}
        </BrowseNavigateContext.Provider>
    );
};

// The hook to be used in components
export const useBrowseNavigate = (): BrowseNavigateFunction => {
    return useContext(BrowseNavigateContext);
};
