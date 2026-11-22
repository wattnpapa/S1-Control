/**
 * Hover-Leiste und Punkte des Monitors (S4.1, KONZEPT-S4.md §4).
 *
 * Die Leiste erscheint bei Mausbewegung oben mit den Ansichten als Reiter und
 * verschwindet nach drei Sekunden ohne Bewegung: Auf einem Monitor an der
 * Wand ist die Maus meist nicht da; die Leiste ist für den Moment, in dem
 * jemand mit dem Laptop danebensteht.
 *
 * Die Reiter stehen nach Sachgebiet gruppiert (Führung, S1, S4, S6, FmZ),
 * jede Gruppe mit ihrem Kürzel davor; passen sie nicht in eine Zeile, bricht
 * die Leiste um. Der Schalter „Wechsel" geht reihum durch aus, alle und
 * die Sachgebiete mit mehr als einer Ansicht.
 *
 * Die Punkte rechts unten nennen die Ansichten, die aktive gefüllt; bei
 * eingeschaltetem Wechsel ist die nächste umrandet hervorgehoben — wer
 * hinsieht, weiß, was kommt. Zwischen den Sachgebieten steht eine Lücke.
 */

import { MONITOR_GRUPPE_DER_ANSICHT } from "../kontrakt/index.js";
import { ANSICHT_TITEL, type Monitorsteuerung } from "./monitorSteuerung.js";
import { GRUPPE_KURZ, GRUPPE_TITEL, ansichtenDerGruppe, belegteGruppen, modusKurz, naechsteAnsicht, naechsterModus, sichtbareAnsichten } from "./monitorWechsel.js";

export function Monitorleiste({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element | null {
  if (!steuerung.leiste) return null;
  const angehalten = steuerung.wechsel && steuerung.gehalten;
  return (
    <nav className="monitorleiste" aria-label="Monitoransichten">
      {belegteGruppen(steuerung.besucher).map((gruppe) => (
        <div key={gruppe} className="monitorleistegruppe" role="group" aria-label={GRUPPE_TITEL[gruppe]}>
          <span className="monitorleistekuerzel" aria-hidden="true">
            {GRUPPE_KURZ[gruppe]}
          </span>
          {ansichtenDerGruppe(gruppe, steuerung.besucher).map((ansicht) => (
            <button
              key={ansicht}
              type="button"
              aria-pressed={steuerung.ansicht === ansicht}
              onClick={() => {
                steuerung.waehle(ansicht);
              }}
            >
              {ANSICHT_TITEL[ansicht]}
            </button>
          ))}
        </div>
      ))}
      <span className="monitorleistefrei" />
      <button
        type="button"
        aria-pressed={steuerung.wechsel}
        title="Reihum: aus, alle Ansichten, je Sachgebiet"
        onClick={() => {
          steuerung.setzeModus(naechsterModus(steuerung.modus, steuerung.besucher));
        }}
      >
        Wechsel: {angehalten ? `${modusKurz(steuerung.modus)}, gehalten` : modusKurz(steuerung.modus)}
      </button>
      <button type="button" aria-pressed={steuerung.besucher} title="Nur Kräftezahlen, keine Funk-, Nachrichten- oder Personendaten (Taste B)" onClick={steuerung.schalteBesucher}>
        Besucher: {steuerung.besucher ? "an" : "aus"}
      </button>
      <button
        type="button"
        aria-label="Menü"
        onClick={(ereignis) => {
          steuerung.oeffneMenue(ereignis.clientX, ereignis.clientY + 12);
        }}
      >
        ⋮
      </button>
    </nav>
  );
}

function punktklasse(steuerung: Monitorsteuerung, i: number): string | undefined {
  const folge = sichtbareAnsichten(steuerung.besucher);
  const ansicht = folge[i];
  if (ansicht === undefined) return undefined;
  const vorher = folge[i - 1];
  const naechste = steuerung.wechsel ? naechsteAnsicht(steuerung.ansicht, steuerung.modus, steuerung.besucher) : undefined;
  const klassen = [
    ansicht === steuerung.ansicht ? "aktiv" : ansicht === naechste ? "naechste" : "",
    vorher !== undefined && MONITOR_GRUPPE_DER_ANSICHT[vorher] !== MONITOR_GRUPPE_DER_ANSICHT[ansicht] ? "gruppenanfang" : "",
  ].filter((k) => k !== "");
  return klassen.length > 0 ? klassen.join(" ") : undefined;
}

export function Monitorpunkte({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element {
  return (
    <ol className="monitorpunkte" aria-label="Ansichten">
      {sichtbareAnsichten(steuerung.besucher).map((ansicht, i) => (
        <li
          key={ansicht}
          title={ANSICHT_TITEL[ansicht]}
          className={punktklasse(steuerung, i)}
          aria-current={ansicht === steuerung.ansicht ? "true" : undefined}
        />
      ))}
    </ol>
  );
}
