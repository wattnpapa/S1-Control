/**
 * Die eine Anzeigezone des Programms: Europe/Berlin.
 *
 * **Warum eine feste Zone.** Die Datum-Zeit-Gruppe des Vordrucks stand schon
 * fest in Berliner Zeit, Kopfband, Tagebuch, Statuszeile und die Eingabefelder
 * folgten dagegen der Zeitzone des Rechners. Auf einem Notebook mit UTC lagen
 * damit Bildschirm und Papier eine Stunde auseinander, und eine getippte
 * Funkzeit „1045“ wurde in UTC gelesen, aber als „1145“ gedruckt (Audits
 * Nachrichten: SGL P3-16, ETB P2-1, LdF P2-4, FM P2-1). Die Führungsstelle
 * arbeitet in deutscher Wandzeit; jede Anzeige und jedes Lesen einer getippten
 * Uhrzeit läuft deshalb über diese Datei.
 *
 * Intern bleibt jeder Zeitpunkt ISO-8601 (UTC); die Zone betrifft nur Anzeige
 * und Eingabe. `Intl` ist ECMAScript und braucht weder `node:` noch ein DOM
 * (Ring 2).
 */

/** Die Zone, in der das Programm Zeiten zeigt und getippte Zeiten liest. */
export const ANZEIGEZONE = "Europe/Berlin";

/** Die Anzeigezone als Funktion — für Aufrufer, die sie einmal später einstellbar haben wollen. */
export function anzeigezone(): string {
  return ANZEIGEZONE;
}

/** Die Wandzeit in der Anzeigezone; `monat` ist 1-basiert. */
export interface Wandzeit {
  readonly jahr: number;
  readonly monat: number;
  readonly tag: number;
  readonly stunde: number;
  readonly minute: number;
  readonly sekunde: number;
}

let format: Intl.DateTimeFormat | undefined;

