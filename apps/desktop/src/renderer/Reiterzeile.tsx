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
 *
 * Additiv (Audit Sachgebietsleiter P2-10): Der Reiter „Nachrichten“ trägt die
 * Zahl „neu für meine Stellen“ aus dem Lagebild als Marke, wie „Eingang“ die
 * offenen Meldungen. Ohne sie sah der Sachgebietsleiter eine Nachricht ohne
 * Vorrang erst, wenn er das Blatt zufällig aufschlug. Gelesen wird die Zahl
 * hier aus dem Store, damit das Kopfband (`Kopfband.tsx`) unverändert bleibt.
 */

import type { Profil } from "../kontrakt/index.js";
import { reiterFuer, type Blatt, type Reiter } from "./blaetter.js";
import { Klappmenue } from "./Klappmenue.js";
import { useLaden } from "./laden.js";

export interface ReiterzeileEigenschaften {
  readonly blatt: Blatt;
  readonly waehleBlatt: (blatt: Blatt) => void;
  /** Wie viele Meldungen im Eingangskorb offen sind — 0 zeigt keine Marke. */
  readonly offeneMeldungen: number;
  readonly profil?: Profil | undefined;
}

/** Die Zahlen der Marken: offene Meldungen am Eingang, neue Nachrichten für die eigenen Stellen (SGL P2-10). */
interface Marken {
  readonly offeneMeldungen: number;
  readonly neueNachrichten: number;
}

/**
 * Der Zähler steht im Namen und nicht nur als Zahl daneben: Vorgelesen wäre
 * „Eingang 7" sonst „Eingang sieben" ohne Bezug — und zwischen zwei
 * Textknoten fällt der Abstand im zugänglichen Namen ohnehin weg.
 */
function zaehlname(eintrag: Reiter, marken: Marken): { readonly "aria-label"?: string } {
  if (eintrag.schluessel === "eingang" && marken.offeneMeldungen > 0) return { "aria-label": `${eintrag.titel} ${String(marken.offeneMeldungen)} offen` };
  if (eintrag.schluessel === "nachrichten" && marken.neueNachrichten > 0) return { "aria-label": `${eintrag.titel} ${String(marken.neueNachrichten)} neu` };
  return {};
}

function zahl(eintrag: Reiter, marken: Marken): number | undefined {
  if (eintrag.schluessel === "eingang" && marken.offeneMeldungen > 0) return marken.offeneMeldungen;
  if (eintrag.schluessel === "nachrichten" && marken.neueNachrichten > 0) return marken.neueNachrichten;
  return undefined;
}

export function Reiterzeile({ blatt, waehleBlatt, offeneMeldungen, profil }: ReiterzeileEigenschaften): React.JSX.Element {
  const { imBand, unterMehr } = reiterFuer(profil);
  const neueNachrichten = useLaden((z) => z.lagebild?.nachrichten?.neuFuerStellen ?? 0);
  const marken: Marken = { offeneMeldungen, neueNachrichten };
  const ausMehr = unterMehr.find((eintrag) => eintrag.schluessel === blatt);
  const band = ausMehr === undefined ? imBand : [...imBand, ausMehr];
  return (
    <div className="reiterzeile">
      <div className="reiter" role="tablist" aria-label="Ansichten">
        {band.map((eintrag) => {
          const offen = zahl(eintrag, marken);
          return (
            <button
              key={eintrag.schluessel}
              type="button"
              role="tab"
              aria-selected={blatt === eintrag.schluessel}
              className={eintrag === ausMehr ? "aus-mehr" : undefined}
              title={eintrag === ausMehr ? "Aus „Mehr“ aufgeschlagen" : undefined}
              {...zaehlname(eintrag, marken)}
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
        <Mehrmenue eintraege={unterMehr} blatt={blatt} waehleBlatt={waehleBlatt} marken={marken} />
      )}
    </div>
  );
}

interface MehrmenueEigenschaften extends Omit<ReiterzeileEigenschaften, "profil" | "offeneMeldungen"> {
  readonly eintraege: readonly Reiter[];
  readonly marken: Marken;
}

/** „Mehr ▾": die Blätter, die das Profil nicht ins Band stellt. */
function Mehrmenue({ eintraege, blatt, waehleBlatt, marken }: MehrmenueEigenschaften): React.JSX.Element {
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
          const offen = zahl(eintrag, marken);
          return (
            <button
              key={eintrag.schluessel}
              type="button"
              role="menuitemradio"
              aria-checked={blatt === eintrag.schluessel}
              {...zaehlname(eintrag, marken)}
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
