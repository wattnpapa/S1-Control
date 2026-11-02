# Entlastung der Oberfläche: weniger auf einmal, nichts weniger

Stand 2026-11-02: Entwurf, nicht umgesetzt. `mockups-entlastung.html` im
selben Ordner zeigt die Bilder (Runde 6, Optionen 6a bis 6g, Beispiellage
„Hochwasser Oldenburg" wie in `../oberflaeche/mockups.html`, Zahlen wie in der
Aufnahme `../funkplan/stand/einheitentabelle-funk.png` vom 02.11.2026). Die
Gestaltungsebene aus Runde 2 (Marken, Schriften, Karten, Option 2a) bleibt
unverändert. Der Entwurf ordnet neu, was wann sichtbar ist.

## 1. Anlass

Die Anwendung wurde mehreren Helfern vorgeführt. Die Rückmeldung war
einhellig: zu viel auf einmal, man weiß nicht, wo man hinsehen soll. Die
Audits vom 29.10.2026 (`docs/audits/v2-2026-10-29/`) sagen dasselbe mit
Fundstellen. Der Leiter Führungsstelle findet Status und Stärke nicht ohne
Scrollen (P1-5), dieselbe Zahl folgt je Ansicht einer anderen Konvention
(P2-6), die Konflikthinweise in der Statuszeile führen nirgendwohin (P2-9).
Der neue Nutzer sieht zwei Blätter ohne Einstieg (P1-1), eine Statusleiste,
deren Lesart nirgends steht (P2-2), und Bedienhinweise, die Insiderwissen
sind (P2-3).

Der Befund lässt sich messen. Das Blatt Lage bei 1320×860 (Option 6a) zeigt
die erste Einheit bei 457 Pixel Höhe, also in der unteren Hälfte des
Fensters. Darüber stehen 54 bedienbare Elemente.

| Bereich | Elemente | ohne Auswahl nutzbar |
|---|---|---|
| Kopfband, vier Zeilen | 18: Einsatzauswahl, Regel, Hilfe, vier Erscheinungsbilder, elf Reiter | 18 |
| Werkzeugzeile der Lage | 3: Bogen einlesen, Stärke-Monitor, Rückgängig | 2 |
| Karte Abschnitte | 10: Hilfe, Anlegen, Umbenennen, Typ ändern, Zeichen, Umhängen, Auf, Ab, Auflösen, Aufgelöste ausblenden | 3 |
| Karte Einheiten | 23: Hilfe, Aus Vorlage, Verschieben, Aufteilen, Zusammenführen, Kopieren, Entfernen, Ablösung anfordern, Funk, Suche, sechs Spaltengruppen, sechs Statusfilter, Gliederung | 16 |

Dazu stehen vier Angaben zweimal im Fenster: die Ist-Stärke im Kopfband und
in der Statuszeile, dann Stand, Share und Arbeitsplätze in der Zustandszeile
des Kopfbands und noch einmal in der Statuszeile. Die Spalte Abschnitt
wiederholt den Baum, der daneben steht. Zwölf Karten tragen eine eigene
Hilfemarke „?".

Die Ursache ist kein einzelner Fehler, sondern eine Regel, die sich über
fünf Entwurfsrunden summiert hat: Alles, was es gibt, steht immer da, und was
gerade nicht geht, steht grau da. Jede Runde (Anforderungen, S4, Funkplan)
brachte einen Reiter und zwei bis vier Knöpfe mit, jeder für sich begründet.
Elf Reiter bedienen inzwischen vier Rollen, S1, Vermeldezentrale, S4 und
Abrechnung, dazu den Meldekopf als eigene Betriebsart. Wer S1 ist, sieht
sechs Reiter, die ihn nicht betreffen, und sucht die eigenen dazwischen.

## 2. Leitsätze

Sechs Regeln, an denen jede Ansicht gemessen wird. Sie gelten für das
Lagebild und ebenso für Funkplan, Versorgung, Eingang und die Masken.

