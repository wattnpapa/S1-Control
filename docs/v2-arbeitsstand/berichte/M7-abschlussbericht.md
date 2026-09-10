# M7 — Verteilung und Betrieb: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M7 aus
[03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md), im Umsetzungsplan der
Block [V](../../v2/05-UMSETZUNGSPLAN.md)

**M7 ist gebaut bis unmittelbar an die Hardware.** Es gibt eine Paketierung,
die auf drei Plattformen baut und einen per-User-Installer erzeugt; einen
Update-Weg über den Share, dessen Prüfung vollständig testbar ist; eine
Diagnoseansicht, die im Störfall etwas zu sagen hat; und drei Dokumente, die
beschreiben, wie das alles betrieben wird.

Was M7 **nicht** liefert, stand schon im Auftragsdokument: die Installation
auf einem Rechner der Führungsstelle, ein Zertifikat, eine Abnahmeübung. Der
Meilenstein war von Anfang an darauf angelegt, bis genau dorthin zu bauen und
das Ergebnis abhakbar zu hinterlassen. Das ist [ABNAHME.md](../../v2/ABNAHME.md).

Ein Fehler gehört an den Anfang dieses Berichts und nicht in eine Fußnote: Ich
habe `ec14cf5` gesetzt, während ein Test rot war — einer, den ich in M5.3
selbst geschrieben hatte. Die Regel lautet: Gates je Commit, keine
übersprungenen Tests. Die Korrektur steht in `c861425` und sagt das dort auch.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M7.1 | Paketierung: NSIS per User, Portable, DMG, deb; CI-Artefakte | fertig — **Installation auf einem FüSt-Rechner offen** |
| M7.2 | Update über den Share mit signiertem Manifest | fertig — **Vertrauensanker und Einspielen offen** |
| M7.3 | Diagnoseansicht und Störfallmatrix | fertig |
| M7.4 | `BETRIEB.md`, Kurzanleitung, Abnahmeliste | fertig — **Durcharbeiten durch eine zweite Person offen** |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1505
Tests in 115 Dateien grün** (von 1428 zum Ende von M6).

## Die Commits

| Commit | Inhalt |
|---|---|
| `a9e2e0e` | Auftragsdokument: Reihenfolge und was M7 nicht beweisen kann |
| `ec14cf5` | M7.1: die Paketierung |
| `c861425` | Zeitbomben in drei Szenariendateien entschärft (Korrektur zu `ec14cf5`) |
| `6475ac7` | M7.2: das Update über den Share, mit signiertem Manifest |
| `461dbcb` | M7.3: Diagnoseansicht und die sechs Störfälle als Daten |
| `1c7f908` | M7.4: `BETRIEB.md`, Kurzanleitung, Abnahmeliste |

## Was festgelegt wurde, und warum gerade so

### Der Installer installiert per Benutzer

`perMachine: false`, `oneClick: false`, Installationsziel änderbar. Das ist
keine Bequemlichkeit, sondern die Zusage, an der nach M-1 der ganze
Desktop-Ansatz hängt: Wer auf einem Rechner der Führungsstelle keine
Administratorrechte hat, muss die Anwendung trotzdem installieren können.
`bau/paket.test.ts` prüft genau diese Zeilen der Konfiguration — nicht den
gebauten Installer, den es in der CI und auf einer Maschine mit Zertifikat
gibt, sondern die **Entscheidungen**, die in ihn eingehen.

Dazu kommt eine portable EXE. Sie ist im Störfall die Rückfallebene: Startet
die installierte Fassung nicht, startet die portable vom Stick, ohne Profil
und ohne Spiegel.

### Signiert wird, wenn ein Zertifikat da ist — sonst nicht

`apps/desktop/bau/paket.mjs` setzt `CSC_IDENTITY_AUTO_DISCOVERY=false`, wenn
kein Zertifikat vorliegt, und schaltet die Notarisierung ab, wenn keine
Apple-Kennung gesetzt ist. Ein Bau, der ohne Geheimnisse abbricht, wäre in der
CI ein Dauerrot; einer, der stillschweigend etwas anderes tut, wäre schlimmer.
So baut derselbe Befehl auf beiden Sorten Maschine, und was er getan hat,
steht in seiner Ausgabe.

### Der Verteilweg ist der Share, und er prüft

