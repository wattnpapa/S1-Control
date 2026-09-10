# Betrieb von S1-Control

Wer diese Seite braucht, richtet einen Share ein, verteilt ein Programmpaket
oder steht vor einem NAS, das nicht mehr antwortet. Sie beschreibt, was M7
gebaut hat, und sie sagt bei jedem Schritt, worauf er sich stützt.

Die Anwendung ist für Windows gebaut (Entscheidung 24). macOS läuft für die
Entwicklung, Linux nur in der CI; die Pfade unten sind deshalb Windows-Pfade.

## Der Share

### Was er ist

Eine gewöhnliche SMB-Freigabe. Kein Dienst, keine Datenbank, kein Serverdienst
auf dem NAS. Die Anwendung schreibt in Dateien und liest Dateien — das ist die
gesamte Kopplung zwischen zwei Arbeitsplätzen.

Der Grund steht in KONZEPT-SPEICHER.md §1.3: **Ein Schreiber je Datei.** Kein
Arbeitsplatz verändert je eine Datei, die ein anderer geschrieben hat. Damit
trifft keine der bekannten SMB-Schwächen den Schreibpfad — Byte-Range-Locks,
Oplock-Breaks, die Metadaten-Caches des Windows-Redirectors treffen
ausschließlich Modelle, in denen mehrere Rechner dieselbe Datei schreiben.

### Einrichten

1. Auf dem NAS eine Freigabe anlegen, etwa `\\nas\einsatz`.
2. Darin **keinen** Ordner von Hand anlegen. Die Anwendung legt beim ersten
   Einsatz `S1-Control\einsaetze\` selbst an.
3. In der Anwendung unter Einstellungen den Pfad der Freigabe eintragen und
   einen Anzeigenamen setzen. Der Anzeigename steht später in der Statuszeile
   der anderen Arbeitsplätze; „Zugtrupp“ ist nützlicher als „PC-3“.

Der Ordner unter der Freigabe sieht danach so aus (KONZEPT-SPEICHER.md §1.4):

```
<share>\S1-Control\
  einsaetze\<datum>_<name>_<kurzid>\
    einsatz.json          unveränderlich, der Anker des Einsatzes
    ereignisse\           je Arbeitsplatz eine Datei je Segment
    schnappschuesse\      Beschleuniger, jederzeit verwerfbar
    praesenz\             wer gerade da ist
    anhaenge\
    ausgaben\             erzeugte Ausdrucke, HTML-Monitor
  programm\               Update-Ablage
  stammdaten\
