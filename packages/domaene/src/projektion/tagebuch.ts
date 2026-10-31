/**
 * Das Einsatztagebuch als Projektion des Ereignisstroms (M3.3).
 *
 * KONZEPT-EREIGNISSE.md §5.9.1 legt drei Dinge fest, und alle drei bestimmen
 * den Zuschnitt dieser Datei:
 *
 *  1. **Jedes fachliche Ereignis erzeugt eine Zeile.** `EtbEintragErfasst` ist
 *     der frei getippte Zusatz, nicht die Quelle des Tagebuchs.
 *  2. **Gerendert wird aus den Ereignissen, nicht aus dem Zustand.** Der
 *     Zustand hält je Feld zwei Beobachtungen; das Tagebuch braucht alle. Wer
 *     es aus dem Zustand projiziert, zeigt bei drei Änderungen zwei Zeilen.
 *  3. **Die Zeilen tragen den fachlichen `zeitpunkt`, geordnet wird nach
 *     `hlc`** (§2.6, „zwei Ordnungen, die nie vermischt werden").
 *
 * Der Zustand kommt trotzdem hinzu, aber nur für **Namen**: „EA Nord" statt
 * `EA-7f3c`. Das ist Anzeige und keine Ordnung — fehlt der Name, steht die Id
 * da, und die Zeile bleibt lesbar.
 *
 * **Die beiden Verwaltungsereignisse der Speicherschicht erscheinen nicht**
 * (§5.9.1). Sie werden hier nicht gefiltert, sondern erreichen diese Funktion
 * gar nicht: Der Aktendienst nimmt sie schon nicht in die Faltung auf.
 */

import { KATALOG, type Katalogeintrag } from "../katalog/index.js";
import type { EingehendesEreignis } from "../fold.js";
import { hlcAlsText, vergleicheHlc, type Hlc } from "../hlc.js";
import type { EreignisId } from "../ereignis.js";
import type { Id, Staerke } from "../werte.js";
import type { Zustand } from "../zustand.js";
import {
  einsatzArtTitel,
  schichtTitel,
  schichtmodellTitel,
  statusTitel,
  zeitpunktText,
} from "../beschriftungen.js";
import { auftragsname, einheitsteilAnlagesatz, fahrzeugname } from "./tagebuch-einheitsteile.js";
import { anforderungsbezug, anforderungsname, anforderungssatz } from "./tagebuch-anforderung.js";
import { klartextsatz } from "./tagebuch-klartext.js";

// ---------------------------------------------------------------------------
// Die Wortliste
// ---------------------------------------------------------------------------

/**
 * Was eine Ereignisart im Klartext heißt.
 *
 * Eine **geschlossene** Liste über dem Katalog, und ein Prüffall hält sie
 * vollständig: Eine Art ohne Eintrag erschiene im Tagebuch mit ihrem
 * technischen Namen — für eine Führungsstelle, die das Tagebuch nach dem
 * Einsatz als Nachweis führt, ist das kein Eintrag, sondern ein Rätsel.
 *
 * Die Formulierungen sind Partizipien und keine Sätze: Sie werden unten mit
 * Gegenstand und Werten zu einem Satz zusammengesetzt, und ein fertiger Satz
 * ließe sich dort nicht mehr um „von X auf Y" ergänzen.
 */
