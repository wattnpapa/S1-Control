# Audit: S1-Control v2 unter Einsatzstress (Rolle „THW Stress Test User“)

**Datum:** 05.11.2026 · **Stand:** HEAD `6772ffe` (nach den Schnitten E1–E4 der Entlastung und dem Fleetmapping-Vorschlag)

**Material:** eigene Web-Schale der v2 (`apps/desktop/out/web.mjs`) mit eigener Kopie der Prüflage
„Übung Weser-Ems“ (40 Einheiten, später 41), Chromium über Playwright, 1600×1000 und 412×860.
Profile „Führungsstelle (S1)“ und „Vermeldezentrale“, Erscheinungsbild Standard und Nacht.
52 Aufnahmen und die Prüfskripte liegen außerhalb des Repos im Scratchpad
(`shots/stress/`, `stress-*.cjs`). Dazu `docs/v2/HANDBUCH.md` und lesend der Quelltext unter
`apps/desktop/src/renderer/`. Vergleich: `docs/audits/thw-stress-test-user.md` (v1, 18.09., rein
codebasiert).

**Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung ausgelöst und gesehen ·
**[Code]** aus dem Quelltext belegt (Datei:Zeile) · **[Annahme]** plausible Folge oder
unbekannter THW-Ablauf · **[nicht prüfbar]** in dieser Umgebung nicht nachzustellen.

**Rolle:** Helfer am Arbeitsplatz der Führungsstelle, nebenbei Funk und Zurufe. 10–20 Sekunden
Aufmerksamkeit je Schritt, Unterbrechungen mitten im Formular, mehrere Meldungen gleichzeitig,
gelegentlich Doppelklick oder Esc „aus Reflex“.

**Gespielte Unterbrechungen:** Status gewählt, dann Reiter gewechselt · Einheit halb erfasst,
dann Klick daneben, Esc, Wiederaufnahme · Anforderung halb erfasst, Esc, Blattwechsel, zurück ·
Rufgruppe in der Zelle gewählt, dann weggeklickt · Name in der Zelle getippt, dann Reiter
gewechselt · „Einheit anlegen“ doppelt geklickt · zwischen Lage und Funkplan hin und her ·
Strg+Z aus einem anderen Blatt · „Neuer Einsatz …“ halb ausgefüllt, Esc.

---

## Urteil aus der Rolle

**Was funktioniert.** Gegenüber dem v1-Audit ist die Software unter Druck ein anderes Werkzeug.
Jeder eigene Schritt wird in der Statuszeile quittiert („✓ Status der Einheit ‚TZ THW
Bereitstellung‘ geändert · gespeichert“), Rückgängig steht immer an derselben Stelle und nennt
den Schritt, Strg+Z fragt mit Klartext nach und funktioniert auch aus einem anderen Blatt
[beobachtet]. Verschieben nennt Einheit und bisherigen Abschnitt und verlangt eine bewusste
Zielwahl, Entfernen verlangt einen Grund und erklärt, dass nichts gelöscht wird [beobachtet].
Ein Doppelklick auf „Einheit anlegen“ legt genau eine Einheit an [beobachtet]. Die Funkprobe ist
mit Zeile anklicken + Strg+P in rund einer Sekunde eingetragen. Das Nachtbild ist ruhig und
lesbar. Die Auswahlleiste nennt immer, was gewählt ist („1 gewählt · BGr 2 Oldenburg“).

**Wo Reibung entsteht.** Bei der Unterbrechung. Was mit einer **halben Eingabe** passiert, hängt
davon ab, wo man gerade war — vier Stellen, vier Regeln: Eine Textzelle schreibt beim
Wegklicken, eine Auswahlzelle (Status, Rufgruppe) verwirft beim Wegklicken still, die Maske
„Einheit anlegen“ verwirft bei Esc alles ohne Rückfrage, die Anforderung hebt den Entwurf
unsichtbar auf. Die Rufgruppen-Zelle hat zudem für Mausbediener gar keinen Knopf zum Schreiben.
Daneben kosten die kleinen Dinge Zeit: ein zweiter Klick auf die gewählte Zeile hebt die Wahl
still auf, ein aus „Mehr“ geöffnetes Blatt verschwindet beim Wechsel wieder aus dem Band, und
eine Einheit, die vor der Tür steht, wird von Hand immer erst als „Angefordert“ angelegt.

