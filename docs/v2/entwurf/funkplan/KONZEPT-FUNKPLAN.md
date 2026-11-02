# Funkplan: die Vermeldezentrale der Führungsstelle aus der S1-Übersicht versorgen

Stand 2026-11-02. Das ist ein Entwurf, nichts davon ist umgesetzt. Der Text
legt fest, was gebaut würde und aus welchen Daten; `mockups-funkplan.html` im
selben Ordner zeigt, wie es aussähe (Runde 5, Optionen 5a bis 5e, Beispiellage
„Hochwasser Oldenburg" wie in `../oberflaeche/mockups.html` und `../s4/`).

Begriffe: Die Vermeldezentrale ist der Platz in der Führungsstelle, an dem
die Sprechfunker sitzen. Im THW heißt sie meist Fernmeldezentrale (FmZ) und
wird von der Fachgruppe Kommunikation gestellt; der Dienstposten „SprFu" aus
der Excel-Vorlage (`FüSt!B74`) ist ihr Platz im Blatt „Führungsstelle". Der
Funkplan ist die Übersicht, welche Einheit über welche Rufgruppe oder welchen
Kanal erreichbar ist und wer dort mithört. In der Papierwelt hängt er als
Blatt am Platz der Sprechfunker; die Fernmeldeskizze ist seine gezeichnete
Form. Dieser Entwurf baut das Blatt, nicht die Skizze.

Digitalfunk BOS kennt zwei Betriebsarten: TMO (Netzbetrieb über
Basisstationen, Rufgruppen aus der Fleetmap des Landes) und DMO
(Direktbetrieb von Gerät zu Gerät, begrenzte Reichweite, bei Netzausfall oder
im Funkloch, bei Bedarf über ein Fahrzeugfunkgerät als Gateway in das Netz
gebrückt). Dazu kommt stellenweise noch analoger 2-m- oder 4-m-Funk mit
Kanalnummern. Das Modell nimmt alle drei als „Rufgruppe" mit einer
Betriebsart auf; die Namen sind Freitext, weil die Fleetmap je Land anders
heißt und weil das Programm nicht wissen muss, was ein Name bedeutet. Alle
Rufgruppennamen in den Mockups sind erfunden.

## 1. Ausgangslage

Die S1-Übersicht hält heute je Einheit den Bereich, den Status, die Stärke,
die Führungskraft mit ihren Kontakten und die daraus abgeleitete
Erreichbarkeit (K9 in `kennzahlen.ts`: Override, sonst Führungskraft und
Kontakte, sonst die oberste Hierarchieebene). Je Fahrzeug hält sie den
Funkrufnamen als Struktur aus Kennwort, Ort und Kennzahlen (`FahrzeugAngelegt`,
§5.5 des Ereigniskonzepts), und `projektion/tabelle.ts` setzt ihn zu der Form
zusammen, in der er gesprochen wird: „Heros Oldenburg 21/51". Die Spalte
„Erreichbarkeit" steht in der Spaltengruppe RESSOURCENPLANUNG der
Einheitentabelle (Excel-Spalte L).

Für die Sprechfunker fehlen drei Dinge. Erstens die Rufgruppe: Nirgends
steht, über welche Gruppe die Führungsstelle eine Einheit ruft. Heute landet
das, wenn überhaupt, im Erreichbarkeits-Override („Funk Kanal 31" ist der
Prüffall in `kennzahlen.test.ts`) oder in der Bemerkung, und damit weder
filterbar noch zählbar noch auf einem Monitor darstellbar. Zweitens die
Rufgruppe als eigene Sache mit Zweck, Betriebsart und der Angabe, welcher
Platz der FmZ sie abhört: Ein Sprechfunker, der sechs Gruppen auf zwei
Geräten verteilt, braucht diese Liste, nicht die Einheitenliste. Drittens der
Kontakt: wann zuletzt eine Funkprobe oder eine Meldung über diese Gruppe
gelungen ist, damit eine Einheit, die seit zwei Stunden still ist, auffällt,
bevor jemand sie braucht.

Was es schon gibt und was der Entwurf wiederverwendet: den Monitor mit
mehreren Ansichten, Kontextmenü, Hover-Leiste und Tasten (Runde 4,
`Monitoransichten.tsx`), die Spaltengruppen der Einheitentabelle als
Umschalter, die Einheitenmaske mit Karteireitern, die Bearbeitungssperre je
Datensatz, die Ausgaben in den Ordner `ausgaben\` und den Papier-Vordruck
„Funkprotokoll" (`packages/ausgaben/src/papier.ts`), der mit dem Feld
„Funkkreis / Kanal" genau die Namen meint, die der Funkplan führt.

## 2. Was die Vermeldezentrale wissen muss und woher es kommt

| Frage der Sprechfunker | Quelle im Modell | Stand |
|---|---|---|
| Über welche Rufgruppe rufe ich diese Einheit? | Hauptrufgruppe je Einheit (neu) | neu |
| Wo hört sie sonst noch mit? | weitere Rufgruppen je Einheit (neu) | neu |
| Wie heißt sie über Funk? | Funkrufname des Führungsfahrzeugs, Override je Einheit | vorhanden, Ableitung neu |
| Wen rufe ich an, wenn Funk nicht geht? | Erreichbarkeit K9 (Führungskraft, Kontakte) | vorhanden |
| Was muss ich zu dieser Einheit wissen? | Funkhinweis je Einheit (neu, Freitext) | neu |
| Welche Rufgruppen gibt es im Einsatz, wofür, in welcher Betriebsart? | Rufgruppe als Entität mit Zweck und Betriebsart (neu) | neu |
| Welcher Platz der FmZ hört welche Gruppe ab? | Feld „hört" an der Rufgruppe (neu, Freitext) | neu |
| Läuft eine Gruppe über einen Gateway, welches Fahrzeug? | Feld „Gateway" an der Rufgruppe (neu, Fahrzeugbezug oder Text) | neu |
| Wann hatten wir zuletzt Kontakt? | Funkprobe (neu, Ereignis mit Funkzeit), sonst letzte Statusmeldung (`StatusGesetzt.ereignisZeit`) | teils vorhanden |
| Wer steht noch ohne Rufgruppe da? | Einheiten ohne Hauptrufgruppe, gezählt | ableitbar |
| In welchem Bereich und Status ist die Einheit? | `wirksamerAbschnittId`, `status` | vorhanden |
| Wer ist gerade angemeldet, wer im Anmarsch? | Status, Bereich ANGEFORDERT, Eingang | vorhanden |

Alles in der Spalte „vorhanden" wird gelesen, nicht gepflegt: Der Funkplan
schreibt keinen Status und keine Stärke. Umgekehrt pflegt die Einheitentabelle
die Rufgruppe mit, damit der S1 sie beim Erfassen gleich setzen kann, ohne
das Blatt zu wechseln. Zwei Arbeitsplätze, dieselbe Zelle, dasselbe
Ereignis.

## 3. Ableitungsregeln

Funkrufname der Einheit: Override an der Einheit, sonst der Funkrufname des
ersten Fahrzeugs der Einheit mit gesetztem Funkrufnamen in der Reihenfolge
der Untertabelle, sonst leer. Das ist dieselbe Dreistufigkeit wie K9 und
bekommt die nächste freie Nummer der Kennzahlen. Welches Fahrzeug das
Führungsfahrzeug ist, weiß das Modell nicht; wer einen anderen Namen will,
überschreibt. Die Regel ist bewusst einfach, weil eine falsche Automatik hier
schlimmer ist als eine leere Zelle.

Letzter Kontakt: der jüngere Zeitpunkt aus der letzten Funkprobe mit Ergebnis
„Kontakt" und der fachlichen Zeit der letzten Statusmeldung der Einheit
(`ereignisZeit`, sonst Wanduhr). Älter als die Schwelle (Startwert 60
Minuten, Entscheidung 4) wird die Zelle Bernstein, auf dem Monitor der
Kachelrahmen. Eine Funkprobe mit Ergebnis „kein Kontakt" setzt den letzten
Kontakt nicht zurück, sondern steht als eigener Hinweis daneben. Einheiten im
Status Rufbereitschaft, Einsatzvorbehalt, Angefordert und Rückmarsch werden
nicht als „kein Kontakt" geführt: Wer noch nicht da oder schon weg ist, muss
nicht funken.

Ohne Rufgruppe: jede Einheit, die zählt oder erwartet wird und keine
Hauptrufgruppe trägt. Entfernte Einheiten und solche in Ruhe fallen nicht
heraus, denn auch eine ruhende Einheit muss erreichbar sein. Die Zahl steht
im Band des Blattes und im Fuß des Monitors.

Eine aufgelöste Rufgruppe bleibt in der Liste blass stehen, wie ein
aufgelöster Abschnitt. Einheiten, die noch auf ihr stehen, zählen ab der
Auflösung als „ohne Rufgruppe", bis jemand sie umsetzt. Das Auflösen setzt
nichts um, denn die Umsetzung ist eine fachliche Entscheidung je Einheit, und
der Fold trifft keine.

## 4. Der Monitor: Ansicht „Funkplan"

Der Monitor bekommt eine sechste Ansicht neben Stärke und den vier
Versorgungsbildern (Option 5a). Sie folgt nicht der Regel „eine große Zahl",
weil die Frage der Sprechfunker keine Zahl ist, sondern eine Zuordnung. Sie
folgt der Tafel aus Runde 4: Beschriftung oben, Tabelle, taktische Zeit und
Fuß unten, Schriftgrad aus `schriftgroesse` nach Fenstergröße.

Eine Zeile je Rufgruppe. Links der Name groß in Mono, darunter der Zweck;
daneben die Betriebsart als Rahmenmarke, DMO in Bernstein, weil die
Reichweite begrenzt ist und der Sprechfunker den Gateway im Kopf haben muss,
Analog gestrichelt; darunter, wer abhört. Rechts die Teilnehmer als Kacheln
mit Bezeichnung und Funkrufname. Die linke Kante jeder Kachel trägt den
Einheitenstatus in den Farben der Statusmarke (grün einsatzbereit oder im
Einsatz, grau Ruhe, Bernstein Anmarsch, Rot nicht einsatzbereit); ein
Bernsteinrahmen um die ganze Kachel heißt „kein Kontakt seit mehr als 60
Minuten", mit der Zeit des letzten Kontakts im Kleingedruckten.

Der Fuß nennt die offene Arbeit, immer in Bernstein: Einheiten ohne
Rufgruppe mit Namen, Einheiten ohne Kontakt als Zahl. Dann Einsatz, Zeit und
Stand wie bei jeder Ansicht.

Bei mehr als sechs Rufgruppen läuft die Tafel seitenweise im Takt des
Wechsels, wie die Versorgungstafel bei mehr als acht Bereichen. Aufgelöste
Rufgruppen erscheinen auf dem Monitor nicht; eine Gruppe ohne Teilnehmer
erscheint mit leerer Teilnehmerzelle, weil sie dann gerade die Frage ist.

Umschaltung, Kontextmenü, Hover-Leiste, Tasten (6 für den Funkplan) und
Wechselschalter sind aus Runde 4 und werden nicht neu gebaut. Die
Monitordatei `monitor.html` auf dem Share bleibt unverändert; ob eine zweite
Datei `funkplan.html` dazukommt, ist Entscheidung 6.

## 5. Das Blatt „Funkplan"

Ein eigener Reiter im Kopfband zwischen Führungsstelle und Versorgung
(Option 5b; ob er stattdessen eine Unteransicht der Führungsstelle wird, ist
Entscheidung 1). Das Band darüber nennt sechs Zahlen: Rufgruppen, zugeordnete
Einheiten, ohne Rufgruppe (Bernstein ab eins), kein Kontakt über der Schwelle
(Bernstein ab eins), DMO oder Gateway, Zeit der letzten Funkprobe.

Links die Karte „Rufgruppen": eine Zeile je Gruppe mit Betriebsart als
Marke, Name in Mono, Zweck und abhörendem Platz, Zahl der Teilnehmer;
aufgelöste blass am Ende. Unter der Liste ein Kasten mit den Feldern der
gewählten Gruppe (Betrieb, Zweck, hört mit, gültig ab mit Akteur, Gateway,
Bemerkung) und den Knöpfen Bearbeiten und Auflösen. „Rufgruppe anlegen" ist
der Hauptweg in der Werkzeugzeile; die Anlage ist eine kleine Maske mit
Betriebsart, Name, Zweck, hört, Gateway, Bemerkung.

Rechts die Karte „Zuordnung": alle Einheiten, gruppiert nach Hauptrufgruppe
wie die Gliederung der Einheitentabelle nach Bereichen, mit Kopfzeile je
Gruppe (Marke, Name, Zweck, Teilnehmerzahl, hört). Spalten: Einheit,
Bereich, Status, Funkrufname, Erreichbarkeit, Funkhinweis, letzter Kontakt.
Die Gruppe „ohne Rufgruppe" steht immer zuletzt und immer sichtbar, auch
wenn sie leer ist, denn dort beginnt die Arbeit nach jeder Ankunft. Die
Rufgruppe wird in der Zelle bearbeitet (Doppelklick, Auswahlliste mit allen
Gruppen, „keine Rufgruppe", „Neue Rufgruppe anlegen"), der Funkhinweis als
Textzelle; Funkrufname und Erreichbarkeit sind hier Ableitungen und werden
in der Maske überschrieben, nicht in der Zelle.

Der Umschalter kennt drei Sichten: „Je Rufgruppe" (die beschriebene), „Je
Bereich" (dieselben Zeilen nach Bereich gruppiert, mit der Rufgruppe als
Spalte; die Sicht des S1, der fragt, ob sein Abschnitt vollständig erreichbar
ist) und „Funkproben" (die Funkproben als Zeitfolge mit Einheit, Rufgruppe,
Ergebnis, Akteur). „Funkprobe eintragen" schreibt für die markierte Einheit
eine Funkprobe mit der aktuellen Funkzeit und Ergebnis „Kontakt"; „kein
Kontakt" fragt nach einem Grund. Die Suche findet Einheit, Funkrufname und
Rufgruppe.

Die Bearbeitungssperre gilt je Rufgruppe wie je Einheit (`bearbeitungssperren.ts`
im Worker): Wer eine Gruppe in der Maske offen hat, sperrt sie für andere
Arbeitsplätze; die Zelle der Zuordnung läuft über die Sperre der Einheit.
Nach dem Schreiben gelten die üblichen Wege: lokale Aktualisierung, Spiegel
auf den Share, Poll der anderen Arbeitsplätze.

## 6. Einheitentabelle und Maske

Die Einheitentabelle bekommt eine sechste Spaltengruppe FUNK (Option 5c,
additiv in `projektion/tabelle.ts`, Strg+6): Rufgruppe (Auswahlspalte,
schreibt die Hauptrufgruppe), Funkrufname (berechnet), Erreichbarkeit (die
bestehende Spalte L, hier noch einmal gezeigt, weil sie zur Frage gehört;
Entscheidung 7, ob sie wandert), Funkhinweis (Textspalte), letzter Kontakt
(berechnet, Marke ab der Schwelle). Die Gruppe ist in der Vorbelegung
ausgeblendet wie Logistik und Kosten. Die DMO-Marke steht in der Zelle der
Rufgruppe, weil der Sprechfunker bei DMO etwas anderes tun muss als bei TMO.

Die Einheitenmaske bekommt einen vierten Karteireiter „Funk und
Erreichbarkeit" (Option 5d): Hauptrufgruppe (Auswahl), weitere Rufgruppen
(Chips), Funkrufname (Ableitung mit „Überschreiben"), Erreichbarkeit (K9 mit
„Überschreiben", wie heute), Funkhinweis (mehrzeilig), letzter Kontakt mit
den Knöpfen „Funkprobe jetzt: Kontakt" und „kein Kontakt". Darunter der
Tagebuchauszug zu dieser Einheit, gefiltert auf die Ereignisse dieses
Konzepts. Jede Änderung ist ein Ereignis mit gesehenem Vorher-Wert; ein
zweiter Arbeitsplatz am selben Feld erzeugt den Konflikthinweis aus §2.2a
des Ereigniskonzepts.

## 7. Ausgaben

„Funkplan" wird eine Ausgabe wie Einheitenliste und Status-Matrix (Option
5e): A4 hoch, Kopf mit Einsatz, Führungsstelle, Stand und Akteur, je Rufgruppe
eine Kopfzeile mit Betriebsart, Name, Zweck und abhörendem Platz, darunter die
Teilnehmer mit Bereich, Funkrufname, Erreichbarkeit und Hinweis, dann eine
leere Zeile. Am Ende „Ohne Rufgruppe" und zwei leere Zeilen. Die leeren
Zeilen sind Absicht: Der Ausdruck hängt am Platz der Sprechfunker und wird
mit Stift weitergeführt, wenn der Rechner steht; nachgetragen wird später im
Rechner. HTML und PDF, Dateiname mit Zeitpunkt, Ordner `ausgaben\`.

Der Papier-Vordruck bekommt eine vierte Seite „Funkplan (leer)" mit denselben
Spalten und ohne Daten, für den Fall, dass vor dem Einsatz noch nichts
erfasst ist. Das Funkprotokoll bleibt, wie es ist.

Eine gezeichnete Fernmeldeskizze (Führungsstelle in der Mitte, Rufgruppen
als Linien zu den Abschnitten) ist nicht Teil dieses Entwurfs; sie ist
Entscheidung 8, und sie würde aus denselben Daten gezeichnet wie die
Führungsharke aus dem Abschnittsbaum.

## 8. Datenmodell und Ereignisse (Vorschlag, additiv)

Neue Entität im Zustand, mit denselben Rahmenfeldern wie Abschnitt und
Einheit (§3.2 des Ereigniskonzepts: Anlage, Feld, verworfene Anlagen):

Rufgruppe: id, betriebsart (TMO, DMO, ANALOG als bekannte Werte eines
offenen Bereichs nach §3.7, unbekannte Werte werden gefaltet und erzeugen
`unbekannterWert`), name, zweck, hoert (Freitext, welcher Platz oder welche
Stelle abhört), gateway (Freitext oder Fahrzeugkennung), bemerkung,
reihenfolge, aufgeloest (Zeitpunkt). Ereignisse `RufgruppeAngelegt` (Form b),
`RufgruppeGeaendert` (Form a, feld aus der Aufzählung der Felder, LWW je
Feld), `RufgruppeAufgeloest` (Form a, Pflichtgrund nach §2.4) und
`RufgruppeWiederhergestellt`. Die Kollisionsregel für zwei Anlagen derselben
Id gilt wie bei allen Entitäten (§3.11). Der Name ist nicht eindeutig
erzwungen: Zwei Arbeitsplätze, die ohne Verbindung dieselbe Gruppe anlegen,
erzeugen zwei Einträge, und das Blatt zeigt beide; zusammenführen ist
Handarbeit und Entscheidung 9.

An der Einheit drei neue Felder: rufgruppeId (die Hauptrufgruppe, Feld<Id>),
weitereRufgruppenIds (Feld<readonly Id[]>, LWW über die ganze Liste wie
`hierarchie`), funkHinweis (Feld<string>), funkrufnameOverride (Feld<string>,
Gegenstück zu `erreichbarkeitOverride`). Ereignis `EinheitRufgruppeGesetzt`
(Form a, Feld `rufgruppeId`, `vorher` die gesehene Gruppe, `neu` die neue
oder `null` für „keine"; `grund` optional und ins Tagebuch). Die übrigen drei
Felder kommen als weitere Werte in die Aufzählung von
`EinheitStammdatenGeaendert.feld`, weil sie Stammdaten sind und keine
Fachhandlung. Eine eigene Ereignisart für den Rufgruppenwechsel lohnt sich,
weil er im Tagebuch eine Zeile für sich ist („Rufgruppe THW_OL_BR → THW_OL_EA2,
Grund: Abschnitt EA 2 gebildet") und weil die Projektion ihn für den
letzten Kontakt nicht mit einer Bemerkungsänderung verwechseln darf.

Funkprobe: `FunkprobeDurchgefuehrt` (Form a auf das Feld
`letzteFunkprobe` der Einheit, LWW; Nutzlast einheitId, rufgruppeId,
ergebnis KONTAKT oder KEIN_KONTAKT, `ereignisZeit` als fachliche Zeit wie bei
`StatusGesetzt`, `grund` bei KEIN_KONTAKT Pflicht). Das Feld hält nur die
letzte Probe; die Zeitfolge aller Proben ist eine Projektion des
Ereignisstroms wie das Tagebuch, nicht Teil des Zustands. Damit bleibt der
Zustand klein, und die Sicht „Funkproben" braucht keine Liste in der Akte.

Verschieben einer Einheit in einen anderen Bereich ändert ihre Rufgruppe
nicht. Das ist eine bewusste Nicht-Regel: Ob ein Abschnittswechsel einen
Gruppenwechsel bedeutet, weiß nur die Führungsstelle. Das Blatt zeigt den
Fall aber: Steht an einer Rufgruppe ein Zweck mit Bereichsbezug (Feld
`abschnittId` optional an der Rufgruppe, Entscheidung 3), erscheint eine
Einheit, deren Bereich davon abweicht, mit einem Hinweis „Bereich ≠ Gruppe"
in der Zuordnung.

`FOLD_VERSION` steigt um eins (§3.9). Die Vorlagen (`vorlagen/thw.ts`)
bleiben unverändert; eine Rufgruppe ist einsatzgebunden und keine Stammdatei.

Das `Lagebild` wächst um ein kleines Feld `funk`: Zahl der Rufgruppen, Zahl
der zugeordneten Einheiten, Zahl ohne Rufgruppe, Zahl ohne Kontakt über der
Schwelle, Zeit der letzten Funkprobe. Fünf Zahlen, derselbe Umfang wie
`versorgung`. Die Tafel des Monitors und das Blatt holen die Zuordnung mit
einem eigenen Ruf `funkplanAnfordern` nach dem Muster von
`versorgungAnfordern`, gefiltert und mit Zeigerstand.

## 9. Architektur und Schnitte

Rechnung in `packages/domaene/src/projektion/funkplan.ts` neben
`versorgung.ts` (Zuordnung je Rufgruppe und je Bereich, Funkrufname der
Einheit, letzter Kontakt, ohne Rufgruppe, Funkprobenfolge); Entität,
Schemata und Katalogeinträge in `katalog/`; die Spalten der Gruppe FUNK in
`projektion/tabelle.ts`; die Ausgabe `funkplan` und der vierte Vordruck in
`packages/ausgaben`; Kontrakt additiv in `apps/desktop/src/kontrakt`;
Renderer `Funkplan.tsx` mit Rufgruppenliste, Zuordnung und Funkprobensicht
als eigene Dateien unter 400 Zeilen, der Monitor bekommt
`MonitorFunkplan.tsx` neben `Monitoransichten.tsx`, die Einheitenmaske den
vierten Reiter als eigene Datei. Der Main bekommt nichts Neues; der Worker
erweitert `bearbeitungssperren.ts` um die Entität Rufgruppe. Die Web-Schale
braucht keine Änderung.

Senkrecht geschnitten, jeder Schnitt für sich prüfbar und nützlich:

F1 Rufgruppe als Entität, Hauptrufgruppe je Einheit, Spaltengruppe FUNK mit
Rufgruppe und Funkrufname, Blatt „Funkplan" mit Rufgruppenliste und
Zuordnung je Rufgruppe, Ausgabe „Funkplan". Tests: Fold für Anlage,
Änderung, Auflösung, Rücknahme; Zuordnung mit aufgelöster Gruppe; Funkrufname
Override gegen Fahrzeug; Konflikthinweis bei zwei Arbeitsplätzen an derselben
Rufgruppe; Ausgabe gegen Prüfdaten.

F2 Funkhinweis, weitere Rufgruppen, Funkrufname-Override, Reiter in der
Maske, Sicht „Je Bereich", Suche. Tests: Maske in jsdom, Tagebuchzeilen.

F3 Funkprobe als Ereignis, letzter Kontakt, Schwelle, Marke in Tabelle und
Blatt, Sicht „Funkproben", Bandzahlen. Tests: Rangfolge Funkprobe gegen
Statusmeldung, Statusfilter, Schwelle am Rand, KEIN_KONTAKT ohne Rückstellung.

F4 Monitoransicht „Funkplan" mit Kacheln, Fuß, seitenweisem Lauf,
Lagebildfeld `funk`. Tests: Monitor in jsdom mit null, sechs und neun
Rufgruppen; Kachelstatus je Einheitenstatus; `funk` gegen die Projektion.

Nach jedem Schnitt `typecheck`, `lint`, betroffene Tests; bei F1 und F3
(Fold, Katalog, Sync) der volle Lauf. Dokumentation: `HANDBUCH.md` bekommt
den Abschnitt „Funkplan" in der erzeugten Ansichtenliste, `README.md` den
Reiter.

## 10. Offene Entscheidungen

1. Eigener Reiter „Funkplan" im Kopfband oder Unteransicht des Blattes
   „Führungsstelle"? Der Entwurf zeigt den Reiter: Die Vermeldezentrale
   arbeitet den ganzen Einsatz in dieser Ansicht, und ein Reiter mehr kostet
   nichts. Dagegen spricht, dass das Kopfband mit elf Reitern eng wird.
2. Eine Hauptrufgruppe je Einheit plus Liste weiterer Gruppen, oder nur eine
   Liste ohne Rang? Vorschlag: Hauptgruppe plus Liste. Der Sprechfunker
   braucht eine Antwort auf „wie rufe ich", nicht drei.
3. Rufgruppe mit optionalem Bereichsbezug (`abschnittId`), damit das Blatt
   „Bereich ≠ Gruppe" zeigen kann? Vorschlag: ja, optional, ohne Automatik.
4. Schwelle für „kein Kontakt": 60 Minuten als Startwert, je Einsatz
   einstellbar wie die Kostenparameter, oder fest? Vorschlag: Parameter am
   Einsatz mit Vorbelegung 60.
5. Funkrufname je Einheit als Ableitung aus dem ersten Fahrzeug, oder soll
   das Fahrzeug eine Markierung „Führungsfahrzeug" bekommen? Vorschlag:
   zunächst die Ableitung mit Override; die Markierung wäre eine Änderung am
   Fahrzeugschema und damit am geteilten Kern.
6. `funkplan.html` als zweite Monitordatei auf dem Share, oder reicht das
   Zweitfenster?
7. Wandert die Spalte „Erreichbarkeit" (L) aus RESSOURCENPLANUNG nach FUNK,
   bleibt sie, oder erscheint sie in beiden Gruppen? Der Entwurf zeigt sie in
   beiden; eine Spalte in zwei Gruppen ist in `tabelle.ts` heute nicht
   vorgesehen.
8. Fernmeldeskizze als gezeichnete Ausgabe, aus denselben Daten wie die
   Führungsharke? Später, nicht in F1 bis F4.
9. Zwei Arbeitsplätze legen offline dieselbe Rufgruppe an: zwei Einträge
   mit gleichem Namen. Zusammenführen als eigenes Ereignis
   (`RufgruppeZusammengefuehrt` nach dem Muster der Einheiten) oder
   Auflösen der einen und Umsetzen der Teilnehmer von Hand?
10. Gehört die Rufgruppe in den Erfassungsbogen, damit eine Einheit sie
    selbst meldet? Das wäre eine Änderung am geteilten Kern `eeb-format` und
    damit an erfassungsbogen.app; der Entwurf nimmt die Rufgruppe nur aus der
    Führungsstelle an.
11. Rufgruppe je Fahrzeug statt je Einheit, weil ein Zug Fahrzeuge auf
    verschiedenen Gruppen haben kann? Vorschlag: je Einheit; ein
    abweichendes Fahrzeug steht im Funkhinweis. Wenn der Bedarf sich zeigt,
    ist ein optionales Feld am Fahrzeug additiv.
12. Vertraulichkeit: Fleetmap-Unterlagen der Länder sind teils als VS-NfD
    eingestuft. Die Akte liegt auf dem Share und der Ausdruck am Platz. Das
    Konzept speichert nur, was der Bediener eintippt, und die Namen sind im
    Einsatz ohnehin auf jedem Funkgerät sichtbar. Ob die Ausgabe einen
    Hinweis zur Handhabung trägt, entscheidet die Führungsstelle.
