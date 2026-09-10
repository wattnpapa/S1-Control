# M8 — Dokumentation und Abnahme: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M8 aus
[03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md)

**M8 ist gebaut. Der Plan ist abgearbeitet, die Abnahme ist es nicht.**

Das ist keine Verlegenheitsformel, sondern der Stand: Von M-0 bis M8 ist jedes
Arbeitspaket gebaut und geprüft; was offen bleibt, sind ausnahmslos Punkte, die
Hardware, Geheimnisse oder Menschen brauchen. Sie stehen abhakbar in
[ABNAHME.md](../../v2/ABNAHME.md), und der erste von ihnen — Installation ohne
Elevation auf einem Rechner der Führungsstelle — ist derselbe, der seit M-1 mit
Abbruchkriterium im Plan steht.

Drei der sechs Nennungen der M8-Zeile waren seit M3.6 gebaut. Das hat den
Zuschnitt bestimmt: M8 hat kein Vokabular verdoppelt, sondern die Listen
zusammengeführt, die es schon gab.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M8.1 | In-App-Hilfe: Ansichten und Störfälle, Hilfemarke an neun Ansichten | fertig |
| M8.2 | `HANDBUCH.md`, vier Abschnitte erzeugt | fertig |
| M8.3 | Führungsharke als Ausgabe (das Blatt „FüOrg“) | fertig |
| M8.4 | Übungsdrehbuch und der Szenariolauf dazu | fertig — **die Übung selbst offen (F1)** |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1536
Tests in 120 Dateien grün** (von 1505 zum Ende von M7).

## Die Commits

| Commit | Inhalt |
|---|---|
| `7bf2449` | Auftragsdokument: der Zuschnitt, und warum der FüOrg-Editor keiner wird |
| `3b6e05d` | M8.1: In-App-Hilfe mit Ansichten und Störfällen |
| `4c0111d` | M8.2: das Handbuch, zu vier Fünfteln erzeugt |
| `2a007d4` | M8.3: die Führungsharke als Ausgabe |
| `cbcb685` | M8.4: Übungsdrehbuch und Szenariolauf |

## Was festgelegt wurde, und warum gerade so

### Eine Liste, drei bis vier Leser

Das ist die durchgehende Festlegung von M7.3 bis hierher, und sie hat sich in
M8 ausgezahlt:

| Liste | Wo sie steht | Wer sie liest |
|---|---|---|
| Störfälle | `domaene/stoerfaelle.ts` | Diagnoseansicht, Hilfefenster, Kurzanleitung, Handbuch |
| Tastenkarte | `domaene/tastenkarte.ts` | das Fenster (die Kürzel greifen), Hilfefenster, Hilfemarke, Handbuch |
| Ansichtstexte | `domaene/bedienhilfe.ts` | Hilfemarke an der Ansicht, Hilfefenster, Handbuch |
| Abkürzungen | `domaene/akueli.ts` | Hilfefenster mit Suche, Handbuch |

Vier Listen, elf Leser, kein Satz zweimal geschrieben. Zwei Tests in `bau/`
halten die erzeugten Dokumente im Gleichstand; sie scheitern, wenn jemand in
Ring 2 einen Satz ändert und die Datei nicht erneuert.

### Die Tastenkarte ist nach Ring 2 gezogen

Sie lag im Renderer, weil sie dort gebraucht wurde. Mit dem Handbuch als
drittem Leser war das nicht mehr haltbar: Ein `bau/`-Test, der aus dem
Renderer importiert, führte die Ringgrenze vor. Ring 2 verträgt die Liste,
weil nichts Plattformabhängiges darin steht — ein Tastenname, drei
Wahrheitswerte, ein Text. Das Einhängen des Hörers am Fenster ist im Renderer
geblieben; ohne DOM wäre es nicht schreibbar.

### Die Kurzhilfe beantwortet drei Fragen, und die dritte ist die wichtige

Nicht „was ist das hier“ — das steht in der Überschrift —, sondern: Wozu ist
die Ansicht da? Was tue ich zuerst? Und **was überrascht mich, wenn es
niemand sagt?**

Das dritte Feld ist das, was in keiner Beschriftung steht: dass eine entfernte
Einheit sichtbar bleibt (§5.4.5), dass ein angelegter Dienstposten noch keinen
Platz im Schichtplan belegt (§5.7), dass derselbe Bogen zweimal eingelesen
**eine** Meldung ergibt (§3.6), dass die Kostenparameter zum Einsatz gehören
und nicht zum Rechner (§5.2). Jede dieser Überraschungen ist eine Zusage des
Konzepts, und deshalb steht der Paragraph dabei.

### Vier Bereiche im Hilfefenster, und nur einer wird gerendert

Mit zehn Ansichtstexten und sechs Störfällen wäre das Fenster eine Seite zum
Scrollen geworden. Wer die Hilfe öffnet, hat eine Frage, und die gehört zu
einem der vier Bereiche.

Dass nur der aufgeschlagene gerendert wird und nicht bloß `hidden` gesetzt
ist, hat ein Test erzwungen: „Strg+H“ stand zweimal im Baum — einmal in der
Tastenkarte, einmal in der Kürzelzeile der Ansicht „Lage“ —, und die Abfrage
fand beide. Ein verborgener Bereich ist eben da.

### Der FüOrg-Editor ist keiner geworden

Die Excel führt `FüOrg` als reines Zeichenblatt (`excel-domaenenmodell.md`
§4.5), und ihre eigenen Hinweise sagen, wie es angepasst wird: „durch
Umbenennen freier Bereiche (EA/UEA) und Verschieben der Einheiten". Genau das
ist in v2 der Abschnittsbaum, bedienbar seit M3. Was gefehlt hat, ist die
Darstellung.

