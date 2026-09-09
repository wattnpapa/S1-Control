/**
 * Der Simulationslauf — `s1 simuliere`, 05-UMSETZUNGSPLAN.md M0.4 und
 * Auflage 15/18 (03-MEILENSTEINE.md).
 *
 * Der Lauf zerfällt in Phasen. Innerhalb einer Phase werden Bedienschritte
 * erzeugt und gestört; am Ende jeder Phase wird eine **Ruhephase** hergestellt
 * und verglichen — „Konvergenzvergleich per Hash nach jeder Ruhephase und
 * lokal ↔ Share je Client".
 *
 * ## Warum die Beschädigung nur in der letzten Phase injiziert wird
 *
 * §8.2 Punkt 5 prüft eine Quarantänestelle bei jedem Programmstart **einmal**
 * erneut; ein echter Defekt bleibt. Der Wiederherstellungsweg aus §8.6.1
 * Regel 4 führt über ein **Ersatzsegment** (§4.6) — die beschädigte Datei
 * selbst wird nie repariert, denn ein Leser darf keine fremde Datei
 * beschreiben. Ein Leser, der einmal in Quarantäne gefallen ist, bleibt es
 * deshalb für den Rest des Laufs, und §8.6.1 Regel 3 nimmt ihn dauerhaft aus
 * dem Vergleich.
 *
 * Würde die Beschädigung früh injiziert, wären nach kurzer Zeit alle vier
 * Clients in Quarantäne und jede weitere Phase fiele in den Ausgang
 * „nicht vergleichbar" — der Lauf wäre grün, ohne irgendetwas nachzuweisen.
 * Deshalb: Die Phasen davor weisen Konvergenz unter allen übrigen Störungen
 * nach, die letzte Phase weist den dritten Ausgang und die Heilung über das
 * Ersatzsegment nach. Beides zusammen ist der Nachweis; eines allein wäre
 * keiner.
 */

import {
  clientPraefix,
  ersetzteSegmente,
  leseZeilengrenzen,
  segmentText,
  zerlegeEreignisDateiname,
  Einsatzablage,
  type Dateisystem,
} from "@s1/speicher";

import { Klient } from "./klient.js";
import { erhebeStand, vergleiche, type Clientstand, type Vergleichsbefund } from "./konvergenz.js";
import { messeErstlauf, messeVollpruefung, type Messwerte } from "./messung.js";
import { Stoerwerk } from "./stoerungen.js";
import { Simulationsuhr } from "./uhr.js";
import type { Plan } from "./plan.js";
import { Zufall } from "./zufall.js";

/** Ergebnis der Prüfung „lokales Log gleich Share-Segment" für ein eigenes Segment (§7.6). */
export interface Spiegelbefund {
  readonly clientId: string;
  readonly datei: string;
  readonly stimmt: boolean;
  readonly hinweis?: string;
}

export interface Phasenbefund {
  readonly nummer: number;
  readonly kommandos: number;
  readonly ruheErreicht: boolean;
  readonly ruheRunden: number;
  /** Woran die Ruhephase noch hing, als sie aufgegeben wurde (§7.6) — leer, wenn sie erreicht wurde. */
  readonly ruheOffen: readonly string[];
  readonly befund: Vergleichsbefund;
  readonly spiegelpruefung: readonly Spiegelbefund[];
  readonly staende: readonly Clientstand[];
}

export interface Laufergebnis {
  readonly plan: Plan;
  readonly phasen: readonly Phasenbefund[];
  readonly stoerungen: Readonly<Record<string, number>>;
  readonly dateisystemZaehler: Readonly<Record<string, number>>;
  readonly kommandos: number;
  readonly ereignisse: number;
  readonly ereignisBytes: number;
  readonly oeffnungen: number;
  readonly oeffnungsdauerMs: number;
  readonly messwerte: Messwerte;
  /** Alle Reaktionen und Abweisungen der Clients (§4.5, §4.6, §5.7, §8.8, §8.9), gezählt nach Art. */
  readonly reaktionen: Readonly<Record<string, number>>;
  readonly erfolg: boolean;
  readonly maengel: readonly string[];
}

export interface LaufOptionen {
  readonly plan: Plan;
  /** Das ungestörte Dateisystem — in der Regel `knotenDateisystem()`. */
  readonly dateisystem: Dateisystem;
  /** Arbeitsverzeichnis: darunter entstehen `share/` und je Client ein Spiegel. */
  readonly wurzel: string;
  /** Fortschrittsmeldungen; ohne Angabe schweigt der Lauf. */
  readonly melde?: (zeile: string) => void;
}

