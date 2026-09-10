/**
 * Die Störfallmatrix (M7.3) — sechs Fälle als Daten.
 *
 * **Warum als Daten und nicht als Text in zwei Dokumenten.** Die Fälle werden
 * an zwei Stellen gebraucht: in der Diagnoseansicht, wenn jemand im Einsatz
 * hinsieht, und in der Kurzanleitung, die neben dem Rechner liegt. Zwei
 * Fassungen desselben Satzes driften auseinander, und die Fassung, die dann
 * falsch ist, ist mit Sicherheit die auf Papier. Hier steht der Satz einmal;
 * Ansicht und Kurzanleitung lesen dieselbe Liste.
 *
 * **Warum Ring 2.** Die Matrix entscheidet nichts über Dateien und ruft nichts
 * auf. Sie ist eine Tabelle und eine reine Funktion darüber, die aus einem
 * Befund die zutreffenden Fälle wählt — genau die Art Wissen, die 02-ZIELBILD.md
 * dem plattformneutralen Ring zuweist. Das Messen des Befunds (Share erreichbar,
 * Uhr, Quarantäne) geschieht in Ring 3 und in der Schale; das Deuten hier.
 *
 * **Warum sechs und nicht mehr.** Die Liste ist keine Fehlersammlung, sondern
 * die Antwort auf „was tue ich jetzt“. Aufgenommen ist ein Fall, wenn er im
 * Betrieb an einem Rechner der Führungsstelle vorkommt **und** eine andere
 * Handlung verlangt als die übrigen. Ein siebter Eintrag, der auf denselben
 * Handgriff hinausliefe, machte die Karte länger und nicht besser.
 */

/** Kennung eines Störfalls — stabil, weil Ansicht und Anleitung darauf zeigen. */
export type Stoerfallkennung =
  | "SHARE_WEG"
  | "UHR_WEICHT_AB"
  | "KONFLIKTHINWEIS"
  | "UPDATE_ABGELEHNT"
  | "START_SCHEITERT"
  | "BOGEN_UNLESBAR";

/** Wie dringend gehandelt werden muss — sortiert die Ansicht, nicht mehr. */
export type Dringlichkeit = "sofort" | "bald" | "beobachten";

export interface Stoerfall {
  readonly kennung: Stoerfallkennung;
  /** Die Überschrift, in der Sprache des Bedieners und nicht des Programms. */
  readonly titel: string;
  /** Woran es auffällt — was auf dem Bildschirm steht oder eben nicht. */
  readonly woran: string;
  /** Was dahintersteckt, in einem Satz. */
  readonly ursache: string;
  /** Was jetzt zu tun ist, in der Reihenfolge des Tuns. */
  readonly schritte: readonly string[];
  /** Was **nicht** zu tun ist — meist der Griff, den jemand zuerst tun will. */
  readonly nicht: string;
  readonly dringlichkeit: Dringlichkeit;
  /** Der Paragraph, der die Zusage macht, auf die sich die Schritte stützen. */
  readonly quelle: string;
}

/**
 * Ab welcher Abweichung eine fremde Wanduhr gemeldet wird.
 *
 * Zwei Minuten, und die Zahl ist begründet: Die **Ordnung** der Ereignisse
 * hängt nicht an der Wanduhr (§2.6, HLC), eine schiefe Uhr verdirbt also keine
 * Daten. Sie verdirbt Anzeigen und Urteile — „vor 8 s“ in der Statuszeile, die
 * 12-Stunden-Schwelle für IST-Zeitpunkte und die 90 Tage für PLAN (§2.5). Unter
 * zwei Minuten fällt davon nichts auf; darüber beginnt die Statuszeile eines
 * Arbeitsplatzes zu lügen, und ab einer Viertelstunde kann §2.5 einen
 * eingetippten Zeitpunkt zu Unrecht als unplausibel zurückweisen.
 */
export const UHR_GRENZE_MS = 2 * 60 * 1000;

/**
 * Die sechs Fälle.
 *
 * Die Reihenfolge ist die der Dringlichkeit und zugleich die der Häufigkeit:
 * Der Share fällt aus, weil ein Netzwerkkabel gezogen wird; ein Bogen ist
 * unlesbar, weil ein Ausdruck grau kopiert wurde. Beides kommt vor. Dass die
 * Anwendung gar nicht startet, kommt einmal vor — beim ersten Mal.
 */
