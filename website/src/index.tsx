import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './pages/App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.css';
import ReactGA from "react-ga4";

ReactGA.initialize("G-MTYRQV3C1G");

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <p className="size-indicator xs d-block d-sm-none">[XS] SM MD LG XL XXL</p>
        <p className="size-indicator sm d-none d-sm-block d-md-none">XS [SM] MD LG XL XXL</p>
        <p className="size-indicator md d-none d-md-block d-lg-none">XS SM [MD] LG XL XXL</p>
        <p className="size-indicator lg d-none d-lg-block d-xl-none">XS SM MD [LG] XL XXL</p>
        <p className="size-indicator xl d-none d-xl-block d-xxl-none">XS SM MD LG [XL] XXL</p>
        <p className="size-indicator xxl d-none d-xxl-block">XS SM MD LG XL [XXL]</p>
        <App />
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
