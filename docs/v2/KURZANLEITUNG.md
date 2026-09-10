# Kurzanleitung S1-Control

Zwei Seiten zum Danebenlegen. Seite 1 ist der Betrieb, Seite 2 sind die sechs
Störfälle. Seite 2 ist erzeugt: Sie stammt aus derselben Liste, die die
Diagnoseansicht im Programm zeigt (`packages/domaene/src/stoerfaelle.ts`). Wer
einen Fall ändert, ändert ihn dort und erneuert diese Datei mit
`npm run doku:kurzanleitung`.

## Anfangen

1. **Einstellungen:** Sharepfad eintragen (`\\nas\einsatz`) und einen
   Anzeigenamen setzen. Der Name steht in der Statuszeile der anderen.
2. **Einsatz anlegen** oder einen bestehenden **öffnen**. Beides geht über die
   Liste auf der Startseite; angelegt wird ein Einsatz genau einmal, von einem
   Rechner.
3. Alle weiteren Rechner öffnen denselben Einsatz aus der Liste. Sie sehen
   sich danach gegenseitig unten in der Statuszeile.

## Die Statuszeile lesen

| Was dort steht | Was es heißt |
|---|---|
| Stand: vor 8 s | Wann das jüngste Ereignis eintraf |
| 2 weitere, 1 veraltet | Wache und stumme Arbeitsplätze (§6.4) |
| Share nicht erreichbar | Es wird lokal weitergeschrieben, nichts geht verloren |
| 4.2 kB nicht übertragen | So viel Eigenes liegt noch nicht auf dem Share |

## Tastenkürzel

| Taste | Was sie tut |
|---|---|
| Strg + N | Neuen Eintrag anlegen |
| Strg + E | Eintrag entfernen, mit Grund (§2.4) |
| Strg + M | Einheiten in einen anderen Abschnitt verschieben |
| Strg + F | In die Suche springen |
| Strg + Z | Letzte eigene Aktion zurücknehmen (§6 U3) |
| Strg + D | „Jetzt“ in das Zeitfeld schreiben, in dem der Cursor steht |
| Strg + Q | Erfassungsbogen vom Handscanner einlesen |
| Strg + H | Abkürzungsliste und Tastenkarte |

## Drei Sätze, die Zeit sparen

**Nichts geht verloren, wenn der Share weg ist.** Jedes Ereignis liegt zuerst
lokal, dann auf dem Share (§1.3). Weiterarbeiten ist immer richtig.

**Zurücknehmen ist ein Ereignis, kein Löschen.** Was zurückgenommen wurde,
bleibt im Tagebuch sichtbar (§5.9.1). Das ist gewollt.

**Zwei Bediener am selben Feld sind kein Fehler.** Das Programm entscheidet
nach fester Regel und merkt sich, was es verdrängt hat. Der Hinweis steht in
der Diagnose; geklärt wird fachlich (§2.2a, §3.8).

## Wo etwas steht, wenn es klemmt

Im Programm: **Nebenblätter → Diagnose.** Dort stehen die Arbeitsplätze mit
ihren Ständen, die Pfade von Protokoll, Share und lokalem Spiegel und die
letzten Meldungen dieser Sitzung. Alles Weitere: [BETRIEB.md](BETRIEB.md).

---

# Seite 2 — Die sechs Störfälle

<!-- STÖRFALLMATRIX ANFANG — erzeugt, nicht von Hand ändern -->

### Der Share ist nicht erreichbar

**Woran es auffällt:** Die Statuszeile zeigt „Share nicht erreichbar“, die Liste der anderen Arbeitsplätze altert, und die Zahl der unübertragenen Bytes wächst.

**Was dahintersteckt:** Netzwerk, NAS oder Freigabe sind weg. Der eigene Rechner schreibt weiter — in den lokalen Spiegel.

1. Weiterarbeiten. Alles Eingetippte liegt im lokalen Spiegel und geht nicht verloren (§5.3).
2. Jemanden zum NAS schicken: Strom, Netzwerkkabel, Freigabe.
3. Kommt der Share nicht wieder: An **einem** Rechner weiterführen und den anderen sagen, dass sie nur noch mitlesen.
4. Ist der Share wieder da, gleicht sich der Stand von selbst ab; die Statuszeile zeigt es.

**Nicht:** Die Anwendung neu starten. Das holt den Share nicht zurück und kostet den offenen Stand der Masken.

Grundlage: KONZEPT-SPEICHER.md §5.3, §6.4

### Die Uhr eines Arbeitsplatzes weicht ab

**Woran es auffällt:** Die Diagnoseansicht meldet für einen Arbeitsplatz eine Abweichung von mehr als zwei Minuten. In Listen stehen Zeitpunkte, die nicht zur Lage passen.

