# Meilenstein M1 — Abschlussbericht

Stand: 2026-09-10 · Branch `claude/m1-einstieg-docs-oqbntr` · alle Pakete aus
[05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md) §M1

Die DoD von M1.2 verlangt diesen Bericht ausdrücklich: was festgelegt wurde,
die Commit-Hashes, die Antwort der Gutachter, jede Auslegung, die das
Zieldatenmodell nicht hergibt, und alles, was offen geblieben ist.

## Was vorliegt

| Paket | Zustand | Wo |
|---|---|---|
| M1.1 Kernpakete einbinden | fertig | `vendor/eeb-format`, `vendor/bos-vokabulare`, `vendor/bos-meldekopf`; `bau/kern/aufnahmeregeln.test.ts` |
| M1.2 `KONZEPT-EREIGNISSE.md` | Entwurf fertig, **nicht freigegeben** | `docs/v2/konzepte/KONZEPT-EREIGNISSE.md`, 1930 Zeilen, 195 Prüffälle |
| M1.3 `@s1/domaene` | fertig | `packages/domaene/src/` — Zustand, Katalog, Fold, Kennzahlen, Eigenschaften |
| M1.4 Übernahme aus v1 | fertig bis auf `KATS_STAN_NDS` | `packages/domaene/src/zeichen/`, `stan/`, `vorlagen/` |
| M1.5 eeb-Adapter | fertig | `packages/domaene/src/eeb/adapter.ts`, Roundtrip in `bau/pruefdaten/` |

813 Tests, 53 Testdateien, rund 26 Sekunden Laufzeit. `tsc -b` und `eslint .`
sauber. Kein übersprungener Test — die beiden, die seit M0.2 mit Begründung
`skip` trugen (P4 und P6), sind eingelöst.

## Die Commits

Das Ereigniskonzept entstand in 32 Fassungen; die letzten vier und der ganze
Code stehen hier:

| Hash | Was |
|---|---|
| `d8f825e` | 31. Fassung des Konzepts — `angelegtMitArt`, `wartend` endgültig ungekappt |
| `599bc95` | Auftrag M1.3, zod als Abhängigkeit |
| `9f5d429` | Stufe 1 — Zielmodell des Zustands, `foldVersion 2` |
| `a0c579a` | Stufe 2 — der Katalog mit zod-Schemata |
| `dba9abf` | Stufe 3a — der Fold liest den Katalog |
| `56908e8` | Stufe 3b — Zyklusregel, Auflösungskette, Auffang |
| `6945594` | Stufe 3c — Aufteilen und Zusammenführen |
| `c4083f0` | Stufe 3d — Dubletten, Schichtplan, fachliche Zeiten |
| `22b1c55` | Stufe 3e — die Barriere `EinsatzArchiviert` |
| `d557845` | Stufe 3 fertig — Undo, `KorrekturVon`, 32. Fassung des Konzepts |
| `e2888a9` | die vier Entscheidungen von Johannes eingearbeitet |
| `9cdffeb` | Stufe 5 — P1 bis P7 |
| `9ee75e3` | Stufe 4 — die Kennzahlen K1 bis K30 |
| `d4d6b0d` | M1.1 und M1.5 |

## Was festgelegt wurde

Die tragenden Festlegungen des Konzepts, jede mit dem Gegenbeispiel, das sie
erzwungen hat. Ausführlich stehen sie im Dokument; hier steht, warum sie so
und nicht anders lauten.

**Die HLC ordnet, die Wanduhr nie.** `vergleicheHlc` ist eine totale Ordnung
(Millisekunden, Zähler, `clientId`), und der Tie-Break nach Ereignis-Id macht
sie auch dort total, wo ein geklontes Profil zwei Ereignisse unter derselben
Kennung schreibt. Ohne diesen zweiten Schritt entschiede der Akkumulator nach
Eintreffreihenfolge — ausgerechnet in dem Fall, für den die Fehlerinjektion
von M0 gebaut ist.

