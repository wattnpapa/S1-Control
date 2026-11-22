/**
 * Konflikthinweise an Nachrichten in Worten (Audits Nachrichten Runde 2:
 * R2-ETB P2-4, R2-SGL P2-2).
 *
 * Die Diagnose führte „Sichtung: zwei Arbeitsplätze haben verschieden
 * vermerkt [Nachricht öffnen]“ — ohne Nummer, Betreff oder die beiden Werte;
 * bei doppelter Nummer erklärte der Hinweis etwas anderes, als der
 * Sachgebietsleiter sah. Wer die Akte prüft, musste jeden Eintrag öffnen.
 * Hier entsteht der Satz, den das Lagebild je Hinweis mitgibt
 * (`konflikthinweise[].text`):
 *
 *  - „Nummer 7 zweimal: E 7 ‚Pumpen‘ und A 7 ‚Sandsäcke‘“
 *  - „E 8 ‚Deichbruch droht‘: Sichtung von Si 1420 und Zw 1421, Verteiler
 *    S2, S4, Leiter gegen S2, S3“
 *
 * Nur für Hinweise an Nachrichten; alle anderen behalten die bisherige Anzeige.
 */

import { zSichtung } from "../katalog/schemata-nachrichten.js";
import { datumZeitGruppe } from "../zeit/datumZeitGruppe.js";
import type { Sichtungsvermerk as Sichtung } from "../zustand-nachricht.js";
import type { Konflikthinweis } from "../zustand.js";
import type { Nachrichtenzeile } from "./nachrichtenzeile.js";
import { stellenWort } from "./tagebuch-nachrichten.js";

/** „E 7 ‚Pumpen eingetroffen‘“ — Richtung, Nummer, Betreff (sonst Absender). */
export function nachrichtKurzname(zeile: Pick<Nachrichtenzeile, "richtungKurz" | "nummer" | "betreff" | "absender">): string {
  const nummer = zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
  const betreff = zeile.betreff.trim() === "" ? zeile.absender : zeile.betreff;
  return betreff.trim() === "" ? nummer : `${nummer} ‚${betreff.trim()}‘`;
}

function sichtungsteil(s: Sichtung): { wer: string; verteiler: string } {
  const uhr = datumZeitGruppe(s.zeitpunkt).slice(2, 6);
  return { wer: [s.handzeichen.trim(), uhr].filter((t) => t !== "").join(" "), verteiler: s.verteiler.map((e) => stellenWort(e.stelle)).join(", ") || "ohne Verteiler" };
}

function sichtungAus(wert: unknown): Sichtung | undefined {
  const ergebnis = zSichtung.safeParse(wert);
  return ergebnis.success ? ergebnis.data : undefined;
}

/** Die verdrängte Sichtung: die zweite der Zeile, sonst der Wert aus dem Hinweis. */
function verdraengteSichtung(hinweis: Konflikthinweis, zeile: Nachrichtenzeile): Sichtung | undefined {
  if (zeile.zweiteSichtung !== undefined) return zeile.zweiteSichtung;
  return "verdraengterWert" in hinweis ? sichtungAus(hinweis.verdraengterWert) : undefined;
}

function sichtungstext(hinweis: Konflikthinweis, zeile: Nachrichtenzeile): string | undefined {
  const gilt = zeile.sichtung;
  const zweite = verdraengteSichtung(hinweis, zeile);
  if (gilt === undefined || zweite === undefined) return undefined;
  const a = sichtungsteil(zweite);
  const b = sichtungsteil(gilt);
  return `${nachrichtKurzname(zeile)}: Sichtung von ${a.wer} und ${b.wer}, Verteiler ${a.verteiler} gegen ${b.verteiler}`;
}

/** Die Kennung der Nachricht im Feldpfad `nachricht/<id>/…`. */
function nachrichtIdAus(feldpfad: string): string | undefined {
  const teile = feldpfad.split("/");
  return teile[0] === "nachricht" && teile[1] !== undefined && teile[1] !== "" ? teile[1] : undefined;
}

/**
 * Der Satz zu einem Hinweis an einer Nachricht; `undefined` für Hinweise an
 * anderen Entitäten oder an Nachrichten, die es nicht (mehr) gibt.
 */
export function konflikthinweisText(hinweis: Konflikthinweis, zeilen: ReadonlyMap<string, Nachrichtenzeile>): string | undefined {
  if (hinweis.art === "nachweisnummerDoppelt") {
    const namen = hinweis.ids.map((id) => zeilen.get(id)).filter((z): z is Nachrichtenzeile => z !== undefined).map(nachrichtKurzname);
    const liste = namen.length <= 1 ? namen.join("") : `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1] as string}`;
    return `Nummer ${String(hinweis.nummer)} ${namen.length === 2 ? "zweimal" : `${String(namen.length)}-mal`}: ${liste}`;
  }
  const id = nachrichtIdAus(hinweis.feldpfad);
  const zeile = id === undefined ? undefined : zeilen.get(id);
  if (zeile === undefined) return undefined;
  const konkurrenz = hinweis.art === "vorherPasstNicht" || hinweis.art === "ohneVorherWertVerdraengt";
  if (hinweis.feldpfad.endsWith("/sichtung") && konkurrenz) return sichtungstext(hinweis, zeile) ?? `${nachrichtKurzname(zeile)}: zwei Sichtungen`;
  if (hinweis.art === "unbekannterWert") return `${nachrichtKurzname(zeile)}: unbekannter Wert „${String(hinweis.wert)}“`;
  const teile = hinweis.feldpfad.split("/").slice(2);
  const feld = FELD_WORT[teile[0] ?? ""] ?? (teile.join("/") || "Nachricht");
  const stelle = teile[1] === undefined ? "" : ` (${stellenWort(teile[1])})`;
  return `${nachrichtKurzname(zeile)}: ${feld}${stelle} — ${ART_WORT[hinweis.art] ?? hinweis.art}`;
}

const FELD_WORT: Readonly<Record<string, string>> = {
  aufnahme: "Aufnahme",
  annahme: "Annahme",
  vorschlag: "Zuteilung",
  befoerderung: "Beförderung",
  nachweis: "Nummer",
  weitergabe: "Weitergabe",
  sichtung: "Sichtung",
  vermerke: "Vermerke",
  kenntnis: "Kenntnisnahme",
  erledigt: "Erledigung",
  entfernt: "Zurückziehen",
};

const ART_WORT: Readonly<Record<string, string>> = {
  vorherPasstNicht: "zwei Arbeitsplätze haben verschieden eingetragen",
  ohneVorherWertVerdraengt: "zwei Arbeitsplätze haben verschieden eingetragen",
  meldezeitUnplausibel: "Zeit unplausibel (weit vor dem Einsatz oder in der Zukunft)",
  undoTrifftFremdenStand: "Rückgängig traf einen Stand eines anderen Arbeitsplatzes",
};
