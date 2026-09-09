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
  istVerwaltungsereignis,
  ersetzteSegmente,
  leseZeilengrenzen,
  segmentText,
  zerlegeEreignisDateiname,
  Einsatzablage,
  type Dateisystem,
} from "@s1/speicher";

import { Klient } from "./klient.js";
import { erhebeStand, vergleiche, type Clientstand, type Vergleichsbefund } from "./konvergenz.js";
import { fehlendeStoerungen } from "./bericht.js";
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

/**
 * Ein Ereignis, das ein Client lokal geschrieben hat und das auf dem Share
 * nirgends mehr auswertbar ist.
 *
 * Das ist der harte Verlust — nicht zu verwechseln mit dem Fall aus §8.2, in
 * dem ein **Leser** wegen seiner Quarantäne nicht mehr an Bytes herankommt, die
 * sehr wohl auf dem Share stehen. Hier ist niemand mehr, der sie holen könnte.
 */
export interface Verlust {
  readonly clientId: string;
  readonly ereignisId: string;
}

export interface Phasenbefund {
  readonly nummer: number;
  readonly kommandos: number;
  readonly ruheErreicht: boolean;
  readonly ruheRunden: number;
  /** Woran die Ruhephase noch hing, als sie aufgegeben wurde (§7.6) — leer, wenn sie erreicht wurde. */
  readonly ruheOffen: readonly string[];
  /** Wie viele Beschädigungen nach §8.2 in dieser Phase injiziert wurden. */
  readonly beschaedigungen: number;
  readonly befund: Vergleichsbefund;
  readonly spiegelpruefung: readonly Spiegelbefund[];
  /** Ereignisse, die kein Leser mehr erreichen kann (§1.3 Satz 2, §4.6 Schritt 4). */
  readonly verluste: readonly Verlust[];
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
    const beschaedigungenVorher = stoerwerk.zaehlung()["beschaedigung"] ?? 0;

