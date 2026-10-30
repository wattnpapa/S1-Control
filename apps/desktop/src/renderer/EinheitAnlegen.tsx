/**
 * Die Anlegemaske der Einheitentabelle — aus Vorlage oder ohne (M3.2).
 *
 * Die Excel kennt beide Wege: eine Zeile aus den Kopiervorlagen kopieren oder
 * eine leere Zeile frei ausfüllen. Beide schreiben hier dasselbe Ereignis
 * (`einheitsanlage.ts`); was die Maske unterscheidet, ist nur, woher
 * Bezeichnung, Ebene und Stärke kommen.
 *
 * Der Umschalter sind zwei Knöpfe und keine Optionsfelder: Die Maske setzt den
 * Fokus ins erste Eingabefeld, und das soll das Suchfeld bzw. die Bezeichnung
 * sein — nicht der Umschalter, den man seltener braucht als das Tippen.
 */

import { useState } from "react";

import {
  ORGANISATIONEN,
  TAKTISCHE_EBENEN,
  ebeneTitel,
  organisationTitel,
  vorlage as vorlageNach,
  vorlagenOrganisationen,
  type Organisation,
  type TaktischeEbene,
} from "@s1/domaene";

import { Maske } from "./Maske.js";
import { Abschnittswahl, Staerkefelder, zahl, type Staerkeeingabe } from "./Maskenfelder.js";
import { Vorlagenwahl, sollText } from "./Vorlagenwahl.js";
import { anlageAusVorlage, istStaerkeEingabe } from "../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../kontrakt/einheitsanlage.js";
import type { Entwurf } from "../kontrakt/index.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

type Weg = "vorlage" | "frei";

interface FreieEingabe {
  readonly bezeichnung: string;
  readonly organisation: Organisation | "";
  readonly ebene: TaktischeEbene | "";
  readonly staerke: Staerkeeingabe;
}

const LEER: FreieEingabe = {
  bezeichnung: "",
  organisation: "",
  ebene: "",
  staerke: { fuehrer: "0", unterfuehrer: "0", mannschaft: "0" },
};

interface Gemeinsam {
  readonly einheitId: string;
  readonly ziel: string;
  readonly herkunft: string;
  readonly reihenfolge: number;
}

/** Vollständig ist die freie Zeile mit Bezeichnung, Organisation, Ebene, Ziel und gültiger Stärke. */
function freiVollstaendig(eingabe: FreieEingabe, ziel: string): boolean {
  const { fuehrer, unterfuehrer, mannschaft } = eingabe.staerke;
  return (
    eingabe.bezeichnung.trim() !== "" &&
    eingabe.organisation !== "" &&
    eingabe.ebene !== "" &&
    ziel !== "" &&
    [fuehrer, unterfuehrer, mannschaft].every(istStaerkeEingabe)
  );
}

function freierEntwurf(eingabe: FreieEingabe, gemeinsam: Gemeinsam): Entwurf | undefined {
  const { fuehrer, unterfuehrer, mannschaft } = eingabe.staerke;
  if (!freiVollstaendig(eingabe, gemeinsam.ziel) || eingabe.organisation === "" || eingabe.ebene === "") return undefined;
  return einheitsanlage({
    einheitId: gemeinsam.einheitId,
    abschnittId: gemeinsam.ziel,
    bezeichnung: eingabe.bezeichnung,
    organisation: eingabe.organisation,
    ebene: eingabe.ebene,
    staerke: { fuehrer: zahl(fuehrer), unterfuehrer: zahl(unterfuehrer), mannschaft: zahl(mannschaft) },
    reihenfolge: gemeinsam.reihenfolge,
    herkunft: gemeinsam.herkunft,
  });
}

function vorlagenEntwurf(vorlageId: string, organisation: Organisation | "", gemeinsam: Gemeinsam): Entwurf | undefined {
  const gewaehlt = vorlageNach(vorlageId);
  if (gewaehlt === undefined || gemeinsam.ziel === "") return undefined;
  return anlageAusVorlage({
    einheitId: gemeinsam.einheitId,
    abschnittId: gemeinsam.ziel,
    vorlage: gewaehlt,
    reihenfolge: gemeinsam.reihenfolge,
    ...(organisation === "" ? {} : { organisation }),
    ...(gemeinsam.herkunft.trim() === "" ? {} : { herkunft: gemeinsam.herkunft.trim() }),
  });
}

export interface EinheitAnlegenEigenschaften {
  readonly abschnittId: string | undefined;
  readonly aufSchliessen: () => void;
}

