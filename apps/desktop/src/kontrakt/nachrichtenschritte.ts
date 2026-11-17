/**
 * Die Bedienschritte des Nachrichtenvordrucks (KONZEPT-NACHRICHTEN.md §5, §9)
 * — Entwürfe für den Ruf `bedienen`.
 *
 * Eigene Datei neben `funkschritte.ts`, damit `bedienschritte.ts` nicht weiter
 * wächst. Jede Funktion baut genau einen Entwurf; geschrieben wird im Worker,
 * in einer Transaktion, wie jeder andere Bedienschritt.
 *
 * **Die Nutzlast prüft gegen die Schemata der Domäne** ({@link nachrichtenentwurfFehler}).
 * Die Maske fragt vor dem Aufgeben, ob der Entwurf passt, und der Worker
 * prüft dieselben Schemata noch einmal (`nachrichtenpruefung.ts`): Ein falsch
 * gebauter Vermerk bliebe sonst im append-only-Protokoll stehen (§3.7).
 *
 * Die Sichtung schickt den Wert, den der Laufzettel beim Öffnen sah — aber
 * ohne Vorwert-Prüfung (geändert 2026-11-17): Zwei Sichter an derselben
 * Nachricht sollen nicht still übereinander schreiben, aber auch keiner
 * soll abgewiesen werden; §5 „Sichtung" verlangt, dass beide Verteiler
 * gelten und der zweite den Konflikthinweis sieht. Der Fold meldet
 * `vorherPasstNicht`, die Zeile führt beide Verteiler, bis eine Nachsichtung
 * mit dem dann geltenden Vorher-Wert („2. Sichtung") bereinigt.
 */

import { KATALOG, schemata, type Nachrichtenzeile, type Sichtungsvermerk, type Zeitvermerk } from "@s1/domaene";

import type { Entwurf } from "./index.js";

/** Was die Maske „Nachricht verfassen" aufgibt (Feld 7 bis 17 des Vordrucks). */
export interface Nachrichtenanlage {
  readonly nachrichtId: string;
  readonly richtung: "EINGANG" | "AUSGANG";
  readonly art?: string;
  readonly vorrang?: string;
  readonly gespraechsnotiz?: boolean;
  readonly uebermittlungswunsch?: string;
  readonly anschrift: string;
  readonly rufnummer?: string;
  readonly betreff: string;
  readonly inhalt: string;
  readonly absender: string;
  readonly abfassungszeit?: string;
  readonly zeichen?: string;
  readonly funktion?: string;
  readonly antwortAuf?: string;
  readonly weitergeleitetVon?: string;
  /** Additiv (N2, §5 „Eingang von außen"): die Gegenstelle draußen, beim Aufnehmen durch die FmZ. */
  readonly gegenstelle?: string;
  /** Additiv (N2): der Aufnahmevermerk der FmZ (Feld 1 und 2) — Mittel, Zeit, Handzeichen. */
  readonly aufnahme?: { readonly mittel: string; readonly zeitpunkt: string; readonly handzeichen: string };
}

/** Leere optionale Texte fallen weg: Ein leeres Feld ist auf dem Vordruck kein Wert. */
function ohneLeere(anlage: Nachrichtenanlage): Record<string, unknown> {
  const ergebnis: Record<string, unknown> = {};
  for (const [schluessel, wert] of Object.entries(anlage)) {
    if (wert === undefined) continue;
    if (typeof wert === "string") {
      const geputzt = schluessel === "inhalt" ? wert.replace(/\s+$/u, "") : wert.trim();
      const pflicht = ["anschrift", "betreff", "inhalt", "absender", "nachrichtId", "richtung"].includes(schluessel);
      if (geputzt === "" && !pflicht) continue;
      ergebnis[schluessel] = geputzt;
      continue;
    }
    if (wert === false) continue;
    ergebnis[schluessel] = wert;
  }
  return ergebnis;
}

/**
 * „Aufgeben" (§5 Ausgang): legt die Nachricht an. Ohne Undo und ohne
 * Vorwert — ein aufgegebener Vordruck wird nicht ungeschrieben, sondern
 * zurückgezogen ({@link nachrichtZurueckziehen}).
 */
export function nachrichtVerfassen(anlage: Nachrichtenanlage): Entwurf {
  return { typ: "NachrichtVerfasst", nutzlast: ohneLeere(anlage) };
}

/**
 * Die Sichtung (Feld 18 bis 20): ein Wert, weil sie auf Papier ein Laufzettel
 * ist. `vorher` ist die Sichtung, die der Laufzettel beim Öffnen sah (`null`
 * bei der ersten).
 */
