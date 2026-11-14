/**
 * Was eine Auswahl in der Einheitentabelle kann — als Leiste am Fuß der
 * Karte und als Kontextmenü an der Zeile (Entwurf „Entlastung", 3.5,
 * Option 6c).
 *
 * Bis Runde 6 standen Verschieben, Aufteilen, Zusammenführen, Kopieren,
 * Entfernen, Ablösung und Funk als sieben Knöpfe im Kopf der Karte, ohne
 * Auswahl grau. Jetzt erscheinen sie erst mit der Auswahl (Leitsatz 2) und
 * nur die, die mit ihr gehen: Bei zwei gewählten Zeilen bleiben Verschieben
 * und Zusammenführen. Einzige Ausnahme ist Zusammenführen bei genau einer
 * Zeile: Es steht grau da und sagt, was fehlt, denn wer zusammenführen
 * will, beginnt mit einer Zeile.
 *
 * „Erfassungsbögen" ist der einzige lesende Schritt: Er schreibt nichts in
 * die Akte, nur eine Datei nach `ausgaben\`, und bleibt deshalb auch im
 * beendeten Einsatz stehen — gerade zur Nachbereitung wird er gebraucht.
 *
 * Die Sperrregeln sind dieselben wie vorher im Kopf; die Kürzel (Strg+M,
 * Strg+K, Strg+E) hängen weiter an der Tabelle und ändern sich nicht. Die
 * Leiste selbst ist der allgemeine Baustein `Auswahlleiste.tsx`, den auch
 * Funkplan und Anforderungen nutzen; hier stehen nur die Schritte.
 */

import type { Tabellenzeile } from "@s1/domaene";

import { Auswahlleiste, Knopf, type Leistenknopf } from "./Auswahlleiste.js";
import { Kontextmenue, Menueeintrag, type Kontextort } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";
import type { Einheitenmarkierung } from "./useEinheitenmarkierung.js";

export interface Auswahlschritt {
  readonly maske: Exclude<Einheitenmaske, undefined>;
  /** Beschriftung in der Leiste. */
  readonly text: string;
  /** Beschriftung im Kontextmenü (mit „…", wo eine Maske folgt). */
  readonly menuetext: string;
  readonly kurz?: string;
  readonly titel?: string;
  /** Steht grau da, mit diesem Grund. */
  readonly sperre?: string;
  readonly rot?: boolean;
}

function kurz(name: string): string {
  return kuerzelText(kuerzel(name) as never);
}

/** Die Schritte, die mit `anzahl` gewählten Zeilen gehen — in der Reihenfolge der Leiste. */
export function auswahlschritte(anzahl: number): readonly Auswahlschritt[] {
  if (anzahl === 0) return [];
  const eine = anzahl === 1;
  const schritte: (Auswahlschritt | false)[] = [
    { maske: "verschieben", text: "Verschieben", menuetext: "Verschieben …", kurz: kurz("verschieben") },
    eine && { maske: "aufteilen", text: "Aufteilen", menuetext: "Aufteilen …" },
    { maske: "zusammenfuehren", text: "Zusammenführen", menuetext: "Zusammenführen …", ...(eine ? { sperre: "Zwei Einheiten wählen" } : {}) },
    eine && {
      maske: "kopieren",
      text: "Kopieren",
      menuetext: "Kopieren",
      kurz: kurz("kopieren"),
      titel: "Markierte Zeile als neue, angeforderte Einheit kopieren",
    },
    eine && { maske: "abloesung", text: "Ablösung anfordern", menuetext: "Ablösung anfordern …" },
    eine && {
      maske: "funk",
      text: "Funk …",
      menuetext: "Funk und Erreichbarkeit …",
      titel: "Funk und Erreichbarkeit der markierten Einheit bearbeiten",
    },
    {
      maske: "erfassungsboegen",
      text: "Erfassungsbögen",
      menuetext: "Erfassungsbögen speichern …",
      titel: "Erfassungsbögen der markierten Einheiten als eine Datei speichern",
    },
    eine && { maske: "entfernen", text: "Entfernen", menuetext: "Entfernen …", kurz: kurz("entfernen"), rot: true },
  ];
  return schritte.filter((schritt): schritt is Auswahlschritt => schritt !== false);
}

/** Die Schritte, die nichts in die Akte schreiben und im beendeten Einsatz bleiben. */
const LESENDE: ReadonlySet<Einheitenmaske> = new Set<Einheitenmaske>(["erfassungsboegen"]);

/** Die Schritte für `anzahl` Zeilen — im beendeten Einsatz nur die lesenden. */
export function erlaubteSchritte(anzahl: number, nurLesen: boolean): readonly Auswahlschritt[] {
  const alle = auswahlschritte(anzahl);
  return nurLesen ? alle.filter((schritt) => LESENDE.has(schritt.maske)) : alle;
}

/** „1 gewählt · FGr WP 1" oder „2 gewählt". */
export function auswahltitel(gewaehlte: readonly Tabellenzeile[], anzahl: number): string {
  const erste = gewaehlte[0];
  return anzahl === 1 && erste !== undefined ? `1 gewählt · ${erste.anzeige}` : `${String(anzahl)} gewählt`;
}

export interface EinheitenauswahlEigenschaften {
  /** Die markierten Zeilen, soweit sie im Ausschnitt stehen. */
  readonly gewaehlte: readonly Tabellenzeile[];
  /** Wie viele markiert sind — auch außerhalb des Ausschnitts. */
  readonly anzahl: number;
  readonly nurLesen: boolean;
  readonly aufMaske: (maske: Einheitenmaske) => void;
}

