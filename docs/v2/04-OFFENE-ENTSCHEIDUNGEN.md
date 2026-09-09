# 04 – Offene Entscheidungen für Johannes

Stand: 2026-09-09 · Quelle: Urteil §13, ergänzt um die Betriebsparameter vom 2026-09-07. Bereits beantwortet und hier nicht mehr aufgeführt: NAS (Synology), NTP (vorhanden), Client-OS (Windows 11 ohne Admin-Rechte), gleichzeitige Rechner (1 bis 5), macOS/Linux (berücksichtigen), Altdaten (keine).

> **Stand 2026-09-08: entschieden.** Johannes hat am 2026-09-08 die Empfehlungen angenommen („wir gehen den Weg, den du für sinnvoll hältst") und den Feldversuch beantwortet: v1 startet auf den FüSt-Rechnern ohne Admin-Rechte. Die getroffenen Beschlüsse je Nummer stehen in [05-UMSETZUNGSPLAN.md](05-UMSETZUNGSPLAN.md) Abschnitt 1. Offen bleiben nur noch Nr. 2 (Stunden je Woche, Planannahme 10), Nr. 10 (größter Einsatz, Annahme 100 bis 300 Einheiten) und Nr. 12 (Windows-Rechner benennen). Die Tabelle unten bleibt als Begründung der Optionen stehen.

Die Entscheidungen 1, 2 und 4 müssen vor M0 fallen, weil sie den Meilensteinzuschnitt bestimmen. Alle anderen können bis zum jeweils genannten Meilenstein warten.

**Neu am 2026-09-09:** Aus der Simulation M0.4 sind drei Konzeptentscheidungen hinzugekommen — Nr. 14, 15 und 16 im Abschnitt unter der Tabelle. Sie betreffen KONZEPT-SPEICHER.md.

> **Stand 2026-09-09: 19 bis 22 laufen mit den Vorschlägen an.** Johannes hat
> entschieden, die vier Vorschläge als Startwerte zu nehmen, damit M1.2 nicht auf
> die FüSt wartet („nimm die Vorschläge als Startwerte und mach mit M1.2
> weiter"). Startwert heißt nach dem Muster von §10 in KONZEPT-SPEICHER.md: Der
> Wert ist austauschbar, ohne dass sich eine Regel ändert. Die Fragen an die FüSt
> bleiben offen und werden durch diese Entscheidung nicht beantwortet; was eine
> späte Antwort kostet, steht je Nummer unten.

**Ebenfalls neu am 2026-09-09:** Die fachlichen Klärungen mit der FüSt am Ende des Dokuments sind als Nr. 19 bis 22 ausgeschrieben. Sie sind der Einstieg in M1 (siehe [../v2-arbeitsstand/auftraege/M1-einstieg.md](../v2-arbeitsstand/auftraege/M1-einstieg.md)) und gehören **vor** den Ereigniskatalog M1.2 beantwortet. Anders als 1 bis 18 kann Johannes sie nicht allein entscheiden — sie brauchen die FüSt.

> **Stand 2026-09-09: Nr. 14 bis 18 sind alle entschieden.**
>
> * **14 → A** und **16 → (a)**: in KONZEPT-SPEICHER.md nachgezogen (§4.6 Schritt 2 und 5, §8.6.1 Regel 4) und im Code umgesetzt.
> * **15 → beide Präzisierungen**, **17 → B**, **18 → A**: entschieden, aber **noch nicht umgesetzt**. Der Auftrag dazu steht in [../v2-arbeitsstand/auftraege/M0-nacharbeit-3.md](../v2-arbeitsstand/auftraege/M0-nacharbeit-3.md).
>
> Die Herleitungen unten bleiben als Begründung stehen.

| Nr. | Entscheidung | Optionen und Folgen | Empfehlung | Fällig |
|---|---|---|---|---|
| 1 | **Zielumfang** | Excel-Parität (alle Anforderungen F-A1 bis F-L6 und N-1 bis N-9): 20,5 bis 32 PW. Oder „besser als die Excel für Lage führen und ausdrucken" (M0 bis M4): 10 bis 14 PW; Kosten, Schichtplan, Logistik laufen so lange in der Excel weiter | das kleinere Ziel; Parität als zweite Stufe | vor M0 |
| 2 | **Verfügbarkeit** | Stunden je Woche. Der v1-Rhythmus (21 Commit-Tage in 104 Kalendertagen, zehn Wochen Pause) legt 8 bis 12 nahe. Daraus folgen Kalenderdaten und Abbruchdaten je Meilenstein | Zahl festlegen und in 03-MEILENSTEINE.md eintragen | vor M0 |
| 3 | **Feldversuch M-1** | Ein halber Tag an einem echten FüSt-Rechner mit dem heutigen v1-Installer: per-User-Installation, Update ohne Elevation, Start der unsignierten EXE. Negativ beim Start ⇒ jeder Desktop-Ansatz fällt | sofort durchführen, Ergebnis in den ADR-Ordner | vor allem anderen |
| 4 | **Geteilter Kern `@bos/kern` ja oder nein** | Ja: höchster Wiederverwendungsgewinn, Google-Tabelle entfällt, Meldekopf-Apparat eingebettet; dafür zwei Repos im Gleichschritt und Vorleistung 3 bis 5 PW. Nein: schmales gepinntes EEB-Paket (~0,5 PW), Meldekopf-Apparat in S1 nachbauen. **Das ist zugleich die Wahl zwischen A und C** | Ja, mit schmalem Erstschnitt, sechs Aufnahmeregeln und dokumentiertem Rückweg (ADR-003) | vor M0 |
| 5 | **Werkzeugkette** | Start auf TS 7, Vite 8, Vitest 4, Electron 43, ESM (Stand des Erfassungsbogens) statt v1-Stand TS 5.7, Vite 6, Vitest 3, Electron 35, CommonJS | ja; auf der grünen Wiese kostet es nichts und schließt die Werkzeugschere | M-0 |
| 6 | **Windows-Codesignatur** | Ohne: SmartScreen-Warnung bei jeder Installation, Share-Update-Weg muss zwingend Ed25519-signiert sein. Mit: laufende Kosten, Ablaufdatum pflegen | zunächst ohne, Entscheidung nach M-1 | M7 |
| 7 | **LAN-Peer-Update** | Streichen (Annahme aller drei Vorschläge) oder harte Anforderung (+1,0 PW) | streichen; Update über den Share ersetzt es | M7 |
| 8 | **Synthetische Referenzlage** | Es gibt keine gefüllten Excel-Mappen. Eine realistische Übungslage muss einmal von Hand in der Excel erfasst und ausgedruckt werden; sie ist das Abnahme-Orakel für Kennzahlen, Goldfiles und Ausdrucke. Fachhandarbeit, keine Entwicklung | wer macht sie, bis wann; spätestens vor M4 | M3 |
| 9 | **Rollen und Rechte** | Zum Start streichen: Excel und v1 kennen sie nicht; der Ereigniskatalog braucht sie nur bei Archivieren und Kompensation fremder Ereignisse | streichen; alle Clients gleichberechtigt, Nachvollziehbarkeit über den Akteur im Ereignis | M2 |
| 10 | **Größter Einsatz bisher** | Einheiten, Fahrzeuge, Dauer. Bestimmt Poll- und Fold-Kostenrahmen | bis zur Antwort Auslegung auf 100 bis 300 Einheiten, 5.000 als obere Schranke | M0 |
| 11 | **UDP-Beschleuniger** | Wird eine Windows-Firewall-Eingangsregel ohne Admin-Rechte je aktiv? Wenn nein: UDP streichen, Zusage „unter 1 Sekunde" durch „Poll-Intervall plus Cache, ehrlich angezeigt" ersetzen | im Feldversuch M-1 mitprüfen (`Get-NetFirewallRule`); im Zweifel streichen | M-1 |
| 12 | **Windows-Entwicklungsmaschine** | Entwickelt wird auf macOS; mindestens sieben Arbeitspakete sind Windows-spezifisch (Installer, Update, SMB-Cache, Firewall, SmartScreen, Zweitmonitor, Handscanner) | Rechner benennen, spätestens für M0 | M0 |
| 13 | **Zielplattformen** | Vier gebaute Plattformen sind Dauerlast | Windows Produkt, macOS Entwicklungsplattform mit Best-Effort-Paket, Linux nur CI-Lauf | M7 |

## Konzeptentscheidungen aus M0.4 — zwei Stellen in KONZEPT-SPEICHER.md

Beide sind in der Simulation M0.4 aufgefallen, beide sind **Entscheidungen am
Konzept und nicht am Code**, und beide sind bewusst nicht getroffen worden. Die
Herleitung steht in [messungen/M0.4-simulation.md](messungen/M0.4-simulation.md),
Abschnitt 4 und Abschnitt 2.

### 14 · §8.6.1 Regel 4 hält nicht, wenn die Beschädigung spät entdeckt wird — **entschieden: A**

**Was heute zugesagt ist.** Regel 4: Weil Ausgang B eine Beschädigung ohne fremde
Schreibspur ist, schreibt der Schreiber den fehlenden Teil als Ersatzsegment nach
§4.6 neu — „danach gilt die Konvergenzzusage für die betroffenen Leser wieder".

**Warum das nicht trägt.** Wird die Beschädigung erst entdeckt, nachdem der
Schreiber das Segment verlassen hat, heilt das Ersatzsegment nur das **eine**
beschädigte Segment. Die inzwischen geschriebenen Folgesegmente bleiben für den
betroffenen Leser dauerhaft unlesbar: Ihr Kettenanker ist nach §2.3 die letzte
Zeile des Vorgängers, und die liegt hinter der Quarantänestelle. Der Leser kann
sie nicht prüfen, ohne Unbestätigtes als bestätigt zu führen — was §8.2
ausdrücklich verbietet. §8.2 Punkt 7 sagt für genau diesen Zustand „die
Konvergenzzusage ist ausgesetzt, solange die Quarantäne besteht"; §8.6.1 Regel 4
lässt sie wieder gelten. Die beiden Sätze widersprechen sich, und der
Widerspruch wird sichtbar, sobald §4.6.1 Auslöser 1 greift — also im Regelfall,
denn der hängt am nächsten Programmstart.

**Die drei Richtungen.**

| | Was geändert wird | Was es kostet | Was es aufgibt |
|---|---|---|---|
| A | §8.6.1 Regel 4 präzisieren: Die Zusage gilt nur für die Ereignisse des ersetzten Segments. Alles danach bleibt für den betroffenen Leser ausgesetzt, bis er den Einsatz mit einem gesunden Spiegel neu aufsetzt (§8.6.1, Exportweg) | Nur Text; der Code tut das bereits | Ein Leser, den eine späte Beschädigung trifft, braucht einen Bedienschritt, um wieder mitzulesen |
| B | Das Ersatzsegment auf **alle** Segmente ab der Fehlerstelle ausdehnen | Verändert §4.6 erheblich; der Schreiber wiederholt unter Umständen sehr viele Ereignisse, und jeder Anlauf kann nach §8.8 abbrechen | Die Zusage „ein Ersatzsegment je Beschädigung"; die Datenmenge je Reparatur ist nicht mehr beschränkt |
| C | Dem Leser erlauben, ein Folgesegment ohne prüfbaren Anker zu lesen und als „ungeprüfte Kette" zu kennzeichnen | Bricht mit §8.2 und mit §1.3 | Die Zusage, dass nur geprüfte Zeilen in den Fold gehen — der Kern des Verfahrens |

**Einordnung, keine Entscheidung.** A ist die einzige Richtung, die keine
Zusage aufgibt: Sie schreibt auf, was §8.2 Punkt 7 ohnehin schon sagt, und
löst den Widerspruch zugunsten des strengeren Satzes. B ist fachlich
verteidigbar, wenn der Wiederanlauf ohne Bedienschritt gefordert ist — dann
gehört aber auch entschieden, wo die Obergrenze der zu wiederholenden Menge
liegt. C ist aus unserer Sicht nicht tragfähig; sie ist der Vollständigkeit
halber aufgeführt, weil sie in Abschnitt 4 des Protokolls steht.

**Entschieden am 2026-09-09: Richtung A.** §8.6.1 Regel 4 sagt jetzt
ausdrücklich, dass die Zusage nur für die Ereignisse des ersetzten Segments
gilt und für den betroffenen Leser darüber hinaus nach §8.2 Punkt 7
ausgesetzt bleibt, bis er den Einsatz mit einem gesunden Spiegel neu
aufsetzt. Der Code tat das bereits; geändert ist nur der Text. Die Simulation
wertet diesen Ausgang weiterhin als „nicht vergleichbar" nach §7.6 — kein
Fehler, kein Nachweis — und meldet die Quarantänen getrennt, wie §8.6.1
Regel 3 es verlangt.

### 15 · §7.6 braucht zwei Präzisierungen, sonst ist die Ruhephase im Feld nicht messbar — **entschieden: beide**

Beide sind in der Simulation umgesetzt und dort belegt; beide machen die
Ruhephase **schwerer** erreichbar, nicht leichter. Zu entscheiden ist, ob sie in
§7.6 nachgezogen werden.

**(a) Bedingung 2 und 3 hängen am Fortschritt, nicht an den gelesenen Bytes.**
§7.6 verlangt heute „0 Bytes geliefert". Eine Datei in vorläufiger Quarantäne
wird nach §8.1 in **jedem** Takt-B-Durchlauf erneut geprüft und liefert dabei
jedes Mal dieselben unvollständigen Bytes. Wörtlich gelesen wäre die Ruhephase
damit für den Rest der Lage unerreichbar, sobald irgendwo eine Zeile steht, die
niemand mehr vervollständigt — der Fall, den §8.1 ausdrücklich kennt. Und ohne
Ruhephase gibt es keinen Konvergenzvergleich, also auch kein Abbruchkriterium
nach Auflage 18. Vorschlag: Gemessen wird, ob das **gesehene Dateiende**
vorgerückt ist. Dieselbe Unterscheidung trifft `Dateilage.gesehenesEnde` schon
für den Verfall aus §6.2.

**(b) Zwei aufeinanderfolgende Durchläufe reichen gegen die Caches aus §6.6
nicht.** §7.6 begründet die zwei Durchläufe damit, dass ein einzelner leerer
Takt A auch entsteht, wenn ein anderer Client gerade zwischen zwei Zeilen
steht. Das deckt nur den Fall ab, in dem der Leser die Wahrheit sieht. Der
Verzeichnis-Cache hält seine Auskunft 10 Sekunden, der `FileNotFound`-Cache 5;
bei einem Takt B von 4 Sekunden (§6.2) werden **zwei** aufeinanderfolgende
Durchläufe aus derselben zwischengespeicherten Auskunft bedient, und zwei leere
Durchläufe belegen dann nicht, dass nichts da ist. Vorschlag: `2 + ⌈Cache /
Takt⌉` leere Durchläufe. Ohne Caches sind das genau die zwei aus §7.6.

**Warum es nicht warten sollte.** `s1 akte pruefe` (Paket V.3) meldet die
Ruhephase nach der heutigen Fassung falsch — im Feld also gerade dort, wo sie
gemessen werden soll (M0.5, M2.4).

**Entschieden am 2026-09-09: beide Präzisierungen werden nachgezogen.** §7.6
misst den Fortschritt künftig am gesehenen Dateiende statt an gelieferten
Bytes und verlangt `2 + ⌈Cache / Takt⌉` leere Durchläufe. Die Simulation tut
beides seit M0.4; nachzuziehen ist der Konzepttext und alles, was §7.6 sonst
noch umsetzt.

**Umgesetzt am 2026-09-09** (dritte Nacharbeit). §7.6 nennt beide
Präzisierungen jetzt ausdrücklich: Bedingung 2 und 3 verlangen „keinen
Fortschritt" statt „0 Bytes", und die Zahl der geforderten Durchläufe steht
als `2 + ⌈Cache / Takt⌉` samt Begründung im Text. Außerhalb der Simulation
setzt nichts §7.6 um: `s1 akte pruefe` (Paket V.3) ist **noch nicht gebaut**
— die Kommandozeile kennt in diesem Stand allein `diagnose` und `simuliere`
(`packages/cli/src/index.ts`). Der Vermerk „meldet die Ruhephase falsch"
betrifft also ein künftiges Paket, das jetzt gegen die richtige Fassung
gebaut wird.

### 16 · §4.6 setzt beim aufgezeichneten Übertragungsstand an, nicht bei der letzten lesbaren Zeile — **entschieden: (a)**

**Woher der Befund kommt.** Aus dem wiederholten Sweep über achtzehn
Startwerte (Abschnitt 7.5 des Messprotokolls). Sechs Läufe fielen, fünf davon
mit verlorenen Ereignissen. Der Befund ist **reproduziert** — zwei
Wiederholungen je Startwert liefern dieselben Ereignis-Identitäten — und er ist
**älter als die Korrektur aus Aufgabe 4**: Drei von vier nachgefahrenen
Startwerten verlieren mit und ohne diese Korrektur exakt dieselben Ereignisse.

**Der Ablauf, an Startwert 111 Zeile für Zeile nachgemessen.** Arbeitsplatz 1
schreibt unter der Kennung `21e23b8b`, Segment `0000`:

* Lokal enthält das Segment die Zeilen `:378` bis `:406`, 17.073 Byte.
* Die Share-Kopie ist 15.239 Byte groß, aber nach der Beschädigung (§8.2) nur
  bis Offset **11.424** auswertbar. Letzte lesbare Zeile dort: `:396`.
* Der aufgezeichnete Übertragungsstand in `upload-state.json` steht auf
  **13.830** — das ist die Stelle nach Zeile `:400`.
* Das Ersatzsegment `0001` eröffnet mit `:407 [SegmentErsetzt]` und nimmt die
  Zeilen `:401` bis `:406` mit — also alles ab dem **aufgezeichneten** Stand.

Die Zeilen `:397` bis `:400` liegen dazwischen. Sie stehen physisch auf dem
Share, sind hinter der Beschädigung aber für keinen Leser mehr erreichbar, und
das Ersatzsegment nimmt sie nicht mit. Für jeden Leser sind sie fort. Dieselbe
Mechanik erzeugt im selben Lauf die zweite Lücke bei `:434`.

**Warum es niemandem auffällt.** Die Ruhephase nach §7.6 nimmt ersetzte
Segmente ausdrücklich von Bedingung 1 aus — ihre lokalen Restbytes gelten als
„Bytes, die nie wieder übertragen werden" (§4.6, „Die lokale Seite", Punkt 4).
Für die tatsächlich ersetzten Zeilen stimmt das; für die Lücke zwischen
Lesbarkeitsgrenze und aufgezeichnetem Stand stimmt es nicht. Der Lauf meldet
deshalb „Ruhe erreicht" und verliert trotzdem Ereignisse.

**Die Entscheidung.** §4.6 sagt heute nicht, *ab welcher Stelle* das
Ersatzsegment den Inhalt übernimmt. Der Code nimmt den aufgezeichneten
Übertragungsstand. Zur Wahl steht:

* **(a) Ab der letzten lesbaren Zeile übernehmen.** Das Ersatzsegment trägt
  alles, was auf dem Share nicht mehr erreichbar ist. Der Client hat alle
  Zeilen lokal, die Angabe ist also verfügbar. Kostet mehr Bytes im Ersatz und
  erzeugt Zeilen, die auf dem Share doppelt stehen — einmal unlesbar hinter der
  Beschädigung, einmal lesbar im Ersatz. Der Fold entdoppelt über die
  Identität, ein Leser sieht sie nur einmal.
* **(b) Beim aufgezeichneten Stand bleiben und den Verlust benennen.** Dann
  gehört in §4.6 der Satz, dass Zeilen zwischen Lesbarkeitsgrenze und
  Übertragungsstand verloren gehen, und §7.6 Bedingung 1 darf ersetzte
  Segmente nicht mehr pauschal ausnehmen — sonst misst die Ruhephase an der
  Stelle vorbei, an der der Schaden entsteht.
* **(c) Die Lesbarkeitsgrenze schon beim Spiegeln führen.** Der
  Übertragungsstand würde nie über die letzte lesbare Zeile hinauslaufen. Das
  ist der größte Eingriff und trifft §5.4.3.

**Zusammenhang mit Nr. 14.** Beide betreffen §4.6 und beide entstehen daraus,
dass die Reparatur an einem *Byte-Offset* ansetzt statt an der letzten
verketteten Zeile. Sie sind zusammen entschieden worden.

**Entschieden am 2026-09-09: Richtung (a).** §4.6 Schritt 2 nennt jetzt die
letzte für einen Leser auswertbare Zeile als Übernahmestelle und benennt die
doppelt stehenden Zeilen als in Kauf genommenen Preis.

**Was beim Umsetzen dazugekommen ist.** Der Befund wurde an Startwert 111 mit
festem Ordner Zeile für Zeile nachgemessen. Der erste Ersatz war korrekt; die
Zeilen `:397` bis `:400` gingen verloren, weil dasselbe Segment **danach ein
zweites Mal** beschädigt wurde — diesmal *vor* der Übernahmestelle — und §4.6
Schritt 5 („wird nicht mehr beschrieben") als Verbot jeder weiteren Reparatur
gelesen wurde. Damit (a) trägt, ist Schritt 5 präzisiert: Ein Schaden
unterhalb der Übernahmestelle löst eine erneute Reparatur aus, einer ab ihr
nicht. Startwert 111 verliert danach kein Ereignis mehr.

### 17 · Die Datei einer aufgegebenen Kennung repariert niemand mehr — **entschieden: B**

**Woher der Befund kommt.** Aus dem Sweep nach der zweiten Nacharbeit
([messungen/M0.4-simulation.md](messungen/M0.4-simulation.md), Abschnitt 7.7).
Startwert 12345 verliert zwei Ereignisse; beide stehen unter dem Präfix einer
Kennung, die der Arbeitsplatz nach einem Profilklon aufgegeben hat.

**Der Ablauf.** Ein Arbeitsplatz wechselt nach §4.5 die Kennung. Seine alte
Datei ist ab dem Wechsel „der Spiegel einer fremden Datei — nämlich der des
Klons" (§4.5 Schritt 6). Wird sie danach auf dem Share beschädigt (§8.2), gilt:

* Der Leser fällt dort in Quarantäne und liest nicht weiter — richtig so.
* Der ursprüngliche Schreiber hat den Inhalt lokal vollständig, darf dort aber
  nach §4.5 Schritt 6 nichts mehr schreiben.
* Die Vollprüfung beim Öffnen (§4.6.1 Auslöser 1) sieht die Datei gar nicht
  mehr an: Sie bildet ihre Vergleichsmenge aus dem **laufenden** Präfix.

Die Zeilen hinter der Beschädigungsstelle sind damit für jeden Leser fort,
obwohl es einen Rechner gibt, der sie vollständig hat. Gemessen an Startwert
12345: `65654370.0000.jsonl` ist bis 24.306 auswertbar, dort steht `:377`;
`65654370.0002.jsonl` bis 24.194, dort steht `:468`.

**Die Richtungen.**

| | Was geändert wird | Was es kostet | Was es aufgibt |
|---|---|---|---|
| A | Nichts. Der Verlust ist die zugesagte Folge von §4.5 Schritt 6, und der Weg zurück ist der Export aus §8.6.1 Regel 4 — von Hand, sichtbar | Nur Text: §4.5 Schritt 6 und §8.6 sagen es ausdrücklich | Die Zusage, dass geschriebene Ereignisse alle Leser erreichen, gilt nach einem Kennungswechsel mit anschließender Beschädigung nicht mehr |
| B | Die Vollprüfung beim Öffnen nimmt auch die Dateien **aufgegebener** Kennungen wieder auf und repariert eine Beschädigung dort durch ein Ersatzsegment unter der **neuen** Kennung | Ein Lesedurchgang je aufgegebener Datei bei jedem Öffnen (der wurde 2026-09-09 gerade eingespart); die Kosten wachsen mit der Zahl der Wechsel | Nichts an „ein Schreiber je Datei" — geschrieben wird in eine neue eigene Datei. Aber §4.5 Schritt 6 muss sagen, dass die alte Datei für die **Prüfung** eigen bleibt, auch wenn sie fürs Lesen fremd ist |
| C | Der Kennungswechsel nimmt **alle** Zeilen der aufgegebenen Datei mit, nicht nur die ungespiegelten | Verdoppelt im schlimmsten Fall den gesamten bisherigen Bestand dieses Arbeitsplatzes bei jedem Wechsel | Die Beschränkung der Datenmenge je Wechsel |

**Einordnung, keine Entscheidung.** B trifft die Ursache und lässt jede Zusage
stehen; sein Preis ist Laufzeit beim Öffnen, und der ist messbar (M0.5, A10).
A ist ehrlich und billig, gibt aber eine Zusage auf, die im Feld zählt — ein
Profilklon ist nach §4.5 der erwartete Fall, nicht der exotische. C ist der
teuerste Weg und löst nur den Teil, der beim Wechsel schon bekannt ist.

**Entschieden am 2026-09-09: Richtung B.** Die Vollprüfung beim Öffnen nimmt
die Dateien aufgegebener Kennungen wieder auf; eine Beschädigung dort wird
durch ein Ersatzsegment unter der **neuen** Kennung repariert. Damit muss
`SegmentErsetzt` künftig auch das *Präfix* des ersetzten Segments nennen, nicht
nur dessen Nummer — sonst hält `ersetzteSegmente` das Segment `0000` der neuen
Kennung für ersetzt. Der Preis, ein Lesedurchgang je aufgegebener Datei beim
Öffnen, wird in M0.5 unter A10 mitgemessen.

**Umgesetzt am 2026-09-09** (dritte Nacharbeit). §4.5 Schritt 6, §4.6
Schritt 2 und §4.6.1 Auslöser 1 sind nachgezogen; `pruefeBeimOeffnen` nimmt die
aufgegebenen Kennungen wieder auf, `SegmentErsetzt` nennt das Präfix, und
`ersetzteSegmente`, `kettenanker` und der Versionsvektor werten es aus.

**Zwei Grenzen sind beim Umsetzen dazugekommen.** Beide betreffen den Fall,
dass der Klon wirklich existiert und weiterschreibt:

* **Verglichen wird nur der gespiegelte Teil.** Dass auf dem Share mehr steht
  als lokal, ist bei einer aufgegebenen Datei der vorgesehene Zustand, keine
  Verletzung von §5.4.1. Ohne diese Kürzung meldete jeder Vorsprung des Klons
  eine Beschädigung, und der Client schriebe ein Ersatzsegment für Zeilen, die
  er gar nicht hat.
* **Unter einer aufgegebenen Kennung gibt es keinen Ausgang C mehr.** Er
  unterscheidet fremde Schreibspur von verfälschten Bytes — eine Frage, die
  dort schon beantwortet ist. Ihn zu melden löste bei jedem Öffnen einen
  weiteren Kennungswechsel aus.

### 18 · Der Versionsvektor deckt sich nach einer Reparatur nach §4.6 nie wieder — **entschieden: A**

**Woher der Befund kommt.** Ebenfalls aus dem Sweep (Abschnitt 7.7),
Startwert 999. Zwei Phasen ohne Konvergenznachweis, **kein** Verlust, **kein**
roter Ausgang — und in allen Phasen meldet der Bericht „gleiche Ereignismenge:
ja, gleicher Zustand: ja".

**Der Ablauf.** Eine Share-Datei wird nach §8.2 beschädigt. Jeder Leser führt
seinen Spiegel dieser Datei danach bis zur Beschädigungsstelle — genau das,
was §5.5 zusagt: „Ab einer Quarantänestelle ist der lokale Spiegel einer
fremden Datei nicht byteweise identisch mit der Share-Datei — er ist ihr
geprüftes Präfix." Der Schreiber hat sie lokal vollständig. Die fehlenden
Ereignisse holen sich die Leser aus dem Ersatzsegment (§4.6); Zustand und
Ereignismenge decken sich danach wieder.

Der Versionsvektor nach §7.6 zählt aber Datei und Offset. Für das beschädigte
Segment steht beim Schreiber ein größerer Offset als bei jedem Leser, und das
ändert sich nie mehr. §7.6 meldet deshalb dauerhaft „verschiedene
Versionsvektoren, nicht vergleichbar — kein Fehler, aber auch kein Nachweis".
Gemessen an Startwert 999: `00000003.0005.jsonl`, 10.404 bei drei
Arbeitsplätzen gegen 11.860 beim Schreiber.

**Warum das zählt.** Ein Einsatz, in dem einmal nach §4.6 repariert wurde,
kann den Konvergenznachweis nach §7.6 **nie wieder** führen — auch dann nicht,
wenn er nachweislich konvergiert ist. Damit fällt das Abbruchkriterium aus
Auflage 18 für genau die Läufe aus, in denen die Reparatur geprüft wird.

**Die Richtungen.**

| | Was geändert wird | Was es kostet | Was es aufgibt |
|---|---|---|---|
| A | §7.6 nimmt ersetzte Segmente aus dem Versionsvektor heraus, so wie §7.6 Bedingung 1 sie schon aus der Ruhephase herausnimmt | Wenig Text, wenig Code | Nichts Erkennbares — die Ereignisse dieser Segmente stehen im Ersatz und gehen dort in den Vektor ein |
| B | §7.6 vergleicht statt des Vektors die **Menge der Ereignis-Identitäten**. Der Bericht führt sie ohnehin schon mit (`identitaetenHash`) | Ändert das Kriterium an einer tragenden Stelle; der Vektor ist die billigere Prüfung und fängt Fälle, die die Identitätsmenge nicht sieht | Die Aussage „gleicher Vektor" als Vorbedingung des Hash-Vergleichs |
| C | Nichts. Der Ausgang „nicht vergleichbar" ist nach §7.6 kein Fehler, und der Lauf meldet ihn korrekt | Nichts | Den Konvergenznachweis in jedem Lauf, in dem repariert wurde — also in jedem Lauf, der §4.6 prüft |

**Entschieden am 2026-09-09: Richtung A.** §7.6 nimmt ersetzte Segmente aus
dem Versionsvektor heraus — so wie Bedingung 1 sie schon aus der Ruhephase
herausnimmt. Die Ereignisse dieser Segmente stehen im Ersatzsegment und gehen
dort in den Vektor ein; es geht also nichts verloren.

**Umgesetzt am 2026-09-09** (dritte Nacharbeit). §7.6 nennt die Herausnahme,
`erhebeStand` führt sie aus. Sie greift bei **jedem** Client, nicht nur beim
Schreiber: Welche Datei ersetzt ist, steht in der ersten Zeile des
Ersatzsegments, und die hat jeder in seinem Spiegel. Fiele sie nur beim
Schreiber heraus, wären die Vektoren wieder über verschiedene Dateimengen
gebildet und nach dem zweiten Zusatz in §7.6 erneut verschieden.

## Fachliche Klärungen mit der FüSt (kein Entwicklungsthema)

Quellen: Zieldatenmodell (`../v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §6)
und der Handbuch-Bericht (`../v2-arbeitsstand/bestandsaufnahme/excel-handbuch-anforderungen.md`).

**Neu am 2026-09-09:** Vier dieser Klärungen sind hier als Nr. 19 bis 22
ausgeschrieben, weil der Auftrag M1-einstieg verlangt, sie **vor** dem
Ereigniskatalog (M1.2) vorzulegen — mit dem konkreten Widerspruch und mit dem
Vorschlag, der ohne Antwort gilt. Jede Nummer nennt außerdem, was am Katalog
davon abhängt und was sich später noch billig ändern lässt. Der Maßstab dafür
ist §8.7 von `konzepte/KONZEPT-SPEICHER.md`: Ereignisse sind append-only, ein
einmal geschriebener Schlüssel steht für immer in der Akte. **Werte hinzufügen
ist billig, Werte umbenennen oder entfernen kostet einen Upcaster.**

Die fünfte Klärung berührt M1.2 nicht und steht unten.

### 19 · Welche Statusliste gilt — die der Eingabemaske oder die des Status-Blatts?

**Der Widerspruch, wörtlich.** Die Eingabemaske der Excel bietet in Spalte
`Stärke!Z` neun Statuswerte an, darunter „Rufbereitschaft" und
„Einsatzvorbehalt". Die Auswertung auf dem Blatt `Status` zählt mit
`SUMIF(Stärke!$Z…)` gegen die Zeichenketten „Ruf Bereitsch." und
„Einsatzvorbeh." (`Status!B24` ff., EXD §11, KRI §3.1). Die beiden Schreibweisen
sind nicht gleich, also trifft das SUMIF nie zu: **jede Einheit mit einem dieser
beiden Status fällt in der laufenden Excel aus dem Statusbild heraus.** Die
Kontrollsumme `Status!35` bemerkt es nicht, weil sie über dieselben Kurzformen
läuft; die Warnung `Status!G36` meldet nur Einheiten ganz ohne Status.

**Die Frage an die FüSt** ist deshalb nicht „welche Schreibweise ist richtig" —
in v2 ist der Anzeigename nur Beschriftung und der stabile Schlüssel entscheidet
—, sondern: **Sind „Rufbereitschaft" und „Einsatzvorbehalt" im Betrieb je
vergeben worden?** Wenn ja, war das Statusbild der Excel jahrelang unvollständig,
und das sollte die FüSt wissen, unabhängig von v2. Wenn nein, sind es zwei
Karteileichen aus der Vorlage.

**Was am Katalog daran hängt.** `EinheitGemeldet.status` und
`StatusGesetzt.{vorher,neu}` tragen den Schlüssel als Nutzlast. Neun Werte statt
sieben kosten nichts an Regelwerk — die Konfliktregel ist in beiden Fällen
LWW/Feld. Teuer ist nur die Gegenrichtung: Wer zuerst sieben Werte festschreibt
und später `RUFBEREITSCHAFT` nachrüstet, hat einen Upcaster mehr; wer neun
festschreibt und zwei davon nie benutzt, hat zwei tote Enum-Einträge.

**Vorschlag ohne Antwort: alle neun Werte behalten** (wie §6 Frage 2). Der
Katalog schreibt die neun Schlüssel aus §2.2 fest und vermerkt bei den beiden
strittigen ausdrücklich, dass ihre Benutzung im Betrieb unbelegt ist.

### 20 · Was bedeuten HK, MT, LdF und TLtg. — und die unbeschrifteten Zeichen der FüOrg-Palette?

**Der Befund.** Vier Kürzel stehen in der Excel ohne Auflösung, und die
Abkürzungsliste `AküLi` kennt keines davon (EXH, Abschnitt „Offene Punkte"):

* **HK** in der Organisationsliste „HK/NLWKN" (`Status!B17`, `ERLAUBTE_ORGANISATIONEN`)
  sowie in „Register HK Gerät" und „HK Geräte VPS 24 Vers. 14.3" (`Neu!B12, B20, B21`).
  NLWKN ist der Niedersächsische Landesbetrieb für Wasserwirtschaft, Küsten- und
  Naturschutz [unbelegt]; wofür HK daneben steht, ist offen.
* **MT** als erste Kopiervorlage der THW-StAN (`Stärke!C26`, THW-Einheitstyp Nr. 1).
* **LdF** als FüSt-Funktion (`FüSt!B74`), zwischen „GrFü F/K" und „SprFu".
* **TLtg.** nur in einer Änderungszeile: „Version für TLtg." (`Neu!B14`, Fassung 0.5).
* Dazu das runde **M**-Zeichen der FüOrg-Palette und weitere Bilder ohne
  Beschriftung; die Dateinamen tragen keine Semantik („Grafik N"), nur zwei
  Bilder haben ein `descr`-Attribut (`t-trztr`, `f-flts`).

**Was am Katalog daran hängt — und zwar nur eines der vier.** Allein **HK**
bindet M1.2 hart: §2.1 hat daraus den Organisationsschlüssel
`WASSERWIRTSCHAFT` mit der Anzeige „Wasserwirtschaft (NLWKN/HK)" gemacht. Dieser
Schlüssel steht in der Nutzlast von `EinheitGemeldet` und
`EinheitStammdatenGeaendert` und ist damit append-only. Steht HK für etwas
anderes als eine Wasserwirtschaftsbehörde — eine zweite Organisation, die in der
Excel nur die Zelle mit NLWKN teilt —, dann ist der Schlüssel falsch geschnitten,
und jede bereits geschriebene Einheit trägt den falschen Code.

Die anderen drei binden den Katalog **nicht**, und das gehört zur Antwort dazu:

* **MT** ist ein Eintrag im Vorlagenkatalog (`EinheitVorlage`, §3.2). Vorlagen
  sind Daten, keine Ereignisart — die Klärung gehört zu M1.4, nicht zu M1.2.
* **LdF** ist ein Wert in `dienstposten.funktion`, und das Feld ist nach §1.14
  ausdrücklich **Freitext mit Katalogvorbelegung**. Ein unaufgelöstes Kürzel
  bleibt schlicht als Text stehen.
* **TLtg.** kommt im Datenmodell überhaupt nicht vor; es steht in einer
  Versionshistorie. Ohne Auflösung fehlt nichts.
* Die unbeschrifteten FüOrg-Zeichen betreffen `einheit.taktischesZeichen`
  (gesetzt über `EinheitStammdatenGeaendert`, LWW/Feld). Welche Zeichen es gibt,
  ist eine Katalogfrage von M1.4 und der Lagekarte in M3, keine Frage der
  Ereignisform.

**Vorschlag ohne Antwort.** Bei HK den Schlüssel `WASSERWIRTSCHAFT` behalten,
aber die Anzeige auf „HK/NLWKN" ändern — also das schreiben, was in der Excel
steht, statt eine Deutung zu behaupten, die niemand belegt hat. Der Schlüssel
bleibt damit auch dann tragfähig, wenn HK sich später als etwas anderes
herausstellt: Er ist der Migrationsschlüssel für genau diese Excel-Spalte, und
eine spätere Aufspaltung in zwei Organisationen ist ein normaler Upcaster.
MT, LdF und die Zeichen bleiben unaufgelöste Textwerte in ihren Katalogen, mit
Vermerk „Bedeutung offen"; TLtg. wird nicht weiterverfolgt.

### 21 · Zwei Schichten, drei Schichten, oder beides je Einsatz?

**Der Befund.** Die Excel führt vier Schichtwerte nebeneinander: `Tag`, `Nacht`,
`Früh`, `Spät` (`Stärke!AA`, Auswertung `Log!D..G`, EXD §8.3/§10 Nr. 10). Das ist
kein Widerspruch, sondern eine offene Stelle: Vier Werte in einer Liste sind nur
dann sinnvoll, wenn im selben Einsatz zwei verschiedene Modelle nebeneinander
laufen. Die Vorbelegung ist `Tag` (Kommentar `Stärke!AA4`), also faktisch
Zwei-Schicht-Betrieb. Ob die FüSt je „Früh/Spät/Nacht" geführt hat oder ob die
drei Werte nur der Vollständigkeit halber in der Vorlage stehen, ist unbelegt.

**Was am Katalog daran hängt — weniger, als es aussieht.** §2.3 hat die Frage in
zwei Teile zerlegt und einen davon schon entschieden: `einsatz.schichtmodell`
steuert nur, welche Werte die Maske **anbietet**; ein abweichender Wert wird
**nicht abgelehnt**, sondern erzeugt eine Warnung (Begründung: eine hinzukommende
Feuerwehrbereitschaft kann ein anderes Modell fahren). Für M1.2 heißt das:
`SchichtGesetzt` nimmt jeden der vier Werte an, immer, unabhängig vom Modell —
sonst könnte ein Client ein Ereignis eines anderen Clients nicht falten, und das
wäre stilles Verwerfen. Die FüSt-Antwort ändert also die **Vorbelegung** von
`EinsatzAngelegt.schichtmodell` und die Maske, nicht die Faltregel.

Zwei Punkte bleiben trotzdem an der Antwort hängen:

1. Ob `schichtmodell` überhaupt ein Feld am Einsatz ist. Wird nur ein Modell
   gefahren, ist es eine Konstante und `EinsatzStammdatenGeaendert` braucht das
   Feld nicht.
2. Die Ausnahme aus §2.3 Nr. 4: `schicht` ist Pflicht **außer** im Abschnitt vom
   Typ `ANGEFORDERT` — genau die Ausnahme, die die Konsistenzformel
   `Status!J42` macht. Diese Ausnahme steht unabhängig von der Zahl der
   Schichten und wird im Katalog so festgeschrieben.

**Vorschlag ohne Antwort: `ZWEI_SCHICHT` (Tag/Nacht) als Vorbelegung**, das Feld
`schichtmodell` am Einsatz behalten, alle vier Werte im Schema, Abweichung vom
Modell als Warnung und nie als Ablehnung.

### 22 · Wie wird die Anforderungs-ID gebildet?

**Der Befund.** Das Handbuch sagt zur Spalte `Stärke!O`: Das Format der
Anforderungs-ID ist „mit der zuständigen THW-Ansprechstelle abgestimmt"
(`Hinweise!C24-C25`, EXH F-F1) — welches Format das ist, steht nirgends. Die ID
ist dabei nicht nur eine Beschriftung: Nach EXH F-F3 ist sie das Band zwischen
der abzulösenden Einheit A und der ablösenden Einheit B, beide tragen dieselbe
ID (`image84`, Vorgehen bei Ablösungen), und an Einheit B wird sie später wieder
gelöscht.

**Was am Katalog daran hängt.** Zwei Dinge, und das zweite ist das wichtigere:

1. Ob `AnforderungAngelegt.kennung` nur eingegeben oder auch erzeugt wird. Das
   ist eine Maskenfrage und billig zu ändern.
2. **Ob die Kennung eine Identität ist.** Das ist eine Katalogfrage und nicht
   billig. §3.2 führt `anforderung.id` getrennt von `anforderung.kennung`, und
   der Katalog muss sagen, was bei zwei Anforderungen mit derselben Kennung
   geschieht. Zwei Clients, die bei einer Mehrtageslage unabhängig dieselbe
   Ablösung anfordern, erzeugen zwei `AnforderungAngelegt` mit zwei
   `anforderungId` und derselben Kennung. Verschmelzen wäre falsch (dieselbe
   Kennung wird nach F-F3 absichtlich von zwei Zeilen getragen); stilles
   Nebeneinander wäre eine Doppelanforderung, die niemandem auffällt. Die
   Vorlage dafür steht schon im Katalog: `EinheitGemeldet` behandelt die
   mögliche Dublette als **fachlichen** Hinweis, nicht als technischen Konflikt.

**Vorschlag ohne Antwort:** `kennung` ist optionaler Freitext ohne Formatprüfung,
Konfliktregel LWW/Feld, mit optionalem Generator `<FüSt-Kürzel>-<lfd. Nr.>` in
der Maske (§6 Frage 11). Der Katalog legt fest: **Die Kennung ist ein Etikett,
keine Identität.** Zwei Anforderungen mit derselben Kennung bleiben zwei
Anforderungen; die zweite erzeugt den Hinweis „Kennung bereits vergeben" mit
Verweis auf die erste. Ohne Format von der übergeordneten Stelle wird auch keine
Prüfung gebaut — eine erfundene Prüfung wäre genau der Platzhalter, der später
wie eine Festlegung aussieht.

### Die fünfte Klärung — sie bindet M1.2 nicht

**Welche Ausgabeprodukte werden im Einsatz tatsächlich gedruckt, welche nur am
Bildschirm gelesen?** Kandidaten sind `Druck`, `Status`, `Log`, `LogFrei`,
`FüOrg`, `Auswertung` und der HTML-Monitor (EXH §3, F-K7). Die Antwort bestimmt
Layoutaufwand und Papierformate in M4, nicht die Ereignisform: Ausgaben sind
Projektionen des gefalteten Zustands (§1.16), und keine von ihnen erzeugt oder
liest ein Ereignis. Fällig zu M4, nicht jetzt.

### Was M1.2 ohne Antwort tut — so beschlossen am 2026-09-09

Der Ereigniskatalog wird mit den vier Vorschlägen oben geschrieben und
kennzeichnet jede Stelle als Startwert nach dem Muster von §10 in
`konzepte/KONZEPT-SPEICHER.md` — also als Wert, der ohne Änderung des Regelwerks
ausgetauscht werden kann. Was nicht passiert: Platzhalter-Enums, erfundene
Formatprüfungen oder eine Deutung von HK, MT, LdF und TLtg., die später wie eine
Festlegung gelesen wird.
