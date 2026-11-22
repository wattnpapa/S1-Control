# Audit: Fehlende Ansichten aus Sicht Leiter Führungsstelle (LtrFüSt)

Stand: main d42f471, laufende Web-Schale http://127.0.0.1:8790, 22.11.2026 17:07–17:35. Playwright/Chromium, 1440 × 900, deviceScaleFactor 1. Derselbe Übungseinsatz wie im LtrStab-Audit („Review Leitung Hochwasser Weser“, 8 Abschnitte, 14 Einheiten aus fünf Organisationen, 10 Aufträge, 4 Anforderungen, 5 Nachrichten, 10 Dienstposten); Arbeitsplatz „Leitung LtrFüSt“ mit Stelle Leiter, Hz. LtF, Profil „Alle Blätter“, zum Vergleich ein Arbeitsplatz im Profil „Führungsstelle (S1)“. Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/leitung/`.

Einschränkung: `@bos/eeb-format` ist ein Platzhalter; Erfassungsbögen, QR-Scan und EEB-Import nicht geprüft.

Annahmen zur Rolle (keine Vorschrift zitiert): Der LtrFüSt organisiert die eigene Führungsstelle (Dienstposten, Besetzung, Schichten, Ablösung), erteilt Einheiten Aufträge und verfolgt deren Ausführung, steuert Anforderungen und Ablösungen und hält die Führungsstelle arbeitsfähig (FmZ, Sichter, ETB besetzt).

## Kurzes Urteil

Die Einheitenführung (Status, Verschieben, Ablösung anfordern, Eintreffen aus Anforderung mit Einheitsanlage) geht schnell und ist gut gemacht. Für die **Führung der Führungsstelle** und das **Verfolgen von Aufträgen** fehlen die Ansichten: Aufträge gibt es nur je Einheit in der Untertabelle, ohne Auftraggeber, Frist und Rückmeldung; eine Liste aller laufenden Aufträge gibt es nicht. Dienstposten und Schichtplan sind Freitexttabellen ohne Verbindung zu den Stellen und Handzeichen, mit denen die Arbeitsplätze tatsächlich angemeldet sind; unbesetzte Posten fallen nicht auf.

## Fehlende Ansichten

### F1 (P1) Auftragsübersicht aller Einheiten

- **Was die Rolle sehen/tun muss:** eine Liste aller Aufträge: Einheit, Abschnitt, Auftrag, seit, Dauer, Status (laufend/erledigt), Filter „nur laufende“, „je Abschnitt“; aus der Liste „erledigt“ setzen und zur Einheit springen. Einheiten im Einsatz **ohne** laufenden Auftrag und Einheiten „Einsatzbereit“ im Bereitstellungsraum als verfügbar gesondert.
- **Daten vorhanden:** `AuftragErfasst`/`AuftragBeendet` mit `einheitId`, `abschnittId`, Beginn und Ende; Status je Einheit; Abschnittsbaum.
- **Heute verstreut:** Untertabelle „Aufträge +“ erst nach Markieren einer Einheit (46-untertabellen.png); Spalte „Aufträge“ der Einheitentabelle (abgeschnitten, siehe LF-2); Tagebuchzeilen „Auftrag erfasst“. Die zehn Aufträge dieser Übung waren nur durch zehnmaliges Markieren einzeln lesbar.

### F2 (P1) Besetzung der Führungsstelle „wer ist jetzt im Dienst“

- **Was die Rolle sehen/tun muss:** Dienstposten × aktuelle Schicht × Person, mit Handzeichen und Arbeitsplatz, auf dem diese Person gerade angemeldet ist; unbesetzte Pflichtposten (z. B. Leiter Nacht, Sichter, Fm) rot; nächster Schichtwechsel.
- **Daten vorhanden:** Dienstposten mit Teilbereich, Funktion, Schicht, Rolle, Besetzung (`DienstpostenAngelegt`, `DienstpostenBesetzt`), Schichtplan-Einträge, Anwesenheit mit Stelle und Handzeichen (Statuszeile „1 weiterer: Leiter“, Diagnose „Arbeitsplätze“, Nachrichtenband „Kein Fernmelder besetzt“).
- **Heute verstreut:** Führungsstelle → „Stammdaten und Schichtplan“ (35-dienstposten.png, 36-schichtplan.png), Stellenabfrage je Arbeitsplatz (03-leer.png), Diagnose (49-diagnose.png), Hinweiszeilen im Blatt Nachrichten (16-nachrichten.png). Die Person „Neumann, P.“ als Sichter im Dienstposten und das Handzeichen „Fmz“ am Sichter-Arbeitsplatz haben keinen Bezug zueinander.

