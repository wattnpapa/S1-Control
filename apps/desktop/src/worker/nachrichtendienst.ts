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

import { FERNMELDER_STANDARD, STELLE_FMZ, eigeneFernmelder, istFernmelderstelle, ldfStationAn, kennzahlen, projektion, type Nachrichtenzeile, type Zustand } from "@s1/domaene";

import type { Gegenstelle, Nachrichtenansicht, Nachrichtenlage, OffeneNachrichten, Peer, Ruf, Rufgruppenwahl, Sitzungsstellen } from "../kontrakt/index.js";
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
  /** Additiv (R2-LdF P3-3): Ist ein LdF besetzt? Nur `false` setzt an Zeilen beim LdF `ldfNichtBesetzt`. */
  readonly ldfBesetzt?: boolean;
  /** Additiv (R2-LdF P3-4, 2026-11-21): die Wahl „Fernmelder“ im Vorschlag des LdF (`fernmelderwahlAusPraesenz`). */
  readonly fernmelder?: Fernmelderwahl;
}

/** Ein Platz der Präsenz, soweit die Wahl der Fernmelder ihn braucht. */
type Fernmelderplatz = { readonly veraltet: boolean; readonly anzeigename: string; readonly stellen?: readonly string[] | undefined };

/** Die Wahl „Fernmelder“ im Vorschlag des LdF und wer die Fernmelder gerade besetzt. */
export interface Fernmelderwahl {
  /** Fm1 bis Fm3, danach die Anzeigenamen der Plätze, die noch den Altwert FMZ führen. */
  readonly fernmelder: readonly string[];
  /** Je Fernmelder („Fm2“) die Anzeigenamen der lebenden Plätze mit dieser Stelle. */
  readonly besetzung: Readonly<Record<string, string>>;
}

/**
 * Die Fernmelder zur Wahl (R2-LdF P3-4, geändert 2026-11-21): Der LdF teilt
 * eine Nachricht einem der Fernmelder Fm1 bis Fm3 zu, und der Name ist die
 * Stelle des Platzes, nicht sein Anzeigename — nur so findet der Fernmelder
 * „seine“ Nachricht in der Warteschlange. Wer die Stelle besetzt, steht dabei.
 * Plätze mit dem Altwert FMZ (ein älterer Client) kommen mit ihrem
 * Anzeigenamen dazu, wie bisher. Ein schon gespeicherter anderer Name bleibt
 * in der Auswahl der Maske stehen (`fernmelderwahl`).
 */
export function fernmelderwahlAusPraesenz(eigeneStellen: readonly string[] | undefined, eigenerName: string, peers: readonly Fernmelderplatz[]): Fernmelderwahl {
  const plaetze: readonly Fernmelderplatz[] = [{ veraltet: false, anzeigename: eigenerName, stellen: eigeneStellen }, ...peers].filter((p) => !p.veraltet && p.anzeigename.trim() !== "");
  const besetzung: Record<string, string> = {};
  for (const platz of plaetze) {
    for (const name of eigeneFernmelder(platz.stellen)) {
      const bisher = besetzung[name];
      besetzung[name] = bisher === undefined ? platz.anzeigename.trim() : `${bisher}, ${platz.anzeigename.trim()}`;
    }
  }
  const alt = plaetze.filter((p) => p.stellen?.includes(STELLE_FMZ) === true).map((p) => p.anzeigename.trim());
  const altSortiert = [...new Set(alt)].sort((a, b) => a.localeCompare(b, "de"));
  return { fernmelder: [...FERNMELDER_STANDARD, ...altSortiert.filter((n) => !(FERNMELDER_STANDARD as readonly string[]).includes(n))], besetzung };
}

/** R2-LdF P3-3: Zeilen beim LdF tragen „LdF nicht besetzt“, wenn die Präsenz keinen kennt. */
function mitLdfBesetzung(zeilen: readonly Nachrichtenzeile[], ldfBesetzt: boolean | undefined): readonly Nachrichtenzeile[] {
  if (ldfBesetzt !== false) return zeilen;
  return zeilen.map((z) => (z.laufzustand === "VOR_LDF" ? { ...z, ldfNichtBesetzt: true } : z));
}

/**
 * Review Runde 2: Zeilen, die einem Fernmelder zugeteilt sind, den gerade
 * niemand besetzt, tragen `fernmelderNichtBesetzt` — der Verfasser las sonst
 * „bei Fm2“ und glaubte, es werde übertragen.
 */
