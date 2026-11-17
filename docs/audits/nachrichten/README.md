# Nachrichten: Befunde der Rollen-Audits (Runde 1 und Runde 2) und ihr Stand

Stand der zweiten Runde: Prüfung gegen main a0e53b5 (mit den ungebuchten Durchläufen), 2026-11-17; Arbeitsstand dieses Dokuments main 5aa8088. Die Befunde der ersten Runde stehen weiter unten (ab „Runde 1“), ihre Statusspalte ist um die Nachprüfung ergänzt.

## Runde 2

Sechs Reviewer haben die Nachrichten-Funktion am 17.11.2026 ein zweites Mal gegen die laufende Web-Schale geprüft (Playwright, Chromium, 1320 x 860, je Arbeitsplatz ein eigener Browser-Kontext, eigener Einsatz je Reviewer): Sachgebietsleiter S3, Leiter des Fernmeldebetriebes, Fernmelder, Sichter und ETB-Führer stellten die Befunde ihrer ersten Runde nach und suchten neue; als sechste Rolle kam ein Fachberater einer anderen Hilfsorganisation (DRK) dazu, der das Programm ohne Einweisung und ohne Kenntnis des Stabsvokabulars benutzte und deshalb keine Befunde nachprüfte. Die Einzelaudits heißen `runde2-reviewer-<rolle>.md`. „Bestätigt“ heißt, der Status der ersten Runde stimmt; „nicht behoben“ heißt, die Befundliste nannte den Befund erledigt oder teilweise erledigt, die Anwendung zeigt ihn weiter; „anders gelöst“ heißt, das Ziel ist auf anderem Weg oder nur zum Teil erreicht (Bewertung des Reviewers, im Einzelfall in der Anmerkung der Tabellen unten). Die Reviewer haben nichts committet; ich habe ihre Aussagen übernommen und nicht selbst an der Anwendung geprüft.

| Audit | Nachgeprüft | bestätigt | nicht behoben | anders gelöst | neu P0 | neu P1 | neu P2 | neu P3 | neu gesamt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| runde2-reviewer-sachgebietsleiter.md | 20 | 14 | 4 | 2 | 0 | 2 | 6 | 6 | 14 |
| runde2-reviewer-ldf.md | 16 | 10 | 1 | 5 | 0 | 3 | 8 | 7 | 18 |
| runde2-reviewer-fernmelder.md | 24 | 21 | 2 | 1 | 0 | 2 | 7 | 6 | 15 |
| runde2-reviewer-sichter.md | 14 | 13 (davon 1 teilweise) | 1 | 0 | 0 | 2 | 5 | 7 | 14 |
| runde2-reviewer-etb-fuehrer.md | 22 | 19 | 1 | 2 | 0 | 2 | 8 | 4 | 14 |
| runde2-reviewer-fachberater.md | – | – | – | – | 3 | 6 | 9 | 5 | 23 |
| Summe | 96 | 77 | 9 | 10 | 3 | 17 | 43 | 35 | 98 |

Zur Zählung: Das Sichter-Audit hat 14 der 17 Befunde der ersten Runde bewertet (P2-2 und P2-3 gehörten nicht zum Auftrag, P3-3 ist bewusst nicht gebaut); die Zahl „bestätigt“ enthält P1-3 mit dem schon im README genannten Rest. Von den neun nicht behobenen Befunden standen drei schon als „offen“ in der Liste (SGL P2-9, P2-12, P2-13); sechs wurden von „behoben“ oder „teilweise behoben“ auf „offen“ zurückgesetzt (SGL P1-7, LdF P1-2, FM P2-3, FM P2-5, Sichter P3-2, ETB P1-7). Die 98 neuen Meldungen enthalten Doppelfunde; nach dem Zusammenführen bleiben 73 Befunde: P0 3, P1 13, P2 36, P3 21. Alle 73 sind „offen“. Kennungen heißen `R2-<Rolle> P<Stufe>-<Nr>` wie im jeweiligen Einzelaudit (`Sichter` statt `Si`); bei zusammengeführten Befunden gilt die Kennung des ersten Fundes, die übrigen stehen unter „Auch gefunden von“.

Gemessen an der ersten Runde sagen alle sechs Reviewer dasselbe: Die Kernwege tragen (Ausgang mit Annahme, Beförderung und Nummer, Nachsichtung, Ersatzsichter, Stau vor dem Sichter, Papier-Nachtrag, Druckverzeichnis mit Rückfrage), die alten P0 sind weg, und kein Reviewer hat ein neues P0 an einer der fünf Fachrollen gefunden. Die drei neuen P0 stammen alle vom Fachberater und betreffen Stellen, an denen die Anwendung ohne Rückfrage oder ohne Auskunft etwas Falsches zulässt.

### Befunde, die mehrere Rollen unabhängig gefunden haben (Runde 2)

Die Tabelle nennt 20 Befunde. 19 davon fassen zusammen 44 Meldungen zusammen, der zwanzigste (Nummernlücken) ist eine Meldung, die ein zweiter Reviewer in der Nachprüfung bestätigte. Jeder Befund zählt im Folgenden einmal. Die Stufe der Gruppe ist die höchste Stufe, die eine Rolle vergeben hat.

| Befund | Gefunden von | Stufe |
| --- | --- | --- |
| Vorbehaltshinweis fehlt beim Sichten, im Papier-Nachtrag und beim Eingang aufnehmen | FaBe P0-1, SGL P1-2, FM P3-2 | P0 |
| „Quittung der Gegenstelle“ ist die Beförderungszeit (vorbelegt, eingefroren, als Quittung gelesen) | FaBe P0-2, SGL P3-4, FM P2-6 | P0 |
| Vokabular des Stabs nirgends erklärt (Handzeichen, FmZ, Sichter, Vorrang, Wunsch) | FaBe P1-2, FaBe P1-1, FaBe P2-3, FaBe P2-6 | P1 |
| Blitz beim LdF ohne Hinweis und ohne Uhr | Sichter P1-1, LdF P1-2 | P1 |
| Karten der Sicht LdF und „Vor dem Sichter“ über den Rand bei 1320 px | LdF P1-1, Sichter P2-4 | P1 |
| Sicht „offen“ für die Übergabe fehlt (dazu nachgeprüft SGL P1-7) | SGL P1-1, FaBe P1-6 | P1 |
| Tagebuch führt falsche Stelle als Akteur | ETB P1-1, LdF P3-2, FaBe P3-5 | P1 |
| Antwort läuft als Funkspruch durch die FmZ, Absender ist die Stelle oder beide | FaBe P1-3, SGL P3-3 | P1 |
| Hinweiskasten verschiebt die Seite | SGL P2-4, Sichter P3-1 | P2 |
| Erster Fokus der Maske liegt auf „Vom Papier nachtragen“ | SGL P2-3, FM P2-2 | P2 |
| Papier-Nachtrag prüft nichts und belegt die Nummer vor | SGL P2-1, LdF P3-7 | P2 |
| Nummernlücken nur im Ausdruck, nicht am Bildschirm (dazu nachgeprüft ETB P2-2) | LdF P2-7 | P2 |
| „Rückgängig“ nennt nach Befördern, Aufnehmen, Aufgeben den falschen Schritt | LdF P2-8, FM P3-1, FaBe P2-8 | P2 |
| Wortlaut des Stellenvorbehalts trifft Rolle und Leser nicht | FaBe P2-7, LdF P3-1 | P2 |
| Karte „Vor dem Sichter“ nicht nach Vorrang sortiert | FM P2-4, Sichter P3-7 | P2 |
| Säumiger, aber besetzter Sichter: Schwelle gilt für Blitz wie Einfach, Knopf fehlt | FM P2-5, Sichter P2-2 | P2 |
| „⚠ Konflikthinweis“ zählt im frischen Einsatz | FM P3-6, Sichter P3-6 | P3 |
| Handbuch kennt den Papier-Nachtrag nicht | SGL P3-6, FM P3-4 | P3 |
| Fußleiste „Sichten“ und Laufzettelhöhe verdecken das Verteilerraster | SGL P3-5, Sichter P3-3 | P3 |
| Sichtungszeile der Nachweisung in schmaler Spalte | LdF P3-6, Sichter P3-4 | P3 |

Zu den Gruppen im Einzelnen. Der Vorbehaltshinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten“ (Entscheidung 13) schützt Annehmen, Befördern und Nachweisen, aber weder das Sichten (Fachberater: eine Nachricht verließ ohne Rückfrage die Warteschlange des Sichters, mit Verteilung nur an S2) noch den Papier-Nachtrag (Sachgebietsleiter: schreibt Annahme, Beförderung und Sichtung mit fremdem Handzeichen) noch das Aufnehmen eines Eingangs (Fernmelder). Das Feld „Quittung der Gegenstelle“ ist mit der Beförderungszeit vorbelegt, friert beim Öffnen ein und erscheint im Vordruck als „Quittung … Fm“; der Fachberater liest das als Bestätigung des Empfängers, der Sachgebietsleiter bemängelt die Beschriftung, der Fernmelder das Einfrieren. Beim LdF ohne Uhr und ohne Hinweis stößt der Sichter (Blitz liegt unbemerkt) und der LdF selbst (keine Wartezeit für Eingänge) auf dieselbe Lücke. Die Karten der Sicht LdF und „Vor dem Sichter“ reichen bei 1320 Pixeln über den Rand; LdF und Sichter messen beide den waagerechten Überlauf (Seitenbreite 1484 bis 1495 px) und den Knopf „An den Sichter weitergeben“ bei x = 1375 bis 1386. Der Sachgebietsleiter und der Fachberater vermissen die Sicht „offen“ für die Übergabe; das ist die Nachprüfung zu SGL P1-7. Bei den Nummernlücken zeigt nur der Ausdruck die Lücke, der Bildschirm nicht (LdF), und der ETB-Führer bestätigt es im Nachgeprüft-Eintrag zu ETB P2-2. Der Hinweiskasten schiebt den Inhalt um 53 bis 59 Pixel (Sachgebietsleiter, Sichter); seine zweite Seite, dass die eigenen beförderten Ausgänge als „neu“ und „grün: bearbeiten“ im eigenen Posteingang zählen, hat der Fachberater als eigenen P1 gefunden (R2-FaBe P1-4, auch zweiter Teil von R2-SGL P2-4) und ist in den Zahlen nur dort gezählt. Den Konflikthinweis-Zähler „⚠ 1 Konflikthinweis“ im frisch angelegten Einsatz sehen Fernmelder und Sichter ohne Anlass, vermutlich aus der Einsatzanlage.

