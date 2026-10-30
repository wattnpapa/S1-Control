/**
 * `s1 akte pruefe <einsatzordner>` — die Abnahme von M2.4
 * (05-UMSETZUNGSPLAN.md: „Konvergenz per `s1 akte pruefe`, kein
 * Datenverlust").
 *
 * Das Kommando nimmt einen Einsatzordner — auf dem Share oder einen lokalen
 * Spiegel — und beantwortet die zwei Fragen, die nach einem Übungslauf offen
 * sind:
 *
 *  1. **Ist die Akte heil?** Jede Ereignisdatei wird von Offset 0 nach den
 *     Regeln aus KONZEPT-SPEICHER.md §2.1 bis §2.3 gelesen: Zeilenformat
 *     `länge \t crc32 \t json`, CRC, Hash-Kette. Was nicht durchgeht, wird mit
 *     Datei, Offset und Grund benannt — und dabei nach §8.1 (unvollständige
 *     letzte Zeile, **kein** Fehler) und §8.2 (Defekt, endgültige Quarantäne)
 *     unterschieden. Diese Unterscheidung ist der Kern der Auskunft: Ein
 *     abgebrochener Anhang am Dateiende ist der Normalfall eines gezogenen
 *     Kabels, ein gekipptes Byte in der Mitte ist es nicht.
 *  2. **Führen zwei Rechner denselben Einsatz?** Mit `--vergleiche <ordner>`
 *     wird beides geprüft und der `zustandsHash` nach §7.6 verglichen. Das ist
 *     das Konvergenzkriterium, und es ist der eigentliche Zweck von M2.4: Zwei
 *     physische Rechner am selben Share müssen nach einer Stunde mit Störungen
 *     denselben Zustand halten.
 *
 * **Warum ein eigenes Kommando und nicht die Diagnoseansicht.** Die Abnahme
 * läuft auf zwei Rechnern, deren Anwendung nach dem Versuch geschlossen ist;
 * geprüft wird der Dateibestand, nicht ein laufender Prozess. Das Kommando
 * greift deshalb ausschließlich lesend auf den Ordner zu und öffnet keine
 * Akte: Es darf weder spiegeln noch reparieren noch eine Präsenzdatei
 * hinterlassen. Ein Prüfwerkzeug, das seinen Prüfgegenstand verändert, taugt
 * für eine Abnahme nicht.
 *
 * **Der Exitcode trägt das Urteil, nicht der Text.** Wie `s1 simuliere`
 * (Auflage 18) muss dieser Schritt ohne Textauswertung entscheidbar sein:
 * 0 heißt in Ordnung, 1 heißt Befunde, 2 heißt Aufruffehler.
 *
 * **Die Prüfung selbst steht in `@s1/speicher`** (`aktenpruefung.ts`): Seit
 * die Einsatzakte auch aus der Oberfläche erzeugt wird, braucht der Worker
 * dieselbe, und zwei Fassungen derselben Prüfung liefen auseinander. Hier
 * bleiben Bericht, Vergleich und Exitcode.
 */

import {
  DATEI_EINSATZ,
  endgueltigeBefunde,
  fundstelle,
  knotenDateisystem,
  pruefeOrdner,
  widerspruechlicheDoppel,
  type Befund,
  type Dateisystem,
  type Pruefergebnis,
} from "@s1/speicher";

/**
 * Ergebnis eines Kommandos: Ausgabetext und Exitcode.
 *
 * Hier noch einmal beschrieben statt aus `index.ts` geholt: Die Verdrahtung
 * geht von dort hierher, und ein Rückimport machte aus zwei Dateien einen
 * Kreis. Beide Formen sind dieselbe, und TypeScript prüft das bei der
 * Verdrahtung strukturell.
 */
export interface Ergebnis {
  readonly text: string;
  readonly code: number;
}

function befundzeile(befund: Befund): string {
  const zeichen = befund.klasse === "endgueltig" ? "!" : "·";
  const ort = befund.offset === undefined ? befund.datei : fundstelle(befund.datei, befund.offset);
  return `  ${zeichen} ${ort}: ${befund.grund}`;
}

