/**
 * „Eingetroffen“ an einer Anforderung — mit der Einheit, die eingetroffen ist
 * (M5.3).
 *
 * In der Excel heißt Eintreffen: eine neue Zeile eintragen und dabei
 * abtippen, was in der Anforderung schon steht. Diese Maske legt die Einheit
 * aus der Anforderung an — vorbelegt mit dem Vorschlag der Projektion
 * (`einheitsvorschlag`: vorgesehene Einheit, Herkunft aus der Zusage,
 * Organisation, Ebene, Stärke und Bereich der abzulösenden Einheit, Auftrag
 * der Anforderung) — und hält in der Erledigung fest, welche Einheit
 * es war. Damit füllt sich „Ablösung durch“ an der abgelösten Zeile. Die Einheit
 * ist eingetroffen („Einsatzbereit“), der Auftrag wird als Auftrag erfasst,
 * und sie zählt in die Ist-Stärke, sobald ihr Bereich ein Einsatzbereich ist.
 *
 * Drei Wege: die Einheit aus der Anforderung neu anlegen, eine **bestehende**
 * Einheit verknüpfen (sie wurde schon erfasst — über den Erfassungsbogen,
 * den Eingangskorb, einen anderen Arbeitsplatz oder nach einer Anlage, deren
 * Verknüpfung abgewiesen wurde), oder bei `eintreffen` nur den Zustand setzen.
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

import { abloesungNachtragen, anlageAusAnforderung, auftragAusAnforderung } from "../kontrakt/anforderungsschritte.js";
import { anforderungErledigt, istStaerkeEingabe } from "../kontrakt/bedienschritte.js";
import type { Entwurf } from "../kontrakt/index.js";
import { Maske } from "./Maske.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

export type Eintreffart = "eintreffen" | "nachtragen";

/** Wie die Anforderung zu ihrer Einheit kommt. */
type Weg = "anlegen" | "verknuepfen" | "ohne";

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
  readonly auftrag: string;
  readonly abschnittId: string;
}

/** Bereiche, in denen eine eingetroffene Einheit nicht in die Ist-Stärke zählt. */
const NICHT_ZAEHLEND: ReadonlySet<string> = new Set(["ANGEFORDERT", "EINGANG", "ARCHIV"]);

function ausVorschlag(vorschlag: Einheitsvorschlag | undefined): Einheitseingabe {
  return {
    bezeichnung: vorschlag?.bezeichnung ?? "",
    organisation: vorschlag?.organisation ?? "THW",
    ebene: vorschlag?.ebene ?? "GRUPPE",
    fuehrer: String(vorschlag?.staerke.fuehrer ?? 0),
    unterfuehrer: String(vorschlag?.staerke.unterfuehrer ?? 0),
    mannschaft: String(vorschlag?.staerke.mannschaft ?? 0),
    herkunft: vorschlag?.herkunft ?? "",
    auftrag: vorschlag?.auftrag ?? "",
    abschnittId: vorschlag?.abschnittId ?? "",
  };
}

