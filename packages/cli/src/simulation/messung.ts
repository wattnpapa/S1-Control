/**
 * Die Zahlen, die M0.5 aus M0.4 mitbekommt — KONZEPT-SPEICHER.md §10,
 * Annahmen A2, A7 und A10.
 *
 * §10 vermerkt für alle drei ausdrücklich „Prüfung an der Simulation M0.4"
 * beziehungsweise „Prüfung M0.4". Sie werden hier **gemessen, nicht
 * geschätzt** — soweit eine Simulation das kann:
 *
 *  * **A2** (400 bis 600 Byte je Ereignis, §2.6) ist an der Simulation
 *    vollständig prüfbar: Die Zeilenlänge hängt am Zeilenformat aus §2.1 und
 *    an den Nutzlasten, nicht am Share.
 *  * **A7** (Erstlauf ohne fremde Schnappschüsse bleibt bezahlbar, §7.5) ist
 *    hier als **Datenmenge** messbar — wie viele Bytes und Zeilen ein neu
 *    hinzukommender Arbeitsplatz lesen und falten muss. Was er dafür an
 *    Wartezeit bezahlt, entscheidet die SMB-Latenz und damit M0.5.
 *  * **A10** (Vollprüfung der eigenen Share-Segmente beim Öffnen, §4.6.1
 *    Auslöser 1) ebenso: Die Datenmenge steht hier, die Zeit misst M0.5.
 *
 * Der Erstlauf wird mit einem **ungestörten** Profil gemessen. Eine Zahl, in
 * der eine injizierte Partition steckt, ist keine Kostenangabe, sondern eine
 * Störungsdauer — und M0.5 kalibriert gegen Kosten.
 */

import {
  clientPraefix,
  zerlegeEreignisDateiname,
  Einsatzablage,
  type Dateisystem,
} from "@s1/speicher";

import { Klient } from "./klient.js";
import { OHNE_STOERUNG } from "./feindlichesDateisystem.js";
import { OHNE_FEHLER, type Plan } from "./plan.js";
import { Simulationsuhr } from "./uhr.js";
import { Zufall } from "./zufall.js";

export interface Messwerte {
  /** A2 (§2.6, §10): Bytes je geschriebenem Ereignis im Mittel, einschließlich Rahmen und Trennzeichen. */
  readonly byteJeEreignis: number;
  readonly ereignisse: number;
  /** A2: die Spanne, damit ein Mittelwert nicht zwei Ausreißer verdeckt. */
  readonly kleinsteZeile: number;
  readonly groessteZeile: number;
  /** A7 (§7.5, §10): Was ein neu hinzukommender Arbeitsplatz lesen und falten muss. */
  readonly erstlaufBytes: number;
  readonly erstlaufZeilen: number;
  readonly erstlaufDateien: number;
  /** A7: Zahl der Takt-Durchläufe, bis der neue Arbeitsplatz alles hatte. */
  readonly erstlaufRunden: number;
  /** A10 (§4.6.1 Auslöser 1, §10): eigene Share-Segmente je Client, in Byte. */
  readonly vollpruefungBytesJeClient: Readonly<Record<string, number>>;
  /** A10: Anteil der Vollprüfung an dem, was der Erstlauf ohnehin liest. */
  readonly vollpruefungAnteil: number;
}

/**
 * Misst den Erstlauf, indem tatsächlich ein weiterer Arbeitsplatz geöffnet wird.
 *
 * Eine Hochrechnung aus der Dateigröße wäre billiger und schlechter: Sie
 * überginge, dass der Erstlauf über zwei Takte läuft (§6.2) und dass ein
 * abgeschlossenes Segment nur einmal gelesen wird (§4.3).
 */
export async function messeErstlauf(
  echt: Dateisystem,
  plan: Plan,
  wurzel: string,
  shareOrdner: string,
): Promise<{ bytes: number; zeilen: number; dateien: number; runden: number }> {
  const ablage = new Einsatzablage(shareOrdner, `${wurzel}/erstlauf/einsatz`);
  await echt.legeVerzeichnisAn(ablage.lokalEreignisse);
  const neuling = new Klient({
    nummer: 0,
    clientId: "ffffffff0000000000000000",
    ablage,
    echt,
    plan: { ...plan, profil: OHNE_STOERUNG, fehler: OHNE_FEHLER },
    zufall: new Zufall(1),
    uhr: new Simulationsuhr(),
  });
  await neuling.oeffneMitWiederholung();

  let bytes = 0;
  let zeilen = 0;
  let runden = 0;
  for (; runden < plan.ruheVersucheMax; runden += 1) {
    const b = await neuling.taktB();
    const a = await neuling.taktA();
    bytes += a.fortschrittBytes + b.fortschrittBytes;
    zeilen += a.neueZeilen.length + b.neueZeilen.length;
    const merkmale = await neuling.ruhemerkmale();
    if (merkmale.bedingung2 && merkmale.bedingung3) break;
  }

  const dateien = (await echt.listeVerzeichnis(ablage.shareEreignisse)).filter(
    (n) => zerlegeEreignisDateiname(n) !== undefined,
  ).length;
  return { bytes, zeilen, dateien, runden: runden + 1 };
}

/** Wie viele Bytes die Vollprüfung beim Öffnen je Client liest (§4.6.1 Auslöser 1, A10). */
export async function messeVollpruefung(
  echt: Dateisystem,
  klienten: readonly { readonly clientId: string; readonly ablage: Einsatzablage }[],
): Promise<Record<string, number>> {
  const werte: Record<string, number> = {};
  for (const klient of klienten) {
    const praefix = clientPraefix(klient.clientId);
    let summe = 0;
    for (const name of await echt.listeVerzeichnis(klient.ablage.shareEreignisse)) {
      if (zerlegeEreignisDateiname(name)?.praefix !== praefix) continue;
      summe += (await echt.liesAb(klient.ablage.shareDatei(name), 0)).byteLength;
    }
    werte[klient.clientId] = summe;
  }
  return werte;
}
