# S6-Audit S1-Control v2 (THW S6 / IuK Reviewer)

**Datum:** 05.11.2026 · **Stand:** HEAD (`ffc3125`, nach den Schnitten Funkplan mit Auswahlleiste und „⋯", Standard-Fleetmapping mit Suche, Namensvorschlag in „Rufgruppe anlegen", Diagnose, Verbindungsbanner)

**Rolle:** Sachgebietsleiter S6 (Information und Kommunikation) einer Führungsstelle: Funkplan, Rufgruppen, Rufnamen, Funkproben, Erreichbarkeiten — und zugleich IT der Führungsstelle (Arbeitsplätze, Share, Synchronisation, Updates).

**Material:**
- Eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems" (40 Einheiten), `http://127.0.0.1:8217`, Profil „Vermeldezentrale" (ein Profil S6 gibt es nicht), Anzeigename „S6 IuK"; zweiter Browserkontext „Sprechfunker 2" als zweiter Arbeitsplatz; Ausfall mit `context.setOffline` (3 s, 50 s, 78 s).
- In der Kopie geschrieben: 6 Rufgruppen (davon absichtlich eine doppelt benannt), 14 Zuordnungen, 8 Funkproben, 2 Funkrufnamen-Overrides, Funkplan als HTML.
- Screenshots `…/scratchpad/shots/s6/01…39` (Pfad: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/s6/`), Skripte `…/scratchpad/s6-*.cjs`.
- Quelltext lesend; `docs/v2/BETRIEB.md`, `docs/v2/HANDBUCH.md`.

**Kennzeichnung:** **[beobachtet]** in der laufenden App gesehen · **[Code]** aus dem Quelltext belegt · **[Annahme]** THW-Ablauf oder Ursache, die nicht aus dem Material hervorgeht · **[nicht prüfbar]** in dieser Umgebung nicht zu prüfen (z. B. Desktop-Schale, echtes SMB).

---

## Urteil

Der Funkplan ist für den S6 inzwischen ein brauchbares Arbeitsblatt: Rufgruppen anlegen geht schnell, der Fleetmapping-Vorschlag findet „olgold" als `T_OL-GOLD-1 … 5` mit Kurzwahl, „ohne Rufgruppe" steht oben als Arbeitsvorrat, „Bereich ≠ Gruppe" weist auf Fehlzuordnungen hin, Funkproben stehen mit Zeit, Grund und Bearbeiter in Zeitfolge und im Tagebuch, und der Ausdruck hat Leerzeilen für die Handschrift. Der Verbindungsbanner sagt im Ausfall klar, dass nichts gespeichert wird.

Reibung entsteht an zwei Stellen, die genau das Kerngeschäft des S6 sind:

1. **Widersprüche im Funkplan erkennt die Software nicht.** Zwei Rufgruppen mit demselben Namen und zwei Einheiten mit demselben Funkrufnamen werden ohne Wort angenommen und erscheinen danach in Zelle, Funkprobenliste, Tagebuch, Ausdruck und Monitor ununterscheidbar.
2. **Die IT-Sicht ist im Störfall nicht belastbar.** Die Diagnose zeigt geschlossene oder abgeschnittene Browser bis zu zwei Minuten als „vor 4 s" gesehen, alle Web-Arbeitsplätze heißen beim Rechner „vm", neue Browser heißen „Arbeitsplatz"; nach einem längeren Ausfall steht oben „✓ aktuell", während der Funkplan noch bis zu 40 s den alten Stand zeigt; und der einzige zutreffende Störfall („Konflikthinweise: 8") lässt sich nicht abarbeiten, weil die Hinweise nirgends lesbar sind.

Den Funkplan selbst kann der S6 ohne Nebenaufzeichnung führen, solange er Doppelungen selbst im Kopf prüft. Für die Funkprobenrunde (Nachtragen mit tatsächlicher Funkzeit) und für den Überblick „welcher Platz ist wirklich am Netz" braucht er weiter Papier.

---

## Findings

### P1-1 Doppelte Rufgruppennamen und doppelte Funkrufnamen werden nicht erkannt

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüfaufgabe 1 · Funkplan → „Rufgruppe anlegen" · Maske „Funk und Erreichbarkeit" → Funkrufname „Überschreiben …" · `apps/desktop/src/renderer/RufgruppeMaske.tsx:90` (bereit = Name nicht leer), `Rufgruppenzelle.tsx:76-78` (Wahltext nur Name, Betriebsart, Zweck)
- **Beobachtung:** [beobachtet] `T_OL-GOLD-1` ließ sich ein zweites Mal anlegen (Zweck „Doppelt angelegt"), ohne Hinweis (Shot 06). Danach stehen in der Liste zwei Zeilen „TMO T_OL-GOLD-1", in der Zuordnung zwei Gruppenköpfe, in der Zelle der Einheit nur „T_OL-GOLD-1" (Shot 08), in der Funkprobenliste „T_OL-GOLD-1" (Shot 13), im Tagebuch „FGr Notversorgung: Rufgruppe gesetzt: T_OL-GOLD-1" (Shot 39), im Ausdruck zwei Blöcke „TMO · T_OL-GOLD-1" (Shot 16) und auf dem Monitor zwei gleiche Zeilen (Shot 36). Unterscheidbar sind sie nur am Zweck, und nur dort, wo der Zweck mitgedruckt wird. [beobachtet] Ebenso nahm die Software für „ZTr THW Deich" und „ZTr THW Pumpwerk" denselben Funkrufnamen „Heros Oldenburg 10/01" an; Spalte „Hinweis" bleibt „—", das Kennzahlenband zählt nichts (Shot 38). [Code] Weder Maske noch Projektion (`packages/domaene/src/projektion/funkplan.ts`) prüfen auf Gleichheit.
- **Erwartung der Rolle:** Ein Funkplan ist nur dann richtig, wenn jeder Rufname genau einmal vorkommt und jede Rufgruppe eindeutig benannt ist. Ich erwarte beim Anlegen „Rufgruppe ‚T_OL-GOLD-1' gibt es schon (Führung EA Deich Nord) — trotzdem anlegen?" und in der Zuordnung einen Hinweis „Funkrufname doppelt (auch: ZTr THW Pumpwerk)", dazu eine Zahl im Band wie „ohne Rufgruppe".
- **Auswirkung im Einsatz:** Zwei Sprechfunker sprechen „Heros Oldenburg 10/01" an und meinen verschiedene Einheiten; eine Meldung landet bei der falschen Einheit. Bei doppelt angelegten Gruppen ordnet ein Kollege Einheiten der falschen Planzeile zu; der Ausdruck zeigt zwei gleichnamige Blöcke, und niemand weiß, welcher gilt.
- **Empfehlung:** Gleichheit von Rufgruppennamen (ohne Groß-/Kleinschreibung) beim Anlegen und Umbenennen ansagen, mit bewusster Bestätigung. Doppelte Funkrufnamen als Hinweis an beiden Zeilen und als Zahl im Band „Widersprüche" zeigen, so wie heute „Bereich ≠ Gruppe".
- **Verifikation:** Zweite Gruppe „T_OL-GOLD-1" anlegen → Rückfrage erscheint. Zwei Einheiten denselben Funkrufnamen geben → beide Zeilen tragen einen Hinweis, Band zählt 1, Ausdruck markiert beide.

### P1-2 Die Arbeitsplatzliste der Diagnose zeigt tote Plätze als lebend

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüfaufgaben 3 und 4 · Fenstermenü „⋯" → Diagnose → „Arbeitsplätze" · `apps/desktop/src/renderer/Diagnose.tsx:81`, `:144` · `packages/speicher/src/startwerte.ts:57`
- **Beobachtung:** [beobachtet] Ein Browser „Geist" wurde geschlossen; die Diagnose eines anderen Platzes zeigte ihn danach rund 110 s lang weiter mit „Zuletzt gesehen: vor 4 s", bei jeder Abfrage im 20-s-Takt derselbe Wert (Protokoll `s6-17.out`, Shot 35). Danach verschwand die Zeile ganz; grau, wie der Text „fortgegangene Arbeitsplätze stehen grau darunter" verspricht, war sie nie. [beobachtet] Während „S6 IuK" 65 s vom Dienst abgeschnitten war, zeigte die Diagnose bei „Sprechfunker 2" ihn als „vor 9 s" gesehen, ohne jeden Hinweis (Shot 23). Die Statuszeile sagte zeitweise „4 weitere Arbeitsplätze", obwohl nur einer offen war. [Annahme] Ursache ist, dass der Web-Dienst den Arbeitsplatz eines Browsers serverseitig noch eine Weile weiterführt; die Präsenzgrenze von 30 s (`startwerte.ts:57`) greift dann nicht.
- **Erwartung der Rolle:** In der Diagnose sehe ich, welcher Platz wirklich arbeitet. Ein abgeschnittener oder geschlossener Browser wird nach kurzer Zeit grau mit „zuletzt vor 1 min", und die Zeitangabe zählt sichtbar hoch.
- **Auswirkung im Einsatz:** Ein Helfer meldet „mein Rechner tut nichts", ich schaue in die Diagnose und sehe alles grün. Ich suche den Fehler am falschen Ende (Share, NAS), statt das WLAN oder den Browser des Platzes zu prüfen. Bei einer Lagebesprechung zähle ich Plätze, die es nicht mehr gibt.
- **Empfehlung:** In der Web-Schale gilt ein Arbeitsplatz nur so lange als lebend, wie sein Browser sich meldet. Die Zeit „zuletzt gesehen" zählt in der Ansicht hoch; fortgegangene Plätze bleiben grau stehen, bis die Schicht vorbei ist, statt zu verschwinden.
- **Verifikation:** Zweiten Browser schließen bzw. offline setzen → nach höchstens 30 s grau mit hochzählender Zeit; Statuszeile zählt ihn nicht mehr.

### P1-3 Nach längerem Ausfall steht „✓ aktuell", während der Funkplan noch den alten Stand zeigt

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüfaufgabe 4 · Kopfband-Zustandsmarke, Blatt Funkplan · `apps/desktop/src/renderer/Zustandsmarke.tsx:11`, `:92` · `apps/desktop/src/renderer/verbindungsabgleich.ts:19-30`
- **Beobachtung:** [beobachtet] „S6 IuK" 78 s offline, in der Zeit setzte „Sprechfunker 2" die Rufgruppe von „Meldekopf". Nach der Wiederverbindung stand 5 s später oben „✓ aktuell" und unten „Share erreichbar (gerade eben)", der Funkplan zeigte aber noch 35–40 s lang „Meldekopf … ohne", dazu über der Liste weiter „Keine Verbindung zum Dienst." (Protokoll `bx6kdxjv1`, Shot 28; ähnlich Shot 24). Erst danach stand „T_OL-GOLD-3" da. Nur die kleine Angabe „Stand: vor 1 min" in der Statuszeile verriet es. Bei 50 s Ausfall kam der neue Stand dagegen nach 5 s. [Code] Die Marke „✓ aktuell" heißt nur „Dienst und Share erreichbar" (`Zustandsmarke.tsx:11`), nicht „Ansicht neu geladen"; ein Fehlschlag des Abgleichs wird still übergangen (`verbindungsabgleich.ts:28-29`). [Annahme] Der Abgleich nach der Wiederverbindung schlägt nach langem Ausfall fehl, und erst die nächste Mitteilung des Dienstes bringt den Stand.
- **Erwartung der Rolle:** „✓ aktuell" steht erst, wenn die Ansicht den neuen Stand hat. Bis dahin „wird abgeglichen …"; Meldungen aus der Unterbrechung verschwinden mit dem Abgleich.
- **Auswirkung im Einsatz:** Der Sprechfunker sieht „aktuell" und ruft eine Einheit über die alte oder keine Rufgruppe; ich gebe einen Funkplan-Stand weiter, der 40 s alt ist und Änderungen des Kollegen nicht enthält.
- **Empfehlung:** Die Marke bleibt nach einer Unterbrechung auf „wird abgeglichen", bis der neue Stand angekommen ist; scheitert der Abgleich, wird er sofort wiederholt und nicht erst mit der nächsten Mitteilung.
- **Verifikation:** 80 s offline, in der Zeit am anderen Platz eine Rufgruppe ändern; nach dem Wiederverbinden darf „✓ aktuell" erst stehen, wenn die Änderung sichtbar ist.

### P1-4 Der einzige zutreffende Störfall („Konflikthinweise") lässt sich nicht abarbeiten

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüfaufgabe 3 · Diagnose „Was gerade zutrifft", Statuszeile „⚠ 8 Konflikthinweise" · `apps/desktop/src/renderer/Diagnose.tsx:174`, `Einheitenzelle.tsx:155`
- **Beobachtung:** [beobachtet] Die Diagnose nennt als zutreffend „Zwei Arbeitsplätze haben dasselbe Feld geändert", Schritt 1: „Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert." Die Statuszeile klappt auf: „Betroffene Felder tragen in der Tabelle ein ⚠" (Shot 34). In der Lage mit den Standardspalten steht kein einziges ⚠ (0 Marken gezählt). Eine Liste der 8 Hinweise mit Feld, Gewinner und verdrängtem Wert gibt es nirgends. [Code] Kein Renderer-Baustein zeigt einen verdrängten Wert; die Diagnose zeigt nur die Zahl (`Diagnose.tsx:174`), die Zelle nur ein ⚠ mit allgemeinem Text (`Einheitenzelle.tsx:105`, `:155`).
- **Erwartung der Rolle:** Ich klicke auf „8 Konflikthinweise" und bekomme eine Liste: Einheit, Feld, was steht, was verdrängt wurde, von welchem Platz. Dann kläre ich mit dem Kollegen und trage neu ein.
- **Auswirkung im Einsatz:** Die Warnung steht dauerhaft gelb in der Statuszeile und wird zum Rauschen. Ein wirklich verdrängter Status oder eine verdrängte Rufgruppe fällt niemandem auf; die Störfallhilfe verspricht einen Schritt, den die Oberfläche nicht bietet.
- **Empfehlung:** Eine Liste der Konflikthinweise in der Diagnose (und als Ziel des Knopfs in der Statuszeile) mit Feld, angezeigtem und verdrängtem Wert und den beiden Arbeitsplätzen. Hinweise auf Spalten, die gerade ausgeblendet sind, dort ebenfalls nennen.
- **Verifikation:** Zwei Plätze ändern gleichzeitig denselben Status → Klick auf den Zähler zeigt den Eintrag mit beiden Werten; nach Neueintragen verschwindet er.

### P2-1 Zuordnen und Funkproben nur Einheit für Einheit, Funkprobe nur mit „jetzt"

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Prüfaufgaben 1 und 2 · Zuordnung, Auswahlleiste „1 gewählt …" · `apps/desktop/src/renderer/Funkauswahl.tsx:34`, `useFunkprobe.tsx:6-7`, `Funkauswahl.tsx:51`
- **Beobachtung:** [beobachtet] Für 14 Zuordnungen waren 14-mal Doppelklick → Auswahl → Enter nötig; eine Mehrfachwahl gibt es nicht, die Leiste sagt immer „1 gewählt" (Shot 07). Bei 39 Einheiten im Plan heißt der Arbeitsvorrat „hier beginnt die Arbeit" 39 Einzelgänge. [beobachtet] Funkprobe „Kontakt" schreibt sofort mit der Uhrzeit des Tastendrucks; „kein Kontakt …" fragt nur den Grund (Shot 10). [Code] Eine abweichende Funkzeit ist nicht vorgesehen („Funkzeit jetzt", `Funkauswahl.tsx:51`).
- **Erwartung der Rolle:** Alle Einheiten eines Bereichs in einem Zug einer Rufgruppe zuordnen. Eine Funkprobenrunde, die der Sprechfunker auf dem Funkmeldeblock mitgeschrieben hat, später mit den tatsächlichen Uhrzeiten nachtragen.
- **Auswirkung im Einsatz:** Beim Aufbau des Funkplans und bei jeder Probenrunde kostet das Minuten. Wer nachträgt, schreibt falsche Funkzeiten in Akte und „letzter Kontakt" — oder trägt nicht nach und führt die Proben parallel auf Papier.
- **Empfehlung:** Mehrfachwahl in der Zuordnung (mindestens „alle dieses Bereichs") mit „Rufgruppe setzen …". Bei der Funkprobe ein Feld „Funkzeit" mit Vorbelegung jetzt, wie es Tagebuch und Anforderung schon kennen.
- **Verifikation:** 8 Einheiten eines Bereichs in einem Schritt zuordnen; eine Probe mit Funkzeit 20 Minuten zurück eintragen → Funkprobenliste und „letzter Kontakt" zeigen die eingetragene Zeit.

### P2-2 Einheiten im Rückmarsch fallen aus dem Funkplan

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Prüfaufgabe 1 · Zuordnung „39 Einheiten" bei 40 in der Lage · `packages/domaene/src/projektion/funkplan.ts:7` gegen `projektion/funkkontakt.ts:33`
- **Beobachtung:** [beobachtet] „Trupp Aufklärung" (Status Rückmarsch) steht in der Lage, nicht aber im Funkplan, nicht im Ausdruck und nicht auf dem Monitor. [Code] Der Funkplan nimmt Rückmarsch ausdrücklich heraus (`funkplan.ts:7`), während die Kontaktschwelle Rückmarsch eigens als „nie Bernstein" behandelt (`funkkontakt.ts:33`) — also davon ausgeht, dass die Einheit im Plan steht.
- **Erwartung der Rolle:** [Annahme] Eine Einheit auf dem Rückmarsch ist auf der Straße und muss bis zur Ankunft am Standort über Funk erreichbar sein; erst „Einsatz beendet" nimmt sie heraus.
- **Auswirkung im Einsatz:** Gibt es auf dem Rückweg einen Unfall oder einen neuen Auftrag, sieht der Sprechfunker nicht, über welche Rufgruppe er den Trupp erreicht.
- **Empfehlung:** Rückmarsch im Plan lassen (gern blass, wie Einsatzvorbehalt), erst mit „Einsatz beendet" herausnehmen.
- **Verifikation:** Einheit auf Rückmarsch setzen → bleibt in Zuordnung, Ausdruck und Monitor mit ihrer Rufgruppe.

### P2-3 Fleetmapping: Suche nur im Namen, Kurzwahl geht nach der Wahl verloren

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Prüfaufgabe 1 · Maske „Rufgruppe anlegen" · `apps/desktop/src/renderer/fleetmapping/index.ts:63-69`, `RufgruppeMaske.tsx:141`
- **Beobachtung:** [beobachtet] „olgold" findet `T_OL-GOLD-1 … 5` mit „T_LV HBNI › Oldenburg · Kurzwahl 539" (Shot 05-vorschlag-olgold) — gut. „Oldenburg" findet nichts und sagt „Nicht im Fleetmapping: wird als eigene Rufgruppe mit diesem Namen angelegt"; die Gruppe „Oldenburg" (TMO) wurde so angelegt (Shot 05-vorschlag-oldenburg, 06), obwohl der Ordner „T_LV HBNI › Oldenburg" 15 Gruppen enthält. [Code] Gesucht wird nur im Namen, nicht im Ordner (`index.ts:67-69`); nach der Wahl wird nur der Name übernommen (`RufgruppeMaske.tsx:141`), Kurzwahl und Ordner stehen weder in der Liste noch im Ausdruck.
- **Erwartung der Rolle:** Ich tippe den OV- oder Regionalnamen und bekomme die Gruppen dieses Ordners. Die Kurzwahl steht im Funkplan, damit der Sprechfunker das Gerät schnell umstellen kann.
- **Auswirkung im Einsatz:** Freie Gruppen wie „Oldenburg" entstehen, die es auf keinem Gerät gibt; der Hinweis „Nicht im Fleetmapping" überzeugt nicht, wenn man den Ort richtig getippt hat. Ohne Kurzwahl wird die Ordnernavigation am Gerät zur Suche.
- **Empfehlung:** Auch im Ordner suchen; Kurzwahl und Ordner als Merkmal an der angelegten Gruppe führen und im Ausdruck neben den Namen setzen.
- **Verifikation:** „Oldenburg" tippen → Gruppen aus „T_LV HBNI › Oldenburg" erscheinen; nach der Wahl stehen Kurzwahl und Ordner in Liste und Ausdruck.

### P2-4 Arbeitsplätze sind nicht eindeutig benannt (Web-Schale)

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Prüfaufgabe 5 · Einsatzauswahl „Dieser Arbeitsplatz", Diagnose Spalte „Rechner", Tagebuch · `apps/desktop/src/web/web.ts:183`
- **Beobachtung:** [beobachtet] Ein neuer Browser startet mit Anzeigename „Arbeitsplatz", die Einstellungen sind zugeklappt, „Öffnen" geht sofort (Shot 29). Mehrere Plätze dürfen gleich heißen: die Diagnose listete viermal „S6 IuK" (Shot 18). Spalte „Rechner" zeigt bei allen Web-Plätzen „vm", ebenso das Tagebuch (Shot 39). [Code] Der Rechnername ist der des Dienstes (`web.ts:183`: `os.hostname()`), nicht der des Browsers. BETRIEB.md:30 sagt, die Einstellungen seien beim ersten Start offen — mit vom Dienst vorgegebenem Share sind sie es nicht.
- **Erwartung der Rolle:** Beim Einrichten eines neuen Platzes werde ich zum Namen gezwungen; ein zweites „S6 IuK" wird angesagt. In der Diagnose kann ich einen Platz einem Gerät zuordnen.
- **Auswirkung im Einsatz:** Im Tagebuch steht „Arbeitsplatz, vm" als Akteur — nachträglich nicht zuzuordnen. Im Störfall weiß ich nicht, an welchen Tisch ich gehen muss.
- **Empfehlung:** Beim ersten Öffnen eines Einsatzes ohne gesetzten Namen nach dem Namen fragen; doppelte Namen ansagen; in der Web-Schale statt des Server-Hostnamens etwas Unterscheidbares zeigen (z. B. Adresse des Browsers oder eine kurze Platzkennung).
- **Verifikation:** Neuer Browser → Einsatz öffnen verlangt einen Namen; zweiter Platz mit gleichem Namen erhält eine Warnung; Diagnose unterscheidet zwei Browser am selben Dienst.

### P3-1 Profil „Vermeldezentrale" öffnet auf der Lage, kein Zuschnitt für S6

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Einsatz öffnen · `apps/desktop/src/renderer/blaetter.ts:83-90`
- **Beobachtung:** [beobachtet] Mit Profil „Vermeldezentrale" (Reiter Funkplan · Lage · Einsatztagebuch) öffnete der Einsatz in jedem Lauf auf „Lage" (Shot 03), obwohl der Code sagt „Das erste Blatt ist das der Rolle". Ein Profil mit Funkplan und Diagnose für S6 gibt es nicht; Diagnose liegt im Fenstermenü „⋯".
- **Erwartung der Rolle:** Der Platz der Vermeldezentrale startet im Funkplan.
- **Auswirkung im Einsatz:** Ein Klick mehr nach jedem Öffnen; gering.
- **Empfehlung:** Nach dem Öffnen das erste Blatt des Profils zeigen.
- **Verifikation:** Profil Vermeldezentrale, Einsatz öffnen → Funkplan ist offen.

### P3-2 Kleinigkeiten in Ausdruck und Liste

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Funkplan als HTML, Rufgruppenliste links
- **Beobachtung:** [beobachtet] Kopf des Ausdrucks „Stand: Stand: 5.11.2026, 20:48:40" (Shot 16). In der schmalen Rufgruppenliste bricht der Name um („T_OL-" / „GOLD-1", Shot 11). Die Bereichszuordnung einer Rufgruppe steht im Ausdruck nicht. Die Diagnose zeigt im Protokoll interne Kennungen („Arbeitsplatz LdcGJXTl… geöffnet", „als akte-1") und ISO-Zeiten (Shot 18).
- **Erwartung der Rolle:** Rufgruppennamen nie umbrochen; Ausdruck ohne Doppelwort; Protokoll in Worten der Oberfläche.
- **Auswirkung im Einsatz:** Lesefehler bei ähnlichen Gruppennamen; geringe Zeitkosten.
- **Empfehlung:** Namen nicht umbrechen, Doppelwort entfernen, Bereich der Gruppe im Gruppenkopf drucken, Protokollzeilen mit Anzeigenamen.
- **Verifikation:** Ausdruck und Liste mit `T_OL-GOLD-1` ansehen.

### P3-3 Betriebsdoku und Paketknopf passen nicht mehr zur Oberfläche

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Prüfaufgabe 5 · `docs/v2/BETRIEB.md:97`, `:487`, `:253`; Diagnose „Neues Paket für die Führungsstelle holen"
- **Beobachtung:** [beobachtet] Der Knopf „Neues Paket für die Führungsstelle holen" steht in der Diagnose — auch in der Web-Schale, für die BETRIEB.md sagt, ein Container werde durch ein neues Bild aktualisiert. BETRIEB.md:97 verortet den Knopf „unter dem Lagebild", BETRIEB.md:487 „Nebenblätter → Diagnose" (heute Fenstermenü „⋯" → Diagnose, wie HANDBUCH.md richtig sagt). BETRIEB.md:253 nennt 10 s bis zum Banner; beobachtet waren 3 s (Shot 20) — schneller, also unkritisch. [nicht prüfbar] Desktop-Weg (Angebot aus `programm\`, Signaturprüfung) mangels Electron-Schale.
- **Erwartung der Rolle:** Die Betriebsseite führt mich genau dorthin, wo der Knopf ist; in der Web-Schale gibt es keinen Knopf, der für sie nichts bewirkt, oder er sagt das.
- **Auswirkung im Einsatz:** Suche im Störfall; ein S6 könnte am Web-Platz ein Paket holen, das dort niemand einspielt.
- **Empfehlung:** BETRIEB.md an die heutige Oberfläche angleichen; in der Web-Schale den Knopf mit dem Satz versehen, dass er nur Desktop-Plätze versorgt.
- **Verifikation:** Jede Fundstelle aus BETRIEB.md in der App nachklicken.

---

## Positives

- **Arbeitsvorrat statt leerer Seite:** „ohne Rufgruppe · hier beginnt die Arbeit" oben in der Zuordnung, mit Zahl im Band; „Bereich ≠ Gruppe" erschien sofort, als „Stab FüSt" einer Pumpwerk-Gruppe zugeordnet wurde. [beobachtet]
- **Fleetmapping-Vorschlag** findet auch ohne Trenner und Großschreibung („olgold"), zeigt Ordner und Kurzwahl und zwingt nichts auf. [beobachtet]
- **Funkproben** mit Grund (Pflicht bei „kein Kontakt"), Bearbeiter, Zeitfolge und Tagebuch-Eintrag; „kein Kontakt" setzt den letzten Kontakt nicht zurück. [beobachtet]
- **Ausdruck** mit Leerzeilen je Gruppe, Block „Ohne Rufgruppe — mit Ankunft zuordnen" und dem Satz „Änderungen handschriftlich nachtragen" — eine echte Papier-Rückfallebene. [beobachtet]
- **Zwei Plätze:** Änderung am anderen Platz nach rund 4,4 s sichtbar; eine offene Maske sperrt die Einheit sichtbar („🔒 wird von S6 IuK bearbeitet"), die Funkprobe bleibt trotzdem möglich, und die Sperre eines abgeschnittenen Platzes läuft nach 30 s von selbst aus. [beobachtet, Code `worker/bearbeitungssperren.ts:18`]
- **Verbindungsbanner:** nach 3 s gelb, ab 1 min rot, sagt „Eingaben werden nicht gespeichert und sind gesperrt"; eine offline versuchte Funkprobe wird ausdrücklich als „Nicht gespeichert" gemeldet und bleibt als Hinweis stehen. [beobachtet]
- **Diagnose** zeigt Fassung, Uhrabweichung, Rückstand und Pfade je Platz und die Störfälle in der App. [beobachtet]

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen — Funkplan aufstellen, ändern, Proben eintragen und ausgeben geht; Widerspruchsprüfung und Arbeitsplatzlage muss der S6 selbst leisten.
- **Nebenaufzeichnung auf Papier nötig:** ja — für die Funkprobenrunde mit tatsächlicher Funkzeit, für eine eigene Liste der vergebenen Funkrufnamen (Doppelprüfung) und für die Liste der wirklich besetzten Arbeitsplätze.
- **Größte Lücke an einer Übergabe:** Vom S6 an die Sprechfunker: Ausdruck, Monitor und Zelle geben doppelte Rufgruppen und doppelte Funkrufnamen ungeprüft weiter.
- **Größtes Einsatzrisiko:** Ein doppelt vergebener Funkrufname bleibt unbemerkt, und eine Meldung geht an die falsche Einheit.
- **Top-Priorität für die nächste Iteration:** Widersprüche im Funkplan (doppelter Rufgruppenname, doppelter Funkrufname) beim Anlegen ansagen und als Hinweis und Zahl im Funkplan führen.
