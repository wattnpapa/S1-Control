# Stabsreview S6 – Information und Kommunikation (IuK)

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1440 × 900). Übungseinsatz „Review S456 Hochwasser Weser“ (Lage siehe `reviewer-s4.md`). Funkplan mit 5 Rufgruppen (4 TMO, 1 DMO mit Gateway), 11 Einheiten zugeordnet, Funkrufnamen und Erreichbarkeit für 5 Einheiten überschrieben, Funkhinweis gesetzt, zwei Funkproben „kein Kontakt“ mit Grund, Dienstposten „S6 IuK“ und „Fernmeldetrupp TMO“, Tagebucheinträge zu Netzüberlastung und Druckerausfall. Eigener Arbeitsplatz „S6 IuK“ (Profil „Alle Blätter“, Stelle S6), parallel Arbeitsplätze S1, S4 und S5. Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s456/` (`09-*` bis `14-*`, `30-*`, `34-monitor-6.png`, `35-*`, `37-*` bis `39-*`).

Annahmen (keine Vorschrift): Der S6 plant und überwacht Funk und Fernmeldeverbindungen (Funk, Telefon, Fax, Daten), führt ein Fernsprech-/Erreichbarkeitsverzeichnis, nimmt Störungen auf und verfolgt sie, gibt Geräte aus und ist für die IT der Führungsstelle (Arbeitsplätze, Netz, Share, Drucker) zuständig.

## Urteil aus Sicht des S6

Der **Funkplan** ist die beste Ansicht der App für den S6: Rufgruppen mit Betriebsart, Zweck, „hört“ und Gateway, Zuordnung je Rufgruppe oder Bereich, Funkrufname/Erreichbarkeit je Einheit, Funkproben als Zeitfolge, Ausdruck und Monitorbild mit „kein Kontakt“ an der Kachel. Alles außerhalb des Sprechfunks fehlt aber: Telefon-, Fax-, Daten- und Messenger-Verbindungen der Führungsstelle selbst, ein Erreichbarkeitsverzeichnis der Gegenstellen, eine Störungsliste und eine Übersicht über die IT der Arbeitsplätze. Die Diagnose ist für Entwickler und Admins gebaut, nicht für einen S6 im Betrieb.

## Fehlende Ansichten

### S6-A1 (P1) – Störungen und Ausfälle (Fernmelde- und IT-Störungsliste)

- **Was der S6 sehen/tun muss:** Je Störung: was (Funknetz, Rufgruppe, Gateway, Telefon, Fax, Datenverbindung, Drucker, Arbeitsplatz, Share, Strom), wo/wen betrifft es, seit wann, Auswirkung, Ersatzweg (z. B. „DMO 305 über Gateway Rathaus“, „Melder“), Maßnahme, zuständig, behoben um. Filter „offen“, Anzeige im Band anderer Blätter.
- **Was die App schon hat:** Funkprobe „kein Kontakt“ mit Pflichtgrund je Einheit, Funkproben-Zeitfolge, Funkhinweis, Rufgruppen-Bemerkung, Störfallerkennung der Diagnose (Share, Uhr, Konflikte, Paket), Statuszeile „Share erreichbar“/„noch nicht übertragen“, Nachrichten-Band („Kein Fernmelder besetzt“), Tagebucheinträge mit Quelle.
- **Wo es heute verstreut ist:** Funkplan → Unteransicht „Funkproben“ (`35-funkproben.png`), einzelne Marken in der Zuordnung, Diagnose im Fenstermenü, Tagebuch-Freitext („TMO-Netz am Sandsackplatz überlastet …“, „Druckerausfall FüSt …“). Eine Störung, die keine Einheit betrifft (Drucker, Telefonanlage, Netz), hat keinen Platz außer dem Tagebuch.

### S6-A2 (P1) – Kommunikationsverzeichnis / Fernmeldeplan über den Funk hinaus

- **Was der S6 sehen/tun muss:** Eigene Anschlüsse der FüSt (Telefon, Fax, E-Mail, Funkrufname, Satellit/Messenger) und die der Gegenstellen (TEL/übergeordnete FüSt, EAL, Verbindungsstellen, Behörden, Lieferanten) mit Erreichbarkeit je Schicht, Vorrangweg und Ausweichweg; druckbar als Fernsprechverzeichnis für FmZ und Stab.
- **Was die App schon hat:** Übermittlungsmittel der Nachrichten (Funk, Telefon, Telefax, DFÜ, Kurier/Melder), Feld „Ruf-Nr.“ und Gegenstelle je Nachricht, Vorschlagsliste der Anschriften, „Erreichbarkeit“ je Einheit (Freitext-Override „Führungskraft und Kontakte“), Stammdaten (FüSt, übergeordnete FüSt), Dienstposten.
- **Wo es heute verstreut ist:** Erreichbarkeit nur je Einheit in der Maske „Funk und Erreichbarkeit“; Rufnummern von Nicht-Einheiten nur in einzelnen Nachrichten (z. B. NDR in der Gesprächsnotiz, Caterer im Feld „bestellt bei“); die Stammdaten haben kein Feld für Rufnummern der FüSt.

### S6-A3 (P2) – IuK-Zustand der Führungsstelle (Arbeitsplätze, Stellen, Sync, Druck)

- **Was der S6 sehen/tun muss:** Je Arbeitsplatz: Anzeigename, Stelle(n) und Handzeichen, Profil, Fassung, zuletzt gesehen, Rückstand, Uhrabweichung, Automatikdruck an/aus und Ziel, Share erreichbar; dazu: ist jede Pflichtstelle (Sichter, FmZ, LdF) besetzt. Ohne Pfade und Protokollzeilen, mit Ampel.
- **Was die App schon hat:** Diagnose-Tabelle „Arbeitsplätze“ (Name, Rechner, Fassung, zuletzt gesehen, Segment, Rückstand, Uhr, Quarantäne), Statuszeile „2 weitere: S4, S1“ mit Stellen, Nachrichten-Band mit besetzten Stellen (LdF nicht besetzt, kein Fernmelder), Druckeinstellungen je Arbeitsplatz.
- **Wo es heute verstreut ist:** Diagnose im Fenstermenü „⋯“ (ohne Stellen), Statuszeile (mit Stellen, ohne Technik), Nachrichtenblatt (Besetzung), Einstellungen auf der Einsatzauswahl (Druck).

### S6-A4 (P2) – Geräteausgabe (Funkgeräte, Handys, Laptops, Zubehör)

- **Was der S6 sehen/tun muss:** Welches Gerät (HRT/MRT mit OPTA/ISSI, Mobiltelefon mit Nummer, Notebook, Akku/Ladegerät) ist an welche Einheit/Person ausgegeben, seit wann, Rücknahme, defekt/in Reparatur.
- **Was die App schon hat:** Fahrzeuge je Einheit mit Funkrufname, Funkrufname-Override, Einheiten mit Abschnitt und Status, Einsatzabschluss (Rückmarsch/beendet als Anlass für Rücknahme).
- **Wo es heute verstreut ist:** Nirgends; nur Tagebuch.

### S6-A5 (P3) – Verbindungsskizze

- **Was der S6 sehen/tun muss:** Grafische Übersicht: FüSt – Abschnitte – Rufgruppen – Gateways/Repeater – Telefon-/Datenverbindungen, mit Störungen markiert.
- **Was die App schon hat:** Rufgruppen mit Bereich und Gateway, Führungsorganisation als Harke (PDF/HTML), Monitorbild „Funkplan“.
- **Wo es heute verstreut ist:** Führungsorganisation (ohne Funk) und Funkplan (ohne Struktur) getrennt.

## Befunde an vorhandenen Ansichten

### S6-1 (P2) – Band „KEIN KONTAKT > 60 MIN“ zählt fehlgeschlagene Funkproben nicht

- **Beobachtung:** Nach zwei Funkproben „kein Kontakt“ ((B) EA 3 um 1717, (FGr WP (A)) um 1732, beide mit Grund) zeigt das Band des Funkplans weiter „0 KEIN KONTAKT > 60 MIN“. Die Unteransicht „Funkproben“ sagt „1 ohne Kontakt“ (vor der zweiten Probe), die Zuordnung zeigt eine kleine Marke „kein Kontakt 1717“ in der Spalte „Letzter Kontakt“; der Monitor (Taste 6) zeigt „kein Kontakt 1732“ an der Kachel, sein Fuß nennt aber nur „Ohne Rufgruppe: 4“ (`39-funkplan-keinkontakt.png`, `39-monitor-funk.png`).
- **Auswirkung:** Der Blick auf das Band – die Stelle, an der der S6 „wo klemmt es?“ abliest – sagt „alles gut“, obwohl zwei Einheiten nachweislich nicht erreichbar sind. Die Kennzahl misst nur Alter, nicht Erreichbarkeit.
- **Empfehlung:** Eigene Kennzahl „kein Kontakt (Funkprobe)“ im Band und im Monitorfuß, oder die bestehende auf „ohne Kontakt“ erweitern (Alter > Schwelle **oder** letzte Probe „kein Kontakt“).
- **Verifikation:** Funkprobe „kein Kontakt“ an einer zugeordneten Einheit; Band und Monitorfuß zählen sie sofort, nach „Funkprobe: Kontakt“ nicht mehr.

### S6-2 (P2) – Diagnose zeigt keine Stellen und nicht alle Arbeitsplätze des Einsatzes

- **Beobachtung:** Vom Arbeitsplatz „S6 IuK“ aus nennt die Diagnose „1 weiterer Arbeitsplatz am Einsatz; fortgegangene Arbeitsplätze stehen grau darunter“ und listet nur „S4 Versorgung“. Die beiden Arbeitsplätze, die vorher im selben Einsatz geschrieben hatten (S1-Arbeitsplatz mit 2,5 kB, S5-Arbeitsplatz mit Nachrichten), stehen weder aktiv noch grau da (`37-diagnose.png`). Eine Spalte „Stelle“ fehlt; die Statuszeile nennt dagegen „2 weitere: S4, S1“. Die Diagnose steht nur im Fenstermenü „⋯“.
- **Auswirkung:** Der S6 kann nicht feststellen, welche Rechner am Einsatz waren und welche Stelle an welchem Rechner sitzt – genau das braucht er, wenn ein Arbeitsplatz „nichts mehr bekommt“.
- **Empfehlung:** Spalte „Stelle · Handzeichen“ und „Profil“; fortgegangene Arbeitsplätze wie angekündigt grau aufführen (oder den Satz streichen). Siehe S6-A3.
- **Verifikation:** Drei Arbeitsplätze öffnen, zwei schließen; Diagnose des dritten zeigt alle drei mit Stelle, zwei davon grau.

### S6-3 (P2) – „Letzte Meldungen“ der Diagnose mischt fremde Einsätze

- **Beobachtung:** Die Liste „Letzte Meldungen“ der Diagnose im Einsatz „Review S456 …“ enthält Zeilen wie „Einsatz geöffnet: 2026-11-22_review-fachberater-hochwasser-deich-elbe_652a73“, „Ausgabe erzeugt: …/review-fachberater…/status_2026-11-22_1724.html“ und „Einsatz geöffnet: 2026-11-22_review-s2s3-hochwasser-hameln_9fa75a“, dazu viele „Arbeitsplatz … geöffnet/geschlossen“ und „Einstellungen geändert: Share …“ (`30-diagnose-full.png`).
- **Auswirkung:** Die für den Einsatz relevanten Meldungen gehen im Rauschen unter; Namen anderer Einsätze und Pfade werden jedem Arbeitsplatz angezeigt. Annahme: In der Web-Schale teilen sich alle Sitzungen eine Protokolldatei; im Desktop-Betrieb ist das je Rechner.
- **Empfehlung:** In der Diagnose nur Meldungen des geöffneten Einsatzes und dieses Arbeitsplatzes zeigen; wiederholte „Einstellungen geändert“ zusammenfassen.
- **Verifikation:** Zwei Einsätze parallel öffnen; die Diagnose des einen nennt den anderen nicht.

### S6-4 (P2) – Erreichbarkeit ist nur Freitext je Einheit

- **Beobachtung:** In „Funk und Erreichbarkeit“ steht „Erreichbarkeit Führungskraft und Kontakte · — · Überschreiben …“; eingetragen werden kann ein Freitext („GrFü Meyer 0171 1234567“). Keine Felder für Art (Handy, Festnetz, TMO-Einzelruf/ISSI, E-Mail), keine zweite Nummer, kein Gültig-ab (Schichtwechsel).
- **Auswirkung:** Ein Verzeichnis lässt sich daraus nicht ableiten oder sortieren; nach der Ablösung bleibt die alte Nummer stehen.
- **Empfehlung:** Strukturierte Kontakte (Art, Nummer, Person, gültig ab/bis) als Grundlage für S6-A2.
- **Verifikation:** Zwei Kontakte unterschiedlicher Art an einer Einheit; Funkplan-Ausdruck listet beide.

### S6-5 (P3) – Tagebuch und Hinweis nennen Dienstposten mit interner Kennung

- **Beobachtung:** Nach „Dienstposten anlegen“ (S4 Versorgung, S5 Presse, S6 IuK, Fernmeldetrupp TMO) lautet die Meldung „✓ Dienstposten angelegt (‚dp-mws1ui18-4z7dao‘)“ und das Tagebuch „dp-mws1ui18-4z7dao: Dienstposten angelegt“ statt der Funktion. Über der Liste steht danach weiter „Kein Dienstposten besetzt.“
- **Auswirkung:** Im Tagebuch ist nicht nachvollziehbar, welcher Posten (z. B. S6) wann eingerichtet wurde.
- **Empfehlung:** Funktion und Teilbereich als Bezeichnung verwenden; „Kein Dienstposten besetzt“ in „kein Posten mit Besetzung“ präzisieren oder ausblenden.
- **Verifikation:** Dienstposten „S6 IuK“ anlegen; Tagebuch zeigt „S6 IuK (Stab): Dienstposten angelegt“.

### S6-6 (P3) – Monitor Funkplan: Fußzeile läuft in die Seitenpunkte

- **Beobachtung:** Bei 1440 × 900 überdecken die Seitenpunkte rechts unten die Datum-Zeit-Gruppe des Fußes („221732NOV26“) (`34-monitor-6.png`, `39-monitor-funk.png`).
- **Auswirkung:** Gering; die Zeit an der Wand ist schlechter lesbar.
- **Empfehlung:** Fuß rechts um die Breite der Punkte einrücken.
- **Verifikation:** Monitor 6 bei 1440 × 900 und 1280 × 720 ansehen.

### S6-7 (P3) – Funkprobe „eingetragen von“ nennt den Arbeitsplatznamen

- **Beobachtung:** In „Funkproben“ steht für die Probe des S1-Arbeitsplatzes (Stelle S1 gewählt, Statuszeile der anderen nennt „S1“) „EINGETRAGEN VON: Arbeitsplatz“ (Vorgabe-Anzeigename), nicht Stelle und Handzeichen wie im Nachrichtenteil („S5 · Prs“). Ebenso führt das Tagebuch bei Nicht-Nachrichten-Ereignissen den Akteur „Arbeitsplatz“.
- **Auswirkung:** Nach dem Einsatz ist nicht klar, wer die Probe gemacht hat.
- **Empfehlung:** Stelle · Handzeichen der Sitzung eintragen, wo gesetzt.
- **Verifikation:** Probe von einem Arbeitsplatz mit Stelle „S6 · IuK“; Spalte zeigt „S6 · IuK“.

## Schluss

- **Aufgabe geschafft:** Funkplan mit Rufgruppen, Zuordnung, Erreichbarkeit, Funkproben **ja**; Fernmeldeplan über den Funk hinaus (Telefon/Fax/Daten, Verzeichnis) **nein**; Störungen **mit Umwegen** (Funkprobe-Grund und Tagebuch); IT-Zustand der Arbeitsplätze **mit Umwegen** (Diagnose ohne Stellen, Statuszeile, Nachrichten-Band).
- **Größtes Risiko:** Eine nachweislich nicht erreichbare Einheit fällt im Band als „0 kein Kontakt“ durch (S6-1), und Störungen ohne Einheitenbezug (Netz, Drucker, Telefon) haben keinen Ort außer dem Tagebuch – sie werden nicht nachverfolgt.
- **Top-Priorität:** Störungsliste (S6-A1) mit Ersatzweg und „behoben“, deren offene Einträge in Funkplan-Band und Monitor erscheinen; danach das Kommunikationsverzeichnis (S6-A2).
