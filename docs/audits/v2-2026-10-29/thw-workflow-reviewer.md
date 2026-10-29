# Workflow-Audit S1-Control v2 (THW Workflow Reviewer)

Datum: 2026-10-29 · Branch v2-architektur · laufende Web-Schale http://127.0.0.1:8089 (Prüflage „Übung Weser-Ems“, 40 Einheiten)

Rolle: Helfer in der S1-Sachbearbeitung, der die Excel „Einsatzkräfteübersicht V 1.5.2“ kennt und den kompletten Einsatz in v2 abbilden will — ohne Handbuch, ohne Nachfragen.

## Scope und Methodik

- Geprüft wurde die laufende App (eigene Playwright-Durchläufe, ausschließlich lesend; Masken wurden geöffnet und mit Escape/Abbrechen verlassen, Zellen in Bearbeitung mit Escape verworfen; keine Daten der Prüflage verändert), die 25 gelieferten Screenshots (`v2shots/01…27`) und der Quellcode read-only.
- Eigene Screenshots liegen unter `/tmp/claude-0/-home-user-S1-Control/3bbe73bc-a125-5a75-a413-1783bb01b1de/scratchpad/reviews-v2/wf-shots/` (Kennzeichnung unten als `wf-NN`). Skript: `reviews-v2/wfprobe.cjs`.
- Kennzeichnung: **[beobachtet]** = in der App gesehen · **[Code]** = aus Quellcode hergeleitet, Laufzeit nicht geprüft, weil dafür Daten hätten geändert werden müssen · **[Annahme]** = THW-Ablauf, der nicht aus dem Material hervorgeht.
- Die früheren Audits (docs/audits, Stand 18.09., gegen legacy-v1) wurden nicht übernommen; wo ein Punkt in `umsetzung-v2.md` als offen geführt wird und heute noch zutrifft, ist das vermerkt.

## Erwartete Arbeitsfolge (Prüfraster aus der Excel-Referenz)

Aus „Typischer Arbeitsablauf“ der Referenz, ergänzt um die zwei Punkte aus dem Auftrag:

| Nr. | Schritt in der Excel | Handgriffe in der Excel |
|---|---|---|
| 1 | Stammdaten (Einsatzname, Name FüSt, übergeordnete FüSt) | Blatt Stammdaten, 3 Zellen |
| 2 | Bereiche (Einsatzstellen) benennen | Kopfzeile je Bereich beschriften |
| 3 | Einheit aus Kopiervorlage, Status „Angefordert“, Bereich „Angefordert / Anmarsch“ | Kopieren, Zeile einfügen, Status wählen |
| 4 | Eintreffen: Zeile nach Bereitstellung, Status „Einsatzbereit“, Zeit „eingetroffen“ | Verschieben, Pull-Down, Strg+D in Spalte T |
| 5 | Auftrag: Zeile nach Einsatzort, Status „Einsatz“, Auftrag (Spalte K) | Verschieben, Pull-Down, Freitext |
| 6 | Ablösung: Verfügbar bis, Ablösung angefordert, Anforderungs-ID, Zugesagt für/von, Vorgesehene Einheit/Auftrag | 6 Zellen in derselben Zeile (Ressourcenplanung) |
| 7 | Einsatzende: Status „Rückmarsch“, Zeiten Einsatzende/Rückführung, Zeile nach „Einsatz beendet“ | Pull-Down, Strg+D, Verschieben |
| 8 | Druckblatt für die Lagekarte, Log an S4 | Blatt Druck/Log drucken bzw. HTML-Export |
| 9 | Übergabe an die nächste Schicht | [Annahme] Datei speichern, mündliche Übergabe am Blatt „Stärke“ |

[Annahme] Ob die Ablösung in der realen FüSt als eigene Anforderung oder nur als Vermerk an der Zeile geführt wird, ist nicht belegt; die Excel kennt beides nebeneinander (Anforderungs-ID in der Zeile).

## Kurzurteil aus Sicht der Rolle

Die Kernstrecke der Excel ist in v2 wiedererkennbar: die Tabelle trägt dieselben Spaltenköpfe mit Excel-Spaltenbuchstaben als Tooltip, der Abschnittsbaum entspricht den Bereichen, die Statuswerte und die Tastenkürzel (Strg+N/E/M/D/H/Q) sind die der Excel, Druck und Status sehen aus wie die Blätter. Anlegen aus Vorlage, Verschieben, Statuswechsel per Zelle, Druck per Knopf und Logistikblatt sind da und teils schneller als in der Excel.

Reibung entsteht genau an den Stellen, an denen die Excel **eine Zeile** als Arbeitsort hat und v2 den Inhalt auf Masken, Spaltengruppen und Nebenblätter verteilt: Eintreffen und Zuweisung sind in v2 drei getrennte Handgriffe an zwei ausgeblendeten Stellen, der Auftrag lässt sich **nirgends** eintippen, die Ablösung aus dem Blatt Anforderungen erreicht die Einheitenzeile nicht und erzeugt beim Eintreffen eine zweite Erfassung, und die Zeitfelder nehmen bei Strg+D einen UTC-Rohwert an. Stammdaten gibt es nicht als Blatt; der FüSt-Name auf dem Druck ist stillschweigend der Anzeigename des Rechners, der den Einsatz angelegt hat.

