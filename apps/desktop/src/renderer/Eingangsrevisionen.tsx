/**
 * Die Fassungen einer Meldungsreihe im Eingangskorb (M6.2) — aus
 * `Eingangskorb.tsx` herausgelöst, damit der Korb unter der Grenze von 400
 * Zeilen bleibt (AGENTS.md, Abschnitt 6).
 */

import { useEffect, useState } from "react";

import type { Fassungsvergleich, Meldungszeile } from "@s1/domaene";

import { useLaden } from "./laden.js";

const ZUSTANDSWORT: Readonly<Record<string, string>> = {
  NEU: "Neu",
  GEAENDERT: "Geändert",
  UEBERNOMMEN: "Übernommen",
  ABGELEHNT: "Abgelehnt",
};

/** Das Wort zur Ampel, mit Umlaut, statt des Schlüssels („UEBERNOMMEN"). */
export function zustandswort(zustand: string): string {
  return ZUSTANDSWORT[zustand] ?? zustand;
}

/** „10.09.2026, 08:00:00" — so steht ein Zeitpunkt im Korb. */
export function zeit(wert: string): string {
  if (wert === "") return "";
  const zeitpunkt = new Date(wert);
  return Number.isNaN(zeitpunkt.getTime()) ? wert : zeitpunkt.toLocaleString("de-DE");
}

/**
 * Die Revisionen einer Reihe (M6.2).
 *
 * Geordnet nach **`stand`** und nicht nach der Empfangszeit: Ein
 * nachgescannter Papierbogen von gestern kommt später an und ist trotzdem die
 * ältere Fassung (§2.6, zwei Ordnungen, die nie vermischt werden).
 */
export function Revisionen({
  einheitSchluessel,
  aufSchliessen,
}: {
  readonly einheitSchluessel: string;
  readonly aufSchliessen: () => void;
}): React.JSX.Element {
  // **Die Funktionen und nicht der Store.** `useLaden()` ohne Auswahl liefert
  // bei jeder Änderung ein neues Objekt; stünde `laden` in der
  // Abhängigkeitsliste, holte dieser Dialog seine Fassungen bei jedem
  // eintreffenden Delta neu — und solange der Ruf selbst in den Store
  // schriebe, drehte es sich im Kreis. Die beiden Holefunktionen sind über
  // die Lebenszeit des Stores dieselben.
  const holeRevisionen = useLaden((laden) => laden.holeRevisionen);
  const holeAenderung = useLaden((laden) => laden.holeAenderung);
  const [zeilen, setzeZeilen] = useState<readonly Meldungszeile[] | undefined>(undefined);
  const [vergleich, setzeVergleich] = useState<Fassungsvergleich | null>(null);

  useEffect(() => {
    let gilt = true;
    void (async () => {
      const ansicht = await holeRevisionen(einheitSchluessel);
      if (gilt) setzeZeilen(ansicht);
      const bewegung = await holeAenderung(einheitSchluessel);
      if (gilt) setzeVergleich(bewegung);
    })();
    return () => {
      gilt = false;
    };
  }, [einheitSchluessel, holeRevisionen, holeAenderung]);

  return (
    <div className="revisionen" role="dialog" aria-label="Revisionen">
      <div className="revisionenkopf">
        <h3>Fassungen dieser Einheit</h3>
        <button type="button" onClick={aufSchliessen}>
          Schließen
        </button>
      </div>
      {zeilen === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <ol className="fassungen">
          {zeilen.map((zeile) => (
            <li key={zeile.id} className={zeile.kopf ? "kopf" : ""}>
              <span className={`ampel ampel-${zeile.zustand.toLowerCase()}`}>{zustandswort(zeile.zustand)}</span>{" "}
              Stand {zeit(zeile.stand)} · Stärke {zeile.staerke} · empfangen{" "}
              {zeit(zeile.empfangenAm)}
              {zeile.kopf && " · jüngste Fassung"}
              {zeile.uebernommeneFelder.length > 0 && (
                <div className="felder">
                  Übernommen: {zeile.uebernommeneFelder.join(", ")}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {vergleich !== null && <Bewegung vergleich={vergleich} />}
    </div>
  );
}

/**
 * Was sich von der vorletzten zur letzten Fassung geändert hat (M6.2).
 *
 * **Die Historie zeigt Stände, der Diff zeigt Bewegung** — der Satz stammt aus
 * dem Modulkopf von `@bos/meldekopf`, und er ist der Grund für diesen Block:
 * Vor einer Übernahme will die Führungsstelle nicht die ganze Fassung lesen,
 * sondern wissen, was anders ist.
 *
 * Die Texte kommen fertig aus dem geteilten Kern; hier wird nichts
 * formatiert. So zeigt der Erfassungsbogen denselben Wortlaut wie dieses
 * Fenster.
 */
function Bewegung({ vergleich }: { readonly vergleich: Fassungsvergleich }): React.JSX.Element {
  const d = vergleich.diff;
  if (d.anzahl === 0) {
    return <p className="hinweistext">Gegenüber der vorigen Fassung inhaltlich unverändert.</p>;
  }

  const gruppen: readonly { readonly titel: string; readonly zeilen: readonly string[] }[] = [
    { titel: "Stärke", zeilen: d.staerke.map((a) => `${a.feld}: ${a.vorher} → ${a.nachher}`) },
    { titel: "Personal zugegangen", zeilen: d.personalZugang },
    { titel: "Personal abgegangen", zeilen: d.personalAbgang },
    {
      titel: "Personal geändert",
      zeilen: d.personalGeaendert.map((a) => `${a.feld}: ${a.vorher} → ${a.nachher}`),
    },
    { titel: "Fahrzeuge zugegangen", zeilen: d.fahrzeugeZugang },
    { titel: "Fahrzeuge abgegangen", zeilen: d.fahrzeugeAbgang },
    {
      titel: "Fahrzeuge geändert",
      zeilen: d.fahrzeugeGeaendert.map((a) => `${a.feld}: ${a.vorher} → ${a.nachher}`),
    },
    { titel: "Bedarf", zeilen: d.bedarf.map((a) => `${a.feld}: ${a.vorher} → ${a.nachher}`) },
    { titel: "Sonstiges", zeilen: d.sonstiges.map((a) => `${a.feld}: ${a.vorher} → ${a.nachher}`) },
  ];

  return (
    <div className="bewegung">
      <h4>Änderungen seit der vorigen Fassung ({d.anzahl})</h4>
      {gruppen
        .filter((gruppe) => gruppe.zeilen.length > 0)
        .map((gruppe) => (
          <div key={gruppe.titel}>
            <strong>{gruppe.titel}</strong>
            <ul>
              {gruppe.zeilen.map((zeile) => (
                <li key={zeile}>{zeile}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
