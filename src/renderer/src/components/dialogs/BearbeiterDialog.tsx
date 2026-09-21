import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

interface BearbeiterDialogProps {
  visible: boolean;
  aktuellerName: string;
  busy: boolean;
  onSpeichern: (name: string) => void;
  onClose: () => void;
}

/**
 * Erfasst den Namen des Bearbeiters. Er steht an jeder Eintragung und macht
 * eine Übergabe nachvollziehbar.
 */
export function BearbeiterDialog(props: BearbeiterDialogProps): JSX.Element | null {
  const [name, setName] = useState(props.aktuellerName);
  const eingabeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.visible) {
      setName(props.aktuellerName);
      eingabeRef.current?.focus();
    }
  }, [props.visible, props.aktuellerName]);

  if (!props.visible) {
    return null;
  }

  const speichern = (): void => {
    if (name.trim()) {
      props.onSpeichern(name.trim());
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Wer erfasst?</h3>
        <p className="confirm-text">
          Der Name steht an jeder Bewegung und jeder Änderung. Bei einer Übergabe hier den neuen Namen eintragen.
        </p>
        <label className="move-ziel-label">
          Name
          <input
            ref={eingabeRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                speichern();
              }
            }}
            placeholder="z. B. Mustermann"
          />
        </label>
        <div className="modal-actions">
          <button onClick={props.onClose}>Abbrechen</button>
          <button onClick={speichern} disabled={props.busy || !name.trim()}>
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
