/**
 * Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5, Option 5b) — der Arbeitsplatz
 * der Vermeldezentrale.
 *
 * Oben das KPI-Band mit den Zahlen des Plans, darunter die Werkzeugzeile:
 * Umschalter „Je Rufgruppe" / „Je Bereich", „Rufgruppe anlegen" (Strg+N),
 * die Suche über Einheit, Funkrufname und Rufgruppe (Strg+F) und der Funkplan
 * als Ausgabe. Links die Rufgruppen mit dem Kasten der gewählten, rechts die
 * Zuordnung. Jede Karte ist eine eigene Datei; diese hier holt die Ansicht,
 * hält die Wahl und verteilt.
 *
 * **Nichts wird hier gerechnet.** Plan und Zahlen kommen aus Ring 2 über den
 * Ruf `funkplanAnfordern`; die Suche schneidet der Worker zu, die Zahlen im
 * Band bleiben die des ganzen Einsatzes. Das Blatt setzt nicht auf der
 * Auswahl der Lage auf (`gehoertZurLage` bleibt falsch).
 *
 * Strg+E öffnet die gewählte Rufgruppe zum Bearbeiten, wie der Knopf im
 * Kasten (Option 5b); in der Lage entfernt dasselbe Kürzel einen Eintrag.
 * Der Name einer Einheit in der Zuordnung öffnet ihre Maske „Funk und
 * Erreichbarkeit" (Option 5d).
 */

import { useCallback, useMemo, useState } from "react";

import type { Funkteilnehmer, Funkzahlen, Rufgruppenkarte } from "@s1/domaene";

import { FunkUndErreichbarkeit } from "./FunkUndErreichbarkeit.js";
import { Funkzuordnung, type Funksicht } from "./Funkzuordnung.js";
import { Hilfemarke } from "./Hilfemarke.js";
import { useLaden } from "./laden.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { RufgruppeMaske, type Anlagezeile } from "./RufgruppeMaske.js";
import { Rufgruppenliste } from "./Rufgruppenliste.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { useFremdsperren } from "./useBearbeitungssperre.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";
import { Versorgungsausgabe } from "./Versorgungsausgabe.js";

export const SICHTEN: readonly { readonly schluessel: Funksicht; readonly titel: string }[] = [
  { schluessel: "rufgruppe", titel: "Je Rufgruppe" },
  { schluessel: "bereich", titel: "Je Bereich" },
];

/** Das KPI-Band: vier Zahlen, „ohne Rufgruppe" in Bernstein ab eins. */
export function Funkband({ zahlen }: { readonly zahlen: Funkzahlen | undefined }): React.JSX.Element {
  const ohne = zahlen?.ohneRufgruppe;
  return (
    <dl className="kpiband funkband" aria-label="Zahlen des Funkplans">
      <div className="kpi">
        <dd>{zahlen?.rufgruppen ?? "—"}</dd>
        <dt>Rufgruppen</dt>
      </div>
      <div className="kpi">
        <dd>{zahlen?.zugeordnet ?? "—"}</dd>
        <dt>Einheiten zugeordnet</dt>
      </div>
      <div className={ohne !== undefined && ohne > 0 ? "kpi warn" : "kpi"}>
        <dd>{ohne ?? "—"}</dd>
        <dt>ohne Rufgruppe</dt>
      </div>
      <div className="kpi">
        <dd>{zahlen?.dmoOderGateway ?? "—"}</dd>
        <dt>DMO · Gateway</dt>
      </div>
    </dl>
  );
}

interface WerkzeugzeileEigenschaften {
  readonly sicht: Funksicht;
  readonly aufSicht: (sicht: Funksicht) => void;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  /** Fehlt im beendeten Einsatz: Dann gibt es nichts anzulegen. */
  readonly aufAnlegen: (() => void) | undefined;
}

/** Umschalter, „Rufgruppe anlegen", Suche und die Ausgabe. */
function Werkzeugzeile(props: WerkzeugzeileEigenschaften): React.JSX.Element {
  return (
    <div className="werkzeugzeile">
      <div className="umschalter" role="group" aria-label="Sicht">
        {SICHTEN.map((eintrag) => (
          <button key={eintrag.schluessel} type="button" aria-pressed={props.sicht === eintrag.schluessel} onClick={() => props.aufSicht(eintrag.schluessel)}>
            {eintrag.titel}
          </button>
        ))}
      </div>
      {props.aufAnlegen !== undefined && (
        <button type="button" className="haupt" onClick={props.aufAnlegen} title={kuerzelText(kuerzel("anlegen") as never)}>
          Rufgruppe anlegen
        </button>
      )}
      <input
        id="funkplansuche"
        type="search"
        className="funksuche"
        aria-label="Suche nach Einheit, Funkrufname oder Rufgruppe"
        placeholder={`Suchen … ${kuerzelText(kuerzel("suchen") as never)}`}
        value={props.suche}
        onChange={(e) => props.aufSuche(e.target.value)}
      />
      <span className="werkzeugrechts">
        <Versorgungsausgabe ausgabe="funkplan" titel="Funkplan" />
      </span>
    </div>
  );
}

