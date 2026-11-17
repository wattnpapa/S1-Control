/**
 * Die Schritte „Dann": was die Stellen nach einem Schritt sehen.
 *
 * Gemessen wird an dem, was das Fenster bekommt — den Sichten des Blattes
 * „Nachrichten", dem Lagebild, dem Einsatztagebuch, den Hinweisen eines
 * Bedienschritts —, nicht am Zustand des Folds. Wo eine Erwartung nicht
 * zutrifft, nennt die Meldung, was stattdessen zu sehen war: Wer das Feature
 * liest, soll ohne Debugger wissen, welcher Teil des Laufwegs fehlt.
 */

import type { Nachrichtenzeile } from "@s1/domaene";
import { expect } from "vitest";

import { schritt, type Definiere, type Tabelle } from "./ausdruecke.js";
import { aktuelleNachricht, LAUFZUSTAND_WORT, lagebild, leser, letztesErgebnis, sicht, stuhlVon, tagebuchDer, zeileDer, type Rolle } from "./welt.js";

function kurz(zeile: Nachrichtenzeile): string {
  const marken = zeile.verteiler.map((m) => `${m.stelle} ${m.kopie}`).join(", ");
  return `${zeile.id} „${zeile.betreff}“ ${zeile.laufzustand}${marken === "" ? "" : ` [${marken}]`}`;
}

function liste(zeilen: readonly Nachrichtenzeile[]): string {
  return zeilen.length === 0 ? "(leer)" : zeilen.map(kurz).join("; ");
}

/** Die Zeile der aktuellen Nachricht in einer Sicht; sonst ein Fehler mit dem, was dort steht. */
function inSicht(zeilen: readonly Nachrichtenzeile[], wo: string): Nachrichtenzeile {
  const { id, betreff } = aktuelleNachricht();
  const zeile = zeilen.find((z) => z.id === id);
  if (zeile === undefined) throw new Error(`„${betreff}“ steht nicht ${wo}. Dort steht: ${liste(zeilen)}`);
  return zeile;
}

function posteingang(rolle: Rolle): readonly Nachrichtenzeile[] {
  return sicht(leser(), "posteingang", [rolle.stelle]);
}

function marke(rolle: Rolle) {
  const zeile = inSicht(posteingang(rolle), `im Posteingang von ${rolle.wort}`);
  const eigene = zeile.verteiler.find((m) => m.stelle === rolle.stelle);
  if (eigene === undefined) throw new Error(`${rolle.wort} steht nicht im Verteiler: ${kurz(zeile)}`);
  return eigene;
}

function laufweg(d: Definiere): void {
  schritt(d, "steht die Nachricht im Ausgang von {stelle} als {string}", (rolle: Rolle, wort: string) => {
    const zeile = inSicht(sicht(leser(), "ausgang", [rolle.stelle]), `im Ausgang von ${rolle.wort}`);
    expect(zeile.laufzustand, `Laufzustand im Ausgang von ${rolle.wort}`).toBe(LAUFZUSTAND_WORT[wort] ?? wort);
  });
  schritt(d, "hat die Nachricht den Laufzustand {string}", (wort: string) => {
    const zeile = zeileDer(aktuelleNachricht().id);
    expect(zeile.laufzustand, `Laufzustand von ${kurz(zeile)}`).toBe(LAUFZUSTAND_WORT[wort] ?? wort);
  });
  schritt(d, "trägt die Nachricht den Annahmevermerk mit Uhrzeit und Handzeichen {string}", (hz: string) => {
    const { annahme } = zeileDer(aktuelleNachricht().id);
    expect(annahme, "Annahmevermerk (Feld 3)").toMatchObject({ handzeichen: hz, zeitpunkt: expect.any(String) });
  });
  schritt(d, "trägt die Nachricht die Wegfestlegung {string} mit Handzeichen {string}", (mittel: string, hz: string) => {
    const platz = leser();
    const nachricht = platz.dienst.zustand.nachrichten?.[aktuelleNachricht().id] as unknown as Record<string, { wert?: unknown } | undefined> | undefined;
    // Die Wegfestlegung des LdF ist sein Übermittlungsvorschlag (Feld `vorschlag`).
    const weg = nachricht?.["vorschlag"]?.wert;
    if (weg === undefined) throw new Error("Die Nachricht trägt keinen Übermittlungsvorschlag des LdF (Feld „vorschlag“ fehlt im Zustand).");
    expect(weg, "Übermittlungsvorschlag des LdF").toMatchObject({ mittel: mittel.toUpperCase(), handzeichen: hz });
  });
  schritt(d, "steht die Nachricht im Ausgang von {stelle} als befördert mit Zeit und Handzeichen {string}", (rolle: Rolle, hz: string) => {
    const zeile = inSicht(sicht(leser(), "ausgang", [rolle.stelle]), `im Ausgang von ${rolle.wort}`);
    if (zeile.befoerderung === undefined) throw new Error(`Im Ausgang von ${rolle.wort} fehlt der Beförderungsvermerk: ${kurz(zeile)}`);
    expect(zeile.befoerderung, "Beförderungsvermerk (Feld 4)").toMatchObject({ handzeichen: hz, zeitpunkt: expect.any(String) });
  });
  schritt(d, "trägt die Nachricht keinen Beförderungsvermerk", () => {
    expect(zeileDer(aktuelleNachricht().id).befoerderung, "Beförderungsvermerk einer Gesprächsnotiz").toBeUndefined();
  });
  schritt(d, "steht die Nachricht in der Nachweisung als {string}", (erwartet: string) => {
    const zeile = inSicht(sicht(leser(), "nachweisung"), "in der Nachweisung");
    const ist = zeile.nummer === undefined ? `${zeile.richtungKurz} ohne Nummer` : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
    expect(ist, "Richtung und Nummer der Nachweisung").toBe(erwartet);
  });
  schritt(d, "trägt die Sichtung Uhrzeit und Handzeichen {string}", (hz: string) => {
    expect(zeileDer(aktuelleNachricht().id).sichtung, "Sichtungsvermerk (Feld 18)").toMatchObject({ handzeichen: hz, zeitpunkt: expect.any(String) });
  });
}

