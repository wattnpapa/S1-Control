import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StrengthDisplayView } from './components/views/StrengthDisplayView';
import './styles/app.css';

const displayMode = new URLSearchParams(window.location.search).get('display');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {displayMode === 'strength' ? <StrengthDisplayView /> : <App />}
  </React.StrictMode>,
);
