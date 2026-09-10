/**
 * Die Diagnoseansicht (M7.3).
 *
 * Sie beantwortet die Frage, die im Störfall zuerst gestellt wird und auf die
 * bisher niemand im Programm eine Antwort fand: **Woran liegt es, und wo steht
 * das nach?**
 *
 * Drei Teile, jeder mit seinem Grund:
 *
 *  * **Oben die zutreffenden Störfälle.** Sie kommen aus `STOERFAELLE` in
 *    Ring 2 — derselben Liste, aus der die Kurzanleitung gedruckt wird. Wer
 *    beides nebeneinanderlegt, liest denselben Satz; das ist der ganze Zweck
 *    der Matrix als Daten.
 *  * **In der Mitte die Arbeitsplätze mit ihren Offsets.** Was der andere
 *    geschrieben hat, was dieser Platz davon gelesen hat, und wie weit seine
 *    Uhr abweicht. Die Differenz der beiden Zahlen ist die eigentliche
 *    Auskunft: Steht sie still, während der andere schreibt, kommt der Share
 *    nicht durch (§6.4).
 *  * **Unten die Pfade und die letzten Meldungen.** Der Ort der Protokolldatei
 *    steht dort, wo jemand ihn im Störfall sucht.
 *
 * **Die Ansicht misst nichts selbst.** Die Zahlen stehen im geschobenen
 * Lagebild (Peers, Quarantäne, Hinweise), die Pfade holt ein eigener Ruf. Ein
 * Renderer, der den Share selbst anfasste, wäre die Umkehrung von
 * 02-ZIELBILD.md — und im Störfall die Stelle, die mit hängenbleibt.
 */

import { useEffect } from "react";

import { STOERFAELLE, UHR_GRENZE_MS, erkannteStoerfaelle } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { alter, bytes } from "./Statuszeile.js";
import type { Lagebild, Peer } from "../kontrakt/index.js";

/** Eine Abweichung in Sekunden oder Minuten, mit Vorzeichen und in Worten. */
export function abweichung(ms: number): string {
  const betrag = Math.abs(ms);
  if (betrag < 1000) return "gleich";
  const richtung = ms > 0 ? "vor" : "nach";
  if (betrag < 60_000) return `${String(Math.round(betrag / 1000))} s ${richtung}`;
  return `${String(Math.round(betrag / 60_000))} min ${richtung}`;
}

/**
 * Der Befund aus dem, was das Fenster ohnehin hält.
 *
 * Hier steht **kein** Grenzwert: Die Grenzen sind Ring 2 (`UHR_GRENZE_MS`),
 * damit Ansicht und Anleitung dieselbe Zahl meinen. Diese Funktion sammelt
 * nur ein.
 */
export function befundAus(lagebild: Lagebild | undefined, paketAbgelehnt: boolean) {
  const peers = lagebild?.peers ?? [];
  const groesste = peers.reduce((bisher, p) => Math.max(bisher, Math.abs(p.uhrAbweichungMs)), 0);
  return {
    shareErreichbar: lagebild?.shareErreichbar ?? true,
    groessteUhrabweichungMs: groesste,
    konflikthinweise: lagebild?.hinweise ?? 0,
    quarantaene: lagebild?.quarantaene.length ?? 0,
    programmpaketAbgelehnt: paketAbgelehnt,
    // §5.8: Ein unlesbarer Bogen ist im Datenpfad kein Zustand — er entsteht
    // am Handscanner und ist wieder weg, sobald jemand es erneut versucht.
    // Die Ansicht kann ihn deshalb nicht messen; die Karte führt ihn trotzdem,
    // weil der Bediener ihn erlebt. Befund M7-B1.
    unlesbareBoegen: 0,
  };
}

function Peerzeile({ peer, jetzt }: { readonly peer: Peer; readonly jetzt: number }): React.JSX.Element {
  const rueckstand = peer.offset - peer.gelesenerOffset;
  return (
    <tr className={peer.veraltet ? "veraltet" : undefined}>
      <td>{peer.anzeigename}</td>
      <td>{peer.rechnername}</td>
      <td>{peer.programmversion}</td>
      <td>{peer.veraltet ? `veraltet, ${alter(peer.wanduhr, jetzt)}` : alter(peer.wanduhr, jetzt)}</td>
      <td className="zahl">{`Segment ${String(peer.segment)}`}</td>
      <td className="zahl">{bytes(peer.offset)}</td>
      <td className="zahl">{bytes(peer.gelesenerOffset)}</td>
      <td className="zahl">{rueckstand > 0 ? bytes(rueckstand) : "—"}</td>
      <td className={Math.abs(peer.uhrAbweichungMs) >= UHR_GRENZE_MS ? "warnung" : undefined}>
        {abweichung(peer.uhrAbweichungMs)}
      </td>
      <td className="zahl">{peer.quarantaene === 0 ? "—" : String(peer.quarantaene)}</td>
    </tr>
  );
}

