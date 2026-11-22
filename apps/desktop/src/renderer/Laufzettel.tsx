/**
 * Der Laufzettel des Sichters (KONZEPT-NACHRICHTEN.md §5 „Sichtung", Feld 18
 * bis 20) — er erscheint in der Sicht „Sichter" unter der Liste, sobald eine
 * Nachricht gewählt ist.
 *
 * Quittung mit Uhrzeit (vorbelegt „jetzt") und Handzeichen der Sitzung, die
 * Verteilermatrix als Kästchen der Stellen des Vordrucks plus freie Einträge
 * (eine Verbindungsstelle heißt „Polizei"), je Eintrag die Kopiefarbe, und
 * die Vermerke. Die rote Kopie an S2 ist vorbelegt, aber nicht erzwungen:
 * Eine Führungsstelle ohne S2 schickte sie sonst an einen leeren Stuhl.
 *
 * „Sichten" schreibt `NachrichtGesichtet` mit dem Wert, den der Laufzettel
 * beim Öffnen sah; hat ein anderer Sichter inzwischen gesichtet, weist der
 * Worker ab, statt still zu überschreiben. Solange der Laufzettel offen ist,
 * hält er die weiche Bearbeitungssperre auf die Nachricht; ein zweiter
 * Sichter sieht „wird von … bearbeitet" (§6 „Bearbeitungssperre").
 *
 * Nach den Audits vom 2026-11-17 (Sichter, Sachgebietsleiter):
 * - Der Verteiler ist ein Raster wie auf dem Vordruck (`Verteilerraster.tsx`),
 *   vorbelegt mit S2 rot und den Stellen der Anschrift grün; ohne grünen
 *   Hauptempfänger warnt der Laufzettel (Sichter P1-3, SGL P1-3).
 * - Betreff, Inhalt und Aufnahmevermerk stehen zusammenklappbar über dem
 *   Verteiler: Text und Laufzettel liegen auf Papier auf einem Blatt
 *   (Sichter P1-2).
 * - Nachsichten (Sichter P0-1): Ist die Nachricht schon gesichtet, öffnet der
 *   Laufzettel mit der bisherigen Sichtung als Vorbelegung und als Vorher-Wert,
 *   der Knopf heißt „Nachsichten“.
 * - Sichtet ein anderer, während dieser Laufzettel offen ist (Sichter P0-3),
 *   verschwindet er nicht: Er sagt „Inzwischen von … gesichtet“, nimmt die
 *   fremden Stellen in den Verteiler auf (die Vereinigung) und schreibt mit
 *   der fremden Sichtung als Vorher-Wert — eine Nachsichtung, die bereinigt.
 * - Escape verwirft nur getippte Eingaben des Laufzettels, nach Rückfrage,
 *   und hebt die Auswahl nicht auf (Sichter P3-2).
 * - Der Sperrhinweis nennt Name, Stelle und Handzeichen (Sichter P2-4).
 *
 * Zweite Runde (2026-11-17):
 * - Stellenvorbehalt auch beim Sichten (R2-FaBe P0-1, Entscheidung 13): Eine
 *   Sitzung ohne Stelle Sichter — außer der FmZ ohne besetzten Sichter —
 *   bekommt den Hinweis mit „Trotzdem“, „Sichten“ bleibt bis dahin gesperrt,
 *   und der Schritt trägt den `grund`. Weist der Worker mit `brauchtGrund`
 *   ab, erscheint der Hinweis ebenso.
 * - Bei Vorrang Blitz oder Sofort ohne grüne Kopie hält der erste Klick an
 *   (R2-FM P1-2): Der Knopf heißt dann „Trotzdem nur an S2“ (bzw. an die
 *   gewählten Stellen), erst der zweite Klick sichtet.
 * - `fokus` (R2-FM P1-2, R2-Si P2): Öffnet „Ich sichte jetzt selbst“ den
 *   Laufzettel, rollt er in den Blick und setzt den Fokus auf die Quittung.
 *
 * Nachzug (`Laufzettelzusatz.tsx`): „Sichten (3)“ mit dem Verteiler in Worten
 * neben dem Knopf (Sichter P1-3, R2-Si P3-3, R2-SGL P3-5), der Vorschlag
 * „wie zuletzt bei diesem Absender“ aus `verlauf` (Sichter P1-3) und die
 * Marke „Ersatzsichtung“ im Kopf (R2-Si P2-1).
 */

