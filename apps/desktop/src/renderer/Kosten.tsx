/**
 * Die Kostenübersicht (M5.2).
 *
 * Vorbild sind die Spalten AN bis AW des Blattes „Stärke“
 * (`excel-domaenenmodell.md` §2). Zwei Teile: oben die vier Parameter des
 * Einsatzes, unten die Zeile je Einheit.
 *
 * **Warum die Parameter hier stehen und nicht in den Einstellungen.** Sie
 * gehören zum Einsatz und nicht zum Arbeitsplatz: Zwei Rechner am selben
 * Share müssen dieselben Sätze rechnen, und `Einstellungen` im Kontrakt ist
 * je Rechner. Deshalb sind sie ein Ereignis (§5.2) und keine Einstellung.
 *
 * **Diese Ansicht wird eigens geholt** (M3.7). Sie ist eine Abrechnung und
 * wird selten geöffnet; sie am Lagebild mitzuschieben hieße, bei jeder
 * Statusänderung 150 Zeilen mit acht Zahlen zu übertragen, die niemand
 * ansieht.
 */

import { useEffect, useState } from "react";

import { useLaden } from "./laden.js";
import { useFeldversuch } from "./Feldschreiben.js";
import { Hilfemarke } from "./Hilfemarke.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { KOSTENFELDER, kostenParameter, type Kostenfeld } from "../kontrakt/bedienschritte.js";

/** Die Beschriftungen der vier Parameter, in der Reihenfolge der Vorlage. */
const BESCHRIFTUNG: Readonly<Record<Kostenfeld, string>> = {
  psaKostenProSatz: "Kosten pro Satz PSA (€)",
  vdaProTag: "VDA pro Tag und Kraft (€)",
  ukVerpflegungProTag: "Unterkunft und Verpflegung pro Tag und Kraft (€)",
  geplanteEinsatztage: "Geplante Einsatztage",
};

/**
 * Formatiert einen Betrag für die Anzeige.
 *
 * Zwei Nachkommastellen, Punkt als Tausendertrennung — dieselbe Regel wie in
 * `@s1/ausgaben`, und aus demselben Grund ohne `Intl`: Zwei Rechner mit
 * verschiedenen Gebietsdaten zeigten sonst verschiedene Zahlen.
 */