Der Einsatz lässt sich **mit Umwegen** abbilden; der Schritt „Auftrag“ geht ohne Umweg über ein Fremdfeld gar nicht. Ohne Einweisung findet der Excel-gewohnte Helfer die Zeitspalten (Ressourcen-Gruppe) und die Logistikspalten nicht, weil beide per Vorbelegung ausgeblendet sind — in der Excel sind sie „ein-/ausblendbar“, aber in der Kopfzeile sichtbar.

## Schritt-für-Schritt-Vergleich

| Nr. | Schritt | v2 | Bewertung | Beleg |
|---|---|---|---|---|
| 1 | Stammdaten | Nur „Neuer Einsatz“ + Name; Datum = heute; FüSt-Name = Anzeigename des Rechners; keine übergeordnete FüSt; kein Stammdatenblatt | **fehlender Schritt** | 01-start, wf-01; `laden.ts:410-427` |
| 2 | Einsatzstellen | „Abschnitte → Neu“: Name + Typ (Führungsstelle, Meldekopf, Sonstige Führung, Logistik, Angefordert/Anmarsch, Bereitstellungsraum, Einsatzort); Unterabschnitte, Umhängen, Zeichen | **schneller** (Baum statt fester 21 Einsatzorte) | 09-maske-abschnitt-neu |
| 3 | Einheit „angefordert“ | „Aus Vorlage“: Katalog (FEUERWEHR, THW_STAN), Vorlage, Herkunft, Abschnitt; Status fest „Angefordert“; Soll-Stärke aus Vorlage | **schneller**, aber: kein Anlegen ohne Vorlage (DRK, Polizei, Regie, Bundeswehr fehlen im Katalog), Ziel vorbelegt mit gerade gewähltem Abschnitt | 07-maske-aus-vorlage; `Einheitenmasken.tsx:75`, `vorlagen/feuerwehr.ts`, `vorlagen/thw.ts` |
| 4 | Eintreffen in Bereitstellung | 3 getrennte Handgriffe: Zeile markieren → „Verschieben (1)“ → Ziel wählen → Übernehmen; Status-Zelle Doppelklick → Pull-Down; Spaltengruppe „Ressourcen“ einschalten → „Eingetroffen“ Doppelklick → Strg+D | **langsamer**; Zeitwert als UTC-ISO-Text | 08-maske-verschieben, wf-02, wf-05; `bedienschritte.ts:160`, `Einheitentabelle.tsx:490-493` |
| 5 | Zuweisung mit Auftrag | Verschieben + Status wie 4; **Auftrag nicht erfassbar** (Spalte „berechnet“, Untertabelle nur Anzeige, kein Bedienschritt) | **fehlender Schritt** | wf-03, wf-10; `projektion/tabelle.ts:123-124`, `Untertabellen.tsx:80-95`, `kontrakt/bedienschritte.ts` (Exportliste) |
| 6 | Ablösung | Blatt „Anforderungen“: Kennung, Vorgesehene Einheit, Vorgesehener Auftrag → Zusagen → Eingetroffen → Stornieren. Verknüpfung „Ablösung für“ ist in der Maske nicht setzbar; an der Einheitenzeile steht nichts davon; „Verfügbar bis“ ohne Ablaufhinweis | **Doppelerfassung** (Eintreffen erzeugt keine Einheit) | 11-blatt-anforderungen, wf-13; `Anforderungen.tsx:71-95`, `kennzahlen.ts:303` (unbenutzt), `kennzahlen.ts:420` (unbenutzt) |
| 7 | Einsatzende | Status „Rückmarsch“ per Zelle; „Einsatzende“/„Rückführung“ nur in Gruppe Ressourcen; Verschieben nach „Einsatz beendet“ ohne Status-/Zeitfolge; Einheit fällt aus Kopf, Druck, Status, Kosten (wie Excel) | **gleichwertig, langsamer** | wf-07; `kennzahlen.ts:36-40,59-63` |
| 8 | Druck/Logistik | Blatt „Ausgaben“: ein Knopf je Blatt, Datei im Share-Ordner `ausgaben/`, Pfad als Meldung; Druck trägt Probe und „Davon Stärke“ je Organisation; Log je Bereich mit Schichtbetrieb | **schneller**; Datei muss im Explorer gesucht werden, kein „Öffnen/Drucken“ | 15/16-blatt-ausgaben, 25-html-druck, 27-html-status; `Ausgaben.tsx` |
| 9 | Schichtübergabe | Handbuch: „Nichts“. Akteur = Anzeigename des Rechners, keine Personenangabe; kein Übergabeblatt (offene Anforderungen, ablaufende Verfügbarkeiten, Konflikthinweise) an einer Stelle | **fehlender Schritt** (Annahme) | HANDBUCH.md Z. 51-53; 18-blatt-diagnose; `Tagebuch`-Spalte Akteur |

