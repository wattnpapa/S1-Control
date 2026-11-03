/**
 * Die Einstellungen des Arbeitsplatzes (M2.2) — Share-Pfad, Anzeigename und
 * die **Kennung dieses Clients**.
 *
 * Sie liegen in einer JSON-Datei im Profil des Benutzers, nicht auf dem Share.
 * Der Grund steht in KONZEPT-SPEICHER.md §4.1: Die `clientId` ist die Kennung
 * *dieses Rechners und dieses Profils*, sie steht in jeder HLC (§3.2) und
 * entscheidet den Tiebreak. Zwei Arbeitsplaetze duerfen sie nie teilen — ein
 * geklontes Profil ist genau der Fehlerfall, den §4.5 Fall 2 auffaengt.
 *
 * Dieses Modul kennt **kein Electron**. Es bekommt den Pfad und arbeitet mit
 * `node:fs/promises`; wo die Datei liegt, entscheidet der Main. Damit ist es
 * ohne laufende Anwendung pruefbar.
 */

import { randomUUID } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";

import { zEinstellungen, zProfil, type Einstellungen } from "../kontrakt/index.js";

/** Was tatsaechlich in der Datei steht: die Einstellungen plus die Kennung. */
export interface Arbeitsplatz extends Einstellungen {
  readonly clientId: string;
}

/**
 * Liest die Einstellungen — und legt beim ersten Mal eine Kennung an.
 *
 * Eine unlesbare oder halb geschriebene Datei fuehrt **nicht** zum Abbruch,
 * sondern zu den Vorbelegungen; nur die Kennung wird dann neu vergeben. Das
 * ist die richtige Reihenfolge der Uebel: Ein Arbeitsplatz, der wegen einer
 * kaputten Einstellungsdatei nicht startet, ist im Einsatz teurer als einer,
 * der nach dem Share-Pfad fragt.
 *
 * **Die neue Kennung wird sofort geschrieben.** Bliebe sie im Speicher, zoege
 * jeder Start eine neue — und `schreiber.json`, die Praesenz und die
 * Fremdschreiber-Erkennung aus §4.5 haetten keinen festen Bezugspunkt mehr.
 */
export async function liesArbeitsplatz(datei: string, vorbelegterShare = ""): Promise<Arbeitsplatz> {
  let roh: unknown;
  try {
    roh = JSON.parse(await fsp.readFile(datei, "utf8"));
  } catch {
    roh = undefined;
  }
  const wert = typeof roh === "object" && roh !== null ? (roh as Record<string, unknown>) : {};
  // Das Profil wird für sich geprüft: Ein Wert, den erst ein späteres
  // Programm kennt, soll das Profil verlieren und nicht Share und Namen.
  const { profil: rohesProfil, ...ohneProfil } = wert;
  const geprueft = zEinstellungen.safeParse(ohneProfil);
  const profil = zProfil.safeParse(rohesProfil);
  const clientId = typeof wert["clientId"] === "string" && wert["clientId"].length >= 8
    ? wert["clientId"]
    : neueClientId();

  const arbeitsplatz: Arbeitsplatz = {
    sharePfad: geprueft.success ? geprueft.data.sharePfad : vorbelegterShare,
    anzeigename: geprueft.success && geprueft.data.anzeigename.length > 0
      ? geprueft.data.anzeigename
      : "Arbeitsplatz",
    ...(geprueft.success ? geraetefelder(geprueft.data) : {}),
    ...(profil.success ? { profil: profil.data } : {}),
    clientId,
  };
  if (!geprueft.success || wert["clientId"] !== clientId) {
    await schreibeArbeitsplatz(datei, arbeitsplatz);
  }
  return arbeitsplatz;
}

/**
 * Die Felder, die zum Gerät gehören — sie werden **mitgelesen**. Ohne sie
 * schriebe `#setzeEinstellungen` sie zwar in die Datei, der nächste Start
 * ließe sie aber fallen: Ein Meldekopf wäre nach jedem Neustart wieder eine
 * Führungsstelle, das Nachtbild wieder hell, die Monitorwahl (S4.1) wieder
 * Stärke. Das Profil (E3) liest `liesArbeitsplatz` für sich.
 */
function geraetefelder(gelesen: Einstellungen): Partial<Einstellungen> {
  return {
    ...(gelesen.betriebsart === undefined ? {} : { betriebsart: gelesen.betriebsart }),
    ...(gelesen.theme === undefined ? {} : { theme: gelesen.theme }),
    ...(gelesen.monitor === undefined ? {} : { monitor: gelesen.monitor }),
  };
}

/** Schreibt die Datei; das Verzeichnis wird angelegt, wenn es fehlt. */
export async function schreibeArbeitsplatz(datei: string, wert: Arbeitsplatz): Promise<void> {
  await fsp.mkdir(path.dirname(datei), { recursive: true });
  await fsp.writeFile(datei, `${JSON.stringify(wert, undefined, 2)}\n`, "utf8");
}

/**
 * Eine neue Client-Kennung (§4.1).
 *
 * `randomUUID` ohne Bindestriche: Die ersten Stellen werden zum
 * Dateinamenspraefix, und dort rechnet §4.1 in Zeichen, nicht in Gruppen.
 * Bindestriche waeren zulaessig, aber sie verbrauchten Praefixstellen ohne
 * Unterscheidungskraft.
 */
export function neueClientId(): string {
  return randomUUID().replaceAll("-", "");
}
