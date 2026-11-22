/**
 * Die Kacheln der Monitoransichten „Offene Punkte" (Führung), „IuK-Lage" (S6)
 * und „Nachrichtenweg" (FmZ) — reine Funktionen über dem Lagebild.
 *
 * Jede Kachel ist eine Zahl mit einem Wort darunter. Bernstein heißt
 * „hier ist etwas zu tun" und steht nie allein: Eine Warnkachel trägt das
 * Zeichen ⚠ vor ihrem Text, damit sie auch ohne Farbe auffällt. Eine Null
 * steht gedämpft da — sie sagt „nichts offen", nicht „keine Angabe".
 *
 * Gezählt wird hier nichts neu: Die Zahlen stehen fertig im Lagebild. Nicht
 * verwendet werden `nachrichten.neuFuerStellen` und `mitVorrangOffen`, weil
 * sie nach den Stellen der eigenen Sitzung rechnen — ein Monitor hat keine.
 */

import { projektion } from "@s1/domaene";

import { alter } from "./Statuszeile.js";
import { mahlzeitText, uhrzeitText } from "./versorgungstext.js";
import type { Lagebild } from "../kontrakt/index.js";

export type Kachelstufe = "normal" | "warn" | "leise";

export interface Kachel {
  readonly schluessel: string;
  readonly wert: string;
  readonly text: string;
  readonly unter?: string;
  readonly stufe: Kachelstufe;
}

/** Vorlauf, ab dem eine nicht bestellte Mahlzeit warnt (Annahme: Küche/Caterer brauchen 6 h). */
export const BESTELLVORLAUF_MS = 6 * 60 * 60 * 1000;

/** Eine Zählkachel: Bernstein ab 1, wenn `warnen`; gedämpft bei 0. */
export function zahlkachel(schluessel: string, zahl: number, text: string, warnen = true, unter?: string): Kachel {
  const stufe: Kachelstufe = zahl === 0 ? "leise" : warnen ? "warn" : "normal";
  return { schluessel, wert: String(zahl), text, stufe, ...(unter === undefined || zahl === 0 ? {} : { unter }) };
}

/** „A, B +3 weitere" — höchstens zwei Namen, damit die Kachel nicht umbricht. */
export function kurzliste(namen: readonly string[], hoechstens = 2): string {
  const rest = namen.length - hoechstens;
  return namen.slice(0, hoechstens).join(", ") + (rest > 0 ? ` +${String(rest)} weitere` : "");
}

function verpflegungskachel(l: Lagebild, jetzt: number): Kachel | undefined {
  const m = l.versorgung?.mahlzeiten[0];
  if (m === undefined) return undefined;
  const name = `${mahlzeitText(m.mahlzeit)} ${uhrzeitText(m.zeitpunkt)}`;
  if (m.bestellt === undefined) {
    const knapp = Date.parse(m.zeitpunkt) - jetzt < BESTELLVORLAUF_MS;
    return { schluessel: "verpflegung", wert: "offen", text: `${name} nicht bestellt`, stufe: knapp ? "warn" : "normal" };
  }
  const fehlen = m.differenz !== undefined && m.differenz < 0 ? -m.differenz : 0;
  if (fehlen > 0) return { schluessel: "verpflegung", wert: `−${String(fehlen)}`, text: `Portionen fehlen ${name}`, stufe: "warn" };
  return { schluessel: "verpflegung", wert: "✓", text: `${name} bestellt`, stufe: "leise" };
}

/** Führung — was jetzt entschieden oder nachgezogen werden muss. */
export function offenePunkte(l: Lagebild, jetzt: number): readonly Kachel[] {
  const abloesungen = l.abloesungenOffen ?? [];
  const n = l.nachrichten;
  const kacheln: (Kachel | undefined)[] = [
    zahlkachel("anforderungen", l.offeneAnforderungen ?? 0, "Anforderungen offen", false),
    zahlkachel("abloesungen", abloesungen.length, "Ablösungen offen", true, kurzliste(abloesungen.map((a) => a.abgeloesteBezeichnung))),
    zahlkachel("vorrang", l.offeneNachrichten?.ungelesenMitVorrang ?? 0, "Blitz/Sofort ungelesen"),
    n === undefined ? undefined : zahlkachel("schwelle", n.ueberSchwelle + (n.vorSichterUeberSchwelle ?? 0), "Nachrichten über Schwelle"),
    l.funk === undefined
      ? undefined
      : zahlkachel("funk", l.funk.ohneKontakt, "Funk ohne Kontakt", true, l.funk.ohneRufgruppe > 0 ? `ohne Rufgruppe: ${String(l.funk.ohneRufgruppe)}` : undefined),
    l.versorgung?.ohneZuweisung === undefined ? undefined : zahlkachel("betten", l.versorgung.ohneZuweisung, "Kräfte ohne Bett"),
    verpflegungskachel(l, jetzt),
    zahlkachel("konflikte", l.hinweise, "Konflikthinweise"),
  ];
  return kacheln.filter((k): k is Kachel => k !== undefined);
}

