/**
 * Die Bündeldatei — ein Weg für Meldungen, der ohne Netz auskommt (M6.3).
 *
 * **Warum es sie gibt.** Ein Meldekopf steht am Bereitstellungsraum, oft ohne
 * Verbindung zur Führungsstelle (`excel-handbuch-anforderungen.md`, Rollen:
 * „ausgelagert, ggf. mehrere, ggf. ohne Netzverbindung zur FüSt"). Er sammelt
 * dort Bögen, und irgendwann fährt jemand mit einem USB-Stick hinüber. Ein
 * Bogen nach dem anderen zu scannen wäre bei dreißig Einheiten eine halbe
 * Stunde Arbeit für etwas, das eine Datei kann.
 *
 * **Das Format ist nicht neu.** Es ist die `Einsatzsammlung` des
 * Erfassungsbogens (`@bos/meldekopf`, `einsaetze.ts`), also genau das, was die
 * App ohnehin exportiert. Ein eigenes Format zu erfinden hieße, denselben
 * Bogen zweimal zu beschreiben — und der Meldekopf hat die App schon.
 *
 * **Was hier nicht übernommen wird, ist die Identität.** Die Sammlung führt je
 * Eintrag eine `id` aus `bogenInhaltsId` (FNV-1a, 32 Bit, nach
 * Einfügereihenfolge) und einen `einheitSchluessel`. Die `id` wird **neu
 * gerechnet** — aus demselben Grund wie in `scanner.ts`: Auf ihr beruht nach
 * §5.8.1 die Zusicherung, dass derselbe Bogen aus zwei Richtungen **eine**
 * Meldung ergibt, und dafür ist sie zu kurz und zu ordnungsabhängig. Der
 * `einheitSchluessel` wird dagegen übernommen, wenn er dasteht: Er ist
 * dieselbe Heuristik, die auch hier läuft, und wenn ein Mensch am Meldekopf
 * ihn korrigiert hat, ist seine Korrektur mehr wert als unsere Vermutung.
 */

import {
  EinsatzArt,
  MeldeStatus,
  einheitSchluessel as fingerabdruck,
  einsaetzeAusJson,
  einsaetzeZuJson,
  type Einsatzsammlung,
  type MeldeEintrag,
} from "@bos/meldekopf";
import { inhaltsHash, migriereBogen, type Erfassungsbogen } from "@bos/eeb-format";

import { kanonischeSerialisierung } from "../kanonisch.js";

/** Ein Eintrag der Bündeldatei, so wie ihn diese Akte braucht. */
export interface Buendeleintrag {
  /** Der Inhalts-Hash, hier gerechnet und nicht übernommen (§5.8.1). */
  readonly meldungId: string;
  /** Die Revisionsreihe — aus der Datei, sonst aus dem Fingerabdruck. */
  readonly einheitSchluessel: string;
  readonly bogen: Erfassungsbogen;
  /** ISO-Zeitpunkt; die Datei führt eine Millisekundenzahl. */
  readonly empfangenAm: string;
  readonly quelle: string;
  /** `GUELTIG`, `UNGUELTIG` oder `undefined` für unsigniert. */
  readonly signatur?: "GUELTIG" | "UNGUELTIG";
}

export interface Buendelbefund {
  readonly name: string;
  readonly eintraege: readonly Buendeleintrag[];
  /**
   * Einträge, die die Datei führt und die hier nicht ankommen — kaputt oder
   * ohne Bogen.
   *
   * Sie werden **gezählt und nicht verschwiegen**: `einsaetzeAusJson`
   * überspringt defekte Einträge, statt alles zu verlieren, und das ist
   * richtig. Eine Zahl, die niemand sieht, wäre es nicht — wer eine Datei mit
   * dreißig Bögen einliest und achtundzwanzig bekommt, muss das erfahren.
   */
  readonly uebersprungen: number;
}

