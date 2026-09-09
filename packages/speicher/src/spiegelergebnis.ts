/**
 * Ergebnis und Klartext eines Spiegelungslaufs — KONZEPT-SPEICHER.md §5.4.3,
 * §5.4.4, §5.7 und §8.9.
 *
 * Die Texte stehen hier wörtlich so, wie das Konzept sie vorgibt. Sie sind
 * keine Ausschmückung: §5.4.3 unterscheidet Ausgang B und C gerade deshalb,
 * weil der eine „Ein Teil der bereits übertragenen Einträge … ist beschädigt"
 * sagt und der andere eine Aussage über den Rechner des Bedieners trifft.
 */

import type { Shareklasse } from "./fehler.js";

/** Klartextmeldungen für den Bediener; §5.4.3, §5.4.4, §5.7, §8.9. */
export const MELDUNG_BESCHAEDIGT =
  "Ein Teil der bereits übertragenen Einträge dieses Arbeitsplatzes ist auf dem Server beschädigt; er wird neu geschrieben.";
export const MELDUNG_PROFIL_KOPIERT =
  "Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten.";
export const MELDUNG_ORDNER_FORT =
  "Der Einsatzordner ist unter dem bekannten Pfad nicht mehr auffindbar. Die Einträge liegen lokal bereit und werden übertragen, sobald der Pfad wieder stimmt.";
export const MELDUNG_KEIN_SCHREIBRECHT =
  "Der Server ist erreichbar, nimmt von diesem Arbeitsplatz aber keine Einträge an (kein Schreibrecht). Die Einträge liegen lokal bereit.";
export const MELDUNG_NICHT_ERREICHBAR = "Share nicht erreichbar.";

/** Das Ergebnis eines Spiegelungslaufs. */
export type Spiegelergebnis =
  /** Ausgang A für alle Segmente; `uebertragen` ist die Zahl der übertragenen Bytes. */
  | { readonly art: "uebertragen"; readonly uebertragen: number }
  /** Ausgang B (§5.4.3): Beschädigung ohne fremde Schreibspur — Reparatur nach §4.6. */
  | {
      readonly art: "beschaedigt";
      readonly segment: number;
      readonly abOffset: number;
      readonly meldung: string;
    }
  /** Ausgang C (§5.4.3): fremde Schreibspur — Fall 2 nach §4.5. */
  | {
      readonly art: "fremdeSchreibspur";
      readonly segment: number;
      readonly abOffset: number;
      readonly id: string;
      readonly meldung: string;
    }
  /** §5.7: Der Ordner ist unter dem gemerkten Pfad nicht mehr auffindbar. */
  | { readonly art: "ordnerFort"; readonly meldung: string }
  /** §8.9: Der Zugriff scheiterte; der Rückstau bestimmt den nächsten Versuch. */
  | {
      readonly art: "gescheitert";
      readonly klasse: Shareklasse;
      readonly meldung: string;
      readonly naechsterVersuchMs: number;
    };
