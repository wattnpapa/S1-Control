/**
 * Die Vorschau des Nachrichtenvordrucks: zeichnet den Vordruck so, wie er
 * gedruckt wird, auf ein Canvas (KONZEPT-NACHRICHTEN.md Entscheidung 4,
 * Schnitt N3).
 *
 * **Nach dem Muster von `bos-nachrichtenvordruck/web/src/bildvorschau.ts`.**
 * Gezeichnet wird in eine echte Wegwerf-jsPDF mit genau dem Aufruf, mit dem
 * `@s1/ausgaben` druckt (`blattZeichnen`, `vordruckBlaetterAus`); dabei wird
 * mitgeschrieben, welche Linie, welches Rechteck und welcher Text wohin geht,
 * und das Mitgeschriebene auf das Canvas übertragen. Umbruch,
 * Schriftverkleinerung und Folgeblätter fallen damit aus wie im PDF; nur die
 * Schrift des Browsers weicht leicht von Helvetica ab.
 *
 * **Erst laden, wenn gebraucht.** jsPDF, die Bibliothek und der Teileinstieg
 * `@s1/ausgaben/vordruck` kommen per `import()`; der Bündler legt sie in ein
 * eigenes Teilbündel, das erst die aufgeklappte Vorschau holt. Wer die
 * Vorschau nie aufklappt, lädt es nie.
 *
 * Kein `node:`, kein Dateizugriff: reine Zeichenarbeit im Fenster.
 */

import type { jsPDF } from "jspdf";

import type { Nachrichtendruck, Nachrichtenentwurf } from "@s1/ausgaben/vordruck";
import type { Nachrichtenzeile } from "@s1/domaene";

interface Text {
  readonly art: "text";
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly groesse: number;
  readonly ausrichtung: "left" | "center" | "right";
  readonly winkel: number;
  readonly abstand: number;
  readonly fett: boolean;
  readonly farbe: string;
}

interface Linie {
  readonly art: "linie";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly staerke: number;
  readonly farbe: string;
}

interface Rechteck {
  readonly art: "rechteck";
  readonly x: number;
  readonly y: number;
  readonly b: number;
  readonly h: number;
  readonly stil: string;
  readonly staerke: number;
  readonly rand: string;
  readonly fuellung: string;
}

export type Aufruf = Text | Linie | Rechteck;

/** Woraus die Vorschau zeichnet: eine aufgegebene Nachricht oder der Entwurf in der Maske. */
export type Vordruckquelle = { readonly art: "zeile"; readonly zeile: Nachrichtenzeile } | { readonly art: "entwurf"; readonly entwurf: Nachrichtenentwurf };

/** Die nachgeladenen Module. */
export interface Vordruckmodule {
  readonly jsPDF: typeof jsPDF;
  readonly breite: number;
  readonly hoehe: number;
  readonly ausgaben: typeof import("@s1/ausgaben/vordruck");
}

let geladen: Promise<Vordruckmodule> | undefined;

/** Lädt jsPDF, Bibliothek und Vordruck einmal je Fenster; ein Fehlschlag darf es beim nächsten Aufklappen neu versuchen. */
export function ladeVordruckmodule(): Promise<Vordruckmodule> {
  geladen ??= Promise.all([import("jspdf"), import("bos-nachrichtenvordruck"), import("@s1/ausgaben/vordruck")])
    .then(([pdf, bibliothek, ausgaben]) => ({ jsPDF: pdf.jsPDF, breite: bibliothek.VORDRUCK_BREITE, hoehe: bibliothek.VORDRUCK_HOEHE, ausgaben }))
    .catch((fehler: unknown) => {
      geladen = undefined;
      throw fehler;
    });
  return geladen;
}

const PT_IN_MM = 25.4 / 72;
type Ersatz = Record<string, unknown>;

/** Zeichnet in eine Wegwerf-jsPDF und schreibt die Aufrufe mit (siehe Dateikopf). */
function mitschreiben(m: Vordruckmodule, zeichnen: (pdf: jsPDF) => void): Aufruf[] {
  const pdf = new m.jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const aufrufe: Aufruf[] = [];
  const ersatz = pdf as unknown as Ersatz;
  const text = pdf.text.bind(pdf) as (...a: unknown[]) => jsPDF;
  const linie = pdf.line.bind(pdf) as (...a: unknown[]) => jsPDF;
  const rechteck = pdf.rect.bind(pdf) as (...a: unknown[]) => jsPDF;
  ersatz["text"] = (inhalt: string | string[], x: number, y: number, o?: { align?: Text["ausrichtung"]; angle?: number; charSpace?: number }) => {
    const art = "text" as const;
    const fett = pdf.getFont().fontStyle === "bold";
    const eintrag = { art, text: Array.isArray(inhalt) ? inhalt.join(" ") : String(inhalt), x, y, groesse: pdf.getFontSize(), fett, farbe: pdf.getTextColor() };
    aufrufe.push({ ...eintrag, ausrichtung: o?.align ?? "left", winkel: o?.angle ?? 0, abstand: o?.charSpace ?? 0 });
    return text(inhalt, x, y, o);
  };
  ersatz["line"] = (x1: number, y1: number, x2: number, y2: number, stil?: string) => {
    aufrufe.push({ art: "linie", x1, y1, x2, y2, staerke: pdf.getLineWidth(), farbe: pdf.getDrawColor() });
    return linie(x1, y1, x2, y2, stil);
  };
  ersatz["rect"] = (x: number, y: number, b: number, h: number, stil?: string) => {
    aufrufe.push({ art: "rechteck", x, y, b, h, stil: stil ?? "S", staerke: pdf.getLineWidth(), rand: pdf.getDrawColor(), fuellung: pdf.getFillColor() });
    return rechteck(x, y, b, h, stil);
  };
  zeichnen(pdf);
  return aufrufe;
}