**Ohne fremde Hilfe?** Ja. Alle Kernaufgaben gingen ohne Handbuch; Umwege entstehen an den
genannten Stellen, nicht durch Unverständnis.

### Gemessene Kernaufgaben (Skriptzeit ohne Lesen; Aktionen = Klicks, Tasten, Feldeingaben)

| Aufgabe | Weg | Aktionen | Bemerkung |
|---|---|---|---|
| Status einer Einheit ändern | Suche tippen · Statusmarke · Wert wählen · „Übernehmen“ | 4 | 0,8 s; Quittung unten rechts [beobachtet] |
| Funkprobe eintragen (Profil S1) | „Mehr ▾“ · „Funkplan“ · Zeile · Strg+P | 4 | im Profil Vermeldezentrale 2 [beobachtet] |
| Rufgruppe aus Fleetmapping anlegen | „Rufgruppe anlegen“ · tippen · ↓ · Enter · Enter | 5 | 1,3 s, wenn man den Namen kennt [beobachtet] |
| Rufgruppe einer Einheit zuweisen | Zeile · „Rufgruppe ändern …“ · Wert wählen · **Enter** | 4 | ohne Enter wird nichts geschrieben, s. P1-2 |
| Eingetroffene Einheit von Hand erfassen und einsatzbereit melden | „Einheit anlegen ▾“ · „Ohne Vorlage“ · 7 Felder · Anlegen · dann Status 3 | 13 | s. P2-1 |
| Anforderung anlegen | „Eingang“ · „Anforderungen“ · „Anforderung anlegen“ · Feld · „Anfordern“ | 5 | 0,9 s [beobachtet] |
| Letzten Schritt zurücknehmen | Strg+Z · „Rückgängig machen“ | 2 | Rückfrage nennt den Schritt [beobachtet] |
| Profil wechseln | „⋯“ · „Einsatz schließen“ · „Ändern“ · Profil · „Übernehmen“ · „Öffnen“ | 6 | nur ohne geöffneten Einsatz, s. P2-3 |

---

## Findings

### P1-1 Halbe Eingaben: vier Stellen, vier Regeln — und zwei davon verwerfen still

**Fundstelle / Aufgabe:** Unterbrechung mitten in einer Eingabe — Lage (Statuszelle, Textzelle,
Maske „Einheit anlegen“), Eingang/Anforderungen, Einsatzauswahl („Neuer Einsatz …“).

**Beobachtung:**
- Status „Einsatzbereit → Einsatz“ in der Zelle gewählt, dann Reiter „Eingang“ angeklickt, zurück
  zur Lage: Status steht unverändert auf „Einsatzbereit“, keine Meldung, Rückgängig sagt „nichts
  zurückzunehmen“ [beobachtet, `04a`/`04b`]. Gewollt laut Hinweiszeile „Auswahl … Esc oder
  Wegklicken verwirft“ [Code] `Einheitentabelle.tsx:359`, `Einheitenzelle.tsx:10`.
- Name „Stress-Trupp 2“ in der Zelle zu „… Nord“ ergänzt, dann Reiter „Funkplan“ angeklickt: Die
  Änderung **wurde geschrieben** („✓ Einheit ‚Stress-Trupp 2 Nord‘ geändert · gespeichert“)
  [beobachtet]. Textzellen schreiben beim Wegklicken [Code] `Funkhinweiszelle.tsx:4`,
  `Einheitentabelle.tsx:359`.
- Maske „Einheit anlegen · Ohne Vorlage“ mit Bezeichnung und Stärke 0/1/3, Esc gedrückt, Maske
  wieder geöffnet: alle Felder leer, keine Rückfrage [beobachtet, `06b`/`06e`]. Der Zustand liegt
  lokal in der Maske [Code] `EinheitAnlegen.tsx:137-142`; nachgefragt wird beim Abbrechen nur,
  wenn ein Speicherversuch unklar blieb [Code] `Maske.tsx:123-130`. Klick neben die Maske lässt
  sie dagegen offen [beobachtet].
- Anforderung mit Auftrag „2x Pumpe 15000 l/min Deich Nord“, Esc, Wechsel zur Lage und zurück:
  Der Entwurf ist beim nächsten „Anforderung anlegen“ wieder da [beobachtet]; er liegt im Store
  [Code] `Anforderungsneu.tsx:70-71`.
- „Neuer Einsatz …“ mit Namen, Esc, wieder geöffnet: leer [beobachtet].