export const ART_TEXT: Readonly<Record<string, string>> = {
  // §5.2 Einsatz
  EinsatzAngelegt: "Einsatz angelegt",
  EinsatzStammdatenGeaendert: "Stammdaten geändert",
  KostenParameterGeaendert: "Kostenparameter geändert",
  EinsatzBeendet: "Einsatz beendet",
  EinsatzWiedereroeffnet: "Einsatz wiedereröffnet",
  EinsatzArchiviert: "Einsatz archiviert",
  ArchivierungZurueckgenommen: "Archivierung zurückgenommen",
  // §5.3 Abschnitt
  AbschnittAngelegt: "Abschnitt angelegt",
  AbschnittUmbenannt: "Abschnitt umbenannt",
  AbschnittTypGeaendert: "Abschnittstyp geändert",
  AbschnittUmgehaengt: "Abschnitt umgehängt",
  AbschnittUmsortiert: "Abschnitt umsortiert",
  AbschnittBemerkungGesetzt: "Bemerkung des Abschnitts gesetzt",
  AbschnittZeichenGesetzt: "Taktisches Zeichen gesetzt",
  AbschnittAufgeloest: "Abschnitt aufgelöst",
  AbschnittWiederhergestellt: "Abschnitt wiederhergestellt",
  // §5.4 Einheit
  EinheitGemeldet: "Einheit gemeldet",
  EinheitStammdatenGeaendert: "Stammdaten geändert",
  StaerkeGeaendert: "Stärke geändert",
  StatusGesetzt: "Status gesetzt",
  SchichtGesetzt: "Schicht gesetzt",
  ZeitpunktGesetzt: "Zeitpunkt gesetzt",
  EinheitVerschoben: "Einheit verschoben",
  EinheitUmsortiert: "Einheit umsortiert",
  EinheitArchiviert: "Einheit archiviert",
  LogistikGesetzt: "Logistikangabe gesetzt",
  SofortbedarfGesetzt: "Sofortbedarf gesetzt",
  PsaBedarfGesetzt: "PSA-Bedarf gesetzt",
  EinheitAufgeteilt: "Einheit aufgeteilt",
  EinheitZusammengefuehrt: "Einheiten zusammengeführt",
  EinheitEntfernt: "Einheit entfernt",
  EinheitWiederhergestellt: "Einheit wiederhergestellt",
  // §5.5 Fahrzeug und Person
  FahrzeugAngelegt: "Fahrzeug angelegt",
  FahrzeugGeaendert: "Fahrzeug geändert",
  FahrzeugVerschoben: "Fahrzeug verschoben",
  FahrzeugEinheitGewechselt: "Fahrzeug einer anderen Einheit zugeordnet",
  FahrzeugEntfernt: "Fahrzeug entfernt",
  FahrzeugWiederhergestellt: "Fahrzeug wiederhergestellt",
  PersonHinzugefuegt: "Person hinzugefügt",
  PersonGeaendert: "Person geändert",
  PersonEntfernt: "Person entfernt",
  PersonWiederhergestellt: "Person wiederhergestellt",
  // §5.6 Auftrag und Anforderung
  AuftragErfasst: "Auftrag erfasst",
  AuftragBeendet: "Auftrag beendet",
  AuftragZurueckgenommen: "Auftrag zurückgenommen",
  AnforderungAngelegt: "Anforderung angelegt",
  AnforderungGeaendert: "Anforderung geändert",
  AbloesungZugesagt: "Zusage erfasst",
  ZusageZurueckgenommen: "Zusage zurückgenommen",
  AnforderungErledigt: "Anforderung erledigt",
  ErledigungZurueckgenommen: "Erledigung zurückgenommen",
  AnforderungStorniert: "Anforderung storniert",
  StornoZurueckgenommen: "Stornierung zurückgenommen",
  // §5.7 Führungsstelle
  DienstpostenAngelegt: "Dienstposten angelegt",
  DienstpostenGeaendert: "Dienstposten geändert",
  DienstpostenBesetzt: "Dienstposten besetzt",
  DienstpostenEntfernt: "Dienstposten entfernt",
  DienstpostenWiederhergestellt: "Dienstposten wiederhergestellt",
  SchichtplanEintragGesetzt: "Schichtplan geändert",
  // §5.8 EEB-Meldungen und Anhänge
  EebMeldungEmpfangen: "Erfassungsbogen empfangen",
  EebMeldungZugeordnet: "Erfassungsbogen zugeordnet",
  EebMeldungUebernommen: "Erfassungsbogen übernommen",
  EebMeldungUebernahmeZurueckgenommen: "Übernahme des Erfassungsbogens zurückgenommen",
  EebMeldungAbgelehnt: "Erfassungsbogen abgelehnt",
  EebMeldeStatusGesetzt: "Meldestatus gesetzt",
  AnhangHinzugefuegt: "Anhang hinzugefügt",
  AnhangEntfernt: "Anhang entfernt",
  AnhangWiederhergestellt: "Anhang wiederhergestellt",
  // §5.9 Einsatztagebuch
  EtbEintragErfasst: "Tagebucheintrag",
  EtbEintragBerichtigt: "Tagebucheintrag berichtigt",
  KorrekturVon: "Berichtigung",
};

