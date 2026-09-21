import { useEffect, useRef } from 'react';
import type { JSX } from 'react';

export interface ConfirmRequest {
  /** Überschrift, benennt die Handlung. */
  titel: string;
  /** Was genau passiert, in einem Satz. */
  text: string;
  /** Folgen, die nicht offensichtlich sind (Datenverlust, Wirkung auf andere Stationen). */
  folgen?: string[];
  /** Beschriftung der bestätigenden Schaltfläche, z. B. "Löschen". */
  bestaetigenText?: string;
  abbrechenText?: string;
  /** Rot und mit Abstand gesetzt, wenn die Handlung nicht rückholbar ist. */
  gefahr?: boolean;
}

interface ConfirmDialogProps extends ConfirmRequest {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Rückfrage vor folgenschweren Handlungen. Der Abbruch liegt auf dem Fokus,
 * damit ein reflexhaftes Enter nichts auslöst.
 */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const abbrechenRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    abbrechenRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        props.onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);

  return (
    <div className="modal-backdrop confirm-backdrop" role="alertdialog" aria-modal="true">
      <div className={`modal confirm-modal ${props.gefahr ? 'is-gefahr' : ''}`}>
        <h3>{props.titel}</h3>
        <p className="confirm-text">{props.text}</p>
        {props.folgen && props.folgen.length > 0 && (
          <ul className="confirm-folgen">
            {props.folgen.map((folge) => (
              <li key={folge}>{folge}</li>
            ))}
          </ul>
        )}
        <div className="modal-actions confirm-actions">
          <button ref={abbrechenRef} className="btn-abbrechen" onClick={props.onCancel}>
            {props.abbrechenText ?? 'Abbrechen'}
          </button>
          <button
            className={props.gefahr ? 'btn-gefahr' : ''}
            onClick={props.onConfirm}
          >
            {props.bestaetigenText ?? 'Fortfahren'}
          </button>
        </div>
      </div>
    </div>
  );
}
