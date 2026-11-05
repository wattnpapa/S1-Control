# Audit „Neuer Nutzer“ — S1-Control v2, Stand 05.11.2026

**Rolle:** THW-Helfer, praktisch erfahren, setzt sich zum ersten Mal ohne Einweisung an einen S1-Arbeitsplatz der Führungsstelle. Kennt Einsatz, Gliederung (Trupp/Gruppe/Zug, BGr, FGr), Stärkemeldung Fü/UFü/He und Funk, aber keine Begriffe und keine Navigation dieser Software.

**Material:** Eigene Web-Schale (http://127.0.0.1:8207) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Stand HEAD `ffc3125`. Begehung mit Playwright, Screenshots unter `scratchpad/shots/new-user/` (Dateinamen in den Findings, z. B. `10-aus-vorlage.png`). Zusätzlich der Weg „Neuer Einsatz …“ von Null (Einsatz „Hochwasser Hunte“, Abschnitt „EA Deich Nord“, eine Einheit aus Vorlage). Quelltext nur als Beleg (Datei:Zeile). **Handbuch und Kurzanleitung (`docs/v2/`) habe ich nicht gelesen** — ich bin ohne sie durchgekommen; die In-App-Hilfe (Strg+H / „⋯“ → „Hilfe und Tastenkarte“) habe ich einmal geöffnet, nachdem der erste Einsatz schon angelegt war.

**Kennzeichnung:** **[beobachtet]** selbst in der laufenden Anwendung erlebt · **[Code]** aus dem Quelltext belegt · **[Annahme]** plausible Folgerung, insbesondere zu THW-Abläufen und -Begriffen · **[nicht prüfbar]** in der Web-Schale nicht nachzustellen.

**Vergleich:** Audit vom 29.10.2026 (`docs/audits/v2-2026-10-29/thw-new-user-reviewer.md`). Was dort P0/P1 war und jetzt behoben ist, steht im Urteil; offene Reste sind als „Rest aus 29.10.“ markiert.

---

## Urteil aus Sicht der Rolle

**Was jetzt gut funktioniert.** Der Einstieg ist deutlich besser als vor einer Woche. Die Startseite zeigt die Einsätze zuerst, „Neuer Einsatz …“ fragt Name, Datum, FüSt, übergeordnete FüSt, Einsatzort, Beginn, Art und Schichtmodell ab und sagt, wo man das später ändert (`03-neuer-einsatz.png`) [beobachtet]. Die Einstellungen unter „Ändern“ erklären Share, Anzeigename, Betriebsart und Profil je in einem Satz (`02-aendern.png`) [beobachtet]. Jedes Blatt hat beim ersten Aufruf ein gelbes Hinweisband „Was ist das hier“ mit „Verstanden“. Nach jedem Schreibschritt steht unten grün „✓ … gespeichert“ und daneben „↶ Rückgängig: <Vorgang>“, Strg+Z fragt vorher nach und sagt, dass es für alle Arbeitsplätze gilt (`08-abschnitt-angelegt.png`, Lauf `nu17`) [beobachtet]. Die Auswahlleiste unten („1 gewählt · BGr 2 Oldenburg · Verschieben · Aufteilen · … · Esc hebt die Auswahl auf“) und das gleichlautende Rechtsklick-Menü sind selbsterklärend (`52-lage-kontextmenue.png`, `44-funk-zeile-klick.png`). Die Tabelle zeigt „Nur Stärke“ und „THW OV Oldenburg“ statt Rohschlüsseln. Der gefährliche Fehler vom 29.10. (Doppelklick + Esc in „Fü/UFü/He“ zerstört die Gesamtstärke) ist weg: Doppelklick, Esc, Wegklicken — kein Ereignis, Kopfband unverändert (`14-staerke-dblclick.png`, `15-staerke-esc.png`) [beobachtet].

**Wo es reibt.** Der erste echte Arbeitsschritt nach dem Anlegen — „Bergungsgruppe aus Vorlage anlegen“ — scheitert an der Vorlagenliste: Die THW-Einträge heißen „(B)“, „(MT)“, „(FGr R (A))“, einer ist ein abgeschnittener Satz aus der StAN, die Suche nach „Bergungsgruppe“, „Technischer Zug“ oder „Fachgruppe Wasserschaden“ findet nichts. Die angelegte Einheit heißt dann überall „(B)“. Zweitens weiß ich nie, wer „die anderen“ sind: Ich bin allein, die Statuszeile meldet „4 weitere Arbeitsplätze“, und eine Einheit ist „🔒 von Arbeitsplatz bearbeitet“ — „Arbeitsplatz“ ist der Name, den ich selbst nie geändert habe. Drittens: „8 Konflikthinweise“ erklärt sich jetzt, verspricht aber ein ⚠ in der Tabelle, das es nirgends gibt. Dazu kommen kleinere Stolpersteine: „Eingang“ heißt sowohl ein Reiter als auch ein Abschnitt, die ganze Seite scrollt mitsamt Kopfband und Reitern weg, Strg+P trägt im Funkplan eine Funkprobe ein statt zu drucken, und es gibt fünf verschiedene Gesamtzahlen.

**Ohne fremde Hilfe?** Ja, mit Umwegen. Einsatz anlegen, Abschnitt anlegen, Einheit anlegen, Status setzen, zurücknehmen, Rufgruppe anlegen und Einheit auswählen gelingen ohne Handbuch. Die richtige THW-Vorlage finde ich nur durch Raten („B“ eintippen und hoffen, dass „(B)“ die Bergungsgruppe ist), und die Konflikthinweise kann ich nicht auflösen.

---

## Findings

### P0 — Einsatzkritisch

Keine beobachtet. Der P0-1 und P0-2 des Audits vom 29.10. sind behoben (siehe Urteil).

### P1 — Hoch

#### P1-1 · Vorlagenkatalog THW: kryptische und kaputte Bezeichnungen, Suche nach Klartext findet nichts, Einheit heißt danach „(B)“

- **Fundstelle / Aufgabe:** Lage → „Einheit anlegen ▾“ → „Aus Vorlage … Strg+N“ → „Vorlage suchen“. Aufgabe: „Die Bergungsgruppe des OV Oldenburg trifft ein, in EA Deich Nord anlegen.“ `10-aus-vorlage.png`, `12-vorlage-b-gewaehlt.png`, `13-einheit-angelegt.png`, `15-staerke-esc.png`.
- **Beobachtung:** [beobachtet] Die Liste beginnt mit „Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)“, dann „(Ergänzungsausstattung)“, „(MT)“, „(VOST)“, „TZ“, „(ZTr TZ)“, „(B)“, „(FGr R (A))“ … und mittendrin „Die SEEWA ist gebietsmäßig bundesweit in 3 Module mit jeweils einer Fachgruppe als“, „3.1 SEElift“, „Sys BR500“, „(Stab)“ ohne Stärke. Suchergebnisse: „Bergungsgruppe“ → keine Liste, „Bergung“ → keine Liste, „Technischer Zug“ → keine, „Fachgruppe Wasserschaden“ → keine, „Ortsverband“ → keine. „B“ → 15 Treffer, darunter „(B)“. „Zugtrupp“ findet „(ZTr TZ)“, „Löschgruppe“ findet die Feuerwehr-Vorlagen mit Langnamen („LG — Löschgruppe“) — die anderen Organisationen haben also Klartext, das THW nicht. Nach dem Anlegen heißt die Einheit in Tabelle, Statusmeldung und Tagebuch „(B)“, Gliederungsebene „Unbestimmt“ (`13-einheit-angelegt.png`, `74-tagebuch-hunte.png`: „(B): Einheit gemeldet“). [Code] Die Bezeichnungen stammen ungefiltert aus der StAN-Extraktion: `packages/domaene/src/vorlagen/thw.ts:23` (Lkw als Einheit), `:72` „(MT)“, `:151` „(B)“, `:859` „Die SEEWA ist …“, `:896` „3.1 SEElift“; Fahrzeugtyp `:31` „LKW Ladekran) ist die Zusatz-funktion Bediener/in Mobilkran o-“; Ebene durchweg `"UNBESTIMMT"` (Kopfkommentar `:7`).
- **Erwartung der Rolle:** „Bergungsgruppe (B) — THW · 0/2/10“ bzw. „Technischer Zug — Zugtrupp (ZTr TZ)“. Suchen nach dem Wort, das auf der Stärkemeldung steht. Danach heißt die Einheit z. B. „B OV Oldenburg“ oder ich werde nach dem Namen gefragt.
- **Auswirkung im Einsatz:** Der Helfer legt die falsche Vorlage an (Raten zwischen „(B)“, „(FGr BrB)“, „(FGr BT)“), weicht auf „Ohne Vorlage“ aus und tippt die Stärke selbst — oder die Lage enthält mehrere Einheiten „(B)“, die niemand auseinanderhalten kann. Die Gliederungsebene bleibt „Unbestimmt“; alles, was nach Ebene zählt, ist für THW-Einheiten leer [Annahme].
- **Empfehlung:** THW-Vorlagen mit Langname und Kurzzeichen führen („Bergungsgruppe (B)“), die Suche über beide; Bruchstücke aus der StAN-Extraktion (Satzfragmente, Kapitelnummern, Fahrzeuge als Einheit) aus dem Katalog nehmen; Ebene für die eindeutigen Fälle vorbelegen (B, FGr → Gruppe; ZTr → Zugtrupp; TZ → Zug). Nach der Vorlagenwahl ein Namensfeld mit Vorschlag „B THW OV Oldenburg“ zeigen.
- **Verifikation:** Suche „Bergungsgruppe“, „Bergung“, „Technischer Zug“, „Wasserschaden“, „Räumen“ liefert je den passenden THW-Eintrag als ersten Treffer; keine Vorlage beginnt mit „(“, einer Ziffer oder ist länger als ein Satzteil; eine neu angelegte THW-Gruppe trägt Ebene „Gruppe“ und einen Namen ohne Klammer.

#### P1-2 · „Wer sind die anderen?“ — Anzeigename wird nie abgefragt, Sperren und Tagebuch sagen „Arbeitsplatz“, die Statuszeile zählt Geister

- **Fundstelle / Aufgabe:** Startseite „Dieser Arbeitsplatz: Arbeitsplatz · Anzeigename“ (`01-start.png`); Statuszeile „1/2/3/4 weitere Arbeitsplätze“ (`05`, `08`, `13`, `76`); Lage-Zeile „BGr 2 Oldenburg 🔒 wird von Arbeitsplatz bearbeitet“ (`53-status-auswahl.png`); Tagebuch Akteur „Arbeitsplatz“, Rechner „vm“ (`74-tagebuch-hunte.png`).
- **Beobachtung:** [beobachtet] Weder beim ersten Start noch bei „Neuer Einsatz …“ werde ich nach meinem Namen gefragt; der Vorgabewert ist „Arbeitsplatz“ ([Code] `apps/desktop/src/main/einstellungen.ts:61`). Ich war in meiner Web-Schale allein; die Statuszeile meldete trotzdem nacheinander „1 weiterer“, „2 weitere“, „3 weitere“, „4 weitere Arbeitsplätze“ — jede frühere Browser-Sitzung zählt weiter mit. Nach einem abgebrochenen Lauf stand an „BGr 2 Oldenburg“ „🔒 wird von Arbeitsplatz bearbeitet“; ein Klick auf den Status öffnete nichts und sagte auch nicht, warum. Nach gut 30 Sekunden war die Sperre weg ([Code] `apps/desktop/src/worker/bearbeitungssperren.ts:18`, `SPERRE_MS = 30_000`), das erfährt der Nutzer aber nirgends. (Rest aus 29.10., dort P3-2 — jetzt mit Sperre gekoppelt und deshalb höher.)
- **Erwartung der Rolle:** Beim ersten Öffnen: „Wie sollen dich die anderen sehen? (z. B. Meier S1)“. „Wird von Meier S1 bearbeitet — seit 12 s, frei spätestens in 30 s.“ „2 weitere Arbeitsplätze: S4 Müller, VZ“ — nur die, die gerade da sind.
- **Auswirkung im Einsatz:** Der Helfer kann eine gesperrte Einheit nicht ändern und weiß nicht, wen er fragen soll („Arbeitsplatz“ — welcher?). Im Tagebuch stehen alle Einträge aller Neulinge unter „Arbeitsplatz“; die Nachvollziehbarkeit „wer hat das gemeldet?“ ist für die Zeit bis zur ersten Namensänderung verloren [Annahme: im Mehrplatzbetrieb mit mehreren Neulingen]. Die Zahl „4 weitere Arbeitsplätze“ suggeriert Kollegen, die es nicht gibt.
- **Empfehlung:** Anzeigename beim ersten Start (oder bei „Öffnen“, solange er „Arbeitsplatz“ heißt) als Pflichtfeld abfragen. An der Sperre: Name + „frei in N s“ + Tooltip, was man tun kann. In der Statuszeile nur Arbeitsplätze mit frischem Lebenszeichen zählen, Namen im Tooltip.
- **Verifikation:** Neuer Arbeitsplatz ohne Einstellungen → vor dem ersten Schreibschritt wird ein Name verlangt. Zwei Browser, einer sperrt und wird geschlossen: Der andere sieht den Namen und einen Countdown, danach ist die Einheit frei. Ein einzelner Browser zeigt „allein am Einsatz“, auch nach drei Neuladen.

#### P1-3 · „⚠ 8 Konflikthinweise“: Die Erklärung verspricht ein ⚠ an den Feldern — die Tabelle hat keins

- **Fundstelle / Aufgabe:** Statuszeile „⚠ 8 Konflikthinweise“ (jetzt ein Knopf), Lage-Tabelle mit allen Spaltengruppen (`50-konflikte.png`, `75-spalten.png`). Rest aus 29.10. (dort P1-3).
- **Beobachtung:** [beobachtet] Der Klick zeigt jetzt einen guten Text: „Zwei Arbeitsplätze haben dasselbe Feld fast gleichzeitig verschieden geändert. Angezeigt wird der jüngere Wert; der andere ist nicht verloren. Betroffene Felder tragen in der Tabelle ein ⚠. Auflösen: … diesen Wert neu eintragen …“ ([Code] `apps/desktop/src/renderer/statushinweise.ts:25–29`). In der Tabelle gibt es aber 0 Elemente mit ⚠ — auch nachdem ich alle neun Spaltengruppen eingeschaltet habe (Lauf `nu23`: „⚠ in Tabelle (alle Spalten): 0“). Der Klick springt außerdem ans Seitenende (scrollY 1891 von 2950), dort steht der Text unter der Tabelle; Kopfband und Reiter sind weg.
- **Erwartung der Rolle:** Klick auf „8 Konflikthinweise“ → Liste der acht Stellen (Einheit/Dienstposten · Feld · gilt · verdrängt · von wem), Klick auf eine Zeile springt hin.
- **Auswirkung im Einsatz:** Der Helfer sucht die acht Stellen, findet keine, und gewöhnt sich daran, das gelbe Warnsymbol zu übergehen. Liegt ein falscher Wert darunter, bleibt er falsch. Liegen die Konflikte in Feldern außerhalb der Einheitentabelle (z. B. Schichtplan, Dienstposten — [Annahme], die Prüflage hat dort viele Einträge), sagt das niemand.
- **Empfehlung:** Die Hinweise als Liste mit Fundort zeigen; das ⚠ an jedem betroffenen Feld, auch in Führungsstelle/Schichtplan; der Erklärtext darf nur versprechen, was die Oberfläche einlöst. Den Text an der Statuszeile aufklappen statt die Seite zu verschieben.
- **Verifikation:** In der Prüflage nennt die Liste acht Einträge mit Ort; zu jedem ist am Ort ein ⚠ zu sehen; nach Neueintragen des richtigen Werts sinkt die Zahl.

### P2 — Mittel

#### P2-1 · „Eingang“ ist zweierlei — und die Hilfe schickt mich in einen Reiter, den es nicht gibt

- **Fundstelle:** Reiter „Eingang“ (Eingangskorb + Anforderungen, `23-Eingang.png`); Abschnitt „Eingang“ im Baum, mit einem zweiten, kleinen grauen „Eingang“ daneben (`05`, `20-weser-lage.png`); Kopfband „+63 erwartet (angefordert/Anmarsch/Eingang)“; Hilfe „Erste Schritte“ Nr. 5: „Kräfte anfordern: Im Reiter ‚Anforderungen‘ …“ (`63-hilfe.png`, [Code] `packages/domaene/src/bedienhilfe.ts:32`).
- **Beobachtung:** [beobachtet] Im S1-Profil gibt es keinen Reiter „Anforderungen“; er ist ein Unterreiter von „Eingang“. Der Abschnitt „Eingang“ ist etwas anderes (Einheiten, die noch keinem Bereich zugeordnet sind [Annahme aus „+N erwartet … Eingang“]). Die doppelte Beschriftung „Eingang Eingang“ im Baum (Name + grauer Typ) wirkt wie ein Fehler.
- **Erwartung der Rolle:** Ein Wort, eine Sache. „Kräfte anfordern“ findet man unter einem Reiter, der so heißt.
- **Auswirkung im Einsatz:** Suche nach den Anforderungen kostet einen Fehlversuch; „Eingang“ im Kopfband wird mit dem Eingangskorb verwechselt („liegen da 63 Kräfte im Korb?“).
- **Empfehlung:** Den Abschnitt umbenennen (z. B. „Noch nicht zugeordnet“) oder den Reiter („Meldungen & Anforderungen“); Hilfe-Text an die Profil-Reiter anpassen („Reiter ‚Eingang‘ → ‚Anforderungen‘“); den grauen Typzusatz weglassen, wenn er dem Namen gleicht.
- **Verifikation:** Neuer Helfer findet „Anforderung anlegen“ aus der Hilfe heraus im ersten Versuch; kein Baumeintrag zeigt zweimal dasselbe Wort.

#### P2-2 · Die ganze Seite scrollt: Kopfband, Reiter und Abschnittsbaum verschwinden; Masken öffnen sich unten außer Sicht

- **Fundstelle:** Lage mit 40 Einheiten (`50-konflikte.png`, `52-lage-kontextmenue.png`, `53-status-auswahl.png`); „Erfassungsbogen einlesen …“ (`62/63`, Feld erscheint unter der Tabelle am Seitenende); Stärkezelle im Bearbeitungsmodus (`14-staerke-dblclick.png`).
- **Beobachtung:** [beobachtet] Wer in der Lage nach unten scrollt, verliert Ist-Stärke, Reiter, Suche und den Abschnittsbaum (die linke Spalte ist leer). Der Erfassungsbogen-Scan und der Konflikt-Text erscheinen am Ende der langen Seite, die Seite springt dorthin. Beim Doppelklick auf „Fü/UFü/He“ scrollt die Tabelle waagerecht, Status und Bezeichnung rutschen halb aus dem Bild, und nach Esc bleibt sie verschoben (`15-staerke-esc.png`: Summenzeile beginnt mit „efordert/Anmarsch/Eingang)“).
- **Erwartung der Rolle:** Kopfband und Reiter bleiben stehen wie in der Excel (fixierte Zeilen); eine Maske erscheint dort, wo ich hinschaue.
- **Auswirkung im Einsatz:** Nach dem Bearbeiten einer Einheit unten in der Liste muss der Helfer erst hochscrollen, um die Gesamtstärke zu sehen oder das Blatt zu wechseln; nach dem Scan-Knopf sucht er das Eingabefeld.
- **Empfehlung:** Kopfband/Reiter und Abschnittsbaum fest stehen lassen, nur die Tabelle scrollen; Scan-Feld und Erklärtexte als Overlay bzw. am Auslöser; waagerechte Position nach Esc zurücksetzen.
- **Verifikation:** In der Lage bis zur letzten Einheit scrollen: Ist-Stärke und Reiter bleiben sichtbar. Strg+Q öffnet das Scanfeld im sichtbaren Bereich.