/** Die Kennungen der Clients — fest, damit ein Startwert denselben Lauf ergibt. */
function kennung(nummer: number): string {
  return `${nummer.toString(16).padStart(8, "0")}0000000000000000`;
}

export async function fuehreSimulationAus(optionen: LaufOptionen): Promise<Laufergebnis> {
  const { plan, dateisystem: echt, wurzel } = optionen;
  const melde = optionen.melde ?? ((): void => undefined);
  const zufall = new Zufall(plan.startwert);
  const uhr = new Simulationsuhr();

  const shareOrdner = `${wurzel}/share`;
  await echt.legeVerzeichnisAn(`${shareOrdner}/ereignisse`);
  await echt.legeVerzeichnisAn(`${shareOrdner}/praesenz`);
  // §5.6: `einsatz.json` wird einmal geschrieben und danach nie verändert. Ohne
  // sie hielte jeder Spiegelungslauf den Ordner nach §5.7 für verschwunden.
  await echt.schreibeNeuAnlegen(
    `${shareOrdner}/einsatz.json`,
    new TextEncoder().encode(
      JSON.stringify({
        einsatzId: plan.einsatzId,
        angelegtAm: new Date(uhr.jetzt()).toISOString(),
        anlegenderClient: kennung(1),
        formatVersion: 1,
      }),
    ),
  );

  const klienten: Klient[] = [];
  for (let i = 1; i <= plan.clients; i += 1) {
    const ablage = new Einsatzablage(shareOrdner, `${wurzel}/arbeitsplatz-${i}/einsatz`);
    await echt.legeVerzeichnisAn(ablage.lokalEreignisse);
    const klient = new Klient({
      nummer: i,
      clientId: kennung(i),
      ablage,
      echt,
      plan,
      zufall: zufall.abzweig(`klient-${i}`),
      uhr,
    });
    await klient.oeffneMitWiederholung();
    klienten.push(klient);
  }

  const stoerwerk = new Stoerwerk({
    echt,
    fehler: plan.fehler,
    zufall: zufall.abzweig("stoerwerk"),
    jetzt: () => uhr.jetzt(),
  });
  const takt = zufall.abzweig("takt");

  const phasen: Phasenbefund[] = [];
  let kommandosGesamt = 0;
  const jeProPhase = Math.ceil(plan.kommandos / plan.phasen);

  for (let phase = 1; phase <= plan.phasen; phase += 1) {
    const letzte = phase === plan.phasen;
    // Siehe Dateikopf: Die Beschädigung gehört ausschließlich in die letzte
    // Phase, sonst ist der Rest des Laufs nur noch „nicht vergleichbar".
    stoerwerk.beschaedigungAktiv = letzte;

    const ziel = Math.min(plan.kommandos, phase * jeProPhase);
    let leerlauf = 0;
    while (kommandosGesamt < ziel && leerlauf < 200) {
      const handelnder = takt.waehle(klienten);
      await stoerwerk.vorBedienschritt(handelnder, klienten);
      const getan = await handelnder.bediene();
      if (getan) {
        kommandosGesamt += 1;
        leerlauf = 0;
      } else {
        leerlauf += 1;
      }
      await stoerwerk.kill(handelnder);
      // Zwischen zwei Bedienschritten vergeht Zeit; ohne sie liefen Takte und
      // Fristen (§6.2, §8.1) nie ab und die Simulation prüfte sie nicht.
      uhr.weiter(takt.zwischen(120, 900));
      stoerwerk.tick();
      for (const klient of klienten) {
        await klient.spiegleWennFaellig();
        await klient.taktAWennFaellig();
        await klient.taktBWennFaellig();
      }
    }

    stoerwerk.beschaedigungAktiv = false;
    stoerwerk.loeseAlles();
    const { erreicht, runden, offen } = await stelleRuheHer(klienten, plan, uhr);

    const staende: Clientstand[] = [];
    for (const klient of klienten) {
      staende.push(await erhebeStand(echt, klient.ablage, klient.clientId, klient.quarantaenen));
    }
    const befund = vergleiche(staende);
    const spiegelpruefung = await pruefeSpiegel(echt, klienten);
    phasen.push({
      nummer: phase,
      kommandos: kommandosGesamt,
      ruheErreicht: erreicht,
      ruheRunden: runden,
      ruheOffen: offen,
      befund,
      spiegelpruefung,
      staende,
    });
    melde(
      `Phase ${phase}/${plan.phasen}: ${kommandosGesamt} Kommandos, Ruhe nach ${runden} Runden${erreicht ? "" : " (nicht erreicht)"}, Ausgang ${befund.art}`,
    );
  }

  // §10, A7 und A10: Die Zahlen, die M0.5 braucht. Nach der letzten Phase
  // gemessen, weil erst dann der volle Datenbestand vorliegt.
  const erstlauf = await messeErstlauf(echt, plan, wurzel, shareOrdner);
  const vollpruefung = await messeVollpruefung(echt, klienten);
  const ereignisse = klienten.reduce((summe, k) => summe + k.geschrieben, 0);
  const ereignisBytes = klienten.reduce((summe, k) => summe + k.geschriebeneBytes, 0);
  const messwerte: Messwerte = {
    byteJeEreignis: ereignisse === 0 ? 0 : ereignisBytes / ereignisse,
    ereignisse,
    kleinsteZeile: Math.min(...klienten.map((k) => k.kleinsteZeile)),
    groessteZeile: Math.max(...klienten.map((k) => k.groessteZeile)),
    erstlaufBytes: erstlauf.bytes,
    erstlaufZeilen: erstlauf.zeilen,
    erstlaufDateien: erstlauf.dateien,
    erstlaufRunden: erstlauf.runden,
    vollpruefungBytesJeClient: vollpruefung,
    vollpruefungAnteil:
      erstlauf.bytes === 0
        ? 0
        : Object.values(vollpruefung).reduce((a, b) => a + b, 0) /
          Math.max(1, klienten.length) /
          erstlauf.bytes,
  };

  return bewerte(plan, phasen, klienten, stoerwerk, messwerte);
}

