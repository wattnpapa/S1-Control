# Prüf-PDFs mit eingebettetem Erfassungsbogen

Zwei kleine PDFs, erzeugt mit pdfmake 0.3.11 — derselben Bibliothek und
demselben Verfahren, mit dem die Erfassungsbogen-App ihre PDFs schreibt
(`pdf-dokument.ts` dort: `files: { "erfassungsbogen.json": … }`, Beziehung
„Alternative“). Der sichtbare Inhalt ist eine Zeile Text; worauf es ankommt,
ist der Anhang.

* `einzelbogen.pdf` — ein Anhang: `pruefdaten/eeb/thw/001-albstadt-ztr-tz.json`
* `sammelbogen.pdf` — drei Anhänge: die Bögen 001 bis 003 aus `pruefdaten/eeb/thw`

Gegen sie läuft der Datei-Weg des Scanners (`pdfBogen.test.ts`,
`szenarien-eeb-datei.test.ts`). Erfundene Namen wie in `pruefdaten/eeb`.