/** Wie ein Feldname im Satz heißt — für die Arten, die ihr Feld in der Nutzlast tragen. */
export const FELD_TEXT: Readonly<Record<string, string>> = {
  bezeichnung: "Bezeichnung",
  organisation: "Organisation",
  organisationName: "Organisationsname",
  hierarchie: "Herkunft",
  fuestKennung: "FüSt-Kennung",
  ebene: "Gliederungsebene",
  bemerkung: "Bemerkung",
  personalErfassung: "Personalerfassung",
  einheitSchluessel: "Kennung des Erfassungsbogens",
  erreichbarkeitOverride: "Erreichbarkeit",
  fuehrungskraft: "Führungskraft",
  taktischesZeichen: "taktisches Zeichen",
  istFuehrungDesAbschnitts: "Führung des Abschnitts",
  verfuegbarBis: "Verfügbarkeit",
  eingetroffenAm: "Eintreffen",
  einsatzendeAm: "Einsatzende",
  rueckfuehrungAm: "Rückführung",
  weiblich: "Weiblich",
  divers: "Divers",
  vegetarisch: "Vegetarisch",
  vegan: "Vegan",
  uebernachtungM: "Übernachtung (m)",
  uebernachtungW: "Übernachtung (w)",
  uebernachtungD: "Übernachtung (d)",
  name: "Name",
  art: "Art",
  ort: "Ort",
  beginn: "Beginn",
  schichtmodell: "Schichtmodell",
  fuestName: "Führungsstelle",
  uebergeordneteFuestName: "übergeordnete Führungsstelle",
};

// ---------------------------------------------------------------------------
// Die Zeile
// ---------------------------------------------------------------------------

export interface Tagebuchzeile {
  readonly ereignisId: EreignisId;
  readonly typ: string;
  /** Textform fester Stellenzahl (§3.2 Speicher) — die Ordnung, nicht die Anzeige. */
  readonly hlcText: string;
  /** ISO-8601 des schreibenden Rechners; Anzeige, nie Ordnung (§2.6). */
  readonly wanduhr: string;
  /** Die fachliche Zeit, wo die Art eine trägt (§2.5); sonst abwesend. */
  readonly zeitpunkt?: string;
  readonly akteur: string;
  readonly rechner: string;
  readonly clientId: string;
  /** Der lesbare Satz — die Spalte, auf die es der Führungsstelle ankommt. */
  readonly satz: string;
  readonly grund?: string;
  /** §6 U1: gesetzt, wenn diese Zeile eine Kompensation ist. */
  readonly undoOf?: EreignisId;
  /** §5.9.2 U4: gesetzt, wenn diese Zeile eine Berichtigung ist. */
  readonly korrekturVon?: EreignisId;
  /** Für den Filter „nur diese Einheit" (DoD M3.3). */
  readonly einheitId?: Id;
  /** Für den Filter „nur dieser Abschnitt". */
  readonly abschnittId?: Id;
}

function alsSatzwert(wert: unknown): string {
  if (wert === undefined) return "—";
  if (wert === null) return "(leer)";
  if (typeof wert === "string") return wert === "" ? "(leer)" : wert;
  if (typeof wert === "number") return String(wert);
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  if (istStaerke(wert)) {
    const st = wert;
    return `${String(st.fuehrer)}/${String(st.unterfuehrer)}/${String(st.mannschaft)}`;
  }
  if (Array.isArray(wert)) return wert.map(alsSatzwert).join(", ");
  if (typeof wert === "object") {
    return Object.entries(wert as Record<string, unknown>)
      .map(([schluessel, inhalt]) => `${schluessel}: ${alsSatzwert(inhalt)}`)
      .join(", ");
  }
  return String(wert);
}

function istStaerke(wert: unknown): wert is Staerke {
  if (typeof wert !== "object" || wert === null) return false;
  const kandidat = wert as Record<string, unknown>;
  return (
    typeof kandidat["fuehrer"] === "number" &&
    typeof kandidat["unterfuehrer"] === "number" &&
    typeof kandidat["mannschaft"] === "number"
  );
}

function nutzlastfeld(ereignis: EingehendesEreignis, schluessel: string): unknown {
  const nutzlast = ereignis.nutzlast;
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  return (nutzlast as Record<string, unknown>)[schluessel];
}

