import '../model/Titles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Faq from './Faq';
import Contribute from './Contribute';
import { HashScroller } from '../components/HashScroller';
import { lazy, Suspense, useEffect } from 'react';

// The pages using the 3D viewer (Three.js etc.) are loaded on demand, so the home page bundle stays small.
// The bundler puts code shared by both chunks (Three.js, ModelView) into a chunk of its own.
const loadIcon = () => import('./Icon');
const Icon = lazy(loadIcon);
const Extractor = lazy(() => import('./ExtractorPages').then(m => ({ default: m.Extractor })));
const Upload = lazy(() => import('./ExtractorPages').then(m => ({ default: m.Upload })));

// Development-only page for displaying all icons in a grid
const AllIcons = lazy(() => import('./AllIcons'));

function App() {
    // Most visitors go on to view an icon, so fetch that page's code once the browser is idle, to make that first click instant.
    useEffect(() => {
        const prefetch = () => void loadIcon();
        if ('requestIdleCallback' in window) {
            const handle = requestIdleCallback(prefetch, { timeout: 5000 });
            return () => cancelIdleCallback(handle);
        } else {    // Safari doesn't support requestIdleCallback.
            const handle = setTimeout(prefetch, 3000);
            return () => clearTimeout(handle);
        }
    }, []);

    return (
        <BrowserRouter>
            {/* No fallback, the page's chunk is usually cached or quick to load, and a spinner flash would look worse. */}
            <Suspense fallback={null}>
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
            </Suspense>
            <HashScroller/>
        </BrowserRouter>
    );
}

export default App;
