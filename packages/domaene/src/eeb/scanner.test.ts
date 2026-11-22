/**
 * Der Scanner gegen Boegen der Schema-Versionen 12 und 13.
 *
 * Die Erfassungsbogen-App schreibt seit Schema 12 den Funkrufname als
 * Erreichbarkeit und seit Schema 13 Zeichenfarbe und Einzelperson. Ein
 * Codec, der bei Version 11 stehen bliebe, lehnte jeden dieser QR-Codes mit
 * „nicht unterstuetzte Schema-Version" ab — und am Meldekopf stuende eine
 * Einheit vor der Tuer, die die Fuehrungsstelle nicht aufnehmen kann.
 *
 * Der Kompressor kommt aus `pako`, wie in den Tests des Formats selbst: Ring 2
 * hat weder `node:zlib` noch den `DecompressionStream` des Browsers.
 */

import {
  KontaktArt,
  SCHEMA_VERSION as BOGEN_SCHEMA,
  Zeichenfarbe,
  encodePayloadUrl,
  type Erfassungsbogen,
  type Kompressor,
} from "@bos/eeb-format";
import { deflateRaw, inflateRaw } from "pako";
import { describe, expect, it } from "vitest";

import { pruefbogen } from "../pruefhilfen/pruefbogen.js";
import { LEERER_STAND, einheitIdDesBogens, liesBogen, nimmScan } from "./scanner.js";

const KOMPRESSOR: Kompressor = {
  deflateRaw: (daten) => deflateRaw(daten, { level: 9 }),
  inflateRaw: (daten) => inflateRaw(daten),
};

/**
 * Ein v12-QR-Code, eingefroren aus den Testvektoren des Formats
 * („voll-schema-12", erzeugt mit dem Schema-12-Encoder): THW OV Oldenburg,
 * zwei Personen — eine mit Funkrufname als Erreichbarkeit —, drei Fahrzeuge.
 */
const V12_QR_URL =
  "https://erfassungsbogen.app/#B.LMAD3AUVB8:U17WK63O4FDQ05E1-A5M-$77NW7LADB5VOV:C6PROR5/*KGD3Y/B2$Z98MRZW5E*KZPP-QA77XS$OF-WD6XY6K71QLP:WCM:WZ4N-X81AJ9D2TU9$-99*T6H8VNN7AQL$VS9ZR8-:ZE-YF*:RT4MM1V1E4IT$6F1VA6Q/I9WQJ/5YYF9CRML*I9ZIYW:/YT3QESKO-15H22WTGC0LW29YTXTZSI25/4USAM1QG3I6FH41-GD1QXOKRY979S0NKFNAN6K8KQOHJGNW/TV0MV*AO33/$6XXG9Y0H2LI/HS:3:70GFI6:$UZEXUE3/I-IKG-CP-GV7XE7IDO*2YS5STUL7-0OSDMR62PLV92XU9S8L1HX-ZSQ1HCM$CGB2Q:17O4CSX53CD5$C6UI$4J7A4LLTJE-G0D2YMQ*:NZ1GBY4WSU85:WLKYSGR76$EVQVEJ$IAYPS**I2SFPTM*GHZ3N9IX53AOJ75MI-*PJ5-2TYUJQ-M$DKAB:-DAW920303BX10IXNIGWB5*5K266W2EF-Y6CKAFM5:KE5EAFE9HP3D3X8S*S8*-WFXYX18T2";

async function gescannt(text: string) {
  const befund = nimmScan(LEERER_STAND, text);
  if (befund.art !== "vollstaendig") throw new Error(`Scan nicht vollstaendig: ${befund.art}`);
  return liesBogen(befund.payload, KOMPRESSOR);
}

/** Der Pruefbogen ist gekuerzt; der Encoder verlangt den Einsatzblock. */
function bogenMitEinsatz(): Erfassungsbogen {
  return {
    ...pruefbogen(),
    einsatz: { zeitraumVon: 2389, zeitraumBis: 2390, ortAuftrag: "Hochwasserlage Albstadt" },
  };
}