export const STOERFAELLE: readonly Stoerfall[] = [
  {
    kennung: "SHARE_WEG",
    titel: "Der Share ist nicht erreichbar",
    woran:
      "Die Statuszeile zeigt „Share nicht erreichbar“, die Liste der anderen Arbeitsplätze altert, und die Zahl der unübertragenen Bytes wächst.",
    ursache:
      "Netzwerk, NAS oder Freigabe sind weg. Der eigene Rechner schreibt weiter — in den lokalen Spiegel.",
    schritte: [
      "Weiterarbeiten. Alles Eingetippte liegt im lokalen Spiegel und geht nicht verloren (§5.3).",
      "Jemanden zum NAS schicken: Strom, Netzwerkkabel, Freigabe.",
      "Kommt der Share nicht wieder: An **einem** Rechner weiterführen und den anderen sagen, dass sie nur noch mitlesen.",
      "Ist der Share wieder da, gleicht sich der Stand von selbst ab; die Statuszeile zeigt es.",
    ],
    nicht: "Die Anwendung neu starten. Das holt den Share nicht zurück und kostet den offenen Stand der Masken.",
    dringlichkeit: "bald",
    quelle: "KONZEPT-SPEICHER.md §5.3, §6.4",
  },
  {
    kennung: "UHR_WEICHT_AB",
    titel: "Die Uhr eines Arbeitsplatzes weicht ab",
    woran:
      "Die Diagnoseansicht meldet für einen Arbeitsplatz eine Abweichung von mehr als zwei Minuten. In Listen stehen Zeitpunkte, die nicht zur Lage passen.",
    ursache: "Auf dem betroffenen Rechner geht die Systemuhr falsch, meist nach einem Kaltstart ohne Netz.",
    schritte: [
      "Die Uhr des betroffenen Rechners stellen — Zeitzone mit prüfen.",
      "Die bereits erfassten Einträge stehen richtig in der Reihenfolge; nur ihre angezeigten Zeitpunkte sind schief (§2.6).",
      "Zeitpunkte, die für die Auswertung zählen, dort nachtragen, wo sie eingetippt werden — sie sind ein Feld und keine Systemzeit.",
    ],
    nicht: "Die Uhr während einer laufenden Erfassung zurückstellen und darauf hoffen, dass sich die Reihenfolge korrigiert. Sie tut es nicht, weil sie nie daran hing.",
    dringlichkeit: "beobachten",
    quelle: "KONZEPT-EREIGNISSE.md §2.5, §2.6",
  },
  {
    kennung: "KONFLIKTHINWEIS",
    titel: "Zwei Arbeitsplätze haben dasselbe Feld geändert",
    woran: "Die Diagnoseansicht zählt Konflikthinweise; in der Maske steht der Wert des einen, nicht der des anderen.",
    ursache:
      "Zwei Bediener haben dasselbe Feld geändert, ohne den Stand des anderen gesehen zu haben. Der Fold entscheidet dann nach fester Regel und merkt sich, was er verdrängt hat.",
    schritte: [
      "Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert (§3.8).",
      "Fachlich klären, welcher Wert stimmt — das entscheidet ein Mensch und kein Programm.",
      "Den richtigen Wert neu eintragen. Damit ist er der jüngste und gewinnt.",
    ],
    nicht: "Den Hinweis als Fehler melden. Er ist die Zusage, dass nichts still verschwunden ist (Auflage 6).",
    dringlichkeit: "bald",
    quelle: "KONZEPT-EREIGNISSE.md §2.2a, §3.8",
  },
  {
    kennung: "UPDATE_ABGELEHNT",
    titel: "Ein Programmpaket auf dem Share wird abgelehnt",
    woran: "Die Anwendung zeigt statt eines Angebots eine Ablehnung mit Grund.",
    ursache:
      "Das Manifest im Ordner `programm\\` passt nicht: fremder Schlüssel, falsche Signatur, ausgetauschte Datei, andere Plattform oder eine ältere Version.",
    schritte: [
      "Den genannten Grund lesen. „Nicht neuer“ und „andere Plattform“ sind Alltag und kein Vorfall.",
      "Bei fremdem Schlüssel oder falscher Signatur: Das Paket **nicht** ausführen, sondern denjenigen fragen, der es abgelegt hat.",
      "Ein neues Paket wird abgelegt, indem Datei und Manifest zusammen ersetzt werden — nie die Datei allein.",
    ],
    nicht: "Die abgelehnte Datei von Hand aus dem Ordner starten. Die Ablehnung ist der Zweck der Prüfung, nicht ihr Hindernis.",
    dringlichkeit: "sofort",
    quelle: "M7.2, Entscheidung 7",
  },
  {
    kennung: "START_SCHEITERT",
    titel: "Die Anwendung startet nicht",
    woran: "Kein Fenster, oder ein Fenster mit einer Fehlermeldung beim Öffnen des Einsatzes.",
    ursache:
      "Meist die Einstellungsdatei oder der lokale Spiegel, seltener eine Freigabe, auf die der angemeldete Benutzer kein Recht hat.",
    schritte: [
      "Die Protokolldatei öffnen — ihr Ort steht in der Diagnoseansicht und in der Kurzanleitung.",
      "Startet die Anwendung ohne Einsatz, aber nicht mit: Ein anderer Rechner führt den Einsatz weiter, dieser wird nachgezogen.",
      "Startet sie gar nicht: Die portable Fassung vom Stick starten. Sie braucht keine Installation und keinen Spiegel.",
      "Der lokale Spiegel darf gelöscht werden. Er wird vom Share neu aufgebaut; die Wahrheit liegt dort (§1.3).",
    ],
    nicht: "Dateien im Einsatzordner auf dem Share löschen oder von Hand bearbeiten. Das ist der einzige Griff, der Daten kostet.",
    dringlichkeit: "sofort",
    quelle: "KONZEPT-SPEICHER.md §1.3, §1.4",
  },
  {
    kennung: "BOGEN_UNLESBAR",
    titel: "Ein Erfassungsbogen lässt sich nicht einlesen",
    woran: "Der Handscanner gibt nichts weiter, oder der Eingangskorb meldet einen unlesbaren Bogen.",
    ursache:
      "Der Code ist zu klein gedruckt, grau kopiert, geknickt oder das Papier ist nass. Seltener: Es ist ein Bogen einer anderen Fassung.",
    schritte: [
      "Den Bogen glätten und flach auflegen; bei Kopien das Original suchen.",
      "Hilft das nicht: Die Werte von Hand in die Einheitenmaske eintragen. Der Bogen ist ein Weg und keine Voraussetzung.",
      "Den Meldekopf bitten, künftig im Original und nicht als Kopie zu geben.",
    ],
    nicht: "Den Bogen wegwerfen, bevor die Werte erfasst sind. Er ist bis dahin die einzige Fassung.",
    dringlichkeit: "beobachten",
    quelle: "KONZEPT-EREIGNISSE.md §5.8, EXH C159–C172",
  },
];

