/**
 * Folgeschritte, die ein Bedienschritt fachlich nach sich zieht — geplant
 * **vor** dem Schreiben gegen den Zustand, ausgeführt vom Aktendienst
 * unmittelbar danach in derselben Warteschlange.
 *
 * - **„Eintreffen zurück“** (`ErledigungZurueckgenommen`): Die beim
 *   Eintreffen angelegte Einheit wird mit zurückgenommen, sonst legte ein
 *   erneutes „Eingetroffen“ sie ein zweites Mal an (Ist-Stärke 15 → 21).
 *   Begründung für Entfernen statt „Wiederverwenden“: Das erneute Eintreffen
 *   legt die Einheit in der Maske des Renderers an, bevor der Worker davon
 *   erfährt; ein Wiederverwenden müsste dort ansetzen. Das Entfernen hält
 *   die Zahlen jederzeit richtig, ist über „Rückgängig“ und
 *   `EinheitWiederhergestellt` umkehrbar und bleibt im Tagebuch stehen.
 *   Entfernt wird **nur**, was erkennbar mit dem Eintreffen entstand und
 *   seither unverändert ist; sonst bleibt die Einheit und ein Hinweis nennt
 *   den Weg („Bestehende Einheit verknüpfen“).
 * - **Meldestatus ANWESEND** im Eingangskorb: Die Einheit der Meldung wird
 *   einsatzbereit gesetzt, wenn sie bisher nur erwartet war. Verschoben wird
 *   nichts — den Zielabschnitt kennt nur die Führung; steht die Einheit noch
 *   im Eingang oder im Bereich „Angefordert“, sagt der Hinweis es.
 */