/** Der Bericht zu einem Ordner. Lesbar für einen Menschen, der ihn ausdruckt. */
export function berichte(ergebnis: Pruefergebnis): string {
  const zeilen: string[] = [];
  zeilen.push(`Einsatzordner:     ${ergebnis.ordner}`);
  if (ergebnis.anker === undefined) {
    zeilen.push(`Einsatz:           — (${DATEI_EINSATZ} nicht lesbar)`);
  } else {
    zeilen.push(`Einsatz:           ${ergebnis.anker.name} (${ergebnis.anker.einsatzId})`);
    zeilen.push(`Angelegt:          ${ergebnis.anker.angelegtAm} durch ${ergebnis.anker.angelegtVon}`);
  }

  const zeilenzahl = ergebnis.dateien.reduce((summe, d) => summe + d.zeilen, 0);
  zeilen.push(`Ereignisdateien:   ${ergebnis.dateien.length} mit ${zeilenzahl} geprüften Zeilen`);
  for (const datei of ergebnis.dateien) {
    const rest = datei.bytes - datei.geprueftBis;
    const anhang = rest === 0 ? "" : ` (${rest} Byte dahinter nicht ausgewertet)`;
    zeilen.push(`  ${datei.name}: ${datei.zeilen} Zeilen, geprüft bis Byte ${datei.geprueftBis}${anhang}`);
  }

  zeilen.push("");
  const endgueltig = endgueltigeBefunde(ergebnis);
  const vorlaeufig = ergebnis.befunde.filter((b) => b.klasse === "vorlaeufig");
  if (ergebnis.befunde.length === 0) {
    zeilen.push("Befunde:           keine");
  } else {
    zeilen.push(`Befunde:           ${endgueltig.length} endgültig (§8.2), ${vorlaeufig.length} vorläufig (§8.1)`);
    for (const befund of ergebnis.befunde) zeilen.push(befundzeile(befund));
  }

  if (ergebnis.doppelte.length > 0) {
    zeilen.push("");
    zeilen.push(`Doppelte Ereignis-Ids: ${ergebnis.doppelte.length}`);
    for (const doppel of ergebnis.doppelte) {
      const urteil = doppel.gleicherInhalt
        ? "gleicher Inhalt — dasselbe Ereignis (§4.6), einmal gefaltet"
        : "ANDERER Inhalt — zwei Schreiber unter derselben Kennung (§4.5, §8.2)";
      zeilen.push(`  ${doppel.id}: ${doppel.zuerst} und ${doppel.wieder} — ${urteil}`);
    }
  }

  zeilen.push("");
  zeilen.push("Gefalteter Zustand (§7.6):");
  zeilen.push(`  Ereignisse:      ${ergebnis.ereignisse}`);
  zeilen.push(`  Verwaltung:      ${ergebnis.verwaltungsereignisse} ausgesondert (§2.4)`);
  zeilen.push(`  foldVersion:     ${ergebnis.foldVersion}`);
  zeilen.push(`  zustandsHash:    ${ergebnis.zustandsHash}`);
  zeilen.push(`  Abschnitte:      ${ergebnis.abschnitte}`);
  zeilen.push(`  Einheiten:       ${ergebnis.einheiten}`);
  zeilen.push(`  Konflikthinweise: ${ergebnis.hinweise}`);
  zeilen.push(`  Unbekannte Arten: ${ergebnis.unbekannt}`);
  return zeilen.join("\n");
}

/**
 * Der Vergleich zweier Ordner — das Konvergenzkriterium aus §7.6.
 *
 * Verglichen wird der `zustandsHash` und **nicht** der Dateibestand. Zwei
 * Rechner haben nach einer Stunde mit Störungen zwangsläufig verschieden
 * geschnittene Dateien: Jeder hat eigene Segmente, ein reparierter hat ein
 * Ersatzsegment (§4.6), und der lokale Spiegel eines Lesers endet bei fremden
 * Dateien an seinem geprüften Präfix (§5.5). Gleich sein muss die Wirkung der
 * Ereignisse, und genau die misst der Hash.
 *
 * Anders als in der Simulation M0.4 wird hier **kein** Versionsvektor
 * herangezogen. Der Vektor beantwortet die Frage „haben beide dieselbe Eingabe
 * gesehen"; in M2.4 ist der Versuch beendet und beide Ordner sind ausgespiegelt
 * — gefragt ist das Ergebnis. Ein Unterschied in der Ereigniszahl wird deshalb
 * getrennt genannt, damit ein gleicher Hash bei ungleicher Menge nicht als
 * Konvergenz durchgeht.
 */
