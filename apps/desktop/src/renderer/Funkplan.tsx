/**
 * Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5, Option 5b) — der Arbeitsplatz
 * der Vermeldezentrale.
 *
 * Oben das KPI-Band mit den sechs Zahlen des Plans, darunter die
 * Werkzeugzeile (`Funkwerkzeuge.tsx`, seit Runde 6 nach Option 6f):
 * Umschalter „Je Rufgruppe" / „Je Bereich" / „Funkproben", der Hauptknopf
 * „Rufgruppe anlegen" (Strg+N), die Suche über Einheit, Funkrufname,
 * Rufgruppen und Funkhinweis (Strg+F) und „⋯" mit Schwelle und Ausdruck.
 * Links die Rufgruppen mit „⋯" an der gewählten Zeile und dem Kasten der
 * gewählten, rechts die Zuordnung oder die Funkproben. Für die gewählte
 * Einheit steht die Auswahlleiste am Fuß der Zuordnung (`Funkauswahl.tsx`:
 * Funkprobe mit Strg+P, „kein Kontakt …", Funkmaske, Rufgruppe ändern),
 * dieselben Schritte als Kontextmenü an der Zeile; Esc hebt die Wahl auf.
 * Jede Karte ist eine eigene Datei; diese hier holt die Ansicht, hält Wahl
 * und Markierung und verteilt.
 *
 * **Nichts wird hier gerechnet.** Plan und Zahlen kommen aus Ring 2 über den
 * Ruf `funkplanAnfordern`; die Suche schneidet der Worker zu, die Zahlen im
 * Band bleiben die des ganzen Einsatzes. Das Blatt setzt nicht auf der
 * Auswahl der Lage auf (`gehoertZurLage` bleibt falsch).
 *
 * Strg+E öffnet die gewählte Rufgruppe zum Bearbeiten, wie „Bearbeiten …"
 * an ihrer Zeile; in der Lage entfernt dasselbe Kürzel einen Eintrag.
 * Der Name einer Einheit in der Zuordnung öffnet ihre Maske „Funk und
 * Erreichbarkeit" (Option 5d).
 */

import { useMemo, useState } from "react";

import { projektion, type Funkteilnehmer, type Funkzahlen, type Rufgruppenkarte } from "@s1/domaene";

import type { Funkplanansicht } from "../kontrakt/index.js";

import { Funkkontextmenue, Funkleiste, type FunkauswahlEigenschaften } from "./Funkauswahl.js";
import { FunkUndErreichbarkeit } from "./FunkUndErreichbarkeit.js";
import { Funkprobenliste } from "./Funkprobenliste.js";
import { Werkzeugzeile } from "./Funkwerkzeuge.js";
import { Funkzuordnung, type Funksicht } from "./Funkzuordnung.js";
import type { Kontextort } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { RufgruppeMaske } from "./RufgruppeMaske.js";
import { Rufgruppenliste } from "./Rufgruppenliste.js";
import { useKuerzel } from "./tastatur.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";
import { anlagezeile, teilnehmerVon, useFunkplanmasken, useProbeFuerGewaehlte, type Funkplanmasken } from "./useFunkplanmasken.js";

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

/** Was die Zuordnung für die gewählte Einheit braucht: Leiste, Kontextmenü, „Rufgruppe ändern …". */
interface Auswahlstand {
  readonly auswahl: FunkauswahlEigenschaften | undefined;
  readonly aufKontext: (ort: Kontextort) => void;
  readonly rufgruppeOeffnen: { readonly einheitId: string; readonly nr: number } | undefined;
}

interface FlaecheEigenschaften {
  readonly ansicht: Funkplanansicht;
  readonly sicht: Funksicht;
  readonly nurLesen: boolean;
  readonly gewaehlt: Rufgruppenkarte | undefined;
  readonly aufWahl: (rufgruppeId: string) => void;
  readonly masken: Funkplanmasken;
  readonly markiertId: string | undefined;
  readonly aufMarkieren: (t: Funkteilnehmer) => void;
  readonly stand: Auswahlstand;
}

