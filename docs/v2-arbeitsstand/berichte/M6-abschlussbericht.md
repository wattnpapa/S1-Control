# M6 — EEB und Meldekopf: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M6 aus
[03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md)

**M6 ist gebaut, bis auf die Kamera — und die ist gemessen.** Aus dem Scan von
M3.4 ist ein Meldeweg geworden: Revisionen, Eingangskorb mit Quittierung, Diff
zweier Fassungen, Bündeldatei, Meldekopf-Modus. Das sechste Stück, QR per
Kamera, endet mit einer Zahl statt mit Code — und die Zahl sagt, dass es so
nicht geht.

Zwei Befunde aus der Arbeit sind mehr als Randnotizen: Die Meldungen hatten
bis M6 gar keine Revisionsreihen, und die Schreibseite prüfte die
`grund`-Pflicht aus §2.4 nicht.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M6.0 | `@bos/meldekopf` verdrahtet, Fingerabdruck als Revisionsreihe | fertig |
| M6.1 | Eingangskorb mit Quittierung, Ablehnung, Meldestatus | fertig |
| M6.2 | Revisionen einer Reihe und der Diff zweier Fassungen | fertig |
| M6.3 | Bündeldatei lesen und schreiben | fertig |
| M6.4 | Meldekopf-Modus als Betriebsart | fertig |
| M6.5 | QR per Kamera | **gemessen, nicht gebaut — Entscheidung offen** |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1428
Tests in 107 Dateien grün** (von 1388 zum Ende von M5), `build:renderer` und
`build:schale` sauber.

## Die Commits

| Commit | Inhalt |
|---|---|
| `d626a2a` | Auftragsdokument: Reihenfolge, Bestand, der Befund zu `bogenInhaltsId` |
| `cd364ef` | M6.0: Fingerabdruck, Revisionsreihe, Revisionsübernahme |
| `1f566a3` | M6.1/M6.2: Eingangskorb mit Quittierung, Fassungen |
| `5c7770e` | M6.2: der Diff zweier Fassungen |
| `49854aa` | M6.3: die Bündeldatei |
| `517d0cf` | M6.4: der Meldekopf-Modus |
| `d7336a5` | M6.5: die Kameramessung |

## Was festgelegt wurde, und warum gerade so

### Der geteilte Kern wird benutzt — aber nicht überall

`@bos/meldekopf` lag seit M1.1 als Submodul da, war in `vitest.config.ts`
verdrahtet und wurde von keiner Quelldatei benutzt. M6 ist der Meilenstein,
für den er extrahiert wurde, und benutzt jetzt zwei Dinge daraus: den
**Fingerabdruck** einer Einheit (`einheitSchluessel`) und den **Diff** zweier
Bogenfassungen (`bogenDiff`).

Eine dritte Funktion wird ausdrücklich **nicht** benutzt, und das ist die
Umkehrung von Befund B4 aus M3. Dort stand, `bogenInhaltsId` gebe es im
geteilten Kern nicht. Es gibt sie:

```ts
export function bogenInhaltsId(bogen: Erfassungsbogen): string {
  return fnv1a(JSON.stringify(bogen));   // FNV-1a, 32 Bit
}
```

Zwei Gründe, beide aus §5.8.1. `JSON.stringify` ordnet nach
Einfügereihenfolge, nicht kanonisch — zwei Clients, deren Codec die Felder
anders aufbaut, berechnen für denselben Bogen zwei Ids. Und 32 Bit kollidieren
bei rund 77.000 Einträgen mit 50 %; eine Kollision heißt hier nicht „zwei
gleiche Zeilen", sondern zwei verschiedene Meldungen unter derselben, **nicht
rücknehmbaren** Identität. Auf genau dieser Id beruht aber die Zusicherung des
Paragraphen: „zwei Meldeköpfe, die denselben QR scannen, erzeugen **eine**
Meldung."

Für den Zweck, für den die Funktion geschrieben wurde — Dublettenerkennung in
der Sammlung eines Telefons —, ist beides in Ordnung. Für die Identität einer
Meldung in einer Einsatzakte ist es das nicht. Der Weg aus M3.4 bleibt: der
Inhalts-Hash über die kanonische Serialisierung (§7.6).

Der Fingerabdruck dagegen ist genau richtig, und zwar **weil** er eine
Heuristik ist. Der Kern sagt es selbst: „von der App VORGESCHLAGEN, vom
Menschen bestätigt/überschrieben (kein hartes Auto-Merge)." Bei einem
Fingerabdruck aus Organisation, Einheitstyp und Herkunft wäre ein hartes
Zusammenführen eine Wette.

### Es gab keine Revisionsreihen

Der wichtigste Befund von M6 stand im Code und nicht in einem Dokument. Der
Scanner setzte:

