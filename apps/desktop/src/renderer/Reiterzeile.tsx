/**
 * Die Reiterzeile des Kopfbands mit „Mehr ▾" (Entwurf „Entlastung", 3.2,
 * Option 6d, Schnitt E3).
 *
 * Links stehen die Reiter des Profils (`reiterFuer`), rechts „Mehr ▾" mit
 * allen anderen Blättern. Ist ein Blatt aus „Mehr" aufgeschlagen, steht es
 * **vorübergehend als letzter Reiter** im Band, aktiv: Man sieht immer, wo
 * man ist, auch wenn das Blatt nicht zum Profil gehört. Im Menü trägt es
 * das Häkchen. Wechselt man zu einem Blatt des Bands, verschwindet es
 * wieder.
 *
 * Die Reiter bleiben `role="tab"`; „Mehr" steht neben und nicht in der
 * Tabliste, weil ein Menüknopf kein Reiter ist — und weil die Tabliste auf
 * schmalen Bildschirmen in sich scrollt, das Menü aber nicht mitscrollen
 * und nicht abgeschnitten werden soll.
 */

import type { Profil } from "../kontrakt/index.js";
import { reiterFuer, type Blatt, type Reiter } from "./blaetter.js";
import { Klappmenue } from "./Klappmenue.js";

export interface ReiterzeileEigenschaften {
  readonly blatt: Blatt;
  readonly waehleBlatt: (blatt: Blatt) => void;
  /** Wie viele Meldungen im Eingangskorb offen sind — 0 zeigt keine Marke. */
  readonly offeneMeldungen: number;
  readonly profil?: Profil | undefined;
}

/**
 * Der Zähler steht im Namen und nicht nur als Zahl daneben: Vorgelesen wäre
 * „Eingang 7" sonst „Eingang sieben" ohne Bezug — und zwischen zwei
 * Textknoten fällt der Abstand im zugänglichen Namen ohnehin weg.
 */
function zaehlname(eintrag: Reiter, offen: number): { readonly "aria-label"?: string } {
  return eintrag.schluessel === "eingang" && offen > 0 ? { "aria-label": `${eintrag.titel} ${String(offen)} offen` } : {};
}

function zahl(eintrag: Reiter, offen: number): number | undefined {
  return eintrag.schluessel === "eingang" && offen > 0 ? offen : undefined;
}

export function Reiterzeile({ blatt, waehleBlatt, offeneMeldungen, profil }: ReiterzeileEigenschaften): React.JSX.Element {
  const { imBand, unterMehr } = reiterFuer(profil);
  const ausMehr = unterMehr.find((eintrag) => eintrag.schluessel === blatt);
  const band = ausMehr === undefined ? imBand : [...imBand, ausMehr];
  return (
    <div className="reiterzeile">
      <div className="reiter" role="tablist" aria-label="Ansichten">
        {band.map((eintrag) => {
          const offen = zahl(eintrag, offeneMeldungen);
          return (
            <button
              key={eintrag.schluessel}
              type="button"
              role="tab"
              aria-selected={blatt === eintrag.schluessel}
              className={eintrag === ausMehr ? "aus-mehr" : undefined}
              title={eintrag === ausMehr ? "Aus „Mehr“ aufgeschlagen" : undefined}
              {...zaehlname(eintrag, offeneMeldungen)}
              onClick={() => {
                waehleBlatt(eintrag.schluessel);
              }}
            >
              {eintrag.titel}
              {offen !== undefined && <span className="zaehler">{String(offen)}</span>}
            </button>
          );
        })}
      </div>
      {unterMehr.length > 0 && (
        <Mehrmenue eintraege={unterMehr} blatt={blatt} waehleBlatt={waehleBlatt} offeneMeldungen={offeneMeldungen} />
      )}
    </div>
  );
}

interface MehrmenueEigenschaften extends Omit<ReiterzeileEigenschaften, "profil"> {
  readonly eintraege: readonly Reiter[];
}

/** „Mehr ▾": die Blätter, die das Profil nicht ins Band stellt. */
function Mehrmenue({ eintraege, blatt, waehleBlatt, offeneMeldungen }: MehrmenueEigenschaften): React.JSX.Element {
  return (
    <Klappmenue
      huelle="mehr rechts"
      knopf={{
        inhalt: "Mehr ▾",
        klasse: "mehrknopf",
        titel: `Weitere Blätter: ${eintraege.map((eintrag) => eintrag.titel).join(", ")}`,
      }}
      menue={{ beschriftung: "Weitere Blätter", id: "mehrmenue" }}
      inhalt={(waehle) =>
        eintraege.map((eintrag) => {
          const offen = zahl(eintrag, offeneMeldungen);
          return (
            <button
              key={eintrag.schluessel}
              type="button"
              role="menuitemradio"
              aria-checked={blatt === eintrag.schluessel}
              {...zaehlname(eintrag, offeneMeldungen)}
              onClick={waehle(() => {
                waehleBlatt(eintrag.schluessel);
              })}
            >
              {eintrag.titel}
              {offen !== undefined && (
                <span className="kurz" aria-hidden="true">
                  {String(offen)}
                </span>
              )}
            </button>
          );
        })
      }
    />
  );
}
