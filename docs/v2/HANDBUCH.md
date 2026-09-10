# S1-Control — Handbuch

Für die, die damit arbeiten: Zugtrupp, Führungsstelle, Meldekopf. Wer den
Share einrichtet, liest [BETRIEB.md](BETRIEB.md); wer eine Karte neben den
Rechner legen will, druckt [KURZANLEITUNG.md](KURZANLEITUNG.md).

Vier Abschnitte dieses Handbuchs sind **erzeugt** — Tastenkürzel, Ansichten,
Abkürzungen, Störfälle. Sie stammen aus denselben Listen, aus denen die
Anwendung sie zeigt. Wer einen dieser Texte ändern will, ändert ihn im
Quelltext und erneuert diese Datei mit `npm run doku:handbuch`. Ein Test
scheitert, wenn beides auseinanderläuft.

## Was das Programm ist

Eine Ablösung der Excel-Mappe, mit der die Führungsstelle heute die Stärke
führt. Dieselben Zahlen, dieselben Ausdrucke, dieselben Tastenkürzel — aber
mehrere Rechner gleichzeitig, ohne dass jemand eine Datei „für sich“ öffnen
muss.

Drei Sätze beschreiben, wie es innen arbeitet, und sie erklären fast alles,
was im Betrieb überrascht:

**Erfasst werden Ereignisse, nicht Zustände.** Wer eine Einheit auf „im
Einsatz“ setzt, schreibt keinen Wert in eine Zelle, sondern einen Satz: „Diese
Einheit hat zu diesem Zeitpunkt diesen Status bekommen.“ Der Bildschirm zeigt,
was sich aus allen Sätzen ergibt (KONZEPT-EREIGNISSE.md §3.1).

**Jeder Rechner schreibt nur seine eigenen Dateien.** Auf dem Share liegt je
Arbeitsplatz eine Datei; niemand verändert die eines anderen. Deshalb braucht
es keine Sperren und keinen Server (KONZEPT-SPEICHER.md §1.3).

**Alles wird zuerst lokal geschrieben.** Der Share ist die zweite Station.
Fällt er aus, geht nichts verloren — es dauert nur, bis die anderen es sehen.

## Ein Einsatz von Anfang bis Ende

1. **Einstellungen prüfen.** Sharepfad und Anzeigename. Der Name steht in der
   Statuszeile der anderen; „Zugtrupp“ ist nützlicher als „PC-3“.
2. **Einsatz anlegen** — einmal, von einem Rechner. Name und Datum ergeben den
   Ordner; danach ist der Einsatz unveränderlich verankert (§5.6).
3. **Alle anderen öffnen ihn** aus der Liste. Ab jetzt sehen sich alle in der
   Statuszeile.
4. **Abschnitte anlegen.** Die Führungsorganisation zuerst, damit Einheiten
   hineingehören können. Unterabschnitte gehen beliebig tief.
5. **Einheiten erfassen** — von Hand, aus einer Vorlage, per Handscanner vom
   Erfassungsbogen oder über den Eingangskorb aus einer Bündeldatei.
6. **Status führen.** Das ist die eigentliche Arbeit der Schicht: Wer ist wo,
   seit wann, wie lange noch.
7. **Anforderungen führen.** Was fehlt, was zugesagt ist, was eingetroffen ist.
8. **Ausgaben erzeugen**, wenn die Führung sie braucht: Druck, Status-Matrix,
   Auswertung, Log, Kosten.
9. **Zum Schichtwechsel:** Nichts. Die Ablösung setzt sich an denselben
   Rechner oder öffnet den Einsatz an einem anderen.
10. **Nach dem Einsatz:** `s1 akte exportiere` und das Archiv sichern. Wie das
    geht, steht in [BETRIEB.md](BETRIEB.md).

## Was ein Zurücknehmen tut

Strg+Z nimmt die letzte **eigene** Handlung zurück. Es löscht nichts: Die
Rücknahme ist selbst ein Ereignis und steht im Tagebuch (§6 U3, §5.9.1).

Zwei Grenzen gehören dazu. Hat ein anderer Arbeitsplatz dieselbe Handlung
bereits zurückgenommen, ist der alte Stand schon wiederhergestellt — ein
zweites Zurücknehmen verwürfe fremde Arbeit und findet deshalb nicht statt.
Und was in einem Endzustand steht, nimmt keine Änderung mehr an: eine
erledigte Anforderung etwa (§5.6.2).

## Wenn zwei dasselbe ändern

