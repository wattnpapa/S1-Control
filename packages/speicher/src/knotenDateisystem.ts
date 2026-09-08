/**
 * Die Umsetzung des Ports aus {@link ./dateisystem.js} über `node:fs`.
 *
 * Sie ist bewusst dünn: jede Entscheidung, die das Verfahren trägt, steht in
 * den Schichten darüber. Diese Datei übersetzt nur, und sie tut es so, dass
 * die Regeln aus §5.4.2 und §6.6 eingehalten sind — je Aufruf frisch öffnen,
 * nie nach der Größe fragen.
 */

import { constants as fsKonstanten } from "node:fs";
import * as fsp from "node:fs/promises";

import { DateisystemFehler, type Dateisystem, type Dauerhaftigkeit } from "./dateisystem.js";

/** Größe eines Leseabschnitts. Rein eine Puffergröße, kein Startwert nach §10. */
const LESEBLOCK_BYTE = 256 * 1024;

function codeVon(fehler: unknown): string {
  if (typeof fehler === "object" && fehler !== null && "code" in fehler) {
    const code = (fehler as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "EUNKNOWN";
}

/** Übersetzt einen Node-Fehler in einen {@link DateisystemFehler} mit erhaltenem Code. */
function uebersetze(fehler: unknown, pfad: string): never {
  throw new DateisystemFehler(codeVon(fehler), pfad, fehler);
}

/**
 * `fsync` gegenüber `F_FULLFSYNC` (§6.6).
 *
 * Node bietet `F_FULLFSYNC` nicht an, und ein natives Modul ist nach
 * 02-ZIELBILD.md („Ohne SQLite braucht das Produkt kein einziges natives
 * Modul mehr") ausgeschlossen. Auf macOS bleibt es deshalb bei `fsync(2)`;
 * §6.6 verlangt, dass diese schwächere Zusage im Messprotokoll von M0.5
 * vermerkt und nicht stillschweigend hingenommen wird. Dieser Wert ist der
 * Vermerk.
 */
const DAUERHAFTIGKEIT: Dauerhaftigkeit = "fsync";

/**
 * Der echte Zugriff auf das Dateisystem.
 *
 * M0.4 hängt an derselben Schnittstelle eine feindliche Schicht ein; nichts in
 * den Schichten darüber weiß, welche der beiden gerade untergeschoben ist.
 */
export function knotenDateisystem(): Dateisystem {
  return {
    dauerhaftigkeit: DAUERHAFTIGKEIT,

    async liesAb(pfad, offset) {
      // §6.6: je Aufruf neu öffnen. Über ein dauerhaft offenes Handle dürfte
      // der SMB-Client eigene Lesevorgänge aus dem Puffer einer Write-Lease
      // bedienen — und zeigte dem Schreiber dann nicht, was auf dem Server
      // steht.
      let griff;
      try {
        griff = await fsp.open(pfad, "r");
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
      try {
        const abschnitte: Uint8Array[] = [];
        let gelesen = 0;
        for (;;) {
          const puffer = new Uint8Array(LESEBLOCK_BYTE);
          const { bytesRead } = await griff.read(puffer, 0, LESEBLOCK_BYTE, offset + gelesen);
          // 0 Bytes heißt „hier endet die Datei" — die einzige zulässige
          // Feststellung des Dateiendes (§5.4.2).
          if (bytesRead === 0) break;
          abschnitte.push(puffer.subarray(0, bytesRead));
          gelesen += bytesRead;
        }
        return verbinde(abschnitte, gelesen);
      } catch (fehler) {
        uebersetze(fehler, pfad);
      } finally {
        await griff.close().catch(() => undefined);
      }
    },

    async haengeAnUndSynchronisiere(pfad, bytes) {
      let griff;
      try {
        griff = await fsp.open(pfad, "a");
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
      try {
        // Ein einziger `write` (§2.2), danach `fsync` — über SMB ein SMB2
        // FLUSH, der bis zum Abschluss blockiert (`nas-speicher-recherche.md`
        // §1.9).
        await griff.write(bytes, 0, bytes.byteLength);
        await griff.sync();
      } catch (fehler) {
        uebersetze(fehler, pfad);
      } finally {
        await griff.close().catch(() => undefined);
      }
    },

    async schreibeUeberOhneSync(pfad, bytes) {
      // "w" kürzt auf 0 und schreibt neu — Überschreiben an Ort und Stelle mit
      // Kürzen auf die neue Länge, kein Rename (§6.4).
      let griff;
      try {
        griff = await fsp.open(pfad, "w");
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
      try {
        await griff.write(bytes, 0, bytes.byteLength);
      } catch (fehler) {
        uebersetze(fehler, pfad);
      } finally {
        await griff.close().catch(() => undefined);
      }
    },

    async schreibeNeuAnlegen(pfad, bytes) {
      let griff;
      try {
        griff = await fsp.open(
          pfad,
          fsKonstanten.O_WRONLY | fsKonstanten.O_CREAT | fsKonstanten.O_EXCL,
        );
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
      try {
        await griff.write(bytes, 0, bytes.byteLength);
        await griff.sync();
      } catch (fehler) {
        uebersetze(fehler, pfad);
      } finally {
        await griff.close().catch(() => undefined);
      }
    },

    async benenneUm(vonPfad, nachPfad) {
      try {
        await fsp.rename(vonPfad, nachPfad);
      } catch (fehler) {
        uebersetze(fehler, vonPfad);
      }
    },

    async kuerzeAuf(pfad, laenge) {
      try {
        await fsp.truncate(pfad, laenge);
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
    },

    async loesche(pfad) {
      try {
        await fsp.unlink(pfad);
      } catch (fehler) {
        // Eine bereits fehlende Datei ist der gewünschte Zustand, kein Fehler.
        if (codeVon(fehler) === "ENOENT") return;
        uebersetze(fehler, pfad);
      }
    },

    async listeVerzeichnis(pfad) {
      try {
        return await fsp.readdir(pfad);
      } catch (fehler) {
        if (codeVon(fehler) === "ENOENT") return [];
        uebersetze(fehler, pfad);
      }
    },

    async legeVerzeichnisAn(pfad) {
      try {
        await fsp.mkdir(pfad, { recursive: true });
      } catch (fehler) {
        uebersetze(fehler, pfad);
      }
    },
  };
}

function verbinde(abschnitte: readonly Uint8Array[], gesamt: number): Uint8Array {
  if (abschnitte.length === 1) return abschnitte[0] as Uint8Array;
  const ergebnis = new Uint8Array(gesamt);
  let ziel = 0;
  for (const abschnitt of abschnitte) {
    ergebnis.set(abschnitt, ziel);
    ziel += abschnitt.byteLength;
  }
  return ergebnis;
}