/**
 * Übersetzt die Quelle der Sammlung in die des Katalogs.
 *
 * **Kein eigener Wert für „kam als Bündel".** `zMeldeQuelle` ist eine
 * geschlossene Liste (§3.7), und sie um einen Wert zu erweitern wäre eine
 * Katalogänderung mit `foldVersion` (§3.9) — nicht die Sache eines
 * Meldewegpakets. Sie wäre auch die schlechtere Angabe: Der Eintrag der Datei
 * weiß, wie der Bogen **ursprünglich** beim Meldekopf ankam — gescannt, von
 * Hand erfasst, aus einer PDF gezogen —, und das ist die Auskunft, die etwas
 * über die Meldung sagt. Dass sie den letzten Weg als Datei genommen hat,
 * steht ohnehin im Tagebuch.
 *
 * Beide Listen führen dieselben fünf Werte; sie unterscheiden sich nur in der
 * Schreibweise. Was keiner von ihnen entspricht, wird `MANUELL` — der Wert für
 * „ein Mensch hat es eingetragen", und das stimmt im Zweifel.
 */
function quelleAus(wert: unknown): string {
  switch (wert) {
    case "scan":
      return "SCAN";
    case "pdf-import":
      return "PDF_IMPORT";
    case "aufteilung":
      return "AUFTEILUNG";
    case "zusammenfuehrung":
      return "ZUSAMMENFUEHRUNG";
    default:
      return "MANUELL";
  }
}

/** §5.8: Der Signaturzustand ist zweiwertig; alles andere heißt unsigniert. */
function signaturAus(wert: unknown): "GUELTIG" | "UNGUELTIG" | undefined {
  const zustand = (wert as { zustand?: unknown } | undefined)?.zustand;
  if (zustand === "gueltig" || zustand === "GUELTIG") return "GUELTIG";
  if (zustand === "ungueltig" || zustand === "UNGUELTIG") return "UNGUELTIG";
  return undefined;
}

/**
 * Liest eine Bündeldatei.
 *
 * Der Text kommt von außen — diese Datei kennt kein Dateisystem (Ring 2). Was
 * sie liefert, ist die Liste, aus der ein Aufrufer je Eintrag dieselben
 * Ereignisse baut wie nach einem Scan.
 *
 * **Alle Sammlungen der Datei fallen in eine Liste.** Die App darf mehrere
 * Einsätze führen; eine Einsatzakte ist genau einer. Welche Sammlung gemeint
 * war, entscheidet der Mensch, der die Datei hinüberträgt — und er hat es
 * entschieden, als er sie mitnahm.
 */
export function liesBuendel(text: string): Buendelbefund {
  const sammlungen = einsaetzeAusJson(text);
  const eintraege: Buendeleintrag[] = [];
  let uebersprungen = 0;
  const namen: string[] = [];

  for (const sammlung of sammlungen) {
    if (typeof sammlung.name === "string" && sammlung.name.length > 0) namen.push(sammlung.name);
    for (const eintrag of sammlung.eintraege) {
      let bogen: Erfassungsbogen;
      try {
        // Migriert, bevor gerechnet wird: Zwei Clients mit verschiedenen
        // Codec-Fassungen berechneten sonst zwei Ids für denselben Bogen.
        bogen = migriereBogen({ ...eintrag.bogen });
      } catch {
        uebersprungen += 1;
        continue;
      }
      const schluessel =
        typeof eintrag.einheitSchluessel === "string" && eintrag.einheitSchluessel.length > 0
          ? eintrag.einheitSchluessel
          : fingerabdruck(bogen.einheit);
      const signatur = signaturAus(eintrag.signatur);
      eintraege.push({
        meldungId: inhaltsHash(kanonischeSerialisierung(bogen as unknown as never)),
        einheitSchluessel: schluessel,
        bogen,
        empfangenAm: zeitpunktAus(eintrag.empfangenAm),
        quelle: quelleAus(eintrag.quelle),
        ...(signatur === undefined ? {} : { signatur }),
      });
    }
  }

  return {
    name: namen[0] ?? "",
    eintraege,
    uebersprungen: uebersprungen + zaehleUebersprungene(text, sammlungen.length, eintraege.length + uebersprungen),
  };
}

/**
 * Wandelt die Geräteuhr-Millisekunden der Sammlung in einen ISO-Zeitpunkt.
 *
 * Fehlt sie oder ist sie unbrauchbar, bleibt der Wert leer — der Aufrufer
 * setzt dann seine eigene Empfangszeit. Eine erfundene Zeit wäre schlechter:
 * `empfangenAm` ordnet den Korb, und §2.5 plausibilisiert sie.
 */
