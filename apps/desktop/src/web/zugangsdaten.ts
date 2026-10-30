/**
 * Der eine gemeinsame Zugang der Web-Schale (ADR-006).
 *
 * Anmeldename und Passwort kommen aus der Umgebung (`S1_WEB_ANMELDENAME`,
 * `S1_WEB_PASSWORT`). Gleich beim Start wird das Passwort mit `scrypt` und
 * einem zufaelligen Salz zu einem Hash; der Klartext bleibt danach in keinem
 * Feld dieses Prozesses liegen. Ein Speicherabzug oder eine Fehlermeldung,
 * die ein Objekt ausgibt, zeigt damit hoechstens den Hash.
 *
 * Verglichen wird zeitkonstant (`timingSafeEqual`), und zwar **beides** in
 * jedem Fall: Ein falscher Anmeldename soll nicht schneller abgewiesen werden
 * als ein falsches Passwort, sonst verriete die Antwortzeit den Namen.
 */

import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Die Mindestlaenge, unter der der Dienst nicht startet. */
export const PASSWORT_MIN_LAENGE = 12;

/** Ein Passwort darf nicht beliebig lang sein — `scrypt` rechnet sonst auf Bestellung. */
const PASSWORT_MAX_LAENGE = 1024;

const SCRYPT: ScryptOptions = { N: 16384, r: 8, p: 1 };
const SCHLUESSELLAENGE = 32;

export interface Zugangspruefer {
  /** Stimmen Anmeldename und Passwort? Antwortet in jedem Fall gleich lange. */
  pruefe(anmeldename: string, passwort: string): Promise<boolean>;
}

function streue(passwort: string, salz: Buffer): Promise<Buffer> {
  return new Promise((aufloesen, ablehnen) => {
    scrypt(passwort, salz, SCHLUESSELLAENGE, SCRYPT, (fehler, ergebnis) => {
      if (fehler === null) aufloesen(ergebnis);
      else ablehnen(fehler);
    });
  });
}

/** Ein Hash fester Laenge — damit `timingSafeEqual` auch ungleich lange Namen vergleichen kann. */
function namenshash(anmeldename: string): Buffer {
  return createHash("sha256").update(anmeldename, "utf8").digest();
}

/** Baut den Pruefer; danach braucht niemand mehr den Klartext. */
export async function baueZugangspruefer(anmeldename: string, passwort: string): Promise<Zugangspruefer> {
  const salz = randomBytes(16);
  const sollName = namenshash(anmeldename);
  const sollPasswort = await streue(passwort, salz);
  return {
    async pruefe(name, versuch) {
      // Ein ueberlanges Passwort wird gekuerzt gerechnet und ist damit falsch,
      // ohne dass die Antwortzeit davon abhaengt, wie lang es war.
      const zuLang = versuch.length > PASSWORT_MAX_LAENGE;
      const ist = await streue(versuch.slice(0, PASSWORT_MAX_LAENGE), salz);
      const nameGleich = timingSafeEqual(namenshash(name), sollName);
      const passwortGleich = timingSafeEqual(ist, sollPasswort);
      return nameGleich && passwortGleich && !zuLang;
    },
  };
}
