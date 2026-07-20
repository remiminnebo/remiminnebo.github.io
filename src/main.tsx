import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource/instrument-serif';
import '@fontsource/instrument-serif/400-italic.css';
import './styles/global.css';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
