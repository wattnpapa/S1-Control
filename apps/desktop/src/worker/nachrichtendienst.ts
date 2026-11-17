/**
 * Die Nachrichten im Worker (KONZEPT-NACHRICHTEN.md §4, §6, §9) — die Naht
 * zwischen Ruf, Lagebild, Präsenz und Ring 2.
 *
 * Gerechnet wird in `projektion.nachrichtenausschnitt` und
 * `projektion.nachrichtenlage`; hier stehen nur die Dinge, die der Worker
 * weiß und Ring 2 nicht: die Stellen und das Handzeichen der Sitzung
 * (Entscheidung 3), die Uhr, die eigene Kennung und die Anschriften zur
 * Auswahl in der Maske.
 *
 * Dazu der Hinweis bei Vorrang (Entscheidung 6, §6 „Benachrichtigung"): Trifft
 * eine gesichtete Nachricht mit Sofort oder Blitz für eine Stelle der Sitzung
 * ein, schickt der Worker die Mitteilung `hinweis` mit Stufe „warnung"; ohne
 * Vorrang steigt nur die Zahl im Band. Was beim Öffnen schon da war, ist kein
 * Eintreffen und meldet sich nicht.
 *
 * Additiv (Audit Fernmelder P1-5, Sichter P1-1): Auch die Warteschlangen
 * melden sich. Ein Ausgang mit Vorrang, der vor der FmZ oder beim LdF
 * eintrifft, gibt einem Arbeitsplatz mit Stelle FMZ oder LDF den Hinweis
 * (und bei Blitz den Ton); ein Eingang mit Vorrang vor dem Sichter ebenso dem
 * Arbeitsplatz mit Stelle SICHTER. Wer die Nachricht selbst aufgegeben oder
 * aufgenommen hat, weiß es und wird nicht gemeldet.
 */

import { kennzahlen, projektion, type Nachrichtenzeile, type Zustand } from "@s1/domaene";

import type { Gegenstelle, Nachrichtenansicht, Nachrichtenlage, OffeneNachrichten, Peer, Ruf, Sitzungsstellen } from "../kontrakt/index.js";
import { funkplanbereiche } from "./funkplanprojektion.js";

const MINUTE_MS = 60_000;

/** Was der Worker neben dem Zustand mitgibt. */
export interface Nachrichtenumfeld {
  readonly lageZeiger: number;
  readonly jetztMs: number;
  readonly clientId: string;
  readonly sitzung: Sitzungsstellen | undefined;
  /**
   * Additiv: Ist ein Sichter in der Präsenz? Die FmZ zählt Eingänge vor dem
   * Sichter nur dann als offen, wenn keiner da ist (Sichter-Audit). Fehlt = ja.
   */
  readonly sichterBesetzt?: boolean;
  /**
   * Additiv (ETB P1-2, P1-3): ETB-Nummern und Gründe des Zurückziehens aus
   * den Ereignissen — Ring 2 kennt nur den Zustand.
   */
  readonly bezug?: projektion.Tagebuchbezug;
}

/** Stellen aus einer Eingabe: geputzt, ohne Leere und ohne Doppelte, in der gegebenen Folge. */
export function geputzteStellen(stellen: readonly string[] | undefined): readonly string[] {
  return [...new Set((stellen ?? []).map((s) => s.trim()).filter((s) => s !== "" && !s.includes("/")))];
}

/** Stellen und Handzeichen der Sitzung aus den Angaben eines Rufs. */
export function sitzungAus(stellen: readonly string[] | undefined, handzeichen: string | undefined): Sitzungsstellen {
  const hz = handzeichen?.trim() ?? "";
  return { stellen: geputzteStellen(stellen), ...(hz === "" ? {} : { handzeichen: hz }) };
}

/**
 * Die Anschriften zur Auswahl (§6): geltende Abschnitte in der Ordnung des
 * Baums, dann die Einheiten der Lage nach Namen. Freitext bleibt in der Maske
 * erlaubt — die Gegenstelle draußen steht in keiner Liste.
 */
export function anschriften(zustand: Zustand): readonly string[] {
  const abschnitte = funkplanbereiche(zustand).map((b) => b.name);
  const einheiten = kennzahlen
    .einheitenDerLage(zustand)
    .map((e) => (typeof e.bezeichnung.wert === "string" ? e.bezeichnung.wert : ""))
    .filter((name) => name !== "")
    .sort((a, b) => a.localeCompare(b, "de"));
  return [...new Set([...abschnitte, ...einheiten])];
}