### F3 (P2) Einsatzzeiten und Ablösungsplanung der Einheiten

- **Was die Rolle sehen/tun muss:** je Einheit „im Einsatz seit“, Schicht, „verfügbar bis“, Ablösung angefordert/zugesagt/fällig; sortiert nach nächster fälliger Ablösung; Sammelansicht der kommenden 12 h.
- **Daten vorhanden:** Status mit Zeitpunkten, „Verfügbar bis“ mit Marke „läuft ab“, Ablösungsspalten aus Anforderungen, Marke „Ablösung angefordert“ an der Einheit (32-lage-nach-spiel.png), Schichtmodell der Stammdaten.
- **Heute verstreut:** Spaltengruppen der Einheitentabelle (Ressourcen, Zeiten), Anforderungen, S4-Vorausschau (Abgänge).

### F4 (P2) Schichtübergabe der Führungsstelle

- **Was die Rolle sehen/tun muss:** seit Schichtbeginn: neue/abgelöste Einheiten, laufende Aufträge, offene Anforderungen, offene Nachrichten je Stelle, Tagebuch seit Uhrzeit X; als Bildschirm und Ausdruck mit Notizfeld.
- **Daten vorhanden:** alles oben; Nachrichten haben die Sicht „Offen“ für die Übergabe (39-leiter-offen.png).
- **Heute verstreut:** Exporte → „Anforderungen“ und „Tagebuch“ je „mit Notizspalte, für die Schichtübergabe“, aber getrennt und ohne Zeitraum (das Tagebuch druckt alle 111 Einträge ab Einsatzanlage, 41-aus-tagebuch.png); Nachrichten → „Offen“ je eigener Stelle.

## Befunde an vorhandenen Ansichten

### LF-1 (P1) Auftrag erfassen und erledigen ohne Auftraggeber, Frist und Ergebnis

- **Beobachtung:** „Auftrag erfassen“ fragt „Auftrag“ und „Beginn (leer = jetzt)“ und zeigt den Ort (`UntertabellenErfassung.tsx`). „Auftrag erledigt“ fragt nur „Ende“ („Auftrag erledigt: Erkundung Deichscharte km 2,6 · Ende · Erledigt“). Die Rückmeldung „Deichscharte mit 400 Sandsäcken gesichert“ musste ich getrennt als Tagebucheintrag schreiben.
- **Auswirkung im Einsatz:** Der LtrFüSt sieht nicht, wer den Auftrag gegeben hat, bis wann er erledigt sein soll und was herausgekommen ist; überfällige Aufträge fallen nicht auf.
- **Empfehlung:** additiv Auftraggeber (Stelle/Hz. vorbelegt), „Rückmeldung bis“ und beim Erledigen ein Ergebnistext, der auch im Tagebuch an der Auftragszeile steht.
- **Verifikation:** Auftrag mit Frist 18:00 erfassen; nach 18:00 ist er in F1 und an der Einheit hervorgehoben; Ergebnistext steht im Tagebuch.

### LF-2 (P2) Spalte „Aufträge“: Datum zuerst, Text abgeschnitten

- **Beobachtung:** Bei 1440 px zeigt die Einheitentabelle in „Aufträge“ „22.11.2026 16:35–; FüS…“, „22.11.2026 16:45–; UA …“; der Auftragstext ist abgeschnitten, Spalten rechts davon (Schicht, Stärke) sind aus dem Bild (32-lage-nach-spiel.png, 43-profil-fuest.png).
- **Auswirkung im Einsatz:** Was eine Einheit gerade tut, ist in der Hauptansicht nicht lesbar.
- **Empfehlung:** Laufenden Auftrag als Text zuerst („Sandsackverbau km 2,1–2,4 · seit 16:45“), Volltext im Tooltip; erledigte Aufträge in der Spalte weglassen.
- **Verifikation:** 1440 × 900: Auftragstext der Zeile ohne Scrollen lesbar.

### LF-3 (P2) Unbesetzte Dienstposten fallen nicht auf; Zählung nur Tag