/** Links die Rufgruppen, rechts die Zuordnung oder die Funkproben. */
function Funkflaeche(props: FlaecheEigenschaften): React.JSX.Element {
  const { ansicht, sicht, nurLesen, masken, stand } = props;
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
          aufKontext={stand.aufKontext}
          rufgruppeOeffnen={stand.rufgruppeOeffnen}
          fuss={stand.auswahl === undefined ? undefined : <Funkleiste {...stand.auswahl} />}
        />
      )}
    </div>
  );
}

/**
 * Die gewählte Einheit der Zuordnung: die Schritte der Leiste, der Ort des
 * Kontextmenüs und die Anfrage „Rufgruppe ändern …" an ihre Zelle.
 */
function useFunkauswahl(
  nurLesen: boolean,
  markiert: Funkteilnehmer | undefined,
  masken: Funkplanmasken,
): {
  readonly probe: (ergebnis: "KONTAKT" | "KEIN_KONTAKT") => void;
  readonly stand: Auswahlstand;
  readonly kontextmenue: React.JSX.Element | null;
  readonly grundmaske: React.JSX.Element | null;
} {
  const { probe, maske } = useProbeFuerGewaehlte(nurLesen, markiert);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const [rufgruppeOeffnen, setzeRufgruppeOeffnen] = useState<{ readonly einheitId: string; readonly nr: number } | undefined>(undefined);
  const auswahl: FunkauswahlEigenschaften | undefined =
    markiert === undefined
      ? undefined
      : {
          markiert,
          nurLesen,
          aufKontakt: () => probe("KONTAKT"),
          aufKeinKontakt: () => probe("KEIN_KONTAKT"),
          aufEinheit: () => masken.oeffneEinheit(markiert),
          aufRufgruppe: () => setzeRufgruppeOeffnen((bisher) => ({ einheitId: markiert.einheitId, nr: (bisher?.nr ?? 0) + 1 })),
        };
  const stand: Auswahlstand = { auswahl, aufKontext: setzeKontext, rufgruppeOeffnen };
  const kontextmenue =
    kontext === undefined || auswahl === undefined ? null : <Funkkontextmenue {...auswahl} ort={kontext} aufSchliessen={() => setzeKontext(undefined)} />;
  return { probe, stand, kontextmenue, grundmaske: maske };
}

/** Die offene Maske: Funk und Erreichbarkeit einer Einheit oder eine Rufgruppe. */
function Funkplanmaske({ masken, ansicht, nurLesen }: { readonly masken: Funkplanmasken; readonly ansicht: Funkplanansicht | undefined; readonly nurLesen: boolean }): React.JSX.Element | null {
  const { offen, setzeOffen } = masken;
  const plan = ansicht?.plan;
  if (offen === undefined) return null;
  if (offen.art === "einheit") {
    return (
      <FunkUndErreichbarkeit teilnehmer={offen.teilnehmer} rufgruppen={plan?.rufgruppen ?? []} schwelleMinuten={plan?.schwelleMinuten} nurLesen={nurLesen} aufSchliessen={() => setzeOffen(undefined)} />
    );
  }
  return (
    <RufgruppeMaske
      {...(offen.art === "bearbeiten" ? { karte: offen.karte } : {})}
      {...(offen.art === "anlegen" && offen.fuer !== undefined ? { fuer: offen.fuer } : {})}
      bereiche={ansicht?.bereiche ?? []}
      aufSchliessen={() => setzeOffen(undefined)}
    />
  );
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
  const { probe, stand, kontextmenue, grundmaske } = useFunkauswahl(nurLesen, teilnehmerVon(plan, markiertId), masken);
  const { setzeOffen, bearbeite } = masken;

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
        abbrechen: () => setzeMarkiertId(undefined),
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
        schwelleMinuten={plan?.schwelleMinuten}
        nurLesen={nurLesen}
      />
      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      {abruf.ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <Funkflaeche
          ansicht={abruf.ansicht}
          sicht={sicht}
          nurLesen={nurLesen}
          gewaehlt={gewaehlt}
          aufWahl={setzeGewaehltId}
          masken={masken}
          markiertId={markiertId}
          aufMarkieren={(t) => setzeMarkiertId(t.einheitId)}
          stand={stand}
        />
      )}
      {kontextmenue}
      <Funkplanmaske masken={masken} ansicht={abruf.ansicht} nurLesen={nurLesen} />
      {grundmaske}
    </section>
  );
}
