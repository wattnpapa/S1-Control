# Einstieg in M1 — was zuerst, was worauf wartet

Stand: 2026-09-09 · Meilenstein M1 aus [05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md) · Status: **begonnen, wartet auf die FüSt**

> **Bearbeitungsstand 2026-09-09.** Der erste Schritt ist erledigt: Die vier
> Fragen an die FüSt liegen ausgeschrieben als Nr. 19 bis 22 in
> [04-OFFENE-ENTSCHEIDUNGEN.md](../../v2/04-OFFENE-ENTSCHEIDUNGEN.md), je mit
> dem konkreten Widerspruch, mit dem, was am Ereigniskatalog daran hängt, und
> mit dem Vorschlag, der ohne Antwort gilt. Zwei Ergebnisse der Durchsicht
> gehören hierher, weil sie diesen Auftrag korrigieren:
>
> * **Nur zwei der vier Fragen binden M1.2 hart** — die Statusliste (19) und die
>   Anforderungs-ID (22, und zwar nicht wegen des Formats, sondern wegen der
>   Frage, ob die Kennung eine Identität ist). Von den vier Kürzeln (20) bindet
>   allein „HK" den Katalog, weil daraus ein append-only-Organisationsschlüssel
>   geworden ist; MT, LdF und die FüOrg-Zeichen sind Katalogdaten aus M1.4, und
>   „TLtg." kommt im Datenmodell überhaupt nicht vor. Beim Schichtmodell (21)
>   ist die Faltregel bereits in §2.3 entschieden (Warnung statt Ablehnung); die
>   FüSt-Antwort ändert nur die Vorbelegung.
> * **M1.2 hat begonnen** — Johannes hat die Vorschläge am 2026-09-09 als
>   Startwerte freigegeben; der Entwurf von
>   [KONZEPT-EREIGNISSE.md](../../v2/konzepte/KONZEPT-EREIGNISSE.md) liegt vor. Die vier Startwerte stehen dort in §10 als S2, S3,
>   S5 und S6 und sind austauschbar, ohne dass sich eine Regel ändert.
>
> **Stand der fünf Pakete am 2026-09-09:**
>
> | Paket | Stand |
> |---|---|
> | M1.1 | **Prämisse hat sich geändert** — der Kern ist bereits extrahiert, in vier Pakete statt in einen. Befund und Vorschlag in [M1.1-befund-kern-existiert-bereits.md](M1.1-befund-kern-existiert-bereits.md); die Neuzuschneidung braucht eine Entscheidung von Johannes |
> | M1.2 | dritte Fassung von [KONZEPT-EREIGNISSE.md](../../v2/konzepte/KONZEPT-EREIGNISSE.md) nach vier Gutachten; nicht freigegeben |
> | M1.3 | nicht begonnen — wartet auf die Freigabe von M1.2 |
> | M1.4 | **gebaut und grün**: Zeichen-Inferenz, STAN-Datensatz und Vorlagenkatalog liegen in `@s1/domaene`. Offen bleibt allein der Katalog `KATS_STAN_NDS`, dessen Arbeitsmappe nicht vorliegt |
> | M1.5 | nicht begonnen |


Aufträge werden hier abgelegt, damit nachvollziehbar bleibt, wogegen ein Paket
gebaut wurde. Der Text unterhalb der Trennlinie wird unverändert als Auftrag an
die Arbeitssitzung übergeben.

## Woher M1 startet

M0 ist inhaltlich durch. M0.1 bis M0.4 sind gebaut, alle achtzehn
Konzeptentscheidungen aus `04-OFFENE-ENTSCHEIDUNGEN.md` sind entschieden **und**
umgesetzt, und der Sweep aus Messprotokoll 7.8 zeigt 15 von 18 bestanden, null
rote Ausgänge und keinen einzigen verlorenen Ereignissatz.

Drei Dinge bleiben offen und gehören **nicht** nebenbei in M1 erledigt:

* **M0.5** — Messung am echten Synology-Share. Blockiert, kein NAS. Damit sind
  auch die beiden Zahlen des Abbruchkriteriums von M0 ungemessen („Append plus
  fsync über 300 ms", „Poll-Zyklus bei 5 Clients über 2 s"). M1 darf gebaut
  werden, aber der Prüfpunkt bleibt aus.
* **Die Wahrscheinlichkeiten in `ALLE_FEHLER`.** `profilKlon` steht auf 0,001 je
  Kommando; daran fallen drei von achtzehn Läufen. Eigener Schritt, eigene
  Entscheidung — jede Änderung bewertet jeden bisherigen Lauf neu.
* **Die fachlichen Klärungen mit der FüSt** (Ende von
  `04-OFFENE-ENTSCHEIDUNGEN.md`). Sie sind kein Entwicklungsthema, aber M1.2 und
  M1.3 laufen ohne sie ins Raten: die widersprüchliche Statusliste, die Kürzel
  HK, MT, LdF und TLtg., zwei oder drei Schichten, das Format der
  Anforderungs-ID. Sie gehören vor dem Ereigniskatalog beantwortet, nicht
  danach.

## Reihenfolge — und warum sie von der Tabelle abweicht

