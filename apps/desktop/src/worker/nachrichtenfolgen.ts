/**
 * Die Folgeschritte des Nachrichtenwegs (KONZEPT-NACHRICHTEN.md §5, §9,
 * Schnitt N2) — ein Teil von `planeFolgen` in `schreibfolgen.ts`.
 *
 * - **Eingang mit Nummer**: Nimmt die FmZ einen Eingang auf und trägt die
 *   Nummer gleich ein, folgt auf `NachrichtVerfasst` ein
 *   `NachrichtNachgewiesen` (Entscheidung 1 und 2: Die FmZ nummeriert, Eingang
 *   und Ausgang gemeinsam).
 * - **Ersatzsichter und Gesprächsnotiz**: Steht in der Präsenz kein Sichter,
 *   verteilt, wer aufnimmt; die Gesprächsnotiz verteilt ihr Verfasser selbst.
 *   Dann folgt `NachrichtGesichtet` im selben Zug — die Regel aus eStab, nur
 *   dass hier die Präsenz entscheidet statt ein Login (§5 „Ersatzsichter").
 * - **Beförderung an eine Einheit**: Ist die Gegenstelle eine Einheit der
 *   Lage, folgt auf `NachrichtBefoerdert` eine Funkprobe „Kontakt“ — der
 *   Funkplan zeigt dann den letzten Kontakt.
 * - **Befördern verlangt die Annahme** (additiv, Audit LdF P0-1): Trägt der
 *   Entwurf `nachrichtenfolge.annahme` und hat die Nachricht noch keine
 *   Annahme, folgt `NachrichtAngenommen` mit Uhrzeit und Handzeichen der
 *   Beförderung; trägt er `nachweis` und hat sie noch keine Nummer, folgt
 *   `NachrichtNachgewiesen` — so verlässt keine Nachricht die FmZ still ohne
 *   Annahmevermerk oder Nummer.
 * - **Doppelte Nummer**: Wer eine schon vergebene Nummer nachweist, wird
 *   nicht aufgehalten (Papier geht vor), aber der Hinweis sagt es sofort; der
 *   Fold hält `nachweisnummerDoppelt` fest (§9 „zeigen, nicht raten").
 *
 * - **LdF und Kopien nach der Beförderung** (additiv, 2026-11-17): die
 *   Ersatzregel ohne LdF in der Präsenz und die rote und grüne Kopie nach
 *   der Beförderung eines Ausgangs — in `laufwegfolgen.ts`.
 *
 * Die Werte der Folgen kommen aus dem Entwurf (`nachrichtenfolge`), geprüft
 * werden sie wie jeder andere Schritt beim Schreiben (`nachrichtenpruefung.ts`).
 */

