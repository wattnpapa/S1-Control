/**
 * Die Zahlen des Stärke-Monitors (M3.5).
 *
 * Hier steht alles, was der Monitor **rechnet**, und sonst nichts: die
 * NATO-Datum-Zeit-Gruppe, die Schriftgröße und der Stärketext. Kein React,
 * kein DOM, kein `Date.now()`.
 *
 * Der Grund für die Trennung ist derselbe, aus dem `Statuszeile.tsx` sich
 * `jetzt` übergeben lässt: Eine Zahl, die aus der Laufzeit oder der
 * Fenstergröße des Prüfrechners entsteht, ist nicht prüfbar. Was hier steht,
 * ist eine Abbildung von Eingaben auf eine Zeichenkette — und genau das
 * lässt sich mit Randfällen belegen. Der Monitor selbst zeichnet dann nur
 * noch.
 *
 * Zum Auftrag: 05-UMSETZUNGSPLAN.md, M3.5 — „Stärke-Monitor: Zweitfenster,
 * Monitorwahl, dynamische Schrift, Gesamtstärke und NATO-Zeit, Push aus dem
 * Worker“.
 */

/**
 * Die drei Stärkezahlen einer Einheit oder des ganzen Einsatzes.
 *
 * Absichtlich als eigene, kleine Form und nicht aus dem Kontrakt geholt: Der
 * Kontrakt gibt seine Stärke nur als Teil des `Lagebild`-Schemas heraus, und
 * eine reine Rechenfunktion soll nicht das ganze Schema mitziehen. Die Felder
 * sind dieselben (Excel-Spalten AJ/AK/AL, excel-domaenenmodell.md §2).
 */
export interface Staerkewerte {
  readonly fuehrer: number;
  readonly unterfuehrer: number;
  readonly mannschaft: number;
}

/**
 * Die Monatskürzel der Datum-Zeit-Gruppe, dreibuchstabig.
 *
 * Deutsch-neutral und fest verdrahtet statt über `toLocaleString`: Die
 * Gruppe ist eine Schreibweise der Führungsstelle, keine Anzeige in der
 * Sprache des Betriebssystems. Ein Rechner mit englischer Oberfläche schriebe
 * sonst „MAR“ statt „MRZ“, und derselbe Einsatz sähe auf zwei Monitoren
 * verschieden aus.
 */
const MONATE = [
  "JAN",
  "FEB",
  "MRZ",
  "APR",
  "MAI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DEZ",
] as const;

/**
 * Der Zonenbuchstabe und sein Versatz gegen UTC in vollen Stunden.
 *
 * Die militärische Zonenordnung: A…I sind +1…+9, K…M sind +10…+12, N…Y sind
 * −1…−12, Z ist UTC. „J“ steht für die Ortszeit des Betrachters und ist
 * deshalb bewusst **nicht** aufgeführt — eine Gruppe, die keine Zone nennt,
 * ist für einen Monitor an der Wand keine Auskunft.
 */
const ZONENVERSATZ: Readonly<Record<string, number>> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  I: 9,
  K: 10,
  L: 11,
  M: 12,
  N: -1,
  O: -2,
  P: -3,
  Q: -4,
  R: -5,
  S: -6,
  T: -7,
  U: -8,
  V: -9,
  W: -10,
  X: -11,
  Y: -12,
  Z: 0,
};

/** Was `natoZeit` bei einem unlesbaren Zeitpunkt sagt — dieselbe Auskunft wie `alter` (§3.2). */
export const ZEIT_UNBEKANNT = "unbekannt";

function zweistellig(zahl: number): string {
  return String(zahl).padStart(2, "0");
}

/**
 * Die NATO-Datum-Zeit-Gruppe: `TTHHMM<Zone> MMM JJ`, z. B. `101430A SEP 26`.
 *
 * **Der Zonenbuchstabe wird übergeben und nicht geraten.** Die Systemzeitzone
 * des Arbeitsplatzes wäre dafür die falsche Quelle, aus drei Gründen:
 *
 *  * Sie ist eine Einstellung des Rechners, keine Festlegung der
 *    Führungsstelle. Zwei Arbeitsplätze desselben Einsatzes schrieben sonst
 *    zwei verschiedene Gruppen für denselben Augenblick — und die Gruppe wird
 *    abgeschrieben, in Meldungen und ins Einsatztagebuch.
 *  * Sie kann falsch stehen. KONZEPT-EREIGNISSE.md §3.2 rechnet ausdrücklich
 *    mit verstellten Uhren auf anderen Rechnern; die Ordnung der Ereignisse
 *    hängt deshalb an der HLC und nie an der Wanduhr. Eine Anzeige, die aus
 *    derselben unsicheren Quelle ihren Zonenbuchstaben zöge, wäre nicht besser
 *    als die Uhr, der niemand traut.
 *  * Ein Wechsel Sommer-/Winterzeit änderte den Buchstaben mitten im Einsatz.
 *    Die Führungsstelle legt ihn einmal fest (Vorbelegung `A` = MEZ, UTC+1)
 *    und behält ihn.
 *
 * Der Versatz kommt daher aus dem Buchstaben selbst — die Gruppe ist damit in
 * sich stimmig und von der Zeitzone des Rechners vollständig unabhängig. Ein
 * unbekannter Buchstabe fällt auf `Z` (UTC) zurück, statt einen Versatz zu
 * erfinden, den die angezeigte Zone nicht deckt.
 *
 * Ein unlesbarer Zeitpunkt ergibt {@link ZEIT_UNBEKANNT}, keinen Absturz:
 * Der Monitor hängt an der Wand, und ein weißer Bildschirm ist die
 * schlechteste aller Auskünfte.
 */
