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

Offen: die Feingestaltung der Bogenübernahme aus
erfassungsbogen.app (Option 2d) und die Führungsharke als Bildschirmansicht —
sie existiert bislang nur als Ausgabe `fueorg`. Die taktischen Zeichen aus dem
Bündel liegen unter `apps/desktop/assets/tz/clean/` (`viewBox 0 0 256 256`, ohne
C2PA-Metadaten) und werden noch nicht gezeichnet. Vor ihrer ersten Verwendung
ist Roboto Slab Bold lokal einzubinden: Die Anwendung läuft offline, eine
Schrift von Google Fonts wäre im Einsatz nicht da.

Die fünf offenen Entscheidungen am Ende des Handoffs (Zahl der Themes,
Modulleiste links, Erfassen im Meldekopf-Modus, Schriftfamilien, gemeinsames
Wortbild) sind nicht entschieden. Umgesetzt sind vorerst alle vier Themes, kein
zweiter Navigationsstreifen und Mono nur für Marken, Spaltenköpfe und Kennungen.

Unter `stand/` liegen vier Aufnahmen des gebauten Renderers (1320×860, Chromium,
Brücke durch eine Attrappe mit einer erfundenen Lage ersetzt): `standard.png`,
`dunkel.png`, `feld.png`, `nacht.png`. Sie zeigen den Stand vom 2026-09-10 und
sind bei der nächsten Änderung an der Gestaltung neu zu erzeugen.
