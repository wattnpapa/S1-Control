import type { EinsatzListItem } from '@shared/types';

interface StartViewProps {
  startChoice: 'none' | 'open' | 'create';
  setStartChoice: (value: 'none' | 'open' | 'create') => void;
  busy: boolean;
  error: string | null;
  einsaetze: EinsatzListItem[];
  startNewEinsatzName: string;
  setStartNewEinsatzName: (value: string) => void;
  startNewFuestName: string;
  setStartNewFuestName: (value: string) => void;
  appVersion?: string;
  onOpenExisting: () => void;
  onOpenKnownEinsatz: (einsatzId: string) => void;
  onCreate: () => void;
}

export function StartView(props: StartViewProps): JSX.Element {
  return (
    <div className="login-page start-page">
      <div className="panel start-screen-panel">
        <div className="login-header">
          <span className="login-logo-wrap">
            <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
          </span>
          <h1 className="login-title">S1-Control</h1>
          <p className="login-version">Version {props.appVersion ?? '-'}</p>
          <p className="login-license">Lizenz: GPL-3.0</p>
          <p className="login-license">Copyright © {new Date().getFullYear()} Johannes Rudolph</p>
        </div>
        <p className="hint">Möchtest du einen bestehenden Einsatz öffnen oder einen neuen anlegen?</p>

        <div className="start-options">
          <button onClick={() => props.setStartChoice('open')} disabled={props.busy}>
            Bestehenden Einsatz öffnen
          </button>
          <button onClick={() => props.setStartChoice('create')} disabled={props.busy}>
            Neuen Einsatz anlegen
          </button>
        </div>

        {props.startChoice === 'open' && (
          <div className="start-form">
            <p className="hint">Wähle eine bestehende Einsatz-Datei (`.s1control`) aus.</p>
            <button onClick={props.onOpenExisting} disabled={props.busy}>
              Einsatz-Datei auswählen und öffnen
            </button>
            {props.einsaetze.length > 0 && (
              <>
                <p className="hint">Zuletzt verwendete Einsätze:</p>
                <div className="quick-einsatz-list">
                  {props.einsaetze.map((item) => (
                    <button
                      key={item.id}
                      title={item.dbPath ?? ''}
                      onClick={() => props.onOpenKnownEinsatz(item.id)}
                      disabled={props.busy}
                    >
                      {item.name} ({item.status})
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {props.startChoice === 'create' && (
          <div className="start-form">
            <label>
              Einsatzname
              <input
                value={props.startNewEinsatzName}
                onChange={(e) => props.setStartNewEinsatzName(e.target.value)}
                placeholder="z.B. Hochwasser Landkreis"
              />
            </label>
            <label>
              FüSt Name
              <input value={props.startNewFuestName} onChange={(e) => props.setStartNewFuestName(e.target.value)} />
            </label>
            <button onClick={props.onCreate} disabled={props.busy || !props.startNewEinsatzName.trim()}>
              Einsatz anlegen und öffnen
            </button>
          </div>
        )}

        {props.error && <p className="error">{props.error}</p>}
      </div>
    </div>
  );
}
