# ADR-003 – Geteilter TypeScript-Kern `@bos/kern` mit erfassungsbogen.app

Status: **vorgeschlagen, wartet auf Entscheidung 4** (04-OFFENE-ENTSCHEIDUNGEN.md) · Datum: 2026-09-08 · Entscheider: Johannes Rudolph

## Kontext

erfassungsbogen.app (291 Commits, aktiv, TypeScript) enthält bereits plattformneutral: das EEB-Bogenmodell mit Schema-Migration bis Version 8, den Codec (Base41, Deflate, Ed25519-Signaturkette, Segmentierung), die Meldekopf-Sammlung mit Revisionen, Aufteilen/Zusammenführen, Meldungs-Diff, die THW-Vokabulare und einen XLSX-Schreiber, der exakt das Spaltenformat der Oldenburger Excel erzeugt. S1-Control v2 braucht denselben Codec und denselben Meldekopf-Apparat. Der VBA-Nachbau des Codecs in der Excel ist nach Code-Lesart nicht kompilierfähig; ein Rust-Port wäre Doppelpflege bei jedem Schemaschritt.

## Entscheidung (vorgeschlagen)

Ein eigenes Repository `bos-kern` (Arbeitsname) enthält den UI-freien Kern beider Produkte. Beide binden es als git-Submodul unter `vendor/bos-kern` mit `"@bos/kern": "file:vendor/bos-kern"` ein, gepinnt auf Commits, nicht auf `main`.

**Erstschnitt (Stufe 1, in M1):** `model.ts`, `codec.ts`, `signatur.ts`, `qr-node.ts`, `vokabulare/**`, `einsaetze.ts` mit injizierter Speicherhülle statt direktem `localStorage`, `aufteilen.ts`, `zusammenfuehren.ts`, `meldung-diff.ts`, `papierkorb.ts`, sowie die acht reinen Funktionen aus `hilfen.ts` in ein neues Modul `darstellung.ts`. **Nicht in Stufe 1:** `hilfen.ts` selbst (importiert über `nativ.ts` vier Capacitor-Pakete), `pdf-dokument.ts`, `geraete-schluessel.ts` (Signaturidentität des Geräts gehört zum Produkt). **Stufe 2 bei Bedarf (M4/M6):** `auswertung.ts`, `einheiten-liste.ts`, `xlsx.ts`, `oldenburg-xlsx.ts`, `csv.ts`, `bogen-csv.ts`.

**Nicht im geteilten Kern:** HLC, Ereigniskatalog und Fold von S1. Aufnahmeregel 1 gilt: nur Bausteine, die beide Produkte aufrufen.

## Sechs Aufnahmeregeln

1. Aufnahme nur, wenn beide Produkte den Baustein aufrufen.
2. Keine `node:`-, DOM- oder React-Importe; geprüft per ESLint und durch Testlauf unter `node` und `jsdom`.
3. Keine Rückimporte aus `@s1/*` oder aus der Erfassungsbogen-App.
4. Änderungen additiv; Schema-Abwärtskompatibilität bleibt Pflicht (QR-Codes und Dateien ab Schema 2 lesbar).
5. Bundle-Budget im CI von erfassungsbogen.app; der Kern darf die PWA nicht schwerer machen.
6. Gepinnte Submodul-Commits; kein automatisches Folgen von `main`.

## Rückweg

Blockiert oder verzögert der geteilte Kern zweimal in drei Monaten ein Release des Schwesterprodukts, wird das Vendoring eingefroren: Kopie nach `packages/kern-vendor/` mit festgehaltenem Herkunfts-Commit, danach getrennte Pflege. Der Rückweg ist dokumentiert, bevor der Hinweg begangen wird.

## Begründung

- Die Meldekopf-Sammlung ist strukturell selbst ein Append-Store (Revisionen stapeln, Inhalts-Hash als Identität, neueste Revision je Einheit als Fold). Sie wird eingebettet statt nachgebaut; daraus folgen die drei Meldewege (Share direkt, Bündeldatei, QR) mit identischen Ereignissen, und die Google-Tabelle der Excel entfällt ersatzlos (Vorschlag C §4, Urteil §12.1).
- Die Modellgrenze „Meldung gehört der meldenden Einheit, EinsatzEinheit gehört der Führungsstelle" ist genau die Grenze, die der Oldenburg-Export bereits zieht.
- Ein Einzelentwickler ändert Kern und Produkt häufig gemeinsam und braucht lokale Bearbeitbarkeit; ein Submodul mit `file:`-Abhängigkeit leistet das, eine git-Tag-npm-Abhängigkeit erzwingt `npm link`.

## Risiken und Kosten

