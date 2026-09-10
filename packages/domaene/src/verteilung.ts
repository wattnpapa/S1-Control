/**
 * Das Programmmanifest und seine Prüfung (M7.2).
 *
 * **Der Verteilweg ist der Share.** Entscheidung 7 hat das LAN-Peer-Update
 * gestrichen; was bleibt, ist ein Ordner `programm\` neben `einsaetze\`, in
 * den jemand ein neues Paket legt. Die anderen Arbeitsplätze sehen es dort und
 * melden es. Ein GitHub-Release ist die zweite Quelle, die ein Mensch
 * anstößt.
 *
 * **Warum das Manifest signiert ist.** Der Share ist eine Dateifreigabe, auf
 * die im Einsatz mehrere Rechner schreiben, und ein NAS im Fuhrpark ist kein
 * gehärteter Server. Wer dort eine Datei ablegen kann, kann eine
 * `S1-Control-Setup.exe` ablegen — und ohne Signatur wäre die Anwendung die
 * Stelle, die sie den Bedienern anbietet. Die Signatur macht daraus eine
 * Aussage, die nur mit dem privaten Schlüssel zu erzeugen ist.
 *
 * **Was die Prüfung leistet und was nicht.** Sie sagt: Dieses Manifest stammt
 * von dem, der den Schlüssel hat, und die Datei daneben hat den Hash, den es
 * nennt. Sie sagt **nicht**, dass die Datei harmlos ist, und sie ersetzt keine
 * Codesignatur des Betriebssystems — die ist eine andere Kette mit einem
 * anderen Zweck (V.1).
 *
 * **Die Prüfung steht in Ring 2 und ist rein.** Sie bekommt Bytes und liefert
 * ein Urteil; wer die Bytes holt, ist die Schale. Damit ist sie ohne Share,
 * ohne Dateisystem und ohne Netz prüfbar — und genau das braucht ein
 * Sicherheitsmechanismus: Tests, die jeden Ablehnungsgrund einzeln fahren.
 */

import * as ed from "@noble/ed25519";
import { ausHex, zuHex } from "@bos/eeb-format";

import { kanonischeSerialisierung } from "./kanonisch.js";

/** Der Ordner auf dem Share, in dem die Pakete liegen (V.2). */
export const ORDNER_PROGRAMM = "programm";
/** Der Name des Manifests in diesem Ordner. */
export const DATEI_MANIFEST = "manifest.json";

/**
 * Der Inhalt eines Manifests — **ohne** die Signatur.
 *
 * Signiert wird die kanonische Serialisierung genau dieses Teils (§7.6).
 * Stünde die Signatur mit darin, müsste sie sich selbst enthalten.
 */
export interface Programmstand {
  /** Die Fassung, wie sie im Paket steht. */
  readonly version: string;
  /** Der Dateiname im selben Ordner — **ohne** Pfadanteile. */
  readonly datei: string;
  readonly groesse: number;
  /** SHA-256 der Datei, 64 Hexzeichen. */
  readonly sha256: string;
  /** Für welche Plattform: `win32`, `darwin`, `linux`. */
  readonly plattform: string;
  /** Wanduhrzeit der Veröffentlichung, ISO-8601 — reine Anzeige. */
  readonly veroeffentlicht: string;
  /** Was sich geändert hat; wird dem Bediener gezeigt. */
  readonly hinweis?: string;
}

/** Das Manifest, wie es auf dem Share liegt. */
export interface Programmmanifest {
  readonly stand: Programmstand;
  /** Ed25519 über die kanonische Serialisierung von `stand`, als Hex. */
  readonly signatur: string;
  /** Der öffentliche Schlüssel, als Hex — zur Anzeige der Kurzform. */
  readonly pubkey: string;
}

/** Warum ein Manifest abgelehnt wurde. */
export type Ablehnungsgrund =
  /** Die Datei ist kein Manifest oder unvollständig. */
  | "unlesbar"
  /** Der Schlüssel im Manifest ist nicht der, dem dieser Baum vertraut. */
  | "fremderSchluessel"
  /** Die Signatur passt nicht zum Inhalt. */
  | "signaturFalsch"
  /** Die angebotene Fassung ist nicht neuer als die laufende. */
  | "nichtNeuer"
  /** Die Fassung ist für eine andere Plattform. */
  | "andereplattform"
  /** Die Datei daneben hat einen anderen Hash als das Manifest nennt. */
  | "dateiPasstNicht";

export type Pruefergebnis =
  | { readonly art: "angeboten"; readonly stand: Programmstand; readonly kurzform: string }
  | { readonly art: "abgelehnt"; readonly grund: Ablehnungsgrund; readonly meldung: string };

