/**
 * Die Masken der Verpflegung (S4.3): Mahlzeitenregel, Ausgabestelle,
 * Bestellung. Enter bestätigt, Esc verwirft, wie jede Maske.
 *
 * Die Bestellung nimmt die Vorausschau als Vorschlag (KONZEPT-S4.md §5.2);
 * wer die Reserve anders setzt, überschreibt die Zahl. Die Kennung gilt für
 * die Dialoginstanz — eine verlorene Antwort bestellt nicht doppelt.
 */

import { useState } from "react";

import type { Ausgabestellenzeile } from "@s1/domaene";

import { Maske } from "./Maske.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { mahlzeitText, schichtText } from "./versorgungstext.js";
import {
  ausgabestelleAnlegen,
  mahlzeitBestellt,
  mahlzeitenregelGesetzt,
  type Regelzeile,
} from "../kontrakt/versorgungsschritte.js";

const MAHLZEITEN = ["FRUEHSTUECK", "MITTAG", "ABEND", "NACHT"] as const;
const SCHICHTEN = ["TAG", "NACHT", "FRUEH", "SPAET"] as const;
const UHR = /^([01]\d|2[0-3])[0-5]\d$/;

interface Entwurfszeile {
  aktiv: boolean;
  uhrzeit: string;
  schichten: string[];
}

function anfang(regel: readonly Regelzeile[]): Record<string, Entwurfszeile> {
  const werte: Record<string, Entwurfszeile> = {};
  for (const m of MAHLZEITEN) {
    const z = regel.find((r) => r.mahlzeit === m);
    werte[m] = { aktiv: z !== undefined, uhrzeit: z?.uhrzeit ?? "", schichten: [...(z?.schichten ?? [])] };
  }
  return werte;
}

