import './App.scss';
import '../model/GameList';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Icon from './Icon';
import Faq from './Faq';
import Contribute from './Contribute';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/faq" element={<Faq/>}/>
                <Route path="/contribute" element={<Contribute/>}/>
                <Route path="/icon/:iconcode" element={<Icon/>}/>
                <Route path="/search/:type/:index" element={<Home/>}/>
                <Route path="/search/:type" element={<Home/>}/>
                <Route path="*" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