/**
 * Vergleicht zwei Fassungen der Form `1.2.3` oder `2026.9.10-1430`.
 *
 * **Stellenweise numerisch, nicht als Zeichenkette.** `"10" < "9"` ist als
 * Text wahr und als Fassung falsch; ein Zeichenkettenvergleich böte nach der
 * neunten Ausgabe keine zehnte mehr an. Was keine Zahl ist, wird als Text
 * verglichen — damit ordnet sich `1.0.0-beta` vor `1.0.0`, wie es üblich ist.
 */
export function vergleicheVersionen(links: string, rechts: string): number {
  const teile = (wert: string): (number | string)[] =>
    wert
      .split(/[.\-+]/)
      .filter((stueck) => stueck !== "")
      .map((stueck) => (/^\d+$/.test(stueck) ? Number(stueck) : stueck));

  const a = teile(links);
  const b = teile(rechts);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i];
    const y = b[i];
    // Eine fehlende Stelle ist kleiner als eine vorhandene Zahl — `1.2` liegt
    // vor `1.2.1`. Gegen eine Textstelle ist sie **groesser**: `1.0.0` liegt
    // nach `1.0.0-beta`.
    if (x === undefined) return typeof y === "string" ? 1 : -1;
    if (y === undefined) return typeof x === "string" ? -1 : 1;
    if (typeof x === "number" && typeof y === "number") {
      if (x !== y) return x < y ? -1 : 1;
      continue;
    }
    const links_ = String(x);
    const rechts_ = String(y);
    if (links_ !== rechts_) return links_ < rechts_ ? -1 : 1;
  }
  return 0;
}

/** Die Bytes, über die signiert wird — die kanonische Serialisierung des Standes. */
export function signierteBytes(stand: Programmstand): Uint8Array {
  return new TextEncoder().encode(kanonischeSerialisierung(stand as never));
}

/** Signiert einen Programmstand. Nur für Tests und für das Werkzeug, das veröffentlicht. */
export async function signiereStand(
  stand: Programmstand,
  privat: Uint8Array,
): Promise<Programmmanifest> {
  const signatur = await ed.signAsync(signierteBytes(stand), privat);
  const pubkey = await ed.getPublicKeyAsync(privat);
  return { stand, signatur: zuHex(signatur), pubkey: zuHex(pubkey) };
}

export interface Pruefauftrag {
  /** Der Text der Manifestdatei. */
  readonly text: string;
  /** Der Schlüssel, dem dieser Baum vertraut — Hex. */
  readonly vertrauterSchluessel: string;
  /** Die laufende Fassung. */
  readonly laufendeVersion: string;
  /** Die Plattform dieses Rechners: `win32`, `darwin`, `linux`. */
  readonly plattform: string;
  /** SHA-256 der Datei neben dem Manifest; fehlt, wenn sie nicht gelesen wurde. */
  readonly dateiHash?: string;
}

function abgelehnt(grund: Ablehnungsgrund, meldung: string): Pruefergebnis {
  return { art: "abgelehnt", grund, meldung };
}

/**
 * Prüft ein Manifest — die eine Stelle, an der entschieden wird, ob ein Update
 * angeboten wird.
 *
 * Die Reihenfolge der Prüfungen ist nicht beliebig: **Erst der Schlüssel, dann
 * die Signatur, dann der Inhalt.** Wer den Inhalt vor der Signatur läse und
 * daraus etwas ableitete — und sei es nur eine Meldung mit dem Dateinamen
 * darin —, verarbeitete Text, den irgendjemand geschrieben hat. Was hier vor
 * der Signaturprüfung geschieht, ist ausschließlich Formprüfung.
 */
