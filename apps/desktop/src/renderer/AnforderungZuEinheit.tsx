/**
 * „Eingetroffen“ an einer Anforderung — mit der Einheit, die eingetroffen ist
 * (M5.3).
 *
 * In der Excel heißt Eintreffen: eine neue Zeile eintragen und dabei
 * abtippen, was in der Anforderung schon steht. Diese Maske legt die Einheit
 * aus der Anforderung an — vorbelegt mit dem Vorschlag der Projektion
 * (`einheitsvorschlag`: vorgesehene Einheit, Herkunft aus der Zusage,
 * Organisation, Ebene und Stärke der abzulösenden Einheit, Bereich
 * „Angefordert / Anmarsch“) — und hält in der Erledigung fest, welche Einheit
 * es war. Damit füllt sich „Ablösung durch“ an der abgelösten Zeile.
 *
 * Zwei Fälle: `eintreffen` setzt die Anforderung auf eingetroffen und bietet
 * die Anlage an (abwählbar); `nachtragen` legt an einer schon eingetroffenen
 * Anforderung die Einheit nachträglich an.
 */

import { useState } from "react";

import {
  ORGANISATIONEN,
  TAKTISCHE_EBENEN,
  projektion,
  spaltenwertTitel,
  type Anforderungszeile,
  type Einheitsvorschlag,
} from "@s1/domaene";

import { abloesungNachtragen, anlageAusAnforderung } from "../kontrakt/anforderungsschritte.js";
import { anforderungErledigt, istStaerkeEingabe } from "../kontrakt/bedienschritte.js";
import type { Entwurf } from "../kontrakt/index.js";
import { Maske } from "./Maske.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

export type Eintreffart = "eintreffen" | "nachtragen";

export interface AnforderungZuEinheitEigenschaften {
  readonly zeile: Anforderungszeile;
  readonly art: Eintreffart;
  readonly aufSchliessen: () => void;
}

interface Einheitseingabe {
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly ebene: string;
  readonly fuehrer: string;
  readonly unterfuehrer: string;
  readonly mannschaft: string;
  readonly herkunft: string;
  readonly abschnittId: string;
}

function ausVorschlag(vorschlag: Einheitsvorschlag | undefined): Einheitseingabe {
  return {
    bezeichnung: vorschlag?.bezeichnung ?? "",
    organisation: vorschlag?.organisation ?? "THW",
    ebene: vorschlag?.ebene ?? "GRUPPE",
    fuehrer: String(vorschlag?.staerke.fuehrer ?? 0),
    unterfuehrer: String(vorschlag?.staerke.unterfuehrer ?? 0),
    mannschaft: String(vorschlag?.staerke.mannschaft ?? 0),
    herkunft: vorschlag?.herkunft ?? "",
    abschnittId: vorschlag?.abschnittId ?? "",
  };
}

function vollstaendig(e: Einheitseingabe): boolean {
  return (
    e.bezeichnung.trim() !== "" &&
    e.abschnittId !== "" &&
    [e.fuehrer, e.unterfuehrer, e.mannschaft].every(istStaerkeEingabe)
  );
}

/** Die Verknüpfung nach der Anlage: eintreffen mit Einheit oder Einheit nachtragen. */
function verknuepfung(zeile: Anforderungszeile, art: Eintreffart, einheitId: string): Entwurf {
  if (art === "eintreffen") return anforderungErledigt(zeile.id, new Date().toISOString(), einheitId);
  return abloesungNachtragen(
    {
      anforderungId: zeile.id,
      erledigtAm: zeile.erledigtAm ?? "",
      ...(zeile.abloesendeEinheitId === undefined ? {} : { abloesendeEinheitId: zeile.abloesendeEinheitId }),
    },
    einheitId,
  );
}

