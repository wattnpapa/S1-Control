/**
 * Was an Nachrichten offen ist — für eine Stelle, für die Übergabe, für den
 * Abschluss des Einsatzes und für die Nummernfolge (additiv, 2026-11-17).
 *
 * Gründe aus den Audits zum 4-fach-Vordruck:
 *
 *  * SGL P1-7 / Sichter-Audit: „mit Vorrang offen" zählte jede Nachricht,
 *    deren Laufzustand nicht ERLEDIGT war — auch die, die die eigene Stelle
 *    längst erledigt hatte. Gezählt wird jetzt je Stelle der Sitzung: eine
 *    eigene Kopie, die nicht erledigt ist; ein eigener Ausgang, der die FmZ
 *    noch nicht verlassen hat; die Warteschlange der FmZ für die FmZ, die des
 *    LdF für den LdF und die des Sichters für den Sichter (die FmZ nur,
 *    solange kein Sichter besetzt ist — sie verteilt dann selbst).
 *  * ETB P1-6: „Einsatz beenden" nannte offene Nachrichten nicht.
 *  * LdF P2-2 / ETB P2-2: Lücken in der Nummernfolge fielen nicht auf.
 */

import { hatFernmelderstelle } from "../fernmelderstellen.js";
import { haengtBeimLdf, ldfSchrittDer, standDerZeile } from "./nachrichtenstand.js";
import { vergleicheNachrichten, type Nachrichtenzeile } from "./nachrichtenzeile.js";

/** Die bekannten Stellen der Stationen im Laufweg (§4); die Fernmelder erkennt `hatFernmelderstelle`. */
const LDF = "LDF";
const SICHTER = "SICHTER";

/** Was die Zählung neben den Stellen wissen darf; Ring 2 kennt keine Präsenz. */
export interface Offenumfeld {
  /** Ist ein Sichter besetzt? Fehlt = ja (die FmZ zählt dann den Sichter nicht mit). */
  readonly sichterBesetzt?: boolean;
  /** Additiv (Review 2026-11-21): Ist ein LdF besetzt? Nur `false` zählt den hängenden Ausgang beim LdF für die FmZ. */
  readonly ldfBesetzt?: boolean;
}

/** Ein Ausgang oder eine Gesprächsnotiz, die eine der Stellen verfasst hat. */
function eigenerAusgang(zeile: Nachrichtenzeile, stellen: readonly string[]): boolean {
  if (zeile.richtung !== "AUSGANG" && !zeile.gespraechsnotiz) return false;
  return stellen.includes(zeile.absender) || (zeile.funktion !== undefined && stellen.includes(zeile.funktion));
}

/** Liegt die Zeile in einer Warteschlange, die eine der Stellen bedient? */
function inEigenerWarteschlange(zeile: Nachrichtenzeile, stellen: readonly string[], umfeld: Offenumfeld): boolean {
  const fmz = hatFernmelderstelle(stellen);
  const { laufstand, ohneNummer } = standDerZeile(zeile);
  switch (laufstand) {
    case "vorFmz":
    case "angenommen":
      return fmz;
    case "beimLdf":
      // Einen Ausgang vor der Zuteilung befördert die FmZ nach der Ersatzregel selbst (§5).
      return stellen.includes(LDF) || (fmz && (ldfSchrittDer(zeile) === "zuteilung" || haengtBeimLdf(zeile, umfeld.ldfBesetzt)));
    case "vorSichter":
      return stellen.includes(SICHTER) || (fmz && umfeld.sichterBesetzt === false);
    default:
      // Befördert, aber ohne Nummer: Die Nachweisung ist Sache der FmZ (SGL P1-6).
      return fmz && ohneNummer;
  }
}

/**
 * Ist die Nachricht für diese Stellen noch offen? Ohne Stellen (ein
 * Arbeitsplatz ohne Angabe) gilt der Stand der Nachricht selbst: offen, bis
 * sie erledigt oder mit Nummer befördert ist.
 */
export function offenFuerStellen(zeile: Nachrichtenzeile, stellen: readonly string[], umfeld: Offenumfeld = {}): boolean {
  if (zeile.zurueckgezogen) return false;
  const { laufstand, ohneNummer } = standDerZeile(zeile);
  if (stellen.length === 0) return laufstand !== "erledigt" && !(laufstand === "befoerdert" && !ohneNummer);
  if (zeile.verteiler.some((marke) => stellen.includes(marke.stelle) && !marke.erledigt)) return true;
  if (eigenerAusgang(zeile, stellen) && (laufstand === "vorFmz" || laufstand === "angenommen" || laufstand === "beimLdf")) return true;
  return inEigenerWarteschlange(zeile, stellen, umfeld);
}

/**
 * Die Karte „Ohne Nummer“ der FmZ (R2-LdF P1-2 alt, P2-3): beförderte
 * Ausgänge **und** aufgenommene Eingänge ohne Nummer der Nachweisung, nicht
 * zurückgezogen. Ein Eingang ohne Nummer ging bisher ohne Spur am LdF und am
 * Sichter vorbei; die Karte führte nur Ausgänge. Geordnet nach Vorrang und
 * Eingang wie jede Liste (§5).
 */
