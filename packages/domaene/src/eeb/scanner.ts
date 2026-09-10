/**
 * Der Handscanner-Weg: aus gescanntem Text ein Erfassungsbogen (M3.4).
 *
 * Ein Handscanner ist für den Rechner eine Tastatur. Was er liefert, ist die
 * Zeichenkette aus dem QR-Code — bei einem großen Bogen in **mehreren**
 * Teilen, die die Bedienung nacheinander scannt. Diese Datei hält den
 * Sammelstand, prüft die Signatur und liefert am Ende die Nutzlasten des
 * Katalogs.
 *
 * **Sie liegt in Ring 2 und nicht in der Schale**, obwohl sie einen
 * Kompressor braucht: Der Kompressor wird **injiziert**, wie das Dateisystem
 * in Ring 3 (02-ZIELBILD.md, „Vier Ringe“). Ring 2 hat weder `node:zlib` noch
 * die `DecompressionStream` des Browsers; wer den Weg hier baut, kann ihn ohne
 * beides prüfen — und die Regel, wann ein Teil ein Duplikat und wann ein
 * fremder Bogen ist, steht dann nicht in einer `.tsx`.
 *
 * **Der Empfang ist eine Tatsache** (§5.8.1): `EebMeldungEmpfangen` ist nicht
 * rücknehmbar und über die `meldungId` idempotent. Zwei Meldeköpfe, die
 * denselben Bogen scannen, erzeugen **eine** Meldung — darauf beruht die
 * ganze Dublettenfreiheit des Meldewegs, und deshalb ist die `meldungId` der
 * Inhalts-Hash des Bogens und keine vergebene Kennung.
 */

import {
  decodePayload,
  inhaltsHash,
  istSegmentNutzlast,
  migriereBogen,
  parseSegmentUrl,
  payloadAusText,
  segmentSammeln,
  segmentePayload,
  signaturVonPayload,
  type Erfassungsbogen,
  type Kompressor,
  type SegmentTeil,
  type SignaturStatus,
} from "@bos/eeb-format";

import { einheitSchluessel as fingerabdruck } from "@bos/meldekopf";

import { kanonischeSerialisierung } from "../kanonisch.js";
import type { EinheitZustand } from "../zustand.js";
import { uebersetzeBogen, type UebersetzungsAuftrag } from "./adapter.js";

/**
 * Wie viele Teile ein Bogen höchstens haben darf.
 *
 * `MAX_STUFEN` des Codecs begrenzt die Signaturstufen, nicht die Segmente.
 * Ohne eine Schranke hier könnte ein gefälschter Kopf `anzahl: 100000`
 * behaupten, und der Sammelstand einer Führungsstelle wartete auf Teile, die
 * nie kommen — mit einem Fortschrittsbalken, der nie vollläuft.
 */
export const TEILE_MAX = 64;

/** Der Stand einer Sammlung — genau das, was die Maske als Fortschritt zeigt. */
export interface Sammelstand {
  readonly teile: readonly SegmentTeil[];
  /** Wie viele Teile vorliegen. */
  readonly haben: number;
  /** Wie viele es insgesamt sind; 1 bei einem einteiligen Bogen, 0 bei leer. */
  readonly anzahl: number;
}

export const LEERER_STAND: Sammelstand = { teile: [], haben: 0, anzahl: 0 };

export type Scanbefund =
  | { readonly art: "unlesbar"; readonly meldung: string }
  | { readonly art: "gesammelt"; readonly stand: Sammelstand }
  | { readonly art: "duplikat"; readonly stand: Sammelstand }
  /** Der Teil gehört zu einem anderen Bogen; die Sammlung beginnt neu (§Codec). */
  | { readonly art: "fremd"; readonly stand: Sammelstand }
  | { readonly art: "vollstaendig"; readonly stand: Sammelstand; readonly payload: Uint8Array };

/**
 * Nimmt einen gescannten Text auf.
 *
 * Drei Fälle, und die Reihenfolge ist keine Willkür: Ein **Segment** wird
 * zuerst erkannt, weil sein Text ebenfalls mit dem URL-Präfix beginnt und
 * `payloadAusText` ihn sonst als vollständigen Bogen zu lesen versuchte.
 * Danach der **einteilige** Bogen. Alles Übrige ist unlesbar — und wird als
 * solches gemeldet, statt still verworfen zu werden: Ein Handscanner, der
 * einen Strichcode statt eines QR liest, liefert ebenfalls Text.
 */