---

## P0 – Einsatzkritisch

### P0-1 Der Auftrag einer Einheit lässt sich nirgends eintragen

- **Fundstelle / Aufgabe:** Schritt 5. Lage → Einheitentabelle, Spalte „Aufträge“ (wf-03); Untertabelle „Aufträge“ unter der Tabelle (wf-10: „Kein Auftrag erfasst.“). `packages/domaene/src/projektion/tabelle.ts:124` (`art: "berechnet"`, kein `schreibt`), `apps/desktop/src/renderer/Untertabellen.tsx:80-95` (reine Liste), `apps/desktop/src/kontrakt/bedienschritte.ts` (Exportliste Z. 42-597: kein Bedienschritt für Auftrag oder Fahrzeug). Der Zustand kennt `auftraege` (`fold.ts:2130`), der Scanner-Pfad liefert sie (`domaene/src/eeb/adapter.ts`).
- **Beobachtung [beobachtet]:** Doppelklick auf „Aufträge“ öffnet keinen Editor (0 Eingabefelder, wf-03), ebenso „Geräte / Fahrzeuge“. Die Untertabelle hat keinen Knopf „Auftrag“ oder „Fahrzeug“. Alle 40 Einheiten der Prüflage stehen ohne Auftrag in der Tabelle, obwohl die Anforderungen „Ablösung Deichverteidigung Nord“, „Notstrom Pumpwerk Süd“ als Auftragstexte tragen.
- **Erwartung der Rolle:** Spalte K der Excel: Stichwort in die Zeile tippen, fertig. Der Auftrag ist neben Ort und Status die dritte Information, die die Lagekarte braucht.
- **Auswirkung im Einsatz:** Der Helfer weicht auf „Bemerkungen“ (Gruppe Ressourcen, ausgeblendet) oder auf die Bezeichnung aus („FGr Räumen B (angefordert)“ zeigt, dass das schon in der Prüflage passiert). Der Auftrag steht dann nicht dort, wo die nächste Schicht ihn sucht, und in keiner Ausgabe. Für die Führung ist das ein verlorener Auftrag.
- **Empfehlung:** Auftrag und Fahrzeug/Gerät müssen an der Einheitenzeile erfassbar sein — mindestens ein Freitext in der Zelle „Aufträge“ wie in der Excel, besser ein Eintrag in der Untertabelle mit Zeit „von“. Dasselbe für „Geräte / Fahrzeuge“ (Kennzeichen, Funkrufname).
- **Verifikation:** Einheit markieren, Auftrag „Sandsackverbau Deich km 3“ eintragen, ohne Handbuch in unter 20 Sekunden; der Text steht in der Zeile, im Druck und im Tagebuch.

### P0-2 Strg+D schreibt einen UTC-Rohwert in die Zeitfelder; Freitext bleibt ungeprüft

- **Fundstelle / Aufgabe:** Schritte 4, 6, 7. Spalten „Verfügbar bis“, „Eingetroffen“, „Einsatzende“, „Rückführung“ (Gruppe Ressourcen). `apps/desktop/src/renderer/Einheitentabelle.tsx:490-493` (`setzeEingabe(new Date().toISOString())`), `apps/desktop/src/kontrakt/bedienschritte.ts:73-81` (`eingabeAlsWert`: Zeitpunkt wird als getrimmter Text übernommen), `packages/domaene/src/projektion/tabelle.ts:318` (`alsText(feld?.wert)` ohne Formatierung).
- **Beobachtung [beobachtet]:** Doppelklick auf „Eingetroffen“ öffnet ein leeres Textfeld; Strg+D füllt `2026-10-29T19:44:32.380Z` ein (wf-05), während das Kopfband `291944OCT26` zeigt und die Wanduhr 20:44 MEZ steht. [Code] Nach Enter stünde genau dieser Text in der Zelle; eine Eingabe „14:30“ oder „29.10. 14:30“ wird unverändert als Text gespeichert, es gibt keine Prüfung und keine Vereinheitlichung. Die Prüflage hat keine einzige gefüllte Zeitzelle (wf-06), was sich damit deckt, dass der Kurzanleitungs-Tipp „Strg+D setzt jetzt“ so nicht benutzbar ist.
- **Erwartung der Rolle:** Strg+D wie in der Excel: Datum/Uhrzeit in Ortszeit, lesbar, in einem Format wie der Rest des Programms (`29.10. 20:44` wie im Tagebuch).
- **Auswirkung im Einsatz:** Zwei Schreibweisen in einer Spalte (Rohwert neben Freitext), und der Rohwert liegt eine Stunde (Sommerzeit: zwei) neben der Uhr an der Wand. „Verfügbar bis 2026-10-29T22:00Z“ wird als 22 Uhr gelesen, gemeint ist 23 Uhr — die Ablösung wird eine Stunde zu früh oder zu spät geplant. Zeitfelder sind in der Excel die Grundlage der Ressourcenplanung.
- **Empfehlung:** Zeitfelder als Zeitfelder behandeln: Strg+D setzt Ortszeit im Anzeigeformat des Programms; Freitext wird geprüft (Datum/Uhrzeit oder Uhrzeit allein mit heutigem Datum) und sonst abgewiesen wie eine ungültige Stärke; Anzeige einheitlich.
- **Verifikation:** Strg+D in „Eingetroffen“ ergibt die Wanduhrzeit im gleichen Format wie das Tagebuch; „14:30“ wird angenommen und als Zeit angezeigt; „abc“ wird abgewiesen.

