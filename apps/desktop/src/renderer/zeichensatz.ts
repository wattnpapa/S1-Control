/**
 * Der Zugang zum importierten Zeichensatz — für **jede** Ansicht.
 *
 * Die Dateien unter `apps/desktop/assets/tz/` kommen aus
 * jonas-koeritz/Taktische-Zeichen und werden von `bau/zeichen-importieren.mjs`
 * erzeugt (siehe dort und `HERKUNFT.md`). Sie sind genormt; die Anwendung
 * zeichnet sie nicht nach, sie zeigt sie — im Abschnittsbaum, in der Harke,
 * und überall, wo später eines gebraucht wird.
 *
 * **Geladen wird einzeln, nicht alles.** Der Satz hat knapp tausend Zeichen
 * und rund vier Megabyte. Ins Bündel gelegt (`eager`) läge das alles in jedem
 * Fenster, auch im Stärke-Monitor, der kein einziges Zeichen zeigt. Geladen
 * wird deshalb je Kennung und einmal: `import.meta.glob` ohne `eager` macht
 * aus jeder Datei ein eigenes Stück, der Bündler schneidet sie auseinander,
 * und was einmal da war, bleibt im Zwischenspeicher.
 *
 * **Das Verzeichnis liegt dagegen ganz vor.** `index.json` trägt nur Kennung
 * und Titel — rund hundert Kilobyte für tausend Zeichen. Ohne das gäbe es
 * keine Suche über den Satz, und eine Zeichenwahl, die erst tausend Dateien
 * lädt, um ihre Namen zu kennen, ist keine.
 */

import verzeichnisRoh from "../../assets/tz/index.json?raw";

const LADER = import.meta.glob("../../assets/tz/**/*.svg", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export interface Zeichenangabe {
  /** `Führungsstellen/EAL` — Kategorie und Name, ohne Endung. */
  readonly kennung: string;
  /** Der ausgeschriebene Titel aus dem SVG, etwa „Einsatzabschnittsleitung". */
  readonly titel: string;
}

interface Verzeichnis {
  readonly herkunft: string;
  readonly commit: string;
  readonly stand: string;
  readonly zeichen: readonly Zeichenangabe[];
}

const VERZEICHNIS = JSON.parse(verzeichnisRoh) as Verzeichnis;

/** `…/assets/tz/Führungsstellen/EAL.svg` → `Führungsstellen/EAL`. */
function kennungAus(pfad: string): string {
  return pfad.replace(/^.*\/assets\/tz\//, "").replace(/\.svg$/, "");
}

const LADER_JE_KENNUNG: ReadonlyMap<string, () => Promise<string>> = new Map(
  Object.entries(LADER).map(([pfad, lade]) => [kennungAus(pfad), lade]),
);

const GELADEN = new Map<string, string>();

/**
 * Macht aus der Datei ein Stück Dokument.
 *
 * Zwei Dinge stören inline: die `<!DOCTYPE svg …>`-Zeile, die nur am Anfang
 * eines eigenen Dokuments etwas zu suchen hat, und die festen Maße
 * `width="256" height="256"` — mit ihnen ignoriert der Browser die Breite, die
 * der Aufrufer setzt. Das Seitenverhältnis kommt danach aus der `viewBox`,
 * und die bleibt unangetastet: Sie ist die Norm.
 */
function aufbereitet(inhalt: string): string {
  return inhalt
    .replace(/<!DOCTYPE[^>]*>\s*/i, "")
    .replace(/(<svg\b[^>]*?)\s+width="\d+"\s+height="\d+"/i, "$1");
}

/**
 * Lädt ein Zeichen und merkt es sich.
 *
 * `undefined` ist kein Fehlerfall, sondern der Normalfall nach einem Import:
 * Oben kann ein Zeichen umbenannt werden, und dann soll die Oberfläche einen
 * Rückfall zeigen statt zu scheitern (§1.3 — der fehlende Gegenstand ist der
 * Normalpfad).
 */
export async function ladeZeichen(kennung: string): Promise<string | undefined> {
  const bereits = GELADEN.get(kennung);
  if (bereits !== undefined) return bereits;
  const lade = LADER_JE_KENNUNG.get(kennung);
  if (lade === undefined) return undefined;
  const inhalt = aufbereitet(await lade());
  GELADEN.set(kennung, inhalt);
  return inhalt;
}

/**
 * Das schon geladene Zeichen, ohne zu warten.
 *
 * Damit zeichnet eine Ansicht beim zweiten Mal ohne Flackern: Das Zeichen der
 * Einsatzabschnittsleitung ist im Baum, in der Harke und in der Maske
 * dasselbe, und es wird einmal geholt.
 */
export function zeichenAusSpeicher(kennung: string): string | undefined {
  return GELADEN.get(kennung);
}

/** Ob der Satz diese Kennung überhaupt kennt — ohne sie zu laden. */
export function kenntZeichen(kennung: string): boolean {
  return LADER_JE_KENNUNG.has(kennung);
}

/** Alle Zeichen mit Kennung und Titel — die Grundlage jeder Zeichenwahl. */
export function alleZeichen(): readonly Zeichenangabe[] {
  return VERZEICHNIS.zeichen;
}

/** Die Kategorien des Satzes, in der Ordnung des Verzeichnisses. */
export function kategorien(): readonly string[] {
  const gesehen = new Set<string>();
  for (const eintrag of VERZEICHNIS.zeichen) {
    const kategorie = eintrag.kennung.split("/")[0];
    if (kategorie !== undefined) gesehen.add(kategorie);
  }
  return [...gesehen].sort((a, b) => a.localeCompare(b, "de"));
}

/**
 * Sucht über Titel und Kennung.
 *
 * Gesucht wird ohne Rücksicht auf Groß- und Kleinschreibung und über beide
 * Felder: Wer „EAL" tippt, meint die Kennung, wer „Einsatzabschnitt" tippt,
 * den Titel. Umlaute bleiben, wie sie sind — der Satz ist deutsch, und eine
 * Suche, die „Führungsstelle" nicht findet, ist keine.
 */
export function sucheZeichen(
  text: string,
  optionen: { readonly kategorie?: string; readonly hoechstens?: number } = {},
): readonly Zeichenangabe[] {
  const suche = text.trim().toLocaleLowerCase("de");
  const hoechstens = optionen.hoechstens ?? 50;
  const treffer: Zeichenangabe[] = [];
  for (const eintrag of VERZEICHNIS.zeichen) {
    if (optionen.kategorie !== undefined && !eintrag.kennung.startsWith(`${optionen.kategorie}/`)) {
      continue;
    }
    if (
      suche !== "" &&
      !eintrag.titel.toLocaleLowerCase("de").includes(suche) &&
      !eintrag.kennung.toLocaleLowerCase("de").includes(suche)
    ) {
      continue;
    }
    treffer.push(eintrag);
    if (treffer.length >= hoechstens) break;
  }
  return treffer;
}

/** Der ausgeschriebene Titel zu einer Kennung — für `title` und Vorleser. */
export function titelVon(kennung: string): string | undefined {
  return VERZEICHNIS.zeichen.find((eintrag) => eintrag.kennung === kennung)?.titel;
}

/** Woher der Satz stammt und mit welchem Stand — für die Diagnose. */
export function zeichensatzHerkunft(): { herkunft: string; commit: string; stand: string; anzahl: number } {
  return {
    herkunft: VERZEICHNIS.herkunft,
    commit: VERZEICHNIS.commit,
    stand: VERZEICHNIS.stand,
    anzahl: VERZEICHNIS.zeichen.length,
  };
}