Es passiert, und es ist kein Fehler. Das Programm entscheidet nach fester Regel
— der jüngere Eintrag gewinnt — und **merkt sich, was es verdrängt hat**. Der
Hinweis nennt Feld, Gewinner und verdrängten Wert (§2.2a, §3.8).

Was damit zu tun ist, entscheidet ein Mensch: Der richtige Wert wird neu
eingetragen und ist damit der jüngste. Die Hinweise stehen in der
Diagnoseansicht.

## Die Ansichten

<!-- ANSICHTEN ANFANG — erzeugt, nicht von Hand ändern -->

### Lage

Der Überblick: Stärke nach Status, Zahl der Abschnitte und Einheiten, der Stand des Einsatzes.

**Zuerst:** Nichts. Diese Ansicht bleibt offen, während gearbeitet wird.

**Gut zu wissen:** Die Zahlen ändern sich, ohne dass jemand an diesem Rechner etwas tut. Sie kommen von den anderen Arbeitsplätzen.

**Kürzel:** Strg+H

### Abschnittsbaum

Die Führungsorganisation: Einsatzabschnitte, Unterabschnitte und was daran hängt.

**Zuerst:** Mit Strg+N einen Abschnitt anlegen; Einheiten kommen danach hinein.

**Gut zu wissen:** Ein aufgelöster Abschnitt verschwindet nicht, er wird als aufgelöst geführt. Seine Einheiten stehen dann wieder frei (§5.3).

**Kürzel:** Strg+N · Strg+E · Strg+M · Strg+F · Strg+Z

### Einheitentabelle

Alle Einheiten der Lage mit Stärke, Status und Zeiten — das Gegenstück zum Blatt „Stärke“ der Excel.

**Zuerst:** Suchen (Strg+F) oder mit Strg+N eine Einheit anlegen.

**Gut zu wissen:** Eine entfernte Einheit bleibt sichtbar, wenn „mit Stillgelegten“ gewählt ist. Entfernen ist kein Löschen (§5.4.5).

**Kürzel:** Strg+N · Strg+E · Strg+M · Strg+F · Strg+Q · Strg+D · Strg+Z

### Tagebuch

Was wann geschehen ist, aus den Ereignissen abgeleitet.

**Zuerst:** Filtern — nach Einheit, Abschnitt oder Text.

**Gut zu wissen:** Rücknahmen stehen als eigene Zeilen darin und löschen nichts. Das Tagebuch ist eine Projektion und kein Eintragsbuch (§5.9.1).

**Kürzel:** Strg+F

### Eingangskorb

Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden.

**Zuerst:** Eine Meldung wählen und übernehmen oder ablehnen.

**Gut zu wissen:** Derselbe Bogen zweimal eingelesen ergibt eine Meldung, keine zwei — die Kennung ist der Inhalt (§3.6, §5.8.1).

**Kürzel:** Strg+Q · Strg+F

### Anforderungen

Was angefordert, zugesagt, eingetroffen oder storniert ist.

**Zuerst:** Mit Strg+N eine Anforderung anlegen.

**Gut zu wissen:** Eine erledigte oder stornierte Anforderung nimmt keine Änderung mehr an; sie ist am Ende ihrer Kette (§5.6.2).

**Kürzel:** Strg+N · Strg+F · Strg+D

### Führungsstelle

Dienstposten der eigenen Führungsstelle und der Schichtplan dazu.

**Zuerst:** Einen Dienstposten anlegen; besetzt wird er je Tag und Schicht.

**Gut zu wissen:** Ein angelegter Dienstposten belegt noch keinen Platz im Schichtplan. Der Plan hängt am Paar aus Posten und Datum (§5.7).

**Kürzel:** Strg+N · Strg+E

### Kosten

Die Abrechnung: PSA, VDA, Unterkunft und Verpflegung je Einheit.

**Zuerst:** Oben die vier Parameter des Einsatzes setzen.

**Gut zu wissen:** Die Parameter gehören zum Einsatz und nicht zu diesem Rechner: Sie gelten für alle Arbeitsplätze (§5.2).

### Ausgaben

Druck, Status-Matrix, Auswertung, Log und Kostenübersicht als HTML, PDF oder Tabelle.

**Zuerst:** Ausgabe und Format wählen; die Datei landet im Ordner „ausgaben“ des Einsatzes.

**Gut zu wissen:** Der Dateiname trägt den Zeitpunkt. Eine zweite Ausgabe überschreibt die erste nicht.

### Diagnose

