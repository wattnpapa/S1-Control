# Einstieg in M6 — EEB und Meldekopf

Stand: 2026-09-10 · Meilenstein M6 aus [03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md) · Status: **abgeschlossen**, siehe
[M6-abschlussbericht.md](../berichte/M6-abschlussbericht.md); M6.5 (Kamera)
ist gemessen und Johannes vorgelegt

M6 macht aus dem Erfassungsbogen einen **Weg** statt eines Scans. Die Zeile im
Meilensteindokument nennt sechs Stücke: „QR per Kamera und Handscanner mit
Segmentsammlung und Signaturprüfung, Bündeldatei, Meldekopf-Modus direkt auf
dem Share, Eingangskorb mit Quittierung, Revisionen und Diff", 2,0 bis 3,0 PW.

Zwei davon stehen seit M3.4: Handscanner mit Segmentsammlung und
Signaturprüfung. Was fehlt, ist alles, was **nach** dem Scan kommt — und das
ist der eigentliche Meldeweg.

## Was der Bestand hergibt

| Was M6 braucht | Wo es liegt |
|---|---|
| Segmentsammlung, Signaturprüfung, Bogen entpacken | `packages/domaene/src/eeb/scanner.ts` (M3.4) |
| Übersetzung Bogen → Ereignisse | `packages/domaene/src/eeb/adapter.ts` (M1.5) |
| `EebMeldungEmpfangen` und die fünf Folgearten | Katalog, KONZEPT-EREIGNISSE.md §5.8 |
| `uebernahmeZustand` als abgeleitetes Merkmal | Fold, §5.8.1 |
| K26 Revisionskopf, K27 Eingangskorb | `kennzahlen.ts` seit M1.3 |
| Der Diff zweier Bogenfassungen | **`@bos/meldekopf`**, `meldung-diff.ts` |
| Der Fingerabdruck einer Einheit | **`@bos/meldekopf`**, `einheitSchluessel()` |
| Die Sammlung als JSON — die Bündeldatei | **`@bos/meldekopf`**, `einsaetzeZuJson` / `einsaetzeAusJson` |

Der geteilte Kern `@bos/meldekopf` ist als Submodul vorhanden und in
`vitest.config.ts` verdrahtet, wird aber von **keiner** Quelldatei benutzt.
M1.1 hat ihn extrahiert; M6 ist der Meilenstein, für den er extrahiert wurde.

## Befund vor der ersten Zeile: `bogenInhaltsId` taugt nicht als `meldungId`

M3 hat als Befund B4 festgehalten: „`bogenInhaltsId(bogen)` aus ZDM §3.2 gibt
es im geteilten Kern nicht." Das war falsch — es gibt sie, in
`@bos/meldekopf/einsaetze.ts`. Der Befund löst sich damit aber nicht auf,
sondern kehrt sich um: **Die Funktion existiert und darf trotzdem nicht
benutzt werden.**

```ts
export function bogenInhaltsId(bogen: Erfassungsbogen): string {
  return fnv1a(JSON.stringify(bogen));   // FNV-1a, 32 Bit, 8 Hexziffern
}
```

Zwei Gründe, beide aus §5.8.1:

1. **`JSON.stringify` ordnet nach Einfügereihenfolge**, nicht kanonisch. Zwei
   Clients, deren Codec die Felder in anderer Reihenfolge aufbaut, berechnen
   für denselben Bogen zwei Ids. Genau darauf beruht aber die Zusicherung des
   Paragraphen: „zwei Meldeköpfe, die denselben QR scannen, erzeugen **eine**
   Meldung."
2. **32 Bit sind zu wenig.** Bei rund 77.000 Einträgen liegt die
   Kollisionswahrscheinlichkeit bei 50 %; eine Kollision heißt hier nicht
   „zwei gleiche Zeilen", sondern zwei verschiedene Meldungen unter derselben
   Identität — und `EebMeldungEmpfangen` ist nicht rücknehmbar.

Für den Zweck, für den die Funktion geschrieben wurde — Dublettenerkennung in
der Sammlung eines Telefons —, ist beides in Ordnung. Für die Identität einer
Meldung in einer Einsatzakte ist es das nicht.

**Was M6 stattdessen tut:** Der Weg aus M3.4 bleibt — Inhalts-Hash über die
**kanonische Serialisierung** des migrierten Bogens (§7.6), dieselbe Ordnung
wie beim Zustandshash. Was M6 aus dem Kern übernimmt, ist `einheitSchluessel()`:
der Fingerabdruck, der die Revisionsreihe bildet. Er ist eine Heuristik und
als solche vorgesehen — die App schlägt vor, der Mensch bestätigt.

## Die Lücke, die daraus folgt: es gibt keine Revisionsreihen

Der Scanner setzt heute:

```ts
einheitSchluessel: auftrag.einheitSchluessel ?? auftrag.meldungId
```

Ohne übergebenen Schlüssel ist die Reihe also die Meldung selbst. Damit ist
**jede Meldung ihre eigene Revisionsreihe**, und drei Regeln laufen ins Leere:
`uebernahmeZustand = GEAENDERT` kann nie entstehen (§5.8.1), K26 liefert je
Meldung einen Revisionskopf statt je Einheit, und der Diff hätte nichts zu
vergleichen. Der Fold ist richtig, die Kennzahlen sind richtig; es fehlt der
Schlüssel.

