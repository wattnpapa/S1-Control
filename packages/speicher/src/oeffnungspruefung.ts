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
import { shareklasse, type Shareklasse } from "./fehler.js";
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
  | { readonly art: "inOrdnung" }
  /**
   * §4.6.1 mit §5.4.3 Ausgang B: Die eigenen Bytes auf dem Share sind
   * verfälscht, ohne dass eine fremde Schreibspur nachweisbar wäre. Reparatur
   * durch ein Ersatzsegment nach §4.6.
   */
  | {
      readonly art: "beschaedigt";
      readonly segment: number;
      readonly abOffset: number;
      /**
       * Kennungspräfix der beschädigten Datei. Seit Entscheidung 17 nicht mehr
       * zwingend das laufende: Auch die Datei einer **aufgegebenen** Kennung
       * wird geprüft und repariert (§4.5 Schritt 6, §4.6.1 Auslöser 1).
       */
      readonly praefix: string;
    }
  /**
   * Der Share war nicht erreichbar (§8.3, §8.9).
   *
   * §1.3 Satz 2: „Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad." Das
   * Öffnen scheitert daran **nicht** — der Client arbeitet lokal weiter (§5.2),
   * die Prüfung wird beim nächsten Öffnen nachgeholt, und §4.6.1 Auslöser 2
   * kann sie vorziehen.
   */
  | { readonly art: "nichtErreichbar"; readonly klasse: Shareklasse; readonly code: string }
  /** §4.5 Fall 2 mit §5.4.3 Ausgang C: geklontes Benutzerprofil. */
  | {
      readonly art: "fremdschreiber";
      readonly segment: number;
      readonly abOffset: number;
      readonly id: string;
      readonly grund: "identitaetUnbekannt" | "inhaltAbweichend" | "laufnummerHoeher";
    };

export interface OeffnungspruefungOptionen {
  readonly dateisystem: Dateisystem;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  /**
   * Aufgegebene Kennungen (§4.5, Schritt 1).
   *
   * Ihre Dateien werden **mitgeprüft** (Entscheidung 17, Richtung B): §4.5
   * Schritt 6 macht die alte Datei fürs Lesen fremd, für die **Prüfung** bleibt
   * sie eigen. Ohne das entdeckt niemand eine Beschädigung dort, obwohl es
   * einen Rechner gibt, der den Inhalt vollständig hat.
   */
  readonly frühereClientIds?: readonly string[];
  /**
   * Segmente, die nach §4.6 bereits durch ein Ersatzsegment ersetzt wurden.
   *
   * Sie werden von **Ausgang B** ausgenommen, nicht von der Prüfung. §4.6
   * Schritt 5: „Das beschädigte Segment bekommt keine Abschlusszeile mehr. **Es
   * wird nicht mehr beschrieben.**" Die Beschädigung bleibt also dauerhaft
   * liegen — ohne diese Ausnahme lieferte der Vergleich bei jedem Öffnen erneut
   * Ausgang B, und jedes Öffnen erzeugte ein weiteres Ersatzsegment.
   *
   * **Ausgang C bleibt wirksam.** „Es wird nicht mehr beschrieben" gilt für
   * diesen Client; ein Klon schreibt dort sehr wohl weiter, und §4.5 Schritt 1
   * verlangt ausdrücklich „alle eigenen Segmente".
   *
   * Der Wert je Datei ist der Offset, **ab dem** der Ersatz übernommen hat.
   * Er entscheidet, ob eine gemeldete Beschädigung die bereits bekannte ist
   * oder eine neue weiter vorn; siehe die Fallunterscheidung unten.
   *
   * Der Schlüssel ist der **Dateiname**: Seit Entscheidung 17 kann das ersetzte
   * Segment unter einer aufgegebenen Kennung liegen, und eine Zuordnung über
   * die bloße Nummer nähme das gleichnamige Segment der laufenden Kennung aus
   * der Prüfung.
   */
  readonly bereitsErsetzt?: ReadonlyMap<string, number>;
  /**
   * Die eigene zuletzt vergebene Laufnummer aus `schreiber.json` (§3.3).
   *
   * Ohne sie bleibt §4.5 Schritt 3 unausgewertet: „Ist sie **größer als** die
   * eigene zuletzt vergebene, hat ein anderer Prozess unter derselben Kennung
   * geschrieben." Schritt 4 — der Inhaltsvergleich — allein deckt den Fall
   * nicht ab, in dem der Klon Nummern vergeben hat, die dieser Client noch gar
   * nicht kennt und deren Zeilen er deshalb nicht vergleichen kann.
   */
  readonly eigeneLaufnummer?: number;
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
  const laufendesPraefix = clientPraefix(optionen.clientId);
  /**
   * Die laufende Kennung zuerst, danach die aufgegebenen (Entscheidung 17).
   *
   * Die Reihenfolge ist nicht gleichgültig: `pruefeBeimOeffnen` kehrt beim
   * ersten Befund zurück, und der Bediener soll zuerst von seiner **laufenden**
   * Datei hören. Die aufgegebenen kommen im nächsten Durchgang dran — `Akte`
   * prüft und repariert in einer Schleife, bis nichts mehr offen ist.
   */
  const praefixe = [
    laufendesPraefix,
    ...(optionen.frühereClientIds ?? []).map(clientPraefix).filter((p) => p !== laufendesPraefix),
  ];
  let eigene: readonly Dateikennung[];
  try {
    // Das Verzeichnis wird **einmal** gelesen und danach je Präfix sortiert —
    // eine Auflistung je Kennung wäre derselbe Aufruf mehrfach.
    eigene = eigeneSegmente(await optionen.dateisystem.listeVerzeichnis(optionen.ablage.shareEreignisse), praefixe);
  } catch (fehler) {
    return nichtErreichbar(fehler);
  }
  /** Die höchste Laufnummer, die auf dem Share unter der **laufenden** Kennung steht (§4.5 Schritt 3). */
  let unterLaufenderKennung = 0;