    const ziel = Math.min(plan.kommandos, phase * jeProPhase);
    let leerlauf = 0;
    while (kommandosGesamt < ziel && leerlauf < 200) {
      const handelnder = takt.waehle(klienten);
      await stoerwerk.vorBedienschritt(handelnder);
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
      // Erst spiegeln, dann stören, dann lesen. Die Reihenfolge ist nicht
      // beliebig: Eine Beschädigung nach §8.2 trifft einen **Leser** nur, wenn
      // sie an einer Stelle sitzt, die er noch nicht gelesen hat — er liest
      // nach §6.2 ab seinem `leseOffset` und kommt nie zurück. Würde erst
      // gelesen und dann gestört, träfe die Beschädigung ausschließlich den
      // Schreiber (§4.6.1 Auslöser 1), und §8.2, §8.6.1 Regel 3 und der
      // Wiederherstellungsweg aus Regel 4 blieben ungeprüft.
      for (const klient of klienten) await klient.spiegleWennFaellig();
      await stoerwerk.nachDerSpiegelung(klienten);
      for (const klient of klienten) {
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
    const verluste = await pruefeVollstaendigkeit(echt, klienten);
    phasen.push({
      nummer: phase,
      kommandos: kommandosGesamt,
      ruheErreicht: erreicht,
      ruheRunden: runden,
      ruheOffen: offen,
      beschaedigungen: (stoerwerk.zaehlung()["beschaedigung"] ?? 0) - beschaedigungenVorher,
      befund,
      spiegelpruefung,
      verluste,
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
  // Nicht **ein** Neustart, sondern so viele, bis nichts mehr zu reparieren
  // ist: §4.6.1 Auslöser 1 hängt am Öffnen, und eine an einer lokalen
  // Schreibstörung abgebrochene Reparatur (§8.8) wird erst beim nächsten
  // Öffnen fortgesetzt. Ein einzelner Start misst sonst einen Zwischenstand.
  for (const klient of klienten) await klient.oeffneBisNichtsMehrZuTun();

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
    // Sortiert, damit die Reihenfolge der Befunde nicht an der des
    // Dateisystems hängt — sonst unterschiede sich der Bericht zwischen zwei
    // Läufen mit demselben Startwert (DoD M0.4, „reproduzierbar").
    for (const name of [...(await echt.listeVerzeichnis(klient.ablage.lokalEreignisse))].sort()) {
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
        // ausdrücklich aus — „Für **fremde** Dateien gilt das ausdrücklich
        // **nicht**" —, und zwar mit derselben Begründung, die hier greift: Ihr
        // Spiegel ist nach §5.5 das geprüfte Präfix, und eine Beschädigung der
        // Share-Datei (§8.2) lässt ihn davon abweichen, ohne dass etwas falsch
        // liefe. Festgehalten wird der Stand, geurteilt wird nicht.
        befunde.push({
          clientId: klient.clientId,
          datei: name,
          stimmt: true,
          hinweis: `aufgegebene Kennung (§4.5 Schritt 6): lokal ${lokal.byteLength} Byte, Share ${share.byteLength} Byte — nicht verglichen`,
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

/**
 * Prüft, dass **jedes** Ereignis, das ein Client geschrieben hat, auf dem Share
 * noch auswertbar ist.
 *
 * Das ist der Kern dessen, was §7.6 mit „lokales Log gleich Share-Segment je
 * Client" meint, und es ist die einzige Prüfung, die den harten Verlust von
 * dem unterscheidet, was das Konzept ausdrücklich zulässt:
 *
 *  * Eine **Quarantäne** (§8.2) nimmt einem *Leser* den Zugang zu Bytes, die
 *    auf dem Share sehr wohl stehen. §8.2 Punkt 7 setzt die Konvergenzzusage
 *    für ihn aus; verloren ist nichts.
 *  * Ein **Verlust** heißt: Die Zeile steht auf keiner Share-Datei mehr, die
 *    sich auswerten lässt. Dann ist sie für alle fort — auch für den
 *    Wiederherstellungsweg aus §8.6.1 Regel 4, der den Spiegel eines anderen
 *    Clients ausleitet. §1.3 Satz 2 erklärt den lokalen Anhang zur Wahrheit;
 *    diese Wahrheit ist damit nicht mehr zustellbar.
 *
 * Gelesen wird die Share-Seite **ohne Kettenprüfung**: Gesucht ist, ob die
 * Zeile physisch da und lesbar ist, nicht ob ein bestimmter Leser sie
 * verketten kann. Genau daran hängt die Unterscheidung.
 */
async function pruefeVollstaendigkeit(
  echt: Dateisystem,
  klienten: readonly Klient[],
): Promise<readonly Verlust[]> {
  const aufDemShare = new Set<string>();
  const shareOrdner = klienten[0]?.ablage.shareEreignisse;
  if (shareOrdner === undefined) return [];
  for (const name of [...(await echt.listeVerzeichnis(shareOrdner))].sort()) {
    if (zerlegeEreignisDateiname(name) === undefined) continue;
    const bytes = await echt.liesAb(`${shareOrdner}/${name}`, 0);
    for (const zeile of leseZeilengrenzen(bytes, 0).zeilen) aufDemShare.add(zeile.rahmen.id);
  }

  const verluste: Verlust[] = [];
  for (const klient of klienten) {
    const praefixe = new Set<string>([clientPraefix(klient.clientId)]);
    for (const frueher of klient.akte.schreiber.zustand.frühereClientIds ?? []) {
      praefixe.add(clientPraefix(frueher));
    }
    for (const name of [...(await echt.listeVerzeichnis(klient.ablage.lokalEreignisse))].sort()) {
      const kenn = zerlegeEreignisDateiname(name);
      if (kenn === undefined || !praefixe.has(kenn.praefix)) continue;
      const bytes = await echt.liesAb(klient.ablage.lokalDatei(name), 0);
      for (const zeile of leseZeilengrenzen(bytes, 0).zeilen) {
        // Verwaltungsereignisse (§2.4) reden über die Datei, in der sie stehen;
        // ein ersetztes Segment behält seine eigenen, das Ersatzsegment nimmt
        // sie nicht mit (§4.6). Sie zählen deshalb nicht als Verlust.
        if (istVerwaltungsereignis(zeile.rahmen.typ)) continue;
        if (aufDemShare.has(zeile.rahmen.id)) continue;
        verluste.push({ clientId: klient.clientId, ereignisId: zeile.rahmen.id });
      }
    }
  }
  return verluste;
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
    }
    // **Kein Urteil über die Zustände zweier Clients mit verschiedenen
    // Versionsvektoren.** §7.6 sagt dazu „nicht vergleichbar — kein Fehler,
    // aber auch kein Nachweis", und §8.2 Punkt 7 setzt die Konvergenzzusage
    // aus, solange eine Quarantäne besteht. Beide Ausgänge — `nichtVergleichbar`
    // und `zuWenigeClients` — werden deshalb gleich behandelt: berichtet,
    // nicht bewertet.
    //
    // Vorher waren sie ungleich behandelt, und das war schlimmer als beides:
    // `nichtVergleichbar` verlangte Hash-Gleichheit, `zuWenigeClients` nicht.
    // Derselbe Sachverhalt war damit einmal ein Mangel und einmal nicht — und
    // je **mehr** Clients beschädigt waren, desto eher bestand der Lauf.
    // Befund des zweiten Gutachtens zu M0.4.
    //
    // Was den Verlust angeht, den diese Forderung eigentlich fangen sollte,
    // steht jetzt `pruefeVollstaendigkeit` — und die trifft ihn direkt, statt
    // ihn aus einem Hash-Unterschied zu erraten.
    for (const verlust of phase.verluste) {
      maengel.push(
        `Phase ${phase.nummer}: Ereignis ${verlust.ereignisId} von ${verlust.clientId} steht auf keiner auswertbaren Share-Datei mehr`,
      );
    }
    // `zuWenigeClients` in der letzten Phase ist **kein** Mangel.
    //
    // §8.2 Punkt 7 setzt die Konvergenzzusage aus, „solange die Quarantäne
    // besteht", und §8.6.1 Regel 3 nimmt solche Clients aus dem Vergleich. Zu
    // verlangen, dass die Zustände sich trotzdem decken, hieße mehr zu fordern,
    // als das Konzept zusagt — und der Lauf hat gezeigt, dass es diese Deckung
    // nach einer Beschädigung nicht immer gibt (siehe
    // `docs/v2/messungen/M0.4-simulation.md`, Abschnitt „Was §4.6 nicht
    // heilt"). Berichtet wird der Stand; bewertet wird er nicht.
    // Der zweite Teil des Abbruchkriteriums — „lokales Log gleich Share-Segment
    // je Client" (§7.6) — setzt voraus, dass an der Share-Datei niemand sonst
    // gedreht hat. Wurde in dieser Phase nach §8.2 beschädigt, ist eine
    // Abweichung im eigenen Segment die **vorgesehene** Lage: Repariert wird
    // durch ein Ersatzsegment (§4.6), die verfälschten Bytes bleiben liegen
    // (§4.6 Schritt 5), und ob die Reparatur schon gelaufen ist, hängt am
    // nächsten Öffnen (§4.6.1 Auslöser 1) und daran, ob sie ihrerseits an einer
    // lokalen Schreibstörung scheiterte (§8.8). Berichtet wird sie immer,
    // bewertet nur in einer Phase ohne Beschädigung.
    for (const s of phase.spiegelpruefung) {
      if (s.stimmt) continue;
      const zeile = `Phase ${phase.nummer}: ${s.clientId} ${s.datei} — ${s.hinweis ?? "Abweichung"}`;
      if (phase.beschaedigungen === 0) maengel.push(zeile);
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

  const vorlaeufig: Laufergebnis = {
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
    erfolg: false,
    maengel,
  };

  // Auflage 15 und die DoD von M0.4 verlangen „**alle** Störungen". Eine
  // geforderte Störung, die kein einziges Mal eintrat, ist deshalb ein Mangel
  // und nicht bloß eine Warnzeile: Sonst hinge die Aussage des Laufs an einem
  // Zufall, und ein CI-Lauf ohne Textauswertung könnte sie nicht bemerken
  // (Auflage 18).
  const fehlend = fehlendeStoerungen(vorlaeufig);
  const alle = [
    ...maengel,
    ...fehlend.map((name) => `Geforderte Störung nie eingetreten: ${name}`),
  ];
  return { ...vorlaeufig, erfolg: alle.length === 0, maengel: alle };
}
