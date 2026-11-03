/**
 * Die Anforderungen (M5.3).
 *
 * Die Excel führt sie als sechs Spalten einer Einheitenzeile — N bis S
 * (`excel-domaenenmodell.md` §2). Im Zielmodell sind sie eine **eigene
 * Entität** mit einer Zustandsmaschine (KONZEPT-EREIGNISSE.md §5.6), und der
 * Unterschied ist der Grund für dieses Blatt: Eine Anforderung, die noch keine
 * Einheit hat, hätte in der Vorlage keine Zeile — und genau das ist der
 * Normalfall zwischen Anforderung und Zusage.
 *
 * **Der Zustand wird gezeigt, nicht gesetzt.** Er ist nach §5.6.2 aus drei
 * gewöhnlichen Feldern abgeleitet: `erledigung` schlägt `storno` schlägt
 * `zusage`. Deshalb gibt es hier auch keinen „Zustand ändern“-Knopf, sondern
 * je einen für die drei Handlungen und je einen für ihre Rücknahme. Ein
 * einzelnes Zustandsfeld ließe `EINGETROFFEN → ZUGESAGT` zu, sobald eine
 * verspätete Zusage eine höhere HLC trägt — den Rückschritt, den P6 verbietet.
 *
 * Seit Runde 6 (Entwurf „Entlastung", 3.7) folgt das Blatt dem Muster der
 * Lage: im Kopf der Hauptknopf „Anforderung anlegen" (Strg+N), der die
 * Maske öffnet (`Anforderungsmaske.tsx`), darunter die Filterzeile mit
 * Chips; die Handlungen stehen erst mit der Wahl einer Zeile in der
 * Auswahlleiste und im Kontextmenü (`Anforderungsauswahl.tsx`).
 */

import { useEffect, useMemo, useState } from "react";

import { zeitpunktText, type Anforderungszeile, type Anforderungszustand } from "@s1/domaene";

import { AnforderungZuEinheit } from "./AnforderungZuEinheit.js";
import { AnforderungZusage } from "./AnforderungZusage.js";
import {
  Anforderungskontextmenue,
  Anforderungsleiste,
  type Anforderungsmaske as Zeilenmaske,
  type AnforderungsauswahlEigenschaften,
} from "./Anforderungsauswahl.js";
import { Anforderungsmaske } from "./Anforderungsmaske.js";
import { useFeldversuch } from "./Feldschreiben.js";
import { Filterchips } from "./Filterchips.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import type { Kontextort } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";
import { anforderungStorniert, ruecknahme } from "../kontrakt/bedienschritte.js";

/** Die vier Zustände mit ihrer Beschriftung und dem Ton ihrer Marke, in der Ordnung der Liste. */
const ZUSTAENDE: readonly { readonly wert: Anforderungszustand; readonly titel: string; readonly ton: string }[] = [
  { wert: "OFFEN", titel: "Offen", ton: "fehler" },
  { wert: "ZUGESAGT", titel: "Zugesagt", ton: "warn" },
  { wert: "EINGETROFFEN", titel: "Eingetroffen", ton: "ok" },
  { wert: "STORNIERT", titel: "Storniert", ton: "" },
];

/** Das Wort zum Zustand — die Liste zeigt keine Schlüssel. */
function zustandTitel(wert: Anforderungszustand): string {
  return ZUSTAENDE.find((zustand) => zustand.wert === wert)?.titel ?? wert;
}

/** Die Zustandsfilter als Chips mit der Zahl je Zustand. */
function Zustandsfilter(): React.JSX.Element {
  const ansicht = useLaden((z) => z.anforderungen);
  const filter = useLaden((z) => z.anforderungsfilter);
  const setzeFilter = useLaden((z) => z.setzeAnforderungsfilter);
  const chips = ZUSTAENDE.map((z) => ({ ...z, anzahl: ansicht === undefined ? undefined : (ansicht.jeZustand[z.wert] ?? 0) }));
  return (
    <Filterchips
      beschriftung="Filter nach Zustand"
      chips={chips}
      wahl={filter.zustaende ?? []}
      aufWahl={(wahl) => void setzeFilter(wahl.length === 0 ? {} : { zustaende: wahl as Anforderungszustand[] })}
    />
  );
}

