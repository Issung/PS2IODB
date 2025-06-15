import { IconCaretLeft } from "@tabler/icons-react"
import { Link, useNavigate } from "react-router-dom"
import { ContributorList } from "./ContributorList"
import DebouncedTextBox from "./DebouncedTextBox"
import { FilterSelectAlphabetical } from "./FilterSelectAlphabetical"
import { Category, FilterSelectCategory } from "./FilterSelectCategory"
import { FilterType, FilterTypeSelect } from "./FilterTypeSelect"
import TitleSearch from "./TitleSearch"

const exampleSearches = [
    "Final Fantasy",
    "Grand Theft Auto",
    "Ratchet & Clank",
    "Silent Hill",
    "SingStar"
];

const FilterableTitleList = ({filterType, filter}: { filterType: FilterType, filter: string | undefined }) => {
    const navigate = useNavigate();

    return <>
        <FilterTypeSelect filterType={filterType}/>
        <hr />
        {filterType === "alphabetical" && <FilterSelectAlphabetical filter={filter}/> }
        {(filterType ?? "category") === "category" && <FilterSelectCategory category={filter as Category}/> }
        {filterType == FilterType.Contributor && !filter && <ContributorList />}
        {filterType === 'search' && (
            <div className="row">
                <div className="col col-md-6 col-lg-4">
                    <DebouncedTextBox
                        placeholder={`Search (e.g. "${exampleSearches[Math.floor(Math.random() * exampleSearches.length)]}")`}
                        style={{marginBottom: 15}}
                        value={filter}
                        debouncedOnChange={newValue => navigate(`/browse/search/${encodeURIComponent(newValue)}`)}
                    />
                </div>
            </div>
        )}
        {filterType == FilterType.Contributor && filter && <Link id="back-to-contributors" to="/browse/contributor"><IconCaretLeft/><p>Contributors</p></Link>}
        {(filterType != FilterType.Contributor || filter) && <TitleSearch filterType={filterType as FilterType} filter={filter} />}
    </>
}

export default FilterableTitleList;