**Erwartung der Rolle:** Eine Regel für alles: Was ich angefangen habe, ist nach der Unterbrechung
entweder noch da oder es wurde mir gesagt, dass es weg ist. Was ich nicht bestätigt habe, wird
nicht still geschrieben.

**Auswirkung im Einsatz:** Der Helfer wählt „Einsatz“ für die Einheit, die gerade ausrückt, wird
angefunkt, klickt ins Funkplan-Blatt — und die Lage zeigt weiter „Einsatzbereit“. Er glaubt
gesetzt zu haben; die nächste Disposition rechnet mit einer Einheit, die schon unterwegs ist
[Annahme]. Umgekehrt landet ein halb getippter Name ungewollt in der Akte. Bei „Einheit
anlegen“ muss eine Einheit, die vor dem Zelt wartet, nach einem Reflex-Esc komplett neu erfragt
werden.

**Empfehlung:** Eine Regel für Zellen und Masken festlegen und überall gleich halten. Aus
Nutzersicht am robustesten: Auswahl verwirft nicht still, sondern bleibt als sichtbarer offener
Wert stehen oder wird beim Wegklicken wie eine Textzelle geschrieben; Masken mit Eingaben fragen
bei Esc „Eingaben verwerfen?“ oder heben den Entwurf wie die Anforderung auf.

**Verifikation:** In jeder bearbeitbaren Zelle und Maske Wert ändern, Reiter wechseln, zurück:
Entweder steht der Wert geschrieben samt Quittung, oder er steht noch offen da — nie still weg.
Maske mit Eingaben + Esc: Rückfrage oder Entwurf beim Wiederöffnen.

---

### P1-2 Rufgruppe in der Zelle: Mit der Maus gewählt heißt nicht zugewiesen

**Fundstelle / Aufgabe:** Funkplan → Einheit wählen → „Rufgruppe ändern …“ → Auswahl in der Zelle.

**Beobachtung:** „T_POOL-01 (TMO)“ mit der Maus gewählt: Die Zelle zeigt den neuen Wert, es
erscheint aber keine Quittung, kein Rückgängig-Eintrag, kein Knopf „Übernehmen“ [beobachtet,
`13a`]. Wer danach in die nächste Zeile klickt, hat nichts geschrieben; die Einheit steht weiter
auf „ohne“ [beobachtet, `stress-12`]. Geschrieben wird nur mit Enter; Esc und Wegklicken verwerfen
[Code] `Rufgruppenzelle.tsx:89-106`. Der Hinweis „Enter schreibt“ steht unter der Tabelle nach
rund 40 Zeilen [Code] `Funkzuordnung.tsx:232`. Die Statuszelle der Lage hat dagegen „Übernehmen“
und „Abbrechen“ [beobachtet, `03b`].

**Erwartung der Rolle:** Wenn ich in einer Liste etwas anklicke, ist es gewählt. Oder es steht —
wie beim Status — ein Knopf daneben, der sagt, was noch fehlt.

**Auswirkung im Einsatz:** Die Vermeldezentrale verteilt zu Beginn 39 Einheiten auf Rufgruppen —
genau die Arbeit, die die Tabelle mit „hier beginnt die Arbeit“ ankündigt. Mit der Maus gearbeitet
bleibt jede Zuordnung ungeschrieben, sichtbar erst, wenn man die Zeile nach dem Wegklicken wieder
anschaut. Unter Zeitdruck wird der Funkplan unvollständig, und die Kennzahl „ohne Rufgruppe“ steht
still höher als gedacht [Annahme].

**Empfehlung:** Dieselbe Bedienung wie die Statuszelle (sichtbares „Übernehmen“) oder Schreiben
bei Wahl, mit Quittung und Rückgängig wie überall sonst.

**Verifikation:** Rufgruppe nur mit der Maus wählen, in die nächste Zeile klicken: Die Zuordnung
steht, die Statuszeile quittiert, „ohne Rufgruppe“ zählt eins herunter.

---

### P2-1 Eingetroffene Einheit von Hand anlegen: immer erst „Angefordert“, dann ein zweiter Gang

**Fundstelle / Aufgabe:** Lage → „Einheit anlegen ▾“ → „Ohne Vorlage“; Einheit steht vor der Tür.