#### P2-3 · Strg+P ist „Funkprobe: Kontakt“ — wer drucken will, schreibt eine Funkprobe

- **Fundstelle:** Funkplan, Einheit „Tr Log WT“ angeklickt, Strg+P (`46-strg-p.png`); Hilfe-Tastenkarte „Strg+P Funkprobe ‚Kontakt‘ …“ (`63-hilfe.png`).
- **Beobachtung:** [beobachtet] Strg+P trug sofort „Funkprobe Tr Log WT: Kontakt 2050“ ein; Statuszeile „✓ Funkprobe der Einheit ‚Tr Log WT‘ eingetragen · gespeichert“. Rückgängig ist angeboten.
- **Erwartung der Rolle:** Strg+P druckt — das ist in jedem Büroprogramm so, und das Funkplan-Menü „⋯“ bietet „Funkplan als HTML … zum Drucken“.
- **Auswirkung im Einsatz:** Falscher Funkkontakt im Funkplan („letzter Kontakt 20:50“), der die Schwelle „kein Kontakt > 60 min“ zurücksetzt; eine Einheit, die sich nicht gemeldet hat, erscheint als erreicht [Annahme: wenn die Rücknahme übersehen wird].
- **Empfehlung:** Funkprobe auf eine Taste legen, die nicht mit Drucken belegt ist, oder Strg+P mit Rückfrage; Strg+P im Funkplan auf „Funkplan drucken“.
- **Verifikation:** Strg+P mit gewählter Einheit erzeugt keinen Tagebucheintrag.

