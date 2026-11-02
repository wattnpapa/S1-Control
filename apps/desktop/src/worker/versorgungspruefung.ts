/**
 * Prüfungen der Versorgungs-Ereignisse vor dem Schreiben (S4).
 *
 * Der Katalog prüft die Nutzlast; der Wert der Form-a-Arten steht aber in
 * `neu`, und den kennt er nicht. Eine Kapazität „zwölf" als Text stünde
 * sonst im Protokoll, und jede Summe darüber würde NaN — an jedem
 * Arbeitsplatz, ohne Hinweis.
 */

import { projektion } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

function feldDer(entwurf: Ereignisentwurf): string | undefined {
  const feld = (entwurf.nutzlast as { feld?: unknown } | null | undefined)?.feld;
  return typeof feld === "string" ? feld : undefined;
}

/** Liefert eine Fehlermeldung in Klartext, oder `undefined`, wenn alles passt. */
export function pruefeVersorgung(entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ === "UnterkunftGeaendert") {
    const feld = feldDer(entwurf);
    if (feld === "kapazitaet" && !(typeof entwurf.neu === "number" && Number.isInteger(entwurf.neu) && entwurf.neu >= 0)) {
      return "Die Kapazität muss eine ganze Zahl ab 0 sein.";
    }
    if (feld === "name" && !(typeof entwurf.neu === "string" && entwurf.neu.trim().length > 0)) {
      return "Eine Unterkunft braucht einen Namen.";
    }
  }
  if (entwurf.typ === "EinheitUntergebracht" && entwurf.neu !== null && typeof entwurf.neu !== "string") {
    return "Die Unterkunft ist keine gültige Kennung.";
  }
  if (entwurf.typ === "AbschnittAusgabestelleGesetzt" && entwurf.neu !== null && typeof entwurf.neu !== "string") {
    return "Die Ausgabestelle ist keine gültige Kennung.";
  }
  if (entwurf.typ === "MahlzeitenregelGesetzt" && entwurf.neu !== null) {
    return projektion.regelFehler(entwurf.neu);
  }
  if (entwurf.typ === "MahlzeitGeliefert" && !(typeof entwurf.neu === "number" && Number.isInteger(entwurf.neu) && entwurf.neu >= 0)) {
    return "Die gelieferte Menge muss eine ganze Zahl ab 0 sein.";
  }
  return undefined;
}
