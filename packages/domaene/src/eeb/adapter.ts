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
  PersonalErfassung,
  EEB_EPOCHE_MS,
  istEinzelperson,
  migriereBogen,
  staerke as staerkeAusBogen,
  type Erfassungsbogen,
  type Fahrzeug as EebFahrzeug,
  type HierarchieEbene as EebHierarchieEbene,
  type Kontakt as EebKontakt,
  type Person as EebPerson,
  type VokabularWert,
} from "@bos/eeb-format";

import type { Id, Staerke, Zeitpunkt } from "../werte.js";
import { ebeneAusEinheitstyp } from "./ebene.js";
import { vokabeltabellenFuer } from "./vokabeltabellen.js";
import {
  ERNAEHRUNG,
  FAHRERLAUBNIS,
  GESCHLECHT,
  KONTAKTART,
  ORGANISATION,
  ROLLE,
  ZEICHENFARBE,
} from "./wertebereiche.js";

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
export function bezeichnungAus(
  bogen: Erfassungsbogen,
  tabellen: Vokabeltabellen = vokabeltabellenFuer(bogen.einheit.organisation),
): string {
  const typ = einheitstypText(bogen, tabellen) ?? "Einheit";
  const ort = bogen.einheit.hierarchie[0]?.name;
  const grund = ort === undefined || ort.length === 0 ? typ : `${typ} ${ort}`;
  // Eine Einzelperson (Schema 13) ist ein Mensch mit Sonderaufgabe, keine
  // Formation: Zwei Baufachberater desselben Ortsverbands hiessen sonst
  // gleich, und in der Lage stuende zweimal dasselbe.
  const person = istEinzelperson(bogen) ? bogen.personal[0] : undefined;
  return person === undefined ? grund : `${grund} (${person.nachname})`;
}

/**
 * Der Einheitstyp als Text — bei einer Einzelperson ersatzweise ihre erste
 * Funktion: Der Bogen traegt dort den Funktionsnamen als Freitext, aber ein
 * Stand, der das Feld leer liess, soll „Fachberater/in" zeigen statt „Einheit".
 */
function einheitstypText(bogen: Erfassungsbogen, tabellen: Vokabeltabellen): string | undefined {
  const typ = vokabelText(bogen.einheit.einheitsTyp, tabellen.einheitstyp);
  if (typ !== undefined || !istEinzelperson(bogen)) return typ;
  return vokabelText(bogen.personal[0]?.funktionen[0], tabellen.funktion);
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
  /**
   * Fehlt das Feld, gelten die Tabellen der Organisation des Bogens
   * (`vokabeltabellenFuer`). Ohne sie stuende `#3` statt „Zugtrupp
   * Technischer Zug" in der Lage.
   */
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
  const tabellen = auftrag.tabellen ?? vokabeltabellenFuer(bogen.einheit.organisation);
  const bemerkung = bemerkungAus(bogen);
  const einheitstyp = einheitstypText(bogen, tabellen);

  const einheit: Record<string, unknown> = {
    einheitId: auftrag.einheitId,
    abschnittId: auftrag.abschnittId,
    bezeichnung: bezeichnungAus(bogen, tabellen),
    organisation: ORGANISATION[bogen.einheit.organisation] ?? "SONSTIGE",
    hierarchie: hierarchieAus(bogen.einheit.hierarchie, tabellen),
    // `PERSON` ist die Ebene des Zielmodells fuer die einzeln anrueckende
    // Kraft (ZDM §2.8); der Bogen sagt es seit Schema 13 ausdruecklich.
    ebene: istEinzelperson(bogen) ? "PERSON" : ebeneAusEinheitstyp(einheitstyp),
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

  const fahrzeuge = bogen.fahrzeuge.map((fahrzeug, i) =>
    uebersetzeFahrzeug(fahrzeug, {
      fahrzeugId: auftrag.fahrzeugIds?.[i] ?? `${auftrag.einheitId}-F${String(i + 1)}`,
      einheitId: auftrag.einheitId,
      tabellen,
    }),
  );

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

interface FahrzeugAuftrag {
  readonly fahrzeugId: Id;
  readonly einheitId: Id;
  readonly tabellen: Vokabeltabellen;
}

/**
 * Uebersetzt ein Fahrzeug des Bogens.
 *
 * Sitzplaetze (Schema 9) und Zeichenfarbe (Schema 13) gehen nur mit, wo der
 * Bogen sie traegt: Ein fehlendes Feld heisst „Richtwert des Typs" bzw.
 * „Farbe der Organisation", und das soll im Zustand auch fehlen.
 */
function uebersetzeFahrzeug(fahrzeug: EebFahrzeug, auftrag: FahrzeugAuftrag): Record<string, unknown> {
  const nutzlast: Record<string, unknown> = {
    fahrzeugId: auftrag.fahrzeugId,
    einheitId: auftrag.einheitId,
    typ: vokabelText(fahrzeug.typ, auftrag.tabellen.fahrzeugtyp) ?? "Fahrzeug",
    // Der Bogen kennt keinen Fahrzeugstatus; wer gemeldet wird, ist
    // einsatzbereit, bis jemand anderes es sagt.
    status: "EINSATZBEREIT",
  };
  if (fahrzeug.kennzeichen !== undefined) nutzlast["kennzeichen"] = fahrzeug.kennzeichen;
  if (fahrzeug.stanKonform !== undefined) nutzlast["stanKonform"] = fahrzeug.stanKonform;
  if (fahrzeug.aenderungen !== undefined) nutzlast["aenderungen"] = fahrzeug.aenderungen;
  if (fahrzeug.sitzplaetze !== undefined) nutzlast["sitzplaetze"] = fahrzeug.sitzplaetze;
  if (fahrzeug.zeichenfarbe !== undefined) {
    // Wie bei Vokabularcodes: Eine Farbe, die dieser Client nicht kennt,
    // bleibt als Zahl stehen, statt zu verschwinden (§3.7).
    nutzlast["zeichenfarbe"] =
      ZEICHENFARBE[fahrzeug.zeichenfarbe] ?? `#${String(fahrzeug.zeichenfarbe)}`;
  }
  if (fahrzeug.funkrufname !== undefined) {
    nutzlast["funkrufname"] = {
      kennwort:
        vokabelText(fahrzeug.funkrufname.kennwort, auftrag.tabellen.funkrufKennwort) ?? "Funkrufname",
      eigenerStandort: fahrzeug.funkrufname.eigenerStandort,
      ...(fahrzeug.funkrufname.ort === undefined ? {} : { ort: fahrzeug.funkrufname.ort }),
      teile: fahrzeug.funkrufname.teile,
    };
  }
  return nutzlast;
}

/**
 * Ersatz fuer einen leeren Namen. Der Bogen laesst beide Felder leer, wenn
 * eine Position gemeldet wird, aber noch niemand darauf steht (Ausbildung,
 * „ZF" ohne Helfer); der Katalog verlangt beide (§5.5). Die Zeile bleibt
 * sichtbar — mit Funktion und Rolle —, statt dass die Meldung daran scheitert.
 */
const OHNE_NAMEN = "(ohne Namen)";
const OHNE_VORNAMEN = "–";

function nameOder(name: string | undefined, ersatz: string): string {
  const geputzt = name?.trim() ?? "";
  return geputzt.length === 0 ? ersatz : geputzt;
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
    nachname: nameOder(person.nachname, OHNE_NAMEN),
    vorname: nameOder(person.vorname, OHNE_VORNAMEN),
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