export async function pruefeManifest(auftrag: Pruefauftrag): Promise<Pruefergebnis> {
  let manifest: Programmmanifest;
  try {
    manifest = JSON.parse(auftrag.text) as Programmmanifest;
  } catch {
    return abgelehnt("unlesbar", "Das Manifest ist kein gültiges JSON.");
  }

  const stand = manifest.stand;
  if (
    typeof manifest.signatur !== "string" ||
    typeof manifest.pubkey !== "string" ||
    typeof stand !== "object" ||
    stand === null ||
    typeof stand.version !== "string" ||
    typeof stand.datei !== "string" ||
    typeof stand.sha256 !== "string" ||
    typeof stand.plattform !== "string"
  ) {
    return abgelehnt("unlesbar", "Dem Manifest fehlen Pflichtangaben.");
  }

  // §5.8.1 sinngemäß: Ein Dateiname aus fremder Hand darf keinen Pfad tragen.
  // `../../` im Namen zeigte sonst aus dem Ordner heraus, und die Anwendung
  // böte an, eine beliebige Datei des Rechners zu starten.
  if (stand.datei.includes("/") || stand.datei.includes("\\") || stand.datei.includes("..")) {
    return abgelehnt("unlesbar", `Der Dateiname trägt einen Pfadanteil: ${stand.datei}`);
  }

  if (manifest.pubkey.toLowerCase() !== auftrag.vertrauterSchluessel.toLowerCase()) {
    return abgelehnt(
      "fremderSchluessel",
      "Das Manifest ist mit einem anderen Schlüssel signiert als dem, dem diese Fassung vertraut.",
    );
  }

  // Ein Fehlschlag der Prüfung und eine unlesbare Signatur sind dasselbe
  // Urteil: Sie passt nicht.
  //
  // **Der `try` umschließt auch `ausHex`.** Es wirft **synchron** bei
  // ungerader Länge oder fremden Zeichen, also bevor überhaupt eine Zusage
  // entsteht — ein `.catch()` an der Zusage finge das nicht. Ohne diese
  // Klammer stürzte die Prüfung an einer verbogenen Signatur ab, statt sie
  // abzulehnen: derselbe Angreifer, ein anderes Ergebnis.
  let gueltig: boolean;
  try {
    gueltig = await ed.verifyAsync(
      ausHex(manifest.signatur),
      signierteBytes(stand),
      ausHex(manifest.pubkey),
    );
  } catch {
    gueltig = false;
  }
  if (!gueltig) {
    return abgelehnt("signaturFalsch", "Die Signatur des Manifests passt nicht zu seinem Inhalt.");
  }

  // Ab hier ist der Inhalt beglaubigt und darf benutzt werden.
  if (stand.plattform !== auftrag.plattform) {
    return abgelehnt(
      "andereplattform",
      `Das Paket ist für ${stand.plattform}, dieser Rechner ist ${auftrag.plattform}.`,
    );
  }
  if (vergleicheVersionen(stand.version, auftrag.laufendeVersion) <= 0) {
    return abgelehnt(
      "nichtNeuer",
      `Angeboten wird ${stand.version}; es läuft bereits ${auftrag.laufendeVersion}.`,
    );
  }
  if (auftrag.dateiHash !== undefined && auftrag.dateiHash.toLowerCase() !== stand.sha256.toLowerCase()) {
    return abgelehnt(
      "dateiPasstNicht",
      "Die Datei neben dem Manifest hat einen anderen Hash als das Manifest nennt.",
    );
  }

  return {
    art: "angeboten",
    stand,
    // Die Kurzform ist reine Wiedererkennung und keine Zusicherung — sie steht
    // im Hinweis, damit ein Bediener beim Telefonat sagen kann, welchen
    // Schlüssel sein Rechner sieht.
    kurzform: kurzform(manifest.pubkey),
  };
}

/** Erste acht Bytes des Schlüssels als Hex, in Vierergruppen — wie im Bogenkern. */
export function kurzform(pubkeyHex: string): string {
  return pubkeyHex
    .slice(0, 16)
    .toLowerCase()
    .replace(/(.{4})(?=.)/g, "$1 ")
    .trim();
}

// ---------------------------------------------------------------------------
// Der Bezug eines Pakets aus einer Veröffentlichung (M9.1)
// ---------------------------------------------------------------------------
//
// **Was hier hinzukommt und was nicht.** Bisher legte ein Mensch das Paket von
// Hand in `programm\`. Das bleibt der Weg; was fehlte, war der Handgriff davor:
// Wer holt das Paket, und woher? Jetzt kann **ein** Arbeitsplatz es auf
// Knopfdruck aus der Veröffentlichung holen und in den Share legen — und die
// übrigen bekommen es über den Weg aus M7.2 angeboten, unverändert.
//
// **Kein Auto-Update.** Nichts hiervon läuft von selbst, nichts installiert
// etwas, und niemand telefoniert im Hintergrund nach Hause. Es ist ein
// Knopf, den ein Mensch drückt, und danach liegt eine Datei auf einer
// Freigabe. Entscheidung 7 bleibt damit unangetastet: Der Verteilweg **ist**
// der Share; die Veröffentlichung ist nur die Quelle, aus der er befüllt wird.
//
// **Das Deuten der Antwort steht in Ring 2 und ist rein**, aus demselben
// Grund wie die Manifestprüfung darüber: Die Antwort kommt aus dem Netz und
// ist damit Text, den irgendjemand geschrieben hat. Was daraus gelesen wird,
// muss einzeln prüfbar sein — ohne Netz, ohne Share, ohne Uhr.