function alsId(wert: unknown): Id | undefined {
  return typeof wert === "string" && wert.length > 0 ? wert : undefined;
}

/**
 * Der Name des Gegenstands, über den die Zeile spricht.
 *
 * Aus dem Zustand und mit der Id als Rückfall. Der Rückfall ist der Regelfall
 * und kein Notnagel: Ein Tagebuch, das über einen Einsatz von acht Stunden
 * gerendert wird, enthält Zeilen zu Einheiten, die längst entfernt sind — und
 * §5.4.5 lässt sie im Zustand stehen, gerade damit hier ein Name steht.
 */
function gegenstand(zustand: Zustand, eintrag: Katalogeintrag, id: Id | undefined): string {
  if (id === undefined) return "";
  switch (eintrag.entitaet) {
    case "einheit":
      return feldtext(zustand.einheiten[id]?.bezeichnung) ?? id;
    case "abschnitt":
      return feldtext(zustand.abschnitte[id]?.name) ?? id;
    case "fahrzeug":
      return fahrzeugname(zustand, id);
    case "auftrag":
      return auftragsname(zustand, id);
    case "person": {
      const person = zustand.personen[id];
      const nachname = feldtext(person?.nachname);
      if (nachname === undefined) return id;
      return `${feldtext(person?.vorname) ?? ""} ${nachname}`.trim();
    }
    // Die Archivierung führt ihren Eintrag unter der Ereignis-Id (§7.2) — im
    // Tagebuch spricht sie trotzdem über den Einsatz und nicht über eine Kennung.
    case "einsatz":
    case "archivierungen":
      return feldtext(zustand.einsatz?.name) ?? id;
    case "anforderung":
      return anforderungsname(zustand, id);
    default:
      return id;
  }
}

/**
 * Liest ein Feld, das **fehlen** darf, obwohl der Typ es nicht sagt.
 *
 * `FahrzeugZustand.bezeichnung` steht in `zustand.ts` als `Feld<string>` ohne
 * Fragezeichen; im Katalog ist `bezeichnung` aber optional (§5.5). Ein
 * Fahrzeug, das nur seinen Typ meldet — und die Prüfdaten enthalten solche —,
 * hat die Beobachtung gar nicht. `fahrzeug?.bezeichnung.wert` schützte dann
 * das Fahrzeug und nicht das Feld, und das Tagebuch stürzte an seiner ersten
 * Fahrzeugzeile ab: Die Ansicht blieb leer, und in den Hinweisen stand
 * „Cannot read properties of undefined (reading 'wert')". Derselbe Befund
 * am Zielmodell wie F-B1 in `tabelle.ts`, und dieselbe Antwort: abfangen,
 * nicht heilen.
 */
function feldtext(feld: { readonly wert: unknown } | undefined): string | undefined {
  return typeof feld?.wert === "string" ? feld.wert : undefined;
}

/** Welches Feld eine Art setzt — fest oder aus der Nutzlast (§5.1, `Feldwahl`). */
function feldname(ereignis: EingehendesEreignis, eintrag: Katalogeintrag): string | undefined {
  const feld = eintrag.feld;
  if (feld === undefined) return undefined;
  if (feld.art === "fest") return feld.pfad;
  const ausNutzlast = nutzlastfeld(ereignis, feld.schluessel);
  return typeof ausNutzlast === "string" ? ausNutzlast : undefined;
}

/** „A“, „A und B“, „A, B und C“ — für die Liste der aufgegangenen Einheiten. */
function aufzaehlung(namen: readonly string[]): string {
  if (namen.length <= 1) return namen.join("");
  return `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1] as string}`;
}

/**
 * „Einheiten zusammengeführt: A und B aufgegangen in C“. Die Quellen stehen
 * in der Nutzlast (`quellen[].einheitId`), das Ziel ist der Gegenstand.
 */
