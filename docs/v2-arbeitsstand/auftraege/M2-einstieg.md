# Einstieg in M2 — Schale, Worker, Store

Stand: 2026-09-10 · Meilenstein M2 aus [05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md) · Status: **abgeschlossen bis auf M2.4**

> **Bearbeitungsstand 2026-09-10.** M2.1, M2.2, M2.3 und M2.5 sind gebaut und
> grün; M2.4 bleibt blockiert. Was gebaut wurde, welche Entscheidungen dabei
> gefallen sind und was für Johannes offen bleibt, steht im
> [Abschlussbericht](../berichte/M2-abschlussbericht.md).

M2 ist der zweite Prüfpunkt mit Abbruchrecht. Was er beweisen soll, steht in
einem Satz: **zwei Rechner führen auf dem echten Share denselben Einsatz.**
Alles andere in diesem Meilenstein ist Zurüstung dafür.

## Was M1 übergibt

| Aus M1 | Was M2 damit tut |
|---|---|
| `@s1/domaene`: Ereigniskatalog, Fold als Mengenfunktion, `falteHinzu`/`materialisiere`, Kennzahlen K1–K30 | der Worker faltet fortschreibend und projiziert daraus die Anzeige |
| `@s1/speicher`: `oeffneAkte`, Takt A/B, Spiegelung, Präsenz, Quarantäne | der Worker ist die Stelle, die diese Takte tatsächlich schlägt |
| `KONZEPT-EREIGNISSE.md` §6 U1–U6 | der Undo-Stapel je Client — bislang nur beschrieben, nicht gebaut |
| `KONZEPT-SPEICHER.md` §5.4.4 | „Der Worker je Akte ist M2.1"; `akte.ts` hält ausdrücklich keinen Takt |

Zwei Dinge aus M0 und M1 sind bewusst **nicht** in M2 nachzuholen: die Messung
am echten Synology-Share (M0.5) und die Freigabe von `KONZEPT-EREIGNISSE.md`.
Beide hängen an Johannes, nicht am Code.

## Reihenfolge — und warum sie von der Tabelle abweicht

Der Plan nennt M2.1 bis M2.5 in dieser Folge. Gebaut wird in einer anderen,
weil zwei Stücke unter M2.1 und M2.3 liegen, die dort nicht genannt sind und
ohne die die anderen Pakete nicht prüfbar wären:

1. **Der Undo-Stapel** gehört nach Ring 2, nicht in die Schale. U3 sagt „der
   Stapel liegt nirgends, er wird abgeleitet"; wer ihn im Worker baut, baut ihn
   dorthin, wo er am schlechtesten zu prüfen ist. Er kommt deshalb zuerst und
   als reines Modul.
2. **Der Aktendienst** — die Fachschleife des Workers — wird von den
   `worker_threads` getrennt. Der Worker-Einstieg ist dann eine
   Botschaftsschleife von dreißig Zeilen, und der Mehrclient-E2E aus M2.3 kann
   zwei Aktendienste in einem Prozess gegeneinander laufen lassen, ohne
   Electron zu starten.
3. **`s1 akte pruefe`** ist die Abnahmebedingung von M2.4 und existiert nicht.
   Ohne das Kommando ist der Prüfpunkt nicht durchführbar, auch nicht mit
   Hardware. Es wird deshalb in M2 gebaut, obwohl der Plan es unter M4.4 führt.

Danach erst Main, Renderer und CI.

## Was M2 nicht liefern kann

**M2.4 bleibt offen.** Er verlangt zwei physische Rechner und den echten Share
über eine Stunde mit Störungen. Dieselbe Lage wie bei M0.5: kein NAS, kein
zweiter Rechner. Was hier gebaut wird, ist die Strecke bis unmittelbar davor —
zwei Instanzen auf einem gemeinsamen Verzeichnis, die sich sehen und
konvergieren, und das Kommando, mit dem der Befund am Ende gemessen wird.

Der Prüfpunkt selbst wird damit **nicht** erreicht. Das ist zu benennen und
nicht zu überspielen: M2 gilt erst als abgenommen, wenn M2.4 gelaufen ist.

## Definition of Done je Paket

Unverändert aus 05-UMSETZUNGSPLAN.md, mit dem Zusatz, der sich aus der
Reihenfolge oben ergibt:

| WP | DoD |
|---|---|
| M2.1 | kein synchroner Datei- oder Netzaufruf im Main (Lint); Aktendienst ohne Electron prüfbar |
| M2.2 | Komponententests für Store und Statuszeile |
| M2.3 | zwei Instanzen auf einem Temp-Verzeichnis sehen sich; erster Mehrclient-E2E grün; Undo-Stapel gegen U1–U6 geprüft |
| M2.4 | **blockiert** — braucht zwei Rechner und den echten Share |
| M2.5 | grün auf drei Plattformen |
