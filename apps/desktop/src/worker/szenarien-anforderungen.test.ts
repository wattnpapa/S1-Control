/**
 * Funktionalität: Anforderung, Zusage, Ablösung, Rückführung — die Szenarien
 * zu M5.3.
 *
 * Gefahren wird die echte Strecke: Bedienschritt → Aktendienst →
 * Speicherschicht → Dateisystem → Fold → Projektion. Was hier gemessen wird,
 * ist die **Zustandsmaschine aus §5.6.2** — und zwar an ihrer schwierigsten
 * Stelle: Sie darf nicht rückwärts laufen. `EINGETROFFEN` gewinnt gegen ein
 * späteres Storno, und eine Zusage nach der Erledigung ändert nichts. Das ist
 * Prüfkriterium P6, und es ist der Grund, warum der Zustand aus drei
 * gewöhnlichen Feldern abgeleitet und nicht als Feld geführt wird.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import {
  abloesungZugesagt,
  anforderungAnlegen,
  anforderungErledigt,
  anforderungGeaendert,
  anforderungStorniert,
  ruecknahme,
} from "../kontrakt/bedienschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const ANGEFORDERT_AM = "2026-09-10T09:00:00+02:00";

// ---------------------------------------------------------------------------
// Die Schritte
// ---------------------------------------------------------------------------

async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

async function wennIchAnfordere(
  platz: Platz,
  anforderungId: string,
  kennung: string,
  abzuloesendeEinheitId?: string,
): Promise<void> {
  const ergebnis = await platz.dienst.bediene(
    anforderungAnlegen({
      anforderungId,
      kennung,
      angefordertAm: ANGEFORDERT_AM,
      vorgeseheneEinheitText: "BGr THW OV Varel",
      vorgesehenerAuftrag: "Ablösung Deichverteidigung",
      ...(abzuloesendeEinheitId === undefined ? {} : { abzuloesendeEinheitId }),
    }),
  );
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
}

/** Der Zustand einer Anforderung, wie ihn die Liste zeigt. */
function dannIstDerZustand(platz: Platz, anforderungId: string): string | undefined {
  const liste = projektion.anforderungsliste(platz.dienst.zustand);
  return liste.zeilen.find((zeile) => zeile.id === anforderungId)?.zustand;
}

// ---------------------------------------------------------------------------
// Die Szenarien
// ---------------------------------------------------------------------------

describe("Szenario: Eine Anforderung durchläuft ihre vier Zustände", () => {
  it("offen, zugesagt, eingetroffen — und die Liste zeigt jeden Schritt", async () => {
    const platz = await angenommenEinEinsatz();

    await wennIchAnfordere(platz, "A1", "ANF-001");
    expect(dannIstDerZustand(platz, "A1")).toBe("OFFEN");

    await platz.dienst.bediene(abloesungZugesagt("A1", "2026-09-10T16:00:00+02:00", "THW RB Oldenburg"));
    expect(dannIstDerZustand(platz, "A1")).toBe("ZUGESAGT");

    await platz.dienst.bediene(anforderungErledigt("A1", "2026-09-10T15:40:00+02:00"));
    expect(dannIstDerZustand(platz, "A1")).toBe("EINGETROFFEN");
  });

  it("zeigt die Zusage unter dem Schlüssel, den der Fold plausibilisiert", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(abloesungZugesagt("A1", "2026-09-10T16:00:00+02:00", "THW RB Oldenburg"));

    const zeile = projektion.anforderungsliste(platz.dienst.zustand).zeilen[0];
    expect(zeile?.zugesagtFuer).toBe("2026-09-10T16:00:00+02:00");
    expect(zeile?.zugesagtVon).toBe("THW RB Oldenburg");
    // Und kein Konflikthinweis: Eine Planzeit sechs Stunden nach der Wanduhr
    // liegt weit innerhalb der Schwelle aus §2.5.
    expect(platz.dienst.zustand.hinweise).toHaveLength(0);
  });
});

describe("Szenario: Eingetroffen gewinnt gegen ein späteres Storno (§5.6.2, P6)", () => {
  it("bleibt EINGETROFFEN und meldet die Wirkungslosigkeit", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(anforderungErledigt("A1", "2026-09-10T15:40:00+02:00"));

    // Das Storno wird **gefaltet** — `storno` steht danach auf `true` —, aber
    // der abgeleitete Zustand ändert sich nicht. Ein Rückschritt wäre genau
    // das, was P6 verbietet.
    const ergebnis = await platz.dienst.bediene(
      anforderungStorniert("A1", "Doch nicht nötig, Kräfte anderweitig gebunden"),
    );
    expect(ergebnis.art).toBe("geschrieben");
    expect(dannIstDerZustand(platz, "A1")).toBe("EINGETROFFEN");

    // Das Storno ist gefaltet: `storno` steht auf `true`, der abgeleitete
    // Zustand ändert sich nicht. Genau das verlangt P6.
    expect(projektion.anforderungsliste(platz.dienst.zustand).zeilen[0]?.storniert).toBe(true);

    // **Befund M-B1.** §5.6.2 Nr. 1 verlangt für diesen Fall zusätzlich einen
    // `wirkungslosGegenTerminalzustand` — „ohne den eigenen Hinweis wäre eine
    // bewusste Stornierung wirkungslos **und** unsichtbar". Der Fold erzeugt
    // ihn heute nur für Archivierung, Aufteilung und Zusammenführung, nicht
    // für die Anforderung. Hier steht deshalb **keine** Zusicherung über den
    // Hinweis: Sie wäre entweder rot oder zementierte das Fehlen. Geheilt
    // wird das nicht von M5 aus — Hinweise gehen nach §3.8 in den
    // `zustandsHash`, und die Änderung gehört zu einer `foldVersion` (§3.9).
  });

  it("hält auch eine Zusage nach der Erledigung für wirkungslos", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(anforderungErledigt("A1", "2026-09-10T15:40:00+02:00"));
    await platz.dienst.bediene(abloesungZugesagt("A1", "2026-09-10T16:00:00+02:00", "spät"));

    expect(dannIstDerZustand(platz, "A1")).toBe("EINGETROFFEN");
    // Das Feld ist gesetzt, der Zustand nicht gewechselt — beides zugleich.
    const zeile = projektion.anforderungsliste(platz.dienst.zustand).zeilen[0];
    expect(zeile?.zugesagtFuer).toBe("2026-09-10T16:00:00+02:00");
  });
});