## Neue Befunde der zweiten Runde

Je Stufe nach Zusammenführen der Doppelfunde. Die Fundstellen im Quelltext und die Belege (Screenshots, Skripte) stehen in den Einzelaudits.

### P0 – einsatzkritisch (3)

| Kennung | Kurztitel | Auch gefunden von | Status |
| --- | --- | --- | --- |
| R2-FaBe P0-1 | Vorbehaltshinweis fehlt beim Sichten, im Papier-Nachtrag und beim Eingang aufnehmen | SGL P1-2, FM P3-2 | offen |
| R2-FaBe P0-2 | „Quittung der Gegenstelle“ ist die Beförderungszeit (vorbelegt, eingefroren, als Quittung gelesen) | SGL P3-4, FM P2-6 | offen |
| R2-FaBe P0-3 | Nicht erkennbar, ob die Fernmeldezentrale besetzt ist, Nachricht kann unbemerkt liegen | – | offen |

### P1 – hoch (13)

| Kennung | Kurztitel | Auch gefunden von | Status |
| --- | --- | --- | --- |
| R2-SGL P1-1 | Sicht „offen“ für die Übergabe fehlt (dazu nachgeprüft SGL P1-7) | FaBe P1-6 | offen |
| R2-LdF P1-1 | Karten der Sicht LdF und „Vor dem Sichter“ über den Rand bei 1320 px | Sichter P2-4 | offen |
| R2-LdF P1-3 | Ohne Sichter läuft der Eingang an der Station LdF vorbei | – | offen |
| R2-FM P1-1 | Tabfolge der Aufnahme überspringt Handzeichen, Nr. und Abfassungszeit; Papier-Nachtrag ohne Maus nicht bedienbar | – | offen |
| R2-FM P1-2 | „Ich sichte jetzt selbst“ öffnet Laufzettel unter der Falz; blind „Sichten“ schickt Blitz nur an S2 | – | offen |
| R2-Sichter P1-1 | Blitz beim LdF ohne Hinweis und ohne Uhr | LdF P1-2 | offen |
| R2-Sichter P1-2 | Bei zwei Sichtungen geht der Vermerk des Ersten verloren | – | offen |
| R2-ETB P1-1 | Tagebuch führt falsche Stelle als Akteur | LdF P3-2, FaBe P3-5 | offen |
| R2-ETB P1-2 | ETB-Nr. steht auf Papier, ist am Bildschirm nicht auffindbar | – | offen |
| R2-FaBe P1-2 | Vokabular des Stabs nirgends erklärt (Handzeichen, FmZ, Sichter, Vorrang, Wunsch) | FaBe P1-1, FaBe P2-3, FaBe P2-6 | offen |
| R2-FaBe P1-3 | Antwort läuft als Funkspruch durch die FmZ, Absender ist die Stelle oder beide | SGL P3-3 | offen |
| R2-FaBe P1-4 | Eigene beförderte Nachricht kommt als „neu, grün: bearbeiten“ in den eigenen Posteingang | – | offen |
| R2-FaBe P1-5 | Gesprächsnotiz: Kästchen mit großen Folgen, ohne Erklärung | – | offen |

### P2 – mittel (36)

| Kennung | Kurztitel | Auch gefunden von | Status |
| --- | --- | --- | --- |
| R2-SGL P2-1 | Papier-Nachtrag prüft nichts und belegt die Nummer vor | LdF P3-7 | offen |
| R2-SGL P2-2 | Konflikthinweis bei doppelter Nummer erklärt Anderes und liegt außerhalb des Bildes | – | offen |
| R2-SGL P2-3 | Erster Fokus der Maske liegt auf „Vom Papier nachtragen“ | FM P2-2 | offen |
| R2-SGL P2-4 | Hinweiskasten verschiebt die Seite | Sichter P3-1 | offen |
| R2-SGL P2-5 | Ausgang zeigt nach Beförderung ohne Nummer weiter „folgt (FmZ)“ | – | offen |
| R2-SGL P2-6 | Stellenabfrage lädt Handzeichen des Vorgängers vor, Hauptknopf bestätigt es | – | offen |
| R2-LdF P2-1 | Befördern vor dem Vorschlag: Hinweis erst danach, Funk als stille Vorgabe, keine Spur im Betriebsbuch | – | offen |
| R2-LdF P2-2 | Abweichung vom Vorschlag des LdF wird nicht markiert | – | offen |
| R2-LdF P2-3 | Weitergabe an den Sichter prüft nichts, Eingang ohne Nummer geht durch | – | offen |
| R2-LdF P2-4 | Sicht LdF zeigt nicht, was zum Entscheiden nötig ist; Schwellenzahl mischt LdF und FmZ | – | offen |
| R2-LdF P2-5 | Ausdruck der Nachweisung ohne Gegenstelle, andere Spaltenfolge, gemischtes Zeitformat | – | offen |
| R2-LdF P2-6 | Zeitraum der Nachweisungsausgabe nicht wählbar | – | offen |
| R2-LdF P2-7 | Nummernlücken nur im Ausdruck, nicht am Bildschirm (dazu nachgeprüft ETB P2-2) | – | offen |
| R2-LdF P2-8 | „Rückgängig“ nennt nach Befördern, Aufnehmen, Aufgeben den falschen Schritt | FM P3-1, FaBe P2-8 | offen |
| R2-FM P2-1 | Kein Kürzel für „Eingang aufnehmen“, 20 Tab bis zum Knopf | – | offen |
| R2-FM P2-3 | Enter in einer Zeile speichert halben Funkspruch, Gegenstelle keine Pflicht | – | offen |
| R2-FM P2-4 | Karte „Vor dem Sichter“ nicht nach Vorrang sortiert | Sichter P3-7 | offen |
| R2-FM P2-5 | Säumiger, aber besetzter Sichter: Schwelle gilt für Blitz wie Einfach, Knopf fehlt | Sichter P2-2 | offen |
| R2-FM P2-7 | Zwei Befördern kurz nacheinander: einmal ohne Meldung überschrieben (einmalig, Annahme) | – | offen |
| R2-Sichter P2-1 | Ersatzsichtung der FmZ trägt keine Marke, der heimkehrende Sichter sieht nichts | – | offen |
| R2-Sichter P2-3 | Lesen-Fenster ohne Fokusführung, Escape nimmt die Auswahl mit | – | offen |
| R2-Sichter P2-5 | Reiter „Nachrichten“ zählt beim Sichter nichts | – | offen |
| R2-ETB P2-1 | Akte: alte und neue Stände nebeneinander, zurückgezogene Nachricht ohne Stempel und ohne Vordruck | – | offen |
| R2-ETB P2-2 | Offene Nachrichten nur im Dialog, Abschluss ohne Stelle und Handzeichen | – | offen |
| R2-ETB P2-3 | Nachweisung zeigt die Weitergabe des LdF nicht | – | offen |
| R2-ETB P2-4 | Doppelsichtung: Konflikt in der Diagnose ohne Nachricht und Wert | – | offen |
| R2-ETB P2-5 | Tagebuchzeile ohne Vorrang, Mittel, Gegenstelle und Vermerk | – | offen |
| R2-ETB P2-6 | Nachricht und Lagekarte sind nicht verbunden | – | offen |
| R2-ETB P2-7 | Handzeichen nicht auf Personen und Stellen zurückführbar | – | offen |
| R2-ETB P2-8 | ETB-Nr. ist berechnet und kann sich verschieben (Annahme) | – | offen |
| R2-FaBe P2-1 | Reiter „Eingang“ ist nicht der Posteingang | – | offen |
| R2-FaBe P2-2 | Einstiegszeile sagt nicht, was zu tun ist | – | offen |
| R2-FaBe P2-4 | „Lesen“ ist auch Kenntnisnahme, „Erledigt“ meldet nichts zurück | – | offen |
| R2-FaBe P2-5 | Abfassungszeit „171534“ wird kommentarlos als vor fünf Stunden gelesen | – | offen |
| R2-FaBe P2-7 | Wortlaut des Stellenvorbehalts trifft Rolle und Leser nicht | LdF P3-1 | offen |
| R2-FaBe P2-9 | Ausgangsliste mischt E und A, Reihenfolge unklar | – | offen |

### P3 – gering (21)

