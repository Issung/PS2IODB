import './App.scss';
import '../model/Titles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Icon from './Icon';
import Faq from './Faq';
import Contribute from './Contribute';
import Extractor from './Extractor';
import Upload from './Upload';
import { HashScroller } from '../components/HashScroller';
import { lazy, Suspense } from 'react';

// Development-only page for displaying all icons in a grid
const AllIcons = lazy(() => import('./AllIcons'));

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/faq" element={<Faq/>}/>
                <Route path="/contribute" element={<Contribute/>}/>
                <Route path="/extractor" element={<Extractor/>}/>
                <Route path="/upload" element={<Upload/>}/>
                <Route path="/icon/:iconcode" element={<Icon/>}/>
                <Route path="/browse/:filterType/:filter" element={<Home/>}/>
                <Route path="/browse/:filterType" element={<Home/>}/>
                {/* Development-only route for promotional screenshot of all icons */}
                {process.env.NODE_ENV === 'development' && (
                    <Route path="/all-icons" element={
                        <Suspense fallback={<div>Loading...</div>}>
                            <AllIcons/>
                        </Suspense>
                    }/>
                )}
                <Route path="*" element={<Home/>}/> {/* Fallback, all non matches above go to home page. */}
            </Routes>
            <HashScroller/>
        </BrowserRouter>
    );
}

export default App;
