/**
 * Die Bearbeitung in der Zelle der Einheitentabelle (M3.2, M3.6).
 *
 * Höchstens eine Zelle ist offen. Geöffnet wird mit Doppelklick (oder Tipp
 * auf den Statuschip), nachdem die Sperre eines Kollegen geprüft ist;
 * geschrieben wird mit dem Wert, den **dieses Fenster** beim Öffnen gesehen
 * hat (§2.2a, Auflage 6). Geschlossen wird nur nach bestätigtem Schreiben —
 * sonst bleibt der Text stehen, und die Zelle sagt, warum.
 *
 * Aus `Einheitentabelle.tsx` herausgelöst (Entwurf „Entlastung", Schnitt
 * E2), damit die Tabelle Rahmen und Auswahl bleibt und diese Regeln an einer
 * Stelle stehen.
 */

import { useCallback, useState } from "react";

import type { Spalte, Tabellenzeile } from "@s1/domaene";

import { UNGUELTIGE_EINGABE, eingabeAlsWert, inlineEntwurf } from "../kontrakt/bedienschritte.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { VORWERT_WAHL, istVorwertKonflikt, mitVorwertpruefung, useEditorbasis } from "./Editorbasis.js";
import { useLaden } from "./laden.js";
import { useSperreHalten, type Fremdsperren } from "./useBearbeitungssperre.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";

export interface OffeneZelle {
  readonly zeile: string;
  readonly spalte: string;
}

export interface Zellbearbeitung {
  readonly offen: OffeneZelle | undefined;
  /** Die Regel, gegen die die offene Zelle verstößt — sie bleibt offen, bis sie stimmt oder verworfen wird. */
  readonly fehler: string | undefined;
  /** Ohne Verbindung: der Grund; „Übernehmen" ist gesperrt, der Text bleibt stehen. */
  readonly verbindungssperre: string | undefined;
  starte(zeile: Tabellenzeile, spalte: Spalte): void;
  schreibe(zeile: Tabellenzeile, spalte: Spalte, eingabe: string): Promise<void>;
  verwirf(zeile: Tabellenzeile, spalte: Spalte): void;
  schliesse(): void;
}

function regelText(spalte: Spalte): string {
  return spalte.art === "staerke"
    ? "Stärke als Fü/UFü/He, z. B. 0/1/8"
    : "Zeit als TT.MM.JJJJ HH:MM, „29.10. 14:30“ oder „14:30“ (heute)";
}

/**
 * @param fremd Die Sperren der Kollegen („wird bearbeitet").
 * @param aufGeschrieben Nach jedem bestätigten Schreiben einer Zelle.
 */
export function useZellbearbeitung(fremd: Fremdsperren, aufGeschrieben?: () => void): Zellbearbeitung {
  const laden = useLaden();
  const basis = useEditorbasis();
  const verbindungssperre = useSchreibsperre();
  const [offen, setzeOffen] = useState<OffeneZelle | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);
  // Datensatz-Sperre: Solange ein Editor offen ist, sehen die Kollegen „wird bearbeitet“.
  useSperreHalten(offen?.zeile);

  const schliesse = useCallback(() => {
    setzeOffen(undefined);
  }, []);

  function starte(zeile: Tabellenzeile, spalte: Spalte): void {
    const gesperrt = fremd.pruefeStart(zeile.einheitId);
    if (gesperrt !== undefined) {
      // Ein anderer Arbeitsplatz bearbeitet diese Einheit: erst Hinweis, dann bewusstes Übernehmen.
      laden.melde("warnung", gesperrt);
      return;
    }
    setzeFehler(undefined);
    basis.merke(`${zeile.einheitId}/${spalte.schluessel}`, zeile.zellen[spalte.schluessel]?.wert);
    setzeOffen({ zeile: zeile.einheitId, spalte: spalte.schluessel });
  }

  function verwirf(zeile: Tabellenzeile, spalte: Spalte): void {
    basis.vergiss(`${zeile.einheitId}/${spalte.schluessel}`);
    setzeFehler(undefined);
    setzeOffen(undefined);
  }

  async function schreibe(zeile: Tabellenzeile, spalte: Spalte, eingabe: string): Promise<void> {
    const neu = eingabeAlsWert(spalte, eingabe);
    // Nicht schließen, nichts schreiben: Die Regel steht an der Zelle, und Escape verwirft wie immer.
    if (neu === UNGUELTIGE_EINGABE) return void setzeFehler(regelText(spalte));
    // Kein stummes Verwerfen: Der Text bleibt in der Zelle, der Grund steht dabei.
    if (verbindungssperre !== undefined) return void setzeFehler(verbindungssperre);
    setzeFehler(undefined);
    const zelle = zeile.zellen[spalte.schluessel];
    const schluessel = `${zeile.einheitId}/${spalte.schluessel}`;
    // Nichts geändert, nichts geschrieben: Ein Ereignis, das denselben Wert
    // noch einmal setzt, steht für immer im Protokoll und erzeugt bei einem
    // zweiten Arbeitsplatz einen Konfliktkandidaten ohne fachlichen Anlass.
    const entwurf =
      zelle === undefined || JSON.stringify(neu) === JSON.stringify(zelle.wert)
        ? undefined
        : inlineEntwurf(spalte, zeile.einheitId, basis.vorwert(schluessel, zelle.wert), neu);
    if (entwurf === undefined) {
      basis.vergiss(schluessel);
      setzeOffen(undefined);
      return;
    }
    const ergebnis = await laden.bediene(mitVorwertpruefung(entwurf));
    if (istVorwertKonflikt(ergebnis)) {
      // Nicht still überschreiben: Die Zelle zeigt, was der Kollege gesetzt hat; ein
      // zweites Enter gilt dann dem neu geladenen Wert und übernimmt bewusst.
      basis.vergiss(schluessel);
      void laden.frischeAnsichten();
      setzeFehler(`${hinweisAusErgebnis(ergebnis) ?? ""} ${VORWERT_WAHL}`.trim());
      return;
    }
    const hinweis = hinweisAusErgebnis(ergebnis);
    if (hinweis !== undefined) return void setzeFehler(hinweis);
    basis.vergiss(schluessel);
    setzeOffen(undefined);
    aufGeschrieben?.();
  }

  return { offen, fehler, verbindungssperre, starte, schreibe, verwirf, schliesse };
}
