/**
 * `upload-state.json` — die Offsets nach KONZEPT-SPEICHER.md §5.3.
 *
 * ```json
 * {
 *   "eigen": { "0003": { "shareOffset": 1234567, "letzteKette": "a1b2…" } },
 *   "fremd": { "9f3c1a20.0000": { "leseOffset": 890123, "letzteKette": "c3d4…",
 *                                 "abgeschlossen": true, "quarantaeneAb": null } }
 * }
 * ```
 *
 * Liegt lokal. Wie `schreiber.json` (§4.4) ist die Datei ein Beschleuniger und
 * kein Wahrheitsträger, und aus demselben Grund: Jeder ihrer Werte ist aus dem
 * lokalen Spiegel wiederherstellbar.
 *
 * - `shareOffset` darf zu klein sein — §5.4.2 stellt das wahre Ende ohnehin
 *   durch Lesen fest und fällt dann in Ausgang A.
 * - `leseOffset` ist die Länge des lokalen Spiegels dieser Datei, denn nach
 *   §5.5 enthält der Spiegel „nur die geprüften, vollständigen Zeilen" und ist
 *   damit genau das geprüfte Präfix bis `leseOffset`. Er wird beim Öffnen
 *   gegen den Spiegel geprüft und notfalls daraus gesetzt.
 * - `quarantaeneAb` darf verloren gehen: §8.2 Punkt 5 prüft die Stelle bei
 *   jedem Programmstart ohnehin erneut, und der Leser stößt beim Weiterlesen
 *   wieder auf denselben Defekt.
 */

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { KETTE_ANFANG, istKette } from "./pruefsummen.js";

const kodierer = new TextEncoder();

let tmpZaehler = 0;
/** Fortlaufende Nummer für eindeutige `.tmp`-Namen. */
function naechsteTmpNummer(): number {
  tmpZaehler += 1;
  return tmpZaehler;
}
const dekodierer = new TextDecoder("utf-8", { fatal: false });

/**
 * Eine Stützstelle nach §5.3: `{offset, kette}`.
 *
 * Sie entsteht, wenn dieser Client einen Schnappschuss schreibt, und macht die
 * Prüfung 3 aus §7.5 ohne Dateizugriff ausführbar. **M0.3 baut keine
 * Schnappschüsse** (§7 gehört nicht zum Arbeitspaket); das Feld wird deshalb
 * gelesen und unverändert wieder geschrieben, aber nie erzeugt. Es steht hier,
 * damit `upload-state.json` sein Format behält, wenn §7 dazukommt — ein
 * nachträglicher Formatwechsel an einer persistierten Datei wäre der teurere
 * Weg.
 */
export interface Stuetzstelle {
  readonly offset: number;
  readonly kette: string;
}

/** Offsets eines eigenen Segments (§5.3). */
export interface EigenerOffset {
  /** Bis zu welchem Byte die eigene lokale Datei bereits auf den Share gespiegelt ist. */
  readonly shareOffset: number;
  /** Kettenprüfsumme an genau diesem Offset. */
  readonly letzteKette: string;
  /** §7.5, Prüfung 3. Von M0.3 nur durchgereicht. */
  readonly stuetzstellen?: readonly Stuetzstelle[];
}

/** Offsets einer fremden Datei (§5.3). */
export interface FremderOffset {
  /** Bis zu welchem Byte die Datei gelesen und in den lokalen Spiegel übernommen wurde. */
  readonly leseOffset: number;
  /** Kettenprüfsumme an genau diesem Offset, damit der nächste Abschnitt lückenlos anschließt. */
  readonly letzteKette: string;
  /** Die Datei trug eine Abschlusszeile (§4.3) und wird nicht mehr gepollt. */
  readonly abgeschlossen: boolean;
  /** Byte-Offset, ab dem diese Datei wegen eines Defekts nicht weiter ausgewertet wird (§8.2). */
  readonly quarantaeneAb: number | null;
  /**
   * Unterscheidet die Quarantäne aus §8.1 (Fristablauf, wird weiter geprüft)
   * von der endgültigen aus §8.2 (§5.3).
   */
  readonly vorlaeufig?: boolean;
  /** §7.5, Prüfung 3. Von M0.3 nur durchgereicht. */
  readonly stuetzstellen?: readonly Stuetzstelle[];
}

/** Der gesamte Inhalt von `upload-state.json` (§5.3). */
export interface UploadZustand {
  /** Schlüssel ist die Segmentnummer als vierstelliger Text, z. B. `"0003"`. */
  readonly eigen: Readonly<Record<string, EigenerOffset>>;
  /** Schlüssel ist der Dateiname, z. B. `"9f3c1a20.0000"` ohne Endung. */
  readonly fremd: Readonly<Record<string, FremderOffset>>;
}

/** Ein leerer Zustand — der Ausgangspunkt eines noch nie geöffneten Einsatzes. */
export function leererUploadZustand(): UploadZustand {
  return { eigen: {}, fremd: {} };
}

/** Liest `upload-state.json`; jeder unbrauchbare Inhalt ergibt den leeren Zustand. */
export async function liesUploadZustand(
  dateisystem: Dateisystem,
  pfad: string,
): Promise<UploadZustand> {
  let bytes: Uint8Array;
  try {
    bytes = await dateisystem.liesAb(pfad, 0);
  } catch {
    return leererUploadZustand();
  }
  return deuteUploadZustand(dekodierer.decode(bytes));
}

/** Prüft einen gelesenen Text auf einen brauchbaren Uploadzustand (§5.3). */
export function deuteUploadZustand(text: string): UploadZustand {
  if (text.trim().length === 0) return leererUploadZustand();
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch {
    return leererUploadZustand();
  }
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) {
    return leererUploadZustand();
  }
  const objekt = wert as Record<string, unknown>;
  return { eigen: deuteEigen(objekt["eigen"]), fremd: deuteFremd(objekt["fremd"]) };
}

