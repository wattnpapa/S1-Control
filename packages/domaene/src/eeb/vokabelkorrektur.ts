/**
 * Der Korrekturweg fuer Einheiten, die mit rohen Vokabularcodes uebernommen
 * wurden.
 *
 * Bis zur Behebung im Adapter bekam die Uebernahme eines Erfassungsbogens
 * keine Nachschlagetabellen und schrieb `#3 Bückeburg` statt „Zugtrupp
 * Technischer Zug Bückeburg" in die Lage, ebenso `#1` als Hierarchie-Ebene,
 * `#2` als Fahrzeugtyp und `#5` als Funktion. Die Ereignisse stehen im
 * Protokoll und bleiben dort; korrigiert wird **nach vorn**, mit
 * Feldereignissen wie bei einer Revision (§5.8.2).
 *
 * **Nur, was noch vom fehlerhaften Import stammt.** Fuer jede uebernommene
 * Meldung wird der Bogen zweimal uebersetzt: so, wie der alte Adapter es tat
 * (ohne Tabellen), und so, wie er es jetzt tut. Ein Feld wird nur dann
 * korrigiert, wenn sein aktueller Wert **genau** dem alten Ergebnis
 * entspricht. Hat die Fuehrungsstelle die Bezeichnung inzwischen von Hand
 * gesetzt, bleibt sie, wie sie ist.
 *
 * Der Vorher-Wert ist der gefaltete Wert, den dieser Arbeitsplatz sieht
 * (§2.2a): Korrigieren zwei Plaetze gleichzeitig, meldet der Fold den
 * Konflikt, statt einen der beiden still zu verlieren.
 */

import type { Erfassungsbogen } from "@bos/eeb-format";

import { kanonischeSerialisierung, type KanonischerWert } from "../kanonisch.js";
import type { MeldungZustand, Zustand } from "../zustand.js";
import { uebersetzeBogen, type UebersetzterBogen } from "./adapter.js";
import type { Uebernahmeentwurf } from "./scanner.js";

/** Die Einheitsfelder, in denen der Adapter Vokabeltext ablegt. */
const EINHEITSFELDER = ["bezeichnung", "hierarchie", "ebene"] as const;
const FAHRZEUGFELDER = ["typ", "funkrufname"] as const;
const PERSONENFELDER = ["funktionen", "zusatzqualifikationen"] as const;

interface Fassungen {
  readonly alt: UebersetzterBogen;
  readonly neu: UebersetzterBogen;
}

/**
 * Die beiden Uebersetzungen eines Bogens, je Bogenobjekt einmal gerechnet.
 *
 * Der Fold ersetzt eine Meldung nicht, solange sich an ihr nichts aendert;
 * dasselbe Bogenobjekt kommt also bei jedem Lagebild wieder. Ohne Ablage
 * rechnete der Arbeitsplatz bei jeder Aenderung alle Boegen doppelt durch.
 */
const ABLAGE = new WeakMap<object, Fassungen>();

/**
 * Die Ids von Personen und Fahrzeugen, wie die Uebernahme sie vergibt.
 *
 * Muss mit `eebUebernehmen` und `buendelEinlesen` im Aktendienst
 * uebereinstimmen: Dort entstehen sie aus der `meldungId`, damit zwei
 * Meldekoepfe fuer denselben Bogen dieselben Ids schreiben.
 */
export function teilIdsAus(meldungId: string, bogen: Erfassungsbogen): {
  readonly personIds: readonly string[];
  readonly fahrzeugIds: readonly string[];
} {
  const kopf = meldungId.slice(0, 10);
  return {
    personIds: bogen.personal.map((_, nummer) => `P-${kopf}-${String(nummer)}`),
    fahrzeugIds: bogen.fahrzeuge.map((_, nummer) => `F-${kopf}-${String(nummer)}`),
  };
}

function fassungen(meldungId: string, einheitId: string, bogen: Erfassungsbogen): Fassungen {
  const vorhanden = ABLAGE.get(bogen);
  if (vorhanden !== undefined) return vorhanden;
  const auftrag = { einheitId, abschnittId: "-", ...teilIdsAus(meldungId, bogen) };
  const ergebnis: Fassungen = {
    alt: uebersetzeBogen(bogen, { ...auftrag, tabellen: {} }),
    neu: uebersetzeBogen(bogen, auftrag),
  };
  ABLAGE.set(bogen, ergebnis);
  return ergebnis;
}

function gleich(links: unknown, rechts: unknown): boolean {
  if (links === rechts) return true;
  if (links === undefined || links === null || rechts === undefined || rechts === null) return false;
  return (
    kanonischeSerialisierung(links as KanonischerWert) === kanonischeSerialisierung(rechts as KanonischerWert)
  );
}

