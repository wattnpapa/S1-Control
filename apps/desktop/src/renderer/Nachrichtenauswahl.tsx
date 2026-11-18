/**
 * Was die gewählte Nachricht kann — als Auswahlleiste am Fuß der Liste und
 * als Kontextmenü an der Zeile (KONZEPT-NACHRICHTEN.md §5, §6; Entwurf
 * „Entlastung", 3.7).
 *
 * „Öffnen" (früher „Lesen“, R2-FaBe P2-4: „Lesen“ klang nach „nur ansehen“) ist der Hauptweg: Es schlägt die Nachricht als Vordruck auf und
 * schreibt die Kenntnisnahme für die Stellen der Sitzung, die im Verteiler
 * stehen. „Erledigt" gilt je Stelle und lässt sich zurücknehmen; es steht
 * nur da, wo eine eigene Stelle im Verteiler steht. „Antworten" und
 * „Weiterleiten" sind Komfortwege zur selben Maske, keine eigenen
 * Ereignisarten. „Zurückziehen" ist folgenreich und fragt nach dem Grund.
 *
 * Schnitt N3 (§7): „Als Vordruck drucken" legt den Vordruck der Nachricht
 * als PDF ab — auch im beendeten Einsatz, denn Drucken schreibt nichts in
 * die Akte.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import { Auswahlkontextmenue, Auswahlleiste, type Leistenknopf } from "./Auswahlleiste.js";
import type { Kontextort } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { eigeneMarken } from "./nachrichtenformate.js";

export interface NachrichtenauswahlEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly stellen: readonly string[];
  readonly nurLesen: boolean;
  /** Steht grau da, solange geschrieben wird oder die Verbindung fehlt. */
  readonly sperre: string | undefined;
  readonly aufLesen: () => void;
  readonly aufErledigt: () => void;
  readonly aufErledigungZurueck: () => void;
  readonly aufAntworten: () => void;
  readonly aufWeiterleiten: () => void;
  readonly aufZurueckziehen: () => void;
  readonly aufTagebuch: () => void;
  /** Additiv (N3): „Als Vordruck drucken"; fehlt er, steht der Knopf nicht da. */
  readonly aufVordruck?: (() => void) | undefined;
}

/** „1 gewählt · E 26 Pumpen eingetroffen". */
export function nachrichtenauswahltitel(zeile: Nachrichtenzeile): string {
  const nummer = zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
  return `1 gewählt · ${nummer} ${zeile.betreff === "" ? zeile.absender : zeile.betreff}`;
}

function erledigungsknopf(p: NachrichtenauswahlEigenschaften): Leistenknopf | undefined {
  if (!p.zeile.verteiler.some((m) => p.stellen.includes(m.stelle))) return undefined;
  if (eigeneMarken(p.zeile, p.stellen).erledigt) {
    return { schluessel: "zurueck", text: "Erledigung zurück", titel: "Die Erledigung für die eigenen Stellen zurücknehmen", sperre: p.sperre, aufWahl: p.aufErledigungZurueck };
  }
  return { schluessel: "erledigt", text: "Erledigt", titel: "Für die eigenen Stellen des Verteilers als erledigt markieren", sperre: p.sperre, aufWahl: p.aufErledigt };
}

/** Die Schritte für die gewählte Nachricht, in der Reihenfolge der Leiste. */
export function nachrichtenknoepfe(p: NachrichtenauswahlEigenschaften): readonly Leistenknopf[] {
  const lesen: Leistenknopf = {
    schluessel: "lesen",
    // R2-FaBe P2-4: „Öffnen“ statt „Lesen“; die Kenntnisnahme bleibt daran und steht im Titel.
    text: "Öffnen",
    titel: "Als Vordruck aufschlagen; nimmt für die eigenen Stellen des Verteilers Kenntnis (Handzeichen und Zeit)",
    haupt: true,
    aufWahl: p.aufLesen,
  };
  const tagebuch: Leistenknopf = { schluessel: "tagebuch", text: "Im Tagebuch zeigen", titel: "Das Einsatztagebuch mit den Zeilen dieser Nachricht", aufWahl: p.aufTagebuch };
  const vordruck: Leistenknopf[] =
    p.aufVordruck === undefined
      ? []
      : [{ schluessel: "vordruck", text: "Als Vordruck drucken", titel: "Den Nachrichtenvordruck als PDF im Ordner „ausgaben“ ablegen", aufWahl: p.aufVordruck }];
  if (p.nurLesen) return [lesen, ...vordruck, tagebuch];
  const erledigung = erledigungsknopf(p);
  return [
    lesen,
    ...(erledigung === undefined ? [] : [erledigung]),
    { schluessel: "antworten", text: "Antworten", menuetext: "Antworten …", titel: "Neue Nachricht an den Absender; sie geht über die Fernmeldezentrale", aufWahl: p.aufAntworten },
    { schluessel: "weiterleiten", text: "Weiterleiten", menuetext: "Weiterleiten …", titel: "Neue Nachricht mit demselben Inhalt", aufWahl: p.aufWeiterleiten },
    ...vordruck,
    tagebuch,
    {
      schluessel: "zurueckziehen",
      text: "Zurückziehen …",
      titel: "Eine Fehlanlage zurückziehen; fragt nach dem Grund, die Nachricht bleibt sichtbar",
      rot: true,
      ...(p.zeile.zurueckgezogen ? { sperre: "Bereits zurückgezogen" } : p.sperre === undefined ? {} : { sperre: p.sperre }),
      aufWahl: p.aufZurueckziehen,
    },
  ];
}

export function Nachrichtenleiste(p: NachrichtenauswahlEigenschaften): React.JSX.Element {
  return <Auswahlleiste titel={nachrichtenauswahltitel(p.zeile)} knoepfe={nachrichtenknoepfe(p)} sperrtext={undefined} {...(p.nurLesen ? { dazu: <span className="auswahlsperre">{TEXT_NUR_LESEN}</span> } : {})} />;
}

export function Nachrichtenkontextmenue(p: NachrichtenauswahlEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void }): React.JSX.Element {
  return <Auswahlkontextmenue ort={p.ort} titel={nachrichtenauswahltitel(p.zeile)} knoepfe={nachrichtenknoepfe(p)} aufSchliessen={p.aufSchliessen} />;
}
