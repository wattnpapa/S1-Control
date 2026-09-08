import { AppError } from '../errors';

/**
 * Parses tactical strength string into tactical tuple.
 */
export function parseTaktisch(taktisch: string | null, fallbackGesamt: number): [number, number, number, number] {
  if (!taktisch) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return [0, 0, safe, safe];
  }
  const parts = taktisch.split('/').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0)) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return [0, 0, safe, safe];
  }
  const fuehrung = Math.round(parts[0] ?? 0);
  const unterfuehrung = Math.round(parts[1] ?? 0);
  const mannschaft = Math.round(parts[2] ?? 0);
  const gesamt = Math.round(parts[3] ?? fuehrung + unterfuehrung + mannschaft);
  return [fuehrung, unterfuehrung, mannschaft, gesamt];
}

/**
 * Formats tactical strength triplet including derived total.
 */
export function formatTaktisch(fuehrung: number, unterfuehrung: number, mannschaft: number): string {
  const gesamt = fuehrung + unterfuehrung + mannschaft;
  return `${fuehrung}/${unterfuehrung}/${mannschaft}/${gesamt}`;
}

/**
 * Parses and validates tactical strength input.
 */
function parseAndValidateTacticalInput(aktuelleStaerkeTaktisch: string): number[] {
  const parts = aktuelleStaerkeTaktisch.split('/').map((part) => Number(part));
  const invalid = parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0);
  if (invalid) {
    throw new AppError('Taktische Stärke ist ungültig', 'VALIDATION');
  }
  return parts;
}

/**
 * Validates tactical strength consistency with total strength.
 */
export function validateTacticalStrength(aktuelleStaerke: number, aktuelleStaerkeTaktisch?: string): void {
  if (aktuelleStaerke < 0) {
    throw new AppError('Stärke muss >= 0 sein', 'VALIDATION');
  }
  if (!aktuelleStaerkeTaktisch) {
    return;
  }
  const parts = parseAndValidateTacticalInput(aktuelleStaerkeTaktisch);
  const calculated = (parts[0] ?? 0) + (parts[1] ?? 0) + (parts[2] ?? 0);
  if ((parts[3] ?? 0) !== calculated || aktuelleStaerke !== calculated) {
    throw new AppError('Taktische Stärke und Gesamtstärke sind inkonsistent', 'VALIDATION');
  }
}