## P1 – Hoch

### P1-1 Eintreffen und Zuweisung sind drei getrennte Handgriffe an zwei ausgeblendeten Stellen

- **Fundstelle / Aufgabe:** Schritte 4, 5, 7. Verschieben-Maske (08-maske-verschieben, wf-07: nur „Nach Abschnitt“), Status-Zelle (wf-02), Spaltengruppe „Ressourcen“ (Vorbelegung aus: `projektion/tabelle.ts:66` `SICHTBARE_GRUPPEN_VORBELEGUNG = ["GRUNDDATEN","STAERKE"]`), `bedienschritte.ts:160` (`verschiebung` trägt nur von/nach).
- **Beobachtung [beobachtet]:** Verschieben nach „Bereitstellungsraum Hafen“ ändert weder Status noch Zeit; die Maske fragt beides nicht ab und nennt die Folge nicht (bei „Einsatz beendet“ nicht, dass die Einheit aus Kopf, Druck und Kosten fällt). Statuswechsel ist ein eigener Doppelklick + Pull-Down + Enter. „Eingetroffen“ ist erst nach Einschalten von „Ressourcen“ sichtbar; danach scrollt die Tabelle horizontal (05-lage-alle-gruppen-rechts). Zwischen den drei Handgriffen wechselt der Fokus Maske → Zelle → Gruppenschalter → Zelle.
- **Erwartung der Rolle:** Die Excel-Zeile: verschieben, Status, Zeit, alles in derselben Zeile sichtbar. Wer „nach Bereitstellung“ verschiebt, meint fast immer „ist da, einsatzbereit, jetzt“.
- **Auswirkung im Einsatz:** Bei 10 eintreffenden Einheiten in der Anfangsphase sind das 30 statt 10 Handgriffe; Status und Zeit werden unter Zeitdruck weggelassen, die Lage zeigt dann „Angefordert“ für Kräfte, die am Deich stehen. Die Prüflage zeigt das Muster: Einheiten in „EA Pumpwerk Süd“ mit Status „Anmarsch“, in „EA Deich Nord“ mit „Einsatzvorbehalt“, alle ohne Zeit.
- **Empfehlung:** Die Verschieben-Maske soll Status und den passenden Zeitpunkt (Eintreffen / Einsatzende) als vorbelegte, überschreibbare Felder mitführen und die Folge nennen („zählt ab jetzt zur Gesamtstärke“ / „fällt aus Druck und Kosten“). Die Spalten Eingetroffen/Einsatzende sollten in der Grundansicht stehen oder die Gruppe Ressourcen vorbelegt sichtbar sein.
- **Verifikation:** Eine angeforderte Einheit in einem Handgriff nach Bereitstellung bringen; danach stehen Abschnitt, „Einsatzbereit“ und die Eintreffzeit in der Zeile, ohne eine Spaltengruppe einzuschalten.

### P1-2 Ablösung: Anforderung und Einheit kennen sich nicht, Eintreffen erzeugt eine zweite Erfassung