export function natoZeit(zeitpunkt: Date | number, zone: string = "A"): string {
  const millisekunden = typeof zeitpunkt === "number" ? zeitpunkt : zeitpunkt.getTime();
  if (!Number.isFinite(millisekunden)) return ZEIT_UNBEKANNT;

  const gewuenscht = zone.trim().toUpperCase().slice(0, 1);
  const buchstabe = gewuenscht in ZONENVERSATZ ? gewuenscht : "Z";
  const versatz = ZONENVERSATZ[buchstabe] ?? 0;

  // Der Versatz wird auf den Zeitstempel gerechnet und danach ausschliesslich
  // mit den UTC-Gettern gelesen. Die örtlichen Getter zögen die Zeitzone des
  // Rechners ein zweites Mal hinein — genau das, was oben begründet entfällt.
  const verschoben = new Date(millisekunden + versatz * 3_600_000);
  const tag = zweistellig(verschoben.getUTCDate());
  const stunde = zweistellig(verschoben.getUTCHours());
  const minute = zweistellig(verschoben.getUTCMinutes());
  const monat = MONATE[verschoben.getUTCMonth()] ?? "???";
  const jahr = zweistellig(verschoben.getUTCFullYear() % 100);

  return `${tag}${stunde}${minute}${buchstabe} ${monat} ${jahr}`;
}

/** Kleinste Schriftgröße in Pixeln — darunter ist der Monitor nicht mehr der Monitor. */
export const SCHRIFT_MIN = 24;

/** Größte Schriftgröße in Pixeln — darüber schneidet die Zeile an den Oberlängen. */
export const SCHRIFT_MAX = 420;

/**
 * Mittlere Breite eines Zeichens als Bruchteil der Schrifthöhe.
 *
 * Der Monitor setzt seine Zahlen in Tabellenziffern (`tabular-nums`, siehe die
 * Regel `.monitor` in `index.html`). Deren Vorteil ist hier nicht nur die
 * ruhige Spalte, sondern die Rechenbarkeit: Jede Ziffer ist gleich breit, und
 * damit ist die Breite einer Zeile das Produkt aus Zeichenzahl und
 * Zeichenbreite. Bei den üblichen serifenlosen Systemschriften liegt eine
 * Tabellenziffer bei rund 0,6 der Schrifthöhe; 0,62 lässt etwas Luft für die
 * Schrägstriche und das Gleichheitszeichen.
 */
const ZEICHENBREITE = 0.62;

/**
 * Wie viel der Fensterhöhe die große Zeile bekommen darf.
 *
 * Nicht die ganze: Unter der Stärke stehen NATO-Zeit, Einsatzname und Stand.
 * Rund die Hälfte für die Hauptzahl lässt den drei kleinen Zeilen ihren Platz,
 * ohne sie an den Rand zu drücken.
 */
const HOEHENANTEIL = 0.5;

/**
 * Die dynamische Schrift aus der DoD M3.5: Wie groß darf die Gesamtstärke
 * gesetzt werden, damit sie in ein Fenster dieser Größe passt?
 *
 * Bewusst eine Heuristik und keine Messung. Eine Messung hieße, die Zeile
 * probeweise zu setzen, ihre Breite aus dem Layout zu lesen und die Größe
 * nachzuziehen — das ist eine Schleife im Zeichenweg, sie flackert beim
 * Ziehen des Fensters, und sie wäre ohne Browser nicht prüfbar. Die
 * Heuristik ist eine reine Funktion: dieselbe Eingabe, dieselbe Zahl, in
 * jsdom wie auf dem Zweitbildschirm.
 *
 * Geklemmt wird nach beiden Seiten. Ein sehr schmales Fenster ergäbe sonst
 * eine Schriftgröße, die niemand mehr aus mehreren Metern liest — dann lieber
 * ein Umbruch als eine unlesbare Zeile; ein sehr breites ergäbe eine Zahl, die
 * höher als das Fenster wäre.
 */
export function schriftgroesse(zeichen: number, breitePx: number, hoehePx: number): number {
  // Mindestens ein Zeichen: Eine leere Zeile hat keine Breite, und die
  // Division dadurch wäre unendlich statt „so groß wie erlaubt“.
  const anzahl = Math.max(1, Math.floor(zeichen));
  const ausBreite = breitePx / (anzahl * ZEICHENBREITE);
  const ausHoehe = hoehePx * HOEHENANTEIL;
  const roh = Math.min(ausBreite, ausHoehe);
  if (!Number.isFinite(roh)) return SCHRIFT_MIN;
  return Math.round(Math.min(SCHRIFT_MAX, Math.max(SCHRIFT_MIN, roh)));
}

/**
 * Die Stärke, wie die Excel sie schreibt: `0/1/8 = 9`.
 *
 * Reihenfolge und Summe stammen unverändert aus dem Blatt Stärke
 * (excel-domaenenmodell.md §2: AJ „Fü“, AK „Ufü“, AL „He“, AM `=SUM(AJn:ALn)`).
 * Das ist keine Nostalgie: Die Führungsstelle liest diese vier Zahlen seit
 * Jahren in dieser Folge, und der Monitor ist der Ort, an dem am wenigsten
 * Zeit zum Umlernen bleibt. Das Gleichheitszeichen steht dort, wo in der Excel
 * die Plausibilitätsspalte L des Druckblatts es setzt (§4.1).
 */
export function staerketext(staerke: Staerkewerte): string {
  const summe = staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
  return `${String(staerke.fuehrer)}/${String(staerke.unterfuehrer)}/${String(staerke.mannschaft)} = ${String(summe)}`;
}
