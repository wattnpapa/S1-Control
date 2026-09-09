/**
 * Die Prüfung beim Öffnen eines Einsatzes — KONZEPT-SPEICHER.md §4.5
 * (Fremdschreiber-Erkennung, Fall 2) und §4.6.1 (Auslöser 1, Vollprüfung).
 *
 * Beide lesen dieselben Daten und werden deshalb in **einem** Durchgang
 * erledigt: §4.6.1 verlangt, dass der Schreiber „seine eigenen Share-Segmente
 * vollständig liest und gegen seine lokalen vergleicht", und §4.5 verlangt
 * genau denselben Vergleich, nur mit einer anderen Frage. Ohne Auslöser 1 wäre
 * §4.6 „ein Weg, der für seinen einzigen Anwendungsfall nicht erreicht wird":
 * Der Vergleich in §5.4.3 setzt an `shareOffset` an und sähe eine Beschädigung
 * in der **Mitte** der Datei nie.
 *
 * Das Dateiende wird auch hier ausschließlich durch Lesen bestimmt (§4.5,
 * letzter Absatz: „Beide stellen das Dateiende ausschließlich durch Lesen
 * fest"), und der Schreiber öffnet die Datei dafür **neu** (§6.6).
 */

import { zerlegeEreignisId } from "@s1/domaene";

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import {
  clientPraefix,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
import { vergleicheSpiegel } from "./spiegelvergleich.js";
import { leseZeilengrenzen, type Identitaetenblick } from "./zeile.js";

/** Das Ergebnis der Prüfung beim Öffnen. */
export type Oeffnungsbefund =
  /** Nichts zu tun. Die Share-Dateien sind ein Präfix der lokalen. */
  | { readonly art: "inOrdnung"; readonly hoechsteLaufnummerAufShare: number }
  /**
   * §4.6.1 mit §5.4.3 Ausgang B: Die eigenen Bytes auf dem Share sind
   * verfälscht, ohne dass eine fremde Schreibspur nachweisbar wäre. Reparatur
   * durch ein Ersatzsegment nach §4.6.
   */
  | { readonly art: "beschaedigt"; readonly segment: number; readonly abOffset: number }
  /** §4.5 Fall 2 mit §5.4.3 Ausgang C: geklontes Benutzerprofil. */
  | {
      readonly art: "fremdschreiber";
      readonly segment: number;
      readonly abOffset: number;
      readonly id: string;
      readonly grund: "identitaetUnbekannt" | "inhaltAbweichend";
    };

export interface OeffnungspruefungOptionen {
  readonly dateisystem: Dateisystem;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  /** Aufgegebene Kennungen (§4.5, Schritt 1) — sie zählen für die Laufnummer mit. */
  readonly frühereClientIds?: readonly string[];
  /** Die lokal vergebenen Identitäten (§5.3). */
  readonly identitaeten: Identitaetenblick;
}

/**
 * Liest **alle** eigenen Segmente auf dem Share vollständig und vergleicht sie
 * gegen die lokalen.
 *
 * §4.5 Schritt 1 verlangt ausdrücklich „alle eigenen Segmente", nicht nur das
 * letzte: „Ein Klon, der zwischenzeitlich ein Segment mit höherer Nummer
 * begonnen hat, wäre sonst unsichtbar, weil dieses Segment aus Sicht der
 * Originalkopie gar nicht das eigene letzte ist."
 *
 * Aufgegebene Kennungen (§4.5, Schritt 1) werden für die **Laufnummer**
 * mitgelesen, lösen aber keinen weiteren Kennungswechsel aus: Nach §4.5
 * Schritt 6 ist ihre Datei ab dem Wechsel „der Spiegel einer fremden Datei —
 * nämlich der des Klons"; dass der Klon dort weiterschreibt, ist der erwartete
 * Zustand und keine neue Erkenntnis.
 */
export async function pruefeBeimOeffnen(
  optionen: OeffnungspruefungOptionen,
): Promise<Oeffnungsbefund> {
  const eigene = await shareSegmenteMitPraefix(optionen, clientPraefix(optionen.clientId));
  let hoechste = 0;

  for (const kennung of eigene) {
    const share = await liesOderLeer(optionen.dateisystem, optionen.ablage.shareDatei(kennung.name));
    hoechste = Math.max(hoechste, hoechsteLaufnummer(share));
    const lokal = await liesOderLeer(
      optionen.dateisystem,
      optionen.ablage.lokalDatei(kennung.name),
    );

    const ausgang = vergleicheSpiegel({
      shareBytes: share,
      shareOffset: 0,
      lokaleBytes: lokal,
      lokaleInhalte: optionen.identitaeten,
    });
    if (ausgang.art === "B") {
      return { art: "beschaedigt", segment: kennung.segment, abOffset: ausgang.abOffset };
    }
    if (ausgang.art === "C") {
      return {
        art: "fremdschreiber",
        segment: kennung.segment,
        abOffset: ausgang.abOffset,
        id: ausgang.id,
        grund: ausgang.grund,
      };
    }
  }

  for (const frühere of optionen.frühereClientIds ?? []) {
    for (const kennung of await shareSegmenteMitPraefix(optionen, clientPraefix(frühere))) {
      const share = await liesOderLeer(
        optionen.dateisystem,
        optionen.ablage.shareDatei(kennung.name),
      );
      hoechste = Math.max(hoechste, hoechsteLaufnummer(share));
    }
  }

  return { art: "inOrdnung", hoechsteLaufnummerAufShare: hoechste };
}

/** Alle Dateien in `ereignisse\` mit diesem Kennungspräfix, aufsteigend. */
async function shareSegmenteMitPraefix(
  optionen: OeffnungspruefungOptionen,
  praefix: string,
): Promise<readonly Dateikennung[]> {
  const namen = await optionen.dateisystem.listeVerzeichnis(optionen.ablage.shareEreignisse);
  return namen
    .flatMap((name) => {
      const kennung = zerlegeEreignisDateiname(name);
      return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
    })
    .sort((a, b) => a.segment - b.segment);
}

async function liesOderLeer(dateisystem: Dateisystem, pfad: string): Promise<Uint8Array> {
  try {
    return await dateisystem.liesAb(pfad, 0);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") return new Uint8Array(0);
    throw fehler;
  }
}

/**
 * Die höchste Laufnummer, die in diesen Bytes vorkommt (§4.5, Schritt 2).
 *
 * Ohne Kettenprüfung: Gefragt ist, welche Nummern **vergeben** wurden, und das
 * gilt auch für Zeilen, deren Kette in dieser Datei nicht aufgeht. Eine zu
 * hohe Nummer ist unschädlich — sie erzeugt nach §3.3 höchstens eine Lücke;
 * eine zu niedrige wäre eine Doppelvergabe.
 */
function hoechsteLaufnummer(bytes: Uint8Array): number {
  let hoechste = 0;
  for (const zeile of leseZeilengrenzen(bytes, 0).zeilen) {
    try {
      const { laufnummer } = zerlegeEreignisId(zeile.rahmen.id);
      if (laufnummer > hoechste) hoechste = laufnummer;
    } catch {
      // Keine Identität nach §3.3 — zählt für die Laufnummer nicht mit.
    }
  }
  return hoechste;
}
