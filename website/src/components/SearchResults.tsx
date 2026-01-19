import React, { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Contributors } from '../model/Contributors';
import SearchKeywordChunker from '../model/SearchKeywordChunker';
import { Title } from '../model/Title';
import { Titles } from '../model/Titles';
import { Category, CategoryDefault } from './FilterSelectCategory';
import { FilterType, FilterTypeDefault } from './FilterTypeSelect';
import TitleTable from './TitleTable';
import { Icon } from '../model/Icon';
import { Game } from '../model/Game';
import { Application } from '../model/Application';

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

const SearchResults: React.FC<SearchResultsProps> = ({ filterType, filter }: SearchResultsProps) => {
    const filterByAlphabet = () => {
        if (!filter || filter === 'misc') {
            // All things that come before the first title starting with 'A'.
            let miscGames = Titles.findIndex(g => g.name.startsWith('A'));
            return Titles.slice(0, miscGames);
        }
        else {
            let characters = additionalCharacterIncludes[filter ?? ''] ?? [filter];
            let results = Titles.filter(g => characters.some(c => g.name.startsWith(c)));

            return results;
        }
    };

    const filterByCategory = () => {
        let index = !filter || filter.trim() === '' ? CategoryDefault : filter;

        if (index === Category.all) {
            return Titles;
        }
        else if (index === Category.missing) {
            const gamesInCategory = Titles.filter(g => !g.icons.some(i => i.code));
            return gamesInCategory;
        }
        else if (index === Category.uploaded) {
            const gamesInCategory = Titles.filter(g => g.icons.some(i => i.code));
            return gamesInCategory;
        }
        else if (index === Category.multipleIcons) {
            const titles = Titles.filter(t => t.icons.length > 1);
            return titles;
        }
        else if (index === Category.games) {
            const titles = Titles.filter(t => t instanceof Game);
            return titles;
        }
        else if (index === Category.applications) {
            const titles = Titles.filter(t => t instanceof Application);
            return titles;
        }
        else { //if (index > Category.states1 && index < Category.states3)
            const indexStr = index.toString();
            const lastChar = indexStr.charAt(index.length - 1);
            const number = parseInt(lastChar);
            const gamesInCategory = Titles.filter(g => g.icons.some(i => i.uniqueStates === number));
            return gamesInCategory;
        }
    };

    const filterByTextEntryKeywords = () => {
        let words = SearchKeywordChunker.chunk(filter ?? '');

        if (words.length == 0) { // No entry, display no games.
            return [];
        }
        else if (words.length === 1) { // 1 keyword, match just on a 'contains'.
            if (words[0].length <= 2) { // Require atleast 2 chars entry. {
                return [];
            }
            else {
                let results = Titles.filter(g => g.name.toLowerCase().indexOf(words[0]) >= 0);
                return results;
            }
        }
        else { // Match on keywords of game titles vs entered keywords.
            let results = Titles
                .map(game => {
                    var gameKeywords = game.name.toLowerCase().split(' ').filter(unique);   // Unique filter on end (don't match on same word twice).
                    var matches = gameKeywords.map((gkw, i) => words.some(skw => skw === gkw) ? i : null).filter(i => i != null);
                    var ret = matches.length > 0 ? { game, matches } : null;
                    //if (ret)
                    //{
                    //    console.log(`Game '${game.name}' got ${matches.length} keyword matches.`);
                    //}
                    return ret;
                })
                .filter(result => result != null)
                .sort((r1, r2) => r2!.matches.length - r1!.matches.length);

            return results.map(r => r!.game);
        }

        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games: ${games.map(sr => sr.name).join(', ')}`);
        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games.`);
    };

    const filterByContributor = () => {
        let contributor = Contributors.GetContributorByName(filter);

        if (contributor) {
            let games = Titles.filter(g => g.icons.some(i => i.contributor == contributor));
            return games;
        }
        else {
            return [];
        }
    };

    //console.log(`Finding games for input: ${type}, ${filter}`);
    
    const getTitlesWithFilter = () => {
        let type = filterType ?? FilterTypeDefault;

        if (type === FilterType.alphabetical) {
            return filterByAlphabet();
        }
        else if (type === FilterType.category) {
            return filterByCategory();
        }
        else if (type === FilterType.search) {
            return filterByTextEntryKeywords();
        }
        else if (type === FilterType.contributor) {
            return filterByContributor();
        }
        else {
            throw new Error(`Unknown filter type: '${type}'.`);
        }
    }

    const titles: Title[] = getTitlesWithFilter();

    function unique<T>(value: T, index: number, array: Array<T>) {
        return array.indexOf(value) === index;
    }

    const contributor = Contributors.GetContributorByName(filter);
    const contributorNamePosessive = contributor?.name.endsWith('s') ? `${filter}'` : `${filter}'s`;
    const contributorLinkDomain = contributor?.link ? new URL(contributor.link).host : '';

    const iconsFilter = filterType == FilterType.category && filter?.startsWith('states') ? ((icon: Icon) => icon.uniqueStates == parseInt(filter[filter.length - 1])) : undefined;
    const icons = titles.flatMap(t => iconsFilter ? t.icons.filter(iconsFilter) : t.icons);
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
        <TitleTable titles={titles} iconsFilter={iconsFilter} />
    </>)
}

export default SearchResults;