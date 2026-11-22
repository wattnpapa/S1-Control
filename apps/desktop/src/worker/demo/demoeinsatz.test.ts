/**
 * Funktionalität: der Demo-Einsatz.
 *
 * Das Drehbuch läuft durch den echten Aktendienst über echte Dateien, wie im
 * Betrieb — nur die Uhr ist gestellt. Geprüft wird, dass es **vollständig**
 * ist, und das in zwei Richtungen:
 *
 * 1. Kein Schritt wird abgewiesen, und die Lage trägt danach keinen
 *    Konflikthinweis. Ein Drehbuch, das an einer Prüfung des Dienstes
 *    hängenbleibt, zeigte einen halben Einsatz.
 * 2. **Jede Ereignisart des Katalogs** kommt im Demo-Einsatz vor oder steht
 *    unten mit Begründung in `AUSNAHMEN`. Das ist die Regel aus `AGENTS.md`
 *    §13 als Test: Wer ein Feature mit einer neuen Ereignisart baut, bekommt
 *    hier rot, bis das Drehbuch es zeigt.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { KATALOG, kennzahlen } from "@s1/domaene";

import { DEMO_EINHEITEN } from "./demoeinheiten.js";
import { demoBeginnMs, demoDrehbuch, spieleDemoEin, type Demoergebnis } from "./demoeinsatz.js";
import { DEMO_NAME } from "./demostruktur.js";
import { DEMO_EINSATZ_ID, demoplatz, raeumeDemoAuf, type Demoplatz } from "../pruefhilfen/demowerkstatt.js";
import { DEMO_DAUER_MINUTEN } from "./drehbuch.js";

/**
 * Ereignisarten, die der Demo-Einsatz bewusst **nicht** enthält — jede mit
 * ihrem Grund. Die Liste soll kurz bleiben: „noch nicht dazu gekommen" ist
 * kein Grund, sondern der Fall, den dieser Test verhindern soll.
 */
const AUSNAHMEN: Readonly<Record<string, string>> = {
  EinsatzBeendet: "Der Demo-Einsatz bleibt offen und bearbeitbar; beenden kann ihn, wer ihn ausprobiert.",
  EinsatzWiedereroeffnet: "Folgt aus EinsatzBeendet.",
  EinsatzArchiviert: "Ein archivierter Einsatz ist nur noch lesbar.",
  ArchivierungZurueckgenommen: "Folgt aus EinsatzArchiviert.",
  AnhangHinzugefuegt: "Die Oberfläche hat noch keinen Weg, einen Anhang hinzuzufügen.",
  AnhangEntfernt: "Folgt aus AnhangHinzugefuegt.",
  AnhangWiederhergestellt: "Folgt aus AnhangHinzugefuegt.",
  KorrekturVon: "Die Oberfläche schreibt diese Art nicht; Berichtigungen laufen über die Rücknahme und über EtbEintragBerichtigt.",
  EebMeldungZugeordnet: "Korrekturweg des Eingangskorbs für eine falsch zugeordnete Meldung; der Demo-Bogen ist richtig zugeordnet.",
  EebMeldungAbgelehnt: "Korrekturweg des Eingangskorbs; der Demo-Bogen wird übernommen, nicht abgelehnt.",
  EebMeldungUebernahmeZurueckgenommen: "Nähme die einzige übernommene Meldung des Demo-Einsatzes wieder zurück.",
};

/** Der Augenblick, zu dem der Demo-Einsatz dieser Datei angelegt wird. */
const JETZT = Date.now();

/**
 * **Ein** Lauf für alle Szenarien: Das Drehbuch schreibt über sechshundert
 * Ereignisse über echte Dateien, und die Szenarien lesen nur.
 */
let platz: Demoplatz;
let ergebnis: Demoergebnis;

beforeAll(async () => {
  platz = await demoplatz(demoBeginnMs(JETZT));
  ergebnis = await spieleDemoEin(platz.dienst, platz.uhr, DEMO_EINSATZ_ID);
}, 60_000);

afterAll(raeumeDemoAuf);

/** Alle Zeilen des Tagebuchs — seitenweise, der Ruf gibt höchstens fünfhundert je Seite. */
function tagebuchzeilen(): readonly { readonly typ: string; readonly wanduhr: string }[] {
  const zeilen: { readonly typ: string; readonly wanduhr: string }[] = [];
  for (;;) {
    const seite = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-demo", von: zeilen.length, anzahl: 500 });
    zeilen.push(...seite.zeilen);
    if (seite.zeilen.length === 0 || zeilen.length >= seite.gesamtzahl) return zeilen;
  }
}

