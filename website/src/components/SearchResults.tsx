import React, { useState, useEffect, useCallback } from 'react';
import GameTable from './GameTable';
import { Game } from '../model/Game';
import { GameList } from '../model/GameList';
import SearchKeywordChunker from '../model/SearchKeywordChunker';
import { FilterType, FilterTypeDefault } from './FilterTypeSelect';
import { Category } from './FilterSelectCategory';

type SearchResultsProps = {
    filterType: FilterType | undefined;
    filter: string | undefined;
}

const SearchResults: React.FC<SearchResultsProps> = ({ filterType, filter }: SearchResultsProps) =>
{
    const [games, setGames] = useState(Array<Game>);

    const filterByAlphabet = useCallback(() =>
    {
        /** Define inside useEffect so it's not seen as a dependency. */
        const additionalCharacterIncludes: Record<string, string[]> = {
            "A": ["A", "Æ"], // Include title "Æon Flux" under "A" listings.
            "H": ["H", "."], // Include all ".hack*" titles under "H" listings.
            "Q": ["Q", "¡"], // Include title "¡Qué pasa Neng! El videojuego" under "Q" listings.
            "S": ["S", "_"], // Include title "_Summer" under "S" listings.
            "O": ["O", "Ō"], // Include titles "Ōkami" & "Ōokuki" under "O" listings.
        }

        if (!filter || filter === 'misc')
        {
            // All things that come before the first game that starts with 'A'.
            let firstA = GameList.findIndex(g => g.name.startsWith('A'));
            setGames(GameList.slice(0, firstA));
        }
        else
        {
            let characters = additionalCharacterIncludes[filter ?? ''] ?? [filter];
            let results = GameList.filter(g => {
                for (const char of characters) {
                    if (g.name.startsWith(char)) {
                        return true;
                    }
                }
                return false;
            });
            setGames(results);
        }
    }, [filter]);

    const filterByCategory = useCallback(() => 
    {
        let index = !filter || filter.trim() === '' ? Category.uploaded : filter;

        if (index === Category.all)
        {
            setGames(GameList);
        }
        else if (index === Category.missing)
        {
            let gamesInCategory = GameList.filter(g => !g.icons.some(i => i.code));
            setGames(gamesInCategory);
        }
        else if (index === Category.uploaded)
        {
            let gamesInCategory = GameList.filter(g => g.icons.some(i => i.code));
            setGames(gamesInCategory);
        }
        else //if (index > Category.icons1 && index < Category.icons3)
        {
            let indexStr = index.toString();
            let lastChar = indexStr.charAt(index.length - 1);
            let number = parseInt(lastChar);
            let gamesInCategory = GameList.filter(g => g.icons.some(i => i.variantCount === number));
            setGames(gamesInCategory);
        }
    }, [filter]);

    const filterByTextEntryKeywords = useCallback(() =>
    {
        let words = SearchKeywordChunker.chunk(filter ?? '');

        if (words.length == 0) // No entry, display no games.
        {
            setGames([]);
        }
        else if (words.length === 1) // 1 keyword, match just on a 'contains'.
        {
            if (words[0].length <= 2) // Require atleast 2 chars entry.
            {
                setGames([]);
            }
            else
            {
                let results = GameList.filter(g => g.name.toLowerCase().indexOf(words[0]) >= 0).slice(0, 10);
                setGames(results);
            }
        }
        else // Match on keywords of game titles vs entered keywords.
        {
            let results = GameList
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
            
            setGames(results.slice(0, 10).map(r => r!.game));
        }

        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games: ${games.map(sr => sr.name).join(', ')}`);
        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games.`);
    }, [filter]);

    useEffect(() => {
        let type = filterType ?? FilterTypeDefault;
        console.log(`Finding games for input: ${type}, ${filter}`);

        if  (type === FilterType.alphabetical) {
            filterByAlphabet();
        }
        else if (type === FilterType.category) {
            filterByCategory();
        }
        else if (type === FilterType.search) {
            filterByTextEntryKeywords();
        }
        //else if (type === FilterType.contributors) {
        //  // ??
        //}
    }, [filter, filterType, filterByAlphabet, filterByCategory, filterByTextEntryKeywords]);

    function unique<T>(value: T, index: number, array: Array<T>) {
        return array.indexOf(value) === index;
    }

    return (
        <GameTable games={games} />
    );
}

export default SearchResults;