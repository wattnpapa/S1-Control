import type { TacticalStrength } from '@renderer/types/ui';
import { toNatoDateTime } from '@renderer/utils/datetime';
import { toTaktischeStaerke } from '@renderer/utils/tactical';

interface TopbarProps {
  einsatzName: string;
  gesamtStaerke: TacticalStrength;
  now: Date;
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
        <span>Stärke: {toTaktischeStaerke(props.gesamtStaerke)}</span>
        <span>{toNatoDateTime(props.now)}</span>
      </div>
    </header>
  );
}
