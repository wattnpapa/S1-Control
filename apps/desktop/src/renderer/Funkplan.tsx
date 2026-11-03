/**
 * Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5, Option 5b) — der Arbeitsplatz
 * der Vermeldezentrale.
 *
 * Oben das KPI-Band mit den sechs Zahlen des Plans, darunter die
 * Werkzeugzeile (`Funkwerkzeuge.tsx`): Umschalter „Je Rufgruppe" / „Je
 * Bereich" / „Funkproben", „Rufgruppe anlegen" (Strg+N), „Funkprobe
 * eintragen" (Strg+P) und „kein Kontakt …" für die markierte Einheit, die
 * Schwelle „kein Kontakt", die Suche über Einheit, Funkrufname, Rufgruppen und
 * Funkhinweis (Strg+F) und der Funkplan als Ausgabe. Links die Rufgruppen mit
 * dem Kasten der gewählten, rechts die Zuordnung oder die Funkproben. Jede
 * Karte ist eine eigene Datei; diese hier holt die Ansicht, hält Wahl und
 * Markierung und verteilt.
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

import { projektion, type Funkplan as Funkplandaten, type Funkteilnehmer, type Funkzahlen, type Rufgruppenkarte } from "@s1/domaene";

import type { Funkplanansicht } from "../kontrakt/index.js";

import { FunkUndErreichbarkeit } from "./FunkUndErreichbarkeit.js";
import { Funkprobenliste } from "./Funkprobenliste.js";
import { Werkzeugzeile } from "./Funkwerkzeuge.js";
import { Funkzuordnung, type Funksicht } from "./Funkzuordnung.js";
import { useLaden } from "./laden.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { RufgruppeMaske, type Anlagezeile } from "./RufgruppeMaske.js";
import { Rufgruppenliste } from "./Rufgruppenliste.js";
import { useKuerzel } from "./tastatur.js";
import { useFremdsperren } from "./useBearbeitungssperre.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";
import { useFunkprobe } from "./useFunkprobe.js";

/** Eine Kachel des Bandes; `warn` färbt Bernstein. */
function Kachel({ wert, titel, warn = false }: { readonly wert: React.ReactNode; readonly titel: string; readonly warn?: boolean }): React.JSX.Element {
  return (
    <div className={warn ? "kpi warn" : "kpi"}>
      <dd>{wert}</dd>
      <dt>{titel}</dt>
    </div>
  );
}

/**
 * Das KPI-Band: sechs Zahlen. „ohne Rufgruppe" und „kein Kontakt" über der
 * Schwelle in Bernstein ab eins; die letzte Funkprobe als Uhrzeit, wie der
 * Sprechfunker sie sagt.
 */
