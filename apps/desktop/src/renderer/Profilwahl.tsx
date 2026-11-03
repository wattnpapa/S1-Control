/**
 * Die Wahl des Profils auf der Einsatzauswahl (Entwurf „Entlastung", 3.2,
 * Option 6g, Schnitt E3).
 *
 * Unter dem Feld steht je Profil, welche Reiter es ins Band stellt. Der Text
 * kommt aus `reiterFuer` und nicht aus einer eigenen Liste: Was hier steht,
 * ist, was das Kopfband nachher zeigt.
 *
 * **Kein Recht.** Das Profil ist ein Zuschnitt der Oberfläche wie die
 * Betriebsart. Wer es wählt, verliert kein Blatt; die übrigen stehen unter
 * „Mehr". Im Meldekopf gilt dessen eigener Zuschnitt, das Feld ist dann
 * gesperrt und behält seinen Wert für den Tag, an dem der Arbeitsplatz
 * wieder Führungsstelle ist.
 */

import { PROFILE, type Profil } from "../kontrakt/index.js";
import { reiterFuer } from "./blaetter.js";

export const PROFILNAME: Readonly<Record<Profil, string>> = {
  fuehrungsstelle: "Führungsstelle (S1)",
  vermeldezentrale: "Vermeldezentrale",
  versorgung: "Versorgung (S4)",
  alle: "Alle Blätter",
};

export const TEXT_PROFIL_KEIN_RECHT =
  "Das Profil ist ein Zuschnitt der Oberfläche, kein Recht: Jedes Blatt bleibt unter „Mehr“ erreichbar.";

export const TEXT_PROFIL_MELDEKOPF = "Der Meldekopf hat seinen eigenen Zuschnitt.";

/** „Lage · Eingang · Führungsstelle · Ausgaben · Einsatztagebuch" — das Band des Profils. */
export function profilband(profil: Profil): string {
  if (profil === "alle") return "alle Reiter";
  return reiterFuer(profil)
    .imBand.map((eintrag) => eintrag.titel)
    .join(" · ");
}

export interface ProfilwahlEigenschaften {
  readonly profil: Profil;
  readonly aufWahl: (profil: Profil) => void;
  /** Im Meldekopf gilt das Profil nicht. */
  readonly gesperrt: boolean;
}

export function Profilwahl({ profil, aufWahl, gesperrt }: ProfilwahlEigenschaften): React.JSX.Element {
  return (
    <>
      <label>
        Profil
        <select
          value={profil}
          disabled={gesperrt}
          aria-describedby="profilerklaerung"
          onChange={(e) => {
            aufWahl(e.target.value as Profil);
          }}
        >
          {PROFILE.map((kennung) => (
            <option key={kennung} value={kennung}>
              {PROFILNAME[kennung]}
            </option>
          ))}
        </select>
      </label>
      <div id="profilerklaerung" className="hinweistext profilerklaerung">
        {gesperrt ? (
          <p>{TEXT_PROFIL_MELDEKOPF}</p>
        ) : (
          <>
            <ul>
              {PROFILE.map((kennung) => (
                <li key={kennung} className={kennung === profil ? "gewaehlt" : undefined}>
                  {PROFILNAME[kennung]}: {profilband(kennung)}
                </li>
              ))}
            </ul>
            <p>{TEXT_PROFIL_KEIN_RECHT}</p>
          </>
        )}
      </div>
    </>
  );
}