Wer sonst am Einsatz arbeitet, wie weit die Stände auseinander sind, wo die Protokolldatei liegt.

**Zuerst:** Von oben nach unten lesen: zutreffende Störfälle, Arbeitsplätze, Pfade.

**Gut zu wissen:** Ein Rückstand bei einem Arbeitsplatz ist kurz nach dessen Eingabe normal. Erst ein stehender Rückstand ist eine Auskunft.

<!-- ANSICHTEN ENDE -->

## Tastenkürzel

<!-- TASTENKARTE ANFANG — erzeugt, nicht von Hand ändern -->

### Allgemein

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+N | Neuen Eintrag anlegen — Abschnitt oder Einheit, je nach gewählter Ansicht | Strg+N (Zeilen einfügen) |
| Strg+E | Gewählten Eintrag entfernen; verlangt einen Grund (§2.4) | Strg+E (Zeilen entfernen) |
| Strg+M | Gewählte Einheiten in einen anderen Abschnitt verschieben | Strg+M (Zeilen verschieben) |
| Strg+F | In die Suche springen | — |
| Strg+Z | Letzte eigene Aktion zurücknehmen (§6 U3) | — |
| Strg+H | Abkürzungsliste und Tastenkarte öffnen | Strg+H (AküLi) |

### Masken

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+D | „Jetzt“ in das Zeitfeld schreiben, in dem der Cursor steht | Strg+D (=Now in die aktive Zelle) |
| Enter | Maske bestätigen | — |
| Escape | Maske abbrechen, Auswahl aufheben | — |

### Einheiten

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+Q | Erfassungsbogen vom Handscanner einlesen | Strg+Q (digitaler EEB in neue Zeile) |

<!-- TASTENKARTE ENDE -->

## Wenn etwas klemmt

Im Programm: **Nebenblätter → Diagnose**, oder Strg+H und der Reiter
„Störfälle“.

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

## Abkürzungen

Dieselbe Liste zeigt Strg+H. Sie stammt aus dem Blatt „AküLi“ der Excel.

<!-- AKÜLI ANFANG — erzeugt, nicht von Hand ändern -->

### Einheiten

| Kürzel | Bedeutung |
|---|---|
| FM Veg | Fachmodul Vegetationsbrandbekämpfung |
| FGr VersES | Fachgruppe Versorgung und Eigenschutz |
| FM Hfs | Fachmodul Hochleistungsförderpumpensystem |
| FüGr FB Nds | Führungsgruppe Feuerwehrbereitschaft Nds |
| FZ BS | Fachzug Brandschutz |
| FZ TH | Fachzug Technische Hilfe |
| FZ VegBBK | Fachzug Vegetationsbrandbekämpfung |
| FZ WT | Fachzug Wassertransport |
| GE MobHWS | Geräteeinheit mobiles Hochwasserschutzsystem |
| GE SFM | Geräteeinheit Sandsackfüllmaschine (GE SFM) |
| Gr BT | Gruppe Betreuung |
| Gr EV | Gruppe Energieversorgung |
| Gr Fü | Gruppe Führung |
| Gr LT | Gruppe Logistik und Technik |
| Gr San | Gruppe Sanitätsversorgung |
| Gr STau | Gruppe Spezial Tauchen |
| Gr Tau | Gruppe Einsatz Tauchen |
| Gr Vpf | Gruppe Verpflegung |
| Gr WR | Gruppe Wasserrettung |
| GTr W | Gerätetrupp Wassergefahren |
| LG | Löschgruppe |
| St BtL | Staffel Betreuungstransport- und -leitung |
| St Log Schlauch | Staffel Logistik Schlauch |
| St Log WT | Staffel Logistik Wassertransport |
| St PSNV | Staffel Psychosoziale Notfallversorgung |
| St PT | Staffel Patiententransport |
| St Reg | Staffel Registrierung |
| St StrWR | Staffel Strömungswasserrettung |
| St WR | Staffel Wasserrettung |
| StLog WE | Staffel Logistik Wasserentnahme |
| Tr Akl | Trupp Aufklärung Luft |
| TR L | Trupp Logistik schwer |
| Tr Log Schlauch | Trupp Logistik Schlauch |
| Tr LogFü | Trupp Logistik Führung |
| Tr ML | Trupp Melde- und Lotsen |
| Tr T | Trupp Transport Bus 50 |
| Tr TH | Trupp Technische Hilfe |
| Tr VegBBK | Trupp Vegetationsbrandbekämpfung |
| Tr WT | Trupp Wassertransport |
| Z SB | Zug Sanität und Betreuung |
| ZTr | Zugtrupp |
| ZTr WR | Zugtrupp Wasserrettung |

