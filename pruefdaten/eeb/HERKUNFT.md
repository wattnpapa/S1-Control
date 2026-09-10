# Beispielbögen des Einheitenerfassungsbogens — Herkunft und Zweck

Übernommen am 2026-09-10 aus `wattnpapa/erfassungsbogen`, Verzeichnis
`examples/`, Stand `4aaefad`. 443 Bögen in acht Verzeichnissen nach
Organisation, dazu die READMEs der Verzeichnisse unverändert.

## Wofür sie hier liegen

Zwei Definitions of Done verlangen sie:

* **M1.1** — „Beispielbögen aller Schemaversionen als Testdaten". Enthalten
  sind alle drei Versionen, die im Umlauf sind: 119 Bögen in Schema 6, 20 in
  Schema 7 und 304 in Schema 8. Damit läuft die Upcaster-Kette von
  `@bos/eeb-format` über echte Daten und nicht über erfundene.
* **M1.5** — „Roundtrip-Tests mit den 443 Beispielbögen". Der Adapter
  `eeb → EinheitGemeldet` wird gegen jeden einzelnen gefahren.

## Warum kopiert und nicht als Submodul

Der Erfassungsbogen ist eine Anwendung, kein Kernpaket. Ihn als viertes
Submodul aufzunehmen widerspräche dem Zuschnitt aus ADR-003 (Nachtrag vom
2026-09-10): aufgenommen werden `eeb-format`, `meldekopf` und `vokabulare`,
und zwar wegen ihres Codes, nicht wegen ihrer Testdaten. 3,4 MB JSON sind der
billigere Preis.

Die Kehrseite ist benannt: Diese Kopie altert. Kommt ein Bogen einer neuen
Schemaversion hinzu, muss sie nachgezogen werden — der Stand oben sagt,
wogegen zuletzt gemessen wurde.

## Was sie nicht sind

Keine echten Einsatzdaten. Die Bögen sind Beispiele mit erfundenen Namen,
Telefonnummern und Adressen (`…@bundeswehr.example` und ihresgleichen);
mehrere tragen `"uebung": true`.
