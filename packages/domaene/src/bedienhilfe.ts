/**
 * Die Kurzhilfe je Ansicht (M8.1).
 *
 * **Drei Leser, eine Liste** — dasselbe Muster wie die Störfallmatrix (M7.3)
 * und die Tastenkarte: Die Ansicht zeigt ihren Text an Ort und Stelle, das
 * Hilfefenster zeigt alle, und das Handbuch druckt sie. Ein Hilfetext im JSX
 * wäre nur für den ersten dieser drei da.
 *
 * **Was ein Eintrag beantwortet.** Nicht „was ist das hier“ — das steht in der
 * Überschrift —, sondern die drei Fragen, die jemand vor einer unbekannten
 * Ansicht tatsächlich hat: Wozu ist sie da? Was tue ich als erstes? Und was
 * überrascht mich hier, wenn niemand es mir sagt? Das dritte Feld ist das
 * wichtigste, weil es das ist, was in keiner Beschriftung steht.
 *
 * Die Verweise auf die Paragraphen stehen dabei, weil die Überraschungen
 * Zusagen sind und keine Eigenheiten: Dass eine entfernte Einheit sichtbar
 * bleibt, ist §5.4.5 und kein Versehen.
 */

/** Kennung einer Ansicht — die Ansicht meldet sich damit an ihrem Text an. */
export type Ansichtskennung =
  | "lage"
  | "abschnitte"
  | "einheiten"
  | "tagebuch"
  | "eingangskorb"
  | "anforderungen"
  | "fuehrungsstelle"
  | "kosten"
  | "ausgaben"
  | "diagnose";

export interface Ansichtshilfe {
  readonly kennung: Ansichtskennung;
  readonly titel: string;
  /** Wozu diese Ansicht da ist, in einem Satz. */
  readonly wozu: string;
  /** Was jemand hier als erstes tut. */
  readonly zuerst: string;
  /** Was überrascht, wenn es niemand sagt — mit dem Paragraphen, der es zusagt. */
  readonly ueberraschung: string;
  /** Die Namen der Kürzel aus der Tastenkarte, die hier greifen. */
  readonly kuerzel: readonly string[];
}