```ts
einheitSchluessel: auftrag.einheitSchluessel ?? auftrag.meldungId
```

Ohne übergebenen Schlüssel war die Reihe also die Meldung selbst. Damit war
**jede Meldung ihre eigene Revisionsreihe**, und drei Regeln liefen ins Leere:
`uebernahmeZustand = GEAENDERT` konnte nie entstehen, K26 lieferte je Meldung
einen Revisionskopf statt je Einheit, und der Diff hätte nichts zu vergleichen
gehabt. Der Fold war richtig, die Kennzahlen waren richtig; es fehlte der
Schlüssel.

Dieselbe Verwechslung steckte in der Kennung der Einheit: `E-<meldungId>`.
Jede Tagesmeldung derselben Gruppe hätte eine zweite Einheit angelegt, und die
Führungsstelle sähe dieselbe Gruppe nach drei Tagen dreimal im Lagebild. Sie
folgt jetzt dem Fingerabdruck.

### Die Revision schreibt Feldereignisse, keine zweite Anlage

Daraus folgt die zweite Hälfte, und sie ist die interessantere.
`EinheitGemeldet` ist Form (b), also eine **Anlage**. Eine zweite Anlage
derselben Id gewinnt nach §3.11 nicht — sie landet in `verworfeneAnlagen` mit
einem Hinweis. Die Meldung von morgen hätte die Einheit also nicht
überschrieben; sie wäre stillschweigend auf den Boden gefallen.

§5.8.2 sagt ohnehin, was stattdessen geschieht: „Die übernommenen Werte werden
als eigenständige Feldereignisse geschrieben … dieser gesehene Vorher-Wert
steckt in den Feldereignissen und nirgends sonst." Genau das tut die Übernahme
einer Revision jetzt — je abweichendem Feld ein Ereignis mit dem gesehenen
Vorher-Wert und `grund = "EEB <meldungId>"`.

**Unveränderte Felder erzeugen nichts.** Ein Ereignis ohne Änderung wäre eine
Zeile im Tagebuch, die nichts sagt, und bei jeder Tagesmeldung wären es zwölf
davon. Schwerer wiegt §2.2a: Ein `vorher`, das gleich `neu` ist, kann nie
einen Konflikt anzeigen — der Hinweis, dass jemand anders dasselbe Feld
inzwischen geändert hat, ginge für alle unveränderten Felder verloren.

Nicht übernommen werden `abschnittId`, `status`, `reihenfolge` und
`istFuehrungDesAbschnitts`: Sie gehören der Führungsstelle. Eine Tagesmeldung
darf eine im Einsatz stehende Einheit nicht in den Anmarsch zurücksetzen.

### Die Ampel der Excel ist ein Zustand

Die Excel führt den Meldeweg seit Jahren von Hand: Der Meldekopf trägt die
Bögen in eine Google-Tabelle und markiert sie **gelb**, die Führungsstelle
kopiert die Zeile und markiert **grün**, eine Änderung setzt wieder gelb
(Hinweise C159–C172, EXH F-E1).

Hier ist die Ampel kein Anstrich, sondern der abgeleitete `uebernahmeZustand`
aus §5.8.1 — sie kann nicht vergessen werden, wie es in einer Tabelle
geschieht, und sie kann auch nicht falsch gesetzt werden.

**Nichts verschwindet.** Der Empfang ist eine Tatsache; Löschen ist verboten.
Wer eine Meldung nicht will, lehnt sie ab, mit Grund nach §2.4 — und sie
bleibt im Korb. Dieselbe Regel führt die Excel als „Google-Zeilen werden bis
Einsatzende nicht gelöscht (Nachvollziehbarkeit, Schutz vor Datenverlust)".
Die Rücknahme der Übernahme stellt die Meldung zurück in den Korb und lässt
die Einheit stehen: Die Feldereignisse sind eigenständig, und was einmal in
der Lage stand, verschwindet nicht dadurch, dass man den Vermerk zurücknimmt.

### Der Diff zeigt Bewegung, die Historie zeigt Stände

Der Satz stammt aus dem Modulkopf von `@bos/meldekopf` und ist der Grund für
M6.2: Vor einer Übernahme will die Führungsstelle nicht die ganze
Tagesmeldung lesen, sondern wissen, was anders ist. Stärke 12 → 9, Fahrzeug
abgemeldet, Ruhezeit jetzt erforderlich.

Der Kern liefert **fertige Anzeigetexte** statt Rohwerte, und das ist Absicht:
So zeigen der Erfassungsbogen auf dem Telefon und die Führungsstelle denselben
Wortlaut. Die Zuordnung ist dabei wieder eine Heuristik — Personen über den
Namen, Fahrzeuge über das Kennzeichen —, und ein nachgetragenes Kennzeichen
erscheint als Abgang plus Zugang statt als Änderung. Der Kern sagt selbst, dass
das bewusst so ist, weil es nicht entscheidbar ist.

