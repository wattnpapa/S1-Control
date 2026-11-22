# ADR-008 – Zweiter PDF-Weg: jsPDF für den Nachrichtenvordruck

Status: umgesetzt · Datum: 2026-11-16 · Entscheider: Johannes Rudolph

## Kontext

Bisher entsteht jedes PDF auf einem Weg: Der Worker rendert HTML aus `@s1/ausgaben`, die Desktop-Schale druckt es mit `webContents.printToPDF` in einem Wegwerf-Fenster (`main/drucker.ts`, M4.1). Für Listen ist das richtig: Eine Vorlage, ein Layout, HTML und PDF aus derselben Seite.

Der Nachrichtenvordruck (KONZEPT-NACHRICHTEN.md §7, §8) ist keine Liste, sondern ein Formular mit Feldern in festen Millimetern. Er wird auf vorgedruckte Bögen und auf Nadeldruckern im Durchschlag gedruckt; dort muss jedes Feld an seinem Platz landen. HTML und CSS garantieren das nicht: Seitenränder, Schriftmetrik und Skalierung hängen an Chromium und am Druckdialog. Die Bibliothek `bos-nachrichtenvordruck` (Submodul) zeichnet den Vordruck dagegen als Vektorgrafik mit jsPDF, Geometrie in mm, mit Folgeblättern und Übungsmarke. Und die Web-Schale (ADR-005) hat kein `printToPDF`: Sie konnte bisher gar kein PDF erzeugen.

## Entscheidung

1. Der Nachrichtenvordruck entsteht mit jsPDF in `@s1/ausgaben` (`nachricht.ts`, `nachrichtAlsVordruckPdf`, `leererNachrichtenvordruckPdf`). Ring 3 bleibt ohne `node:` und ohne DOM; jsPDF braucht für Text und Vektoren beides nicht. Der Worker schreibt die Bytes nach `ausgaben\nachrichten` wie jede Ausgabe, in beiden Schalen.
2. `printToPDF` bleibt der Weg für alle Listen und Seiten (Druck, Status, Einheitenliste, Nachweisung, Papier-Vordruck …). Es gibt keine zweite Vorlage für eine Liste.
3. Die Vorschau im Renderer (Entscheidung 4) zeichnet mit genau den Aufrufen des Drucks (`blattZeichnen`, `vordruckBlaetterAus`) in eine Wegwerf-jsPDF und überträgt sie auf ein Canvas, nach dem Muster von `web/src/bildvorschau.ts` der Bibliothek.
4. Der leere Vordruck des Papier-Vordrucks ist ein eigenes PDF neben der HTML-Seite (Entscheidung 9), kein fünftes Blatt im HTML.

## Folgen

- jsPDF läuft an zwei Stellen: im Worker (Node-Bündel) und im Renderer. Im Renderer kommt es mit der Bibliothek und dem Teileinstieg `@s1/ausgaben/vordruck` nur per `import()`, also als eigenes Teilbündel, das erst die aufgeklappte Vorschau lädt. Das Hauptbündel wächst dadurch nicht.
- Die Bibliothek bettet keine Schrift ein; Helvetica trägt nur Windows-1252. Alles andere filtert `druckbar` (Pfeil zu „->“, Unbekanntes zu „?“). Umlaute und ß gehen, Emoji und kyrillische Namen nicht.
- Der stille Druck an einen Drucker (Automatikdruck, Entscheidung 7) lädt das PDF in ein unsichtbares Fenster mit Chromiums PDF-Betrachter und ruft `webContents.print`. Dass das PDF dort mit allen Seiten in der Druckpipeline ankommt, ist unter Electron 43.6.0 gemessen; der Druck an einen echten Windows-Drucker ist am Arbeitsplatz nachzuweisen. Das Verzeichnis als Ziel geht ohne Electron und in beiden Schalen.
- Das Submodul `vendor/bos-nachrichtenvordruck` ist Abhängigkeit von `@s1/ausgaben` und `apps/desktop` (`file:`). Seine Web-App zieht beim Install devDependencies mit (Konzept, Entscheidung 5); die Trennung upstream steht aus.
- Zwei PDF-Wege heißt zwei Fehlerbilder: Ein Listen-PDF scheitert im Browser mit dem Hinweis auf HTML, der Vordruck nicht.

## Nachtrag 2026-11-22: Listen-PDF auch in der Web-Schale

Die Folge „Ein Listen-PDF scheitert im Browser mit dem Hinweis auf HTML“ trug im Einsatz nicht: Wer im Browser arbeitet, braucht die Datei zum Ablegen und Weiterschicken, nicht nur einen Druckdialog. Die Web-Schale füllt deshalb die Naht `Drucker` der Vermittlung mit Chromium ohne Fenster auf dem Server (`apps/desktop/src/web/chromdrucker.ts`): HTML in ein Wegwerf-Verzeichnis, `chromium --headless --print-to-pdf`, Bytes zurück, Verzeichnis weg.

- Entscheidung 2 gilt weiter: Es bleibt eine Vorlage je Liste. Chromium rendert dieselbe Seite wie `printToPDF` in der Desktop-App und beachtet wie dort die `@page`-Regel der Vorlage.
- Keine neue npm-Abhängigkeit. Das Container-Bild installiert `chromium` und `fonts-dejavu-core` per `apt` und setzt `S1_CHROMIUM`; ohne Container sucht die Schale im `PATH`.
- Fehlt Chromium, bleibt das Verhalten von vorher: Die Vermittlung meldet je Ruf, dass PDF hier nicht eingerichtet ist, und verweist auf HTML.
- Das Bild wird größer (Chromium mit Abhängigkeiten, grob 300 MB). Das ist der Preis dafür, dass ein Browser-Arbeitsplatz dieselben Ausgaben hat wie ein Desktop-Arbeitsplatz.