**Zwei Akkumulatoren, und je Feld steht fest, welcher gilt.** `Feld<T>` hält
die beiden höchsten Beobachtungen, `Erstwert<T>` die kleinste plus die
verdrängten. Der zweite gibt es, weil ein Max-2-Akkumulator bei drei
Zusammenführungen derselben Quelle ausgerechnet den Gewinner verlöre.

**Der Fold ist zustandsgebunden.** Jede Regel muß aus dem materialisierten
Zustand plus dem eintreffenden Ereignis entscheidbar sein — sonst überlebt sie
keinen Schnappschuß. Das ist der Grund für elf Angaben, die sonst niemand
bräuchte, und es ist die Regel, an der im Verlauf die meisten Entwürfe
gescheitert sind.

**Aufteilen wirkt relativ, und die Wirkung steht an der neuen Einheit.** Die
wirksame Stärke ist eine flache Summe **ohne jede Bedingung an die HLC**. Zwei
frühere Fassungen machten den Summanden davon abhängig, ob er jünger sei als
die letzte absolute Meldung; beide Richtungen sind derselbe Fehler — ein
Stellvertreter für Kausalität, den es nicht gibt. Trägt `staerke` die eigene
Stärke, kann eine Meldung einen Zuwachs nie „schon enthalten".

**Aufgegangen ist aufgegangen.** `aufgegangenIn` ist ein Erstwert-Feld: die
erste Zusammenführung gewinnt. Mit gewöhnlichem LWW ließe sich eine Quelle
umlenken und zählte zweimal, ohne daß ein Hinweis entstünde.

**Zwei getrennte Graphen für die Kreissuche.** Eine Kette, die zwischen
`abgeteiltVon` und `aufgegangenIn` wechselt, ist kein Kreis — sonst wäre der
häufigste zusammengesetzte Vorgang der Führungsstelle einer.

**Nach der Archivierung wird weitergefaltet.** Das Ereignis wird angenommen,
gefaltet und wirkt; sichtbar wird es über `nachArchivierungEingegangen` je
Entität. `gilt` ist eine monotone Konjunktion über die Menge, damit eine
Rücknahme auch bei vorlaufender fremder Uhr wirkt.

**Entdopplung ist Sache der Speicherschicht.** Drei Fassungen versuchten es im
Fold (eigenes Id-Gedächtnis, Versionsvektor, Delegation); die ersten beiden
waren falsch, der Versionsvektor gleich auf vier Arten. Mit der Delegation
fielen eine Hinweisart, ein Diskriminator und die Aussetzung von vier
Eigenschaften weg.

## Die Antwort der Gutachter

Dreißig unabhängige, feindliche Durchgänge auf Opus, ohne Kenntnis der
Urheberschaft, jeweils mit der Frage „welche Lage läßt dieses Dokument offen,
und was tut der Code dann?".

Das Muster war durchgehend: **Jede Behebung erzeugte den nächsten Befund.**
Die substantiellen Umkehrungen — jede davon ein Fund eines Gutachters, keine
Feinabstimmung:

* **P4** durchlief vier Formulierungen (absolut → Differenz über `M∖{e}` →
  Bilanzsumme über Präfixe), bis sie meßbar war.
* **§3.11** wurde umgedreht: „die verdrängte Anlage belegt keinen Feldpfad"
  hätte eine **Rücknahme** verlangt — eine später eintreffende Anlage mit
  kleinerer HLC müßte die geltende aus Feldern räumen, deren dritte
  Beobachtung längst aus dem Akkumulator gefallen ist.
* Die **Kappung von `wartend`** wurde eingeführt und wieder verworfen:
  `wartend` schrumpft, und über einer schrumpfenden Menge ist die
  Minimumsauswahl nicht rebase-fest.
* **`archivierungen`** zog an die Wurzel des Zustands, weil ein Grabstein vor
  `EinsatzAngelegt` eintreffen kann und `wartend` ihn nicht halten könnte.

Das dreißigste Gutachten fand noch zwei blockierende Befunde (`angelegtMitArt`
und der `wartend`-Rest aus der 23. Fassung), beide in `d8f825e` behoben.