function mitFernmelderBesetzung(zeilen: readonly Nachrichtenzeile[], besetzung: Readonly<Record<string, string>> | undefined): readonly Nachrichtenzeile[] {
  if (besetzung === undefined) return zeilen;
  return zeilen.map((z) => {
    const fm = z.vorschlag?.fernmelder.trim() ?? "";
    return z.laufzustand === "VOR_FMZ" && /^Fm\d$/u.test(fm) && besetzung[fm] === undefined ? { ...z, fernmelderNichtBesetzt: true } : z;
  });
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

/**
 * Die Einheiten der Lage nach Namen — die Gegenstellen, die der Funkplan als
 * Kontakt kennt; mit ihrer geltenden Hauptrufgruppe als Vorbelegung und
 * ihrem Funkrufnamen.
 */
export function gegenstellen(zustand: Zustand): readonly Gegenstelle[] {
  return kennzahlen
    .einheitenDerLage(zustand)
    .flatMap((e) => {
      if (typeof e.bezeichnung.wert !== "string" || e.bezeichnung.wert === "") return [];
      const gruppe = e.rufgruppeId?.wert;
      const gilt = typeof gruppe === "string" && projektion.rufgruppeGilt(zustand.rufgruppen?.[gruppe]);
      const funkrufname = kennzahlen.funkrufnameDerEinheit(zustand, e);
      return [{ einheitId: e.id, name: e.bezeichnung.wert, ...(gilt ? { rufgruppeId: gruppe } : {}), ...(funkrufname === "" ? {} : { funkrufname }) }];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Die geltenden Rufgruppen zur Wahl, in der Ordnung des Funkplans. */
export function rufgruppenwahl(zustand: Zustand): readonly Rufgruppenwahl[] {
  return projektion.rufgruppenAuswahl(zustand).map((r) => ({ rufgruppeId: r.wert, name: r.titel }));
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
  const offenumfeld = { ...(umfeld.sichterBesetzt === undefined ? {} : { sichterBesetzt: umfeld.sichterBesetzt }), ...(umfeld.ldfBesetzt === undefined ? {} : { ldfBesetzt: umfeld.ldfBesetzt }) };
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
  const zeilen = umfeld.bezug === undefined ? ausschnitt.zeilen : projektion.mitTagebuchbezug(ausschnitt.zeilen, umfeld.bezug);
  return {
    lageZeiger: umfeld.lageZeiger,
    ...ausschnitt,
    zeilen: mitFernmelderBesetzung(mitLdfBesetzung(zeilen, umfeld.ldfBesetzt), umfeld.fernmelder?.besetzung),
    ...(umfeld.fernmelder === undefined ? {} : { fernmelder: umfeld.fernmelder.fernmelder, fernmelderbesetzung: umfeld.fernmelder.besetzung }),
    jetzt,
    anschriften: anschriften(zustand),
    gegenstellen: gegenstellen(zustand),
    rufgruppen: rufgruppenwahl(zustand),
    // N2: Vorbelegung und Warnung der Nachweisungsnummer (§6, §9), die Zahlen der Chips (§6).
    naechsteNummer: projektion.naechsteNachweisnummer(zustand),
    vergebeneNummern: vergebeneNummern(zustand),
    zaehlung: projektion.nachrichtenZaehlung(zustand, stellen, jetzt, offenumfeld),
    // Additiv (LdF P2-2): die Lücken der Nummernfolge für die Nachweisung.
    nummernluecken: projektion.nummernluecken(ausschnittOhneFilter(zustand)),
    // Additiv (R2-LdF P1-2 alt, P2-3): die Karte „Ohne Nummer“ der FmZ führt Eingänge und Ausgänge.
    ...(ruf.sicht === "fmz" ? { ohneNummer: projektion.ohneNummerZeilen(projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung", jetzt }).zeilen) } : {}),
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
): (T & { sichtungAuchAusgang?: boolean; fmzSchwelleMinuten?: number; ldfStation?: boolean; sichterSchwelleBlitzMinuten?: number; sichterSchwelleSofortMinuten?: number }) | undefined {
  if (stammdaten === undefined) return undefined;
  const sichtung = zustand.einsatz?.sichtungAuchAusgang?.wert;
  const schwelle = zustand.einsatz?.fmzSchwelleMinuten?.wert;
  // Additiv (2026-11-17): der LdF als Station; das Blatt zeigt danach die Sicht „LdF".
  // 2026-11-22: der geltende Wert — ohne Parameter ist der LdF Station.
  const ldf = ldfStationAn(zustand);
  // Additiv (R2-FM P2-5, R2-Si P2-2): die Schwellen vor dem Sichter je Vorrang.
  const blitz = zustand.einsatz?.sichterSchwelleBlitzMinuten?.wert;
  const sofort = zustand.einsatz?.sichterSchwelleSofortMinuten?.wert;
  return {
    ...stammdaten,
    ...(typeof sichtung === "boolean" ? { sichtungAuchAusgang: sichtung } : {}),
    ...(typeof schwelle === "number" ? { fmzSchwelleMinuten: schwelle } : {}),
    ldfStation: ldf,
    ...(typeof blitz === "number" ? { sichterSchwelleBlitzMinuten: blitz } : {}),
    ...(typeof sofort === "number" ? { sichterSchwelleSofortMinuten: sofort } : {}),
  };
}

let gemerkt: { zustand: Zustand; minute: number; stellen: string; zahlen: Nachrichtenlage } | undefined;
let gemerkteHinweise: { zustand: Zustand; hinweise: readonly { art: string; feldpfad: string; text?: string }[] } | undefined;

/**
 * Art, Pfad und — an Nachrichten — der Satz der ersten Konflikthinweise
 * (FM P2-6, R2-ETB P2-4, R2-SGL P2-2), gemerkt je Zustand: Das Lagebild
 * entsteht in jedem Takt, die Zeilen der Nachrichten nur bei Bedarf.
 */
export function konflikthinweiseFuerLagebild(zustand: Zustand, hoechstens: number): readonly { art: string; feldpfad: string; text?: string }[] {
  if (gemerkteHinweise?.zustand === zustand) return gemerkteHinweise.hinweise;
  const erste = zustand.hinweise.slice(0, hoechstens);
  const anNachricht = erste.some((h) => h.feldpfad.startsWith("nachricht/"));
  const zeilen = anNachricht ? new Map(ausschnittOhneFilter(zustand).map((z) => [z.id, z])) : new Map<string, Nachrichtenzeile>();
  const hinweise = erste.map((h) => {
    const text = anNachricht ? projektion.konflikthinweisText(h, zeilen) : undefined;
    return { art: h.art, feldpfad: h.feldpfad, ...(text === undefined ? {} : { text }) };
  });
  gemerkteHinweise = { zustand, hinweise };
  return hinweise;
}
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
export function nachrichtenFuerLagebild(zustand: Zustand, stellen: readonly string[], jetztMs: number, sichterBesetzt = true, ldfBesetzt = true): Nachrichtenlage {
  const minute = Math.floor(jetztMs / MINUTE_MS);
  const schluessel = `${stellen.join("\u0000")}\u0001${String(sichterBesetzt)}\u0001${String(ldfBesetzt)}`;
  if (gemerkt?.zustand === zustand && gemerkt.minute === minute && gemerkt.stellen === schluessel) return gemerkt.zahlen;
  // Mit Vorrang offen je Stelle der Sitzung (SGL P1-7); die FmZ zählt den Sichter nur ohne Sichter.
  const zahlen = projektion.nachrichtenlage(zustand, stellen, new Date(minute * MINUTE_MS).toISOString(), { sichterBesetzt, ldfBesetzt });
  const { nummernluecken, ...zahlenOhneLuecken } = zahlen;
  const fertig: Nachrichtenlage = { ...zahlenOhneLuecken, ...(nummernluecken === undefined ? {} : { nummernluecken: [...nummernluecken] }) };
  gemerkt = { zustand, minute, stellen: schluessel, zahlen: fertig };
  return fertig;
}

/**
 * Die besetzten Stellen (R2-FaBe P0-3): die eigene Sitzung und jeder lebende
 * Arbeitsplatz der Präsenz, ohne Doppelte, nach Codepunkt geordnet — eine
 * feste Ordnung, damit das Lagebild-Delta nur bei einer Änderung reist.
 * Eine veraltete oder abgemeldete Präsenz zählt nicht (§5 „Ersatzsichter“).
 */
export function besetzteStellen(
  eigene: readonly string[] | undefined,
  peers: readonly { readonly veraltet: boolean; readonly stellen?: readonly string[] | undefined }[],
): readonly string[] {
  const alle = [...(eigene ?? []), ...peers.filter((p) => !p.veraltet).flatMap((p) => p.stellen ?? [])];
  return [...new Set(alle)].sort();
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
  const schritt = projektion.ldfSchrittDer(zeile);
  const ausgang = zeile.richtungKurz === "A" && !zeile.gespraechsnotiz && (zeile.laufzustand === "VOR_FMZ" || schritt === "zuteilung");
  if (ausgang) return stellen.find((s) => istFernmelderstelle(s) || s === "LDF");
  // R2-Si P1-1, R2-LdF P1-2: Ein Eingang mit Vorrang beim LdF meldet sich dem LdF —
  // bisher erst nach der Weitergabe beim Sichter, und ein Blitz konnte beim LdF liegen.
  // 2026-11-21: ebenso der beförderte Ausgang, der zur Nachweisung und Weitergabe beim LdF liegt.
  if (schritt === "weitergabe") return stellen.includes("LDF") ? "LDF" : undefined;
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
    // Review 2026-11-21: Der beförderte Ausgang meldet sich beim LdF ein zweites Mal — eigener Schlüssel je Phase.
    const phase = projektion.ldfSchrittDer(zeile) === "weitergabe" && zeile.richtung === "AUSGANG" ? "/weitergabe" : "";
    if (schlange !== undefined) ergebnis.push({ schluessel: `${zeile.id}/schlange/${schlange}${phase}`, zeile, stelle: schlange, ausloeser: zeile.clientId });
    if (zeile.sichtung === undefined) continue;
    const sichter = zustand.nachrichten[zeile.id]?.sichtung?.hlc.clientId;
    for (const marke of zeile.verteiler) {
      // R2-FaBe P1-4: Der Verfasser bekommt zu seinem eigenen Ausgang keinen Vorranghinweis.
      if (marke.eigenerAusgang === true) continue;
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