- **Beobachtung:** Nach Anlage von zehn Dienstposten blieb der Satz „Kein Dienstposten besetzt.“ stehen, bis Namen eingetragen waren. Danach zählt die Kopfzeile „Stab · Tag: 1/0/3 · ZTr FK · Tag: 0/0/1 · FGr F · Tag: 0/0/2“; „Leiter Führungsstelle · Nacht“, „S4 Versorgung · Tag“ und „Fachberater FF · Tag“ bleiben leer ohne jede Hervorhebung (36-schichtplan.png).
- **Auswirkung im Einsatz:** Eine unbesetzte Nachtschicht der Leitung wird erst bemerkt, wenn sie fehlt.
- **Empfehlung:** leere Besetzung bernstein, je Schicht „n von m besetzt“, Hinweis vor Schichtbeginn.
- **Verifikation:** Posten ohne Besetzung anlegen → hervorgehoben und in der Zählung als offen genannt.

### LF-4 (P2) Schichtplan: ISO-Datum, ungeordnete Zeilen, keine Schichtzeiten

- **Beobachtung:** „Tag anzeigen“ ist ein Datumsfeld des Browsers (im Testbrowser „mm/dd/yyyy“; Annahme: in einem deutschen Browser „tt.mm.jjjj“), der Spaltenkopf lautet „2026-11-22“. Die Zeilen stehen in anderer Reihenfolge als die Dienstposten („Fachberater FF · Tag“ zuerst, „Leiter Führungsstelle · Nacht“ zwischen Fm1 und S1). Die Zellen sind Freitext ohne Bezug zur Besetzung, Schichten haben keine Uhrzeiten (36-schichtplan.png).
- **Auswirkung im Einsatz:** Der Plan beantwortet nicht, wer um 22:00 Dienst hat; Datum entspricht nicht der Schreibweise der übrigen Oberfläche (AGENTS.md §9).
- **Empfehlung:** Datum „22.11.2026“ bzw. DTG wie im Rest, Zeilen nach Teilbereich wie oben, Besetzung als Vorbelegung der Zelle, Schichtbeginn/-ende in den Stammdaten.
- **Verifikation:** Spalte öffnen → Kopf „22.11.2026“; Reihenfolge = Dienstpostentabelle.

### LF-5 (P2) Anforderung ohne „angefordert bei“ und ohne Bedarfszeit

- **Beobachtung:** wie LS-3 im LtrStab-Audit: Maske mit Kennung, Ablösung für, vorgesehene Einheit, vorgesehener Auftrag; „Anfordern“ verlangt eines davon (13-anforderung.png). Die Zusage fragt „Zugesagt für“ und „Zugesagt von“.
- **Auswirkung im Einsatz:** Nachfassen bei der richtigen Stelle (TEL, Regionalstelle, Kreisbrandmeister) setzt Gedächtnis voraus.
- **Empfehlung:** „angefordert bei“ und „benötigt ab“ als Felder; „offen seit“ in der Liste.
- **Verifikation:** Felder in Liste, Ausdruck und Tagebuchzeile.

### LF-6 (P3) Tagebuchzeilen der Dienstposten mit interner Kennung

- **Beobachtung:** Das Tagebuch schreibt „dp-mws1z0y9-yk06u3: Dienstposten angelegt“ und „dp-mws1z0y9-yk06u3: Dienstposten besetzt: (leer) → Meier, K.“ (41-aus-tagebuch.png, Zeilen 93–109).
- **Auswirkung im Einsatz:** Wer wann welchen Posten übernommen hat, ist im Nachweis nicht lesbar.
- **Empfehlung:** Funktion und Schicht statt Kennung („Leiter Führungsstelle (Tag): besetzt mit Meier, K.“).
- **Verifikation:** Dienstposten anlegen und besetzen → Tagebuchzeile nennt Funktion und Schicht.

Positiv beobachtet: „Eingetroffen …“ an der Anforderung legt die Einheit mit Organisation, Ebene, Stärke, Auftrag und Abschnitt an und verknüpft sie („→ angelegt: FF Steimbke Sandsackfüllmaschine“, 47-eingetroffen.png); „Ablösung angefordert“ steht als Marke an der Einheit.

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Einheiten führen und Anforderungen bis zum Eintreffen ging gut; Aufträge verfolgen nur Einheit für Einheit, Personal/Schichten nur als Freitext ohne Prüfung.
- **Größtes Risiko:** Aufträge ohne Frist und Rückmeldung bleiben unbemerkt liegen; eine unbesetzte Funktion (Nachtschicht Leitung, Sichter) fällt erst auf, wenn sie gebraucht wird.
- **Top-Priorität:** Auftragsübersicht F1 mit Frist und Ergebnis (LF-1), danach Besetzungsansicht F2, die Dienstposten mit den angemeldeten Stellen/Handzeichen verbindet.
