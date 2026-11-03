/**
 * Unteransicht „Sofortbedarf" (4f): die Abarbeitungsliste der Erstmeldungen.
 *
 * Eingetroffen um, Verpflegung für n Personen, Diesel, Benzin, Gemisch,
 * Unterbringung, Ruhezeit, Stand des Bogens und was davon erledigt ist.
 * „Als erledigt melden" ist ein Ereignis je Feld (S4.4) — über die
 * Mehrfachauswahl für mehrere Einheiten auf einmal, für alle Felder mit
 * Bedarf oder ein gewähltes. Erledigte Zeilen bleiben, blass; die
 * Summenzeilen nennen den gemeldeten und den offenen Bedarf.
 */

import { useState } from "react";

import type { Sofortbedarfsliste, Sofortbedarfszeile } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { useNurLesen } from "./Nurlesen.js";
import { kurzzeit } from "./versorgungstext.js";
import { SOFORTBEDARF_FELDER, abarbeitung, type Sofortfeld } from "../kontrakt/versorgungsschritte.js";

const KURZ: Readonly<Record<Sofortfeld, string>> = {
  VERPFLEGUNG: "Verpfl.",
  DIESEL: "Diesel",
  BENZIN: "Benzin",
  GEMISCH: "Gemisch",
  UNTERBRINGUNG: "Unterbr.",
  RUHEZEIT: "Ruhezeit",
};

function janein(wert: boolean, erledigt: boolean): React.JSX.Element {
  if (!wert) return <span className="marke-zustand">nein</span>;
  return <span className={erledigt ? "marke-zustand ok" : "marke-zustand warn"}>{erledigt ? "ja · erledigt" : "ja · offen"}</span>;
}

function Erledigt({ z }: { readonly z: Sofortbedarfszeile }): React.JSX.Element {
  if (z.felder.length === 0) return <>—</>;
  return (
    <>
      {z.felder.map((f, i) => (
        <span key={f} className={z.erledigt[f] === undefined ? "offen" : "erledigt"}>
          {i > 0 ? " · " : ""}
          {KURZ[f]} {z.erledigt[f] === undefined ? "–" : "✓"}
        </span>
      ))}
    </>
  );
}

function Zeile(props: { readonly z: Sofortbedarfszeile; readonly gewaehlt: boolean; readonly umschalten: () => void; readonly nurLesen: boolean }): React.JSX.Element {
  const { z } = props;
  return (
    <tr className={z.vollstaendig ? "blass" : props.gewaehlt ? "gewaehlt" : undefined}>
      <td>
        <input type="checkbox" aria-label={`${z.einheit} wählen`} checked={props.gewaehlt} disabled={props.nurLesen} onChange={props.umschalten} />
      </td>
      <th scope="row">{z.einheit}</th>
      <td>{z.bereich}</td>
      <td className="zahl">{z.eingetroffenAm === undefined ? "—" : kurzzeit(z.eingetroffenAm)}</td>
      <td className="zahl trenner">{z.verpflegungPersonen}</td>
      <td className="zahl trenner">{z.dieselLiter}</td>
      <td className="zahl">{z.benzinLiter}</td>
      <td className="zahl">{z.gemischLiter}</td>
      <td className="trenner">{janein(z.unterbringung, z.erledigt.UNTERBRINGUNG !== undefined)}</td>
      <td>{janein(z.ruhezeit, z.erledigt.RUHEZEIT !== undefined)}</td>
      <td className="trenner zahl">{z.stand === undefined ? "—" : kurzzeit(z.stand)}</td>
      <td className="erledigtspalte">
        <Erledigt z={z} />
      </td>
    </tr>
  );
}