function einzelperson(nachname: string): Erfassungsbogen {
  const bogen = bogenMitEinsatz();
  return {
    ...bogen,
    einheit: { ...bogen.einheit, einzelperson: true, einheitsTyp: { freitext: "Fachberater/in" } },
    personal: [{ ...bogen.personal[0]!, nachname }],
    fahrzeuge: [],
  };
}

describe("Ein QR-Code der Schema-Version 12 (eingefroren)", () => {
  it("wird gelesen und auf die aktuelle Version gehoben", async () => {
    const befund = await gescannt(V12_QR_URL);
    expect(befund.bogen.schemaVersion).toBe(BOGEN_SCHEMA);
    expect(befund.bogen.fahrzeuge).toHaveLength(3);
    expect(befund.bogen.personal.some((p) => p.kontakte.some((k) => k.art === KontaktArt.FUNK))).toBe(true);
    expect(befund.einheitId).toMatch(/^E-/);
  });
});

describe("Ein Bogen der Schema-Version 13 durch den ganzen Scanweg", () => {
  it("behaelt Zeichenfarbe, Sitzplaetze und Funkrufname", async () => {
    const bogen = bogenMitEinsatz();
    bogen.fahrzeuge[0]!.zeichenfarbe = Zeichenfarbe.KOMMUNAL;
    bogen.fahrzeuge[0]!.sitzplaetze = 7;
    bogen.personal[0]!.kontakte = [{ art: KontaktArt.FUNK, dienstlich: true, wert: "Heros Albstadt 21/10" }];

    const befund = await gescannt(encodePayloadUrl(bogen, KOMPRESSOR));
    expect(befund.bogen.schemaVersion).toBe(13);
    expect(befund.bogen.fahrzeuge[0]?.zeichenfarbe).toBe(Zeichenfarbe.KOMMUNAL);
    expect(befund.bogen.fahrzeuge[0]?.sitzplaetze).toBe(7);
    expect(befund.bogen.personal[0]?.kontakte[0]).toEqual({
      art: KontaktArt.FUNK,
      dienstlich: true,
      wert: "Heros Albstadt 21/10",
    });
  });

  it("haelt zwei Einzelpersonen desselben Ortsverbands auseinander", async () => {
    const meyer = await gescannt(encodePayloadUrl(einzelperson("Meyer"), KOMPRESSOR));
    const schulz = await gescannt(encodePayloadUrl(einzelperson("Schulz"), KOMPRESSOR));
    expect(meyer.bogen.einheit.einzelperson).toBe(true);
    expect(meyer.einheitSchluessel).not.toBe(schulz.einheitSchluessel);
    expect(meyer.einheitId).not.toBe(schulz.einheitId);
  });

  it("erkennt dieselbe Einzelperson am naechsten Tag als Revision", async () => {
    const heute = await gescannt(encodePayloadUrl(einzelperson("Meyer"), KOMPRESSOR));
    const morgen = await gescannt(
      encodePayloadUrl({ ...einzelperson("Meyer"), stand: heute.bogen.stand + 24 * 60 }, KOMPRESSOR),
    );
    expect(morgen.meldungId).not.toBe(heute.meldungId);
    expect(morgen.einheitId).toBe(heute.einheitId);
  });
});

describe("Die Kennung der Einheit aus dem Bogen als Objekt", () => {
  it("ist dieselbe, die der Scanweg für denselben Bogen bildet", async () => {
    const bogen = einzelperson("Meyer");
    const befund = await gescannt(encodePayloadUrl(bogen, KOMPRESSOR));
    expect(einheitIdDesBogens(bogen)).toBe(befund.einheitId);
  });

  it("hängt an Einheit und Personal, nicht am Stand der Meldung", () => {
    const bogen = einzelperson("Meyer");
    expect(einheitIdDesBogens({ ...bogen, stand: bogen.stand + 24 * 60 })).toBe(einheitIdDesBogens(bogen));
    expect(einheitIdDesBogens(einzelperson("Schulz"))).not.toBe(einheitIdDesBogens(bogen));
  });
});
