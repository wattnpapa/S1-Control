import type { EinsatzListItem } from '@shared/types';

interface StartViewProps {
  startChoice: 'none' | 'open' | 'create';
  setStartChoice: (value: 'none' | 'open' | 'create') => void;
  busy: boolean;
  error: string | null;
  einsaetze: EinsatzListItem[];
  startOpenEinsatzId: string;
  setStartOpenEinsatzId: (value: string) => void;
  startNewEinsatzName: string;
  setStartNewEinsatzName: (value: string) => void;
  startNewFuestName: string;
  setStartNewFuestName: (value: string) => void;
  onOpenExisting: () => void;
  onCreate: () => void;
}

export function StartView(props: StartViewProps): JSX.Element {
  return (
    <div className="login-page">
      <div className="panel start-screen-panel">
        <div className="login-header">
          <span className="login-logo-wrap">
            <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
          </span>
          <h1 className="login-title">S1-Control</h1>
        </div>
        <h1>Startbildschirm</h1>
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
            <label>
              Einsatz
              <select
                value={props.startOpenEinsatzId}
                onChange={(e) => props.setStartOpenEinsatzId(e.target.value)}
                disabled={props.busy || props.einsaetze.length === 0}
              >
                {props.einsaetze.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.status})
                  </option>
                ))}
              </select>
            </label>
            <button onClick={props.onOpenExisting} disabled={props.busy || !props.startOpenEinsatzId}>
              Einsatz öffnen
            </button>
            {props.einsaetze.length === 0 && (
              <p className="hint">Noch keine Einsätze vorhanden. Bitte neuen Einsatz anlegen.</p>
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