function zeitpunktAus(millisekunden: unknown): string {
  if (typeof millisekunden !== "number" || !Number.isFinite(millisekunden)) return "";
  const zeitpunkt = new Date(millisekunden);
  return Number.isNaN(zeitpunkt.getTime()) ? "" : zeitpunkt.toISOString();
}

/**
 * Wie viele Einträge die Rohdatei führt, die der Leser nicht durchgelassen hat.
 *
 * `einsaetzeAusJson` überspringt still; diese Zählung holt die Zahl zurück,
 * ohne den Leser zu ändern — er gehört einem anderen Repo.
 */
function zaehleUebersprungene(text: string, sammlungen: number, gesehen: number): number {
  if (sammlungen === 0) return 0;
  try {
    const roh = JSON.parse(text) as { eintraege?: unknown[] }[];
    if (!Array.isArray(roh)) return 0;
    const roheAnzahl = roh.reduce(
      (summe, s) => summe + (Array.isArray(s?.eintraege) ? s.eintraege.length : 0),
      0,
    );
    return Math.max(0, roheAnzahl - gesehen);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Der Rückweg: die Akte als Bündeldatei
// ---------------------------------------------------------------------------

/**
 * Schreibt die Meldungen einer Akte als Bündeldatei.
 *
 * **Wozu der Rückweg.** Zwei Fälle, und beide kommen vor: Eine Führungsstelle
 * gibt einen Bereitstellungsraum an eine andere Stelle ab und schickt deren
 * Meldungen mit; oder die Akte wird nachbereitet, und die Bögen sollen in der
 * App geöffnet werden, mit der sie erfasst wurden.
 *
 * **Nur, was einen Bogen hat.** `bogen` ist im Katalog optional; eine Meldung
 * ohne ihn trägt nichts, was eine Bündeldatei transportieren könnte. Sie wird
 * ausgelassen und nicht mit einem leeren Bogen erfunden.
 *
 * **Abgelehnte Meldungen fahren mit.** §5.8.1: Der Empfang ist eine Tatsache,
 * und eine Ablehnung ist die Entscheidung **dieser** Stelle. Die nächste darf
 * sie anders treffen — sie bekommt deshalb alles, was hier ankam, und den
 * Meldestatus dazu.
 */
export function buendelAusMeldungen(
  meldungen: readonly {
    readonly meldungId: string;
    readonly einheitSchluessel: string;
    readonly bogen: Erfassungsbogen;
    readonly empfangenAm: string;
    readonly meldeStatus?: string;
  }[],
  sammlung: { readonly id: string; readonly name: string; readonly jetzt: number },
): string {
  const eintraege: MeldeEintrag[] = meldungen.map((meldung) => ({
    // Die `id` der Sammlung ist unser Inhalts-Hash und nicht `bogenInhaltsId`.
    // Ein Leser, der auf sie dedupliziert, bekommt damit dieselbe Wirkung —
    // gleicher Inhalt, gleiche Id —, nur mit mehr Bits.
    id: meldung.meldungId,
    einheitSchluessel: meldung.einheitSchluessel,
    empfangenAm: Date.parse(meldung.empfangenAm) || sammlung.jetzt,
    quelle: "scan",
    status: meldeStatusAus(meldung.meldeStatus),
    bogen: meldung.bogen,
  }));

  const inhalt: Einsatzsammlung = {
    id: sammlung.id,
    name: sammlung.name,
    art: EinsatzArt.EINSATZ,
    angelegt: sammlung.jetzt,
    geaendert: sammlung.jetzt,
    eintraege,
  };
  return einsaetzeZuJson([inhalt]);
}

/**
 * Übersetzt den Meldestatus des Katalogs in den der Sammlung.
 *
 * Beide kennen dieselben drei Werte, und `AUFGEGANGEN` trennt in beiden
 * dasselbe: Ein zusammengeführter Truppteil ist **nicht** abgerückt — er ist
 * wieder Teil seiner Einheit. Ohne Angabe gilt `ANWESEND`, weil eine Meldung,
 * die nichts sagt, eine anwesende Einheit meint.
 */
function meldeStatusAus(wert: unknown): MeldeStatus {
  if (wert === "ABGERUECKT") return MeldeStatus.ABGERUECKT;
  if (wert === "AUFGEGANGEN") return MeldeStatus.AUFGEGANGEN;
  return MeldeStatus.ANWESEND;
}