function zusammenfuehrungssatz(
  zustand: Zustand,
  eintrag: Katalogeintrag,
  ereignis: EingehendesEreignis,
  ziel: string,
): string {
  const roh = nutzlastfeld(ereignis, "quellen");
  const namen = (Array.isArray(roh) ? roh : [])
    .map((q) => alsId((q as Record<string, unknown> | null)?.["einheitId"]))
    .filter((id): id is Id => id !== undefined)
    .map((id) => gegenstand(zustand, eintrag, id));
  const kopf = ART_TEXT["EinheitZusammengefuehrt"] ?? "Einheiten zusammengeführt";
  return namen.length === 0 ? `${kopf}: aufgegangen in ${ziel}` : `${kopf}: ${aufzaehlung(namen)} aufgegangen in ${ziel}`;
}

/**
 * Baut den lesbaren Satz.
 *
 * Zusammengesetzt und nicht je Art ausformuliert: 70 Arten mit je einem
 * eigenen Satz wären 70 Stellen, an denen eine Katalogänderung nachzuziehen
 * ist — und der Katalog ist die Quelle, an der Form, Feld und Entität schon
 * stehen (§5.1). Der Zusammenbau liest sie ab.
 */
export function tagebuchsatz(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  eintrag: Katalogeintrag,
): string {
  const kopf = ART_TEXT[ereignis.typ] ?? ereignis.typ;
  const id = alsId(nutzlastfeld(ereignis, eintrag.idFeld));
  const name = gegenstand(zustand, eintrag, id);
  const betreff = name === "" ? kopf : `${name}: ${kopf}`;

  // Der frei getippte Eintrag ist der einzige, dessen Text schon der Satz ist.
  if (ereignis.typ === "EtbEintragErfasst" || ereignis.typ === "EtbEintragBerichtigt") {
    const text = nutzlastfeld(ereignis, "text");
    return typeof text === "string" ? `${kopf}: ${text}` : kopf;
  }

  // Form (c): Aufteilen und Zusammenführen sprechen über zwei Einheiten.
  if (ereignis.typ === "EinheitAufgeteilt") {
    const quelle = gegenstand(zustand, eintrag, alsId(nutzlastfeld(ereignis, "quellEinheitId")));
    const staerke = alsSatzwert(nutzlastfeld(ereignis, "abgeteilteStaerke"));
    return `${quelle}: ${kopf} — ${staerke} nach ${name}`;
  }
  if (ereignis.typ === "EinheitZusammengefuehrt") {
    return zusammenfuehrungssatz(zustand, eintrag, ereignis, name);
  }

  // Anfordern, zusagen, eintreffen: Zeiten und Einheiten als Wörter
  // (`tagebuch-anforderung.ts`), nicht als Schlüssel und ISO-Zeit.
  if (eintrag.entitaet === "anforderung") {
    const satz = anforderungssatz(zustand, ereignis);
    if (satz !== undefined) return satz;
  }

  // Form (b): eine Anlage. Der Wert steht in der Nutzlast, nicht in `neu`.
  // Auftrag, Fahrzeug und Person nennen ihre Angaben mit — ohne sie stünde
  // dort nur eine Kennung (`tagebuch-einheitsteile.ts`).
  if (eintrag.form === "b") return einheitsteilAnlagesatz(zustand, ereignis, kopf) ?? betreff;

  // Vorgänge, bei denen „vorher → nachher“ nur Kennungen zeigte: Klartext.
  const klar = klartextsatz(zustand, ereignis, betreff);
  if (klar !== undefined) return klar;

  // Form (a): ein Feld, und der Wert steht im Rahmen (§2.2).
  const feld = feldname(ereignis, eintrag);
  const beschriftung = feld === undefined ? undefined : (FELD_TEXT[feld] ?? feld);
  const von = "vorher" in ereignis ? satzwertMitWort(ereignis.typ, ereignis.vorher, feld) : "—";
  const auf = satzwertMitWort(ereignis.typ, ereignis.neu, feld);
  const feldteil = beschriftung === undefined || eintrag.feld?.art === "fest" ? "" : ` (${beschriftung})`;
  const funkzeit = nutzlastfeld(ereignis, "ereignisZeit");
  const zeitteil = typeof funkzeit === "string" ? ` — Fachliche Zeit ${zeitpunktText(funkzeit)}` : "";
  return `${betreff}${feldteil}: ${von} → ${auf}${zeitteil}`;
}

