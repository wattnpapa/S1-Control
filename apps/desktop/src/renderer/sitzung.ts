/**
 * Was dieses Fenster über einen Neuladen hinweg behält.
 *
 * Im Browser ist ein Reload (F5, Wischen nach unten, Absturz des
 * Hintergrund-Tabs) kein Ausnahmefall. Ohne Merker landet der Bediener danach
 * in den Einstellungen und muss den Einsatz wieder suchen. Gemerkt wird:
 *
 * - **der zuletzt geöffnete Einsatz samt Blatt** — `sessionStorage`, dazu als
 *   Rückfall `localStorage` mit Zeitstempel (manche Browser leeren den
 *   Sitzungsspeicher beim Wiederherstellen eines Tabs);
 * - **zuletzt gesehener Stand je Einsatz** (Status, Zahl der Einheiten, Zeit
 *   der Nutzung) für die Einsatzliste — nur eine Anzeige, nie Datenquelle;
 * - **Entwürfe** (Anforderungsformular) — `sessionStorage`.
 *
 * Alles hier ist Komfort: Jeder Zugriff ist abgesichert, und ohne Speicher
 * (privates Fenster, gesperrt, voll) bleibt die Anwendung voll benutzbar.
 * Das Speichern liegt im Browser; Fachdaten gehören dem Main.
 */

const SCHLUESSEL_MERKER = "s1.zuletzt";
const SCHLUESSEL_STAENDE = "s1.einsatzstaende";
const SCHLUESSEL_ENTWURF = "s1.entwurf.anforderung";

/** Wie lange der Rückfall im `localStorage` gilt: eine Schicht plus Reserve. */
export const MERKER_MAX_ALTER_MS = 12 * 60 * 60 * 1000;

export interface Merker {
  readonly ordner: string;
  readonly blatt: string;
  readonly zeit: number;
}

function speicher(art: "sessionStorage" | "localStorage"): Storage | undefined {
  try {
    return globalThis[art];
  } catch {
    return undefined;
  }
}

function lies(art: "sessionStorage" | "localStorage", schluessel: string): unknown {
  try {
    const roh = speicher(art)?.getItem(schluessel);
    return roh === null || roh === undefined ? undefined : (JSON.parse(roh) as unknown);
  } catch {
    return undefined;
  }
}

function schreibe(art: "sessionStorage" | "localStorage", schluessel: string, wert: unknown): void {
  try {
    speicher(art)?.setItem(schluessel, JSON.stringify(wert));
  } catch {
    // Voll oder gesperrt: kein Grund, die Bedienung zu stören.
  }
}

function entferne(art: "sessionStorage" | "localStorage", schluessel: string): void {
  try {
    speicher(art)?.removeItem(schluessel);
  } catch {
    // siehe oben
  }
}

function alsMerker(wert: unknown): Merker | undefined {
  if (typeof wert !== "object" || wert === null) return undefined;
  const { ordner, blatt, zeit } = wert as Record<string, unknown>;
  if (typeof ordner !== "string" || ordner === "" || typeof blatt !== "string" || typeof zeit !== "number") {
    return undefined;
  }
  return { ordner, blatt, zeit };
}

/** Der gemerkte Einsatz dieser Browser-Sitzung — oder, ersatzweise, der jüngste frische aus dem `localStorage`. */
export function ladeMerker(jetzt: number = Date.now()): Merker | undefined {
  const sitzung = alsMerker(lies("sessionStorage", SCHLUESSEL_MERKER));
  if (sitzung !== undefined) return sitzung;
  const lokal = alsMerker(lies("localStorage", SCHLUESSEL_MERKER));
  return lokal !== undefined && jetzt - lokal.zeit <= MERKER_MAX_ALTER_MS ? lokal : undefined;
}

export function speichereMerker(ordner: string, blatt: string, jetzt: number = Date.now()): void {
  const merker: Merker = { ordner, blatt, zeit: jetzt };
  schreibe("sessionStorage", SCHLUESSEL_MERKER, merker);
  schreibe("localStorage", SCHLUESSEL_MERKER, merker);
}

/** Löscht den Merker — beim ausdrücklichen „Zurück zur Einsatzauswahl“. */
export function loescheMerker(): void {
  entferne("sessionStorage", SCHLUESSEL_MERKER);
  entferne("localStorage", SCHLUESSEL_MERKER);
}

// ---------------------------------------------------------------------------
// Zuletzt gesehener Stand je Einsatz (nur Anzeige in der Einsatzliste)
// ---------------------------------------------------------------------------

export interface Einsatzstand {
  readonly status: "AKTIV" | "BEENDET" | "ARCHIVIERT";
  readonly einheiten: number;
  /** Wann dieser Browser den Einsatz zuletzt benutzt hat (ms). */
  readonly genutzt: number;
}

function alsStaende(wert: unknown): Record<string, Einsatzstand> {
  return typeof wert === "object" && wert !== null ? (wert as Record<string, Einsatzstand>) : {};
}

export function ladeStaende(): Record<string, Einsatzstand> {
  return alsStaende(lies("localStorage", SCHLUESSEL_STAENDE));
}

export function merkeStand(ordner: string, stand: Einsatzstand): void {
  const alle = ladeStaende();
  const gekuerzt = Object.entries({ ...alle, [ordner]: stand })
    .sort(([, a], [, b]) => b.genutzt - a.genutzt)
    .slice(0, 50);
  schreibe("localStorage", SCHLUESSEL_STAENDE, Object.fromEntries(gekuerzt));
}

// ---------------------------------------------------------------------------
// Entwürfe
// ---------------------------------------------------------------------------

export interface GemerkterEntwurf<T> {
  readonly ordner: string;
  readonly eingabe: T;
}

export function ladeEntwurf<T>(): GemerkterEntwurf<T> | undefined {
  const wert = lies("sessionStorage", SCHLUESSEL_ENTWURF);
  if (typeof wert !== "object" || wert === null) return undefined;
  const { ordner, eingabe } = wert as Record<string, unknown>;
  return typeof ordner === "string" && typeof eingabe === "object" && eingabe !== null
    ? { ordner, eingabe: eingabe as T }
    : undefined;
}

export function speichereEntwurf<T>(ordner: string, eingabe: T): void {
  schreibe("sessionStorage", SCHLUESSEL_ENTWURF, { ordner, eingabe });
}

export function loescheEntwurf(): void {
  entferne("sessionStorage", SCHLUESSEL_ENTWURF);
}
