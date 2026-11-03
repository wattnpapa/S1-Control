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
 * Die Sperrregeln sind dieselben wie vorher im Kopf; die Kürzel (Strg+M,
 * Strg+K, Strg+E) hängen weiter an der Tabelle und ändern sich nicht.
 */

import type { Tabellenzeile } from "@s1/domaene";

import { Kontextmenue, Menueeintrag, type Kontextort } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";

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
    eine && { maske: "entfernen", text: "Entfernen", menuetext: "Entfernen …", kurz: kurz("entfernen"), rot: true },
  ];
  return schritte.filter((schritt): schritt is Auswahlschritt => schritt !== false);
}

/** „1 gewählt · FGr WP 1" oder „2 gewählt". */
export function auswahltitel(gewaehlte: readonly Tabellenzeile[], anzahl: number): string {
  const erste = gewaehlte[0];
  return anzahl === 1 && erste !== undefined ? `1 gewählt · ${erste.anzeige}` : `${String(anzahl)} gewählt`;
}

export interface AuswahlleisteEigenschaften {
  /** Die markierten Zeilen, soweit sie im Ausschnitt stehen. */
  readonly gewaehlte: readonly Tabellenzeile[];
  /** Wie viele markiert sind — auch außerhalb des Ausschnitts. */
  readonly anzahl: number;
  readonly nurLesen: boolean;
  readonly aufMaske: (maske: Einheitenmaske) => void;
}

/** Die Leiste am Fuß der Karte; ohne Auswahl steht nichts davon im Dokument. */
export function Auswahlleiste({ gewaehlte, anzahl, nurLesen, aufMaske }: AuswahlleisteEigenschaften): React.JSX.Element | null {
  if (anzahl === 0) return null;
  return (
    <div role="toolbar" aria-label="Auswahl" className="auswahlleiste">
      <strong className="auswahlzahl">{auswahltitel(gewaehlte, anzahl)}</strong>
      {nurLesen ? (
        <span className="auswahlsperre">{TEXT_NUR_LESEN}: Verschieben, Aufteilen, Kopieren und Entfernen sind gesperrt.</span>
      ) : (
        auswahlschritte(anzahl).map((schritt) => (
          <button
            key={schritt.maske}
            type="button"
            className={schritt.rot === true ? "entfernen" : undefined}
            aria-disabled={schritt.sperre === undefined ? undefined : true}
            title={schritt.sperre ?? [schritt.titel, schritt.kurz === undefined ? undefined : `(${schritt.kurz})`].filter(Boolean).join(" ")}
            onClick={
              schritt.sperre === undefined
                ? () => {
                    aufMaske(schritt.maske);
                  }
                : undefined
            }
          >
            {schritt.text}
            {schritt.kurz !== undefined && (
              <span className="kurz" aria-hidden="true">
                {schritt.kurz}
              </span>
            )}
          </button>
        ))
      )}
      <span className="auswahlschluss">Esc hebt die Auswahl auf</span>
    </div>
  );
}

export interface EinheitenkontextmenueEigenschaften extends AuswahlleisteEigenschaften {
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
  const schritte = nurLesen ? [] : auswahlschritte(anzahl);
  const vorne = schritte.filter((schritt) => !["abloesung", "funk", "entfernen"].includes(schritt.maske));
  const hinten = schritte.filter((schritt) => ["abloesung", "funk"].includes(schritt.maske));
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