/**
 * Status und Schicht stehen im Tagebuch als Wort der Excel, nicht als Schlüssel:
 * „Anmarsch → Einsatz“ liest sich, „ANMARSCH → IM_EINSATZ“ wird entziffert.
 * Dasselbe gilt für die Stammdaten des Einsatzes: Art und Schichtmodell als
 * Wort, der Beginn als „TT.MM.JJJJ HH:MM“ statt als ISO-Zeichenkette.
 */
function satzwertMitWort(typ: string, wert: unknown, feld: string | undefined): string {
  if (typeof wert !== "string") return alsSatzwert(wert);
  if (typ === "StatusGesetzt") return statusTitel(wert);
  if (typ === "SchichtGesetzt") return schichtTitel(wert);
  if (typ === "EinsatzStammdatenGeaendert") return stammdatenwortFuer(feld, wert);
  // Das Ende eines Auftrags ist ein Zeitpunkt; „30.10.2026 16:00“ liest
  // sich, ein ISO-Zeitpunkt wird entziffert.
  // Dasselbe für das Ende des Einsatzes, in beide Richtungen.
  if (typ === "AuftragBeendet" || typ === "EinsatzBeendet" || typ === "EinsatzWiedereroeffnet") {
    return zeitpunktText(wert);
  }
  return alsSatzwert(wert);
}

function stammdatenwortFuer(feld: string | undefined, wert: string): string {
  if (feld === "art") return einsatzArtTitel(wert);
  if (feld === "schichtmodell") return schichtmodellTitel(wert);
  if (feld === "beginn") return zeitpunktText(wert);
  return alsSatzwert(wert);
}

/**
 * Zu welcher Einheit und zu welchem Abschnitt gehört diese Zeile.
 *
 * Der Filter „je Einheit und Abschnitt" der DoD von M3.3 braucht beides, und
 * die Zuordnung ist nicht immer die Entität des Katalogeintrags: Ein
 * `FahrzeugEinheitGewechselt` spricht über ein Fahrzeug und gehört trotzdem in
 * das Tagebuch **beider** Einheiten. Zugeordnet wird deshalb über die Ids in
 * der Nutzlast, ergänzt um den Abschnitt, in dem die Einheit **zum Zeitpunkt
 * der Anzeige** steht — nicht den, in dem sie damals stand: Das Tagebuch wird
 * gefiltert, um eine Lage zu verstehen, die jetzt gilt.
 */
function bezug(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  eintrag: Katalogeintrag,
): { einheitId?: Id; abschnittId?: Id } {
  const einheitId =
    alsId(nutzlastfeld(ereignis, "einheitId")) ??
    (eintrag.entitaet === "einheit" ? alsId(nutzlastfeld(ereignis, eintrag.idFeld)) : undefined) ??
    (eintrag.entitaet === "anforderung" ? anforderungsbezug(zustand, ereignis) : undefined);
  const abschnittAusNutzlast =
    alsId(nutzlastfeld(ereignis, "abschnittId")) ??
    (eintrag.entitaet === "abschnitt" ? alsId(nutzlastfeld(ereignis, eintrag.idFeld)) : undefined);
  const abschnittId =
    abschnittAusNutzlast ?? (einheitId === undefined ? undefined : zustand.einheiten[einheitId]?.wirksamerAbschnittId);
  return {
    ...(einheitId === undefined ? {} : { einheitId }),
    ...(abschnittId === undefined ? {} : { abschnittId }),
  };
}

/** Die fachliche Zeit einer Art, sofern sie eine trägt (§2.5). */
const ZEITFELDER = ["ereignisZeit", "zeitpunkt", "aufgeloestAm", "empfangenAm", "hinzugefuegtAm", "angefordertAm", "von"] as const;

function fachlicheZeit(ereignis: EingehendesEreignis): string | undefined {
  // Ein geänderter Einsatzbeginn ist der **Wert** der Zeile und nicht ihre
  // fachliche Zeit: Die Änderung geschah jetzt, nicht zum neuen Beginn.
  if (ereignis.typ === "EinsatzStammdatenGeaendert") return undefined;
  for (const feld of ZEITFELDER) {
    const wert = nutzlastfeld(ereignis, feld);
    if (typeof wert === "string") return wert;
  }
  // Das Eintreffen einer Anforderung trägt seine Zeit im Wert (`erledigtAm`).
  if (ereignis.typ === "AnforderungErledigt") {
    const am = (ereignis.neu as { erledigtAm?: unknown } | null | undefined)?.erledigtAm;
    if (typeof am === "string") return am;
  }
  // Die Arten mit fester fachlicher Zeit tragen sie in `neu` (§2.5):
  // `ZeitpunktGesetzt`, `EinsatzBeendet`, `AbschnittAufgeloest`.
  if (typeof ereignis.neu === "string" && /^\d{4}-\d{2}-\d{2}T/.test(ereignis.neu)) return ereignis.neu;
  return undefined;
}

