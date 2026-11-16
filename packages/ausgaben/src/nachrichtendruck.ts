/**
 * Die Projektionszeile des Blattes „Nachrichten" als Eingabe des
 * Vordruck-Adapters (KONZEPT-NACHRICHTEN.md §7, §8).
 *
 * Der Adapter (`nachricht.ts`) kennt bewusst weder Zustand noch Projektion;
 * diese eine Abbildung ist die Naht. Sie rechnet nichts, sie benennt nur um:
 * fehlende Texte werden leer, Vermerke behalten ihre Zeitpunkte (ISO), und die
 * Nachweisnummer wird zum Text, weil der Vordruck sie als Feld schreibt.
 */

import { datumZeitGruppe, type Nachrichtenzeile } from "@s1/domaene";

import type {
  Nachrichtendruck,
  Nachrichtennachweis,
  Nachrichtensichtung,
  Nachrichtenvermerk,
} from "./nachricht.js";

function vermerk(
  wert: { readonly mittel?: string; readonly zeitpunkt: string; readonly handzeichen: string } | undefined,
): { aufnahme: Nachrichtenvermerk } | Record<string, never> {
  if (wert === undefined) return {};
  return {
    aufnahme: {
      ...(wert.mittel === undefined ? {} : { mittel: wert.mittel }),
      zeitpunkt: wert.zeitpunkt,
      handzeichen: wert.handzeichen,
    },
  };
}

function nachweisAus(zeile: Nachrichtenzeile): Nachrichtennachweis | undefined {
  const n = zeile.nachweis;
  return n === undefined ? undefined : { nummer: String(n.nummer), zeitpunkt: n.zeitpunkt, handzeichen: n.handzeichen };
}

/** Nur die Kopiefarbe BLAU heißt „nur Kopie"; GRÜN, ROT und Unbekanntes sind Verteiler. */
function sichtungAus(zeile: Nachrichtenzeile): Nachrichtensichtung | undefined {
  const s = zeile.sichtung;
  if (s === undefined) return undefined;
  return {
    zeitpunkt: s.zeitpunkt,
    handzeichen: s.handzeichen,
    verteiler: s.verteiler.map((v) => ({ stelle: v.stelle, kopie: v.kopie === "BLAU" })),
    vermerke: zeile.vermerke ?? s.vermerke ?? "",
  };
}

/** Die Nachricht als Eingabe für `nachrichtAlsVordruckPdf`; `uebung` kommt vom Einsatz. */
export function nachrichtendruckAus(zeile: Nachrichtenzeile, uebung: boolean): Nachrichtendruck {
  const sichtung = sichtungAus(zeile);
  const nachweis = nachweisAus(zeile);
  return {
    richtung: zeile.richtung === "AUSGANG" ? "AUSGANG" : "EINGANG",
    art: zeile.art ?? "",
    vorrang: zeile.vorrang ?? "",
    gespraechsnotiz: zeile.gespraechsnotiz,
    uebermittlungswunsch: zeile.uebermittlungswunsch ?? "",
    anschrift: zeile.anschrift,
    rufnummer: zeile.rufnummer ?? "",
    betreff: zeile.betreff,
    inhalt: zeile.inhalt,
    absender: zeile.absender,
    abfassungszeit: zeile.abfassungszeit ?? "",
    zeichen: zeile.zeichen ?? "",
    funktion: zeile.funktion ?? "",
    gegenstelle: zeile.gegenstelle ?? "",
    ...vermerk(zeile.aufnahme),
    ...(zeile.annahme === undefined ? {} : { annahme: { zeitpunkt: zeile.annahme.zeitpunkt, handzeichen: zeile.annahme.handzeichen } }),
    ...(zeile.befoerderung === undefined
      ? {}
      : { befoerderung: { mittel: zeile.befoerderung.mittel, zeitpunkt: zeile.befoerderung.zeitpunkt, handzeichen: zeile.befoerderung.handzeichen } }),
    ...(nachweis === undefined ? {} : { nachweis }),
    ...(sichtung === undefined ? {} : { sichtung }),
    uebung,
  };
}

// --- Schnitt N3: der Entwurf in der Vorschau und der Dateiname des Ausdrucks

