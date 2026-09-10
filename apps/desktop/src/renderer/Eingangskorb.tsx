/**
 * Der Eingangskorb des Meldekopfs (M6.1) und die Revisionen einer Reihe
 * (M6.2).
 *
 * Die Excel kennt diesen Weg schon, nur von Hand: Der Meldekopf trägt die
 * Bögen in eine Google-Tabelle und markiert sie **gelb**, die Führungsstelle
 * kopiert die Zeile und markiert **grün**, bei einer Änderung wird wieder gelb
 * gesetzt (Hinweise C159–C172, EXH F-E1). Hier ist die Ampel kein Anstrich,
 * sondern der abgeleitete `uebernahmeZustand` aus §5.8.1 — sie kann gar nicht
 * vergessen werden.
 *
 * **Nichts verschwindet.** Der Empfang ist eine Tatsache; Löschen ist
 * verboten. Wer eine Meldung nicht will, lehnt sie ab — mit Grund (§2.4) —,
 * und sie bleibt im Korb. Dieselbe Regel führt die Excel als „Google-Zeilen
 * werden bis Einsatzende nicht gelöscht".
 */

import { useEffect, useState } from "react";

import type { Fassungsvergleich, Meldungszeile } from "@s1/domaene";

import { useLaden } from "./laden.js";
import {
  MELDESTATUS,
  ablehnungZurueckgenommen,
  meldeStatusGesetzt,
  meldungAbgelehnt,
  uebernahmeZurueckgenommen,
  type Meldestatus,
} from "../kontrakt/bedienschritte.js";

/** Die vier Zustände mit Beschriftung — die Ampel der Vorlage. */
const ZUSTAENDE = [
  { wert: "NEU", titel: "Neu" },
  { wert: "GEAENDERT", titel: "Geändert" },
  { wert: "UEBERNOMMEN", titel: "Übernommen" },
  { wert: "ABGELEHNT", titel: "Abgelehnt" },
] as const;

function zeit(wert: string): string {
  if (wert === "") return "";
  const zeitpunkt = new Date(wert);
  return Number.isNaN(zeitpunkt.getTime()) ? wert : zeitpunkt.toLocaleString("de-DE");
}

