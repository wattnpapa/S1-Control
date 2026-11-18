/**
 * Sätze, die die Nachrichtenmaske sichtbar sagt, statt sie in Tooltips zu
 * verstecken — eigene Datei, damit `Nachrichtenmaske.tsx` unter der
 * Strukturgrenze bleibt (AGENTS.md §6).
 *
 * - **Antwort** (R2-FaBe P1-3): „Antworten“ schreibt eine Funkzeile für die
 *   Fernmeldezentrale. Der Fachberater wusste das nicht und hielt seine
 *   Zusage für „weg“, als sie noch vor der FmZ lag. Die Maske sagt es jetzt:
 *   „Diese Antwort geht über die Fernmeldezentrale an <Gegenstelle>.“
 * - **Gesprächsnotiz** (R2-FaBe P1-5): Das Kästchen schaltet Laufzettel und
 *   Verteiler ein, ohne zu sagen, was es ist. Eine Zeile sagt es jetzt, und
 *   unter „Selbst verteilen | An den Sichter“ steht, was die Wahl bedeutet.
 * - **Zurückgestellter Entwurf** (R2-FaBe P3-4): Wer mit „Abbrechen“
 *   geschlossen hat, findet seinen Entwurf beim nächsten Öffnen wieder; die
 *   Maske sagt, dass er es ist.
 */

import { uhrzeitText } from "@s1/domaene";

import type { Maskenwerte } from "./nachrichtenformate.js";

/** Der Satz zur Gesprächsnotiz (R2-FaBe P1-5). */
export const TEXT_NOTIZ = "Gesprächsnotiz: geht nicht an die FmZ; hält ein Gespräch fest. Anschrift = Gesprächspartner.";

/** Was „Selbst verteilen“ und „An den Sichter“ bedeuten (R2-FaBe P1-5). */
export const TEXT_SELBST_VERTEILEN = "Selbst verteilen: Sie bestimmen im Laufzettel unten, wer die Notiz bearbeitet (grün) und wer Bescheid wissen soll (blau); S2 bekommt Rot.";
export const TEXT_AN_SICHTER = "An den Sichter: Die Notiz läuft wie ein Eingang zum Sichter, der sie verteilt; Sie tragen keinen Verteiler ein.";

/** „Diese Antwort geht über die Fernmeldezentrale an OV Wildeshausen.“ (R2-FaBe P1-3) */
export function antwortsatz(anschrift: string): string {
  const an = anschrift.trim();
  return an === "" ? "Diese Antwort geht über die Fernmeldezentrale." : `Diese Antwort geht über die Fernmeldezentrale an ${an}.`;
}

/** Die Zeile über dem Vordruck: zur Antwort oder zur Gesprächsnotiz; sonst nichts. */
export function Maskenhinweis({ werte }: { readonly werte: Maskenwerte }): React.JSX.Element | null {
  if (werte.gespraechsnotiz) {
    return (
      <p className="hinweistext maskenhinweis" role="note">
        {TEXT_NOTIZ}
      </p>
    );
  }
  if (werte.antwortAuf === undefined) return null;
  return (
    <p className="hinweistext maskenhinweis" role="note">
      {antwortsatz(werte.anschrift)}
    </p>
  );
}

/** Die Erklärung unter dem Schalter der Gesprächsnotiz, je nach Wahl. */
export function Verteilerklaerung({ selbst }: { readonly selbst: boolean }): React.JSX.Element {
  return <p className="hinweistext">{selbst ? TEXT_SELBST_VERTEILEN : TEXT_AN_SICHTER}</p>;
}

/** „Ihr Entwurf von 10:45 ist wiederhergestellt.“ — nach „Abbrechen“ und erneutem Öffnen. */
export function Entwurfszeile({ zeit }: { readonly zeit: number | undefined }): React.JSX.Element | null {
  if (zeit === undefined) return null;
  return (
    <p className="hinweistext" role="status">
      Ihr Entwurf von {uhrzeitText(zeit)} ist wiederhergestellt; „Verwerfen“ löscht ihn.
    </p>
  );
}