**Was dahintersteckt:** Auf dem betroffenen Rechner geht die Systemuhr falsch, meist nach einem Kaltstart ohne Netz.

1. Die Uhr des betroffenen Rechners stellen — Zeitzone mit prüfen.
2. Die bereits erfassten Einträge stehen richtig in der Reihenfolge; nur ihre angezeigten Zeitpunkte sind schief (§2.6).
3. Zeitpunkte, die für die Auswertung zählen, dort nachtragen, wo sie eingetippt werden — sie sind ein Feld und keine Systemzeit.

**Nicht:** Die Uhr während einer laufenden Erfassung zurückstellen und darauf hoffen, dass sich die Reihenfolge korrigiert. Sie tut es nicht, weil sie nie daran hing.

Grundlage: KONZEPT-EREIGNISSE.md §2.5, §2.6

### Zwei Arbeitsplätze haben dasselbe Feld geändert

**Woran es auffällt:** Die Diagnoseansicht zählt Konflikthinweise; in der Maske steht der Wert des einen, nicht der des anderen.

**Was dahintersteckt:** Zwei Bediener haben dasselbe Feld geändert, ohne den Stand des anderen gesehen zu haben. Der Fold entscheidet dann nach fester Regel und merkt sich, was er verdrängt hat.

1. Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert (§3.8).
2. Fachlich klären, welcher Wert stimmt — das entscheidet ein Mensch und kein Programm.
3. Den richtigen Wert neu eintragen. Damit ist er der jüngste und gewinnt.

**Nicht:** Den Hinweis als Fehler melden. Er ist die Zusage, dass nichts still verschwunden ist (Auflage 6).

Grundlage: KONZEPT-EREIGNISSE.md §2.2a, §3.8

### Ein Programmpaket auf dem Share wird abgelehnt

**Woran es auffällt:** Die Anwendung zeigt statt eines Angebots eine Ablehnung mit Grund.

**Was dahintersteckt:** Das Manifest im Ordner `programm\` passt nicht: fremder Schlüssel, falsche Signatur, ausgetauschte Datei, andere Plattform oder eine ältere Version.

1. Den genannten Grund lesen. „Nicht neuer“ und „andere Plattform“ sind Alltag und kein Vorfall.
2. Bei fremdem Schlüssel oder falscher Signatur: Das Paket **nicht** ausführen, sondern denjenigen fragen, der es abgelegt hat.
3. Ein neues Paket wird abgelegt, indem Datei und Manifest zusammen ersetzt werden — nie die Datei allein.

**Nicht:** Die abgelehnte Datei von Hand aus dem Ordner starten. Die Ablehnung ist der Zweck der Prüfung, nicht ihr Hindernis.

Grundlage: M7.2, Entscheidung 7

### Die Anwendung startet nicht

**Woran es auffällt:** Kein Fenster, oder ein Fenster mit einer Fehlermeldung beim Öffnen des Einsatzes.

**Was dahintersteckt:** Meist die Einstellungsdatei oder der lokale Spiegel, seltener eine Freigabe, auf die der angemeldete Benutzer kein Recht hat.

1. Die Protokolldatei öffnen — ihr Ort steht in der Diagnoseansicht und in der Kurzanleitung.
2. Startet die Anwendung ohne Einsatz, aber nicht mit: Ein anderer Rechner führt den Einsatz weiter, dieser wird nachgezogen.
3. Startet sie gar nicht: Die portable Fassung vom Stick starten. Sie braucht keine Installation und keinen Spiegel.
4. Der lokale Spiegel darf gelöscht werden. Er wird vom Share neu aufgebaut; die Wahrheit liegt dort (§1.3).

**Nicht:** Dateien im Einsatzordner auf dem Share löschen oder von Hand bearbeiten. Das ist der einzige Griff, der Daten kostet.

Grundlage: KONZEPT-SPEICHER.md §1.3, §1.4

### Ein Erfassungsbogen lässt sich nicht einlesen

**Woran es auffällt:** Der Handscanner gibt nichts weiter, oder der Eingangskorb meldet einen unlesbaren Bogen.

**Was dahintersteckt:** Der Code ist zu klein gedruckt, grau kopiert, geknickt oder das Papier ist nass. Seltener: Es ist ein Bogen einer anderen Fassung.

1. Den Bogen glätten und flach auflegen; bei Kopien das Original suchen.
2. Hilft das nicht: Die Werte von Hand in die Einheitenmaske eintragen. Der Bogen ist ein Weg und keine Voraussetzung.
3. Den Meldekopf bitten, künftig im Original und nicht als Kopie zu geben.

**Nicht:** Den Bogen wegwerfen, bevor die Werte erfasst sind. Er ist bis dahin die einzige Fassung.

Grundlage: KONZEPT-EREIGNISSE.md §5.8, EXH C159–C172

<!-- STÖRFALLMATRIX ENDE -->
