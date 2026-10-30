/**
 * Funktionalität: den Einsatz beenden, wiedereröffnen, archivieren und die
 * Einsatzakte erzeugen.
 *
 * Gemessen wird die echte Strecke — Entwurf aus `bedienschritte.ts`, Prüfung
 * im Aktendienst, Fold, Lagebild, Tagebuch und die Akte auf dem Share. Der
 * Kern der Aussage ist die Sperre: Nach dem Ende und nach der Archivierung
 * nimmt der Worker nichts mehr an, auch nicht über „Rückgängig", und zwar
 * mit einer lesbaren Meldung statt eines Fehlers.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { liesZip, schreibeZip } from "@s1/ausgaben";
import { MANIFEST_DATEI, knotenDateisystem, packeAkte, type Manifest } from "@s1/speicher";

import { einsatzBeendet, einsatzWiedereroeffnet, stammdatenAenderung } from "../kontrakt/bedienschritte.js";
import { CODE_EINSATZ_ABGESCHLOSSEN, lagebildMit, type Lagebild } from "../kontrakt/index.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Eine Stunde vor jetzt — fachliche Zeiten relativ zur Uhr des Läufers (§2.5). */
const ENDE = new Date(Date.now() - 3_600_000).toISOString();

function letztesLagebild(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

/** Ein gewöhnlicher Schreibversuch — derselbe Weg wie aus der Stammdatenmaske. */
function ortSetzen(platz: Platz, ort: string) {
  const vorher = platz.dienst.zustand.einsatz?.ort?.wert ?? null;
  return platz.dienst.bediene(stammdatenAenderung(EINSATZ_ID, "ort", vorher as string | null, ort));
}

async function laufenderEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

async function beende(platz: Platz): Promise<void> {
  const ergebnis = await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, ENDE, "Lage bereinigt"));
  expect(ergebnis.art).toBe("geschrieben");
}

describe("Szenario: Einsatz beenden und wiedereröffnen", () => {
  it("zeigt den Zustand im Lagebild und weist danach jedes Schreiben lesbar ab", async () => {
    const platz = await laufenderEinsatz();
    await platz.dienst.takt();
    expect(letztesLagebild(platz)).toMatchObject({ einsatzStatus: "AKTIV", einsatzEnde: "" });

    await beende(platz);
    await platz.dienst.takt();
    expect(letztesLagebild(platz)).toMatchObject({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });

    const vorher = platz.dienst.zustand;
    const abgewiesen = await ortSetzen(platz, "Deich Süd");
    expect(abgewiesen).toMatchObject({ art: "abgewiesen", code: CODE_EINSATZ_ABGESCHLOSSEN });
    expect(abgewiesen.art === "abgewiesen" ? abgewiesen.meldung : "").toMatch(/beendet.*wiedereröffnen/u);
    expect(platz.dienst.zustand).toBe(vorher);
  });

  it("schreibt nach dem Wiedereröffnen wieder — und das Ende ist leer statt verschwunden", async () => {
    const platz = await laufenderEinsatz();
    await beende(platz);
    const auf = await platz.dienst.bediene(einsatzWiedereroeffnet(EINSATZ_ID, ENDE));
    expect(auf.art).toBe("geschrieben");
    expect((await ortSetzen(platz, "Deich Süd")).art).toBe("geschrieben");
    await platz.dienst.takt();
    expect(letztesLagebild(platz)).toMatchObject({ einsatzStatus: "AKTIV", einsatzEnde: "" });
  });

  it("weist ein Wiedereröffnen ab, solange der Einsatz läuft", async () => {
    const platz = await laufenderEinsatz();
    const ergebnis = await platz.dienst.bediene(einsatzWiedereroeffnet(EINSATZ_ID, null));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: "EINSATZ_ZUSTAND" });
  });

  it("weist ein Ende ohne lesbaren Zeitpunkt ab", async () => {
    const platz = await laufenderEinsatz();
    const ergebnis = await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, "gestern"));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: "SCHEMA" });
  });

  it("nennt Ende, Bemerkung und Wiedereröffnung lesbar im Tagebuch", async () => {
    const platz = await laufenderEinsatz();
    await beende(platz);
    await platz.dienst.bediene(einsatzWiedereroeffnet(EINSATZ_ID, ENDE));
    const zeilen = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen;
    const ende = zeilen.find((zeile) => zeile.typ === "EinsatzBeendet");
    expect(ende?.satz).toMatch(/^Hochwasser Weser-Ems: Einsatz beendet/u);
    // Der Zeitpunkt als „TT.MM.JJJJ HH:MM“, nicht als ISO-Zeichenkette.
    expect(ende?.satz).not.toMatch(/\d{4}-\d{2}-\d{2}T/u);
    expect(ende?.satz).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/u);
    expect(ende?.grund).toBe("Lage bereinigt");
    expect(zeilen.find((zeile) => zeile.typ === "EinsatzWiedereroeffnet")?.satz).toMatch(/^Hochwasser Weser-Ems: Einsatz wiedereröffnet/u);
  });
});