export function VersorgungSofortbedarf({ liste }: { readonly liste: Sofortbedarfsliste }): React.JSX.Element {
  const nurLesen = useNurLesen();
  const bediene = useLaden((z) => z.bediene);
  const [auswahl, setzeAuswahl] = useState<ReadonlySet<string>>(new Set());
  const [feld, setzeFeld] = useState<Sofortfeld | "">("");
  const [ausblenden, setzeAusblenden] = useState(false);
  const zeilen = ausblenden ? liste.zeilen.filter((z) => !z.vollstaendig) : liste.zeilen;
  const umschalten = (id: string): void => {
    setzeAuswahl((bisher) => {
      const neu = new Set(bisher);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  };
  const melde = async (art: "erledigt" | "offen"): Promise<void> => {
    for (const entwurf of abarbeitung(liste.zeilen, auswahl, art, feld === "" ? undefined : feld)) {
      const ergebnis = await bediene(entwurf);
      if (ergebnis?.art !== "geschrieben") return;
    }
    setzeAuswahl(new Set());
  };

  return (
    <div className="karte versorgungskarte">
      <h3>
        Sofortbedarf aus dem Erfassungsbogen{" "}
        <span className="leise">
          · {liste.zeilen.length} Einheiten mit Meldung · {liste.offen.zeilen} offen · {auswahl.size} gewählt
        </span>
      </h3>
      <p className="werkzeugzeile">
        {!nurLesen && (
          <>
            <label className="schalter">
              Feld
              <select value={feld} onChange={(e) => setzeFeld(e.target.value as Sofortfeld | "")}>
                <option value="">alle mit Bedarf</option>
                {SOFORTBEDARF_FELDER.map((f) => (
                  <option key={f} value={f}>
                    {KURZ[f]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="haupt" disabled={auswahl.size === 0} onClick={() => void melde("erledigt")}>
              Als erledigt melden ({auswahl.size})
            </button>
            <button type="button" disabled={auswahl.size === 0} onClick={() => void melde("offen")}>
              Wieder öffnen
            </button>
          </>
        )}
        <button type="button" aria-pressed={ausblenden} onClick={() => setzeAusblenden((b) => !b)}>
          Erledigte ausblenden
        </button>
      </p>
      {liste.zeilen.length === 0 ? (
        <p className="hinweistext">Kein Bogen mit Sofortbedarf übernommen.</p>
      ) : (
        <div className="tabellenrahmen">
          <table className="versorgungstabelle" aria-label="Sofortbedarf">
            <thead>
              <tr>
                <th scope="col" aria-label="Auswahl" />
                <th scope="col">Einheit</th>
                <th scope="col">Bereich</th>
                <th scope="col" className="zahl">Eingetroffen</th>
                <th scope="col" className="zahl trenner">Verpfl. Pers.</th>
                <th scope="col" className="zahl trenner">Diesel l</th>
                <th scope="col" className="zahl">Benzin l</th>
                <th scope="col" className="zahl">Gemisch l</th>
                <th scope="col" className="trenner">Unterbringung</th>
                <th scope="col">Ruhezeit</th>
                <th scope="col" className="trenner">Stand Bogen</th>
                <th scope="col">Erledigt</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <Zeile key={z.einheitId} z={z} gewaehlt={auswahl.has(z.einheitId)} umschalten={() => umschalten(z.einheitId)} nurLesen={nurLesen} />
              ))}
              <tr className="summenzeile">
                <th scope="row" colSpan={4}>
                  Summe gemeldet
                </th>
                <td className="zahl trenner">{liste.summe.verpflegungPersonen}</td>
                <td className="zahl trenner">{liste.summe.dieselLiter}</td>
                <td className="zahl">{liste.summe.benzinLiter}</td>
                <td className="zahl">{liste.summe.gemischLiter}</td>
                <td className="trenner">{liste.summe.unterbringung} ja</td>
                <td>{liste.summe.ruhezeit} ja</td>
                <td className="trenner" colSpan={2} />
              </tr>
              <tr className="summenzeile offenzeile">
                <th scope="row" colSpan={4}>
                  davon offen
                </th>
                <td className="zahl trenner">{liste.offen.verpflegungPersonen}</td>
                <td className="zahl trenner">{liste.offen.dieselLiter}</td>
                <td className="zahl">{liste.offen.benzinLiter}</td>
                <td className="zahl">{liste.offen.gemischLiter}</td>
                <td className="trenner">{liste.offen.unterbringung} offen</td>
                <td>{liste.offen.ruhezeit} offen</td>
                <td className="trenner" colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="hinweistext">
        Der Sofortbedarf ist die Erstmeldung beim Eintreffen (Bogen), kein laufender Verbrauch. „Erledigt“ ist ein Ereignis
        je Feld — Diesel kann erledigt sein und Unterbringung noch nicht; Rückgängig und „Wieder öffnen“ nehmen es zurück.
        Erledigte Zeilen bleiben blass sichtbar.
      </p>
    </div>
  );
}