Die Fassungen einer Reihe stehen nach `stand` und nicht nach Empfangszeit
(§2.6): Ein nachgescannter Papierbogen von gestern kommt später an und ist
trotzdem die ältere Fassung. Ein Test fährt genau diesen Fall.

### Die Bündeldatei ist das Format der App

Ein Meldekopf steht am Bereitstellungsraum, oft ohne Verbindung zur
Führungsstelle. Er sammelt Bögen in seiner App, und jemand trägt die Datei
hinüber. Dreißig Bögen einzeln zu scannen wäre eine halbe Stunde Arbeit für
etwas, das eine Datei kann.

Das Format ist die `Einsatzsammlung` des Erfassungsbogens — ein eigenes zu
erfinden hieße, denselben Bogen zweimal zu beschreiben. Übernommen wird der
`einheitSchluessel`, wenn er dasteht: Hat ein Mensch am Meldekopf die
Zuordnung korrigiert, ist seine Korrektur mehr wert als unsere Vermutung. Die
`id` wird neu gerechnet, aus dem Grund oben.

Doppelte fallen über die `meldungId` zusammen (§3.6): dasselbe Bündel zweimal,
ein Bogen aus dem Bündel und derselbe gescannt — immer **eine** Meldung. Der
Ausgang sagt, wie viele neu waren und wie viele schon bekannt; ohne diese Zahl
hielte ein Bediener den wirkungslosen zweiten Lauf für einen Fehlschlag.
Kaputte Einträge werden gezählt statt still übersprungen.

Den Griff ins Dateisystem tut der Renderer über sein Dateifeld; über die
Prozessgrenze geht Text und kein Pfad. Ein Worker, der Pfade öffnet, die ihm
jemand nennt, ist eine Tür, die niemand braucht.

### Der Meldekopf-Modus ist ein Zuschnitt, kein Recht

Die Betriebsart steht in den Einstellungen und schaltet die Oberfläche um:
Scanner, Eingangskorb, Bündeldatei, Abschnittsauswahl — kein Lagebild, keine
Ausgaben, keine Kosten.

**Es ist kein Rechtesystem, und der Hinweis in der Maske sagt das.** Dieselbe
Akte, derselbe Share, dieselben Ereignisse; wer an diesem Rechner sitzt,
könnte die Betriebsart umstellen und alles andere auch. Es gibt keinen
Serverprozess, der etwas verweigern könnte (02-ZIELBILD.md). Ein Rechtesystem
vorzutäuschen, das keines ist, wäre die schlechtere Lösung: Es hielte
niemanden auf und ließe alle glauben, es täte es.

Das Tagebuch ist dasselbe und kein eigenes. Die Excel gibt dem Meldekopf ein
zweites, weil sie keine gemeinsame Ablage hat; hier ist es eine Projektion
desselben Ereignisstroms (§5.9.1), und beide Stellen schreiben in denselben.

### Die Kamera: gemessen statt behauptet

Das Auftragsdokument verlangte für dieses Paket ausdrücklich: erst messen,
dann bauen. `S1_SMOKE=kamera` fragt die Schale, was sie tatsächlich mitbringt.
Unter Xvfb, Electron 43.6.0, Chromium 150:

```
S1_KAMERA: barcodeDetector=false
S1_KAMERA: formate=(keine)
S1_KAMERA: qrCode=false
S1_KAMERA: getUserMedia=true
```

Die Kamera ist da, der Decoder nicht. `BarcodeDetector` gehört zwar zu
Chromium, wird aber nur dort ausgeliefert, wo das Betriebssystem ihn stellt —
macOS über Vision, Android über die Play Services. Unter Linux fehlt er,
gemessen; unter Windows nach derselben Bauweise ebenso, und Windows ist nach
Entscheidung 24 das Produkt.

Gebaut ist deshalb nur die Messung. Sie ist wiederholbar und bleibt es: Wenn
Chromium den Decoder eines Tages überall mitbringt, sagt derselbe Lauf es.

## Befunde aus der Arbeit

