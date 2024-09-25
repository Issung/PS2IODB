import './Home.scss';
import { IconList } from "../model/GameList";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Counter from "../components/Counter";
import Footer from "../components/Footer";
import SearchLink from "../components/SearchLink";
import SearchResults from "../components/SearchResults";
import { FilterTypeSelect, FilterType } from '../components/FilterTypeSelect';
import { Category, FilterSelectCategory } from '../components/FilterSelectCategory';
import { FilterSelectAlphabetical } from '../components/FilterSelectAlphabetical';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { filterType, filter } = useParams();

    const contributed = useMemo(() => IconList.filter(i => i.code).length, []);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(IconList.filter(i => i.code).length / IconList.length);
    }, [progress]);

    return (
        <>
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
                                Welcome to the PlayStation2™ Icons Open Database (PS2IODB), a crowdsourced collection of PlayStation 2 save game icons.
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
                            {contributed} out of {IconList.length} ({Math.trunc(progress*100*100)/100}%) titles have been archived so far.<br /> {/* Math trunc magic, need a toFixed that doesn't round. https://stackoverflow.com/a/48100007/8306962 */}
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
                    <FilterTypeSelect filterType={filterType as FilterType}/>
                    <hr />
                    {filterType === "alphabetical" && <FilterSelectAlphabetical filter={filter}/> }
                    {(filterType ?? "category") === "category" && <FilterSelectCategory category={filter as Category}/> }
                    {filterType === 'search' && (
                        <div className="row">
                            <div className="col col-md-6 col-lg-4">
                                <input 
                                    type="text"
                                    placeholder="Game Title Search"
                                    value={filterType == FilterType.search ? filter : ''}
                                    /* TODO: Debouncing */
                                    onChange={entry => navigate(`/browse/search/${encodeURIComponent(entry.target.value)}`)}
                                    style={{width: "100%", height: 40, paddingLeft: '7px'}}
                                />
                                <br />
                                <br />
                            </div>
                        </div>
                    )}
                    <SearchResults filterType={filterType as FilterType} filter={filter} />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Home;
