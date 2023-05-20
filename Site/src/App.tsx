import './App.scss';
import './Games';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Icon from './Icon';
//import './ModelView';    // This breaks the search bar, it can no longer be focused on or have text entered.

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/icon/:iconcode" element={<Icon/>}/>
                <Route path="/directory/:category" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
                <Route path="*" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
            </Routes>
        </Router>
    );
}

export default App;