  for (const kennung of eigene) {
    let share: Uint8Array;
    let lokal: Uint8Array;
    try {
      share = await liesOderLeer(optionen.dateisystem, optionen.ablage.shareDatei(kennung.name));
      lokal = await liesOderLeer(optionen.dateisystem, optionen.ablage.lokalDatei(kennung.name));
    } catch (fehler) {
      return nichtErreichbar(fehler);
    }
    // Nur unter der **laufenden** Kennung kann eine fremde Laufnummer noch zu
    // einer doppelten Identität führen — dort schreibt dieser Client weiter.
    if (kennung.praefix === laufendesPraefix) {
      unterLaufenderKennung = Math.max(unterLaufenderKennung, hoechsteLaufnummer(share));
    }
    const ersetztAb = optionen.bereitsErsetzt?.get(kennung.name);
    const aufgegeben = kennung.praefix !== laufendesPraefix;

    const ausgang = vergleicheSpiegel({
      // **Bei einer aufgegebenen Kennung wird nur der gespiegelte Teil
      // verglichen.**
      //
      // §4.5 Schritt 6: Ihre Datei ist ab dem Wechsel „der Spiegel einer
      // fremden Datei — nämlich der des Klons". Dass auf dem Share mehr steht
      // als lokal, ist dort der **vorgesehene** Zustand: Der Klon schreibt
      // weiter, und der eigene Spiegel zieht im nächsten Takt nach. Die
      // Präfix-Invariante aus §5.4.1 gilt für diese Datei nicht mehr; ohne die
      // Kürzung meldete jeder Vorsprung des Klons eine Beschädigung, und der
      // Client schriebe ein Ersatzsegment für Zeilen, die er gar nicht hat.
      //
      // Was übrig bleibt, ist genau die Frage, um die es hier geht: Weichen die
      // Share-Bytes **innerhalb** des gespiegelten Teils von den lokalen ab?
      // Dann sind sie verfälscht, und dieser Client hat den richtigen Inhalt.
      // Eine Beschädigung jenseits des Spiegels bleibt außen vor — dort hat er
      // nichts, was er wiederholen könnte.
      shareBytes: aufgegeben ? share.subarray(0, Math.min(share.byteLength, lokal.byteLength)) : share,
      shareOffset: 0,
      lokaleBytes: lokal,
      lokaleInhalte: optionen.identitaeten,
    });
    // **Unter einer aufgegebenen Kennung gibt es keinen Ausgang C mehr.**
    //
    // Er unterscheidet „fremde Schreibspur" von „verfälschte Bytes" — eine
    // Frage, die dort schon beantwortet ist: Ein fremder Schreiber ist der
    // erwartete Zustand, und der Kennungswechsel hat bereits stattgefunden.
    // Nach der Kürzung oben bleibt als Ursache einer Abweichung nur die
    // Verfälschung, also Ausgang B. Ihn als C zu melden löste bei jedem Öffnen
    // einen weiteren Kennungswechsel aus (siehe unten).
    if (aufgegeben && ausgang.art === "C") {
      if (ersetztAb === undefined || ausgang.abOffset < ersetztAb) {
        return {
          art: "beschaedigt",
          segment: kennung.segment,
          abOffset: ausgang.abOffset,
          praefix: kennung.praefix,
        };
      }
      continue;
    }
    if (ausgang.art === "B") {
      // **Ein ersetztes Segment wird nicht wieder repariert — es sei denn, der
      // Schaden sitzt vor der Stelle, ab der der Ersatz übernommen hat.**
      //
      // §4.6 Schritt 5 sagt, das beschädigte Segment werde „nicht mehr
      // beschrieben"; seine Bytes bleiben liegen, und das ist der vorgesehene
      // Endzustand. Für den bekannten Schaden ab `ersetztAb` gilt das
      // unverändert: Alles ab dort steht im Ersatzsegment lesbar noch einmal,
      // eine zweite Reparatur wäre keine Heilung, sondern eine Dauerstörung
      // bei jedem Öffnen.
      //
      // Eine **spätere** Beschädigung *unterhalb* dieser Stelle ist etwas
      // anderes. Die Zeilen zwischen ihr und `ersetztAb` hat kein
      // Ersatzsegment je mitgenommen — sie standen ja lesbar da. Hinter der
      // neuen Quarantäne sind sie für jeden Leser fort (§8.2 Punkt 7, §2.3),
      // und ohne diese Unterscheidung bliebe der Verlust endgültig. In der
      // Simulation M0.4 entstand genau so der Verlust bei Startwert 111: das
      // Segment `0000` bei Offset 13.830 ersetzt, danach bei 11.424 erneut
      // beschädigt, die Zeilen `:397` bis `:400` fort (Messprotokoll 7.5,
      // Entscheidung 16, Richtung (a)).
      //
      // Die Wiederholung endet: Jede weitere Reparatur setzt an einem
      // **kleineren** Offset an, und `ersetzteSegmente` führt den kleinsten.
      // Unterhalb von 0 gibt es nichts mehr.
      if (ersetztAb !== undefined && ausgang.abOffset >= ersetztAb) continue;
      return {
        art: "beschaedigt",
        segment: kennung.segment,
        abOffset: ausgang.abOffset,
        praefix: kennung.praefix,
      };
    }
    // Ausgang C wird **auch** in einem ersetzten Segment ausgewertet: §4.6
    // Schritt 5 sagt, *dieser* Client schreibe dort nicht mehr — ein Klon tut
    // es sehr wohl. §4.5 Schritt 1 verlangt ausdrücklich „alle eigenen
    // Segmente", und der reine Zahlenvergleich aus Schritt 3 allein reicht
    // nach §4.5 Schritt 4 nicht.
    //
    // **Nicht unter einer aufgegebenen Kennung** — dort ist er oben schon
    // erledigt.
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

  // **Warum die aufgegebenen Kennungen wieder mitgelesen werden.**
  //
  // Bis zum 2026-09-09 standen sie hier ausdrücklich draußen: Sie trugen allein
  // zu einer höchsten Laufnummer über alle Kennungen bei, die kein Aufrufer je
  // las — für §4.5 Schritt 3 zählt nur die laufende Kennung —, und das Weglassen
  // sparte je Öffnen einen vollständigen Lesedurchgang über jede aufgegebene
  // Datei.
  //
  // Der Grund ist mit Entscheidung 17 gefallen. Wird die Datei einer
  // aufgegebenen Kennung auf dem Share beschädigt (§8.2), fällt jeder Leser
  // dort in Quarantäne, und niemand repariert: Der ursprüngliche Schreiber hat
  // den Inhalt lokal vollständig, darf dort nach §4.5 Schritt 6 aber nichts
  // mehr schreiben, und die Vollprüfung sah die Datei nicht mehr an. Die Zeilen
  // hinter der Beschädigung waren damit für jeden Leser fort, obwohl es einen
  // Rechner gibt, der sie hat (Startwert 12345, Messprotokoll 7.7). §4.5
  // Schritt 6 macht die alte Datei fürs **Lesen** fremd; für die **Prüfung**
  // bleibt sie eigen. Repariert wird durch ein Ersatzsegment unter der neuen
  // Kennung — „ein Schreiber je Datei" bleibt unangetastet.
  //
  // Der Preis ist der Lesedurchgang je aufgegebener Datei; er wird in M0.5
  // unter A10 mitgemessen.

  // §4.5 Schritt 3: „Ist sie größer als die eigene zuletzt vergebene, hat ein
  // anderer Prozess unter derselben Kennung geschrieben." Der Vergleich steht
  // **nach** den Schritten 1 und 2 und **vor** der Rückgabe — sonst bliebe er
  // eine Zahl ohne Auswerter.
  //
  // **Nur unter der laufenden Kennung.** Eine aufgegebene Kennung (§4.5
  // Schritt 1) zählt für die Laufnummer mit — damit keine Nummer zweimal
  // vergeben wird —, darf den Vergleich aber nicht mehr auslösen: Dieser Client
  // schreibt dort nicht mehr, eine fremde Nummer kann dort also keine doppelte
  // Identität mehr erzeugen. Ohne diese Trennung löste dieselbe Klon-Zeile bei
  // **jedem** Öffnen erneut einen Kennungswechsel aus; `frühereClientIds` und
  // mit ihnen die Kosten der Prüfung wüchsen unbegrenzt, und der Bediener bekäme
  // bei jedem Start erneut zu lesen, sein Profil sei kopiert worden — eine
  // Aussage, die nach dem ersten Wechsel nicht mehr zutrifft. Befund aus der
  // Simulation M0.4.
  const zuletztVergeben = optionen.eigeneLaufnummer;
  if (zuletztVergeben !== undefined && unterLaufenderKennung > zuletztVergeben) {
    return {
      art: "fremdschreiber",
      segment: eigene.filter((k) => k.praefix === laufendesPraefix).at(-1)?.segment ?? 0,
      abOffset: 0,
      id: `${optionen.clientId}:${unterLaufenderKennung}`,
      grund: "laufnummerHoeher",
    };
  }

  return { art: "inOrdnung" };
}

/**
 * Die Dateien dieser Kennungen, in der Reihenfolge der Präfixe und je Präfix
 * nach Segmentnummer aufsteigend.
 *
 * Die Reihenfolge trägt: `pruefeBeimOeffnen` kehrt beim ersten Befund zurück,
 * und die laufende Kennung steht in `praefixe` vorn.
 */
function eigeneSegmente(
  namen: readonly string[],
  praefixe: readonly string[],
): readonly Dateikennung[] {
  const kennungen = namen.flatMap((name) => {
    const kennung = zerlegeEreignisDateiname(name);
    return kennung !== undefined && praefixe.includes(kennung.praefix) ? [kennung] : [];
  });
  return kennungen.sort(
    (a, b) =>
      praefixe.indexOf(a.praefix) - praefixe.indexOf(b.praefix) || a.segment - b.segment,
  );
}

/**
 * §1.3 Satz 2: „Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad." Ein
 * unerreichbarer Share darf das Öffnen nicht verhindern.
 */
function nichtErreichbar(fehler: unknown): Oeffnungsbefund {
  return {
    art: "nichtErreichbar",
    klasse: shareklasse(fehler),
    code: fehler instanceof DateisystemFehler ? fehler.code : "EUNKNOWN",
  };
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