export function EinheitAnlegen({ abschnittId, aufSchliessen }: EinheitAnlegenEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [weg, setzeWeg] = useState<Weg>("vorlage");
  const [vorlageId, setzeVorlageId] = useState("");
  const [vorlagenOrganisation, setzeVorlagenOrganisation] = useState<Organisation | "">("");
  const [frei, setzeFrei] = useState<FreieEingabe>(LEER);
  const [herkunft, setzeHerkunft] = useState("");
  const [ziel, setzeZiel] = useState(abschnittId ?? "");

  const bereit = ziel !== "" && (weg === "frei" ? freiVollstaendig(frei, ziel) : vorlageNach(vorlageId) !== undefined);

  async function schreibe(): Promise<void> {
    // Die Kennung entsteht erst beim Bestätigen: Jede Anlage bekommt ihre eigene.
    const gemeinsam: Gemeinsam = {
      einheitId: neueId("E"),
      ziel,
      herkunft,
      reihenfolge: (laden.tabelle?.gesamtzahl ?? 0) + 1,
    };
    const entwurf =
      weg === "frei" ? freierEntwurf(frei, gemeinsam) : vorlagenEntwurf(vorlageId, vorlagenOrganisation, gemeinsam);
    if (entwurf === undefined) return;
    const ergebnis = await laden.bediene(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await laden.holeTabelle();
    await laden.holeBaum();
  }

  return (
    <Maske titel="Einheit anlegen" bereit={bereit} aufAbbrechen={aufSchliessen} aufBestaetigen={schreibe}>
      <div className="spaltengruppen" role="group" aria-label="Anlegen">
        <button
          type="button"
          aria-pressed={weg === "vorlage"}
          onClick={() => {
            setzeWeg("vorlage");
          }}
        >
          Aus Vorlage
        </button>
        <button
          type="button"
          aria-pressed={weg === "frei"}
          onClick={() => {
            setzeWeg("frei");
          }}
        >
          Ohne Vorlage
        </button>
      </div>
      {weg === "vorlage" ? (
        <AusVorlage
          vorlageId={vorlageId}
          organisation={vorlagenOrganisation}
          aufVorlage={(id) => {
            setzeVorlageId(id);
            setzeVorlagenOrganisation("");
          }}
          aufOrganisation={setzeVorlagenOrganisation}
        />
      ) : (
        <FreieFelder wert={frei} aufWert={setzeFrei} />
      )}
      <label>
        Herkunft
        <input
          value={herkunft}
          onChange={(e) => {
            setzeHerkunft(e.target.value);
          }}
          placeholder="z. B. THW OV Oldenburg"
        />
      </label>
      <label>
        Abschnitt
        <Abschnittswahl wert={ziel} abschnitte={laden.baum?.baum ?? []} aufWahl={setzeZiel} />
      </label>
      <p className="hinweistext">
        Der Status ist „Angefordert“: Wer anlegt, plant Kräfte und meldet sie nicht als anwesend.
        {weg === "vorlage"
          ? " Die Soll-Stärke der Vorlage wird übernommen; fehlt sie, steht 0/0/0 da. „Annahme“ heißt: Die Excel nennt keine Stärke, eingetragen ist die übliche Gliederung — am Standort prüfen."
          : " Die Stärke steht so da, wie sie hier eingetragen ist."}
      </p>
    </Maske>
  );
}

function AusVorlage({
  vorlageId,
  organisation,
  aufVorlage,
  aufOrganisation,
}: {
  readonly vorlageId: string;
  readonly organisation: Organisation | "";
  readonly aufVorlage: (id: string) => void;
  readonly aufOrganisation: (organisation: Organisation) => void;
}): React.JSX.Element {
  const gewaehlt = vorlageNach(vorlageId);
  // Die Träger der Vorlage zuerst, dann alle übrigen: Eine KatS-Einheit kann
  // auch eine Organisation stellen, an die der Katalog nicht gedacht hat.
  const traeger = gewaehlt === undefined ? [] : vorlagenOrganisationen(gewaehlt);
  const auswahl = [...traeger, ...ORGANISATIONEN.filter((eintrag) => !traeger.includes(eintrag))];
  return (
    <>
      <Vorlagenwahl gewaehlt={vorlageId} aufWahl={aufVorlage} />
      {gewaehlt !== undefined && (
        <>
          <p className="vorlagengewaehlt" aria-live="polite">
            Gewählt: <strong>{gewaehlt.bezeichnung}</strong>
            {gewaehlt.lang === undefined ? "" : ` — ${gewaehlt.lang}`}
            {gewaehlt.sollStaerke === undefined ? ", ohne Soll-Stärke" : ` (Soll ${sollText(gewaehlt)})`}
          </p>
          <label>
            Organisation
            <select
              value={organisation === "" ? gewaehlt.organisation : organisation}
              onChange={(e) => {
                aufOrganisation(e.target.value as Organisation);
              }}
            >
              {auswahl.map((eintrag) => (
                <option key={eintrag} value={eintrag}>
                  {organisationTitel(eintrag)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </>
  );
}

function FreieFelder({
  wert,
  aufWert,
}: {
  readonly wert: FreieEingabe;
  readonly aufWert: (wert: FreieEingabe) => void;
}): React.JSX.Element {
  return (
    <>
      <label>
        Bezeichnung
        <input
          value={wert.bezeichnung}
          onChange={(e) => {
            aufWert({ ...wert, bezeichnung: e.target.value });
          }}
          placeholder="z. B. FW LZ Hude"
        />
      </label>
      <label>
        Organisation
        <select
          value={wert.organisation}
          onChange={(e) => {
            aufWert({ ...wert, organisation: e.target.value as Organisation | "" });
          }}
        >
          <option value="">— bitte wählen —</option>
          {ORGANISATIONEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {organisationTitel(eintrag)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ebene
        <select
          value={wert.ebene}
          onChange={(e) => {
            aufWert({ ...wert, ebene: e.target.value as TaktischeEbene | "" });
          }}
        >
          <option value="">— bitte wählen —</option>
          {TAKTISCHE_EBENEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {ebeneTitel(eintrag)}
            </option>
          ))}
        </select>
      </label>
      <Staerkefelder
        wert={wert.staerke}
        aufWert={(staerke) => {
          aufWert({ ...wert, staerke });
        }}
      />
    </>
  );
}