/** Ein Formatierer für die Wandzeit der Anzeigezone; einmal gebaut, denn der Bau ist teuer. */
function formatierer(): Intl.DateTimeFormat {
  format ??= new Intl.DateTimeFormat("en-US", {
    timeZone: ANZEIGEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  return format;
}

/** Millisekunden aus einer der drei Formen; `NaN`, wenn nichts Lesbares kommt. */
export function zeitMsAus(zeitpunkt: string | number | Date): number {
  if (zeitpunkt instanceof Date) return zeitpunkt.getTime();
  return typeof zeitpunkt === "number" ? zeitpunkt : Date.parse(zeitpunkt);
}

/** Die Wandzeit der Anzeigezone zu einem Zeitpunkt; `undefined` bei Ungültigem. */
export function wandzeit(zeitpunkt: string | number | Date): Wandzeit | undefined {
  const ms = zeitMsAus(zeitpunkt);
  if (!Number.isFinite(ms)) return undefined;
  const teile = new Map(formatierer().formatToParts(new Date(ms)).map((t) => [t.type, t.value]));
  const zahl = (art: Intl.DateTimeFormatPartTypes): number => Number(teile.get(art));
  return { jahr: zahl("year"), monat: zahl("month"), tag: zahl("day"), stunde: zahl("hour") % 24, minute: zahl("minute"), sekunde: zahl("second") };
}

/** Der Abstand der Anzeigezone zu UTC an einem Zeitpunkt, in Minuten (Berlin im Winter: 60). */
export function versatzMinuten(millisekunden: number): number {
  const w = wandzeit(millisekunden);
  if (w === undefined) return 0;
  const alsUtc = Date.UTC(w.jahr, w.monat - 1, w.tag, w.stunde, w.minute);
  return Math.round((alsUtc - Math.floor(millisekunden / 60000) * 60000) / 60000);
}

/**
 * Der Zeitpunkt (ISO, UTC) zu einer Wandzeit der Anzeigezone — das Lesen
 * einer getippten Uhrzeit. `undefined`, wenn es den Tag nicht gibt („31.11.“).
 *
 * In der doppelten Stunde der Umstellung auf Winterzeit gilt die Sommerzeit,
 * die erste der beiden; in der übersprungenen Stunde im Frühjahr der Zeitpunkt
 * eine Stunde später — so liest auch eine Wanduhr.
 */
export function zeitpunktAusWandzeit(w: Omit<Wandzeit, "sekunde"> & { readonly sekunde?: number }): string | undefined {
  const { jahr, monat, tag, stunde, minute } = w;
  if (![jahr, monat, tag, stunde, minute].every(Number.isInteger)) return undefined;
  if (monat < 1 || monat > 12 || stunde > 23 || minute > 59 || stunde < 0 || minute < 0) return undefined;
  if (tag < 1 || tag > new Date(Date.UTC(jahr, monat, 0)).getUTCDate()) return undefined;
  // Die Wandzeit als UTC genommen, dann um den Versatz an der gesuchten Stelle
  // verschoben. Die Vermutung liegt drei Stunden davor, damit sie in der
  // doppelten Stunde noch die Sommerzeit trifft; der zweite Schritt fängt den
  // Wechsel des Versatzes zwischen Vermutung und Ergebnis.
  const alsUtc = Date.UTC(jahr, monat - 1, tag, stunde, minute, w.sekunde ?? 0);
  let versatz = versatzMinuten(alsUtc - 3 * 60 * 60000);
  versatz = versatzMinuten(alsUtc - versatz * 60000);
  return new Date(alsUtc - versatz * 60000).toISOString();
}

const zwei = (n: number): string => String(n).padStart(2, "0");

/** „17.11.2026“ in der Anzeigezone; leer bei Ungültigem. */
export function datumText(zeitpunkt: string | number | Date): string {
  const w = wandzeit(zeitpunkt);
  return w === undefined ? "" : `${zwei(w.tag)}.${zwei(w.monat)}.${String(w.jahr)}`;
}

/** „10:45“ oder mit Sekunden „10:45:07“ in der Anzeigezone; leer bei Ungültigem. */
export function uhrzeitText(zeitpunkt: string | number | Date, mitSekunden = false): string {
  const w = wandzeit(zeitpunkt);
  if (w === undefined) return "";
  return `${zwei(w.stunde)}:${zwei(w.minute)}${mitSekunden ? `:${zwei(w.sekunde)}` : ""}`;
}

/** „1045“ — die Uhrzeit vierstellig, wie der Sprechfunker sie sagt; leer bei Ungültigem. */
export function uhrzeitVierstellig(zeitpunkt: string | number | Date): string {
  const w = wandzeit(zeitpunkt);
  return w === undefined ? "" : `${zwei(w.stunde)}${zwei(w.minute)}`;
}

/** „17.11.2026, 10:45:07“ — der Stand einer Ausgabe, wie früher `toLocaleString("de-DE")`, aber in der Anzeigezone. */
export function standText(zeitpunkt: string | number | Date): string {
  const datum = datumText(zeitpunkt);
  return datum === "" ? "" : `${datum}, ${uhrzeitText(zeitpunkt, true)}`;
}

/** Der Name der Zeitzone, in der der Rechner läuft („UTC“, „America/New_York“). */
export function rechnerzone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || "unbekannt";
  } catch {
    return "unbekannt";
  }
}

/**
 * Ob die Uhr des Rechners zur Zeit `jetzt` eine andere Wandzeit zeigt als die
 * Anzeigezone. Verglichen wird der Versatz, nicht der Name: Ein Rechner in
 * „Europe/Paris“ zeigt dieselbe Wandzeit und braucht keinen Hinweis.
 */
export function rechnerzoneWeichtAb(jetzt: number = Date.now()): boolean {
  const rechner = -new Date(jetzt).getTimezoneOffset();
  return Number.isFinite(rechner) && rechner !== versatzMinuten(jetzt);
}

/** „Rechnerzeit UTC, Anzeige in Europe/Berlin“ — oder `undefined`, wenn beide gleich gehen. */
export function rechnerzoneHinweis(jetzt: number = Date.now()): string | undefined {
  return rechnerzoneWeichtAb(jetzt) ? `Rechnerzeit ${rechnerzone()}, Anzeige in ${ANZEIGEZONE}` : undefined;
}
