/**
 * Die Maske „An den Sichter weitergeben" des Leiters des Fernmeldebetriebes
 * (bestätigt am 2026-11-17, KONZEPT-NACHRICHTEN.md §5): Der LdF hat Aufnahme
 * und Nachweisung eines Eingangs geprüft und gibt ihn mit Zeit und
 * Handzeichen an den Sichter. Den Ausgangsschritt des LdF führt die Maske
 * „Übermittlung vorschlagen" der FmZ (`Fmzmasken.tsx`).
 *
 * Wie die Masken der FmZ: Zeit „jetzt" und Handzeichen der Sitzung
 * vorbelegt und editierbar (Papier-Rückfall, §6), die weiche Sperre auf der
 * Nachricht, solange die Maske offen ist, und der Vorher-Wert vom Öffnen.
 * Eine Abweisung wegen eines fremden neueren Werts steht in Worten da, mit
 * „Neu laden“ (Fernmelder P2-6, `Vorwertkonflikt.tsx`).
 */

import { useState } from "react";

import { datumZeitGruppe, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import { nachrichtWeitergeben } from "../kontrakt/ldfschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { zeitAusEingabe } from "./nachrichtenformate.js";
import { useStellenvorbehalt } from "./Stellenvorbehalt.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { Konflikthinweis, istVorwertAbweisung, konflikttext, nachrichtNeuHolen } from "./Vorwertkonflikt.js";

export interface Weitergabeeingaben {
  readonly zeit: string;
  readonly handzeichen: string;
}

/** Der Entwurf der Weitergabe aus den Eingaben, oder der Satz, was fehlt. */
export function weitergabeEntwurf(zeile: Nachrichtenzeile, e: Weitergabeeingaben, jetzt: Date = new Date()): Entwurf | string {
  const zeitpunkt = zeitAusEingabe(e.zeit, jetzt);
  if (zeitpunkt === undefined) return "Zeit lesbar eintragen, etwa „1045“";
  if (e.handzeichen.trim() === "") return "Handzeichen eintragen";
  return nachrichtWeitergeben(zeile.id, zeile.weitergabe ?? null, { zeitpunkt, handzeichen: e.handzeichen });
}

export interface WeitergabemaskeEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly aufSchliessen: () => void;
}

/** Mit „Neu laden“ (Fernmelder P2-6): nach einer Abweisung frisch gezeichnet, mit dem geltenden Vorher-Wert. */
export function Weitergabemaske(p: WeitergabemaskeEigenschaften): React.JSX.Element {
  const [stand, setzeStand] = useState({ zeile: p.zeile, runde: 0 });
  return <WeitergabemaskeInnen key={stand.runde} {...p} zeile={stand.zeile} aufNeuLaden={(zeile) => setzeStand((s) => ({ zeile, runde: s.runde + 1 }))} />;
}

function WeitergabemaskeInnen(p: WeitergabemaskeEigenschaften & { readonly aufNeuLaden: (zeile: Nachrichtenzeile) => void }): React.JSX.Element {
  const [konflikt, setzeKonflikt] = useState<string | undefined>(undefined);
  const peers = useLaden((z) => z.lagebild?.peers);
  const [e, setzeE] = useState<Weitergabeeingaben>(() => ({ zeit: datumZeitGruppe(new Date()), handzeichen: p.handzeichen }));
  const versuch = useAnlegeversuch();
  useSperreHalten(p.zeile.id);
  const fremd = useFremdsperren().von(p.zeile.id);
  // Entscheidung 13, LdF P2-3: Hinweis statt Recht (Folie 7), `grund` im Tagebuch.
  const vorbehalt = useStellenvorbehalt("weitergabe");
  const entwurf = weitergabeEntwurf(p.zeile, e);

  async function schreibe(): Promise<void> {
    if (typeof entwurf === "string") return;
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(vorbehalt.grund === undefined ? entwurf : { ...entwurf, grund: vorbehalt.grund });
    if (istVorwertAbweisung(ergebnis)) {
      setzeKonflikt(konflikttext(entwurf.typ, ergebnis.meldung, peers ?? []));
      return;
    }
    if (ergebnis?.art !== "geschrieben") return;
    for (const satz of ergebnis.warnungen ?? []) useLaden.getState().melde("info", satz);
    p.aufSchliessen();
  }

  const nummer = p.zeile.nummer === undefined ? p.zeile.richtungKurz : `${p.zeile.richtungKurz} ${String(p.zeile.nummer)}`;
  return (
    <Maske
      titel={`An den Sichter weitergeben · ${nummer} ${p.zeile.betreff}`}
      bestaetigungstext="Weitergeben"
      nurKnopf
      bereit={typeof entwurf !== "string" && !versuch.gesperrt && !vorbehalt.gesperrt}
      bereitGrund={typeof entwurf === "string" ? entwurf : (versuch.sperre ?? (vorbehalt.gesperrt ? "Erst „Trotzdem“ wählen" : undefined))}
      aufAbbrechen={p.aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {fremd !== undefined && <p className="warnung">{sperrtext(fremd)}</p>}
      {vorbehalt.hinweis}
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Uhrzeit" wert={e.zeit} aufAenderung={(wert) => setzeE((bisher) => ({ ...bisher, zeit: wert }))} />
        <label>
          Handzeichen
          <input value={e.handzeichen} maxLength={20} onChange={(ev) => setzeE((bisher) => ({ ...bisher, handzeichen: ev.target.value }))} />
        </label>
      </div>
      {konflikt === undefined ? (
        versuch.anzeige
      ) : (
        <Konflikthinweis
          text={konflikt}
          aufNeuLaden={() => {
            void nachrichtNeuHolen(p.zeile.id).then((neu) => {
              if (neu !== undefined) p.aufNeuLaden(neu);
            });
          }}
        />
      )}
    </Maske>
  );
}