- **Fundstelle / Aufgabe:** Schritt 6. Blatt „Anforderungen“ (11-blatt-anforderungen, wf-13). `apps/desktop/src/renderer/Anforderungen.tsx:71-95` (Maske: nur Kennung, Vorgesehene Einheit, Vorgesehener Auftrag), `kontrakt/bedienschritte.ts:308-320` (`abzuloesendeEinheitId` vorhanden, kein UI), `bedienschritte.ts:363` (`anforderungErledigt` nur Zustandswechsel), `packages/domaene/src/kennzahlen.ts:303` (`abloesendeAnforderung` wird in keiner Projektion/Ausgabe benutzt), `kennzahlen.ts:420` (`verfuegbarkeitLaeuftAb` unbenutzt). Einheitenspalten der Gruppe Ressourcen: `tabelle.ts:141-152` — Verfügbar bis, Eingetroffen, Einsatzende, Rückführung, Bemerkungen; **nicht** Ablösung angefordert, Anforderungs-ID, Zugesagt für/von, Vorgesehene Einheit/Auftrag.
- **Beobachtung [beobachtet]:** „Ablösung für BGr 1 Oldenburg“ steht in der Prüflage, lässt sich über die Maske aber nicht erzeugen (kein Feld). In der Einheitenzeile von BGr 1 Oldenburg ist nichts von der Anforderung zu sehen. „Eingetroffen“ an ANF-2026-002 wechselt nur den Zustand; „FGr N THW OV Jever“ mit Auftrag „Notstrom Pumpwerk Süd“ muss danach über „Aus Vorlage“ mit Herkunft erneut getippt, verschoben und (siehe P0-1) ohne Auftrag geführt werden. Es gibt keinen Hinweis, wenn „Verfügbar bis“ überschritten ist.
- **Erwartung der Rolle:** Die Excel hält alles in der Zeile der abzulösenden Einheit. Der Helfer erwartet: an der Einheit „Ablösung anfordern“, beim Eintreffen wird daraus die neue Zeile mit Bezeichnung, Herkunft, Auftrag und Zeit.
- **Auswirkung im Einsatz:** Doppelerfassung mit Übertragungsfehlern (Bezeichnung, Herkunft zweimal getippt), und die Lage zeigt nicht, welche Kraft abgelöst wird und bis wann sie durchhält. Wer nur die Tabelle vor sich hat, sieht die Ablösungsplanung gar nicht.
- **Empfehlung:** Anforderung von der markierten Einheit aus anlegen (Vorbelegung „Ablösung für“), Anforderungskennung und Zusage in der Einheitenzeile anzeigen, „Verfügbar bis“ bei Ablauf markieren, und „Eingetroffen“ an der Anforderung mit „Einheit daraus anlegen“ verbinden (Vorlage/Text, Herkunft, Auftrag übernehmen).
- **Verifikation:** Ablösung für eine Einheit anlegen, zusagen, eintreffen lassen; danach existiert die neue Einheit mit Auftrag ohne erneute Texteingabe, und die alte Zeile zeigte die ganze Zeit die Anforderungskennung.

### P1-3 Stammdaten fehlen; der FüSt-Name auf dem Druck ist der Anzeigename des anlegenden Rechners

- **Fundstelle / Aufgabe:** Schritt 1. Startseite (01-start, wf-01): „Neuer Einsatz“ + „Anlegen“. `apps/desktop/src/renderer/laden.ts:410-427` (`fuestName: hole().einstellungen.anzeigename`, `einsatzArt`, `schichtmodell` fest; Kommentar „geändert werden sie danach über die Stammdaten“ — kein Stammdatenblatt im Renderer, `grep -i stammdaten` leer), `packages/ausgaben/src/druck.ts:135,201`, `kosten.ts:58`, `log.ts:82` (FüSt-Name im Kopf jeder Ausgabe). Kurzanleitung Z. 11-12 empfiehlt als Anzeigename „Zugtrupp“.
- **Beobachtung [beobachtet]:** Beim Anlegen werden weder Name der Führungsstelle noch übergeordnete FüSt noch Schichtmodell gefragt; es gibt danach kein Blatt, um sie nachzutragen. [Code] Wer der Kurzanleitung folgt und den Rechner „Zugtrupp“ nennt, bekommt auf Druck, Kosten- und Logblatt die Kopfzeile „Zugtrupp“ statt „FüSt Oldenburg“.
- **Erwartung der Rolle:** Blatt Stammdaten wie in der Excel: Einsatzname, Name der FüSt, übergeordnete FüSt — einmal eintragen, erscheint überall.
- **Auswirkung im Einsatz:** Ausgaben für die Lagekarte und die übergeordnete Führung tragen eine falsche oder nichtssagende Absenderkennung; die Angabe ist nicht korrigierbar, ohne den Einsatz neu anzulegen (Handbuch: „danach unveränderlich verankert“).
- **Empfehlung:** Beim Anlegen Name der FüSt und übergeordnete FüSt abfragen (vorbelegt, überschreibbar), ein Stammdatenblatt nachrüsten, das auch das Schichtmodell (zwei/drei Schichten) führt.
- **Verifikation:** Einsatz an einem Rechner mit Anzeigename „S1 Platz 1“ anlegen; der Druck trägt den eingetragenen FüSt-Namen, nicht „S1 Platz 1“.

### P1-4 „Aus Vorlage“ legt angeforderte Kräfte direkt in den gewählten Einsatzabschnitt — und zählt sie dort mit

