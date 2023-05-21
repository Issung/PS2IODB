import './App.scss';
import './Games';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Icon from './Icon';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/icon/:iconcode" element={<Icon/>}/>
                <Route path="/search/:type/:index" element={<Home/>}/>
                <Route path="/search/:type" element={<Home/>}/>
                <Route path="*" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
            </Routes>
        </Router>
    );
}

export default App;
