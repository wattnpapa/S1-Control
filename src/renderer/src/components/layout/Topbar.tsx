import { useEffect, useState } from 'react';
import type { AbgleichStand, TacticalStrength } from '@renderer/types/ui';
import { toNatoDateTime } from '@renderer/utils/datetime';
import { staerkeZusatz, type StaerkeUebersicht } from '@renderer/utils/staerke';
import { toTaktischeStaerke } from '@renderer/utils/tactical';
import type { JSX } from 'react';

interface TopbarProps {
  einsatzName: string;
  gesamtStaerke: TacticalStrength;
  staerkeUebersicht: StaerkeUebersicht;
  onOpenStrengthDisplay: () => void;
  onCloseStrengthDisplay: () => void;
  undoMoeglich: boolean;
  onUndo: () => void;
  bearbeiterName: string;
  onBearbeiterWechseln: () => void;
  letzterAbgleich: AbgleichStand;
  busy: boolean;
}

/**
 * Keeps local clock updates scoped to topbar only.
 */
function useTopbarClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Beschreibt, wie frisch der angezeigte Stand ist.
 */
function beschreibeAbgleich(stand: AbgleichStand, jetzt: Date): { text: string; gestoert: boolean } {
  if (!stand.zeitpunkt) {
    return { text: 'wird geladen', gestoert: Boolean(stand.fehler) };
  }
  const alterSekunden = Math.max(0, Math.round((jetzt.getTime() - new Date(stand.zeitpunkt).getTime()) / 1000));
  if (alterSekunden < 20) {
    return { text: 'aktuell', gestoert: Boolean(stand.fehler) };
  }
  if (alterSekunden < 120) {
    return { text: `vor ${alterSekunden} s`, gestoert: true };
  }
  const minuten = Math.round(alterSekunden / 60);
  return { text: `vor ${minuten} min`, gestoert: true };
}

/**
 * Handles Topbar.
 */
export function Topbar(props: TopbarProps): JSX.Element {
  const now = useTopbarClock();
  const zusatz = staerkeZusatz(props.staerkeUebersicht);
  const abgleich = beschreibeAbgleich(props.letzterAbgleich, now);
  return (
    <header className="topbar">
      <h1>
        <span className="topbar-logo-wrap">
          <img src="branding/logo.svg" alt="THW Logo" className="topbar-logo" />
        </span>
        <span>S1-Control - {props.einsatzName}</span>
      </h1>
      <div className="topbar-meta">
        <span
          className="topbar-meta-item"
          title="Gezählt werden Kräfte vor Ort. Abgemeldete Einheiten und Abschnitte vom Typ ANFAHRT zählen nicht mit."
        >
          <span className="topbar-meta-label">Stärke vor Ort</span>
          <span className="topbar-meta-value">{toTaktischeStaerke(props.gesamtStaerke)}</span>
          {zusatz && <span className="topbar-meta-note">{zusatz}</span>}
        </span>
        <span
          className={`topbar-meta-item ${abgleich.gestoert ? 'is-gestoert' : ''}`}
          title={props.letzterAbgleich.fehler ?? 'Zeitpunkt des letzten Abgleichs mit der Einsatzdatei'}
        >
          <span className="topbar-meta-label">Stand</span>
          <span className="topbar-meta-value">{abgleich.text}</span>
          {props.letzterAbgleich.fehler && <span className="topbar-meta-note">Abgleich gestört</span>}
        </span>
        <span className="topbar-meta-item">
          <span className="topbar-meta-label">Bearbeiter</span>
          <button
            className="topbar-bearbeiter"
            onClick={props.onBearbeiterWechseln}
            disabled={props.busy}
            title="Namen ändern — er steht an jeder Eintragung"
          >
            {props.bearbeiterName || 'nicht gesetzt'}
          </button>
        </span>
        <span className="topbar-meta-item">
          <span className="topbar-meta-label">Zeit</span>
          <span className="topbar-meta-value">{toNatoDateTime(now)}</span>
        </span>
      </div>
      <div className="topbar-actions">
        <button
          onClick={props.onUndo}
          disabled={props.busy || !props.undoMoeglich}
          title={
            props.undoMoeglich
              ? 'Letzte Bewegung zurücknehmen'
              : 'Zurzeit gibt es keine Bewegung, die zurückgenommen werden kann'
          }
        >
          Rückgängig
        </button>
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