- **Fundstelle / Aufgabe:** Schritt 3. Maske „Einheit aus Vorlage anlegen“ (07-maske-aus-vorlage). `apps/desktop/src/renderer/Einheitenmasken.tsx:71-76` (Ziel = gewählter Abschnitt), `bedienschritte.ts:124-158` (Status fest `ANGEFORDERT`), `packages/domaene/src/fold.ts:1023-1024` und `kennzahlen.ts:66-68` (Zählung hängt am Abschnittstyp, nicht am Status).
- **Beobachtung [beobachtet]:** Mit markiertem „EA Deich Nord“ steht in der Maske „Abschnitt: EA Deich Nord“ vor; der Hinweistext erklärt nur, dass der Status „Angefordert“ ist. [Code] Übernehmen zählt die Soll-Stärke der Vorlage (z. B. LZ FW 1/4/17) sofort im Kopfband mit, weil „EA Deich Nord“ zählt — unabhängig vom Status. Die Prüflage enthält genau diesen Fall: „GTr Wassergefahren“ (Anmarsch) in EA Pumpwerk Süd und „FGr Notversorgung“ (Einsatzvorbehalt) in EA Deich Nord gehen in die 293 ein, während die drei Zeilen im Bereich „Angefordert / Anmarsch“ draußen bleiben.
- **Erwartung der Rolle:** Die Excel-Regel: angeforderte Kräfte stehen im Bereich „Angefordert / Anmarsch“, bis sie da sind. Wer plant, meldet nicht.
- **Auswirkung im Einsatz:** Die Gesamtstärke im Kopf und auf dem Druck enthält Kräfte, die noch unterwegs sind; die Statusleiste zeigt „Angefordert 2“, der Kopf sagt es nicht. Die Meldung nach oben ist zu hoch.
- **Empfehlung:** Beim Anlegen aus Vorlage den Bereich „Angefordert / Anmarsch“ vorbelegen (der Status ist ja fest „Angefordert“) und an der Kopfzahl ausweisen, wie viele der gezählten Einheiten einen Status vor „Einsatzbereit“ tragen (oder nach Status statt nach Abschnitt zählen; mindestens ein Hinweis in der Maske: „zählt sofort zur Gesamtstärke“).
- **Verifikation:** Einheit aus Vorlage bei markiertem Einsatzabschnitt anlegen; die Kopfzahl ändert sich nicht, bis der Status auf „Einsatzbereit/Einsatz“ geht oder die Einheit verschoben wird — oder der Kopf nennt die Differenz.

### P1-5 Einheiten ohne passende Vorlage lassen sich nur über Umwege anlegen; die Hilfe verspricht einen anderen Weg

- **Fundstelle / Aufgabe:** Schritt 3. Katalog in der Maske: „FEUERWEHR“ (LZ FW, ZTr, LGr, LSt, LTr) und „THW_STAN“ (07-maske-aus-vorlage); `packages/domaene/src/vorlagen/{feuerwehr,thw}.ts`. Hilfemarke „Einheiten“ (wf-15): „mit Strg+N eine Einheit anlegen“, „bleibt sichtbar, wenn ‚mit Stillgelegten‘ gewählt ist“ (`packages/domaene/src/bedienhilfe.ts:69-71`); Strg+N öffnet „Aus Vorlage“ (`Einheitentabelle.tsx:170-172`), einen Schalter „mit Stillgelegten“ gibt es nicht (`grep` im Renderer leer).
- **Beobachtung [beobachtet]:** Für DRK, Polizei, Bundeswehr, DLRG, Regie („Sandsackkolonne“), Bergwacht gibt es keine Vorlage und kein leeres Anlegen. Der Weg: irgendeine Vorlage nehmen, dann Bezeichnung, Organisation (Pull-Down) und Ebene in drei Zellen einzeln umschreiben, Stärke in der Zelle „0/1/8“ als Text überschreiben.
- **Erwartung der Rolle:** Excel: „Zeile einfügen“ und tippen, oder aus „Kopiervorlagen KatS/Feuerwehr“ kopieren.
- **Auswirkung im Einsatz:** Jede Fremdorganisation kostet 4-5 Einzelbearbeitungen; die Vorlagen-ID bleibt falsch an der Einheit stehen (Soll-Werte „THW ZTr“ an einer Polizeistreife). Die Hilfe beschreibt Funktionen, die es nicht gibt — der Helfer sucht.
- **Empfehlung:** Maske mit „ohne Vorlage“ (Bezeichnung, Organisation, Ebene, Stärke, Herkunft) und KatS-Vorlagen wie in der Excel; Hilfetext an die tatsächliche Bedienung angleichen.
- **Verifikation:** „Sandsackkolonne, Regie, Gruppe, 0/2/20“ in einer Maske anlegen, ohne danach eine Zelle anzufassen.

## P2 – Mittel

### P2-1 Zwei Stärkezahlen auf einem Bildschirm ohne Beschriftung der Differenz

- **Fundstelle:** Lage (02-lage): Kopfband `15/53/225 // 293`, Summenzeile der Tabelle `16/59/255 // 330`; `Einheitentabelle.tsx:372-390` (Summe über die Zeilen, ohne Abschnittstyp), `kennzahlen.ts:104-112`. In `umsetzung-v2.md` als offen geführt („An der Stärkezahl steht nicht, welche Abschnitte und Einheiten eingehen“).
- **Beobachtung [beobachtet]:** Die Summenzeile heißt „Summe“, nicht „Summe mit Angefordert“; die Differenz 37 ist nur über den Druck erklärbar („ohne Kräfte aus dem Bereich Angefordert / Anmarsch“).
- **Erwartung:** Die Excel zeigt je Bereich eine Summe; das Druckblatt sagt ausdrücklich, was fehlt.
- **Auswirkung:** Bei der Meldung nach oben nennt der eine Helfer 293, der andere 330.
- **Empfehlung:** Summenzeile als „Summe aller Zeilen (mit Angefordert/Einsatz beendet)“ oder zwei Summenzeilen; am Kopfband Tooltip/Untertitel „ohne Angefordert (37)“.
- **Verifikation:** Beide Zahlen tragen eine Beschriftung, aus der die Differenz ohne Rechnen folgt.

