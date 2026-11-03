/**
 * Die Zustandsmarke rechts oben im Kopfband (Entwurf „Entlastung", 3.1,
 * Optionen 6d und 6e).
 *
 * Sie ersetzt die Zustandszeile, die bis Runde 6 unter dem Wortbild stand und
 * Stand, Share und Arbeitsplätze ein zweites Mal sagte — die Statuszeile am
 * Fuß sagt es ohnehin. Oben bleibt **eine** Auskunft: Ist dem Bild zu
 * trauen? Drei Antworten, jede mit Zeichen **und** Wort, nie mit Farbe
 * allein:
 *
 *  * „✓ aktuell" — Dienst erreichbar, Share erreichbar;
 *  * „⚠ Share nicht erreichbar" — man arbeitet weiter, die anderen sehen es
 *    erst später (§1.3: der Normalpfad, kein Fehlerpfad);
 *  * „✖ Verbindung unterbrochen" — der Dienst antwortet nicht, das Bild
 *    altert. In den ersten Sekunden steht sie wie Banner und Statuszeile in
 *    Bernstein mit „⚠", erst ab der roten Stufe in Rot mit „✖".
 *
 * Die Ausführung — Stand, Share, Arbeitsplätze, seit wann unterbrochen —
 * steht im Tooltip und als Beschreibung für Vorlesegeräte. Quelle ist
 * dieselbe wie bei Banner und Statuszeile: `useVerbindungsstatus()` und
 * `lagebild.shareErreichbar`.
 */

import type { Lagebild } from "../kontrakt/index.js";
import { aktiveArbeitsplaetze, weitereText } from "./arbeitsplatzzahl.js";
import { alter, bytes } from "./Statuszeile.js";
import { useVerbindungsstatus } from "./useVerbindungsstatus.js";
import { unterbrochenText, type Verbindungsstatus } from "./verbindung.js";

export interface Markenbild {
  readonly ton: "ok" | "warnung" | "fehler";
  /** Zeichen und Wort, so wie sie in der Marke stehen. */
  readonly text: string;
  /** Die Ausführung für Tooltip und Vorlesegerät. */
  readonly erklaerung: string;
}

/** „BEENDET — Eingaben gesperrt“ oder „ARCHIVIERT — nur lesen“; leer im laufenden Einsatz. */
export function abschlussText(lagebild: Lagebild | undefined): string {
  if (lagebild?.einsatzStatus === "ARCHIVIERT") return "ARCHIVIERT — nur lesen";
  if (lagebild?.einsatzStatus === "BEENDET") return "BEENDET — Eingaben gesperrt";
  return "";
}

function standText(lagebild: Lagebild, jetzt: number): string {
  return lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt);
}

function arbeitsplatzText(lagebild: Lagebild): string {
  const aktiv = aktiveArbeitsplaetze(lagebild);
  return aktiv > 0 ? weitereText(aktiv) : "allein am Einsatz";
}

type Unterbrochen = Extract<Verbindungsstatus, { zustand: "unterbrochen" }>;

function unterbrochenBild(lagebild: Lagebild | undefined, verbindung: Unterbrochen, jetzt: number): Markenbild {
  const rot = verbindung.stufe === "rot";
  const seit = unterbrochenText(verbindung.seitMs);
  return {
    ton: rot ? "fehler" : "warnung",
    text: `${rot ? "✖" : "⚠"} Verbindung unterbrochen`,
    erklaerung:
      lagebild === undefined
        ? seit
        : `${seit} — Stand ${standText(lagebild, jetzt)} (veraltet), Share und Arbeitsplätze unbekannt`,
  };
}

function shareBild(lagebild: Lagebild, stand: string): Markenbild {
  const grund = lagebild.shareMeldung === undefined ? "" : ` — ${lagebild.shareMeldung}`;
  const rest =
    lagebild.unuebertrageneBytes > 0 ? ` · ${bytes(lagebild.unuebertrageneBytes)} noch nicht übertragen` : "";
  return {
    ton: "warnung",
    text: "⚠ Share nicht erreichbar",
    erklaerung: `${stand} · Share nicht erreichbar${grund}${rest} · Sie können weiterarbeiten`,
  };
}

/** Was die Marke zeigt — `undefined`, wenn sie nichts zu sagen hat (kein Einsatz, Verbindung gut). */
export function markenbild(
  lagebild: Lagebild | undefined,
  verbindung: Verbindungsstatus,
  jetzt: number,
): Markenbild | undefined {
  if (verbindung.zustand === "unterbrochen") return unterbrochenBild(lagebild, verbindung, jetzt);
  if (lagebild === undefined) return undefined;
  const stand = `Stand ${standText(lagebild, jetzt)}`;
  if (!lagebild.shareErreichbar) return shareBild(lagebild, stand);
  return {
    ton: "ok",
    text: "✓ aktuell",
    erklaerung: `${stand} · Share erreichbar · ${arbeitsplatzText(lagebild)}`,
  };
}

export function Zustandsmarke({
  lagebild,
  jetzt,
}: {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
}): React.JSX.Element | null {
  const verbindung = useVerbindungsstatus();
  const bild = markenbild(lagebild, verbindung, jetzt);
  if (bild === undefined) return null;
  return (
    <span className={`zustandsmarke ${bild.ton}`} title={bild.erklaerung} aria-description={bild.erklaerung}>
      {bild.text}
    </span>
  );
}