Der Plan nennt M1.1 zuerst. Empfohlen wird trotzdem **M1.2 vor M1.1**:

* M1.2 ist ein **Dokument**, das Johannes gegenliest — wie M0.1. Diese Durchsicht
  ist der lange Teil, und sie kann laufen, während M1.1 gebaut wird.
* M1.3, M1.4 und M1.5 hängen alle an M1.2: Ohne den Ereigniskatalog gibt es
  keinen Fold für alle Typen, keine Konfliktregel je Typ und keine Zielabbildung
  des Erfassungsbogens.
* M1.1 hängt an nichts aus M1 — es ist eine Extraktion aus dem
  Erfassungsbogen-Submodul und kann jederzeit dazwischen laufen.

Der Auftrag für M1.2 liegt bereits: [M1.2-ereigniskonzept.md](M1.2-ereigniskonzept.md).
Er ist unverändert gültig; dieser hier stellt ihn nur in die Reihe und nennt,
was M0 an ihn übergibt.

## Was M0 an M1.3 übergibt

**P4 und P6 sind nach M1.3 verschoben** (Fußnote zu M0.2 in
05-UMSETZUNGSPLAN.md, geändert am 2026-09-08 von Johannes). Beide stehen in
`packages/domaene/src/eigenschaften.test.ts` als **übersprungene** Tests mit
ihrer Begründung, damit die Lücke sichtbar bleibt statt zu fehlen. M1.3 macht
sie grün — das ist ein DoD-Punkt, kein Nice-to-have. Wer sie durch einen
gleichnamigen Ersatztest grün macht, erzeugt genau das Schein-Grün, das
Auflage 18 verbietet.

Die Speicherschicht ist fertig und stabil; §1.2 gilt weiter: Für sie ist ein
Ereignis „undurchsichtige Nutzlast mit einem festen Rahmen". M1.2 erweitert
`KONZEPT-SPEICHER.md` **nicht** — der Ereigniskatalog bekommt sein eigenes
Dokument. Die beiden Verwaltungsereignisse aus §2.4 (`SegmentAbgeschlossen`,
`SegmentErsetzt`) gehören der Speicherschicht und dürfen im Katalog nicht noch
einmal auftauchen; sie sind ausdrücklich keine Vorgänge der Lage.

---

Meilenstein M1 aus docs/v2/05-UMSETZUNGSPLAN.md beginnen.

Arbeitsverzeichnis: /Users/johannes/Developer/S1-Control-v2, Branch
v2-architektur. Nicht nach /Users/johannes/Developer/S1-Control wechseln, main
bleibt unberührt. Der Branch liegt auf GitHub (`origin/v2-architektur`) und darf
gepusht werden. Sprache in Doku, Kommentaren und Commit-Texten: Deutsch mit
Umlauten. Code-schreibende oder -lesende Subagenten laufen auf Opus.

## Was Du zuerst liest

1. `docs/v2-arbeitsstand/auftraege/M1-einstieg.md` — dieser Auftrag, oberhalb
   der Trennlinie: woher M1 startet, was offen bleibt, warum M1.2 vor M1.1
   kommt.
2. `docs/v2/05-UMSETZUNGSPLAN.md`, Abschnitt M1, die fünf Zeilen samt DoD.
3. `docs/v2-arbeitsstand/auftraege/M1.2-ereigniskonzept.md` — der bereits
   geschriebene Auftrag für das erste Paket.

## Der erste Schritt, bevor gebaut wird

Am Ende von `docs/v2/04-OFFENE-ENTSCHEIDUNGEN.md` stehen fünf fachliche Fragen
an die FüSt. Vier davon binden M1.2 unmittelbar: die widersprüchliche
Statusliste, die Kürzel HK/MT/LdF/TLtg., das Schichtmodell und das Format der
Anforderungs-ID. **Leg Johannes die vier Fragen vor, bevor der Katalog
geschrieben wird** — mit dem konkreten Widerspruch, nicht als Sammelbegriff, und
mit dem Vorschlag, den Du nehmen würdest, falls keine Antwort kommt. Rate nicht,
und bau auch keine Platzhalter, die später wie eine Festlegung aussehen.

## Dann M1.2

Nach dem Auftrag in `M1.2-ereigniskonzept.md`. Er ist unverändert gültig.

## Vorgehen

Wie in M0: Qualitätsgates je Commit (`tsc -b`, ESLint, Vitest), kleine
thematisch getrennte Commits, jeder neue Test mit einer Mutation des
Produktionscodes geprüft und die Mutation über eine **frisch** angelegte
Sicherungskopie zurückgenommen, Kommentare mit den Paragraphen des jeweiligen
Konzeptdokuments mitziehen.

Zwei Erfahrungen aus M0, die Zeit sparen:

* **Miss nach, statt am Code zu raten.** Mehr als einmal lag die Ursache nicht
  dort, wo das Protokoll sie vermutete.
* **Prüf die Mutationsprobe wirklich.** Tests, die die interessante Stelle gar
  nicht erreichen, überleben ihre Mutation und belegen nichts.

Am Ende: was gemacht wurde, die Commit-Hashes, die Gates im Wortlaut, der
CI-Stand je Betriebssystem — und ausdrücklich alles, was NICHT erfüllt ist.
