/**
 * Der Bericht eines Simulationslaufs.
 *
 * Er ist kein Protokollausdruck, sondern die Abnahme: Auflage 18
 * (03-MEILENSTEINE.md) verlangt ein **zählbares** Abbruchkriterium, und
 * 05-UMSETZUNGSPLAN.md nennt drei Zahlen, an denen M0 abbricht. Ein grüner
 * Lauf, der nichts entscheidet, erfüllt die Auflage nicht — deshalb steht hier
 * je Phase, welcher der drei Ausgänge aus §7.6 eingetreten ist, und am Ende,
 * welche Störung wie oft gegriffen hat. Eine geforderte Störung, die null Mal
 * vorkam, ist ein Mangel und wird als solcher genannt.
 */

import type { Laufergebnis } from "./lauf.js";

const AUSGANG: Readonly<Record<string, string>> = {
  konvergent: "Konvergenz nachgewiesen",
  abweichend: "FEHLER — gleiche Vektoren, verschiedener Hash",
  nichtVergleichbar: "nicht vergleichbar (kein Fehler, kein Nachweis)",
  zuWenigeClients: "zu wenige Clients ohne Quarantäne",
};

/**
 * Die Störungen, die M0.4 nennt und die deshalb vorkommen müssen.
 *
 * Die letzten vier standen bis zum 2026-09-09 in einer eigenen Liste
 * `WEITERE_STOERUNGEN`, deren Ausbleiben ausdrücklich **kein** Mangel war.
 * Das hat den Lauf zu milde gemessen: Ein Lauf konnte grün sein, ohne §8.2
 * (Beschädigung, Quarantäne), §4.6 (Ersatzsegment), §4.5 Fall 2 (Profilklon),
 * §8.9 (Schreibrechtentzug) oder §8.8 (lokale Schreibstörung) auch nur
 * berührt zu haben — und Abschnitt 3 des Messprotokolls behauptete das
 * Gegenteil. Befund des dritten Gutachterdurchgangs (7.6, beobachtet).
 *
 * Ob eine Störung gefordert ist, entscheidet weiterhin `istGefordert` am
 * Plan: Ein Plan, der sie ausschaltet, fordert sie nicht.
 */
export const GEFORDERTE_STOERUNGEN: readonly string[] = [
  // Fehlerinjektion aus der DoD.
  "kill",
  "partition",
  "uhrsprung",
  // Feindliche Dateisystem-Schicht aus der DoD.
  "abgeschnittenShare",
  "abgeschnittenLokal",
  "renameFehler",
  "blockade",
  "fileNotFoundCache",
  "verzeichnisCache",
  "sichtbarkeitVerzoegert",
  // Die Fehlerbilder aus §9 (Auflage 15). Ohne sie weist der Lauf über §8.2,
  // §4.6, §4.5 Fall 2, §8.9 und §8.8 nichts nach.
  "beschaedigung",
  "profilKlon",
  "schreibrechtEntzug",
  "lokaleSchreibstoerung",
];

/**
 * Zahl mit Tausenderpunkt und Komma — von Hand, nicht über `toLocaleString`.
 *
 * `toLocaleString("de-DE")` fällt auf einem Node ohne volles ICU auf eine
 * andere Schreibweise zurück; der Berichtstext unterschiede sich dann zwischen
 * den drei Betriebssystemen aus Auflage 17.
 */
function zahl(wert: number, stellen = 0): string {
  const fest = wert.toFixed(stellen);
  const [ganz, bruch] = fest.split(".");
  const vorzeichen = (ganz as string).startsWith("-") ? "-" : "";
  const ziffern = (ganz as string).replace("-", "");
  const gruppiert = ziffern.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return bruch === undefined ? `${vorzeichen}${gruppiert}` : `${vorzeichen}${gruppiert},${bruch}`;
}

/**
 * Welche vom Plan **geforderten** Störungen in diesem Lauf gar nicht vorkamen.
 *
 * „Gefordert" heißt: Der Plan hat sie eingeschaltet. Ein Plan, der eine Störung
 * auf 0 setzt oder so wenige Kommandos vorsieht, dass sie rechnerisch nicht
 * vorkommen kann, fordert sie nicht — und ihr Ausbleiben ist dann kein Mangel,
 * sondern die Folge des Plans. Der Abnahmeplan fordert alle zehn.
 */
export function fehlendeStoerungen(ergebnis: Laufergebnis): readonly string[] {
  const gezaehlt = { ...ergebnis.stoerungen, ...ergebnis.dateisystemZaehler };
  return GEFORDERTE_STOERUNGEN.filter(
    (name) => istGefordert(ergebnis, name) && (gezaehlt[name] ?? 0) === 0,
  );
}