Erstens, Daten vor Werkzeug. Über der ersten Datenzeile steht je Karte eine
Kopfzeile, nicht vier. Die erste Einheit steht im oberen Drittel des
Fensters.

Zweitens, Werkzeuge folgen der Auswahl. Was eine gewählte Zeile braucht
(Verschieben, Aufteilen, Kopieren, Funk, Ablösung, Entfernen; Umbenennen,
Umhängen, Auflösen), erscheint erst mit der Auswahl, als Leiste am Fuß der
Karte und als Kontextmenü an der Zeile. Ohne Auswahl ist davon nichts zu
sehen, auch nicht grau.

Drittens, Häufiges sichtbar, Seltenes im Menü. Jede Karte hat einen
gefüllten Hauptknopf (Einheit anlegen, Abschnitt anlegen, Rufgruppe
anlegen) und ein Menü „⋯" für den Rest. Themenschalter, Hilfe,
Stärke-Monitor, Diagnose und der Weg zur Einsatzauswahl stehen in einem
Fenstermenü, nicht in der prominentesten Zeile des Fensters.

Viertens, jede Zahl steht einmal. Die Ist-Stärke im Kopfband, der Stand in
der Statuszeile. Was im Baum steht, steht nicht als Spalte in der Tabelle.

Fünftens, nichts fällt weg. Jede Funktion bleibt erreichbar, über Menü,
Kontextmenü oder Kürzel. Die Kürzel ändern sich nicht. Wer die Anwendung
heute kann, findet alles wieder, nur nicht mehr alles gleichzeitig.

Sechstens, die Rolle wählt den Zuschnitt. Ein Arbeitsplatzprofil
(Führungsstelle S1, Vermeldezentrale, Versorgung S4, alle Blätter) bestimmt,
welche Reiter im Kopfband stehen; die übrigen stehen unter „Mehr". Kein
Expertenmodus und kein zweiter Bedienweg: dieselbe Oberfläche, anders
beschnitten.

## 3. Entscheidungen

### 3.1 Kopfband mit zwei Zeilen statt vier (6b, 6d)

Zeile 1 trägt links Marke und Einsatzname mit Führungsstelle, in der Mitte
Ist-Stärke und taktische Zeit in der bekannten Größe, rechts eine
Zustandsmarke und das Fenstermenü. Zeile 2 trägt die Reiter des Profils und
„Mehr". Die Zustandszeile entfällt; ihr Inhalt steht in der Statuszeile am
Fuß, wo er heute schon ein zweites Mal steht. Die Zustandsmarke rechts oben
sagt nur, ob dem Bild zu trauen ist (aktuell, Share nicht erreichbar,
Verbindung unterbrochen), und zeigt im Tooltip, was die Statuszeile
ausführt. Das Wortbild „S1-Control" wird klein; der Einsatzname ist, was der
Bediener wissen muss.

Das Fenstermenü „⋯" enthält Hilfe und Tastenkarte (Strg+H), Erscheinungsbild
(Standard, Dunkel, Feld, Nacht als Untermenü), Stärke-Monitor, Diagnose,
Programmpaket holen, Abmelden in der Web-Schale und Einsatz schließen. Der
Hilfeknopf und die vier Themenknöpfe verschwinden damit aus dem Kopfband;
ein Erscheinungsbild wird einmal je Gerät gewählt und dann selten wieder.

Verworfen wurde eine Modulleiste links (Runde 1, Option 1a). Die Breite
fehlt der Einheitentabelle, und die Reiter oben sind seit Runde 2 gelernt.

### 3.2 Reiter nach Profil statt elf (6d)

Das Profil ist eine Einstellung dieses Arbeitsplatzes, neben Anzeigename und
Betriebsart, und wird auf der Einsatzauswahl gewählt. Es ist ein Zuschnitt,
kein Recht: Jedes Blatt bleibt unter „Mehr" erreichbar.