type Offen =
  | { readonly art: "anlegen"; readonly fuer?: Anlagezeile }
  | { readonly art: "bearbeiten"; readonly karte: Rufgruppenkarte }
  | { readonly art: "einheit"; readonly teilnehmer: Funkteilnehmer }
  | undefined;

function anlagezeile(t: Funkteilnehmer): Anlagezeile {
  return { einheitId: t.einheitId, einheit: t.einheit, ...(t.rufgruppeId === undefined ? {} : { vorher: t.rufgruppeId }) };
}

export function Funkplan(): React.JSX.Element {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const melde = useLaden((z) => z.melde);
  const nurLesen = useNurLesen();
  const fremd = useFremdsperren();
  const [sicht, setzeSicht] = useState<Funksicht>("rufgruppe");
  const [suche, setzeSuche] = useState("");
  const [gewaehltId, setzeGewaehltId] = useState<string | undefined>(undefined);
  const [offen, setzeOffen] = useState<Offen>(undefined);
  const abruf = useFunkplanansicht(akteId, lageZeiger, suche);
  const plan = abruf.ansicht?.plan;
  const gewaehlt = plan?.rufgruppen.find((r) => r.rufgruppeId === gewaehltId) ?? plan?.rufgruppen.find((r) => !r.aufgeloest);

  const bearbeite = useCallback(
    (karte: Rufgruppenkarte): void => {
      if (nurLesen || karte.aufgeloest) return;
      // Ein anderer Arbeitsplatz hat die Gruppe offen: erst Hinweis, dann bewusstes Übernehmen.
      const hinweis = fremd.pruefeStart(karte.rufgruppeId);
      if (hinweis !== undefined) {
        melde("warnung", hinweis);
        return;
      }
      setzeOffen({ art: "bearbeiten", karte });
    },
    [nurLesen, fremd, melde],
  );

  // Die Maske der Einheit hält den Teilnehmer, wie er beim Öffnen war: Das
  // sind ihre Vorher-Werte, auch wenn der Plan sich derweil auffrischt.
  const oeffneEinheit = useCallback(
    (t: Funkteilnehmer): void => {
      const hinweis = nurLesen ? undefined : fremd.pruefeStart(t.einheitId);
      if (hinweis !== undefined) {
        melde("warnung", hinweis);
        return;
      }
      setzeOffen({ art: "einheit", teilnehmer: t });
    },
    [nurLesen, fremd, melde],
  );

  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) setzeOffen({ art: "anlegen" });
        },
        entfernen: () => {
          if (gewaehlt !== undefined) bearbeite(gewaehlt);
        },
        suchen: () => {
          document.getElementById("funkplansuche")?.focus();
        },
      }),
      [nurLesen, gewaehlt, bearbeite],
    ),
  );

  return (
    <section aria-label="Funkplan" className="funkplan">
      <h2>
        Funkplan <Hilfemarke kennung="funkplan" />
      </h2>
      <NurLesenHinweis />
      <Funkband zahlen={plan?.zahlen} />

      <Werkzeugzeile sicht={sicht} aufSicht={setzeSicht} suche={suche} aufSuche={setzeSuche} aufAnlegen={nurLesen ? undefined : () => setzeOffen({ art: "anlegen" })} />

      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      {plan === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <div className="funkflaeche">
          <Rufgruppenliste rufgruppen={plan.rufgruppen} gewaehlt={gewaehlt} nurLesen={nurLesen} aufWahl={setzeGewaehltId} aufBearbeiten={bearbeite} />
          <Funkzuordnung plan={plan} sicht={sicht} nurLesen={nurLesen} aufNeu={(t) => setzeOffen({ art: "anlegen", fuer: anlagezeile(t) })} aufEinheit={oeffneEinheit} />
        </div>
      )}
      {offen?.art === "einheit" && (
        <FunkUndErreichbarkeit teilnehmer={offen.teilnehmer} rufgruppen={plan?.rufgruppen ?? []} nurLesen={nurLesen} aufSchliessen={() => setzeOffen(undefined)} />
      )}
      {offen !== undefined && offen.art !== "einheit" && (
        <RufgruppeMaske
          {...(offen.art === "bearbeiten" ? { karte: offen.karte } : {})}
          {...(offen.art === "anlegen" && offen.fuer !== undefined ? { fuer: offen.fuer } : {})}
          bereiche={abruf.ansicht?.bereiche ?? []}
          aufSchliessen={() => setzeOffen(undefined)}
        />
      )}
    </section>
  );
}
