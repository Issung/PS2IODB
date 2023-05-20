import { useEffect, useImperativeHandle, useState } from "react";
import './Home.scss';
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { Link, useParams } from "react-router-dom";
import { Game, GameList } from "./Games";
import GameTable from "./GameTable";

const Home: React.FC = () => {
    const { category } = useParams();
    const [games, setGames] = useState<Game[]>([]);
    const [keywords, setKeywords] = useState(Array<string>);

    useEffect(() => {
        if (category != null) {
            document.querySelectorAll('a[href^="/directory"] > h3').forEach(a => (a as HTMLHeadingElement).style.backgroundColor = '');
            var link = document.querySelector(`a[href="/directory/${category}"] > h3`) as HTMLHeadingElement;
            link.style.backgroundColor = '#ffffff1f';

            if (category != null) {
                if (category == 'misc') {
                    // All things that come before the first game that starts with 'A'.
                    let firstA = GameList.findIndex(g => g.name.startsWith('A'));
                    setGames(GameList.slice(0, firstA));
                }
                else if (category == 'all') {
                    setGames(GameList);
                }
                else if (category.endsWith('icons')) {
                    if (category == 'noicons') {
                        let gamesInCategory = GameList.filter(g => g.code == null);
                        setGames(gamesInCategory);
                    }
                    else if (category == 'icons') {
                        let gamesInCategory = GameList.filter(g => g.code != null);
                        setGames(gamesInCategory);
                    }
                    else {
                        let number = parseInt(category[0]);
                        let gamesInCategory = GameList.filter(g => g.icons == number);
                        setGames(gamesInCategory);
                    }
                }
                else {
                    let gamesInCategory = GameList.filter(g => g.name.startsWith(category));
                    setGames(gamesInCategory);
                }
            }
        }
    }, [category])

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
                        <Link to="" style={{ textDecoration: 'none' }} title="Explore titles by alphabetical sections">
                            <h2 style={{ textAlign: 'center' }}>Alphabetical</h2>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="" style={{ textDecoration: 'none' }} title="Explore titles by categories">
                            <h2 style={{ textAlign: 'center' }}>Category</h2>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="" style={{ textDecoration: 'none' }} title="Explore titles with free text search">
                            <h2 style={{ textAlign: 'center' }}>Text Search</h2>
                        </Link>
                    </div>
                </div>
                <hr />
                <div className="row justify-content-center">
                    {['#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => (
                        <div className="col-1" style={{ textAlign: 'center' }}>
                            <Link to={`/directory/${c == '#' ? 'misc' : c}`} style={{ textDecoration: 'none' }}>
                                <h3>{c}</h3>
                            </Link>
                        </div>
                    ))]}
                </div>
                <hr />
                <div className="row justify-content-center">
                    <div className="col">
                        <Link to="/directory/all" style={{ textDecoration: 'none' }} title="Has icons uploaded">
                            <h3 style={{ textAlign: 'center' }}>All</h3>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/directory/icons" style={{ textDecoration: 'none' }} title="Has icons uploaded">
                            <h3 style={{ textAlign: 'center' }}>Has Icons</h3>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/directory/1icons" style={{ textDecoration: 'none' }} title="Titles with 1 icon">
                            <h3 style={{ textAlign: 'center' }}>1 Icon</h3>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/directory/2icons" style={{ textDecoration: 'none' }} title="Titles with 2 icons">
                            <h3 style={{ textAlign: 'center' }}>2 Icons</h3>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/directory/3icons" style={{ textDecoration: 'none' }} title="Titles with 3 icons">
                            <h3 style={{ textAlign: 'center' }}>3 Icons</h3>
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/directory/noicons" style={{ textDecoration: 'none' }} title="Titles that haven't yet been uploaded">
                            <h3 style={{ textAlign: 'center' }}>Unknown</h3>
                        </Link>
                    </div>
                </div>
                <hr />
                {games.length == 0 ? <h4 style={{ textAlign: 'left' }}>No Results.</h4> : <h4 style={{ textAlign: 'left' }}>{games.length} Results:</h4>}
                <GameTable games={games} />

                {/* TODO: Turn this free text search into a component. */}
                {/* <div className="row justify-content-center">
                    <div className="col-4">
                        <h2>Search</h2>
                        <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)}/>
                        <SearchResults keywords={keywords} />
                    </div>
                </div>  */}
            </div>
        </div>
    );
};

export default Home;