/**
 * Die Anmeldung der Web-Schale fuer die Bereitstellung im Internet (ADR-006).
 *
 * Sie steht **vor** dem Dienst und entscheidet je Anfrage nur eines: darf sie
 * weiter oder nicht. Was dahinter liegt — Renderer, Rufe, Strom, die
 * Arbeitsplaetze — weiss von der Anmeldung nichts und bleibt, wie es im Netz
 * der Fuehrungsstelle ist (ADR-005).
 *
 * Es gibt **einen** gemeinsamen Zugang und kein Rollenmodell (Entscheidung 9
 * bleibt): Die Anmeldung haelt Dritte draussen, sie sagt nicht, wer drinnen
 * ist. Der Akteur der Ereignisse bleibt der Anzeigename des Arbeitsplatzes.
 *
 * Die Wege:
 *
 *  * `GET  /anmeldung`  — die Anmeldeseite (ohne Skript).
 *  * `POST /anmeldung`  — Formular pruefen, Sitzung anlegen, weiter auf `./`.
 *  * `POST /abmeldung`  — Sitzung loeschen, weiter auf die Anmeldeseite.
 *  * alles andere ohne Sitzung: `/ruf` und `/mitteilungen` antworten 401
 *    (der Renderer leitet dann selbst um), jede andere Seite 303 auf die
 *    Anmeldeseite.
 *
 * Nie im Protokoll: Passwort und Cookie-Werte. Fehlversuche stehen dort mit
 * Anmeldename und Absender, damit ein Durchprobieren sichtbar wird.
 */

import type http from "node:http";

import { ANMELDESEITE_KOEPFE, anmeldeseite } from "./anmeldeseite.js";
import type { Bremse } from "./bremse.js";
import { cookieWert, gleicheHerkunft, liesKoerper, type Zugangskontrolle } from "./dienst.js";
import type { Sitzungen } from "./sitzungen.js";
import type { Zugangspruefer } from "./zugangsdaten.js";

export const SITZUNG_COOKIE = "s1-sitzung";
/** Ein Anmeldeformular hat zwei Felder; mehr ist kein Formular. */
const FORMULAR_MAX_BYTES = 4096;
export const FEHLER_ZUGANG = "Anmeldename oder Passwort falsch";

export interface AnmeldungOptionen {
  readonly pruefer: Zugangspruefer;
  readonly sitzungen: Sitzungen;
  readonly bremse: Bremse;
  /** `S1_WEB_HINTER_PROXY=1`: Absender und HTTPS aus `x-forwarded-*`. */
  readonly hinterProxy: boolean;
  /** `S1_WEB_SICHER=1`: das Cookie immer mit `Secure`. */
  readonly sicher: boolean;
  readonly programmversion: string;
  readonly protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void;
}

type Antwort = http.ServerResponse;
type Anfrage = http.IncomingMessage;

export class Anmeldung implements Zugangskontrolle {
  readonly #o: AnmeldungOptionen;

  constructor(optionen: AnmeldungOptionen) {
    this.#o = optionen;
  }

  async vorpruefe(anfrage: Anfrage, antwort: Antwort, pfad: string): Promise<boolean> {
    if (pfad === "/anmeldung") {
      await this.#anmeldung(anfrage, antwort);
      return true;
    }
    if (pfad === "/abmeldung") {
      await this.#abmeldung(anfrage, antwort);
      return true;
    }
    if (await this.#angemeldet(anfrage)) return false;
    weise(anfrage, antwort, pfad);
    return true;
  }

  #angemeldet(anfrage: Anfrage): Promise<boolean> {
    return this.#o.sitzungen.gilt(cookieWert(anfrage.headers.cookie, SITZUNG_COOKIE));
  }

  async #anmeldung(anfrage: Anfrage, antwort: Antwort): Promise<void> {
    const methode = anfrage.method ?? "GET";
    if (methode === "GET" || methode === "HEAD") {
      // Wer schon angemeldet ist — etwa nach einem Link von aussen, bei dem
      // `SameSite=Strict` das Cookie zurueckhielt —, geht gleich weiter.
      if (await this.#angemeldet(anfrage)) return weiter(antwort, "./");
      return this.#seite(antwort, 200, undefined);
    }
    if (methode !== "POST") return text(antwort, 405, "Methode nicht erlaubt.");
    if (!gleicheHerkunft(anfrage)) return text(antwort, 403, "Anmeldungen nur aus derselben Herkunft.");
    if (!(anfrage.headers["content-type"] ?? "").startsWith("application/x-www-form-urlencoded")) {
      return text(antwort, 415, "Die Anmeldung ist ein Formular.");
    }
    return this.#anmelden(anfrage, antwort);
  }

  /** Das eigentliche Pruefen — erst die Bremse, dann das Formular. */
  async #anmelden(anfrage: Anfrage, antwort: Antwort): Promise<void> {
    const absender = this.#absender(anfrage);
    const warten = this.#o.bremse.wartezeit(absender);
    if (warten > 0) return this.#gebremst(antwort, absender, warten);