| Kennung | Kurztitel | Auch gefunden von | Status |
| --- | --- | --- | --- |
| R2-SGL P3-1 | Rückfrage bei doppeltem Ausgang steht hinter der Fußleiste | – | offen |
| R2-SGL P3-2 | Zweites Esc verwirft den Entwurf endgültig | – | offen |
| R2-SGL P3-5 | Fußleiste „Sichten“ und Laufzettelhöhe verdecken das Verteilerraster | Sichter P3-3 | offen |
| R2-SGL P3-6 | Handbuch kennt den Papier-Nachtrag nicht | FM P3-4 | offen |
| R2-LdF P3-3 | Marke „beim LdF“ und Zahl „Vor dem LdF“ bleiben bei unbesetztem LdF stehen | – | offen |
| R2-LdF P3-4 | Fernmelder fest Fm1 bis Fm3, Vorschlag nur über FmZ-Sicht änderbar, Sicht nach Neuladen | – | offen |
| R2-LdF P3-5 | Vordruck zeichnet Wunsch und tatsächlichen Weg nicht getrennt | – | offen |
| R2-LdF P3-6 | Sichtungszeile der Nachweisung in schmaler Spalte | Sichter P3-4 | offen |
| R2-FM P3-3 | Marke „Wartet“ sitzt versetzt, „seit 0 min“ im ersten Takt | – | offen |
| R2-FM P3-5 | „Übernehmen“ in den Druckeinstellungen schweigt bei fehlendem Verzeichnis | – | offen |
| R2-FM P3-6 | „⚠ Konflikthinweis“ zählt im frischen Einsatz | Sichter P3-6 | offen |
| R2-Sichter P3-2 | Leere Sicht „Sichter“ schweigt zur Station LdF | – | offen |
| R2-Sichter P3-5 | „Stelle abgeben“ ist in der Web-Schale kein Bedienelement | – | offen |
| R2-ETB P3-1 | Warnung zur doppelten Nummer verschwindet nach 20 Sekunden | – | offen |
| R2-ETB P3-2 | Druckkopf „@bos/eeb-format 0.0.0“, Beschriftungen Druck gegen Bildschirm | – | offen |
| R2-ETB P3-3 | Lese-Ansicht einer zurückgezogenen Nachricht ohne Grund im Kopf | – | offen |
| R2-ETB P3-4 | Zurückziehen nach Verteilung sagt nicht, wer die Nachricht schon hat | – | offen |
| R2-FaBe P3-1 | „Löschen“ im Hinweiskasten wird als „Nachricht löschen“ gelesen | – | offen |
| R2-FaBe P3-2 | Sofort-Hinweis ohne Ton, leicht zu übersehen | – | offen |
| R2-FaBe P3-3 | Statuszeile nennt keine Stellen der weiteren Arbeitsplätze | – | offen |
| R2-FaBe P3-4 | „Abbrechen“ wird beim Verwerfen still zu „Verwerfen“ | – | offen |


## Runde 1: Vorgehen, Zahlen und Stand

Stand: main be6f9b9 und die ungebuchten Durchläufe 2 und 3, 2026-11-17.

Fünf Rollen haben die Funktion „Nachrichten“ (4-fach-Vordruck) am 17.11.2026 gegen die laufende Web-Schale geprüft: Sachgebietsleiter S3, Leiter des Fernmeldebetriebes, Fernmelder, Sichter und ETB-Führer. Jede Rolle fuhr mit Playwright (Chromium, Viewport 1320 x 860) in eigenen Browser-Kontexten je Arbeitsplatz, in einem eigenen Einsatz auf dem gemeinsamen Share. Vier Audits prüften den Stand 15ecdbd, das Sichter-Audit den Stand dee1f01. Anders als die code- und dokumentationsbasierten Audits in `docs/audits/README.md` beruhen diese Befunde auf Beobachtung an der laufenden Anwendung; Fundstellen im Quelltext belegen die Ursachen. Bewertet wurde, was die Rolle am Arbeitsplatz erlebt; Annahmen stehen in den Einzeldokumenten als solche. Die Station LdF und die rote und grüne Kopie beim Ausgang waren beim Prüfen im Bau und sind in den meisten Audits nicht bewertet.

Dieses Dokument ordnet jedem Befund einen Status nach den Behebungs-Commits 57699bb (Domäne), 5418687 (Ausgaben), 46c65ac (Kontrakt), 9bbe3fe (Worker), d36d287 (Renderer), d394e34 (Testschritt) und be6f9b9 (Dokumentation) zu. Der Status stammt aus den Commit-Texten und dem Umsetzungsbericht (`docs/v2/entwurf/nachrichten/UMSETZUNGSBERICHT.md`) und wurde stichprobenartig im Code gegengeprüft: Die behobenen Befunde tragen im Quelltext meist Kommentare mit der Kennung und in den Tests Beschreibungen wie „LdF P0-1“ oder „ETB P0-2“ (zum Beispiel `Nachrichtenaudit.test.tsx`, `Sichteraudit.test.tsx`, `szenarien-nachrichtenbefunde.test.ts`, `nachrichten-befunde.test.ts`, `listen.test.ts`). Die Spalte „Beleg“ sagt, worauf der Status beruht. „Code und Test“ heißt, dass ich Kommentar und Test gefunden und gelesen habe, ohne die Tests selbst auszuführen. „Code“ heißt, dass die Umsetzung im Quelltext zu sehen ist, ein eigener Test aber nicht gesichtet wurde. „Commit-Text“ heißt, dass ich den Status nur aus dem Commit oder dem Bericht übernommen habe. „Kein Treffer“ heißt, dass die Suche nach Kennung, Funktion oder Begriff nichts ergab; ein offener Befund ist damit aus dem Fehlen von Spuren geschlossen und nicht durch einen Lauf der Anwendung bestätigt. Es lief keine Instanz, und es wurde nichts committet.

## Die Audits in Zahlen

| Datei | Rolle | P0 | P1 | P2 | P3 | Befunde |
| --- | --- | --- | --- | --- | --- | --- |
| reviewer-sachgebietsleiter.md | Sachgebietsleiter S3 (SGL) | 1 | 6 | 8 | 5 | 20 |
| reviewer-ldf.md | Leiter des Fernmeldebetriebes (LdF) | 2 | 4 | 6 | 4 | 16 |
| reviewer-fernmelder.md | Fernmelder (FM) | 0 | 6 | 11 | 7 | 24 |
| reviewer-sichter.md | Sichter | 3 | 5 | 5 | 4 | 17 |
| reviewer-etb-fuehrer.md | ETB-Führer (ETB) | 3 | 7 | 7 | 5 | 22 |
| Summe |  | 9 | 28 | 37 | 25 | 99 |

Das ETB-Audit nennt im Kopf vier P3-Befunde, führt aber fünf aus; gezählt sind die fünf ausgeführten. Die P1-Nummerierung des SGL-Audits beginnt bei P1-2 und läuft durch alle Stufen weiter bis P3-20, die Kennungen folgen dem Dokument.

## Stand je Audit nach Runde 2

Die Zahlen berücksichtigen die Nachprüfung der zweiten Runde: Sechs Befunde, die als behoben oder teilweise behoben geführt wurden, hat ein Reviewer als nicht behoben festgestellt (SGL P1-7, LdF P1-2, FM P2-3, FM P2-5, Sichter P3-2, ETB P1-7) und stehen jetzt als „offen“. Vor der Nachprüfung waren es behoben 78, teilweise behoben 12, offen 5, bewusst nicht 4.

| Rolle | behoben | teilweise | offen | bewusst nicht | nicht prüfbar |
| --- | --- | --- | --- | --- | --- |
| SGL | 13 | 1 | 4 | 2 | 0 |
| LdF | 14 | 1 | 1 | 0 | 0 |
| FM | 19 | 3 | 2 | 0 | 0 |
| Sichter | 12 | 1 | 3 | 1 | 0 |
| ETB | 15 | 5 | 1 | 1 | 0 |
| Summe | 73 | 11 | 11 | 4 | 0 |

Stand nach dem dritten Durchlauf und den Entscheidungen der Fachseite vom 2026-11-17 (ungebucht, Spalte „Commit“: „3. Durchlauf (ungebucht)“ und „Entscheidung 11 bis 14 (ungebucht)“), vor der Nachprüfung der zweiten Runde. Die damals fünf offenen Befunde waren SGL P2-9, P2-12, P2-13 und Sichter P2-2, P2-3; keiner wartet mehr auf die Fachseite. Johannes entschied am 2026-11-17: „Die Lehrunterlage ist Maßstab. S5 wie im Vordruck.“ Daraus folgen die Entscheidungen 11 bis 14 im Konzept (§11): SGL P1-2 und Sichter P3-3 sind bewusst nicht gebaut, LdF P2-3 ist als Hinweis statt Recht umgesetzt (teilweise, weil die Marke „Verfasser = Nachweiser“ fehlt), SGL P2-14 ist behoben.

Auf die P0-Befunde bezogen: Alle neun P0-Befunde sind behoben (SGL P0-1, LdF P0-1 und P0-2, Sichter P0-1 bis P0-3, ETB P0-1 bis P0-3). Das Fernmelder-Audit hat keinen P0.

## Befunde, die mehrere Rollen unabhängig gefunden haben (Runde 1)

Die FmZ-Warteschlange und der Ausgang führten eine Nachricht in den Zustand „erledigt“, sobald sie befördert war, auch wenn sie nie angenommen und nie nummeriert wurde. Der LdF fand das als Lücke im Betriebsbuch (LdF P0-1), der Sachgebietsleiter als irreführende Auskunft an den Verfasser (SGL P0-1, P1-6), der Fernmelder als unsichtbaren Zustand „befördert, nicht nachgewiesen“ (FM P2-10), der ETB-Führer in Gestalt der Nachrichten ohne Nummer beim Beenden (ETB P1-6). Behoben mit 57699bb (Laufstand, Vermerke in der Zeile), 9bbe3fe (Befördern trägt Annahme und Nummer nach) und d36d287 (Karte „Ohne Nummer“, zweiter Klick).

