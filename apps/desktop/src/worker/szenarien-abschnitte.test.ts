/**
 * Funktionalität: Abschnittsbaum — die BDD-Szenarien zu M3.1.
 *
 * **Portiert, nicht neu erfunden.** `legacy-v1/e2e/features/einsatz-lifecycle.feature`
 * führte zehn deutsche Szenarien gegen Playwright. Die Szenarien sind
 * fachliche Aussagen und bleiben gültig; der Läufer ist es nicht: Playwright
 * gegen Electron braucht ein Fenster und einen Bildschirm, und die CI-Matrix
 * aus M2.5 läuft auf drei Plattformen. Ein Szenario, das auf zweien
 * übersprungen wird, ist kein Nachweis — und die Gates verbieten
 * übersprungene Tests.
 *
 * **Was hier tatsächlich läuft**, ist die Strecke von einem Bedienschritt bis
 * in die Ansicht, die der Renderer zeigt: Aktendienst → Speicherschicht →
 * echtes Dateisystem → Fold → Projektion. Was sie **nicht** prüft, ist die
 * Verdrahtung der Knöpfe; dafür stehen die Komponententests daneben.
 *
 * Die Schrittwörter sind die der Feature-Datei: `angenommen`, `wenn`, `dann`.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion, type Baumknoten } from "@s1/domaene";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/**
 * Fachliche Zeiten **relativ zur Uhr des Läufers**.
 *
 * Der Aktendienst schreibt mit der Systemzeit, und §2.5 plausibilisiert jede
 * fachliche Zeit gegen die Wanduhr desselben Ereignisses — eine Ist-Zeit
 * gegen zwölf Stunden in beide Richtungen. Ein festes Datum ist damit eine
 * Zeitbombe: Es läuft, solange die Uhr des Läufers nahe genug daran steht,
 * und wird rot, sobald sie weiterrückt. Geprüft wird hier die Fachregel und
 * nicht der Kalender.
 */
function vorStunden(stunden: number): string {
  return new Date(Date.now() - stunden * 60 * 60 * 1000).toISOString();
}

/** Aufgelöst vor zwei Stunden. */
const AUFGELOEST_AM = vorStunden(2);

// ---------------------------------------------------------------------------
// Die Schritte
// ---------------------------------------------------------------------------

/** „Angenommen ein Einsatz mit der Führungsstelle und einem Einsatzort" */
async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

async function wennIchDenAbschnittAnlege(
  platz: Platz,
  abschnittId: string,
  name: string,
  optionen: { readonly parentId?: string; readonly typ?: string; readonly reihenfolge?: number } = {},
): Promise<void> {
  const ergebnis = await platz.dienst.bediene({
    typ: "AbschnittAngelegt",
    nutzlast: {
      abschnittId,
      name,
      typ: optionen.typ ?? "EINSATZORT",
      reihenfolge: optionen.reihenfolge ?? 1,
      ...(optionen.parentId === undefined ? {} : { parentId: optionen.parentId }),
    },
  });
  expect(ergebnis.art).toBe("geschrieben");
}

/** Ein setzendes Ereignis, wie die Maske es baut: mit gesehenem `vorher` (§2.2a). */
async function wennIchSetze(
  platz: Platz,
  typ: string,
  nutzlast: Record<string, unknown>,
  vorher: unknown,
  neu: unknown,
  grund?: string,
): Promise<void> {
  const ergebnis = await platz.dienst.bediene({
    typ,
    nutzlast,
    vorher,
    neu,
    ...(grund === undefined ? {} : { grund }),
  });
  expect(ergebnis.art).toBe("geschrieben");
}

/** „Dann sehe ich …" — der Baum, wie ihn der Renderer bekäme. */
function dannSeheIchDenBaum(platz: Platz): readonly Baumknoten[] {
  return projektion.baumZeilen(platz.dienst.baum({ art: "baumAnfordern", akteId: "akte-1" }).baum);
}

function knoten(platz: Platz, id: string): Baumknoten | undefined {
  return dannSeheIchDenBaum(platz).find((zeile) => zeile.id === id);
}

