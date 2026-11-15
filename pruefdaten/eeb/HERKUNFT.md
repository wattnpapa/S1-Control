# Beispielbögen des Einheitenerfassungsbogens — Herkunft und Zweck

Übernommen am 2026-11-15 aus `wattnpapa/erfassungsbogen`, Verzeichnis
`examples/`, Stand `8fac03f`. 612 Bögen, dazu die READMEs der Verzeichnisse
unverändert. Erste Übernahme am 2026-09-10 (Stand `4aaefad`, 443 Bögen).

## Was übernommen ist, und was nicht

Alle Verzeichnisse bis auf `thw/ortsverbaende` vollständig: 590 Bögen in
Schema 6 (119), 7 (20), 8 (203), 9 (41), 10 (101) und 12 (106).

`thw/ortsverbaende` führt upstream je Einheit jedes Ortsverbands einen
erzeugten Bogen — 3533 Bögen in 667 Verzeichnissen, 18 MB, alle in Schema 12
und alle nach demselben Muster. Davon liegen hier zwei Ortsverbände als
Stichprobe (22 Bögen): `ov-chemnitz` (mit den Trupps der FGr Log-MW und den
neuen Fahrzeugtypen des Vokabulars) und `ov-oldenburg-ni`. Die README des
Verzeichnisses beschreibt, wie der ganze Satz entsteht.

Schema 11 (Uhrzeit zum Zeitraum) und Schema 13 (Zeichenfarbe am Fahrzeug,
Einzelperson) kommen in den Beispielen nicht vor: Die App schreibt die
kleinste tragende Version, und kein Beispiel nutzt diese Felder. Beide misst
`packages/domaene/src/eeb/scanner.test.ts` mit erzeugten QR-Codes.

## Wofür sie hier liegen

Zwei Definitions of Done verlangen sie:

* **M1.1** — „Beispielbögen aller Schemaversionen als Testdaten". Damit läuft
  die Upcaster-Kette von `@bos/eeb-format` über echte Daten und nicht über
  erfundene.
* **M1.5** — „Roundtrip-Tests mit den Beispielbögen". Der Adapter
  `eeb → EinheitGemeldet` wird gegen jeden einzelnen gefahren
  (`bau/pruefdaten/eeb-roundtrip.test.ts`).

## Warum kopiert und nicht als Submodul

Der Erfassungsbogen ist eine Anwendung, kein Kernpaket. Ihn als viertes
Submodul aufzunehmen widerspräche dem Zuschnitt aus ADR-003 (Nachtrag vom
2026-09-10): aufgenommen werden `eeb-format`, `meldekopf` und `vokabulare`,
und zwar wegen ihres Codes, nicht wegen ihrer Testdaten. 5,7 MB JSON sind der
billigere Preis.

Die Kehrseite ist benannt: Diese Kopie altert. Kommt ein Bogen einer neuen
Schemaversion hinzu, muss sie nachgezogen werden — der Stand oben sagt,
wogegen zuletzt gemessen wurde. Beim Nachziehen auch `pruefdaten/eeb-pdf`
neu erzeugen: Die PDFs tragen `thw/001` bis `thw/003` als Anhang.

## Was sie nicht sind

Keine echten Einsatzdaten. Die Bögen sind Beispiele mit erfundenen Namen,
Telefonnummern und Adressen (`…@bundeswehr.example` und ihresgleichen); alle
tragen `"uebung": true`.