/** Ein Anhang einer Veröffentlichung, so weit er hier gebraucht wird. */
export interface Releaseanhang {
  readonly name: string;
  readonly url: string;
  readonly groesse: number;
}

export interface Release {
  /** Die Fassung, aus dem Namen der Marke gewonnen — ohne führendes `v`. */
  readonly version: string;
  readonly anhaenge: readonly Releaseanhang[];
}

export type Releasebefund =
  | { readonly art: "gefunden"; readonly release: Release }
  | { readonly art: "unbrauchbar"; readonly meldung: string };

/**
 * Deutet die Antwort der Veröffentlichungsstelle.
 *
 * **Der Wirt wird geprüft und nicht geglaubt.** Die Antwort nennt zu jedem
 * Anhang eine Adresse zum Herunterladen, und diese Adresse kommt aus derselben
 * Quelle wie alles andere darin. Zeigte sie auf einen fremden Rechner, lüde
 * die Anwendung von dort — die Prüfung der Signatur fiele das später zwar auf,
 * aber der Ruf wäre getan und verriete, wer hier arbeitet. Deshalb: nur `https`
 * und nur die Wirte, die der Aufrufer nennt.
 *
 * **Entwürfe und Vorabfassungen werden abgewiesen.** Wer eine Vorabfassung an
 * eine Führungsstelle geben will, gibt sie ausdrücklich und nicht dadurch, dass
 * jemand auf einen Knopf drückt.
 *
 * Ein Anhangsname mit Pfadanteil fliegt hier heraus und nicht erst beim
 * Schreiben — derselbe Grund wie bei `stand.datei` oben.
 */
export function deuteRelease(text: string, erlaubteWirte: readonly string[]): Releasebefund {
  let roh: {
    tag_name?: unknown;
    draft?: unknown;
    prerelease?: unknown;
    assets?: unknown;
  };
  try {
    roh = JSON.parse(text) as typeof roh;
  } catch {
    return { art: "unbrauchbar", meldung: "Die Antwort der Veröffentlichungsstelle ist kein JSON." };
  }
  if (typeof roh !== "object" || roh === null) {
    return { art: "unbrauchbar", meldung: "Die Antwort ist kein Objekt." };
  }
  if (typeof roh.tag_name !== "string" || roh.tag_name === "") {
    return { art: "unbrauchbar", meldung: "Die Veröffentlichung trägt keine Marke." };
  }
  if (roh.draft === true) {
    return { art: "unbrauchbar", meldung: "Die neueste Veröffentlichung ist ein Entwurf." };
  }
  if (roh.prerelease === true) {
    return { art: "unbrauchbar", meldung: "Die neueste Veröffentlichung ist eine Vorabfassung." };
  }
  if (!Array.isArray(roh.assets)) {
    return { art: "unbrauchbar", meldung: "Die Veröffentlichung führt keine Anhänge." };
  }

  const anhaenge: Releaseanhang[] = [];
  for (const eintrag of roh.assets as readonly {
    name?: unknown;
    browser_download_url?: unknown;
    size?: unknown;
  }[]) {
    if (
      typeof eintrag !== "object" ||
      eintrag === null ||
      typeof eintrag.name !== "string" ||
      typeof eintrag.browser_download_url !== "string" ||
      typeof eintrag.size !== "number"
    ) {
      continue;
    }
    if (eintrag.name.includes("/") || eintrag.name.includes("\\") || eintrag.name.includes("..")) {
      return {
        art: "unbrauchbar",
        meldung: `Ein Anhang trägt einen Pfadanteil im Namen: ${eintrag.name}`,
      };
    }
    let wirt: string;
    try {
      const adresse = new URL(eintrag.browser_download_url);
      if (adresse.protocol !== "https:") {
        return { art: "unbrauchbar", meldung: `Ein Anhang wird nicht über https angeboten: ${eintrag.name}` };
      }
      wirt = adresse.hostname.toLowerCase();
    } catch {
      return { art: "unbrauchbar", meldung: `Ein Anhang hat keine gültige Adresse: ${eintrag.name}` };
    }
    if (!erlaubteWirte.includes(wirt)) {
      return {
        art: "unbrauchbar",
        meldung: `Ein Anhang liegt auf einem fremden Wirt: ${wirt}`,
      };
    }
    anhaenge.push({ name: eintrag.name, url: eintrag.browser_download_url, groesse: eintrag.size });
  }

  return {
    art: "gefunden",
    release: { version: roh.tag_name.replace(/^v/i, ""), anhaenge },
  };
}

/** Der Anhang mit genau diesem Namen — oder keiner. */
export function anhang(release: Release, name: string): Releaseanhang | undefined {
  return release.anhaenge.find((eintrag) => eintrag.name === name);
}