/** Die Eingabe des Vordrucks aus der Quelle — dieselbe Abbildung wie beim Druck. */
export function druckAus(m: Vordruckmodule, quelle: Vordruckquelle, uebung: boolean): Nachrichtendruck {
  return quelle.art === "zeile" ? m.ausgaben.nachrichtendruckAus(quelle.zeile, uebung) : m.ausgaben.entwurfsdruck(quelle.entwurf, uebung);
}

/** Die Aufrufe je Blatt (ein Blatt je Vordruck, Folgeblätter wie im Druck). */
export function vordruckseiten(m: Vordruckmodule, druck: Nachrichtendruck): Aufruf[][] {
  return m.ausgaben.vordruckBlaetterAus(druck).map((daten) => mitschreiben(m, (pdf) => m.ausgaben.blattZeichnen(pdf, daten, 0)));
}

function zeichneText(k: CanvasRenderingContext2D, t: Text): void {
  k.save();
  k.fillStyle = t.farbe;
  k.font = `${t.fett ? "bold " : ""}${String(t.groesse * PT_IN_MM)}px Helvetica, Arial, sans-serif`;
  (k as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${String(t.abstand)}px`;
  k.textAlign = t.ausrichtung;
  k.textBaseline = "alphabetic";
  k.translate(t.x, t.y);
  if (t.winkel !== 0) k.rotate((-t.winkel * Math.PI) / 180);
  k.fillText(t.text, 0, 0);
  k.restore();
}

function zeichneAufruf(k: CanvasRenderingContext2D, a: Aufruf): void {
  if (a.art === "text") return zeichneText(k, a);
  if (a.art === "linie") {
    k.strokeStyle = a.farbe;
    k.lineWidth = a.staerke;
    k.beginPath();
    k.moveTo(a.x1, a.y1);
    k.lineTo(a.x2, a.y2);
    k.stroke();
    return;
  }
  if (a.stil.includes("F")) {
    k.fillStyle = a.fuellung;
    k.fillRect(a.x, a.y, a.b, a.h);
  }
  if (a.stil.includes("D") || a.stil === "S") {
    k.strokeStyle = a.rand;
    k.lineWidth = a.staerke;
    k.strokeRect(a.x, a.y, a.b, a.h);
  }
}

/** Der Abstand zwischen zwei Blättern in mm. */
const ABSTAND_MM = 4;

/**
 * Überträgt die Blätter untereinander auf das Canvas, in der Breite
 * `breitePx`. Liefert `false`, wenn das Canvas keinen 2D-Kontext hat (jsdom,
 * abgeschaltete Grafik) — dann zeigt die Oberfläche „keine Vorschau möglich".
 */
export function zeichneSeiten(canvas: HTMLCanvasElement, m: Vordruckmodule, seiten: readonly Aufruf[][], breitePx: number): boolean {
  let k: CanvasRenderingContext2D | null | undefined;
  try {
    k = canvas.getContext("2d");
  } catch {
    k = null;
  }
  // jsdom liefert ohne das Paket „canvas“ nichts zurück (null oder undefined).
  if (k === null || k === undefined) return false;
  const pxJeMm = (breitePx / m.breite) * (window.devicePixelRatio || 1);
  const hoehe = seiten.length * m.hoehe + Math.max(0, seiten.length - 1) * ABSTAND_MM;
  canvas.width = Math.round(m.breite * pxJeMm);
  canvas.height = Math.round(hoehe * pxJeMm);
  k.setTransform(1, 0, 0, 1, 0, 0);
  k.clearRect(0, 0, canvas.width, canvas.height);
  k.scale(pxJeMm, pxJeMm);
  seiten.forEach((seite, i) => {
    k.save();
    k.translate(0, i * (m.hoehe + ABSTAND_MM));
    k.fillStyle = "#fff";
    k.fillRect(0, 0, m.breite, m.hoehe);
    for (const aufruf of seite) zeichneAufruf(k, aufruf);
    k.restore();
  });
  return true;
}
