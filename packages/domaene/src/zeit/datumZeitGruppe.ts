/**
 * Die Datum-Zeit-Gruppe des Nachrichtenvordrucks: „171045nov26" —
 * Tag, Stunde, Minute, Monat in drei Buchstaben, Jahr zweistellig
 * (KONZEPT-NACHRICHTEN.md §6; Audit des analog-first-Reviewers, Fundstelle 166).
 *
 * Intern bleibt jeder Zeitpunkt ISO-8601; diese Schreibweise ist Anzeige und
 * Eingabe, sie ordnet nichts (02-ZIELBILD.md, Festlegung 4).
 *
 * **Zeitzone Europe/Berlin, ausdrücklich.** `zeitpunktText` in
 * `beschriftungen.ts` schreibt in der Ortszeit des Rechners; die DTG steht auf
 * Papier, das zwischen Stellen wandert, und muss auf jedem Arbeitsplatz
 * dieselbe sein — auch auf einem, dessen Uhr auf UTC steht. `Intl` ist
 * ECMAScript und braucht weder `node:` noch ein DOM.
 */

/** Die Monatskürzel des Vordrucks, deutsch und klein. */
export const DTG_MONATE = ["jan", "feb", "mrz", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "dez"] as const;

/** Was beim Lesen außerdem als Monat gilt: englische Kürzel und „mär“. */
const MONAT_LESEN: Readonly<Record<string, number>> = {
  ...Object.fromEntries(DTG_MONATE.map((kuerzel, stelle) => [kuerzel, stelle])),
  "mär": 2,
  mar: 2,
  may: 4,
  oct: 9,
  dec: 11,
};

const ZEITZONE = "Europe/Berlin";

let format: Intl.DateTimeFormat | undefined;

/** Ein Formatierer für die Wandzeit in Berlin; einmal gebaut, denn der Bau ist teuer. */
function formatierer(): Intl.DateTimeFormat {
  format ??= new Intl.DateTimeFormat("en-US", {
    timeZone: ZEITZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  return format;
}

interface Wandzeit {
  readonly jahr: number;
  readonly monat: number;
  readonly tag: number;
  readonly stunde: number;
  readonly minute: number;
}

/** Die Wandzeit in Berlin zu einem Zeitpunkt in Millisekunden (Monat 0-basiert). */
function wandzeit(millisekunden: number): Wandzeit {
  const teile = new Map(formatierer().formatToParts(new Date(millisekunden)).map((t) => [t.type, t.value]));
  const zahl = (art: string): number => Number(teile.get(art as Intl.DateTimeFormatPartTypes));
  return { jahr: zahl("year"), monat: zahl("month") - 1, tag: zahl("day"), stunde: zahl("hour") % 24, minute: zahl("minute") };
}

const zwei = (n: number): string => String(n).padStart(2, "0");

/**
 * „171045nov26" zu einem Zeitpunkt; ein ungültiger Zeitpunkt ergibt die
 * leere Zeichenkette, damit eine Maske nichts Erfundenes zeigt.
 */
export function datumZeitGruppe(zeitpunkt: string | Date): string {
  const ms = zeitpunkt instanceof Date ? zeitpunkt.getTime() : Date.parse(zeitpunkt);
  if (Number.isNaN(ms)) return "";
  const w = wandzeit(ms);
  return `${zwei(w.tag)}${zwei(w.stunde)}${zwei(w.minute)}${DTG_MONATE[w.monat] ?? ""}${zwei(w.jahr % 100)}`;
}

/** Der Abstand der Berliner Wandzeit zu UTC an einem Zeitpunkt, in Minuten. */
function versatzMinuten(millisekunden: number): number {
  const w = wandzeit(millisekunden);
  const alsUtc = Date.UTC(w.jahr, w.monat, w.tag, w.stunde, w.minute);
  return Math.round((alsUtc - Math.floor(millisekunden / 60000) * 60000) / 60000);
}

function versatzText(minuten: number): string {
  const betrag = Math.abs(minuten);
  return `${minuten < 0 ? "-" : "+"}${zwei(Math.floor(betrag / 60))}:${zwei(betrag % 60)}`;
}

const MUSTER = /^(\d{2})(\d{2})(\d{2})\s*([a-zäA-ZÄ]{3})\s*(\d{2})?$/;

/**
 * Liest eine Datum-Zeit-Gruppe („171045nov26", auch „181432SEP26" oder
 * „171045 nov") und gibt den Zeitpunkt als ISO-8601 mit Berliner Versatz
 * zurück, sonst `undefined`.
 *
 * Fehlt das Jahr, gilt `bezugsjahr`; ohne beides gibt es keinen Zeitpunkt.
 * Ein zweistelliges Jahr liegt im Jahrhundert des Bezugsjahres (sonst 20xx).
 * In der doppelten Stunde der Umstellung auf Winterzeit gilt die Sommerzeit,
 * die erste der beiden — die DTG unterscheidet sie nicht.
 */
export function datumZeitGruppeLesen(text: string, bezugsjahr?: number): string | undefined {
  const treffer = MUSTER.exec(text.trim());
  if (treffer === null) return undefined;
  const [, tagText, stundeText, minuteText, monatText, jahrText] = treffer;
  const monat = MONAT_LESEN[(monatText ?? "").toLowerCase()];
  const jahrhundert = bezugsjahr === undefined ? 2000 : Math.floor(bezugsjahr / 100) * 100;
  const jahr = jahrText === undefined ? bezugsjahr : jahrhundert + Number(jahrText);
  const tag = Number(tagText);
  const stunde = Number(stundeText);
  const minute = Number(minuteText);
  if (monat === undefined || jahr === undefined || !Number.isInteger(jahr)) return undefined;
  if (stunde > 23 || minute > 59 || tag < 1 || tag > new Date(Date.UTC(jahr, monat + 1, 0)).getUTCDate()) return undefined;
  // Die Wandzeit als UTC genommen, dann um den Berliner Versatz an der
  // gesuchten Stelle verschoben. Die Vermutung liegt drei Stunden davor, damit
  // sie in der doppelten Stunde noch die Sommerzeit trifft; der zweite Schritt
  // fängt den Wechsel des Versatzes zwischen Vermutung und Ergebnis.
  const alsUtc = Date.UTC(jahr, monat, tag, stunde, minute);
  let versatz = versatzMinuten(alsUtc - 3 * 60 * 60000);
  versatz = versatzMinuten(alsUtc - versatz * 60000);
  return `${String(jahr).padStart(4, "0")}-${zwei(monat + 1)}-${zwei(tag)}T${zwei(stunde)}:${zwei(minute)}:00${versatzText(versatz)}`;
}