export function nimmScan(stand: Sammelstand, text: string): Scanbefund {
  const geputzt = text.trim();
  if (geputzt === "") return { art: "unlesbar", meldung: "Der Scan war leer." };

  if (istSegmentNutzlast(geputzt)) {
    let teil: SegmentTeil;
    try {
      teil = parseSegmentUrl(geputzt);
    } catch (fehler) {
      return { art: "unlesbar", meldung: `Der Teil ist nicht lesbar: ${(fehler as Error).message}` };
    }
    if (teil.anzahl > TEILE_MAX) {
      return {
        art: "unlesbar",
        meldung: `Der Bogen behauptet ${String(teil.anzahl)} Teile; höchstens ${String(TEILE_MAX)} sind vorgesehen.`,
      };
    }
    const ergebnis = segmentSammeln([...stand.teile], teil);
    const neuerStand: Sammelstand = {
      teile: ergebnis.teile,
      haben: ergebnis.haben,
      anzahl: ergebnis.anzahl,
    };
    if (ergebnis.status === "vollständig") {
      return { art: "vollstaendig", stand: neuerStand, payload: segmentePayload([...ergebnis.teile]) };
    }
    if (ergebnis.status === "duplikat") return { art: "duplikat", stand: neuerStand };
    if (ergebnis.status === "fremd") return { art: "fremd", stand: neuerStand };
    return { art: "gesammelt", stand: neuerStand };
  }

  const payload = payloadAusText(geputzt);
  if (payload === null) {
    return {
      art: "unlesbar",
      meldung: "Der Scan enthält keinen Erfassungsbogen. Wurde ein anderer Code gelesen?",
    };
  }
  // Ein einteiliger Bogen setzt die Sammlung zurück: Wer einen vollständigen
  // Bogen scannt, während ein halber Stapel liegt, meint den vollständigen.
  return { art: "vollstaendig", stand: { teile: [], haben: 1, anzahl: 1 }, payload };
}

export interface Bogenbefund {
  readonly bogen: Erfassungsbogen;
  readonly signatur: SignaturStatus;
  /** Der Inhalts-Hash des Bogens — die `meldungId` nach §5.8.1. */
  readonly meldungId: string;
  /**
   * Der Fingerabdruck der Einheit — die **Revisionsreihe** nach §5.8.1.
   *
   * Er unterscheidet sich von der `meldungId` in dem, worüber er gebildet
   * wird: Die `meldungId` ist der Bogen, der Fingerabdruck ist die Einheit.
   * Meldet dieselbe Einheit am nächsten Tag neu, hat der Bogen einen anderen
   * Inhalt und damit eine andere `meldungId` — der Fingerabdruck bleibt, und
   * genau daran erkennt der Fold die zweite Fassung als Revision.
   */
  readonly einheitSchluessel: string;
  /**
   * Die Kennung der Einheit, die aus dieser Reihe entsteht.
   *
   * Sie wird aus dem **Fingerabdruck** abgeleitet und nicht aus der
   * `meldungId`: Sonst legte jede Revision eine zweite Einheit an, und die
   * Führungsstelle sähe dieselbe Gruppe nach drei Tagen dreimal im Lagebild.
   */
  readonly einheitId: string;
}

/**
 * Entpackt einen vollständigen Payload und prüft seine Signatur.
 *
 * **Die Signatur wird geprüft, aber sie entscheidet nichts.** §5.8.1: Der
 * Empfang ist eine Tatsache; eine Meldung mit ungültiger Signatur wird
 * aufgenommen und **angezeigt**, nicht verworfen. Wer sie nicht will, lehnt
 * sie ab — sie bleibt sichtbar. Ein Meldeweg, der still verwirft, verliert im
 * Zweifel eine echte Meldung, und das ist der teurere Fehler.
 *
 * **Die `meldungId` ist der Inhalts-Hash — aber nicht der aus dem Kern.**
 * ZDM §3.2 nennt dafür `bogenInhaltsId(bogen)`, und die Funktion gibt es in
 * `@bos/meldekopf`. Benutzt wird sie hier **nicht**, und der Grund steht in
 * §5.8.1: Auf der `meldungId` beruht die Zusicherung, dass zwei Meldeköpfe,
 * die denselben QR scannen, **eine** Meldung erzeugen. Der Kern rechnet
 * `fnv1a(JSON.stringify(bogen))` — 32 Bit, geordnet nach Einfügereihenfolge.
 * Das erste macht die Id abhängig davon, in welcher Reihenfolge ein Codec die
 * Felder aufbaut; das zweite kollidiert bei rund 77.000 Einträgen mit 50 %,
 * und eine Kollision heißt hier zwei verschiedene Meldungen unter derselben,
 * **nicht rücknehmbaren** Identität. Für die Dublettenerkennung in der
 * Sammlung eines Telefons ist beides in Ordnung; für eine Einsatzakte nicht.
 *
 * Gerechnet wird deshalb über die **kanonische Serialisierung** des migrierten
 * Bogens (§7.6) — dieselbe Ordnung, die auch der Zustandshash benutzt, und
 * damit auf jedem Client dieselbe Zahl. Der Bogen wird vorher migriert, weil
 * zwei Clients mit verschiedenen Codec-Fassungen sonst zwei Ids für denselben
 * Bogen berechneten.
 */
