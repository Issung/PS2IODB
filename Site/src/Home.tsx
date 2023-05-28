import { useEffect, useState } from "react";
import './Home.scss';
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { Link, useParams } from "react-router-dom";
import { Game } from './Game';
import { GameList } from "./GameList";
import GameTable from "./GameTable";

const Home: React.FC = () => {
    const { type: paramType, index: paramIndex } = useParams();
    const [games, setGames] = useState<Game[]>([]);
    const [keywords, setKeywords] = useState(Array<string>);
    const highlightColor: string = '#ffffff1f';

    useEffect(() => {
        // Define inside useEffect so it's not seen as a dependency.
        const additionalCharacterIncludes: Record<string, string[]> = {
            "A": ["A", "Æ"], // Include title "Æon Flux" under "A" listings.
            "H": ["H", "."], // Include all ".hack*" titles under "H" listings.
            "Q": ["Q", "¡"], // Include title "¡Qué pasa Neng! El videojuego" under "Q" listings.
            "S": ["S", "_"], // Include title "_Summer" under "S" listings.
            "O": ["O", "Ō"], // Include titles "Ōkami" & "Ōokuki" under "O" listings.
        }

        let type = paramType ?? "category";
        console.log(`type: ${paramType}, index: ${paramIndex}`);

        document.querySelectorAll('a[href^="/search/"] > h2').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
        let typeLink = document.querySelector(`a[href="/search/${type}"] > h2`) as HTMLHeadingElement;
        typeLink.style.backgroundColor = highlightColor;

        if (type === "alphabetical") {
            let index = (paramIndex === undefined || paramIndex < 'A' || paramIndex > 'Z') ? "misc" : paramIndex;

            document.querySelectorAll('a[href^="/search/alphabetical"] > h3').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
            let letterLink = document.querySelector(`a[href="/search/alphabetical/${index}"] > h3`) as HTMLHeadingElement;
            letterLink.style.backgroundColor = highlightColor;

            if (index === 'misc') {
                // All things that come before the first game that starts with 'A'.
                let firstA = GameList.findIndex(g => g.name.startsWith('A'));
                setGames(GameList.slice(0, firstA));
            }
            else {
                let characters = additionalCharacterIncludes[index] ?? [index];
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
        }
        else if (type === "category") {
            let index = paramIndex ?? "icons";

            document.querySelectorAll('a[href^="/search/category"] > h3').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
            var categoryLink = document.querySelector(`a[href="/search/category/${index}"] > h3`) as HTMLHeadingElement;
            categoryLink.style.backgroundColor = highlightColor;

            if (index === 'all') {
                setGames(GameList);
            }
            else if (index.endsWith('icons')) {
                if (index === 'noicons') {
                    let gamesInCategory = GameList.filter(g => g.code == null);
                    setGames(gamesInCategory);
                }
                else if (index === 'icons') {
                    let gamesInCategory = GameList.filter(g => g.code != null);
                    setGames(gamesInCategory);
                }
                else {
                    let number = parseInt(index[0]);
                    let gamesInCategory = GameList.filter(g => g.icons === number);
                    setGames(gamesInCategory);
                }
            }
        }
    }, [paramType, paramIndex])

    return (
        <div id="Home">
            <div className="container-fluid" style={{ height: "100vh", maxHeight: 800 }}>
                <div className="row">
                    <div className="col">
                        <h1>PS2 Icon Open Database</h1>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <div className="col-8 col-xl-6">
                        <h4>
                            Welcome to the PS2 Icon Open Database (PS2IODB), a crowdsourced collection of
                            PlayStation 2 save game icons
                        </h4>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <Link className="col-6 col-md-2 btn btn-primary" to="test1">GitHub</Link>
                    <Link className="col-6 col-md-2 btn btn-primary" to="test2">How to Contribute</Link>
                    <Link className="col-6 col-md-2 btn btn-primary" to="test3">Donate</Link>
                </div>
            </div>
            {/* TODO: Turn this entire alphabetial/category select into a component. */}
            <div className="container" style={{ minHeight: 700 }}>
                <div className="row justify-content-center">
                    <div className="col">
                        <Link to="/search/alphabetical" style={{ textDecoration: 'none' }} title="Explore titles by alphabetical sections">
                            <h2 style={{ textAlign: 'center' }}>Alphabetical</h2>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/search/category" style={{ textDecoration: 'none' }} title="Explore titles by categories">
                            <h2 style={{ textAlign: 'center' }}>Category</h2>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/search/text" style={{ textDecoration: 'none' }} title="Explore titles with free text search">
                            <h2 style={{ textAlign: 'center' }}>Text Search</h2>
                        </Link>
                    </div>
                </div>
                <hr />
                { paramType === "alphabetical" && (
                    <div className="row justify-content-center">
                        {['#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                            <div className="col-1" style={{ textAlign: 'center' }}>
                                <Link to={`/search/alphabetical/${char === '#' ? 'misc' : char}`} style={{ textDecoration: 'none' }}>
                                    <h3>{char}</h3>
                                </Link>
                            </div>
                        ))]}
                        {games.length === 0 ? <h4 style={{ textAlign: 'left' }}>No Results.</h4> : <h4 style={{ textAlign: 'left' }}>{games.length} Results</h4>}
                        <GameTable games={games} />
                    </div>
                )}
                { (paramType ?? "category") === "category" && (
                    <div className="row justify-content-center">
                        <div className="col">
                            <Link to="/search/category/all" style={{ textDecoration: 'none' }} title="List all titles">
                                <h3 style={{ textAlign: 'center' }}>All</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/icons" style={{ textDecoration: 'none' }} title="Titles that have icons uploaded">
                                <h3 style={{ textAlign: 'center' }}>Has Icons</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/1icons" style={{ textDecoration: 'none' }} title="Titles with 1 icon">
                                <h3 style={{ textAlign: 'center' }}>1 Icon</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/2icons" style={{ textDecoration: 'none' }} title="Titles with 2 icons">
                                <h3 style={{ textAlign: 'center' }}>2 Icons</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/3icons" style={{ textDecoration: 'none' }} title="Titles with 3 icons">
                                <h3 style={{ textAlign: 'center' }}>3 Icons</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/noicons" style={{ textDecoration: 'none' }} title="Titles that haven't yet been uploaded">
                                <h3 style={{ textAlign: 'center' }}>Missing</h3>
                            </Link>
                        </div>
                        {games.length === 0 ? <h4 style={{ textAlign: 'left' }}>No Results.</h4> : <h4 style={{ textAlign: 'left' }}>{games.length} Results</h4>}
                        <GameTable games={games} />
                    </div>
                )}
                { paramType === "text" && (
                    <div className="row">
                        <div className="col-4">
                            <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)}/>
                            <br/>
                            <br/>
                            <SearchResults keywords={keywords} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;