/**
 * Der Name des Gegenstands, über den ein Ereignis spricht — „TZ“, „Zug A“ —
 * oder leer, wenn die Art keinen nennt. Die Rücknahme nennt ihn vor dem
 * Ausführen, damit niemand einen Schritt zurücknimmt, den er nicht meint.
 */
export function ereignisgegenstand(zustand: Zustand, ereignis: EingehendesEreignis): string {
  const eintrag = KATALOG.get(ereignis.typ);
  if (eintrag === undefined) return "";
  return gegenstand(zustand, eintrag, alsId(nutzlastfeld(ereignis, eintrag.idFeld)));
}

/**
 * Baut eine Zeile aus einem Ereignis.
 *
 * Scheitert der Bau an einem fehlerhaften Ereignis, steht an seiner Stelle
 * ein „Beschädigter Eintrag“ — das Ereignis bleibt im Protokoll, das
 * Tagebuch der übrigen bleibt lesbar.
 */
export function tagebuchzeile(zustand: Zustand, ereignis: EingehendesEreignis): Tagebuchzeile {
  try {
    return baueTagebuchzeile(zustand, ereignis);
  } catch {
    return {
      ereignisId: ereignis.id,
      typ: ereignis.typ,
      hlcText: hlcAlsText(ereignis.hlc),
      wanduhr: ereignis.wanduhr,
      akteur: ereignis.akteur.benutzer,
      rechner: ereignis.akteur.host,
      clientId: ereignis.akteur.clientId,
      satz: `Beschädigter Eintrag (${ereignis.typ}) — er lässt sich nicht darstellen, bleibt aber im Protokoll.`,
    };
  }
}

function baueTagebuchzeile(zustand: Zustand, ereignis: EingehendesEreignis): Tagebuchzeile {
  const eintrag = KATALOG.get(ereignis.typ);
  if (eintrag === undefined) {
    // §3.7: Eine unbekannte Art wird nach `unbekannt` gefaltet — und sie
    // erscheint trotzdem im Tagebuch. Sie zu verschweigen hieße, dem Bediener
    // eine Änderung vorzuenthalten, die auf seinem Bildschirm wirkt.
    return {
      ereignisId: ereignis.id,
      typ: ereignis.typ,
      hlcText: hlcAlsText(ereignis.hlc),
      wanduhr: ereignis.wanduhr,
      akteur: ereignis.akteur.benutzer,
      rechner: ereignis.akteur.host,
      clientId: ereignis.akteur.clientId,
      satz: `Unbekannte Ereignisart ${ereignis.typ} — diese Fassung kann sie nicht anzeigen.`,
      ...(ereignis.grund === undefined ? {} : { grund: ereignis.grund }),
    };
  }
  const zeit = fachlicheZeit(ereignis);
  return {
    ereignisId: ereignis.id,
    typ: ereignis.typ,
    hlcText: hlcAlsText(ereignis.hlc),
    wanduhr: ereignis.wanduhr,
    ...(zeit === undefined ? {} : { zeitpunkt: zeit }),
    akteur: ereignis.akteur.benutzer,
    rechner: ereignis.akteur.host,
    clientId: ereignis.akteur.clientId,
    satz: tagebuchsatz(zustand, ereignis, eintrag),
    ...(ereignis.grund === undefined ? {} : { grund: ereignis.grund }),
    ...(ereignis.undoOf === undefined ? {} : { undoOf: ereignis.undoOf }),
    ...(ereignis.korrekturVon === undefined ? {} : { korrekturVon: ereignis.korrekturVon }),
    ...bezug(zustand, ereignis, eintrag),
  };
}