/** Die Einheiten der Lage nach Namen — die Gegenstellen, die der Funkplan als Kontakt kennt. */
export function gegenstellen(zustand: Zustand): readonly Gegenstelle[] {
  return kennzahlen
    .einheitenDerLage(zustand)
    .flatMap((e) => (typeof e.bezeichnung.wert === "string" && e.bezeichnung.wert !== "" ? [{ einheitId: e.id, name: e.bezeichnung.wert }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Das Blatt „Nachrichten" für den Ruf `nachrichtenAnfordern`. */
export function nachrichtenansicht(
  zustand: Zustand,
  ruf: Extract<Ruf, { art: "nachrichtenAnfordern" }>,
  umfeld: Nachrichtenumfeld,
): Nachrichtenansicht {
  // Auf die Minute abgerundet wie im Lagebild (zweiter Durchlauf, Wartezeit):
  // Spalte „Wartet“ und Band rechnen gegen dieselbe Zeit.
  const jetzt = new Date(Math.floor(umfeld.jetztMs / MINUTE_MS) * MINUTE_MS).toISOString();
  const stellen = ruf.stellen === undefined ? (umfeld.sitzung?.stellen ?? []) : geputzteStellen(ruf.stellen);
  const offenumfeld = umfeld.sichterBesetzt === undefined ? {} : { sichterBesetzt: umfeld.sichterBesetzt };
  const ausschnitt = projektion.nachrichtenausschnitt(zustand, {
    sicht: ruf.sicht,
    stellen,
    clientId: umfeld.clientId,
    jetzt,
    ...offenumfeld,
    // Additiv: Kennungsfilter (ETB P0-1) und „meine Sichtungen" (Sichter-Audit).
    ...(ruf.nachrichtId === undefined ? {} : { nachrichtId: ruf.nachrichtId }),
    ...(ruf.nurEigeneSichtungen === undefined ? {} : { nurEigeneSichtungen: ruf.nurEigeneSichtungen }),
    ...(umfeld.sitzung?.handzeichen === undefined ? {} : { handzeichen: umfeld.sitzung.handzeichen }),
    ...(ruf.zustaende === undefined ? {} : { zustaende: ruf.zustaende }),
    ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
    ...(ruf.von === undefined ? {} : { von: ruf.von }),
    ...(ruf.anzahl === undefined ? {} : { anzahl: ruf.anzahl }),
  });
  return {
    lageZeiger: umfeld.lageZeiger,
    ...ausschnitt,
    ...(umfeld.bezug === undefined ? {} : { zeilen: projektion.mitTagebuchbezug(ausschnitt.zeilen, umfeld.bezug) }),
    jetzt,
    anschriften: anschriften(zustand),
    gegenstellen: gegenstellen(zustand),
    // N2: Vorbelegung und Warnung der Nachweisungsnummer (§6, §9), die Zahlen der Chips (§6).
    naechsteNummer: projektion.naechsteNachweisnummer(zustand),
    vergebeneNummern: vergebeneNummern(zustand),
    zaehlung: projektion.nachrichtenZaehlung(zustand, stellen, jetzt, offenumfeld),
    // Additiv (LdF P2-2): die Lücken der Nummernfolge für die Nachweisung.
    nummernluecken: projektion.nummernluecken(ausschnittOhneFilter(zustand)),
  };
}

/** Alle Zeilen (die Nachweisung ist die Sicht ohne Filter). */
function ausschnittOhneFilter(zustand: Zustand): readonly Nachrichtenzeile[] {
  return projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen;
}

/** Was beim Beenden an Nachrichten offen ist (ETB P1-6); fehlt, solange der Einsatz keine führt. */
export function offeneNachrichtenFuerLagebild(zustand: Zustand): OffeneNachrichten | undefined {
  if (zustand.nachrichten === undefined || Object.keys(zustand.nachrichten).length === 0) return undefined;
  return projektion.offeneNachrichten(ausschnittOhneFilter(zustand));
}

/** Die Nummern, die eine Nachricht schon trägt — aufsteigend, ohne Doppelte. */
export function vergebeneNummern(zustand: Zustand): readonly number[] {
  if (zustand.nachrichten === undefined) return [];
  const nummern = projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen.flatMap((z) => (z.nummer === undefined ? [] : [z.nummer]));
  return [...new Set(nummern)].sort((a, b) => a - b);
}

/**
 * Die Stammdaten des Lagebilds mit den Parametern des Nachrichtenwegs
 * (additiv, N2, Entscheidung 8): nur, was im Zustand gesetzt ist — die
 * Maske zeigt sonst die Vorbelegung und schreibt sie nicht ungefragt.
 */
export function mitNachrichtenparametern<T extends object>(
  zustand: Zustand,
  stammdaten: T | undefined,
): (T & { sichtungAuchAusgang?: boolean; fmzSchwelleMinuten?: number; ldfStation?: boolean }) | undefined {
  if (stammdaten === undefined) return undefined;
  const sichtung = zustand.einsatz?.sichtungAuchAusgang?.wert;
  const schwelle = zustand.einsatz?.fmzSchwelleMinuten?.wert;
  // Additiv (2026-11-17): der LdF als Station; das Blatt zeigt danach die Sicht „LdF".
  const ldf = zustand.einsatz?.ldfStation?.wert;
  return {
    ...stammdaten,
    ...(typeof sichtung === "boolean" ? { sichtungAuchAusgang: sichtung } : {}),
    ...(typeof schwelle === "number" ? { fmzSchwelleMinuten: schwelle } : {}),
    ...(typeof ldf === "boolean" ? { ldfStation: ldf } : {}),
  };
}

let gemerkt: { zustand: Zustand; minute: number; stellen: string; zahlen: Nachrichtenlage } | undefined;
let gemerktOffen: { zustand: Zustand; zahlen: OffeneNachrichten | undefined } | undefined;

/**
 * Der Teil des Lagebilds mit den offenen Nachrichten (ETB P1-6), gemerkt je
 * Zustand — das Lagebild entsteht in jedem Takt; leer ohne Nachrichten.
 */
export function offeneNachrichtenTeil(zustand: Zustand): { offeneNachrichten?: OffeneNachrichten } {
  if (gemerktOffen?.zustand !== zustand) gemerktOffen = { zustand, zahlen: offeneNachrichtenFuerLagebild(zustand) };
  return gemerktOffen.zahlen === undefined ? {} : { offeneNachrichten: gemerktOffen.zahlen };
}

/**
 * Die fünf Zahlen fürs Lagebild. Das Lagebild wird in jedem Takt gebaut; die
 * Zahl „über der Schwelle" hängt an der Uhr, eine Minute Auflösung genügt —
 * gemerkt wird deshalb je Zustand, Minute und Stellen wie beim Funk.
 */
export function nachrichtenFuerLagebild(zustand: Zustand, stellen: readonly string[], jetztMs: number, sichterBesetzt = true): Nachrichtenlage {
  const minute = Math.floor(jetztMs / MINUTE_MS);
  const schluessel = `${stellen.join("\u0000")}\u0001${String(sichterBesetzt)}`;
  if (gemerkt?.zustand === zustand && gemerkt.minute === minute && gemerkt.stellen === schluessel) return gemerkt.zahlen;
  // Mit Vorrang offen je Stelle der Sitzung (SGL P1-7); die FmZ zählt den Sichter nur ohne Sichter.
  const zahlen = projektion.nachrichtenlage(zustand, stellen, new Date(minute * MINUTE_MS).toISOString(), { sichterBesetzt });
  const { nummernluecken, ...zahlenOhneLuecken } = zahlen;
  const fertig: Nachrichtenlage = { ...zahlenOhneLuecken, ...(nummernluecken === undefined ? {} : { nummernluecken: [...nummernluecken] }) };
  gemerkt = { zustand, minute, stellen: schluessel, zahlen: fertig };
  return fertig;
}

/** Stellen und Handzeichen aus einer fremden Präsenzdatei — nur, was die Form hat. */
export function peerStellen(praesenz: { readonly stellen?: unknown; readonly handzeichen?: unknown }): Pick<Peer, "stellen" | "handzeichen"> {
  const stellen = Array.isArray(praesenz.stellen) ? praesenz.stellen.filter((s): s is string => typeof s === "string") : undefined;
  const handzeichen = typeof praesenz.handzeichen === "string" && praesenz.handzeichen !== "" ? praesenz.handzeichen : undefined;
  return {
    ...(stellen === undefined || stellen.length === 0 ? {} : { stellen }),
    ...(handzeichen === undefined ? {} : { handzeichen }),
  };
}

/** Ein Hinweis bei Vorrang, wie ihn die Mitteilung `hinweis` trägt. */
export interface Vorranghinweis {
  readonly text: string;
  readonly blitz: boolean;
}

/** „Blitz-Nachricht E 26 für S4: Pumpen eingetroffen". */
export function vorrangtext(zeile: Nachrichtenzeile, stelle: string): string {
  const wort = zeile.vorrangstufe === 0 ? "Blitz" : "Sofort";
  const nummer = zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
  const betreff = zeile.betreff.trim() === "" ? zeile.absender : zeile.betreff;
  return `${wort}-Nachricht ${nummer} für ${projektion.stellenWort(stelle)}: ${betreff}`;
}

interface Treffer {
  readonly schluessel: string;
  readonly zeile: Nachrichtenzeile;
  readonly stelle: string;
  /** Der Arbeitsplatz, dessen eigene Handlung den Treffer erzeugt hat — er wird nicht gemeldet. */
  readonly ausloeser: string | undefined;
}

/**
 * Die Warteschlange, an der eine Stelle dieses Arbeitsplatzes die Zeile
 * sieht (Fernmelder P1-5, Sichter P1-1): FMZ und LDF den Ausgang vor der FmZ
 * oder beim LdF, SICHTER den Eingang vor dem Sichter.
 */
function warteschlangenstelle(zeile: Nachrichtenzeile, stellen: readonly string[]): string | undefined {
  const ausgang = zeile.richtungKurz === "A" && !zeile.gespraechsnotiz && (zeile.laufzustand === "VOR_FMZ" || zeile.laufzustand === "VOR_LDF");
  if (ausgang) return stellen.find((s) => s === "FMZ" || s === "LDF");
  return zeile.laufzustand === "VOR_SICHTER" && stellen.includes("SICHTER") ? "SICHTER" : undefined;
}

/** Mit Vorrang, nicht zurückgezogen: je eigener Stelle des Verteilers und je Warteschlange ein Treffer. */
function treffer(zustand: Zustand, stellen: readonly string[]): Treffer[] {
  if (stellen.length === 0) return [];
  const ergebnis: Treffer[] = [];
  if (zustand.nachrichten === undefined) return [];
  // Die Nachweisung ist die Sicht ohne Filter: alle Zeilen in einem Durchgang.
  for (const zeile of projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen) {
    if (zeile.vorrangstufe === 2 || zeile.zurueckgezogen) continue;
    const schlange = warteschlangenstelle(zeile, stellen);
    if (schlange !== undefined) ergebnis.push({ schluessel: `${zeile.id}/schlange/${schlange}`, zeile, stelle: schlange, ausloeser: zeile.clientId });
    if (zeile.sichtung === undefined) continue;
    const sichter = zustand.nachrichten[zeile.id]?.sichtung?.hlc.clientId;
    for (const marke of zeile.verteiler) {
      if (stellen.includes(marke.stelle)) ergebnis.push({ schluessel: `${zeile.id}/${marke.stelle}`, zeile, stelle: marke.stelle, ausloeser: sichter });
    }
  }
  return ergebnis;
}

/**
 * Merkt sich, welche Vorrangnachrichten für die Stellen der Sitzung schon da
 * waren, und meldet nur, was neu dazukommt. Vor der ersten
 * {@link Vorrangwaechter.grundlinie} meldet er nichts — die Wiederaufnahme
 * beim Öffnen ist kein Eintreffen. Eine Sichtung dieses Arbeitsplatzes
 * meldet sich ebenfalls nicht: Wer selbst verteilt, weiß es.
 */
export class Vorrangwaechter {
  #bekannt: Set<string> | undefined;

  grundlinie(zustand: Zustand, stellen: readonly string[]): void {
    this.#bekannt = new Set(treffer(zustand, stellen).map((t) => t.schluessel));
  }

  neue(zustand: Zustand, stellen: readonly string[], eigeneClientId: string): readonly Vorranghinweis[] {
    const bekannt = this.#bekannt;
    if (bekannt === undefined) return [];
    const hinweise: Vorranghinweis[] = [];
    for (const t of treffer(zustand, stellen)) {
      if (bekannt.has(t.schluessel)) continue;
      bekannt.add(t.schluessel);
      if (t.ausloeser === eigeneClientId) continue;
      hinweise.push({ text: vorrangtext(t.zeile, t.stelle), blitz: t.zeile.vorrangstufe === 0 });
    }
    return hinweise;
  }
}
