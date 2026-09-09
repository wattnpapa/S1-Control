/**
 * Die Bedienschritte, die die Simulation erzeugt — die fünf Ereignisarten des
 * Minimalfolds aus M0.2 (Ereigniskatalog §4.2).
 *
 * Zwei Festlegungen tragen den Nachweis:
 *
 * 1. **Der Vorher-Wert kommt aus dem gefalteten Zustand des handelnden
 *    Clients**, nicht aus einer allwissenden Sicht. Auflage 6 und
 *    KONZEPT-SPEICHER.md §2.5 verlangen, dass jedes setzende Ereignis den
 *    **gesehenen** Vorher-Wert trägt; ein Client, der unter Störung weniger
 *    gesehen hat, trägt deshalb einen anderen — und genau daraus entstehen die
 *    Konflikthinweise, die P3 als Teil des Zustands prüft. Ein Generator, der
 *    den wahren Wert einsetzte, umginge die Prüfung.
 * 2. **Ids sind je Client vergeben.** `abschnittId` und `einheitId` tragen die
 *    Kennung ihres Erzeugers. Zwei Clients legen deshalb nie versehentlich
 *    dieselbe Entität an, während sie sehr wohl dieselbe fremde Entität
 *    verschieben und in der Stärke ändern — das ist der Konfliktfall, um den
 *    es geht.
 *
 * Die Nutzlasten sind in ihrer Größe realistisch gehalten: Annahme A2 (§10,
 * §2.6) sagt 400 bis 600 Byte je Ereignis zu und ist an dieser Simulation zu
 * prüfen. Künstlich kurze Nutzlasten machten diese Prüfung wertlos.
 */

import {
  ABSCHNITTSTYPEN,
  EINHEIT_STATUS,
  ORGANISATIONEN,
  SCHICHTEN,
  TAKTISCHE_EBENEN,
  type Staerke,
  type Zustand,
} from "@s1/domaene";

import { Zufall } from "./zufall.js";

/** Ein Bedienschritt, fertig zum Schreiben durch `Akte.schreibe` (§5.2). */
export interface Bedienschritt {
  readonly typ: string;
  readonly nutzlast?: unknown;
  readonly vorher?: unknown;
  readonly neu?: unknown;
}

const EINHEITSNAMEN = [
  "Bergungsgruppe", "Fachgruppe Wassergefahren", "Fachgruppe Räumen",
  "Zugtrupp", "Fachgruppe Notversorgung", "Fachgruppe Ortung",
  "Löschzug", "Rettungswagen", "Führungsgruppe", "Betreuungszug",
] as const;

const ABSCHNITTSNAMEN = [
  "Deichabschnitt Nord", "Sammelstelle Schulzentrum", "Bereitstellungsraum Ost",
  "Meldekopf Rathaus", "Verpflegungsstelle", "Pumpenstrecke West",
] as const;

const GRUENDE = [
  "Lagemeldung des Abschnittsführers",
  "Anforderung der übergeordneten Führungsstelle",
  "Ablösung nach Schichtwechsel",
  "Rückmeldung über Funk, Kanal 2",
] as const;

/** Zustandsauszug, den der Generator braucht — bewusst schmal gehalten. */
interface Sicht {
  readonly abschnitte: readonly string[];
  readonly einheiten: readonly { readonly id: string; readonly abschnittId: string; readonly staerke: Staerke }[];
  readonly einsatzAngelegt: boolean;
}

function sicht(zustand: Zustand): Sicht {
  return {
    abschnitte: Object.keys(zustand.abschnitte),
    einheiten: Object.values(zustand.einheiten).map((e) => ({
      id: e.id,
      abschnittId: e.abschnittId.wert,
      staerke: e.staerke.wert,
    })),
    einsatzAngelegt: zustand.einsatz !== undefined,
  };
}

function staerke(zufall: Zufall): Staerke {
  return {
    fuehrer: zufall.bis(3),
    unterfuehrer: zufall.bis(5),
    mannschaft: zufall.bis(20),
  };
}

/**
 * Erzeugt den nächsten Bedienschritt eines Clients.
 *
 * `undefined` heißt: Dieser Client kann gerade nichts Sinnvolles tun — er hat
 * noch keinen Abschnitt gesehen und keinen anzulegen. Der Aufrufer zählt den
 * Schritt dann nicht als Kommando, sonst zählte die Simulation Leerläufe mit.
 */
export function naechsterSchritt(
  zufall: Zufall,
  zustand: Zustand,
  clientId: string,
  einsatzId: string,
  laufendeNummer: number,
): Bedienschritt | undefined {
  const s = sicht(zustand);

  if (!s.einsatzAngelegt) {
    return {
      typ: "EinsatzAngelegt",
      nutzlast: {
        einsatzId,
        name: "Hochwasser Weser-Ems",
        art: "UEBUNG",
        fuestName: "FüSt Oldenburg",
        uebergeordneteFuestName: "Regionalstelle Oldenburg",
        beginn: "2026-09-09T06:00:00.000Z",
        schichtmodell: "ZWEI_SCHICHTEN",
      },
    };
  }

  // Solange es keinen Abschnitt gibt, ist die Abschnittsanlage der einzige
  // sinnvolle Schritt; danach wird gemischt.
  const wurf = s.abschnitte.length === 0 ? 0 : zufall.bis(100);

  if (wurf < 8) {
    return {
      typ: "AbschnittAngelegt",
      nutzlast: {
        abschnittId: `A-${clientId}-${laufendeNummer}`,
        name: `${zufall.waehle(ABSCHNITTSNAMEN)} ${laufendeNummer}`,
        abschnittstyp: zufall.waehle(ABSCHNITTSTYPEN),
        ...(s.abschnitte.length > 0 && zufall.trifft(0.4)
          ? { parentId: zufall.waehle(s.abschnitte) }
          : {}),
        reihenfolge: zufall.bis(1000),
      },
    };
  }

  if (wurf < 38 || s.einheiten.length === 0) {
    return {
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: `E-${clientId}-${laufendeNummer}`,
        abschnittId: zufall.waehle(s.abschnitte),
        bezeichnung: `${zufall.waehle(EINHEITSNAMEN)} ${zufall.zwischen(1, 9)}/${zufall.zwischen(1, 4)}`,
        organisation: zufall.waehle(ORGANISATIONEN),
        organisationName: "Ortsverband Oldenburg",
        ebene: zufall.waehle(TAKTISCHE_EBENEN),
        staerke: staerke(zufall),
        personalErfassung: "VOLLSTAENDIG",
        status: zufall.waehle(EINHEIT_STATUS),
        schicht: zufall.waehle(SCHICHTEN),
      },
    };
  }

  const einheit = zufall.waehle(s.einheiten);

  if (wurf < 68) {
    const ziel = zufall.waehle(s.abschnitte);
    // §2.5: `vorher` ist der **gesehene** Wert. Nicht der wahre — den kennt
    // dieser Client womöglich gar nicht.
    return {
      typ: "EinheitVerschoben",
      vorher: einheit.abschnittId,
      neu: ziel,
      nutzlast: { einheitId: einheit.id, kommentar: zufall.waehle(GRUENDE) },
    };
  }

  return {
    typ: "StaerkeGeaendert",
    vorher: einheit.staerke,
    neu: staerke(zufall),
    nutzlast: { einheitId: einheit.id },
  };
}