#### P2-4 · Fünf Gesamtzahlen, keine Brücke dazwischen

- **Fundstelle:** Kopfband „14/48/202 // 264 · +63 erwartet · 3 beendet“, Baum „Alle Bereiche 40“, Tabellenfuß „Ist-Stärke 264 · Erwartet 63 · Alle erfassten Einheiten 327 · Beendet/Rückmarsch 3“ (`50-konflikte.png`), Kosten „Summe 293“ (`3x-Kosten.png`), Funkplan „39 Einheiten“ (`3x-Funkplan.png`), Versorgung „Frühstück 279“.
- **Beobachtung:** [beobachtet] Die Lage selbst erklärt ihre Zahlen jetzt gut („Regel“-Knopf, Fußzeilen). Zwischen den Blättern fehlt die Brücke: Kosten rechnet 293 Kräfte (Fußnote: ohne Angeforderte), Funkplan zeigt 39 statt 40 Einheiten (ohne Rückmarsch [Annahme]), „3 beendet“ im Kopfband sind Kräfte, im Baum zählen „40“ Einheiten. Rest aus 29.10. (P2-2), dort 293 ≠ 330.
- **Erwartung der Rolle:** Jede Zahl sagt, was sie zählt, und Abweichungen zur Kopfzahl stehen daneben („293 Kräfte = Ist 264 + Rufbereitschaft/Einsatzvorbehalt 29“).
- **Auswirkung im Einsatz:** Beim Lagevortrag wird die falsche Zahl genannt oder Zeit mit Nachrechnen verbracht.
- **Empfehlung:** In Kosten, Versorgung und Funkplan eine Zeile „Bezug zur Ist-Stärke“; im Kopfband „3 Kräfte beendet“.
- **Verifikation:** Helfer erklärt ohne Hilfe, warum Kosten 293 und Kopfband 264 zeigen.