function euro(betrag: number): string {
  const gerundet = Math.round(betrag * 100);
  const ganze = Math.floor(Math.abs(gerundet) / 100);
  const cent = Math.abs(gerundet) % 100;
  const gruppiert = String(ganze).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${gerundet < 0 ? "−" : ""}${gruppiert},${String(cent).padStart(2, "0")} €`;
}

export function Kosten(): React.JSX.Element {
  const laden = useLaden();
  const holeKosten = laden.holeKosten;

  useEffect(() => {
    void holeKosten();
  }, [holeKosten]);

  const ansicht = laden.kosten;
  if (ansicht === undefined) {
    return (
      <section aria-label="Kosten" className="kosten">
        <p className="hinweistext">Wird geladen …</p>
      </section>
    );
  }

  const blatt = ansicht.blatt;

  return (
    <section aria-label="Kosten" className="kosten">
      <h2>Kosten <Hilfemarke kennung="kosten" /></h2>

      <NurLesenHinweis />

      <h3>Parameter des Einsatzes</h3>
      <table className="parameter">
        <tbody>
          {KOSTENFELDER.map((feld) => (
            <Parameterzeile key={feld} feld={feld} vorher={blatt.parameter[feld]} />
          ))}
        </tbody>
      </table>

      <h3>Kosten je Einheit</h3>
      {blatt.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Einheit geht in die Kostenrechnung ein.</p>
      ) : (
        <table className="kostentabelle">
          <thead>
            <tr>
              <th scope="col">Einheit</th>
              <th scope="col">Bereich</th>
              <th scope="col">Kräfte</th>
              <th scope="col">PSA-Sätze / Tag</th>
              <th scope="col">PSA / Tag</th>
              <th scope="col">VDA + UK / Tag</th>
              <th scope="col">Personentage</th>
              <th scope="col">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {blatt.zeilen.map((zeile) => (
              <tr key={zeile.einheitId}>
                <th scope="row">{zeile.bezeichnung}</th>
                <td>{zeile.abschnittName}</td>
                <td className="zahl">{zeile.koepfe}</td>
                <td className="zahl">{zeile.psaSaetzeProTag}</td>
                <td className="zahl">{euro(zeile.psaProTag)}</td>
                <td className="zahl">{euro(zeile.vdaUkProTag)}</td>
                <td className="zahl">{zeile.personentage}</td>
                <td className="zahl">{euro(zeile.gesamt)}</td>
              </tr>
            ))}
            <tr className="summenzeile">
              <th scope="row" colSpan={2}>
                Summe
              </th>
              <td className="zahl">{blatt.summe.koepfe}</td>
              <td />
              <td className="zahl">{euro(blatt.summe.psaProTag)}</td>
              <td className="zahl">{euro(blatt.summe.vdaUkProTag)}</td>
              <td className="zahl">{blatt.summe.personentage}</td>
              <td className="zahl">{euro(blatt.summe.gesamt)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {blatt.ausgenommen > 0 && (
        <p className="hinweistext">
          {blatt.ausgenommen} Einheit(en) fallen aus der Rechnung: angeforderte und archivierte
          Kräfte zählen in der Abrechnung nicht mit.
        </p>
      )}
    </section>
  );
}

/**
 * Ein Parameter des Einsatzes als Feld mit Entwurf.
 *
 * Der Entwurf bleibt stehen, bis der Dienst das Schreiben bestätigt hat; eine
 * Zahl, die keine ist, wird am Feld benannt und nicht still verworfen.
 */
function Parameterzeile({ feld, vorher }: { readonly feld: Kostenfeld; readonly vorher: number }): React.JSX.Element {
  const einsatzId = useLaden((zustand) => zustand.lagebild?.einsatzId);
  const versuch = useFeldversuch();
  const nurLesen = useNurLesen();
  const [entwurf, setzeEntwurf] = useState<string | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);

  async function uebernimm(): Promise<void> {
    if (entwurf === undefined || einsatzId === undefined) return;
    // Komma als Dezimaltrennzeichen: Wer 180,50 tippt, meint 180,50 — und
    // `Number("180,50")` ist NaN.
    const neu = Number(entwurf.trim().replace(",", "."));
    if (entwurf.trim() === "" || !Number.isFinite(neu) || neu < 0) {
      setzeFehler("Bitte eine Zahl ab 0 eingeben, z. B. 180,50.");
      return;
    }
    setzeFehler(undefined);
    if (neu === vorher) {
      setzeEntwurf(undefined);
      return;
    }
    // §2.2a: `vorher` ist der Wert, den **dieses Fenster** gezeigt hat — nicht
    // der, der gerade gilt. Genau daran erkennt der Fold den Konflikt.
    if (await versuch.schreibe(kostenParameter(einsatzId, feld, vorher, neu))) setzeEntwurf(undefined);
  }

  return (
    <tr>
      <th scope="row">
        <label htmlFor={`kosten-${feld}`}>{BESCHRIFTUNG[feld]}</label>
      </th>
      <td>
        <input
          id={`kosten-${feld}`}
          type="text"
          inputMode="decimal"
          value={entwurf ?? String(vorher)}
          disabled={nurLesen}
          title={nurLesen ? TEXT_NUR_LESEN : undefined}
          aria-invalid={fehler !== undefined}
          aria-busy={versuch.laeuft}
          onChange={(e) => {
            setzeEntwurf(e.target.value);
            setzeFehler(undefined);
          }}
          onBlur={() => void uebernimm()}
          onKeyDown={(e) => {
            // Die Konvention aus M3.6a: Enter bestätigt, Escape
            // verwirft den Entwurf und stellt den Wert wieder her.
            if (e.key === "Enter") void uebernimm();
            if (e.key === "Escape") {
              setzeEntwurf(undefined);
              setzeFehler(undefined);
              versuch.verwerfe();
            }
          }}
        />
        {fehler !== undefined && <span className="feldfehler">{fehler}</span>}
        {versuch.anzeige}
      </td>
    </tr>
  );
}
