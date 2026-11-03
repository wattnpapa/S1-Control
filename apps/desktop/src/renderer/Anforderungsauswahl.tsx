/**
 * Was die gewählte Anforderung kann — als Auswahlleiste unter der Liste und
 * als Kontextmenü an der Zeile (Entwurf „Entlastung", 3.7).
 *
 * Bis Runde 6 standen Zusagen, Eingetroffen, Stornieren und die drei
 * Rücknahmen in jeder Zeile der Spalte „Handlung". Jetzt erscheinen sie erst
 * mit der Wahl einer Zeile. Die Regel bleibt dieselbe (§5.6.2): Angeboten
 * wird nur, was den Zustand ändert, und die Rücknahme dessen, was gilt. Eine
 * Zusage auf eine bereits geltende Erledigung wäre wirkungslos und trüge
 * einen Hinweis; einen Knopf dafür anzubieten, wäre ein Versprechen, das der
 * Fold nicht hält. Der nächste Schritt im Ablauf steht gefüllt (Zusagen,
 * dann Eingetroffen), Stornieren abgesetzt in Warnfarbe.
 */

import type { Anforderungszeile } from "@s1/domaene";

import { Auswahlkontextmenue, Auswahlleiste, type Leistenknopf } from "./Auswahlleiste.js";
import type { Kontextort } from "./Klappmenue.js";

/** Welche Maske die gewählte Anforderung öffnet. */
export type Anforderungsmaske = "zusage" | "eintreffen" | "nachtragen" | "storno";
/** Welche Rücknahme sie schreibt. */
export type Anforderungsruecknahme = "zusage" | "erledigung" | "storno";

export interface AnforderungsauswahlEigenschaften {
  readonly zeile: Anforderungszeile;
  /** Warum gerade nichts geschrieben werden kann (beendeter Einsatz). */
  readonly sperre: string | undefined;
  /** Warum eine Rücknahme gerade nicht geht (zusätzlich: laufender Schritt, keine Verbindung). */
  readonly ruecknahmeSperre: string | undefined;
  readonly aufMaske: (maske: Anforderungsmaske) => void;
  readonly aufRuecknahme: (was: Anforderungsruecknahme) => void;
}

function knopf(sperre: string | undefined, eintrag: Leistenknopf): Leistenknopf {
  return sperre === undefined ? eintrag : { ...eintrag, sperre };
}

function schritteNachZustand(p: AnforderungsauswahlEigenschaften): Leistenknopf[] {
  const { zeile, sperre, ruecknahmeSperre } = p;
  const maske = (art: Anforderungsmaske) => () => {
    p.aufMaske(art);
  };
  const zurueck = (was: Anforderungsruecknahme) => () => {
    p.aufRuecknahme(was);
  };
  switch (zeile.zustand) {
    case "OFFEN":
      return [knopf(sperre, { schluessel: "zusage", text: "Zusagen …", haupt: true, titel: "Zugesagt für und von eintragen", aufWahl: maske("zusage") })];
    case "ZUGESAGT":
      return [
        knopf(sperre, { schluessel: "eintreffen", text: "Eingetroffen …", haupt: true, titel: "Einheit anlegen oder verknüpfen", aufWahl: maske("eintreffen") }),
        knopf(ruecknahmeSperre, { schluessel: "zusage-zurueck", text: "Zusage zurück", aufWahl: zurueck("zusage") }),
      ];
    case "EINGETROFFEN":
      return [
        ...(zeile.abloesendeEinheitId === undefined
          ? [knopf(sperre, { schluessel: "nachtragen", text: "Einheit anlegen …", haupt: true, aufWahl: maske("nachtragen") })]
          : []),
        knopf(ruecknahmeSperre, { schluessel: "erledigung-zurueck", text: "Eintreffen zurück", aufWahl: zurueck("erledigung") }),
      ];
    default:
      return [];
  }
}

/** Die Knöpfe der Leiste, in ihrer Reihenfolge. */
export function anforderungsknoepfe(p: AnforderungsauswahlEigenschaften): readonly Leistenknopf[] {
  if (p.zeile.zustand === "STORNIERT") {
    return [knopf(p.ruecknahmeSperre, { schluessel: "storno-zurueck", text: "Storno zurück", aufWahl: () => p.aufRuecknahme("storno") })];
  }
  const storno = knopf(p.sperre, {
    schluessel: "storno",
    text: "Stornieren …",
    rot: true,
    titel: "Fragt den Grund; die Anforderung bleibt durchgestrichen in der Liste",
    aufWahl: () => p.aufMaske("storno"),
  });
  return [...schritteNachZustand(p), storno];
}

export function anforderungstitel(zeile: Anforderungszeile): string {
  return `1 gewählt · ${zeile.kennung === "" ? "ohne Kennung" : zeile.kennung}`;
}

export function Anforderungsleiste(p: AnforderungsauswahlEigenschaften): React.JSX.Element {
  return <Auswahlleiste titel={anforderungstitel(p.zeile)} knoepfe={anforderungsknoepfe(p)} />;
}

export function Anforderungskontextmenue(p: AnforderungsauswahlEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void }): React.JSX.Element {
  return <Auswahlkontextmenue ort={p.ort} titel={`Anforderung ${p.zeile.kennung}`} knoepfe={anforderungsknoepfe(p)} aufSchliessen={p.aufSchliessen} />;
}