- Die transitive Hülle der „sechs Kern-Dateien" umfasst tatsächlich 17 Dateien mit 5.176 Zeilen, darunter Capacitor-Importe und `localStorage`-Zugriffe. Die Extraktion ist Arbeit im Schwesterprojekt und berührt dort Build, Tests und Release (Widerlegung B-Lieferbarkeit §6, C-Lieferbarkeit F2). Realistische Vorleistung: 3 bis 5 Personenwochen, nicht 1,5.
- Schema-Drift: die PWA aktualisiert sich selbst, S1 wird per Installer verteilt. Der Kern in S1 muss unbekannte Felder tolerieren und „Bogen-Version zu neu, bitte S1 aktualisieren" melden statt zu scheitern; die CI hält Beispielbögen je Schemaversion (443 vorhanden) und testet gegen alle.
- Zwei Repositories im dauerhaften Gleichschritt; Pflegeaufwand in der laufenden Pflege (03-MEILENSTEINE.md) eingeplant.

## Alternative bei „Nein"

Schmales, auf einen Tag gepinntes EEB-Paket nur mit Modell, Codec und Signatur (~0,5 PW); Meldekopf-Sammlung, Diff, Aufteilen/Zusammenführen werden in `@s1/domaene` nachgebaut; die Google-Tabelle wird durch Bündeldatei und QR ersetzt, nicht durch Direktschreiben aus der Erfassungsbogen-App.

---

## Nachtrag 2026-09-08: Namen und Aufteilung

Johannes hat den Namen `bos-kern` verworfen — er verspricht mehr, als der
Inhalt haelt — und entschieden, den geteilten Code auf **mehrere Repos je
Baustein** zu verteilen statt auf ein Sammelrepo. Die sechs Aufnahmeregeln,
der Rueckweg und die `file:`-Submodul-Verdrahtung dieses ADR bleiben
unveraendert gueltig; nur Zuschnitt und Benennung aendern sich.

| Repo | npm | Inhalt | haengt ab von |
|---|---|---|---|
| [eeb-format](https://github.com/wattnpapa/eeb-format) | `@bos/eeb-format` | Spezifikation, sprachneutrale Testvektoren, `model`, `codec`, `signatur`, `qr-node`; TypeScript heute, weitere Sprachen spaeter | — |
| [bos-meldekopf](https://github.com/wattnpapa/bos-meldekopf) | `@bos/meldekopf` | `einsaetze`, `aufteilen`, `zusammenfuehren`, `meldung-diff`, `papierkorb`, neu `darstellung` | eeb-format (peer) |
| [bos-vokabulare](https://github.com/wattnpapa/bos-vokabulare) | `@bos/vokabulare` | THW- und KatS-Vokabulare | eeb-format (peer) |
| [bos-taktische-zeichen](https://github.com/wattnpapa/bos-taktische-zeichen) | `@bos/taktische-zeichen` | Zeichenzuordnung, Symbole, Holskript | — |

Alle vier oeffentlich unter `wattnpapa`, EUPL-1.2.

**Warum `qr-node.ts` jetzt passt.** Der Erstschnitt oben fuehrt `qr-node.ts`
auf, obwohl es `node:zlib` und `qrcode` importiert und damit Aufnahmeregel 2
verletzt. In einem Format-Repo mit mehreren Sprachimplementierungen ist das
keine Ausnahme mehr: Aufnahmeregel 2 gilt dort je Implementierung, nicht
ueber das Repo hinweg.

**Diamant auf `eeb-format`.** Gemessene Abhaengigkeiten: `model` importiert
nichts, alles andere importiert `model` — auch die Vokabulare. Binden zwei
Bausteine `eeb-format` je selbst ein, liegen zwei Kopien im Baum und
TypeScript sieht zwei verschiedene Typen `Bogen`. Gegenmassnahme:
`eeb-format` ist in den anderen Repos `peerDependency`, jedes Produkt
liefert genau eine Kopie unter `vendor/eeb-format`, und die CI prueft, dass
es genau eine ist.

**Taktische Zeichen aus dem Erfassungsbogen statt aus v1.** Die Loesung des
Erfassungsbogens ordnet benannte Zeichen aus der Sammlung von jonas-koeritz
zu (echtes GKW- oder MLW-IV-Zeichen, dreistufig ueber Vokabular-Code,
Namenssuche und Grundzeichen als Rueckfall). v1 erzeugt dagegen eine
allgemeine Silhouette mit aufgedrucktem Kurzzeichen. Damit aendert sich
Paket M1.4: statt Uebernahme aus v1 wird die Fassung des Erfassungsbogens
uebernommen und ihre Schnittstelle von `model` und `hilfen` geloest. Der
STAN-Datensatz aus v1 wird weiterhin gebraucht, aber fuer die Vorlagen,
nicht fuer die Zeichen.

**Offen:** Die Lizenzbedingungen der Zeichensammlung sind vor der breiteren
Nutzung zu pruefen.