export function nachrichtSichten(nachrichtId: string, vorher: Sichtungsvermerk | null, sichtung: Sichtungsvermerk): Entwurf {
  const vermerke = sichtung.vermerke?.trim() ?? "";
  const neu = {
    zeitpunkt: sichtung.zeitpunkt,
    handzeichen: sichtung.handzeichen.trim(),
    verteiler: sichtung.verteiler.map((e) => ({ stelle: e.stelle.trim(), kopie: e.kopie })),
    ...(vermerke === "" ? {} : { vermerke }),
  };
  return { typ: "NachrichtGesichtet", nutzlast: { nachrichtId }, vorher, neu };
}

/**
 * „Gelesen" für eine Stelle (§5 „Verteilung und Kenntnisnahme"). Ohne
 * Vorwert-Prüfung und ohne Undo: Gelesen ist gelesen, und zwei Arbeitsplätze
 * derselben Stelle, die nacheinander aufschlagen, haben beide recht.
 */
export function kenntnisGenommen(nachrichtId: string, stelle: string, vermerk: Zeitvermerk, vorher: Zeitvermerk | null = null): Entwurf {
  return {
    typ: "NachrichtKenntnisGenommen",
    nutzlast: { nachrichtId, stelle },
    vorher,
    neu: { zeitpunkt: vermerk.zeitpunkt, handzeichen: vermerk.handzeichen.trim() },
  };
}

/**
 * „Lesen" an einer Zeile: die Kenntnisnahme für jede Stelle der Sitzung, die
 * im Verteiler steht und noch nicht gelesen hat. Leer, wenn keine.
 */
export function kenntnisFuerStellen(zeile: Nachrichtenzeile, stellen: readonly string[], vermerk: Zeitvermerk): Entwurf[] {
  return zeile.verteiler
    .filter((marke) => stellen.includes(marke.stelle) && !marke.gelesen)
    .map((marke) => kenntnisGenommen(zeile.id, marke.stelle, vermerk));
}

/** „Erledigt" für eine Stelle; `vorher` ist, was die Zeile zeigte. */
export function erledigt(nachrichtId: string, stelle: string, vorher = false): Entwurf {
  return { typ: "NachrichtErledigt", nutzlast: { nachrichtId, stelle }, vorher: vorher ? true : null, neu: true };
}

/** „Erledigung zurück" für eine Stelle. */
export function erledigungZurueck(nachrichtId: string, stelle: string): Entwurf {
  return { typ: "ErledigungDerNachrichtZurueckgenommen", nutzlast: { nachrichtId, stelle }, vorher: true, neu: false };
}

/** Die Rücknahme einer Fehlanlage; der Grund ist Pflicht, die Nachricht bleibt sichtbar. */
export function nachrichtZurueckziehen(nachrichtId: string, grund: string): Entwurf {
  return { typ: "NachrichtZurueckgezogen", nutzlast: { nachrichtId }, vorher: null, neu: true, grund: grund.trim() };
}

/** Das Schema des Rahmenwerts `neu` je Art der Form (a), soweit es eines gibt. */
const NEU_SCHEMA: Readonly<Record<string, { safeParse: (wert: unknown) => { success: boolean } }>> = {
  NachrichtGesichtet: schemata.zSichtung,
  NachrichtKenntnisGenommen: schemata.zZeitvermerk,
  NachrichtAngenommen: schemata.zZeitvermerk,
  NachrichtUebermittlungVorgeschlagen: schemata.zVorschlag,
  NachrichtBefoerdert: schemata.zMittelvermerk,
  NachrichtNachgewiesen: schemata.zNachweis,
  // Der Eingangsschritt des LdF (additiv, 2026-11-17).
  NachrichtWeitergegeben: schemata.zWeitergabe,
};

/**
 * Prüft einen Entwurf des Nachrichtenvordrucks gegen die Schemata der Domäne:
 * die Nutzlast gegen den Katalog, den Wert `neu` gegen das Schema des
 * Vermerks. `null` als `neu` ist die Rücknahme auf „leer" und gilt. Liefert
 * den ersten Fehler als Satz, sonst `undefined`.
 */
export function nachrichtenentwurfFehler(entwurf: Entwurf): string | undefined {
  const eintrag = KATALOG.get(entwurf.typ);
  if (eintrag === undefined) return `Unbekannte Ereignisart ${entwurf.typ}.`;
  const nutzlast = eintrag.schema.safeParse(entwurf.nutzlast ?? {});
  if (!nutzlast.success) {
    const erste = nutzlast.error.issues[0];
    return `Die Angaben passen nicht zum Vordruck: ${erste === undefined ? "" : `${erste.path.join(".")} — ${erste.message}`}`;
  }
  const schema = NEU_SCHEMA[entwurf.typ];
  if (schema === undefined || entwurf.neu === null || entwurf.neu === undefined) return undefined;
  return schema.safeParse(entwurf.neu).success ? undefined : `Der Vermerk für ${entwurf.typ} ist nicht vollständig.`;
}
