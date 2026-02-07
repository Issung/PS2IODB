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
    const { titleFilter, iconFilter, sortedTitles } = getFilterFuncs(filterType, filter, contributor);

    // Use pre-sorted titles for search, otherwise filter normally
    const titles: Title[] = sortedTitles ?? Titles.filter(titleFilter);

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
    /** Pre-sorted titles for search results (bypasses normal filtering) */
    sortedTitles?: Title[];
};

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
        const iconFilter: IconFilter = i => !i.code;
        return {
            titleFilter: (t) => t.icons.some(iconFilter),
            iconFilter
        };
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
    else if (index === Category.correctAnimation) {
        const iconFilter: IconFilter = (i) => i.animationVersion === 2;
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

/**
 * Compute a relevance score for a title based on search terms.
 * Higher scores indicate better matches.
 */
const computeSearchScore = (titleName: string, searchTermGroups: string[][], rawSearchTerms: string[]): number => {
    const titleLower = titleName.toLowerCase();
    const titleWords = titleLower.split(/[\s:,\-–—.!?''""()\[\]{}\/\\]+/).filter(w => w.length > 0);

    let score = 0;
    let matchedGroupCount = 0;

    for (let groupIndex = 0; groupIndex < searchTermGroups.length; groupIndex++) {
        const termGroup = searchTermGroups[groupIndex];
        const rawTerm = rawSearchTerms[groupIndex];
        let groupMatched = false;
        let bestTermScore = 0;

        for (const term of termGroup) {
            if (term.length === 0) continue;

            let termScore = 0;

            // Check for exact full title match (highest priority)
            if (titleLower === term) {
                termScore = Math.max(termScore, 1000);
            }

            // Check for exact word match within title
            const exactWordMatch = titleWords.some(w => w === term);
            if (exactWordMatch) {
                termScore = Math.max(termScore, 100);

                // Bonus: word appears at the start of the title
                if (titleLower.startsWith(term)) {
                    termScore += 50;
                }
                // Bonus: first word of multi-word title
                else if (titleWords[0] === term) {
                    termScore += 30;
                }
            }

            // Check for prefix match (word starts with term)
            const prefixMatch = titleWords.some(w => w.startsWith(term) && w !== term);
            if (prefixMatch) {
                termScore = Math.max(termScore, 60);

                // Bonus: prefix at start of title
                if (titleLower.startsWith(term)) {
                    termScore += 25;
                }
            }

            // Check for contains match (term appears anywhere in title)
            if (termScore === 0 && titleLower.includes(term)) {
                termScore = 20;

                // Slight bonus for longer substring matches
                termScore += Math.min(term.length, 10);
            }

            // Bonus for matching the original search term (not a simile variant)
            if (termScore > 0 && term === rawTerm) {
                termScore += 5;
            }

            bestTermScore = Math.max(bestTermScore, termScore);
            if (termScore > 0) {
                groupMatched = true;
            }
        }

        score += bestTermScore;
        if (groupMatched) {
            matchedGroupCount++;
        }
    }

    // Bonus for matching multiple search terms
    if (searchTermGroups.length > 1 && matchedGroupCount > 1) {
        // Significant bonus for matching all terms
        if (matchedGroupCount === searchTermGroups.length) {
            score += 200;
        }
        // Smaller bonus for partial multi-term matches
        else {
            score += matchedGroupCount * 30;
        }
    }

    // Small penalty for very long titles (prefer concise matches)
    if (titleName.length > 50) {
        score -= Math.min(10, Math.floor((titleName.length - 50) / 10));
    }

    return score;
};

/**
 * Check if a title matches any of the search term groups.
 */
const titleMatchesSearch = (titleName: string, searchTermGroups: string[][]): boolean => {
    const titleLower = titleName.toLowerCase();

    // A title matches if at least one term from any group matches
    return searchTermGroups.some(termGroup =>
        termGroup.some(term => term.length > 0 && titleLower.includes(term))
    );
};

const getSearchFilters = (filter: string | undefined): FilterFuncs => {
    const searchInput = (filter ?? '').trim();

    if (searchInput.length === 0) {
        return { titleFilter: () => false };
    }

    // Split input into individual search terms
    const rawTerms = searchInput
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 0);

    if (rawTerms.length === 0) {
        return { titleFilter: () => false };
    }

    // For very short single-character searches, require at least 2 chars unless it's a number/numeral
    const singleCharSearch = rawTerms.length === 1 && rawTerms[0].length === 1;
    const isNumericOrRoman = /^[0-9ivx]+$/i.test(rawTerms[0]);
    if (singleCharSearch && !isNumericOrRoman) {
        return { titleFilter: () => false };
    }

    // Build search term groups (each raw term expands to itself + similes)
    const searchTermGroups: string[][] = rawTerms.map(term => {
        const simileGroup = SearchKeywordChunker.similes.find(list => list.includes(term));
        return simileGroup ? [...simileGroup] : [term];
    });

    // Pre-compute scores for all matching titles
    const titleScores = new Map<Title, number>();

    for (const title of Titles) {
        if (titleMatchesSearch(title.name, searchTermGroups)) {
            const score = computeSearchScore(title.name, searchTermGroups, rawTerms);
            if (score > 0) {
                titleScores.set(title, score);
            }
        }
    }

    // Sort titles by score (descending)
    const sortedTitles = Array.from(titleScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    // Return sorted titles directly - bypasses normal filtering to preserve order
    return {
        titleFilter: () => false, // Not used when sortedTitles is provided
        sortedTitles
    };
};

const getContributorFilters = (contributor: Contributor | undefined): FilterFuncs => {
    if (contributor) {
        const iconFilter: IconFilter = (i) => i.contributors.includes(contributor);
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