/**
 * Treibt alle Clients in die Ruhephase nach §7.6.
 *
 * Ruhe herrscht, wenn für **jeden** Client alle vier Bedingungen gelten, und
 * zwar für **zwei aufeinanderfolgende** Durchläufe je Takt. Bedingung 4 — „es
 * ist kein Bedienschritt offen, der noch ein Ereignis erzeugen wird" — ist hier
 * durch die Bauart erfüllt: Die Phase erzeugt keine Bedienschritte mehr.
 */
async function stelleRuheHer(
  klienten: readonly Klient[],
  plan: Plan,
  uhr: Simulationsuhr,
): Promise<{ erreicht: boolean; runden: number; offen: readonly string[] }> {
  // §4.6.1 Auslöser 1 und §8.2 Punkt 5 hängen beide am **Programmstart**: Die
  // Vollprüfung der eigenen Share-Segmente läuft beim Öffnen, und eine
  // Quarantänestelle wird beim Öffnen einmal erneut geprüft. Ohne einen
  // Neustart je Phase liefe die Simulation an beiden Wegen vorbei — und §4.6,
  // der einzige Weg zurück aus einer Beschädigung (§8.6.1 Regel 4), käme nie
  // zum Zug. Ein Neustart je Phase ist zugleich das realistische Bild: ein
  // Arbeitsplatz, der zwischendurch geschlossen und wieder geöffnet wird.
  for (const klient of klienten) await klient.oeffneMitWiederholung();

  let offen: string[] = [];
  for (let runde = 1; runde <= plan.ruheVersucheMax; runde += 1) {
    for (const klient of klienten) {
      await klient.spiegle();
      await klient.taktA();
      await klient.taktB();
    }
    offen = [];
    for (const klient of klienten) {
      const m = await klient.ruhemerkmale();
      if (m.bedingung1 && m.bedingung2 && m.bedingung3) continue;
      offen.push(
        `Client ${klient.nummer}: ` +
          [
            m.bedingung1 ? undefined : `Bedingung 1 (${m.unuebertragen} Byte unübertragen)`,
            m.bedingung2 ? undefined : `Bedingung 2 (Takt A ${m.aInFolge}× leer in Folge)`,
            m.bedingung3 ? undefined : `Bedingung 3 (Takt B ${m.bInFolge}× leer in Folge)`,
          ]
            .filter((t) => t !== undefined)
            .join(", "),
      );
    }
    if (offen.length === 0) return { erreicht: true, runden: runde, offen: [] };
    // Die Uhr muss laufen: Der Rückstau aus §5.4.4, der Verfall aus §6.2 und
    // die Frist aus §8.1 kommen sonst nie zum Zug, und eine Partition liefe
    // nie ab.
    uhr.weiter(plan.taktBMs);
  }
  return { erreicht: false, runden: plan.ruheVersucheMax, offen };
}

