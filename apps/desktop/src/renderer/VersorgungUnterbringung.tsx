/**
 * Unteransicht „Unterbringung" (4e): Unterkünfte und Einheiten mit Bedarf.
 *
 * Links die Unterkünfte als Karten mit Belegungsbalken, „Unterkunft anlegen"
 * als Maske. Rechts die Einheiten mit Übernachtungsbedarf (K6) oder
 * Zuweisung: ohne Unterkunft oben mit der Marke in Bernstein, die Zelle
 * „Unterkunft" in der Zeile bearbeitbar. Ruhezeit nur als Ja/Nein
 * (Entscheidung 7). Die Belegungsliste steht seit Runde 6 im Menü „⋯" der
 * Werkzeugzeile (`Versorgungswerkzeuge.tsx`).
 */

import { useState } from "react";

import type { Bedarfszeile, Belegung, Unterbringungsbedarf, Unterkunftskarte } from "@s1/domaene";

import { useNurLesen } from "./Nurlesen.js";
import { UnterkunftMaske } from "./UnterkunftMaske.js";
import { Unterkunftskarten } from "./Unterkunftskarten.js";
import { Zuweisungszelle } from "./Zuweisungszelle.js";
import { schichtText } from "./versorgungstext.js";

function Zustandsmarke({ z }: { readonly z: Bedarfszeile }): React.JSX.Element {
  if (z.anmarsch) return <span className="marke-zustand">Anmarsch</span>;
  if (z.zustand === "ZUGEWIESEN") return <span className="marke-zustand ok">zugewiesen</span>;
  if (z.zustand === "AUFGELOEST") return <span className="marke-zustand warn">Unterkunft aufgelöst</span>;
  return <span className="marke-zustand warn">ohne Unterkunft</span>;
}

function Bedarfstabelle(props: {
  readonly bedarf: Unterbringungsbedarf;
  readonly karten: readonly Unterkunftskarte[];
  readonly nurLesen: boolean;
}): React.JSX.Element {
  const { bedarf } = props;
  if (bedarf.zeilen.length === 0) return <p className="hinweistext">Keine Einheit meldet Übernachtungsbedarf.</p>;
  return (
    <table className="versorgungstabelle" aria-label="Übernachtungsbedarf">
      <thead>
        <tr>
          <th scope="col">Einheit</th>
          <th scope="col">Bereich</th>
          <th scope="col">Schicht</th>
          <th scope="col" className="zahl trenner">ÜN m</th>
          <th scope="col" className="zahl">w</th>
          <th scope="col" className="zahl">d</th>
          <th scope="col" className="trenner">Ruhezeit</th>
          <th scope="col">Unterkunft</th>
          <th scope="col">Zustand</th>
        </tr>
      </thead>
      <tbody>
        {bedarf.zeilen.map((z) => (
          <tr key={z.einheitId} className={z.anmarsch ? "anmarschzeile" : undefined}>
            <th scope="row">{z.einheit}</th>
            <td>{z.bereich}</td>
            <td>{schichtText(z.schicht)}</td>
            <td className="zahl trenner">{z.m}</td>
            <td className="zahl">{z.w}</td>
            <td className="zahl">{z.d}</td>
            <td className="trenner">{z.ruhezeit ? "ja" : "—"}</td>
            <Zuweisungszelle zeile={z} karten={props.karten} nurLesen={props.nurLesen} />
            <td>
              <Zustandsmarke z={z} />
            </td>
          </tr>
        ))}
        <tr className="summenzeile">
          <th scope="row" colSpan={3}>
            Summe Einsatzbereiche
          </th>
          <td className="zahl trenner">{bedarf.summe.m}</td>
          <td className="zahl">{bedarf.summe.w}</td>
          <td className="zahl">{bedarf.summe.d}</td>
          <td className="trenner" colSpan={3}>
            {bedarf.anmarsch.einheiten > 0 ? `Anmarsch getrennt: ${String(bedarf.anmarsch.gesamt)} Betten` : ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function VersorgungUnterbringung({
  bedarf,
  belegung,
}: {
  readonly bedarf: Unterbringungsbedarf;
  readonly belegung: Belegung;
}): React.JSX.Element {
  const nurLesen = useNurLesen();
  const [maske, setzeMaske] = useState<{ readonly unterkunft?: Unterkunftskarte } | undefined>(undefined);
  const geltend = belegung.unterkuenfte.filter((u) => !u.aufgeloest).length;
  return (
    <div className="unterbringungsflaeche">
      <section className="karte versorgungskarte" aria-label="Unterkünfte">
        <h3>
          Unterkünfte{" "}
          <span className="leise">
            · {geltend} · {belegung.kapazitaet} Plätze · {belegung.belegt} belegt
          </span>
        </h3>
        {!nurLesen && (
          <p className="kartenknoepfe">
            <button type="button" className="haupt" onClick={() => setzeMaske({})}>
              Unterkunft anlegen
            </button>
          </p>
        )}
        <Unterkunftskarten karten={belegung.unterkuenfte} nurLesen={nurLesen} aufAendern={(k) => setzeMaske({ unterkunft: k })} />
        <p className="hinweistext">
          Eine Zuweisung über die Kapazität wird nicht verweigert, sondern an der Karte mit „⚠ überbelegt“ gezeigt.
          Kapazität ist eine Zahl für alle (Entscheidung 2).
        </p>
      </section>
      <section className="karte versorgungskarte" aria-label="Einheiten mit Übernachtungsbedarf">
        <h3>
          Einheiten mit Übernachtungsbedarf{" "}
          <span className="leise">
            · {bedarf.summe.einheiten} Einheiten · {bedarf.summe.gesamt} Betten · ohne Unterkunft{" "}
            {belegung.ohneZuweisung.koepfe}
          </span>
        </h3>
        <Bedarfstabelle bedarf={bedarf} karten={belegung.unterkuenfte} nurLesen={nurLesen} />
        <p className="hinweistext">
          Bedarf (K6): „Unterbringung ja“ aus dem Bogen, Köpfe nach m/w/d aus den Personen oder dem Override der
          Einheit. Doppelklick auf „Unterkunft“ wählt die Unterkunft, Enter schreibt, Esc verwirft. Rückgängig nimmt
          die Zuweisung zurück.
        </p>
      </section>
      {maske !== undefined && (
        <UnterkunftMaske {...(maske.unterkunft === undefined ? {} : { unterkunft: maske.unterkunft })} aufSchliessen={() => setzeMaske(undefined)} />
      )}
    </div>
  );
}
