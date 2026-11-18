/**
 * Marken am Weg einer Nachricht, die der Vergleich zweier Vermerke ergibt
 * (Audits Nachrichten: R2-LdF P2-2 in Runde 2, LdF P2-3 in Runde 1).
 *
 *  - **Abweichung vom Vorschlag**: Der LdF schlug Telefon vor, die FmZ
 *    beförderte über Funk. Erlaubt (Funkstörung), aber im Blatt standen nur
 *    „Funk“ und „Weg: Telefon“ nebeneinander, und niemand verglich sie.
 *  - **Verfasser = Nachweiser**: Entscheidung 13 macht den Vorbehalt der FmZ
 *    zu einem Hinweis statt zu einem Recht. Wer seinen eigenen Ausgang auch
 *    nachweist, darf das — die Nachweisung zeigt es aber, damit das
 *    Vier-Augen-Prinzip des Vordrucks prüfbar bleibt.
 */

import type { Mittelvermerk, Nachweisvermerk, Uebermittlungsvorschlag } from "../zustand-nachricht.js";
import { ueberWarteschwelle } from "./nachrichtenstand.js";
import type { Nachrichtenzeile, Vorrangstufe, Zeilenkontext } from "./nachrichtenzeile.js";
import { sichterschwelleFuer } from "./sichterschwelle.js";
import { mittelWort } from "./tagebuch-nachrichten.js";

/** „Funk → Telefon“: Mittel des Vorschlags → Mittel der Beförderung; `undefined`, wenn gleich oder eines fehlt. */
export function vorschlagsabweichung(
  vorschlag: Pick<Uebermittlungsvorschlag, "mittel"> | undefined,
  befoerderung: Pick<Mittelvermerk, "mittel"> | undefined,
): string | undefined {
  if (vorschlag === undefined || befoerderung === undefined) return undefined;
  const von = vorschlag.mittel.trim();
  const nach = befoerderung.mittel.trim();
  if (von === "" || nach === "" || von === nach) return undefined;
  return `${mittelWort(von)} → ${mittelWort(nach)}`;
}

function norm(wert: string | undefined): string {
  return (wert ?? "").trim().toLocaleLowerCase("de-DE");
}

/** Gleiches Handzeichen in der Anlage (Zeichen des Verfassers) und im Nachweis — Groß- und Kleinschreibung zählt nicht. */
export function verfasserIstNachweiser(zeichen: string | undefined, nachweis: Pick<Nachweisvermerk, "handzeichen"> | undefined): boolean {
  const z = norm(zeichen);
  return z !== "" && nachweis !== undefined && z === norm(nachweis.handzeichen);
}

/**
 * Die Marken am Weg (dritte Behebung der Runde 2): Schwelle vor dem Sichter
 * je Vorrang (R2-FM P2-5), Abweichung vom Vorschlag (R2-LdF P2-2),
 * „Verfasser = Nachweiser“ (LdF P2-3). Eigene Funktion wegen der Länge des Zeilenbaus.
 */
export function wegfelder(
  z: { readonly richtung: string; readonly vorrangstufe: Vorrangstufe; readonly zeichen: string | undefined; readonly vorschlag: Uebermittlungsvorschlag | undefined; readonly befoerderung: Mittelvermerk | undefined; readonly nachweis: Nachweisvermerk | undefined },
  kontext: Zeilenkontext,
  vorSichterMinuten: number | undefined,
): Pick<Nachrichtenzeile, "sichterSchwelleUeberschritten" | "abweichungVomVorschlag" | "verfasserGleichNachweiser"> {
  const schwelle = kontext.sichterschwellen === undefined ? kontext.schwelleMinuten : sichterschwelleFuer(kontext.sichterschwellen, z.vorrangstufe);
  const abweichung = vorschlagsabweichung(z.vorschlag, z.befoerderung);
  const gleich = z.richtung === "AUSGANG" && verfasserIstNachweiser(z.zeichen, z.nachweis);
  return {
    ...(kontext.jetzt === undefined ? {} : { sichterSchwelleUeberschritten: ueberWarteschwelle(vorSichterMinuten, schwelle) }),
    ...(abweichung === undefined ? {} : { abweichungVomVorschlag: abweichung }),
    ...(gleich ? { verfasserGleichNachweiser: true } : {}),
  };
}