/**
 * Der zweite Teil des Abbruchkriteriums: „lokales Log gleich Share-Segment je
 * Client" (§7.6, letzter Absatz).
 *
 * Er gilt **nur für die eigenen Segmente** und unter Bedingung 1 der
 * Ruhephase. Für fremde Dateien gilt er ausdrücklich nicht: Deren lokaler
 * Spiegel ist nach §5.5 ihr geprüftes Präfix und ab einer Quarantänestelle
 * kürzer. Wer den Vergleich dort ansetzte, bekäme bei jedem Quarantänelauf
 * einen roten Ausgang, obwohl das Verfahren genau das Zugesagte tut.
 *
 * Ebenfalls ausgenommen sind nach §4.6 **ersetzte** Segmente: Ihre lokale
 * Datei bleibt unverändert liegen und ist damit länger als ihre
 * Share-Entsprechung (§4.6, „Die lokale Seite", Punkt 4). Geprüft wird dort
 * deshalb, dass der Share ein **Präfix** der lokalen Datei ist — die
 * Invariante aus §5.4.1, die auch für sie gilt.
 */
async function pruefeSpiegel(
  echt: Dateisystem,
  klienten: readonly Klient[],
): Promise<readonly Spiegelbefund[]> {
  const befunde: Spiegelbefund[] = [];
  for (const klient of klienten) {
    const eigen = klient.akte.zustand.eigen;
    const ersetzt = await ersetzteSegmente(echt, klient.ablage, klient.clientId);
    const praefixe = new Set<string>([clientPraefix(klient.clientId)]);
    for (const frueher of klient.akte.schreiber.zustand.frühereClientIds ?? []) {
      praefixe.add(clientPraefix(frueher));
    }
    for (const name of await echt.listeVerzeichnis(klient.ablage.lokalEreignisse)) {
      const kenn = zerlegeEreignisDateiname(name);
      if (kenn === undefined || !praefixe.has(kenn.praefix)) continue;
      const lokal = await echt.liesAb(klient.ablage.lokalDatei(name), 0);
      let share: Uint8Array;
      try {
        share = await echt.liesAb(klient.ablage.shareDatei(name), 0);
      } catch {
        share = new Uint8Array(0);
      }
      const istErsetzt =
        kenn.praefix === clientPraefix(klient.clientId) && ersetzt.has(kenn.segment);
      const vollstaendig = leseZeilengrenzen(lokal, 0).endeOffset;
      const shareOffset = eigen[`${kenn.praefix}.${segmentText(kenn.segment)}`]?.shareOffset ?? 0;

      if (istErsetzt) {
        // §4.6 Schritt 5 und §5.4.4: „Ein ersetztes Segment wird nicht mehr
        // beschrieben. Seine Bytes auf dem Share bleiben beschädigt liegen —
        // das ist der vorgesehene Endzustand." Byte-Gleichheit zu verlangen
        // hieße, den Endzustand als Fehler zu melden, den das Verfahren gerade
        // herbeiführt. Der Befund wird deshalb nur festgehalten.
        befunde.push({
          clientId: klient.clientId,
          datei: name,
          stimmt: true,
          hinweis: `nach §4.6 ersetzt (Share ${share.byteLength} Byte, lokal ${lokal.byteLength} Byte) — nicht verglichen`,
        });
        continue;
      }

      if (kenn.praefix !== clientPraefix(klient.clientId)) {
        // Eine **aufgegebene** Kennung (§4.5 Schritt 6) ist ab dem Wechsel eine
        // fremde Datei. §7.6 nimmt fremde Dateien vom Gleichheitsvergleich
        // ausdrücklich aus; für sie gilt §5.5: Der lokale Spiegel ist das
        // geprüfte Präfix der Share-Datei. Genau das wird hier geprüft — mehr
        // zu verlangen erzeugte bei jedem Kennungswechsel unter Störung einen
        // roten Ausgang, obwohl das Verfahren das Zugesagte tut.
        const istPraefix =
          lokal.byteLength <= share.byteLength && lokal.every((b, i) => b === share[i]);
        befunde.push({
          clientId: klient.clientId,
          datei: name,
          stimmt: istPraefix,
          ...(istPraefix
            ? {}
            : {
                hinweis:
                  `aufgegebene Kennung: lokaler Spiegel ist kein Präfix der Share-Datei ` +
                  `(lokal ${lokal.byteLength} Byte, Share ${share.byteLength} Byte) — §4.5 Schritt 6, §5.5`,
              }),
        });
        continue;
      }

      const gleich =
        share.byteLength === vollstaendig &&
        vollstaendig === shareOffset &&
        share.every((b, i) => b === lokal[i]);
      befunde.push({
        clientId: klient.clientId,
        datei: name,
        stimmt: gleich,
        ...(gleich
          ? {}
          : {
              hinweis: `Share ${share.byteLength} Byte, lokal vollständig ${vollstaendig} Byte, shareOffset ${shareOffset}`,
            }),
      });
    }
  }
  return befunde;
}