import { kanonischeSerialisierung, projektion, type KanonischerWert, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import { nachtragswarnungen } from "./nachtragspruefung.js";
import { rueckzugshinweis } from "./rueckzugshinweis.js";
import { planeBefoerderungsfolgen, planeWeitergabeErsatz, type Laufwegumfeld } from "./laufwegfolgen.js";

/** Was der Worker über die Präsenz weiß und der Zustand nicht. */
export interface Nachrichtenfolgeumfeld extends Laufwegumfeld {
  /** Ein lebender Arbeitsplatz (dieser oder ein anderer) hat die Stelle SICHTER. */
  readonly sichterBesetzt: boolean;
  /**
   * Additiv (R2-FaBe P0-3): Ist die FmZ besetzt? Nur `false` löst den Hinweis
   * beim Aufgeben aus; fehlt die Angabe, weiß der Aufrufer es nicht.
   */
  readonly fmzBesetzt?: boolean;
  /** Additiv (R2-LdF P1-3): die Stellen der Sitzung — ist sie selbst der LdF? */
  readonly stellen?: readonly string[];
  /** Additiv (R2-SGL P2-1, R2-LdF P3-7): die Uhr des Workers für die Prüfung des Papier-Nachtrags; fehlt = keine Zukunftsprüfung. */
  readonly jetztMs?: number;
}

export interface Nachrichtenfolgeplan {
  /**
   * `mitFolgen` (additiv, Fernmelder P2-9): Der Worker plant nach dem
   * Schreiben dieses Folgeschritts dessen eigene Folgen gegen den dann
   * geltenden Zustand — die Beförderung des Papier-Nachtrags bekommt so ihre
   * Kopien und den Kontakt im Funkplan wie eine Beförderung aus der Warteschlange.
   */
  readonly folgen: readonly { readonly entwurf: Ereignisentwurf; readonly hinweis: string; readonly mitFolgen?: boolean }[];
  readonly hinweise: readonly string[];
}

/** Der Hinweis, den der Bediener nach dem Aufnehmen ohne Sichter sieht (§5). */
export const HINWEIS_ERSATZSICHTER = "Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt.";

/**
 * Derselbe Hinweis für die Gesprächsnotiz (Audit SGL P3-19): Ihr Verfasser
 * hat sie „aufgegeben“, nicht „aufgenommen“ — die Maske sagt dort dasselbe Wort.
 */
export const HINWEIS_ERSATZSICHTER_NOTIZ = "Kein Sichter besetzt: Gesprächsnotiz beim Aufgeben verteilt.";

/**
 * Die Hinweise beim Aufgeben und Aufnehmen (Audits Nachrichten Runde 2).
 * R2-FaBe P0-3: Wer aufgibt, erfuhr nicht, ob jemand die FmZ besetzt — die
 * Nachricht konnte unbemerkt liegen.
 */
export const HINWEIS_FMZ_NICHT_BESETZT = "Fernmeldezentrale nicht besetzt: Die Nachricht wartet. Selbst befördern über die Sicht Fernmeldezentrale.";
/** Dasselbe für die Gesprächsnotiz, die „An den Sichter“ geht, ohne Sichter in der Präsenz. */
export const HINWEIS_NOTIZ_OHNE_SICHTER = "Sichter nicht besetzt: Die Gesprächsnotiz wartet. Selbst verteilen über die Sicht Sichter.";
/** R2-LdF P1-2 alt, P2-3: Ein Eingang ohne Nummer lief ohne Spur am LdF und am Sichter vorbei. */
export const HINWEIS_EINGANG_OHNE_NUMMER = "Eingang ohne Nachweisungsnummer: Er steht bei der FmZ unter „Ohne Nummer“, bis er nachgewiesen ist.";
/** R2-LdF P1-3: Ohne Sichter, aber mit LdF als Station und besetzt, sichtet der LdF nach der Weitergabe. */
export const HINWEIS_LDF_SICHTET = "Kein Sichter besetzt: Der Eingang geht zum LdF, der ihn beim Weitergeben selbst verteilt.";
/** Die Weitergabe mit Laufzettel des LdF als Ersatzsichter. */
export const HINWEIS_LDF_VERTEILT = "Kein Sichter besetzt: Der LdF hat beim Weitergeben verteilt.";
/** Die Weitergabe ohne Laufzettel, obwohl kein Sichter da ist. */
export const HINWEIS_WEITERGABE_OHNE_SICHTER = "Kein Sichter besetzt: Der Eingang wartet vor dem Sichter; der LdF oder die FmZ verteilt ihn selbst.";

type Folgewerte = { readonly nachweis?: unknown; readonly sichtung?: unknown; readonly kontaktEinheitId?: unknown; readonly annahme?: unknown; readonly befoerderung?: unknown };

function folgewerte(entwurf: Ereignisentwurf): Folgewerte | undefined {
  const wert = (entwurf as { readonly nachrichtenfolge?: unknown }).nachrichtenfolge;
  return typeof wert === "object" && wert !== null ? (wert as Folgewerte) : undefined;
}

function nummerAus(wert: unknown): number | undefined {
  const nummer = (wert as { nummer?: unknown } | null | undefined)?.nummer;
  return typeof nummer === "number" ? nummer : undefined;
}

/** „E 7 Pumpen eingetroffen" — die Nachrichten, die diese Nummer schon tragen. */
export function nummerVergebenAn(zustand: Zustand, nummer: number, ausser: string): readonly string[] {
  return projektion
    .nachrichtenausschnitt(zustand, { sicht: "nachweisung" })
    .zeilen.filter((z) => z.nummer === nummer && z.id !== ausser)
    .map((z) => `${z.richtungKurz} ${String(nummer)} „${z.betreff === "" ? z.absender : z.betreff}“`);
}

function doppelhinweis(zustand: Zustand, nummer: number | undefined, nachrichtId: string): string | undefined {
  if (nummer === undefined) return undefined;
  const andere = nummerVergebenAn(zustand, nummer, nachrichtId);
  if (andere.length === 0) return undefined;
  return `Die Nummer ${String(nummer)} ist bereits vergeben (${andere.join(", ")}). Die Nachweisung zeigt beide mit Marke; berichtigt wird mit „Nachweisen“ und neuer Nummer.`;
}

function verteilhinweis(umfeld: Nachrichtenfolgeumfeld, gespraechsnotiz: boolean): string {
  if (!umfeld.sichterBesetzt) return gespraechsnotiz ? HINWEIS_ERSATZSICHTER_NOTIZ : HINWEIS_ERSATZSICHTER;
  return gespraechsnotiz ? "Gesprächsnotiz vom Verfasser verteilt." : "Nachricht beim Aufnehmen verteilt.";
}

function ldfStationBesetzt(zustand: Zustand, umfeld: Nachrichtenfolgeumfeld): boolean {
  return zustand.einsatz?.ldfStation?.wert === true && umfeld.ldfBesetzt === true;
}

/**
 * R2-LdF P1-3: Ohne Sichter verteilt beim Aufnehmen sonst die FmZ, und der
 * Eingang lief am LdF vorbei. Ist der LdF Station und besetzt (und nicht
 * diese Sitzung), sichtet er — die Sichtung der FmZ entfällt.
 */
function ldfIstErsatzsichter(zustand: Zustand, nutzlast: Record<string, unknown>, umfeld: Nachrichtenfolgeumfeld): boolean {
  if (umfeld.sichterBesetzt || nutzlast["richtung"] !== "EINGANG" || nutzlast["gespraechsnotiz"] === true || nutzlast["aufnahme"] === undefined) return false;
  return ldfStationBesetzt(zustand, umfeld) && umfeld.stellen?.includes("LDF") !== true;
}

/** Die Hinweise ohne Schreibschritt beim Aufgeben und Aufnehmen (R2-FaBe P0-3, R2-LdF P2-3). */
function anlagehinweise(zustand: Zustand, nutzlast: Record<string, unknown>, werte: Folgewerte | undefined, umfeld: Nachrichtenfolgeumfeld): string[] {
  const hinweise: string[] = [];
  const notiz = nutzlast["gespraechsnotiz"] === true;
  const ausgang = nutzlast["richtung"] === "AUSGANG" && !notiz && werte?.befoerderung === undefined;
  if (ausgang && umfeld.fmzBesetzt === false && !ldfStationBesetzt(zustand, umfeld)) hinweise.push(HINWEIS_FMZ_NICHT_BESETZT);
  if (notiz && werte?.sichtung === undefined && !umfeld.sichterBesetzt) hinweise.push(HINWEIS_NOTIZ_OHNE_SICHTER);
  const aufgenommen = nutzlast["richtung"] === "EINGANG" && !notiz && nutzlast["aufnahme"] !== undefined;
  if (aufgenommen && werte?.nachweis === undefined) hinweise.push(HINWEIS_EINGANG_OHNE_NUMMER);
  return hinweise;
}

function planeAnlage(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Nachrichtenfolgeumfeld): Nachrichtenfolgeplan {
  const roh = folgewerte(entwurf);
  const nutzlast = (entwurf.nutzlast ?? {}) as Record<string, unknown>;
  const nachrichtId = nutzlast["nachrichtId"];
  const ldfSichtet = roh?.sichtung !== undefined && ldfIstErsatzsichter(zustand, nutzlast, umfeld);
  const werte = ldfSichtet && roh !== undefined ? { ...roh, sichtung: undefined } : roh;
  // Ohne LdF in der Präsenz läuft ein Eingang direkt zum Sichter (additiv, 2026-11-17).
  const weitergabe = planeWeitergabeErsatz(zustand, entwurf, umfeld, werte?.sichtung !== undefined);
  const hinweise: string[] = [...anlagehinweise(zustand, nutzlast, werte, umfeld), ...(ldfSichtet ? [HINWEIS_LDF_SICHTET] : [])];
  // R2-SGL P2-1, R2-LdF P3-7: Der Papier-Nachtrag prüft die Zeitfolge — als Warnung, Papier geht vor.
  if ((entwurf as { readonly nachrichtenfolge?: { readonly nachtrag?: unknown } }).nachrichtenfolge?.nachtrag === true) {
    const zeiten = { abfassungszeit: nutzlast["abfassungszeit"], aufnahme: nutzlast["aufnahme"], annahme: werte?.annahme, befoerderung: werte?.befoerderung };
    hinweise.push(...nachtragswarnungen(zeiten, umfeld.jetztMs ?? Number.POSITIVE_INFINITY));
  }
  if (werte === undefined || typeof nachrichtId !== "string") return { folgen: weitergabe === undefined ? [] : [weitergabe], hinweise };
  const folgen: { entwurf: Ereignisentwurf; hinweis: string; mitFolgen?: boolean }[] = [];
  // Fernmelder P2-9: Annahme vor der Nummer, wie die Warteschlange sie schreibt.
  if (werte.annahme !== undefined) {
    folgen.push({ entwurf: { typ: "NachrichtAngenommen", nutzlast: { nachrichtId }, vorher: null, neu: werte.annahme }, hinweis: "Annahme vom Papier eingetragen." });
  }
  if (werte.nachweis !== undefined) {
    const nummer = nummerAus(werte.nachweis);
    folgen.push({
      entwurf: { typ: "NachrichtNachgewiesen", nutzlast: { nachrichtId }, vorher: null, neu: werte.nachweis },
      hinweis: `In der Nachweisung unter Nummer ${nummer === undefined ? "?" : String(nummer)} eingetragen.`,
    });
    const doppelt = doppelhinweis(zustand, nummer, nachrichtId);
    if (doppelt !== undefined) hinweise.push(doppelt);
  }
  if (werte.sichtung !== undefined) {
    folgen.push({
      entwurf: {
        typ: "NachrichtGesichtet",
        nutzlast: { nachrichtId },
        vorher: null,
        neu: werte.sichtung,
        // Das Tagebuch nennt die Sichtung dann „als Ersatzsichter"; die
        // Gesprächsnotiz verteilt ihr Verfasser aus eigenem Recht (Folie 28).
        ...(umfeld.sichterBesetzt || nutzlast["gespraechsnotiz"] === true ? {} : { grund: projektion.GRUND_ERSATZSICHTER }),
      },
      hinweis: verteilhinweis(umfeld, nutzlast["gespraechsnotiz"] === true),
    });
  }
  if (werte.befoerderung !== undefined) {
    folgen.push({ entwurf: { typ: "NachrichtBefoerdert", nutzlast: { nachrichtId }, vorher: null, neu: werte.befoerderung }, hinweis: "Beförderung vom Papier eingetragen.", mitFolgen: true });
  }
  if (weitergabe !== undefined) folgen.push(weitergabe);
  return { folgen, hinweise };
}

/**
 * Die Beförderung an eine Einheit der Lage ist ein Funkkontakt: Der Funkplan
 * zeigt „letzter Kontakt“ aus der jüngsten Funkprobe „Kontakt“. Der Vorwert
 * ist die Probe, die der Zustand zuletzt sah (Rücknahme setzt sie wieder).
 */
function planeKontakt(zustand: Zustand, entwurf: Ereignisentwurf): Nachrichtenfolgeplan {
  const einheitId = folgewerte(entwurf)?.kontaktEinheitId;
  const zeitpunkt = (entwurf.neu as { zeitpunkt?: unknown } | null | undefined)?.zeitpunkt;
  const einheit = typeof einheitId === "string" ? zustand.einheiten[einheitId] : undefined;
  if (typeof einheitId !== "string" || einheit === undefined || einheit.entfernt?.wert === true || typeof zeitpunkt !== "string") return { folgen: [], hinweise: [] };
  const rufgruppeId = einheit.rufgruppeId?.wert;
  const name = typeof einheit.bezeichnung.wert === "string" ? einheit.bezeichnung.wert : einheitId;
  const vorher = einheit.letzteFunkprobe?.KONTAKT?.wert ?? null;
  const neu = { zeitpunkt, ...(typeof rufgruppeId === "string" && rufgruppeId !== "" ? { rufgruppeId } : {}) };
  return {
    folgen: [
      {
        entwurf: { typ: "FunkprobeDurchgefuehrt", nutzlast: { einheitId, ergebnis: "KONTAKT" }, vorher, neu },
        hinweis: `Funkplan: Kontakt mit „${name}“ vermerkt.`,
      },
    ],
    hinweise: [],
  };
}

/**
 * Die Vermerke, die die Beförderungsmaske mitschickt (LdF P0-1): die fehlende
 * Annahme und die fehlende Nummer. Was der Zustand schon trägt, wird nicht
 * überschrieben — ein anderer Fernmelder kann inzwischen angenommen oder
 * nachgewiesen haben.
 */
function planeBefoerderungsvermerke(zustand: Zustand, entwurf: Ereignisentwurf): Nachrichtenfolgeplan {
  const werte = folgewerte(entwurf);
  const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
  if (werte === undefined || typeof nachrichtId !== "string") return { folgen: [], hinweise: [] };
  const n = zustand.nachrichten?.[nachrichtId];
  const folgen: { entwurf: Ereignisentwurf; hinweis: string }[] = [];
  const hinweise: string[] = [];
  if (werte.annahme !== undefined && (n?.annahme?.wert ?? null) === null) {
    folgen.push({ entwurf: { typ: "NachrichtAngenommen", nutzlast: { nachrichtId }, vorher: null, neu: werte.annahme }, hinweis: "Annahme mit Uhrzeit und Handzeichen der Beförderung eingetragen." });
  }
  if (werte.nachweis !== undefined && (n?.nachweis?.wert ?? null) === null) {
    const nummer = nummerAus(werte.nachweis);
    folgen.push({
      entwurf: { typ: "NachrichtNachgewiesen", nutzlast: { nachrichtId }, vorher: null, neu: werte.nachweis },
      hinweis: `In der Nachweisung unter Nummer ${nummer === undefined ? "?" : String(nummer)} eingetragen.`,
    });
    const doppelt = doppelhinweis(zustand, nummer, nachrichtId);
    if (doppelt !== undefined) hinweise.push(doppelt);
  }
  return { folgen, hinweise };
}

/** Der Satz an den zweiten Sichter (§5 „Sichtung"); der Fold hält dazu `vorherPasstNicht`. */
export const HINWEIS_ZWEITE_SICHTUNG = "Die Nachricht war inzwischen anders gesichtet: Beide Verteiler gelten, bis eine Nachsichtung bereinigt.";

/**
 * R2-Si P1-2: Der Vermerk ist die Handlungsanweisung des Sichters; der zweite
 * Sichter erfuhr ihn nicht. „Vermerk von Si: „S3 bearbeitet Sandsäcke.““
 */
export function zweiteSichtungHinweis(geltend: unknown): string {
  const g = (typeof geltend === "object" && geltend !== null ? geltend : {}) as { vermerke?: unknown; handzeichen?: unknown };
  const vermerk = typeof g.vermerke === "string" ? g.vermerke.trim() : "";
  if (vermerk === "") return HINWEIS_ZWEITE_SICHTUNG;
  const hz = typeof g.handzeichen === "string" && g.handzeichen.trim() !== "" ? ` von ${g.handzeichen.trim()}` : "";
  return `${HINWEIS_ZWEITE_SICHTUNG} Vermerk${hz}: „${vermerk}“ — beide Vermerke gelten.`;
}

/**
 * Eine Sichtung, deren Vorher-Wert nicht der geltende ist: Sie wird nicht
 * abgewiesen (§5 „die Nachricht steht bei beiden Verteilern"), aber der
 * Sichter erfährt es sofort und nicht erst über den Konflikthinweis.
 */
function planeSichtung(zustand: Zustand, entwurf: Ereignisentwurf): Nachrichtenfolgeplan {
  const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
  const geltend = typeof nachrichtId === "string" ? zustand.nachrichten?.[nachrichtId]?.sichtung?.wert : undefined;
  const fremd = geltend !== undefined && geltend !== null && entwurf.vorher !== undefined && kanonischeSerialisierung(entwurf.vorher as KanonischerWert) !== kanonischeSerialisierung(geltend as unknown as KanonischerWert);
  return { folgen: [], hinweise: fremd && entwurf.undoOf === undefined ? [zweiteSichtungHinweis(geltend)] : [] };
}

/**
 * Die Weitergabe des LdF (R2-LdF P1-3): Trägt sie einen Laufzettel
 * (`nachrichtenfolge.sichtung`), folgt die Sichtung — als Ersatzsichter,
 * wenn kein Sichter besetzt ist. Ohne Laufzettel und ohne Sichter sagt der
 * Hinweis, dass der Eingang wartet.
 */
function planeWeitergabe(entwurf: Ereignisentwurf, umfeld: Nachrichtenfolgeumfeld): Nachrichtenfolgeplan {
  const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
  const sichtung = folgewerte(entwurf)?.sichtung;
  if (typeof nachrichtId !== "string" || entwurf.undoOf !== undefined || entwurf.neu === null) return { folgen: [], hinweise: [] };
  if (sichtung === undefined) return { folgen: [], hinweise: umfeld.sichterBesetzt ? [] : [HINWEIS_WEITERGABE_OHNE_SICHTER] };
  const grund = umfeld.sichterBesetzt ? {} : { grund: projektion.GRUND_ERSATZSICHTER };
  return {
    folgen: [{ entwurf: { typ: "NachrichtGesichtet", nutzlast: { nachrichtId }, vorher: null, neu: sichtung, ...grund }, hinweis: umfeld.sichterBesetzt ? "Beim Weitergeben verteilt." : HINWEIS_LDF_VERTEILT }],
    hinweise: [],
  };
}

/** Plant die Folgen eines Nachrichtenentwurfs — gegen den Zustand **vor** dem Schreiben. */
export function planeNachrichtenfolgen(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Nachrichtenfolgeumfeld): Nachrichtenfolgeplan | undefined {
  if (entwurf.typ === "NachrichtVerfasst") return planeAnlage(zustand, entwurf, umfeld);
  if (entwurf.typ === "NachrichtBefoerdert") {
    // Kontakt im Funkplan (main) und die Folgen am Laufweg (LdF-Ersatz, Kopien) in einem Plan.
    // Additiv (LdF P0-1): zuerst die nachgetragene Annahme und die Nummer.
    const vermerke = planeBefoerderungsvermerke(zustand, entwurf);
    const kontakt = planeKontakt(zustand, entwurf);
    const laufweg = planeBefoerderungsfolgen(zustand, entwurf, umfeld);
    return { folgen: [...vermerke.folgen, ...kontakt.folgen, ...laufweg.folgen], hinweise: [...vermerke.hinweise, ...kontakt.hinweise, ...laufweg.hinweise] };
  }
  if (entwurf.typ === "NachrichtGesichtet") return planeSichtung(zustand, entwurf);
  // R2-ETB P3-4: Zurückziehen nach der Verteilung nennt, wer die Nachricht schon hat.
  if (entwurf.typ === "NachrichtZurueckgezogen") {
    const hinweis = rueckzugshinweis(zustand, entwurf);
    return { folgen: [], hinweise: hinweis === undefined ? [] : [hinweis] };
  }
  if (entwurf.typ === "NachrichtWeitergegeben") return planeWeitergabe(entwurf, umfeld);
  if (entwurf.typ === "NachrichtNachgewiesen") {
    const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
    const doppelt = typeof nachrichtId === "string" ? doppelhinweis(zustand, nummerAus(entwurf.neu), nachrichtId) : undefined;
    return { folgen: [], hinweise: doppelt === undefined ? [] : [doppelt] };
  }
  return undefined;
}
