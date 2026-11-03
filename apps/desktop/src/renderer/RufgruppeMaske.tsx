/**
 * Die Maske „Rufgruppe anlegen" und „Rufgruppe bearbeiten" (KONZEPT-FUNKPLAN.md
 * §5): Betriebsart, Name, Zweck, hört, Gateway, Bereich (optional),
 * Bemerkung. Der Name schlägt Rufgruppen des Standard-Fleetmappings vor
 * (`Rufgruppenvorschlag.tsx`), lässt aber jeden anderen Namen zu.
 *
 * Wie „Unterkunft anlegen": Enter bestätigt, Esc verwirft, die Kennung gilt
 * für die ganze Dialoginstanz (`Anlegeversuch.tsx`). Beim Bearbeiten geht je
 * geändertem Feld ein `RufgruppeGeaendert` hinaus, mit dem Wert, den die
 * Maske beim Öffnen sah; solange sie offen ist, sperrt sie die Rufgruppe für
 * die anderen Arbeitsplätze (`useSperreHalten`).
 *
 * **Aus der Zelle geöffnet** („Neue Rufgruppe anlegen …") setzt die Maske
 * nach der Anlage die neue Gruppe gleich an der Einheit, von der sie kam —
 * die Zeile geht nicht verloren (Option 5b).
 */

import { useState } from "react";

import type { Rufgruppenkarte } from "@s1/domaene";

import { useAnlegeversuch } from "./Anlegeversuch.js";
import { neueId } from "./kennungen.js";
import { Maske } from "./Maske.js";
import { Rufgruppenvorschlag } from "./Rufgruppenvorschlag.js";
import { useSperreHalten } from "./useBearbeitungssperre.js";
import {
  BETRIEBSARTEN,
  RUFGRUPPENFELDER,
  rufgruppeAnlegen,
  rufgruppeDerEinheit,
  rufgruppeGeaendert,
  type Rufgruppenmaskenfeld,
} from "../kontrakt/funkschritte.js";
import type { Entwurf, Funkplanbereich } from "../kontrakt/index.js";

/** Die Einheit, aus deren Zelle die Anlage kam; `vorher` ist ihre gesehene Gruppe. */
export interface Anlagezeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly vorher?: string;
}

export interface RufgruppeMaskeEigenschaften {
  /** Beim Bearbeiten die Rufgruppe, sonst wird angelegt. */
  readonly karte?: Rufgruppenkarte;
  readonly fuer?: Anlagezeile;
  readonly bereiche: readonly Funkplanbereich[];
  readonly aufSchliessen: () => void;
}

type Werte = Record<Rufgruppenmaskenfeld, string>;

const BETRIEBSART_TITEL: Readonly<Record<string, string>> = { TMO: "TMO (Netz)", DMO: "DMO (direkt)", ANALOG: "Analog" };

function startwerte(karte: Rufgruppenkarte | undefined): Werte {
  return {
    betriebsart: karte?.betriebsart ?? "TMO",
    name: karte?.name ?? "",
    zweck: karte?.zweck ?? "",
    hoert: karte?.hoert ?? "",
    gateway: karte?.gateway ?? "",
    abschnittId: karte?.abschnittId ?? "",
    bemerkung: karte?.bemerkung ?? "",
  };
}

const leerAlsNull = (text: string): string | null => (text.trim() === "" ? null : text.trim());

function aenderungen(karte: Rufgruppenkarte, werte: Werte): Entwurf[] {
  const vorher = startwerte(karte);
  return RUFGRUPPENFELDER.filter((feld) => leerAlsNull(werte[feld]) !== leerAlsNull(vorher[feld])).map((feld) =>
    rufgruppeGeaendert(karte.rufgruppeId, feld, leerAlsNull(vorher[feld]), leerAlsNull(werte[feld])),
  );
}

function anlage(rufgruppeId: string, werte: Werte): Entwurf {
  const optional = Object.fromEntries(
    (["zweck", "hoert", "gateway", "abschnittId", "bemerkung"] as const)
      .map((feld) => [feld, werte[feld].trim()] as const)
      .filter(([, wert]) => wert !== ""),
  );
  return rufgruppeAnlegen({ rufgruppeId, betriebsart: werte.betriebsart, name: werte.name.trim(), ...optional });
}