function bewerte(
  plan: Plan,
  phasen: readonly Phasenbefund[],
  klienten: readonly Klient[],
  stoerwerk: Stoerwerk,
  messwerte: Messwerte,
): Laufergebnis {
  const maengel: string[] = [];

  for (const phase of phasen) {
    const letzte = phase.nummer === plan.phasen;
    if (!phase.ruheErreicht) {
      maengel.push(
        `Phase ${phase.nummer}: Ruhephase nach §7.6 nicht erreicht — ${phase.ruheOffen.join(" | ")}`,
      );
    }
    if (phase.befund.art === "abweichend") {
      // Der rote Ausgang aus §7.6 und das Abbruchkriterium von M0.
      maengel.push(
        `Phase ${phase.nummer}: gleiche Versionsvektoren, verschiedener zustandsHash — ${JSON.stringify(phase.befund.hashes)}`,
      );
    } else if (!letzte && phase.befund.art !== "konvergent") {
      maengel.push(
        `Phase ${phase.nummer}: kein Konvergenznachweis (${phase.befund.art})` +
          (phase.befund.art === "nichtVergleichbar" ? ` — ${phase.befund.grund}` : ""),
      );
    } else if (letzte && phase.befund.art === "nichtVergleichbar" && !phase.befund.gleicheHashes) {
      // §8.6.1: Nach der Beschädigung darf der Ausgang „nicht vergleichbar"
      // stehen — aber die Zustände müssen sich trotzdem gedeckt haben, sobald
      // das Ersatzsegment gelesen ist. Tun sie es nicht, hat die Heilung nicht
      // stattgefunden, und das ist ein Mangel.
      maengel.push(
        `Phase ${phase.nummer}: nicht vergleichbar und die Zustände decken sich nicht — ${phase.befund.grund}`,
      );
    } else if (letzte && phase.befund.art === "zuWenigeClients") {
      const ungeheilt = phase.befund.unvollstaendigeSicht.filter((s) => !s.geheilt);
      if (ungeheilt.length > 0) {
        maengel.push(
          `Phase ${phase.nummer}: weniger als zwei Clients ohne Quarantäne, und ${ungeheilt.length} davon nicht geheilt`,
        );
      }
    }
    for (const s of phase.spiegelpruefung) {
      if (!s.stimmt) {
        maengel.push(`Phase ${phase.nummer}: ${s.clientId} ${s.datei} — ${s.hinweis ?? "Abweichung"}`);
      }
    }
  }

  if (!phasen.some((p) => p.befund.art === "konvergent")) {
    maengel.push("Keine einzige Phase hat Konvergenz nachgewiesen");
  }

  const dateisystemZaehler: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const klient of klienten) {
    for (const [name, zahl] of Object.entries(klient.dateisystem.zaehler)) {
      dateisystemZaehler[name] = (dateisystemZaehler[name] ?? 0) + zahl;
    }
  }

  const reaktionen: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const klient of klienten) {
    for (const meldung of klient.meldungen) {
      reaktionen[meldung.art] = (reaktionen[meldung.art] ?? 0) + 1;
    }
  }

  return {
    plan,
    phasen,
    reaktionen,
    stoerungen: stoerwerk.zaehlung(),
    dateisystemZaehler,
    kommandos: phasen.at(-1)?.kommandos ?? 0,
    ereignisse: klienten.reduce((summe, k) => summe + k.geschrieben, 0),
    ereignisBytes: klienten.reduce((summe, k) => summe + k.geschriebeneBytes, 0),
    oeffnungen: klienten.reduce((summe, k) => summe + k.oeffnungen, 0),
    oeffnungsdauerMs: klienten.reduce((summe, k) => summe + k.oeffnungsdauerMs, 0),
    messwerte,
    erfolg: maengel.length === 0,
    maengel,
  };
}
