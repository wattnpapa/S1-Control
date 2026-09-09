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

/** Die Störungen, die M0.4 nennt und die deshalb vorkommen müssen. */
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
];

/** Störungen, die vorkommen sollen, deren Ausbleiben aber kein Mangel ist. */
const WEITERE_STOERUNGEN: readonly string[] = [
  "beschaedigung",
  "profilKlon",
  "schreibrechtEntzug",
  "lokaleSchreibstoerung",
];

function zahl(wert: number, stellen = 0): string {
  return wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}

/** Welche geforderten Störungen in diesem Lauf gar nicht vorkamen. */
export function fehlendeStoerungen(ergebnis: Laufergebnis): readonly string[] {
  const gezaehlt = { ...ergebnis.stoerungen, ...ergebnis.dateisystemZaehler };
  return GEFORDERTE_STOERUNGEN.filter((name) => (gezaehlt[name] ?? 0) === 0);
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
    const schief = phase.spiegelpruefung.filter((s) => !s.stimmt);
    zeilen.push(
      `      lokal ↔ Share: ${phase.spiegelpruefung.length - schief.length}/${phase.spiegelpruefung.length} eigene Segmente byteweise gleich`,
    );
    for (const s of schief) zeilen.push(`      ABWEICHUNG ${s.datei}: ${s.hinweis ?? ""}`);
  }
  zeilen.push("");

  zeilen.push("Störungen — wie oft sie gegriffen haben");
  for (const name of [...GEFORDERTE_STOERUNGEN, ...WEITERE_STOERUNGEN]) {
    const anzahl = gezaehlt[name] ?? 0;
    const noetig = GEFORDERTE_STOERUNGEN.includes(name);
    zeilen.push(`  ${name.padEnd(24)} ${String(anzahl).padStart(6)}${anzahl === 0 && noetig ? "   ← gefordert, aber nicht eingetreten" : ""}`);
  }
  for (const [name, anzahl] of Object.entries(gezaehlt).sort()) {
    if (GEFORDERTE_STOERUNGEN.includes(name) || WEITERE_STOERUNGEN.includes(name)) continue;
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

  const fehlend = fehlendeStoerungen(ergebnis);
  if (fehlend.length > 0) {
    zeilen.push(`WARNUNG: geforderte Störungen ohne einen einzigen Treffer: ${fehlend.join(", ")}`);
    zeilen.push("");
  }

  if (ergebnis.erfolg) {
    zeilen.push("Ergebnis: bestanden — kein roter Ausgang, kein Mangel.");
  } else {
    zeilen.push(`Ergebnis: NICHT bestanden (${ergebnis.maengel.length} Mangel/Mängel)`);
    for (const mangel of ergebnis.maengel) zeilen.push(`  - ${mangel}`);
  }
  return zeilen.join("\n");
}