Die Zwanzig-Minuten-Marke zählte erst ab der Annahme und schwieg damit genau bei einem Rückstau. Gefunden vom LdF (P0-2, P1-4) und vom Fernmelder (P1-5). Sie läuft seit 57699bb ab dem Eintreffen bei der FmZ; der Fernmelder bekommt für Blitz und Sofort im Ausgang einen Ton (9bbe3fe).

Eine gesichtete Nachricht ließ sich nicht nachsichten, und der Verteiler war damit nicht korrigierbar. Gefunden vom Sichter (P0-1) und vom ETB-Führer (P1-2); die Nachsichtung gibt es seit d36d287, nur die ETB-Nummer in Feld 20 fehlt noch.

Das bloße Ansehen eines fremden Posteingangs schrieb Kenntnis für diese Stelle. Gefunden vom Sichter (P0-2) und vom ETB-Führer (P2-5), vom Sachgebietsleiter als Doppelklickproblem (P2-12). Die Kenntnis gilt seit d36d287 nur für Stellen der eigenen Sitzung; Öffnen gleich Kenntnis bleibt.

Die Anschrift floss nicht in den Verteiler und wurde nicht zur grünen Hauptempfängerkopie. Gefunden vom Sachgebietsleiter (P1-3) und vom Fernmelder (P1-4); behoben mit d36d287.

Esc verwarf einen halb getippten Vordruck ohne Rückfrage, gefunden vom Sachgebietsleiter (P1-5) und vom Fernmelder (P1-3); behoben mit d36d287.

Die Nachweisung ließ Mittel und Gegenstelle aus und zeigte Zeiten anders als der Ausdruck. Gefunden von LdF (P1-3), Fernmelder (P2-7) und ETB-Führer (P2-6); behoben mit d36d287 und 5418687.

Lücken und fehlende Nummern in der Nachweisung blieben unbemerkt: LdF (P1-2, P2-2), ETB-Führer (P2-2), Sachgebietsleiter (P1-6). Band und Nachweisung nennen sie seit 57699bb und 5418687, nur die Rückfrage bei einem großen Nummernsprung fehlt.

Der Sperrhinweis nannte den Arbeitsplatz statt der Person: Fernmelder (P2-5) und Sichter (P2-4). Behoben mit d36d287. Ebenso fehlte eine Sicht auf das, was für die eigene Stelle offen ist oder schon gesichtet wurde (SGL P1-7, Sichter P1-5, ETB P1-6); behoben mit 57699bb und d36d287.

Offen waren drei Befunde, die ebenfalls mehrere Rollen fanden (alle drei sind seit dem zweiten und dritten Durchlauf behoben, siehe Tabelle). Die Zeitzone der Datum-Zeit-Gruppe (fest Berlin) gegen die Rechnerzeit in Kopf, Tagebuch und Eingabefeldern fanden SGL P3-16, ETB P2-1, LdF P2-4 und FM P2-1. Der späte Wechsel zum Ersatzsichter und die nachlaufende Präsenz fanden Sichter P1-4 und P3-4 und ETB P3-3. Die Beschriftung „Nr. (E)“ bei gemeinsamer Zählung nannten LdF P3-1 und ETB P3-2.

## Alle Befunde mit Status

Spalte „Commit“: der Commit, der den Befund schließt oder verkleinert. Wo ein Befund mit einem Befund einer anderen Rolle zusammenfällt, steht das in der Spalte „Beleg und Anmerkung“.


### P0 – einsatzkritisch

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P0-1 | Ausgang meldet „erledigt“ bei nur befördert, ohne Zeit und Nummer | behoben | 57699bb, d36d287 | Code und Test: Laufstand je Zeile, Stand aus den Vermerken. Auch LdF P0-1. |
| ETB P0-1 | Tagebuchzeile und Nachricht nur über Text verbunden | behoben | 57699bb, 46c65ac, d36d287 | Code und Test (nachrichtId, Filter, Ruf nachrichtAnfordern, Knopf „Nachricht öffnen“). |
| ETB P0-2 | Berichtigungen nicht erkennbar, Nummer ist die von heute | behoben | 57699bb | Code und Test (Nummer zur Zeit des Ereignisses, „jetzt E 3“, Filter schließt Berichtigung und Zurückziehen ein). |
| ETB P0-3 | Gedrucktes Tagebuch mit wechselnder Zeit, nicht chronologisch | behoben | 5418687 | Code und Test (listen.test.ts): zwei Zeiten, laufende Nummer, Hz., Rechner, Abschlusszeile. |
| LdF P0-1 | Befördern ohne Annahme und Nummer lässt Nachricht aus der Warteschlange fallen | behoben | 9bbe3fe, 46c65ac, d36d287 | Code und Test (Folgewert Annahme, zweiter Klick „Trotzdem ohne Nummer“, Karte „Ohne Nummer“). Auch SGL P0-1, P1-6. |
| LdF P0-2 | Zwanzig-Minuten-Regel misst nur angenommene Nachrichten | behoben | 57699bb | Code und Test (Schwelle ab Eintreffen, Wartezeit in der Zeile). Auch FM P1-5. |
| Sichter P0-1 | Gesichtete Nachricht lässt sich nicht nachsichten | behoben | d36d287 | Code und Test (Sichteraudit.test.tsx). Auch ETB P1-2. |
| Sichter P0-2 | Ansehen eines fremden Posteingangs quittiert für die Stelle | behoben | d36d287 | Code und Test. Auch ETB P2-5. |
| Sichter P0-3 | Zwei Sichter: Verteiler geht still verloren | behoben | fa7abbb (vorher), d36d287 | Code und Test (Vereinigung der Verteiler, Laufzettel bleibt offen mit Meldung). |