Ein zweiter Editor hätte dieselbe Struktur an zwei Stellen gepflegt, und die
Ereignisse (§5.3, §5.4) kennen nur eine. Das ist keine Auslegung des Auftrags,
sondern das, was die Vorlage selbst sagt.

### Verschachtelte Listen statt gezeichneter Harke

Eine Harke mit Verbindungslinien braucht SVG mit gerechneten Koordinaten oder
eine Bibliothek — beides für ein Blatt, das gedruckt wird, und beides mit dem
Ergebnis, dass ein tiefer Baum über den Rand läuft. Die Einrückung trägt
dieselbe Aussage und überlebt jeden Seitenumbruch.

Zwei Zuschnitte gehören dazu: Das Archiv wird nicht mitgezeichnet (ein
Organigramm mit dem Archivabschnitt zeigte eine Führungsstruktur, die es nicht
gibt), aufgelöste Abschnitte dagegen schon, durchgestrichen (§5.3.2). Und die
Führungsstelle steht in einem eigenen Kasten über dem Baum, weil sie aus den
Dienstposten entsteht (§5.7, K17) und im Baum doppelt stünde.

### Der Übungslauf ist ein Test und kein Skript

Ein Skript, das durchläuft, sagt nichts; erst die Behauptungen dazwischen
sagen etwas. Und ein Skript verrottet, weil niemand es ausführt.

Der Lauf hat zwei Dinge geprüft, die einzeln nirgends geprüft waren: dass
beide Arbeitsplätze schreiben, ohne aufeinander zu warten, und dass jede der
fünf HTML-Ausgaben an einer **Übungslage** entsteht und nicht nur an der
Prüflage der Goldfiles. Er endet mit derselben Aussage wie die echte Übung:
derselbe `zustandsHash` auf beiden Seiten (§7.6, P3).

## Befunde aus der Arbeit

**Keine neuen fachlichen Befunde.** M8 hat keinen Ereignistyp angefasst, keine
Nutzlast erweitert und keine Katalogfrage aufgeworfen — und das ist selbst ein
Befund: Ein Meilenstein, der Dokumentation liefert und dabei am Modell nichts
zu berichtigen findet, spricht für die sechs davor.

Zwei technische Kleinigkeiten sind erwähnenswert. Die Gruppenschlüssel der
Abkürzungsliste sind Schlüssel und keine Überschriften — „EINHEITEN“ als
Zwischentitel wäre gebrüllt; wo eine Übersetzung fehlt, steht jetzt der
Schlüssel da, weil sichtbar falsch besser ist als still verschwunden. Und die
Einsetzfunktion für erzeugte Blöcke ist beim zweiten Block herausgezogen
worden: Vier Marken und vier fast gleiche Funktionen wären vier Stellen
gewesen, an denen dieselbe Abschneide-Regel hätte stimmen müssen. Ein Test
fährt die Erneuerung zweimal, weil eine Marken-Erzeugung genau daran leise
scheitert — eine Leerzeile, die bei jedem Lauf dazukommt.

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **Die gesamte Abnahmeliste** | Johannes | 24 Zeilen in sechs Gruppen; keine davon lässt sich ohne Hardware, Zertifikat oder zweite Person abhaken |
| **A1 — Installation ohne Elevation** | Johannes | Punkt mit Abbruchkriterium nach M-1. Er ist der erste, weil alles andere ihn voraussetzt |
| **F1 — die Abnahmeübung** | Johannes | Drehbuch und Lauf stehen; drei bis vier Rechner und zwei Stunden fehlen |
| **Offene Entscheidung 20 — HK, MT, LdF, TLtg.** | Johannes | Unverändert. Nur **HK** bindet den Katalog (Organisationsschlüssel `WASSERWIRTSCHAFT`) |
| **M6-B1 — der QR-Decoder** | Johannes | Unverändert: Die Zielplattform stellt ihn nicht |
| **M-B2 — Funktion → Rolle** | Johannes | Unverändert aus M5 |
| **A1 — „männlich" in der Vorlage** | Johannes | Unverändert seit M5.1 |
| **Die Sammel-`foldVersion`** | eigener Schritt | B1, B2, M-B1, M-B3, M-B4 zusammen — der eine Schritt, der noch im Baum getan werden kann |
| **Prüfpunkt 3 — Parität** | Johannes | Unverändert: Die Referenzlage aus Entscheidung 8 liegt nicht vor |
| **M3.5, M2.4, M0.5** | Johannes | Unverändert — alle drei brauchen Hardware |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |

## Was nach M8 kommt

Der Plan ist zu Ende. Drei Dinge stehen an, in dieser Reihenfolge:

1. **A1 messen.** Eine Stunde an einem Rechner der Führungsstelle. Fällt A1,
   ist über den Ansatz zu entscheiden und nicht über das nächste Paket — so
   steht es seit M-1 im Plan.
2. **Die Sammel-`foldVersion`.** Der eine offene Punkt, den der Baum allein
   erledigen kann: B1, B2, M-B1, M-B3, M-B4 in einem Schritt, mit einer
   Erhöhung der `foldVersion` (§3.9). Danach ist der Katalog wieder in einem
   Stand, den man einfrieren kann.
3. **Die Übung.** Und danach die Liste, die aus ihr entsteht.

Was **nicht** ansteht: weitere Arbeitspakete. Der nächste Zuwachs an
Fachlichkeit gehört nach der Übung entschieden, aus dem, was die Bedienenden
aufschreiben — und nicht aus dem, was sich hier noch bauen ließe.
