/**
 * Die Paketierung als Konfiguration (M7.1).
 *
 * **Was hier geprüft wird und was nicht.** Ein Installer entsteht in der CI
 * und auf einer Maschine mit Zertifikat; ihn hier zu bauen, dauerte Minuten
 * und lüde für jede Zielplattform eine Electron-Binärdatei. Was ein Test
 * leisten kann, ist die Prüfung der **Entscheidungen** in der Konfiguration —
 * und genau die sind es, an denen V.1 hängt:
 *
 *  * `perMachine: false` ist die Zusage „Installation ohne Elevation". Fällt
 *    sie weg, fällt nach M-1 der ganze Desktop-Ansatz.
 *  * `!node_modules/**` hält das Archiv klein. Ohne diese Zeile sammelte
 *    electron-builder die drei geteilten Kerne samt Quellkarten ein, obwohl
 *    sie längst eingebündelt sind — 29 MB statt 9.
 *  * `publish: null` verhindert einen eingebauten Auto-Updater. Der
 *    Verteilweg ist der Share (V.2, Entscheidung 7).
 *
 * Dass die Konfiguration **trägt**, ist an anderer Stelle nachgewiesen: Ein
 * `--dir`-Lauf packt das Programm, und die Rauchprobe startet es aus dem
 * gepackten Verzeichnis heraus (siehe M7-Abschlussbericht).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const WURZEL = path.resolve(import.meta.dirname, "..");
const KONFIG = readFileSync(
  path.join(WURZEL, "apps", "desktop", "electron-builder.yml"),
  "utf8",
);

/**
 * Liest einen Wert aus der YAML-Datei, ohne einen YAML-Leser mitzubringen.
 *
 * Die Datei ist flach genug, dass eine Zeilensuche reicht, und eine
 * Abhängigkeit für einen Test wäre eine Abhängigkeit zu viel. Was der Test
 * nicht kann, ist YAML zu **deuten** — deshalb prüft er Zeilen und nicht
 * Werte einer geparsten Struktur.
 */
function hatZeile(muster: RegExp): boolean {
  return KONFIG.split("\n").some((zeile) => muster.test(zeile.trim()));
}

describe("Die Paketierung", () => {
  it("installiert unter Windows ins Benutzerprofil, ohne Administratorrechte", () => {
    // Der Kern von V.1 und das Abbruchkriterium aus M-1.
    expect(hatZeile(/^perMachine:\s*false$/)).toBe(true);
    // Kein Ein-Klick-Installer: Wer auf einem fremden Rechner installiert,
    // will sehen, wohin.
    expect(hatZeile(/^oneClick:\s*false$/)).toBe(true);
    expect(hatZeile(/^allowToChangeInstallationDirectory:\s*true$/)).toBe(true);
  });

  it("baut die beiden Windows-Ziele, die der Betrieb braucht", () => {
    // `nsis` für die Installation, `portable` für den Stick am Rechner, auf
    // dem niemand installieren darf.
    expect(KONFIG).toMatch(/win:[\s\S]*?- nsis/);
    expect(KONFIG).toMatch(/win:[\s\S]*?- portable/);
  });

  it("lässt node_modules aus dem Archiv", () => {
    // Alles Fremde ist eingebündelt; was electron-builder sonst einsammelt,
    // liegt zweimal im Paket.
    expect(hatZeile(/^-\s*"!node_modules\/\*\*\/\*"$/)).toBe(true);
  });

  it("trägt keinen Verteilweg im Paket", () => {
    // Der Verteilweg ist der Share (V.2). Ein eingebauter Auto-Updater, der
    // während einer Lage nach Hause telefoniert, ist genau das nicht.
    expect(hatZeile(/^publish:\s*null$/)).toBe(true);
  });

  it("nennt die ausführbare Datei beim Produktnamen", () => {
    // Ohne diese Zeile hieße sie `@s1desktop` — der Workspace-Name mit
    // entferntem Schrägstrich, und das stünde auf dem Rechner der
    // Führungsstelle.
    expect(hatZeile(/^name:\s*s1-control$/)).toBe(true);
    expect(hatZeile(/^productName:\s*S1-Control$/)).toBe(true);
  });

  it("pinnt die Electron-Fassung, die auch der Baum benutzt", () => {
    const wurzel = JSON.parse(
      readFileSync(path.join(WURZEL, "package.json"), "utf8"),
    ) as { devDependencies: Record<string, string> };
    const gefordert = wurzel.devDependencies["electron"] ?? "";
    const gepinnt = /^electronVersion:\s*(\S+)$/m.exec(KONFIG)?.[1] ?? "";
    // Die Fassung steht in der Konfiguration, weil `extraMetadata.dependencies`
    // leer ist und electron-builder sie dort nicht mehr findet. Zwei Stellen,
    // die auseinanderlaufen können — deshalb dieser Vergleich.
    expect(gepinnt).not.toBe("");
    expect(gefordert.replace(/^[\^~]/, "").split(".")[0]).toBe(gepinnt.split(".")[0]);
  });
});
