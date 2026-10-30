/**
 * Funktionalität: Die Ablösung von der Anforderung bis zur Einheitenzeile.
 *
 * Gefahren wird die echte Strecke: Bedienschritt → Aktendienst →
 * Speicherschicht → Fold → Projektion. Gemessen wird, was die Excel in den
 * Spalten N bis S einer Zeile führt und was im Zielmodell aus zwei Entitäten
 * zusammenkommt: Anforderung anlegen → zusagen → eingetroffen mit neuer
 * Einheit → die Spalten der abzulösenden Einheit sind gefüllt, „Ablösung
 * durch“ nennt die neue Einheit, und keine Angabe ist doppelt erfasst.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion, zeitpunktText } from "@s1/domaene";

import { abloesungNachtragen, anlageAusAnforderung } from "../kontrakt/anforderungsschritte.js";
import { abloesungZugesagt, anforderungAnlegen, anforderungErledigt } from "../kontrakt/bedienschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Relativ zur Uhr des Läufers — §2.5 hält jede fachliche Zeit gegen die Wanduhr. */
function um(stunden: number): string {
  return new Date(Date.now() + stunden * 60 * 60 * 1000).toISOString();
}

const ANGEFORDERT_AM = um(-1);
const ZUGESAGT_FUER = um(6);
const ERLEDIGT_AM = um(-0.25);

async function mitAnforderung(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  const ergebnis = await platz.dienst.bediene(
    anforderungAnlegen({
      anforderungId: "A1",
      kennung: "ANF-001",
      abzuloesendeEinheitId: "U1",
      vorgeseheneEinheitText: "BGr THW OV Varel",
      vorgesehenerAuftrag: "Deich Nord halten",
      angefordertAm: ANGEFORDERT_AM,
    }),
  );
  expect(ergebnis.art).toBe("geschrieben");
  return platz;
}

function zellen(platz: Platz, einheitId: string): Readonly<Record<string, string>> {
  const einheit = platz.dienst.zustand.einheiten[einheitId];
  if (einheit === undefined) throw new Error(`Einheit ${einheitId} fehlt`);
  const zeile = projektion.tabellenzeile(platz.dienst.zustand, einheit);
  return Object.fromEntries(Object.entries(zeile.zellen).map(([schluessel, zelle]) => [schluessel, zelle.text]));
}

describe("Szenario: Ablösung anfordern, zusagen, eintreffen", () => {
  it("füllt die Spalten der abzulösenden Einheit und nennt die neue Einheit als „Ablösung durch“", async () => {
    const platz = await mitAnforderung();
    expect(zellen(platz, "U1")["anforderungsKennung"]).toBe("ANF-001");
    expect(zellen(platz, "U1")["abloesungAngefordert"]).toBe(zeitpunktText(ANGEFORDERT_AM));

    await platz.dienst.bediene(abloesungZugesagt("A1", ZUGESAGT_FUER, "THW RB Oldenburg"));
    expect(zellen(platz, "U1")["zugesagtFuer"]).toBe(zeitpunktText(ZUGESAGT_FUER));
    expect(zellen(platz, "U1")["zugesagtVon"]).toBe("THW RB Oldenburg");

    const vorschlag = projektion.anforderungsliste(platz.dienst.zustand).zeilen[0]?.vorschlag;
    expect(vorschlag?.herkunft).toBe("THW RB Oldenburg");
    expect(vorschlag?.staerke).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 0 });

    const anlage = await platz.dienst.bediene(
      anlageAusAnforderung({
        einheitId: "U2",
        abschnittId: "EO",
        // Der Bediener kürzt den vorgeschlagenen Namen — die Spalte zeigt dann
        // den Namen der Einheit, nicht den Text der Anforderung.
        bezeichnung: "BGr Varel",
        organisation: vorschlag?.organisation ?? "THW",
        ebene: vorschlag?.ebene ?? "GRUPPE",
        staerke: vorschlag?.staerke ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
        herkunft: vorschlag?.herkunft ?? "",
        reihenfolge: 2,
      }),
    );
    expect(anlage.art).toBe("geschrieben");
    await platz.dienst.bediene(anforderungErledigt("A1", ERLEDIGT_AM, "U2"));

    expect(vorschlag?.bezeichnung).toBe("BGr THW OV Varel");
    expect(zellen(platz, "U1")["abloesungDurch"]).toBe("BGr Varel");
    expect(platz.dienst.zustand.einheiten["U2"]?.status.wert).toBe("ANGEFORDERT");
    expect(projektion.anforderungZurEinheit(platz.dienst.zustand, "U1")?.zustand).toBe("EINGETROFFEN");
    expect(projektion.anforderungZurEinheit(platz.dienst.zustand, "U1")?.abloesendeEinheitId).toBe("U2");
    // Die neue Einheit trägt die Herkunft aus der Zusage — nicht abgetippt.
    expect(zellen(platz, "U2")["herkunft"]).toContain("THW RB Oldenburg");
    expect(platz.dienst.zustand.hinweise).toEqual([]);
  });

  it("trägt die Einheit an einer schon eingetroffenen Anforderung nach, ohne Hinweis", async () => {
    const platz = await mitAnforderung();
    await platz.dienst.bediene(abloesungZugesagt("A1", ZUGESAGT_FUER, "THW RB Oldenburg"));
    await platz.dienst.bediene(anforderungErledigt("A1", ERLEDIGT_AM));
    expect(zellen(platz, "U1")["abloesungDurch"]).toBe("BGr THW OV Varel");

    await platz.dienst.bediene(
      anlageAusAnforderung({
        einheitId: "U3",
        abschnittId: "EO",
        bezeichnung: "BGr Varel",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 7 },
        reihenfolge: 3,
      }),
    );
    const ergebnis = await platz.dienst.bediene(
      abloesungNachtragen({ anforderungId: "A1", erledigtAm: ERLEDIGT_AM }, "U3"),
    );
    expect(ergebnis.art).toBe("geschrieben");
    expect(zellen(platz, "U1")["abloesungDurch"]).toBe("BGr Varel");
    expect(platz.dienst.zustand.hinweise.filter((h) => h.art === "vorherPasstNicht")).toEqual([]);
  });

  it("weist eine Zusage mit unlesbarer Zeit ab, bevor sie im Protokoll steht", async () => {
    const platz = await mitAnforderung();
    const ergebnis = await platz.dienst.bediene(abloesungZugesagt("A1", "morgen früh", "THW"));
    expect(ergebnis.art).toBe("abgewiesen");
    expect(zellen(platz, "U1")["zugesagtFuer"]).toBe("");
  });
});
