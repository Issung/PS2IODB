import { useEffect, useState } from "react";
import './Home.scss';
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { Link, useParams } from "react-router-dom";
import { Game } from './Game';
import { GameList } from "./GameList";
import GameTable from "./GameTable";
import Counter from "./Counter";

const Home: React.FC = () => {
    const { type: paramType, index: paramIndex } = useParams();
    const [games, setGames] = useState<Game[]>([]);
    const [keywords, setKeywords] = useState(Array<string>);

    const [contributed] = useState(GameList.filter(g => g.code).length);
    const [progress, setProgress] = useState(0);
    const highlightColor: string = '#ffffff1f';

    useEffect(() => {
        setProgress(GameList.filter(g => g.code).length / GameList.length);
    }, [progress]);

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

        if (type === "alphabetical")
        {
            let index = (paramIndex === undefined || paramIndex < 'A' || paramIndex > 'Z') ? "misc" : paramIndex;

            document.querySelectorAll('a[href^="/search/alphabetical"] > h3').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
            let letterLink = document.querySelector(`a[href="/search/alphabetical/${index}"] > h3`) as HTMLHeadingElement;
            letterLink.style.backgroundColor = highlightColor;

            if (index === 'misc')
            {
                // All things that come before the first game that starts with 'A'.
                let firstA = GameList.findIndex(g => g.name.startsWith('A'));
                setGames(GameList.slice(0, firstA));
            }
            else
            {
                let characters = additionalCharacterIncludes[index] ?? [index];
                let results = GameList.filter(g => {
                    for (const char of characters)
                    {
                        if (g.name.startsWith(char))
                        {
                            return true;
                        }
                    }
                    return false;
                });
                setGames(results);
            }
        }
        else if (type === "category")
        {
            let index = paramIndex ?? "icons";

            document.querySelectorAll('a[href^="/search/category"] > h3').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
            var categoryLink = document.querySelector(`a[href="/search/category/${index}"] > h3`) as HTMLHeadingElement;
            categoryLink.style.backgroundColor = highlightColor;

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
        }
    }, [paramType, paramIndex])

    return (
        <div id="Home">
            <div className="container-fluid" style={{ height: "fit-content", maxHeight: 800 }}>
                <div className="row justify-content-center">
                    <div className="col-8 col-md-6 col-lg-5 col-xl-4">
                        <img id="logo-full" src="/images/logo-full.svg" width="100%" alt="PS2IODB Full Logo"/>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <div className="col-10 col-md-7 col-xl-5 col-xxl-4">
                        <p className="p-3" style={{ textAlign: 'center' }}>
                            Welcome to the PS2 Icons Open Database (PS2IODB), a crowdsourced collection of PlayStation 2 save game icons.
                        </p>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <div className="col-5 col-md-3 col-xxl-2 px-1 py-1">
                        <Link className="btn btn-primary" to="/faq">FAQ</Link>
                    </div>
                    <div className="col-5 col-md-3 col-xxl-2 px-1 py-1">
                        <Link className="btn btn-primary" to="/contribute">
                            <span className="d-none d-sm-inline">How to Contribute</span>
                            <span className="d-inline d-sm-none">Contribute</span>  {/* Shorten text at XS size. */}
                        </Link>
                    </div>
                    <div className="col-10 col-md-3 col-xxl-2 px-1 py-1">
                        <div className="btn-group">
                            <Link type="button" className="btn btn-secondary" to="https://github.com/Issung/PS2IODB">
                                <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub logo"/>
                            </Link>
                            <Link type="button" className="btn btn-secondary" to="https://twitter.com/IssunGee">
                                <img src="https://www.svgrepo.com/show/513008/twitter-154.svg" alt="Twitter logo"/>
                            </Link>
                            <Link type="button" className="btn btn-secondary" to="https://discord.gg/SWsuNvWnKw">
                                <img src="https://www.svgrepo.com/show/506463/discord.svg" alt="Discord logo"/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container" id="progress-container" style={{ minHeight: 300 }}>
                <div className="row justify-content-center">
                    <div className="col">
                        <h1>Progress</h1>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <div id="progress" className="col-10 col-sm-12">
                        <div id="fill" style={{ width: `${progress * 100}%` }}>
                            <Counter value={progress}/>
                        </div>
                    </div>
                </div>
                <div className="row justify-content-center">
                    <p id="progress-paragraph">
                        {contributed} out of {GameList.length} ({Math.trunc(progress*100*100)/100}%) titles have been archived so far.<br /> {/* Math trunc magic, need a toFixed that doesn't round. https://stackoverflow.com/a/48100007/8306962 */}
                        To get to 100% we need support from <i>you</i>! Learn how <Link to="/contribute">here</Link>. {/* TODO Fix link hover visuals */}
                    </p>
                </div>
            </div>
            <hr />
            <div className="container" style={{ minHeight: 700 }}>
                <div className="row justify-content-center">
                    <div className="col">
                        <h1>Browse</h1>
                    </div>
                </div>
                {/* TODO: Turn this entire alphabetial/category select into a component. */}
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
                            <h2 style={{ textAlign: 'center' }}>Text&nbsp;Search</h2>
                        </Link>
                    </div>
                </div>
                <hr />
                {paramType === "alphabetical" && (
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
                {(paramType ?? "category") === "category" && (
                    <div className="row justify-content-center">
                        <div className="col">
                            <Link to="/search/category/all" style={{ textDecoration: 'none' }} title="List all titles">
                                <h3 style={{ textAlign: 'center' }}>All</h3>
                            </Link>
                        </div>
                        <div className="col">
                            <Link to="/search/category/icons" style={{ textDecoration: 'none' }} title="Titles that have icons uploaded">
                                <h3 style={{ textAlign: 'center' }}>Uploaded</h3>
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
                        <GameTable games={games} />
                    </div>
                )}
                {paramType === "text" && (
                    <div className="row">
                        <div className="col-4">
                            <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)} />
                            <br />
                            <br />
                            <SearchResults keywords={keywords} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