import { useEffect, useRef, useState } from "react";

import { datumZeitGruppe, kanonischeSerialisierung, projektion, type KanonischerWert, type Nachrichtenzeile, type Sichtungsvermerk } from "@s1/domaene";

import { nachrichtenentwurfFehler, nachrichtSichten } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Absendervorschlag, Ersatzmarke, sichtknopftext, verteilerkurz, zuletztBeiAbsender } from "./Laufzettelzusatz.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { useLaden } from "./laden.js";
import { dtg, handzeichenPflicht, stellenname, zeitAusEingabe } from "./nachrichtenformate.js";
import { brauchtGrund, useStellenvorbehalt } from "./Stellenvorbehalt.js";
import { sperrtext, sperrerMitStelle, useSperreHalten } from "./useBearbeitungssperre.js";
import { Verteilermatrix, hauptempfaengerWarnung, verteilerAusAnschrift, verteilerDesAusgangs, type Verteilerwahl } from "./Verteilerraster.js";

/** Wie oft die ungetippte Quittungszeit nachgeführt wird; beim Sichten gilt ohnehin die Zeit des Drückens. */
const QUITTUNG_TAKT_MS = 15_000;

/** Die Quittungszeit: die getippte, sonst die Zeit des Drückens (Sichter P3-1). */
export function quittungszeitpunkt(vonHand: boolean, getippt: string | undefined, jetzt: Date = new Date()): string | undefined {
  return vonHand ? getippt : jetzt.toISOString();
}

/** Die Rückfrage bei Escape mit getippten Eingaben im Laufzettel. */
export const TEXT_LAUFZETTEL_VERWERFEN = "Eingaben im Laufzettel verwerfen? Escape noch einmal verwirft sie; die Auswahl bleibt.";

export interface LaufzettelEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  readonly aufGesichtet: () => void;
  /** Additiv (R2-FM P1-2): beim Öffnen in den Blick rollen und die Quittung fokussieren. */
  readonly fokus?: boolean;
  /** Additiv (Sichter P1-3): die Nachweisung, aus der „wie zuletzt bei diesem Absender“ kommt. */
  readonly verlauf?: readonly Nachrichtenzeile[];
  /** Additiv (R2-FM P2-5): Der Sichter ist besetzt, aber säumig — die FmZ sichtet als Ersatzsichter ohne „Trotzdem“. */
  readonly saeumig?: boolean;
}

/** Die Empfänger ohne grüne Kopie für den zweiten Klick: „S2“ oder „S2, S1“ (R2-FM P1-2). */
export function ohneHauptempfaengerKnopf(verteiler: readonly Verteilerwahl[]): string {
  const namen = verteiler.map((v) => stellenname(v.stelle));
  return namen.length === 0 ? "Trotzdem ohne Verteiler" : `Trotzdem nur an ${namen.join(", ")}`;
}

/** Der Verteiler beim Öffnen: der geltende (bei zwei Sichtungen die Vereinigung), sonst aus der Anschrift. */
function verteilerBeimOeffnen(zeile: Nachrichtenzeile, fuestName: string | undefined): readonly Verteilerwahl[] {
  // 2026-11-21: Den beförderten Ausgang verteilt der Sichter an S2 (rot) und den Verfasser (grün).
  if (zeile.sichtung === undefined && zeile.richtung === "AUSGANG" && !zeile.gespraechsnotiz) return verteilerDesAusgangs(projektion.verfasserstelleAus(zeile.funktion, zeile.absender));
  if (zeile.sichtung === undefined) return verteilerAusAnschrift(zeile.anschrift, fuestName);
  return zeile.verteiler.length > 0 ? zeile.verteiler.map((m) => ({ stelle: m.stelle, kopie: m.kopie })) : zeile.sichtung.verteiler.map((v) => ({ stelle: v.stelle, kopie: v.kopie ?? "BLAU" }));
}

