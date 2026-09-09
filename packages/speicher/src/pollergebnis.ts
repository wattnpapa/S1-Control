/**
 * Das Ergebnis eines Poll-Durchlaufs — KONZEPT-SPEICHER.md §5.5, §8.1, §8.2,
 * §8.3 und §7.6.
 *
 * Getrennt vom Leser, weil hier nur beschrieben wird, was ein Durchlauf
 * hergibt. Die Felder sind nicht beliebig: `fortschrittBytes` trägt Bedingung 2
 * und 3 der Ruhephase (§7.6), und `lesefehler` wie `spiegelfehler` sind der
 * Grund, warum ein Share-Ausfall oder eine volle Platte **nicht** wie Ruhe
 * aussieht.
 */

import type { Uhrmeldung } from "@s1/domaene";

import type { Shareklasse } from "./fehler.js";
import type { Defektgrund, GeleseneZeile } from "./zeile.js";

/** Warum eine Datei in Quarantäne steht. */
export type Quarantaenegrund = Defektgrund | "fristAbgelaufen";

/** Eine Quarantänestelle mit dem Text, den §8.2 Punkt 3 verlangt. */
export interface Quarantaenemeldung {
  readonly datei: string;
  readonly offset: number;
  readonly grund: Quarantaenegrund;
  /** §8.1: vorläufig heißt, die Datei wird in jedem Takt-B-Durchlauf erneut geprüft. */
  readonly vorlaeufig: boolean;
  /** §8.2 Punkt 6 verlangt für `s1 akte pruefe` Datei, Offset **und** Zeitpunkt. */
  readonly seit: number;
  readonly meldung: string;
}

/**
 * Ein gescheiterter Lesezugriff (§8.3).
 *
 * „Das Lesen fremder Dateien liefert Fehler, die als ‚nicht erreichbar' gezählt
 * werden. Die Statuszeile nennt Dauer und Anzahl der wartenden Einträge."
 * Deshalb wird der Fehler gemeldet und nicht verschluckt: Verschluckt sähe ein
 * Share-Ausfall aus wie Bedingung 2 der Ruhephase (§7.6) — überall 0 Bytes —,
 * und ein Konvergenzlauf hielte Stillstand für Ruhe.
 */
export interface Lesefehler {
  readonly datei: string;
  readonly klasse: Shareklasse;
  readonly code: string;
}

/**
 * Ein gescheiterter Schreibvorgang auf den **lokalen Spiegel** (§5.5, §8.8).
 *
 * Getrennt von {@link Lesefehler}, weil es etwas anderes ist: Der Share hat
 * geliefert, die eigene Platte hat nicht angenommen. §8, Grundsatz („Kein
 * Fehlerbild führt zum Stillstand des Lesers") verbietet, daran abzubrechen;
 * §5.5 („geprüft wird **vor** dem Anhängen") verbietet, `leseOffset`
 * trotzdem fortzuschreiben — die Bytes wären sonst dauerhaft aus dem Spiegel
 * verschwunden, obwohl der Leser sie als gelesen führte.
 *
 * Deshalb bleibt der Offset stehen, und der Fehler wird gemeldet. Verschluckt
 * sähe er aus wie Bedingung 2 der Ruhephase (§7.6), und ein Konvergenzlauf
 * hielte einen stehen gebliebenen Spiegel für Ruhe.
 */
export interface Spiegelschreibfehler {
  readonly datei: string;
  readonly code: string;
  readonly meldung: string;
}

