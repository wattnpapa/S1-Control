# M2 — Schale, Worker, Store: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M2 aus
[05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md)

**M2 ist gebaut, aber nicht abgenommen.** Vier der fünf Arbeitspakete sind
fertig; M2.4 — der Prüfpunkt mit Abbruchrecht — braucht zwei physische Rechner
und den echten Share und ist damit blockiert wie M0.5. Was gebaut wurde, reicht
bis unmittelbar an diesen Prüfpunkt heran, einschließlich des Werkzeugs, mit
dem er gemessen wird.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M2.1 | IPC-Kontrakt, Preload, Main ohne Fachzustand, Worker je Akte, Deltas | fertig |
| M2.2 | Renderer-Grundgerüst: Store, Statuszeile, Fehlerbilder, Einstellungen, Protokoll | fertig |
| M2.3 | Einsatz anlegen und öffnen, Präsenz, Undo je Client, Single-Instance-Lock | fertig |
| M2.4 | Zwei Rechner, echter Share, eine Stunde mit Störungen | **blockiert** |
| M2.5 | CI-Matrix auf drei Plattformen | gebaut, auf Windows und macOS ungeprüft |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **923
Tests in 60 Dateien grün**, `build:renderer` und `build:schale` sauber, und die
Rauchprobe startet unter Xvfb bis in den Renderer hinein.

## Die Commits

| Commit | Inhalt |
|---|---|
| `922c0a0` | Undo-Stapel, IPC-Kontrakt, Aktendienst je Akte |
| `76cd4f4` | `s1 akte pruefe` — das Abnahmewerkzeug für M2.4 |
| `7e0500e` | Main ohne Fachzustand: Vermittlung, Arbeiterhof, Einstellungen, Protokoll |
| `fd1b6b9` | Renderer-Grundgerüst und CI-Matrix |

## Was festgelegt wurde, und warum gerade so

### Der Undo-Stapel liegt in Ring 2, nicht im Worker

§6 U3 sagt: „Der Stapel liegt nirgends. Er wird abgeleitet." Eine Ableitung
gehört dorthin, wo sie ohne Dateisystem und ohne Electron gegen den Katalog
geprüft werden kann. `packages/domaene/src/undo.ts` tut zwei Dinge und kein
drittes: Es sagt, was zurückgenommen werden kann, und es baut den **Entwurf**
der Kompensation. Ein Entwurf, kein Ereignis — Id, HLC und Akteur gehören dem
Schreiber.

Die Zielart kommt aus dem Katalog und nicht aus einer Fallunterscheidung über
Namen: `gegenereignis`, `festerWert` und `grundPflicht` entscheiden. Daraus
folgt auch die Trennlinie zu den strukturellen Rücknahmen aus U2: Fehlt der
Zielart ein `festerWert` und ist sie eine **andere** Art als das Original, kann
die Kompensation nicht abgeleitet werden. `AbschnittAngelegt` →
`AbschnittAufgeloest` fällt darunter, weil die Auflösung ein Ziel braucht, das
in der Anlage nirgends steht; `EinheitGemeldet` → `EinheitEntfernt`
(`festerWert: true`) und `AbschnittAufgeloest` → `AbschnittWiederhergestellt`
(`festerWert: null`) fallen nicht darunter. Die Unterscheidung liegt damit im
Katalog und nicht in einer Namensliste, die veralten könnte.

Der Stapel behält **alle** eigenen Ereignisse und nicht bloß zwanzig. Der Grund
steht als Prüffall im Test: Wird ein Kandidat kompensiert, fällt er weg und der
nächstältere rückt nach — ein Ring der Länge zwanzig hätte den Nachrücker
bereits vergessen.

### Der Aktendienst prüft die Nutzlast, bevor er schreibt

§3.7 regelt, was ein Client mit einem Ereignis tut, dessen Nutzlast er nicht
deuten kann: Er faltet es nach `unbekannt` und arbeitet weiter. Das ist die
Regel für die **Empfangsseite**. Auf der Schreibseite wäre dieselbe Regel eine
Zumutung: Das Protokoll ist append-only, eine falsch gebaute Nutzlast bliebe
darin stehen, und jeder Client jeder künftigen Fassung schleppte sie mit.

Die Prüfung fand beim ersten Lauf zwei eigene Fehler: `AbschnittAngelegt` heißt
das Nutzlastfeld `typ` und nicht `abschnittstyp`, und `EinsatzAngelegt`
verlangt die vier Kostenparameter. Letztere stehen jetzt als
`KOSTEN_VORBELEGUNG` (Startwert S9) in `@s1/domaene` — dort und nicht in der
Schale, weil sie eine fachliche Zahl sind: Jeder Client, der einen Einsatz
anlegt, soll dieselben Werte einsetzen, damit ein späterer Kostenvergleich
nicht an der Herkunft des anlegenden Arbeitsplatzes hängt.

### Der Aktendienst ist von `worker_threads` getrennt