    let formular: URLSearchParams;
    try {
      formular = new URLSearchParams(await liesKoerper(anfrage, FORMULAR_MAX_BYTES));
    } catch {
      return text(antwort, 400, "Das Formular ist nicht lesbar.");
    }
    const name = (formular.get("anmeldename") ?? "").trim();
    if (!(await this.#o.pruefer.pruefe(name, formular.get("passwort") ?? ""))) {
      this.#o.bremse.fehlversuch(absender);
      this.#o.protokolliere("warnung", `Anmeldung abgewiesen: Name „${fuerProtokoll(name)}“ von ${absender}`);
      return this.#seite(antwort, 401, FEHLER_ZUGANG);
    }
    this.#o.bremse.erfolg(absender);
    const schluessel = await this.#o.sitzungen.lege();
    antwort.setHeader("set-cookie", this.#cookie(anfrage, schluessel));
    this.#o.protokolliere("info", `Angemeldet von ${absender}`);
    weiter(antwort, "./");
  }

  async #abmeldung(anfrage: Anfrage, antwort: Antwort): Promise<void> {
    if (anfrage.method !== "POST") return text(antwort, 405, "Methode nicht erlaubt.");
    if (!gleicheHerkunft(anfrage)) return text(antwort, 403, "Abmelden nur aus derselben Herkunft.");
    await this.#o.sitzungen.entferne(cookieWert(anfrage.headers.cookie, SITZUNG_COOKIE));
    antwort.setHeader("set-cookie", this.#cookie(anfrage, "", 0));
    this.#o.protokolliere("info", `Abgemeldet von ${this.#absender(anfrage)}`);
    weiter(antwort, "anmeldung");
  }

  #gebremst(antwort: Antwort, absender: string, wartezeitMs: number): void {
    const minuten = Math.ceil(wartezeitMs / 60_000);
    this.#o.protokolliere("warnung", `Anmeldung gebremst: ${absender} (zu viele Fehlversuche)`);
    antwort.setHeader("retry-after", String(Math.ceil(wartezeitMs / 1000)));
    this.#seite(
      antwort,
      429,
      `Zu viele Fehlversuche. Bitte in ${String(minuten)} ${minuten === 1 ? "Minute" : "Minuten"} erneut versuchen.`,
    );
  }

  #seite(antwort: Antwort, status: number, fehler: string | undefined): void {
    const html = anmeldeseite({
      programmversion: this.#o.programmversion,
      ...(fehler === undefined ? {} : { fehler }),
    });
    antwort.writeHead(status, ANMELDESEITE_KOEPFE);
    antwort.end(html);
  }

  /**
   * Das Sitzungscookie.
   *
   * Anders als das Arbeitsplatz-Cookie mit `Secure`, sobald der Dienst hinter
   * HTTPS laeuft: Im Internet soll der Schluessel nie im Klartext reisen. Ohne
   * `Max-Age`, also bis der Browser geschlossen wird — die eigentliche
   * Lebensdauer haelt der Dienst.
   */
  #cookie(anfrage: Anfrage, wert: string, maxAge?: number): string {
    const sicher = this.#o.sicher || (this.#o.hinterProxy && ersterEintrag(anfrage.headers["x-forwarded-proto"]) === "https");
    return [
      `${SITZUNG_COOKIE}=${wert}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      ...(sicher ? ["Secure"] : []),
      ...(maxAge === undefined ? [] : [`Max-Age=${String(maxAge)}`]),
    ].join("; ");
  }

  /**
   * Wer anfragt — fuer Bremse und Protokoll.
   *
   * Hinter dem Proxy ist die Socket-Adresse immer die des Proxys; dann gilt
   * der erste Eintrag von `x-forwarded-for`. Ohne Proxy wird der Kopf
   * ignoriert, sonst koennte jeder sich mit einem erfundenen Kopf an der
   * Bremse vorbeischreiben.
   */
  #absender(anfrage: Anfrage): string {
    if (this.#o.hinterProxy) {
      const weitergeleitet = ersterEintrag(anfrage.headers["x-forwarded-for"]);
      if (weitergeleitet !== "") return weitergeleitet;
    }
    return anfrage.socket.remoteAddress ?? "unbekannt";
  }
}

/** Ohne Sitzung: Schnittstellen antworten 401, Seiten leiten zur Anmeldung. */
function weise(anfrage: Anfrage, antwort: Antwort, pfad: string): void {
  const methode = anfrage.method ?? "GET";
  const seite = (methode === "GET" || methode === "HEAD") && pfad !== "/ruf" && pfad !== "/mitteilungen";
  if (seite) return weiter(antwort, zurAnmeldung(pfad));
  antwort.writeHead(401, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  antwort.end(JSON.stringify({ ok: false, meldung: "Nicht angemeldet." }));
}

/**
 * Der relative Weg von `pfad` zur Anmeldeseite.
 *
 * Relativ und nicht `/anmeldung`, damit es hinter einem Proxy unter einem
 * Unterpfad stimmt; aus `/assets/a.js` wird also `../anmeldung`.
 */
export function zurAnmeldung(pfad: string): string {
  const tiefe = Math.max(0, pfad.split("/").length - 2);
  return `${"../".repeat(tiefe)}anmeldung`;
}

function weiter(antwort: Antwort, ziel: string): void {
  antwort.writeHead(303, { location: ziel, "cache-control": "no-store" });
  antwort.end();
}

function text(antwort: Antwort, status: number, inhalt: string): void {
  antwort.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  antwort.end(inhalt);
}

function ersterEintrag(kopf: string | string[] | undefined): string {
  const wert = Array.isArray(kopf) ? kopf[0] : kopf;
  return (wert ?? "").split(",")[0]?.trim() ?? "";
}

/** Ein Name aus einem Formular gehoert gekuerzt und entschaerft ins Protokoll. */
function fuerProtokoll(name: string): string {
  return name.replace(/[^\p{L}\p{N}._@-]/gu, "?").slice(0, 64);
}
