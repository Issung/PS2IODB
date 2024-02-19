import React, { useState, useEffect, useCallback } from 'react';
import GameTable from './GameTable';
import { Game } from '../model/Game';
import { GameList } from '../model/GameList';

type SearchResultsProps = {
    /**
     * Either 'alphabetical', 'category' or 'text'.
     */
    searchType: string | undefined;
    searchEntry: string | string[] | undefined;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchType, searchEntry }: SearchResultsProps) =>
{
    const [games, setGames] = useState(Array<Game>);

    const filterByAlphabet = useCallback(() => 
    {
        // Define inside useEffect so it's not seen as a dependency.
        const additionalCharacterIncludes: Record<string, string[]> = {
            "A": ["A", "Æ"], // Include title "Æon Flux" under "A" listings.
            "H": ["H", "."], // Include all ".hack*" titles under "H" listings.
            "Q": ["Q", "¡"], // Include title "¡Qué pasa Neng! El videojuego" under "Q" listings.
            "S": ["S", "_"], // Include title "_Summer" under "S" listings.
            "O": ["O", "Ō"], // Include titles "Ōkami" & "Ōokuki" under "O" listings.
        }

        if (searchEntry === 'misc' || searchEntry === undefined)
        {
            // All things that come before the first game that starts with 'A'.
            let firstA = GameList.findIndex(g => g.name.startsWith('A'));
            setGames(GameList.slice(0, firstA));
        }
        else if (typeof searchEntry === 'string')
        {
            let characters = additionalCharacterIncludes[searchEntry] ?? [searchEntry];
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
    }, [searchEntry]);

    const filterByCategory = useCallback(() => 
    {
        let index = typeof searchEntry == 'string' ? searchEntry : "icons";

        if (index === 'all')
        {
            setGames(GameList);
        }
        else if (index.endsWith('icons'))
        {
            if (index === 'noicons')
            {
                let gamesInCategory = GameList.filter(g => g.code == null);
                setGames(gamesInCategory);
            }
            else if (index === 'icons')
            {
                let gamesInCategory = GameList.filter(g => g.code != null);
                setGames(gamesInCategory);
            }
            else
            {
                let number = parseInt(index[0]);
                let gamesInCategory = GameList.filter(g => g.icons === number);
                setGames(gamesInCategory);
            }
        }
    }, [searchEntry]);

    const filterByTextEntryKeywords = useCallback(() =>
    {
        if (!Array.isArray(searchEntry))
            return;

        if (searchEntry[0] === '') // Return whole list.
        {
            setGames([]);
        }
        else if (searchEntry.length === 1) // 1 keyword, match just on a 'contains'.
        {
            if (searchEntry[0].length <= 2)
            {
                setGames([]);
            }
            else
            {
                let results = GameList.filter(g => g.name.toLowerCase().indexOf(searchEntry[0]) >= 0).slice(0, 10);
                setGames(results);
            }
        }
        else if (Array.isArray(searchEntry)) // Match on keywords of game titles vs entered keywords.
        {
            let results = GameList
                .map(game => {
                    var gameKeywords = game.name.toLowerCase().split(' ').filter(unique);   // Unique filter on end (don't match on same word twice).
                    var matches = gameKeywords.map((gkw, i) => searchEntry.some(skw => skw === gkw) ? i : null).filter(i => i != null);
                    var ret = matches.length > 0 ? { game, matches } : null;
                    if (ret)
                    {
                        console.log(`Game '${game.name}' got ${matches.length} keyword matches.`);
                    }
                    return ret;
                })
                .filter(result => result != null)
                .sort((r1, r2) => r2!.matches.length - r1!.matches.length);
            
            setGames(results.slice(0, 10).map(r => r!.game));
        }

        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games: ${games.map(sr => sr.name).join(', ')}`);
        //console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games.`);
    }, [searchEntry]);

    useEffect(() => {
        if  (searchType === 'alphabetical') {
            filterByAlphabet();
        }
        else if (searchType === 'text') {
            filterByTextEntryKeywords();
        }
        // Fallthrough
        else /*if (searchType === 'category') */  {
            filterByCategory();
        }
    }, [searchEntry, searchType, filterByAlphabet, filterByCategory, filterByTextEntryKeywords]);

    function unique<T>(value: T, index: number, array: Array<T>) {
        return array.indexOf(value) === index;
    }

    return (
        <GameTable games={games} />
    );
}

export default SearchResults;