**Die ehrliche Einschätzung:** Die Schleife konvergierte nicht monoton — die
Zahl der Befunde je Runde lag zuletzt bei 4, 3, 1, 4 —, und die meisten
späten blockierenden Befunde waren Folgefehler eigener Reparaturen. Etwa ab
der zwanzigsten Fassung verschob sich der Ertrag von Fachlogik zu
Byte-Determinismus in Randfällen. Ein einunddreißigstes Gutachten hätte
vermutlich wieder etwas gefunden; die tragenden Regeln halten seit mehreren
Runden.

## Auslegungen, die das Zieldatenmodell nicht hergibt

Die DoD von M1.2 fragt genau danach.

**A1 — `foldVersion` steigt bei jeder Katalogerweiterung, auch bei einem neuen
Wert einer bekannten Werteliste** (§3.9). Das ZDM sagt dazu nichts. Begründung:
Ein zehnter Statuswert erzeugt bei einem Client mit alter Liste
`unbekannterWert` und bei einem mit neuer keinen; Hinweise gehen in den
`zustandsHash`, und zwei Clients hätten bei identischer Ereignismenge
identische Versionsvektoren und verschiedene Hashes — den roten Ausgang.

**A2 — die fünf offenen Wertebereiche und ihre benannten Rückfälle** (§3.7).
Das ZDM führt sie als geschlossene Listen. Ein unbekannter Statuswert machte
dort die ganze Nutzlast ungültig; bei `EinheitGemeldet` fehlte die Einheit samt
Stärke. Der Abschnittstyp ist der einzige, an dem eine Foldregel hängt, und
sein Rückfall zählt lieber zu viel als zu wenig.

**A3 — `EinsatzArchiviert` liest die `einsatzId` nicht** (§7.1). Der Einsatz ist
der der Akte; ein Abgleich wäre eine zweite Wahrheit über etwas, das der
Ordnername schon sagt.

**A4 — die Kostenparameter stehen in der Anlage** (§5.2). Wären sie eine
Konstante im Code, hätte der Zustand einen Anfangswert ohne Ereignisquelle,
und `vorher` der ersten Änderung paßte auf nichts.

**A5 — der Meldestatus einer Einheit aus einem Bogen ist `ANGEFORDERT`**
(M1.5). Der Bogen sagt, wer kommt, nicht was die Einheit tut.

**A6 — das Übungskennzeichen des Bogens wandert in die Bemerkung** (M1.5). Das
Zielmodell führt „Übung" am Einsatz, nicht an der Einheit; eine Einheit aus
einem Übungsbogen kann aber in einem echten Einsatz eintreffen.

**A7 — S11: die Zählbarkeit vererbt sich nicht.** Das ZDM schlägt in seiner
offenen Frage 3 das Gegenteil vor. Am 2026-09-10 von Johannes gegen den
Vorschlag entschieden: Vererbung liefe über `wirksamerParentId`, also über das
Ergebnis der Zyklusauflösung, und machte die Zählbarkeit von einer zweiten
Ableitung abhängig.

## Befunde

### Eingearbeitet am 2026-09-10

| | Betrifft | Was |
|---|---|---|
| B1 | KONZEPT-SPEICHER §2.4 | `schemaVersion` ist die Version der **Nutzlast dieser Art**, nicht des Rahmens |
| B2 | KONZEPT-SPEICHER §4.4 | der Undo-Stapel zählt ein Ereignis als kompensiert, sobald **irgendein** Client es kompensiert hat |
| B3 | ZDM §4.1 Regel 5 | gestrichen — nach `EinsatzArchiviert` wird weitergefaltet |
| B6 | KONZEPT-SPEICHER §2.4 | `grund` steht in der Rahmenfeldliste |

### Offen, ohne Handlungsbedarf vor M0.5

