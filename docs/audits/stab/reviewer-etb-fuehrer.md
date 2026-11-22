# Audit: Fehlende Ansichten aus Sicht ETB-Führer (Einsatztagebuch)

Stand: main d42f471, laufende Web-Schale http://127.0.0.1:8790, 22.11.2026 17:07–17:35. Playwright/Chromium, 1440 × 900, deviceScaleFactor 1. Derselbe Übungseinsatz wie in den Audits LtrStab und LtrFüSt („Review Leitung Hochwasser Weser“); geprüft am Bildschirm (Reiter „Einsatztagebuch“, Arbeitsplätze „Leitung LtrFüSt“ im Profil „Alle Blätter“ und „ETB Review Leitung“ im Profil „Führungsstelle (S1)“) und am Ausdruck `ausgaben/tagebuch_2026-11-22_1731.html` (111 Einträge). Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/leitung/`.

Abgrenzung: Die ETB-Befunde zu **Nachrichten** stehen in `docs/audits/nachrichten/reviewer-etb-fuehrer.md` und `runde2-reviewer-etb-fuehrer.md` und werden hier nicht wiederholt; wo sie weiter sichtbar sind, steht nur die Kennung. Einschränkung: `@bos/eeb-format` ist ein Platzhalter; Erfassungsbögen und EEB-Import nicht geprüft.

Annahmen zur Rolle (keine Vorschrift zitiert): Der ETB-Führer führt das Einsatztagebuch lückenlos und chronologisch, trägt mündliche und telefonische Meldungen, Entscheidungen und Aufträge ein, kennzeichnet Nachträge, berichtigt ohne zu löschen und übergibt das Tagebuch zum Schichtwechsel und nach dem Einsatz.

## Kurzes Urteil

Das Tagebuch ist als **Ereignisprotokoll** vollständig und nachvollziehbar: zwei Zeiten (Erfasst/Fachzeit), Akteur, Rechner, Nachrichtennummer mit ✉-Sprung, Rücknahmen als eigene Zeilen, Ausdruck mit Notizspalte. Als **Einsatztagebuch** taugt es so nicht: Nach 25 Minuten Übung stehen 111 Zeilen darin, die meisten davon Anlage- und Zwischenschritte (Abschnitt angelegt, Dienstposten angelegt, Nachricht zugeteilt/angenommen/nachgewiesen/weitergegeben). Die eigentliche ETB-Arbeit – einen Eintrag mit der Zeit „jetzt“ schreiben – **scheitert** mit einer technischen Fehlermeldung (P0). Berichtigen eines Eintrags ist in der Oberfläche nicht vorgesehen, Nachträge sind nicht gekennzeichnet, und bei allen Nicht-Nachrichten-Zeilen steht als Akteur der Name des Arbeitsplatzes ohne Handzeichen.

## Fehlende Ansichten

### E1 (P1) Redigierte ETB-Sicht „nur Tagebuchrelevantes“

- **Was die Rolle sehen/tun muss:** eine Sicht und einen Ausdruck mit Meldungen, Entscheidungen, Aufträgen, Lagebesprechungen, Statuswechseln der Einheiten, Ein-/Ausgang von Nachrichten mit Nummer; ohne Verwaltungsschritte (Abschnitt angelegt, Dienstposten angelegt, Stammdaten, Zuteilung an Fm1, Annahme, Nachweisung, Weitergabe an den Sichter). Umschaltbar auf „vollständiges Protokoll“.
- **Daten vorhanden:** Ereignistyp jeder Zeile (`EtbEintragErfasst`, `AuftragErfasst`, `StatusGesetzt`, `Nachricht…` usw.), Quelle des manuellen Eintrags.
- **Heute:** Filter nur „Suche“, „Auf die Auswahl beschränken“, „Nur Rücknahmen und Berichtigungen“ (30-tagebuch.png). Beispiel: Fünf Nachrichten erzeugten 21 Zeilen, davon 11 Zwischenschritte von FmZ und LdF (Zeilen 58–78).

### E2 (P1) Nachträge und Zeitlücken

- **Was die Rolle sehen/tun muss:** Einträge, deren Fachzeit deutlich vor der Erfassung liegt, als „Nachtrag“ markiert; Sortierung wahlweise nach Fachzeit; Liste der Nachträge je Schicht.
- **Daten vorhanden:** beide Zeiten je Zeile.
- **Heute:** „Nachtrag: Telefonat KBM … 1705“ steht als Zeile 81 mit Erfasst 17:27:18 und Fachzeit 17:05 zwischen Zeilen von 17:27, ohne Marke; der Ausdruck sagt „älteste zuerst (Ordnung des Schreibens)“ (41-aus-tagebuch.png). Die Kennzeichnung hängt davon ab, dass der Schreiber „Nachtrag:“ in den Text tippt.