export function vergleichsbericht(links: Pruefergebnis, rechts: Pruefergebnis): {
  readonly text: string;
  readonly gleich: boolean;
} {
  const gleich = links.zustandsHash === rechts.zustandsHash;
  const zeilen = ["", "Konvergenzvergleich (§7.6):"];
  zeilen.push(`  ${links.ordner}`);
  zeilen.push(`    ${links.zustandsHash} über ${links.ereignisse} Ereignisse`);
  zeilen.push(`  ${rechts.ordner}`);
  zeilen.push(`    ${rechts.zustandsHash} über ${rechts.ereignisse} Ereignisse`);
  if (gleich) {
    zeilen.push("  Beide Ordner ergeben denselben zustandsHash — konvergent.");
    if (links.ereignisse !== rechts.ereignisse) {
      zeilen.push(
        "  Hinweis: verschieden viele Ereignisse bei gleichem Hash — die zusätzlichen sind wirkungslos.",
      );
    }
  } else {
    zeilen.push("  FEHLER — verschiedener zustandsHash: die beiden Rechner führen nicht denselben Einsatz.");
  }
  return { text: zeilen.join("\n"), gleich };
}

/** Alle Optionen, die `akte pruefe` kennt. Alles Übrige ist ein Aufruffehler. */
const ERLAUBTE_OPTIONEN = new Set(["vergleiche"]);

/**
 * Führt `s1 akte pruefe <ordner> [--vergleiche <ordner>]` aus.
 *
 * `argv` sind die Wörter **nach** `akte pruefe`. Wie in `index.ts` nimmt das
 * Kommando `argv` entgegen und greift nicht nach `process`: So ist es ohne
 * Unterprozess testbar, und der Exitcode ist Rückgabewert statt Nebenwirkung.
 */
export async function pruefe(
  argv: readonly string[],
  dateisystem: Dateisystem = knotenDateisystem(),
): Promise<Ergebnis> {
  const stellen: string[] = [];
  let vergleichsordner: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) {
      stellen.push(wort);
      continue;
    }
    const name = wort.slice(2);
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith("--")) {
      throw new SyntaxError(`--${name} braucht einen Ordner`);
    }
    vergleichsordner = wert;
    i += 1;
  }

  const ordner = stellen[0];
  if (ordner === undefined) throw new SyntaxError("Es fehlt der Einsatzordner");
  if (stellen.length > 1) throw new SyntaxError(`Unerwartetes Wort: ${stellen[1] as string}`);

  const ergebnis = await pruefeOrdner(dateisystem, ordner);
  const teile = [berichte(ergebnis)];
  let mangel = endgueltigeBefunde(ergebnis).length > 0 || widerspruechlicheDoppel(ergebnis).length > 0;

  if (vergleichsordner !== undefined) {
    const zweites = await pruefeOrdner(dateisystem, vergleichsordner);
    teile.push("", berichte(zweites));
    const vergleich = vergleichsbericht(ergebnis, zweites);
    teile.push(vergleich.text);
    mangel =
      mangel ||
      !vergleich.gleich ||
      endgueltigeBefunde(zweites).length > 0 ||
      widerspruechlicheDoppel(zweites).length > 0;
  }

  teile.push("");
  teile.push(mangel ? "Ergebnis: Befunde — siehe oben." : "Ergebnis: in Ordnung.");
  // Der Exitcode trägt das Urteil: 0 in Ordnung, 1 Befunde. Ein Abnahmeschritt
  // muss ohne Textauswertung entscheidbar sein (Auflage 18).
  return { text: teile.join("\n"), code: mangel ? 1 : 0 };
}