/** Ob der Plan diese Störung eingeschaltet hat und mindestens ein Treffer zu erwarten war. */
function istGefordert(ergebnis: Laufergebnis, name: string): boolean {
  const p = ergebnis.plan;
  const erwartet = (wahrscheinlichkeit: number, gelegenheiten: number): boolean =>
    wahrscheinlichkeit > 0 && wahrscheinlichkeit * gelegenheiten >= 1;
  switch (name) {
    case "kill":
      return erwartet(p.fehler.kill, p.kommandos);
    case "partition":
      return erwartet(p.fehler.partition, p.kommandos);
    case "uhrsprung":
      return erwartet(p.fehler.uhrsprung, p.kommandos);
    case "abgeschnittenShare":
      return erwartet(p.profil.abgeschnittenShare, p.kommandos);
    case "abgeschnittenLokal":
      return erwartet(p.profil.abgeschnittenLokal, p.kommandos);
    case "renameFehler":
      return erwartet(p.profil.renameFehler, p.kommandos);
    case "blockade":
      return erwartet(p.profil.blockade, p.kommandos);
    case "fileNotFoundCache":
      return p.profil.fileNotFoundCacheMs > 0;
    case "verzeichnisCache":
      return p.profil.verzeichnisCacheMs > 0;
    case "sichtbarkeitVerzoegert":
      return p.profil.sichtbarkeitsverzoegerungMs > 0;
    // Die Beschädigung wird nur in der **letzten** Phase gezogen (`lauf.ts`,
    // Phasenschleife). Ihre Gelegenheiten sind deshalb die Kommandos einer
    // Phase, nicht die des ganzen Laufs.
    case "beschaedigung":
      return erwartet(p.fehler.beschaedigung, Math.ceil(p.kommandos / Math.max(1, p.phasen)));
    case "profilKlon":
      return erwartet(p.fehler.profilKlon, p.kommandos);
    case "schreibrechtEntzug":
      return erwartet(p.fehler.schreibrechtEntzug, p.kommandos);
    case "lokaleSchreibstoerung":
      return erwartet(p.fehler.lokaleSchreibstoerung, p.kommandos);
    default:
      return false;
  }
}