Entscheidung 7 hat das LAN-Peer-Update gestrichen. Was bleibt, ist ein Ordner
`programm\` neben `einsaetze\`. Die Prüfung liegt in Ring 2, ist rein und
bekommt Bytes: Form, dann Schlüssel, dann Signatur, dann Plattform, dann
Version, dann Dateihash. Die Reihenfolge ist nicht beliebig — vor der
Signaturprüfung geschieht nur Formprüfung, weil alles danach Text verarbeitete,
den irgendjemand auf eine Dateifreigabe gelegt hat.

Elf Tests fahren jeden Ablehnungsgrund einzeln. Ein Sicherheitsmechanismus,
dessen Tests nur den guten Fall fahren, prüft die Stelle nicht, auf die es
ankommt.

**Angeboten, nicht eingespielt.** Die Anwendung sagt, dass etwas bereitliegt
und wo. Ein Programm, das sich mitten in einer Lage selbst ersetzt, ist ein
Ausfall mit Ansage.

### Der Vertrauensanker ist leer, und das ist die sichere Vorbelegung

`VERTRAUTER_SCHLUESSEL = ""` heißt: Es wird nie ein Update angeboten, und die
Anwendung sagt warum. Die Alternative wäre ein Platzhalter gewesen, der alles
annimmt — die gefährlichste Zeile, die dieser Baum hätte tragen können, weil
sie aussähe wie eine Prüfung und keine wäre. Wie das Schlüsselpaar erzeugt
wird, steht in `verteilschluessel.ts`.

### Die sechs Störfälle sind Daten, nicht Text

Das ist die Festlegung von M7.3, an der am meisten hängt. Die Fälle werden an
zwei Stellen gebraucht: in der Diagnoseansicht und auf der Karte, die neben
dem Rechner liegt. Zwei Fassungen desselben Satzes driften auseinander, und
die Fassung, die dann falsch ist, ist mit Sicherheit die auf Papier.

Jetzt steht der Satz einmal, in `packages/domaene/src/stoerfaelle.ts`. Die
Ansicht liest ihn, `npm run doku:kurzanleitung` setzt ihn zwischen zwei Marken
in `KURZANLEITUNG.md`, und `bau/kurzanleitung.test.ts` scheitert, wenn beides
auseinanderläuft. Ohne diesen Test wäre das Skript ein Vorschlag: Niemand ruft
es auf, wenn in Ring 2 ein Satz geändert wird.

**Sechs und nicht mehr.** Aufgenommen ist ein Fall, wenn er an einem Rechner
der Führungsstelle vorkommt **und** eine andere Handlung verlangt als die
übrigen. Deshalb ist die Quarantäne nach §8.2 kein siebter Fall, sondern
derselbe wie „Anwendung startet nicht": Der Weg heraus führt über die
Protokolldatei und notfalls über den neu aufgebauten Spiegel, und ein eigener
Eintrag hätte dieselben drei Schritte getragen.

Jeder Fall nennt außerdem, was **nicht** zu tun ist — meist der Griff, den
jemand zuerst tun will. „Die Anwendung neu starten“ holt keinen Share zurück
und kostet den offenen Stand der Masken.

### Die Uhrgrenze steht in Ring 2 und ist begründet

Zwei Minuten. Die Ordnung der Ereignisse hängt nicht an der Wanduhr (§2.6),
eine schiefe Uhr verdirbt also keine Daten. Sie verdirbt Anzeigen — „vor 8 s"
in der Statuszeile — und die Plausibilitätsschwellen aus §2.5: Ab einer
Viertelstunde weist §2.5 einen richtig eingetippten Zeitpunkt zurück. Die Zahl
steht in Ring 2, damit Ansicht und Karte dieselbe meinen.

### Die Peerzeile trägt Offsets

Segment, geschriebener Offset (aus der Präsenzdatei des anderen) und der hier
gelesene Offset. Die Differenz ist die eigentliche Auskunft: Steht der gelesene
Stand still, während der andere schreibt, kommt der Share nicht durch. Gezeigt
und **nicht bewertet** — kurz nach einem Schreibvorgang ist ein Rückstand
normal, und eine Ansicht, die daraus ein Urteil machte, meldete im Betrieb
dauernd Fehlalarm.

### Die letzten Meldungen kommen aus dem Speicher, nicht aus der Datei

Ein Ringpuffer von fünfzig Zeilen im `Protokoll`. Der Grund ist der Fall, für
den die Ansicht gebaut ist: Bei vollem Datenträger scheitert der Schreibvorgang
ins Protokoll seit M2.2 absichtlich still — die Datei ist dann genau da
unvollständig, wo es interessant wird. Der Puffer hält, was diese Sitzung
gemeldet hat.

### `BETRIEB.md` begründet jeden Handgriff

Warum jeder Arbeitsplatz Schreibrecht überall braucht: weil er kein Betrachter
ist, sondern gleichberechtigter Schreiber (§1.3). Warum Löschrecht niemand
braucht. Warum Offline-Dateien abzuschalten sind: weil sie „ein Schreiber je
Datei" von außen verletzen — die Zusage, an der der ganze Speicherentwurf
hängt. Handgriffe ohne Begründung sehen aus wie Meinungen, und im Einsatz
befolgt niemand eine Meinung.

Das Notverfahren bei NAS-Ausfall besteht aus dem Satz, dass es keines gibt.
Der Ausfall ist der Normalpfad (§1.3 Satz 2).

## Befunde aus der Arbeit

**M7-B1 — ein unlesbarer Bogen ist im Datenpfad kein Zustand.** Er entsteht am
Handscanner und ist wieder weg, sobald jemand es erneut versucht. Die
Diagnoseansicht kann ihn deshalb nicht erkennen; `unlesbareBoegen` steht im
Befund fest auf 0. Die Karte führt den Fall trotzdem, weil der Bediener ihn
erlebt. Wer ihn erkennbar machen will, müsste den Scanfehlschlag als
Sitzungszustand führen — das wäre ein Zustand über einem Vorgang ohne
fachliche Spur, und §3.1 spricht dagegen.

**`listeVerzeichnis` beantwortet „ist der Share da“ falsch.** Bei einem
fehlenden Ordner liefert es eine leere Liste, weil der Datenpfad einen noch
nicht angelegten Unterordner wie einen leeren behandeln soll (§1.4). Für die
Diagnose ist dieselbe Antwort falsch: Ein verschwundener Share sah aus wie ein
frisch eingerichteter. `Dateisystem` hat deshalb ein `existiert` bekommen, das
auch durch die feindliche Schicht der Simulation geht — eine Simulation, die
einen Zugriff freistellt, den es in Wirklichkeit nicht gibt, verstößt gegen §9.

**`ausHex` wirft synchron.** Ein `.catch()` an der Zusage fing das nicht, und
eine verbogene Signatur hätte die Prüfung abstürzen lassen, statt sie
abzulehnen. Der Test hat es gefunden, weil er den Fall einzeln fährt.

**Die Prüfung urteilte über einen leeren Ordner.** Ohne hinterlegten Schlüssel
meldete `#programmstand()` „abgelehnt“, auch wenn gar kein Manifest da war.
Erst nachsehen, dann urteilen.