```

### Ordnerrechte

Jeder Arbeitsplatz braucht auf `S1-Control\` **Lesen und Schreiben**, und zwar
rekursiv. Weniger geht nicht, mehr ist nicht nötig:

* **Lesen** überall, weil jeder Arbeitsplatz die Dateien aller anderen liest.
  Das ist das Verfahren und keine Bequemlichkeit: Der Zustand entsteht bei
  jedem aus der Summe aller Ereignisse (§1.3, Satz 3).
* **Schreiben und Anlegen** überall, weil ein Arbeitsplatz neue Segmente und
  Präsenzdateien anlegt und an seine eigenen anhängt.
* **Löschen** braucht niemand. Es schadet nicht, wenn das Recht besteht; wer
  es entzieht, verhindert genau den einen Griff, der Daten kostet.

Ein Konto je Arbeitsplatz ist gut, ein gemeinsames Konto genügt. Die Anwendung
unterscheidet Arbeitsplätze an ihrer eigenen Kennung (§4.1) und nicht am
Windows-Konto.

**Was nicht funktioniert:** Ein Share, der nur einem Rechner Schreibrecht gibt
und den anderen Lesen. Die anderen könnten dann nichts erfassen — sie sind
keine Betrachter, sondern gleichberechtigte Schreiber.

**Offline-Dateien abschalten.** Die Windows-Funktion „Immer offline verfügbar“
legt eine zweite Kopie an, die zeitversetzt zurückgeschrieben wird. Das
verletzt „ein Schreiber je Datei“ von außen.

## Ein Programmpaket verteilen

Der Verteilweg ist der Share (Entscheidung 7; ein LAN-Peer-Update ist
gestrichen). Ein Paket wird angeboten, nie eingespielt: Die Anwendung zeigt,
dass etwas bereitliegt und wo. Auslösen tut ein Mensch.

1. Das Paket bauen (`npm run build:paket`) oder aus den CI-Artefakten holen.
2. Ein Manifest signieren. Es trägt Version, Dateiname, Größe, SHA-256 und
   eine Ed25519-Signatur; der öffentliche Schlüssel ist in der Anwendung
   hinterlegt (`apps/desktop/src/main/verteilschluessel.ts`).
3. Datei **und** Manifest zusammen in `<share>\S1-Control\programm\` legen.
   Nie die Datei allein: Die Prüfung vergleicht den Hash und lehnt sonst ab.

Solange kein Schlüssel hinterlegt ist, wird nichts angeboten, und die
Anwendung sagt warum. Das ist die sichere Vorbelegung — ein Platzhalter, der
alles annähme, sähe aus wie eine Prüfung und wäre keine.

## Notverfahren bei NAS-Ausfall

**Der Ausfall ist der Normalpfad, nicht der Fehlerpfad** (§1.3, Satz 2). Jedes
Ereignis wird zuerst lokal geschrieben und mit `fsync` dauerhaft gemacht; die
Spiegelung auf den Share ist ein wiederholbarer Append ab einem gemerkten
Offset. Es gibt deshalb keinen Handgriff, der beim Ausfall nötig wäre.

**Kurzer Ausfall (Minuten).** Weiterarbeiten. Die Statuszeile zeigt „Share
nicht erreichbar“ und die Zahl der noch nicht übertragenen Bytes. Kommt die
Freigabe zurück, gleicht sich alles selbst ab.

**Langer Ausfall (Stunden).** Weiterarbeiten, aber auf **einem** Rechner. Die
anderen erfassen sonst Dinge, die erst beim Zusammenführen sichtbar werden;
fachlich ist das kein Datenverlust — der Fold führt sie zusammen —, aber
niemand hat währenddessen ein vollständiges Bild. Wer eine Ausgabe braucht,
erzeugt sie auf dem führenden Rechner.

**NAS kommt nicht wieder.** Einen zweiten Share einrichten (auch ein
freigegebener Ordner auf einem der Arbeitsplätze genügt) und in den
Einstellungen eintragen. Die lokalen Spiegel werden auf den neuen Share
hochgespielt; die Einsatzakte ist danach dort vollständig.

**Was in keinem dieser Fälle geschieht:** Dateien im Einsatzordner löschen
oder von Hand bearbeiten. Der lokale Spiegel im Benutzerprofil darf gelöscht
werden — er wird neu aufgebaut. Der Share nicht.

## Die Einsatzakte auf USB übergeben

Zum Nachbereiten, zur Übergabe an die nächste Schicht oder als Sicherung
außerhalb des NAS. Das Archiv enthält Ereignisse, Schnappschüsse, Anhänge und
Ausgaben; die Präsenzdateien bleiben draußen, weil sie nur beschreiben, wer
gerade da war (§6.4).

```
s1 akte exportiere <einsatzordner> --ziel E:\uebergabe\einsatz.zip
s1 akte importiere E:\uebergabe\einsatz.zip --ziel D:\einsatz-kopie
s1 akte pruefe D:\einsatz-kopie --vergleiche <einsatzordner>
```

Der dritte Aufruf ist der wichtige: Er prüft beide Seiten und vergleicht den
`zustandsHash` (§7.6). Stimmen die Hashes überein, tragen beide Ordner
dieselbe Lage — nicht dieselben Bytes, sondern denselben gefalteten Zustand.
Das ist die Zusage, die eine Übergabe braucht.

Das Archiv ist ein gewöhnliches ZIP mit gespeicherten (nicht komprimierten)
Einträgen und CRC-32 je Eintrag; jeder Packer kann es öffnen. Wer es von Hand
auspackt, verliert nichts, prüft aber auch nichts.

## Was der Betrieb nicht kann

* **Keine automatische Installation.** Siehe oben: angeboten, nicht eingespielt.
* **Keine Telemetrie.** Was auf dem Rechner der Führungsstelle geschieht,
  bleibt dort. Das Protokoll liegt im Benutzerprofil und geht nirgendwohin.
* **Kein Sperren.** Zwei Bediener können dasselbe Feld ändern. Das Programm
  entscheidet dann nach fester Regel und merkt sich, was es verdrängt hat
  (§2.2a, §3.8) — es verhindert den Fall nicht, es macht ihn sichtbar.

## Wenn etwas klemmt

Im Programm: **Nebenblätter → Diagnose.** Die sechs Störfälle stehen in
[KURZANLEITUNG.md](KURZANLEITUNG.md) zum Ausdrucken.