export interface DiagnoseEigenschaften {
  /** Die Uhr wird übergeben — wie in der Statuszeile und aus demselben Grund. */
  readonly jetzt?: number;
}

export function Diagnose({ jetzt = Date.now() }: DiagnoseEigenschaften = {}): React.JSX.Element {
  const laden = useLaden();
  const holeDiagnose = laden.holeDiagnose;

  useEffect(() => {
    void holeDiagnose();
  }, [holeDiagnose]);

  const lagebild = laden.lagebild;
  const abgelehnt = laden.programmstand?.art === "abgelehnt";
  const zutreffend = erkannteStoerfaelle(befundAus(lagebild, abgelehnt));
  const auskunft = laden.diagnose;

  return (
    <section aria-label="Diagnose" className="diagnose">
      <h2>Diagnose</h2>

      <h3>Was gerade zutrifft</h3>
      {zutreffend.length === 0 ? (
        <p className="hinweistext">Kein Störfall erkannt. Die sechs Fälle stehen unten zum Nachlesen.</p>
      ) : (
        <ul className="stoerfaelle">
          {zutreffend.map((fall) => (
            <li key={fall.kennung} className={`dringlichkeit-${fall.dringlichkeit}`}>
              <strong>{fall.titel}</strong>
              <p>{fall.ursache}</p>
              <ol>
                {fall.schritte.map((schritt) => (
                  <li key={schritt}>{schritt}</li>
                ))}
              </ol>
              <p className="nicht">Nicht: {fall.nicht}</p>
              <p className="quelle">{fall.quelle}</p>
            </li>
          ))}
        </ul>
      )}

      <h3>Arbeitsplätze</h3>
      {lagebild === undefined || lagebild.peers.length === 0 ? (
        <p className="hinweistext">Kein weiterer Arbeitsplatz am Einsatz.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Rechner</th>
              <th>Fassung</th>
              <th>Zuletzt gesehen</th>
              <th>Segment</th>
              <th>Geschrieben</th>
              <th>Hier gelesen</th>
              <th>Rückstand</th>
              <th>Uhr</th>
              <th>Quarantäne</th>
            </tr>
          </thead>
          <tbody>
            {lagebild.peers.map((peer) => (
              <Peerzeile key={peer.clientId} peer={peer} jetzt={jetzt} />
            ))}
          </tbody>
        </table>
      )}

      <h3>Dieser Arbeitsplatz</h3>
      {lagebild !== undefined && (
        <ul className="kennzahlen">
          <li>
            Konflikthinweise: <strong>{lagebild.hinweise}</strong>
          </li>
          <li>
            Unbekannte Ereignisse: <strong>{lagebild.unbekannteEreignisse}</strong>
          </li>
          <li>
            Nicht übertragen: <strong>{bytes(lagebild.unuebertrageneBytes)}</strong>
          </li>
          <li>
            Quarantäne:{" "}
            <strong>{lagebild.quarantaene.length === 0 ? "keine" : lagebild.quarantaene.join(", ")}</strong>
          </li>
        </ul>
      )}
      {auskunft === undefined ? (
        <p className="hinweistext">Wird geholt …</p>
      ) : (
        <dl className="pfade">
          <dt>Protokolldatei</dt>
          <dd>{auskunft.protokolldatei}</dd>
          <dt>Share</dt>
          <dd>
            {auskunft.sharePfad === "" ? "(nicht eingestellt)" : auskunft.sharePfad}
            {auskunft.sharePfad !== "" && !auskunft.shareLesbar && " — nicht lesbar"}
          </dd>
          <dt>Lokaler Spiegel</dt>
          <dd>{auskunft.spiegelwurzel}</dd>
          <dt>Einstellungen</dt>
          <dd>{auskunft.einstellungsdatei}</dd>
          <dt>Fassung</dt>
          <dd>{`${auskunft.programmversion}, Electron ${auskunft.electron}, ${auskunft.plattform}`}</dd>
          <dt>Kennung</dt>
          <dd>{`${auskunft.clientId} auf ${auskunft.rechnername} als ${auskunft.benutzer}`}</dd>
        </dl>
      )}

      <h3>Letzte Meldungen</h3>
      {auskunft === undefined || auskunft.letzteMeldungen.length === 0 ? (
        <p className="hinweistext">Nichts gemeldet.</p>
      ) : (
        <table className="meldungen">
          <tbody>
            {auskunft.letzteMeldungen.map((zeile, nummer) => (
              <tr key={`${zeile.wanduhr}-${String(nummer)}`} className={zeile.stufe}>
                <td>{zeile.wanduhr}</td>
                <td>{zeile.stufe}</td>
                <td>{zeile.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Die sechs Störfälle</h3>
      <p className="hinweistext">
        Dieselbe Liste steht in der Kurzanleitung. Ändert sich einer der Fälle, ändern sich beide.
      </p>
      <ul className="stoerfaelle blass">
        {STOERFAELLE.map((fall) => (
          <li key={fall.kennung}>
            <strong>{fall.titel}</strong>
            <p>{fall.woran}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
