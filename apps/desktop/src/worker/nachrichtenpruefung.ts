/**
 * Prüfungen der Nachrichten-Ereignisse vor dem Schreiben (KONZEPT-NACHRICHTEN.md §9).
 *
 * Der Katalog prüft die Nutzlast; der Wert der Vermerke steht aber in `neu`,
 * und den prüft der Fold nicht (§2.2). Eine Sichtung ohne Verteiler-Liste
 * oder eine Kenntnisnahme ohne Zeitpunkt stünde sonst für immer im
 * append-only-Protokoll, und die Projektion ließe den Vermerk still weg.
 * Geprüft wird mit denselben Schemata der Domäne, mit denen die Maske vor dem
 * Aufgeben prüft (`nachrichtenentwurfFehler`). Ein Teil von `pruefeNeu` im
 * Aktendienst.
 *
 * Nicht geprüft wird, ob die Nachricht schon bekannt ist: Eine Sichtung kann
 * vor der Anlage eintreffen, wenn zwei Arbeitsplätze ohne Verbindung
 * arbeiten, und der Fold hält sie dann als wartende Beobachtung (§3.11).
 */

import type { Ereignisentwurf } from "@s1/speicher";

import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";

const ARTEN = new Set([
  "NachrichtVerfasst",
  "NachrichtAngenommen",
  "NachrichtBefoerdert",
  "NachrichtNachgewiesen",
  "NachrichtGesichtet",
  "NachrichtVermerkt",
  "NachrichtKenntnisGenommen",
  "NachrichtErledigt",
  "ErledigungDerNachrichtZurueckgenommen",
  "NachrichtZurueckgezogen",
]);

/** Der erste Fehler eines Nachrichtenentwurfs als Satz; `undefined` für jede andere Art. */
export function pruefeNachricht(entwurf: Ereignisentwurf): string | undefined {
  if (!ARTEN.has(entwurf.typ)) return undefined;
  if (entwurf.typ === "NachrichtVermerkt") {
    return entwurf.neu === null || typeof entwurf.neu === "string" ? undefined : "Ein Vermerk ist Text.";
  }
  return nachrichtenentwurfFehler({
    typ: entwurf.typ,
    ...(entwurf.nutzlast === undefined ? {} : { nutzlast: entwurf.nutzlast }),
    ...(entwurf.neu === undefined ? {} : { neu: entwurf.neu }),
  });
}