**Beobachtung:** Die Maske hat kein Statusfeld und sagt „Der Status ist ‚Angefordert‘: Wer
anlegt, plant Kräfte und meldet sie nicht als anwesend.“ [beobachtet, `05b`; Code
`EinheitAnlegen.tsx:230`]. „Stress-Trupp 2“ erschien danach als „Angefordert“, unter „Erwartet“
und nicht in der Ist-Stärke [beobachtet, `19d`]. Bis „Einsatzbereit“ waren es 13 Aktionen.

**Erwartung der Rolle:** Wer vor mir steht, ist da. Beim Anlegen einmal sagen können „ist
eingetroffen“.

**Auswirkung im Einsatz:** Der zweite Gang (suchen, Status, Übernehmen) wird unter Druck
vergessen; die Ist-Stärke ist dann zu niedrig, die Einheit steht als „erwartet“ [Annahme]. Ob der
Regelweg in der Führungsstelle über Erfassungsbogen/Meldekopf läuft und „Ohne Vorlage“ nur die
Ausnahme ist, ist für diese Rolle unbekannt [Annahme].

**Empfehlung:** In der Maske einen Schalter „bereits eingetroffen“ (oder den Status) anbieten;
der Hinweis bleibt für den Planungsfall.

**Verifikation:** Einheit von Hand mit „eingetroffen“ anlegen: Sie steht sofort in der Ist-Stärke,
in höchstens 10 Aktionen.

---

### P2-2 Ein zweiter Klick auf die gewählte Zeile hebt die Wahl still auf; Kürzel ohne Wahl tun nichts

**Fundstelle / Aufgabe:** Lage, Einheitentabelle; Zeile wählen, dann Verschieben/Entfernen.

**Beobachtung:** Klick wählt, zweiter Klick auf dieselbe Zeile hebt auf, dritter wählt wieder
[beobachtet, `stress-20`]; so gebaut [Code] `useEinheitenmarkierung.ts:38-40`. Danach tat
Strg+E nichts, ohne jede Meldung [beobachtet, `19d`]. Ein Doppelklick öffnet zugleich die
Namenszelle zur Bearbeitung [beobachtet, `20a`].

**Erwartung der Rolle:** Nochmal draufklicken heißt „ja, die“. Aufheben geht mit Esc (steht ja in
der Leiste).

**Auswirkung im Einsatz:** Wer aus Unsicherheit noch einmal auf die Zeile tippt, hat danach
nichts mehr gewählt, drückt Strg+M oder Strg+E und wartet auf eine Maske, die nicht kommt — kostet
Sekunden und Vertrauen, kein Datenschaden.

**Empfehlung:** Einfacher Klick wählt immer (Aufheben über Esc, „Alle Bereiche“ oder Strg+Klick);
ein Kürzel ohne Wahl sagt kurz „Erst eine Einheit wählen“.

**Verifikation:** Zeile dreimal anklicken: Sie bleibt gewählt. Strg+E ohne Wahl: sichtbarer
Hinweis.

---

### P2-3 Blätter außerhalb des Profils: jedes Hin und Her zwei Klicks, Auswahl weg, Profilwechsel nur ohne Einsatz

**Fundstelle / Aufgabe:** Profil S1, Wechsel Lage ↔ Funkplan (Funkprobe zwischen zwei
Statusmeldungen); Profilwechsel bei Schichtübergabe am selben Rechner.

**Beobachtung:** Funkplan aus „Mehr“ steht als letzter Reiter im Band, solange es offen ist; nach
einem Klick auf „Lage“ ist der Reiter weg, zurück geht es wieder über „Mehr ▾“ → „Funkplan“
(2 Klicks), die gewählte Einheit ist dann nicht mehr gewählt [beobachtet, `stress-14`; Code
`Reiterzeile.tsx:44-46`]. Das Profil lässt sich nur auf der Einsatzauswahl ändern, also erst nach
„Einsatz schließen“ (6 Aktionen) [beobachtet, `15c`]. Das Profil „Vermeldezentrale“ öffnete den
Einsatz auf der Lage statt auf dem Funkplan, obwohl der Funkplan sein erster Reiter ist
[beobachtet, `stress-17`].

**Erwartung der Rolle:** Ein Blatt, das ich gerade benutze, bleibt erreichbar, bis ich es nicht
mehr brauche. Das Profil kann ich umstellen, ohne den Einsatz zuzumachen.

**Auswirkung im Einsatz:** Wer am S1-Platz nebenbei Funkproben führt, zahlt je Funkspruch zwei
Klicks und eine neue Zeilensuche. Für einen Abend sind das viele kleine Umwege, kein Risiko.