describe("Szenario: Einsatz archivieren", () => {
  it("geht erst nach dem Ende", async () => {
    const platz = await laufenderEinsatz();
    const ergebnis = await platz.dienst.archiviere(new Date().toISOString());
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: "EINSATZ_ZUSTAND" });
  });

  it("macht den Einsatz read-only — auch für Wiedereröffnen und Rückgängig", async () => {
    const platz = await laufenderEinsatz();
    await beende(platz);
    const archiviert = await platz.dienst.archiviere(new Date().toISOString());
    expect(archiviert.art).toBe("geschrieben");
    expect(platz.dienst.zustand.einsatz?.status).toBe("ARCHIVIERT");
    const beleg = Object.values(platz.dienst.zustand.archivierungen)[0];
    expect(beleg?.snapshotHash).toMatch(/^[0-9a-f]{64}$/u);

    for (const versuch of [
      await ortSetzen(platz, "Deich Süd"),
      await platz.dienst.bediene(einsatzWiedereroeffnet(EINSATZ_ID, ENDE)),
      await platz.dienst.zurueck(),
    ]) {
      expect(versuch).toMatchObject({ art: "abgewiesen", code: CODE_EINSATZ_ABGESCHLOSSEN });
    }
    await platz.dienst.takt();
    expect(letztesLagebild(platz)?.einsatzStatus).toBe("ARCHIVIERT");
    expect(platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen[0]?.satz).toMatch(
      /^Hochwasser Weser-Ems: Einsatz archiviert/u,
    );
  });

  it("sperrt auch den zweiten Arbeitsplatz, sobald er die Archivierung gelesen hat", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await beende(a);
    await a.dienst.archiviere(new Date().toISOString());
    await takteBis([a, b]);
    expect(b.dienst.zustand.einsatz?.status).toBe("ARCHIVIERT");
    expect(await ortSetzen(b, "Deich Süd")).toMatchObject({ art: "abgewiesen", code: CODE_EINSATZ_ABGESCHLOSSEN });
  });
});

describe("Szenario: Einsatzakte erzeugen", () => {
  it("legt das ZIP in den Ordner des Einsatzes, mit dem Inhalt, den auch die Kommandozeile packt", async () => {
    const platz = await laufenderEinsatz();
    await beende(platz);
    const akte = await platz.dienst.erzeugeAkte();

    // Neben `einsatz.json`, nicht in `ausgaben\` — sonst nähme jede Akte die vorige mit.
    expect(path.dirname(akte.pfad)).toBe(platz.share);
    expect(path.basename(akte.pfad)).toMatch(new RegExp(`^${EINSATZ_ID}_akte_\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.zip$`, "u"));
    expect(readdirSync(path.join(platz.share, "ausgaben")).some((name) => name.endsWith(".zip"))).toBe(false);
    expect(akte.befunde).toBe(0);
    expect(akte.ereignisse).toBe(4);

    const eintraege = liesZip(new Uint8Array(readFileSync(akte.pfad)));
    const manifest = JSON.parse(
      new TextDecoder().decode(eintraege.find((e) => e.pfad === MANIFEST_DATEI)?.bytes),
    ) as Manifest;
    expect(akte.bytes).toBe(readFileSync(akte.pfad).length);
    // Derselbe Kern wie `s1 akte exportiere`: gleicher Bestand, gleiche Liste.
    const cli = await packeAkte(knotenDateisystem(), platz.share, new Date(manifest.erzeugt), schreibeZip);
    expect(manifest.dateien).toEqual(cli.manifest.dateien);
    expect(manifest.zustandsHash).toBe(cli.manifest.zustandsHash);
    expect(eintraege.map((e) => e.pfad)).toEqual([...cli.manifest.dateien.map((d) => d.pfad), MANIFEST_DATEI]);
  });

  it("geht auch bei einem archivierten Einsatz — Lesen ist nie gesperrt", async () => {
    const platz = await laufenderEinsatz();
    await beende(platz);
    await platz.dienst.archiviere(new Date().toISOString());
    const akte = await platz.dienst.erzeugeAkte();
    expect(akte.ereignisse).toBe(5);
  });
});
