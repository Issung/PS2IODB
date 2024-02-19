import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import './Home.scss';
import { GameList } from "../model/GameList";
import Counter from "../components/Counter";
import SearchBar from "../components/SearchBar";
import SearchResults from "../components/SearchResults";
import SearchLink from "../components/SearchLink";

const Home: React.FC = () => {
    const { type: paramType, index: paramIndex } = useParams();
    const [keywords, setKeywords] = useState<string[]>([]);
    const [searchEntry, setSearchEntry] = useState<string | string[] | undefined>();

    const [contributed] = useState(GameList.filter(g => g.code).length);
    const [progress, setProgress] = useState(0);

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
                    <SearchLink className="col" to="/search/_" value="alphabetical" currentValue={paramType} tooltip="Explore titles by alphabetical sections">Alphabetical</SearchLink>
                    <SearchLink className="col" to="/search/_" value="category" currentValue={paramType} tooltip="Explore titles by categories">Category</SearchLink>
                    <SearchLink className="col" to="/search/_" value="text" currentValue={paramType} tooltip="Explore titles with free text search">Text&nbsp;Search</SearchLink>
                </div>
                <hr />
                {paramType === "alphabetical" && (
                    <div className="row justify-content-center">
                        {['#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => 
                            <SearchLink
                                className="col-1"
                                to="/search/alphabetical/_"
                                value={char === '#' ? 'misc' : char}
                                currentValue={paramIndex}
                                tooltip={char === 'misc' 
                                ? "Titles starting with numeric or miscellaneous characters"
                                : `Titles starting with '${char}'`}
                            >
                                {char}
                            </SearchLink>
                        )]}
                    </div>
                )}
                {(paramType ?? "category") === "category" && (
                    <div className="row justify-content-center">
                        <SearchLink className="col" to="/search/category/_" value="all" currentValue={paramIndex} tooltip="List all titles">All</SearchLink>
                        <SearchLink className="col" to="/search/category/_" value="icons" currentValue={paramIndex} tooltip="Titles that have icons uploaded">Uploaded</SearchLink>
                        <SearchLink className="col" to="/search/category/_" value="1icons" currentValue={paramIndex} tooltip="Titles with 1 icon">1 Icon</SearchLink>
                        <SearchLink className="col" to="/search/category/_" value="2icons" currentValue={paramIndex} tooltip="Titles with 2 icons">2 Icons</SearchLink>
                        <SearchLink className="col" to="/search/category/_" value="3icons" currentValue={paramIndex} tooltip="Titles with 3 icons">3 Icons</SearchLink>
                        <SearchLink className="col" to="/search/category/_" value="noicons" currentValue={paramIndex} tooltip="Titles that haven't yet been uploaded">Missing</SearchLink>
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