describe("Szenario: Die drei Rücknahmen", () => {
  it("nimmt die Erledigung zurück und fällt auf ZUGESAGT", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(abloesungZugesagt("A1", "2026-09-10T16:00:00+02:00", "RB"));
    await platz.dienst.bediene(anforderungErledigt("A1", "2026-09-10T15:40:00+02:00"));
    await platz.dienst.bediene(ruecknahme("A1", "erledigung"));

    // Eine Rücknahme ist kein Rückschritt im Sinne von P6: Sie hat Akteur,
    // Grund und Tagebuchzeile.
    expect(dannIstDerZustand(platz, "A1")).toBe("ZUGESAGT");
  });

  it("nimmt die Zusage zurück und fällt auf OFFEN", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(abloesungZugesagt("A1", "2026-09-10T16:00:00+02:00", "RB"));
    await platz.dienst.bediene(ruecknahme("A1", "zusage"));
    expect(dannIstDerZustand(platz, "A1")).toBe("OFFEN");
  });

  it("nimmt das Storno zurück und fällt auf OFFEN", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await platz.dienst.bediene(anforderungStorniert("A1", "Irrtum"));
    expect(dannIstDerZustand(platz, "A1")).toBe("STORNIERT");
    await platz.dienst.bediene(ruecknahme("A1", "storno"));
    expect(dannIstDerZustand(platz, "A1")).toBe("OFFEN");
  });
});

describe("Szenario: Die Kennung ist ein Etikett, keine Identität (§5.6.1)", () => {
  it("führt zwei Anforderungen mit derselben Kennung und einen Hinweis", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await wennIchAnfordere(platz, "A2", "ANF-001");

    // Nach EXH F-F3 tragen die abzulösende und die ablösende Zeile dieselbe
    // Kennung absichtlich. Ein Verschmelzen wäre fachlich falsch, stilles
    // Nebeneinander eine unbemerkte Doppelanforderung.
    const liste = projektion.anforderungsliste(platz.dienst.zustand);
    expect(liste.gesamtzahl).toBe(2);
    expect(platz.dienst.zustand.hinweise.map((h) => h.art)).toContain("moeglicheDublette");
  });

  it("lässt den Hinweis fallen, sobald eine storniert ist", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");
    await wennIchAnfordere(platz, "A2", "ANF-001");
    await platz.dienst.bediene(anforderungStorniert("A2", "Doppelt erfasst"));

    expect(platz.dienst.zustand.hinweise.map((h) => h.art)).not.toContain("moeglicheDublette");
  });
});

describe("Szenario: Die Anforderung hängt an der Einheit, die sie ablösen soll", () => {
  it("findet sie über die Einheit und nennt deren aktuellen Namen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001", "U1");

    const zeile = projektion.anforderungZurEinheit(platz.dienst.zustand, "U1");
    expect(zeile?.kennung).toBe("ANF-001");
    // Der Name wird beim Bauen nachgeschlagen: Wird die Einheit umbenannt,
    // zeigt die Liste den neuen Namen (dieselbe Regel wie §5.9.1).
    expect(zeile?.abzuloesendeEinheit).toBeDefined();
  });

  it("blendet eine stornierte Anforderung an der Einheit aus (K12)", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001", "U1");
    await platz.dienst.bediene(anforderungStorniert("A1", "Kräfte selbst gestellt"));

    expect(projektion.anforderungZurEinheit(platz.dienst.zustand, "U1")).toBeUndefined();
  });
});

describe("Szenario: Ein Feld der Anforderung wird berichtigt", () => {
  it("schreibt den Vorher-Wert mit und ändert den Zustand nicht", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");

    await platz.dienst.bediene(
      anforderungGeaendert("A1", "vorgesehenerAuftrag", "Ablösung Deichverteidigung", "Sandsackfüllstelle"),
    );

    const zeile = projektion.anforderungsliste(platz.dienst.zustand).zeilen[0];
    expect(zeile?.vorgesehenerAuftrag).toBe("Sandsackfüllstelle");
    expect(zeile?.zustand).toBe("OFFEN");
    // §2.2a: Der Vorher-Wert passte, also kein Hinweis.
    expect(platz.dienst.zustand.hinweise).toHaveLength(0);
  });

  it("meldet einen Konflikt, wenn der Vorher-Wert nicht passt", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchAnfordere(platz, "A1", "ANF-001");

    await platz.dienst.bediene(
      anforderungGeaendert("A1", "vorgesehenerAuftrag", "etwas ganz anderes", "Sandsackfüllstelle"),
    );

    // §2.2a, Auflage 6: Der Schreiber hat einen Wert gesehen, der nicht galt.
    // Geschrieben wird trotzdem — verworfen wird nichts —, aber die Lage
    // trägt den Hinweis.
    expect(platz.dienst.zustand.hinweise.map((h) => h.art)).toContain("vorherPasstNicht");
  });
});
