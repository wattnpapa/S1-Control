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
  "Abschnitte anlegen: Im Reiter „S1“ links mit „Abschnitt anlegen“ die Einsatzabschnitte aufbauen, zum Beispiel „Einsatzort“ oder „Bereitstellungsraum“.",
  "Einheiten melden: Mit „Aus Vorlage“ eine Einheit aus der Vorlage anlegen (Tippen sucht, Enter wählt) oder ohne Vorlage frei eintragen. Die Einheit kommt in den gewählten Abschnitt.",
  "Status pflegen: In der Spalte „Status“ eine Einheit antippen oder anklicken, den neuen Status wählen und mit „Übernehmen“ bestätigen. Erst dann gilt er für alle Arbeitsplätze.",
  "Kräfte anfordern: Im Reiter „Anforderungen“ eine Anforderung anlegen, die Zusage erfassen und beim Eintreffen „Eingetroffen“ wählen.",
  "Nachlesen: Der Reiter „Einsatztagebuch“ zeigt, wer wann was getan hat. Eigene Notizen und Funkmeldungen trägt man dort mit „Eintrag hinzufügen“ ein.",
  "Fehler zurücknehmen: Der Knopf „Rückgängig“ nimmt den letzten eigenen Schritt zurück. Die Rücknahme steht im Tagebuch.",
  "Exporte und Abschluss: Im Reiter „Exporte“ stehen Druck, Listen und Auswertungen; ganz unten wird der Einsatz beendet.",
];