/** Ein Störfall zu seiner Kennung — wirft nicht, weil die Liste geschlossen ist. */
export function stoerfall(kennung: Stoerfallkennung): Stoerfall {
  const treffer = STOERFAELLE.find((s) => s.kennung === kennung);
  if (treffer === undefined) throw new Error(`Unbekannter Störfall: ${kennung}`);
  return treffer;
}

/**
 * Was gemessen wurde — die Eingabe der Erkennung.
 *
 * Alles hier ist eine Zahl oder ein Wahrheitswert; nichts davon ist ein Griff
 * auf eine Datei. Wer misst, ist die Schale; wer deutet, ist diese Datei.
 */
export interface Stoerfallbefund {
  readonly shareErreichbar: boolean;
  /** Größte Abweichung einer fremden Wanduhr zur eigenen, in Millisekunden. */
  readonly groessteUhrabweichungMs: number;
  readonly konflikthinweise: number;
  /** Dateien in Quarantäne (§8.2) — nicht leer heißt: dieser Platz ist außen vor. */
  readonly quarantaene: number;
  /** Ob die letzte Prüfung eines Programmpakets abgelehnt hat (M7.2). */
  readonly programmpaketAbgelehnt: boolean;
  /** Ob seit dem Start ein Bogen nicht gelesen werden konnte (§5.8). */
  readonly unlesbareBoegen: number;
}

/**
 * Welche Fälle gerade zutreffen.
 *
 * **Die Quarantäne wird auf `START_SCHEITERT` abgebildet, nicht auf einen
 * siebten Fall.** Eine Datei in Quarantäne (§8.2) heißt für den Bediener
 * dasselbe wie ein Rechner, der nicht mitkommt: Dieser Arbeitsplatz ist im
 * Vergleich außen vor, und der Weg heraus führt über die Protokolldatei und
 * notfalls über den neu aufgebauten Spiegel. Ein eigener Eintrag hätte dieselben
 * Schritte getragen — und die Karte um einen Fall verlängert, den niemand
 * unterscheiden kann.
 *
 * Die Reihenfolge der Rückgabe ist die von `STOERFAELLE`, damit Ansicht und
 * Anleitung dieselbe Ordnung zeigen.
 */
export function erkannteStoerfaelle(befund: Stoerfallbefund): readonly Stoerfall[] {
  const kennungen = new Set<Stoerfallkennung>();
  if (!befund.shareErreichbar) kennungen.add("SHARE_WEG");
  if (befund.groessteUhrabweichungMs >= UHR_GRENZE_MS) kennungen.add("UHR_WEICHT_AB");
  if (befund.konflikthinweise > 0) kennungen.add("KONFLIKTHINWEIS");
  if (befund.programmpaketAbgelehnt) kennungen.add("UPDATE_ABGELEHNT");
  if (befund.quarantaene > 0) kennungen.add("START_SCHEITERT");
  if (befund.unlesbareBoegen > 0) kennungen.add("BOGEN_UNLESBAR");
  return STOERFAELLE.filter((s) => kennungen.has(s.kennung));
}