`akte.ts` in Ring 3 hält ausdrücklich keinen Takt („Die Akte wird gerufen, sie
ruft nicht"). Der Takt kommt jetzt vom Aktendienst — und der kennt weder
Threads noch Electron, bekommt Dateisystem und Uhr injiziert und schlägt keinen
eigenen Takt: `takt()` wird gerufen. Der Worker-Einstieg ist danach eine
Botschaftsschleife mit einem einzigen Zeitgeber für alle vier Takte.

Der Ertrag steht im Mehrclient-Nachweis: Zwei Aktendienste laufen in einem
Prozess auf demselben Verzeichnis gegeneinander, und der Test steuert den
Ablauf, statt auf Wanduhrzeit zu warten. Ein Test, der auf `setTimeout` wartet,
misst die Auslastung des Läufers und nicht das Verfahren.

### Das Lagebild ist flach, und zwei Werte sind Lebenszeichen

Der Delta-Weg vergleicht je oberstem Schlüssel. Eine verschachtelte Projektion
hätte entweder feinere Deltas gebraucht oder bei jeder Änderung alles
geschickt.

Zwei Werte ändern sich in jedem Takt: der eigene Share-Kontakt und die Wanduhr
der fremden Präsenzdateien. Sie kosten je Akte eine kleine Mitteilung je
Sekunde, auch wenn fachlich nichts geschieht. Das ist kein Versehen, sondern
ihr Zweck — eine Statuszeile, die „Share erreichbar" zeigt, ohne zu sagen, wann
das zuletzt zutraf, ist ein Standbild. Alles Fachliche schweigt dagegen,
solange sich nichts ändert, und genau das ist als Prüffall festgehalten.

### Was der Renderer selbst entscheidet

Drei Dinge, und jedes ist geprüft: Ein Delta, das auf kein Bild trifft, wird
verworfen statt geraten; eine Lücke in der Folge führt zur Anforderung des
vollen Standes statt zum stillen Weiterzeichnen auf einem halben Bild; Hinweise
werden bei fünfzig gekappt. Die Kappung ist dieselbe Regel, die §3.1 dem
Zustand auferlegt: Ein Fenster, das über acht Stunden jede Meldung sammelt,
wächst mit der Zahl der Störungen.

### „Kein synchroner Aufruf im Main" steht als Lint, von zwei Seiten

Eine Importliste verbietet `node:fs` und Verwandte, eine Syntaxregel jeden
`*Sync`-Aufruf. `node:fs/promises` bleibt erlaubt — verboten ist die synchrone
Tür, nicht das Dateisystem. Der Worker ist ausgenommen: Er ist ein eigener
Thread, und dort blockiert ein Aufruf niemanden außer sich selbst. Die Tests
zum Main sind ebenfalls ausgenommen; sie bauen Wegwerf-Verzeichnisse und
frieren kein Fenster ein, weil es keines gibt.

## Befunde aus der Arbeit

| Nr. | Befund | Behandlung |
|---|---|---|
| B1 | Zwei Client-Kennungen mit gleichem Anfang teilen sich nach §4.1 den Dateinamenspräfix; jeder Platz hielte die Dateien des anderen für die eigenen | Im Nachweis aufgefallen, als Kommentar festgehalten. Im Betrieb unkritisch — `randomUUID` liefert keine gleichen Anfänge —, aber jede Testkennung muss sich in den ersten Stellen unterscheiden |
| B2 | Eine Beschädigung in Segment 0 machte den Kettenanker von Segment 1 unerreichbar; `s1 akte pruefe` meldete den gesunden Nachfolger als kettenfalsch und ließ dessen Ereignisse aus dem Fold fallen | Behoben: Der Vorgänger wird als in Quarantäne vermerkt, die Kette über diesen Wechsel als unprüfbar gemeldet, Format, CRC und Rahmen weiterhin geprüft, die Ereignisse bleiben gezählt |
| B3 | Das Preload lud 742 kB, weil es über den Kontrakt zod mitzog — für drei Zeichenketten, in der Sandbox jedes Fensters | Behoben: `kontrakt/kanaele.ts` ohne zod, Bündel 2 kB |
| B4 | `.nvmrc` nennt Node 24, beide CI-Ketten fahren 22 | **Für Johannes.** Die v2-Kette folgt bewusst v1; der Sprung gehört als eigener Schritt für beide Ketten gemeinsam gemacht |

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **M2.4** — zwei Rechner, echter Share, eine Stunde mit Störungen | Johannes | Kein NAS, kein zweiter Rechner. Der Prüfpunkt mit Abbruchrecht ist damit nicht erreicht. Gemessen wird er mit `s1 akte pruefe --vergleiche`; das Kommando ist gebaut und geprüft |
| **M2.5 auf Windows und macOS** | ein echter Lauf auf GitHub | Lokal ist nur Linux prüfbar. Die Matrix steht, der Submodul-Checkout ist eingerichtet; ob sie auf allen drei Plattformen grün wird, sagt erst der erste Lauf |
| **M0.5** — Messung am echten Share | Johannes | Unverändert aus M0. Die Takte im Aktendienst stehen auf den Startwerten aus §10 und werden dort nachgemessen |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1, 32. Fassung |
| **`.nvmrc` gegen die CI-Ketten** | Johannes | Befund B4 |

Keiner dieser Punkte blockiert M3. Das Lagebild baut auf dem Kontrakt, dem
Aktendienst und dem Store auf, und alle drei sind fertig.

## Was M2 an M3 übergibt

* **Den Kontrakt.** Neue Bedienschritte kommen als weitere Rufarten hinzu; die
  Prüfung im Main und der Delta-Weg gelten unverändert.
* **Das Lagebild als Projektion.** M3 braucht mehr als Zahlen — Tabellen,
  Abschnittsbaum, Einsatztagebuch. Die Projektion wächst deshalb nicht weiter,
  sondern bekommt eigene Rufe: `standAnfordern` liefert die Statuszeile, ein
  neuer Ruf die Tabelle. Ein Dauerstrom des vollen Zustands wäre bei 150
  Einheiten das Falsche.
* **Den Undo-Stapel.** Er steht und ist verdrahtet; M3 baut die Maske für die
  strukturellen Rücknahmen, die der Dienst heute als eigenen Ausgang meldet.
* **Den Mehrclient-Nachweis als Muster.** Jede neue Fachregel aus M3 lässt sich
  in derselben Werkstatt gegen zwei Arbeitsplätze prüfen.
