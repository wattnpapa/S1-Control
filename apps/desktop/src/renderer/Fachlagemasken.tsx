/**
 * Die Masken des Blatts „Fachlage“: einen Eintrag anlegen und ein Feld
 * ändern (Stab-Review 2026-11-22). Welche Felder es gibt, steht in
 * `fachlagebereiche.ts`; geschrieben wird mit den Schrittbauern aus
 * `kontrakt/fachlageschritte.ts`, dieselben, die das Demo-Drehbuch nutzt.
 */

import { useState } from "react";

import { fachlagewort, projektion, type Fachlagebereich, type Fachlagezeile } from "@s1/domaene";

import { zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import { fachlageAenderung, fachlageAnlage } from "../kontrakt/fachlageschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { FACHLAGEBESCHREIBUNG, type Fachlagefeld } from "./fachlagebereiche.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";

type Umgewandelt = { readonly wert: unknown } | { readonly fehler: string };

/** Die Eingabe als Wert der Nutzlast; leer heißt „nicht gesetzt“ (beim Zeitpunkt: jetzt). */
export function wertAusEingabe(feld: Fachlagefeld, eingabe: string, jetzt: Date = new Date()): Umgewandelt {
  const text = eingabe.trim();
  if (feld.art === "janein") return { wert: text === "ja" };
  if (text === "") {
    if (feld.feld === "zeitpunkt") return { wert: jetzt.toISOString() };
    return feld.pflicht === true ? { fehler: `${feld.titel} eintragen` } : { wert: undefined };
  }
  if (feld.art === "zahl") {
    const zahl = Number(text.replace(",", "."));
    return Number.isFinite(zahl) ? { wert: zahl } : { fehler: `${feld.titel}: eine Zahl eintragen` };
  }
  if (feld.art === "zeit") {
    const zeit = zeitpunktAusEingabe(text, jetzt);
    return zeit === undefined ? { fehler: `${feld.titel}: „HH:MM“ oder „TT.MM. HH:MM“` } : { wert: zeit };
  }
  return { wert: text };
}

function Feldeingabe({ feld, wert, aufWert }: { feld: Fachlagefeld; wert: string; aufWert: (w: string) => void }): React.JSX.Element {
  const laden = useLaden();
  if (feld.art === "auswahl" || feld.art === "abschnitt" || feld.art === "janein") {
    const optionen =
      feld.art === "janein"
        ? [{ w: "nein", t: "nein" }, { w: "ja", t: "ja" }]
        : feld.art === "abschnitt"
          ? projektion.baumZeilen(laden.baum?.baum ?? []).map((k) => ({ w: k.id, t: `${"  ".repeat(k.tiefe)}${k.name}` }))
          : (feld.werte ?? []).map((w) => ({ w, t: fachlagewort(w) }));
    return (
      <label>
        {feld.titel}
        <select value={wert} onChange={(e) => aufWert(e.target.value)}>
          {feld.art !== "janein" && <option value="">{feld.pflicht === true ? "— bitte wählen —" : "— keine Angabe —"}</option>}
          {optionen.map((o) => (
            <option key={o.w} value={o.w}>{o.t}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label>
      {feld.titel}
      {feld.art === "langtext" ? (
        <textarea rows={3} value={wert} onChange={(e) => aufWert(e.target.value)} />
      ) : (
        <input value={wert} inputMode={feld.art === "zahl" ? "decimal" : undefined} onChange={(e) => aufWert(e.target.value)} />
      )}
    </label>
  );
}

function ersterFehler(felder: readonly Fachlagefeld[], eingaben: Readonly<Record<string, string>>): string | undefined {
  for (const feld of felder) {
    const ergebnis = wertAusEingabe(feld, eingaben[feld.feld] ?? "");
    if ("fehler" in ergebnis) return ergebnis.fehler;
  }
  return undefined;
}

export function FachlageAnlage({ bereich, aufSchliessen }: { bereich: Fachlagebereich; aufSchliessen: () => void }): React.JSX.Element {
  const b = FACHLAGEBESCHREIBUNG[bereich];
  const versuch = useAnlegeversuch();
  const [eingaben, setzeEingaben] = useState<Record<string, string>>(() => Object.fromEntries(b.anlage.map((f) => [f.feld, f.vorgabe ?? (f.art === "janein" ? "nein" : "")])));
  const fehler = ersterFehler(b.anlage, eingaben);

  async function schreibe(): Promise<void> {
    const id = versuch.kennung(() => neueId(b.praefix));
    const werte: Record<string, unknown> = {};
    for (const feld of b.anlage) {
      const ergebnis = wertAusEingabe(feld, eingaben[feld.feld] ?? "");
      if ("wert" in ergebnis && ergebnis.wert !== undefined) werte[feld.feld] = ergebnis.wert;
    }
    const ergebnis = await versuch.schreibe(fachlageAnlage(bereich, id, werte));
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }

  return (
    <Maske titel={b.neu.replace(" …", "")} bestaetigungstext="Speichern" bereit={!versuch.gesperrt && fehler === undefined} bereitGrund={fehler} aufAbbrechen={aufSchliessen} aufBestaetigen={schreibe}>
      {versuch.anzeige}
      {b.anlage.map((feld) => (
        <Feldeingabe key={feld.feld} feld={feld} wert={eingaben[feld.feld] ?? ""} aufWert={(w) => setzeEingaben((alt) => ({ ...alt, [feld.feld]: w }))} />
      ))}
    </Maske>
  );
}

function eingabeAus(wert: unknown): string {
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  return wert === undefined ? "" : String(wert);
}

export function FachlageAenderung({ bereich, zeile, aufSchliessen }: { bereich: Fachlagebereich; zeile: Fachlagezeile; aufSchliessen: () => void }): React.JSX.Element {
  const b = FACHLAGEBESCHREIBUNG[bereich];
  const versuch = useAnlegeversuch();
  const erstes = b.aenderbar[0] as Fachlagefeld;
  const [feldname, setzeFeldname] = useState(erstes.feld);
  const feld = b.aenderbar.find((f) => f.feld === feldname) ?? erstes;
  const [eingabe, setzeEingabe] = useState(() => eingabeAus(zeile.werte[erstes.feld]));
  const ergebnis = wertAusEingabe(feld, eingabe);
  const fehler = "fehler" in ergebnis ? ergebnis.fehler : undefined;

  async function schreibe(): Promise<void> {
    if (!("wert" in ergebnis)) return;
    const vorher = zeile.werte[feld.feld] ?? null;
    const gespeichert = await versuch.schreibe(fachlageAenderung(bereich, zeile.id, feld.feld, { vorher, neu: ergebnis.wert }));
    if (gespeichert?.art === "geschrieben") aufSchliessen();
  }

  return (
    <Maske titel={`${b.titel}: ändern`} bestaetigungstext="Übernehmen" bereit={!versuch.gesperrt && fehler === undefined} bereitGrund={fehler} aufAbbrechen={aufSchliessen} aufBestaetigen={schreibe}>
      {versuch.anzeige}
      <label>
        Feld
        <select
          value={feld.feld}
          onChange={(e) => {
            setzeFeldname(e.target.value);
            setzeEingabe(eingabeAus(zeile.werte[e.target.value]));
          }}
        >
          {b.aenderbar.map((f) => (
            <option key={f.feld} value={f.feld}>{f.titel}</option>
          ))}
        </select>
      </label>
      <Feldeingabe feld={{ ...feld, pflicht: false }} wert={eingabe} aufWert={setzeEingabe} />
    </Maske>
  );
}