/** Was die gewählte Anforderung schreibt und welche Maske sie öffnet. */
function useAnforderungsschritte(zeile: Anforderungszeile | undefined): {
  readonly auswahl: AnforderungsauswahlEigenschaften | undefined;
  readonly masken: React.ReactNode;
} {
  const bediene = useLaden((z) => z.bediene);
  const grundabfrage = useGrundabfrage();
  const aktion = useFeldversuch();
  const nurLesen = useNurLesen();
  const verbindung = useSchreibsperre();
  const [maske, setzeMaske] = useState<{ readonly art: Exclude<Zeilenmaske, "storno">; readonly zeile: Anforderungszeile } | undefined>(undefined);
  const sperre = nurLesen ? TEXT_NUR_LESEN : undefined;
  const ruecknahmeSperre = sperre ?? (aktion.gesperrt ? (verbindung ?? "Gerade nicht möglich") : aktion.laeuft ? "Wird geschrieben …" : undefined);
  const schliesse = (): void => setzeMaske(undefined);
  const masken = (
    <>
      {aktion.anzeige}
      {grundabfrage.maske}
      {maske?.art === "zusage" && <AnforderungZusage zeile={maske.zeile} aufSchliessen={schliesse} />}
      {(maske?.art === "eintreffen" || maske?.art === "nachtragen") && <AnforderungZuEinheit zeile={maske.zeile} art={maske.art} aufSchliessen={schliesse} />}
    </>
  );
  if (zeile === undefined) return { auswahl: undefined, masken };
  const storniere = (): void => {
    // §2.4: Das Storno ist einer der Pflichtfälle für `grund`. Ohne ihn weist
    // der Aktendienst das Ereignis ab, und die Abweisung wäre für den
    // Bediener nicht erklärbar.
    grundabfrage.frage({
      titel: "Anforderung stornieren",
      erlaeuterung: "Die Stornierung steht mit diesem Grund im Einsatztagebuch und ist später von einem Versehen zu unterscheiden.",
      bestaetigungstext: "Stornieren",
      aufGrund: (grund) => bediene(anforderungStorniert(zeile.id, grund)),
    });
  };
  const auswahl: AnforderungsauswahlEigenschaften = {
    zeile,
    sperre,
    ruecknahmeSperre,
    aufMaske: (art) => (art === "storno" ? storniere() : setzeMaske({ art, zeile })),
    aufRuecknahme: (was) => void aktion.schreibe(ruecknahme(zeile.id, was)),
  };
  return { auswahl, masken };
}

/** Kopf: Titel und der Hauptknopf „Anforderung anlegen". */
function Anforderungskopf({ aufAnlegen }: { readonly aufAnlegen: () => void }): React.JSX.Element {
  const nurLesen = useNurLesen();
  return (
    <div className="einheitenkopf anforderungskopf">
      <h2>Anforderungen</h2>
      <button
        type="button"
        className="haupt"
        disabled={nurLesen}
        title={nurLesen ? TEXT_NUR_LESEN : `Neue Anforderung anlegen (${kuerzelText(kuerzel("anlegen") as never)})`}
        onClick={aufAnlegen}
      >
        Anforderung anlegen
      </button>
    </div>
  );
}

