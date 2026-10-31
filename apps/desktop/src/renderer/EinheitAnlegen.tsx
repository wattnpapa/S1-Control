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
 *
 * „Zeile kopieren“ ist dieselbe Maske mit einer `vorbelegung` (aus
 * `einheitKopie.ts`): Sie beginnt auf „Ohne Vorlage“ mit den Werten der
 * Quellzeile und schreibt, was dann dasteht — eine Kopie ist eine Anlage.
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
import type { Anlagevorbelegung } from "./einheitKopie.js";
import { anlageAusVorlage, istStaerkeEingabe } from "../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../kontrakt/einheitsanlage.js";
import type { Entwurf } from "../kontrakt/index.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";

type Weg = "vorlage" | "frei";

interface FreieEingabe {
  readonly bezeichnung: string;
  readonly organisation: Organisation | "";
  readonly ebene: TaktischeEbene | "";
  readonly staerke: Staerkeeingabe;
  /** Nur bei einer Kopie aus einer Zeile, die selbst aus einer Vorlage stammt. */
  readonly vorlageId?: string;
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
    ...(eingabe.vorlageId === undefined ? {} : { vorlageId: eingabe.vorlageId }),
  });
}

function freiAus(vorbelegung: Anlagevorbelegung): FreieEingabe {
  const { bezeichnung, organisation, ebene, staerke, vorlageId } = vorbelegung;
  return { bezeichnung, organisation, ebene, staerke, ...(vorlageId === undefined ? {} : { vorlageId }) };
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
  /** „Zeile kopieren“: beginnt auf „Ohne Vorlage“ mit diesen Werten. */
  readonly vorbelegung?: Anlagevorbelegung;
}

/**
 * Kennung und Reihenfolge, die ein Dialog für seine Anlage einmal vergibt.
 *
 * Bleibt die Antwort aus („Unklar, ob gespeichert"), schickt der Bediener
 * dieselbe Eingabe erneut. Mit frischer Kennung wäre das eine **zweite**
 * Einheit; mit derselben ist es dieselbe Anfrage, und der Dienst legt sie nur
 * einmal an (`web/wiederholung.ts`).
 */
interface Anlagekennung {
  readonly einheitId: string;
  readonly reihenfolge: number;
}

export function EinheitAnlegen({ abschnittId, aufSchliessen, vorbelegung }: EinheitAnlegenEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [weg, setzeWeg] = useState<Weg>(vorbelegung === undefined ? "vorlage" : "frei");
  const [vorlageId, setzeVorlageId] = useState("");
  const [vorlagenOrganisation, setzeVorlagenOrganisation] = useState<Organisation | "">("");
  const [frei, setzeFrei] = useState<FreieEingabe>(vorbelegung === undefined ? LEER : freiAus(vorbelegung));
  const [herkunft, setzeHerkunft] = useState(vorbelegung?.herkunft ?? "");
  const [ziel, setzeZiel] = useState(vorbelegung?.abschnittId ?? abschnittId ?? "");

  const versuch = useAnlegeversuch();

  const bereit = !versuch.gesperrt && ziel !== "" && (weg === "frei" ? freiVollstaendig(frei, ziel) : vorlageNach(vorlageId) !== undefined);

  async function schreibe(): Promise<void> {
    // Die Kennung entsteht erst beim Bestätigen: Jede Anlage bekommt ihre eigene –
    // und behält sie, bis der Dialog schließt (siehe `Anlagekennung`).
    const kennung = versuch.kennung<Anlagekennung>(() => ({
      einheitId: neueId("E"),
      reihenfolge: (laden.tabelle?.gesamtzahl ?? 0) + 1,
    }));
    const gemeinsam: Gemeinsam = { ...kennung, ziel, herkunft };
    const entwurf =
      weg === "frei" ? freierEntwurf(frei, gemeinsam) : vorlagenEntwurf(vorlageId, vorlagenOrganisation, gemeinsam);
    if (entwurf === undefined) return;
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await laden.holeTabelle();
    await laden.holeBaum();
  }

  return (
    <Maske
      titel={vorbelegung === undefined ? "Einheit anlegen" : `„${vorbelegung.quelle}“ kopieren`}
      bereit={bereit}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {versuch.anzeige}
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
      <Anlagehinweis weg={weg} kopie={vorbelegung !== undefined} />
    </Maske>
  );
}

function Anlagehinweis({ weg, kopie }: { readonly weg: Weg; readonly kopie: boolean }): React.JSX.Element {
  return (
    <p className="hinweistext">
      Der Status ist „Angefordert“: Wer anlegt, plant Kräfte und meldet sie nicht als anwesend.
      {weg === "vorlage"
        ? " Die Soll-Stärke der Vorlage wird übernommen; fehlt sie, steht 0/0/0 da. „Annahme“ heißt: Die Excel nennt keine Stärke, eingetragen ist die übliche Gliederung — am Standort prüfen."
        : " Die Stärke steht so da, wie sie hier eingetragen ist."}
      {kopie &&
        " Eine Kopie ist eine neue, angeforderte Einheit: Aufträge, Fahrzeuge, Personen, Status und Zeiten der Quelle werden nicht übernommen."}
    </p>
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
