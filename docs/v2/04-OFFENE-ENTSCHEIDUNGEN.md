# 04 – Offene Entscheidungen für Johannes

Stand: 2026-09-09 · Quelle: Urteil §13, ergänzt um die Betriebsparameter vom 2026-09-07. Bereits beantwortet und hier nicht mehr aufgeführt: NAS (Synology), NTP (vorhanden), Client-OS (Windows 11 ohne Admin-Rechte), gleichzeitige Rechner (1 bis 5), macOS/Linux (berücksichtigen), Altdaten (keine).

> **Stand 2026-09-08: entschieden.** Johannes hat am 2026-09-08 die Empfehlungen angenommen („wir gehen den Weg, den du für sinnvoll hältst") und den Feldversuch beantwortet: v1 startet auf den FüSt-Rechnern ohne Admin-Rechte. Die getroffenen Beschlüsse je Nummer stehen in [05-UMSETZUNGSPLAN.md](05-UMSETZUNGSPLAN.md) Abschnitt 1. Offen bleiben nur noch Nr. 2 (Stunden je Woche, Planannahme 10), Nr. 10 (größter Einsatz, Annahme 100 bis 300 Einheiten) und Nr. 12 (Windows-Rechner benennen). Die Tabelle unten bleibt als Begründung der Optionen stehen.

Die Entscheidungen 1, 2 und 4 müssen vor M0 fallen, weil sie den Meilensteinzuschnitt bestimmen. Alle anderen können bis zum jeweils genannten Meilenstein warten.

**Neu am 2026-09-09:** Aus der Simulation M0.4 sind drei Konzeptentscheidungen hinzugekommen — Nr. 14, 15 und 16 im Abschnitt unter der Tabelle. Sie betreffen KONZEPT-SPEICHER.md.

> **Stand 2026-09-09: Nr. 14 und Nr. 16 sind entschieden.** Johannes hat **14 auf Richtung A** und **16 auf Richtung (a)** festgelegt. Beide sind in KONZEPT-SPEICHER.md nachgezogen (§4.6 Schritt 2 und 5, §8.6.1 Regel 4) und im Code umgesetzt. Die Herleitungen bleiben unten als Begründung stehen. **Nr. 15 ist weiterhin offen.**

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

### 15 · §7.6 braucht zwei Präzisierungen, sonst ist die Ruhephase im Feld nicht messbar

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

## Fachliche Klärungen mit der FüSt (kein Entwicklungsthema)

Aus dem Zieldatenmodell (`../v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §6) und dem Handbuch-Bericht:

- Gilt die Statusliste der Eingabemaske („Rufbereitschaft", „Einsatzvorbehalt") oder die Kurzform des Status-Blatts? Die Excel widerspricht sich.
- Bedeutung der Kürzel „HK" (HK/NLWKN), „MT", „LdF", „TLtg." und der unbeschrifteten Zeichen der FüOrg-Palette.
- Wird Schichtbetrieb mit zwei oder drei Schichten geführt, oder beides je Einsatz?
- Format der Anforderungs-ID mit der übergeordneten Stelle.
- Welche der Ausgabeprodukte werden im Einsatz tatsächlich gedruckt, welche nur am Bildschirm gelesen?