#### P2-5 · „Vermeldezentrale“ — ein Wort, das ein THW-Helfer nicht kennt

- **Fundstelle:** Profilwahl „Vermeldezentrale: Funkplan · Lage · Einsatztagebuch“ (`02-aendern.png`), Hinweisband Funkplan „Die Ansicht der Vermeldezentrale …“.
- **Beobachtung:** [beobachtet] Der Begriff steht ohne Erklärung. [Code] Das Konzept sagt selbst: „Im THW heißt sie meist Fernmeldezentrale (FmZ)“ (`docs/v2/entwurf/funkplan/KONZEPT-FUNKPLAN.md:10–11`).
- **Erwartung der Rolle:** [Annahme] „Fernmeldezentrale (FmZ)“ bzw. „Sprechfunker“. „Vermeldezentrale“ liest sich wie ein Tippfehler.
- **Auswirkung im Einsatz:** Der Helfer an der FmZ wählt „Alle Blätter“ oder „Führungsstelle (S1)“ und bekommt den Funkplan nur über „Mehr“.
- **Empfehlung:** „Fernmeldezentrale (FmZ)“ als Profilname, ggf. mit „Vermeldezentrale“ als Zusatz, falls das ein lokaler Begriff ist.
- **Verifikation:** THW-Helfer der FGr K ordnen sich ohne Rückfrage dem richtigen Profil zu.

