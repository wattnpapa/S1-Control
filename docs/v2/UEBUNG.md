# Drehbuch für die Abnahmeübung

Diese Übung ist Zeile F1 der [Abnahmeliste](ABNAHME.md). Sie braucht drei bis
vier Rechner, ein NAS und zwei Stunden. Was ohne diese Dinge nachweisbar war,
ist nachgewiesen: `apps/desktop/src/worker/szenarien-uebung.test.ts` fährt
dasselbe Drehbuch auf zwei Arbeitsplätzen über echte Dateien und prüft am
Ende, was auch hier am Ende geprüft wird — derselbe Zustand auf beiden Seiten.

Was der Lauf nicht prüfen kann, sind die Menschen: ob die Bedienung im Stehen
funktioniert, ob jemand die Statuszeile liest, ob die Ausdrucke das zeigen,
was die Lagebesprechung braucht. Dafür ist die Übung da.

## Vorbereitung

* Share nach [BETRIEB.md](BETRIEB.md) eingerichtet, drei Arbeitsplätze
  eingetragen, jeder mit eigenem Anzeigenamen.
* Auf jedem Rechner die Anwendung installiert (Zeile A1) und einmal gestartet.
* Ein Handscanner an einem der Rechner, wenn D1 mitgeprüft werden soll.
* Ein Drucker, an dem C2 geprüft werden kann.
* Diese Seite ausgedruckt, dazu die [Kurzanleitung](KURZANLEITUNG.md) für
  jeden Platz.

Rollen: **Platz 1** führt (Zugtrupp), **Platz 2** erfasst Einheiten,
**Platz 3** führt die Anforderungen. Wer welchen Platz hat, bleibt zwei
Stunden gleich — der Wechsel gehört in eine zweite Übung.

## Ablauf

**Minute 0 — Einsatz anlegen.** Platz 1 legt den Einsatz an: Name „Übung
Deichverteidigung“, Art Übung, heutiges Datum. Plätze 2 und 3 öffnen ihn aus
der Liste. *Prüfen: B2, B3.*

**Minute 5 — Führungsorganisation.** Platz 1 legt zwei Einsatzabschnitte an
(Deich Nord, Deich Süd) und unter dem ersten einen Unterabschnitt
(Sandsackfüllstelle).

**Minute 10 — Einheiten.** Platz 2 erfasst sechs Einheiten, drei je Abschnitt.
Platz 1 sagt bei jeder, wann sie auf seinem Bildschirm erscheint. *Prüfen: B4.*

**Minute 25 — Handscanner.** Platz 2 liest zwei Erfassungsbögen ein, davon
einen zweimal. Beim zweiten Mal darf keine zweite Einheit entstehen.
*Prüfen: D1, D2, D3.*

**Minute 35 — Status führen.** Alle drei Plätze setzen Status. Mindestens
einmal absichtlich derselbe an derselben Einheit von zwei Plätzen. Der
Konflikthinweis muss danach in der Diagnose stehen. *Prüfen: E4.*

**Minute 45 — Führungsstelle.** Platz 1 legt vier Dienstposten an, besetzt sie
und trägt zwei Tage Schichtplan ein.

**Minute 55 — Anforderungen.** Platz 3 legt drei Anforderungen an, sagt eine
zu, erledigt eine, storniert eine. Danach versucht er, die erledigte zu
ändern — sie nimmt nichts mehr an (§5.6.2), und das ist erwünscht.

**Minute 65 — Der Share geht weg.** Netzwerkkabel am NAS ziehen. Alle drei
arbeiten zehn Minuten weiter. Die Statuszeile muss „Share nicht erreichbar“
zeigen, die unübertragenen Bytes müssen wachsen. *Prüfen: F2, Störfall
„Share ist nicht erreichbar“.*

**Minute 75 — Der Share kommt wieder.** Kabel zurück. Nach spätestens einer
Minute müssen alle drei denselben Stand zeigen, ohne dass jemand etwas tut.

**Minute 85 — Ausgaben.** Platz 1 erzeugt alle Ausdrucke: Druck, Status,
Auswertung, Logistik, Kosten, Führungsorganisation. Einen davon auf Papier.
*Prüfen: C2.*

**Minute 95 — Monitor.** Platz 1 schaltet den Monitor auf die zweite Anzeige.
*Prüfen: C3.*

**Minute 105 — Rücknahme.** Ein Platz nimmt seine letzte Handlung zurück. Der
Eintrag muss im Tagebuch stehen bleiben (§5.9.1) und auf allen drei Plätzen
gleich aussehen.

**Minute 110 — Abschluss.** Auf jedem Platz `s1 akte pruefe` über den lokalen
Spiegel; danach auf einem `--vergleiche` gegen den Share. Die `zustandsHash`
müssen übereinstimmen. Einsatzakte exportieren, auf einen Stick, auf einem
anderen Rechner importieren und erneut vergleichen. *Prüfen: B5, C4, F3.*

## Danach

**Aufschreiben, was gefehlt hat, und es nicht sofort beantworten** (F4). Der
Wert einer Übung liegt in der Liste, die danach entsteht; wer sie im Gespräch
gleich wegdiskutiert, hat die zwei Stunden für einen Funktionstest verwendet.

Drei Fragen an jeden Bedienenden, schriftlich:

1. Wo mussten Sie suchen?
2. Was haben Sie zweimal eingegeben?
3. Was hat die Excel gekonnt, was hier fehlt?

Die Antworten gehören in `docs/v2-arbeitsstand/` und nicht in eine E-Mail.
