import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '../model/Titles';
import './App.scss';
import Contribute from './Contribute';
import Faq from './Faq';
import Home from './Home';
import IconPage from './IconPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/faq" element={<Faq/>}/>
                <Route path="/contribute" element={<Contribute/>}/>
                <Route path="/icon/:iconcode" element={<IconPage/>}/>
                <Route path="/browse/:filterType/:filter" element={<Home/>}/>
                <Route path="/browse/:filterType" element={<Home/>}/>
                <Route path="*" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