#### P2-6 · Ausgaben: 23 gleichrangige Knöpfe ohne Vorschau, Organisationen in Versalien

- **Fundstelle:** Reiter „Ausgaben“ (`25-Ausgaben.png`, `76-ausgabe-druck-pdf.png`). Rest aus 29.10. (P1-4), jetzt niedriger, weil Hinweisband und Erklärzeile hinzugekommen sind.
- **Beobachtung:** [beobachtet] Drei Reihen „X als PDF / X als HTML“ für elf Ausgaben plus XLSX; „Davon Stärke der Organisation“ mit „FEUERWEHR, POLIZEI, … REGIE, ZIVIL, SONSTIGE“ in Großbuchstaben, während die Tabelle „Feuerwehr“ schreibt. Was „Druck“ von „Einheitenliste“ und „Papier-Vordruck“ unterscheidet, sieht man erst nach dem Erzeugen. In der Web-Schale meldet jeder PDF-Knopf erst nach dem Klick „PDF gibt es nur in der Desktop-App“ [beobachtet; in der Desktop-App nicht prüfbar].
- **Erwartung der Rolle:** Liste der Ausgaben mit einem Satz und Vorschau, Format als zweite Wahl.
- **Auswirkung im Einsatz:** Vor dem Lagevortrag wird die falsche Ausgabe erzeugt oder mehrfach geklickt.
- **Empfehlung:** Je Ausgabe eine Zeile „Name — wofür“ und ein Formatwahlschalter; Organisationen in derselben Schreibweise wie in der Tabelle; im Browser die PDF-Knöpfe gar nicht erst anbieten.
- **Verifikation:** Aufgabe „Stärke je Einsatzabschnitt für die Lagekarte drucken“ gelingt im ersten Versuch.