export function ohneNummerZeilen(zeilen: readonly Nachrichtenzeile[]): Nachrichtenzeile[] {
  return zeilen
    // Den beförderten Ausgang beim LdF weist der LdF bei der Weitergabe nach (2026-11-21), nicht die FmZ.
    .filter((z) => !z.zurueckgezogen && z.nummer === undefined && !(z.richtung === "AUSGANG" && ldfSchrittDer(z) === "weitergabe") && (z.befoerderung !== undefined || (z.richtung === "EINGANG" && z.aufnahme !== undefined)))
    .sort(vergleicheNachrichten);
}

/**
 * Die fehlenden Nummern zwischen 1 und der höchsten vergebenen (LdF P2-2,
 * ETB P2-2). Zurückgezogene zählen als vergeben — ihre Nummer steht auf
 * Papier. Höchstens `grenze` Einträge, damit ein Zahlendreher („500" statt
 * „5") das Band nicht mit Hunderten Zahlen füllt; die Ausgabe fasst Folgen
 * ohnehin zu Spannen zusammen.
 */
export function nummernluecken(zeilen: readonly Pick<Nachrichtenzeile, "nummer">[], grenze = 1000): readonly number[] {
  const vergeben = new Set<number>();
  for (const zeile of zeilen) if (zeile.nummer !== undefined && zeile.nummer > 0) vergeben.add(zeile.nummer);
  const hoechste = Math.max(0, ...vergeben);
  const luecken: number[] = [];
  for (let nummer = 1; nummer < hoechste && luecken.length < grenze; nummer += 1) {
    if (!vergeben.has(nummer)) luecken.push(nummer);
  }
  return luecken;
}

/** „3, 7, 10–49" — die Lücken als Text; „lückenlos" ohne Lücke. */
export function nummernlueckenText(luecken: readonly number[]): string {
  if (luecken.length === 0) return "lückenlos";
  const teile: string[] = [];
  let anfang = luecken[0] as number;
  let ende = anfang;
  const schliesse = (): void => {
    teile.push(ende - anfang >= 2 ? `${String(anfang)}–${String(ende)}` : ende === anfang ? String(anfang) : `${String(anfang)}, ${String(ende)}`);
  };
  for (const nummer of luecken.slice(1)) {
    if (nummer === ende + 1) {
      ende = nummer;
      continue;
    }
    schliesse();
    anfang = nummer;
    ende = nummer;
  }
  schliesse();
  return teile.join(", ");
}

/** Was beim Beenden des Einsatzes an Nachrichten offen ist (ETB P1-6). */
export interface OffeneNachrichten {
  readonly vorFmz: number;
  readonly beimLdf: number;
  readonly vorSichter: number;
  /** Hinter der FmZ, aber ohne Nummer der Nachweisung. */
  readonly ohneNummer: number;
  /** Sofort oder Blitz, gesichtet, mindestens eine Stelle des Verteilers hat sie weder gelesen noch erledigt. */
  readonly ungelesenMitVorrang: number;
}

/** Die fünf Zahlen für die Rückfrage „Einsatz beenden" — für alle Stellen, nicht nur die der Sitzung. */
export function offeneNachrichten(zeilen: readonly Nachrichtenzeile[]): OffeneNachrichten {
  const zahlen = { vorFmz: 0, beimLdf: 0, vorSichter: 0, ohneNummer: 0, ungelesenMitVorrang: 0 };
  for (const zeile of zeilen) {
    if (zeile.zurueckgezogen) continue;
    const { laufstand, ohneNummer } = standDerZeile(zeile);
    if (laufstand === "vorFmz" || laufstand === "angenommen") zahlen.vorFmz += 1;
    if (laufstand === "beimLdf") zahlen.beimLdf += 1;
    if (laufstand === "vorSichter") zahlen.vorSichter += 1;
    if (ohneNummer) zahlen.ohneNummer += 1;
    if (zeile.vorrangstufe < 2 && zeile.verteiler.some((m) => !m.gelesen && !m.erledigt)) zahlen.ungelesenMitVorrang += 1;
  }
  return zahlen;
}

/**
 * Der Abschlussvermerk beim Beenden des Einsatzes (R2-LdF P2-7, R2-ETB P2-2):
 * „Einsatz beendet mit offenen Nachrichten: 1 vor der FmZ, 2 ohne Nummer,
 * 1 mit Vorrang ungelesen; fehlende Nummern: 3, 7“. Die Zahlen standen nur im
 * Dialog „Einsatz beenden“; wer die Akte später liest, erfuhr nicht, was offen
 * blieb. `undefined`, wenn nichts offen ist — dann braucht es keinen Vermerk.
 */
export function abschlussvermerk(offen: OffeneNachrichten, luecken: readonly number[]): string | undefined {
  const teile = [
    [offen.vorFmz, "vor der FmZ"],
    [offen.beimLdf, "beim LdF"],
    [offen.vorSichter, "vor dem Sichter"],
    [offen.ohneNummer, "ohne Nummer"],
    [offen.ungelesenMitVorrang, "mit Vorrang ungelesen"],
  ]
    .filter(([anzahl]) => (anzahl as number) > 0)
    .map(([anzahl, wort]) => `${String(anzahl)} ${String(wort)}`);
  if (teile.length === 0 && luecken.length === 0) return undefined;
  const offenTeil = teile.length === 0 ? "keine Nachricht offen" : `offene Nachrichten: ${teile.join(", ")}`;
  const lueckenTeil = luecken.length === 0 ? "" : `; fehlende Nummern: ${nummernlueckenText(luecken)}`;
  return `Einsatz beendet, ${offenTeil}${lueckenTeil}`;
}