describe("Funktionalität: Demo-Einsatz", () => {
  it("Szenario: das Drehbuch läuft ohne abgewiesenen Schritt und ohne Konflikthinweis", () => {
    expect(ergebnis.fehler).toEqual([]);
    expect(ergebnis.schritte).toBeGreaterThan(400);
    expect(platz.dienst.zustand.hinweise).toEqual([]);
    expect(platz.dienst.zustand.unbekannt).toEqual([]);
  });

  it("Szenario: der Einsatz beginnt zwölf Stunden vor dem Anlegen, und kein Ereignis liegt in der Zukunft", () => {
    const jetzt = JETZT;
    const beginn = jetzt - 12 * 3_600_000;
    const einsatz = platz.dienst.zustand.einsatz;
    expect(einsatz?.name.wert).toBe(DEMO_NAME);
    expect(new Date(einsatz?.beginn.wert ?? "").getTime()).toBe(beginn);
    const drehbuch = demoDrehbuch(DEMO_EINSATZ_ID, beginn);
    expect(Math.max(...drehbuch.map((s) => s.minute))).toBeLessThan(DEMO_DAUER_MINUTEN);
    expect(Math.min(...drehbuch.map((s) => s.minute))).toBe(0);
    // Die Wanduhr jedes Ereignisses ist die seines Drehbuchschritts — nicht die des Einspielens.
    const zeiten = tagebuchzeilen().map((z) => new Date(z.wanduhr).getTime());
    expect(Math.min(...zeiten)).toBeGreaterThanOrEqual(beginn);
    expect(Math.max(...zeiten)).toBeLessThanOrEqual(jetzt);
    expect(Math.max(...zeiten)).toBeGreaterThan(jetzt - 30 * 60_000);
  });

  it("Szenario: jede Ereignisart des Katalogs kommt vor oder ist begründet ausgenommen (AGENTS.md §13)", () => {
    const geschrieben = new Set(tagebuchzeilen().map((z) => z.typ));
    const fehlend = [...KATALOG.keys()].filter((typ) => !geschrieben.has(typ) && AUSNAHMEN[typ] === undefined);
    expect(fehlend, "Diese Ereignisarten fehlen im Demo-Drehbuch (apps/desktop/src/worker/demo): ergänzen oder in AUSNAHMEN begründen").toEqual([]);
    // Eine Ausnahme, die inzwischen doch vorkommt oder die es nicht mehr gibt, ist veraltet.
    const veraltet = Object.keys(AUSNAHMEN).filter((typ) => geschrieben.has(typ) || !KATALOG.has(typ));
    expect(veraltet, "Diese Ausnahmen sind überholt und gehören gestrichen").toEqual([]);
  });

  it("Szenario: der Demo-Einsatz zeigt Einheiten, Abschnitte, Funk, Nachrichten und Versorgung", () => {
    const zustand = platz.dienst.zustand;
    expect(kennzahlen.einheitenDerLage(zustand).length).toBeGreaterThanOrEqual(DEMO_EINHEITEN.length);
    expect(Object.keys(zustand.abschnitte).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(zustand.fahrzeuge).length).toBeGreaterThanOrEqual(50);
    expect(Object.keys(zustand.personen).length).toBeGreaterThanOrEqual(150);
    expect(Object.keys(zustand.dienstposten).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(zustand.anforderungen).length).toBeGreaterThanOrEqual(5);
    // Jede Einheit mit Übungsbogen hat sich am Meldekopf angemeldet: eine Meldung im Eingangskorb je Bogen.
    const mitBogen = DEMO_EINHEITEN.filter((e) => e.bogen !== undefined);
    expect(mitBogen.length).toBeGreaterThanOrEqual(20);
    expect(Object.keys(zustand.meldungen)).toHaveLength(mitBogen.length);
    for (const einheit of mitBogen) expect(zustand.einheiten[einheit.id]?.bezeichnung.wert, einheit.bogen).toBeTruthy();
    // Eine bunte Mischung: THW und mindestens sechs weitere Organisationen.
    const organisationen = new Set(kennzahlen.einheitenDerLage(zustand).map((e) => e.organisation.wert));
    expect(organisationen.has("THW")).toBe(true);
    expect(organisationen.size).toBeGreaterThanOrEqual(7);
    expect(Object.keys(zustand.etbEintraege).length).toBeGreaterThanOrEqual(8);

    const funkplan = platz.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-demo" });
    expect(funkplan.plan.rufgruppen.length).toBeGreaterThanOrEqual(6);

    const nachrichten = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-demo", sicht: "nachweisung" });
    expect(nachrichten.zeilen.length).toBeGreaterThanOrEqual(20);
    expect(nachrichten.nummernluecken).toEqual([]);
    // Unterwegs: Nachrichten ohne Nummer liegen noch in der FmZ oder beim LdF.
    expect(nachrichten.zeilen.filter((z) => z.nummer === undefined && z.zurueckgezogen !== true).length).toBeGreaterThanOrEqual(3);

    const versorgung = platz.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-demo" });
    expect(JSON.stringify(versorgung.blatt)).toContain("Sporthalle BBS Wechloy");
  });

  it("Szenario: die Übersicht zeigt Kräfte nach Status und offene Aufträge (Stab-Review 2026-11-22)", () => {
    const { uebersicht } = platz.dienst.stabsuebersicht();
    expect(uebersicht.kraefte.length).toBeGreaterThanOrEqual(3);
    // Die Gesamtzeile ist die Ist-Stärke des Kopfbands.
    const ist = kennzahlen.zaehlstand(platz.dienst.zustand).ist;
    expect(uebersicht.gesamt.gesamt).toBe(ist.fuehrer + ist.unterfuehrer + ist.mannschaft);
    expect(uebersicht.auftraege.some((a) => a.offen)).toBe(true);
    expect(uebersicht.auftraege.some((a) => !a.offen)).toBe(true);
  });

  it("Szenario: der Demo-Einsatz füllt die Monitoransichten aller Stabsfunktionen", () => {
    const tafel = platz.dienst.staerketafel().tafel;
    const status = tafel.status?.gesamt;
    // S1 „Status“ und S3 „Einsatzmittel“: Kräfte im Einsatz, in Reserve und in Ruhe.
    expect(status?.IM_EINSATZ.einheiten ?? 0).toBeGreaterThan(0);
    expect(status?.EINSATZBEREIT.einheiten ?? 0).toBeGreaterThan(0);
    expect(status?.RUHE.einheiten ?? 0).toBeGreaterThan(0);
    // S1 „Kommen und Gehen“: offene oder zugesagte Anforderung und eine Verfügbarkeitsfrist.
    const arten = new Set((tafel.kommenGehen ?? []).map((b) => b.art));
    expect(arten.has("angefordert") || arten.has("zugesagt")).toBe(true);
    expect(arten.has("verfuegbarBis")).toBe(true);
    // S3 „Aufträge“: laufende Aufträge in mehr als einem Abschnitt.
    expect(new Set((tafel.auftraege ?? []).map((a) => a.abschnittId)).size).toBeGreaterThanOrEqual(2);
    // S4 „Sofortbedarf“: mindestens eine Einheit mit offenem Bedarf.
    const versorgung = platz.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-demo" });
    expect(versorgung.blatt.sofortbedarf.offen.zeilen).toBeGreaterThan(0);
    // FmZ „Funk still“: eine Einheit ohne Kontakt oder über der Schwelle still.
    const funk = platz.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-demo" }).plan;
    const teilnehmer = [...funk.rufgruppen.flatMap((r) => r.teilnehmer), ...funk.jeBereich.flatMap((b) => b.teilnehmer)];
    expect(teilnehmer.some((t) => !t.erwartet && (t.keinKontaktGemeldet !== undefined || t.letzterKontakt?.ueberSchwelle === true))).toBe(true);
    // FmZ „Warteschlange“: Nachrichten warten an einer Station.
    const wartend = (["ldf", "fmz", "sichter"] as const).flatMap(
      (sicht) => platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-demo", sicht }).zeilen,
    );
    expect(wartend.some((z) => (z.wartetSeit ?? z.wartetSeitSichter ?? z.wartetSeitLdf) !== undefined)).toBe(true);
  });

  it("Szenario: die Ausgaben entstehen aus der Demo-Lage", () => {
    for (const ausgabe of ["druck", "status", "log", "kosten", "fueorg", "nachweisung"] as const) {
      expect(platz.dienst.ausgabeHtml(ausgabe).html.length, ausgabe).toBeGreaterThan(500);
    }
  });
});
