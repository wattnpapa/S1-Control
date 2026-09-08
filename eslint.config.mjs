import js from "@eslint/js";
import tseslint from "typescript-eslint";

// ============================================================================
// Die Ringgrenzen aus 02-ZIELBILD.md, maschinell erzwungen.
//
// Grundregel: jeder Ring darf nur nach innen importieren, nie nach aussen.
//
//   @bos/kern     (Ring 1)  plattformneutral, geteilt — eigene Regeln im
//                           Kern-Repo, hier bewusst nicht doppelt geprüft.
//   @s1/domaene   (Ring 2)  plattformneutral, darf nur @bos/kern.
//   @s1/speicher  (Ring 3)  node: + @s1/domaene.
//   @s1/netz      (Ring 3)  node: + @s1/domaene.
//   @s1/ausgaben  (Ring 3)  @s1/domaene + @bos/kern, kein Electron.
//   @s1/cli       (Ring 3)  alle @s1/*, node:, kein Electron.
//   apps/desktop  (Ring 4)  darf alles nach innen; der Main-Prozess zieht
//                           aber keine Renderer-Bibliotheken.
//
// Ergänzend, und deshalb nicht hier: `tsconfig.json` je Paket. `@s1/domaene`
// bekommt weder "DOM" in `lib` noch Node-Typen, damit auch der Griff nach
// `document` oder `process` ohne Import schon an der Typprüfung scheitert.
// ============================================================================

/** Die Kernmodulnamen ohne `node:`-Präfix — als Namensliste, damit ein Paket wie „node-fetch“ nicht mitgefangen wird. */
const NODE_KERNMODULE = [
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "fs/promises", "http", "http2", "https", "inspector",
  "module", "net", "os", "path", "path/posix", "path/win32", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl", "stream",
  "string_decoder", "sys", "timers", "tls", "trace_events", "tty", "url",
  "util", "v8", "vm", "wasi", "worker_threads", "zlib",
];

const namen = (liste, message) => liste.map((name) => ({ name, message }));

const KEIN_NODE = {
  paths: namen(
    NODE_KERNMODULE,
    "Dieser Ring ist plattformneutral: keine Node-Kernmodule (02-ZIELBILD.md, „Vier Ringe“).",
  ),
  patterns: [
    {
      group: ["node:*"],
      message:
        "Dieser Ring ist plattformneutral: keine Node-Kernmodule (02-ZIELBILD.md, „Vier Ringe“).",
    },
  ],
};

const KEIN_ELECTRON = {
  patterns: [
    {
      group: ["electron", "electron/*", "electron-updater", "electron-builder"],
      message: "Electron gehört ausschließlich in apps/desktop (02-ZIELBILD.md, „Vier Ringe“).",
    },
  ],
};

const KEINE_RENDERER_BIBLIOTHEK = {
  patterns: [
    {
      group: ["react", "react-dom", "react/*", "react-dom/*", "@testing-library/*", "zustand", "zustand/*"],
      message:
        "React und andere Renderer-Bibliotheken gehören in apps/desktop/src/renderer, nirgends sonst.",
    },
  ],
};

const KEIN_GRIFF_NACH_AUSSEN = {
  patterns: [
    {
      group: ["@s1/desktop", "@s1/desktop/*", "**/apps/**"],
      message: "Kein Paket importiert aus apps/*. Ringe importieren nur nach innen.",
    },
  ],
};

/** Baut die Verbotsliste für die @s1/*-Pakete, die dieser Ring nicht sehen darf. */
const keineGeschwister = (...pakete) =>
  namen(pakete, "Ringe importieren nur nach innen; dieses @s1-Paket liegt nicht innerhalb.");

/** Fügt mehrere Regelbausteine zu einer no-restricted-imports-Option zusammen. */
const verbot = (...bausteine) => [
  "error",
  {
    paths: bausteine.flatMap((b) => b.paths ?? []),
    patterns: bausteine.flatMap((b) => b.patterns ?? []),
  },
];

const ringRegel = (files, ...bausteine) => ({
  files,
  rules: {
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": verbot(...bausteine),
  },
});

export default tseslint.config(
  {
    ignores: [
      // v1 wird nicht mehr gebaut und nicht mehr gelintet; er liegt nur noch
      // als Referenz da (siehe README-v2.md).
      "legacy-v1/**",
      // Der geteilte Kern prüft seine Aufnahmeregeln in seinem eigenen Repo.
      "vendor/**",
      "**/dist/**",
      "**/out/**",
      "**/node_modules/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  // Bewusst ohne `recommendedTypeChecked`: die Ringgrenzen sind reine
  // Importregeln und brauchen keine Typinformation. Das hält den Lint schnell
  // und unabhängig von der TypeScript-7-/TypeScript-6-Doppelinstallation, die
  // typescript-eslint derzeit noch braucht.
  ...tseslint.configs.recommended,

  ringRegel(
    ["packages/domaene/src/**/*.ts"],
    KEIN_NODE,
    KEIN_ELECTRON,
    KEINE_RENDERER_BIBLIOTHEK,
    KEIN_GRIFF_NACH_AUSSEN,
    { paths: keineGeschwister("@s1/speicher", "@s1/netz", "@s1/ausgaben", "@s1/cli") },
  ),

  ringRegel(
    ["packages/speicher/src/**/*.ts", "packages/netz/src/**/*.ts"],
    KEIN_ELECTRON,
    KEINE_RENDERER_BIBLIOTHEK,
    KEIN_GRIFF_NACH_AUSSEN,
    { paths: keineGeschwister("@s1/ausgaben", "@s1/cli") },
  ),

  ringRegel(
    ["packages/ausgaben/src/**/*.ts"],
    // Kein node: — die Vorlagen liefern Zeichenketten; Dateien schreibt die
    // Schale. Passend dazu steht in der tsconfig "types": [].
    KEIN_NODE,
    KEIN_ELECTRON,
    KEINE_RENDERER_BIBLIOTHEK,
    KEIN_GRIFF_NACH_AUSSEN,
    { paths: keineGeschwister("@s1/speicher", "@s1/netz", "@s1/cli") },
  ),

  ringRegel(
    ["packages/cli/src/**/*.ts"],
    KEIN_ELECTRON,
    KEINE_RENDERER_BIBLIOTHEK,
    KEIN_GRIFF_NACH_AUSSEN,
  ),

  ringRegel(
    ["apps/desktop/src/main/**/*.ts"],
    // Electron ist hier erlaubt und erwünscht; Renderer-Bibliotheken nicht.
    KEINE_RENDERER_BIBLIOTHEK,
  ),

  ringRegel(
    ["apps/desktop/src/renderer/**/*.ts", "apps/desktop/src/renderer/**/*.tsx"],
    // Der Renderer erreicht die Schale nur über die im Preload freigegebene
    // Brücke — weder Node noch Electron direkt.
    KEIN_NODE,
    KEIN_ELECTRON,
    { paths: keineGeschwister("@s1/speicher", "@s1/netz", "@s1/cli") },
  ),

  {
    // Werkzeug- und Konfigurationsdateien liegen außerhalb der Ringe.
    files: ["*.mjs", "*.ts", "bau/**/*.mjs", "apps/desktop/bau/**/*.mjs", "apps/*/vite.config.ts"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
);