/** Der eigene Verteiler mit den Stellen, die nur die fremde Sichtung hat (die Vereinigung, Sichter P0-3). */
export function vereinigt(eigen: readonly Verteilerwahl[], fremd: Sichtungsvermerk): readonly Verteilerwahl[] {
  const dazu = fremd.verteiler.filter((v) => !eigen.some((e) => e.stelle === v.stelle)).map((v) => ({ stelle: v.stelle, kopie: v.kopie ?? "BLAU" }));
  return [...eigen, ...dazu];
}

/** „Inzwischen von Si gesichtet, Verteiler: S2 (rot), S4 (grün); Sie können nachsichten." */
export function fremdeSichtungText(fremd: Sichtungsvermerk): string {
  const liste = fremd.verteiler.map((v) => `${stellenname(v.stelle)} (${v.kopie === "GRUEN" ? "grün" : v.kopie === "ROT" ? "rot" : "blau"})`).join(", ");
  return `Inzwischen von ${fremd.handzeichen} gesichtet, Verteiler: ${liste || "keiner"}. Ihre Eingaben bleiben, die fremden Stellen sind dazugenommen; Sie können nachsichten.`;
}

function gleich(a: unknown, b: unknown): boolean {
  return kanonischeSerialisierung(a as KanonischerWert) === kanonischeSerialisierung(b as KanonischerWert);
}

/** Ein beförderter Ausgang (keine Gesprächsnotiz) — ihn verteilt der Sichter an S2 und den Verfasser. */
function istVerteilterAusgang(zeile: Nachrichtenzeile): boolean {
  return zeile.richtung === "AUSGANG" && !zeile.gespraechsnotiz;
}

/** „Ausgang · befördert Funk 211005NOV26 Ka (Fm2) an OV Wildeshausen · Nr. 7 · weitergegeben Lf“. */
export function ausgangskopf(zeile: Nachrichtenzeile): string {
  const b = zeile.befoerderung;
  const fm = zeile.vorschlag?.fernmelder.trim() ?? "";
  const teile = [
    "Ausgang",
    b === undefined ? "nicht befördert" : `befördert ${projektion.mittelWort(b.mittel)} ${dtg(b.zeitpunkt)} ${b.handzeichen}${fm === "" ? "" : ` (${fm})`}${zeile.gegenstelle === undefined ? "" : ` an ${zeile.gegenstelle}`}`,
    zeile.nummer === undefined ? "ohne Nummer" : `Nr. ${String(zeile.nummer)}`,
    ...(zeile.weitergabe === undefined ? [] : [`weitergegeben ${zeile.weitergabe.handzeichen}`]),
  ];
  return teile.join(" · ");
}

/**
 * Review Runde 2: Beim Ausgang gehören S2 (rot, Lage und Tagebuch) und der
 * Verfasser (grün) in den Verteiler — fehlt einer, warnt der Laufzettel; mit
 * dem zweiten Klick geht es trotzdem.
 */
export function ausgangsverteilerWarnung(zeile: Nachrichtenzeile, verteiler: readonly Verteilerwahl[]): string | undefined {
  const fehlt: string[] = [];
  if (!verteiler.some((v) => v.stelle === "S2")) fehlt.push("S2 (rot, Lage und Tagebuch)");
  const verfasser = projektion.verfasserstelleAus(zeile.funktion, zeile.absender);
  if (verfasser !== undefined && verfasser !== "S2" && !verteiler.some((v) => v.stelle === verfasser)) fehlt.push(`${stellenname(verfasser)} (grün, Verfasser)`);
  return fehlt.length === 0 ? undefined : `Beim Ausgang fehlt im Verteiler: ${fehlt.join(", ")}.`;
}

