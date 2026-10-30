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

import { einsatzBeendet, einsatzWiedereroeffnet, zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import type { Akteergebnis, Bedienergebnis, Lagebild } from "../kontrakt/index.js";
import { Ausgabedatei } from "./Ausgabedatei.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";

type Offen = "beenden" | "archivieren" | undefined;

/** Der Zustand in Worten — „Laufend“, „Beendet seit …“, „Archiviert — nur lesen“. */
export function zustandstext(lagebild: Pick<Lagebild, "einsatzStatus" | "einsatzEnde">): string {
  const ende = zeitpunktText(lagebild.einsatzEnde);
  if (lagebild.einsatzStatus === "ARCHIVIERT") return "Archiviert — nur lesen";
  if (lagebild.einsatzStatus === "BEENDET") return ende === "" ? "Beendet" : `Beendet seit ${ende}`;
  return "Laufend";
}

/** Die Meldung eines Bedienschritts, der nicht durchging — oder nichts. */
function meldungAus(ergebnis: Bedienergebnis | undefined): string | undefined {
  if (ergebnis === undefined || ergebnis.art === "geschrieben") return undefined;
  return "meldung" in ergebnis ? ergebnis.meldung : "Der Schritt ist nicht durchgegangen.";
}

/** Das gesehene Ende als `vorher`-Wert (§2.2a): `null`, solange keines gilt. */
function gesehenesEnde(lagebild: Lagebild): string | null {
  return lagebild.einsatzEnde === undefined || lagebild.einsatzEnde === "" ? null : lagebild.einsatzEnde;
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

  return (
    <section aria-label="Einsatz abschließen" className="einsatzabschluss">
      <h3>Einsatz abschließen</h3>
      <p>
        Zustand: <strong>{zustandstext(lagebild)}</strong>
      </p>
      <Abschlussknoepfe lagebild={lagebild} oeffne={setzeOffen} aufAkte={setzeAkte} />
      {akte !== undefined && <Ausgabedatei pfad={akte.pfad} vorsatz="Einsatzakte" zusatz={aktenzusatz(akte)} />}
      {offen === "beenden" && (
        <Beendenmaske einsatzId={lagebild.einsatzId} vorher={gesehenesEnde(lagebild)} aufSchliessen={schliesse} />
      )}
      {offen === "archivieren" && <Archivmaske aufSchliessen={schliesse} />}
    </section>
  );
}

interface AbschlussknoepfeEigenschaften {
  readonly lagebild: Lagebild;
  oeffne(welche: Offen): void;
  aufAkte(akte: Akteergebnis): void;
}

/** Die Knöpfe in der Reihenfolge des Vorgangs — je Zustand nur die, die gehen. */
function Abschlussknoepfe({ lagebild, oeffne, aufAkte }: AbschlussknoepfeEigenschaften): React.JSX.Element {
  const bediene = useLaden((zustand) => zustand.bediene);
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);
  const status = lagebild.einsatzStatus ?? "AKTIV";

  async function wiedereroeffne(): Promise<void> {
    setzeMeldung(meldungAus(await bediene(einsatzWiedereroeffnet(lagebild.einsatzId, gesehenesEnde(lagebild)))));
  }

  return (
    <>
      {status === "AKTIV" && (
        <button type="button" onClick={() => { oeffne("beenden"); }}>
          Einsatz beenden
        </button>
      )}
      {status === "BEENDET" && (
        <button type="button" onClick={() => { void wiedereroeffne(); }}>
          Einsatz wiedereröffnen
        </button>
      )}
      <Aktenknopf aufErzeugt={aufAkte} />
      {status === "BEENDET" && (
        <button type="button" onClick={() => { oeffne("archivieren"); }}>
          Archivieren
        </button>
      )}
      {meldung !== undefined && <p className="hinweistext" role="alert">{meldung}</p>}
    </>
  );
}

interface BeendenmaskeEigenschaften {
  readonly einsatzId: string;
  readonly vorher: string | null;
  aufSchliessen(): void;
}

/** Zeitpunkt (vorbelegt mit jetzt) und Bemerkung; die Bemerkung steht im Tagebuch als Grund. */
function Beendenmaske({ einsatzId, vorher, aufSchliessen }: BeendenmaskeEigenschaften): React.JSX.Element {
  const bediene = useLaden((zustand) => zustand.bediene);
  const [zeit, setzeZeit] = useState(() => zeitpunktText(new Date().toISOString()));
  const [bemerkung, setzeBemerkung] = useState("");
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);
  const zeitpunkt = zeitpunktAusEingabe(zeit);

  async function beende(): Promise<void> {
    if (zeitpunkt === undefined) return;
    const ergebnis = await bediene(einsatzBeendet(einsatzId, vorher, zeitpunkt, bemerkung));
    if (ergebnis?.art === "geschrieben") aufSchliessen();
    else setzeMeldung(meldungAus(ergebnis));
  }

  return (
    <Maske
      titel="Einsatz beenden"
      bestaetigungstext="Einsatz beenden"
      bereit={zeitpunkt !== undefined}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={beende}
    >
      <label>
        Einsatzende (TT.MM.JJJJ HH:MM)
        <Zeitfeld wert={zeit} aufAenderung={setzeZeit} />
      </label>
      <label>
        Bemerkung
        <input type="text" value={bemerkung} onChange={(e) => { setzeBemerkung(e.target.value); }} />
      </label>
      <p className="hinweistext">
        Danach nimmt der Einsatz keine Eingaben mehr an, bis er wiedereröffnet wird.
      </p>
      {zeitpunkt === undefined && <p className="hinweistext" role="status">Die Zeitangabe ist nicht lesbar.</p>}
      {meldung !== undefined && <p className="hinweistext" role="alert">{meldung}</p>}
    </Maske>
  );
}

/** Die Bestätigung mit dem Hinweis, dass danach nichts mehr geschrieben werden kann. */
function Archivmaske({ aufSchliessen }: { aufSchliessen(): void }): React.JSX.Element {
  const akteId = useLaden((zustand) => zustand.akteId);
  const [verstanden, setzeVerstanden] = useState(false);
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);

  async function archiviere(): Promise<void> {
    if (akteId === undefined) return;
    try {
      const ergebnis = await rufe({ art: "einsatzArchivieren", akteId, zeitpunkt: new Date().toISOString() });
      if (ergebnis.art === "geschrieben") aufSchliessen();
      else setzeMeldung(meldungAus(ergebnis));
    } catch (fehler) {
      setzeMeldung(fehler instanceof Error ? fehler.message : String(fehler));
    }
  }

  return (
    <Maske
      titel="Einsatz archivieren"
      bestaetigungstext="Archivieren"
      bereit={verstanden}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={archiviere}
    >
      <p>
        Nach dem Archivieren kann an diesem Einsatz <strong>nichts mehr geschrieben werden</strong> — an keinem
        Arbeitsplatz, auch nicht über „Rückgängig“. Lesen, Ausgaben und die Einsatzakte gehen weiter.
      </p>
      <p className="hinweistext">Die Einsatzakte am besten vorher erzeugen und sichern.</p>
      <label className="schalter">
        <input type="checkbox" checked={verstanden} onChange={(e) => { setzeVerstanden(e.target.checked); }} />
        Ich habe verstanden, dass danach nichts mehr geschrieben werden kann.
      </label>
      {meldung !== undefined && <p className="hinweistext" role="alert">{meldung}</p>}
    </Maske>
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