export function AnforderungZuEinheit({ zeile, art, aufSchliessen }: AnforderungZuEinheitEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [anlegen, setzeAnlegen] = useState(true);
  const [eingabe, setzeEingabe] = useState(() => ausVorschlag(zeile.vorschlag));
  const abschnitte = projektion.baumZeilen(laden.baum?.baum ?? []);

  async function bestaetige(): Promise<void> {
    if (!anlegen) {
      const ergebnis = await laden.bediene(anforderungErledigt(zeile.id, new Date().toISOString()));
      if (ergebnis?.art === "geschrieben") aufSchliessen();
      return;
    }
    const einheitId = neueId("E");
    const anlage = await laden.bediene(
      anlageAusAnforderung({
        einheitId,
        abschnittId: eingabe.abschnittId,
        bezeichnung: eingabe.bezeichnung,
        organisation: eingabe.organisation,
        ebene: eingabe.ebene,
        staerke: {
          fuehrer: Number.parseInt(eingabe.fuehrer, 10),
          unterfuehrer: Number.parseInt(eingabe.unterfuehrer, 10),
          mannschaft: Number.parseInt(eingabe.mannschaft, 10),
        },
        herkunft: eingabe.herkunft,
        reihenfolge: (laden.tabelle?.gesamtzahl ?? 0) + 1,
      }),
    );
    if (anlage?.art !== "geschrieben") return;
    const ergebnis = await laden.bediene(verknuepfung(zeile, art, einheitId));
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }

  const setze = (schluessel: keyof Einheitseingabe) => (e: { target: { value: string } }) => {
    setzeEingabe((bisher) => ({ ...bisher, [schluessel]: e.target.value }));
  };
  const feld = (titel: string, schluessel: keyof Einheitseingabe): React.JSX.Element => (
    <label>
      {titel}
      <input value={eingabe[schluessel]} onChange={setze(schluessel)} />
    </label>
  );

  return (
    <Maske
      titel={art === "eintreffen" ? `${zeile.kennung} eingetroffen` : `Einheit aus ${zeile.kennung} anlegen`}
      bestaetigungstext={art === "eintreffen" && !anlegen ? "Eingetroffen" : "Anlegen"}
      bereit={!anlegen || vollstaendig(eingabe)}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={bestaetige}
    >
      {art === "eintreffen" && (
        <label>
          <input
            type="checkbox"
            checked={anlegen}
            onChange={(e) => {
              setzeAnlegen(e.target.checked);
            }}
          />
          Einheit aus der Anforderung anlegen
        </label>
      )}
      {anlegen && (
        <>
          {feld("Bezeichnung", "bezeichnung")}
          <label>
            Organisation
            <select value={eingabe.organisation} onChange={setze("organisation")}>
              {ORGANISATIONEN.map((wert) => (
                <option key={wert} value={wert}>{spaltenwertTitel("organisation", wert)}</option>
              ))}
            </select>
          </label>
          <label>
            Gliederungsebene
            <select value={eingabe.ebene} onChange={setze("ebene")}>
              {TAKTISCHE_EBENEN.map((wert) => (
                <option key={wert} value={wert}>{spaltenwertTitel("ebene", wert)}</option>
              ))}
            </select>
          </label>
          {feld("Führer", "fuehrer")}
          {feld("Unterführer", "unterfuehrer")}
          {feld("Mannschaft", "mannschaft")}
          {feld("Herkunft", "herkunft")}
          <label>
            Abschnitt
            <select value={eingabe.abschnittId} onChange={setze("abschnittId")}>
              <option value="">— bitte wählen —</option>
              {abschnitte.map((knoten) => (
                <option key={knoten.id} value={knoten.id}>{knoten.name}</option>
              ))}
            </select>
          </label>
          {zeile.vorschlag?.nachVorbildVon !== undefined && (
            <p className="hinweistext">
              Organisation, Ebene und Stärke sind von „{zeile.vorschlag.nachVorbildVon}“ übernommen, die
              abgelöst wird. Bitte mit der Meldung der eintreffenden Einheit abgleichen.
            </p>
          )}
        </>
      )}
    </Maske>
  );
}
