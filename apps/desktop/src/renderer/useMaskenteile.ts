/**
 * Die Zustände der Nachrichtenmaske — herausgelöst aus `Nachrichtenmaske.tsx`
 * (AGENTS.md §6: die Datei war nahe der Strukturgrenze, die Funktion darüber).
 *
 * Mittelteil (Feld 7 bis 17), Aufnahmevermerk (oben, bei der FmZ),
 * Laufzettel (unten, bei Ersatzsichter und Gesprächsnotiz), der Papier-
 * Nachtrag und die Wahl „Selbst verteilen“. Bis jemand den Verteiler
 * anfasst, folgt er der Anschrift: S2 rot, die Anschrift grün (SGL P1-3).
 *
 * Neu in Runde 2:
 * - **Zurückstellen** (R2-FaBe P3-4, R2-SGL P3-2): Alle Teile lassen sich
 *   unter einem Schlüssel ablegen (`nachrichtenentwuerfe.ts`) und stehen
 *   beim nächsten Öffnen derselben Maske wieder da.
 * - **Nachtrag ohne Nummer** (R2-LdF P3-7, R2-SGL P2-1): Schaltet der
 *   Nachtrag ein, leert er auch die vorbelegte Nummer der Aufnahme — auf
 *   dem Blatt steht die Nummer, die gilt, nicht „höchste plus eins“. Eine
 *   getippte Nummer bleibt.
 *
 * Stab-Review (LdF-1, Fm-1): Die vorbelegte Nummer wurde beim Öffnen
 * festgehalten. Nahm ein zweiter Platz inzwischen auf, schrieb diese Maske
 * dieselbe Nummer. Jetzt folgt die Vorbelegung dem aktuellen Stand, bis
 * jemand die Nummer selbst ändert; dann gilt das Getippte.
 */

import { useState } from "react";

import { datumZeitGruppe } from "@s1/domaene";

import { aufnahmeVorlage, type Aufnahmewerte } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { stelleZurueck, vergiss, zurueckgestellt } from "./nachrichtenentwuerfe.js";
import type { Maskenwerte } from "./nachrichtenformate.js";
import { nachtragVorlage, type Nachtragswerte } from "./Papiernachtrag.js";
import { verteilerAusAnschrift } from "./Verteilerraster.js";
import { verteilVorlage, type Verteilwerte } from "./Vordruckeingabe.js";

/** Alles, was die Maske beim Zurückstellen ablegt. */
export interface Maskenteile {
  readonly werte: Maskenwerte;
  readonly aufnahmewerte: Aufnahmewerte;
  readonly verteilwerte: Verteilwerte;
  readonly verteilerAngefasst: boolean;
  readonly nachtrag: boolean;
  readonly nachtragswerte: Nachtragswerte;
  readonly selbst: boolean;
}

/** Die Nummer im Aufnahmevermerk beim Umschalten des Nachtrags: nur die Vorbelegung weicht, Getipptes bleibt. */
export function nummerBeimNachtrag(nummer: string, an: boolean, naechsteNummer: number | undefined): string {
  const vorbelegt = naechsteNummer === undefined ? "" : String(naechsteNummer);
  if (an) return nummer === vorbelegt ? "" : nummer;
  return nummer.trim() === "" ? vorbelegt : nummer;
}

/** Die Aufnahmewerte mit der aktuellen Vorbelegung, solange die Nummer nicht angefasst ist. */
export function folgendeNummer(werte: Aufnahmewerte, folgt: boolean, naechsteNummer: number | undefined): Aufnahmewerte {
  if (!folgt || naechsteNummer === undefined) return werte;
  return { ...werte, nummer: String(naechsteNummer) };
}

function useStart(vorlage: Maskenwerte, naechsteNummer: number | undefined, schluessel: string | undefined) {
  const sitzung = useLaden((z) => z.lagebild?.sitzung);
  const [gemerkt] = useState(() => zurueckgestellt<Maskenteile>(schluessel));
  const start: Maskenteile = gemerkt?.teile ?? {
    werte: vorlage,
    aufnahmewerte: aufnahmeVorlage(sitzung, naechsteNummer),
    verteilwerte: verteilVorlage(sitzung?.handzeichen ?? ""),
    verteilerAngefasst: false,
    nachtrag: false,
    nachtragswerte: nachtragVorlage(),
    selbst: true,
  };
  return { gemerkt, start };
}

