/**
 * Die Maske „Unterkunft anlegen" und „Unterkunft ändern" (S4.2).
 *
 * Wie „Abschnitt anlegen": Enter bestätigt, Esc verwirft, die Kennung gilt
 * für die ganze Dialoginstanz (`Anlegeversuch.tsx`). Beim Ändern geht je
 * geändertem Feld ein `UnterkunftGeaendert` hinaus, mit dem Wert, den die
 * Maske beim Öffnen sah — ein anderer Arbeitsplatz überschreibt nicht still.
 */

import { useState } from "react";

import type { Unterkunftskarte } from "@s1/domaene";

import { Maske } from "./Maske.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { neueId } from "./kennungen.js";
import { unterkunftAnlegen, unterkunftGeaendert, type Unterkunftsfeld } from "../kontrakt/versorgungsschritte.js";
import type { Entwurf } from "../kontrakt/index.js";

export interface UnterkunftMaskeEigenschaften {
  /** Beim Ändern die Unterkunft, sonst wird angelegt. */
  readonly unterkunft?: Unterkunftskarte;
  readonly aufSchliessen: () => void;
}

function kapazitaetAus(text: string): number | undefined {
  if (!/^\d{1,5}$/.test(text.trim())) return undefined;
  return Number(text.trim());
}

function aenderungen(u: Unterkunftskarte, werte: Record<Unterkunftsfeld, string>): Entwurf[] {
  const vorher: Record<Unterkunftsfeld, string | number | null> = {
    name: u.name,
    ort: u.ort ?? null,
    kapazitaet: u.kapazitaet,
    bemerkung: u.bemerkung ?? null,
  };
  const liste: Entwurf[] = [];
  for (const feld of ["name", "ort", "kapazitaet", "bemerkung"] as const) {
    const roh = werte[feld].trim();
    const neu = feld === "kapazitaet" ? (kapazitaetAus(roh) ?? null) : roh === "" ? null : roh;
    if (neu !== vorher[feld]) liste.push(unterkunftGeaendert(u.unterkunftId, feld, vorher[feld], neu));
  }
  return liste;
}

export function UnterkunftMaske({ unterkunft, aufSchliessen }: UnterkunftMaskeEigenschaften): React.JSX.Element {
  const [werte, setzeWerte] = useState<Record<Unterkunftsfeld, string>>({
    name: unterkunft?.name ?? "",
    ort: unterkunft?.ort ?? "",
    kapazitaet: unterkunft === undefined ? "" : String(unterkunft.kapazitaet),
    bemerkung: unterkunft?.bemerkung ?? "",
  });
  const versuch = useAnlegeversuch();
  const kapazitaet = kapazitaetAus(werte.kapazitaet);
  const bereit = werte.name.trim().length > 0 && kapazitaet !== undefined && !versuch.gesperrt;

  async function schreibe(): Promise<void> {
    if (kapazitaet === undefined) return;
    if (unterkunft !== undefined) {
      for (const entwurf of aenderungen(unterkunft, werte)) {
        const ergebnis = await versuch.schreibe(entwurf);
        if (ergebnis?.art !== "geschrieben") return;
      }
      aufSchliessen();
      return;
    }
    const unterkunftId = versuch.kennung(() => neueId("UK"));
    const ort = werte.ort.trim();
    const bemerkung = werte.bemerkung.trim();
    const ergebnis = await versuch.schreibe(
      unterkunftAnlegen({
        unterkunftId,
        name: werte.name.trim(),
        kapazitaet,
        ...(ort === "" ? {} : { ort }),
        ...(bemerkung === "" ? {} : { bemerkung }),
      }),
    );
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }

  const feld = (name: Unterkunftsfeld, titel: string, art: "text" | "zahl" = "text"): React.JSX.Element => (
    <label>
      {titel}
      <input
        value={werte[name]}
        inputMode={art === "zahl" ? "numeric" : undefined}
        onChange={(e) => {
          setzeWerte((bisher) => ({ ...bisher, [name]: e.target.value }));
        }}
      />
    </label>
  );

  return (
    <Maske
      titel={unterkunft === undefined ? "Unterkunft anlegen" : "Unterkunft ändern"}
      bestaetigungstext={unterkunft === undefined ? "Unterkunft anlegen" : "Übernehmen"}
      bereit={bereit}
      bereitGrund={kapazitaet === undefined ? "Kapazität als ganze Zahl eintragen" : undefined}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {feld("name", "Name")}
      {feld("ort", "Ort")}
      {feld("kapazitaet", "Kapazität (Plätze)", "zahl")}
      {feld("bemerkung", "Bemerkung")}
      <p className="hinweistext">Eine Zahl für alle; die Belegung zeigt die Aufteilung nach m/w/d.</p>
      {versuch.anzeige}
    </Maske>
  );
}