### P1 – hoch

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P1-2 | Kein stabsinterner Weg, S3 an S4 läuft über die FmZ | bewusst nicht (Lehrunterlage, Folie 31) | Entscheidung 11 (ungebucht) | Konzept §11 Entscheidung 11: Verkehr zwischen Stellen läuft als Gesprächsnotiz über den Sichter oder die eigene Verteilung; ein Weg an FmZ und Sichter vorbei ist nicht gebaut. Ein Satz im Handbuch. Runde 2: anders gelöst; die Gesprächsnotiz „Selbst verteilen“ läuft ohne FmZ, der Papier-Nachtrag öffnet aber einen Weg an FmZ und Sichter vorbei (R2-SGL P1-2). |
| SGL P1-3 | Anschrift wird nicht in den Verteiler übernommen | behoben | d36d287 | Code und Test. Auch FM P1-4. |
| SGL P1-4 | Handzeichen und Absender keine Pflicht, eigene Stelle unsichtbar | behoben | d36d287 | Code und Test (Pflichtfelder, „ohne Stelle“ in der Statuszeile). Auch ETB P1-4. |
| SGL P1-5 | Esc verwirft angefangenen Vordruck ohne Rückfrage | behoben | d36d287 | Code und Test. Auch FM P1-3. |
| SGL P1-6 | Nachrichten verlassen die FmZ-Warteschlange ohne Nummer | behoben | 9bbe3fe, d36d287 | Code und Test: Befördern trägt Annahme und Nummer nach, Karte „Ohne Nummer“. Auch LdF P0-1, P1-2, FM P2-10. |
| SGL P1-7 | Keine Sicht „offen“, Zähler zählt Erledigtes mit | offen (Runde 2: nicht behoben) | 57699bb, d36d287 | Code und Test (offenFuerStellen, Sichten „offen“ und „gesichtet“). Auch Sichter P1-5, ETB P1-6. Runde 2: nicht behoben: Der Zähler „mit Vorrang offen“ zählt je Stelle, im Blatt gibt es aber weder Sicht noch Chip „offen“, das Übungsdrehbuch (Minute 100) setzt sie voraus (R2-SGL P1-1, auch R2-FaBe P1-6). Die frühere Angabe „Code und Test“ trug den Status nicht. |
| ETB P1-1 | Ausgang: rote Kopie fehlt bei S2 | behoben | fa7abbb (vor den sieben Commits) | Im Befund „in Arbeit“; Kopien nach der Beförderung in worker/laufwegfolgen.ts gesehen, eigener Test nicht geprüft. |
| ETB P1-2 | Nachsichten und Vermerke nach Sichtung nicht erreichbar, Feld 20 | behoben | d36d287, 2. Durchlauf (ungebucht) | Nachsichtung (d36d287); dazu `etbNummer` an der Zeile und „ETB-Nr.“ in Feld 20 des Vordrucks (nachrichtstempel.test.ts, szenarien-durchlauf2.test.ts). |
| ETB P1-3 | Berichtigen nur bei doppelter Nummer, Zurückziehen ohne Grund im Blatt | teilweise behoben | d36d287, 2. Durchlauf (ungebucht) | Berichtigen bei jeder Nummer (d36d287); Grund und Zeit des Zurückziehens in Zeile (`zurueckgezogenMit`), Nachweisung und Stempel im Vordruck. Berichtigung anderer Felder und „ersetzt durch Nr.“ nicht gebaut. |
| ETB P1-4 | Absender kann leer bleiben | behoben | d36d287 | Code und Test (Absender Pflicht). |
| ETB P1-5 | Akte nimmt Nachrichten-PDFs nur nach manueller Erzeugung mit | behoben | 9bbe3fe | Code und Test (aktenbeilagen.ts); PDF der Listen bleibt Desktop-Sache. |
| ETB P1-6 | „Einsatz beenden“ nennt offene Nachrichten nicht | behoben | 46c65ac, 9bbe3fe, d36d287 | Code und Test (offeneNachrichten im Lagebild, Abschlussmaske). |
| ETB P1-7 | Akteur „Arbeitsplatz“, Handzeichen nur im Satz | offen (Runde 2: nicht behoben) | 57699bb, 5418687, 2. Durchlauf (ungebucht) | Handzeichen je Ereignis (57699bb); Stelle aus der Nutzlast (`stelle`, Funktion, Sichter, LdF) in Tagebuchansicht und Druck statt des Anzeigenamens. Die Präsenz zur Zeit des Ereignisses ist nicht aufbewahrt und fließt nicht ein. Runde 2: nicht behoben: „erledigt“ und „zurückgezogen“ tragen weiter weder Handzeichen noch Fachzeit, das Zurückziehen und „Einsatz beendet“ zeigen „Arbeitsplatz“, die FmZ-Schritte nur „Fm“, beim Aufnehmen steht die Funktion des Absenders als Akteur (R2-ETB P1-1, P2-2). |
| LdF P1-1 | Station LdF fehlt | behoben | e32c39b, fa7abbb (vor den sieben Commits) | Im Befund „in Arbeit“; Sicht „ldf“ und Laufwegfolgen im Code gesehen, nicht im Einzelnen geprüft. Runde 2: anders gelöst; „Mittel festlegen“ ist ein Vorschlag, den die FmZ ohne Rückfrage umgeht, Funk bleibt stille Vorgabe (R2-LdF P2-1, P2-2); Eingangskarte bei 1320 px über dem Rand (R2-LdF P1-1). |
| LdF P1-2 | Eingang ohne Nummer läuft zum Sichter, Lücke fällt nicht auf | offen (Runde 2: nicht behoben) | 57699bb, d36d287 | Marke „ohne Nummer“, Zähler und Karte (Code); Rückfrage beim Aufnehmen ohne Nummer nicht belegt. Runde 2: nicht behoben: Ein Eingang ohne Nummer wird ohne Rückfrage aufgenommen und ohne Hinweis weitergegeben, die Karte „Ohne Nummer“ führt nur beförderte Ausgänge (R2-LdF P2-3). |
| LdF P1-3 | Nachweisung ohne Mittel und Gegenstelle | behoben | d36d287, 5418687 | Code und Test. Auch FM P2-7, ETB P2-6. |
| LdF P1-4 | Ohne Wartezeit und Zähler keine Beurteilung der Belastung | behoben | 57699bb, d36d287 | Code und Test (Schwelle im Kopf der Warteschlange, Wartezeit, weitere Zahlen im Band). |
| FM P1-1 | Getippte Funkzeit hängt sich an die Vorbelegung an | behoben | d36d287 | Code und Test (select() beim Fokus). |
| FM P1-2 | Aufnahmemaske ohne Tastaturbestätigung, 18 Tabulatorschritte | behoben | d36d287 | Code und Test (Strg+Enter, Tabfolge). |
| FM P1-3 | Esc verwirft halb getippten Funkspruch | behoben | d36d287 | Code und Test. Auch SGL P1-5. |
| FM P1-4 | Ersatzsichter verteilt nur an S2, Anschrift keine Kopie | behoben | d36d287 | Code und Test (grün vorbelegt, Warnung ohne Hauptempfänger). Auch SGL P1-3. |
| FM P1-5 | Blitz oder Sofort im Ausgang ohne Signal, Marke erst ab Annahme | behoben | 57699bb, 9bbe3fe | Code und Test (Ton bei der FmZ, Schwelle ab Eintreffen). Auch LdF P0-2. |
| FM P1-6 | Papier-Rückfall in der Web-Schale: leerer Vordruck nur als HTML | behoben | 2. Durchlauf (ungebucht) | Code und Test: „Papier-Vordruck als PDF“ liefert in der Web-Schale `vordruck-nachricht-leer.pdf` (jsPDF), das HTML daneben in `weitere`. |
| Sichter P1-1 | Eingang mit Vorrang wird dem Sichter nicht gemeldet | behoben | 9bbe3fe | Code und Test (szenarien-fmz-audit.test.ts). |
| Sichter P1-2 | Inhalt beim Sichten nicht lesbar | behoben | d36d287 | Code und Test (Eingangszeit und Inhalt im Laufzettel). |
| Sichter P1-3 | Mahnung „Nicht jeder alles“ nicht unterstützt | teilweise behoben | d36d287 | Warnung ohne Hauptempfänger (Code und Test); Vorschlag „zuletzt gleiche Absender“ und Empfängerzahl nicht belegt. |
| Sichter P1-4 | Wechsel zum Ersatzsichter dauert über zwei Minuten, Stau unsichtbar | behoben | 2. Durchlauf (ungebucht) | Code und Test: „Stelle abgeben“ (Präsenz sofort ohne Stellen, `abgemeldet`, beim Schließen der Akte, Wechsel des Einsatzes und `pagehide` der Web-Schale), Hinweis „n Eingänge warten seit m Minuten vor dem Sichter“ an FMZ/LDF, `vorSichterUeberSchwelle`, `wartetSeitSichter` (szenarien-durchlauf2.test.ts, praesenz.test.ts, arbeitsplaetze.test.ts). Knopf „Ich sichte jetzt selbst“ ist Renderer-Sache. Auch ETB P3-3, Sichter P3-4. |
| Sichter P1-5 | Keine Ablage „heute gesichtet“ | behoben | 57699bb, 5418687 | Code und Test (Sicht „gesichtet“, Sichtung und Verteiler in der Nachweisung). Auch SGL P1-7. |

