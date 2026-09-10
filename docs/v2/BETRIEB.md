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

### Der Weg über den Knopf

Der bequeme Weg, und der vorgesehene: An **einem** Rechner der
Führungsstelle steht unter dem Lagebild der Knopf **„Neues Paket für die
Führungsstelle holen“**. Er lädt Manifest und Paket aus der Veröffentlichung,
prüft Schlüssel, Signatur, Plattform, Fassung und Hash — und legt beides in
`programm\`. Die anderen Arbeitsplätze bekommen es danach angeboten, ohne
selbst etwas aus dem Netz zu holen.

Zwei Dinge dazu, beide wichtig:

* **Nicht während einer laufenden Lage.** Der Download geht über dieselbe
  Leitung wie der Share, dauert bei neunzig Megabyte mehrere Minuten und kann
  die Übertragung der Einträge verzögern. Ist ein Einsatz geöffnet, warnt die
  Anwendung und verlangt eine zweite Bestätigung. Der richtige Zeitpunkt ist
  vor dem Einsatz.
* **Es wird geholt, nicht installiert.** Auch nach dem Knopfdruck ersetzt sich
  nichts von selbst. Danach liegt eine Datei auf dem Share, und ein Mensch
  startet sie.

Kommt eine der Prüfungen nicht durch, wird **nichts** geschrieben, und die
Anwendung nennt den Grund. Ein Paket, das erst auf dem Share auffiele, hätte
man den anderen Arbeitsplätzen bereits hingelegt.

Der Knopf ist der einzige Ruf, den diese Anwendung nach draußen tut, und er
geschieht nur auf Druck. Es gibt keinen Auto-Updater, keine Hintergrundabfrage
und keine Telemetrie.

### Einmalig: das Schlüsselpaar

Bevor überhaupt etwas verteilt werden kann, braucht die Führungsstelle **ein**
Schlüsselpaar. Es wird einmal erzeugt und danach nie wieder: Ein zweites
erklärt jedes bereits veröffentlichte Manifest für ungültig, weil die
Arbeitsplätze mit der alten Fassung es als fremden Schlüssel ablehnen.

```
s1 paket schluessel
```

Das Kommando legt den privaten Teil in `verteilschluessel.privat` — mit
Rechten für den Eigentümer allein — und schreibt auf den Bildschirm nur den
öffentlichen, als fertige Zeile für den Quelltext:

```
export const VERTRAUTER_SCHLUESSEL = "…64 Hexzeichen…";
```

Diese Zeile ersetzt die gleichnamige in
`apps/desktop/src/main/verteilschluessel.ts`. Danach neu bauen und
ausliefern: **Erst eine Fassung, die diesen Schlüssel kennt, nimmt damit
signierte Pakete an.** Solange dort nichts steht, wird nichts angeboten und
nichts geholt, und die Anwendung sagt warum.

Der private Teil gehört in den Tresor der Führungsstelle und in kein
Repository. Wer ihn verliert, kann keine Pakete mehr veröffentlichen; wer ihn
findet, kann es. Unter Windows setzt das Kommando keine Dateirechte — dort
schützt die Datei, wer sie wohin legt.

### Ein Paket signieren

```
s1 paket signiere S1-Control-2.1.0-win-x64.exe \
   --schluessel verteilschluessel.privat \
   --version 2.1.0 \
   --hinweis "Was sich geändert hat"
```

Das Kommando bildet Größe und SHA-256, setzt die Plattform aus der Endung
(überschreibbar mit `--plattform`) und schreibt `manifest.json` neben das
Paket. Die Fassung wird **nicht** geraten: An ihr hängt der Vergleich, der
entscheidet, ob ein Update angeboten wird.

Paket und Manifest gehören ab jetzt zusammen. Die Datei allein wird abgelehnt.

### Der Weg von Hand

Wenn die Führungsstelle kein Internet hat oder das Paket aus einer anderen
Quelle kommt:

1. Das Paket bauen (`npm run build:paket`) oder aus den CI-Artefakten holen.
2. Ein Manifest signieren, mit `s1 paket signiere` wie oben.
3. Datei **und** Manifest zusammen in `<share>\S1-Control\programm\` legen.
   Nie die Datei allein: Die Prüfung vergleicht den Hash und lehnt sonst ab.

### Was eine Veröffentlichung tragen muss

Damit der Knopf sie benutzen kann, braucht eine Veröffentlichung zwei Anhänge:

* `manifest.json` — signiert, wie oben.
* die Paketdatei, **genau unter dem Namen**, den das Manifest in `datei`
  nennt.

Entwürfe und Vorabfassungen werden übergangen: Wer eine Vorabfassung an eine
Führungsstelle geben will, gibt sie ausdrücklich und nicht dadurch, dass
jemand auf einen Knopf drückt.

Solange kein Schlüssel hinterlegt ist, wird nichts angeboten und nichts
geholt, und die Anwendung sagt warum. Das ist die sichere Vorbelegung — ein
Platzhalter, der alles annähme, sähe aus wie eine Prüfung und wäre keine.

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

* **Keine automatische Installation.** Siehe oben: geholt und angeboten, nicht
  eingespielt. Es gibt keinen Auto-Updater.
* **Keine Telemetrie.** Was auf dem Rechner der Führungsstelle geschieht,
  bleibt dort. Das Protokoll liegt im Benutzerprofil und geht nirgendwohin.
* **Kein Sperren.** Zwei Bediener können dasselbe Feld ändern. Das Programm
  entscheidet dann nach fester Regel und merkt sich, was es verdrängt hat
  (§2.2a, §3.8) — es verhindert den Fall nicht, es macht ihn sichtbar.

## Wenn etwas klemmt

Im Programm: **Nebenblätter → Diagnose.** Die sechs Störfälle stehen in
[KURZANLEITUNG.md](KURZANLEITUNG.md) zum Ausdrucken.