#### P2-7 · Interne Kennungen und Datenformate im Blatt Führungsstelle und im Tagebuch

- **Fundstelle:** Führungsstelle → Schichtplan: Spalten „2026-09-08 / 2026-09-09“, Knopf „Spalte öffnen“, Summenzeilen „Besetzt · TAG“ (`24-Führungsstelle.png`); Einsatztagebuch: „D07: Schichtplan geändert …“, „D14: Dienstposten angelegt“ (`26-Einsatztagebuch.png`).
- **Beobachtung:** [beobachtet] Die Dienstposten erscheinen im Tagebuch nur mit ihrer internen Nummer „D01 … D14“, „Dienstposten angelegt“ ohne Funktion. Datum im Schichtplan in ISO-Schreibweise, sonst überall TT.MM.JJJJ. Rest aus 29.10. (P2-4).
- **Erwartung der Rolle:** „Ltr FüSt (Tag): Dienstposten angelegt“, Datum „08.09.“, „Tag hinzufügen“.
- **Auswirkung im Einsatz:** Tagebuch beim Nachlesen nicht verständlich; Datumsverwechslung beim Eintragen.
- **Empfehlung:** Funktion und Schicht statt Kennung; Datum einheitlich deutsch; „Spalte öffnen“ umbenennen.
- **Verifikation:** Kein Tagebucheintrag beginnt mit einer Kennung der Form „D\d\d:“; Schichtplan zeigt TT.MM.

