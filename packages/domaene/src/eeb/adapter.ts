/**
 * Der Adapter `eeb → EinheitGemeldet` (M1.5).
 *
 * Ein Erfassungsbogen beschreibt **eine** Einheit, wie sie am Meldekopf
 * eintrifft. Dieser Adapter uebersetzt ihn in die Nutzlasten des Katalogs:
 * eine `EinheitGemeldet`, dazu je Person eine `PersonHinzugefuegt` und je
 * Fahrzeug eine `FahrzeugAngelegt`.
 *
 * **Er baut keine Ereignisse, sondern Nutzlasten.** Rahmen, Id, HLC und
 * Akteur gehoeren dem schreibenden Client; der Adapter kennt weder Uhr noch
 * Kennungen (02-ZIELBILD.md, „Vier Ringe"). Wer ihn aufruft, uebergibt die
 * Ids, unter denen die Entitaeten stehen sollen.
 *
 * **Die Stärke ist die eigene Stärke** (KONZEPT-EREIGNISSE.md §5.4.2). Ein
 * Bogen meldet den Kopfstand im Feld; hat die Einheit in der Fuehrungsstelle
 * bereits Zuwachs oder Abgang, stimmt beides nicht ueberein. Diese Lage
 * bindet den **schreibenden Client**: §5.4.2 verlangt, die Uebernahme des
 * Feldes `staerke` nur anzubieten, wenn die Einheit weder Zuwachs noch Abgang
 * hat. Der Adapter kann das nicht sehen — ihm liegt ein Bogen vor, keine
 * Lage — und uebersetzt deshalb, was im Bogen steht.
 */

import {
  Ernaehrung,
  Geschlecht,
  KontaktArt,
  OrganisationsTyp,
  PersonalErfassung,
  StaerkeRolle,
  EEB_EPOCHE_MS,
  migriereBogen,
  staerke as staerkeAusBogen,
  type Erfassungsbogen,
  type HierarchieEbene as EebHierarchieEbene,
  type Kontakt as EebKontakt,
  type Person as EebPerson,
  type VokabularWert,
} from "@bos/eeb-format";

import type { Id, Staerke, Zeitpunkt } from "../werte.js";

// ---------------------------------------------------------------------------
// Wertebereiche: aus den Zahlen des Bogens in die Namen des Katalogs
// ---------------------------------------------------------------------------

/**
 * Die zwoelf Organisationen des Bogens auf die sechzehn des Zielmodells.
 *
 * `SONSTIGE` ist in beiden der Auffang; `organisationName` traegt dann den
 * Freitext (ZDM §2.1). Die vier Werte, die nur das Zielmodell kennt
 * (`BERGWACHT`, `WASSERWIRTSCHAFT`, `REGIE`, `ZIVIL`), kommen aus einem Bogen
 * nie — sie stehen in der Excel und werden von Hand gesetzt.
 */
const ORGANISATION: Readonly<Record<number, string>> = {
  [OrganisationsTyp.THW]: "THW",
  [OrganisationsTyp.FEUERWEHR]: "FEUERWEHR",
  [OrganisationsTyp.POLIZEI]: "POLIZEI",
  [OrganisationsTyp.BUNDESPOLIZEI]: "BUNDESPOLIZEI",
  [OrganisationsTyp.DRK]: "DRK",
  [OrganisationsTyp.JUH]: "JUH",
  [OrganisationsTyp.MHD]: "MHD",
  [OrganisationsTyp.ASB]: "ASB",
  [OrganisationsTyp.DLRG]: "DLRG",
  [OrganisationsTyp.BUNDESWEHR]: "BUNDESWEHR",
  [OrganisationsTyp.RETTUNGSDIENST]: "RETTUNGSDIENST",
  [OrganisationsTyp.SONSTIGE]: "SONSTIGE",
};

const ROLLE: Readonly<Record<number, string>> = {
  [StaerkeRolle.FUEHRER]: "FUEHRER",
  [StaerkeRolle.UNTERFUEHRER]: "UNTERFUEHRER",
  [StaerkeRolle.MANNSCHAFT]: "MANNSCHAFT",
};

