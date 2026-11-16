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
 */

import { useState } from "react";

import { datumZeitGruppe, type Nachrichtenzeile } from "@s1/domaene";

import { nachrichtenentwurfFehler, nachrichtSichten } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { useLaden } from "./laden.js";
import { KOPIEN, VERTEILERSTELLEN, kopieklasse, stellenname, zeitAusEingabe } from "./nachrichtenformate.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";

/** Ein Eintrag der Verteilermatrix, wie der Laufzettel ihn hält. */
export interface Verteilerwahl {
  readonly stelle: string;
  readonly kopie: string;
}

/** Die Vorbelegung: S2 rot (Lehrunterlage, „rote Kopie immer an S2"), sonst leer. */
export const VERTEILER_VORBELEGUNG: readonly Verteilerwahl[] = [{ stelle: "S2", kopie: "ROT" }];

/** Schaltet eine Stelle im Verteiler an oder aus; neu angekreuzt ist die Kopie grün, S2 rot. */
export function umgeschaltet(verteiler: readonly Verteilerwahl[], stelle: string): readonly Verteilerwahl[] {
  if (verteiler.some((e) => e.stelle === stelle)) return verteiler.filter((e) => e.stelle !== stelle);
  return [...verteiler, { stelle, kopie: stelle === "S2" ? "ROT" : "GRUEN" }];
}

function Verteilerzeile({ eintrag, aufKopie, aufWeg }: { readonly eintrag: Verteilerwahl; readonly aufKopie: (kopie: string) => void; readonly aufWeg: () => void }): React.JSX.Element {
  return (
    <li className={kopieklasse(eintrag.kopie)}>
      <label className="kaestchen">
        <input type="checkbox" checked onChange={aufWeg} />
        {stellenname(eintrag.stelle)}
      </label>
      <select aria-label={`Kopie für ${stellenname(eintrag.stelle)}`} value={eintrag.kopie} onChange={(e) => aufKopie(e.target.value)}>
        {KOPIEN.map((k) => (
          <option key={k.wert} value={k.wert}>
            {k.titel}
          </option>
        ))}
      </select>
    </li>
  );
}

function Verteilermatrix({ verteiler, aufAenderung }: { readonly verteiler: readonly Verteilerwahl[]; readonly aufAenderung: (neu: readonly Verteilerwahl[]) => void }): React.JSX.Element {
  const [frei, setzeFrei] = useState("");
  const ohneGewaehlte = VERTEILERSTELLEN.filter((s) => !verteiler.some((e) => e.stelle === s));
  const freiDazu = (): void => {
    const name = frei.trim();
    if (name === "" || name.includes("/")) return;
    if (!verteiler.some((e) => e.stelle === name)) aufAenderung([...verteiler, { stelle: name, kopie: "BLAU" }]);
    setzeFrei("");
  };
  return (
    <div className="verteilermatrix" role="group" aria-label="Verteiler">
      <ul>
        {verteiler.map((eintrag) => (
          <Verteilerzeile
            key={eintrag.stelle}
            eintrag={eintrag}
            aufKopie={(kopie) => aufAenderung(verteiler.map((e) => (e.stelle === eintrag.stelle ? { ...e, kopie } : e)))}
            aufWeg={() => aufAenderung(umgeschaltet(verteiler, eintrag.stelle))}
          />
        ))}
      </ul>
      <div className="kaestchenzeile">
        {ohneGewaehlte.map((stelle) => (
          <label key={stelle} className="kaestchen">
            <input type="checkbox" checked={false} onChange={() => aufAenderung(umgeschaltet(verteiler, stelle))} />
            {stellenname(stelle)}
          </label>
        ))}
        <label>
          Weitere Stelle
          <input value={frei} placeholder="z. B. Polizei" onChange={(e) => setzeFrei(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); freiDazu(); } }} />
        </label>
        <button type="button" onClick={freiDazu} disabled={frei.trim() === ""}>
          Dazu
        </button>
      </div>
    </div>
  );
}

export interface LaufzettelEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  readonly aufGesichtet: () => void;
}

export function Laufzettel({ zeile, handzeichen, nurLesen, aufGesichtet }: LaufzettelEigenschaften): React.JSX.Element {
  const [quittung, setzeQuittung] = useState(() => datumZeitGruppe(new Date()));
  const [zeichen, setzeZeichen] = useState(handzeichen);
  const [verteiler, setzeVerteiler] = useState<readonly Verteilerwahl[]>(() => (zeile.sichtung?.verteiler ?? VERTEILER_VORBELEGUNG));
  const [vermerke, setzeVermerke] = useState(zeile.sichtung?.vermerke ?? "");
  const versuch = useAnlegeversuch();
  // Der gesehene Vorher-Wert: die Sichtung, die beim Öffnen galt (§2.2a).
  const [vorher] = useState(zeile.sichtung ?? null);
  useSperreHalten(nurLesen ? undefined : zeile.id);
  const fremd = useFremdsperren().von(zeile.id);
  const zeitpunkt = zeitAusEingabe(quittung);
  const fehlt = zeitpunkt === undefined ? "Uhrzeit der Quittung lesbar eintragen" : zeichen.trim() === "" ? "Handzeichen eintragen" : undefined;

  const sichten = async (): Promise<void> => {
    if (zeitpunkt === undefined) return;
    const entwurf = nachrichtSichten(zeile.id, vorher, { zeitpunkt, handzeichen: zeichen, verteiler, vermerke });
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art === "geschrieben") aufGesichtet();
  };

  return (
    <section className="laufzettel vordruckteil" aria-label="Laufzettel des Sichters">
      <h3>Laufzettel {vorher === null ? "" : "· 2. Sichtung"}</h3>
      {fremd !== undefined && <p className="warnung">{sperrtext(fremd)}</p>}
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Quittung" wert={quittung} aufAenderung={setzeQuittung} />
        <label>
          Handzeichen
          <input value={zeichen} maxLength={20} onChange={(e) => setzeZeichen(e.target.value)} />
        </label>
      </div>
      <Verteilermatrix verteiler={verteiler} aufAenderung={setzeVerteiler} />
      <label>
        Vermerke
        <textarea rows={2} value={vermerke} onChange={(e) => setzeVermerke(e.target.value)} />
      </label>
      {versuch.anzeige}
      <div className="maskenknoepfe">
        <button type="button" className="haupt" disabled={nurLesen || fehlt !== undefined || versuch.gesperrt} onClick={() => void sichten()}>
          Sichten
        </button>
        {fehlt !== undefined && <span className="hinweistext bereitgrund">{fehlt}</span>}
      </div>
    </section>
  );
}