### P2 – mittel

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P2-8 | Kopiefarbe nur als Rand, kein Wort | behoben | d36d287 | Code und Test (Kopiefarbe als Wort im Stand). |
| SGL P2-9 | Im Ausgang nicht sichtbar, wer gelesen hat | offen | – | Kein Treffer; gesichtetVon nennt den Sichter, nicht die Lesenden. Runde 2: nicht behoben, Zustand unverändert. |
| SGL P2-10 | Hinweis nur bei Vorrang, kein Zähler am Reiter, liegt am Seitenende | teilweise behoben | 3. Durchlauf (ungebucht) | Der Zähler „neu“ am Reiter steht in `Reiterzeile.tsx` (`neuFuerStellen`); der Hinweiskasten steht jetzt oben am Blatt wie das Fehlerbild, nicht am Seitenende (`Hinweiskasten.tsx`, Test in `Nachrichtenfeinschliff.test.tsx`). Offen: Hinweis nur bei Vorrang, nicht anklickbar („E 2 öffnen“). |
| SGL P2-11 | Sichten auf 860 px zu lang, Verteilermatrix gestreckt | behoben | d36d287, 3. Durchlauf (ungebucht) | Gemessen in der Web-Schale bei 1320 x 860: „Sichten“ mit vier Empfängern (S2 rot, S3 grün, S4 blau, Leiter blau) liegt bei 823 bis 854 px ohne Scrollen (klebende Fußleiste), die Zeile Quittung/Handzeichen war 135 px hoch und ist 72 px hoch (CSS, `index.html`), das Raster beginnt bei 740 statt 804 px; Hauptknopf „Aufnehmen“ der Aufnahmemaske 806 bis 837 px. Auch Sichter P2-1. |
| SGL P2-12 | „Lesen“ setzt Kenntnisnahme sofort, ohne Rücknahme | offen | – | Kenntnis gilt jetzt nur für eigene Stellen (Sichter P0-2); Doppelklick und fehlende Rücknahme unverändert. Runde 2: nicht behoben, Zustand unverändert. |
| SGL P2-13 | „Erledigt“ ohne Vermerk, Antwort nicht mit Original verknüpft | offen | – | Kein Treffer; Bezug gibt es nur im Tagebuch (ETB P0-1). Runde 2: nicht behoben, Zustand unverändert. |
| SGL P2-14 | Ausgang hängt am Absendertext oder Rechner, nicht an der Stelle | behoben | Entscheidung 14 (ungebucht) | Code und Test: `inSicht` für `ausgang` schneidet nach `funktion` (Feld 15/17) gegen die Stellen der Sitzung oder nach `clientId`, der Absender-Freitext zählt nicht mehr; die Maske belegt `funktion` aus der Stelle vor. Test in nachrichten.test.ts und als Worker-Szenario „Schichtwechsel“ (szenarien-nachrichten.test.ts). |
| SGL P2-15 | Nachweisung im Browser nur als HTML | bewusst nicht | – | Bericht: PDF der Listen bleibt Sache der Desktop-Schale; die Akte legt die Nachweisung als HTML bei (9bbe3fe). Audit selbst: kein Mangel bei Desktop-Einsatz. Runde 2: anders gelöst (nur HTML im Browser), für die Desktop-Schale kein Mangel. |
| ETB P2-1 | Zeit im Tagebuch ohne Jahr, Browserzone, nicht Datum-Zeit-Gruppe | teilweise behoben | 2. Durchlauf (ungebucht), 3. Durchlauf (ungebucht) | Zone wie SGL P3-16 behoben, jetzt auch in Einsatzliste, Einsatzanlage, Monitorwarnung und Eingangsrevisionen; Jahr am Bildschirm und Option Datum-Zeit-Gruppe im Tagebuch nicht gebaut. |
| ETB P2-2 | Vollständigkeit der Nummernfolge nicht geprüft | behoben | 57699bb, 5418687 | Code und Test (nummernluecken, Fuß der Nachweisung). Auch LdF P2-2. Runde 2: anders gelöst; Ausdruck nennt die Lücken, Bildschirm und Hinweiskasten nicht (R2-LdF P2-7). |
| ETB P2-3 | Anlagen fehlen | bewusst nicht | – | Bericht: Anhänge nicht gebaut, Audit selbst „später“. |
| ETB P2-4 | Tagebuch: 100 Zeilen, keine Nachrichtenfilter, Druck ohne Filter | teilweise behoben | 46c65ac, d36d287 | Filter je Nachricht (Code und Test); Ausschnitt und ungefilterter Druck nicht belegt. |
| ETB P2-5 | Kenntnisnahme durch Öffnen, „erledigt“ ohne Handzeichen | teilweise behoben | d36d287 | Kenntnis nur für eigene Stellen (Code und Test); Öffnen gleich Kenntnis bleibt, Handbuch nicht angepasst. |
| ETB P2-6 | Nachweisung und Tagebuch decken sich nicht in allen Angaben | behoben | d36d287, 5418687 | Code und Test (Mittel, Gegenstelle, Sichtung, Zeitschreibweise). Auch LdF P1-3, FM P2-7. Runde 2: anders gelöst; im HTML-Ausdruck fehlt die Gegenstelle, Zeiten stehen in zwei Schreibweisen (R2-LdF P2-5). |
| ETB P2-7 | Vordruck-PDF ist Stand zum Druckzeitpunkt | teilweise behoben | 2. Durchlauf (ungebucht), 3. Durchlauf (ungebucht) | Stempel „ZURÜCKGEZOGEN <DTG>: <Grund>“ im PDF (Prüfvermerk, Hinweiszeile, Schriftzug); die Vorschau zeigt ihn als Zeile und im gezeichneten Vordruck (Vordruckvorschau.test.tsx, dritter Durchlauf). Stand im Fußfeld und Umbenennen alter Dateien nicht gebaut. |
| LdF P2-1 | Berichtigung beginnt mit der falschen Nummer | behoben | d36d287 | Code und Test (nächste freie Nummer vorbelegt). |
| LdF P2-2 | Lücken und Sprünge in der Nummernfolge | behoben | 57699bb, 5418687 | Code und Test; die Rückfrage bei großem Sprung ist nicht belegt. Auch ETB P2-2. Runde 2: anders gelöst; der Ausdruck nennt die Lücken, der Bildschirm nicht, der Sprung 6 auf 50 wurde ohne Rückfrage geschrieben (R2-LdF P2-7, auch ETB P2-2). |
| LdF P2-3 | Stelle ist Zuschnitt, kein Recht | teilweise behoben | Entscheidung 13 (ungebucht) | Code und Test (Stellenvorbehalt.test.tsx): Hinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten …“ mit „Trotzdem“ vor Annehmen, Befördern, Nachweisen, Vorschlag und Weitergabe, `grund` „Eintrag durch <Stelle>, nicht FmZ“ im Tagebuch; kein Recht, keine Sperre. Nicht gebaut: die Marke „Verfasser = Nachweiser“ in der Nachweisung. Runde 2: anders gelöst; der Hinweis steht bei Annehmen, Befördern, Nachweisen, aber nicht beim Sichten, im Papier-Nachtrag und beim Aufnehmen (R2-FaBe P0-1). |
| LdF P2-4 | Uhrzeit in vier Zeitzonen-Darstellungen | behoben | 2. Durchlauf (ungebucht) | Siehe SGL P3-16; Kopf, Maske und Ausdruck in derselben Zone, Hinweis bei abweichender Rechnerzeit. |
| LdF P2-5 | Betriebsbuch am Schichtende ohne Schicht und Abschluss, Rohtext im Kopf | behoben | 2. Durchlauf (ungebucht), 3. Durchlauf (ungebucht) | Schichtausdruck über `von`/`bis`, Zeitraum im Kopf, Abschlusszeile, „Erstellt Stand“ entdoppelt; dritter Durchlauf: Unterschriftszeile LdF (Datum/Uhrzeit, Handzeichen, Unterschrift) im Fuß, Kopf ohne Einsatzordner und Kernversion (`schlankerKopf`, nachweisung.test.ts). Filter nach Nummernbereich nicht gebaut. Runde 2: anders gelöst; Zeitraum und Unterschriftszeile stehen, einen Zeitraum wählen kann der LdF nicht (R2-LdF P2-6). |
| LdF P2-6 | Absender nicht in der Warteschlange | behoben | d36d287 | Code (Fernmeldezentrale.tsx, Kommentar „P2-6“). |
| FM P2-1 | Zeitzone: Funkzeit in Browserzeit gelesen, Gruppe in Berlin | behoben | 2. Durchlauf (ungebucht) | Siehe SGL P3-16; Funkzeit und Datum-Zeit-Gruppe in derselben Zone, Monatskürzel im Kopf wie im Vordruck (groß). |
| FM P2-2 | Keine Plausibilitätsprüfung der Zeiten | behoben | d36d287 | Code und Test (weiche Warnung bei Zukunft und älter als ein Tag). |
| FM P2-3 | Abfassungszeit und Quittung mit „jetzt“ vorbelegt | offen (Runde 2: nicht behoben) | – | Kein Treffer. Runde 2: nicht behoben: Im Eingang stehen Abfassungszeit und Quittung weiter auf „jetzt“, nur der Schalter „Vom Papier nachtragen“ leert sie (R2-FM P1-1). Die frühere Angabe „Kein Treffer“ war kein Beleg für die Behebung. |
| FM P2-4 | Befördern: Feld nennt die Quittung nicht, stille Vorbelegungen | behoben | d36d287 | Code (Beschriftung „Quittung der Gegenstelle“). |
| FM P2-5 | Weiche Sperre nennt Arbeitsplatz, nicht Person | offen (Runde 2: nicht behoben) | d36d287 | Code und Test (Stelle und Handzeichen im Sperrhinweis). = Sichter P2-4. Runde 2: nicht behoben: Die Befördern-Maske zeigt weiter „wird von Arbeitsplatz bearbeitet“ ohne Stelle und Handzeichen (`Fmzmasken.tsx:297`), nur der Laufzettel nennt die Person; Sichter P2-4 ist damit nur im Laufzettel behoben. |
| FM P2-6 | Konfliktmeldung zeigt Rohdaten, „Neu laden?“ ohne Knopf | behoben | – | Kein Treffer. |
| FM P2-7 | Nachweisung ohne Mittel und Gegenstelle, Aufnahme nicht korrigierbar | teilweise behoben | d36d287 | Spalten ergänzt (Code und Test); „Aufnahme ändern“ nicht belegt. |
| FM P2-8 | Maske fängt den Fokus nicht ein, Fokus nach Schließen verloren | behoben | – | Bekannt offen (Fokusrücksprung); Tabfolge ist neu, Fokusfalle und Rückgabe nicht. |
| FM P2-9 | Nachtrag eines Ausgangs braucht vier Masken | behoben | 9bbe3fe | Befördern trägt Annahme und Nummer nach (Test); Nachtragsmodus in einer Maske nicht gebaut. Runde 2: anders gelöst, besser als vermerkt: „Vom Papier nachtragen“ trägt einen Ausgang in einer Maske nach (Prüfung der Eingaben siehe R2-SGL P2-1). |
| FM P2-10 | „Befördert, aber nicht nachgewiesen“ nirgends sichtbar | behoben | d36d287, 57699bb | Code und Test (Karte „Ohne Nummer“, Marke ohneNummer). |
| FM P2-11 | Falsch getipptes Druckverzeichnis wird still angelegt | behoben | 2. Durchlauf (ungebucht) | Code und Test: Ruf `verzeichnisPruefen`, Probedruck meldet `verzeichnisFehlt` und legt erst mit `anlegen: true` an, Automatikdruck schreibt bei fehlendem Verzeichnis nach ausgaben/nachrichten mit einmaligem Hinweis, Druckeinstellungen fragen „anlegen?“ (vermittlung-druck.test.ts, szenarien-nachrichtendruck.test.ts). |
| Sichter P2-1 | Verteilermatrix entspricht nicht dem Vordruck, wird lang | behoben | d36d287 | Code und Test (Verteilerraster). Auch SGL P2-11. |
| Sichter P2-2 | Druck bildet Farben nicht ab, kein Hinweis auf zu wenig Blätter | offen | – | Kein Treffer. |
| Sichter P2-3 | Gesprächsnotiz: Voreinstellung „Selbst verteilen“ umgeht den Sichter | offen | – | Kein Treffer. Runde 2: nebenbei bestätigt, besteht fort. |
| Sichter P2-4 | Sperrhinweis nennt nicht, wer sichtet | behoben | d36d287 | Code und Test. = FM P2-5. |
| Sichter P2-5 | Vermerke des Sichters für Empfänger kaum sichtbar | behoben | 57699bb, d36d287 | Code und Test (Vermerk in der Zeile, fmzVermerkText, Tagebuch). |