const GESCHLECHT: Readonly<Record<number, string>> = {
  [Geschlecht.M]: "MAENNLICH",
  [Geschlecht.W]: "WEIBLICH",
  [Geschlecht.D]: "DIVERS",
};

const ERNAEHRUNG: Readonly<Record<number, string>> = {
  [Ernaehrung.FLEISCH]: "FLEISCH",
  [Ernaehrung.VEGETARISCH]: "VEGETARISCH",
  [Ernaehrung.VEGAN]: "VEGAN",
};

const KONTAKTART: Readonly<Record<number, string>> = {
  [KontaktArt.MOBIL]: "MOBIL",
  [KontaktArt.FESTNETZ]: "FESTNETZ",
  [KontaktArt.EMAIL]: "EMAIL",
};

/**
 * Die taktische Ebene aus dem **ausgeschriebenen** Einheitstyp.
 *
 * Der Bogen fuehrt keine Ebene; die Excel braucht sie fuer das taktische
 * Zeichen (ZDM §2.8). Gelesen wird der Name, nicht der Vokabularcode: Ein
 * Freitext-Einheitstyp einer fremden Organisation („Löschzug",
 * „SEG Sanität") traegt dieselbe Auskunft, und der Code waere dort leer.
 *
 * Die Reihenfolge ist bedeutsam: „Zugtrupp" enthaelt „Zug", und „Fachgruppe"
 * enthaelt „Gruppe". Geprueft wird deshalb vom Spezielleren zum Allgemeinen.
 */
const EBENEN_MUSTER: readonly (readonly [RegExp, string])[] = [
  [/zugtrupp/i, "ZUGTRUPP"],
  [/gro(ß|ss)verband/i, "GROSSVERBAND"],
  [/abteilung/i, "ABTEILUNG"],
  [/bereitschaft/i, "BEREITSCHAFT"],
  [/staffel/i, "STAFFEL"],
  [/trupp/i, "TRUPP"],
  [/gruppe/i, "GRUPPE"],
  [/\bzug\b|löschzug|loeschzug/i, "ZUG"],
];

/**
 * Leitet die taktische Ebene aus einem Einheitstyp ab.
 *
 * **Ein Vorschlag, keine Tatsache.** Was der Adapter nicht erkennt, wird
 * `UNBESTIMMT` — ZDM §2.8 fuehrt den Wert genau fuer „keine Spalte gefuellt",
 * und ein Fehlschlag an einem fremden Einheitstyp waere der falsche Umgang
 * mit einer Meldung, die trotzdem gilt.
 */