export function berichte(ergebnis: Laufergebnis): string {
  const p = ergebnis.plan;
  const gezaehlt: Record<string, number> = { ...ergebnis.stoerungen, ...ergebnis.dateisystemZaehler };
  const zeilen: string[] = [];

  zeilen.push("s1 simuliere — M0.4, Konvergenz unter Störung");
  zeilen.push("");
  zeilen.push(`Startwert:        ${p.startwert}   (derselbe Startwert ergibt denselben Lauf)`);
  zeilen.push(`Clients:          ${p.clients}`);
  zeilen.push(`Kommandos:        ${zahl(ergebnis.kommandos)} von ${zahl(p.kommandos)} geplant`);
  zeilen.push(`Ereignisse:       ${zahl(ergebnis.ereignisse)} geschrieben, ${zahl(ergebnis.ereignisBytes)} Byte`);
  zeilen.push(`Segmentgröße:     ${zahl(p.segmentgroesse)} Byte (§4.2; der Startwert 4 MiB bleibt unberührt)`);
  zeilen.push("");

  zeilen.push("Phasen — Konvergenzvergleich nach §7.6");
  for (const phase of ergebnis.phasen) {
    const kopf = `  Phase ${phase.nummer}/${p.phasen}  nach ${zahl(phase.kommandos)} Kommandos`;
    const ruhe = phase.ruheErreicht
      ? `Ruhe nach ${phase.ruheRunden} Runden`
      : `RUHE NICHT ERREICHT (${phase.ruheRunden} Runden)`;
    zeilen.push(`${kopf}: ${ruhe}`);
    for (const offen of phase.ruheOffen) zeilen.push(`      offen: ${offen}`);
    zeilen.push(`      Ausgang: ${AUSGANG[phase.befund.art] ?? phase.befund.art}`);
    if (phase.befund.art === "konvergent") {
      zeilen.push(`      zustandsHash: ${phase.befund.zustandsHash}`);
      zeilen.push(`      verglichene Clients: ${phase.befund.clients.length}`);
    }
    if (phase.befund.art === "abweichend") {
      for (const [client, hash] of Object.entries(phase.befund.hashes)) {
        zeilen.push(`      ${client}: ${hash}`);
      }
    }
    if (phase.befund.art === "zuWenigeClients") {
      zeilen.push(
        `      alle Zustände decken sich trotzdem: ${phase.befund.zustaendeDeckenSich ? "ja" : "nein"}`,
      );
    }
    if (phase.befund.art === "nichtVergleichbar") {
      zeilen.push(`      Grund: ${phase.befund.grund}`);
      zeilen.push(
        `      gleiche Ereignismenge: ${phase.befund.gleicheIdentitaeten ? "ja" : "nein"}, gleicher Zustand: ${phase.befund.gleicheHashes ? "ja" : "nein"}`,
      );
    }
    const sicht =
      phase.befund.art === "abweichend" ? [] : phase.befund.unvollstaendigeSicht;
    for (const s of sicht) {
      // §8.6.1 Regel 3: getrennt gemeldet, nicht als Fehler gewertet.
      zeilen.push(
        `      unvollständige Sicht: ${s.clientId} (${s.quarantaenen.length} Quarantänestelle(n))` +
          `${s.geheilt ? ", Zustand deckt sich trotzdem" : ", Zustand weicht ab"}`,
      );
    }
    // §8.1: berichtet, nicht bewertet. Sie nimmt keinen Client aus dem
    // Vergleich — sonst wäre eine Phase aus einem Zustand heraus unbewertbar,
    // den §8.1 ausdrücklich als „kein Fehler" führt.
    for (const stand of phase.staende) {
      if (stand.vorlaeufigeQuarantaenen.length === 0) continue;
      zeilen.push(
        `      vorläufige Quarantäne (§8.1, kein Fehler): ${stand.clientId} ` +
          `(${stand.vorlaeufigeQuarantaenen.length} Stelle(n))`,
      );
    }
    if (phase.verluste.length > 0) {
      zeilen.push(`      VERLUST: ${phase.verluste.length} Ereignis(se) auf keiner Share-Datei mehr`);
      for (const v of phase.verluste.slice(0, 5)) {
        zeilen.push(`        ${v.ereignisId} von ${v.clientId}`);
      }
      if (phase.verluste.length > 5) zeilen.push(`        … und ${phase.verluste.length - 5} weitere`);
    } else {
      zeilen.push("      kein Ereignis verloren: jede geschriebene Zeile ist auf dem Share auswertbar");
    }
    const schief = phase.spiegelpruefung.filter((s) => !s.stimmt);
    zeilen.push(
      `      lokal ↔ Share: ${phase.spiegelpruefung.length - schief.length}/${phase.spiegelpruefung.length} eigene Segmente byteweise gleich`,
    );
    for (const s of schief) {
      zeilen.push(
        `      ABWEICHUNG ${s.datei}: ${s.hinweis ?? ""}` +
          (phase.beschaedigungen > 0
            ? ` (nach ${phase.beschaedigungen} Beschädigung(en) nach §8.2 nicht bewertet)`
            : ""),
      );
    }
  }
  zeilen.push("");

  zeilen.push("Störungen — wie oft sie gegriffen haben");
  const fehlend = new Set(fehlendeStoerungen(ergebnis));
  for (const name of GEFORDERTE_STOERUNGEN) {
    const anzahl = gezaehlt[name] ?? 0;
    zeilen.push(
      `  ${name.padEnd(24)} ${String(anzahl).padStart(6)}${fehlend.has(name) ? "   ← vom Plan gefordert, aber nicht eingetreten" : ""}`,
    );
  }
  for (const [name, anzahl] of Object.entries(gezaehlt).sort()) {
    if (GEFORDERTE_STOERUNGEN.includes(name)) continue;
    zeilen.push(`  ${name.padEnd(24)} ${String(anzahl).padStart(6)}`);
  }
  zeilen.push("");

  zeilen.push("Reaktionen der Speicherschicht (§4.5, §4.6, §5.7, §8.8, §8.9)");
  const arten = Object.entries(ergebnis.reaktionen).sort((a, b) => b[1] - a[1]);
  if (arten.length === 0) zeilen.push("  keine");
  for (const [art, anzahl] of arten) zeilen.push(`  ${art.padEnd(30)} ${String(anzahl).padStart(6)}`);
  zeilen.push("");

  const m = ergebnis.messwerte;
  zeilen.push("Messwerte für M0.5 — KONZEPT-SPEICHER.md §10");
  zeilen.push(
    `  A2  ${zahl(m.byteJeEreignis, 1)} Byte je Ereignis im Mittel (Spanne ${zahl(m.kleinsteZeile)} bis ${zahl(m.groessteZeile)});` +
      ` angenommen sind 400 bis 600 (§2.6)`,
  );
  zeilen.push(
    `  A7  Erstlauf eines neuen Arbeitsplatzes: ${zahl(m.erstlaufBytes)} Byte in ${zahl(m.erstlaufZeilen)} Zeilen` +
      ` aus ${m.erstlaufDateien} Dateien, ${m.erstlaufRunden} Takt-Durchläufe`,
  );
  zeilen.push(
    `  A10 Vollprüfung beim Öffnen: ${zahl(
      Object.values(m.vollpruefungBytesJeClient).reduce((a, b) => a + b, 0) /
        Math.max(1, Object.keys(m.vollpruefungBytesJeClient).length),
    )} Byte je Client im Mittel, ${zahl(m.vollpruefungAnteil * 100, 1)} % des Erstlaufs`,
  );
  zeilen.push("  Die Zeit dazu misst M0.5 am echten Share; hier steht allein die Datenmenge.");
  zeilen.push("");

  if (ergebnis.erfolg) {
    zeilen.push("Ergebnis: bestanden — kein roter Ausgang, kein Mangel.");
  } else {
    zeilen.push(`Ergebnis: NICHT bestanden (${ergebnis.maengel.length} Mangel/Mängel)`);
    for (const mangel of ergebnis.maengel) zeilen.push(`  - ${mangel}`);
  }
  return zeilen.join("\n");
}