| Nr. | Befund | Behandlung |
|---|---|---|
| M6-B1 | **Für Johannes.** Der Kameraweg braucht einen QR-Decoder, den die Zielplattform nicht stellt. Drei Wege: eine fünfte Laufzeitabhängigkeit, ein Kameraweg nur auf macOS, oder keiner | Gemessen und dokumentiert, nicht entschieden. Der Handscanner deckt dieselbe Aufgabe ab und steht seit M3.4 |
| M6-B2 | Befund B4 aus M3 kehrt sich um: `bogenInhaltsId` existiert in `@bos/meldekopf` und darf trotzdem nicht als `meldungId` dienen — FNV-1a über `JSON.stringify` | Der Weg aus M3.4 bleibt. Der Grund steht im Code, damit ihn niemand „aufräumt". Ob der Kern eine tragfähige Fassung bekommen soll, ist eine Frage an das andere Repo |
| M6-B3 | Die Schreibseite prüfte die `grund`-Pflicht aus §2.4 nicht. Der Aktendienst nahm eine Ablehnung ohne Grund an, schrieb sie in ein append-only-Protokoll, und der Fold warf sie als `unbekannt` weg | Behoben. Die Regel steht jetzt im Katalog und wird von Fold und Schreiber benutzt. Ein Bediener sah vorher „geschrieben" und keine Wirkung — die schlimmste Art, einen Fehler zu melden |
| M6-B4 | `zMeldeQuelle` ist eine geschlossene Liste ohne Wert für „kam als Bündeldatei" | Übersetzt wird die Quelle **aus der Datei** — sie weiß, wie der Bogen ursprünglich beim Meldekopf ankam, und das ist die nützlichere Angabe. Die Liste zu erweitern wäre eine Katalogänderung mit `foldVersion` (§3.9) |
| M6-B5 | Ein Ansichtsruf über `mitFehlerbild` drehte sich im Kreis: Die Funktion schreibt dreimal in den Store, und im Effekt zog das den Ruf erneut an | Behoben. Das Modul sagt an anderer Stelle selbst, warum Ansichtsrufe dort nicht hineingehören. Dazu hingen zwei Dialoge am ganzen Store statt an ihren Holefunktionen — sie hätten bei jedem Delta neu geholt |

Aus M3 bis M5 bleiben offen: **B1**, **B2** (zwei Typen im Zielmodell),
**M-B1** (fehlender `wirkungslosGegenTerminalzustand`), **M-B3**, **M-B4**
(drei Beschreibungen von `anforderung.zusage`, falscher Typ für `storno`),
**M-B2** (Funktion → Rolle als Stammdatum), **B5** (Playwright-Läufer), **B6**
(NATO-Zonenbuchstabe), **A1** (die Vorlage widerspricht sich bei „männlich").

**Fünf davon berühren den `zustandsHash`** — B1, B2, M-B1, M-B3, M-B4 — und
gehören in **einen** Schritt mit einer `foldVersion`, nicht einzeln verteilt.
Der Stapel ist seit M5 unverändert; er wächst nicht, aber er löst sich auch
nicht auf.

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **M6-B1 — der QR-Decoder** | Johannes | Gemessen: Die Zielplattform stellt ihn nicht. Eine fünfte Abhängigkeit ist eine Entscheidung über das Produkt und nicht über ein Paket |
| **A1 — „männlich" in der Vorlage** | Johannes | Unverändert; steht seit M5.1 in der Fußzeile des Logistikblatts |
| **M-B2 — Funktion → Rolle** | Johannes | Unverändert aus M5 |
| **Die Sammel-`foldVersion`** | eigener Schritt | B1, B2, M-B1, M-B3, M-B4 zusammen |
| **Prüfpunkt 3 — Parität** | Johannes | Unverändert: Die Referenzlage aus Entscheidung 8 liegt nicht vor |
| **M3.5, M2.4, M0.5** | Johannes | Unverändert — alle drei brauchen Hardware |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |

## Was M6 an das Nächste übergibt

* **Einen vollständigen Meldeweg.** Scan oder Bündel, Revisionen, Diff,
  Quittierung, zwei Betriebsarten — der Weg, den die Excel mit einer
  Google-Tabelle und Copy&Paste nachbildet, läuft hier über den
  Ereignisstrom.
* **Den geteilten Kern in Gebrauch.** `@bos/meldekopf` ist nicht mehr nur
  extrahiert, sondern benutzt. Was dort geändert wird, wirkt hier — und
  umgekehrt ist jetzt sichtbar, wo seine Annahmen für eine Einsatzakte zu eng
  sind.
* **Eine Messung statt einer Annahme.** `S1_SMOKE=kamera` ist der dritte
  Rauchproben-Zweig neben `1` und `ausgaben`. Solche Fragen — was kann die
  Schale auf dieser Plattform wirklich — kommen in M7 wieder, bei Installer
  und Update.
* **Den Stand für die Verteilung.** Fachlich fehlt nach M6 wenig: FüOrg (M8)
  und die Dokumentation. Was fehlt, ist ein Installer — M0.5, M2.4, M3.5,
  Prüfpunkt 3 und jetzt auch die Kamerafrage warten alle auf dieselbe Sache:
  eine Anwendung auf einem Rechner der Führungsstelle.
