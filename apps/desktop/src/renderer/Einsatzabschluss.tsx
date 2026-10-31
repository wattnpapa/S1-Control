/**
 * „Einsatz abschließen“: beenden, wiedereröffnen, Einsatzakte, archivieren.
 *
 * **Warum im Blatt „Ausgaben“ und nicht in der Führungsstelle.** Die Excel
 * führt „Speichern mit Einsatzname und Datum“ im selben Menü wie den
 * Druck und den HTML-Export — der Abschluss ist dort ein Ausgang des
 * Einsatzes, kein Teil der Stammdaten. Wer am Ende die letzten Ausdrucke
 * macht, findet hier unmittelbar darunter die Akte und das Archivieren, und
 * die Reihenfolge der Knöpfe ist die des Vorgangs: beenden, Akte erzeugen,
 * archivieren.
 *
 * **Die Sperre steht im Worker** (`einsatzabschluss.ts`). Diese Ansicht zeigt
 * nur an, was gilt, und bietet an, was geht; ein Knopf, der hier fehlt, ist
 * Bequemlichkeit und kein Schutz.
 */

import { useState } from "react";

import { zeitpunktText } from "@s1/domaene";

import type { Akteergebnis, Lagebild } from "../kontrakt/index.js";
import { Ausgabedatei } from "./Ausgabedatei.js";
import { Archivmaske, Beendenmaske, Wiedereroeffnenmaske } from "./Einsatzabschlussmasken.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";

type Offen = "beenden" | "wiedereroeffnen" | "archivieren" | undefined;

/** Der Zustand in Worten — „Laufend“, „Beendet seit …“, „Archiviert — nur lesen“. */
export function zustandstext(lagebild: Pick<Lagebild, "einsatzStatus" | "einsatzEnde">): string {
  const ende = zeitpunktText(lagebild.einsatzEnde);
  if (lagebild.einsatzStatus === "ARCHIVIERT") return "Archiviert — nur lesen";
  if (lagebild.einsatzStatus === "BEENDET") return ende === "" ? "Beendet" : `Beendet seit ${ende}`;
  return "Laufend";
}

export function Einsatzabschluss(): React.JSX.Element | null {
  const lagebild = useLaden((zustand) => zustand.lagebild);
  const [offen, setzeOffen] = useState<Offen>(undefined);
  // Die Akte steht unter allen Knöpfen und nicht neben ihrem: Der Pfad ist
  // lang und nimmt die volle Breite — zwischen den Knöpfen risse er die Reihe.
  const [akte, setzeAkte] = useState<Akteergebnis | undefined>(undefined);
  if (lagebild === undefined) return null;
  const schliesse = (): void => {
    setzeOffen(undefined);
  };
  const status = lagebild.einsatzStatus ?? "AKTIV";

  return (
    <section aria-label="Einsatz abschließen" className="einsatzabschluss">
      <h3>Einsatz abschließen</h3>
      <p>
        Zustand: <strong>{zustandstext(lagebild)}</strong>
      </p>
      <Abschlussknoepfe status={status} oeffne={setzeOffen} aufAkte={setzeAkte} />
      {akte !== undefined && <Ausgabedatei pfad={akte.pfad} vorsatz="Einsatzakte" zusatz={aktenzusatz(akte)} />}
      {status === "BEENDET" && (
        // Archivieren steht abgesetzt: Es ist das Einzige, das sich nicht zurücknehmen lässt.
        <div role="group" aria-label="Unumkehrbar" style={{ marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px solid currentColor" }}>
          <p className="hinweistext">Unumkehrbar — „{lagebild.einsatzName}“ ist danach für immer nur lesbar:</p>
          <button type="button" onClick={() => { setzeOffen("archivieren"); }}>
            Archivieren
          </button>
        </div>
      )}
      {offen === "beenden" && <Beendenmaske lagebild={lagebild} aufSchliessen={schliesse} />}
      {offen === "wiedereroeffnen" && <Wiedereroeffnenmaske lagebild={lagebild} aufSchliessen={schliesse} />}
      {offen === "archivieren" && <Archivmaske einsatzName={lagebild.einsatzName} aufSchliessen={schliesse} />}
    </section>
  );
}

interface AbschlussknoepfeEigenschaften {
  readonly status: "AKTIV" | "BEENDET" | "ARCHIVIERT";
  oeffne(welche: Offen): void;
  aufAkte(akte: Akteergebnis): void;
}

/** Beenden oder Wiedereröffnen und die Akte — je Zustand nur die, die gehen. */
function Abschlussknoepfe({ status, oeffne, aufAkte }: AbschlussknoepfeEigenschaften): React.JSX.Element {
  return (
    <>
      {status === "AKTIV" && (
        <button type="button" onClick={() => { oeffne("beenden"); }}>
          Einsatz beenden
        </button>
      )}
      {status === "BEENDET" && (
        <button type="button" onClick={() => { oeffne("wiedereroeffnen"); }}>
          Einsatz wiedereröffnen
        </button>
      )}
      <Aktenknopf aufErzeugt={aufAkte} />
    </>
  );
}

/** Größe, Ereignisse und — falls offen — die Befunde der Akte. */
function aktenzusatz(akte: Akteergebnis): string {
  const befunde = akte.befunde > 0 ? `, ${String(akte.befunde)} Befunde — „s1 akte pruefe“ zeigt sie` : "";
  return `${String(akte.bytes)} Bytes, ${String(akte.ereignisse)} Ereignisse${befunde}`;
}

/** „Einsatzakte erzeugen“ — gesperrt, solange sie entsteht; der Pfad steht beim Aufrufer. */
function Aktenknopf({ aufErzeugt }: { aufErzeugt(akte: Akteergebnis): void }): React.JSX.Element {
  const akteId = useLaden((zustand) => zustand.akteId);
  const melde = useLaden((zustand) => zustand.melde);
  const [laeuft, setzeLaeuft] = useState(false);

  async function erzeuge(): Promise<void> {
    if (akteId === undefined) return;
    setzeLaeuft(true);
    try {
      aufErzeugt(await rufe({ art: "akteErzeugen", akteId }));
    } catch (fehler) {
      melde("warnung", fehler instanceof Error ? fehler.message : String(fehler));
    } finally {
      setzeLaeuft(false);
    }
  }

  return (
    <button type="button" disabled={laeuft} onClick={() => { void erzeuge(); }}>
      {laeuft ? "Einsatzakte wird erzeugt …" : "Einsatzakte erzeugen"}
    </button>
  );
}
