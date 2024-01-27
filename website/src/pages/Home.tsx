import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import './Home.scss';
import { GameList } from "../model/GameList";
import Counter from "../components/Counter";
import SearchBar from "../components/SearchBar";
import SearchResults from "../components/SearchResults";

const Home: React.FC = () => {
    const { type: paramType, index: paramIndex } = useParams();
    const [keywords, setKeywords] = useState<string[]>([]);
    const [searchEntry, setSearchEntry] = useState<string | string[] | undefined>();

    const [contributed] = useState(GameList.filter(g => g.code).length);
    const [progress, setProgress] = useState(0);

    // TODO: Move to a scss file and use via a class.
    const highlightColor: string = '#ffffff1f';

    useEffect(() => {
        setProgress(GameList.filter(g => g.code).length / GameList.length);
    }, [progress]);

    useEffect(() => {
        setSearchEntry(paramIndex);
    }, [paramIndex]);

    useEffect(() => {
        setSearchEntry(keywords);
    }, [keywords]);

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
                    <div className="col type" style={{ backgroundColor: paramType === 'alphabetical' ? highlightColor : '' }}>
                        <Link to="/search/alphabetical" style={{ textDecoration: 'none' }} title="Explore titles by alphabetical sections">
                            <h2 style={{ textAlign: 'center' }}>Alphabetical</h2>
                        </Link>
                    </div>
                    <div className="col type" style={{ backgroundColor: paramType === 'category' ? highlightColor : '' }}>
                        <Link to="/search/category" style={{ textDecoration: 'none' }} title="Explore titles by categories">
                            <h2 style={{ textAlign: 'center' }}>Category</h2>
                        </Link>
                    </div>
                    <div className="col type" style={{ backgroundColor: paramType === 'text' ? highlightColor : '' }}>
                        <Link to="/search/text" style={{ textDecoration: 'none' }} title="Explore titles with free text search">
                            <h2 style={{ textAlign: 'center' }}>Text&nbsp;Search</h2>
                        </Link>
                    </div>
                </div>
                <hr />
                {paramType === "alphabetical" && (
                    <div className="row justify-content-center">
                        {['#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                            <div className="index col-1" style={{ textAlign: 'center', backgroundColor: paramIndex === char ? highlightColor : '' }}>
                                <Link to={`/search/alphabetical/${char === '#' ? 'misc' : char}`} style={{ textDecoration: 'none' }}>
                                    <h3>{char}</h3>
                                </Link>
                            </div>
                        ))]}
                    </div>
                )}
                {(paramType ?? "category") === "category" && (
                    <div className="row justify-content-center">
                        <div className="col index" style={{ backgroundColor: paramIndex === 'all' ? highlightColor : ''}}>
                            <Link to="/search/category/all" style={{ textDecoration: 'none' }} title="List all titles">
                                <h3 style={{ textAlign: 'center' }}>All</h3>
                            </Link>
                        </div>
                        <div className="col index" style={{ backgroundColor: paramIndex === 'icons' ? highlightColor : ''}}>
                            <Link to="/search/category/icons" style={{ textDecoration: 'none' }} title="Titles that have icons uploaded">
                                <h3 style={{ textAlign: 'center' }}>Uploaded</h3>
                            </Link>
                        </div>
                        <div className="col index" style={{ backgroundColor: paramIndex === '1icons' ? highlightColor : ''}}>
                            <Link to="/search/category/1icons" style={{ textDecoration: 'none' }} title="Titles with 1 icon">
                                <h3 style={{ textAlign: 'center' }}>1 Icon</h3>
                            </Link>
                        </div>
                        <div className="col index" style={{ backgroundColor: paramIndex === '2icons' ? highlightColor : ''}}>
                            <Link to="/search/category/2icons" style={{ textDecoration: 'none' }} title="Titles with 2 icons">
                                <h3 style={{ textAlign: 'center' }}>2 Icons</h3>
                            </Link>
                        </div>
                        <div className="col index" style={{ backgroundColor: paramIndex === '3icons' ? highlightColor : ''}}>
                            <Link to="/search/category/3icons" style={{ textDecoration: 'none' }} title="Titles with 3 icons">
                                <h3 style={{ textAlign: 'center' }}>3 Icons</h3>
                            </Link>
                        </div>
                        <div className="col index" style={{ backgroundColor: paramIndex === 'noicons' ? highlightColor : ''}}>
                            <Link to="/search/category/noicons" style={{ textDecoration: 'none' }} title="Titles that haven't yet been uploaded">
                                <h3 style={{ textAlign: 'center' }}>Missing</h3>
                            </Link>
                        </div>
                    </div>
                )}
                {paramType === "text" && (
                    <div className="row">
                        <div className="col-4">
                            <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)} />
                            <br />
                            <br />
                        </div>
                    </div>
                )}
                <SearchResults searchType={paramType} searchEntry={searchEntry} />
            </div>
        </div>
    );
};

export default Home;