export const ANSICHTEN: readonly Ansichtshilfe[] = [
  {
    kennung: "lage",
    titel: "Lage",
    wozu: "Der Überblick: Stärke nach Status, Zahl der Abschnitte und Einheiten, der Stand des Einsatzes.",
    zuerst: "Nichts. Diese Ansicht bleibt offen, während gearbeitet wird.",
    ueberraschung:
      "Die Zahlen ändern sich, ohne dass jemand an diesem Rechner etwas tut. Sie kommen von den anderen Arbeitsplätzen.",
    kuerzel: ["hilfe"],
  },
  {
    kennung: "abschnitte",
    titel: "Abschnittsbaum",
    wozu: "Die Führungsorganisation: Einsatzabschnitte, Unterabschnitte und was daran hängt.",
    zuerst: "Mit Strg+N einen Abschnitt anlegen; Einheiten kommen danach hinein.",
    ueberraschung:
      "Ein aufgelöster Abschnitt verschwindet nicht, er wird als aufgelöst geführt. Seine Einheiten stehen dann wieder frei (§5.3).",
    kuerzel: ["anlegen", "entfernen", "verschieben", "suchen", "zurueck"],
  },
  {
    kennung: "einheiten",
    titel: "Einheitentabelle",
    wozu: "Alle Einheiten der Lage mit Stärke, Status und Zeiten — das Gegenstück zum Blatt „Stärke“ der Excel.",
    zuerst: "Suchen (Strg+F) oder mit Strg+N eine Einheit anlegen.",
    ueberraschung:
      "Eine entfernte Einheit bleibt sichtbar, wenn „mit Stillgelegten“ gewählt ist. Entfernen ist kein Löschen (§5.4.5).",
    kuerzel: ["anlegen", "entfernen", "verschieben", "suchen", "eeb", "jetzt", "zurueck"],
  },
  {
    kennung: "tagebuch",
    titel: "Tagebuch",
    wozu: "Was wann geschehen ist, aus den Ereignissen abgeleitet.",
    zuerst: "Filtern — nach Einheit, Abschnitt oder Text.",
    ueberraschung:
      "Rücknahmen stehen als eigene Zeilen darin und löschen nichts. Das Tagebuch ist eine Projektion und kein Eintragsbuch (§5.9.1).",
    kuerzel: ["suchen"],
  },
  {
    kennung: "eingangskorb",
    titel: "Eingangskorb",
    wozu: "Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden.",
    zuerst: "Eine Meldung wählen und übernehmen oder ablehnen.",
    ueberraschung:
      "Derselbe Bogen zweimal eingelesen ergibt eine Meldung, keine zwei — die Kennung ist der Inhalt (§3.6, §5.8.1).",
    kuerzel: ["eeb", "suchen"],
  },
  {
    kennung: "anforderungen",
    titel: "Anforderungen",
    wozu: "Was angefordert, zugesagt, eingetroffen oder storniert ist.",
    zuerst: "Mit Strg+N eine Anforderung anlegen.",
    ueberraschung:
      "Eine erledigte oder stornierte Anforderung nimmt keine Änderung mehr an; sie ist am Ende ihrer Kette (§5.6.2).",
    kuerzel: ["anlegen", "suchen", "jetzt"],
  },
  {
    kennung: "fuehrungsstelle",
    titel: "Führungsstelle",
    wozu: "Dienstposten der eigenen Führungsstelle und der Schichtplan dazu.",
    zuerst: "Einen Dienstposten anlegen; besetzt wird er je Tag und Schicht.",
    ueberraschung:
      "Ein angelegter Dienstposten belegt noch keinen Platz im Schichtplan. Der Plan hängt am Paar aus Posten und Datum (§5.7).",
    kuerzel: ["anlegen", "entfernen"],
  },
  {
    kennung: "kosten",
    titel: "Kosten",
    wozu: "Die Abrechnung: PSA, VDA, Unterkunft und Verpflegung je Einheit.",
    zuerst: "Oben die vier Parameter des Einsatzes setzen.",
    ueberraschung:
      "Die Parameter gehören zum Einsatz und nicht zu diesem Rechner: Sie gelten für alle Arbeitsplätze (§5.2).",
    kuerzel: [],
  },
  {
    kennung: "ausgaben",
    titel: "Ausgaben",
    wozu: "Druck, Status-Matrix, Auswertung, Log und Kostenübersicht als HTML, PDF oder Tabelle.",
    zuerst: "Ausgabe und Format wählen; die Datei landet im Ordner „ausgaben“ des Einsatzes.",
    ueberraschung:
      "Der Dateiname trägt den Zeitpunkt. Eine zweite Ausgabe überschreibt die erste nicht.",
    kuerzel: [],
  },
  {
    kennung: "diagnose",
    titel: "Diagnose",
    wozu: "Wer sonst am Einsatz arbeitet, wie weit die Stände auseinander sind, wo die Protokolldatei liegt.",
    zuerst: "Von oben nach unten lesen: zutreffende Störfälle, Arbeitsplätze, Pfade.",
    ueberraschung:
      "Ein Rückstand bei einem Arbeitsplatz ist kurz nach dessen Eingabe normal. Erst ein stehender Rückstand ist eine Auskunft.",
    kuerzel: [],
  },
];

/** Der Text zu einer Ansicht; wirft nicht, weil die Liste geschlossen ist. */
export function ansichtshilfe(kennung: Ansichtskennung): Ansichtshilfe {
  const treffer = ANSICHTEN.find((a) => a.kennung === kennung);
  if (treffer === undefined) throw new Error(`Unbekannte Ansicht: ${kennung}`);
  return treffer;
}
