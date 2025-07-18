import './Home.scss';
import { Category, FilterSelectCategory } from '../components/FilterSelectCategory';
import { ContributorCount } from '../model/Contributors';
import { FilterSelectAlphabetical } from '../components/FilterSelectAlphabetical';
import { ContributorList } from '../components/ContributorList';
import { FilterTypeSelect, FilterType } from '../components/FilterTypeSelect';
import { ContributedIcons, Icons, Titles, TotalUniqueVariants } from '../model/Titles';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Counter from "../components/Counter";
import DebouncedTextBox from '../components/DebouncedTextBox';
import Footer from "../components/Footer";
import SearchResults from "../components/TitleSearch";
import { IconCaretLeft } from '@tabler/icons-react';
import { SessionStorageKeys } from '../utils/Consts';

const exampleSearches = [
    "Final Fantasy",
    "Grand Theft Auto",
    "Ratchet & Clank",
    "Silent Hill",
    "SingStar"
];

const Home = () => {
    const navigate = useNavigate();
    const { filterType, filter } = useParams();

    const titlesWithContributions = useMemo(() => Titles.filter(t => t.icons.some(i => i.code)).length, []);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        sessionStorage.setItem(SessionStorageKeys.HasViewedHomePage, "true");
    }, []);

    useEffect(() => {
        if (filterType == FilterType.search) {
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
        }
    }, [filterType]);

    useEffect(() => {
        setProgress(Icons.filter(i => i.code).length / Icons.length);
    }, [progress]);

    return (
        <>
            <title>PS2IODB</title>
            <div id="Home">
                <div className="container-fluid" style={{ height: "fit-content", maxHeight: 800 }}>
                    <div className="row justify-content-center">
                        <div className="col-8 col-md-6 col-lg-5 col-xl-4">
                            <img id="logo-full" src="/images/logo-full-min.svg" width="100%" alt="PS2IODB Full Logo"/>
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
                            <b>{titlesWithContributions}</b> of <b>{Titles.length}</b> titles have contributions (<b>{ContributedIcons.length}</b> out of <b>{Icons.length}</b> known icons).<br/>
                            You are free to view all <b>{TotalUniqueVariants}</b> unique icon states, uploaded by <b>{ContributorCount}</b> different contributors!<br/>
                            To get to 100% we need support from <i>you</i>! <Link to="/contribute">Learn how.</Link>
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
                    {filterType == FilterType.contributor && !filter && <ContributorList />}
                    {filterType === 'search' && (
                        <div className="row">
                            <div className="col col-md-6 col-lg-4">
                                <DebouncedTextBox
                                    placeholder={`Search (e.g. "${exampleSearches[Math.floor(Math.random() * exampleSearches.length)]}")`}
                                    style={{marginBottom: 15}}
                                    value={filter}
                                    debouncedOnChange={newValue => navigate(`/browse/search/${encodeURIComponent(newValue)}`)}
                                />
                            </div>
                        </div>
                    )}
                    {filterType == FilterType.contributor && filter && <Link id="back-to-contributors" to="/browse/contributor"><IconCaretLeft/><p>Contributors</p></Link>}
                    {(filterType != FilterType.contributor || filter) && <SearchResults filterType={filterType as FilterType} filter={filter} />}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Home;
