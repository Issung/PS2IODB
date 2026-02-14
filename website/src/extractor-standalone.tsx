/**
 * Standalone entry point for the Extractor feature.
 * This is used to build a single HTML file that can be run offline.
 *
 * Build with: npm run build:standalone
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './index.scss';
import Extractor from './pages/Extractor';
import 'bootstrap/dist/css/bootstrap.css';

// No analytics for standalone version

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

// MemoryRouter is used because the ExtractorHeader uses Link from react-router-dom.
// This provides the router context without requiring actual browser navigation.
root.render(
    <React.StrictMode>
        <MemoryRouter>
            <Extractor />
        </MemoryRouter>
    </React.StrictMode>
);

