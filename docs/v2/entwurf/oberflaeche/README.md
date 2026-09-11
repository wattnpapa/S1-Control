# Entwurf Oberfläche — Stand der Umsetzung

In diesem Ordner liegt der Entwurf der Renderer-Oberfläche, wie er am
2026-09-10 übergeben wurde: `HANDOFF-OBERFLAECHE.md` mit Tokens, Maßen und
Ansichten, `mockups.html` als Prototyp zum Öffnen im Browser. Der Prototyp ist
Referenz und kein Produktionscode; er arbeitet mit Inline-Styles und einer
erfundenen Beispiellage („Hochwasser Oldenburg", 42 Einheiten, 6 Abschnitte).

Umgesetzt ist die Gestaltungsebene, nicht ein Umbau der Ansichten. Die Marken
des Entwurfs stehen im `<style>`-Block von `apps/desktop/src/renderer/index.html`
unter `:root`, die vier Erscheinungsbilder als Überschreibungen unter
`:root[data-theme]`. Damit schaltet ein Themewechsel an einer Stelle um; eine
Regel, die ihre Farbe selbst setzt, fiele im Nacht- oder Feldbild aus dem Bild.
Die vorher halbtransparenten Grautöne der Ansichten sind auf die Marken gezogen,
sodass Baum, Einheitentabelle, Masken, Nebenblätter, Eingangskorb und
Führungsstelle den Wechsel mitmachen.

Die Anordnung folgt Option 2a: **ein Blatt zur Zeit**. Die Reiter stehen im
Kopfband (`blaetter.ts`, `Kopfband.tsx`) und führen die ganze Ansicht — Lage,
Eingangskorb, Anforderungen, Führungsstelle, Kosten, Ausgaben, Einsatztagebuch,
rechts die Diagnose. Vorher lagen Ausgaben, Nebenblätter und Tagebuch
untereinander unter der Lage; wer die Einheitentabelle sehen wollte, scrollte an
allem vorbei. Die Lage bleibt beim Blattwechsel eingehängt, weil sie die Auswahl
von Abschnitt und Einheit hält, auf die Ausgaben und Tagebuch sich beziehen. Der
Zähler am Reiter „Eingangskorb" nennt die offenen Meldungen. Die Werkzeugzeile
der Lage trägt nur noch, was die ganze Lage betrifft — Bogen einlesen,
Stärke-Monitor, Rückgängig; der Weg aus dem Einsatz steht als „‹ Einsatzauswahl"
im Kopfband. Der Knopf, mit dem ein Arbeitsplatz das Programmpaket für alle holt,
steht jetzt im Blatt „Diagnose" statt über der Lage; ein Angebot oder ein
abgelehntes Manifest erscheint weiterhin oben.

Neu sind das Navy-Kopfband mit Wortbild, Gesamtstärke, taktischer Zeit,
Hilfeknopf und Themenschalter (`Kopfband.tsx`), das Stärkeband mit den fünf
Kacheln (`Staerkeband.tsx`) und die Schreibweisen in `formate.ts`: Die
Gesamtstärke `24/61/183 // 268` und die taktische Zeit `101443SEP26` stehen an
mehreren Stellen des Fensters und sind deshalb einmal geschrieben. Die
Statuszeile führt die Stärke jetzt in derselben Form. Baum, Einheitentabelle,
Ausgaben, Nebenblätter und Tagebuch sind eigene Karten mit 3-px-Oberkante statt
eines durchlaufenden Blocks; Spaltenköpfe stehen in Mono und Versalien, die
offene Zelle trägt den 2-px-Fokusrahmen, die gewählte Baumzeile ist gefüllt.

Das gewählte Erscheinungsbild steht in den Einstellungen dieses Geräts
(`theme` im IPC-Kontrakt) und übersteht den Neustart. Dabei ist eine Lücke
mitgeschlossen worden: `liesArbeitsplatz` hat die Betriebsart bisher zwar
geschrieben, aber nicht wieder gelesen — ein Meldekopf war nach jedem Start
wieder eine Führungsstelle.

Die Einheitentabelle folgt dem Entwurf: der Kopf in einer Zeile mit der Zahl der
Treffer, „Aus Vorlage" als gefülltem Hauptweg, den vier auswahlgebundenen
Schritten dahinter und der Suche rechts; die Spaltengruppen als Umschalter
statt fünf Kästchen und mit Beschriftungen statt Excel-Bezeichnern; der Status
als Marke mit Farbe und Wort; Zahlenspalten rechtsbündig in Tabellenziffern;
darunter eine Summenzeile über den gezeigten Ausschnitt und die Fußnote zur
Bedienung der Zelle. Die Ampeln des Eingangskorbs benutzen dieselbe Marke.
Die Zeilen bleiben einzeilig — die Excel hat 48 Spalten, und wer Ressourcen,
Logistik oder Kosten zuschaltet, scrollt waagerecht im Rahmen der Karte.

Die Führungsorganisation ist als eigenes Blatt umgesetzt (Option 3a,
`Fuehrungsorganisation.tsx`, `harke.ts`, `zeichen.tsx`): gezeichnet aus dem
Abschnittsbaum, kein zweiter Editor. Je Ebene steht ein CSS-Grid aus gleichen
Spalten; der Querbalken spannt mit `margin: 0 calc(100 %/2n)` genau von Mitte
zu Mitte der äußeren Kinder, Abzweigstummel und Zeichen sitzen in derselben
Zelle und beide zentriert, ohne `transform`. Linien 3 px, Stummel 20/16/14,
Knoten 196/176/118 px. Welches Zeichen ein Knoten bekommt, hängt an Typ **und**
Tiefe — derselbe Einsatzort ist auf Ebene 1 ein Einsatzabschnitt und darunter
ein Untereinsatzabschnitt, und die Dateien tragen ihren Text fest. Meldekopf,
Bereitstellungsraum und Logistik stehen als Einrichtungen neben der Harke, weil
sie keine Führungsebene sind. Der Knopf „Als PDF (Lagekarte)" schreibt die
vorhandene Ausgabe `fueorg` (M8.3); das gedruckte Blatt ist weiterhin die
eingerückte Liste aus `@s1/ausgaben`.

Offen: der Zeichensatz-Auszug als Legende neben der Harke und die
Feingestaltung der Bogenübernahme aus erfassungsbogen.app (Option 2d).

Die taktischen Zeichen kommen aus jonas-koeritz/Taktische-Zeichen und liegen
unter `apps/desktop/assets/tz/`. Der Ordner wird **erzeugt**:
`bau/zeichen-importieren.mjs` rendert die Jinja2-Vorlagen der Quelle (`make svg`,
nur j2cli nötig), löst die in jedes SVG eingebettete Schrift heraus und legt sie
einmal unter `schrift/RobotoSlab-Bold.woff` ab — sonst trüge der Satz bei knapp
tausend Zeichen über zwanzig Megabyte Schrift. `index.json` führt jedes Zeichen
mit Kategorie, Datei und ausgeschriebenem Titel, `HERKUNFT.md` den Stand der
Quelle und die Lizenzen (Quellen CC BY 4.0, erzeugte Zeichen CC0 1.0, Schrift
Apache-2.0). Die wöchentliche Aktion `.github/workflows/taktische-zeichen.yml`
prüft montags, ob die Quelle sich geändert hat, spielt sie ein und öffnet einen
Pull Request; zusammengeführt wird von Hand, denn ein Zeichen, das sich still
ändert, ändert still die Lagekarte.

Die Oberfläche setzt die Zeichen **inline** (`zeichensatz.ts`, `zeichen.tsx`):
In einem `<img>` wäre das SVG ein eigenes Dokument ohne Zugriff auf die
Schriften der Seite, und die Beschriftung fiele auf eine Systemschrift zurück.
Die Schrift bindet der `<style>`-Block per `@font-face` ein; die Anwendung lädt
nichts aus dem Netz. Damit ist auch die offene Frage der Offline-Schrift
erledigt.

Der Zugang gilt für den **ganzen** Satz und für jede Ansicht, nicht nur für die
Harke. Geladen wird je Zeichen und einmal: `import.meta.glob` ohne `eager`
schneidet die knapp tausend Dateien auseinander, `ladeZeichen` holt eine davon,
`useZeichen` zeigt sie, und was einmal da war, bleibt im Speicher — in einer
Tabelle mit vierzig Zeilen wird dasselbe Zeichen einmal geholt und vierzigmal
gezeigt. Ganz vorliegen muss nur das Verzeichnis (`index.json`, Kennung und
Titel, rund hundert Kilobyte): Ohne es gäbe es keine Suche über den Satz, und
eine Zeichenwahl, die erst tausend Dateien lädt, um ihre Namen zu kennen, ist
keine. `sucheZeichen`, `kategorien` und `titelVon` stehen dafür bereit.

Genutzt wird das heute an drei Stellen: in der Führungsharke, im
Abschnittsbaum (jede Zeile trägt das Zeichen ihres Typs; das Typwort daneben
entfällt dann, denn es sagt dasselbe zweimal) und in der Diagnose, die Stand
und Herkunft des Satzes nennt — im Zweifel („bei mir sieht das Zeichen anders
aus") ist das die erste Frage.

Die fünf offenen Entscheidungen am Ende des Handoffs (Zahl der Themes,
Modulleiste links, Erfassen im Meldekopf-Modus, Schriftfamilien, gemeinsames
Wortbild) sind nicht entschieden. Umgesetzt sind vorerst alle vier Themes, kein
zweiter Navigationsstreifen und Mono nur für Marken, Spaltenköpfe und Kennungen.

Unter `stand/` liegen vier Aufnahmen des gebauten Renderers (1320×860, Chromium,
Brücke durch eine Attrappe mit einer erfundenen Lage ersetzt): `standard.png`,
`dunkel.png`, `feld.png`, `nacht.png`, dazu `fuehrungsorganisation.png` und
`einheitentabelle-status.png` (die Tabelle an ihr rechtes Ende gescrollt). Sie zeigen den Stand vom 2026-09-10 und
sind bei der nächsten Änderung an der Gestaltung neu zu erzeugen.