### Fahrzeuge und Geräte

| Kürzel | Bedeutung |
|---|---|
| AB HFS | Abrollbehälter mit Hochleistungsförderpumpensystem |
| AB Log | Abrollbehälter Logistik |
| AB Mulde | Abrollbehälter Mulde |
| AB Veg | Abrollbehälter Vegetationsbrandbekämpfung |
| Anh | Anhänger |
| Anh Bt | Anhänger Betreuung |
| Anh Kühl | Kühlanhänger |
| Anh Log | Anhänger für Logistikzwecke |
| Anh Tank | Anhänger mobile Kraftstoffversorgung |
| Anh Trsp | Anhänger zum Transport |
| Anh Zelt | Anhänger Zelt |
| DLK 23/12 | Drehleiter Korb, Rettungshöhe 23 m, Ausladung 12 m |
| ELW 1 | Einsatzleitwagen 1 |
| ELW 2 | Einsatz Leit Wagen 2 |
| FKH | Feldkochherd |
| FüKw | Führungs Kraftwagen |
| GW Bt | Gerätewagen Betreuungsdienst |
| GW L 7,5 | Gerätewagen Logistik „7,5“ |
| GW L Gr | Gerätewagen Logistik groß |
| GW L kl | Gerätewagen Logistik klein |
| GW San | Gerätewagen Sanitätsdienst |
| GW SpTau | Gerätewagen Spezialtauchen |
| GW Tau | Gerätewagen Tauchen |
| GW Vpf | Gerätewagen Verpflegung |
| GW WGT | Gerätewagen Wassergefahren / Technik |
| GW-L1 Vpf | Gerätewagen Logistik 1 Verpflegung |
| GW-L1BTrMt | Gerätewagen Logistik 1 Betriebsmittel |
| GW-L2 | Gerätewagen Logistik 2 |
| GW-L2 HFS | Gerätewagen-Logistik 2 mit Hochleistungsförderpumpensystem |
| GW-L2 SW | Gerätewagen Logistik 2 Schlauch |
| GW-L2 TH | Gerätewagen Logistik 2 Technische Hilfe |
| GW-L2 Vers | Gerätewagen Logistik 2 Versorgung |
| GW-Str | Gerätewagen Strömungsrettung |
| GW-WR | Gerätewagen Wasserrettung |
| HWB | Hochwasserschutzboot |
| KdoW | Kommando Wagen |
| KOM | Kraft Omnibus |
| Kombi UAV | Kombinationskraftwagen Unbemanntes Luftfahrzeug |
| Kombi-L | Kombinationskraftwagen Logistik |
| Krad | Kraftrad |
| KTW | Kranken Transport Wagen |
| LF 20/16 | Löschfahrzeug 20/16 (2000 ltr/min, 1600 ltr Tank) |
| LF KatS | Löschgruppenfahrzeug Katastrophenschutz |
| LKW K | Lastkraftwagen Kipper |
| LZ FW | Löschzug Feuerwehr |
| Mat Cont | Materialcontainer |
| MTW | Mannschaft Transport Wagen |
| MTW Bt | Mannschaft Transport Wagen Betreuung |
| MTW Vpf | Mannschaftstransportwagen Verpflegung |
| MTWm | Mannschaftstransportwagen multifunktional |
| MZB KatS | Mehrzweckboot Katastrophenschutz |
| NEA 250 | Netzersatzanlage 250 kVA |
| NEA LiMa | Netzersatzanlage mit Lichtmast |
| Raft | Schlauchboot |
| RTW | Rettungswagen |
| RW | Rüstwagen |
| SMF | Sandsackfüllmaschine, elektromechanisch |
| SW KatS | Schlauchwagen Katastrophenschutz |
| TB KS 6000 L | mobiler Tankbehälter Kraftstoff 6000 Liter |
| TLF 16/25 | Tank Löschfahrzeug 16/25 (1600 ltr/min, 2500 ltr Tank) |
| TLF 2000 | Tanklöschfahrzeug 2000 |
| TLF 3000 | Tanklöschfahrzeug 3000 |
| TSF | Tragkraftspritzen Fahrzeug |
| UslG | Umschlaggerät |
| WLF | Wechsellader Fahrzeug |
| ZTrKw | Zugtruppkraftwagen |

<!-- AKÜLI ENDE -->