/** Betreff, Inhalt und Aufnahmevermerk über dem Verteiler (Sichter P1-2). */
function Inhaltsblick({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element {
  return (
    <details className="laufzettelinhalt" open>
      <summary>
        {zeile.betreff === "" ? "(ohne Betreff)" : zeile.betreff}
        {zeile.aufnahme !== undefined && <span className="nebenwert"> · Eingang {dtg(zeile.aufnahme.zeitpunkt)} {zeile.aufnahme.handzeichen}</span>}
        {/* Review 2026-11-21: Beim Ausgang sieht der Sichter, dass und wie er übermittelt ist. */}
        {istVerteilterAusgang(zeile) && <span className="nebenwert"> · {ausgangskopf(zeile)}</span>}
      </summary>
      <pre className="vordruckinhalt">{zeile.inhalt}</pre>
    </details>
  );
}

function useLaufzettelwerte(zeile: Nachrichtenzeile, handzeichen: string) {
  const fuestName = useLaden((z) => z.lagebild?.stammdaten?.fuestName);
  const [quittung, setzeQuittung] = useState(() => datumZeitGruppe(new Date()));
  const [zeichen, setzeZeichen] = useState(handzeichen);
  const [verteiler, setzeVerteiler] = useState<readonly Verteilerwahl[]>(() => verteilerBeimOeffnen(zeile, fuestName));
  const [vermerke, setzeVermerke] = useState(zeile.sichtung?.vermerke ?? "");
  const [angefasst, setzeAngefasst] = useState(false);
  // Sichter P3-1: Die Quittungszeit läuft mit, solange niemand sie getippt hat; wer drei Minuten
  // verteilt, quittiert mit der Zeit des Drückens, nicht der des Aufschlagens.
  const [quittungVonHand, setzeQuittungVonHand] = useState(false);
  useEffect(() => {
    if (quittungVonHand) return undefined;
    const zeitgeber = setInterval(() => setzeQuittung(datumZeitGruppe(new Date())), QUITTUNG_TAKT_MS);
    return () => clearInterval(zeitgeber);
  }, [quittungVonHand]);
  const zuruecksetzen = (): void => {
    setzeQuittungVonHand(false);
    setzeQuittung(datumZeitGruppe(new Date()));
    setzeZeichen(handzeichen);
    setzeVerteiler(verteilerBeimOeffnen(zeile, fuestName));
    setzeVermerke(zeile.sichtung?.vermerke ?? "");
    setzeAngefasst(false);
  };
  const fasse = <T,>(setzer: (wert: T) => void) => (wert: T): void => {
    setzeAngefasst(true);
    setzer(wert);
  };
  const quittungSetzen = fasse((wert: string): void => {
    setzeQuittungVonHand(true);
    setzeQuittung(wert);
  });
  return { fuestName, quittung, quittungVonHand, zeichen, verteiler, vermerke, angefasst, setzeVerteiler, zuruecksetzen, setze: { quittung: quittungSetzen, zeichen: fasse(setzeZeichen), verteiler: fasse(setzeVerteiler), vermerke: fasse(setzeVermerke) } };
}

/**
 * Der Vorher-Wert der Sichtung (§2.2a): die, die beim Öffnen galt — oder die
 * fremde, die inzwischen kam (Sichter P0-3). Dann nimmt der Verteiler die
 * fremden Stellen auf, und `fremd` trägt sie für den Hinweis.
 */
function useVorherSichtung(zeile: Nachrichtenzeile, setzeVerteiler: React.Dispatch<React.SetStateAction<readonly Verteilerwahl[]>>) {
  const [vorher, setzeVorher] = useState<Sichtungsvermerk | null>(zeile.sichtung ?? null);
  const [fremd, setzeFremd] = useState<Sichtungsvermerk | undefined>(undefined);
  // Die eigene Sichtung ist kein „inzwischen von …“.
  const selbstGeschrieben = useRef(false);
  useEffect(() => {
    const jetzt = zeile.sichtung;
    if (selbstGeschrieben.current || jetzt === undefined || gleich(jetzt, vorher)) return;
    setzeFremd(jetzt);
    setzeVorher(jetzt);
    setzeVerteiler((bisher) => vereinigt(bisher, jetzt));
  }, [zeile.sichtung, vorher, setzeVerteiler]);
  return { vorher, fremd, merkeSelbst: (): void => {
      selbstGeschrieben.current = true;
    },
  };
}

/** Escape bleibt im Laufzettel: Draußen höbe es die Auswahl auf (Sichter P3-2); verworfen wird nach Rückfrage. */
function useEscVerwerfen(angefasst: boolean, zuruecksetzen: () => void) {
  const [frage, setzeFrage] = useState(false);
  const beiTaste = (e: React.KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    e.preventDefault();
    if (!angefasst) return;
    setzeFrage(!frage);
    if (frage) zuruecksetzen();
  };
  return { frage, beiTaste };
}

/** In den Blick rollen und den Fokus auf die Quittung setzen (R2-FM P1-2); jsdom kennt `scrollIntoView` nicht immer. */
function useFokusBeimOeffnen(fokus: boolean): React.RefObject<HTMLElement | null> {
  const wurzel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!fokus || wurzel.current === null) return;
    wurzel.current.scrollIntoView?.({ block: "start" });
    wurzel.current.querySelector<HTMLInputElement>(".dtgfeld input")?.focus();
  }, [fokus]);
  return wurzel;
}

