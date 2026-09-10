// Baut die Installationspakete (M7.1).
//
// Warum ein Skript und kein blosser npm-Aufruf: Zwei Dinge muessen vor
// electron-builder entschieden werden, und beide sind Betriebsfragen.
//
// **Erstens die Signierung.** Auf einer Maschine ohne Zertifikat soll der Bau
// weiterlaufen und ein unsigniertes Paket liefern — nicht abbrechen. Ein
// Entwickler ohne Zertifikat muss ein Paket bauen koennen, sonst prueft
// niemand die Paketierung, bevor sie in der Freigabekette ankommt.
// electron-builder tut das von sich aus nur halb: Ohne
// `CSC_IDENTITY_AUTO_DISCOVERY=false` sucht es unter macOS im Schluesselbund
// und bricht ab, wenn es dort etwas Unpassendes findet.
//
// **Zweitens die Fassung.** Die Version im Paket kommt aus der Umgebung
// (`BUILD_VERSION`), damit die CI ihren Zeitstempel setzen kann, ohne die
// `package.json` im Baum zu aendern. Ohne Angabe bleibt es bei der Fassung aus
// der Datei.
//
// Aufruf:  node apps/desktop/bau/paket.mjs [--win|--mac|--linux] [--dir]
// `--dir`  packt nur das entpackte Verzeichnis — der schnelle Lauf, der
//          zeigt, dass die Dateiliste stimmt, ohne einen Installer zu bauen.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hierher = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(hierher, "..");
const wurzel = path.resolve(app, "..", "..");

const argumente = process.argv.slice(2);

/** Ohne Zertifikat unsigniert bauen statt abbrechen — siehe Kopf. */
const umgebung = { ...process.env };
if (umgebung["CSC_LINK"] === undefined && umgebung["CSC_KEY_PASSWORD"] === undefined) {
  umgebung["CSC_IDENTITY_AUTO_DISCOVERY"] = "false";
  process.stdout.write("paket: kein Zertifikat in der Umgebung — es wird unsigniert gebaut.\n");
}
// Notarisierung ohne Apple-Kennung ist nicht bloss erfolglos, sondern ein
// Abbruch. Sie wird deshalb nur eingeschaltet, wenn die Kennung dasteht.
if (umgebung["APPLE_ID"] === undefined) {
  argumente.push("--config.mac.notarize=false");
  process.stdout.write("paket: keine Apple-Kennung — Notarisierung ist aus.\n");
}

const version = umgebung["BUILD_VERSION"];
if (version !== undefined && version !== "") {
  argumente.push(`--config.extraMetadata.version=${version}`);
  process.stdout.write(`paket: Fassung aus der Umgebung: ${version}\n`);
}

const lauf = spawnSync(
  process.execPath,
  [
    path.join(wurzel, "node_modules", "electron-builder", "out", "cli", "cli.js"),
    "--config",
    path.join(app, "electron-builder.yml"),
    "--projectDir",
    app,
    "--publish",
    "never",
    ...argumente,
  ],
  { cwd: wurzel, env: umgebung, stdio: "inherit" },
);

process.exit(lauf.status ?? 1);