### P3 — Niedrig

#### P3-1 · „Regel“ am Kopfband — Inhalt gut, Wort unverständlich
[beobachtet] Der kleine Knopf „Regel“ neben „IST-STÄRKE“ öffnet eine sehr gute Erklärung, wer zählt (`06-regel.png`). Als Neuling hätte ich ihn nie gedrückt: „Regel“ klingt nach Einstellung. → „Wer zählt?“ oder „ⓘ“. Verifikation: Neuling öffnet die Erklärung, wenn er gefragt wird, warum 264.

#### P3-2 · Neuer Abschnitt landet im Baum unter „Einsatz beendet“
[beobachtet] Im neuen Einsatz steht „EA Deich Nord“ nach dem Anlegen unterhalb von „Einsatz beendet“ (`08-abschnitt-angelegt.png`), in der Prüflage steht „EA Reserve“ korrekt davor. → Einsatzabschnitte immer vor „Angefordert/Anmarsch“ und „Einsatz beendet“ einsortieren. Verifikation: im leeren Einsatz zwei EA anlegen, beide stehen über „Einsatz beendet“.

#### P3-3 · Einsatzliste „Status — · — Einh.“
[beobachtet] Ein Einsatz, den dieser Arbeitsplatz nur über Schließen des Fensters verlassen hat, steht dauerhaft mit „Status — · — Einh.“ in der Liste (`70-auswahl-zweiter-besuch.png`); erst nach „⋯ → Einsatz schließen“ steht „laufend · 40 Einh.“ (`73`). Für den Neuling sieht der Strich aus wie „kaputt/leer“. → „noch nicht geöffnet“ bzw. Werte beim Öffnen merken. Verifikation: Einsatz öffnen, Browser schließen, neu öffnen: Liste zeigt Status und Einheiten.

