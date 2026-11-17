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
 */

import { useEffect, useRef, useState } from "react";

import { datumZeitGruppe, kanonischeSerialisierung, type KanonischerWert, type Nachrichtenzeile, type Sichtungsvermerk } from "@s1/domaene";

import { nachrichtenentwurfFehler, nachrichtSichten } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { useLaden } from "./laden.js";
import { dtg, handzeichenPflicht, stellenname, zeitAusEingabe } from "./nachrichtenformate.js";
import { sperrtext, sperrerMitStelle, useSperreHalten } from "./useBearbeitungssperre.js";
import { Verteilermatrix, hauptempfaengerWarnung, verteilerAusAnschrift, type Verteilerwahl } from "./Verteilerraster.js";

/** Die Rückfrage bei Escape mit getippten Eingaben im Laufzettel. */
export const TEXT_LAUFZETTEL_VERWERFEN = "Eingaben im Laufzettel verwerfen? Escape noch einmal verwirft sie; die Auswahl bleibt.";

export interface LaufzettelEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  readonly aufGesichtet: () => void;
}

/** Der Verteiler beim Öffnen: der geltende (bei zwei Sichtungen die Vereinigung), sonst aus der Anschrift. */
function verteilerBeimOeffnen(zeile: Nachrichtenzeile, fuestName: string | undefined): readonly Verteilerwahl[] {
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

/** Betreff, Inhalt und Aufnahmevermerk über dem Verteiler (Sichter P1-2). */
function Inhaltsblick({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element {
  return (
    <details className="laufzettelinhalt" open>
      <summary>
        {zeile.betreff === "" ? "(ohne Betreff)" : zeile.betreff}
        {zeile.aufnahme !== undefined && <span className="nebenwert"> · Eingang {dtg(zeile.aufnahme.zeitpunkt)} {zeile.aufnahme.handzeichen}</span>}
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
  const zuruecksetzen = (): void => {
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
  return { quittung, zeichen, verteiler, vermerke, angefasst, setzeVerteiler, zuruecksetzen, setze: { quittung: fasse(setzeQuittung), zeichen: fasse(setzeZeichen), verteiler: fasse(setzeVerteiler), vermerke: fasse(setzeVermerke) } };
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

export function Laufzettel({ zeile, handzeichen, nurLesen, aufGesichtet }: LaufzettelEigenschaften): React.JSX.Element {
  const w = useLaufzettelwerte(zeile, handzeichen);
  const versuch = useAnlegeversuch();
  const { vorher, fremd, merkeSelbst } = useVorherSichtung(zeile, w.setzeVerteiler);
  const esc = useEscVerwerfen(w.angefasst, w.zuruecksetzen);
  useSperreHalten(nurLesen ? undefined : zeile.id);
  const peers = useLaden((z) => z.lagebild?.peers);
  const sperrer = sperrerMitStelle(peers ?? [], zeile.id);

  const zeitpunkt = zeitAusEingabe(w.quittung);
  const fehlt = zeitpunkt === undefined ? "Uhrzeit der Quittung lesbar eintragen" : handzeichenPflicht(w.zeichen);
  const warnung = hauptempfaengerWarnung(w.verteiler);

  const sichten = async (): Promise<void> => {
    if (zeitpunkt === undefined) return;
    const entwurf = nachrichtSichten(zeile.id, vorher, { zeitpunkt, handzeichen: w.zeichen, verteiler: w.verteiler, vermerke: w.vermerke });
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    merkeSelbst();
    aufGesichtet();
  };

  const nachsichten = vorher !== null;
  return (
    <section className="laufzettel vordruckteil" aria-label="Laufzettel des Sichters" onKeyDown={esc.beiTaste}>
      <h3>Laufzettel {nachsichten ? "· Nachsichtung" : ""}</h3>
      {sperrer !== undefined && <p className="warnung">{sperrtext(sperrer)}</p>}
      {fremd !== undefined && (
        <p className="warnung" role="alert">
          {fremdeSichtungText(fremd)}
        </p>
      )}
      <Inhaltsblick zeile={zeile} />
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Quittung" wert={w.quittung} aufAenderung={w.setze.quittung} />
        <label>
          Handzeichen
          <input value={w.zeichen} maxLength={4} onChange={(e) => w.setze.zeichen(e.target.value)} />
        </label>
      </div>
      <Verteilermatrix verteiler={w.verteiler} aufAenderung={w.setze.verteiler} />
      <label>
        Vermerke
        <textarea rows={2} value={w.vermerke} onChange={(e) => w.setze.vermerke(e.target.value)} />
      </label>
      {warnung !== undefined && <p className="warnung">{warnung}</p>}
      {esc.frage && (
        <p className="warnung" role="alert">
          {TEXT_LAUFZETTEL_VERWERFEN}
        </p>
      )}
      {versuch.anzeige}
      <div className="maskenknoepfe">
        <button type="button" className="haupt" disabled={nurLesen || fehlt !== undefined || versuch.gesperrt} onClick={() => void sichten()}>
          {nachsichten ? "Nachsichten" : "Sichten"}
        </button>
        {fehlt !== undefined && <span className="hinweistext bereitgrund">{fehlt}</span>}
      </div>
    </section>
  );
}