/**
 * Die Freigabe des Knopfs: Stellenvorbehalt (R2-FaBe P0-1) und, bei Vorrang
 * ohne grüne Kopie, der zweite Klick (R2-FM P1-2). Die Bestätigung gilt nur
 * für den Verteiler, den sie sah; wer ein Kästchen ändert, wird neu gefragt.
 */
function useSichtfreigabe(zeile: Nachrichtenzeile, verteiler: readonly Verteilerwahl[], warnung: string | undefined, nurLesen: boolean, saeumig = false) {
  const vorbehalt = useStellenvorbehalt("sichtung", !nurLesen, saeumig);
  const [bestaetigtFuer, setzeBestaetigtFuer] = useState<string | undefined>(undefined);
  const schluessel = JSON.stringify(verteiler);
  const mitVorrang = warnung !== undefined && zeile.vorrangstufe < 2;
  const bestaetigt = mitVorrang && bestaetigtFuer === schluessel;
  return {
    vorbehalt,
    mitVorrang,
    bestaetigt,
    /** Wahr, wenn dieser Klick nur bestätigt und noch nicht sichtet. */
    halteAn: (): boolean => {
      if (!mitVorrang || bestaetigt) return false;
      setzeBestaetigtFuer(schluessel);
      return true;
    },
  };
}

