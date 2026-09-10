/**
 * `s1 paket schluessel` — das Schlüsselpaar für den Verteilweg erzeugen (M9.2).
 *
 * **Warum das ein Kommando ist und kein Einzeiler in einem Kommentar.** Bis
 * hierher stand die Anleitung als `node -e "…"` im Kopf von
 * `verteilschluessel.ts`. Sie lief, und sie hatte zwei Fehler, die sich erst
 * im Gebrauch zeigen: Sie schrieb den **privaten** Schlüssel in die
 * Bildschirmausgabe — und damit in den Verlauf der Sitzung, in die
 * Zwischenablage und womöglich in ein Protokoll —, und sie ließ den
 * Empfänger mit einer Hexkette allein, ohne zu sagen, wohin sie gehört.
 *
 * Deshalb hier: Der private Teil geht **in eine Datei**, mit Rechten für den
 * Eigentümer allein und ohne Überschreiben. Auf dem Bildschirm erscheint nur
 * der öffentliche Teil, und zwar als die Zeile, die in den Quelltext kommt.
 *
 * **Ein Schlüsselpaar wird einmal erzeugt und danach nie wieder.** Wer ein
 * zweites erzeugt und hinterlegt, erklärt damit jedes bereits veröffentlichte
 * Manifest für ungültig: Die Arbeitsplätze mit der alten Fassung lehnen alles
 * Neue als `fremderSchluessel` ab, bis sie von Hand aktualisiert sind. Das
 * Kommando überschreibt eine vorhandene Schlüsseldatei deshalb nicht.
 */

import * as fsp from "node:fs/promises";
import path from "node:path";

import { schluesselpaarErzeugen, zuHex } from "@bos/eeb-format";

import type { Ergebnis } from "../index.js";

/** Der vorgeschlagene Name, wenn `--ziel` fehlt. */
export const SCHLUESSEL_VORGABE = "verteilschluessel.privat";

const ERLAUBTE_OPTIONEN = new Set(["ziel"]);

function deute(argv: readonly string[]): { readonly ziel: string } {
  let ziel = SCHLUESSEL_VORGABE;
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) throw new SyntaxError(`Unerwartetes Wort: ${wort}`);
    const name = wort.slice(2);
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith("--")) throw new SyntaxError(`--${name} braucht einen Pfad`);
    ziel = wert;
    i += 1;
  }
  return { ziel };
}

/** Ob unter diesem Pfad schon etwas liegt. */
async function liegtSchon(pfad: string): Promise<boolean> {
  try {
    await fsp.stat(pfad);
    return true;
  } catch {
    return false;
  }
}

/**
 * `s1 paket schluessel [--ziel <datei>]`.
 *
 * Die Datei bekommt `0600` — lesbar allein für den Eigentümer. Unter Windows
 * tut `chmod` nichts; dort schützt die Datei, wer sie wohin legt. Das steht
 * ausdrücklich in der Ausgabe, weil eine Zusage, die auf der Zielplattform
 * nicht gilt, schlimmer ist als keine.
 */
export async function schluessel(argv: readonly string[]): Promise<Ergebnis> {
  const { ziel } = deute(argv);

  if (await liegtSchon(ziel)) {
    return {
      text: [
        `Unter ${ziel} liegt bereits eine Datei.`,
        "",
        "Ein Schlüsselpaar wird einmal erzeugt und danach nie wieder: Ein zweites",
        "erklärt jedes bereits veröffentlichte Manifest für ungültig, weil die",
        "Arbeitsplätze mit der alten Fassung es als fremden Schlüssel ablehnen.",
        "Wenn Sie wirklich ein neues wollen, benennen Sie die alte Datei um oder",
        "wählen Sie mit --ziel einen anderen Pfad.",
      ].join("\n"),
      code: 2,
    };
  }

  const paar = await schluesselpaarErzeugen();
  const privatHex = zuHex(paar.privat);
  const oeffentlichHex = zuHex(paar.oeffentlich);

  await fsp.mkdir(path.dirname(path.resolve(ziel)), { recursive: true });
  // `mode` beim Anlegen und nicht `chmod` danach: Zwischen Anlegen und
  // Nachbessern läge ein Augenblick, in dem die Datei für alle lesbar wäre.
  await fsp.writeFile(ziel, `${privatHex}\n`, { encoding: "utf8", mode: 0o600 });

  // Die Rechtezeile hängt an der Plattform; alles andere ist fest. Sie hier
  // zu bauen und nicht im Textblock unten zu filtern, ist der Unterschied
  // zwischen „eine Zeile weglassen" und „alle Leerzeilen weglassen" — der
  // erste Entwurf tat das zweite und lieferte einen Absatz ohne Absätze.
  const rechte =
    process.platform === "win32"
      ? [
          "  Achtung: Unter Windows setzt dieser Aufruf keine Dateirechte. Legen Sie",
          "  die Datei an eine Stelle, auf die nur Sie Zugriff haben.",
        ]
      : ["  Rechte: 0600 — lesbar allein für den Eigentümer."];

  return {
    text: [
      `Privater Schlüssel geschrieben: ${path.resolve(ziel)}`,
      ...rechte,
      "",
      "Dieser Teil gehört in den Tresor der Führungsstelle und in keinen Baum.",
      "Wer ihn verliert, kann keine Pakete mehr veröffentlichen; wer ihn findet,",
      "kann es.",
      "",
      "Der öffentliche Teil gehört in den Quelltext. Diese Zeile ersetzt die",
      "gleichnamige in apps/desktop/src/main/verteilschluessel.ts:",
      "",
      `export const VERTRAUTER_SCHLUESSEL = "${oeffentlichHex}";`,
      "",
      "Danach neu bauen und ausliefern: Erst eine Fassung, die diesen Schlüssel",
      "kennt, nimmt damit signierte Pakete an.",
    ].join("\n"),
    code: 0,
  };
}