/**
 * Was die Maske „Nachricht verfassen" für die Vorschau hergibt
 * (KONZEPT-NACHRICHTEN.md Entscheidung 4): die Felder wie getippt, Zeiten
 * bereits als ISO. Eine eigene, flache Form und nicht die Maskenwerte des
 * Renderers, damit Ring 3 nichts über die Oberfläche weiß; die Abbildung
 * Maske → Vordruck gibt es so nur einmal, für Vorschau und Druck.
 */
export interface Nachrichtenentwurf {
  readonly richtung: "EINGANG" | "AUSGANG";
  readonly art: string;
  readonly vorrang: string;
  readonly gespraechsnotiz: boolean;
  readonly uebermittlungswunsch: string;
  readonly anschrift: string;
  readonly rufnummer: string;
  readonly betreff: string;
  readonly inhalt: string;
  readonly absender: string;
  readonly zeichen: string;
  readonly funktion: string;
  /** ISO; fehlt, solange die Abfassungszeit nicht lesbar ist. */
  readonly abfassungszeit?: string;
  /** Nur bei der Aufnahme durch die FmZ (Schnitt N2). */
  readonly aufnahme?: Nachrichtenvermerk;
  readonly gegenstelle?: string;
  readonly nummer?: string;
  /** Der Laufzettel, wenn die Maske im selben Zug verteilt (Ersatzsichter, Gesprächsnotiz). */
  readonly sichtung?: Nachrichtensichtung;
}

/** Der Entwurf als Eingabe für Vordruck und Vorschau — dieselbe Form, die auch der Druck einer Zeile nimmt. */
export function entwurfsdruck(entwurf: Nachrichtenentwurf, uebung: boolean): Nachrichtendruck {
  const nummer = entwurf.nummer?.trim() ?? "";
  return {
    richtung: entwurf.richtung,
    art: entwurf.art,
    vorrang: entwurf.vorrang,
    gespraechsnotiz: entwurf.gespraechsnotiz,
    uebermittlungswunsch: entwurf.uebermittlungswunsch,
    anschrift: entwurf.anschrift,
    rufnummer: entwurf.rufnummer,
    betreff: entwurf.betreff,
    inhalt: entwurf.inhalt,
    absender: entwurf.absender,
    abfassungszeit: entwurf.abfassungszeit ?? "",
    zeichen: entwurf.zeichen,
    funktion: entwurf.funktion,
    gegenstelle: entwurf.gegenstelle ?? "",
    ...(entwurf.aufnahme === undefined ? {} : { aufnahme: entwurf.aufnahme }),
    ...(nummer === "" ? {} : { nachweis: { nummer, zeitpunkt: entwurf.aufnahme?.zeitpunkt ?? "", handzeichen: entwurf.aufnahme?.handzeichen ?? "" } }),
    ...(entwurf.sichtung === undefined ? {} : { sichtung: entwurf.sichtung }),
    uebung,
  };
}

/**
 * Der Dateiname des Vordrucks einer Nachricht (KONZEPT-NACHRICHTEN.md §7):
 * `nachricht-<E|A><nummer>-<datumzeitgruppe>.pdf`, ohne Nummer „ohne".
 *
 * Die Zeit ist die Abfassungszeit (sonst die Aufnahme): Sie steht auf dem
 * Blatt, und derselbe Ausdruck zweimal überschreibt sich, statt zwei Dateien
 * zu hinterlassen. Ohne Nummer hängt ein Stück der Kennung an — zwei
 * unnummerierte Nachrichten derselben Minute fielen sonst im Verzeichnis
 * des Automatikdrucks (Entscheidung 7) übereinander.
 */
export function nachrichtendateiname(zeile: Pick<Nachrichtenzeile, "id" | "richtungKurz" | "nummer" | "abfassungszeit" | "aufnahme">): string {
  const zeit = datumZeitGruppe(zeile.abfassungszeit ?? zeile.aufnahme?.zeitpunkt ?? "") || "ohnezeit";
  if (zeile.nummer !== undefined) return `nachricht-${zeile.richtungKurz}${String(zeile.nummer)}-${zeit}.pdf`;
  const kennung = String(zeile.id).replace(/[^A-Za-z0-9]/g, "").slice(-8);
  return `nachricht-${zeile.richtungKurz}ohne-${zeit}-${kennung}.pdf`;
}
