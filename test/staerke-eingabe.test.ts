import { describe, expect, it, vi } from 'vitest';
import { parseAndValidateStrength } from '../src/renderer/src/app/einheit-actions/types';

function pruefe(fuehrung: string, unterfuehrung: string, mannschaft: string) {
  const setError = vi.fn();
  const ergebnis = parseAndValidateStrength(setError, {
    fuehrungRaw: fuehrung,
    unterfuehrungRaw: unterfuehrung,
    mannschaftRaw: mannschaft,
    errorMessage: 'Stärke ungültig.',
  });
  return { ergebnis, setError };
}

describe('Eingabe der Stärke', () => {
  it('nimmt gültige Werte an und bildet die Summe', () => {
    const { ergebnis } = pruefe('0', '1', '8');
    expect(ergebnis).toEqual({ fuehrung: 0, unterfuehrung: 1, mannschaft: 8, gesamt: 9 });
  });

  it('wertet ein leeres Feld nicht still als Null', () => {
    const { ergebnis, setError } = pruefe('0', '', '8');
    expect(ergebnis).toBeNull();
    expect(setError).toHaveBeenCalled();
  });

  it('weist Zahlendreher jenseits der Plausibilitätsgrenze ab', () => {
    expect(pruefe('0', '1', '8000').ergebnis).toBeNull();
  });

  it('weist Kommazahlen und negative Werte ab', () => {
    expect(pruefe('0', '1,5', '8').ergebnis).toBeNull();
    expect(pruefe('0', '-1', '8').ergebnis).toBeNull();
  });
});
