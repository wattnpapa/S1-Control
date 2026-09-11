/**
 * Die Führungsharke — was gezeichnet wird und wie es beschriftet ist
 * (Entwurf „Oberfläche", Option 3a).
 *
 * **Gezeichnet, nicht bearbeitet.** Die Struktur ist der Abschnittsbaum; wer
 * sie ändert, ändert ihn (M3.1). Ein zweiter Editor hieße, dieselbe Struktur
 * an zwei Stellen zu pflegen — und die Ereignisse (§5.3) kennen nur eine.
 *
 * **Warum die Kurzform hier steht und nicht im Zeichen.** Die gelieferten
 * SVG-Dateien tragen festen Text (`TEL`, `EAL`, `UEAL`); ein Knoten der Harke
 * bekommt seine Beschriftung dagegen aus Typ **und Tiefe** — dieselbe
 * Einsatzstelle heißt auf Ebene 1 `EAL` und darunter `UEAL`. Das ist eine
 * Aussage über die Darstellung und keine über den Zustand, deshalb steht sie
 * im Renderer und nicht im Fachkern.
 */

import type { Baumknoten } from "@s1/domaene";

/**
 * Die Einrichtungen stehen **neben** der Harke und nicht in ihr.
 *
 * Ein Meldekopf, ein Bereitstellungsraum und die Logistik sind keine
 * Führungsebene: Sie hängen nicht als Unterabschnitt unter der Einsatzleitung,
 * sondern arbeiten daneben. In der Harke ergäben sie eine Ebene, die es
 * fachlich nicht gibt.
 */
export const EINRICHTUNGEN = ["MELDEKOPF", "BEREITSTELLUNGSRAUM", "LOGISTIK"] as const;

export function istEinrichtung(typ: string): boolean {
  return (EINRICHTUNGEN as readonly string[]).includes(typ);
}

/** Die Kurzform am Zeichen — Typ und Tiefe zusammen (siehe Kopfkommentar). */
export function kurzform(typ: string, tiefe: number): string {
  switch (typ) {
    case "FUEHRUNGSSTELLE":
      return "TEL";
    case "SONSTIGE_FUEHRUNG":
      return "EL";
    case "MELDEKOPF":
      return "MK";
    case "BEREITSTELLUNGSRAUM":
      return "BR";
    case "LOGISTIK":
      return "LOG";
    case "ANGEFORDERT":
      return "ANF";
    case "EINSATZORT":
      return tiefe === 0 ? "EAL" : "UEAL";
    default:
      return typ.slice(0, 4);
  }
}

/**
 * Das Zeichen aus dem importierten Satz (`apps/desktop/assets/tz/`).
 *
 * Die Dateien tragen ihren Text fest — `EAL.svg` sagt „EAL". Genau deshalb
 * hängt die Wahl der Datei an Typ **und** Tiefe: Derselbe Einsatzort ist auf
 * der ersten Ebene ein Einsatzabschnitt und darunter ein Untereinsatzabschnitt.
 *
 * `undefined` heißt: Für diesen Typ hat der Satz kein Zeichen. Die Ansicht
 * zeichnet dann die Kurzform als Text — sichtbar fehlend statt stillschweigend
 * falsch.
 */
export function zeichenkennung(typ: string, tiefe: number): string | undefined {
  switch (typ) {
    case "FUEHRUNGSSTELLE":
      return "Führungsstellen/TEL";
    case "SONSTIGE_FUEHRUNG":
      return "Führungsstellen/EL";
    case "MELDEKOPF":
      return "Einrichtungen/Meldekopf";
    case "BEREITSTELLUNGSRAUM":
      return "Einrichtungen/Bereitstellungsraum";
    case "LOGISTIK":
      return "Einrichtungen/Logistikstützpunkt";
    case "EINSATZORT":
      return tiefe === 0 ? "Führungsstellen/EAL" : "Führungsstellen/UEAL";
    default:
      return undefined;
  }
}

/** Die ausgeschriebene Beschriftung — für `title` und für die zweite Wahl. */
export function langform(typ: string, tiefe: number): string {
  switch (typ) {
    case "FUEHRUNGSSTELLE":
      return "Technische Einsatzleitung";
    case "SONSTIGE_FUEHRUNG":
      return "Einsatzleitung";
    case "MELDEKOPF":
      return "Meldekopf";
    case "BEREITSTELLUNGSRAUM":
      return "Bereitstellungsraum";
    case "LOGISTIK":
      return "Versorgungsstelle";
    case "ANGEFORDERT":
      return "Angefordert";
    case "EINSATZORT":
      return tiefe === 0 ? "Einsatzabschnittsleitung" : "Untereinsatzabschnittsleitung";
    default:
      return typ;
  }
}

/**
 * Die Breite eines Knotens in Pixeln, nach Ebene (Entwurf: 196 / 176 / 118).
 *
 * Die Harke wird breiter, je tiefer sie geht; die Zeichen werden es nicht.
 * Ohne diese Staffelung schöbe die dritte Ebene die zweite auseinander, bis
 * der Bogen nicht mehr auf ein Blatt passt.
 */
export function knotenbreite(tiefe: number): number {
  if (tiefe === 0) return 196;
  if (tiefe === 1) return 176;
  return 118;
}

/** Die Länge des Abzweigstummels je Ebene (Entwurf: 20 / 16 / 14). */
export function stummel(tiefe: number): number {
  if (tiefe === 0) return 20;
  if (tiefe === 1) return 16;
  return 14;
}

export interface Harkenbild {
  /** Die Ebenen der Führung — was in die Harke gezeichnet wird. */
  readonly fuehrung: readonly Baumknoten[];
  /** Meldekopf, Bereitstellungsraum, Logistik — daneben, mit eigenem Zeichen. */
  readonly einrichtungen: readonly Baumknoten[];
}

/**
 * Teilt den Baum in Harke und Einrichtungen.
 *
 * Der Archivabschnitt fällt weg: Ein Organigramm, das ihn zeichnet, zeigt eine
 * Führungsstruktur, die es nicht gibt. Aufgelöste Abschnitte bleiben stehen
 * (§5.3.2) — sie waren Teil der Organisation, und ein Blatt, das an der Wand
 * hängt, soll das zeigen.
 */
export function harkenbild(baum: readonly Baumknoten[]): Harkenbild {
  const oben = baum.filter((knoten) => knoten.typ !== "ARCHIV");
  return {
    fuehrung: oben.filter((knoten) => !istEinrichtung(knoten.typ)),
    einrichtungen: oben.filter((knoten) => istEinrichtung(knoten.typ)),
  };
}