/** Das Ergebnis eines Takt-Durchlaufs. */
export interface Pollergebnis {
  /**
   * Die neu gelesenen Zeilen **als Bündel** über alle Dateien.
   *
   * Bewusst gesammelt und nicht je Zeile herausgegeben: `falteHinzu` in
   * `@s1/domaene` kopiert die Faltung je Aufruf. Für ein Bündel ist das
   * unbedenklich, für einen Aufruf je Einzelereignis wäre es quadratisch — bei
   * 50.000 Ereignissen je Einsatz (§2.6) relevant.
   */
  readonly neueZeilen: readonly GeleseneZeile[];
  /** Dateien, die dieser Durchlauf zum ersten Mal gesehen hat (§6.2, Takt B). */
  readonly neueDateien: readonly string[];
  /** Neu entstandene Quarantänestellen (§8.1, §8.2). */
  readonly neueQuarantaenen: readonly Quarantaenemeldung[];
  /** Quarantänestellen, die ohne Zutun weggefallen sind (§8.1). */
  readonly geheilteQuarantaenen: readonly string[];
  /** Gescheiterte Zugriffe (§8.3). Nicht leer heißt: Dies war **keine** Ruhephase. */
  readonly lesefehler: readonly Lesefehler[];
  /** Gescheiterte Schreibvorgänge auf den lokalen Spiegel (§5.5, §8.8). Ebenfalls keine Ruhe. */
  readonly spiegelfehler: readonly Spiegelschreibfehler[];
  /** Meldungen der Uhr beim Empfang fremder HLC (§3.2). */
  readonly uhrmeldungen: readonly Uhrmeldung[];
  /** Zahl der gelesenen Bytes, einschließlich wiederholt gelesener. */
  readonly gelesenBytes: number;
  /**
   * Zahl der Bytes, um die das **gesehene Dateiende** vorgerückt ist — der
   * Fortschritt, nicht der Umsatz. Das ist die Größe, an der Bedingung 2 und 3
   * der Ruhephase hängen (§7.6).
   *
   * Warum nicht {@link gelesenBytes}: Eine Datei mit vorläufiger Quarantäne
   * wird nach §8.1 in **jedem** Takt-B-Durchlauf erneut geprüft, und dabei
   * kommen jedes Mal dieselben unvollständigen Bytes zurück. `gelesenBytes`
   * wäre damit dauerhaft größer als 0, und Bedingung 3 wäre nie erfüllbar,
   * solange irgendwo eine unvollständige Zeile steht, die niemand mehr
   * vervollständigt — der Fall aus §8.1, „der Schreiber ist mitten in einer
   * Zeile endgültig ausgefallen". Ruhe wäre dann für den Rest der Lage
   * unerreichbar und der Konvergenzvergleich nach §7.6 nicht mehr durchführbar.
   *
   * Dieselbe Unterscheidung führt `Dateilage.gesehenesEnde` schon für den
   * Verfall aus §6.2; sie wird hier nur sichtbar gemacht.
   */
  readonly fortschrittBytes: number;
}

/** Sammelt, was ein Durchlauf ergeben hat. */
export class Sammler {
  readonly neueZeilen: GeleseneZeile[] = [];
  readonly neueDateien: string[] = [];
  readonly neueQuarantaenen: Quarantaenemeldung[] = [];
  readonly geheilteQuarantaenen: string[] = [];
  readonly lesefehler: Lesefehler[] = [];
  readonly spiegelfehler: Spiegelschreibfehler[] = [];
  readonly uhrmeldungen: Uhrmeldung[] = [];
  gelesenBytes = 0;
  fortschrittBytes = 0;

  fertig(): Pollergebnis {
    return {
      neueZeilen: this.neueZeilen,
      neueDateien: this.neueDateien,
      neueQuarantaenen: this.neueQuarantaenen,
      geheilteQuarantaenen: this.geheilteQuarantaenen,
      lesefehler: this.lesefehler,
      spiegelfehler: this.spiegelfehler,
      uhrmeldungen: this.uhrmeldungen,
      gelesenBytes: this.gelesenBytes,
      fortschrittBytes: this.fortschrittBytes,
    };
  }

  uebernimm(anderer: Pollergebnis): void {
    this.neueZeilen.push(...anderer.neueZeilen);
    this.neueDateien.push(...anderer.neueDateien);
    this.neueQuarantaenen.push(...anderer.neueQuarantaenen);
    this.geheilteQuarantaenen.push(...anderer.geheilteQuarantaenen);
    this.lesefehler.push(...anderer.lesefehler);
    this.spiegelfehler.push(...anderer.spiegelfehler);
    this.uhrmeldungen.push(...anderer.uhrmeldungen);
    this.gelesenBytes += anderer.gelesenBytes;
    this.fortschrittBytes += anderer.fortschrittBytes;
  }
}