export function Funkband({ zahlen, schwelleMinuten }: { readonly zahlen: Funkzahlen | undefined; readonly schwelleMinuten?: number | undefined }): React.JSX.Element {
  const ohne = zahlen?.ohneRufgruppe;
  const keinKontakt = zahlen?.ohneKontakt;
  const letzte = zahlen?.letzteFunkprobe;
  return (
    <dl className="kpiband funkband" aria-label="Zahlen des Funkplans">
      <Kachel wert={zahlen?.rufgruppen ?? "—"} titel="Rufgruppen" />
      <Kachel wert={zahlen?.zugeordnet ?? "—"} titel="Einheiten zugeordnet" />
      <Kachel wert={ohne ?? "—"} titel="ohne Rufgruppe" warn={ohne !== undefined && ohne > 0} />
      <Kachel wert={keinKontakt ?? "—"} titel={`kein Kontakt > ${String(schwelleMinuten ?? "—")} min`} warn={keinKontakt !== undefined && keinKontakt > 0} />
      <Kachel wert={zahlen?.dmoOderGateway ?? "—"} titel="DMO · Gateway" />
      <Kachel wert={letzte === undefined ? "—" : projektion.uhrzeitKurz(letzte)} titel="letzte Funkprobe" />
    </dl>
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

/** Die markierte Einheit im aktuellen Plan — frisch, damit ihre Proben der richtige Vorher-Wert sind. */
function teilnehmerVon(plan: Funkplandaten | undefined, einheitId: string | undefined): Funkteilnehmer | undefined {
  if (plan === undefined || einheitId === undefined) return undefined;
  return [...plan.rufgruppen.flatMap((r) => r.teilnehmer), ...plan.ohneRufgruppe].find((t) => t.einheitId === einheitId);
}

/**
 * Welche Maske offen ist, und die beiden Wege hinein: eine Rufgruppe
 * bearbeiten und eine Einheit öffnen — jeweils erst nach der Sperrprüfung.
 */
function useFunkplanmasken(nurLesen: boolean): {
  readonly offen: Offen;
  readonly setzeOffen: (offen: Offen) => void;
  readonly bearbeite: (karte: Rufgruppenkarte) => void;
  readonly oeffneEinheit: (t: Funkteilnehmer) => void;
} {
  const melde = useLaden((z) => z.melde);
  const fremd = useFremdsperren();
  const [offen, setzeOffen] = useState<Offen>(undefined);
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
  return { offen, setzeOffen, bearbeite, oeffneEinheit };
}

interface FlaecheEigenschaften {
  readonly ansicht: Funkplanansicht;
  readonly sicht: Funksicht;
  readonly nurLesen: boolean;
  readonly gewaehlt: Rufgruppenkarte | undefined;
  readonly aufWahl: (rufgruppeId: string) => void;
  readonly masken: ReturnType<typeof useFunkplanmasken>;
  readonly markiertId: string | undefined;
  readonly aufMarkieren: (t: Funkteilnehmer) => void;
}

/** Links die Rufgruppen, rechts die Zuordnung oder die Funkproben. */
function Funkflaeche(props: FlaecheEigenschaften): React.JSX.Element {
  const { ansicht, sicht, nurLesen, masken } = props;
  return (
    <div className="funkflaeche">
      <Rufgruppenliste rufgruppen={ansicht.plan.rufgruppen} gewaehlt={props.gewaehlt} nurLesen={nurLesen} aufWahl={props.aufWahl} aufBearbeiten={masken.bearbeite} />
      {sicht === "funkproben" ? (
        <Funkprobenliste funkproben={ansicht.funkproben} />
      ) : (
        <Funkzuordnung
          plan={ansicht.plan}
          sicht={sicht}
          jetzt={ansicht.jetzt}
          nurLesen={nurLesen}
          markiertId={props.markiertId}
          aufMarkieren={props.aufMarkieren}
          aufNeu={(t) => masken.setzeOffen({ art: "anlegen", fuer: anlagezeile(t) })}
          aufEinheit={masken.oeffneEinheit}
        />
      )}
    </div>
  );
}

/** „Funkprobe eintragen" und „kein Kontakt …" für die markierte Einheit; ohne Markierung ein Hinweis. */
function useProbeFuerMarkierte(
  nurLesen: boolean,
  markiert: Funkteilnehmer | undefined,
): { readonly probe: (ergebnis: "KONTAKT" | "KEIN_KONTAKT") => void; readonly maske: React.JSX.Element | null } {
  const melde = useLaden((z) => z.melde);
  const funkprobe = useFunkprobe();
  const probe = (ergebnis: "KONTAKT" | "KEIN_KONTAKT"): void => {
    if (nurLesen) return;
    if (markiert === undefined) {
      melde("info", "Funkprobe: erst eine Einheit in der Zuordnung markieren.");
      return;
    }
    if (ergebnis === "KONTAKT") funkprobe.kontakt(markiert);
    else funkprobe.keinKontakt(markiert);
  };
  return { probe, maske: funkprobe.maske };
}

export function Funkplan(): React.JSX.Element {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const nurLesen = useNurLesen();
  const [sicht, setzeSicht] = useState<Funksicht>("rufgruppe");
  const [suche, setzeSuche] = useState("");
  const [gewaehltId, setzeGewaehltId] = useState<string | undefined>(undefined);
  const [markiertId, setzeMarkiertId] = useState<string | undefined>(undefined);
  const masken = useFunkplanmasken(nurLesen);
  const abruf = useFunkplanansicht(akteId, lageZeiger, suche, true);
  const plan = abruf.ansicht?.plan;
  const gewaehlt = plan?.rufgruppen.find((r) => r.rufgruppeId === gewaehltId) ?? plan?.rufgruppen.find((r) => !r.aufgeloest);
  const markiert = teilnehmerVon(plan, markiertId);
  const { probe, maske: grundmaske } = useProbeFuerMarkierte(nurLesen, markiert);
  const { offen, setzeOffen, bearbeite } = masken;

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
        funkprobe: () => probe("KONTAKT"),
      }),
      [nurLesen, gewaehlt, bearbeite, setzeOffen, probe],
    ),
  );

  return (
    <section aria-label="Funkplan" className="funkplan">
      <h2>Funkplan</h2>
      <NurLesenHinweis />
      <Funkband zahlen={plan?.zahlen} schwelleMinuten={plan?.schwelleMinuten} />
      <Werkzeugzeile
        sicht={sicht}
        aufSicht={setzeSicht}
        suche={suche}
        aufSuche={setzeSuche}
        aufAnlegen={nurLesen ? undefined : () => setzeOffen({ art: "anlegen" })}
        markiert={markiert}
        aufKontakt={() => probe("KONTAKT")}
        aufKeinKontakt={() => probe("KEIN_KONTAKT")}
        schwelleMinuten={plan?.schwelleMinuten}
        nurLesen={nurLesen}
      />
      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      {abruf.ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <Funkflaeche ansicht={abruf.ansicht} sicht={sicht} nurLesen={nurLesen} gewaehlt={gewaehlt} aufWahl={setzeGewaehltId} masken={masken} markiertId={markiertId} aufMarkieren={(t) => setzeMarkiertId(t.einheitId)} />
      )}
      {offen?.art === "einheit" && (
        <FunkUndErreichbarkeit teilnehmer={offen.teilnehmer} rufgruppen={plan?.rufgruppen ?? []} schwelleMinuten={plan?.schwelleMinuten} nurLesen={nurLesen} aufSchliessen={() => setzeOffen(undefined)} />
      )}
      {offen !== undefined && offen.art !== "einheit" && (
        <RufgruppeMaske
          {...(offen.art === "bearbeiten" ? { karte: offen.karte } : {})}
          {...(offen.art === "anlegen" && offen.fuer !== undefined ? { fuer: offen.fuer } : {})}
          bereiche={abruf.ansicht?.bereiche ?? []}
          aufSchliessen={() => setzeOffen(undefined)}
        />
      )}
      {grundmaske}
    </section>
  );
}
