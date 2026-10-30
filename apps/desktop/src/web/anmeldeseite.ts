/**
 * Die Anmeldeseite der Web-Schale (ADR-006) — eine eigenstaendige Seite.
 *
 * Bewusst ohne React, ohne Skript und ohne nachgeladene Datei: Sie wird
 * ausgeliefert, **bevor** jemand den Renderer sehen darf, und sie muss auch
 * in einem Browser funktionieren, der Skripte sperrt. Ein klassisches
 * Formular `POST anmeldung` genuegt dafuer. Der Pfad ist relativ, damit die
 * Seite auch hinter einem Reverse-Proxy unter einem Unterpfad stimmt.
 *
 * Als Template hier und nicht als Datei im Renderer-Ordner: So braucht das
 * Laufbild nichts Zusaetzliches, und die Seite kann nicht fehlen.
 */

export interface AnmeldeseitenInhalt {
  readonly programmversion: string;
  /** Die eine Zeile ueber dem Formular; fehlt sie, steht dort nichts. */
  readonly fehler?: string;
}

/** Was die Seite an Kopfzeilen braucht: nie zwischenspeichern, nie einrahmen. */
export const ANMELDESEITE_KOEPFE = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
} as const;

function maskiere(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const STIL = `
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font: 16px/1.4 system-ui, sans-serif; background: #f2f4f7; color: #1b2733; }
  main { background: #fff; border: 1px solid #c9d1db; border-radius: 6px; padding: 24px 28px;
         width: min(320px, calc(100vw - 32px)); box-sizing: border-box; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .marke { color: #003399; font-weight: 700; margin-right: 6px; }
  p.unter { margin: 0 0 16px; color: #556270; font-size: 14px; }
  label { display: block; margin: 12px 0 4px; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; padding: 8px; font-size: 16px;
          border: 1px solid #8a96a3; border-radius: 4px; }
  button { margin-top: 18px; width: 100%; padding: 10px; font-size: 16px; font-weight: 600;
           color: #fff; background: #003399; border: 0; border-radius: 4px; cursor: pointer; }
  .fehler { margin: 0 0 8px; padding: 8px; color: #8a1010; background: #fde8e8;
            border: 1px solid #e3a3a3; border-radius: 4px; }
  footer { margin-top: 16px; color: #556270; font-size: 12px; text-align: center; }
  @media (prefers-color-scheme: dark) {
    body { background: #11161c; color: #e3e8ee; }
    main { background: #1b232c; border-color: #33404d; }
    input { background: #11161c; color: #e3e8ee; border-color: #55626f; }
    p.unter, footer { color: #9aa6b2; }
  }`;

export function anmeldeseite(inhalt: AnmeldeseitenInhalt): string {
  const fehler =
    inhalt.fehler === undefined ? "" : `<p class="fehler" role="alert">${maskiere(inhalt.fehler)}</p>`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Anmeldung – S1-Control</title>
<style>${STIL}</style>
</head>
<body>
<main>
<h1><span class="marke">THW</span>S1-Control</h1>
<p class="unter">Anmeldung zur Web-Schale</p>
${fehler}
<form method="post" action="anmeldung">
<label for="anmeldename">Anmeldename</label>
<input id="anmeldename" name="anmeldename" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
<label for="passwort">Passwort</label>
<input id="passwort" name="passwort" type="password" autocomplete="current-password" required>
<button type="submit">Anmelden</button>
</form>
<footer>S1-Control ${maskiere(inhalt.programmversion)}</footer>
</main>
</body>
</html>
`;
}