export async function liesBogen(payload: Uint8Array, kompressor: Kompressor): Promise<Bogenbefund> {
  const roh = decodePayload(payload, kompressor);
  const bogen = migriereBogen({ ...roh });
  const signatur = await signaturVonPayload(payload);
  const meldungId = inhaltsHash(kanonischeSerialisierung(bogen as unknown as never));
  // Der Fingerabdruck kommt aus dem geteilten Kern und wird nicht hier
  // nachgebaut: Er ist dieselbe Heuristik, die der Erfassungsbogen fuer seine
  // Sammlung benutzt (`@bos/meldekopf`, `einsaetze.ts`), und zwei
  // Heuristiken ueber derselben Frage zerfielen mit der ersten Aenderung.
  const einheitSchluessel = fingerabdruck(bogen.einheit);
  return {
    bogen,
    signatur,
    meldungId,
    einheitSchluessel,
    einheitId: einheitIdAus(einheitSchluessel),
  };
}

/**
 * Die Kennung der Einheit zu einer Revisionsreihe.
 *
 * Der Fingerabdruck ist Freitext („org:THW|…|c12|Oldenburg") und taugt nicht
 * als Id: Er trägt Trenner, Umlaute und die Laenge des Ortsnamens. Gehasht
 * ist er kurz, stabil und auf jedem Client gleich — und **derselbe** fuer
 * jede Fassung derselben Einheit. Das ist der ganze Zweck.
 */
export function einheitIdAus(einheitSchluessel: string): string {
  return `E-${inhaltsHash(einheitSchluessel).slice(0, 12)}`;
}

export interface UebernahmeAuftrag extends UebersetzungsAuftrag {
  readonly meldungId: string;
  /** Der rohe Scan-Text, unverändert mitgeführt (§5.8.1: der Bogen bleibt erhalten). */
  readonly rohPayload?: string;
  readonly empfangenAm: string;
  readonly quelle?: string;
}

/** Ein Ereignisentwurf ohne Rahmen — Id, HLC und Akteur gehören dem Schreiber. */
export interface Uebernahmeentwurf {
  readonly typ: string;
  readonly nutzlast: Record<string, unknown>;
  readonly vorher?: unknown;
  readonly neu?: unknown;
  readonly grund?: string;
}

/**
 * Die Ereignisse einer Übernahme, in der Reihenfolge, in der sie geschrieben
 * werden.
 *
 * **Die Reihenfolge ist fachlich und nicht technisch.** Der Fold kommt mit
 * jeder zurecht (§3.10, wartende Beobachtung); die Reihenfolge hier sorgt
 * dafür, dass ein zweiter Arbeitsplatz, der beim Lesen zusieht, nie eine
 * halbe Einheit sieht: erst die Meldung als Tatsache, dann die Einheit, dann
 * ihre Personen und Fahrzeuge, zuletzt der Vermerk der Übernahme.
 *
 * §5.8.2: Die übernommenen Werte werden als **eigenständige Feldereignisse**
 * geschrieben und nicht bloß als Projektion. Hier ist die Einheit neu, also
 * trägt ihre Anlage sie; der Vermerk `EebMeldungUebernommen` nennt die
 * übernommenen Felder, damit später erkennbar ist, was aus dem Bogen kam und
 * was die Führungsstelle von Hand setzte.
 */