function eintraege(wert: unknown): readonly (readonly [string, Record<string, unknown>])[] {
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) return [];
  return Object.entries(wert as Record<string, unknown>).flatMap(([schluessel, eintrag]) =>
    typeof eintrag === "object" && eintrag !== null && !Array.isArray(eintrag)
      ? [[schluessel, eintrag as Record<string, unknown>] as const]
      : [],
  );
}

function deuteEigen(wert: unknown): Record<string, EigenerOffset> {
  const ergebnis: Record<string, EigenerOffset> = {};
  for (const [schluessel, eintrag] of eintraege(wert)) {
    const shareOffset = eintrag["shareOffset"];
    const letzteKette = eintrag["letzteKette"];
    if (!ganzzahl(shareOffset) || !istKette(letzteKette)) continue;
    const stuetzstellen = deuteStuetzstellen(eintrag["stuetzstellen"]);
    ergebnis[schluessel] =
      stuetzstellen === undefined
        ? { shareOffset, letzteKette }
        : { shareOffset, letzteKette, stuetzstellen };
  }
  return ergebnis;
}

function deuteFremd(wert: unknown): Record<string, FremderOffset> {
  const ergebnis: Record<string, FremderOffset> = {};
  for (const [schluessel, eintrag] of eintraege(wert)) {
    const leseOffset = eintrag["leseOffset"];
    const letzteKette = eintrag["letzteKette"];
    if (!ganzzahl(leseOffset) || !istKette(letzteKette)) continue;
    const quarantaeneRoh = eintrag["quarantaeneAb"];
    const quarantaeneAb = ganzzahl(quarantaeneRoh) ? quarantaeneRoh : null;
    const stuetzstellen = deuteStuetzstellen(eintrag["stuetzstellen"]);
    const basis: FremderOffset = {
      leseOffset,
      letzteKette,
      abgeschlossen: eintrag["abgeschlossen"] === true,
      quarantaeneAb,
    };
    const mitVorlaeufig: FremderOffset =
      eintrag["vorlaeufig"] === true ? { ...basis, vorlaeufig: true } : basis;
    ergebnis[schluessel] =
      stuetzstellen === undefined ? mitVorlaeufig : { ...mitVorlaeufig, stuetzstellen };
  }
  return ergebnis;
}

function deuteStuetzstellen(wert: unknown): readonly Stuetzstelle[] | undefined {
  if (!Array.isArray(wert)) return undefined;
  const stellen = wert.flatMap((eintrag) => {
    if (typeof eintrag !== "object" || eintrag === null) return [];
    const offset = (eintrag as Record<string, unknown>)["offset"];
    const kette = (eintrag as Record<string, unknown>)["kette"];
    return ganzzahl(offset) && istKette(kette) ? [{ offset, kette }] : [];
  });
  return stellen.length > 0 ? stellen : undefined;
}

function ganzzahl(wert: unknown): wert is number {
  return typeof wert === "number" && Number.isInteger(wert) && wert >= 0;
}

/**
 * Schreibt `upload-state.json`, **ohne** `fsync`.
 *
 * Aus demselben Grund wie bei `schreiber.json` (§5.2): genau ein `fsync` je
 * Ereignis, und die Datei ist nach dem Kopfkommentar wiederherstellbar.
 *
 * Liefert `false` statt zu werfen, wenn ein Dateisystemfehler dazwischenkam —
 * aus demselben Grund und mit derselben Begründung wie
 * `schreibeSchreiberzustand` (§4.4, §8.8, §9 zu Auflage 15): Diese Datei ist
 * ein Beschleuniger. Ihr Verlust kostet einen erneuten Abgleich gegen den
 * lokalen Spiegel beim nächsten Öffnen (§5.3, §5.5) und die Verwendbarkeit der
 * eigenen Stützstellen (§7.5, Prüfung 3 nennt genau diesen Fall); ein
 * abgerissener Bedienschritt oder ein abgerissener Poll-Durchlauf kostet mehr.
 * Befund aus der Simulation M0.4.
 */
export async function schreibeUploadZustand(
  dateisystem: Dateisystem,
  pfad: string,
  zustand: UploadZustand,
): Promise<boolean> {
  // Eindeutig je Schreibvorgang: §6.2 lässt Takte unabhängig laufen, und zwei
  // gleichzeitige Läufe teilten sich sonst dieselbe `.tmp`-Datei — der eine
  // benennt sie um, der andere findet sie nicht mehr und scheitert mit ENOENT
  // an einer Datei, die es nie hätte geben dürfen.
  const tmp = `${pfad}.${naechsteTmpNummer()}.tmp`;
  try {
    await dateisystem.schreibeUeberOhneSync(
      tmp,
      kodierer.encode(`${JSON.stringify(zustand, undefined, 2)}\n`),
    );
    await dateisystem.benenneUm(tmp, pfad);
    return true;
  } catch (fehler) {
    if (!(fehler instanceof DateisystemFehler)) throw fehler;
    await dateisystem.loesche(tmp).catch(() => undefined);
    return false;
  }
}

/** Ein eigener Offset, der noch nie gespiegelt wurde. */
export function neuerEigenerOffset(): EigenerOffset {
  return { shareOffset: 0, letzteKette: KETTE_ANFANG };
}

/** Ein fremder Offset, von dem noch nichts gelesen wurde. */
export function neuerFremderOffset(): FremderOffset {
  return { leseOffset: 0, letzteKette: KETTE_ANFANG, abgeschlossen: false, quarantaeneAb: null };
}
