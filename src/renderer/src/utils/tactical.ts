import type { TacticalStrength } from '@renderer/types/ui';

export function toTaktischeStaerke(value: TacticalStrength): string {
  return `${value.fuehrung}/${value.unterfuehrung}/${value.mannschaft}/${value.gesamt}`;
}

export function parseTaktischeStaerke(taktisch: string | null, fallbackGesamt: number): TacticalStrength {
  if (!taktisch) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return { fuehrung: 0, unterfuehrung: 0, mannschaft: safe, gesamt: safe };
  }

  const parts = taktisch.split('/').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return { fuehrung: 0, unterfuehrung: 0, mannschaft: safe, gesamt: safe };
  }

  const fuehrung = Math.round(parts[0] ?? 0);
  const unterfuehrung = Math.round(parts[1] ?? 0);
  const mannschaft = Math.round(parts[2] ?? 0);
  const gesamtRaw = Math.round(parts[3] ?? 0);
  const gesamt = gesamtRaw > 0 ? gesamtRaw : fuehrung + unterfuehrung + mannschaft;

  return { fuehrung, unterfuehrung, mannschaft, gesamt };
}