export function uebernahmeEntwuerfe(
  bogen: Erfassungsbogen,
  signatur: SignaturStatus,
  auftrag: UebernahmeAuftrag,
  vorhanden?: EinheitZustand,
): readonly Uebernahmeentwurf[] {
  const uebersetzt = uebersetzeBogen(bogen, auftrag);
  const entwuerfe: Uebernahmeentwurf[] = [
    {
      typ: "EebMeldungEmpfangen",
      nutzlast: {
        meldungId: auftrag.meldungId,
        einheitSchluessel: auftrag.einheitSchluessel ?? auftrag.meldungId,
        stand: uebersetzt.stand,
        empfangenAm: auftrag.empfangenAm,
        quelle: auftrag.quelle ?? "SCAN",
        ...(signatur.zustand === "unsigniert"
          ? {}
          : {
              signatur: {
                // §5.8: Der Zustand ist zweiwertig — `pubkey` und `kurzform`
                // stehen bei beiden, der Absender nur bei „gueltig“: Bei
                // gebrochener Signatur wäre er wertlos und dürfte nie als
                // Absenderangabe erscheinen.
                zustand: signatur.zustand === "gueltig" ? "GUELTIG" : "UNGUELTIG",
                pubkey: signatur.pubkey,
                kurzform: signatur.kurzform,
                ...(signatur.zustand === "gueltig" && signatur.absender !== undefined
                  ? { absender: absenderfelder(signatur.absender) }
                  : {}),
              },
            }),
        ...(auftrag.rohPayload === undefined ? {} : { rohPayload: auftrag.rohPayload }),
        bogen,
      },
    },
  ];

  // **Die Revision legt keine zweite Einheit an.** `EinheitGemeldet` ist Form
  // (b), also eine Anlage; eine zweite Anlage derselben Id gewinnt nach §3.11
  // nicht, sondern landet in `verworfeneAnlagen` mit einem Hinweis. Die
  // Meldung von morgen ueberschriebe die Einheit also nicht — sie fiele
  // stillschweigend auf den Boden.
  //
  // §5.8.2 sagt, was stattdessen geschieht: Die uebernommenen Werte werden
  // als **eigenstaendige Feldereignisse** geschrieben, mit dem Vorher-Wert,
  // den der Bediener gesehen hat. Genau das tut {@link revisionsEntwuerfe}.
  if (vorhanden === undefined) {
    entwuerfe.push({ typ: "EinheitGemeldet", nutzlast: uebersetzt.einheit });
  } else {
    entwuerfe.push(...revisionsEntwuerfe(uebersetzt.einheit, vorhanden, auftrag.meldungId));
  }

  for (const person of uebersetzt.personen) entwuerfe.push({ typ: "PersonHinzugefuegt", nutzlast: person });
  for (const fahrzeug of uebersetzt.fahrzeuge) entwuerfe.push({ typ: "FahrzeugAngelegt", nutzlast: fahrzeug });
  if (uebersetzt.sofortbedarf !== undefined) {
    entwuerfe.push({
      typ: "SofortbedarfGesetzt",
      nutzlast: { einheitId: auftrag.einheitId },
      vorher: null,
      neu: uebersetzt.sofortbedarf,
    });
  }
  // §5.8: `EebMeldungUebernommen` ist Form (a) — der **Wert** steht in `neu`,
  // und trotzdem verlangt das Schema `einheitId` und `uebernommeneFelder`
  // auch in der Nutzlast. Das ist kein Widerspruch, sondern §2.3: Die
  // Nutzlast benennt, worauf sich das Ereignis bezieht; `neu` traegt, was
  // das Feld danach enthaelt.
  // Bei einer Revision zaehlen nur die Felder, die die Uebernahme wirklich
  // gesetzt hat — sonst behauptete der Vermerk, der Bogen habe zwoelf Felder
  // uebernommen, obwohl elf davon unveraendert blieben.
  const uebernommeneFelder =
    vorhanden === undefined
      ? Object.keys(uebersetzt.einheit).sort()
      : entwuerfe
          .filter((e) => e.typ === "EinheitStammdatenGeaendert" || e.typ === "StaerkeGeaendert")
          .map((e) =>
            e.typ === "StaerkeGeaendert" ? "staerke" : String((e.nutzlast as { feld?: unknown }).feld),
          )
          .sort();
  entwuerfe.push({
    typ: "EebMeldungUebernommen",
    nutzlast: {
      meldungId: auftrag.meldungId,
      einheitId: auftrag.einheitId,
      uebernommeneFelder,
    },
    vorher: null,
    neu: { einheitId: auftrag.einheitId, uebernommeneFelder },
  });
  return entwuerfe;
}

function absenderfelder(absender: { name?: string; email?: string; telefon?: string }): Record<string, string> {
  const felder: Record<string, string> = {};
  if (absender.name !== undefined) felder["name"] = absender.name;
  if (absender.email !== undefined) felder["email"] = absender.email;
  if (absender.telefon !== undefined) felder["telefon"] = absender.telefon;
  return felder;
}