export function useMaskenteile(vorlage: Maskenwerte, naechsteNummer: number | undefined, schluessel: string | undefined) {
  const { gemerkt, start } = useStart(vorlage, naechsteNummer, schluessel);
  const [werte, setzeWerte] = useState<Maskenwerte>(start.werte);
  const [aufnahmewerte, setzeAufnahmewerte] = useState<Aufnahmewerte>(start.aufnahmewerte);
  const [verteilwerte, setzeVerteilwerte] = useState<Verteilwerte>(start.verteilwerte);
  const [verteilerAngefasst, setzeVerteilerAngefasst] = useState(start.verteilerAngefasst);
  const [aufnahmeAngefasst, setzeAufnahmeAngefasst] = useState(false);
  const [nachtrag, setzeNachtrag] = useState(start.nachtrag);
  // Ein zurückgestellter Entwurf trägt seine Nummer; sie folgt nicht.
  const [nummerFolgt, setzeNummerFolgt] = useState(gemerkt === undefined);
  const wirksameAufnahme = folgendeNummer(aufnahmewerte, nummerFolgt && !nachtrag, naechsteNummer);
  const [nachtragswerte, setzeNachtragswerte] = useState<Nachtragswerte>(start.nachtragswerte);
  const [selbst, setzeSelbst] = useState(start.selbst);
  const fuestName = useLaden((z) => z.lagebild?.stammdaten?.fuestName);
  const verteilung: Verteilwerte = verteilerAngefasst ? verteilwerte : { ...verteilwerte, verteiler: verteilerAusAnschrift(werte.anschrift, fuestName) };
  const geaendert =
    gemerkt !== undefined || JSON.stringify(werte) !== JSON.stringify(vorlage) || aufnahmeAngefasst || verteilerAngefasst || JSON.stringify(nachtragswerte) !== JSON.stringify(nachtragVorlage());
  const teile: Maskenteile = { werte, aufnahmewerte: wirksameAufnahme, verteilwerte, verteilerAngefasst, nachtrag, nachtragswerte, selbst };
  return {
    fuestName,
    werte,
    setzeWerte,
    aufnahmewerte: wirksameAufnahme,
    verteilung,
    nachtrag,
    nachtragswerte,
    setzeNachtragswerte,
    selbst,
    setzeSelbst,
    geaendert,
    /** Wann der wiederhergestellte Entwurf zurückgestellt wurde, sonst `undefined`. */
    wiederhergestellt: gemerkt?.zeit,
    /** Fernmelder P2-3, R2-LdF P3-7: Zeiten „vom Blatt“ statt „jetzt“, Nummer leer; zählt nicht als getippt. */
    schalteNachtrag: (an: boolean): void => {
      const jetzt = an ? "" : datumZeitGruppe(new Date());
      setzeNachtrag(an);
      setzeWerte((w) => ({ ...w, abfassungszeit: an ? "" : vorlage.abfassungszeit }));
      setzeAufnahmewerte((w) => ({ ...w, zeit: jetzt, nummer: nummerFolgt ? "" : nummerBeimNachtrag(w.nummer, an, naechsteNummer) }));
      setzeVerteilwerte((w) => ({ ...w, quittung: jetzt }));
    },
    aufAufnahme: (neu: Aufnahmewerte): void => {
      if (neu.nummer !== wirksameAufnahme.nummer) setzeNummerFolgt(false);
      setzeAufnahmeAngefasst(true);
      setzeAufnahmewerte(neu);
    },
    aufVerteilung: (neu: Verteilwerte): void => {
      if (neu.verteiler !== verteilung.verteiler) setzeVerteilerAngefasst(true);
      setzeVerteilwerte(neu);
    },
    /** „Abbrechen“ mit getipptem Inhalt: ablegen statt verwerfen (R2-FaBe P3-4). */
    zurueckstellen: schluessel === undefined ? undefined : (): void => stelleZurueck(schluessel, teile),
    /** Aufgegeben oder verworfen: der abgelegte Entwurf ist erledigt. */
    vergiss: (): void => vergiss(schluessel),
  };
}
