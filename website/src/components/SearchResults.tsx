import { Link } from 'react-router-dom';
import { Application } from '../model/Application';
import { Contributor } from '../model/Contributor';
import { Contributors } from '../model/Contributors';
import { Game } from '../model/Game';
import { Icon } from '../model/Icon';
import SearchKeywordChunker from '../model/SearchKeywordChunker';
import { Title } from '../model/Title';
import { Titles } from '../model/Titles';
import { Category, CategoryDefault } from './FilterSelectCategory';
import { FilterType, FilterTypeDefault } from './FilterTypeSelect';
import TitleTable from './TitleTable';

const SearchResults = ({ filterType, filter }: SearchResultsProps) => {
    const contributor = Contributors.GetContributorByName(filter);
    const { titleFilter, iconFilter } = getFilterFuncs(filterType, filter, contributor);

    const titles: Title[] = Titles.filter(titleFilter);

    const contributorNamePosessive = contributor?.name.endsWith('s') ? `${filter}'` : `${filter}'s`;
    const contributorLinkDomain = contributor?.link ? new URL(contributor.link).host : '';

    const icons = titles.flatMap(t => iconFilter ? t.icons.filter(iconFilter) : t.icons);
    const uniqueStatesTotal = icons.reduce((sum, icon) => sum + (icon.uniqueStates ?? 0), 0);

    return (
    <>
        <span>
            <h3 style={{ textAlign: 'left' }}>
                {filterType == FilterType.contributor && contributor
                    ? <>
                        {`${titles.length} titles with icons contributed by ${contributor.name}`}
                        {contributor.link ? <h5>View {contributorNamePosessive} profile on <Link to={contributor.link} target="_blank">{contributorLinkDomain}</Link></h5> : <></>}
                    </>
                    : (titles.length === 0 ? 'No Results.' : `${titles.length} Titles`)
                }
            </h3>
            <h6 style={{fontWeight: 300}}>{titles.length === 0 ? '' : `${icons.length} icons, ${uniqueStatesTotal} unique states`}</h6>
        </span>
        <TitleTable titles={titles} iconsFilter={iconFilter} />
    </>)
}

export default SearchResults;

const additionalCharacterIncludes: Record<string, string[]> = {
    "A": ["A", "Æ"], // Include title "Æon Flux" under "A" listings.
    "H": ["H", "."], // Include all ".hack*" titles under "H" listings.
    "Q": ["Q", "¡"], // Include title "¡Qué pasa Neng! El videojuego" under "Q" listings.
    "S": ["S", "_"], // Include title "_Summer" under "S" listings.
    "O": ["O", "Ō"], // Include titles "Ōkami" & "Ōokuki" under "O" listings.
}

type SearchResultsProps = {
    filterType: FilterType | undefined;
    filter: string | undefined;
}

type TitleFilter = (title: Title) => boolean;
type IconFilter = (icon: Icon) => boolean;

type FilterFuncs = {
    titleFilter: TitleFilter;
    iconFilter?: IconFilter;
};

function unique<T>(value: T, index: number, array: Array<T>) {
    return array.indexOf(value) === index;
}

const getAlphabetFilters = (filter: string | undefined): FilterFuncs => {
    if (!filter || filter === 'misc') {
        // All things that come before the first title starting with 'A'.
        const miscEndIndex = Titles.findIndex(g => g.name.startsWith('A'));
        const miscTitles = new Set(Titles.slice(0, miscEndIndex));
        return { titleFilter: (t) => miscTitles.has(t) };
    }
    else {
        const characters = additionalCharacterIncludes[filter ?? ''] ?? [filter];
        return { titleFilter: (t) => characters.some(c => t.name.startsWith(c)) };
    }
};

const getCategoryFilters = (filter: string | undefined): FilterFuncs => {
    const index = !filter || filter.trim() === '' ? CategoryDefault : filter;

    if (index === Category.all) {
        return { titleFilter: () => true };
    }
    else if (index === Category.missing) {
        return { titleFilter: (t) => !t.icons.some(i => i.code) };
    }
    else if (index === Category.uploaded) {
        const iconFilter: IconFilter = (i) => !!i.code;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
    else if (index === Category.multipleIcons) {
        return { titleFilter: (t) => t.icons.length > 1 };
    }
    else if (index === Category.games) {
        return { titleFilter: (t) => t instanceof Game };
    }
    else if (index === Category.applications) {
        return { titleFilter: (t) => t instanceof Application };
    }
    else if (index === Category.animated) {
        const iconFilter: IconFilter = (i) => !!i.animationVersion;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
    else if (index === Category.static) {
        const iconFilter: IconFilter = (i) => !!i.code && !i.animationVersion;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
    else if (index === Category.brokenAnimation) {
                const iconFilter: IconFilter = (i) => i.animationVersion === 1;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
    else { // states1, states2, states3
        const indexStr = index.toString();
        const lastChar = indexStr.charAt(index.length - 1);
        const number = parseInt(lastChar);
        const iconFilter: IconFilter = (i) => i.uniqueStates === number;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
};

const getSearchFilters = (filter: string | undefined): FilterFuncs => {
    const words = SearchKeywordChunker.chunk(filter ?? '');

    if (words.length === 0) {
        return { titleFilter: () => false };
    }
    else if (words.length === 1) {
        if (words[0].length <= 2) {
            return { titleFilter: () => false };
        }
        else {
            return { titleFilter: (t) => t.name.toLowerCase().indexOf(words[0]) >= 0 };
        }
    }
    else {
        // For multi-keyword search, we need to sort by match count, so we pre-compute
        const matchedTitles = new Map<Title, number>();
        for (const title of Titles) {
            const titleKeywords = title.name.toLowerCase().split(' ').filter(unique);
            const matchCount = titleKeywords.filter(kw => words.some(w => w === kw)).length;
            if (matchCount > 0) {
                matchedTitles.set(title, matchCount);
            }
        }
        return { titleFilter: (t) => matchedTitles.has(t) };
    }
};

const getContributorFilters = (contributor: Contributor | undefined): FilterFuncs => {
    if (contributor) {
        const iconFilter: IconFilter = (i) => i.contributor === contributor;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter,
        };
    }
    else {
        return { titleFilter: () => false };
    }
};

const getFilterFuncs = (filterType: FilterType | undefined, filter: string | undefined, contributor: Contributor | undefined): FilterFuncs => {
    const type = filterType ?? FilterTypeDefault;

    if (type === FilterType.alphabetical) {
        return getAlphabetFilters(filter);
    }
    else if (type === FilterType.category) {
        return getCategoryFilters(filter);
    }
    else if (type === FilterType.search) {
        return getSearchFilters(filter);
    }
    else if (type === FilterType.contributor) {
        return getContributorFilters(contributor);
    }
    else {
        throw new Error(`Unknown filter type: '${type}'.`);
    }
};