#### P3-4 · Fleetmapping-Vorschlag: Treffer per Teilwort und aus fremden Landesverbänden; Felder „hört“, „Gateway“ unerklärt
[beobachtet] Der Vorschlag ist eine echte Hilfe, und Enter legt den getippten Namen an, nicht den Vorschlag (`42`, `43`) — gut. „OL“ schlägt aber neun „T_POOL-0x“ vor (Teilwort „OOL“), „THW“ zehn „THW_0x · nur LV HHMVSH“ und „TH WRZ · nur LV SNTH“ — für eine Lage in Niedersachsen unbrauchbar [Annahme: LV HBNI ist der eigene]. Die Feldnamen „hört“ (klein) und „Gateway“ stehen ohne Satz. → Eigenen Landesverband zuerst, Treffer am Wortanfang bevorzugen; „hört (wer hört mit)“. Verifikation: „OL“ zeigt zuerst Oldenburger Gruppen.

#### P3-5 · Kleine Wortbrüche
[beobachtet] Tagebuch „(B): Einheit gemeldet“, obwohl die Einheit als „Angefordert“ geplant angelegt wurde (die Maske sagt ausdrücklich „plant Kräfte und meldet sie nicht als anwesend“). „Erfassungsbogen einlesen“ verlangt einen Handscanner, ohne zu sagen, was bei einem Bogen ohne Code zu tun ist („Ohne Vorlage“). Strg+N bedeutet je nach Fokus „Abschnitt anlegen“ oder „Einheit aus Vorlage“ (beide Tooltips nennen Strg+N, `05`). → „Einheit angelegt (angefordert)“; im Scanfeld ein Satz „Kein Code? → Einheit anlegen ▾ → Ohne Vorlage“. Verifikation: Tagebuch- und Maskenwortlaut stimmen überein.

#### P3-6 · Zeit nur als DTG „052041NOV26“
Rest aus 29.10. (P1-5, Teil Uhrzeit). [beobachtet] Startseite und Kopfband zeigen nur die Datum-Zeit-Gruppe, ohne Zonenkennung. Für THW-Führungskräfte vertraut [Annahme], für den Neuling am S1-Tisch eine Lesehürde; die Einsatzliste schreibt dagegen „Stand heute, 20:40“. → Zusätzlich „05.11. 20:41“ klein darunter. Verifikation: Neuling liest die Uhrzeit vom Kopfband im ersten Versuch richtig ab.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen — Einsatz von Null anlegen, Abschnitt und Einheit anlegen, Status setzen und zurücknehmen, Rufgruppe anlegen und Einheit auswählen ja; die passende THW-Vorlage nur durch Raten, Konflikthinweise nicht auflösbar.
- **Fremde Hilfe nötig:** nein (Handbuch und Kurzanleitung nicht geöffnet; die In-App-Hilfe einmal, nicht zwingend).
- **Größtes Missverständnis:** Dass „(B)“ in der Vorlagenliste die Bergungsgruppe ist und dass „Arbeitsplatz“, der eine Einheit sperrt, ein Kollege ist und nicht der Vorgabename, den niemand geändert hat.
- **Größtes Einsatzrisiko:** Unkenntliche THW-Vorlagen führen zu falsch angelegten oder namensgleichen Einheiten „(B)“ ohne Ebene in der gemeinsamen Lage — und niemand kann im Tagebuch erkennen, welcher Arbeitsplatz sie angelegt hat.
- **Top-Priorität für die nächste Iteration:** Den THW-Vorlagenkatalog bereinigen — Klartext-Langnamen mit Kurzzeichen, Suche über beide, StAN-Bruchstücke raus, Ebene vorbelegt.