### P3 – gering

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P3-16 | Datum-Zeit-Gruppe in Berliner Zeit, Uhr im Kopf in Browserzeit | behoben | 2. Durchlauf (ungebucht), 3. Durchlauf (ungebucht) | Code und Test: eine Anzeigezone Europe/Berlin (`@s1/domaene` anzeigezone.ts) für zeitpunktText, Kopfband, Tagebuch, Druck, Funkzeit und getippte Zeiten; Statuszeile nennt eine abweichende Rechnerzone (anzeigezone-tz.test.ts). Dritter Durchlauf: Einsatzliste, Einsatzanlage, Monitorwarnung, Eingangsrevisionen, Bezugsjahr der Datum-Zeit-Gruppe in `zeitAusEingabe` (anzeigezone-renderer.test.ts unter UTC, New York, Berlin). Auch ETB P2-1, LdF P2-4, FM P2-1. |
| SGL P3-17 | „Antworten“ und „Weiterleiten“ ohne Ruf-Nr. und Bezug | behoben | 3. Durchlauf (ungebucht) | Code und Test: Betreff „Antwort auf E 26: …“, Ruf-Nr. und Mittel (Übermittlungswunsch) aus dem Eingang vorbelegt (`antwortVorlage`). Bei „Weiterleiten“ bleibt es bei den bisherigen Vorbelegungen. |
| SGL P3-18 | Ausgang zeigt Laufzettel „noch nicht gesichtet“ | behoben | 3. Durchlauf (ungebucht) | Code und Test: Ausgang ohne Verteiler zeigt „entfällt (Ausgang), Kopien mit der Beförderung“ statt „noch nicht gesichtet“ (`verteilerleer`). |
| SGL P3-19 | Hinweistext der Gesprächsnotiz sagt „beim Aufnehmen“ | behoben | 3. Durchlauf (ungebucht) | Code und Test: Hinweis der Gesprächsnotiz „Kein Sichter besetzt: Gesprächsnotiz beim Aufgeben verteilt.“ (`HINWEIS_ERSATZSICHTER_NOTIZ`, szenarien-fmz.test.ts). |
| SGL P3-20 | Zwei gleiche Nachrichten werden nicht erkannt | behoben | 3. Durchlauf (ungebucht) | Code und Test: Rückfrage vor „Aufgeben“ bei gleicher Anschrift, gleichem Betreff und Inhalt innerhalb von fünf Minuten, zweiter Klick „Trotzdem aufgeben“ (`doppelterAusgang.ts`). |
| ETB P3-1 | Beschriftung „Zeit der Meldung“ | behoben | 3. Durchlauf (ungebucht) | Code und Test: Spaltenkopf „Fachzeit“ mit Tooltip (Tagebuch.tsx); das Eingabefeld der freien Meldung heißt weiter „Zeit der Meldung“, dort ist es eine Meldung. |
| ETB P3-2 | „Nr. (E)“ bei gemeinsamer Zählung | behoben | 3. Durchlauf (ungebucht) | Code und Test: „Nr.“ ohne Zusatz, die Richtung steht als eigener Wert „Richtung“ (Vordruckteile.tsx). Auch LdF P3-1. |
| ETB P3-3 | Präsenz bleibt nach Schließen des Browsers sichtbar | behoben | 2. Durchlauf (ungebucht) | Abgemeldete Präsenz zählt sofort als veraltet (Sichter P1-4). |
| ETB P3-4 | „Zurückgezogen“ nur durch Durchstreichen | behoben | 3. Durchlauf (ungebucht) | Code und Test: das Wort „zurückgezogen“ in der Marke des Posteingangs und neben dem Betreff der Nachweisung. |
| ETB P3-5 | „Nachweisen“ bei zurückgezogenen Zeilen | behoben | 3. Durchlauf (ungebucht) | Code und Test: bei zurückgezogener Zeile ohne Nummer kein „Nachweisen“ mehr; mit Nummer bleibt „Berichtigen“. |
| LdF P3-1 | „Nr. (E)“ bei gemeinsamer Zählung | behoben | 3. Durchlauf (ungebucht) | Siehe ETB P3-2. |
| LdF P3-2 | Schreibweise der Zeit wechselt | behoben | 3. Durchlauf (ungebucht) | Code und Test: Datum-Zeit-Gruppe auf dem Blatt groß geschrieben wie im Kopfband (`dtg()`); Eingabefelder und Papiervordruck behalten die Schreibweise der Domäne. Runde 2: anders gelöst; Blatt groß, HTML-Ausdruck und Vordruck weiter klein (R2-LdF P2-5). |
| LdF P3-3 | Stelle wird nach jedem Neuladen erneut abgefragt | behoben | 3. Durchlauf (ungebucht) | Code und Test: Merker je Browser-Tab (`stellenmerker.ts`) geht der gemeinsamen Vorbelegung des Dienstes vor; bei vollständiger Vorbelegung steht der Fokus auf „Übernehmen“ mit dem Satz „Zuletzt gewählt …“, ein Klick oder Enter bestätigt (in der Web-Schale nach Schließen und Neuöffnen geprüft). |
| LdF P3-4 | Hinweisliste wächst, Einführungsband bleibt | behoben | 3. Durchlauf (ungebucht) | Code und Test: Hinweiskasten mit Uhrzeit je Hinweis, „Löschen“ und Verfall reiner Auskünfte nach 20 s (`Hinweiskasten.tsx`); das Band „Verstanden“ je Blatt bleibt auch bei gesperrtem Browserspeicher in der Sitzung weg (`geraetemerker.ts`). Auch FM P3-7. |
| FM P3-1 | Rückmeldungen nennen die Nachricht nicht | behoben | 3. Durchlauf (ungebucht) | Code und Test: Statuszeile und Rückgängig nennen Nummer und Betreff („Nachricht A 7 ‚Sperrung B212‘ angenommen“; `nachrichtengegenstand.ts`, `ereignisMitObjekt`). Dass „Rückgängig“ nach „Eingang aufnehmen“ die Sichtung nennt, ist Sache des Rücknahmeverlaufs und nicht geändert. |
| FM P3-2 | Feld „Uhrzeit“ zeigt sechsstellige Gruppe | behoben | 3. Durchlauf (ungebucht) | Code und Test: Annahme (Feld 3) wird mit der vierstelligen Uhrzeit vorbelegt (Fernmeldezentrale.test.tsx). |
| FM P3-3 | Stellenabfrage: FmZ zehntes Kästchen, Profil ändert sich nicht | teilweise behoben | 3. Durchlauf (ungebucht) | Code und Test: Stationen FmZ, Sichter, LdF stehen in der Abfrage vorn (kein neunmal Tab), Fokus siehe LdF P3-3. Das Profil und der Einstiegsreiter ändern sich mit der Stelle weiterhin nicht. |
| FM P3-4 | Schaltflächen brechen um, „Befördern“ auch ohne Annahme Hauptknopf | behoben | d36d287, 3. Durchlauf (ungebucht) | Gemessen in der Web-Schale bei 1320 x 860: Zeile der Warteschlange 38 px hoch, Hauptknopf und „⋯“ auf einer Zeile (Oberkante 548 px), Tabelle 932 von 960 px; der Zeilenumbruch bleibt in den Textzellen (Anschrift, Betreff, Annahme), nicht bei den Knöpfen. |
| FM P3-5 | Beschriftung „Gegenstelle“ statt „Rufname der Gegenstelle“ | behoben | 3. Durchlauf (ungebucht) | Code und Test: Beschriftung „Rufname der Gegenstelle / Spruchkopf“ in Aufnahme, Papier-Nachtrag und Befördern, Tooltip nennt Anruf, Rufname und Vorrang (`gegenstellentext.ts`). |
| FM P3-6 | Verbindungsband ohne Hinweis auf Papier-Rückfall | teilweise behoben | 3. Durchlauf (ungebucht) | Code und Test: das Verbindungsband sagt „Notfalls auf Papier weiterführen (Nachrichten: leerer Papier-Vordruck), später nacherfassen.“; die Vorbelegung der Nummer als „unbestätigt“ zu kennzeichnen entfällt, solange die Masken bei fehlender Verbindung gesperrt sind. |
| FM P3-7 | Hinweiskasten bleibt stehen | behoben | 3. Durchlauf (ungebucht) | Siehe LdF P3-4. |
| Sichter P3-1 | Quittungszeit beim Öffnen eingefroren | behoben | 3. Durchlauf (ungebucht) | Code und Test: die Quittungszeit läuft mit, solange niemand sie getippt hat, und gilt beim Drücken von „Sichten“ (`quittungszeitpunkt`, Sichteraudit.test.tsx). |
| Sichter P3-2 | Escape hebt Auswahl und Laufzettel zugleich auf | offen (Runde 2: nicht behoben) | d36d287 | Code und Test. Runde 2: nicht behoben (nur zur Hälfte): Im Laufzettel hält Esc die Auswahl, im Lesen-Dialog schließt Esc zugleich den Dialog und hebt Auswahl samt Laufzettel auf, ohne Rückfrage (R2-Sichter P2-3). |
| Sichter P3-3 | S5 fehlt im Verteiler | bewusst nicht (Lehrunterlage, Vordruck) | Entscheidung 12 (ungebucht) | Konzept §11 Entscheidung 12: S5 bleibt ohne Kästchen, nur Freitext; geprüft mit Tests für Verteilerraster (Verteilerraster.s5.test.tsx) und Vordruck-`verteilerText` (nachricht.test.ts). |
| Sichter P3-4 | Zählung „n weitere Arbeitsplätze“ läuft auf | behoben | 2. Durchlauf (ungebucht) | Abgemeldete Arbeitsplätze zählen sofort nicht mehr mit (Sichter P1-4); harter Absturz bleibt an der Präsenzfrist. |

