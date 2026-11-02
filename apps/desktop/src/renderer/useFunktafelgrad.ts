/**
 * Der Grad der Tafel „Funkplan", nach dem Zeichnen nachgemessen.
 *
 * `funktafelgrad` schätzt aus Zeichenzahlen, und die Schätzung muss vorsichtig
 * sein: Sie kennt weder die Systemschrift noch, wo eine Kachelreihe genau
 * umbricht. Bei 960×540 blieb so ein Viertel der Höhe leer, und die Schrift
 * stand mit 12 px zu klein an der Wand. Anders als die große Zahl der Stärke
 * (dort wird bewusst nicht ausgemessen, siehe `schriftgroesse`) hängt die Höhe
 * dieser Tafel an Umbrüchen, die nur der Browser kennt. Deshalb beginnt der
 * Grad bei der Schätzung und wird dann am gezeichneten Bild nachgezogen:
 *
 *  * Ist unter der Tafel noch Platz, wächst er um einen Pixel.
 *  * Läuft das Bild über — höher als das Fenster, breiter als das Bild oder
 *    eine Kachel, die ihren Text abschneidet —, geht er einen zurück und
 *    bleibt dort stehen, bis sich Fenster oder Inhalt ändern.
 *
 * Das läuft in `useLayoutEffect`: React zeichnet die Zwischenschritte neu,
 * bevor der Browser malt, an der Wand ist nur der letzte Grad zu sehen. Ohne
 * Layout (jsdom) misst alles null, und es bleibt bei der Schätzung.
 */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Kleiner wird die Tafel nicht; darunter liest an der Wand niemand mehr. */
export const FUNKTAFEL_GRAD_MIN = 8;

/** Was am gezeichneten Bild gemessen wird. */
export interface Tafelmessung {
  /** Höher als das Fenster, breiter als das Bild oder ein abgeschnittener Text. */
  readonly ueberlauf: boolean;
  /** Pixel zwischen Tafel und Fuß. */
  readonly frei: number;
}

/** Wo die Suche steht: zu welchem Inhalt, bei welchem Grad, und ob sie fertig ist. */
export interface Gradstand {
  readonly schluessel: string;
  readonly grad: number;
  readonly fest: boolean;
}

/**
 * Der nächste Schritt der Suche. Gibt `stand` selbst zurück, wenn nichts zu
 * tun ist — der Aufrufer setzt dann keinen Zustand und die Schleife endet.
 */
export function naechsterGradstand(stand: Gradstand, messung: Tafelmessung, hoechstens: number): Gradstand {
  if (messung.ueberlauf) {
    if (stand.grad <= FUNKTAFEL_GRAD_MIN) return stand.fest ? stand : { ...stand, fest: true };
    return { ...stand, grad: stand.grad - 1, fest: true };
  }
  if (!stand.fest && messung.frei > 1 && stand.grad < hoechstens) return { ...stand, grad: stand.grad + 1 };
  return stand;
}

function laeuftUeber(element: Element): boolean {
  return element.scrollWidth > element.clientWidth + 1;
}

/** Misst das Bild der Ansicht: Tafel, Fuß, Kacheln und Kopfzellen. */
export function missTafel(bild: HTMLElement): Tafelmessung {
  const tafel = bild.querySelector("table");
  const fuss = bild.querySelector(".monitorfuss");
  if (tafel === null || fuss === null) return { ueberlauf: false, frei: 0 };
  const zuHoch = bild.getBoundingClientRect().height > window.innerHeight + 1;
  const abgeschnitten = laeuftUeber(bild) || [...bild.querySelectorAll(".funkkachel, th, .monitorfuss")].some(laeuftUeber);
  const frei = fuss.getBoundingClientRect().top - tafel.getBoundingClientRect().bottom;
  return { ueberlauf: zuHoch || abgeschnitten, frei };
}

/**
 * Der nachgezogene Grad. `schaetzung` ist der Anfang, `schluessel` steht für
 * Fenster und Inhalt — ändert er sich, beginnt die Suche neu; `hoechstens`
 * deckelt das Wachsen (eine einzelne Gruppe soll nicht riesig werden).
 */
export function useFunktafelgrad(schaetzung: number, schluessel: string, hoechstens: number): { readonly grad: number; readonly bild: RefObject<HTMLElement | null> } {
  const bild = useRef<HTMLElement>(null);
  const [stand, setzeStand] = useState<Gradstand>({ schluessel, grad: schaetzung, fest: false });
  const aktuell = stand.schluessel === schluessel ? stand : { schluessel, grad: schaetzung, fest: false };

  // Ohne Abhängigkeiten: Nach jedem Zeichnen wird nachgemessen, auch wenn
  // nur der Fuß (Stand, Zeit) länger geworden ist und eine Zeile mehr braucht.
  useLayoutEffect(() => {
    const element = bild.current;
    if (element === null) return;
    const naechster = naechsterGradstand(aktuell, missTafel(element), hoechstens);
    if (naechster !== stand) setzeStand(naechster);
  });

  return { grad: aktuell.grad, bild };
}