**Zeitbomben in drei Szenariendateien.** Feste Daten gegen die laufende
Systemuhr: Sobald die Containeruhr 14:00 UTC überschritt, wurde eine
PLAN-Zeit unplausibel (§2.5). Jetzt sind die Zeitpunkte relativ zu
`Date.now()`. Ein Test, der von der Tageszeit abhängt, ist kein Test.

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **A1 — Installation ohne Elevation** | Johannes | Braucht einen Rechner der Führungsstelle. Punkt mit Abbruchkriterium nach M-1 |
| **E3 — Vertrauensanker** | Johannes | Ein Schlüsselpaar ist ein Geheimnis; dieser Baum hat keines und soll keines haben |
| **E5/E6 — Dokumente durcharbeiten** | Johannes | Eine zweite Person, die nicht am Bau beteiligt war |
| **F — Abnahmeübung** | Johannes | Drei bis vier Rechner und ein NAS |
| **M6-B1 — der QR-Decoder** | Johannes | Unverändert: Die Zielplattform stellt ihn nicht |
| **M-B2 — Funktion → Rolle** | Johannes | Unverändert aus M5 |
| **A1 — „männlich" in der Vorlage** | Johannes | Unverändert seit M5.1 |
| **Die Sammel-`foldVersion`** | eigener Schritt | B1, B2, M-B1, M-B3, M-B4 zusammen |
| **Prüfpunkt 3 — Parität** | Johannes | Unverändert: Die Referenzlage aus Entscheidung 8 liegt nicht vor |
| **M3.5, M2.4, M0.5** | Johannes | Unverändert — alle drei brauchen Hardware |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |

## Was M7 an M8 übergibt

* **Eine Störfallmatrix als Daten mit zwei Lesern.** M8 baut eine In-App-Hilfe;
  sie ist der dritte Leser derselben Liste und braucht keinen eigenen Text.
* **Ein Erzeugungsmuster für Dokumente.** Marken im Zieldokument, ein Skript,
  ein Gleichstandstest in `bau/`. Was M8 an Anwenderdokumentation aus dem Code
  ableiten kann — Tastenkürzel, Abkürzungsliste —, geht denselben Weg.
* **Eine Abnahmeliste, an der M8 hängt.** F1 verlangt eine Übung vollständig in
  v2; das ist zugleich das letzte Arbeitspaket von M8.
* **Die Diagnoseansicht als Ort für Auskünfte.** Was M8 an Zahlen zeigen will,
  die niemanden im Betrieb angehen, gehört dorthin und nicht in die Lage.