### P2-2 Einsatzende einer Einheit: Verschieben nach „Einsatz beendet“ ohne Folgeschritte; Einsatzabschluss nur per Kommandozeile

- **Fundstelle:** Schritt 7. Verschieben-Maske (wf-07), `bedienschritte.ts:160`; HANDBUCH.md Z. 53-54 („`s1 akte exportiere`“); `umsetzung-v2.md` offen: „Einsatz beenden, wiedereröffnen und archivieren gibt es im Kern, aber nicht in der Bedienung“ (heute bestätigt: `grep -i 'beende|archiv'` im Renderer trifft nur Abschnittstyp-Filter).
- **Beobachtung [beobachtet]:** Nach dem Verschieben bleibt in der Zeile Status „Einsatz“ stehen (Prüflage-Logik; aus Code: Status wird nicht berührt), Einsatzende/Rückführung bleiben leer, sofern nicht vorher in der Gruppe Ressourcen gesetzt. Den Einsatz selbst kann der Helfer in der Oberfläche nicht beenden oder als Akte sichern.
- **Erwartung:** Rückmarsch → Zeiten → „Einsatz beendet“ in einem Zug; am Einsatzende ein Knopf, der die Akte erzeugt.
- **Auswirkung:** „Einsatz beendet“ mit Status „Einsatz“ wirkt widersprüchlich für die nächste Schicht; der Abschluss hängt an einer CLI, die der Helfer in der FüSt nicht hat.
- **Empfehlung:** Beim Ziel „Einsatz beendet“ Status „Rückmarsch“ und Zeit „Einsatzende = jetzt“ vorbelegen; „Einsatz beenden / Akte exportieren“ als Knopf in Ausgaben.
- **Verifikation:** Einheit beenden in einem Handgriff; Akte ohne Terminal erzeugbar.

### P2-3 Ausgaben: Datei wird geschrieben, aber nicht geöffnet; kein Weg zum Drucker

- **Fundstelle:** Blatt Ausgaben (16-blatt-ausgaben-erzeugt): „Geschrieben: /tmp/s1-share/…/ausgaben/status_2026-10-29_1532.html (11209 Bytes)“. `Ausgaben.tsx:52-130`.
- **Beobachtung [beobachtet]:** Nach dem Knopf steht ein Pfad; kein „Öffnen“, „Drucken“, kein Ordnerlink. In der Web-Schale nicht prüfbar, ob Electron die Datei öffnet; nach Code-Lage nicht (keine Öffnen-Aktion in `Ausgaben.tsx`).
- **Erwartung:** Excel-Helfer: Blatt Druck → Strg+P. Mindestens: Datei öffnet sich.
- **Auswirkung:** Unter Zeitdruck Explorer öffnen, Share-Pfad suchen, jüngste Datei finden — Medienbruch, bei dem gern die vorletzte Fassung gedruckt wird (zwei Dateien mit Zeitstempel im Minutenabstand liegen bereits im Ordner).
- **Empfehlung:** Nach dem Schreiben öffnen oder direkt drucken; der Hinweis nennt „Stand 15:32 — 293 Kräfte“ statt Bytes.
- **Verifikation:** Knopf „Druck“ führt ohne Explorer zum Ausdruck.

### P2-4 Übergabe an die nächste Schicht ohne Übergabeblatt; Akteur ist der Rechner, nicht die Person

- **Fundstelle:** Schritt 9 [Annahme]. HANDBUCH.md Z. 51-53 („Zum Schichtwechsel: Nichts.“); Diagnose (18-blatt-diagnose: vier Zeilen „S1 Platz 1 · vm“); Tagebuch-Spalte „Akteur“ (17-blatt-einsatztagebuch); `apps/desktop/src/main/vermittlung.ts:113`. `umsetzung-v2.md` offen: „Am Arbeitsplatz ist nicht wählbar, wer erfasst“.
- **Beobachtung [beobachtet]:** Was der Ablösende zuerst wissen muss, liegt auf vier Blättern: offene Anforderungen (Anforderungen), ablaufende Verfügbarkeiten (nirgends markiert, P1-2), Konflikthinweise (Diagnose, „8 Konflikthinweis(e)“ in der Fußzeile), Einheiten ohne Status/Schicht (nur im Status-Blatt als Kontrollsumme). Das Tagebuch ist per Vorbelegung „Auf die Auswahl beschränken“ und zeigt nach dem Öffnen eine Zeile.
- **Erwartung:** Ein Blick: „Was ist offen, was läuft ab, was ist strittig“, und wer es zuletzt bearbeitet hat.
- **Auswirkung:** Übergabe bleibt mündlich; die Nachtschicht entdeckt die abgelaufene Verfügbarkeit erst, wenn die Einheit abfährt.
- **Empfehlung:** Eine Übergabesicht (oder Abschnitt in Lage): offene Anforderungen, Verfügbar-bis in den nächsten 4 h, Konflikthinweise, Einheiten ohne Status/Schicht; Anzeigename um „Name der Person“ ergänzen, der in Tagebuch und Diagnose steht.
- **Verifikation:** Ablösender findet ohne Rückfrage in 1 Minute die drei offenen Punkte der Prüflage (ANF-001 offen, 8 Konflikte, Bergwacht ohne Schicht).

