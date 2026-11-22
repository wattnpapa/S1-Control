/**
 * Die Zeilen der Monitorlisten — reine Funktionen, die fertige Projektionen
 * in Zellen übersetzen: Warteschlange und „Funk still" (FmZ), Lageticker
 * (S2), Aufträge (S3) und Sofortbedarf (S4).
 *
 * Inhalte von Nachrichten stehen nie an der Wand: nur Vorrang, Richtung,
 * Nummer, Gegenstelle, Stand und Wartezeit (Review S5/Fernmelder: die Wand ist
 * auch für Besucher sichtbar).
 */

import { projektion, statusTitel, type Auftragszeile, type Funkplan, type Funkteilnehmer, type Nachrichtenzeile, type Sofortbedarfsliste, type Sofortbedarfszeile, type Staerketafel, type Tagebuchzeile } from "@s1/domaene";

import type { Listenzeile } from "./MonitorListentafel.js";
import { vorrangwort } from "./nachrichtenformate.js";
import { kurzzeit } from "./versorgungstext.js";

/** Minuten, die eine Nachricht an ihrer Station wartet — beim LdF, vor der FmZ oder vor dem Sichter. */
export function wartet(z: Nachrichtenzeile): number | undefined {
  return z.wartetSeitLdf ?? z.wartetSeit ?? z.wartetSeitSichter;
}

/** Blitz vor Sofort vor einfach, innerhalb dessen die längste Wartezeit zuerst. */
export function warteschlangenzeilen(zeilen: readonly Nachrichtenzeile[]): readonly Listenzeile[] {
  return zeilen
    .filter((z) => !z.zurueckgezogen && wartet(z) !== undefined)
    .sort((a, b) => a.vorrangstufe - b.vorrangstufe || (wartet(b) ?? 0) - (wartet(a) ?? 0))
    .map((z) => ({
      schluessel: z.id,
      warn: z.vorrangstufe === 0 || z.fmzUeberSchwelle || z.sichterSchwelleUeberschritten === true,
      zellen: [
        vorrangwort(z) || "einfach",
        z.gespraechsnotiz ? "Notiz" : z.richtungKurz,
        z.nummer === undefined ? "folgt" : String(z.nummer),
        z.richtungKurz === "A" ? z.anschrift : z.absender,
        projektion.laufstandWort(projektion.standDerZeile(z).laufstand),
        `${String(wartet(z) ?? 0)} min`,
      ],
    }));
}

const RAUSCHEN = /StammdatenGeaendert$/;

/** Die jüngsten Tagebuchzeilen ohne reine Stammdatenpflege. */
export function tickerzeilen(zeilen: readonly Tagebuchzeile[]): readonly Listenzeile[] {
  return zeilen
    .filter((z) => !RAUSCHEN.test(z.typ))
    .map((z) => ({ schluessel: z.ereignisId, zellen: [kurzzeit(z.zeitpunkt ?? z.wanduhr), z.satz], warn: z.undoOf !== undefined }));
}

/** Aufträge, gruppiert nach Abschnitt in der Ordnung der Stärketafel; unbekannte Abschnitte am Ende. */
export function auftragszeilen(tafel: Staerketafel): readonly Listenzeile[] | undefined {
  const auftraege = tafel.auftraege;
  if (auftraege === undefined) return undefined;
  const ordnung = new Map(tafel.abschnitte.map((a, i) => [a.schluessel, i]));
  const rang = (a: Auftragszeile): number => ordnung.get(a.abschnittId) ?? tafel.abschnitte.length;
  const sortiert = [...auftraege].sort((x, y) => rang(x) - rang(y) || x.abschnitt.localeCompare(y.abschnitt, "de"));
  const zeilen: Listenzeile[] = [];
  let zuletzt: string | undefined;
  for (const a of sortiert) {
    if (a.abschnittId !== zuletzt) {
      zeilen.push({ schluessel: `gruppe/${a.abschnittId}`, zellen: [a.abschnitt === "" ? "ohne Abschnitt" : a.abschnitt], gruppe: true });
      zuletzt = a.abschnittId;
    }
    zeilen.push({
      schluessel: a.schluessel,
      warn: a.status === "NICHT_EINSATZBEREIT",
      zellen: [a.von === undefined ? "—" : kurzzeit(a.von), a.einheit || "—", a.text, a.status === "" ? "" : statusTitel(a.status)],
    });
  }
  return zeilen;
}

function offenesFeld(z: Sofortbedarfszeile, feld: Sofortbedarfszeile["felder"][number]): string {
  switch (feld) {
    case "VERPFLEGUNG":
      return `Verpflegung ${String(z.verpflegungPersonen)} P`;
    case "DIESEL":
      return `Diesel ${String(z.dieselLiter)} l`;
    case "BENZIN":
      return `Benzin ${String(z.benzinLiter)} l`;
    case "GEMISCH":
      return `Gemisch ${String(z.gemischLiter)} l`;
    case "UNTERBRINGUNG":
      return "Unterbringung";
    case "RUHEZEIT":
      return "Ruhezeit";
  }
}