function warteschlange(d: Definiere): void {
  const fmz = (): readonly Nachrichtenzeile[] => sicht(stuhlVon({ stelle: "FMZ", nr: 1, wort: "Die FmZ" }).platz, "fmz");
  schritt(d, "zeigt die Warteschlange der FmZ {string} vor {string}", (vorn: string, hinten: string) => {
    const betreffe = fmz().map((z) => z.betreff);
    const a = betreffe.indexOf(vorn);
    const b = betreffe.indexOf(hinten);
    if (a < 0 || b < 0 || a > b) throw new Error(`Erwartet „${vorn}“ vor „${hinten}“; die Warteschlange zeigt: ${betreffe.join(" | ") || "(leer)"}`);
  });
  schritt(d, "steht die Nachricht nicht in der Warteschlange der FmZ", () => {
    const zeilen = fmz();
    if (zeilen.some((z) => z.id === aktuelleNachricht().id)) throw new Error(`Die Nachricht steht in der Warteschlange der FmZ: ${liste(zeilen)}`);
  });
  schritt(d, "steht die Nachricht in der Warteschlange der FmZ über der Schwelle", () => {
    const zeile = inSicht(fmz(), "in der Warteschlange der FmZ");
    expect(zeile.fmzUeberSchwelle, `Marke „über der Schwelle“ an ${kurz(zeile)}`).toBe(true);
  });
  schritt(d, "zählt das Band der FmZ {int} Nachricht über der Schwelle", (anzahl: number) => {
    const lage = lagebild(stuhlVon({ stelle: "FMZ", nr: 1, wort: "Die FmZ" }).platz);
    expect(lage.nachrichten?.ueberSchwelle, "Zahl „über der Schwelle“ im Band").toBe(anzahl);
  });
}

function posteingaenge(d: Definiere): void {
  schritt(d, "liegt die Nachricht im Posteingang von {stelle} als {kopie} Kopie", (rolle: Rolle, kopie: string) => {
    expect(marke(rolle).kopie, `Kopiefarbe für ${rolle.wort}`).toBe(kopie);
  });
  schritt(d, "ist die Nachricht im Posteingang von {stelle} neu", (rolle: Rolle) => {
    expect(marke(rolle), `Marke von ${rolle.wort}`).toMatchObject({ gelesen: false, erledigt: false });
  });
  schritt(d, "ist die Nachricht im Posteingang von {stelle} gelesen mit Handzeichen {string}", (rolle: Rolle, hz: string) => {
    expect(marke(rolle), `Marke von ${rolle.wort}`).toMatchObject({ gelesen: true, kenntnis: { handzeichen: hz } });
  });
  schritt(d, "liegt die Nachricht nicht im Posteingang von {stelle}", (rolle: Rolle) => {
    const zeilen = posteingang(rolle);
    if (zeilen.some((z) => z.id === aktuelleNachricht().id)) throw new Error(`Die Nachricht liegt im Posteingang von ${rolle.wort}: ${liste(zeilen)}`);
  });
  schritt(d, "ist die grüne Kopie an {stelle} zurück", (rolle: Rolle) => {
    const zeile = inSicht(sicht(leser(), "ausgang", [rolle.stelle]), `im Ausgang von ${rolle.wort}`);
    const gruen = zeile.verteiler.find((m) => m.stelle === rolle.stelle && m.kopie === "GRUEN");
    if (gruen === undefined) throw new Error(`Keine grüne Kopie für ${rolle.wort} im Verteiler: ${kurz(zeile)}`);
  });
}

