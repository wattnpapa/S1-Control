/**
 * Die Rückfragen des Einsatzabschlusses: beenden, wiedereröffnen, archivieren.
 *
 * Alle drei wirken auf **alle** Arbeitsplätze. Darum nennt jede Maske den
 * Einsatz beim Namen und sagt, wen es trifft — und keine löst durch ein bloßes
 * Enter aus: Das Zeitfeld ist vorbelegt, ein Enter darin wäre sonst die ganze
 * Hürde vor einer Sperre für die ganze Mannschaft.
 */

import { useState } from "react";

import { zeitpunktText } from "@s1/domaene";

import { einsatzBeendet, einsatzWiedereroeffnet, zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import type { Bedienergebnis, Lagebild } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";

/** Die Meldung eines Bedienschritts, der nicht durchging — oder nichts. */
export function meldungAus(ergebnis: Bedienergebnis | undefined): string | undefined {
  if (ergebnis === undefined || ergebnis.art === "geschrieben") return undefined;
  return "meldung" in ergebnis ? ergebnis.meldung : "Der Schritt ist nicht durchgegangen.";
}

/** Das gesehene Ende als `vorher`-Wert (§2.2a): `null`, solange keines gilt. */
export function gesehenesEnde(lagebild: Pick<Lagebild, "einsatzEnde">): string | null {
  return lagebild.einsatzEnde === undefined || lagebild.einsatzEnde === "" ? null : lagebild.einsatzEnde;
}

/** Wie viele andere Arbeitsplätze gerade am Einsatz hängen — wie die Statuszeile sie zählt. */
export function weitereArbeitsplaetze(lagebild: Pick<Lagebild, "peers">): number {
  return lagebild.peers.filter((p) => !p.veraltet).length;
}

/** „3 weitere Arbeitsplätze“, „1 weiteren Arbeitsplatz“, „keinen weiteren Arbeitsplatz“. */
export function arbeitsplatzText(anzahl: number): string {
  if (anzahl === 0) return "keinen weiteren Arbeitsplatz";
  return anzahl === 1 ? "1 weiteren Arbeitsplatz" : `${String(anzahl)} weitere Arbeitsplätze`;
}

/** Die Zusammenfassung dessen, was beim Beenden noch offen ist. */
export function offenText(lagebild: Pick<Lagebild, "einheiten" | "offeneAnforderungen">): string {
  const anforderungen = lagebild.offeneAnforderungen ?? 0;
  const anf = anforderungen === 1 ? "1 offene Anforderung" : `${String(anforderungen)} offene Anforderungen`;
  const ein = lagebild.einheiten === 1 ? "1 Einheit" : `${String(lagebild.einheiten)} Einheiten`;
  return `Noch offen: ${anf}; ${ein} nicht abgeschlossen (nicht im Archiv-Abschnitt).`;
}

/** Zeitpunkt (vorbelegt mit jetzt) und Bemerkung; die Bemerkung steht im Tagebuch als Grund. */
export function Beendenmaske({ lagebild, aufSchliessen }: { lagebild: Lagebild; aufSchliessen(): void }): React.JSX.Element {
  const bediene = useLaden((zustand) => zustand.bediene);
  const [zeit, setzeZeit] = useState(() => zeitpunktText(new Date().toISOString()));
  const [bemerkung, setzeBemerkung] = useState("");
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);
  const zeitpunkt = zeitpunktAusEingabe(zeit);
  const weitere = weitereArbeitsplaetze(lagebild);

  async function beende(): Promise<void> {
    if (zeitpunkt === undefined) return;
    const entwurf = einsatzBeendet(lagebild.einsatzId, gesehenesEnde(lagebild), zeitpunkt, bemerkung);
    const ergebnis = await bediene(entwurf);
    if (ergebnis?.art === "geschrieben") aufSchliessen();
    else setzeMeldung(meldungAus(ergebnis));
  }

  return (
    <Maske
      titel={`Einsatz „${lagebild.einsatzName}“ beenden`}
      bestaetigungstext="Einsatz beenden"
      bereit={zeitpunkt !== undefined}
      nurKnopf
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={beende}
    >
      <p>
        Beenden sperrt den Einsatz für Sie und {arbeitsplatzText(weitere)}: <strong>Schreiben ist nicht mehr
        möglich.</strong> Wiedereröffnen ist möglich.
      </p>
      <p className="hinweistext">{offenText(lagebild)}</p>
      <label>
        Einsatzende (TT.MM.JJJJ HH:MM)
        <Zeitfeld wert={zeit} aufAenderung={setzeZeit} />
      </label>
      <label>
        Bemerkung
        <input type="text" value={bemerkung} onChange={(e) => { setzeBemerkung(e.target.value); }} />
      </label>
      {zeitpunkt === undefined && <p className="hinweistext" role="status">Die Zeitangabe ist nicht lesbar.</p>}
      {meldung !== undefined && <p className="hinweistext" role="alert">{meldung}</p>}
    </Maske>
  );
}

/** Wiedereröffnen: Einsatzname und Wirkung, dann der bewusste Knopf. */
export function Wiedereroeffnenmaske({ lagebild, aufSchliessen }: { lagebild: Lagebild; aufSchliessen(): void }): React.JSX.Element {
  const bediene = useLaden((zustand) => zustand.bediene);
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);
  const weitere = weitereArbeitsplaetze(lagebild);

  async function oeffne(): Promise<void> {
    const ergebnis = await bediene(einsatzWiedereroeffnet(lagebild.einsatzId, gesehenesEnde(lagebild)));
    if (ergebnis?.art === "geschrieben") aufSchliessen();
    else setzeMeldung(meldungAus(ergebnis));
  }

  return (
    <Maske
      titel={`Einsatz „${lagebild.einsatzName}“ wiedereröffnen`}
      bestaetigungstext="Wiedereröffnen"
      trotzSperre
      nurKnopf
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={oeffne}
    >
      <p>
        Wiedereröffnen hebt die Sperre auf: Sie und {arbeitsplatzText(weitere)} können wieder schreiben. Das
        Einsatzende wird gelöscht und kann erneut gesetzt werden.
      </p>
      {meldung !== undefined && <p className="hinweistext" role="alert">{meldung}</p>}
    </Maske>
  );
}

/** Die Bestätigung mit dem Hinweis, dass danach nichts mehr geschrieben werden kann. */
export function Archivmaske({ einsatzName, aufSchliessen }: { einsatzName: string; aufSchliessen(): void }): React.JSX.Element {
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
      titel={`Einsatz „${einsatzName}“ archivieren`}
      bestaetigungstext="Archivieren"
      bereit={verstanden}
      trotzSperre
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={archiviere}
    >
      <p>
        Nach dem Archivieren kann an diesem Einsatz <strong>nichts mehr geschrieben werden</strong> — an keinem
        Arbeitsplatz, auch nicht über „Rückgängig“. Es gibt kein Wiedereröffnen. Lesen, Ausgaben und die
        Einsatzakte gehen weiter.
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
