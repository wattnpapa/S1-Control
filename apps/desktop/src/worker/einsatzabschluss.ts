/**
 * Der Abschluss des Einsatzes im Worker: beenden, wiedereröffnen,
 * archivieren und die Einsatzakte.
 *
 * **Warum die Sperre hier steht und nicht in der Maske.** AGENTS.md §3 macht
 * archivierte Einsätze read-only, und zwar auf der Seite, die schreibt. Eine
 * Maske, die sich sperrt, ist Bequemlichkeit; maßgeblich ist, dass der
 * Worker keinen Entwurf mehr annimmt — auch keinen aus einer Zelle, die
 * nicht weiß, dass der Einsatz zu ist, und keinen aus „Rückgängig".
 *
 * **Warum beenden auch sperrt.** Ein beendeter Einsatz ist der Stand, den die
 * Excel mit „Speichern mit Einsatzname und Datum" festhält. Wer danach noch
 * etwas einträgt, ändert die Akte, die gerade abgeschlossen wurde; wer das
 * will, öffnet sie ausdrücklich wieder. Zugelassen bleiben deshalb nur die
 * Schritte des Abschlusses selbst.
 *
 * **Die Empfangsseite bleibt unberührt.** Ein Ereignis, das ein anderer
 * Arbeitsplatz nach der Archivierung geschrieben hat — weil er sie noch nicht
 * gelesen hatte —, faltet der Fold weiter und macht es als
 * `nachArchivierungEingegangen` sichtbar (KONZEPT-EREIGNISSE.md §7.3). Diese
 * Sperre verhindert nur, dass **dieser** Arbeitsplatz eines erzeugt.
 */

import path from "node:path";

import { zustandsHash, type KanonischerWert, type Zustand } from "@s1/domaene";
import { schreibeZip } from "@s1/ausgaben";
import { legeArchivAb, packeAkte, sha256Hex, type Dateisystem, type Ereignisentwurf } from "@s1/speicher";

import { CODE_EINSATZ_ABGESCHLOSSEN, type Akteergebnis, type Bedienergebnis } from "../kontrakt/index.js";
import { dateimarke } from "./dateimarke.js";

/** Was nach dem Einsatzende noch geschrieben werden darf: der Abschluss selbst. */
const NACH_DEM_ENDE: ReadonlySet<string> = new Set(["EinsatzBeendet", "EinsatzWiedereroeffnet", "EinsatzArchiviert"]);

/**
 * Was nach der Archivierung noch geschrieben werden darf: nur ihre Rücknahme.
 *
 * Die Oberfläche bietet sie nicht an — sie ist der im Katalog vorgesehene
 * Ausweg mit Pflichtgrund (§7.3), und eine Sperre, die ihn verriegelte, machte
 * ein versehentliches Archivieren unumkehrbar.
 */
const NACH_DER_ARCHIVIERUNG: ReadonlySet<string> = new Set(["ArchivierungZurueckgenommen"]);

function abgewiesen(meldung: string, code: string = CODE_EINSATZ_ABGESCHLOSSEN): Bedienergebnis {
  return { art: "abgewiesen", meldung, code, dauerhafterHinweis: false };
}

function istZeitpunkt(wert: unknown): boolean {
  return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}T/.test(wert) && !Number.isNaN(new Date(wert).getTime());
}

/**
 * Prüft einen Entwurf gegen den Zustand des Einsatzes — `undefined` heißt
 * „darf geschrieben werden".
 */
export function pruefeAbschluss(zustand: Zustand, entwurf: Ereignisentwurf): Bedienergebnis | undefined {
  const status = zustand.einsatz?.status ?? "AKTIV";
  if (status === "ARCHIVIERT" && !NACH_DER_ARCHIVIERUNG.has(entwurf.typ)) {
    return abgewiesen("Der Einsatz ist archiviert. Es kann nichts mehr geschrieben werden.");
  }
  if (status === "BEENDET" && !NACH_DEM_ENDE.has(entwurf.typ)) {
    return abgewiesen(
      "Der Einsatz ist beendet. Zum Weiterschreiben im Blatt „Ausgaben“ zuerst „Einsatz wiedereröffnen“ wählen.",
    );
  }
  if (entwurf.typ === "EinsatzWiedereroeffnet" && status !== "BEENDET") {
    return abgewiesen("Der Einsatz läuft noch; es gibt nichts wiederzueröffnen.", "EINSATZ_ZUSTAND");
  }
  if (entwurf.typ === "EinsatzArchiviert" && status !== "BEENDET") {
    return abgewiesen("Archivieren geht erst, wenn der Einsatz beendet ist.", "EINSATZ_ZUSTAND");
  }
  if (entwurf.typ === "EinsatzBeendet" && !istZeitpunkt(entwurf.neu)) {
    return abgewiesen("Das Einsatzende ist keine lesbare Zeitangabe.", "SCHEMA");
  }
  return undefined;
}

/**
 * Der Entwurf der Archivierung.
 *
 * `snapshotHash` ist der `zustandsHash` der Lage, die dieser Arbeitsplatz
 * archiviert — **Beleg, nicht Bedingung** (KONZEPT-EREIGNISSE.md §7): Ein
 * anderer Client, der einen anderen Hash rechnet, archiviert trotzdem.
 */
export function archivierungsentwurf(zustand: Zustand, einsatzId: string, zeitpunkt: string): Ereignisentwurf {
  return {
    typ: "EinsatzArchiviert",
    nutzlast: {
      einsatzId,
      zeitpunkt,
      snapshotHash: zustandsHash(zustand as unknown as KanonischerWert, sha256Hex),
    },
  };
}

/** Ob die Eingabe des Archivierens ein Zeitpunkt ist — sonst die Meldung. */
export function archivierungszeitFehler(zeitpunkt: string): Bedienergebnis | undefined {
  return istZeitpunkt(zeitpunkt) ? undefined : abgewiesen("Der Zeitpunkt der Archivierung ist keine lesbare Zeitangabe.", "SCHEMA");
}

/**
 * Packt die Einsatzakte aus dem Ordner auf dem Share und legt sie **in
 * diesen Ordner** — neben `einsatz.json`, nicht nach `ausgaben\`.
 *
 * Nicht nach `ausgaben\`, weil die Akte diesen Ordner selbst mitnimmt: Jede
 * weitere Akte enthielte sonst alle vorigen, und der Einsatz wüchse mit jedem
 * Knopfdruck um sich selbst. Der Name trägt Einsatzkennung und Zeitmarke —
 * wer die Datei vom Share kopiert, sieht ihr an, welcher Einsatz von wann.
 */
export async function erzeugeEinsatzakte(
  dateisystem: Dateisystem,
  einsatzordner: string,
  einsatzId: string,
  jetzt: Date,
): Promise<Akteergebnis> {
  const { bytes, manifest } = await packeAkte(dateisystem, einsatzordner, jetzt, schreibeZip);
  const pfad = path.join(einsatzordner, `${manifest.einsatzId ?? einsatzId}_akte_${dateimarke(jetzt)}.zip`);
  await legeArchivAb(dateisystem, pfad, bytes);
  return { pfad, bytes: bytes.length, ereignisse: manifest.ereignisse, befunde: manifest.befunde };
}