export function Laufzettel({ zeile, handzeichen, nurLesen, aufGesichtet, fokus = false, verlauf = [], saeumig = false }: LaufzettelEigenschaften): React.JSX.Element {
  const w = useLaufzettelwerte(zeile, handzeichen);
  const wurzel = useFokusBeimOeffnen(fokus);
  const versuch = useAnlegeversuch();
  const { vorher, fremd, merkeSelbst } = useVorherSichtung(zeile, w.setzeVerteiler);
  const esc = useEscVerwerfen(w.angefasst, w.zuruecksetzen);
  useSperreHalten(nurLesen ? undefined : zeile.id);
  const peers = useLaden((z) => z.lagebild?.peers);
  const sperrer = sperrerMitStelle(peers ?? [], zeile.id);

  const getippt = zeitAusEingabe(w.quittung);
  const zeitpunkt = quittungszeitpunkt(w.quittungVonHand, getippt);
  const fehlt = zeitpunkt === undefined ? "Uhrzeit der Quittung lesbar eintragen" : handzeichenPflicht(w.zeichen);
  // Die Anschrift zählt mit: „S2“ als Anschrift ist ein Hauptempfänger (zweiter Durchlauf, Punkt 3).
  // Review 2026-11-21: Ein beförderter Ausgang braucht keinen Hauptempfänger — er ist erledigt, die Kopien sind Rückmeldung.
  const warnung = istVerteilterAusgang(zeile) ? ausgangsverteilerWarnung(zeile, w.verteiler) : hauptempfaengerWarnung(w.verteiler, zeile.anschrift, w.fuestName);
  const freigabe = useSichtfreigabe(zeile, w.verteiler, warnung, nurLesen, saeumig);
  const { vorbehalt } = freigabe;
  const grund = fehlt ?? (vorbehalt.gesperrt ? "Erst „Trotzdem“ wählen" : undefined);

  const sichten = async (): Promise<void> => {
    if (freigabe.halteAn()) return;
    // Die Zeit des Drückens, nicht die beim Aufschlagen (Sichter P3-1).
    const gilt = quittungszeitpunkt(w.quittungVonHand, getippt);
    if (gilt === undefined) return;
    const entwurf = nachrichtSichten(zeile.id, vorher, { zeitpunkt: gilt, handzeichen: w.zeichen, verteiler: w.verteiler, vermerke: w.vermerke });
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(vorbehalt.grund === undefined ? entwurf : { ...entwurf, grund: vorbehalt.grund });
    if (brauchtGrund(ergebnis)) vorbehalt.erzwinge();
    if (ergebnis?.art !== "geschrieben") return;
    merkeSelbst();
    aufGesichtet();
  };

  const nachsichten = vorher !== null;
  return (
    <section ref={wurzel} className="laufzettel vordruckteil" aria-label="Laufzettel des Sichters" onKeyDown={esc.beiTaste}>
      <h3>
        Laufzettel {nachsichten ? "· Nachsichtung" : ""}
        <Ersatzmarke zeile={zeile} />
      </h3>
      {vorbehalt.hinweis}
      {sperrer !== undefined && <p className="warnung">{sperrtext(sperrer)}</p>}
      {fremd !== undefined && (
        <p className="warnung" role="alert">
          {fremdeSichtungText(fremd)}
        </p>
      )}
      <Inhaltsblick zeile={zeile} />
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Quittung" wert={w.quittung} aufAenderung={w.setze.quittung} hilfe="Gilt die Zeit beim Drücken von „Sichten“, solange Sie sie nicht ändern" />
        <label>
          Handzeichen
          <input value={w.zeichen} maxLength={4} onChange={(e) => w.setze.zeichen(e.target.value)} />
        </label>
      </div>
      {zeile.sichtung === undefined && !istVerteilterAusgang(zeile) && <Absendervorschlag vorschlag={zuletztBeiAbsender(verlauf, zeile)} aufUebernehmen={w.setze.verteiler} gesperrt={nurLesen} />}
      <Verteilermatrix verteiler={w.verteiler} aufAenderung={w.setze.verteiler} />
      <label>
        Vermerke
        <textarea rows={2} value={w.vermerke} onChange={(e) => w.setze.vermerke(e.target.value)} />
      </label>
      {warnung !== undefined && (
        <p className="warnung" role={freigabe.mitVorrang ? "alert" : undefined}>
          {warnung}
          {freigabe.mitVorrang && " Bei Vorrang sichtet erst ein zweiter Klick."}
        </p>
      )}
      {esc.frage && (
        <p className="warnung" role="alert">
          {TEXT_LAUFZETTEL_VERWERFEN}
        </p>
      )}
      {versuch.anzeige}
      <div className="maskenknoepfe">
        <button type="button" className="haupt" disabled={nurLesen || grund !== undefined || versuch.gesperrt} onClick={() => void sichten()}>
          {freigabe.bestaetigt ? ohneHauptempfaengerKnopf(w.verteiler) : sichtknopftext(nachsichten, w.verteiler)}
        </button>
        {/* R2-Si P3-3, R2-SGL P3-5: der Verteiler in Worten neben dem Knopf — das Raster kann unter ihm liegen. */}
        <span className="nebenwert verteilerkurz">{w.verteiler.length === 0 ? "kein Empfänger" : verteilerkurz(w.verteiler)}</span>
        {grund !== undefined && <span className="hinweistext bereitgrund">{grund}</span>}
      </div>
    </section>
  );
}
