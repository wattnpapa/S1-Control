/**
 * Vorlagenkatalog — die Kopiervorlagen der Excel als Daten (M1.4).
 *
 * Zieldatenmodell §3.2 fuehrt `EinheitVorlage` als **globalen, nicht
 * einsatzgebundenen** Katalog; KONZEPT-EREIGNISSE.md §1.2 nimmt ihn deshalb
 * ausdruecklich aus dem Ereigniskatalog heraus. Es gibt keine Ereignisart, die
 * eine Vorlage anlegt oder aendert: Sie wird mit dem Programm ausgeliefert und
 * versioniert. Was eine Einheit aus einer Vorlage uebernommen hat, steht als
 * `vorlageId` an der Einheit — der Verweis gehoert in die Akte, der Katalog
 * nicht.
 *
 * Quelle sind die beiden Kopiervorlagen-Bereiche des Blatts Staerke
 * (EXH §2.6): „Kopiervorlagen THW StAN" (B23) und „Kopiervorlagen KatS-StAN
 * Nds und Feuerwehr" (B73).
 */

import type { Organisation, Staerke, TaktischeEbene } from "../ereignis.js";

/** Die drei Kataloge der Excel (Zieldatenmodell §2.10). */
export const VORLAGENKATALOGE = ["THW_STAN", "FEUERWEHR", "KATS_STAN_NDS"] as const;
export type Vorlagenkatalog = (typeof VORLAGENKATALOGE)[number];

/** Zieldatenmodell §3.2, `EinheitVorlage`. */
export interface EinheitVorlage {
  readonly id: string;
  readonly katalog: Vorlagenkatalog;
  /** Fassung des Katalogs; Vorlagen sind pflegbar und versioniert (EXH F-J2). */
  readonly katalogVersion: string;
  /** Bei mehreren moeglichen Traegern die Vorbelegung — der erste aus `traeger`. */
  readonly organisation: Organisation;
  /**
   * Alle Organisationen, die diese Einheit ueblicherweise stellen; fehlt, wo es
   * genau eine ist. Die Suche findet die Vorlage unter jeder davon, und die
   * Anlegemaske bietet sie zur Wahl an.
   */
  readonly traeger?: readonly Organisation[];
  readonly bezeichnung: string;
  readonly lang?: string;
  readonly ebene: TaktischeEbene;
  /** Fehlt, wo die Quelle keine hergibt — sie wird nicht geraten. */
  readonly sollStaerke?: Staerke;
  /**
   * `true`, wenn die Sollstaerke keine Quellenzahl ist, sondern eine plausible
   * Grundgliederung (KatS Nds). Die Maske nennt sie dann „Annahme“.
   */
  readonly sollStaerkeAnnahme?: boolean;
  readonly fahrzeuge: readonly { readonly typ: string; readonly anzahl: number }[];
  /** Zug → seine Trupps und Gruppen (in der Excel die Zugbloecke). */
  readonly teilVon?: string;
}