## Reihenfolge — und warum die Kamera zuletzt kommt

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M6.0** `@bos/meldekopf` verdrahten: Fingerabdruck als Revisionsreihe | ohne ihn gibt es keine Revision, keinen Diff und kein `GEAENDERT` |
| 2 | M6.1 Eingangskorb mit Quittierung: K27 als Ansicht, ablehnen, Melde­status | der Kern des Meldewegs; die Ampel der Excel wird ein Zustand |
| 3 | M6.2 Revisionen und Diff | braucht die Reihe aus 1 und die Ansicht aus 2 |
| 4 | M6.3 Bündeldatei: Sammlung lesen und schreiben | der Weg ohne Netz — mehrere Bögen in einer Datei |
| 5 | M6.4 Meldekopf-Modus auf dem Share | eine Betriebsart, kein Datenmodell; sie setzt 1 bis 4 voraus |
| 6 | M6.5 QR per Kamera | siehe unten — das einzige Paket mit einem offenen Risiko |

**Warum die Kamera zuletzt steht.** Sie ist das einzige Stück von M6, dessen
Machbarkeit im Baum nicht entschieden ist. Zum Entpacken eines QR-Bildes
braucht es einen Decoder; die Anwendung hat heute vier Laufzeitabhängigkeiten
(React, React-DOM, Zod, Zustand) und keine davon kann es. Chromium bringt eine
`BarcodeDetector`-Schnittstelle mit, aber **nicht auf jeder Plattform** — unter
Linux und Windows fehlt sie in vielen Fassungen. Die Lage ist also: entweder
eine fünfte Abhängigkeit, oder ein Paket, das auf dem Zielsystem Windows
möglicherweise nicht läuft. Das ist zu messen und zu entscheiden, bevor es
gebaut wird, und es darf die fünf Pakete davor nicht aufhalten.

**Warum der Meldekopf-Modus vor der Kamera steht.** Er ist keine neue
Fachlichkeit, sondern eine Betriebsart: ein Arbeitsplatz, der auf demselben
Share arbeitet und nur den Eingangskorb bedient. Alles, was er braucht, ist in
1 bis 4 gebaut; was hinzukommt, ist eine Einstellung und eine andere
Oberfläche.

## Definition of Done je Paket

| WP | DoD |
|---|---|
| M6.0 | Der Fingerabdruck aus `@bos/meldekopf` bildet die Revisionsreihe; zwei Bögen derselben Einheit landen in einer Reihe, zwei verschiedener nicht; `bogenInhaltsId` wird **nicht** benutzt und der Grund steht im Code |
| M6.1 | Eingangskorb zeigt K27; ablehnen mit Pflichtgrund (§2.4), Ablehnung zurücknehmbar; die Meldung bleibt in jedem Fall sichtbar (§5.8.1); `uebernahmeZustand` ist die Ampel |
| M6.2 | Revisionen einer Reihe in der Ordnung nach `stand` (nicht nach HLC, §2.6); Diff zweier Fassungen mit den Texten aus `@bos/meldekopf`; `GEAENDERT` entsteht und wird angezeigt |
| M6.3 | Eine Bündeldatei mit mehreren Bögen wird eingelesen, jede Meldung einzeln erzeugt; doppelte fallen über die `meldungId` zusammen (§3.6); Export einer Sammlung aus der Akte |
| M6.4 | Der Meldekopf-Modus ist eine Einstellung; sein Fenster zeigt Eingangskorb und Scanner und **nicht** das Lagebild; er schreibt in dieselbe Akte |
| M6.5 | **Zuerst gemessen, dann gebaut.** Ist `BarcodeDetector` auf den Zielplattformen nicht verlässlich, wird das als Befund festgehalten und die Entscheidung über eine Abhängigkeit Johannes vorgelegt |

## Was M6 nicht liefert

* **Kein Auto-Merge.** Die Zuordnung einer Meldung zu einer Einheit ist eine
  Heuristik und bleibt eine: vorgeschlagen von der Anwendung, bestätigt vom
  Menschen (`@bos/meldekopf`, Modulkopf `einsaetze.ts`). Ein hartes
  Zusammenführen wäre bei einem Fingerabdruck aus Organisation, Typ und Name
  eine Wette.
* **Keine neue Ereignisart.** Wie in M5: Lücken werden als Befund gesammelt.
  §5.8 trägt alles, was der Meldeweg braucht.
* **Kein PDF-Import.** `pdf-dokument.ts` ist nach ADR-003 nicht in Stufe 1 des
  geteilten Kerns.
* **Die Parität mit der Excel.** Unverändert offen aus M4.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten in Code, Kommentaren, Tests und Commit-Nachrichten.
* Begründender Stil mit Paragraphenverweis.
* Ringgrenzen aus 02-ZIELBILD.md, erzwungen in `eslint.config.mjs`.
* Keine Ausgabe rechnet: Jede Zahl ist eine Kennzahl aus Ring 2.
* Jede Ansicht bekommt ihren eigenen Ruf mit Filter und Ausschnitt (M3.7).
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
