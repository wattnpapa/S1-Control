/**
 * Das Blatt „Versorgung" (S4.1, KONZEPT-S4.md §5) — der Arbeitsplatz des S4.
 *
 * Oben das KPI-Band mit den Zahlen des Tages aus `Lagebild.versorgung`,
 * darunter der Umschalter der fünf Unteransichten. Jede Unteransicht ist
 * eine eigene Datei; diese hier holt die Ansicht und verteilt sie.
 *
 * **Nichts wird hier gerechnet.** Die Zahlen kommen aus Ring 2 über das
 * Lagebild (Band) und den Ruf `versorgungAnfordern` (Tabellen); das Blatt
 * setzt nicht auf der Auswahl der Lage auf (`gehoertZurLage` bleibt falsch).
 */

import { useState } from "react";

import { projektion } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { useVersorgungsansicht } from "./useVersorgungsansicht.js";
import { Werkzeuge } from "./Versorgungswerkzeuge.js";
import { VersorgungBereiche } from "./VersorgungBereiche.js";
import { VersorgungSofortbedarf } from "./VersorgungSofortbedarf.js";
import { VersorgungUnterbringung } from "./VersorgungUnterbringung.js";
import { VersorgungVerpflegung } from "./VersorgungVerpflegung.js";
import { VersorgungVorausschau } from "./VersorgungVorausschau.js";
import { mahlzeitText, uhrzeitText } from "./versorgungstext.js";
import type { Versorgungszahlen } from "../kontrakt/index.js";

export const UNTERANSICHTEN = [
  { schluessel: "verpflegung", titel: "Verpflegung" },
  { schluessel: "vorausschau", titel: "Nächste 24 h" },
  { schluessel: "unterbringung", titel: "Unterbringung" },
  { schluessel: "bereiche", titel: "Bereiche · Schichten" },
  { schluessel: "sofortbedarf", titel: "Sofortbedarf" },
] as const;

export type Unteransicht = (typeof UNTERANSICHTEN)[number]["schluessel"];

/** Das KPI-Band: sechs Zahlen, „ohne Unterkunft" in Bernstein, sobald größer null. */
export function Kpiband({ zahlen }: { readonly zahlen: Versorgungszahlen | undefined }): React.JSX.Element {
  const naechste = zahlen?.naechste;
  const ohne = zahlen?.ohneZuweisung;
  return (
    <dl className="kpiband" aria-label="Zahlen des Tages">
      <div className="kpi">
        <dd>{naechste?.portionen ?? "—"}</dd>
        <dt>Portionen {naechste === undefined ? "" : `${mahlzeitText(naechste.mahlzeit)} ${uhrzeitText(naechste.zeitpunkt)}`}</dt>
      </div>
      <div className="kpi">
        <dd>{naechste?.vegetarisch ?? "—"}</dd>
        <dt>vegetarisch</dt>
      </div>
      <div className="kpi">
        <dd>{naechste?.vegan ?? "—"}</dd>
        <dt>vegan</dt>
      </div>
      <div className="kpi">
        <dd>{zahlen?.betten.gesamt ?? "—"}</dd>
        <dt>Betten heute Nacht</dt>
      </div>
      <div className={ohne !== undefined && ohne > 0 ? "kpi warn" : "kpi"}>
        <dd>{ohne ?? "—"}</dd>
        <dt>ohne Unterkunft</dt>
      </div>
      <div className="kpi leise">
        <dd>{zahlen === undefined ? "—" : `+${String(zahlen.anmarsch)}`}</dd>
        <dt>Anmarsch (getrennt)</dt>
      </div>
    </dl>
  );
}

export function Versorgung(): React.JSX.Element {
  const akteId = useLaden((z) => z.akteId);
  const lagebild = useLaden((z) => z.lagebild);
  const [ansicht, setzeAnsicht] = useState<Unteransicht>("verpflegung");
  const [stunden, setzeStunden] = useState<24 | 48>(24);
  const abruf = useVersorgungsansicht(akteId, lagebild?.lageZeiger, ansicht === "vorausschau" ? stunden : 24);
  const daten = abruf.ansicht;

  return (
    <section aria-label="Versorgung" className="versorgung">
      <h2>Versorgung</h2>
      <Kpiband zahlen={lagebild?.versorgung} />

      <div className="werkzeugzeile">
        <div className="umschalter" role="group" aria-label="Unteransicht">
          {UNTERANSICHTEN.map((eintrag) => (
            <button
              key={eintrag.schluessel}
              type="button"
              aria-pressed={ansicht === eintrag.schluessel}
              onClick={() => {
                setzeAnsicht(eintrag.schluessel);
              }}
            >
              {eintrag.titel}
            </button>
          ))}
        </div>
        {ansicht === "vorausschau" && (
          <div className="umschalter" role="group" aria-label="Horizont">
            {([24, 48] as const).map((h) => (
              <button key={h} type="button" aria-pressed={stunden === h} onClick={() => setzeStunden(h)}>
                {h} h
              </button>
            ))}
          </div>
        )}
        {daten !== undefined && <Werkzeuge ansicht={ansicht} blatt={daten.blatt} />}
      </div>

      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      {daten === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <>
          {ansicht === "verpflegung" && <VersorgungVerpflegung blatt={daten.blatt} jetzt={Date.parse(daten.jetzt)} />}
          {ansicht === "vorausschau" && (
            <VersorgungVorausschau schau={daten.blatt.vorausschau} jetzt={Date.parse(daten.jetzt)} bestellstand={daten.blatt.bestellstand} />
          )}
          {ansicht === "unterbringung" && <VersorgungUnterbringung bedarf={daten.blatt.unterbringung} belegung={daten.blatt.belegung} />}
          {ansicht === "bereiche" && <VersorgungBereiche blatt={daten.logistik} fussnote={daten.logistikFussnote} />}
          {ansicht === "sofortbedarf" && <VersorgungSofortbedarf liste={daten.blatt.sofortbedarf} />}
        </>
      )}
      <p className="versorgungsfuss">{projektion.VERSORGUNG_ZAEHLREGEL}</p>
    </section>
  );
}
