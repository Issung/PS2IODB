import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import FilterableTitleList from "../components/FilterableTitleList";
import { FilterType, FilterTypeDefault } from "../components/FilterTypeSelect";
import { BrowseNavigateProvider, BrowseNavigateStrategy } from "../hooks/useBrowseNavigate";
import './Icon.scss';
import IconView from "./IconView";

/**
 * This component serves as a page, routed to by App.tsx.
 */
const IconPage = () => {
    const [searchParams] = useSearchParams();
    const { iconcode } = useParams();

    // Memoize the props
    const filterType = searchParams.get('filterType') as FilterType ?? FilterTypeDefault;
    const filter = searchParams.get('filter') ?? undefined;

    // Avoid recreating the expensive component when it doesn't have any changes.
    const memoizedFilterableTitleList = useMemo(() => (
        <FilterableTitleList filterType={filterType} filter={filter} />
    ), [filterType, filter]);

    console.log('IconPage', {IconPage})
    return (
        <div id="IconPage" className="container-fluid">
            <div className="row">
                <div className="d-none d-xxl-block col-3" style={{backgroundColor: '#171717', padding: 15, maxHeight: '100vh', overflowY: 'scroll'}}>
                    <BrowseNavigateProvider strategy={BrowseNavigateStrategy.SearchParams}>
                        {memoizedFilterableTitleList}
                    </BrowseNavigateProvider>
                </div>
                <div id="icon-view-col" className="col col-xxl-9 p-0 position-relative">
                    <IconView iconcode={iconcode} />
                </div>
            </div>
        </div>
    );
};

export default IconPage;