export function Eingangskorb(): React.JSX.Element {
  const laden = useLaden();
  const holeEingangskorb = laden.holeEingangskorb;
  const [reihe, setzeReihe] = useState<string | undefined>(undefined);

  useEffect(() => {
    void holeEingangskorb();
  }, [holeEingangskorb]);

  const ansicht = laden.eingangskorb;
  const filter = laden.eingangsfilter;

  return (
    <section aria-label="Eingangskorb" className="eingangskorb">
      <h2>
        Eingangskorb
        {ansicht === undefined ? "" : ` — ${String(ansicht.offen)} offen`}
      </h2>

      <div className="eingangsfilter">
        {ZUSTAENDE.map((zustand) => {
          const gewaehlt = filter.zustaende?.includes(zustand.wert) ?? false;
          return (
            <label key={zustand.wert}>
              <input
                type="checkbox"
                checked={gewaehlt}
                onChange={() => {
                  const bisher = filter.zustaende ?? [];
                  const naechste = gewaehlt
                    ? bisher.filter((wert) => wert !== zustand.wert)
                    : [...bisher, zustand.wert];
                  // Keine Auswahl heißt „alle“: Eine leere Tabelle liest sich
                  // wie ein Fehler.
                  void laden.setzeEingangsfilter({
                    ...filter,
                    ...(naechste.length === 0 ? { zustaende: undefined } : { zustaende: naechste }),
                  });
                }}
              />
              {zustand.titel}
              {ansicht === undefined ? "" : ` (${String(ansicht.jeZustand[zustand.wert] ?? 0)})`}
            </label>
          );
        })}
        <label>
          <input
            type="checkbox"
            checked={filter.nurKoepfe === true}
            onChange={(e) => {
              // K26: Bei einer Mehrtageslage trägt der Korb je Einheit so
              // viele Zeilen, wie es Meldetage gab. Gebraucht wird die
              // jüngste; die anderen stehen in der Revisionsansicht.
              void laden.setzeEingangsfilter({ ...filter, nurKoepfe: e.target.checked });
            }}
          />
          Nur jüngste Fassung
        </label>
      </div>

      {ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : ansicht.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Meldung im Korb.</p>
      ) : (
        <table className="meldungstabelle">
          <thead>
            <tr>
              <th scope="col">Zustand</th>
              <th scope="col">Einheit</th>
              <th scope="col">Org.</th>
              <th scope="col">Stärke</th>
              <th scope="col">Stand</th>
              <th scope="col">Empfangen</th>
              <th scope="col">Signatur</th>
              <th scope="col">Fassung</th>
              <th scope="col">Handlung</th>
            </tr>
          </thead>
          <tbody>
            {ansicht.zeilen.map((zeile) => (
              <Zeile
                key={zeile.id}
                zeile={zeile}
                aufReihe={() => {
                  setzeReihe(zeile.einheitSchluessel);
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      {reihe !== undefined && (
        <Revisionen
          einheitSchluessel={reihe}
          aufSchliessen={() => {
            setzeReihe(undefined);
          }}
        />
      )}
    </section>
  );
}

function Zeile({
  zeile,
  aufReihe,
}: {
  readonly zeile: Meldungszeile;
  readonly aufReihe: () => void;
}): React.JSX.Element {
  const laden = useLaden();

  return (
    <tr className={zeile.zustand === "ABGELEHNT" ? "abgelehnt" : ""}>
      <td>
        <span className={`ampel ampel-${zeile.zustand.toLowerCase()}`}>{zeile.zustand}</span>
      </td>
      <th scope="row">{zeile.bezeichnung}</th>
      <td>{zeile.organisation}</td>
      <td className="zahl">{zeile.staerke}</td>
      <td>{zeit(zeile.stand)}</td>
      <td>{zeit(zeile.empfangenAm)}</td>
      <td>
        {/* §5.8.1: Die Signatur entscheidet nichts — sie wird angezeigt. Eine
            Meldung mit gebrochener Signatur wird aufgenommen; wer sie nicht
            will, lehnt sie ab. */}
        {zeile.signatur === "" ? "—" : zeile.signatur}
      </td>
      <td>
        {zeile.fassungen > 1 ? (
          <button type="button" onClick={aufReihe}>
            {zeile.fassung} von {zeile.fassungen}
          </button>
        ) : (
          "1"
        )}
      </td>
      <td className="handlungen">
        {zeile.zustand === "ABGELEHNT" ? (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(ablehnungZurueckgenommen(zeile.id));
            }}
          >
            Ablehnung zurück
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              // §2.4: Der Grund gehört zur Ablehnung. Ohne ihn wäre sie im
              // Nachhinein nicht von einem Versehen zu unterscheiden.
              const grund = globalThis.prompt("Grund der Ablehnung");
              if (grund === null || grund.trim() === "") return;
              void laden.bediene(meldungAbgelehnt(zeile.id, grund.trim()));
            }}
          >
            Ablehnen
          </button>
        )}
        {zeile.einheitId !== undefined && (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(uebernahmeZurueckgenommen(zeile.id));
            }}
          >
            Übernahme zurück
          </button>
        )}
        <select
          aria-label={`Meldestatus ${zeile.bezeichnung}`}
          value=""
          onChange={(e) => {
            if (e.target.value === "") return;
            void laden.bediene(
              meldeStatusGesetzt(zeile.id, null, e.target.value as Meldestatus),
            );
          }}
        >
          <option value="">Meldestatus …</option>
          {MELDESTATUS.map((wert) => (
            <option key={wert} value={wert}>
              {wert}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

/**
 * Die Revisionen einer Reihe (M6.2).
 *
 * Geordnet nach **`stand`** und nicht nach der Empfangszeit: Ein
 * nachgescannter Papierbogen von gestern kommt später an und ist trotzdem die
 * ältere Fassung (§2.6, zwei Ordnungen, die nie vermischt werden).
 */
function Revisionen({
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
              <span className={`ampel ampel-${zeile.zustand.toLowerCase()}`}>{zeile.zustand}</span>{" "}
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