## P3 – Niedrig

### P3-1 Technische Rohtexte und Konzeptverweise in der Bedienoberfläche

- **Fundstelle:** Spalte „Personalerfassung“ zeigt `NUR_STAERKE` (wf-05, wf-16); Kosten: „nach dem Zieldatenmodell §2.4“ (13-blatt-kosten); Masken/Hilfen mit „§5.4.2“, „§5.4.5“, „Fold“ (08-aufteilen, Hilfemarke, Kurzanleitung).
- **Beobachtung:** Die Excel-Begriffe sind sonst sauber übernommen; diese Reste fallen auf.
- **Auswirkung:** Kostet Vertrauen, nicht Zeit.
- **Empfehlung:** `NUR_STAERKE` → „nur Stärke“; Paragraphenverweise aus Bedientexten entfernen oder in die Hilfe verlagern.
- **Verifikation:** Keine Großbuchstaben-Schlüssel und keine §-Verweise in Tabelle und Masken.

### P3-2 Stärke-Monitor in der Web-Schale nicht als Zweitfenster prüfbar

- **Fundstelle:** Knopf „Stärke-Monitor“ (wf-16): es erscheinen „Auf dem Zweitbildschirm öffnen / Schließen“, aber kein Fenster und kein Inhalt im Hauptfenster; `#monitor` (23-monitor) zeigt die normale Lage.
- **Beobachtung:** Nicht prüfbar, ob der Monitor in Electron die Zahl des Kopfbands (293, ohne Angefordert) oder die Tabellensumme zeigt. Die Ausgabe „HTML-Monitor für ein zweites Gerät“ existiert als Alternative.
- **Empfehlung:** In der Electron-Fassung prüfen, dass der Monitor dieselbe Zahl und Beschriftung wie das Kopfband trägt (vgl. P2-1).

## Was gut funktioniert (zur Einordnung)

- Abschnittsbaum mit Unterabschnitten, Umhängen, Zeichen und Stärke je Knoten ist der Excel mit 21 festen Einsatzorten überlegen (02-lage, 14-blatt-fuehrungsorganisation).
- Statuswerte, Schichten, Organisationen und Spaltenköpfe entsprechen 1:1 der Excel; der Tooltip „Excel-Spalte T“ hilft beim Umstieg.
- Statusleiste als Filter und „Stärke nach Status“ in einem (02-lage).
- Druck- und Statusblatt (25, 27) sind inhaltlich das Excel-Blatt inklusive Probe und Kontrollsummen; Log je Bereich mit Schichtbetrieb entspricht dem Blatt „Log“.
- Entfernen verlangt einen Grund, Rückgängig ist ein Ereignis, Konflikte werden nicht still verschluckt — das ist gegenüber „Vorgänge können nicht rückgängig gemacht werden“ ein echter Fortschritt.

---

- **Aufgabe geschafft:** mit Umwegen — der Auftrag (Schritt 5) ist ohne Fremdfeld nicht abbildbar.
- **Fremde Hilfe nötig:** ja — Zeitspalten und Logistikspalten liegen hinter Gruppenschaltern, Stammdaten und Ablösungsverknüpfung gibt es nicht, die Hilfe beschreibt Funktionen, die fehlen.
- **Größtes Missverständnis:** Der Helfer erwartet die Excel-Zeile als Arbeitsort und sucht Auftrag, Eintreffzeit und Anforderungs-ID dort, wo v2 sie auf Untertabelle, ausgeblendete Spaltengruppe und ein Nebenblatt verteilt hat.
- **Größtes Einsatzrisiko:** Zeitfelder mit UTC-Rohwerten neben Freitext und angeforderte Kräfte, die im Einsatzabschnitt sofort in der Gesamtstärke mitzählen — beides führt zu falschen Meldungen nach oben.
- **Top-Priorität für die nächste Iteration:** Auftrag (und Fahrzeug) an der Einheitenzeile erfassbar machen und die Verschieben-Maske um Status und Zeitpunkt ergänzen — damit die Schritte 4, 5 und 7 wieder ein Handgriff je Zeile sind.