export function RufgruppeMaske({ karte, fuer, bereiche, aufSchliessen }: RufgruppeMaskeEigenschaften): React.JSX.Element {
  const [werte, setzeWerte] = useState<Werte>(() => startwerte(karte));
  const versuch = useAnlegeversuch();
  useSperreHalten(karte?.rufgruppeId);
  const bereit = werte.name.trim().length > 0 && !versuch.gesperrt;

  async function schreibe(): Promise<void> {
    if (karte !== undefined) {
      for (const entwurf of aenderungen(karte, werte)) {
        if ((await versuch.schreibe(entwurf))?.art !== "geschrieben") return;
      }
      aufSchliessen();
      return;
    }
    const rufgruppeId = versuch.kennung(() => neueId("RG"));
    if ((await versuch.schreibe(anlage(rufgruppeId, werte)))?.art !== "geschrieben") return;
    if (fuer !== undefined && (await versuch.schreibe(rufgruppeDerEinheit(fuer.einheitId, fuer.vorher ?? null, rufgruppeId)))?.art !== "geschrieben") return;
    aufSchliessen();
  }

  const setze = (feld: Rufgruppenmaskenfeld, wert: string): void => setzeWerte((bisher) => ({ ...bisher, [feld]: wert }));
  const text = (feld: Rufgruppenmaskenfeld, titel: string): React.JSX.Element => (
    <label>
      {titel}
      <input value={werte[feld]} onChange={(e) => setze(feld, e.target.value)} />
    </label>
  );
  const arten = BETRIEBSARTEN.includes(werte.betriebsart as never) ? BETRIEBSARTEN : [...BETRIEBSARTEN, werte.betriebsart];
  // Ein inzwischen aufgelöster Bereich steht nicht mehr zur Wahl, bleibt aber
  // sichtbar, solange die Gruppe ihn trägt — sonst sähe die Maske „kein Bereich“.
  const fremderBereich = karte?.abschnittId !== undefined && !bereiche.some((b) => b.abschnittId === karte.abschnittId);
  const bereichswahl = fremderBereich ? [...bereiche, { abschnittId: karte?.abschnittId ?? "", name: karte?.bereich ?? "", tiefe: 0 }] : bereiche;

  return (
    <Maske
      titel={karte === undefined ? "Rufgruppe anlegen" : `Rufgruppe „${karte.name}“ bearbeiten`}
      bestaetigungstext={karte === undefined ? "Rufgruppe anlegen" : "Übernehmen"}
      bereit={bereit}
      bereitGrund={werte.name.trim() === "" ? "Namen eintragen" : undefined}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      <label>
        Betriebsart
        <select value={werte.betriebsart} onChange={(e) => setze("betriebsart", e.target.value)}>
          {arten.map((art) => (
            <option key={art} value={art}>
              {BETRIEBSART_TITEL[art] ?? art}
            </option>
          ))}
        </select>
      </label>
      <Rufgruppenvorschlag
        wert={werte.name}
        aufAenderung={(name) => setze("name", name)}
        aufWahl={(eintrag) => setzeWerte((bisher) => ({ ...bisher, name: eintrag.name, betriebsart: "TMO" }))}
      />
      {text("zweck", "Zweck")}
      {text("hoert", "hört")}
      {text("gateway", "Gateway")}
      <label>
        Bereich (optional)
        <select value={werte.abschnittId} onChange={(e) => setze("abschnittId", e.target.value)}>
          <option value="">— kein Bereich —</option>
          {bereichswahl.map((b) => (
            <option key={b.abschnittId} value={b.abschnittId}>
              {`${"  ".repeat(b.tiefe)}${b.name}`}
            </option>
          ))}
        </select>
      </label>
      {text("bemerkung", "Bemerkung")}
      {fuer !== undefined && <p className="hinweistext">Nach der Anlage wird „{fuer.einheit}“ dieser Rufgruppe zugeordnet.</p>}
      <p className="hinweistext">
        Der Name ist Freitext wie auf dem Funkgerät. Ein Bereich setzt nichts um; er zeigt nur „Bereich ≠ Gruppe“ an Einheiten anderer Bereiche.
      </p>
      {versuch.anzeige}
    </Maske>
  );
}
