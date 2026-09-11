/**
 * Die Schale eines Web-Arbeitsplatzes — dieselbe {@link Vermittlung} wie auf
 * dem Desktop, nur anders verdrahtet.
 *
 * Was hier anders ist als in `main.ts`, und warum:
 *
 *  * **Das Profil liegt je Arbeitsplatz unter der Datenwurzel des Dienstes**
 *    (`arbeitsplaetze/<kennung>/`), nicht im Benutzerprofil des Rechners.
 *    Der Dienst laeuft unter einem Konto fuer alle; das Verzeichnis muss den
 *    Browser unterscheiden, nicht den Anmeldenamen.
 *  * **Der Share-Pfad ist fest.** Er kommt vom Dienst, der den Share
 *    eingehaengt hat, und ein Browser kann ihn nicht umstellen — sonst
 *    koennte jeder Bediener den Dienst auf ein beliebiges Verzeichnis des
 *    Servers lenken. `einstellungenSetzen` behaelt den Anzeigenamen und
 *    ueberschreibt den Pfad.
 *  * **Der Akteur ist der Anzeigename.** Auf dem Desktop steht das
 *    Benutzerkonto des Rechners im Ereignis; ein Browser hat keines. Der
 *    Anzeigename ist das Einzige, was der Bediener ueber sich gesagt hat, und
 *    er ist fuer das Einsatztagebuch besser als „node".
 *
 * Ansonsten gilt alles, was fuer den Desktop gilt: ein Worker je offener
 * Akte, kein Fachzustand ausserhalb des Workers, keine Faltung hier.
 */

import { createHash } from "node:crypto";
import path from "node:path";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof, type ArbeiterFabrik } from "../main/arbeiterhof.js";
import type { Netzholer } from "../main/programmbezug.js";
import { Vermittlung, type Fenstersteuerung } from "../main/vermittlung.js";
import type { Antwort, Einstellungen, Protokollzeile, Ruf } from "../kontrakt/index.js";
import type { Arbeitsplatzschale, Schalenfabrik } from "./arbeitsplaetze.js";

export interface SchalenOptionen {
  /** Der eingehaengte Share — fuer alle Arbeitsplaetze derselbe. */
  readonly sharePfad: string;
  /** Wo Profile und Spiegel der Arbeitsplaetze liegen. */
  readonly datenwurzel: string;
  readonly arbeiterFabrik: ArbeiterFabrik;
  readonly programmversion: string;
  readonly rechnername: string;
  readonly protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void;
  /** Ort und letzte Zeilen des Protokolls — fuer die Diagnoseansicht (M7.3). */
  readonly protokolldatei?: string;
  readonly letzteMeldungen?: () => readonly Protokollzeile[];
  /** Der Griff ins Netz fuer das Programmpaket (M9.1); im Container meist vorhanden. */
  readonly netz?: Netzholer;
}

/**
 * Die Fenstersteuerung eines Browsers: Es gibt keine.
 *
 * Der Staerke-Monitor ist dieselbe Seite mit dem Fragment `#monitor`; ein
 * Browser oeffnet sie selbst in einem zweiten Reiter oder auf einem zweiten
 * Geraet. Die drei Monitorrufe antworten deshalb mit dem Weg dorthin statt
 * mit „nicht eingerichtet".
 */
const BROWSER_FENSTER: Fenstersteuerung = {
  bildschirme: () => [],
  monitorOeffnen: () => {
    throw new Error(
      "Im Browser öffnet sich der Monitor nicht als Fenster: dieselbe Adresse mit „#monitor“ in einem neuen Reiter oder auf dem Anzeigegerät aufrufen.",
    );
  },
  monitorSchliessen: () => undefined,
};

/**
 * Der Ordnername eines Arbeitsplatzes.
 *
 * Nicht der Schluessel selbst: Er ist das Geheimnis aus dem Cookie, und ein
 * Verzeichnisname taucht in Protokollen, Diagnoseansichten und
 * Fehlermeldungen auf. Der Hash reicht, um den Arbeitsplatz wiederzufinden,
 * und verraet nichts, womit sich ein Browser als dieser Arbeitsplatz ausgeben
 * koennte.
 */
export function arbeitsplatzOrdner(schluessel: string): string {
  return createHash("sha256").update(schluessel).digest("hex").slice(0, 32);
}

export function webSchalenfabrik(o: SchalenOptionen): Schalenfabrik {
  return (schluessel, sende): Arbeitsplatzschale => {
    const ordner = path.join(o.datenwurzel, "arbeitsplaetze", arbeitsplatzOrdner(schluessel));
    const hof = new Arbeiterhof({ fabrik: o.arbeiterFabrik, sende });
    const vermittlung = new Vermittlung({
      hof,
      dateisystem: knotenDateisystem(),
      einstellungsdatei: path.join(ordner, "einstellungen.json"),
      spiegelwurzel: path.join(ordner, "spiegel"),
      plattform: "web",
      electron: "keine",
      programmversion: o.programmversion,
      rechnername: o.rechnername,
      benutzer: (platz) => (platz.anzeigename.length > 0 ? platz.anzeigename : "Web-Arbeitsplatz"),
      vorbelegterShare: o.sharePfad,
      protokolliere: o.protokolliere,
      fenstersteuerung: BROWSER_FENSTER,
      // Kein `drucker`: Ein PDF entsteht ueber `printToPDF`, also in Electron.
      // Die Vermittlung meldet das je Ruf; HTML und XLSX gehen auch hier.
      ...(o.protokolldatei === undefined ? {} : { protokolldatei: o.protokolldatei }),
      ...(o.letzteMeldungen === undefined ? {} : { letzteMeldungen: o.letzteMeldungen }),
      ...(o.netz === undefined ? {} : { netz: o.netz }),
    });

    // Ein Arbeitsplatz, der schon einmal lief, hat den Share-Pfad in seiner
    // Einstellungsdatei — den von damals. Wird der Share woanders
    // eingehaengt, muss der neue Pfad gelten, nicht der gemerkte.
    let bereit: Promise<void> | undefined;
    const sharePruefen = async (): Promise<void> => {
      const antwort = await vermittlung.beantworte({ art: "einstellungenLesen" });
      if (!antwort.ok) return;
      const gemerkt = antwort.wert as Einstellungen;
      if (gemerkt.sharePfad === o.sharePfad) return;
      await vermittlung.beantworte({
        art: "einstellungenSetzen",
        einstellungen: { ...gemerkt, sharePfad: o.sharePfad },
      });
    };

    return {
      async beantworte(ruf: Ruf): Promise<Antwort<unknown>> {
        bereit ??= sharePruefen();
        await bereit;
        return vermittlung.beantworte(mitFestemShare(ruf, o.sharePfad));
      },
      schliesse: () => hof.alleSchliessen(),
    };
  };
}

/** Ersetzt in `einstellungenSetzen` den Share-Pfad durch den des Dienstes. */
function mitFestemShare(ruf: Ruf, sharePfad: string): Ruf {
  if (ruf.art !== "einstellungenSetzen") return ruf;
  return { ...ruf, einstellungen: { ...ruf.einstellungen, sharePfad } };
}
