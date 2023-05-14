import React, { useRef, useState } from 'react';
import logo from './logo.svg';
import './App.scss';
import SearchBar from './SearchBar';
import GameTable from './GameTable';
import './Games';
import { Game, GameList } from './Games';
import { keyboard } from '@testing-library/user-event/dist/keyboard';
import SearchResults from './SearchResults';
//import './ModelView';    // This breaks the search bar, it can no longer be focused on or have text entered.

function App() {
    const [keywords, setKeywords] = useState(Array<string>);

    return (
        <div className="App">
            <header className="App-header">
                <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)}/>
                <SearchResults keywords={keywords} />
            </header> 
        </div>
    );
}

export default App;
