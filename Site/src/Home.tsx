import { useState } from "react";
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";

const Home: React.FC = () => {
    const [keywords, setKeywords] = useState(Array<string>);
    
    return(
        <div className="App">
            <header className="App-header">
                <SearchBar keywords={keywords} onKeywordsChange={newKeywords => setKeywords(newKeywords)}/>
                <SearchResults keywords={keywords} />
            </header> 
        </div>
    );
};

export default Home;