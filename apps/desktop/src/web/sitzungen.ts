/**
 * Die Sitzungen der Anmeldung (ADR-006) — serverseitig, in einer Datei.
 *
 * Eine Sitzung ist ein zufaelliger Schluessel im Cookie `s1-sitzung`. Der
 * Dienst merkt sich **nicht** den Schluessel, sondern seinen SHA-256: Wer die
 * Datei `sitzungen.json` liest (ein Backup des Daten-Volumes, ein neugieriger
 * Blick auf den Server), kann sich damit nicht anmelden.
 *
 * Warum eine Datei und nicht nur der Speicher: Ein Neustart des Containers
 * (neues Bild, `docker compose up -d`) soll nicht jeden Bediener mitten in
 * der Lage zur Anmeldeseite schicken.
 *
 * Die Lebensdauer gleitet ab der letzten Nutzung. Fortgeschrieben wird die
 * letzte Nutzung aber nur, wenn sie um mehr als {@link FORTSCHREIBEN_MS}
 * weitergerueckt ist — sonst schriebe jeder Ruf die Datei neu. Eine Minute
 * Ungenauigkeit bei zwoelf Stunden Lebensdauer spielt keine Rolle.
 *
 * Geschrieben wird atomar (temp + rename) und nacheinander: Zwei Anmeldungen
 * im selben Augenblick duerfen einander die Datei nicht halb ueberschreiben.
 */

import { createHash, randomBytes } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/** Ab dieser Spanne wird die letzte Nutzung in die Datei geschrieben. */
export const FORTSCHREIBEN_MS = 60_000;

/** Form des Sitzungsschluessels: `base64url` aus 24 Bytes, wie der Arbeitsplatzschluessel. */
export const SITZUNG_FORM = /^[A-Za-z0-9_-]{32}$/;

interface Eintrag {
  readonly angelegt: string;
  zuletzt: string;
}

export interface SitzungenOptionen {
  /** `<S1_DATEN>/sitzungen.json` */
  readonly datei: string;
  readonly lebensdauerMs: number;
  readonly zeit?: () => number;
}

export class Sitzungen {
  readonly #o: SitzungenOptionen;
  readonly #eintraege = new Map<string, Eintrag>();
  #schreiben: Promise<void> = Promise.resolve();
  #zaehler = 0;

  constructor(optionen: SitzungenOptionen) {
    this.#o = optionen;
  }

  get anzahl(): number {
    return this.#eintraege.size;
  }

  /**
   * Liest die Datei und raeumt dabei ab, was abgelaufen ist.
   *
   * Eine fehlende oder kaputte Datei ist kein Startfehler: Sie kostet nur,
   * dass sich alle neu anmelden — und das ist sicherer als ein Dienst, der
   * nicht startet.
   */
  async lade(): Promise<void> {
    let roh: unknown;
    try {
      roh = JSON.parse(await fsp.readFile(this.#o.datei, "utf8"));
    } catch {
      roh = {};
    }
    this.#eintraege.clear();
    if (typeof roh === "object" && roh !== null) {
      for (const [hash, wert] of Object.entries(roh as Record<string, unknown>)) {
        if (istEintrag(wert)) this.#eintraege.set(hash, { angelegt: wert.angelegt, zuletzt: wert.zuletzt });
      }
    }
    await this.raeumeAuf();
  }

  /** Legt eine Sitzung an und liefert den Schluessel fuer das Cookie. */
  async lege(): Promise<string> {
    const schluessel = randomBytes(24).toString("base64url");
    const jetzt = new Date(this.#jetzt()).toISOString();
    this.#eintraege.set(hashVon(schluessel), { angelegt: jetzt, zuletzt: jetzt });
    await this.#speichere();
    return schluessel;
  }

  /** Gilt dieser Schluessel? Wenn ja, rueckt die Lebensdauer nach. */
  async gilt(schluessel: string | undefined): Promise<boolean> {
    if (schluessel === undefined || !SITZUNG_FORM.test(schluessel)) return false;
    const hash = hashVon(schluessel);
    const eintrag = this.#eintraege.get(hash);
    if (eintrag === undefined) return false;
    const jetzt = this.#jetzt();
    const zuletzt = Date.parse(eintrag.zuletzt);
    if (jetzt - zuletzt > this.#o.lebensdauerMs) {
      this.#eintraege.delete(hash);
      await this.#speichere();
      return false;
    }
    if (jetzt - zuletzt > FORTSCHREIBEN_MS) {
      eintrag.zuletzt = new Date(jetzt).toISOString();
      await this.#speichere();
    }
    return true;
  }

  async entferne(schluessel: string | undefined): Promise<void> {
    if (schluessel === undefined) return;
    if (this.#eintraege.delete(hashVon(schluessel))) await this.#speichere();
  }

  /** Entfernt abgelaufene Sitzungen; schreibt nur, wenn sich etwas aenderte. */
  async raeumeAuf(): Promise<number> {
    const grenze = this.#jetzt() - this.#o.lebensdauerMs;
    let entfernt = 0;
    for (const [hash, eintrag] of this.#eintraege) {
      if (Date.parse(eintrag.zuletzt) < grenze) {
        this.#eintraege.delete(hash);
        entfernt += 1;
      }
    }
    if (entfernt > 0) await this.#speichere();
    return entfernt;
  }

  #jetzt(): number {
    return (this.#o.zeit ?? Date.now)();
  }

  /** Haengt das Schreiben an die Kette, damit nie zwei zugleich umbenennen. */
  #speichere(): Promise<void> {
    const inhalt = JSON.stringify(Object.fromEntries(this.#eintraege), null, 2);
    const naechstes = this.#schreiben.then(() => this.#schreibeAtomar(inhalt));
    // Ein fehlgeschlagenes Schreiben darf die Kette nicht fuer immer
    // vergiften; der Fehler geht an den, der gerade wartet.
    this.#schreiben = naechstes.catch(() => undefined);
    return naechstes;
  }

  async #schreibeAtomar(inhalt: string): Promise<void> {
    this.#zaehler += 1;
    const temp = `${this.#o.datei}.${String(process.pid)}.${String(this.#zaehler)}.tmp`;
    await fsp.mkdir(path.dirname(this.#o.datei), { recursive: true });
    // 0600: Die Hashes verraten keinen Schluessel, aber wer angemeldet ist,
    // geht niemanden auf dem Server etwas an.
    await fsp.writeFile(temp, inhalt, { encoding: "utf8", mode: 0o600 });
    await fsp.rename(temp, this.#o.datei);
  }
}

function hashVon(schluessel: string): string {
  return createHash("sha256").update(schluessel).digest("hex");
}

function istEintrag(wert: unknown): wert is Eintrag {
  if (typeof wert !== "object" || wert === null) return false;
  const e = wert as Record<string, unknown>;
  return (
    typeof e["angelegt"] === "string" &&
    typeof e["zuletzt"] === "string" &&
    !Number.isNaN(Date.parse(e["zuletzt"]))
  );
}
