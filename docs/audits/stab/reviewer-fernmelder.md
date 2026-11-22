# Stabsreview Fernmelder (Fm1/Fm2)

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1320 × 860, je Arbeitsplatz ein eigener Browser-Kontext). Übungseinsatz „Review FmZ Hochwasser Hunte“ (Lage siehe `reviewer-ldf.md`): Fm1 (Hz. Yi) und Fm2 (Hz. Pe) mit Profil „Vermeldezentrale“, dazu S3, Sichter, LdF. Funkplan mit fünf Rufgruppen; Fm1 hört THW_OL_FÜ und THW_OL_EA1, Fm2 THW_OL_EA2 und DMO 307 (Freitext „hört“). Durchgespielt: 16 Eingänge über Funk, Telefon, Telefax und Kurier/Melder, Annahme und Beförderung von sechs Ausgängen, Kontakt im Funkplan bei Aufnahme und Beförderung, zwei gleichzeitige Aufnahmen, Fm2 verlässt den Platz. Skripte und Screenshots: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/fmz/`.

Grundlage: die Audits der Nachrichten-Funktion (`docs/audits/nachrichten/`). Befunde von dort werden nicht wiederholt. Kommunikationsverzeichnis und Störungsliste behandelt `reviewer-s6.md` (S6-A1, S6-A2); hier nur die Sicht des Fernmelders darauf.

**Annahmen (keine Vorschrift):** Ein Fernmelder sitzt an einem Platz mit einem oder zwei Funkgeräten und einem Telefon, hört die ihm zugewiesenen Rufgruppen ab, nimmt Sprüche auf und befördert, führt neben den Vordrucken auch kurzen Funkverkehr (Status, Funkprobe, Rückfrage) und übergibt seinen Platz zum Schichtwechsel.

## Urteil

Aufnehmen und Befördern sind schnell, die Warteschlange mit „für Sie“ und „nur meine“ hilft, und dass ein Funkspruch einer Einheit gleich als Kontakt im Funkplan landet, ist genau richtig. Was fehlt, ist der **Platz** als Arbeitseinheit: Nirgends sehe ich „meine“ Rufgruppen, meine Einheiten und deren letzten Kontakt auf einen Blick; der Funkplan steht in einem anderen Blatt und kennt „Fm1“ nur als Freitext. Kurzer Funkverkehr ohne Vordruck hat keinen Platz, und Nachrichtenkontakte heißen im Funkplan „Funkprobe“. Neu und gefährlich: Zwei Plätze, die gleichzeitig aufnehmen, bekommen dieselbe Nummer bestätigt.

## Stichprobe der als offen geführten Befunde

| Befund | Stand im Browser |
| --- | --- |
| FM P3-3 (Profil und Einstiegsreiter ändern sich mit der Stelle nicht) | weiter sichtbar: Profil „Vermeldezentrale“ mit Stelle Fm1 öffnet den Einsatz auf dem Reiter „S1“, obwohl „Nachrichten“ der erste Reiter des Bands ist (`07-start-fm1.png`). Erst beim Wechsel ins Blatt Nachrichten landet Fm1 in der Sicht „Fernmeldezentrale“. |
| R2-FM P2-4 („Vor dem Sichter“ nicht nach Vorrang) | Stichprobe Sichter-Sicht: Sofort steht oben (`45-si-sichter.png`). |

## Fehlende Ansichten

### Fm-A1 (P1) – „Mein Platz“: meine Rufgruppen, meine Einheiten, meine Zuteilungen

- **Was der Fernmelder sehen/tun muss:** Auf einer Fläche: die Rufgruppen, die mein Platz abhört, mit ihren Teilnehmern (Funkrufname, Status, letzter Kontakt, „kein Kontakt“), meine zugeteilten Ausgänge, meine heute aufgenommenen Eingänge und wo sie stehen (beim LdF, beim Sichter). Daraus: Funkprobe fällig, Rückfrage, Weitergabe an den Kollegen.
- **Was die App schon hat:** Rufgruppen mit „hört“ (Freitext), Zuordnung mit Funkrufname und letztem Kontakt, Funkprobe per Strg+P, Warteschlange mit „für Sie“ und „nur meine (Fm1)“, Sicht „Offen“.
- **Wo es heute verstreut ist:** Blatt Funkplan (alle Gruppen, „hört“ nur als Text; `48-fm1-funkplan.png`), Blatt Nachrichten → Fernmeldezentrale (`43-fm1-fmz.png`), Nachweisung für den Verbleib eigener Eingänge (`41-ldf-nachweisung.png`). „hört Fm1“ ist nicht mit der Stelle Fm1 verbunden, ein Filter „meine Gruppen“ ist damit nicht möglich.

### Fm-A2 (P1) – Funkverkehrsnachweis (Funktagebuch) je Rufgruppe

- **Was der Fernmelder sehen/tun muss:** Kurze Funkgespräche ohne Vordruck festhalten (Statusdurchsage, Rückfrage, Lagekurzmeldung, Funkprobe), in einer Zeitfolge je Rufgruppe zusammen mit den Sprüchen, die über diese Gruppe liefen; als Funkprotokoll ausgeben.
- **Was die App schon hat:** Sicht „Funkproben“ als Zeitfolge mit Einheit, Rufgruppe, Ergebnis, Grund, „eingetragen von“ (`49-funkproben.png`), Kontakt im Funkplan bei Aufnahme und Beförderung, „Tagebuch · Funk“ je Einheit in der Maske „Funk und Erreichbarkeit“ (`17-funkmaske.png`), Nachweisung mit Mittel und Gegenstelle.
- **Wo es heute verstreut ist:** Funkproben-Sicht (nur Kontakt/kein Kontakt, kein Text), Nachweisung (nur Vordrucke), Tagebuch-Auszug je Einheit. Unter Exporte gibt es das Funkprotokoll nur als **leeren** Papiervordruck (`61-exporte.png`, „Betrieb ohne Rechner“), nicht aus den Daten.

### Fm-A3 (P2) – Rufnamen-Nachschlag in der Aufnahme

- **Was der Fernmelder sehen/tun muss:** Beim Tippen des Rufnamens der Gegenstelle sofort sehen, welche Einheit oder Stelle das ist, in welcher Rufgruppe sie steht und wie sie sonst erreichbar ist; bei Telefon/Telefax ebenso für externe Gegenstellen (Leitstelle, Polizei, TEL, Stadtwerke).
- **Was die App schon hat:** Funkrufnamen und Erreichbarkeit je Einheit, die Erkennung der Einheit am Rufnamen für den Funkplan-Kontakt, Vorschlagsliste der Anschriften.
- **Wo es heute verstreut ist:** Blatt Funkplan; die Aufnahmemaske nennt die Einheit erst im Kontakt-Kästchen. Externe Gegenstellen haben keine Daten (siehe `reviewer-s6.md`, S6-A2).

### Fm-A4 (P2) – Platzübergabe

- **Was der Fernmelder sehen/tun muss:** Beim Wechsel: meine offenen Zuteilungen, angenommene, aber nicht beförderte Sprüche, Eingänge ohne Nummer, Einheiten meiner Gruppen ohne Kontakt, laufende Gespräche/Rückfragen; mit Notiz und Handzeichen des Nachfolgers.
- **Was die App schon hat:** Sicht „Offen“ (für Fm1: zwei zugeteilte Ausgänge, `44-fm1-offen.png`), Karte „Ohne Nummer“, Funkplan-Band „kein Kontakt“, Stellenabfrage mit „Stelle abgeben“.
- **Wo es heute verstreut ist:** „Offen“ zeigt meine Ausgänge, aber nicht meine Eingänge und nichts aus dem Funkplan.

## Befunde an vorhandenen Ansichten

### Fm-1 (P1) – Gleichzeitige Aufnahme an zwei Plätzen: beide bekommen dieselbe Nummer bestätigt

- **Beobachtung:** Fm1 und Fm2 öffnen „Eingang aufnehmen“ fast gleichzeitig, beide Masken zeigen Nr. 16, beide schreiben, beide lesen „In der Nachweisung unter Nummer 16 eingetragen.“ (`nummer.js`, `60-nummer-fm1.png`, `60-nummer-fm2.png`). Im laufenden Szenario geschah dasselbe zweimal unbemerkt (E 10, E 11). Die eigene Warteschlange und die Statusmeldung nennen keine Doppelung; nur die Nachweisung und „⚠ Konflikthinweise“ in der Statuszeile.
- **Auswirkung:** Ich gebe der Gegenstelle eine Nummer als Quittung, die es zweimal gibt; spätere Rückfragen sind nicht eindeutig.
- **Empfehlung:** Siehe `reviewer-ldf.md`, LdF-1 (Nummernkreise je Platz oder Vergabe beim Schreiben, Warnung an beide Plätze nach dem Abgleich).
- **Verifikation:** Zwei Plätze, gleichzeitige Aufnahme: keine stille Doppelung.

### Fm-2 (P2) – Nachrichtenkontakte werden als „Funkprobe“ gebucht

- **Beobachtung:** Jeder Funkspruch mit einer Einheit erzeugt eine Zeile „Funkprobe … Kontakt“: in der Sicht „Funkproben“ (12 Zeilen, keine einzige echte Funkprobe; `49-funkproben.png`), im Tagebuch („Gr Fü: Funkprobe THW_OL_FÜ: Kontakt“, `62-tagebuch.png`), im Band „Letzte Funkprobe 1741“ und in der Spalte „letzter Kontakt“ („1741 Funkprobe“).
- **Auswirkung:** Wer wissen will, wann zuletzt eine Funkprobe gemacht wurde (z. B. nach Gerätetausch, Gateway-Wechsel), findet sie nicht; das Tagebuch behauptet Funkproben, die nie stattfanden.
- **Empfehlung:** Kontaktart unterscheiden („Spruch E 4“, „Spruch A 12“, „Funkprobe“), im Tagebuch mit Verweis auf die Nachricht; Band „letzte Funkprobe“ nur aus echten Proben.
- **Verifikation:** Eingang per Funk aufnehmen: Funkplan zeigt „1741 Spruch E 4“, die Sicht Funkproben bleibt leer.

### Fm-3 (P2) – Befördern belegt die Gegenstelle mit der Anschrift, nicht mit dem Funkrufnamen

- **Beobachtung:** „Befördern“ an GTrW belegt die Rufgruppe richtig (THW_OL_EA1), aber „Rufname der Gegenstelle“ mit „GTrW“, obwohl der Funkplan „Heros Oldenburg 46/10“ führt (`63-befoerdern-gtrw.png`). Bei GE SFM ohne Rufgruppe steht „— ohne Angabe —“, obwohl ich gerade über eine Gruppe gesprochen habe; der Kontakt wird ohne Rufgruppe gebucht, die Einheit bleibt „ohne Rufgruppe“ (`48-fm1-funkplan.png`, `49-funkproben.png`).
- **Auswirkung:** Die Nachweisung führt für Ausgänge Bezeichnungen, für Eingänge Rufnamen; nach dem Einsatz ist nicht nachvollziehbar, über welche Gruppe eine Einheit erreicht wurde.
- **Empfehlung:** Gegenstelle mit dem Funkrufnamen vorbelegen; bei Funk ohne Rufgruppe die Gruppen meines Platzes zuerst anbieten oder nachfragen.
- **Verifikation:** Befördern an eine Einheit mit Funkrufnamen: Feld zeigt den Funkrufnamen.

### Fm-4 (P2) – Rufgruppe eines anderen Platzes ohne Hinweis

- **Beobachtung:** Fm1 beförderte „Pumpwerk räumen“ an Gr EV über THW_OL_EA2, die laut Funkplan Fm2 abhört; die Maske sagt dazu nichts (`49-funkproben.png`, Zeile 1741 Gr EV, „eingetragen von Fm1 Yilmaz“).
- **Auswirkung:** Zwei Plätze sprechen auf derselben Gruppe, ohne es zu wissen; der abhörende Platz hört einen Spruch, den er nicht zugeordnet bekam.
- **Empfehlung:** In Befördern und Aufnahme „wird von Fm2 abgehört“ anzeigen, sobald „hört“ an Stellen gebunden ist (Fm-A1).
- **Verifikation:** Befördern über eine Gruppe eines anderen Platzes zeigt den Hinweis.

### Fm-5 (P3) – Anlage und Statuswechsel am Schreibtisch zählen als „letzter Kontakt“

- **Beobachtung:** Gerade angelegte Einheiten im Status „Angefordert“ tragen „1710 Meldung“ als letzten Kontakt, ohne dass je gefunkt wurde (`12-funkplan-leer.png`). Laut Handbuch zählt jede Statusmeldung, auch eine, die die S1 am Tisch einträgt.
- **Auswirkung:** „Kein Kontakt“ erscheint später als nötig; der Fernmelder kann nicht unterscheiden, ob die Einheit sich gemeldet hat oder nur jemand den Status gepflegt hat.
- **Empfehlung:** Nur Statusmeldungen mit Quelle Funk/Meldung der Einheit als Kontakt werten, die Anlage nie; Kontaktart in der Zelle nennen.
- **Verifikation:** Einheit anlegen: letzter Kontakt „—“.

## Schluss

- **Aufgabe geschafft:** Aufnehmen und Befördern ja, schnell. Meinen Platz führen (meine Gruppen abhören, Kontakte im Blick, kurzen Funkverkehr festhalten, übergeben) nur über Funkplan-Blatt, Warteschlange und Gedächtnis.
- **Größtes Risiko:** Doppelt vergebene Nummern bei gleichzeitiger Aufnahme, die mir als „eingetragen“ bestätigt werden (Fm-1).
- **Top-Priorität:** Ansicht „Mein Platz“ (Fm-A1) mit an Stellen gebundenen Rufgruppen; darauf bauen Funkverkehrsnachweis (Fm-A2) und Platzübergabe (Fm-A4) auf.