| Profil | Reiter im Kopfband | unter „Mehr" |
|---|---|---|
| Führungsstelle (S1), Vorgabe | Lage · Eingang · Führungsstelle · Ausgaben · Tagebuch | Funkplan, Versorgung, Kosten |
| Vermeldezentrale | Funkplan · Lage · Tagebuch | Eingang, Führungsstelle, Versorgung, Kosten, Ausgaben |
| Versorgung (S4) | Versorgung · Lage · Ausgaben | Eingang, Führungsstelle, Funkplan, Kosten, Tagebuch |
| Alle Blätter | wie heute, elf Reiter | keine |

Zwei Zusammenlegungen: „Eingang" trägt Eingangskorb und Anforderungen als
Umschalter im Blatt, denn beides ist, was von außen hereinkommt, und das
Audit nennt beide als Blätter ohne Einstieg. „Führungsstelle" trägt
Stammdaten, Dienstposten, Schichtplan und die Führungsorganisation (Harke)
als Umschalter; beide beschreiben die Struktur der Führung. Diagnose wandert
ins Fenstermenü, sie ist kein Blatt des Betriebs.

Die Betriebsart Meldekopf bleibt, was sie ist. Sie ist das fünfte Profil mit
eigenem Zuschnitt und steht in derselben Auswahl.

### 3.3 Werkzeugzeile der Lage entfällt (6b, 6e)