/**
 * Die Feldereignisse einer **Revision** — §5.8.2.
 *
 * Verglichen wird die uebersetzte Nutzlast des neuen Bogens mit dem
 * gefalteten Zustand der Einheit. Je abweichendem Feld entsteht ein Ereignis
 * mit dem **gesehenen** Vorher-Wert; unveraenderte Felder erzeugen nichts.
 *
 * **Warum nicht einfach alle Felder neu setzen.** Ein Ereignis ohne Aenderung
 * ist eine Zeile im Tagebuch, die nichts sagt, und bei jeder Tagesmeldung
 * einer Einheit waeren es zwoelf davon. Schwerer wiegt §2.2a: Ein
 * `vorher`, das gleich `neu` ist, kann nie einen Konflikt anzeigen — der
 * Hinweis, dass jemand anders dasselbe Feld inzwischen geaendert hat, ginge
 * fuer alle unveraenderten Felder verloren.
 *
 * `grund` traegt die Meldung, aus der der Wert stammt (§5.8.2 nennt das
 * Format `EEB <meldungId>`): Damit ist im Tagebuch zu sehen, welche Zeile aus
 * einem Bogen kam und welche die Fuehrungsstelle von Hand setzte.
 */
export function revisionsEntwuerfe(
  neueEinheit: Record<string, unknown>,
  vorhanden: EinheitZustand,
  meldungId: string,
): readonly Uebernahmeentwurf[] {
  const grund = `EEB ${meldungId}`;
  const einheitId = vorhanden.id;
  const entwuerfe: Uebernahmeentwurf[] = [];

  for (const feld of REVISIONSFELDER) {
    if (!(feld in neueEinheit)) continue;
    const neu = neueEinheit[feld];
    const vorher = beobachteterWert(vorhanden, feld);
    if (gleich(vorher, neu)) continue;
    entwuerfe.push({
      typ: "EinheitStammdatenGeaendert",
      nutzlast: { einheitId, feld },
      vorher: vorher ?? null,
      neu,
      grund,
    });
  }

  // Die Staerke hat eine eigene Art (§5.4.1: sie ist ein Tripel und wird als
  // Tripel gesetzt, nicht in drei Ereignissen).
  const neueStaerke = neueEinheit["staerke"];
  if (neueStaerke !== undefined && !gleich(vorhanden.staerke.wert, neueStaerke)) {
    entwuerfe.push({
      typ: "StaerkeGeaendert",
      nutzlast: { einheitId },
      vorher: vorhanden.staerke.wert ?? null,
      neu: neueStaerke,
      grund,
    });
  }

  return entwuerfe;
}

/**
 * Die Felder, die eine Revision setzen darf.
 *
 * **Nicht dabei:** `abschnittId`, `status`, `reihenfolge` und
 * `istFuehrungDesAbschnitts`. Sie gehoeren der Fuehrungsstelle und nicht dem
 * Bogen — der Adapter setzt sie bei der ersten Meldung als Vorbelegung
 * (`status: "ANGEFORDERT"`), und eine Tagesmeldung duerfte eine im Einsatz
 * stehende Einheit nicht in den Anmarsch zuruecksetzen. Ebenfalls nicht
 * dabei: `einheitId` und `meldungId`, die keine fachlichen Felder sind.
 */
const REVISIONSFELDER = [
  "bezeichnung",
  "organisation",
  "organisationName",
  "hierarchie",
  "ebene",
  "personalErfassung",
  "bemerkung",
  "standortRef",
  "einheitSchluessel",
] as const;

/** Der gefaltete Wert eines Feldes — `undefined`, wenn es das Feld nicht gibt. */
function beobachteterWert(einheit: EinheitZustand, feld: string): unknown {
  return (einheit as unknown as Record<string, { wert?: unknown } | undefined>)[feld]?.wert;
}

/**
 * Wertgleichheit ueber die kanonische Serialisierung.
 *
 * `hierarchie` ist eine Liste von Objekten; ein `===` verglichen dort zwei
 * Referenzen und meldete jede Tagesmeldung als Aenderung. Die kanonische
 * Ordnung ist dieselbe, die §7.6 fuer den Zustandshash benutzt.
 */
function gleich(links: unknown, rechts: unknown): boolean {
  if (links === rechts) return true;
  if (links === undefined || links === null || rechts === undefined || rechts === null) return false;
  return (
    kanonischeSerialisierung(links as never) === kanonischeSerialisierung(rechts as never)
  );
}
