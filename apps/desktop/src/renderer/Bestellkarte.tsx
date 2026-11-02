/**
 * Die Bestellkarte der nächsten Mahlzeit (S4.3, 4d rechts).
 *
 * Bedarf aus der Vorausschau, bestellte Menge, wo und wann bestellt,
 * Abweichung als Zahl mit Vorzeichen, darunter „Als geliefert melden",
 * „Bestellung ändern" und „Stornieren". Eine Bestellung ist ein Ereignis —
 * sie steht im Tagebuch und ist mit Rückgängig zurückzunehmen. Darunter der
 * Verlauf der letzten Bestellungen.
 */

import { useState } from "react";

import type { Bestellstand, Bestellzeile, Mahlzeitvorausschau, Versorgungsblatt } from "@s1/domaene";

import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";
import { useNurLesen } from "./Nurlesen.js";
import { BestellMaske, type Bestellvorschlag } from "./Verpflegungsmasken.js";
import { kurzzeit, mahlzeitText, uhrzeitText } from "./versorgungstext.js";
import { mahlzeitGeliefert, mahlzeitStorniert } from "../kontrakt/versorgungsschritte.js";

function abweichung(differenz: number): string {
  return differenz > 0 ? `+${String(differenz)} Reserve` : differenz < 0 ? `−${String(-differenz)} fehlen` : "deckt die Vorausschau";
}

/** Der Vorschlag einer Bestellung aus einer Mahlzeit der Vorausschau. */
export function vorschlagAus(m: Mahlzeitvorausschau, ausgabestelleId?: string): Bestellvorschlag {
  return {
    datum: m.datum,
    mahlzeit: m.mahlzeit,
    titel: `${mahlzeitText(m.mahlzeit)} ${m.uhrzeit}`,
    portionen: m.vorausschau.portionen,
    vegetarisch: m.vorausschau.vegetarisch,
    vegan: m.vorausschau.vegan,
    ...(ausgabestelleId === undefined ? {} : { ausgabestelleId }),
  };
}

function Bestellt({ b, stand }: { readonly b: Bestellzeile; readonly stand: Bestellstand }): React.JSX.Element {
  return (
    <dl className="bestelldaten">
      <dt>Portionen</dt>
      <dd>
        <strong>{b.portionen}</strong>{" "}
        {stand.differenz !== undefined && (
          <span className={stand.differenz < 0 ? "marke-zustand warn" : "marke-zustand ok"}>{abweichung(stand.differenz)}</span>
        )}
      </dd>
      <dt>davon</dt>
      <dd>
        {b.vegetarisch} vegetarisch · {b.vegan} vegan
      </dd>
      <dt>bei</dt>
      <dd>{b.ausgabestelle ?? b.bestelltBei ?? "—"}</dd>
      <dt>bestellt</dt>
      <dd>
        {kurzzeit(b.bestelltUm)}
        {b.bestelltVon === undefined ? "" : ` · ${b.bestelltVon}`}
      </dd>
      <dt>geliefert</dt>
      <dd>{b.geliefert === undefined ? <span className="marke-zustand">offen</span> : `${String(b.geliefert)} von ${String(b.portionen)}`}</dd>
    </dl>
  );
}

function Verlauf({ liste }: { readonly liste: readonly Bestellzeile[] }): React.JSX.Element | null {
  if (liste.length === 0) return null;
  return (
    <ul className="bestellverlauf" aria-label="Verlauf der Bestellungen">
      {liste.slice(0, 6).map((b) => (
        <li key={b.bestellungId} className={b.storniert || b.ersetzt ? "blass" : undefined}>
          <span className="wann">{kurzzeit(b.bestelltUm)}</span> {mahlzeitText(b.mahlzeit)} {b.datum.slice(8, 10)}.{b.datum.slice(5, 7)}.{" "}
          {b.storniert ? "storniert" : b.ersetzt ? "ersetzt" : b.geliefert === undefined ? "bestellt" : "geliefert"}: {b.geliefert ?? b.portionen}
          {b.bestelltVon === undefined ? "" : ` (${b.bestelltVon})`}
        </li>
      ))}
    </ul>
  );
}

export function Bestellkarte({ blatt, jetzt }: { readonly blatt: Versorgungsblatt; readonly jetzt: number }): React.JSX.Element {
  const nurLesen = useNurLesen();
  const bediene = useLaden((z) => z.bediene);
  const abfrage = useGrundabfrage();
  const [maske, setzeMaske] = useState(false);
  const m = blatt.vorausschau.mahlzeiten[0];
  const stand = blatt.bestellstand[0];
  if (m === undefined || stand === undefined) {
    return (
      <section className="karte versorgungskarte bestellkarte" aria-label="Bestellung">
        <h3>Bestellung</h3>
        <p className="hinweistext">Keine Mahlzeit im Horizont.</p>
      </section>
    );
  }
  const b = stand.bestellung;
  return (
    <section className="karte versorgungskarte bestellkarte" aria-label="Bestellung">
      <h3>
        Bestellung · {mahlzeitText(m.mahlzeit, true)} {uhrzeitText(m.zeitpunkt)}
      </h3>
      <p className="bedarfzeile">
        <span className="leise">Bedarf aus der Vorausschau</span> <strong className="grosszahl">{m.vorausschau.portionen}</strong>{" "}
        Portionen · {m.vorausschau.vegetarisch} veg. · {m.vorausschau.vegan} vegan
      </p>
      {b === undefined ? <p className="marke-zustand warn">noch nicht bestellt</p> : <Bestellt b={b} stand={stand} />}
      {!nurLesen && (
        <p className="kartenknoepfe">
          {b !== undefined && b.geliefert === undefined && (
            <button type="button" className="haupt" onClick={() => void bediene(mahlzeitGeliefert(b.bestellungId, null, b.portionen))}>
              Als geliefert melden
            </button>
          )}
          <button type="button" className={b === undefined ? "haupt" : undefined} onClick={() => setzeMaske(true)}>
            {b === undefined ? "Bestellen …" : "Bestellung ändern …"}
          </button>
          {b !== undefined && (
            <button
              type="button"
              onClick={() =>
                abfrage.frage({
                  titel: `Bestellung ${mahlzeitText(m.mahlzeit)} ${m.uhrzeit} stornieren`,
                  erlaeuterung: `${String(b.portionen)} Portionen werden storniert; eine ältere Bestellung derselben Mahlzeit gilt dann wieder.`,
                  bestaetigungstext: "Stornieren",
                  aufGrund: (grund) => bediene(mahlzeitStorniert(b.bestellungId, grund)),
                })
              }
            >
              Stornieren …
            </button>
          )}
        </p>
      )}
      <Verlauf liste={blatt.bestellungen} />
      <p className="hinweistext">
        Eine Bestellung ist ein Ereignis: Sie steht im Tagebuch und ist mit Rückgängig zurückzunehmen. Der Anmarsch ohne
        Eintreffzeit ist nicht enthalten — wer für ihn mitbestellt, trägt die Reserve ein. Stand {kurzzeit(new Date(jetzt).toISOString())}.
      </p>
      {maske && <BestellMaske vorschlag={vorschlagAus(m, b?.ausgabestelleId)} ausgabestellen={blatt.ausgabestellen} aufSchliessen={() => setzeMaske(false)} />}
      {abfrage.maske}
    </section>
  );
}
