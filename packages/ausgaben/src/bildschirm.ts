/**
 * Macht eine Ausgabeseite bildschirmtauglich, ohne den Druck zu ändern.
 *
 * Die Vorlagen sind für A4 gebaut. Auf dem Handy liefen sie rechts aus dem
 * Bild (die Tabellen sind breiter als der Bildschirm, die Seite ohne
 * `viewport` wird auf 980 px gerendert). Die Hülle ergänzt `viewport`,
 * steckt jede Tabelle in einen waagerecht scrollbaren Rahmen und begrenzt die
 * Seitenbreite — alles nur unter `@media screen`, der Druck bleibt, wie er ist.
 *
 * Idempotent: Eine Seite, die schon ein `viewport` oder einen
 * `tabellenrahmen` trägt, bekommt beides nicht noch einmal.
 */

const STIL =
  "<style>/*bildschirm*/@media screen{body{max-width:100vw;overflow-wrap:anywhere}" +
  ".tabellenrahmen{max-width:100%;overflow-x:auto}img{max-width:100%}}</style>";

export function bildschirmtauglich(html: string): string {
  let ergebnis = html;
  if (!/name=["']viewport["']/u.test(ergebnis)) {
    ergebnis = ergebnis.replace(
      "</head>",
      '<meta name="viewport" content="width=device-width, initial-scale=1" /></head>',
    );
  }
  if (!ergebnis.includes("/*bildschirm*/")) ergebnis = ergebnis.replace("</head>", `${STIL}</head>`);
  if (!ergebnis.includes('class="tabellenrahmen"')) {
    ergebnis = ergebnis
      .replace(/<table\b/gu, '<div class="tabellenrahmen"><table')
      .replace(/<\/table>/gu, "</table></div>");
  }
  return ergebnis;
}