type Felder = Readonly<Record<string, { readonly wert?: unknown } | undefined>>;

interface Ziel {
  readonly typ: string;
  readonly idFeld: string;
  readonly id: string;
  readonly felder: readonly string[];
  readonly aktuell: Felder;
  readonly alt: Readonly<Record<string, unknown>> | undefined;
  readonly neu: Readonly<Record<string, unknown>> | undefined;
}

/** Die Feldereignisse fuer eine Entitaet: nur, wo aktuell = alt und alt ≠ neu. */
function feldkorrekturen(ziel: Ziel, grund: string): Uebernahmeentwurf[] {
  if (ziel.alt === undefined || ziel.neu === undefined) return [];
  const entwuerfe: Uebernahmeentwurf[] = [];
  for (const feld of ziel.felder) {
    const vorher = ziel.aktuell[feld]?.wert;
    const alt = ziel.alt[feld];
    const neu = ziel.neu[feld];
    if (neu === undefined || !gleich(vorher, alt) || gleich(alt, neu)) continue;
    entwuerfe.push({
      typ: ziel.typ,
      nutzlast: { [ziel.idFeld]: ziel.id, feld },
      vorher: vorher ?? null,
      neu,
      grund,
    });
  }
  return entwuerfe;
}

function entfernt(entitaet: { readonly entfernt?: { readonly wert?: unknown } } | undefined): boolean {
  return entitaet === undefined || entitaet.entfernt?.wert === true;
}

function korrekturenDerMeldung(zustand: Zustand, meldung: MeldungZustand): Uebernahmeentwurf[] {
  const bogen = meldung.bogen?.wert as Erfassungsbogen | null | undefined;
  const einheitId = meldung.uebernahme?.wert?.einheitId;
  if (bogen === undefined || bogen === null || einheitId === undefined) return [];
  const einheit = zustand.einheiten[einheitId];
  if (entfernt(einheit)) return [];

  const { alt, neu } = fassungen(meldung.id, einheitId, bogen);
  const ids = teilIdsAus(meldung.id, bogen);
  const grund = `Vokabularkorrektur EEB ${meldung.id}`;
  const entwuerfe = feldkorrekturen(
    { typ: "EinheitStammdatenGeaendert", idFeld: "einheitId", id: einheitId, felder: EINHEITSFELDER,
      aktuell: einheit as unknown as Felder, alt: alt.einheit, neu: neu.einheit },
    grund,
  );
  ids.fahrzeugIds.forEach((id, i) => {
    const fahrzeug = zustand.fahrzeuge[id];
    if (entfernt(fahrzeug)) return;
    entwuerfe.push(...feldkorrekturen(
      { typ: "FahrzeugGeaendert", idFeld: "fahrzeugId", id, felder: FAHRZEUGFELDER,
        aktuell: fahrzeug as unknown as Felder, alt: alt.fahrzeuge[i], neu: neu.fahrzeuge[i] },
      grund,
    ));
  });
  ids.personIds.forEach((id, i) => {
    const person = zustand.personen[id];
    if (entfernt(person)) return;
    entwuerfe.push(...feldkorrekturen(
      { typ: "PersonGeaendert", idFeld: "personId", id, felder: PERSONENFELDER,
        aktuell: person as unknown as Felder, alt: alt.personen[i], neu: neu.personen[i] },
      grund,
    ));
  });
  return entwuerfe;
}

function schluessel(entwurf: Uebernahmeentwurf): string {
  const { feld, ...rest } = entwurf.nutzlast as { feld: string };
  return `${entwurf.typ}|${String(Object.values(rest)[0])}|${feld}`;
}

/**
 * Alle offenen Vokabularkorrekturen der Lage, in fester Reihenfolge.
 *
 * Mehrere Fassungen derselben Einheit koennen dasselbe Feld treffen; es
 * zaehlt die erste, denn nach ihrem Schreiben passt der aktuelle Wert zu
 * keiner alten Fassung mehr.
 */
export function vokabelkorrekturen(zustand: Zustand): readonly Uebernahmeentwurf[] {
  const gesehen = new Set<string>();
  const entwuerfe: Uebernahmeentwurf[] = [];
  const meldungen = Object.values(zustand.meldungen).sort((a, b) => a.id.localeCompare(b.id));
  for (const meldung of meldungen) {
    for (const entwurf of korrekturenDerMeldung(zustand, meldung)) {
      const s = schluessel(entwurf);
      if (gesehen.has(s)) continue;
      gesehen.add(s);
      entwuerfe.push(entwurf);
    }
  }
  return entwuerfe;
}