Zahl der Befunde je Status nach Runde 2 (Nachprüfung der Reviewer eingerechnet): behoben 73, teilweise behoben 11, offen 11, bewusst nicht 4, nicht prüfbar 0; zusammen 99. Nach dem dritten Durchlauf und vor der Nachprüfung waren es behoben 78, teilweise behoben 12, offen 5, bewusst nicht 4 (die frühere Zeile nannte 77, 11, 9 und 2 und stimmte mit der Tabelle nicht überein). Nach dem zweiten Durchlauf waren es behoben 58, teilweise behoben 11, offen 28, bewusst nicht 2. Zahl der Befunde je Status nach dem zweiten Durchlauf (Domäne, Ausgaben, Kontrakt, Worker, Main, Web-Schale und Renderer, noch nicht gebucht; in der Spalte „Commit“ als „2. Durchlauf (ungebucht)“): behoben 58, teilweise behoben 11, offen 28, bewusst nicht 2, nicht prüfbar 0; zusammen 99. Vor dem zweiten Durchlauf waren es behoben 44, teilweise behoben 10, offen 43. Als „nicht prüfbar“ habe ich keinen Befund eingestuft, weil jeder entweder im Code eine Spur hinterlassen hat oder keine hat. Die Tests habe ich nicht ausgeführt; der Bericht nennt für den Stand 331 Testdateien und 3354 Tests, grün, bei typecheck und lint ohne Befund. Das habe ich nur übernommen.

## Was offen bleibt

Stand nach der zweiten Runde: Alle 73 neuen Befunde und die sechs zurückgesetzten Befunde der ersten Runde sind offen; dazu kommen die teilweise behobenen und die vier bewusst nicht gebauten aus Runde 1. Die folgende Reihenfolge ist ein Vorschlag für die vierte Behebungsrunde. Sie ordnet nach der Schwere der Folge im Einsatz und danach nach der Häufung, also danach, wie viele Rollen unabhängig dasselbe gefunden haben, nicht nach Aufwand.

Zuerst kommt, was still etwas Falsches tut, ohne dass der Bediener es merkt: die drei P0 des Fachberaters. Das Sichten ist für jede Stelle ohne Rückfrage möglich und nimmt die Nachricht aus der Warteschlange des Sichters (R2-FaBe P0-1); derselbe Vorbehaltshinweis gehört auch an den Papier-Nachtrag (R2-SGL P1-2) und an das Aufnehmen eines Eingangs (R2-FM P3-2), und wo keine Stelle die grüne Kopie hat, sollte „Sichten“ erst nach einem zweiten Klick gehen. Zweitens das Feld „Quittung der Gegenstelle“: Es darf nicht mit der Beförderungszeit gefüllt in den Vordruck laufen, solange niemand quittiert hat; es muss mitlaufen, bis jemand tippt, und der Ausgang braucht einen Stand „befördert, noch nicht quittiert“ (R2-FaBe P0-2, R2-FM P2-6, R2-SGL P3-4). Drittens muss der Verfasser nach dem Aufgeben erfahren, ob die Fernmeldezentrale besetzt ist (R2-FaBe P0-3).

Danach die P1 aller Rollen, zuerst die, die ebenfalls still etwas verlieren oder falsch zuordnen. Dazu zählen der Vermerk des ersten Sichters, der bei zwei Sichtungen verschwindet (R2-Sichter P1-2); das blinde „Sichten“ nach „Ich sichte jetzt selbst“, das einen Blitz nur an S2 schickt (R2-FM P1-2); das Tagebuch, das beim Aufnehmen die Funktion des Absenders und bei Kopien nach der Beförderung „Sichter“ als Akteur führt (R2-ETB P1-1, mit R2-LdF P3-2, R2-FaBe P3-5; damit auch der zurückgesetzte Befund ETB P1-7); der Eingang, der ohne Sichter an der Station LdF vorbeiläuft (R2-LdF P1-3); die ETB-Nr., die am Bildschirm nicht zu finden ist (R2-ETB P1-2). Dann die Lücken in der Aufsicht und in der Übergabe: ein Blitz, der beim LdF liegt, ohne Hinweis und ohne Uhr (R2-Sichter P1-1, R2-LdF P1-2), die Karten, die bei 1320 Pixeln über den Rand ragen (R2-LdF P1-1, R2-Sichter P2-4; das ist eine CSS-Frage und schnell erledigt), die Sicht „offen“ für die Übergabe (R2-SGL P1-1, R2-FaBe P1-6, zurückgesetzt SGL P1-7), die Tabfolge der Aufnahme, die Handzeichen, Nr. und Abfassungszeit auslässt und den Papier-Nachtrag ohne Maus unbedienbar macht (R2-FM P1-1, damit auch FM P2-3). Schließlich die P1 des Fachberaters, die ein Stabsneuling sofort trifft: das Vokabular, das nirgends erklärt wird (R2-FaBe P1-2, P1-1 und die P2-Befunde zu Hilfe und Tooltips, die gruppiert sind), die Antwort, die als Funkspruch durch die FmZ läuft (R2-FaBe P1-3, R2-SGL P3-3), die eigenen Ausgänge, die im eigenen Posteingang als „neu“ zählen (R2-FaBe P1-4, R2-SGL P2-4) und die Gesprächsnotiz ohne Erklärung (R2-FaBe P1-5).

Bei den P2 gilt die Häufung. Zuerst, was mehrere Rollen trifft: die Rücknahme, die nach Befördern, Aufnehmen und Aufgeben den falschen Schritt nennt (R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8), der Papier-Nachtrag mit Fokus auf dem Schalter und ohne Prüfung von Zeitfolge und Nummer (R2-SGL P2-3, P2-1, R2-FM P2-2, R2-LdF P3-7), der Stau vor dem Sichter bei besetztem, säumigem Sichter und die Sortierung nach Vorrang (R2-FM P2-4, P2-5, R2-Sichter P2-2, P3-7), der Hinweiskasten, der die Seite verschiebt (R2-SGL P2-4, R2-Sichter P3-1), die Nummernlücken, die nur der Ausdruck nennt, samt Rückfrage beim Sprung (R2-LdF P2-7), und der Wortlaut des Stellenvorbehalts (R2-FaBe P2-7, R2-LdF P3-1). Danach die Station LdF als Ganzes (Befördern vor dem Vorschlag ohne Spur und die Abweichung vom Vorschlag, die Weitergabe ohne Prüfung, die Sicht ohne Absender und Wartezeit, der Ausdruck ohne Gegenstelle, der Zeitraum der Nachweisung; R2-LdF P2-1 bis P2-6), dann der Nachweis nach dem Einsatz (Akte mit alten Ständen, offene Nachrichten nur im Dialog, Weitergabe des LdF in der Nachweisung, Konflikt der Doppelsichtung, Tagebuchzeile ohne Vorrang, Anbindung an die Lagekarte, Handzeichenverzeichnis, ETB-Nr. festschreiben; R2-ETB P2-1 bis P2-8), die Sichter-Einzelbefunde (Marke Ersatzsichtung, Lesen-Fenster mit Fokusführung und Escape, Reiterzähler; R2-Sichter P2-1, P2-3, P2-5; damit der zurückgesetzte Befund Sichter P3-2), die Einzelbefunde des Fernmelders (Kürzel für „Eingang aufnehmen“, Enter speichert halben Funkspruch, die einmalige Überschreibung bei zwei Befördern; R2-FM P2-1, P2-3, P2-7) und des Sachgebietsleiters (Konflikthinweis bei doppelter Nummer, „folgt (FmZ)“, vorbelegtes Handzeichen; R2-SGL P2-2, P2-5, P2-6) sowie die übrigen Lese- und Bedienhilfen des Fachberaters (R2-FaBe P2-1 bis P2-6, P2-9). Der Sperrhinweis mit Person in der Befördern-Maske (FM P2-5) gehört zu diesem Block, weil er den Streit zweier Fernmelder um dieselbe Nachricht betrifft, den R2-FM P2-7 beschreibt.

Zuletzt die P3: Beschriftungen, Hinweistexte, kleine Layoutfehler und Handbuchsätze. Mehrfach genannt sind der Konflikthinweis-Zähler im frischen Einsatz (R2-FM P3-6, R2-Sichter P3-6), das fehlende Handbuch zum Papier-Nachtrag (R2-SGL P3-6, R2-FM P3-4), die Fußleiste, die das Verteilerraster verdeckt (R2-SGL P3-5, R2-Sichter P3-3), und die Sichtungszeile der Nachweisung in schmaler Spalte (R2-LdF P3-6, R2-Sichter P3-4); sie lassen sich gemeinsam erledigen. Der Rest steht in den Einzelaudits. Davon unabhängig bleiben die Teilbefunde der ersten Runde offen (LdF P2-3 Marke „Verfasser = Nachweiser“, Sichter P1-3 Empfängerzahl und Vorschlag, FM P2-7 „Aufnahme ändern“, ETB P1-3, P2-1, P2-4, P2-5, P2-7) sowie SGL P2-9, P2-12, P2-13 und Sichter P2-2, P2-3; bewusst nicht gebaut bleiben S5 im Verteiler, ein stabsinterner Weg ohne FmZ, Anlagen an Nachrichten und das PDF der Listen in der Web-Schale. Nicht nachgewiesen sind weiterhin der stille Druck an einen echten Drucker, der Mischbetrieb mehrerer Rechner auf dem Share und der Ton bei Blitz in einem Browser mit Audioausgabe.
