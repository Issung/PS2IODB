import React, { createContext, useContext, useCallback } from "react";
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

    const func: BrowseNavigateFunction = useCallback((filterType, filter) => {
        if (strategy == BrowseNavigateStrategy.Path) {
            navigate(`/browse/${filterType}/${filter ?? ''}`);
        }
        else if (strategy == BrowseNavigateStrategy.SearchParams) {
            const params = new URLSearchParams(searchParams.toString());
            if (!filter) {
                params.delete('filter');
            } else {
                params.set('filter', filter);
            }
            params.set('filterType', filterType);
            setSearchParams(params);
        }
        else {
            throw new Error('Unknown BrowseNavigationStrategy.');
        }
    }, [navigate, setSearchParams, searchParams, strategy]);

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