// ---------------------------------------------------------------------------
// Die Szenarien
// ---------------------------------------------------------------------------

describe("Funktionalität: Abschnittsbaum", () => {
  it("Szenario: Abschnitt anlegen und in der Liste sehen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "EA-NORD", "EA Nord");
    await wennIchDenAbschnittAnlege(platz, "EA-SUED", "EA Süd", { reihenfolge: 2 });

    const namen = dannSeheIchDenBaum(platz).map((zeile) => zeile.name);
    expect(namen).toContain("EA Nord");
    expect(namen).toContain("EA Süd");
  });

  it("Szenario: Abschnitt unter einen anderen hängen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "EA-NORD", "EA Nord");
    await wennIchDenAbschnittAnlege(platz, "UA-DEICH", "UA Deichfuß", { parentId: "EA-NORD" });

    expect(knoten(platz, "UA-DEICH")?.tiefe).toBe(1);
    expect(knoten(platz, "EA-NORD")?.kinder.map((kind) => kind.id)).toEqual(["UA-DEICH"]);
  });

  it("Szenario: Abschnitt umbenennen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "EA-NORD", "EA Nord");
    await wennIchSetze(platz, "AbschnittUmbenannt", { abschnittId: "EA-NORD" }, "EA Nord", "EA Nordwest");

    expect(knoten(platz, "EA-NORD")?.name).toBe("EA Nordwest");
  });

  it("Szenario: Typ ändern verlangt einen Grund und verschiebt die Gesamtstärke", async () => {
    const platz = await angenommenEinEinsatz();
    // §2.4: `AbschnittTypGeaendert` ist eine der Arten mit Pflicht-`grund`.
    // Der Grund ist kein Formalismus: Am Typ hängt `zaehltInGesamtstaerke`.
    const vorher = platz.dienst.zustand;
    expect(vorher.abschnitte["EO"]?.zaehltInGesamtstaerke).toBe(true);

    await wennIchSetze(
      platz,
      "AbschnittTypGeaendert",
      { abschnittId: "EO" },
      "EINSATZORT",
      "ANGEFORDERT",
      "Einheit ist noch nicht eingetroffen",
    );

    expect(knoten(platz, "EO")?.typ).toBe("ANGEFORDERT");
    expect(knoten(platz, "EO")?.zaehlt).toBe(false);
  });

  it("Szenario: Umhängen, das einen Zyklus schlösse, wird nicht wirksam", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "X", "Abschnitt X");
    await wennIchDenAbschnittAnlege(platz, "Y", "Abschnitt Y");
    // X unter Y, dann Y unter X. §5.3.1: Die Kante mit der **größeren** HLC
    // weicht — hier die zweite —, und der Abschnitt hängt an der Wurzel.
    await wennIchSetze(platz, "AbschnittUmgehaengt", { abschnittId: "X" }, null, "Y");
    await wennIchSetze(platz, "AbschnittUmgehaengt", { abschnittId: "Y" }, null, "X");

    expect(knoten(platz, "Y")?.tiefe).toBe(0);
    expect(knoten(platz, "Y")?.zyklusGeloest).toBe(true);
    expect(knoten(platz, "X")?.tiefe).toBe(1);
  });

  it("Szenario: Abschnitte sortieren", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "A1", "Erster", { reihenfolge: 1 });
    await wennIchDenAbschnittAnlege(platz, "A2", "Zweiter", { reihenfolge: 2 });

    // Der Tausch der beiden Reihenfolgewerte ist genau das, was die Maske
    // beim Klick auf „↑" schreibt: zwei Ereignisse, kein Neudurchnummerieren.
    await wennIchSetze(platz, "AbschnittUmsortiert", { abschnittId: "A2" }, 2, 1);
    await wennIchSetze(platz, "AbschnittUmsortiert", { abschnittId: "A1" }, 1, 2);

    const wurzeln = dannSeheIchDenBaum(platz).filter((zeile) => zeile.tiefe === 0);
    const stelleA1 = wurzeln.findIndex((zeile) => zeile.id === "A1");
    const stelleA2 = wurzeln.findIndex((zeile) => zeile.id === "A2");
    expect(stelleA2).toBeLessThan(stelleA1);
  });

  it("Szenario: Abschnitt auflösen — die Einheiten laufen im Ziel weiter", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "EA-NORD", "EA Nord");
    // Die Einheit aus `grundlage` steht in „EO"; sie muss nach der Auflösung
    // in „EA Nord" stehen (§5.3.2, T7).
    expect(platz.dienst.zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("EO");

    await wennIchSetze(
      platz,
      "AbschnittAufgeloest",
      { abschnittId: "EO" },
      null,
      { zielAbschnittId: "EA-NORD", aufgeloestAm: AUFGELOEST_AM },
    );

    expect(platz.dienst.zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("EA-NORD");
    // Der Abschnitt bleibt sichtbar — sonst gäbe es nichts, woran ein
    // `AbschnittWiederhergestellt` ansetzen könnte.
    expect(knoten(platz, "EO")?.aufgeloestNach).toBe("EA-NORD");
    expect(knoten(platz, "EA-NORD")?.einheiten).toBe(1);
  });

  it("Szenario: eine Auflösung zurücknehmen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDenAbschnittAnlege(platz, "EA-NORD", "EA Nord");
    await wennIchSetze(
      platz,
      "AbschnittAufgeloest",
      { abschnittId: "EO" },
      null,
      { zielAbschnittId: "EA-NORD", aufgeloestAm: AUFGELOEST_AM },
    );

    // §6 U2: `AbschnittAufgeloest` ist strukturell rücknehmbar — über das
    // benannte Gegenereignis `AbschnittWiederhergestellt`, dessen `neu` der
    // Katalog auf `null` festlegt.
    const zurueck = await platz.dienst.zurueck();
    expect(zurueck.art).toBe("geschrieben");
    expect(knoten(platz, "EO")?.aufgeloestNach).toBeUndefined();
    expect(platz.dienst.zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("EO");
  });

  it("Szenario: die Systemabschnitte lassen sich nicht ändern", async () => {
    const platz = await angenommenEinEinsatz();
    // §5.3.4: Jedes ändernde Ereignis auf `AUFFANG` ist wirkungslos und
    // erzeugt `reservierteIdVerworfen`. Der Bedienschritt geht durch — er
    // wird geschrieben —, aber er wirkt nicht. Genau deshalb bietet die Maske
    // die Knöpfe für Systemabschnitte gar nicht erst an.
    await wennIchSetze(platz, "AbschnittUmbenannt", { abschnittId: "AUFFANG" }, "Auffang", "Sammelstelle");

    expect(knoten(platz, "AUFFANG")?.name).toBe("Auffang");
    expect(
      platz.dienst.zustand.hinweise.some((hinweis) => hinweis.art === "reservierteIdVerworfen"),
    ).toBe(true);
  });

  it("Szenario: ein Abschnitt, dessen Elternteil noch fehlt, bleibt sichtbar", async () => {
    const platz = await angenommenEinEinsatz();
    // §3.10: Das `AbschnittAngelegt` des Elternteils ist unterwegs. Den Knoten
    // bis dahin wegzulassen hieße, einen Abschnitt samt seiner Einheiten aus
    // der Anzeige zu nehmen, weil ein fremdes Ereignis fehlt.
    await wennIchDenAbschnittAnlege(platz, "UA-SPAET", "UA Spätzünder", { parentId: "NOCH-NICHT-DA" });

    const gesehen = knoten(platz, "UA-SPAET");
    expect(gesehen?.tiefe).toBe(0);
    expect(gesehen?.elternUnbekannt).toBe("NOCH-NICHT-DA");

    // Trifft der Elternabschnitt ein, steht der Knoten ohne Zutun richtig.
    await wennIchDenAbschnittAnlege(platz, "NOCH-NICHT-DA", "EA West");
    expect(knoten(platz, "UA-SPAET")?.tiefe).toBe(1);
    expect(knoten(platz, "UA-SPAET")?.elternUnbekannt).toBeUndefined();
  });
});
