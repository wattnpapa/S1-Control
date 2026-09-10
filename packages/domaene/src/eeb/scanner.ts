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

import { kanonischeSerialisierung } from "../kanonisch.js";
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
 * **Die `meldungId` ist der Inhalts-Hash.** ZDM §3.2 nennt dafür
 * `bogenInhaltsId(bogen)`; die Funktion gibt es im geteilten Kern noch nicht
 * (Befund E-B1). Gerechnet wird deshalb über die **kanonische
 * Serialisierung** des migrierten Bogens (§7.6) — dieselbe Ordnung, die auch
 * der Zustandshash benutzt, und damit auf jedem Client dieselbe Zahl. Der
 * Bogen wird vorher migriert, weil zwei Clients mit verschiedenen
 * Codec-Fassungen sonst zwei Ids für denselben Bogen berechneten.
 */
export async function liesBogen(payload: Uint8Array, kompressor: Kompressor): Promise<Bogenbefund> {
  const roh = decodePayload(payload, kompressor);
  const bogen = migriereBogen({ ...roh });
  const signatur = await signaturVonPayload(payload);
  return {
    bogen,
    signatur,
    meldungId: inhaltsHash(kanonischeSerialisierung(bogen as unknown as never)),
  };
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
    { typ: "EinheitGemeldet", nutzlast: uebersetzt.einheit },
  ];
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
  const uebernommeneFelder = Object.keys(uebersetzt.einheit).sort();
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
