/**
 * Die Abfrage von Stelle und Handzeichen im offenen Einsatz
 * (KONZEPT-NACHRICHTEN.md Entscheidung 3).
 *
 * Zwei Wege führen hierher. Erstens von selbst, wenn das Lagebild keine
 * Sitzung trägt: Der Einsatz wurde ohne die Abfrage geöffnet — neu angelegt
 * oder nach einem Neustart wieder geöffnet. Zweitens aus dem Fenstermenü,
 * um die Stelle während der Sitzung zu ändern. Beides schreibt mit
 * `stellenSetzen` in den Worker (Präsenz, Lagebild) und merkt die Wahl als
 * Vorbelegung für das nächste Öffnen desselben Einsatzes.
 *
 * Wer die Abfrage von selbst bekommt und abbricht, arbeitet ohne Stelle
 * weiter; der Worker hält dann eine leere Sitzung, und das Fenster fragt
 * nicht bei jedem Neuladen erneut. Im Meldekopf entfällt die Abfrage.
 */

import { useState } from "react";

import type { Sitzungsstellen } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { Stellenabfrage, mitVorbelegung, vorbelegungAus } from "./Stellenabfrage.js";

/** Setzt die Sitzung im Worker und merkt sie in den Einstellungen dieses Geräts. */
export async function setzeSitzung(akteId: string, ordner: string, sitzung: Sitzungsstellen): Promise<void> {
  await rufe({ art: "stellenSetzen", akteId, stellen: [...sitzung.stellen], ...(sitzung.handzeichen === undefined ? {} : { handzeichen: sitzung.handzeichen }) });
  await merkeVorbelegung(ordner, sitzung);
}

/** Merkt die Wahl als Vorbelegung; scheitert das Speichern, gilt sie trotzdem für diese Sitzung. */
export async function merkeVorbelegung(ordner: string, sitzung: Sitzungsstellen): Promise<void> {
  const einstellungen = mitVorbelegung(useLaden.getState().einstellungen, ordner, sitzung);
  try {
    useLaden.setState({ einstellungen: await rufe({ art: "einstellungenSetzen", einstellungen }) });
  } catch {
    useLaden.getState().melde("warnung", "Stelle und Handzeichen gelten für diese Sitzung, sind aber nicht als Vorbelegung gespeichert.");
  }
}

export function useSitzungsabfrage(): { readonly maske: React.JSX.Element | null; readonly oeffne: (() => void) | undefined } {
  const akteId = useLaden((z) => z.akteId);
  const lagebild = useLaden((z) => z.lagebild);
  const einstellungen = useLaden((z) => z.einstellungen);
  const [gewuenscht, setzeGewuenscht] = useState(false);
  const meldekopf = einstellungen.betriebsart === "meldekopf";
  if (akteId === undefined || lagebild === undefined || meldekopf) return { maske: null, oeffne: undefined };
  const ordner = lagebild.einsatzId;
  // Nur ein Worker, der Nachrichten kennt, hält eine Sitzung; einer älterer
  // Fassung schickt `nachrichten` nicht, und die Frage käme dann bei jedem Bild.
  const vonSelbst = lagebild.sitzung === undefined && lagebild.nachrichten !== undefined;
  const oeffne = (): void => setzeGewuenscht(true);
  if (!vonSelbst && !gewuenscht) return { maske: null, oeffne };
  const vorbelegung = lagebild.sitzung ?? vorbelegungAus(einstellungen, ordner);
  const maske = (
    <Stellenabfrage
      vorbelegung={vorbelegung}
      {...(lagebild.einsatzName === "" ? {} : { einsatzname: lagebild.einsatzName })}
      aufBestaetigen={async (sitzung) => {
        await setzeSitzung(akteId, ordner, sitzung);
        setzeGewuenscht(false);
      }}
      aufAbbrechen={() => {
        setzeGewuenscht(false);
        // Von selbst gefragt und abgebrochen: ohne Stelle weiter, nicht erneut fragen.
        if (vonSelbst) void rufe({ art: "stellenSetzen", akteId, stellen: [] }).catch(() => undefined);
      }}
    />
  );
  return { maske, oeffne };
}
