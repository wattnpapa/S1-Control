/**
 * Ein Dateisystem, das auf Ansage scheitert — ausschließlich Prüfhilfe.
 *
 * **Das ist nicht die feindliche Dateisystem-Schicht aus M0.4.** Die bringt
 * verzögerte Sichtbarkeit, abgeschnittene Schreibvorgänge, Rename-Fehler,
 * blockierende Aufrufe und den FileNotFound-Cache mit und gehört in die
 * Simulation (05-UMSETZUNGSPLAN.md, M0.4). Hier steht nur so viel, wie die
 * Unit-Tests von M0.3 für §8.8 und §8.9 brauchen. Beide hängen an derselben
 * Naht — dem Port aus `dateisystem.ts` —, weshalb M0.4 eine Ergänzung ist und
 * kein Umbau.
 */

import { DateisystemFehler, type Dateisystem } from "../dateisystem.js";

/** Was bei welchem Aufruf schiefgehen soll. */
export interface Stoerung {
  /** Der Aufruf, der scheitern soll. */
  readonly aufruf: keyof Dateisystem;
  /** Der Fehlercode, mit dem er scheitert. */
  readonly code: string;
  /** Wie oft; danach läuft der Aufruf wieder durch. `Infinity` heißt dauerhaft. */
  malen: number;
  /** Nur Pfade, die diese Zeichenkette enthalten. */
  readonly pfadEnthaelt?: string;
}

/** Ein Dateisystem, das jeden Aufruf durchreicht, bis eine Störung greift. */
export function stoerdateisystem(echt: Dateisystem, stoerungen: Stoerung[]): Dateisystem {
  const pruefe = (aufruf: keyof Dateisystem, pfad: string): void => {
    for (const stoerung of stoerungen) {
      if (stoerung.aufruf !== aufruf || stoerung.malen <= 0) continue;
      if (stoerung.pfadEnthaelt !== undefined && !pfad.includes(stoerung.pfadEnthaelt)) continue;
      stoerung.malen -= 1;
      throw new DateisystemFehler(stoerung.code, pfad);
    }
  };
  return {
    dauerhaftigkeit: echt.dauerhaftigkeit,
    liesAb: (pfad, offset) => (pruefe("liesAb", pfad), echt.liesAb(pfad, offset)),
    haengeAnUndSynchronisiere: (pfad, bytes) => (
      pruefe("haengeAnUndSynchronisiere", pfad), echt.haengeAnUndSynchronisiere(pfad, bytes)
    ),
    schreibeUeberOhneSync: (pfad, bytes) => (
      pruefe("schreibeUeberOhneSync", pfad), echt.schreibeUeberOhneSync(pfad, bytes)
    ),
    schreibeNeuAnlegen: (pfad, bytes) => (
      pruefe("schreibeNeuAnlegen", pfad), echt.schreibeNeuAnlegen(pfad, bytes)
    ),
    benenneUm: (von, nach) => (pruefe("benenneUm", von), echt.benenneUm(von, nach)),
    kuerzeAuf: (pfad, laenge) => (pruefe("kuerzeAuf", pfad), echt.kuerzeAuf(pfad, laenge)),
    loesche: (pfad) => (pruefe("loesche", pfad), echt.loesche(pfad)),
    listeVerzeichnis: (pfad) => (pruefe("listeVerzeichnis", pfad), echt.listeVerzeichnis(pfad)),
    legeVerzeichnisAn: (pfad) => (pruefe("legeVerzeichnisAn", pfad), echt.legeVerzeichnisAn(pfad)),
  };
}
