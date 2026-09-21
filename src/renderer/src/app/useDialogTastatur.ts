import { useEffect, useRef } from 'react';

interface UseDialogTastaturOptions {
  visible: boolean;
  /** Escape und Abbrechen. */
  onClose: () => void;
  /** Enter außerhalb mehrzeiliger Felder. */
  onSubmit?: () => void;
  /** Absenden per Enter unterdrücken, etwa bei folgenschweren Dialogen. */
  enterSendetAb?: boolean;
}

/**
 * Macht einen Dialog mit der Tastatur bedienbar: Escape schließt, Enter sendet
 * ab, und das erste Feld bekommt den Fokus.
 */
export function useDialogTastatur(options: UseDialogTastaturOptions) {
  const rahmenRef = useRef<HTMLDivElement>(null);
  const { visible, onClose, onSubmit } = options;
  const enterSendetAb = options.enterSendetAb ?? true;

  useEffect(() => {
    if (!visible) {
      return;
    }
    const erstesFeld = rahmenRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    erstesFeld?.focus();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const beiTaste = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Enter' || !enterSendetAb || !onSubmit) {
        return;
      }
      const ziel = event.target as HTMLElement | null;
      // In mehrzeiligen Feldern und auf Schaltflächen behält Enter seine
      // gewohnte Bedeutung.
      if (ziel?.tagName === 'TEXTAREA' || ziel?.tagName === 'BUTTON') {
        return;
      }
      event.preventDefault();
      onSubmit();
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [visible, onClose, onSubmit, enterSendetAb]);

  return rahmenRef;
}