### E3 (P2) Übergabe und Zeitraum

- **Was die Rolle sehen/tun muss:** Tagebuch „seit Schichtbeginn“ / „von–bis“, gefiltert nach Stelle, Handzeichen oder Quelle; Übergabevermerk („übergeben an Hz. … um …“) als eigener Eintrag; Ausdruck genau dieses Ausschnitts.
- **Daten vorhanden:** Zeiten, Akteur, Stelle/Handzeichen (bei Nachrichten), Quelle.
- **Heute:** Bildschirm zeigt „100 von 111 Einträgen“ (45-etb-1440.png; vgl. R1 ETB P2-4, weiter sichtbar); der Ausdruck „Tagebuch – mit Notizspalte, für die Schichtübergabe“ druckt immer alles ab Einsatzanlage.

### E4 (P2) Berichtigen eines Tagebucheintrags

- **Was die Rolle sehen/tun muss:** an einer eigenen Zeile „Berichtigen …“ mit Grund; die alte Fassung bleibt lesbar, die neue verweist darauf.
- **Daten vorhanden:** Die Domäne kennt `EtbEintragBerichtigt` (Prüfung im Worker, `worker/anlagenamenpruefung.ts`), der Filter „Nur Rücknahmen und Berichtigungen“ existiert.
- **Heute:** Die Tagebuchzeile hat außer ✉ keinen Knopf und kein Kontextmenü (`renderer/Tagebuch.tsx`); korrigieren geht nur über „Rückgängig“ der letzten eigenen Handlung in der Statuszeile.

### E5 (P3) Herkunft je Zeile

- **Was die Rolle sehen/tun muss:** Person (Name aus Dienstposten), Stelle, Handzeichen, Arbeitsplatz, Quelle in getrennten Spalten.
- **Daten vorhanden:** Handzeichen und Stelle der Sitzung, Anzeigename des Arbeitsplatzes, Dienstposten mit Namen.
- **Heute:** siehe ET-2; Verknüpfung Handzeichen ↔ Person fehlt (R2-ETB P2-7, weiter sichtbar).

## Befunde an vorhandenen Ansichten

### ET-1 (P0) „Eintrag hinzufügen“ mit leerer Zeit („leer = jetzt“) wird nicht gespeichert

- **Beobachtung:** Text „Entscheidung LtrFüSt: TZ Verden … Begründung Blitz E 1.“, Quelle „Sonstiges“, Zeit leer → „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“; die Maske bleibt offen (dbg4.png). Mit eingetragener Zeit („1727“) speichert dieselbe Maske. Ursache im Code: `TagebuchEintrag.tsx` holt Kennung und Zeit nacheinander über `versuch.kennung(...)`; `useAnlegeversuch().kennung` (`Anlegeversuch.tsx`) hält aber **einen** Wert je Maske und gibt beim zweiten Aufruf die ETB-Kennung zurück, die dann als `zeitpunkt` geschrieben wird.
- **Auswirkung im Einsatz:** Der häufigste Fall – „jetzt eintragen“ – geht nie. Wer die Meldung unter Druck schreibt, liest eine technische Meldung und muss die Uhrzeit selbst tippen; wer aufgibt, verliert den Eintrag. Die Meldung widerspricht AGENTS.md §5 („nutzerklar, kein Stacktrace“).
- **Empfehlung:** Zeit „jetzt“ getrennt von der Kennung festhalten (eigener Ref oder `kennung` je Schlüssel); Fehlermeldungen der Prüfung in Klartext („Zeit konnte nicht gelesen werden“). Regressionstest: Eintrag mit leerer Zeit speichert, Fachzeit = Speicherzeit.
- **Verifikation:** Tagebuch → „Eintrag hinzufügen“, Text, Zeit leer, „Eintrag speichern“ → Zeile erscheint, Maske schließt.

### ET-2 (P1) Akteur der Nicht-Nachrichten-Zeilen ist der Arbeitsplatzname, ohne Handzeichen

- **Beobachtung:** Tagebucheinträge, Aufträge, Status, Anforderungen, Dienstposten tragen „Leitung LtrFüSt“ (Anzeigename) und im Ausdruck „Hz. —“; nur Nachrichtenzeilen tragen „Leiter · LtF“ bzw. „Sichter · Fmz“. Spalte „Rechner“ lautet bei allen drei Arbeitsplätzen „vm“ (41-aus-tagebuch.png, 30-tagebuch.png). Fortsetzung von R1 ETB P1-7 (dort „teilweise“), in diesem Umfang weiter sichtbar.
- **Auswirkung im Einsatz:** Die Entscheidung des LtrFüSt im Tagebuch ist keiner Person und keinem Handzeichen zuzuordnen; bei Schichtwechsel am selben Rechner auch nicht der Schicht.
- **Empfehlung:** Stelle und Handzeichen der Sitzung in jede Zeile, nicht nur bei Nachrichten; Rechnername in der Web-Schale aus dem Arbeitsplatz statt aus dem Server.
- **Verifikation:** Eintrag am Arbeitsplatz mit Hz. „LtF“ → Akteur „Leiter · LtF“ in Bildschirm und Ausdruck; zwei Browser zeigen verschiedene Rechner.

