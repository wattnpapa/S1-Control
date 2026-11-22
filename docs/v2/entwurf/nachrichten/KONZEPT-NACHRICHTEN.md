# Nachrichten: der 4-fach-Vordruck in der Führungsstelle

Entwurf vom 2026-11-16. Status: umgesetzt in den Schnitten N1 bis N3
(Abschnitt 10); Abweichungen in UMSETZUNGSBERICHT.md, Aufnahmen unter stand/.
Beschlossen am 2026-11-16 (Johannes), die Entscheidungen stehen in Abschnitt 11
und gehen den Abschnitten 4 bis 10 vor, wo diese noch den Vorschlag
beschreiben.

Begriffe: Der Nachrichtenvordruck (THW-Vordruck 1103.1, im Sprachgebrauch
„4-fach-Vordruck") ist der Satz aus vier selbstdurchschreibenden Blättern
DIN A5 (blau, grün, rot, gelb), auf dem in einer Führungsstelle jede
Nachricht niedergeschrieben wird, die hereinkommt, hinausgeht oder zwischen
zwei Stellen des Stabes gewechselt wird. Er ist in drei Teile geteilt: oben
die Vermerke der Fernmeldezentrale (FmZ), in der Mitte die Nachricht selbst,
unten der Laufzettel mit Quittung des Sichters, Verteiler und Vermerken. Die
Lehrunterlage 4311.4 des LV HBNI (Oktober 2017) und die Ausfüllanleitung des
Ausbildungszentrums (April 2022) beschreiben die zwanzig Felder und die
Laufwege; DV 1-100 §8.2 verlangt, dass „alle Nachrichten zügig den/die
zuständigen Empfänger/Bearbeiter erreichen" und die Wege in der
Stabsdienstordnung geregelt sind.

Dieser Entwurf baut den Vordruck als Ereignisstrom in S1-Control nach, damit
die Stellen der Führungsstelle untereinander ohne Papier verkehren können,
und er bindet `bos-nachrichtenvordruck` ein, damit jede Nachricht trotzdem
als maßhaltiger Vordruck aus dem Drucker kommt. Papier bleibt Rückfallebene,
nicht Voraussetzung.

## 1. Ausgangslage

S1-Control führt heute Kräfte, Abschnitte, Versorgung, Funkplan und ein
Einsatztagebuch, in dem jedes Ereignis eine Zeile ist. Was zwischen den
Stellen gesprochen oder geschrieben wird, hat keinen Ort: Die Maske „Eintrag
ins Einsatztagebuch" (`TagebuchEintrag.tsx`) nimmt einen Funkspruch oder
Rückruf als Freitext mit Vorsatz „Funk:" auf, aber ohne Empfänger, ohne
Vorrang, ohne Quittung und ohne Laufweg. Der Eingangskorb (`Eingangskorb.tsx`)
ist für Erfassungsbögen des Meldekopfs gebaut, nicht für Nachrichten.

Der Audit des analog-first-Reviewers (`docs/audits/thw-analog-first-reviewer.md`,
Fundstelle 166) wünscht sich die Datum-Zeit-Gruppe in der Schreibweise des
Vordrucks („181432SEP26") statt ISO-Zeit. Das wird hier mit erledigt.

Als Vorbild liegt eStab vor (`wattnpapa/estab`), „der computerunterstützte
Nachrichtenvordruck" aus dem Kreis Heinsberg (2005, ab 2007 mit THW-Beteiligung),
eine PHP-Anwendung mit MariaDB, Framesets und FPDF. Das Handbuch sagt im
Vorwort, worauf es ankam: „Sehr großer Wert wird auf eine starke Ähnlichkeit
mit der Papiervariante gelegt." Was davon übernommen wird, steht in
Abschnitt 2; technisch wird nichts übernommen (Server, SQL-Verkettung,
Klartextpasswörter, Meta-Refresh).

Als Baustein liegt `bos-nachrichtenvordruck` vor (`wattnpapa/bos-nachrichtenvordruck`,
v1.0.0, EUPL-1.2): eine jsPDF-Bibliothek, die Nachrichten- und Meldevordruck
als Vektorgrafik auf 0,01 mm nach der InDesign-Vorlage zeichnet, A5 hoch, zwei
auf A4 quer. Reines ESM-TypeScript ohne `node:` und ohne DOM, einzige
Laufzeitabhängigkeit `jspdf`. Sie ist in S1-Control noch nicht eingebunden;
die Einbindung steht in Abschnitt 8.

## 2. Was eStab lehrt

Das Feldmodell von eStab folgt der Nummerierung des Vordrucks (Spalten
`01_medium` bis `17_vermerke`), und die Statusfolge ist knapp: vom Stab
geschrieben und vor der FmZ (2), von der FmZ aufgenommen und vor dem
Sichter (4), gesichtet und verteilt (8). Fünf Regeln daraus tragen auch hier.

Erstens: Nummeriert wird in der Nachweisung der FmZ, fortlaufend, mit einem
Zähler für Eingang und Ausgang gemeinsam oder getrennt (Konfiguration
`Nachweisung`). Nach einem Ausfall darf der Zähler nur hochgesetzt werden,
nie zurück, damit Papiernummern aus der Ausfallzeit frei bleiben
(`set_number_after_crash.php`).

Zweitens: Gelesen und erledigt sind zwei Dinge. Gelesen gilt je Person,
erledigt je Funktion (Tabellen `usr_<funktion>_<kürzel>_read` und
`usr__fkt_<funktion>_erl`). Der Posteingang eines Sachgebiets zeigt beides
als zwei Marken.

Drittens: Der Verteiler ist eine Menge von Funktionen mit Kopiefarbe. Die
rote Kopie geht immer an S2 (`mtx_rc2`), die grüne an den Hauptempfänger oder
zurück zum Verfasser, die blauen an Mitleser. Die Farbe bestimmt beim
Empfänger den Hintergrund des Vordrucks; so weiß jeder beim Aufschlagen, ob
er handeln oder nur wissen soll.

Viertens: Ist kein Sichter angemeldet, sichtet, wer die Nachricht aufnimmt
(„Ersatzsichter", `sichter_online()` und `mtx_auto`). Eine kleine
Führungsstelle ohne Stab darf nicht an einem leeren Stuhl hängen bleiben.

Fünftens: Eine Nachricht, die ein Fernmelder zur Beförderung geöffnet hat, ist
für andere Fernmelder gesperrt (`x02_sperre`, `x03_sperruser`), und die Sperre
ist auf Anordnung lösbar. Dasselbe tut die weiche Bearbeitungssperre von
S1-Control (`bearbeitungssperren.ts`), nur ohne Anordnung, weil die
Vorwertprüfung den Rest fängt.

Was nicht übernommen wird: Rollen und Rechte. eStab schaltet Felder nach
Login-Funktion frei; S1-Control kennt nach Entscheidung 9 des
Umsetzungsplans keine Rechte, nur den Akteur je Ereignis. Die Stelle eines
Arbeitsplatzes ist hier ein Zuschnitt wie das Profil, kein Recht (Abschnitt 4).
Auch die Vorrangstufe „Staatsnot" (`aaa`) fehlt auf dem THW-Vordruck und
bleibt weg; die Lehrunterlage nennt sie, der Vordruck hat nur Sofort und
Blitz.

## 3. Der Vordruck Feld für Feld

Die Nummern sind die der Ausfüllanleitung (April 2022). Die Spalte „wer"
nennt die Stelle, die das Feld auf Papier ausfüllt; die letzte Spalte sagt,
wo der Wert in S1-Control steht.

| Nr. | Feld | wer | S1-Control |
|---|---|---|---|
| 1 | Fernmeldemittel (Funk, Telefon, Telefax, DFÜ, Kurier/Melder) | FmZ | `aufnahme.mittel` bzw. `befoerderung.mittel` |
| 2 | Aufnahmevermerk: Datum, Uhrzeit, Handzeichen | FmZ bei Eingang | `aufnahme` |
| 3 | Annahmevermerk: Uhrzeit, Handzeichen | FmZ bei Ausgang | `annahme` |
| 4 | Beförderungsvermerk: Datum, Uhrzeit, Handzeichen | FmZ bei Ausgang | `befoerderung` |
| 5 | Technisches Betriebsbuch: Eingang/Ausgang, laufende Nummer | FmZ | `richtung`, `nachweis.nummer` |
| 6 | Rufname der Gegenstelle, Spruchkopf | FmZ | `gegenstelle` |
| 7 | Übermittlungswunsch | Verfasser | `uebermittlungswunsch` |
| 8 | Durchsage oder Spruch | Verfasser | `art` |
| 9 | Sofort oder Blitz | Verfasser | `vorrang` |
| 10 | Anschrift (Stelle, keine Eigennamen) | Verfasser | `anschrift` |
| 11 | Ruf-Nr. der Gegenstelle | Verfasser | `rufnummer` |
| 12 | Gesprächsnotiz | Verfasser | `gespraechsnotiz` |
| 13 | Inhalt (Betreff) | Verfasser | `betreff` |
| 14 | Nachricht/Text | Verfasser | `inhalt` |
| 15 | Absender (Stelle, keine Eigennamen) | Verfasser | `absender` |
| 16 | Abfassungszeit (mindestens vierstellig) | Verfasser | `abfassungszeit` |
| 17 | Zeichen, Funktion | Verfasser | `zeichen`, `funktion` |
| 18 | Quittung: Uhrzeit, Zeichen | Sichter | `sichtung.uhrzeit`, `sichtung.zeichen` |
| 19 | Verteiler (Leiter, S1 bis S6, Fachberater, Verbindungsstellen) | Sichter | `sichtung.verteiler` |
| 20 | Vermerke, Erledigung | Sichter | `sichtung.vermerke` |

Drei Dinge, die der Vordruck nicht hat und die hier dazukommen, weil die
Anwendung sie weiß: der Akteur und der Arbeitsplatz jedes Eintrags (das
Handzeichen bleibt daneben, weil der Ausdruck es braucht), die Kenntnisnahme
und Erledigung je Stelle des Verteilers (auf Papier ein Blick in den Ablagekorb,
hier zwei Ereignisse), und der Bezug einer Antwort auf die Nachricht, die sie
beantwortet.

Eine Nachricht hat genau eine Richtung. Eingang heißt: Sie kam von außen über
die FmZ oder als Gesprächsnotiz einer Stelle herein und läuft zum Sichter.
Ausgang heißt: Eine Stelle hat sie verfasst, sie läuft zur FmZ und von dort
hinaus. Der Verkehr zwischen zwei Stellen des Stabes ist nach der
Lehrunterlage (Folie 31) ein Eingang über den Sichter: Was S1 an S4 schreibt,
geht an den Sichter, der es quittiert und verteilt. Eine Abkürzung „direkt an
S4" gibt es deshalb bewusst nicht; dass der Sichter in einer kleinen
Führungsstelle dieselbe Person wie der Verfasser sein kann, regelt
Abschnitt 5.

## 4. Stelle und Handzeichen des Arbeitsplatzes

Jeder Arbeitsplatz bekommt in den Einstellungen neben Anzeigename und Profil
zwei Angaben: die Stelle und das Handzeichen. Die Stelle ist ein Wert aus
der Liste des Vordrucks (Leiter, S1, S2, S3, S4, S6, Fachberater,
Verbindungsstelle, Sichter, LdF, Fm1, Fm2, Fm3; ergänzt 2026-11-21: die
Stelle FmZ ist auf den LdF und die Fernmelder Fm1 bis Fm3 aufgeteilt, der
Wert `FMZ` bleibt als Fernmelder ohne Nummer lesbar, `fernmelderstellen.ts`)
oder ein freier Name; das Handzeichen sind
zwei bis vier Zeichen, wie sie der Vordruck in Feld 2 bis 4, 17 und 18
verlangt. Beide stehen in der Präsenzdatei, damit die anderen Arbeitsplätze
sehen, welche Stellen besetzt sind, und beide sind ein Zuschnitt, kein Recht (beim oberen Teil des Vordrucks
mit einem Hinweis, Entscheidung 13):
Wer „S4" einstellt, sieht den Posteingang des S4 zuerst; die übrigen
Posteingänge bleiben über den Umschalter erreichbar, so wie jedes Blatt unter
„Mehr" bleibt (Entwurf „Entlastung", Leitsatz fünf). Ein Arbeitsplatz kann
mehrere Stellen führen (S1 und S4 in Doppelfunktion, DV 1-100 4.3.1: „können
Sachgebiete zusammengefaßt werden"), deshalb ist es eine Liste.

Das Profil des Arbeitsplatzes bleibt, was es ist. Das Profil „Führungsstelle"
bekommt den Reiter „Nachrichten" ins Band, das Profil „Vermeldezentrale"
ebenfalls, dort mit der Sicht der FmZ als erster. Ob ein eigenes Profil
„Sichter" nötig ist oder die Stelle genügt, ist Entscheidung 3.

Der Akteur eines Ereignisses trägt weiterhin Anzeigename, Rechnername und
`clientId`. Stelle und Handzeichen gehen nicht in den Rahmen (der ist
Speicherschicht, KONZEPT-SPEICHER.md §2.4), sondern in die Nutzlast der
Ereignisse, die sie brauchen; so bleibt die Speicherschicht unberührt, und
ein Eintrag auf Papier mit fremdem Handzeichen lässt sich später so
nacherfassen, wie er auf dem Blatt steht.

## 5. Die Laufwege

Ausgang. Eine Stelle verfasst eine Nachricht in der Maske (Abschnitt 6). Bis
zum Knopf „Aufgeben" ist sie ein Entwurf dieses Fensters (`entwurf.ts`), kein
Ereignis; eStab kennt ebenfalls keinen gespeicherten Entwurf. „Aufgeben"
schreibt `NachrichtVerfasst` mit Richtung Ausgang, und die Nachricht erscheint
in der Ausgangswarteschlange der FmZ. Dort sieht der LdF (eigene Stelle `LDF`) die Nachricht und
bestimmt, welcher Fernmelder (Stellen `FM1` bis `FM3`, Name „Fm1“ bis „Fm3“) auf welchem Weg an
welche Gegenstelle übertragen soll: der Übermittlungsvorschlag
(`NachrichtUebermittlungVorgeschlagen`, in der Oberfläche „Fernmelder zuteilen“). Er steht in der Warteschlange und
belegt die Maske „Befördern" vor; der Fernmelder kann ihn ändern. Ergänzt
2026-11-21: Mit `ldfStation` kommt der Ausgang schon vor der Annahme zum LdF
(FOLD_VERSION 15), und die Warteschlange des zugeteilten Fernmelders zeigt
ihn zuoberst mit „für Sie“; die übrigen bleiben sichtbar. Dort setzt der Fernmelder den
Annahmevermerk (`NachrichtAngenommen`, Uhrzeit und Handzeichen) und nach der
Übermittlung den Beförderungsvermerk mit Mittel und Gegenstelle
(`NachrichtBefoerdert`), und er trägt sie in die Nachweisung ein
(`NachrichtNachgewiesen`, Richtung und Nummer). Die grüne Kopie geht auf
Papier zurück zum Verfasser; hier sieht der Verfasser im Ausgang seiner
Stelle, dass die Nachricht befördert ist, mit Zeit und Handzeichen.

Eingang von außen. Die FmZ nimmt die Nachricht auf: `NachrichtVerfasst` mit
Richtung Eingang, dem Aufnahmevermerk in der Nutzlast (Mittel, Datum, Uhrzeit,
Handzeichen) und der Gegenstelle. Absender ist die Stelle draußen, Anschrift
die eigene Führungsstelle oder die Stelle, die der Absender genannt hat. Mit
der Nachweisungsnummer läuft sie zum Sichter.

Sichtung. Der Sichter quittiert mit Uhrzeit und Handzeichen, kreuzt den
Verteiler an und schreibt Vermerke: ein Ereignis `NachrichtGesichtet`, dessen
Wert die ganze Sichtung ist. Eine zweite Sichtung (eStab: „2. Sichtung")
ist dasselbe Ereignis noch einmal, mit gesehenem Vorher-Wert; zwei Sichter an
derselben Nachricht erzeugen den Konflikthinweis aus §2.2a des
Ereigniskonzepts, und die Nachricht steht bei beiden Verteilern
(umgesetzt 2026-11-17: Die Sichtung schickt ihren Vorher-Wert ohne
Vorwert-Prüfung, der Worker schreibt die zweite und sagt es dem Sichter, der
Fold meldet `vorherPasstNicht`, und die Zeile führt die Vereinigung beider
Verteiler mit der Marke „zwei Sichtungen", bis eine Nachsichtung mit dem
geltenden Vorher-Wert bereinigt). Die rote
Kopie geht nach der Lehrunterlage immer an S2 (Lagekarte, Einsatztagebuch);
die Maske belegt S2 deshalb vor, aber sie erzwingt es nicht, weil eine
Führungsstelle ohne S2 die Kopie sonst an einen leeren Stuhl schickte.

Ersatzsichter. Steht in der Präsenz kein Arbeitsplatz mit der Stelle
„Sichter", zeigt die Maske der FmZ beim Aufnehmen und die Maske des
Verfassers bei der Gesprächsnotiz gleich den Laufzettel mit, und
`NachrichtVerfasst` und `NachrichtGesichtet` werden in einem Schritt
geschrieben (Folgeschritt wie in `schreibfolgen.ts`). Das ist die Regel aus
eStab, nur dass hier die Präsenz entscheidet statt ein Login. Ist die Präsenz
veraltet oder der Share fort, gilt „kein Sichter da", und wer aufnimmt,
verteilt selbst; ein Sichter, der dann doch da war, sieht die Nachricht
trotzdem und kann nachsichten. Ergänzt 2026-11-17 (Runde 2, R2-LdF P1-3):
Führt der Einsatz den LdF als Station und ist ein LdF besetzt, ist **er**
der Ersatzsichter — die FmZ verteilt beim Aufnehmen nicht, der Eingang läuft
zum LdF, und der LdF sichtet beim Weitergeben (`NachrichtWeitergegeben` mit
Laufzettel, Folgeschritt `NachrichtGesichtet` mit `GRUND_ERSATZSICHTER`).
Jede Ersatzsichtung, auch „Ich sichte jetzt selbst“ der FmZ, trägt diesen
Grund.

Verteilung und Kenntnisnahme. Mit der Sichtung erscheint die Nachricht im
Posteingang jeder Stelle des Verteilers. Wer sie dort aufschlägt, schreibt
`NachrichtKenntnisGenommen` für seine Stelle (Zeit, Handzeichen, Akteur), die
Marke wird grün, und alle sehen es. „Erledigt" ist ein zweites Ereignis je
Stelle und lässt sich zurücknehmen. Beides ist je Stelle, nicht je Person:
Der Posteingang gehört dem Sachgebiet, und die Schicht wechselt.

Gesprächsnotiz. Eine Stelle, die telefoniert oder persönlich spricht, hält
das Gespräch als Nachricht mit Kreuz in Feld 12 fest. Sie wird nicht
übermittelt, aber nachgewiesen und gesichtet (Lehrunterlage Folie 16: „alle
Nachrichten einschließlich der Gesprächsnotizen"). Der Verfasser bestimmt
die Stellen, die Kenntnis bekommen sollen (Folie 28), also sichtet er sie
selbst, wenn er will; sonst läuft sie zum Sichter wie ein Eingang. Die
Nachweisungsnummer vergibt die FmZ, wenn es sie gibt, sonst der Verfasser
(Entscheidung 2).

Antwort und Weiterleitung. „Antworten" öffnet die Maske mit getauschter
Anschrift und Absender, dem Betreff mit Vorsatz „Antwort:" und dem Bezug
`antwortAuf` auf die Nachricht; die Maske zitiert den Inhalt nicht, denn der
Vordruck hat zwölf Zeilen. „Weiterleiten" ist eine neue Nachricht mit demselben
Inhalt und Bezug `weitergeleitetVon`. Beides sind Komfortwege zur selben
Maske, keine eigenen Ereignisarten.

Vorrang. Blitz vor Sofort vor Einfach, innerhalb der Stufe nach Eingang
(DV 810, Folie 19 und 20). Jede Liste sortiert so; Blitz steht rot, Sofort
bernstein, wie die Statusmarken. Die Lehrunterlage mahnt, Vorrangstufen
restriktiv zu nutzen; die Maske hat sie deshalb als zwei Kästchen und nicht
als Vorbelegung.

Zwanzig Minuten. Der Vergleich von Annahme- und Beförderungsvermerk zeigt die
Belastung der FmZ (Folie 14): Liegt eine angenommene Nachricht länger als
zwanzig Minuten unbefördert, wird ihre Zeile in der Warteschlange bernstein,
und die Zahl im Band zählt sie. Die Schwelle ist ein Parameter je Einsatz wie
`funkKontaktSchwelleMinuten`. Geändert 2026-11-17 (Audit LdF P0-2): Gemessen
wird ab dem Eintreffen bei der FmZ (HLC von `NachrichtVerfasst`, eine früher
nacherfasste Annahme geht vor), denn ein Blitz, den noch niemand angenommen
hat, blieb sonst unbemerkt; die Zeile trägt die Wartezeit (`wartetSeit`).

Leiter des Fernmeldebetriebes (ergänzt 2026-11-17, mit Johannes bestätigt).
Nach der Lehrunterlage (Folie 22) legt der LdF in der FmZ das
Übertragungsmittel fest, und in der Stabsdienstordnung der Führungsstelle
steht er beim Eingang zwischen Fernmelder und Sichter. Führt der Einsatz den
Parameter `ldfStation` (geändert 2026-11-22, FOLD_VERSION 17: der LdF ist
Standard — fehlt der Parameter, gilt ja, auch in älteren Einsätzen; nur ein
ausdrückliches Nein schaltet ab, `ldfstation.ts`),
läuft ein Ausgang ohne Vorschlag zuerst zum LdF, der mit dem Übermittlungsvorschlag
(`NachrichtUebermittlungVorgeschlagen`, oben unter „Ausgang") Fernmelder,
Mittel und Gegenstelle bestimmt; die Beförderungsmaske belegt damit vor.
Ein eigenes Ereignis für die Festlegung des Wegs gibt es nicht, der
Vorschlag ist sie. Ein aufgenommener Eingang läuft zum LdF, der Aufnahme und
Nachweisung prüft und mit `NachrichtWeitergegeben` an den Sichter gibt. Die
bekannte Stelle heißt LDF („LdF"); wer sie hat, sieht die Sicht „LdF" mit
zwei Karten zuerst. Ohne den Parameter bleibt der Weg unverändert. Steht in
der Präsenz kein LdF, gilt die Ersatzregel wie beim Sichter: Beim Aufnehmen
folgt die Weitergabe mit Zeit und Handzeichen der Aufnahme, und beim
Befördern gilt der Vermerk des Fernmelders als Vorschlag (sein Handzeichen
als Fernmelder und Zeichen) — beides als Folgeschritt im Worker mit Hinweis.
Ist ein LdF da, aber kein Vorschlag geschrieben, befördert der Fernmelder
trotzdem; nachgetragen wird nichts, der Hinweis sagt es.

Besetzung und Hinweise (ergänzt 2026-11-17, Runde 2, R2-FaBe P0-3). Das
Lagebild trägt die besetzten Stellen der Präsenz (`besetzteStellen`). Gibt
eine Stelle einen Ausgang auf, ohne dass die FmZ (mit LdF als Station: auch
kein LdF) besetzt ist, sagt das Bedienergebnis „Fernmeldezentrale nicht
besetzt: Die Nachricht wartet. Selbst befördern über die Sicht
Fernmeldezentrale.“; eine Gesprächsnotiz „An den Sichter“ ohne Sichter sagt
dasselbe für den Sichter, ein Eingang ohne Nummer „Eingang ohne
Nachweisungsnummer“ (kein Blocker, die Karte „Ohne Nummer“ der FmZ führt ihn).
Ein Eingang mit Vorrang beim LdF meldet sich dem LdF (bei Blitz mit Ton),
zählt bei ihm als offen und trägt `wartetSeitLdf` (ab der Aufnahme); der
Stauwächter meldet FmZ, LdF und Sichter einen Eingang, der die Schwelle lang
beim LdF liegt.

Kopien nach der Beförderung (ergänzt 2026-11-17, Folie 30). Nach der
Beförderung eines Ausgangs gehen die rote Kopie an S2 und die grüne an die
Stelle des Verfassers. Der Worker schreibt dazu nach `NachrichtBefoerdert`
eines ungesichteten Ausgangs `NachrichtGesichtet` mit dem Verteiler S2 rot
und Verfasserstelle grün (die Funktion der Anlage, wenn sie eine Stelle ist,
sonst der Absender als freier Name), der Zeit der Beförderung, dem
Handzeichen des Fernmelders und dem Vermerk „Kopien nach Beförderung: rot
S2, grün <Stelle>" und dem Rahmenfeld `grund` „Kopien nach Beförderung“
(Runde 2, R2-ETB P1-1: das Tagebuch führt die Zeile so und unter der FmZ,
nicht als Sichtung eines Sichters). S2 wird auch eingetragen, wenn niemand die Stelle
besetzt — die Kopie wartet im Fach. Der Ausgang steht damit im Posteingang
beider Stellen, läuft als VERTEILT und nach der Erledigung als ERLEDIGT. Mit
`sichtungAuchAusgang` entfällt der Schritt, weil dann der Sichter verteilt.

Geändert 2026-11-21 (mit Johannes abgestimmt, FOLD_VERSION 16): Mit
`ldfStation` lautet der Weg eines Ausgangs Verfasser → LdF (Zuteilung an
einen Fernmelder) → Fernmelder (Annahme, Beförderung) → LdF (Nachweisung im
Technischen Betriebsbuch, `NachrichtWeitergegeben`) → Sichter (Verteilung
S2 rot, Verfasser grün). Nach `NachrichtBefoerdert` steht der Ausgang
deshalb wieder VOR_LDF, nach der Weitergabe VOR_SICHTER; der Worker
schreibt die Kopien nicht mehr. Die Weitergabemaske nimmt die Nummer auf,
wenn sie fehlt (`nachrichtenfolge.nachweis`, Folge `NachrichtNachgewiesen`),
der Laufzettel belegt beim Ausgang S2 rot und die Verfasserstelle grün vor.
Ersatzregeln: Ohne LdF folgt auf die Beförderung die Weitergabe mit Zeit
und Handzeichen der Beförderung; ohne Sichter folgen auf die Weitergabe
(oder ohne LdF auf die Beförderung) die Kopien wie oben. Ohne `ldfStation`
bleibt alles wie oben beschrieben.

Nachgezogen nach dem Rollen-Review vom 2026-11-21 (Verfasser, LdF,
Fernmelder, Sichter, S2/ETB): Mit `sichtungAuchAusgang` läuft der beförderte
Ausgang weiter direkt zum Sichter. Wird `ldfStation` abgeschaltet, schreibt
der Worker die Kopien für beförderte, ungesichtete Ausgänge nach. Die
Vorbelegung bei der Anlage trägt `GRUND_VORBELEGUNG_ANLAGE` und liegt nicht im
Rückgängig-Stapel. Ist der LdF nach der Beförderung nicht mehr besetzt, gibt
ein Fernmelder den Ausgang mit „Selbst weitergeben“ weiter. „Nachweisen und
weitergeben“ schreibt den Nachweis als Hauptschritt mit Vorwert-Prüfung und
die Weitergabe als Folge, damit keine vergebene Nummer überschrieben wird und
das Tagebuch die Nummer zuerst nennt. Mit besetztem LdF belegt die
Beförderung keine Nummer vor. Der Ausgang vor dem Sichter hat eine Uhr
(Schwellen, säumiger Sichter), und ohne Sichter verteilt der LdF als
Ersatzsichter. Ersatzschritte ohne LdF tragen `GRUND_ERSATZ_LDF`, die
Zuteilung heißt im Tagebuch „an Fm2 zugeteilt“. Die Präsenz trägt
`foldVersion`; das Blatt warnt vor Arbeitsplätzen mit anderer Fassung.

Zweite Review-Runde (2026-11-22): Auch ein aufgenommener Eingang, der beim
nicht besetzten LdF hängt, steht bei den Fernmeldern mit „Selbst
weitergeben“. Ist kein Sichter besetzt, verteilt der LdF einen Eingang mit
dem Laufzettel der Weitergabemaske (`nachrichtenfolge.sichtung`, auch über
„Nachweisen und weitergeben“). Abschalten von `sichtungAuchAusgang` ohne LdF
schreibt die ausstehenden Kopien. Nach Rücknahme und Neusichtung gelten
Kenntnis und Erledigung nur, wenn sie nach der neuen Sichtung kamen
(FOLD_VERSION 18). Schritte auf eine unbekannte Nachricht weist der Worker ab.
In der Oberfläche heißt der Vorschlag des LdF durchgehend „Zuteilung“.

## 6. Das Blatt „Nachrichten"

Ein eigener Reiter im Kopfband, bei der Führungsstelle zwischen Eingang und
Führungsstelle, bei der Vermeldezentrale vor dem Funkplan. Das Band darüber
nennt fünf Zahlen: neu für meine Stelle, vor der FmZ, vor dem Sichter, mit
Vorrang offen, länger als zwanzig Minuten in der FmZ (die letzten beiden
bernstein ab eins).

Der Umschalter kennt fünf Sichten. „Posteingang" zeigt die Nachrichten, in
deren Verteiler eine Stelle dieses Arbeitsplatzes steht, mit Kopiefarbe am
linken Rand (grün Hauptempfänger, blau Mitleser, rot S2), den Marken gelesen
und erledigt, Vorrang, Richtung, Nummer, Absender, Anschrift, Abfassungszeit
und Betreff; Filter nach Zustand (neu, gelesen, erledigt) als Chips wie im
Eingangskorb, Suche über Betreff, Inhalt und Absender. „Ausgang" zeigt, was
dieser Arbeitsplatz (`clientId`) oder eine Stelle der Sitzung verfasst hat — die Stelle ist
das Feld `funktion` der Nachricht, nicht der Absender-Freitext (Entscheidung
14) —, mit dem Stand in der FmZ.
„Sichter" zeigt die Eingänge ohne Sichtung, zuoberst die mit Vorrang; mit der
Auswahl erscheint der Laufzettel darunter. „Fernmeldezentrale" zeigt zwei
Karten, die Ausgangswarteschlange mit Annahme- und Beförderungsknopf und den
Hauptknopf „Eingang aufnehmen". „Nachweisung" zeigt alle Nachrichten nach
Nummer, mit Richtung, Zeiten der drei Vermerke, Absender, Anschrift, Betreff,
als Liste und als Ausgabe (Abschnitt 7). Die Stelle des Arbeitsplatzes wählt
die erste Sicht: FmZ sieht die Fernmeldezentrale, Sichter den Sichter, alle
anderen den Posteingang.

Die Maske „Nachricht verfassen" ist der Vordruck, nicht ein Formular mit
zwanzig Feldern untereinander: drei Teile in der Anordnung des Blattes, der
obere grau und schreibgeschützt, solange der Arbeitsplatz nicht FmZ ist, der
mittlere mit den Kästchen für Mittel, Art und Vorrang in einer Zeile, Anschrift
und Ruf-Nr., Betreff, zwölf Zeilen Inhalt, Absender, Abfassungszeit, Zeichen
und Funktion; der untere grau, bis der Sichter ihn aufschlägt. Die
Ausfüllanleitung sagt, was in Anschrift und Absender gehört
(„Dienststellen-/Teileinheits-/Einheitsbezeichnungen, keine Eigennamen"), und
die Maske bietet dafür die Abschnitte, Einheiten und besetzten Stellen des
Einsatzes zur Auswahl an, lässt aber Freitext zu, denn die Gegenstelle draußen
steht in keiner Liste. Absender, Zeichen und Funktion sind aus Stelle und
Handzeichen des Arbeitsplatzes vorbelegt, die Abfassungszeit mit „jetzt" als
Datum-Zeit-Gruppe (Strg+D wie überall). Der Inhalt zählt die Zeilen gegen die
zwölf des Vordrucks und sagt ab der dreizehnten, dass der Ausdruck ein
Folgeblatt bekommt; gekürzt wird nichts.

Zeiten werden eingegeben und gezeigt, wie der Vordruck sie verlangt: die
Uhrzeit vierstellig, die Datum-Zeit-Gruppe sechsstellig mit Monat und Jahr
(„171045nov26"). Intern bleibt der Zeitpunkt ISO-8601 wie überall; der
Formatierer `datumZeitGruppe` kommt als reine Funktion nach `@s1/domaene`
(Vorlage `web/src/spalten.ts` der Bibliothek). Keine dieser Zeiten ordnet
etwas; geordnet wird nach HLC (02-ZIELBILD.md, Festlegung 4).

Benachrichtigung. Trifft für eine Stelle dieses Arbeitsplatzes eine Nachricht
mit Vorrang ein, schickt der Worker die vorhandene Mitteilung `hinweis` mit
Stufe „warnung"; ohne Vorrang steigt nur die Zahl im Band. Ein Ton ist
Entscheidung 6. Auf dem Monitor gibt es keine neue Ansicht; die
Nachrichtenlage ist eine Sache der Arbeitsplätze, nicht des Fernsehers an der
Wand.

Bearbeitungssperre. Sichtung und Beförderung setzen die weiche Sperre auf die
Nachricht wie die Maske auf die Einheit; ein zweiter Sichter sieht „wird von
… gesichtet". Die Vorwertprüfung des Workers fängt, was die Sperre nicht
fängt.

Papier-Rückfall. Fällt der Rechner aus, schreibt die Führungsstelle auf den
Vordruck weiter, und die FmZ führt die Nachweisung auf Papier fort. Beim
Nacherfassen trägt der Bediener alle Zeiten, Handzeichen und die Nummer ein,
wie sie auf dem Blatt stehen; nichts davon wird aus der Wanduhr erzwungen. Die
Nummernvorbelegung ist „höchste bekannte plus eins", und eine Nummer darf
jederzeit höher eingetragen werden, nie lässt die Anwendung sie doppelt still
stehen (Abschnitt 9).

## 7. Ausgaben

Drei Ausgaben, alle in `packages/ausgaben`, alle in den Ordner `ausgaben\`
des Einsatzes.

Der Vordruck je Nachricht: A5 hoch als PDF aus `bos-nachrichtenvordruck`,
wahlweise zwei Nachrichten auf A4 quer, mit der Übungsmarke, wenn der Einsatz
eine Übung ist (die Bibliothek zeichnet „ÜBUNG" als Wasserzeichen). Dateiname
`nachricht-<E|A><nummer>-<datumzeitgruppe>.pdf`. Der Knopf steht in jeder
Sicht an der gewählten Nachricht und im Kontextmenü; S2 bekommt in der
Vorbelegung den Druck jeder gesichteten Nachricht angeboten, wie eStab beim
Lesen durch S2 das PDF erzeugt. Ob der Druck automatisch läuft, ist
Entscheidung 7.

Die Nachweisung: A4 hoch als HTML und PDF über den vorhandenen Weg
(`printToPDF`), eine Zeile je Nachricht nach Nummer, die Spalten von eStabs
`nachwea.php` (Vorrang, E/A, Nr., Von, An, Aufnahme, Annahme, Beförderung,
Abfassungszeit, Betreff), unten Zeit und Akteur. Das ist das Technische
Betriebsbuch, soweit der Vordruck es führt; ein vollständiges TBB mit
Betriebsstörungen und Kanalwechseln ist nicht Teil dieses Entwurfs.

Der leere Vordruck: Der Papier-Vordruck (`papier.ts`) bekommt eine fünfte
Seite, den Nachrichtenvordruck ohne Daten, aus derselben Bibliothek mit
leerer `VordruckDaten`. So liegt der Block im Schrank, bevor der Rechner
steht.

Die Einsatzakte als ZIP nimmt die PDFs des Ordners mit, wie heute jede
Ausgabe.

## 8. Die Bibliothek `bos-nachrichtenvordruck` einbinden

Bezug als git-Submodul `vendor/bos-nachrichtenvordruck` und npm-Workspace,
wie `vendor/eeb-format`, `vendor/bos-vokabulare` und `vendor/bos-meldekopf`.
Die Bibliothek liegt nicht auf npm, und der Share-Betrieb ohne Internet
verlangt Quellen im Baum. `vitest.config.ts` bekommt den Alias auf
`vendor/bos-nachrichtenvordruck/src/index.ts` wie für `@bos/*`;
`tsconfig.base.json` den `paths`-Eintrag. `jspdf` (Peer, ^4) wird Abhängigkeit
des nutzenden Pakets.

Zwei Dinge sind vor dem Einbinden upstream zu klären. Die Web-App unter
`web/` zieht als Workspace ihre devDependencies mit (Vite 8, ExcelJS, eine
Schrift); sauberer ist, sie im Kern-Repo in ein eigenes Workspace-Paket zu
trennen oder beim Install auszuschließen. Und die Bibliothek bettet keine
Schrift ein: Helvetica trägt nur Windows-1252, alles andere wird zu
Zeichensalat. Der Filter `druckbar` aus der Web-App gehört deshalb als reine
Funktion in den Adapter (Pfeil wird zu „->", Unbekanntes zu „?").

Wo gerendert wird. `@s1/ausgaben` ist Ring 3 ohne `node:` und ohne DOM, und
jsPDF braucht beides nicht. Der Adapter `nachrichtAlsVordruck(nachricht,
optionen): Uint8Array` liegt deshalb dort, neben Druck und Funkplan, und
nimmt eine Projektion der Nachricht aus `@s1/domaene` entgegen, nicht den
Zustand. Der Worker schreibt die Bytes in `ausgaben\` wie jede Ausgabe. Das
hat eine Folge, die mehr wert ist als die Bibliothek selbst: Die Web-Schale
kann damit erstmals ein PDF erzeugen, denn ihr fehlt `printToPDF`
(README-v2, „Was im Browser fehlt"). Es ist der zweite PDF-Weg im Baum neben
Chromium, und dafür braucht es einen ADR: begründet durch die
Formulargeometrie in Millimetern, die ein vorgedruckter Bogen und ein
Nadeldrucker verlangen und die HTML und CSS nicht garantieren.

Keine Vorschau mit jsPDF im Renderer. Die Maske ist selbst der Vordruck
(Abschnitt 6), und die Vorschau der Web-App (Canvas-Nachzeichnung einer
Wegwerf-jsPDF) ist ein Kunstgriff, der im Renderer nichts verbessert. Wer das
PDF sehen will, öffnet die Datei. Damit bleibt jsPDF aus dem Renderer-Bündel
heraus (Entscheidung 4). — Überholt: Entscheidung 4 lautet „Vorschau ja";
umgesetzt in N3 als nachgeladenes Teilbündel (ADR-008).

Die Zuordnung Nachricht nach `VordruckDaten` ist eine Tabelle, keine Logik:
`richtung` auf `richtung`, `aufnahme` auf `aufnahmevermerk` (Datum
zweistellig, Uhrzeit vierstellig, Handzeichen), `annahme` und `befoerderung`
entsprechend, `nachweis.nummer` auf `nummer`, `gegenstelle` auf
`empfaenger[0]`, `anschrift` auf `anschriften`, `art`, `vorrang`,
`gespraechsnotiz`, `betreff`, `inhalt`, `absender`, `abfassungszeit` als
Datum-Zeit-Gruppe, `zeichen`, `funktion`, die Sichtung auf `quittung`,
`vermerke` und die Ankreuzfelder `verteilerLeiter`, `verteilerS1Spalte1` bis
`verteilerS6Spalte1`; Fachberater und Verbindungsstellen stehen in Spalte 2
und 3 mit ihrem Namen als `verteilerText`. Die Vorbelegungen der Klasse
(`funk`, `ausgang`) werden ausdrücklich gesetzt oder entfernt, damit ein
Eingang nicht als Ausgang gedruckt wird. Folgeblätter kommen aus
`nachrichtenvordruckInhaltTeilen` mit „Blatt n von m".

## 9. Datenmodell und Ereignisse (Vorschlag, additiv)

Neue Entität `nachricht` im Zustand, mit den Rahmenfeldern aus §3.2 des
Ereigniskonzepts (Anlage, Feld, verworfene Anlagen). Zwei Zeiten je Vermerk
stehen als ein Strukturwert, weil sie auf dem Papier ein Feld sind und
getrennt keinen Sinn ergäben.

| Feld | Typ | gesetzt von |
|---|---|---|
| `richtung` | `EINGANG` oder `AUSGANG`, geschlossen | Anlage |
| `art` | `SPRUCH` oder `DURCHSAGE`, offen | Anlage |
| `vorrang` | leer, `SOFORT`, `BLITZ`, offen | Anlage |
| `gespraechsnotiz` | boolean | Anlage |
| `uebermittlungswunsch` | Mittel, offen (FUNK, TELEFON, TELEFAX, DFUE, KURIER) | Anlage |
| `anschrift`, `rufnummer`, `betreff`, `inhalt`, `absender` | Text | Anlage |
| `anschriftBezug`, `absenderBezug` | optional `{ entitaet, id }` wie beim ETB-Eintrag | Anlage |
| `abfassungszeit` | Zeitpunkt (Nutzereingabe) | Anlage |
| `zeichen`, `funktion` | Text | Anlage |
| `gegenstelle` | Text | Anlage (Eingang) oder `NachrichtBefoerdert` |
| `aufnahme` | `{ mittel, zeitpunkt, handzeichen }` | Anlage (Eingang) |
| `annahme` | `{ zeitpunkt, handzeichen }` | `NachrichtAngenommen` |
| `vorschlag` | `{ mittel, fernmelder, gegenstelle?, zeitpunkt, handzeichen }` | `NachrichtUebermittlungVorgeschlagen` |
| `befoerderung` | `{ mittel, zeitpunkt, handzeichen }` | `NachrichtBefoerdert` |
| `nachweis` | `{ nummer, zeitpunkt, handzeichen }` | `NachrichtNachgewiesen` |
| `sichtung` | `{ zeitpunkt, handzeichen, verteiler: Verteilereintrag[], vermerke }` | `NachrichtGesichtet` |
| `kenntnis/<stelle>` | `{ zeitpunkt, handzeichen }` | `NachrichtKenntnisGenommen` |
| `erledigt/<stelle>` | boolean | `NachrichtErledigt`, `ErledigungDerNachrichtZurueckgenommen` |
| `antwortAuf`, `weitergeleitetVon` | optional Id | Anlage |
| `entfernt` | boolean, nur Rücknahme einer Fehlanlage mit Pflichtgrund | `NachrichtZurueckgezogen` |

Ein `Verteilereintrag` ist `{ stelle, kopie }` mit `kopie` aus ROT, GRUEN,
BLAU, offen. Die Stelle ist Text; die bekannten Werte sind die zehn aus
Abschnitt 4, und ein fremder Name wird gefaltet und erzeugt `unbekannterWert`
wie überall.

Ereignisse: `NachrichtVerfasst` (Form b, legt an, kein Undo wie
`EtbEintragErfasst`, weil ein aufgegebener Vordruck nicht ungeschrieben wird;
die Rücknahme einer Fehlanlage ist `NachrichtZurueckgezogen` mit Pflichtgrund
und bleibt sichtbar). `NachrichtAngenommen`, `NachrichtBefoerdert`,
`NachrichtNachgewiesen`, `NachrichtGesichtet` (alle Form a, LWW auf ihr
Strukturfeld, `vorher` der gesehene Wert, Gegenereignis dieselbe Art).
`NachrichtKenntnisGenommen` (Form a, Feld `kenntnis/<stelle>` aus der
Nutzlast, LWW; ohne Undo, denn gelesen ist gelesen). `NachrichtErledigt` und
`ErledigungDerNachrichtZurueckgenommen` (Form a auf `erledigt/<stelle>`,
feste Werte `true` und `false` wie `EinheitEntfernt`). `NachrichtVermerkt`
(Form a auf `sichtung/vermerke`) für Vermerke nach der Sichtung ohne
Neusichtung. Nichts davon setzt Stärke, Status oder Abschnitt; der Fold
bekommt keine neue Regel, nur neue Zeilen in der Katalogtabelle.
`FOLD_VERSION` steigt um eins (mit dem Übermittlungsvorschlag des LdF auf 11).

Die Nachweisungsnummer ist Nutzlast, nicht Projektion. Eine Projektion
(Rang nach HLC) gäbe nach einem verspätet eintreffenden Ereignis jeder
späteren Nachricht eine andere Nummer, und eine Nummer, die auf Papier
steht, darf sich nicht ändern. Die Maske belegt mit „höchste bekannte plus
eins" vor, getrennt oder gemeinsam für E und A (Entscheidung 1). Zwei
Arbeitsplätze, die ohne Verbindung dieselbe Nummer vergeben, erzeugen keinen
Verlust, sondern einen neuen Konflikthinweis `nachweisnummerDoppelt` mit
beiden Ereignis-Ids, und die Nachweisung zeigt beide Zeilen mit der Marke;
berichtigt wird durch `NachrichtNachgewiesen` mit neuer Nummer und gesehenem
Vorher-Wert. Das ist dieselbe Haltung wie bei doppelt angelegten Rufgruppen
(KONZEPT-FUNKPLAN.md, Entscheidung 9): zeigen, nicht raten.

Abgeleitet je Nachricht ein `laufzustand`: VOR_FMZ (Ausgang ohne
Beförderung), VOR_SICHTER (Eingang ohne Sichtung, Ausgang nach Beförderung,
wenn `sichtungAuchAusgang` gesetzt ist, eStabs `si_in_out`), VERTEILT
(gesichtet, mindestens eine Stelle ohne Erledigung), ERLEDIGT (alle Stellen
des Verteilers erledigt oder Verteiler leer), ZURUECKGEZOGEN. Eine
Gesprächsnotiz hat keine Beförderung und springt nach der Sichtung nach
VERTEILT.

Ergänzt 2026-11-17 für den LdF, additiv: das Feld `weitergabe`
(`{ zeitpunkt, handzeichen }`, gesetzt von `NachrichtWeitergegeben`, Form a,
LWW_ENTITAET, Rücknahme dieselbe Art mit dem Vorher-Wert) als Eingangsschritt
des LdF; der Ausgangsschritt ist der Übermittlungsvorschlag (`vorschlag`)
aus der Tabelle. Dazu der Parameter `ldfStation` des Einsatzes über
`NachrichtenParameterGesetzt` und der Laufzustand VOR_LDF, nur mit
`ldfStation`: ein Ausgang, angenommen, ohne Vorschlag und ohne Beförderung,
oder ein Eingang mit Aufnahmevermerk, ohne Weitergabe und ohne Sichtung
(eine Gesprächsnotiz nie). Die Sicht `ldf` zeigt VOR_LDF; die Warteschlange
der FmZ zeigt angenommene Ausgänge vor dem LdF weiter mit Marke, damit der
Fernmelder nach der Ersatzregel befördern kann. Die Nachrichtenlage trägt
`vorLdf` nur mit dem Parameter. Die Sichtung des Ersatzsichters trägt das
Rahmenfeld `grund` „Kein Sichter besetzt: Ersatzsichter", damit das
Tagebuch sie als solche nennt. `FOLD_VERSION` steigt auf 12.

Ergänzt 2026-11-17 (Runde 2, additiv): Die Ereignisse der Nachricht, die
der Worker schreibt, tragen die Stelle der Sitzung als Nutzlastfeld `stelle`
(R2-ETB P1-1, R2-LdF P3-2) — bei der Aufnahme die FmZ, nicht die `funktion`
des Absenders draußen; nach dem Einsatz ist die Präsenz leer, die Stelle
muss deshalb im Ereignis stehen. Bei `NachrichtVerfasst` wird sie wie jedes
Feld der Anlage zum Feld `stelle` der Nachricht; bei Kenntnis und Erledigung
wählt `stelle` wie bisher den Feldpfad. Ein Papier-Nachtrag trägt im Entwurf
das Kennzeichen `nachrichtenfolge.nachtrag`; der Worker schreibt ihn und
seine Folgen mit dem `grund` „vom Papier nachgetragen“, das Tagebuch sagt
„vom Papier nachgetragen durch <Stelle>“. Bei zwei Sichtungen führt die
Zeile beide Vermerke mit Handzeichen („Si: … / Zw: …“, R2-Si P1-2); das ist
Projektion, der Fold bleibt. Der Einsatzbeginn darf bis zu sieben Tage vor
der Wanduhr liegen, ohne `meldezeitUnplausibel` (Konflikthinweis im frisch
angelegten Einsatz); dafür steigt `FOLD_VERSION` auf 13. Die Tagebuchzeile
trägt `laufendeNummer`, dieselbe wie im Druck (R2-ETB P1-2).

Das Einsatztagebuch zeigt jedes dieser Ereignisse als Zeile mit Nummer,
Richtung, Absender, Anschrift und Betreff („Nachricht E 26 aufgenommen: OV
Wildeshausen an FüSt, ‚Pumpen eingetroffen‘"), die Sichtung mit dem
Verteiler, die Kenntnisnahme mit Stelle und Handzeichen. Feld 20 des
Vordrucks („Vermerke z. B. ETB-Nummer") braucht damit niemand mehr von Hand
zu füllen: Die Tagebuchzeile trägt die Nachrichtennummer, und die Nachricht
trägt im Blatt den Knopf „Im Tagebuch zeigen" wie die Einheit.

Das `Lagebild` wächst um `nachrichten` mit den fünf Zahlen des Bandes aus
Abschnitt 6, je Stelle dieses Arbeitsplatzes gerechnet. Die Listen holt das
Blatt mit `nachrichtenAnfordern` nach dem Muster von `tagebuchAnfordern`:
Sicht, Stellen, Zustandsfilter, Suche, Zeigerstand, hundert Zeilen und die
Gesamtzahl.

Die Einstellungen (`zEinstellungen`) wachsen um `stellen` (Liste) und
`handzeichen`; die Präsenz um dieselben beiden Felder, beide optional, damit
ein Arbeitsplatz älterer Fassung weiter gelesen wird.

## 10. Architektur und Schnitte

Rechnung in `packages/domaene/src/projektion/nachrichten.ts` (Zeilen je
Sicht, Laufzustand, Nummernvorbelegung, Zwanzig-Minuten-Marke, die fünf
Zahlen) und `packages/domaene/src/zeit/datumZeitGruppe.ts`; Entität,
Schemata, Katalogzeilen und `ART_TEXT` in `katalog/` und
`projektion/tagebuch-nachrichten.ts`; der Adapter nach `VordruckDaten` und
die Nachweisung in `packages/ausgaben/src/nachricht.ts` und
`nachweisung.ts`; Kontrakt additiv in `apps/desktop/src/kontrakt` (Ruf
`nachrichtenAnfordern`, Ausgabeart `nachricht` und `nachweisung`,
Einstellungen); Bedienschritte in `kontrakt/nachrichtenschritte.ts`; Renderer
`Nachrichten.tsx` mit je einer Datei je Sicht und `Nachrichtenmaske.tsx`
als Vordruck, alle unter 400 Zeilen; der Worker erweitert
`bearbeitungssperren.ts` um die Entität Nachricht und `schreibfolgen.ts` um
den Ersatzsichter. Der Main bekommt nichts Neues. Die Web-Schale bekommt
die PDF-Ausgabe geschenkt. (Mit dem Automatikdruck an einen Drucker,
Entscheidung 7, bekam der Main in N3 doch einen Druckausgang:
`main/druckausgang.ts`, `main/elektronDruckausgang.ts`; ADR-008.)

Senkrecht geschnitten:

N1 Nachricht als Entität mit `NachrichtVerfasst`, `NachrichtGesichtet`,
`NachrichtKenntnisGenommen`, `NachrichtErledigt`; Stelle und Handzeichen in
den Einstellungen; Blatt mit Posteingang, Ausgang und Sichter; die Maske als
Vordruck; Tagebuchzeilen; Submodul eingebunden und der Vordruck je Nachricht
als PDF. Tests: Fold für Anlage, Sichtung, zweite Sichtung mit Konflikt,
Kenntnis je Stelle; Projektion der drei Sichten; Maske in jsdom; Adapter
gegen Prüfdaten (eine Nachricht je Richtung, eine mit dreizehn Zeilen, eine
mit Zeichen außerhalb Windows-1252); Goldfile der PDF-Bytes ist nicht
sinnvoll, geprüft wird die `VordruckDaten`-Struktur.
Umgesetzt: Domäne mit Fold, Projektionen und Tagebuchsätzen, der Adapter
auf den Vordruck als PDF, Rufe, Stelle und Handzeichen in der Sitzung und
die Schale mit Posteingang, Ausgang, Sichter und der Maske als Vordruck.

N2 Fernmeldezentrale: `NachrichtAngenommen`, `NachrichtBefoerdert`,
`NachrichtNachgewiesen`; Sicht FmZ mit Warteschlange und „Eingang
aufnehmen"; Nummernvorbelegung und `nachweisnummerDoppelt`; Sicht und
Ausgabe Nachweisung; Zwanzig-Minuten-Marke; Sperre. Tests: Nummernkollision
zweier Arbeitsplätze in der Simulation; Papier-Nacherfassung mit Nummer aus
der Zukunft; Nachweisung gegen Prüfdaten.
Umgesetzt: dazu die Gesprächsnotiz, der Ersatzsichter über die Präsenz,
die Parameter je Einsatz, die FmZ-Sicht mit Eingangsaufnahme, die
Nachweisung als Sicht und Ausgabe sowie die Zwanzig-Minuten-Marke; die
Gesprächsnotiz und der Ersatzsichter, hier unter N3 geplant, kamen mit N2.

N3 Gesprächsnotiz, Ersatzsichter über die Präsenz, Antwort und
Weiterleitung, `NachrichtZurueckgezogen`, Vermerke nach der Sichtung,
Anhänge über `AnhangHinzugefuegt` mit Bezug. Tests: Folgeschritt ohne
Sichter in der Präsenz; Antwortbezug im Tagebuch.
Umgesetzt: statt der hier genannten Folgen der Druck, nämlich der Vordruck
als PDF unter ausgaben/nachrichten, die Vorschau, der Automatikdruck mit
Probedruck, der leere Vordruck im Papier-Vordruck und ADR-008 (zweiter
PDF-Weg).

N4 Lagebildzahlen und Band, Hinweis bei Vorrang, leerer Vordruck im Papier,
Handbuch und Kurzanleitung, ADR zum zweiten PDF-Weg. Tests: Lagebild gegen
die Projektion; Mitteilung nur bei Vorrang und nur für die eigene Stelle.
Umgesetzt: die Dokumentation (Handbuch, Kurzanleitung, Störfall „Nachrichten
auf Papier“, Bedienhilfe); Band und Hinweis bei Vorrang kamen schon mit N1,
der leere Vordruck und das ADR mit N3.
Abnahme: Die drei Laufwege stehen als deutsche Gherkin-Szenarien in
`apps/desktop/features/nachrichten/` (Ausgang mit LdF und grüner und roter
Kopie, Eingang mit Sichtung, Ersatzsichter und zweitem Sichter,
Gesprächsnotiz) und laufen mit `npm run test:bdd`; sie beschreiben den
Soll-Ablauf, ein roter Schritt zeigt, was noch fehlt.

Nach jedem Schnitt `typecheck`, `lint`, betroffene Tests; bei N1 und N2
(Katalog, Fold, Einstellungen) der volle Lauf und die Simulation.

## 11. Entscheidungen (getroffen)

Getroffen am 2026-11-16 mit dem Umsetzungsauftrag; die Fragen, wie sie
standen, folgen darunter.

1. Die Nachweisung zählt Eingang und Ausgang gemeinsam.
2. Ohne besetzte FmZ bleibt die Nummer leer, bis die FmZ nachweist. Die
   Maske des Verfassers vergibt keine Nummer.
3. Die Stelle wird beim Öffnen des Einsatzes abgefragt, nicht in den
   Geräteeinstellungen hinterlegt: Wer einen Einsatz aufschlägt, sagt, welche
   Position er im Stab hat. Die Wahl gilt für diese Sitzung an diesem
   Arbeitsplatz, steht in der Präsenz und wird beim nächsten Öffnen desselben
   Einsatzes als Vorbelegung angeboten. Das Handzeichen wird an derselben
   Stelle abgefragt und bleibt je Arbeitsplatz gemerkt.
4. Vorschau ja: Die Maske zeigt neben dem Formular den Vordruck, wie er
   gedruckt wird, nach dem Muster der Canvas-Vorschau der Web-App des
   Submoduls (Aufrufe einer Wegwerf-jsPDF nachzeichnen). jsPDF kommt damit
   in das Renderer-Bündel; die Vorschau wird erst geladen, wenn die Maske
   offen ist.
5. Einbindung zunächst als `file:`-Abhängigkeit mit Bau in
   `bau/kern-bauen.mjs` wie die drei anderen Kerne. Zieht npm dabei die
   devDependencies der Web-App mit, wird die Web-App upstream in ein eigenes
   Workspace-Paket getrennt. Keine Entscheidung gegen das eine oder andere;
   die Umsetzung berichtet, was npm tut.
6. Ton bei Blitz-Nachricht, abschaltbar je Arbeitsplatz, nur bei Blitz.
7. Automatischer Druck je Nachricht gibt es, und er braucht ein Ziel: einen
   fest eingestellten Drucker oder ein festes Verzeichnis, in das die PDFs
   fallen, damit sie später gedruckt werden können. Beides steht in den
   Einstellungen des Arbeitsplatzes; ohne Ziel ist der automatische Druck aus.
   Ein Drucker ist nur in der Desktop-Schale möglich (Electron `print`), das
   Verzeichnis in beiden Schalen.
8. Ob Ausgänge nach der Beförderung noch einmal zum Sichter laufen, ist ein
   Parameter je Einsatz (`sichtungAuchAusgang`, Vorbelegung nein).
9. Kein Meldevordruck.
10. Der Reiter heißt „Nachrichten".

Nachtrag vom 2026-11-17. Johannes entschied: „Die Lehrunterlage ist Maßstab.
S5 wie im Vordruck.“ Daraus folgen vier Festlegungen zu offenen Befunden der
Rollen-Audits (`docs/audits/nachrichten/README.md`):

11. **Kein stabsinterner Weg an FmZ und Sichter vorbei** (SGL P1-2). Bewusst
    nicht gebaut: In der Lehrunterlage läuft der Verkehr zwischen Stellen über
    die Fernmeldezentrale und den Sichter (Folie 31). Wer eine andere Stelle
    erreichen will, schreibt eine Gesprächsnotiz, die der Sichter verteilt
    oder die der Verfasser selbst verteilt (§5 „Gesprächsnotiz“). Ein dritter
    Weg daneben würde das Betriebsbuch der FmZ umgehen.
12. **S5 bleibt ohne Kästchen, nur Freitext** (Sichter P3-3). Bewusst nicht
    als feste Zeile im Verteilerraster: Der Vordruck hat keine Zeile S5. Wer
    S5 braucht, trägt sie unter „Weitere Stelle“ ein; im Vordruck steht sie im
    freien Feld der Verteilerzeile (`verteilerText`), nicht in einem Kästchen.
13. **Hinweis statt Recht beim oberen Teil** (LdF P2-3). Die Lehrunterlage
    (Folie 7) behält den oberen Teil, Felder 1 bis 6, den Fernmeldern vor. Die
    Stelle bleibt ein Zuschnitt (§4), aber die Masken Annehmen, Befördern und
    Nachweisen (Stelle FMZ) sowie Übermittlung vorschlagen und An den Sichter
    weitergeben (Stelle LDF; die FmZ darf beides, solange kein LdF besetzt ist)
    zeigen einer Sitzung ohne diese Stelle den Hinweis „Dieser Teil ist der
    Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6). Trotzdem
    eintragen?“. „Trotzdem“ gibt den Schritt frei; er wird mit dem `grund`
    „Eintrag durch <Stelle>, nicht FmZ“ geschrieben (bei den Schritten des LdF
    „nicht LdF“) und steht so im Tagebuch. Kein Recht, keine Sperre.
    Ergänzt 2026-11-17 (Runde 2, R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2): Der
    Worker prüft den Vorbehalt selbst als `grund`-Pflicht (Bedienergebnis
    `brauchtGrund` mit `stelle` und `hinweis`, Regel in
    `kontrakt/stellenvorbehalt.ts`) für „Sichten“ ohne die Stelle Sichter
    („Sichten ist dem Sichter vorbehalten …“) und für „Eingang aufnehmen“
    oder einen Papier-Nachtrag mit Annahme, Beförderung oder Nummer ohne die
    Stelle FmZ. Ausgenommen sind die Ersatzregeln (kein Sichter: FmZ oder LdF
    sichten; kein LdF: die FmZ) und die eigene Gesprächsnotiz, die ihr
    Verfasser verteilt.
14. **Ausgang nach Stelle** (SGL P2-14). Die Sicht „Ausgang“ zeigt, was eine
    Stelle der Sitzung verfasst hat — maßgeblich ist die Stelle im Nutzlastfeld
    `funktion` (Feld 15/17 des Vordrucks, die Maske belegt es aus der Stelle
    der Sitzung vor) —, und was dieser Arbeitsplatz verfasst hat (`clientId`).
    Der Absender-Freitext zählt nicht mehr. Beim Schichtwechsel sieht damit ein
    zweiter Arbeitsplatz mit der Stelle S4 den Ausgang des ersten.
15. **Die eigene Kopie gilt als gelesen** (2026-11-18, R2-FaBe P1-4). Die
    grüne Kopie an die Stelle des Verfassers nach der Beförderung (Folie 30)
    zählt im Posteingang dieser Stelle nicht als „neu“ und löst keinen
    Vorranghinweis aus. Abgeleitet in der Projektion
    (`projektion/verfasserstelle.ts`, Marke `eigenerAusgang`), nicht als
    geschriebenes `NachrichtKenntnisGenommen`: Das Ereignis schriebe der
    Arbeitsplatz der FmZ mit dem Handzeichen des Verfassers — eine
    Kenntnisnahme, die niemand gegeben hat. Erledigt wird die Kopie wie jede.
16. **Schwelle vor dem Sichter je Vorrang** (2026-11-18, R2-FM P2-5, R2-Si
    P2-2). Blitz 5, Sofort 10, einfach die Schwelle der FmZ, je als Parameter
    des Einsatzes (`sichterSchwelleBlitzMinuten`,
    `sichterSchwelleSofortMinuten` über `NachrichtenParameterGesetzt`); eine
    Vorrangschwelle über der Schwelle der FmZ gilt nicht. Über der Schwelle
    gilt die Ersatzregel auch bei **besetztem** Sichter: FmZ und LdF sichten
    ohne Rückfrage, die Sichtung trägt `grund` „Sichter besetzt, Schwelle
    überschritten: Ersatzsichter“, und der Stauwächter meldet es der FmZ.
17. **Aufnahme berichtigen** (2026-11-18, FM P2-7). Neue Ereignisart
    `NachrichtAufnahmeBerichtigt` (Form a auf `aufnahme`, LWW, Pflichtgrund,
    Rücknahme dieselbe Art), `FOLD_VERSION` 14. Die Wortlaute des
    Stellenvorbehalts stehen seit diesem Tag je Schritt im Kontrakt
    (`vorbehaltstextFuer`, R2-FaBe P2-7): Sichter, Fernmeldezentrale (Felder 1
    bis 6) oder Leiter des Fernmeldebetriebes, mit dem Satz, was „Trotzdem“ tut.

### Die Fragen, wie sie standen

1. Nachweisung gemeinsam oder getrennt für Eingang und Ausgang. eStab kann
   beides; der Vordruck hat ein Feld „Nr." mit Kreuz E oder A, was auf einen
   gemeinsamen Zähler deutet. Empfehlung: ein Parameter je Einsatz, Vorbelegung
   gemeinsam.
2. Wer nummeriert, wenn keine FmZ besetzt ist. Empfehlung: Ist in der Präsenz
   kein Arbeitsplatz mit Stelle FmZ, vergibt die Maske des Verfassers die
   Nummer beim Aufgeben; sonst bleibt das Feld leer, bis die FmZ nachweist.
3. Stelle als Einstellung des Arbeitsplatzes (Vorschlag) oder abgeleitet aus
   der Besetzung der Dienstposten im Blatt Führungsstelle. Die Dienstposten
   kennen Funktion und Besetzung mit Namen, aber keinen Arbeitsplatz; die
   Ableitung bräuchte die Zuordnung Person zu Rechner, die es nicht gibt.
   Empfehlung: Einstellung, später aus den Dienstposten vorbelegen.
4. Keine Vorschau mit jsPDF im Renderer (Vorschlag), die Maske ist der
   Vordruck. Alternative: Canvas-Vorschau nach dem Muster der Web-App.
5. Umgang mit der Web-App im Submodul: upstream in ein eigenes
   Workspace-Paket trennen (Empfehlung), oder nur `src/` per `paths`
   einbinden und den Workspace-Eintrag weglassen.
6. Ton bei Blitz-Nachricht. eStab spielt eine WAV-Datei; die Führungsstelle
   ist laut. Empfehlung: ja, abschaltbar je Arbeitsplatz, nur bei Blitz.
7. Automatischer Druck jeder gesichteten Nachricht für S2, wie eStab.
   Empfehlung: nein als Vorbelegung, ein Schalter je Arbeitsplatz.
8. Ob Ausgänge nach der Beförderung noch einmal zum Sichter laufen
   (`sichtungAuchAusgang`, eStabs `si_in_out`). Die Lehrunterlage (Folie 30)
   führt den Ausgang zurück zum Auftraggeber und über S2 ins ETB, nicht zum
   Sichter. Empfehlung: nein, als Parameter zuschaltbar.
9. Meldevordruck. Die Bibliothek zeichnet auch den Meldevordruck mit 26
   Zeilen. Ob die Lagemeldung an die übergeordnete Stelle (DV 1-100 8.2.1) als
   eigene Nachrichtenart mit diesem Vordruck kommt, ist ein eigener Entwurf.
10. Name des Reiters: „Nachrichten" (Vorschlag) oder „Vordrucke". Die
    Lehrunterlage sagt Nachrichtenvordruck, die Helfer sagen Vierfach.