/** Die Mahlzeitenregel als Tabelle: je Mahlzeit an/aus, Ausgabezeit, Schichten. */
export function MahlzeitenregelMaske(props: {
  readonly regel: readonly Regelzeile[];
  readonly vorbelegung: boolean;
  readonly aufSchliessen: () => void;
}): React.JSX.Element {
  const einsatzId = useLaden((z) => z.lagebild?.einsatzId ?? "");
  const versuch = useAnlegeversuch();
  const [werte, setzeWerte] = useState(() => anfang(props.regel));
  const neu: Regelzeile[] = MAHLZEITEN.filter((m) => werte[m]?.aktiv === true).map((m) => ({
    mahlzeit: m,
    uhrzeit: werte[m]?.uhrzeit ?? "",
    schichten: werte[m]?.schichten ?? [],
  }));
  const gueltig = neu.length > 0 && neu.every((z) => UHR.test(z.uhrzeit));
  const setze = (m: string, teil: Partial<Entwurfszeile>): void => {
    setzeWerte((bisher) => ({ ...bisher, [m]: { ...(bisher[m] as Entwurfszeile), ...teil } }));
  };

  async function schreibe(): Promise<void> {
    const ergebnis = await versuch.schreibe(mahlzeitenregelGesetzt(einsatzId, props.vorbelegung ? null : props.regel, neu));
    if (ergebnis?.art === "geschrieben") props.aufSchliessen();
  }

  return (
    <Maske
      titel="Mahlzeitenregel des Einsatzes"
      bestaetigungstext="Regel setzen"
      bereit={gueltig && !versuch.gesperrt}
      bereitGrund={gueltig ? undefined : "Je aktive Mahlzeit eine Ausgabezeit HHMM"}
      aufAbbrechen={props.aufSchliessen}
      aufBestaetigen={schreibe}
    >
      <table className="versorgungstabelle regeltabelle" aria-label="Mahlzeitenregel">
        <thead>
          <tr>
            <th scope="col">Mahlzeit</th>
            <th scope="col">Ausgabe</th>
            {SCHICHTEN.map((s) => (
              <th key={s} scope="col">{schichtText(s)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MAHLZEITEN.map((m) => (
            <tr key={m}>
              <th scope="row">
                <label className="schalter">
                  <input type="checkbox" checked={werte[m]?.aktiv === true} onChange={(e) => setze(m, { aktiv: e.target.checked })} />
                  {mahlzeitText(m)}
                </label>
              </th>
              <td>
                <input aria-label={`Ausgabezeit ${mahlzeitText(m)}`} value={werte[m]?.uhrzeit ?? ""} inputMode="numeric" maxLength={4} onChange={(e) => setze(m, { uhrzeit: e.target.value.trim() })} />
              </td>
              {SCHICHTEN.map((s) => (
                <td key={s}>
                  <input
                    type="checkbox"
                    aria-label={`${mahlzeitText(m)} für ${schichtText(s)}`}
                    checked={werte[m]?.schichten.includes(s) === true}
                    onChange={(e) => {
                      const bisher = werte[m]?.schichten ?? [];
                      setze(m, { schichten: e.target.checked ? [...bisher, s] : bisher.filter((x) => x !== s) });
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hinweistext">Die Regel gilt für alle Arbeitsplätze dieses Einsatzes und steht im Tagebuch. Einheiten ohne Schicht essen wie die Tagschicht.</p>
      {versuch.anzeige}
    </Maske>
  );
}

/** „Ausgabestelle anlegen": Name, Ort, Träger. */
export function AusgabestelleMaske({ aufSchliessen }: { readonly aufSchliessen: () => void }): React.JSX.Element {
  const versuch = useAnlegeversuch();
  const [werte, setzeWerte] = useState({ name: "", ort: "", traeger: "" });
  async function schreibe(): Promise<void> {
    const ausgabestelleId = versuch.kennung(() => neueId("AS"));
    const ergebnis = await versuch.schreibe(
      ausgabestelleAnlegen({
        ausgabestelleId,
        name: werte.name.trim(),
        ...(werte.ort.trim() === "" ? {} : { ort: werte.ort.trim() }),
        ...(werte.traeger.trim() === "" ? {} : { traeger: werte.traeger.trim() }),
      }),
    );
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }
  const feld = (name: "name" | "ort" | "traeger", titel: string): React.JSX.Element => (
    <label>
      {titel}
      <input value={werte[name]} onChange={(e) => setzeWerte((b) => ({ ...b, [name]: e.target.value }))} />
    </label>
  );
  return (
    <Maske titel="Ausgabestelle anlegen" bestaetigungstext="Ausgabestelle anlegen" bereit={werte.name.trim().length > 0 && !versuch.gesperrt} aufAbbrechen={aufSchliessen} aufBestaetigen={schreibe}>
      {feld("name", "Name")}
      {feld("ort", "Ort")}
      {feld("traeger", "Träger")}
      {versuch.anzeige}
    </Maske>
  );
}

export interface Bestellvorschlag {
  readonly datum: string;
  readonly mahlzeit: string;
  readonly titel: string;
  readonly portionen: number;
  readonly vegetarisch: number;
  readonly vegan: number;
  readonly ausgabestelleId?: string;
}

const zahl = (text: string): number | undefined => (/^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : undefined);

/** Die Bestellung einer Mahlzeit: Vorschlag aus der Vorausschau, überschreibbar. */
export function BestellMaske(props: {
  readonly vorschlag: Bestellvorschlag;
  readonly ausgabestellen: readonly Ausgabestellenzeile[];
  readonly aufSchliessen: () => void;
}): React.JSX.Element {
  const anzeigename = useLaden((z) => z.einstellungen.anzeigename);
  const versuch = useAnlegeversuch();
  const v = props.vorschlag;
  const [werte, setzeWerte] = useState({
    portionen: String(v.portionen),
    vegetarisch: String(v.vegetarisch),
    vegan: String(v.vegan),
    ausgabestelleId: v.ausgabestelleId ?? "",
    bestelltBei: "",
    bestelltVon: anzeigename,
  });
  const p = zahl(werte.portionen);
  const veg = zahl(werte.vegetarisch);
  const vegan = zahl(werte.vegan);
  const bereit = p !== undefined && veg !== undefined && vegan !== undefined && !versuch.gesperrt;

  async function schreibe(): Promise<void> {
    if (p === undefined || veg === undefined || vegan === undefined) return;
    const bestellungId = versuch.kennung(() => neueId("B"));
    const ergebnis = await versuch.schreibe(
      mahlzeitBestellt({
        bestellungId,
        datum: v.datum,
        mahlzeit: v.mahlzeit,
        portionen: p,
        vegetarisch: veg,
        vegan,
        ...(werte.ausgabestelleId === "" ? {} : { ausgabestelleId: werte.ausgabestelleId }),
        ...(werte.bestelltBei.trim() === "" ? {} : { bestelltBei: werte.bestelltBei.trim() }),
        ...(werte.bestelltVon.trim() === "" ? {} : { bestelltVon: werte.bestelltVon.trim() }),
      }),
    );
    if (ergebnis?.art === "geschrieben") props.aufSchliessen();
  }
  const feld = (name: "portionen" | "vegetarisch" | "vegan" | "bestelltBei" | "bestelltVon", titel: string): React.JSX.Element => (
    <label>
      {titel}
      <input value={werte[name]} onChange={(e) => setzeWerte((b) => ({ ...b, [name]: e.target.value }))} />
    </label>
  );
  return (
    <Maske titel={`Bestellung ${v.titel}`} bestaetigungstext="Bestellen" bereit={bereit} bereitGrund={bereit ? undefined : "Portionen als ganze Zahlen"} aufAbbrechen={props.aufSchliessen} aufBestaetigen={schreibe}>
      <p className="hinweistext">Vorschlag aus der Vorausschau: {v.portionen} Portionen, {v.vegetarisch} veg., {v.vegan} vegan.</p>
      {feld("portionen", "Portionen")}
      {feld("vegetarisch", "davon vegetarisch")}
      {feld("vegan", "davon vegan")}
      <label>
        Ausgabestelle
        <select value={werte.ausgabestelleId} onChange={(e) => setzeWerte((b) => ({ ...b, ausgabestelleId: e.target.value }))}>
          <option value="">— keine —</option>
          {props.ausgabestellen.map((a) => (
            <option key={a.ausgabestelleId} value={a.ausgabestelleId}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {feld("bestelltBei", "bestellt bei")}
      {feld("bestelltVon", "bestellt von")}
      {versuch.anzeige}
    </Maske>
  );
}