„Erfassungsbogen einlesen" wird ein Eintrag im Hauptknopf „Einheit anlegen"
der Einheitenkarte (Aus Vorlage Strg+N, Ohne Vorlage, Erfassungsbogen
einlesen Strg+Q). „Stärke-Monitor" steht im Fenstermenü. „Rückgängig" steht
in der Statuszeile rechts mit dem Namen des letzten Schritts („Rückgängig:
Status geändert, FGr WP 1"), immer an derselben Stelle. Nach jedem Schreiben
erscheint links daneben die Bestätigung („Status von FGr WP 1 → Einsatz,
gespeichert"), die nach zehn Sekunden verblasst. Das beantwortet die Frage
„habe ich das jetzt gespeichert?" (Audit neuer Nutzer P2-3) und macht den
grauen Knopf verständlich (P0-2).

### 3.4 Abschnittsbaum mit einem Knopf (6b, 6e)

Der Kopf der Karte trägt „Abschnitte" und den Hauptknopf „Abschnitt
anlegen", darunter einmal die Spaltenköpfe „Einh. · Fü/UFü/He" (Audit
P2-2). Die Zeile „Alle Bereiche" oben hebt die Auswahl auf. Die gewählte
Zeile trägt rechts „⋯" mit Umbenennen, Typ ändern, Zeichen, Umhängen, Nach
oben, Nach unten, Auflösen; dasselbe Menü öffnet der Rechtsklick.
„Aufgelöste anzeigen" steht am Fuß der Karte als Schalter, nur wenn es
aufgelöste gibt.

### 3.5 Einheitentabelle mit einem Kopf, einer Filterzeile, einer Auswahlleiste (6b, 6c, 6e)

Der Kopf trägt „Einheiten (20)", den Hauptknopf „Einheit anlegen", die Suche
und den Knopf „Spalten". Darunter eine Zeile mit den Statusfiltern,
beschriftet „Filter", damit die Chips als Filter erkennbar sind (P2-2). Das
ist alles über der Tabelle.

„Spalten" enthält die sechs Spaltengruppen als Häkchen, dazu „Gliederung
nach Bereich" und „Stillgelegte zeigen". Vorgabe sind Grunddaten und Stärke.
Die Spalte Personalerfassung bleibt ausgeblendet, solange sie nur einen Wert
kennt, und Herkunft steht ohne das Präfix ORTSVERBAND (Audit P1-2). Ist im
Baum kein Abschnitt gewählt, steht die Tabelle in Gliederung nach Bereich
mit Zwischensummen, wie die Stärketabelle auf Papier; ist einer gewählt,
entfällt die Spalte Abschnitt. In beiden Fällen stehen Bezeichnung, Status,
Schicht und Stärke ohne waagerechtes Scrollen im Bild (P1-5).

Die Auswahlleiste erscheint am Fuß der Karte, sobald eine Zeile gewählt ist:
„1 gewählt: FGr WP 1 OV Oldenburg" und die Schritte Verschieben Strg+M,
Aufteilen, Zusammenführen, Kopieren Strg+K, Ablösung anfordern, Funk,
Entfernen Strg+E. Bei zwei gewählten Zeilen bleibt, was mit zweien geht.
Esc hebt die Auswahl auf. Der Rechtsklick auf eine Zeile öffnet dieselben
Schritte als Kontextmenü. Die Fußnote „Doppelklick bearbeitet die Zelle"
steht, bis die erste Zelle an diesem Arbeitsplatz geschrieben ist, danach in
der Hilfe.

### 3.6 Einstieg je Blatt statt zwölf Hilfemarken (6b, 6e)

Die zwölf „?"-Marken an den Kartenköpfen entfallen. Stattdessen trägt jedes
Blatt beim ersten Aufschlagen eine Zeile unter dem Kopfband, die in einem
Satz sagt, was das Blatt ist, mit der Brücke zur Excel („Eingang:
Erfassungsbögen vom Meldekopf und Anforderungen, die Spalten Ablösung
angefordert und Zugesagt der Excel als Vorgang"), und „Verstanden". Danach
steht derselbe Satz oben in der Hilfe (Strg+H). Die Hilfe selbst bleibt,
wie sie ist.

### 3.7 Fachblätter nach demselben Muster (6f)

Funkplan: Das Band mit den Kennzahlen bleibt, es ist die Arbeit der
Vermeldezentrale in Zahlen. Die Werkzeugzeile schrumpft auf den Umschalter
(Je Rufgruppe, Je Bereich, Funkproben), den Hauptknopf „Rufgruppe anlegen",
die Suche und „⋯" (Schwelle, Ausdruck). Funkprobe eintragen und „kein
Kontakt" stehen in der Auswahlleiste der gewählten Einheit, wo sie
hingehören: Eine Funkprobe gilt einer Einheit.

Versorgung: dasselbe. Mahlzeitenregel, Ausgabestelle anlegen und die zwei
Bestelllisten gehen in „⋯", der Umschalter bleibt. Eingang: Filter in einer
Zeile, Übernehmen als Hauptknopf der gewählten Meldung. Anforderungen:
Zusagen, Eingetroffen, Stornieren und die drei Rücknahmen in die
Auswahlleiste.

### 3.8 Einsatzauswahl (6g)

Die Einsatzliste steht zuerst und groß, je Einsatz eine Zeile mit Name,
Status, Stand und Einheiten, „Öffnen" als Hauptweg. „Neuer Einsatz" ist ein
Knopf, der eine Maske mit Name, Datum und den Stammdaten öffnet (Audit
P1-5: heute wird ein Einsatz ohne Stammdaten angelegt). Die Einstellungen
des Arbeitsplatzes stehen eingeklappt darunter in einer Zeile („Dieser
Arbeitsplatz: Meier, Führungsstelle (S1), \\nas\einsaetze, Ändern"), in
der Maske jedes Feld mit einem Satz, was es bewirkt.

## 4. Was bleibt

Marken, Schriften, Karten, Statusmarken und die vier Erscheinungsbilder aus
Runde 2. Der Abschnittsbaum links, die Einheitentabelle rechts, die
Inline-Bearbeitung mit Doppelklick, Enter und Esc. Alle Kürzel. Die
Projektion der Tabelle und ihre Spaltengruppen; nur Vorgabe und Reihenfolge
ändern sich. Alle Blätter, alle Masken, alle Ausgaben, alle
Monitoransichten. Die Betriebsart Meldekopf.

## 5. Zahlen vorher und nachher

Blatt Lage bei 1320×860, nichts gewählt.

| | heute (6a) | Entwurf (6b) |
|---|---|---|
| Zeilen im Kopfband | 4 | 2 |
| Reiter | 11 | 5 und „Mehr" |
| bedienbare Elemente über der ersten Einheit | 54 | 19 |
| erste Einheit bei | 457 px | 300 px |
| Angaben, die zweimal stehen | 4 | 0 |
| Spalten bis zur Stärke | 14 | 6 |
| Hilfemarken im Blatt | 2 | 0 |

Mit gewählter Zeile (6c) kommen sieben Schritte in der Auswahlleiste dazu,
und nur dann.

## 6. Architektur und Schnitte

Der Entwurf ist fast ganz Renderer. Ein Feld kommt zum Kontrakt: `profil`
in den Einstellungen des Arbeitsplatzes (additiv, Vorgabe
`fuehrungsstelle`), gespeichert wie `betriebsart` und `theme`. Kein
Ereignis und keine Projektion ändert sich; Zählregeln und Spaltenprojektion
bleiben in Ring 2. Die Ringgrenzen aus README-v2.md sind nicht berührt.

Vier Schnitte, jeder für sich lieferbar, in dieser Reihenfolge.

E1, Kopfband und Statuszeile: zwei Zeilen, Fenstermenü, Zustandsmarke,
Bestätigung und Rückgängig in der Statuszeile, Stärke nur noch oben.
Dateien `Kopfband.tsx`, `Statuszeile.tsx`, `Arbeitsplatz.tsx`, `Lage.tsx`
(Werkzeugzeile entfällt), `Monitorwahl.tsx`, `Ruecknahme.tsx`.

E2, Lage: Hauptknopf mit Menü, „Spalten", Auswahlleiste und Kontextmenü in
Baum und Tabelle, Vorgabespalten, Gliederung ohne Auswahl. Dateien
`Abschnittsbaum.tsx`, `Einheitentabelle.tsx`, `Tabellengliederung.tsx`,
`Statusleiste.tsx`, `Einheitenspalten.ts`. Hier liegt die meiste Arbeit;
`Abschnittsbaum.tsx` (507 Zeilen) und `Einheitentabelle.tsx` (408) sind
dabei zu teilen (AGENTS.md, Abschnitt 6), die Auswahlleiste und das
Kontextmenü werden eigene Bausteine, die Funkplan und Anforderungen
wiederverwenden.

E3, Profil und Reiter: Feld im Kontrakt, Auswahl auf der Einsatzauswahl,
`blaetter.ts` liefert die Reiter je Profil, „Mehr", Zusammenlegung von
Eingang und Führungsstelle als Umschalter.

E4, Fachblätter und Einsatzauswahl: Funkplan, Versorgung, Eingang,
Anforderungen nach 3.7, Einsatzauswahl nach 3.8, Einstiegszeile je Blatt.

Tests je Schnitt: Renderer-Tests für Sichtbarkeit (ohne Auswahl keine
Zeilenwerkzeuge, mit Auswahl die Leiste), Profil zu Reitern, Fenstermenü,
Bestätigung nach dem Schreiben. Die bestehenden Tests, die Knöpfe über ihren
Namen finden, ändern sich dort, wo der Knopf in ein Menü wandert.

## 7. Offene Fragen

Gliederung nach Bereich als Vorgabe ohne Auswahl, oder flache Liste wie
heute? Der Entwurf nimmt die Gliederung, weil sie die Stärketabelle auf
Papier ist und die Spalte Abschnitt ersetzt.

Statusfilter als Zeile über der Tabelle (6b) oder im Menü „Spalten"? Der
Entwurf lässt sie sichtbar: Die Zahl je Status ist für die Führung eine
Auskunft, nicht nur ein Filter.

Rechtsklick als Kontextmenü: Im Browser legt sich das Menü des Browsers
darüber, `preventDefault` nimmt es weg; in Electron gibt es kein eigenes.
Auf dem Handy ersetzt langes Drücken den Rechtsklick, und die Auswahlleiste
trägt dort ohnehin jeden Schritt.

Soll das Profil die Monitoransicht vorbelegen (S4 zu Versorgung,
Vermeldezentrale zu Funkplan)? Naheliegend, nicht im Entwurf.

Die Einstiegszeile je Blatt: je Gerät gemerkt oder je Arbeitsplatz in den
Einstellungen? Der Entwurf nimmt das Gerät, weil die Zeile keinen Einsatz
betrifft.