**Empfehlung:** Das zuletzt aus „Mehr“ geöffnete Blatt im Band stehen lassen, bis ein anderes
aus „Mehr“ kommt; Profilwahl auch im Fenstermenü; Vermeldezentrale startet auf dem Funkplan.

**Verifikation:** S1-Profil, Funkplan aus „Mehr“, zur Lage und zurück: ein Klick.

---

### P2-4 „Wie viele Einheiten haben wir?“ — vier Zahlen auf zwei Blättern

**Fundstelle / Aufgabe:** Kurze Rückfrage der Führung, Blick auf den Bildschirm.

**Beobachtung:** Im selben Moment: „Einheiten 41“ im Kopf der Karte und „Alle Bereiche 41“ im
Baum, „Ist-Stärke gesamt · 33 Einh.“ und „Alle erfassten Einheiten 40 Einh.“ in der Summenzeile;
im Funkplan „39 Einheiten“ (vor dem Anlegen; Lage 40) [beobachtet, `02`, `08b`, `22a`]. Jede Zahl
ist für sich erklärt („+63 erwartet“, „Beendet/Rückmarsch: 1 Einh.“), aber nur in der langen
Summenzeile.

**Erwartung der Rolle:** Eine Zahl, die die Frage beantwortet, und daneben klein, was sie nicht
enthält.

**Auswirkung im Einsatz:** Unter Zeitdruck wird die größte oder die erstgesehene Zahl genannt.
Das kann um acht Einheiten danebenliegen [Annahme]. Die Ist-Stärke im Kopfband ist eindeutig — es
geht um die Einheitenzahl.

**Empfehlung:** Die Zählweise der Kopfzahl „Einheiten n“ an die Ist-Stärke angleichen oder
beschriften („41 erfasst · 33 vor Ort“); im Funkplan dieselbe Benennung.

**Verifikation:** Fünf Helfer fragen „wie viele Einheiten sind vor Ort?“ — alle nennen nach einem
Blick dieselbe Zahl.

---

### P2-5 Anforderungsentwurf: aufgehoben, aber unsichtbar; Anforderung ohne Kennung wird angenommen

**Fundstelle / Aufgabe:** Eingang → Anforderungen → „Anforderung anlegen“.

**Beobachtung:** Der aufgehobene Entwurf (P1-1) ist von außen nicht zu erkennen: Der Knopf heißt
weiter „Anforderung anlegen“ [beobachtet, `07d`]. Abgesendet ohne Kennung entsteht eine Zeile
mit leerer Kennung; Quittung und Rückgängig nennen sie „Anforderung ohne Kennung“ [beobachtet].

**Erwartung der Rolle:** Sehen, dass da noch etwas Angefangenes liegt. Eine Kennung bekommt die
Anforderung von selbst, wenn ich keine eintrage.

**Auswirkung im Einsatz:** Wer Stunden später eine neue Anforderung anlegt, findet den alten
Auftragstext im Feld und schickt ihn mit, wenn er nur ergänzt statt ersetzt [Annahme]. Zwei
Anforderungen ohne Kennung sind am Funk nicht auseinanderzuhalten.

**Empfehlung:** Knopf mit Entwurfsmarke („Anforderung anlegen · Entwurf“) und in der Maske
„Entwurf von hh:mm verwerfen“; leere Kennung automatisch fortzählen.

**Verifikation:** Entwurf anlegen, schließen: Der Knopf zeigt ihn an. Zwei Anforderungen ohne
Eingabe einer Kennung: zwei verschiedene Kennungen.

---

### P3-1 Fleetmapping-Vorschlag findet nur über den Namen, nicht über den Ort

**Beobachtung:** „Oldenburg“ → 0 Treffer, „Weser“ → nur „P_GÖ_WESER“ (Göttingen), „OL“ → zuerst
`OL_…`-Gruppen, dann `T_POOL-…` (wegen „pOOL“); „pool“ oder „T_POOL-0“ liefern sofort die
Liste [beobachtet, `stress-11`]. Der Ordner (etwa „ZA_NI › Oldenburg_LK“) steht in der Zeile, wird
aber nicht durchsucht. Pfeil + Enter übernimmt sauber, Enter ohne Markierung nimmt den Text
[beobachtet]. **Empfehlung:** Ordnertext mit durchsuchen. **Verifikation:** „Oldenburg“ zeigt die
Oldenburger Gruppen.

### P3-2 Rohe UTC-Zeitstempel als Tooltip an Zellen

