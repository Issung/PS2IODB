import React, { useRef } from 'react';
import logo from './logo.svg';
import './App.scss';
import SearchBar from './SearchBar';
import GameTable from './GameTable';
import './Games';
import { GameEntry, GameList } from './Games';
import { keyboard } from '@testing-library/user-event/dist/keyboard';
import './ModelView';    // This breaks the search bar, it can no longer be focused on or have text entered.

function App() {
    const tableRef = useRef<GameTable>(null);
    let searchResults: GameEntry[] = GameList.slice();

    const entryChanged = (event: React.ChangeEvent<HTMLInputElement> & { keywords: string[]; }): void => {
        console.log(`entry: ${event.target.value}, keywords: ${event.keywords.join(', ')}`);

        if (event.keywords[0] == '') {
            tableRef.current!.setGames(GameList.slice());
            return;
        }
        else if (event.keywords.length == 1) {
            searchResults.length = 0;
            GameList.forEach(game => {
                if (game.name.toLowerCase().indexOf(event.keywords[0]) != -1) {
                    searchResults = searchResults.concat(game);
                }
            })
        }
        else {
            searchResults.length = 0;
            GameList.forEach(game => {
                var gameWords = game.name.split(' ');
                if (gameWords.some(gw => event.keywords.some(kw => gw.toLowerCase() == kw))) {
                    searchResults = searchResults.concat(game);
                }
            })
        }

        console.log(`Matched ${searchResults.length} games: ${searchResults.map(sr => sr.name).join(', ')}`);
        tableRef.current!.setGames(searchResults);
    }

    return (
        <div className="App">
            <header className="App-header">
                {/* <img src={logo} className="App-logo" alt="logo" /> */}
                <h2>Search</h2>
                <SearchBar onChange={entryChanged} />
                <GameTable ref={tableRef} games={searchResults}/>
            </header>
        </div>
    );
}

export default App;
