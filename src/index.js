import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Strict Mode calls two times some functions and thus allows to find accidental side effects of functions
/*
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
*/

root.render(
    <App />
);