export function ebeneAusEinheitstyp(text: string | undefined): string {
  if (text === undefined) return "UNBESTIMMT";
  for (const [muster, ebene] of EBENEN_MUSTER) {
    if (muster.test(text)) return ebene;
  }
  return "UNBESTIMMT";
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

function vokabelText(wert: VokabularWert | undefined, tabelle?: NameJeCode): string | undefined {
  if (wert === undefined) return undefined;
  if (wert.freitext !== undefined && wert.freitext.length > 0) return wert.freitext;
  if (wert.code === undefined) return undefined;
  const name = tabelle?.(wert.code);
  // Ohne Tabelle bleibt der Code als Text stehen, statt zu verschwinden: Die
  // Meldung sagt etwas, auch wenn dieser Client das Vokabular nicht hat
  // (KONZEPT-EREIGNISSE §3.7, „freie Vokabularwerte").
  return name ?? `#${String(wert.code)}`;
}

/** Ein Nachschlagewerk `code → Name`; injiziert, damit Ring 2 kein Vokabular kennt. */
export type NameJeCode = (code: number) => string | undefined;

export interface Vokabeltabellen {
  readonly einheitstyp?: NameJeCode;
  readonly fahrzeugtyp?: NameJeCode;
  readonly funktion?: NameJeCode;
  readonly hierarchieEbene?: NameJeCode;
  readonly funkrufKennwort?: NameJeCode;
}

function hierarchieAus(
  ebenen: readonly EebHierarchieEbene[],
  tabellen: Vokabeltabellen,
): { art: string; name: string; kurz?: string; telefon?: string; email?: string }[] {
  return ebenen.map((ebene) => ({
    art: vokabelText(ebene.bezeichnung, tabellen.hierarchieEbene) ?? "",
    name: ebene.name,
    ...(ebene.kurz === undefined ? {} : { kurz: ebene.kurz }),
    ...(ebene.telefon === undefined ? {} : { telefon: ebene.telefon }),
    ...(ebene.email === undefined ? {} : { email: ebene.email }),
  }));
}

function kontakteAus(
  kontakte: readonly EebKontakt[],
): { art: string; dienstlich: boolean; wert: string }[] {
  return kontakte
    .filter((k) => typeof k.wert === "string" && k.wert.length > 0)
    .map((k) => ({
      art: KONTAKTART[k.art] ?? "MOBIL",
      dienstlich: k.dienstlich,
      wert: k.wert as string,
    }));
}

/**
 * Der Anzeigename der Einheit: Einheitstyp und die unterste Hierarchieebene.
 *
 * „Bergungsgruppe Oldenburg" statt „Bergungsgruppe" allein — in einer Lage mit
 * fünf Ortsverbaenden waere der Typ fuer sich genommen keine Kennung.
 */
export function bezeichnungAus(bogen: Erfassungsbogen, tabellen: Vokabeltabellen = {}): string {
  const typ = vokabelText(bogen.einheit.einheitsTyp, tabellen.einheitstyp) ?? "Einheit";
  const ort = bogen.einheit.hierarchie[0]?.name;
  return ort === undefined || ort.length === 0 ? typ : `${typ} ${ort}`;
}

/**
 * Das Uebungskennzeichen wandert in die **Bemerkung**.
 *
 * Der Bogen traegt es als eigenes Feld, das Zielmodell nicht: Ob eine Uebung
 * laeuft, sagt dort `einsatz.art` (ZDM §3.2). Eine Einheit aus einem
 * Uebungsbogen kann aber in einem echten Einsatz eintreffen — dann ist der
 * Vermerk das Einzige, was diese Herkunft noch zeigt, und er gehoert
 * mitgefuehrt statt verworfen.
 */
export function bemerkungAus(bogen: Erfassungsbogen): string | undefined {
  const teile = [bogen.uebung === true ? "ÜBUNG (Bogen)" : undefined, bogen.sonstiges]
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  return teile.length === 0 ? undefined : teile.join(" — ");
}

// ---------------------------------------------------------------------------
// Das Ergebnis
// ---------------------------------------------------------------------------

/** Die Nutzlasten, die aus einem Bogen entstehen. */
export interface UebersetzterBogen {
  /** Nutzlast fuer `EinheitGemeldet` (§5.4). */
  readonly einheit: Record<string, unknown>;
  /** Je Person eine Nutzlast fuer `PersonHinzugefuegt` (§5.5). */
  readonly personen: readonly Record<string, unknown>[];
  /** Je Fahrzeug eine Nutzlast fuer `FahrzeugAngelegt` (§5.5). */
  readonly fahrzeuge: readonly Record<string, unknown>[];
  /**
   * Der Wert fuer `SofortbedarfGesetzt` — der **Block selbst**, nicht eine
   * Nutzlast.
   *
   * `SofortbedarfGesetzt` ist Form (a) (§2.2): Seine Nutzlast traegt nur die
   * `einheitId`, der Wert steht im Rahmenfeld `neu`. Ein Adapter, der hier
   * eine Nutzlast baute, laege eine Ebene daneben.
   */
  readonly sofortbedarf?: Record<string, unknown>;
  /** Der Stand des Bogens als Zeitpunkt — die Grundlage der Revisionsreihe (§2.6). */
  readonly stand: Zeitpunkt;
}

export interface UebersetzungsAuftrag {
  readonly einheitId: Id;
  readonly abschnittId: Id;
  /** Ids der Personen, in der Reihenfolge von `bogen.personal`. */
  readonly personIds?: readonly Id[];
  /** Ids der Fahrzeuge, in der Reihenfolge von `bogen.fahrzeuge`. */
  readonly fahrzeugIds?: readonly Id[];
  readonly reihenfolge?: number;
  /** Der fachliche Schluessel fuer die Dublettenerkennung (§5.4.4). */
  readonly einheitSchluessel?: string;
  /** Die Id der Meldung, aus der diese Einheit entstanden ist (§5.8.2). */
  readonly meldungId?: Id;
  readonly tabellen?: Vokabeltabellen;
}

function staerkeDesBogens(bogen: Erfassungsbogen): Staerke {
  const s = staerkeAusBogen(bogen);
  return { fuehrer: s.fuehrer, unterfuehrer: s.unterfuehrer, mannschaft: s.mannschaft };
}

/**
 * Uebersetzt einen Erfassungsbogen in die Nutzlasten des Katalogs.
 *
 * Der Bogen wird zuerst **migriert** (`migriereBogen`): Ein Bogen der Version
 * 6 traegt Felder, die spaeter umbenannt oder ergaenzt wurden, und der
 * Adapter soll nicht zweimal dieselbe Kette pflegen. Der Codec migriert beim
 * Dekodieren ohnehin; dieser Weg hier ist der andere — eine Bogendatei oder
 * ein aus einer PDF gezogener Anhang.
 */
export function uebersetzeBogen(
  roh: Erfassungsbogen,
  auftrag: UebersetzungsAuftrag,
): UebersetzterBogen {
  const bogen = migriereBogen({ ...roh });
  const tabellen = auftrag.tabellen ?? {};
  const bemerkung = bemerkungAus(bogen);
  const einheitstyp = vokabelText(bogen.einheit.einheitsTyp, tabellen.einheitstyp);

  const einheit: Record<string, unknown> = {
    einheitId: auftrag.einheitId,
    abschnittId: auftrag.abschnittId,
    bezeichnung: bezeichnungAus(bogen, tabellen),
    organisation: ORGANISATION[bogen.einheit.organisation] ?? "SONSTIGE",
    hierarchie: hierarchieAus(bogen.einheit.hierarchie, tabellen),
    ebene: ebeneAusEinheitstyp(einheitstyp),
    staerke: staerkeDesBogens(bogen),
    personalErfassung:
      bogen.personalErfassung === PersonalErfassung.NUR_STAERKE ? "NUR_STAERKE" : "VOLLSTAENDIG",
    // Der Bogen kennt keinen Lagestatus — er sagt, wer kommt, nicht was die
    // Einheit gerade tut. `ANGEFORDERT` ist der Wert, mit dem eine Meldung am
    // Meldekopf eintrifft; die Fuehrungsstelle setzt ihn danach von Hand.
    status: "ANGEFORDERT",
    reihenfolge: auftrag.reihenfolge ?? 0,
    // Ob eine Einheit die Fuehrung ihres Abschnitts stellt, entscheidet die
    // Fuehrungsstelle, nicht der Bogen.
    istFuehrungDesAbschnitts: false,
  };
  if (bogen.einheit.organisationName !== undefined) {
    einheit["organisationName"] = bogen.einheit.organisationName;
  }
  if (bogen.einheit.standortRef !== undefined) {
    einheit["standortRef"] = bogen.einheit.standortRef;
  }
  if (bemerkung !== undefined) einheit["bemerkung"] = bemerkung;
  if (auftrag.einheitSchluessel !== undefined) {
    einheit["einheitSchluessel"] = auftrag.einheitSchluessel;
  }
  if (auftrag.meldungId !== undefined) einheit["meldungId"] = auftrag.meldungId;

  const personen = bogen.personal.map((person, i) =>
    uebersetzePerson(person, {
      personId: auftrag.personIds?.[i] ?? `${auftrag.einheitId}-P${String(i + 1)}`,
      einheitId: auftrag.einheitId,
      tabellen,
    }),
  );

  const fahrzeuge = bogen.fahrzeuge.map((fahrzeug, i) => {
    const nutzlast: Record<string, unknown> = {
      fahrzeugId: auftrag.fahrzeugIds?.[i] ?? `${auftrag.einheitId}-F${String(i + 1)}`,
      einheitId: auftrag.einheitId,
      typ: vokabelText(fahrzeug.typ, tabellen.fahrzeugtyp) ?? "Fahrzeug",
      // Der Bogen kennt keinen Fahrzeugstatus; wer gemeldet wird, ist
      // einsatzbereit, bis jemand anderes es sagt.
      status: "EINSATZBEREIT",
    };
    if (fahrzeug.kennzeichen !== undefined) nutzlast["kennzeichen"] = fahrzeug.kennzeichen;
    if (fahrzeug.stanKonform !== undefined) nutzlast["stanKonform"] = fahrzeug.stanKonform;
    if (fahrzeug.aenderungen !== undefined) nutzlast["aenderungen"] = fahrzeug.aenderungen;
    if (fahrzeug.funkrufname !== undefined) {
      nutzlast["funkrufname"] = {
        kennwort:
          vokabelText(fahrzeug.funkrufname.kennwort, tabellen.funkrufKennwort) ?? "Funkrufname",
        eigenerStandort: fahrzeug.funkrufname.eigenerStandort,
        ...(fahrzeug.funkrufname.ort === undefined ? {} : { ort: fahrzeug.funkrufname.ort }),
        teile: fahrzeug.funkrufname.teile,
      };
    }
    return nutzlast;
  });

  const ergebnis: UebersetzterBogen = {
    einheit,
    personen,
    fahrzeuge,
    // **Nicht** `zeitpunktZuIso`: Das liefert `2025-10-15T09:00` — ohne
    // Sekunden und ohne Zonenversatz, und `zZeitpunkt` verlangt beides
    // (§5.1). Der Bogen zaehlt Minuten seit dem 1. Januar 2020 UTC; daraus
    // wird hier ein vollstaendiger Zeitstempel.
    stand: new Date(EEB_EPOCHE_MS + bogen.stand * 60_000).toISOString(),
    ...(bogen.sofortbedarf === undefined
      ? {}
      : { sofortbedarf: { ...bogen.sofortbedarf } }),
  };
  return ergebnis;
}

interface PersonAuftrag {
  readonly personId: Id;
  readonly einheitId: Id;
  readonly tabellen: Vokabeltabellen;
}

/**
 * Uebersetzt eine Person des Bogens.
 *
 * `fahrerlaubnisse` fasst Haupt- und Nebenklassen zusammen und laesst `NONE`
 * weg — das Zielmodell fuehrt eine Liste, der Bogen ein Feld plus eine
 * Nachliste (ZDM §3.4).
 */
function uebersetzePerson(person: EebPerson, auftrag: PersonAuftrag): Record<string, unknown> {
  const fahrerlaubnisse = [person.fahrerlaubnis, ...(person.weitereFahrerlaubnisse ?? [])]
    .filter((klasse) => klasse !== 0)
    .map((klasse) => FAHRERLAUBNIS[klasse] ?? `#${String(klasse)}`);

  const nutzlast: Record<string, unknown> = {
    personId: auftrag.personId,
    einheitId: auftrag.einheitId,
    nachname: person.nachname,
    vorname: person.vorname,
    rolle: ROLLE[person.staerkeRolle] ?? "MANNSCHAFT",
    funktionen: person.funktionen
      .map((f) => vokabelText(f, auftrag.tabellen.funktion))
      .filter((s): s is string => s !== undefined),
    fahrerlaubnisse: [...new Set(fahrerlaubnisse)],
    geschlecht: GESCHLECHT[person.geschlecht] ?? "MAENNLICH",
    ernaehrung: ERNAEHRUNG[person.ernaehrung] ?? "FLEISCH",
    kontakte: kontakteAus(person.kontakte),
    zusatzqualifikationen: person.zusatzqualifikationen
      .map((q) => vokabelText(q, auftrag.tabellen.funktion))
      .filter((s): s is string => s !== undefined),
  };
  return nutzlast;
}

/** Die EU-Klassen des Bogens als Namen (ZDM §3.4). */
const FAHRERLAUBNIS: Readonly<Record<number, string>> = {
  1: "AM",
  2: "A1",
  3: "A2",
  4: "A",
  5: "B",
  6: "BE",
  7: "C1",
  8: "C1E",
  9: "C",
  10: "CE",
  11: "D1",
  12: "D1E",
  13: "D",
  14: "DE",
};