**B4 — der Zustand wächst gegenüber M0.2 um Faktor drei bis vier je
Schnappschuß.** `KONZEPT-SPEICHER.md` §7.5 kalibriert die
Schnappschuß-Auslöser gegen die Erstlaufzeit, nicht gegen die Dateigröße; die
Messung in M0.5 sollte die Schnappschußgröße mitnehmen.

**B5 — `foldVersion` steigt künftig bei jeder Katalogerweiterung.** Nach jedem
Ausbau verwerfen alle Clients ihre Schnappschüsse einmal und falten voll. Bei
den in §7.5 geschätzten 20 bis 30 MB je Einsatz ist das ein spürbarer
Erstlauf — in M0.5 mitmessen.

### Neu aus M1.3

**K-B1 — ZDM §3.3 widerspricht sich in der Grundmenge der Matrizen.** K19, K20
und K22 nennen `E*`; K23 verlangt `Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT
= 0`. Liefen beide Matrizen über `E*`, wären sie gleich groß — angeforderte
Einheiten sind darin gar nicht enthalten —, und die Probe ergäbe
`+Σ_ANGEFORDERT` statt null. Sie geht genau dann auf, wenn die
Organisationsmatrix die angeforderten Einheiten enthält und die Schichtmatrix
sie mangels Schicht ausläßt. Dasselbe sagt K25 mit seiner dritten Bedingung,
und dasselbe tut die Excel (`Status!D7..J18` summiert über das ganze Blatt).
`kennzahlen.ts` rechnet deshalb über `E`; die Referenzlage rechnet es vor:
23 − 23 = 0 und 17 − 23 + 6 = 0. **ZDM ist ein Entwurf und wurde von hier aus
nicht geändert.**

**Eine Regel des eigenen Konzepts ist beim Bauen umgefallen** und wurde in der
32. Fassung berichtigt: §2.2a erzeugte `vorherPasstNicht` auch dort, wo der
Gewinner denselben Wert setzt wie die verdrängte Beobachtung, und widersprach
damit T66 und §6 U6. §2.2a trägt jetzt denselben Vorbehalt wie §2.3 seit M0.2.

## Was offen ist, und wer es entscheidet

| Was | Wer | Blockiert |
|---|---|---|
| **Freigabe von `KONZEPT-EREIGNISSE.md`** (32. Fassung) | Johannes | nichts; der Code ist dagegen gebaut |
| **Die Excel-Mappe für `KATS_STAN_NDS`** (M1.4) | Johannes | den Rest von M1.4; der Test hält die Lücke offen |
| **B4 und B5 messen** | M0.5 | nichts |
| **Lizenz der Zeichensammlung** in `bos-taktische-zeichen` | Johannes | nur eine spätere Aufnahme des vierten Pakets |
| **Ob der Erfassungsbogen-Kern die v1-Zeichen-Inferenz ablöst** | Johannes | nichts; eigene Entscheidung mit eigenem Vergleich |
| **Die vier FüSt-Fragen 19 bis 22** | Führungsstelle | nichts; laufen als Startwerte |
| **Die Startwerte S1 bis S12** (Schwellen, Undo-Tiefe 20, `KAPPUNG_MAX` 50) | Führungsstelle | nichts |

## Zwei Sätze, die in die Umsetzung gehören und keine Regel sind

Beide binden den **schreibenden Client**, nicht den Fold, und stehen in §8.2
als Nicht-Zusicherung:

* Die Übernahme des Feldes `staerke` aus einem Bogen wird nur angeboten, wenn
  die Einheit weder Zuwachs noch Abgang hat. Sonst stünde der Zuwachs zweimal
  in der Lage, und kein Hinweis griffe.
* Wer sich beim Abteilen verzählt hat, korrigiert **beide** Seiten. Ein
  `StaerkeGeaendert` an der abgeteilten Einheit hebt sonst die Gesamtstärke,
  ohne daß etwas auffällt.

Der Fold kann beides nicht sehen: Ihm liegt ein gewöhnliches
`StaerkeGeaendert` vor, und ob die Zahl darin eine eigene oder eine
Gesamtstärke ist, steht nirgends.
