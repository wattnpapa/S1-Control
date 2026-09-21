import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ConfirmProvider } from './app/ConfirmProvider';
import { StrengthDisplayView } from './components/views/StrengthDisplayView';
import './styles/app.css';

// Auch das Monitorfenster folgt der gewählten Darstellung.
try {
  const gespeichertesThema = window.localStorage.getItem('s1-control.anzeige-thema');
  if (gespeichertesThema === 'hell' || gespeichertesThema === 'dunkel') {
    document.documentElement.setAttribute('data-theme', gespeichertesThema);
  }
} catch {
  // Ohne Speicher gilt die Einstellung des Systems.
}

const displayMode = new URLSearchParams(window.location.search).get('display');
if (displayMode === 'strength') {
  createRoot(document.getElementById('root')!).render(<StrengthDisplayView />);
} else {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </React.StrictMode>,
  );
}
