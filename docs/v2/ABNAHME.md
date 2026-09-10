# Abnahmeliste S1-Control v2

Zum Abhaken, nicht zum Lesen. Jede Zeile ist entweder erfüllt oder nicht; eine
Zeile, die man „im Wesentlichen“ abhaken kann, gehört hier nicht hin.

Stand: 2026-09-10, nach M7. Nichts in dieser Liste ist von Claude abgehakt —
alles, was hier steht, braucht Hardware, Geheimnisse oder eine zweite Person.
Was im Baum nachgewiesen ist, steht in den Abschlussberichten unter
`docs/v2-arbeitsstand/berichte/` und nicht hier.

## A — Installation und Start

- [ ] **A1** Das NSIS-Paket installiert auf einem Rechner der Führungsstelle
      **ohne Administratorrechte** (`perMachine: false`). Fällt dieser Punkt,
      fällt nach M-1 der ganze Desktop-Ansatz.
- [ ] **A2** Die portable EXE startet vom USB-Stick, ohne etwas zu installieren.
- [ ] **A3** Nach der Installation startet die Anwendung ohne Netzwerk und ohne
      eingestellten Share, zeigt die Startseite und keine Fehlermeldung.
- [ ] **A4** Ein zweiter Start auf demselben Rechner öffnet **kein** zweites
      Fenster (`requestSingleInstanceLock`, §4.5 Fall 1).
- [ ] **A5** Das Paket ist signiert, oder es ist ausdrücklich entschieden, es
      unsigniert zu verteilen, und der SmartScreen-Hinweis ist den Bedienern
      angesagt.

## B — Share und Mehrbenutzerbetrieb

- [ ] **B1** Der Share ist nach [BETRIEB.md](BETRIEB.md) eingerichtet; drei
      Arbeitsplätze haben Lese- und Schreibrecht.
- [ ] **B2** Ein Einsatz wird auf Rechner 1 angelegt und erscheint auf 2 und 3
      in der Liste.
- [ ] **B3** Alle drei sehen sich in der Statuszeile, keiner steht auf
      „veraltet“, solange er läuft (§6.4).
- [ ] **B4** Eine Eingabe auf Rechner 1 steht binnen zehn Sekunden auf 2 und 3.
- [ ] **B5** **M2.4 — der Prüfpunkt mit Abbruchrecht:** Zwei Rechner, echter
      Share, eine Stunde Betrieb mit Störungen (Kabel ziehen, NAS neu starten,
      Rechner schlafen legen). Danach `s1 akte pruefe --vergleiche` über beide
      lokalen Spiegel: **die `zustandsHash` müssen gleich sein.**
- [ ] **B6** **M0.5 — Messung am echten Share:** Die Zeiten aus M0.4 werden auf
      dem echten NAS nachgemessen und liegen in derselben Größenordnung.
- [ ] **B7** Ein Rechner wird mitten in der Erfassung ausgeschaltet; nach dem
      Start ist alles da, was vor dem letzten `fsync` bestätigt wurde.

## C — Ausgaben und Parität

- [ ] **C1** **Prüfpunkt 3 — Parität mit dem Excel-Ausdruck:** Eine
      Referenzlage aus einem echten Einsatz (Entscheidung 8) wird in v2
      erfasst; Druck, Status-Matrix, Auswertung, Oldenburg-Variante, Log und
      Kostenübersicht stimmen mit dem Excel-Ausdruck derselben Lage überein.
      Abweichungen sind einzeln begründet oder behoben.
- [ ] **C2** Ein PDF wird auf dem Drucker der Führungsstelle gedruckt und ist
      lesbar — Kopfzeile, Fußzeile, Seitenumbrüche.
- [ ] **C3** **M3.5 — Monitor auf einer zweiten Anzeige:** Das Monitorfenster
      steht auf dem zweiten Bildschirm und aktualisiert sich.
- [ ] **C4** Die Einsatzakte wird exportiert, auf einem anderen Rechner
      importiert, und `s1 akte pruefe --vergleiche` meldet denselben
      `zustandsHash` (§7.6).

## D — Meldeweg

- [ ] **D1** Ein echter Erfassungsbogen wird mit dem Handscanner der
      Führungsstelle eingelesen und landet im Eingangskorb.
- [ ] **D2** Ein zweiter Bogen derselben Einheit erscheint als Revision, nicht
      als zweite Einheit (§5.8.2).
- [ ] **D3** Eine Bündeldatei vom USB-Stick eines Meldekopfs wird eingelesen;
      ein zweites Einlesen derselben Datei ändert nichts (§3.6).
- [ ] **D4** **M6-B1 — QR per Kamera:** Entschieden, ob eine fünfte
      Abhängigkeit aufgenommen wird. Gemessen ist: Die Zielplattform stellt
      keinen Decoder (`BarcodeDetector` fehlt auf Electron 43 / Chromium 150).

## E — Verteilung und Betrieb

- [ ] **E1** Ein signiertes Paket liegt in `programm\`; alle drei
      Arbeitsplätze zeigen das Angebot mit der richtigen Version.
- [ ] **E2** Ein Paket mit vertauschter Datei oder verändertem Manifest wird
      **abgelehnt**, mit Grund.
- [ ] **E3** Der Vertrauensanker ist erzeugt, der private Schlüssel liegt
      nicht im Repository, und wer ihn hat, ist festgehalten.
- [ ] **E4** Die Diagnoseansicht zeigt auf jedem der drei Rechner die anderen
      beiden mit Offsets und Uhrabweichung.
- [ ] **E5** **[KURZANLEITUNG.md](KURZANLEITUNG.md) ist von einer zweiten
      Person durchgearbeitet worden**, die nicht am Bau beteiligt war, und die
      Stellen, an denen sie hängenblieb, sind geändert.
- [ ] **E6** [BETRIEB.md](BETRIEB.md) ist von derjenigen durchgearbeitet
      worden, die den Share einrichtet.

## F — Abnahmeübung

- [ ] **F1** Ein vollständiger Übungseinsatz wird in v2 geführt: drei bis vier
      Arbeitsplätze, NAS, mindestens zwei Stunden, mit Abschnitten, Einheiten,
      Anforderungen und Ausgaben.
- [ ] **F2** Während der Übung wird der Share mindestens einmal absichtlich
      getrennt und wieder verbunden.
- [ ] **F3** Nach der Übung: gleicher `zustandsHash` auf allen Arbeitsplätzen,
      Einsatzakte exportiert und geprüft.
- [ ] **F4** Die Bediener sagen, was gefehlt hat. Die Liste wird aufgeschrieben
      und nicht sofort beantwortet.

## Was zuerst dran ist

**A1.** Alle übrigen Zeilen setzen voraus, dass die Anwendung auf einem
Rechner der Führungsstelle läuft. A1 ist zugleich der Punkt mit
Abbruchkriterium (M-1): Geht die Installation nicht ohne Elevation, ist über
den Ansatz neu zu entscheiden und nicht über das nächste Arbeitspaket.