/** Offene Sofortbedarfe, längst eingetroffene zuerst. */
export function sofortbedarfszeilen(liste: Sofortbedarfsliste): readonly Listenzeile[] {
  return liste.zeilen
    .filter((z) => !z.vollstaendig && z.felder.length > 0)
    .sort((a, b) => (a.eingetroffenAm ?? "￿").localeCompare(b.eingetroffenAm ?? "￿"))
    .map((z) => ({
      schluessel: z.einheitId,
      zellen: [
        z.einheit,
        z.bereich,
        z.eingetroffenAm === undefined ? "—" : kurzzeit(z.eingetroffenAm),
        z.felder
          .filter((f) => z.erledigt[f] === undefined)
          .map((f) => offenesFeld(z, f))
          .join(" · "),
      ],
    }));
}

/** „offen gesamt: Diesel 340 l · Verpflegung 12 P · …" für den Fuß. */
export function sofortbedarfssumme(liste: Sofortbedarfsliste): string {
  const o = liste.offen;
  const teile = [
    o.dieselLiter > 0 ? `Diesel ${String(o.dieselLiter)} l` : "",
    o.benzinLiter > 0 ? `Benzin ${String(o.benzinLiter)} l` : "",
    o.gemischLiter > 0 ? `Gemisch ${String(o.gemischLiter)} l` : "",
    o.verpflegungPersonen > 0 ? `Verpflegung ${String(o.verpflegungPersonen)} P` : "",
    o.unterbringung > 0 ? `Unterbringung ${String(o.unterbringung)}` : "",
    o.ruhezeit > 0 ? `Ruhezeit ${String(o.ruhezeit)}` : "",
  ].filter((t) => t !== "");
  return teile.length === 0 ? "" : `offen gesamt: ${teile.join(" · ")}`;
}

interface Stille {
  readonly t: Funkteilnehmer;
  readonly art: "kein Kontakt" | "still" | "ohne Rufgruppe";
  readonly seit?: string;
}

function stilleDer(t: Funkteilnehmer): Stille | undefined {
  if (t.erwartet) return undefined;
  if (t.keinKontaktGemeldet !== undefined) return { t, art: "kein Kontakt", seit: t.keinKontaktGemeldet.zeitpunkt };
  if (t.letzterKontakt?.ueberSchwelle === true) return { t, art: "still", seit: t.letzterKontakt.zeitpunkt };
  return undefined;
}

const RANG_STILLE: Readonly<Record<Stille["art"], number>> = { "kein Kontakt": 0, still: 1, "ohne Rufgruppe": 2 };

/** Wer über Funk nicht erreicht wurde: kein Kontakt, still über der Schwelle, ohne Rufgruppe — älteste zuerst. */
export function stillzeilen(plan: Funkplan, jetzt: string): readonly Listenzeile[] {
  const gesehen = new Set<string>();
  const stillen: Stille[] = [];
  // Hauptrufgruppen und Bereiche nennen dieselben Einheiten; jede zählt einmal.
  const geltende = plan.rufgruppen.filter((r) => !r.aufgeloest);
  const gruppeDer = new Map(geltende.flatMap((r) => r.teilnehmer.map((t) => [t.einheitId, r.name] as const)));
  const alle = [...geltende.flatMap((r) => r.teilnehmer), ...plan.jeBereich.flatMap((b) => b.teilnehmer)];
  for (const t of alle) {
    if (gesehen.has(t.einheitId)) continue;
    gesehen.add(t.einheitId);
    const s = stilleDer(t);
    if (s !== undefined) stillen.push(s);
  }
  for (const t of plan.ohneRufgruppe) if (!t.erwartet && !stillen.some((s) => s.t.einheitId === t.einheitId)) stillen.push({ t, art: "ohne Rufgruppe" });
  return stillen
    .sort((a, b) => RANG_STILLE[a.art] - RANG_STILLE[b.art] || (a.seit ?? "").localeCompare(b.seit ?? ""))
    .map((s) => ({
      schluessel: s.t.einheitId,
      warn: s.art !== "ohne Rufgruppe",
      zellen: [
        s.t.einheit,
        s.t.funkrufname || "—",
        s.t.rufgruppe ?? gruppeDer.get(s.t.einheitId) ?? "—",
        s.art === "kein Kontakt" ? `kein Kontakt${s.t.keinKontaktGemeldet?.grund === undefined ? "" : ` (${s.t.keinKontaktGemeldet.grund})`}` : s.art,
        s.seit === undefined ? "—" : `${projektion.uhrzeitKurz(s.seit)} · ${projektion.alterText(s.seit, jetzt)}`,
      ],
    }));
}
