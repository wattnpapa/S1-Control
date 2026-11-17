/**
 * Was die gewählte Nachricht schreibt und welche Masken sie öffnet
 * (KONZEPT-NACHRICHTEN.md §5, §6) — die Verdrahtung hinter Auswahlleiste
 * und Kontextmenü des Blattes „Nachrichten".
 *
 * „Lesen" schlägt die Ansicht auf und nimmt für jede Stelle der Sitzung, die
 * im Verteiler steht und noch nicht gelesen hat, Kenntnis — mit Zeit und
 * Handzeichen, je Stelle ein Ereignis (§5: Der Posteingang gehört dem
 * Sachgebiet, nicht der Person). Im beendeten Einsatz schlägt es nur auf.
 * „Erledigt" und „Erledigung zurück" schreiben ebenso je eigener Stelle.
 * „Als Vordruck drucken" (N3) legt das PDF ab und zeigt die Datei — in der
 * offenen Ansicht dort, sonst unter dem Blatt.
 */

import { useState } from "react";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Sitzungsstellen } from "../kontrakt/index.js";
import { erledigt, erledigungZurueck, kenntnisFuerStellen, nachrichtZurueckziehen } from "../kontrakt/nachrichtenschritte.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";
import { Nachrichtenansicht } from "./Nachrichtenansicht.js";
import type { NachrichtenauswahlEigenschaften } from "./Nachrichtenauswahl.js";
import { antwortVorlage, leereMaske, weiterleitenVorlage, type Maskenwerte } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { tagebuchMitNachricht } from "./Tagebuch.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";
import { useVordruckausgabe } from "./Vordruckausgabe.js";

/** Schreibt Entwürfe nacheinander; der erste Fehlschlag steht als Hinweis in der Leiste. */
async function schreibeAlle(entwuerfe: readonly Entwurf[], was: string): Promise<void> {
  for (const entwurf of entwuerfe) {
    const hinweis = hinweisAusErgebnis(await useLaden.getState().bediene(entwurf));
    if (hinweis !== undefined) {
      useLaden.getState().melde("warnung", `${was}: ${hinweis}`);
      return;
    }
  }
}

export interface Nachrichtenschritte {
  readonly auswahl: NachrichtenauswahlEigenschaften | undefined;
  /** Öffnet die Maske „Nachricht verfassen" leer, mit Vorbelegung aus Stelle und Handzeichen. */
  readonly verfassen: () => void;
  /** „Lesen" für eine Zeile — auch per Doppelklick. */
  readonly lesen: (zeile: Nachrichtenzeile) => void;
  readonly masken: React.ReactNode;
}

export interface Schrittumfeld {
  readonly zeile: Nachrichtenzeile | undefined;
  readonly sitzung: Sitzungsstellen | undefined;
  /** Die Stellen, auf die die Sicht zugeschnitten ist — sie lesen und erledigen. */
  readonly stellen: readonly string[];
  readonly nurLesen: boolean;
  readonly anschriften: readonly string[];
  readonly aufTagebuch: () => void;
}

/**
 * „Nachricht E 3" — der Name des Tagebuchfilters. Gefiltert wird über die
 * Kennung, nicht mehr über den Betreff (ETB P0-1: die Textsuche fand auch
 * fremde Nachrichten mit demselben Wort in der Anschrift).
 */
export function tagebuchnameFuer(zeile: Pick<Nachrichtenzeile, "gespraechsnotiz" | "richtungKurz" | "nummer">): string {
  const wort = zeile.gespraechsnotiz ? "Gesprächsnotiz" : "Nachricht";
  return zeile.nummer === undefined ? `${wort} ${zeile.richtungKurz}` : `${wort} ${zeile.richtungKurz} ${String(zeile.nummer)}`;
}

export function useNachrichtenschritte(umfeld: Schrittumfeld): Nachrichtenschritte {
  const { zeile, sitzung, stellen, nurLesen } = umfeld;
  const [vorlage, setzeVorlage] = useState<{ readonly werte: Maskenwerte; readonly titel: string } | undefined>(undefined);
  // Die aufgeschlagene Nachricht als Abzug: Fällt sie nach dem Lesen aus
  // dem Filter („neu"), bleibt die Ansicht trotzdem offen.
  const [gelesen, setzeGelesen] = useState<Nachrichtenzeile | undefined>(undefined);
  const grundabfrage = useGrundabfrage();
  const verbindung = useSchreibsperre();
  const vordruck = useVordruckausgabe();

  const lesen = (ziel: Nachrichtenzeile): void => {
    setzeGelesen(ziel);
    if (nurLesen) return;
    const vermerk = { zeitpunkt: new Date().toISOString(), handzeichen: sitzung?.handzeichen ?? "" };
    void schreibeAlle(kenntnisFuerStellen(ziel, stellen, vermerk), "Kenntnisnahme");
  };
  const eigeneOffen = (ziel: Nachrichtenzeile, sollErledigt: boolean): readonly string[] =>
    ziel.verteiler.filter((m) => stellen.includes(m.stelle) && m.erledigt !== sollErledigt).map((m) => m.stelle);

  const auswahl: NachrichtenauswahlEigenschaften | undefined =
    zeile === undefined
      ? undefined
      : {
          zeile,
          stellen,
          nurLesen,
          sperre: verbindung,
          aufLesen: () => lesen(zeile),
          aufErledigt: () => void schreibeAlle(eigeneOffen(zeile, true).map((s) => erledigt(zeile.id, s)), "Erledigt"),
          aufErledigungZurueck: () => void schreibeAlle(eigeneOffen(zeile, false).map((s) => erledigungZurueck(zeile.id, s)), "Erledigung zurück"),
          aufAntworten: () => setzeVorlage({ werte: antwortVorlage(zeile, sitzung), titel: "Antworten" }),
          aufWeiterleiten: () => setzeVorlage({ werte: weiterleitenVorlage(zeile, sitzung), titel: "Weiterleiten" }),
          aufZurueckziehen: () =>
            grundabfrage.frage({
              titel: "Nachricht zurückziehen",
              erlaeuterung: "Eine Fehlanlage wird zurückgezogen, nicht gelöscht: Sie bleibt mit diesem Grund sichtbar und steht im Einsatztagebuch.",
              bestaetigungstext: "Zurückziehen",
              aufGrund: (grund) => useLaden.getState().bediene(nachrichtZurueckziehen(zeile.id, grund)),
            }),
          aufTagebuch: () => {
            tagebuchMitNachricht({ id: zeile.id, name: tagebuchnameFuer(zeile) });
            umfeld.aufTagebuch();
          },
          aufVordruck: () => vordruck.erzeuge(zeile.id),
        };

  const offen = gelesen !== undefined && zeile?.id === gelesen.id ? zeile : gelesen;
  const masken = (
    <>
      {vorlage !== undefined && (
        <Nachrichtenmaske titel={vorlage.titel} vorlage={vorlage.werte} anschriften={umfeld.anschriften} aufSchliessen={() => setzeVorlage(undefined)} />
      )}
      {offen !== undefined && (
        <Nachrichtenansicht zeile={offen} aufSchliessen={() => setzeGelesen(undefined)} aufVordruck={() => vordruck.erzeuge(offen.id)} vordruckanzeige={vordruck.anzeige} />
      )}
      {offen === undefined && vordruck.anzeige}
      {grundabfrage.maske}
    </>
  );
  return {
    auswahl,
    verfassen: () => setzeVorlage({ werte: leereMaske(sitzung), titel: "Nachricht verfassen" }),
    lesen,
    masken,
  };
}