/** Die Schritte als Knöpfe der allgemeinen Leiste. */
function leistenknoepfe(schritte: readonly Auswahlschritt[], aufMaske: (maske: Einheitenmaske) => void): readonly Leistenknopf[] {
  return schritte.map((schritt) => ({
    schluessel: schritt.maske,
    text: schritt.text,
    ...(schritt.kurz === undefined ? {} : { kurz: schritt.kurz }),
    ...(schritt.titel === undefined ? {} : { titel: schritt.titel }),
    ...(schritt.sperre === undefined ? {} : { sperre: schritt.sperre }),
    ...(schritt.rot === undefined ? {} : { rot: schritt.rot }),
    aufWahl: () => {
      aufMaske(schritt.maske);
    },
  }));
}

/** Die Leiste am Fuß der Karte; ohne Auswahl steht nichts davon im Dokument. */
export function Einheitenleiste({ gewaehlte, anzahl, nurLesen, aufMaske }: EinheitenauswahlEigenschaften): React.JSX.Element | null {
  if (anzahl === 0) return null;
  const knoepfe = leistenknoepfe(erlaubteSchritte(anzahl, nurLesen), aufMaske);
  // Im beendeten Einsatz steht der Sperrsatz statt der Knöpfe; die lesenden folgen ihm.
  return (
    <Auswahlleiste
      titel={auswahltitel(gewaehlte, anzahl)}
      knoepfe={knoepfe}
      sperrtext={nurLesen ? `${TEXT_NUR_LESEN}: Verschieben, Aufteilen, Kopieren und Entfernen sind gesperrt.` : undefined}
      dazu={nurLesen ? knoepfe.map((knopf) => <Knopf key={knopf.schluessel} knopf={knopf} />) : undefined}
    />
  );
}

export interface EinheitenkontextmenueEigenschaften extends EinheitenauswahlEigenschaften {
  readonly ort: Kontextort;
  readonly aufSchliessen: () => void;
  /** Wählt die Einheit und schlägt das Blatt Tagebuch auf; fehlt er, fehlt der Eintrag. */
  readonly aufTagebuch?: (() => void) | undefined;
}

/** Dieselben Schritte als Kontextmenü an der Zeile, dazu „Im Tagebuch zeigen". */
export function Einheitenkontextmenue({
  ort,
  aufSchliessen,
  aufTagebuch,
  gewaehlte,
  anzahl,
  nurLesen,
  aufMaske,
}: EinheitenkontextmenueEigenschaften): React.JSX.Element {
  const schritte = erlaubteSchritte(anzahl, nurLesen);
  const HINTEN: readonly Einheitenmaske[] = ["abloesung", "funk", "erfassungsboegen"];
  const vorne = schritte.filter((schritt) => schritt.maske !== "entfernen" && !HINTEN.includes(schritt.maske));
  const hinten = schritte.filter((schritt) => HINTEN.includes(schritt.maske));
  const entfernen = schritte.find((schritt) => schritt.maske === "entfernen");
  const mitTagebuch = aufTagebuch !== undefined && anzahl === 1;
  const mitteTrennen = vorne.length > 0 && (hinten.length > 0 || mitTagebuch);
  return (
    <Kontextmenue
      ort={ort}
      beschriftung={auswahltitel(gewaehlte, anzahl)}
      aufSchliessen={aufSchliessen}
      inhalt={(waehle) => {
        const eintrag = (schritt: Auswahlschritt): React.JSX.Element => (
          <Menueeintrag
            key={schritt.maske}
            text={schritt.menuetext}
            kurz={schritt.kurz}
            titel={schritt.titel}
            sperre={schritt.sperre}
            rot={schritt.rot}
            aufWahl={waehle(() => {
              aufMaske(schritt.maske);
            })}
          />
        );
        return (
          <>
            <span className="titel" role="presentation">
              {auswahltitel(gewaehlte, anzahl)}
            </span>
            {nurLesen && <span className="hinweis" role="presentation">{TEXT_NUR_LESEN}</span>}
            {vorne.map(eintrag)}
            {mitteTrennen && <hr />}
            {hinten.map(eintrag)}
            {mitTagebuch && <Menueeintrag text="Im Tagebuch zeigen" aufWahl={waehle(aufTagebuch)} />}
            {entfernen !== undefined && <hr />}
            {entfernen !== undefined && eintrag(entfernen)}
          </>
        );
      }}
    />
  );
}

export interface AuswahlbereichEigenschaften {
  readonly markierung: Einheitenmarkierung;
  readonly gewaehlte: readonly Tabellenzeile[];
  readonly nurLesen: boolean;
  readonly aufMaske: (maske: Einheitenmaske) => void;
  readonly aufTagebuch?: ((einheitId: string) => void) | undefined;
}

/** Leiste und Kontextmenü zusammen, wie die Tabelle sie einhängt. */
export function Auswahlbereich({ markierung, gewaehlte, nurLesen, aufMaske, aufTagebuch }: AuswahlbereichEigenschaften): React.JSX.Element {
  const auswahl = { gewaehlte, anzahl: markierung.markiert.length, nurLesen, aufMaske };
  const erste = gewaehlte[0];
  return (
    <>
      <Einheitenleiste {...auswahl} />
      {markierung.kontext !== undefined && (
        <Einheitenkontextmenue
          {...auswahl}
          ort={markierung.kontext}
          aufSchliessen={markierung.schliesseKontext}
          aufTagebuch={aufTagebuch === undefined || erste === undefined ? undefined : () => { aufTagebuch(erste.einheitId); }}
        />
      )}
    </>
  );
}
