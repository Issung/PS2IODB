import React, { useEffect } from 'react';
import { useState } from 'react';
import { Game, GameList } from './Games';
import GameTable from './GameTable';

type SearchResultsProps = {
    keywords: string[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ keywords }: SearchResultsProps) =>
{
    useEffect(filterGames, [keywords])  // Run function whenever keywords prop changes.
    const [games, setGames] = useState(Array<Game>);

    function filterGames()
    {
        if (keywords[0] == '') // Return whole list.
        {
            setGames(GameList.slice());
        }
        else if (keywords.length == 1) // 1 keyword, match just on a 'contains'.
        {
            let results = GameList.filter(g => g.name.toLowerCase().indexOf(keywords[0]) >= 0);
            setGames(results);
        }
        else // Match on keywords of game titles vs entered keywords.
        {
            let results = GameList.filter(g => {
                var gameWords = g.name.split(' ');
                return gameWords.some(gameWord => keywords.some(kw => gameWord.toLowerCase() == kw));
            });
            setGames(results);
        }

        console.log(`Keywords [${keywords.join(', ')}] matched ${games.length} games: ${games.map(sr => sr.name).join(', ')}`);
    }

    return (
        <GameTable games={games} />
    );
}

export default SearchResults;