function vollstaendig(e: Einheitseingabe): boolean {
  return (
    e.bezeichnung.trim() !== "" &&
    e.abschnittId !== "" &&
    [e.fuehrer, e.unterfuehrer, e.mannschaft].every(istStaerkeEingabe) &&
    // Eine eingetroffene Einheit ohne Köpfe wäre im Kopf unsichtbar.
    [e.fuehrer, e.unterfuehrer, e.mannschaft].some((wert) => Number.parseInt(wert, 10) > 0)
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
  const [weg, setzeWeg] = useState<Weg>("anlegen");
  const [bestehende, setzeBestehende] = useState("");
  const [eingabe, setzeEingabe] = useState(() => ausVorschlag(zeile.vorschlag));
  const abschnitte = projektion.baumZeilen(laden.baum?.baum ?? []);
  // Die abzulösende Einheit löst sich nicht selbst ab.
  const einheiten = (laden.anforderungen?.einheitenwahl ?? []).filter((e) => e.id !== zeile.abzuloesendeEinheitId);

  async function bestaetige(): Promise<void> {
    if (weg === "ohne") {
      const ergebnis = await laden.bediene(anforderungErledigt(zeile.id, new Date().toISOString()));
      if (ergebnis?.art === "geschrieben") aufSchliessen();
      return;
    }
    if (weg === "verknuepfen") {
      const ergebnis = await laden.bediene(verknuepfung(zeile, art, bestehende));
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
    if (ergebnis?.art !== "geschrieben") return;
    // Der Auftrag zuletzt: Scheitert er, steht die Einheit trotzdem da und
    // verknüpft; die Fehlermeldung des Ladens nennt den Rest.
    const auftrag = auftragAusAnforderung(neueId("A"), einheitId, eingabe.auftrag, new Date().toISOString());
    if (auftrag !== undefined) await laden.bediene(auftrag);
    aufSchliessen();
  }

  return (
    <Maske
      titel={art === "eintreffen" ? `${zeile.kennung} eingetroffen` : `Einheit aus ${zeile.kennung} anlegen`}
      bestaetigungstext={bestaetigungstext(weg)}
      bereit={weg === "ohne" || (weg === "verknuepfen" ? bestehende !== "" : vollstaendig(eingabe))}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={bestaetige}
    >
      <Wegwahl weg={weg} aufWeg={setzeWeg} mitOhne={art === "eintreffen"} />
      {weg === "verknuepfen" && (
        <label>
          Bestehende Einheit
          <select
            value={bestehende}
            onChange={(e) => {
              setzeBestehende(e.target.value);
            }}
          >
            <option value="">— bitte wählen —</option>
            {einheiten.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
      )}
      {weg === "anlegen" && (
        <Einheitsfelder
          eingabe={eingabe}
          aufEingabe={setzeEingabe}
          abschnitte={abschnitte}
          nachVorbildVon={zeile.vorschlag?.nachVorbildVon}
        />
      )}
    </Maske>
  );
}

function bestaetigungstext(weg: Weg): string {
  if (weg === "ohne") return "Eingetroffen";
  return weg === "verknuepfen" ? "Verknüpfen" : "Anlegen";
}

const WEGE: readonly { readonly weg: Weg; readonly titel: string }[] = [
  { weg: "anlegen", titel: "Einheit aus der Anforderung anlegen" },
  { weg: "verknuepfen", titel: "Bestehende Einheit verknüpfen" },
  { weg: "ohne", titel: "Nur eingetroffen, ohne Einheit" },
];

function Wegwahl({
  weg,
  aufWeg,
  mitOhne,
}: {
  readonly weg: Weg;
  readonly aufWeg: (weg: Weg) => void;
  readonly mitOhne: boolean;
}): React.JSX.Element {
  return (
    <fieldset className="wegwahl">
      <legend>Einheit</legend>
      {WEGE.filter((w) => mitOhne || w.weg !== "ohne").map((w) => (
        <label key={w.weg}>
          <input
            type="radio"
            name="anforderung-weg"
            value={w.weg}
            checked={weg === w.weg}
            onChange={() => {
              aufWeg(w.weg);
            }}
          />
          {w.titel}
        </label>
      ))}
    </fieldset>
  );
}

interface EinheitsfelderEigenschaften {
  readonly eingabe: Einheitseingabe;
  readonly aufEingabe: (neu: (bisher: Einheitseingabe) => Einheitseingabe) => void;
  readonly abschnitte: readonly { readonly id: string; readonly name: string; readonly typ: string }[];
  readonly nachVorbildVon: string | undefined;
}

/** Die Felder der neuen Einheit — vorbelegt, jedes änderbar. */
function Einheitsfelder({ eingabe, aufEingabe, abschnitte, nachVorbildVon }: EinheitsfelderEigenschaften): React.JSX.Element {
  const setze = (schluessel: keyof Einheitseingabe) => (e: { target: { value: string } }) => {
    aufEingabe((bisher) => ({ ...bisher, [schluessel]: e.target.value }));
  };
  const feld = (titel: string, schluessel: keyof Einheitseingabe): React.JSX.Element => (
    <label>
      {titel}
      <input value={eingabe[schluessel]} onChange={setze(schluessel)} />
    </label>
  );
  return (
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
      {feld("Auftrag", "auftrag")}
      <label>
        Abschnitt
        <select value={eingabe.abschnittId} onChange={setze("abschnittId")}>
          <option value="">— bitte wählen —</option>
          {abschnitte.map((knoten) => (
            <option key={knoten.id} value={knoten.id}>
              {NICHT_ZAEHLEND.has(knoten.typ) ? `${knoten.name} (zählt nicht)` : knoten.name}
            </option>
          ))}
        </select>
      </label>
      {NICHT_ZAEHLEND.has(abschnitte.find((k) => k.id === eingabe.abschnittId)?.typ ?? "") && (
        <p className="hinweistext" role="alert">
          Dieser Bereich zählt nicht in die Ist-Stärke im Kopf. Eine eingetroffene Einheit gehört in einen Einsatzbereich.
        </p>
      )}
      {nachVorbildVon !== undefined && (
        <p className="hinweistext">
          Organisation, Ebene, Stärke und Bereich sind von „{nachVorbildVon}“ übernommen,
          die abgelöst wird. Die Stärke ist zu prüfen und einzutragen, was die eintreffende Einheit meldet.
        </p>
      )}
    </>
  );
}