import { einheitIdAus, kennzahlen, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import { entfernung } from "../kontrakt/bedienschritte.js";
import { STATUS_EINGETROFFEN } from "../kontrakt/anforderungsschritte.js";

/** Ein Folgeschritt samt dem Satz, der ihn dem Bediener erklärt. */
export interface Folgeschritt {
  readonly entwurf: Ereignisentwurf;
  readonly hinweis: string;
}

export interface Folgeplan {
  readonly folgen: readonly Folgeschritt[];
  /** Hinweise ohne Schreibschritt (z. B. „Einheit bleibt bestehen“). */
  readonly hinweise: readonly string[];
}

const KEINE: Folgeplan = { folgen: [], hinweise: [] };

/** So kurz nach dem Anlegen der Einheit gilt ein Eintreffen noch als ihr Anlass. */
const ANLASS_FENSTER_MS = 5 * 60 * 1000;

function textWert(feld: { readonly wert: unknown } | undefined, ersatz = ""): string {
  return typeof feld?.wert === "string" && feld.wert !== "" ? feld.wert : ersatz;
}

/** Ob die Einheit erkennbar durch das Eintreffen entstand und seither nicht angefasst wurde. */
function ausEintreffenEntstanden(zustand: Zustand, einheitId: string, erledigtHlc: { millisekunden: number; clientId: string }): boolean {
  const einheit = zustand.einheiten[einheitId];
  if (einheit === undefined || einheit.angelegtMitArt !== "EinheitGemeldet") return false;
  const abstand = erledigtHlc.millisekunden - einheit.angelegtMit.millisekunden;
  const imFenster = abstand >= 0 && abstand <= ANLASS_FENSTER_MS && einheit.angelegtMit.clientId === erledigtHlc.clientId;
  const unveraendert = einheit.status.wert === STATUS_EINGETROFFEN && einheit.status.hlc.millisekunden === einheit.angelegtMit.millisekunden && einheit.status.hlc.zaehler === einheit.angelegtMit.zaehler;
  const hatGeraete = Object.values(zustand.fahrzeuge).some((f) => f.einheitId?.wert === einheitId) ||
    Object.values(zustand.personen).some((p) => p.einheitId?.wert === einheitId);
  return imFenster && unveraendert && !hatGeraete && einheit.entfernt?.wert !== true;
}

function planeEintreffenZurueck(zustand: Zustand, anforderungId: string): Folgeplan {
  const anforderung = zustand.anforderungen[anforderungId];
  const erledigung = anforderung?.erledigung;
  const wert = erledigung?.wert as { abloesendeEinheitId?: unknown } | null | undefined;
  const einheitId = typeof wert?.abloesendeEinheitId === "string" ? wert.abloesendeEinheitId : undefined;
  const einheit = einheitId === undefined ? undefined : zustand.einheiten[einheitId];
  if (anforderung === undefined || erledigung === undefined || einheitId === undefined || einheit === undefined) return KEINE;
  if (einheit.entfernt?.wert === true) return KEINE;
  const name = textWert(einheit.bezeichnung, einheitId);
  if (ausEintreffenEntstanden(zustand, einheitId, erledigung.hlc)) {
    return {
      folgen: [
        {
          entwurf: entfernung(einheitId, "Eintreffen zurückgenommen — die beim Eintreffen angelegte Einheit entfällt"),
          hinweis: `Die beim Eintreffen angelegte Einheit „${name}“ wurde mit entfernt. Bei erneutem „Eingetroffen“ wird sie neu angelegt.`,
        },
      ],
      hinweise: [],
    };
  }
  return {
    folgen: [],
    hinweise: [
      `Die Einheit „${name}“ bleibt bestehen. Beim erneuten „Eingetroffen“ bitte „Bestehende Einheit verknüpfen“ wählen, sonst entsteht sie doppelt.`,
    ],
  };
}

/** Die Einheit, auf die eine Meldung zeigt: übernommene, sonst die aus dem Fingerabdruck. */
function einheitDerMeldung(zustand: Zustand, meldungId: string): string | undefined {
  const meldung = zustand.meldungen[meldungId];
  if (meldung === undefined) return undefined;
  const uebernommen = (meldung.uebernahme?.wert as { einheitId?: unknown } | null | undefined)?.einheitId;
  if (typeof uebernommen === "string" && zustand.einheiten[uebernommen] !== undefined) return uebernommen;
  const schluessel = meldung.einheitSchluessel?.wert;
  if (typeof schluessel !== "string" || schluessel === "") return undefined;
  const id = einheitIdAus(schluessel);
  return zustand.einheiten[id] === undefined ? undefined : id;
}

function planeAnwesend(zustand: Zustand, meldungId: string): Folgeplan {
  const einheitId = einheitDerMeldung(zustand, meldungId);
  const einheit = einheitId === undefined ? undefined : zustand.einheiten[einheitId];
  if (einheitId === undefined || einheit === undefined) return KEINE;
  if (kennzahlen.zaehlklasse(zustand, einheit) !== "erwartet") return KEINE;
  const status = textWert(einheit.status);
  const name = textWert(einheit.bezeichnung, einheitId);
  if (status === "" || status === STATUS_EINGETROFFEN) return KEINE;
  return {
    folgen: [
      {
        entwurf: { typ: "StatusGesetzt", nutzlast: { einheitId }, vorher: status, neu: STATUS_EINGETROFFEN },
        hinweis: `Die Einheit „${name}“ ist als anwesend gemeldet und jetzt einsatzbereit.`,
      },
    ],
    hinweise: [],
  };
}

/** Plant die Folgeschritte zu einem Entwurf — gegen den Zustand **vor** dem Schreiben. */
export function planeFolgen(zustand: Zustand, entwurf: Ereignisentwurf): Folgeplan {
  const nutzlast = (entwurf.nutzlast ?? {}) as Record<string, unknown>;
  if (entwurf.typ === "ErledigungZurueckgenommen" && typeof nutzlast["anforderungId"] === "string") {
    return planeEintreffenZurueck(zustand, nutzlast["anforderungId"]);
  }
  if (entwurf.typ === "EebMeldeStatusGesetzt" && entwurf.neu === "ANWESEND" && typeof nutzlast["meldungId"] === "string") {
    return planeAnwesend(zustand, nutzlast["meldungId"]);
  }
  return KEINE;
}

/** Hinweis, wenn eine als anwesend gemeldete Einheit trotzdem nicht in die Ist-Stärke zählt (Bereich Eingang/Angefordert). */
export function anwesendBereichshinweis(zustand: Zustand, entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ !== "EebMeldeStatusGesetzt" || entwurf.neu !== "ANWESEND") return undefined;
  const meldungId = (entwurf.nutzlast as { meldungId?: unknown } | null | undefined)?.meldungId;
  const einheitId = typeof meldungId === "string" ? einheitDerMeldung(zustand, meldungId) : undefined;
  const einheit = einheitId === undefined ? undefined : zustand.einheiten[einheitId];
  if (einheit === undefined || kennzahlen.zaehlklasse(zustand, einheit) !== "erwartet") return undefined;
  const bereich = textWert(zustand.abschnitte[einheit.wirksamerAbschnittId]?.name, "ihrem Bereich");
  return `Die Einheit „${textWert(einheit.bezeichnung)}“ steht noch in „${bereich}“ und zählt dort nicht zur Ist-Stärke. Bitte in einen Einsatzabschnitt verschieben.`;
}

