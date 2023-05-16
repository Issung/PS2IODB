import React, { useEffect } from 'react';
import { useState } from 'react';
import { Game, GameList } from './Games';
import GameTable from './GameTable';

type SearchResultsProps = {
    keywords: string[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ keywords: searchKeywords }: SearchResultsProps) =>
{
    useEffect(filterGames, [searchKeywords])  // Run function whenever keywords prop changes.
    const [games, setGames] = useState(Array<Game>);

    function filterGames()
    {
        if (searchKeywords[0] == '') // Return whole list.
        {
            setGames([]);
        }
        else if (searchKeywords.length == 1) // 1 keyword, match just on a 'contains'.
        {
            if (searchKeywords[0].length <= 2)
            {
                setGames([]);
            }
            else
            {
                let results = GameList.filter(g => g.name.toLowerCase().indexOf(searchKeywords[0]) >= 0).slice(0, 10);
                setGames(results);
            }
        }
        else // Match on keywords of game titles vs entered keywords.
        {
            let results = GameList
                .map(game => {
                    var gameKeywords = game.name.toLowerCase().split(' ').filter(unique);   // Unique filter on end (don't match on same word twice).
                    var matches = gameKeywords.map((gkw, i) => searchKeywords.some(skw => skw == gkw) ? i : null).filter(i => i != null);
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
    }

    function unique<T>(value: T, index: number, array: Array<T>) {
        return array.indexOf(value) === index;
    }

    return (
        <GameTable games={games} />
    );
}

export default SearchResults;