/** Kennung einer Ansicht — die Ansicht meldet sich damit an ihrem Text an. */
export type Ansichtskennung =
  | "lage"
  | "abschnitte"
  | "einheiten"
  | "tagebuch"
  | "eingangskorb"
  | "nachrichten"
  | "anforderungen"
  | "fuehrungsstelle"
  | "funkplan"
  | "versorgung"
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
  /**
   * Additiv (R2-FaBe P1-2): die Wörter der Ansicht, je mit einem halben Satz
   * — wer nicht aus dem Stab kommt, kennt sie nicht. Fehlt, wo es keine gibt.
   */
  readonly begriffe?: string;
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
      "Die Spalten der Ablösung („Ablösung angefordert“ bis „Vorgesehener Auftrag“) unter „Ressourcen“ kommen aus der Ansicht „Anforderungen“ und werden dort bearbeitet; „Ablösung anfordern“ legt für die markierte Zeile eine an; „Funk …“ öffnet für sie Rufgruppen, Funkrufname, Erreichbarkeit und Funkhinweis. „Erfassungsbögen“ speichert die Bögen aller markierten Zeilen als eine Bündeldatei nach „ausgaben“, je Einheit die jüngste Fassung; die Erfassungsbogen-App öffnet sie und druckt daraus die PDFs, auch im beendeten Einsatz. " +
      "Die Marke „läuft ab“ an „Verfügbar bis“ erscheint einen Tag vor Ablauf (K18). " +
      "Unter „Funk“ steht „Letzter Kontakt“: die jüngere von Funkprobe und Statusmeldung, Bernstein mit Alter, sobald sie älter ist als die Schwelle des Funkplans. " +
      "„Kopieren“ (Strg+K) öffnet für die markierte Zeile die Anlegemaske mit Bezeichnung, Organisation, Ebene, Herkunft, Stärke, Abschnitt und Vorlage vorbelegt; die Kopie ist eine neue, angeforderte Einheit ohne Aufträge, Fahrzeuge, Personen und Zeiten.",
    kuerzel: ["anlegen", "kopieren", "entfernen", "verschieben", "suchen", "eeb", "jetzt", "zurueck"],
  },
  {
    kennung: "tagebuch",
    titel: "Tagebuch",
    wozu: "Was wann geschehen ist, aus den Ereignissen abgeleitet.",
    zuerst: "Filtern — nach Einheit, Abschnitt oder Text.",
    ueberraschung:
      "Rücknahmen stehen als eigene Zeilen darin und löschen nichts. Das Tagebuch ist eine Projektion und kein Eintragsbuch: Neue Zeilen entstehen durch Arbeiten in der Lage, eigene Notizen kommen über „Eintrag hinzufügen“ dazu. Eine Zeile zu einer Nachricht nennt die Nummer, die damals galt, und öffnet die Nachricht mit ✉; „Im Tagebuch zeigen“ an der Nachricht zeigt genau ihre Zeilen. Eine neue Nummer, eine Nachsichtung und das Zurückziehen tragen die Marke „Berichtigung“. Der Ausdruck führt beide Zeiten, Nachricht, Handzeichen und Rechner je Zeile und schließt mit „Einsatztagebuch abgeschlossen“, sobald der Einsatz beendet ist.",
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
    kennung: "nachrichten",
    titel: "Nachrichten",
    wozu:
      "Das Blatt für Nachrichten nach Vordruck 1103.1: Eingänge und Ausgänge mit Vorrang, Nummer, Absender, Anschrift und Betreff. Fünf Sichten, eine Zeile je Nachricht. „Posteingang“ zeigt, was an eine Stelle dieses Arbeitsplatzes verteilt ist, mit Kopiefarbe und den Marken neu, gelesen und erledigt. „Ausgang“ zeigt, was dieser Arbeitsplatz oder eine Stelle dieser Sitzung verfasst hat, mit dem Stand in der Fernmeldezentrale. „Sichter“ zeigt die Eingänge ohne Sichtung, zuoberst die mit Vorrang. „Fernmeldezentrale“ zeigt die Ausgangswarteschlange mit Annahme und Beförderung und nimmt Eingänge auf. „Nachweisung“ zeigt alle Nachrichten nach Nummer und lässt sich als Liste ausgeben. „LdF“ erscheint nur, wenn der Einsatz den Leiter des Fernmeldebetriebes als Station führt oder dieser Arbeitsplatz LdF ist: Ausgänge vor dem Übermittlungsvorschlag und Eingänge vor der Weitergabe an den Sichter.",
    zuerst: "Oben die Zahlen des Bandes lesen, dann mit dem Umschalter die Sicht wählen; mit „Nachricht verfassen“ entsteht eine neue Nachricht im Aufbau des Vordrucks.",
    ueberraschung:
      "Die Stelle des Arbeitsplatzes wählt nur die erste Sicht und schneidet den Posteingang zu; sie ist kein Recht, jede Sicht bleibt erreichbar. Die Uhrzeiten stehen vierstellig und die Zeit der Abfassung als Datum-Zeit-Gruppe („171045nov26“), so wie sie auf dem Papier steht. Eine doppelt vergebene Nummer wird nicht verhindert, sondern in der Nachweisung markiert; beim Nacherfassen vom Papier gilt, was auf dem Blatt steht. „Als Vordruck drucken“ legt die Nachricht als PDF im Vordrucklayout unter ausgaben/nachrichten ab, mit der Nummer im Dateinamen; ohne Nummer trägt der Name die Kennung der Nachricht. Die Vorschau zeigt das Blatt vor dem Druck mit der Schrift des Browsers, sie weicht leicht von der des PDF ab. Der Automatikdruck ist nur an, wenn in den Druckeinstellungen ein Drucker oder ein Verzeichnis gewählt ist, und druckt dann jede an eine Stelle dieses Arbeitsplatzes verteilte Nachricht beim Eintreffen, auch die eigene Sichtung. Mit LdF als Station teilt der LdF jeden Ausgang einem der Fernmelder Fm1 bis Fm3 zu, nach der Beförderung trägt er die Nummer ein und gibt an den Sichter; der verteilt die rote Kopie an S2 und die grüne an die Stelle des Verfassers. Ohne LdF als Station gehen beide Kopien gleich nach der Beförderung hinaus. Der Ausgang steht dann in beiden Posteingängen.",
    begriffe:
      "FmZ ist die Fernmeldezentrale, über die jede Nachricht hinein- und hinausgeht. Der Sichter quittiert jeden Eingang und legt den Verteiler fest; der LdF (Leiter des Fernmeldebetriebes) teilt Ausgänge einem Fernmelder (Fm1 bis Fm3) zu, weist sie nach der Beförderung nach und gibt Eingänge wie Ausgänge an den Sichter weiter. Die Nachweisung ist die nummerierte Liste aller Nachrichten der FmZ, der Laufzettel der untere Teil des Vordrucks mit Quittung, Verteiler und Vermerken. Das Handzeichen ist Ihr Kürzel, das wie eine Unterschrift unter jedem Vermerk steht. Vorrang heißt Sofort (vor allem Einfachen) oder Blitz (Gefahr für Leben, geht allem vor). Ein Spruch geht an eine Gegenstelle, die ihn aufnimmt und quittiert, eine Durchsage an mehrere zugleich. Eine Gesprächsnotiz hält ein Telefonat fest und wird nicht übermittelt. Die Kopiefarbe sagt, was der Empfänger tut: grün bearbeiten, blau zur Kenntnis, rot an S2. Die Datum-Zeit-Gruppe schreibt Tag, Uhrzeit, Monat und Jahr in ein Wort („171045NOV26“); die Abfassungszeit ist die Zeit, zu der die Nachricht geschrieben wurde, der Übermittlungswunsch der Weg, den der Verfasser sich wünscht. Alle Begriffe stehen mit einem Satz in der Abkürzungsliste (Reiter „Abkürzungen“).",
    kuerzel: ["anlegen", "suchen", "jetzt"],
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
    kennung: "funkplan",
    titel: "Funkplan",
    wozu:
      "Die Ansicht der Vermeldezentrale: welche Rufgruppen es im Einsatz gibt, wofür und in welcher Betriebsart (TMO, DMO, Analog), wer sie abhört, und welche Einheit über welche Rufgruppe gerufen wird — mit Funkrufname, Erreichbarkeit, Funkhinweis und letztem Kontakt, je Rufgruppe oder je Bereich. Wer eine Gruppe als weitere trägt, steht dort als „hört mit“. Die Sicht „Funkproben“ zeigt alle Funkproben als Zeitfolge. Der Funkplan lässt sich als Ausdruck für den Platz der Sprechfunker erzeugen; der Monitor zeigt ihn als sechste Ansicht (Taste 6) mit einer Zeile je Rufgruppe und den Teilnehmern als Kacheln.",
    zuerst:
      "Mit „Rufgruppe anlegen“ die Gruppen des Einsatzes eintragen (beim Tippen des Namens schlägt die Maske Gruppen aus dem THW-Standard-Fleetmapping vor, Stand 06/2024; Pfeil ab und Enter oder Klick übernehmen, jeder andere Name bleibt als eigene Rufgruppe möglich), dann in der Zuordnung die Gruppe „ohne Rufgruppe“ abarbeiten: Doppelklick auf die Zelle „Rufgruppe“, Gruppe wählen, Enter. Der Funkhinweis wird ebenso in seiner Zelle geschrieben. Doppelklick auf den Namen einer Einheit (oder ✎) öffnet „Funk und Erreichbarkeit“: weitere Rufgruppen, Funkrufname und Erreichbarkeit überschreiben, Funkprobe eintragen, Funkauszug des Tagebuchs. Strg+E bearbeitet die links gewählte Rufgruppe. Für die Funkprobe eine Einheit in der Zuordnung anklicken, dann Strg+P (Kontakt, Funkzeit jetzt) oder „kein Kontakt …“ (fragt nach dem Grund).",
    ueberraschung:
      "Die Rufgruppe gilt für die ganze Einheit, nicht je Fahrzeug, und sie bleibt beim Verschieben in einen anderen Bereich stehen; „Bereich ≠ Gruppe“ weist nur darauf hin. Eine aufgelöste Rufgruppe setzt ihre Einheiten nicht um: Sie stehen danach als „ohne Rufgruppe“, bis jemand sie neu zuordnet. Der Funkrufname kommt aus dem ersten Fahrzeug der Einheit mit Funkrufnamen; ein Override in der Maske ersetzt ihn, ein leerer Override gibt ihn zurück. Mithörer zählen nicht als „zugeordnet“: Gerufen wird eine Einheit über ihre Hauptrufgruppe. „Letzter Kontakt“ ist die jüngere von Funkprobe „Kontakt“ und Statusmeldung (Funkzeit, sonst Eingabezeit); älter als die Schwelle (Vorbelegung 60 Minuten, einstellbar in der Werkzeugzeile, gilt für alle Arbeitsplätze) wird er Bernstein. Eine Probe „kein Kontakt“ setzt den letzten Kontakt nicht zurück, sie steht daneben. Einheiten in Rufbereitschaft, Einsatzvorbehalt, Angefordert und Rückmarsch werden nie Bernstein.",
    kuerzel: ["anlegen", "funkprobe", "suchen"],
  },
  {
    kennung: "versorgung",
    titel: "Versorgung",
    wozu:
      "Die Ansicht des S4: Mahlzeitenplan je Bereich mit Ausgabestelle und Bestellung der nächsten Mahlzeit, die Vorausschau der nächsten 24 oder 48 Stunden mit Zu- und Abgängen, Unterkünfte mit Belegung und Zuweisung, das Logistikblatt am Bildschirm und die Abarbeitung des Sofortbedarfs aus den Bögen.",
    zuerst:
      "Oben im Band die Zahlen des Tages lesen, dann mit dem Umschalter die Unteransicht wählen. „Nächste 24 h“ beantwortet, wie viel Essen zu welcher Mahlzeit gebraucht wird; „Unterbringung“ zeigt, wer noch kein Bett hat: Unterkunft anlegen, dann in der Spalte „Unterkunft“ wählen und „Zuweisen“ drücken oder an der Unterkunftskarte eine Einheit wählen.",
    ueberraschung:
      "Gezählt werden alle erfassten Einheiten der Einsatzbereiche, auch in Ruhe — nicht die Ist-Stärke des Kopfbands. Der Anmarsch steht getrennt daneben und geht nur in die Vorausschau ein, und nur mit gemeldeter Eintreffzeit; was keine Zeit trägt, steht als „nicht eingerechnet“ in der Liste. Bestellung, Zuweisung, Mahlzeitenregel und „erledigt“ sind Ereignisse: Sie gelten für alle Arbeitsplätze, stehen im Tagebuch und lassen sich zurücknehmen.",
    kuerzel: [],
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
