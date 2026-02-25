import { describe, expect, it } from 'vitest';
import { toNatoDateTime } from '../src/renderer/src/utils/datetime';
import { parseTaktischeStaerke, toTaktischeStaerke } from '../src/renderer/src/utils/tactical';
import { AppError, toSafeError } from '../src/main/services/errors';
import { iconPath } from '../src/renderer/src/utils/assets';
import { readError } from '../src/renderer/src/utils/error';

describe('renderer utils', () => {
  it('formats tactical strength', () => {
    expect(toTaktischeStaerke({ fuehrung: 1, unterfuehrung: 2, mannschaft: 3, gesamt: 6 })).toBe('1/2/3/6');
  });

  it('parses valid tactical strength', () => {
    expect(parseTaktischeStaerke('1/2/3/6', 0)).toEqual({
      fuehrung: 1,
      unterfuehrung: 2,
      mannschaft: 3,
      gesamt: 6,
    });
  });

  it('falls back for missing or invalid tactical string', () => {
    expect(parseTaktischeStaerke(null, 5)).toEqual({
      fuehrung: 0,
      unterfuehrung: 0,
      mannschaft: 5,
      gesamt: 5,
    });
    expect(parseTaktischeStaerke('invalid', 4)).toEqual({
      fuehrung: 0,
      unterfuehrung: 0,
      mannschaft: 4,
      gesamt: 4,
    });
    expect(parseTaktischeStaerke('1/1/1/0', 9)).toEqual({
      fuehrung: 1,
      unterfuehrung: 1,
      mannschaft: 1,
      gesamt: 3,
    });
  });

  it('formats NATO date-time string', () => {
    const d = new Date(2026, 1, 25, 14, 7, 0); // local time
    expect(toNatoDateTime(d)).toBe('251407FEB26');
  });

  it('uses JAN fallback for out-of-range month value', () => {
    const fakeDate = {
      getDate: () => 1,
      getHours: () => 2,
      getMinutes: () => 3,
      getMonth: () => 99,
      getFullYear: () => 2026,
    } as unknown as Date;

    expect(toNatoDateTime(fakeDate)).toBe('010203JAN26');
  });

  it('builds icon paths with fallback key', () => {
    expect(iconPath('einheit', null)).toBe('piktogramme/einheit/bergung.svg');
    expect(iconPath('fahrzeug', null)).toBe('piktogramme/fahrzeug/mtw.svg');
    expect(iconPath('einheit', 'logistik')).toBe('piktogramme/einheit/logistik.svg');
  });

  it('reads error messages safely', () => {
    expect(readError(new Error('kaputt'))).toBe('kaputt');
    expect(readError({ message: 'boom' })).toBe('boom');
    expect(readError(null)).toBe('Fehler');
    expect(readError('x')).toBe('Fehler');
  });
});

describe('error utils', () => {
  it('returns safe app errors', () => {
    const err = new AppError('kaputt', 'TEST');
    expect(toSafeError(err)).toEqual({ message: 'kaputt', code: 'TEST' });
  });

  it('returns safe standard errors and unknown errors', () => {
    expect(toSafeError(new Error('x'))).toEqual({ message: 'x' });
    expect(toSafeError('oops')).toEqual({ message: 'Unbekannter Fehler' });
  });
});
