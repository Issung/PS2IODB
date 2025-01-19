import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './pages/App';
import 'bootstrap/dist/css/bootstrap.css';
import ReactGA from "react-ga4";

ReactGA.initialize("G-MTYRQV3C1G");

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        {process.env.NODE_ENV === 'development' &&
            <>
                <p className="size-indicator xs d-block d-sm-none">[XS] SM MD LG XL XXL</p>
                <p className="size-indicator sm d-none d-sm-block d-md-none">XS [SM] MD LG XL XXL</p>
                <p className="size-indicator md d-none d-md-block d-lg-none">XS SM [MD] LG XL XXL</p>
                <p className="size-indicator lg d-none d-lg-block d-xl-none">XS SM MD [LG] XL XXL</p>
                <p className="size-indicator xl d-none d-xl-block d-xxl-none">XS SM MD LG [XL] XXL</p>
                <p className="size-indicator xxl d-none d-xxl-block">XS SM MD LG XL [XXL]</p>
            </>
        }
        <App />
    </React.StrictMode>
);