export function Anforderungen(): React.JSX.Element {
  const holeAnforderungen = useLaden((z) => z.holeAnforderungen);
  const ansicht = useLaden((z) => z.anforderungen);
  const nurLesen = useNurLesen();
  const [anlegen, setzeAnlegen] = useState(false);
  const [gewaehltId, setzeGewaehltId] = useState<string | undefined>(undefined);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const gewaehlt = ansicht?.zeilen.find((zeile) => zeile.id === gewaehltId);
  const { auswahl, masken } = useAnforderungsschritte(gewaehlt);

  useEffect(() => {
    void holeAnforderungen();
  }, [holeAnforderungen]);
  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) setzeAnlegen(true);
        },
        abbrechen: () => setzeGewaehltId(undefined),
      }),
      [nurLesen],
    ),
  );

  return (
    <section aria-label="Anforderungen" className="anforderungen">
      <Anforderungskopf aufAnlegen={() => setzeAnlegen(true)} />
      <NurLesenHinweis />
      <Zustandsfilter />
      {ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : ansicht.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Anforderung.</p>
      ) : (
        <Anforderungstabelle zeilen={ansicht.zeilen} gewaehlt={gewaehltId} aufWahl={setzeGewaehltId} aufKontext={setzeKontext} />
      )}
      {ansicht !== undefined && ansicht.gesamtzahl > ansicht.zeilen.length && (
        <p className="hinweistext">
          {ansicht.zeilen.length} von {ansicht.gesamtzahl} Anforderungen.
        </p>
      )}
      {auswahl !== undefined && <Anforderungsleiste {...auswahl} />}
      {auswahl !== undefined && kontext !== undefined && <Anforderungskontextmenue {...auswahl} ort={kontext} aufSchliessen={() => setzeKontext(undefined)} />}
      {masken}
      {anlegen && <Anforderungsmaske einheitenwahl={ansicht?.einheitenwahl ?? []} aufSchliessen={() => setzeAnlegen(false)} />}
    </section>
  );
}

interface TabellenEigenschaften {
  readonly zeilen: readonly Anforderungszeile[];
  readonly gewaehlt: string | undefined;
  readonly aufWahl: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
}

function Anforderungstabelle({ zeilen, gewaehlt, aufWahl, aufKontext }: TabellenEigenschaften): React.JSX.Element {
  return (
    <table className="anforderungstabelle" aria-label="Liste der Anforderungen">
      <thead>
        <tr>
          <th scope="col">Zustand</th>
          <th scope="col">Kennung</th>
          <th scope="col">Angefordert</th>
          <th scope="col">Ablösung für</th>
          <th scope="col">Vorgesehen</th>
          <th scope="col">Auftrag</th>
          <th scope="col">Zusage</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((zeile) => (
          <Zeile key={zeile.id} zeile={zeile} gewaehlt={zeile.id === gewaehlt} aufWahl={aufWahl} aufKontext={aufKontext} />
        ))}
      </tbody>
    </table>
  );
}

interface ZeilenEigenschaften {
  readonly zeile: Anforderungszeile;
  readonly gewaehlt: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
}

function Zeile({ zeile, gewaehlt, aufWahl, aufKontext }: ZeilenEigenschaften): React.JSX.Element {
  const klassen = [zeile.zustand === "STORNIERT" ? "storniert" : "", gewaehlt ? "gewaehlt" : ""].filter((k) => k !== "").join(" ");
  return (
    <tr
      className={klassen === "" ? undefined : klassen}
      aria-selected={gewaehlt}
      onClick={() => aufWahl(zeile.id)}
      onContextMenu={(ereignis) => {
        // Das Menü des Browsers trüge hier nichts bei (Entwurf, offene Fragen).
        ereignis.preventDefault();
        aufWahl(zeile.id);
        aufKontext({ x: ereignis.clientX, y: ereignis.clientY });
      }}
    >
      <td data-label="Zustand">
        <span className={`zustand zustand-${zeile.zustand.toLowerCase()}`}>{zustandTitel(zeile.zustand)}</span>
      </td>
      <th scope="row" data-label="Kennung">{zeile.kennung}</th>
      <td data-label="Angefordert">{zeitpunktText(zeile.angefordertAm)}</td>
      <td data-label="Ablösung für">{zeile.abzuloesendeEinheit ?? ""}</td>
      <td data-label="Vorgesehen">
        {zeile.vorgeseheneEinheitText}
        {/* Die Einheit, die aus der Anforderung angelegt wurde — „Ablösung
            durch“ in der Einheitentabelle. */}
        {zeile.abloesendeEinheit !== undefined && <span className="hinweistext"> → angelegt: {zeile.abloesendeEinheit}</span>}
      </td>
      <td data-label="Auftrag">{zeile.vorgesehenerAuftrag}</td>
      <td data-label="Zusage">
        {zeile.zugesagtFuer === undefined ? "" : `${zeitpunktText(zeile.zugesagtFuer)}${zeile.zugesagtVon === "" ? "" : ` · ${zeile.zugesagtVon ?? ""}`}`}
      </td>
    </tr>
  );
}