### ET-3 (P2) Eintragsmaske kennt keine Art und keinen Bezug

- **Beobachtung:** Felder: „Was wurde gemeldet?“, Quelle (Funk, Telefon, Meldung vor Ort, Lagebesprechung, Sonstiges), „Zeit der Meldung“ (31-eintrag.png). Kein „von/an“, keine Art „Entscheidung“, „Auftrag“, „Nachtrag“, kein Bezug auf Einheit oder Abschnitt (nur auf eine Nachricht, wenn das Tagebuch auf sie gefiltert ist). Die Quelle wird nur als Textvorsatz gespeichert („Sonstiges: Entscheidung …“).
- **Auswirkung im Einsatz:** Entscheidungen und Rückmeldungen lassen sich nicht wiederfinden oder filtern; „Im Tagebuch zeigen“ an der Einheit findet freie Einträge zu ihr nicht.
- **Empfehlung:** Art und Gegenstelle als Felder, Bezug auf Einheit/Abschnitt aus der aktuellen Auswahl vorbelegen.
- **Verifikation:** Eintrag mit Bezug Einheit X → erscheint bei „Auf die Auswahl beschränken“ für X.

### ET-4 (P2) Dienstposten-Zeilen mit interner Kennung

- **Beobachtung:** „dp-mws1z0y9-yk06u3: Dienstposten angelegt“, „…: Dienstposten besetzt: (leer) → Meier, K.“ (Ausdruck Zeilen 93–109).
- **Auswirkung im Einsatz:** Wer wann Leiter der Führungsstelle war, ist aus dem Tagebuch nicht lesbar.
- **Empfehlung und Verifikation:** wie LF-6 im LtrFüSt-Audit.

### ET-5 (P2) Einsatztagebuch im Vorgabeprofil unter „Mehr“; kein ETB-Profil

- **Beobachtung:** Im Profil „Führungsstelle (S1)“ steht das Einsatztagebuch unter „Mehr“ (43-profil-fuest.png, 44-mehr.png); ein Profil für den ETB-Platz gibt es nicht. Das Handbuch nennt für dieses Profil das Tagebuch im Band.
- **Auswirkung im Einsatz:** Der ETB-Platz muss „Alle Blätter“ wählen oder jedes Mal über „Mehr“ gehen.
- **Empfehlung:** Profil „ETB“ (Einsatztagebuch zuerst, Nachrichten, Lage); Handbuch angleichen (siehe LS-4).
- **Verifikation:** Profil wählen → Einsatztagebuch erster Reiter.

### ET-6 (P3) Zeitangabe im Bildschirm ohne Jahr, Sortierung nach Schreiben

- **Beobachtung:** Bildschirm „22.11. 17:25:29“ / Fachzeit „22.11. 17:15:00“; der Eintrag mit Fachzeit 17:15 steht über Zeilen mit Fachzeit 17:23 (30-tagebuch.png). Vgl. R1 ETB P2-1.
- **Auswirkung im Einsatz:** Wer nach Fachzeit liest, springt.
- **Empfehlung:** Umschalter „nach Fachzeit“; Nachträge (E2) markieren.
- **Verifikation:** Sortierung umschalten → Zeile 79 steht bei 17:15.

Weiter sichtbar aus den Nachrichten-Audits (nicht neu gezählt): Nummernlücken nur im Ausdruck (R2-LdF P2-7), Erledigt ohne Vermerk (R1 ETB P2-5), Konflikthinweis ohne Anlass (R2-FM P3-6, 48-konflikt.png).

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Lückenloses Mitschreiben ging nur mit von Hand getippter Uhrzeit (ET-1); Nachtrag, Herkunft und Übergabe sind im Ereignisprotokoll enthalten, aber nicht als solche erkennbar oder filterbar.
- **Größtes Risiko:** Einträge „jetzt“ gehen verloren (ET-1); im Nachweis fehlt bei Entscheidungen, wer sie getroffen hat (ET-2).
- **Top-Priorität:** ET-1 beheben (mit Regressionstest), danach die redigierte ETB-Sicht E1 mit Nachtragskennzeichnung E2 und Zeitraum für die Übergabe E3.
