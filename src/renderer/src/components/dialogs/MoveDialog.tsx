import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { AbschnittNode } from '@shared/types';

interface MoveDialogProps {
  visible: boolean;
  type: 'einheit' | 'fahrzeug';
  abschnitte: AbschnittNode[];
  moveTarget: string;
  isArchived: boolean;
  /** Bezeichnung des Objekts, das verschoben wird. */
  objektName: string;
  /** Abschnitt, in dem das Objekt gerade steht. */
  quelleAbschnittId: string;
  quelleName: string;
  /** Anzahl Fahrzeuge, die mit einer Einheit mitgehen. */
  mitgefuehrteFahrzeuge: number;
  onChangeTarget: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Baut den Anzeigenamen eines Abschnitts mit seiner Ebene, damit gleichnamige
 * Abschnitte unterschiedlicher Zweige auseinanderzuhalten sind.
 */
function abschnittPfad(abschnitt: AbschnittNode, alle: AbschnittNode[]): string {
  const teile: string[] = [abschnitt.name];
  let aktuell = abschnitt;
  const gesehen = new Set<string>([abschnitt.id]);
  while (aktuell.parentId) {
    const eltern = alle.find((a) => a.id === aktuell.parentId);
    if (!eltern || gesehen.has(eltern.id)) {
      break;
    }
    teile.unshift(eltern.name);
    gesehen.add(eltern.id);
    aktuell = eltern;
  }
  return teile.join(' › ');
}

/**
 * Benennt Objekt, Herkunft und mitgeführte Fahrzeuge.
 */
function MoveKopf(props: {
  objektName: string;
  quelleName: string;
  zeigeFahrzeughinweis: boolean;
  mitgefuehrteFahrzeuge: number;
}): JSX.Element {
  const fahrzeugText =
    props.mitgefuehrteFahrzeuge === 1
      ? '1 Fahrzeug der Einheit wird mitgeführt.'
      : `${props.mitgefuehrteFahrzeuge} Fahrzeuge der Einheit werden mitgeführt.`;
  return (
    <>
      <p className="move-objekt">
        <strong>{props.objektName || 'Unbekannt'}</strong>
        <span className="move-herkunft">steht in: {props.quelleName || 'unbekannter Abschnitt'}</span>
      </p>
      {props.zeigeFahrzeughinweis && props.mitgefuehrteFahrzeuge > 0 && (
        <p className="move-hinweis">{fahrzeugText}</p>
      )}
    </>
  );
}

/**
 * Verschiebt eine Einheit oder ein Fahrzeug in einen anderen Abschnitt.
 * Der Dialog benennt Objekt und Herkunft; das Ziel ist bewusst nicht
 * vorbelegt, damit ein einzelner Tipp nichts auslöst.
 */
export function MoveDialog(props: MoveDialogProps): JSX.Element | null {
  const [laeuft, setLaeuft] = useState(false);
  const zielRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (props.visible) {
      setLaeuft(false);
      zielRef.current?.focus();
    }
  }, [props.visible]);

  if (!props.visible) {
    return null;
  }

  const auswahl = props.abschnitte.filter((abschnitt) => abschnitt.id !== props.quelleAbschnittId);
  const bestaetigen = (): void => {
    if (laeuft || !props.moveTarget || props.isArchived) {
      return;
    }
    // Sperrt Doppelauslösung: sonst entstehen zwei Bewegungen hintereinander.
    setLaeuft(true);
    props.onConfirm();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{props.type === 'einheit' ? 'Einheit verschieben' : 'Fahrzeug verschieben'}</h3>
        <MoveKopf
          objektName={props.objektName}
          quelleName={props.quelleName}
          zeigeFahrzeughinweis={props.type === 'einheit'}
          mitgefuehrteFahrzeuge={props.mitgefuehrteFahrzeuge}
        />
        <label className="move-ziel-label">
          Ziel
          <select ref={zielRef} value={props.moveTarget} onChange={(e) => props.onChangeTarget(e.target.value)}>
            <option value="">Bitte Zielabschnitt wählen</option>
            {auswahl.map((abschnitt) => (
              <option key={abschnitt.id} value={abschnitt.id}>
                {abschnittPfad(abschnitt, props.abschnitte)}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={props.onClose}>Abbrechen</button>
          <button onClick={bestaetigen} disabled={!props.moveTarget || props.isArchived || laeuft}>
            {laeuft ? 'Wird verschoben …' : 'Verschieben'}
          </button>
        </div>
      </div>
    </div>
  );
}