**Beobachtung:** Zellen in Lage und Funkplan tragen `title="2026-11-05T20:35:26.463Z"` [beobachtet,
Playwright-Ausgabe zu `stress-12`/`stress-17`]. Wer mit der Maus verweilt, liest UTC statt
Ortszeit. **Empfehlung:** Tooltip im Format der Anzeige (TT.MM.JJJJ HH:MM). **Verifikation:**
Maus über eine Zelle: Ortszeit.

### P3-3 „Neuer Einsatz …“ meckert vor der ersten Eingabe

**Beobachtung:** Beim Öffnen steht schon „Der Einsatzname darf nicht leer sein.“ [beobachtet,
`23a`]; Esc verwirft alle Stammdaten (siehe P1-1). Vor dem Einsatz, also selten unter Stress.
**Empfehlung:** Fehlendes erst nach dem ersten Absendeversuch oder neutral („Noch fehlt: Name“)
nennen. **Verifikation:** Maske öffnen: keine Fehlermeldung.

### P3-4 Nachtbild: gewählte Zeile im Funkplan kaum abgesetzt

**Beobachtung:** Im Nachtbild ist die gewählte Zeile nur einen Hauch heller als ihre Nachbarn
[beobachtet, `17b`]; welche Einheit Strg+P trifft, sagt sicher nur die Auswahlleiste unten
(„1 gewählt · BGr 1 Oldenburg“). **Empfehlung:** Wahl im Nachtbild mit Rand oder Marke statt nur
Helligkeit. **Verifikation:** Nachtbild, Zeile wählen, aus 1 m Abstand erkennbar.

### P3-5 Konflikthinweise: Zahl dauerhaft in der Statuszeile, Ort nicht genannt

**Beobachtung:** „⚠ 8 Konflikthinweise“ stand auf jedem Blatt; ein Klick erklärt gut, was ein
Konflikthinweis ist, nennt aber nicht, welche acht Felder es sind [beobachtet, `stress-24`].
Laut Handbuch stehen sie in der Diagnose. **Empfehlung:** Aus dem Hinweis direkt zu den
betroffenen Zeilen. **Verifikation:** Klick auf den Hinweis führt zu den acht Feldern.

---

## Vergleich mit dem v1-Audit (18.09.)

Erledigt aus Sicht der Rolle [beobachtet]: Rückgängig in der Oberfläche mit Klartext (v1 P0-2),
Verschieben mit Objekt, Quelle und „bitte wählen“ (v1 P0-3), Quittung nach jedem Schritt (v1
P1-1), Entfernen mit Pflichtgrund statt Löschen (v1 P0-2/P1-6), Enter/Esc in Masken (v1 P2-3),
lesbare Statuswerte (v1 P2-6), Aktualität in der Statuszeile (v1 P2-8). Den Updater-Knopf aus v1
P0-1 gibt es in der v2 nicht mehr; laut Handbuch wird nichts von selbst installiert und im
offenen Einsatz zweimal gefragt [nicht prüfbar in der Web-Schale]. Geblieben, in neuer Gestalt:
Entwurfsverlust bei Unterbrechung (v1 P3-4 → hier P1-1).

[nicht prüfbar]: Sperrkonflikt zweier Arbeitsplätze an derselben Zelle (eine Web-Schale = ein
Arbeitsplatz), echte Share-Aussetzer, Bedienung mit Handschuh am Touchgerät.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Status, Funkprobe, Anforderung, Anlegen, Verschieben,
  Rücknahme gehen ohne Handbuch; Umwege bei Rufgruppenzuweisung mit der Maus, bei Unterbrechungen
  und beim Pendeln zwischen Profilblatt und „Mehr“-Blatt.
- **Fremde Hilfe nötig:** nein.
- **Größtes Missverständnis:** Eine in der Zelle gewählte Rufgruppe oder ein gewählter Status
  sieht gesetzt aus, ist aber nach dem Wegklicken still verworfen.
- **Größtes Einsatzrisiko:** Nach einer Unterbrechung steht in der Lage ein alter Status, den der
  Helfer für geändert hält — die nächste Entscheidung rechnet mit dem falschen Stand.
- **Top-Priorität für die nächste Iteration:** Eine einzige Regel für halbe Eingaben in Zellen
  und Masken (nie still verwerfen, nie still schreiben) — beginnend mit der Rufgruppen-Zelle, die
  ein sichtbares „Übernehmen“ braucht.
