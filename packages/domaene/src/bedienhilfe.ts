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
 * Die Texte stehen in Klartext, so wie ein Helfer sie sagt: keine Verweise auf
 * Konzeptabschnitte, keine internen Bezeichner. Wo ein Verhalten eine Zusage
 * ist und kein Versehen, steht das als Satz da; die Begründung gehört in die
 * Entwicklerdokumentation.
 */

/**
 * Die ersten Schritte in Klartext — das Erste, was die Hilfe zeigt.
 *
 * Kurz und in der Reihenfolge eines Einsatzes. Die Namen sind die der Reiter
 * und Knöpfe auf dem Bildschirm; die Tastenkürzel stehen darunter.
 */
export const ERSTE_SCHRITTE: readonly string[] = [
  "Einsatz anlegen oder öffnen: Auf der Startseite steht die Liste der Einsätze; ein neuer Einsatz braucht nur einen Namen.",
  "Abschnitte anlegen: Im Reiter „Lage“ links mit „Abschnitt anlegen“ die Einsatzabschnitte aufbauen, zum Beispiel „Einsatzort“ oder „Bereitstellungsraum“.",
  "Einheiten melden: Mit „Aus Vorlage“ eine Einheit aus der Vorlage anlegen (Tippen sucht, Enter wählt) oder ohne Vorlage frei eintragen. Die Einheit kommt in den gewählten Abschnitt.",
  "Status pflegen: In der Spalte „Status“ eine Einheit antippen oder anklicken, den neuen Status wählen und mit „Übernehmen“ bestätigen. Erst dann gilt er für alle Arbeitsplätze.",
  "Kräfte anfordern: Im Reiter „Anforderungen“ eine Anforderung anlegen, die Zusage erfassen und beim Eintreffen „Eingetroffen“ wählen.",
  "Nachlesen: Der Reiter „Einsatztagebuch“ zeigt, wer wann was getan hat. Eigene Notizen und Funkmeldungen trägt man dort mit „Eintrag hinzufügen“ ein.",
  "Fehler zurücknehmen: Der Knopf „Rückgängig“ nimmt den letzten eigenen Schritt zurück. Die Rücknahme steht im Tagebuch.",
  "Ausgaben und Abschluss: Im Reiter „Ausgaben“ stehen Druck, Listen und Auswertungen; ganz unten wird der Einsatz beendet.",
];

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
  /** Was überrascht, wenn es niemand sagt. */
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
      "Die Zahlen ändern sich, ohne dass jemand an diesem Rechner etwas tut. Sie kommen von den anderen Arbeitsplätzen. " +
      "Die Kopfzahl „Ist-Stärke“ (Fü/UFü/He // Gesamt) zählt die Kräfte, die vor Ort sind: Einheiten in einem Einsatzbereich mit Status Einsatzbereit, Einsatz, Ruhe oder Nicht einsatzbereit. Wer noch nicht da ist, steht daneben als „+N erwartet (angefordert/Anmarsch/Eingang)“: Status Angefordert, Anmarsch, Rufbereitschaft, Einsatzvorbehalt, oder die Einheit steht im Bereich „Angefordert / Anmarsch“ oder im Eingang. Nicht gezählt sind „Einsatz beendet“ und Rückmarsch (angezeigt als „N beendet“). Der Status entscheidet, nicht nur der Bereich: Setzt jemand eine Einheit im Einsatzbereich von Anmarsch auf Einsatzbereit, steigt die Kopfzahl sofort, ohne dass die Einheit den Bereich wechselt. Ein Tipp auf „Regel“ unter der Kopfzahl zeigt diese Erklärung — auch auf dem Handy. Dieselbe Regel gilt in der Tabellensumme („Ist-Stärke“, darunter „Erwartet“ und „Alle erfassten Einheiten“), im Abschnittsbaum, in der Gliederung und in allen Ausgaben; „Alle erfassten Einheiten“ ist bewusst größer als die Ist-Stärke. " +
      "Wer eintrifft, wird in einen Einsatzbereich gesetzt und auf Einsatzbereit gestellt; ab dann zählt er in die Ist-Stärke.",
    kuerzel: ["hilfe"],
  },
  {
    kennung: "abschnitte",
    titel: "Abschnittsbaum",
    wozu: "Die Führungsorganisation: Einsatzabschnitte, Unterabschnitte und was daran hängt.",
    zuerst: "Mit Strg+N einen Abschnitt anlegen; Einheiten kommen danach hinein.",
    ueberraschung:
      "Ein aufgelöster Abschnitt verschwindet nicht, er wird als aufgelöst geführt. Seine Einheiten stehen dann wieder frei.",
    kuerzel: ["anlegen", "entfernen", "verschieben", "suchen", "zurueck"],
  },
  {
    kennung: "einheiten",
    titel: "Einheitentabelle",
    wozu: "Alle Einheiten der Lage mit Stärke, Status und Zeiten — das Gegenstück zur bisherigen Stärketabelle auf Papier.",
    zuerst:
      "Suchen (Strg+F) oder mit Strg+N eine Einheit anlegen — aus einer Vorlage (THW StAN, Feuerwehr, KatS-StAN Nds; Tippen filtert, Enter wählt) oder „Ohne Vorlage“ als freie Zeile.",
    ueberraschung:
      "Eine entfernte Einheit bleibt sichtbar, wenn „mit Stillgelegten“ gewählt ist. Entfernen ist kein Löschen: Die Einheit bleibt in der Akte und im Tagebuch, nur die Summen zählen sie nicht mehr. " +
      "„Gliederung“ setzt über jeden Bereich eine Kopfzeile mit Zwischensumme wie in der Stärketabelle auf Papier; die oberste Zeile ist die Ist-Stärke wie im Kopfband, erwartete Kräfte und alle erfassten Einheiten stehen daneben. " +
      "Bei KatS-Vorlagen steht an der Soll-Stärke „Annahme“: Die Vorlage nennt dort keine, eingetragen ist die übliche Gliederung — am Standort prüfen. " +
      "Die Spalten der Ablösung („Ablösung angefordert“ bis „Vorgesehener Auftrag“) unter „Ressourcen“ kommen aus der Ansicht „Anforderungen“ und werden dort bearbeitet; „Ablösung anfordern“ legt für die markierte Zeile eine an. " +
      "Die Marke „läuft ab“ an „Verfügbar bis“ erscheint einen Tag vor Ablauf (K18). " +
      "„Kopieren“ (Strg+K) öffnet für die markierte Zeile die Anlegemaske mit Bezeichnung, Organisation, Ebene, Herkunft, Stärke, Abschnitt und Vorlage vorbelegt; die Kopie ist eine neue, angeforderte Einheit ohne Aufträge, Fahrzeuge, Personen und Zeiten.",
    kuerzel: ["anlegen", "kopieren", "entfernen", "verschieben", "suchen", "eeb", "jetzt", "zurueck"],
  },
  {
    kennung: "tagebuch",
    titel: "Tagebuch",
    wozu: "Was wann geschehen ist, aus den Ereignissen abgeleitet.",
    zuerst: "Filtern — nach Einheit, Abschnitt oder Text.",
    ueberraschung:
      "Rücknahmen stehen als eigene Zeilen darin und löschen nichts. Das Tagebuch ist eine Projektion und kein Eintragsbuch: Neue Zeilen entstehen durch Arbeiten in der Lage, eigene Notizen kommen über „Eintrag hinzufügen“ dazu.",
    kuerzel: ["suchen"],
  },
  {
    kennung: "eingangskorb",
    titel: "Eingangskorb",
    wozu: "Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden.",
    zuerst: "Eine Meldung wählen und übernehmen oder ablehnen.",
    ueberraschung:
      "Derselbe Bogen zweimal eingelesen ergibt eine Meldung, keine zwei — der Inhalt des Bogens entscheidet, nicht der Zeitpunkt des Einlesens.",
    kuerzel: ["eeb", "suchen"],
  },
  {
    kennung: "anforderungen",
    titel: "Anforderungen",
    wozu: "Was angefordert, zugesagt, eingetroffen oder storniert ist.",
    zuerst: "Mit Strg+N eine Anforderung anlegen.",
    ueberraschung:
      "Eine erledigte oder stornierte Anforderung nimmt keine Änderung mehr an; sie ist am Ende ihrer Kette. " +
      "„Eingetroffen“ legt auf Wunsch die Einheit aus der Anforderung an (Organisation, Ebene, Stärke und Auftrag vorbelegt, Status „Einsatzbereit“, Bereich zu wählen — erst in einem Einsatzbereich zählt sie in die Ist-Stärke) oder verknüpft eine schon erfasste Einheit; sie steht dann bei einer Ablösung als „Ablösung durch“ an der abgelösten Einheit.",
    kuerzel: ["anlegen", "suchen", "jetzt"],
  },
  {
    kennung: "fuehrungsstelle",
    titel: "Führungsstelle",
    wozu: "Stammdaten des Einsatzes, Dienstposten der eigenen Führungsstelle und der Schichtplan dazu.",
    zuerst:
      "Über „Stammdaten bearbeiten“ den Namen der Führungsstelle und die übergeordnete Führungsstelle eintragen — sie stehen auf jedem Ausdruck.",
    ueberraschung:
      "Ein angelegter Dienstposten belegt noch keinen Platz im Schichtplan. Der Plan hängt an der Kombination aus Posten und Datum.",
    kuerzel: ["anlegen", "entfernen"],
  },
  {
    kennung: "kosten",
    titel: "Kosten",
    wozu: "Die Abrechnung: PSA, VDA, Unterkunft und Verpflegung je Einheit.",
    zuerst: "Oben die vier Parameter des Einsatzes setzen.",
    ueberraschung:
      "Die Parameter gehören zum Einsatz und nicht zu diesem Rechner: Sie gelten für alle Arbeitsplätze.",
    kuerzel: [],
  },
  {
    kennung: "ausgaben",
    titel: "Ausgaben",
    wozu:
      "Druck, Status-Matrix, Einheitenliste, Auswertung, Log und Kostenübersicht als HTML, PDF oder Tabelle. Die Einheitenliste ist die Stärketabelle auf Papier: alle Bereiche mit Zwischensumme und jede Einheit darunter — für die Lagebesprechung und für den Rechnerausfall. Alle Ausgaben nennen die Ist-Stärke wie das Kopfband und trennen davon die erwarteten Kräfte; Summen über alle Einheiten heißen „Alle erfassten Einheiten“. Das Log-Blatt ist Bedarfsplanung (Verpflegung, Unterbringung) und zählt alle Einheiten der Einsatzbereiche, auch im Anmarsch. Die Kontrollsummen der Status-Matrix nennen bei einer Abweichung die Menge und die betroffenen Einheiten mit Namen. Darunter wird der Einsatz abgeschlossen: beenden, Einsatzakte erzeugen, archivieren.",
    zuerst: "Ausgabe und Format wählen; die Datei landet im Ordner „ausgaben“ des Einsatzes. Mit „Öffnen“, „Ordner zeigen“ und bei HTML „Drucken“ geht es von dort weiter.",
    ueberraschung:
      "Der Dateiname trägt den Zeitpunkt. Eine zweite Ausgabe überschreibt die erste nicht. Ein beendeter Einsatz nimmt keine Eingaben mehr an, bis er wiedereröffnet wird; ein archivierter gar keine mehr — an keinem Arbeitsplatz.",
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
