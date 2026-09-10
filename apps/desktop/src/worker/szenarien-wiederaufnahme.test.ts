/**
 * Funktionalität: Wiederaufnahme nach einem Programmneustart.
 *
 * Der Befund, aus dem diese Datei entstanden ist: Ein Einsatz wurde angelegt,
 * ein Erfassungsbogen eingelesen, die Einheit stand in der Lage — nach
 * „Fenster zu, Fenster auf" war alles leer, obwohl auf der Platte jede Zeile
 * lag. Zwei Regeln, jede für sich richtig, hatten zusammen eine Lücke
 * gelassen: Der Leser liest fremde Dateien **ab** seinem gemerkten
 * `leseOffset` (§6.2), eigene Dateien liest er gar nicht (§5.4.1), und beide
 * Offsets überstehen den Neustart in `upload-state.json`. Es kam also nach
 * einem Neustart nichts mehr an, was vor ihm geschrieben worden war.
 *
 * Gemessen wird deshalb nicht „die Datei ist da", sondern was der Bediener
 * sieht: Abschnitte, Einheiten, Stärke, Tagebuch und der Undo-Stapel, jeweils
 * nach dem Neustart. Und ausdrücklich auch, dass nichts **doppelt** ankommt —
 * eine Wiederaufnahme, die jede Zeile ein zweites Mal faltet, wäre so falsch
 * wie eine, die keine faltet.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  baueDienst,
  baueWerkstatt,
  grundlage,
  legeEinsatzordnerAn,
  raeumeAuf,
  starteNeu,
  takteBis,
  werkstattMitEinemPlatz,
  werkstattMitZweiPlaetzen,
  type Platz,
} from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

function tagebuchzahl(platz: Platz): number {
  return platz.dienst.tagebuch({
    art: "tagebuchAnfordern",
    akteId: `akte-${String(platz.nummer)}`,
  } as never).gesamtzahl;
}

describe("Funktionalität: Wiederaufnahme", () => {
  it("Szenario: nach dem Neustart steht die Lage wieder da", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const vorher = tagebuchzahl(platz);
    // Drei Abschnitte, nicht einer: `EinsatzAngelegt` legt Auffang und Archiv
    // mit an, und auch die sind Ereignisse, die den Neustart überstehen.
    const abschnitteVorher = Object.keys(platz.dienst.zustand.abschnitte).sort();

    const neu = await starteNeu(platz);

    expect(Object.keys(neu.dienst.zustand.abschnitte).sort()).toEqual(abschnitteVorher);
    expect(Object.keys(neu.dienst.zustand.einheiten)).toHaveLength(1);
    expect(tagebuchzahl(neu)).toBe(vorher);
  });

  it("Szenario: das erste Lagebild nach dem Neustart ist nicht leer", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);

    const neu = await starteNeu(platz);

    // Das erste, volle Lagebild geht **beim Öffnen** hinaus, nicht erst im
    // ersten Takt: Der Renderer zeichnet danach und wartet nicht ab.
    const erstes = neu.mitteilungen[0];
    expect(erstes?.art).toBe("stand");
    const voll = (erstes as { voll: { einheiten: number; gesamtstaerke: { mannschaft: number }; einsatzName: string } }).voll;
    expect(voll.einheiten).toBe(1);
    expect(voll.gesamtstaerke.mannschaft).toBe(8);
    expect(voll.einsatzName).toBe("Hochwasser Weser-Ems");
  });

  it("Szenario: der Neustart faltet keine Zeile ein zweites Mal", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const vorher = tagebuchzahl(platz);

    // Zweimal hintereinander neu starten: Wer die Wiederaufnahme an die
    // Faltung anhängt, statt sie über die Ereignis-Id zu deduplizieren,
    // verdoppelt hier.
    const neu = await starteNeu(await starteNeu(platz));
    await takteBis([neu]);

    expect(tagebuchzahl(neu)).toBe(vorher);
    expect(Object.keys(neu.dienst.zustand.einheiten)).toHaveLength(1);
  });

  it("Szenario: der Undo-Stapel übersteht den Neustart", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);

    const neu = await starteNeu(platz);

    // §4.4: „Er liegt nirgends." Der Stapel wird beim Öffnen aus dem lokalen
    // Spiegel abgeleitet — genau die Zeilen, die die Wiederaufnahme liest.
    // `EinsatzAngelegt` steht nicht darauf — U2, Zeile „nicht rückgängig".
    expect(neu.dienst.undoStapel().map((eintrag) => eintrag.typ)).toEqual([
      "EinheitGemeldet",
      "AbschnittAngelegt",
    ]);
    const ergebnis = await neu.dienst.zurueck();
    expect(ergebnis.art).not.toBe("nichtMoeglich");
  });

  it("Szenario: auch die Ereignisse des anderen Arbeitsplatzes sind wieder da", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    // b hat a's Einheit über den Share gelesen und in seinen Spiegel gelegt.
    expect(Object.keys(b.dienst.zustand.einheiten)).toHaveLength(1);

    const abschnitteVorher = Object.keys(b.dienst.zustand.abschnitte).sort();

    const neu = await starteNeu(b);

    expect(Object.keys(neu.dienst.zustand.abschnitte).sort()).toEqual(abschnitteVorher);
    expect(Object.keys(neu.dienst.zustand.einheiten)).toHaveLength(1);
  });

  it("Szenario: ein Arbeitsplatz ohne eigenen Spiegel startet leer, nicht mit einem Fehler", async () => {
    const { wurzel, share } = baueWerkstatt();
    await legeEinsatzordnerAn(wurzel, share);
    const frisch = baueDienst(wurzel, share, 3);

    await frisch.dienst.oeffne();

    // Kein `ereignisse\`-Ordner im Spiegel, also nichts wiederaufzunehmen —
    // und kein Hinweis, der von einem Fehler spräche.
    expect(Object.keys(frisch.dienst.zustand.einheiten)).toHaveLength(0);
    expect(frisch.mitteilungen.filter((m) => m.art === "hinweis")).toHaveLength(0);
  });
});