function hinweise(d: Definiere): void {
  schritt(d, "erhält {stelle} den Hinweis {string}", (rolle: Rolle, text: string) => {
    const ergebnis = letztesErgebnis(rolle);
    const warnungen = ergebnis?.art === "geschrieben" ? (ergebnis.warnungen ?? []) : [];
    expect(warnungen, `Hinweise an ${rolle.wort} zum letzten Schritt`).toContain(text);
  });
  schritt(d, "sieht {stelle} einen Konflikthinweis zur Sichtung", (rolle: Rolle) => {
    const { id } = aktuelleNachricht();
    const ergebnis = letztesErgebnis(rolle);
    // Zwei Wege führen zum selben Hinweis: Hat der zweite Sichter die erste
    // Sichtung schon gesehen, weist der Worker ab (VORWERT); haben beide ohne
    // Abgleich geschrieben, meldet der Fold `vorherPasstNicht` (§2.2a).
    if (ergebnis?.art === "abgewiesen" && ergebnis.code === "VORWERT") return;
    const fold = stuhlVon(rolle).platz.dienst.zustand.hinweise.filter((h) => "feldpfad" in h && h.feldpfad === `nachricht/${id}/sichtung`);
    if (fold.length === 0) throw new Error(`${rolle.wort} sieht keinen Konflikthinweis; letztes Ergebnis: ${JSON.stringify(ergebnis)}`);
  });
}

/** Tagebuchwort → Ereignisart; „aufgegeben", „aufgenommen", „festgehalten" sind alle die Anlage. */
const VORGANG: Readonly<Record<string, string>> = {
  verfasst: "NachrichtVerfasst",
  aufgegeben: "NachrichtVerfasst",
  aufgenommen: "NachrichtVerfasst",
  festgehalten: "NachrichtVerfasst",
  angenommen: "NachrichtAngenommen",
  "Weg festgelegt": "NachrichtUebermittlungVorgeschlagen",
  befördert: "NachrichtBefoerdert",
  nachgewiesen: "NachrichtNachgewiesen",
  weitergegeben: "NachrichtWeitergegeben",
  gesichtet: "NachrichtGesichtet",
  Kenntnis: "NachrichtKenntnisGenommen",
  erledigt: "NachrichtErledigt",
};

function tagebuch(d: Definiere): void {
  schritt(d, "zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge", (tabelle: Tabelle) => {
    const zeilen = tagebuchDer(aktuelleNachricht().betreff);
    let ab = 0;
    for (const erwartet of tabelle) {
      const vorgang = erwartet["Vorgang"] ?? "";
      const typ = VORGANG[vorgang];
      if (typ === undefined) throw new Error(`Unbekannter Vorgang „${vorgang}“ (bekannt: ${Object.keys(VORGANG).join(", ")}).`);
      const enthaelt = erwartet["enthält"] ?? "";
      const treffer = zeilen.findIndex((z, i) => i >= ab && z.typ === typ && z.satz.includes(enthaelt));
      if (treffer < 0) {
        const ist = zeilen.map((z) => `  ${z.typ}: ${z.satz}`).join("\n") || "  (keine)";
        throw new Error(`Im Einsatztagebuch fehlt nach Zeile ${String(ab)} die Zeile „${vorgang}“${enthaelt === "" ? "" : ` mit „${enthaelt}“`}. Das Tagebuch zeigt:\n${ist}`);
      }
      ab = treffer + 1;
    }
  });
  // ETB P0-2: Eine Zeile nennt die Nummer ihrer Zeit; was vor der Nachweisung
  // geschah, heißt „Nachricht A (jetzt A 1)". Auch das nennt die Nachricht.
  schritt(d, "nennt jede Tagebuchzeile der Nachricht {string}", (kennung: string) => {
    const jetzt = `(jetzt ${kennung.replace(/^\S+\s/u, "")})`;
    const ohne = tagebuchDer(aktuelleNachricht().betreff).filter((z) => !z.satz.includes(kennung) && !z.satz.includes(jetzt));
    if (ohne.length > 0) throw new Error(`Diese Tagebuchzeilen nennen „${kennung}“ nicht:\n${ohne.map((z) => `  ${z.satz}`).join("\n")}`);
  });
}

/** Alle Schritte „Dann" der drei Features. */
export function pruefschritte(d: Definiere): void {
  laufweg(d);
  warteschlange(d);
  posteingaenge(d);
  hinweise(d);
  tagebuch(d);
}
