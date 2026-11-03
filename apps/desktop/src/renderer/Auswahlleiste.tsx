/**
 * Die Auswahlleiste — ein Baustein für jede Karte, deren Zeilen man wählt
 * (Entwurf „Entlastung", Leitsatz 2, Optionen 6c und 6f).
 *
 * Am Fuß der Karte, sobald etwas gewählt ist: links der Titel („1 gewählt ·
 * FGr WP 1"), daneben die Schritte, die mit dieser Auswahl gehen, rechts
 * „Esc hebt die Auswahl auf". Ohne Auswahl steht nichts davon im Dokument,
 * auch nicht grau. Was die Schritte sind, sagt die Karte als Daten
 * ({@link Leistenknopf}); die Leiste zeichnet sie nur. So sehen
 * Einheitentabelle, Funkplan und Anforderungen gleich aus und bedienen sich
 * gleich.
 *
 * {@link Auswahlkontextmenue} zeigt dieselben Knöpfe als Kontextmenü an der
 * Zeile, mit dem Titel oben und dem folgenreichen Schritt abgesetzt unten.
 */

import { Kontextmenue, Menueeintrag, type Kontextort } from "./Klappmenue.js";

export interface Leistenknopf {
  /** Eindeutig in der Leiste (React-Schlüssel). */
  readonly schluessel: string;
  /** Beschriftung in der Leiste. */
  readonly text: string;
  /** Beschriftung im Kontextmenü, falls anders (mit „…", wo eine Maske folgt). */
  readonly menuetext?: string;
  /** Das Kürzel, rechts in Mono. */
  readonly kurz?: string;
  readonly titel?: string;
  /** Steht grau da, mit diesem Grund. */
  readonly sperre?: string;
  /** Folgenreich (Entfernen, Auflösen, Stornieren): Warnfarbe, abgesetzt. */
  readonly rot?: boolean;
  /** Der Hauptweg dieser Auswahl: gefüllt. */
  readonly haupt?: boolean;
  readonly aufWahl: () => void;
}

export interface AuswahlleisteEigenschaften {
  /** „1 gewählt · FGr WP 1" — steht fett vorn. */
  readonly titel: string;
  readonly knoepfe: readonly Leistenknopf[];
  /** Statt der Knöpfe ein Satz, warum es keine gibt (beendeter Einsatz). */
  readonly sperrtext?: string | undefined;
  /** Name für Vorleseprogramme; Vorgabe „Auswahl". */
  readonly beschriftung?: string;
  /** Der Satz rechts; `null` lässt ihn weg (wo Esc nichts aufhebt). */
  readonly schluss?: string | null;
}

function knopftitel(knopf: Leistenknopf): string {
  if (knopf.sperre !== undefined) return knopf.sperre;
  return [knopf.titel, knopf.kurz === undefined ? undefined : `(${knopf.kurz})`].filter(Boolean).join(" ");
}

function klasse(knopf: Leistenknopf): string | undefined {
  if (knopf.rot === true) return "entfernen";
  return knopf.haupt === true ? "haupt" : undefined;
}

function Knopf({ knopf }: { readonly knopf: Leistenknopf }): React.JSX.Element {
  return (
    <button
      type="button"
      className={klasse(knopf)}
      aria-disabled={knopf.sperre === undefined ? undefined : true}
      title={knopftitel(knopf)}
      onClick={knopf.sperre === undefined ? knopf.aufWahl : undefined}
    >
      {knopf.text}
      {knopf.kurz !== undefined && (
        <span className="kurz" aria-hidden="true">
          {knopf.kurz}
        </span>
      )}
    </button>
  );
}

/** Die Leiste am Fuß der Karte. Die Karte hängt sie nur ein, solange etwas gewählt ist. */
export function Auswahlleiste({
  titel,
  knoepfe,
  sperrtext,
  beschriftung = "Auswahl",
  schluss = "Esc hebt die Auswahl auf",
}: AuswahlleisteEigenschaften): React.JSX.Element {
  return (
    <div role="toolbar" aria-label={beschriftung} className="auswahlleiste">
      <strong className="auswahlzahl">{titel}</strong>
      {sperrtext === undefined ? (
        knoepfe.map((knopf) => <Knopf key={knopf.schluessel} knopf={knopf} />)
      ) : (
        <span className="auswahlsperre">{sperrtext}</span>
      )}
      {schluss !== null && <span className="auswahlschluss">{schluss}</span>}
    </div>
  );
}

export interface AuswahlkontextmenueEigenschaften {
  readonly ort: Kontextort;
  readonly titel: string;
  readonly knoepfe: readonly Leistenknopf[];
  readonly sperrtext?: string | undefined;
  readonly aufSchliessen: () => void;
}

/** Dieselben Knöpfe als Kontextmenü; die folgenreichen stehen nach einem Strich unten. */
export function Auswahlkontextmenue({ ort, titel, knoepfe, sperrtext, aufSchliessen }: AuswahlkontextmenueEigenschaften): React.JSX.Element {
  const sichtbar = sperrtext === undefined ? knoepfe : [];
  const vorne = sichtbar.filter((knopf) => knopf.rot !== true);
  const hinten = sichtbar.filter((knopf) => knopf.rot === true);
  return (
    <Kontextmenue
      ort={ort}
      beschriftung={titel}
      aufSchliessen={aufSchliessen}
      inhalt={(waehle) => {
        const eintrag = (knopf: Leistenknopf): React.JSX.Element => (
          <Menueeintrag
            key={knopf.schluessel}
            text={knopf.menuetext ?? knopf.text}
            kurz={knopf.kurz}
            titel={knopf.titel}
            sperre={knopf.sperre}
            rot={knopf.rot}
            aufWahl={waehle(knopf.aufWahl)}
          />
        );
        return (
          <>
            <span className="titel" role="presentation">
              {titel}
            </span>
            {sperrtext !== undefined && (
              <span className="hinweis" role="presentation">
                {sperrtext}
              </span>
            )}
            {vorne.map(eintrag)}
            {vorne.length > 0 && hinten.length > 0 && <hr />}
            {hinten.map(eintrag)}
          </>
        );
      }}
    />
  );
}
