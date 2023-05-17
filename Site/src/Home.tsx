import { useState } from "react";
import './Home.scss';
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
    const [keywords, setKeywords] = useState(Array<string>);
    
    return(
        <div id="Home">
            <div className="container-fluid" style={{height: "100vh", maxHeight: 800}}>
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
            <div className="container" style={{minHeight: 700}}>
                <div className="row justify-content-center">
                    <div className="col-4">
                        <h2>Search</h2>
                        <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)}/>
                        <SearchResults keywords={keywords} />
                    </div>
                </div> 
            </div>
        </div>
    );
};

export default Home;