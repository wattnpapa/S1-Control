import type { TacticalStrength } from '@renderer/types/ui';
import { toNatoDateTime } from '@renderer/utils/datetime';
import { toTaktischeStaerke } from '@renderer/utils/tactical';

interface TopbarProps {
  einsatzName: string;
  gesamtStaerke: TacticalStrength;
  now: Date;
  onOpenStrengthDisplay: () => void;
  onCloseStrengthDisplay: () => void;
  busy: boolean;
}

export function Topbar(props: TopbarProps): JSX.Element {
  return (
    <header className="topbar">
      <h1>
        <span className="topbar-logo-wrap">
          <img src="branding/logo.svg" alt="THW Logo" className="topbar-logo" />
        </span>
        <span>S1-Control - {props.einsatzName}</span>
      </h1>
      <div className="topbar-meta">
        <span className="topbar-meta-item">
          <span className="topbar-meta-label">Stärke</span>
          <span className="topbar-meta-value">{toTaktischeStaerke(props.gesamtStaerke)}</span>
        </span>
        <span className="topbar-meta-item">
          <span className="topbar-meta-label">Zeit</span>
          <span className="topbar-meta-value">{toNatoDateTime(props.now)}</span>
        </span>
      </div>
      <div className="topbar-actions">
        <button onClick={props.onOpenStrengthDisplay} disabled={props.busy}>
          Stärke-Monitor öffnen
        </button>
        <button onClick={props.onCloseStrengthDisplay} disabled={props.busy}>
          Monitor schließen
        </button>
      </div>
    </header>
  );
}
