/**
 * Der Bereich „Vorschau" in Maske und Ansicht einer Nachricht: der Vordruck,
 * wie er gedruckt wird (KONZEPT-NACHRICHTEN.md Entscheidung 4, Schnitt N3).
 *
 * Aufklappbar, und der Zustand ist ein Merker dieses Arbeitsplatzes
 * (`Einstellungen.vorschau`): Vorbelegung aufgeklappt in der Ansicht — dort
 * ist der Vordruck das, was man sehen will — und zugeklappt in der Maske, die
 * selbst schon wie der Vordruck steht. Erst die aufgeklappte Vorschau lädt
 * jsPDF und die Bibliothek nach (`vordruckzeichner.ts`).
 *
 * Beim Tippen zeichnet sie erst, wenn 300 ms nichts mehr kam: Ein Vordruck je
 * Tastendruck hielte die Eingabe auf, und niemand liest eine Vorschau
 * mitten im Wort. Ohne 2D-Kontext (jsdom, abgeschaltete Grafikbeschleunigung)
 * steht „Keine Vorschau möglich" — der Druck selbst geht davon unberührt
 * über den Worker.
 */

import { datumZeitGruppe } from "@s1/domaene";
import { useEffect, useRef, useState } from "react";

import type { Einstellungen } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { druckAus, ladeVordruckmodule, vordruckseiten, zeichneSeiten, type Vordruckquelle } from "./vordruckzeichner.js";

/** Wie lange die Vorschau nach dem letzten Tastendruck wartet. */
export const VORSCHAU_VERZUG_MS = 300;

export type Vorschauort = "maske" | "ansicht";

type Stand = { readonly art: "laedt" } | { readonly art: "bereit"; readonly blaetter: number } | { readonly art: "ohneCanvas" } | { readonly art: "fehler"; readonly text: string };

/** Ob die Vorschau an diesem Ort aufgeklappt ist — gemerkt oder die Vorbelegung. */
export function vorschauOffen(einstellungen: Einstellungen, ort: Vorschauort): boolean {
  return einstellungen.vorschau?.[ort] ?? ort === "ansicht";
}

/**
 * Merkt den Zustand für diesen Arbeitsplatz. Wie beim Erscheinungsbild:
 * sofort sichtbar, gespeichert wird hinterher; scheitert das Speichern,
 * bleibt die Wahl für dieses Fenster.
 */
async function merke(ort: Vorschauort, offen: boolean): Promise<void> {
  const bisher = useLaden.getState().einstellungen;
  const einstellungen: Einstellungen = { ...bisher, vorschau: { ...bisher.vorschau, [ort]: offen } };
  useLaden.setState({ einstellungen });
  try {
    useLaden.setState({ einstellungen: await rufe({ art: "einstellungenSetzen", einstellungen }) });
  } catch {
    // Der Merker ist Bequemlichkeit; ein Fehler hier ist keine Meldung wert.
  }
}

function standtext(stand: Stand): string {
  if (stand.art === "laedt") return "Vorschau wird gezeichnet …";
  if (stand.art === "ohneCanvas") return "Keine Vorschau möglich: Dieses Fenster kann nicht zeichnen. Der Ausdruck geht trotzdem.";
  if (stand.art === "fehler") return `Keine Vorschau möglich: ${stand.text}`;
  return stand.blaetter > 1 ? `${String(stand.blaetter)} Blätter, wie gedruckt` : "Wie gedruckt";
}

/** Zeichnet, sobald die Quelle `VORSCHAU_VERZUG_MS` lang ruht. */
function useZeichnung(offen: boolean, quelle: Vordruckquelle, uebung: boolean): { canvas: React.RefObject<HTMLCanvasElement | null>; stand: Stand } {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stand, setzeStand] = useState<Stand>({ art: "laedt" });
  const schluessel = JSON.stringify([quelle, uebung]);
  const aktuell = useRef({ quelle, uebung });
  aktuell.current = { quelle, uebung };

  useEffect(() => {
    if (!offen) return;
    let gilt = true;
    const zeitgeber = setTimeout(() => {
      void ladeVordruckmodule()
        .then((m) => {
          const ziel = canvas.current;
          if (!gilt || ziel === null) return;
          const seiten = vordruckseiten(m, druckAus(m, aktuell.current.quelle, aktuell.current.uebung));
          const breite = ziel.parentElement?.clientWidth || ziel.clientWidth || 360;
          setzeStand(zeichneSeiten(ziel, m, seiten, breite) ? { art: "bereit", blaetter: seiten.length } : { art: "ohneCanvas" });
        })
        .catch((fehler: unknown) => {
          if (gilt) setzeStand({ art: "fehler", text: fehler instanceof Error ? fehler.message : String(fehler) });
        });
    }, VORSCHAU_VERZUG_MS);
    return () => {
      gilt = false;
      clearTimeout(zeitgeber);
    };
  }, [offen, schluessel]);

  return { canvas, stand };
}

export interface VordruckvorschauEigenschaften {
  readonly ort: Vorschauort;
  readonly quelle: Vordruckquelle;
}

/**
 * Der Stempel der zurückgezogenen Nachricht als Zeile über dem Bild (ETB
 * P1-3, P2-7): Der Druck zeichnet ihn quer über das Formular, die Vorschau
 * nennt ihn mit Zeit und Grund, damit niemand ein zurückgezogenes Blatt für gültig hält.
 */
export function vorschaustempel(quelle: Vordruckquelle): string | undefined {
  if (quelle.art !== "zeile" || !quelle.zeile.zurueckgezogen) return undefined;
  const mit = quelle.zeile.zurueckgezogenMit;
  const zeit = mit === undefined ? "" : ` ${datumZeitGruppe(mit.zeitpunkt)}`;
  const grund = mit?.grund === undefined || mit.grund === "" ? "" : `: ${mit.grund}`;
  return `ZURÜCKGEZOGEN${zeit}${grund}`;
}

export function Vordruckvorschau({ ort, quelle }: VordruckvorschauEigenschaften): React.JSX.Element {
  const offen = useLaden((z) => vorschauOffen(z.einstellungen, ort));
  const uebung = useLaden((z) => z.lagebild?.einsatzArt === "UEBUNG");
  const { canvas, stand } = useZeichnung(offen, quelle, uebung);
  return (
    <section className="vordruckvorschau" aria-label="Vorschau">
      <button type="button" className="alsLink" aria-expanded={offen} onClick={() => void merke(ort, !offen)}>
        {offen ? "▾" : "▸"} Vorschau
      </button>
      {offen && (
        <>
          <p className="hinweistext" role="status">
            {standtext(stand)}
          </p>
          {vorschaustempel(quelle) !== undefined && <p className="marke-zustand fehler">{vorschaustempel(quelle)}</p>}
          <div className="vorschaubild" hidden={stand.art === "ohneCanvas" || stand.art === "fehler"}>
            <canvas ref={canvas} aria-label="Vordruck, wie er gedruckt wird" />
          </div>
        </>
      )}
    </section>
  );
}
