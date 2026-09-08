import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StrengthDisplayView } from './components/views/StrengthDisplayView';
import './styles/app.css';

const displayMode = new URLSearchParams(window.location.search).get('display');
if (displayMode === 'strength') {
  createRoot(document.getElementById('root')!).render(<StrengthDisplayView />);
} else {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