/** „12,3 kB" — unübertragene Bytes, auf eine Nachkommastelle. */
export function bytesText(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace(".", ",")} kB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** S6 — trägt die IT? Share, Arbeitsplätze, Fassungen, Rückstau. */
export function iukLage(l: Lagebild, jetzt: number): readonly Kachel[] {
  const veraltet = l.peers.filter((p) => p.veraltet);
  const fassungen = [...new Set(l.peers.map((p) => p.programmversion).filter((v) => v !== ""))].sort();
  const share: Kachel = l.shareErreichbar
    ? { schluessel: "share", wert: "ja", text: "Share erreichbar", stufe: "normal" }
    : { schluessel: "share", wert: "nein", text: "Share erreichbar", unter: `letzter Kontakt ${alter(l.letzterShareKontakt, jetzt)}`, stufe: "warn" };
  return [
    share,
    {
      schluessel: "plaetze",
      wert: `${String(l.peers.length - veraltet.length)}/${String(l.peers.length)}`,
      text: "Arbeitsplätze erreichbar",
      stufe: veraltet.length > 0 ? "warn" : "normal",
      ...(veraltet.length > 0 ? { unter: `still: ${kurzliste(veraltet.map((p) => p.anzeigename))}` } : {}),
    },
    {
      schluessel: "fassungen",
      wert: String(Math.max(fassungen.length, 1)),
      text: fassungen.length > 1 ? "Programmfassungen gemischt" : "Programmfassung",
      stufe: fassungen.length > 1 ? "warn" : "leise",
      ...(fassungen.length > 0 ? { unter: kurzliste(fassungen, 3) } : {}),
    },
    {
      schluessel: "rueckstau",
      wert: bytesText(l.unuebertrageneBytes),
      text: "noch nicht übertragen",
      stufe: l.unuebertrageneBytes > 0 ? "warn" : "leise",
    },
    zahlkachel("quarantaene", l.quarantaene.length, "Dateien in Quarantäne"),
    zahlkachel("konflikte", l.hinweise, "Konflikthinweise"),
  ];
}

/** Fernmelderstellen: `FM1` bis `FM3` und der Altwert `FMZ` (fernmelderstellen.ts). */
function istFernmelder(stelle: string): boolean {
  return stelle === "FMZ" || /^FM[1-3]$/.test(stelle);
}

/** „LdF besetzt · Fm1, Fm2 besetzt · Sichter nicht besetzt" — ohne Präsenz `undefined`. */
export function besetzungText(besetzt: readonly string[] | undefined): string | undefined {
  if (besetzt === undefined) return undefined;
  const fernmelder = besetzt.filter(istFernmelder).map(projektion.stellenWort);
  const teil = (name: string, ja: boolean): string => `${name} ${ja ? "besetzt" : "nicht besetzt"}`;
  return [
    teil("LdF", besetzt.includes("LDF")),
    fernmelder.length > 0 ? teil(fernmelder.join(", "), true) : teil("Fernmelder", false),
    teil("Sichter", besetzt.includes("SICHTER")),
  ].join(" · ");
}

function schwellenzusatz(zahl: number | undefined): string | undefined {
  return zahl === undefined || zahl === 0 ? undefined : `über Schwelle: ${String(zahl)}`;
}

function stationskachel(schluessel: string, zahl: number, text: string, ueber: number | undefined): Kachel {
  const unter = schwellenzusatz(ueber);
  const stufe: Kachelstufe = (ueber ?? 0) > 0 ? "warn" : zahl === 0 ? "leise" : "normal";
  return { schluessel, wert: String(zahl), text, stufe, ...(unter === undefined ? {} : { unter }) };
}

/** FmZ — wo staut sich der Nachrichtenweg? `undefined`, solange es keine Nachrichtenlage gibt. */
export function nachrichtenweg(l: Lagebild): readonly Kachel[] | undefined {
  const n = l.nachrichten;
  if (n === undefined) return undefined;
  const o = l.offeneNachrichten;
  const mitLdf = n.vorLdf !== undefined;
  const luecken = n.nummernluecken ?? [];
  const kacheln: (Kachel | undefined)[] = [
    mitLdf ? stationskachel("ldf", n.vorLdf ?? 0, "beim LdF", n.ueberSchwelleLdf) : undefined,
    stationskachel("fmz", n.vorFmz, "vor der FmZ", mitLdf ? n.ueberSchwelleFmz : n.ueberSchwelle),
    stationskachel("sichter", n.vorSichter, "vor dem Sichter", n.vorSichterUeberSchwelle),
    zahlkachel("vorrang", o?.ungelesenMitVorrang ?? 0, "Blitz/Sofort ungelesen"),
    o === undefined ? undefined : zahlkachel("ohneNummer", o.ohneNummer, "ohne Nummer", false),
    zahlkachel("luecken", luecken.length, "Nummernlücken", true, kurzliste(luecken.map(String), 5)),
  ];
  return kacheln.filter((k): k is Kachel => k !== undefined);
}