export interface Tagebuchfilter {
  readonly einheitId?: Id;
  readonly abschnittId?: Id;
  /** Volltext über den Satz, den Akteur und den Grund. */
  readonly suche?: string;
  /** Nur Kompensationen und Berichtigungen — die Spur der Rücknahmen (§6). */
  readonly nurRuecknahmen?: boolean;
}

export function trifftFilter(zeile: Tagebuchzeile, filter: Tagebuchfilter): boolean {
  if (filter.einheitId !== undefined && zeile.einheitId !== filter.einheitId) return false;
  if (filter.abschnittId !== undefined && zeile.abschnittId !== filter.abschnittId) return false;
  if (filter.nurRuecknahmen === true && zeile.undoOf === undefined && zeile.korrekturVon === undefined) {
    return false;
  }
  const suche = filter.suche?.trim().toLocaleLowerCase("de-DE") ?? "";
  if (suche === "") return true;
  return `${zeile.satz} ${zeile.akteur} ${zeile.grund ?? ""}`
    .toLocaleLowerCase("de-DE")
    .includes(suche);
}

/**
 * Ordnet zwei Zeilen — **nach HLC, dann nach Ereignis-Id** (§3.5).
 *
 * Nicht nach Wanduhr und nicht nach fachlicher Zeit. §2.6 hält beide
 * Ordnungen ausdrücklich auseinander: Die Wanduhr eines Rechners mit
 * falscher Uhr sortierte das Tagebuch um, und die fachliche Zeit eines
 * nachgetragenen Eintrags stünde vor Zeilen, die vor ihm geschrieben wurden.
 */
export function vergleicheZeilen(a: { hlc: Hlc; id: EreignisId }, b: { hlc: Hlc; id: EreignisId }): number {
  const nachHlc = vergleicheHlc(a.hlc, b.hlc);
  if (nachHlc !== 0) return nachHlc;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Der Ausschnitt des Tagebuchs, den eine Ansicht zeigt.
 *
 * **Gebaut wird aus den Ereignissen, gefiltert wird beim Bauen.** Das ist
 * teurer als ein vorgehaltener Zeilenspeicher und aus zwei Gründen richtig:
 *
 *  * §5.9.1 verlangt es. Eine Zeile, die beim Eintreffen des Ereignisses
 *    gebaut und danach aufbewahrt wird, trägt den Namen, den die Einheit
 *    **damals** hatte. Nach einer Umbenennung zeigte dieselbe Zeile zwei
 *    verschiedene Namen, je nachdem, wann dieser Arbeitsplatz sie gebaut hat —
 *    und zwei Arbeitsplätze zeigten verschiedene Tagebücher über derselben
 *    Ereignismenge.
 *  * Der Preis ist bekannt und begrenzt. Ein Satz ist eine Handvoll
 *    Zeichenkettenverkettungen; bei 50.000 Ereignissen (§2.6) kostet ein
 *    vollständiger Durchlauf Millisekunden, und er läuft im Worker-Thread,
 *    nicht im Main und nicht im Renderer.
 *
 * Geordnet wird **absteigend**: Eine Führungsstelle sieht zuerst, was zuletzt
 * geschah. Die Ordnung selbst bleibt die aus §3.5 (HLC, dann Ereignis-Id),
 * nur die Richtung ist gedreht.
 */
export function tagebuchausschnitt(
  zustand: Zustand,
  ereignisse: readonly EingehendesEreignis[],
  filter: Tagebuchfilter = {},
  von = 0,
  anzahl?: number,
): { readonly zeilen: readonly Tagebuchzeile[]; readonly gesamtzahl: number; readonly von: number } {
  const geordnet = [...ereignisse].sort((a, b) => -vergleicheZeilen(a, b));
  const zeilen: Tagebuchzeile[] = [];
  const anfang = Math.max(0, von);
  const ende = anzahl === undefined ? Number.POSITIVE_INFINITY : anfang + anzahl;
  let gesamtzahl = 0;
  for (const ereignis of geordnet) {
    const zeile = tagebuchzeile(zustand, ereignis);
    if (!trifftFilter(zeile, filter)) continue;
    if (gesamtzahl >= anfang && gesamtzahl < ende) zeilen.push(zeile);
    gesamtzahl += 1;
  }
  return { zeilen, gesamtzahl, von: anfang };
}
