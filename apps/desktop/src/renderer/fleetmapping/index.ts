/**
 * Das Standard-Fleetmapping der TMO-Rufgruppen des THW (Stand der Landesverband-
 * Übersichten, siehe `tmo-rufgruppen.json`) als Vorschlagsquelle für den Namen
 * einer Rufgruppe. Reine Nachschlage-Logik ohne DOM: Die Maske schlägt vor,
 * erzwingt aber nichts — abweichende Namen bleiben jederzeit möglich.
 */

import daten from "./tmo-rufgruppen.json";

export interface Fleetmapeintrag {
  readonly name: string;
  /** Hauptordner und Unterordner, z. B. `["T_LV BW", "Biberach"]`. */
  readonly ordner: readonly string[];
  /** Die Kurzwahl (neu); `undefined`, wo sie je Landesverband verschieden ist. */
  readonly kurzwahl: number | undefined;
  /** In welchen der fünf Landesverband-Übersichten die Gruppe steht. */
  readonly laender: readonly string[];
}

const ordnerliste = daten.ordner as readonly (readonly string[])[];
const laenderliste = daten.laender as readonly string[];

const eintraege: readonly Fleetmapeintrag[] = (daten.eintraege as unknown as readonly (readonly [string, number, number, number])[]).map(
  ([name, ordner, kurzwahl, maske]) => ({
    name,
    ordner: ordnerliste[ordner] ?? [],
    kurzwahl: kurzwahl === 0 ? undefined : kurzwahl,
    laender: laenderliste.filter((_, bit) => (maske & (1 << bit)) !== 0),
  }),
);

export const FLEETMAPPING_STAND: string = daten.stand;

/** Ohne Groß-/Kleinschreibung und ohne Trenner, damit „t bund 01“ „T_BUND-01“ findet. */
function normal(text: string): string {
  return text.toLowerCase().replace(/[\s_\-.]+/g, "");
}

const suchtexte = eintraege.map((e) => normal(e.name));
const nameZuEintrag = new Map(eintraege.map((e) => [e.name, e] as const));

/** Der Eintrag zu genau diesem Namen (wie im Fleetmapping geschrieben), sonst `undefined`. */
export function fleetmapEintrag(name: string): Fleetmapeintrag | undefined {
  return nameZuEintrag.get(name.trim());
}

/** Ordnerangabe für die Anzeige: „T_LV BW › Biberach“. */
export function ordnertext(eintrag: Fleetmapeintrag): string {
  return eintrag.ordner.join(" › ");
}

/** Je kleiner, desto besser: genau, Anfang, irgendwo; bei Gleichstand THW-eigene Ordner (`T_…`) vor den Zusatzordnern. */
function rang(suchtext: string, text: string, eintrag: Fleetmapeintrag): number {
  const art = text === suchtext ? 0 : text.startsWith(suchtext) ? 1 : 2;
  return art * 2 + (eintrag.ordner[0]?.startsWith("T_") === true ? 0 : 1);
}

/**
 * Die besten Vorschläge zum getippten Text, höchstens `grenze`. Leerer Text
 * liefert nichts. Innerhalb eines Rangs bleibt die Reihenfolge des
 * Fleetmappings (Kurzwahl-Folge).
 */
export function sucheRufgruppen(text: string, grenze = 12): readonly Fleetmapeintrag[] {
  const gesucht = normal(text);
  if (gesucht === "") return [];
  const treffer: { readonly eintrag: Fleetmapeintrag; readonly rang: number }[] = [];
  eintraege.forEach((eintrag, index) => {
    const suchtext = suchtexte[index] ?? "";
    if (suchtext.includes(gesucht)) treffer.push({ eintrag, rang: rang(gesucht, suchtext, eintrag) });
  });
  // Array.prototype.sort ist stabil: gleicher Rang behält die Fleetmap-Reihenfolge.
  return treffer
    .sort((a, b) => a.rang - b.rang)
    .slice(0, grenze)
    .map((t) => t.eintrag);
}
