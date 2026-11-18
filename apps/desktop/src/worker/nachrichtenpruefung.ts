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
  "NachrichtUebermittlungVorgeschlagen",
  "NachrichtBefoerdert",
  "NachrichtAufnahmeBerichtigt",
  "NachrichtNachgewiesen",
  "NachrichtWeitergegeben",
  "NachrichtGesichtet",
  "NachrichtVermerkt",
  "NachrichtKenntnisGenommen",
  "NachrichtErledigt",
  "ErledigungDerNachrichtZurueckgenommen",
  "NachrichtZurueckgezogen",
]);

/**
 * Die Parameter des Nachrichtenwegs (N2, Entscheidung 8, §5): ein Schalter
 * und eine Schwelle in ganzen Minuten ab 1. Der Fold prüft `neu` nicht; eine
 * Schwelle „abc" legte sonst die Zwanzig-Minuten-Marke still.
 */
function pruefeParameter(entwurf: Ereignisentwurf): string | undefined {
  const feld = (entwurf.nutzlast as { feld?: unknown } | null | undefined)?.feld;
  const neu = entwurf.neu;
  if (entwurf.undoOf !== undefined && neu === null) return undefined;
  if (feld === "sichtungAuchAusgang") return typeof neu === "boolean" ? undefined : "„Ausgänge nach der Beförderung zum Sichter“ ist ein Ja oder Nein.";
  if (feld === "ldfStation") return typeof neu === "boolean" ? undefined : "„LdF als eigene Station“ ist ein Ja oder Nein.";
  if (feld === "fmzSchwelleMinuten") {
    return typeof neu === "number" && Number.isInteger(neu) && neu >= 1 ? undefined : "Die Schwelle der FmZ muss eine ganze Zahl ab 1 (Minuten) sein.";
  }
  // R2-FM P2-5, R2-Si P2-2: die Schwelle vor dem Sichter je Vorrang, ebenfalls ganze Minuten ab 1.
  if (feld === "sichterSchwelleBlitzMinuten" || feld === "sichterSchwelleSofortMinuten") {
    const wort = feld === "sichterSchwelleBlitzMinuten" ? "Blitz" : "Sofort";
    return typeof neu === "number" && Number.isInteger(neu) && neu >= 1 ? undefined : `Die Schwelle vor dem Sichter bei ${wort} muss eine ganze Zahl ab 1 (Minuten) sein.`;
  }
  return undefined;
}

/** Der erste Fehler eines Nachrichtenentwurfs als Satz; `undefined` für jede andere Art. */
export function pruefeNachricht(entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ === "NachrichtenParameterGesetzt") {
    const nutzlast = nachrichtenentwurfFehler({ typ: entwurf.typ, nutzlast: entwurf.nutzlast ?? {} });
    return nutzlast ?? pruefeParameter(entwurf);
  }
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
