/**
 * Der Ereigniskatalog als Tabelle — die fuenf Spalten aus
 * KONZEPT-EREIGNISSE.md §5.1 in maschinenlesbarer Form.
 *
 * Der Fold liest **diese** Tabelle und keine Fallunterscheidung nach
 * Ereignisart. Das ist der Unterschied zu M0.2, wo jede Art ihren eigenen
 * Zweig hatte: Eine Regel, die nur im Code steht, ist eine Auslegung; eine
 * Regel in dieser Tabelle laesst sich gegen §5 des Konzepts Zeile fuer Zeile
 * pruefen.
 */

import type { z } from "zod";

import * as S from "./schemata.js";

export * from "./bausteine.js";
export * as schemata from "./schemata.js";

/**
 * Die drei Formen aus §2.2.
 *
 * (a) setzt **ein** Feld, und der Wert steht im Rahmen (`neu`/`vorher`).
 * (b) legt eine Entitaet an; die Werte stehen in der Nutzlast.
 * (c) wirkt auf **mehrere** Entitaeten zugleich (Aufteilen, Zusammenfuehren).
 */
export type Form = "a" | "b" | "c";

/** Die fuenf Konfliktklassen aus §3.4. */
export type Konfliktklasse = "LWW_FELD" | "LWW_ENTITAET" | "ADDITIV" | "REGEL" | "ERSTWERT";

/** Die Wurzeln der Datensammlungen des Zustands (§3.2). */
export type Entitaetsart =
  | "einsatz"
  | "abschnitt"
  | "einheit"
  | "fahrzeug"
  | "person"
  | "auftrag"
  | "anforderung"
  | "dienstposten"
  | "schichtplan"
  | "meldung"
  | "anhang"
  | "etbEintrag"
  | "archivierungen";

/**
 * Woher der Restpfad des gesetzten Feldes kommt.
 *
 * `fest` bei den Arten, die genau ein Feld treffen (`AbschnittUmbenannt` →
 * `name`); `ausNutzlast` bei denen, die es in der Nutzlast benennen
 * (`EinheitStammdatenGeaendert.feld`) — dort steht der Name unter dem
 * angegebenen Schluessel, gegebenenfalls unter einem Praefix
 * (`LogistikGesetzt` → `logistik/<feld>`).
 */
export type Feldwahl =
  | { readonly art: "fest"; readonly pfad: string }
  | { readonly art: "ausNutzlast"; readonly schluessel: string; readonly praefix?: string };

export interface Katalogeintrag {
  readonly typ: string;
  readonly form: Form;
  readonly schema: z.ZodType;
  /** Aktuelle Version dieser Nutzlast (§3.7); erhoeht sich mit jedem Upcaster. */
  readonly nutzlastVersion: number;
  readonly entitaet: Entitaetsart;
  /** Der Nutzlastschluessel, unter dem die Entitaets-Id steht. */
  readonly idFeld: string;
  /** Nur bei Form (a): welches Feld gesetzt wird. */
  readonly feld?: Feldwahl;
  /**
   * Ein fester Wert fuer `neu`, wo die Art ihn bestimmt (§2.2).
   *
   * `EinheitEntfernt` setzt `true`, `EinheitWiederhergestellt` `false`,
   * `EinsatzWiedereroeffnet` `null`. Ein Ereignis, dessen `neu` davon
   * abweicht, ist ein Protokollbruch und kein Freiheitsgrad.
   */
  readonly festerWert?: unknown;
  readonly klasse: Konfliktklasse;
  /** Feldpfade, die von der Klasse der Zeile abweichen (§5.4, §5.5). */
  readonly klasseJeFeld?: { readonly [feld: string]: Konfliktklasse };
  /** `grund` ist Pflicht (§2.4) — die vollstaendige Liste steht dort. */
  readonly grundPflicht?: true;
  /** Das benannte Gegenereignis aus §6 U2; fehlt, wo Undo ausgeschlossen ist. */
  readonly gegenereignis?: string;
  /** `true`, wo §6 U2 Undo ausdruecklich ausschliesst. */
  readonly ohneUndo?: true;
}

const e = (eintrag: Katalogeintrag): Katalogeintrag => eintrag;
const fest = (pfad: string): Feldwahl => ({ art: "fest", pfad });
const ausNutzlast = (schluessel: string, praefix?: string): Feldwahl =>
  praefix === undefined
    ? { art: "ausNutzlast", schluessel }
    : { art: "ausNutzlast", schluessel, praefix };

/** Alle Eintraege des Katalogs, in der Reihenfolge von §5. */
export const KATALOG_EINTRAEGE: readonly Katalogeintrag[] = [
  // §5.2 Einsatz
  e({ typ: "EinsatzAngelegt", form: "b", schema: S.EinsatzAngelegt, nutzlastVersion: 1,
      entitaet: "einsatz", idFeld: "einsatzId", klasse: "REGEL", ohneUndo: true }),
  e({ typ: "EinsatzStammdatenGeaendert", form: "a", schema: S.EinsatzStammdatenGeaendert,
      nutzlastVersion: 1, entitaet: "einsatz", idFeld: "einsatzId",
      feld: ausNutzlast("feld"), klasse: "LWW_FELD",
      gegenereignis: "EinsatzStammdatenGeaendert" }),
  e({ typ: "KostenParameterGeaendert", form: "a", schema: S.KostenParameterGeaendert,
      nutzlastVersion: 1, entitaet: "einsatz", idFeld: "einsatzId",
      feld: ausNutzlast("feld", "kosten"), klasse: "LWW_FELD",
      gegenereignis: "KostenParameterGeaendert" }),
  e({ typ: "EinsatzBeendet", form: "a", schema: S.EinsatzBeendet, nutzlastVersion: 1,
      entitaet: "einsatz", idFeld: "einsatzId", feld: fest("ende"), klasse: "LWW_FELD",
      gegenereignis: "EinsatzWiedereroeffnet" }),
  e({ typ: "EinsatzWiedereroeffnet", form: "a", schema: S.EinsatzWiedereroeffnet,
      nutzlastVersion: 1, entitaet: "einsatz", idFeld: "einsatzId", feld: fest("ende"),
      festerWert: null, klasse: "LWW_FELD" }),
  e({ typ: "EinsatzArchiviert", form: "b", schema: S.EinsatzArchiviert, nutzlastVersion: 1,
      entitaet: "archivierungen", idFeld: "einsatzId", klasse: "REGEL", ohneUndo: true }),
  e({ typ: "ArchivierungZurueckgenommen", form: "b", schema: S.ArchivierungZurueckgenommen,
      nutzlastVersion: 1, entitaet: "archivierungen", idFeld: "archivierungEreignisId",
      klasse: "REGEL", grundPflicht: true, ohneUndo: true }),

  // §5.3 Abschnitt
  e({ typ: "AbschnittAngelegt", form: "b", schema: S.AbschnittAngelegt, nutzlastVersion: 1,
      entitaet: "abschnitt", idFeld: "abschnittId", klasse: "ADDITIV",
      gegenereignis: "AbschnittAufgeloest" }),
  e({ typ: "AbschnittUmbenannt", form: "a", schema: S.AbschnittUmbenannt, nutzlastVersion: 1,
      entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("name"), klasse: "LWW_FELD" }),
  e({ typ: "AbschnittTypGeaendert", form: "a", schema: S.AbschnittTypGeaendert,
      nutzlastVersion: 1, entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("typ"),
      klasse: "LWW_FELD", grundPflicht: true }),
  e({ typ: "AbschnittUmgehaengt", form: "a", schema: S.AbschnittUmgehaengt, nutzlastVersion: 1,
      entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("parentId"), klasse: "REGEL" }),
  e({ typ: "AbschnittUmsortiert", form: "a", schema: S.AbschnittUmsortiert, nutzlastVersion: 1,
      entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("reihenfolge"),
      klasse: "LWW_FELD" }),
  e({ typ: "AbschnittBemerkungGesetzt", form: "a", schema: S.AbschnittBemerkungGesetzt,
      nutzlastVersion: 1, entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("bemerkung"),
      klasse: "LWW_FELD" }),
  e({ typ: "AbschnittAufgeloest", form: "a", schema: S.AbschnittAufgeloest, nutzlastVersion: 1,
      entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("aufgeloest"),
      klasse: "LWW_ENTITAET", gegenereignis: "AbschnittWiederhergestellt" }),
  e({ typ: "AbschnittWiederhergestellt", form: "a", schema: S.AbschnittWiederhergestellt,
      nutzlastVersion: 1, entitaet: "abschnitt", idFeld: "abschnittId", feld: fest("aufgeloest"),
      festerWert: null, klasse: "LWW_ENTITAET" }),

  // §5.4 Einheit
  e({ typ: "EinheitGemeldet", form: "b", schema: S.EinheitGemeldet, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", klasse: "ADDITIV",
      gegenereignis: "EinheitEntfernt" }),
  e({ typ: "EinheitStammdatenGeaendert", form: "a", schema: S.EinheitStammdatenGeaendert,
      nutzlastVersion: 1, entitaet: "einheit", idFeld: "einheitId", feld: ausNutzlast("feld"),
      klasse: "LWW_FELD",
      klasseJeFeld: { hierarchie: "LWW_ENTITAET", fuehrungskraft: "LWW_ENTITAET",
                      taktischesZeichen: "LWW_ENTITAET" } }),
  e({ typ: "StaerkeGeaendert", form: "a", schema: S.StaerkeGeaendert, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("staerke"), klasse: "LWW_ENTITAET" }),
  e({ typ: "StatusGesetzt", form: "a", schema: S.StatusGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("status"), klasse: "LWW_FELD" }),
  e({ typ: "SchichtGesetzt", form: "a", schema: S.SchichtGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("schicht"), klasse: "LWW_FELD" }),
  e({ typ: "ZeitpunktGesetzt", form: "a", schema: S.ZeitpunktGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: ausNutzlast("feld"), klasse: "LWW_FELD" }),
  e({ typ: "EinheitVerschoben", form: "a", schema: S.EinheitVerschoben, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("abschnittId"), klasse: "REGEL" }),
  e({ typ: "EinheitUmsortiert", form: "a", schema: S.EinheitUmsortiert, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("reihenfolge"), klasse: "LWW_FELD" }),
  e({ typ: "EinheitArchiviert", form: "a", schema: S.EinheitArchiviert, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("abschnittId"),
      festerWert: "ARCHIV", klasse: "REGEL" }),
  e({ typ: "LogistikGesetzt", form: "a", schema: S.LogistikGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: ausNutzlast("feld", "logistik"),
      klasse: "LWW_FELD" }),
  e({ typ: "SofortbedarfGesetzt", form: "a", schema: S.SofortbedarfGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("sofortbedarf"),
      klasse: "LWW_ENTITAET" }),
  e({ typ: "PsaBedarfGesetzt", form: "a", schema: S.PsaBedarfGesetzt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("psaSaetzeProTag"),
      klasse: "LWW_FELD" }),
  e({ typ: "EinheitAufgeteilt", form: "c", schema: S.EinheitAufgeteilt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "neueEinheitId", klasse: "REGEL",
      gegenereignis: "EinheitZusammengefuehrt" }),
  e({ typ: "EinheitZusammengefuehrt", form: "c", schema: S.EinheitZusammengefuehrt,
      nutzlastVersion: 1, entitaet: "einheit", idFeld: "zielEinheitId", klasse: "REGEL",
      gegenereignis: "EinheitAufgeteilt" }),
  e({ typ: "EinheitEntfernt", form: "a", schema: S.EinheitEntfernt, nutzlastVersion: 1,
      entitaet: "einheit", idFeld: "einheitId", feld: fest("entfernt"), festerWert: true,
      klasse: "LWW_FELD", grundPflicht: true, gegenereignis: "EinheitWiederhergestellt" }),
  e({ typ: "EinheitWiederhergestellt", form: "a", schema: S.EinheitWiederhergestellt,
      nutzlastVersion: 1, entitaet: "einheit", idFeld: "einheitId", feld: fest("entfernt"),
      festerWert: false, klasse: "LWW_FELD" }),

  // §5.5 Fahrzeug und Person
  e({ typ: "FahrzeugAngelegt", form: "b", schema: S.FahrzeugAngelegt, nutzlastVersion: 1,
      entitaet: "fahrzeug", idFeld: "fahrzeugId", klasse: "ADDITIV",
      gegenereignis: "FahrzeugEntfernt" }),
  e({ typ: "FahrzeugGeaendert", form: "a", schema: S.FahrzeugGeaendert, nutzlastVersion: 1,
      entitaet: "fahrzeug", idFeld: "fahrzeugId", feld: ausNutzlast("feld"), klasse: "LWW_FELD",
      klasseJeFeld: { funkrufname: "LWW_ENTITAET", taktischesZeichen: "LWW_ENTITAET" } }),
  e({ typ: "FahrzeugVerschoben", form: "a", schema: S.FahrzeugVerschoben, nutzlastVersion: 1,
      entitaet: "fahrzeug", idFeld: "fahrzeugId", feld: fest("abschnittId"), klasse: "REGEL" }),
  e({ typ: "FahrzeugEinheitGewechselt", form: "a", schema: S.FahrzeugEinheitGewechselt,
      nutzlastVersion: 1, entitaet: "fahrzeug", idFeld: "fahrzeugId", feld: fest("einheitId"),
      klasse: "LWW_FELD" }),
  e({ typ: "FahrzeugEntfernt", form: "a", schema: S.FahrzeugEntfernt, nutzlastVersion: 1,
      entitaet: "fahrzeug", idFeld: "fahrzeugId", feld: fest("entfernt"), festerWert: true,
      klasse: "LWW_FELD", grundPflicht: true, gegenereignis: "FahrzeugWiederhergestellt" }),
  e({ typ: "FahrzeugWiederhergestellt", form: "a", schema: S.FahrzeugWiederhergestellt,
      nutzlastVersion: 1, entitaet: "fahrzeug", idFeld: "fahrzeugId", feld: fest("entfernt"),
      festerWert: false, klasse: "LWW_FELD" }),
  e({ typ: "PersonHinzugefuegt", form: "b", schema: S.PersonHinzugefuegt, nutzlastVersion: 1,
      entitaet: "person", idFeld: "personId", klasse: "ADDITIV",
      gegenereignis: "PersonEntfernt" }),
  e({ typ: "PersonGeaendert", form: "a", schema: S.PersonGeaendert, nutzlastVersion: 1,
      entitaet: "person", idFeld: "personId", feld: ausNutzlast("feld"), klasse: "LWW_FELD",
      klasseJeFeld: { funktionen: "LWW_ENTITAET", fahrerlaubnisse: "LWW_ENTITAET",
                      kontakte: "LWW_ENTITAET", zusatzqualifikationen: "LWW_ENTITAET" } }),
  e({ typ: "PersonEntfernt", form: "a", schema: S.PersonEntfernt, nutzlastVersion: 1,
      entitaet: "person", idFeld: "personId", feld: fest("entfernt"), festerWert: true,
      klasse: "LWW_FELD", grundPflicht: true, gegenereignis: "PersonWiederhergestellt" }),
  e({ typ: "PersonWiederhergestellt", form: "a", schema: S.PersonWiederhergestellt,
      nutzlastVersion: 1, entitaet: "person", idFeld: "personId", feld: fest("entfernt"),
      festerWert: false, klasse: "LWW_FELD" }),

  // §5.6 Auftrag und Anforderung
  e({ typ: "AuftragErfasst", form: "b", schema: S.AuftragErfasst, nutzlastVersion: 1,
      entitaet: "auftrag", idFeld: "auftragId", klasse: "ADDITIV",
      gegenereignis: "AuftragZurueckgenommen" }),
  e({ typ: "AuftragBeendet", form: "a", schema: S.AuftragBeendet, nutzlastVersion: 1,
      entitaet: "auftrag", idFeld: "auftragId", feld: fest("bis"), klasse: "LWW_FELD" }),
  e({ typ: "AuftragZurueckgenommen", form: "a", schema: S.AuftragZurueckgenommen,
      nutzlastVersion: 1, entitaet: "auftrag", idFeld: "auftragId", feld: fest("zurueckgenommen"),
      festerWert: true, klasse: "LWW_FELD" }),
  e({ typ: "AnforderungAngelegt", form: "b", schema: S.AnforderungAngelegt, nutzlastVersion: 1,
      entitaet: "anforderung", idFeld: "anforderungId", klasse: "ADDITIV",
      gegenereignis: "AnforderungStorniert" }),
  e({ typ: "AnforderungGeaendert", form: "a", schema: S.AnforderungGeaendert, nutzlastVersion: 1,
      entitaet: "anforderung", idFeld: "anforderungId", feld: ausNutzlast("feld"),
      klasse: "LWW_FELD" }),
  e({ typ: "AbloesungZugesagt", form: "a", schema: S.AbloesungZugesagt, nutzlastVersion: 1,
      entitaet: "anforderung", idFeld: "anforderungId", feld: fest("zusage"),
      klasse: "LWW_ENTITAET", gegenereignis: "ZusageZurueckgenommen" }),
  e({ typ: "ZusageZurueckgenommen", form: "a", schema: S.ZusageZurueckgenommen,
      nutzlastVersion: 1, entitaet: "anforderung", idFeld: "anforderungId", feld: fest("zusage"),
      festerWert: null, klasse: "LWW_ENTITAET" }),
  e({ typ: "AnforderungErledigt", form: "a", schema: S.AnforderungErledigt, nutzlastVersion: 1,
      entitaet: "anforderung", idFeld: "anforderungId", feld: fest("erledigung"),
      klasse: "LWW_ENTITAET", gegenereignis: "ErledigungZurueckgenommen" }),
  e({ typ: "ErledigungZurueckgenommen", form: "a", schema: S.ErledigungZurueckgenommen,
      nutzlastVersion: 1, entitaet: "anforderung", idFeld: "anforderungId",
      feld: fest("erledigung"), festerWert: null, klasse: "LWW_ENTITAET" }),
  e({ typ: "AnforderungStorniert", form: "a", schema: S.AnforderungStorniert, nutzlastVersion: 1,
      entitaet: "anforderung", idFeld: "anforderungId", feld: fest("storno"), festerWert: true,
      klasse: "LWW_FELD", grundPflicht: true, gegenereignis: "StornoZurueckgenommen" }),
  e({ typ: "StornoZurueckgenommen", form: "a", schema: S.StornoZurueckgenommen,
      nutzlastVersion: 1, entitaet: "anforderung", idFeld: "anforderungId", feld: fest("storno"),
      festerWert: null, klasse: "LWW_FELD" }),

  // §5.7 Dienstposten und Schichtplan
  e({ typ: "DienstpostenAngelegt", form: "b", schema: S.DienstpostenAngelegt, nutzlastVersion: 1,
      entitaet: "dienstposten", idFeld: "dienstpostenId", klasse: "ADDITIV",
      gegenereignis: "DienstpostenEntfernt" }),
  e({ typ: "DienstpostenGeaendert", form: "a", schema: S.DienstpostenGeaendert,
      nutzlastVersion: 1, entitaet: "dienstposten", idFeld: "dienstpostenId",
      feld: ausNutzlast("feld"), klasse: "LWW_FELD" }),
  e({ typ: "DienstpostenBesetzt", form: "a", schema: S.DienstpostenBesetzt, nutzlastVersion: 1,
      entitaet: "dienstposten", idFeld: "dienstpostenId", feld: fest("besetzung"),
      klasse: "LWW_ENTITAET" }),
  e({ typ: "DienstpostenEntfernt", form: "a", schema: S.DienstpostenEntfernt, nutzlastVersion: 1,
      entitaet: "dienstposten", idFeld: "dienstpostenId", feld: fest("entfernt"),
      festerWert: true, klasse: "LWW_FELD",
      gegenereignis: "DienstpostenWiederhergestellt" }),
  e({ typ: "DienstpostenWiederhergestellt", form: "a", schema: S.DienstpostenWiederhergestellt,
      nutzlastVersion: 1, entitaet: "dienstposten", idFeld: "dienstpostenId",
      feld: fest("entfernt"), festerWert: false, klasse: "LWW_FELD" }),
  e({ typ: "SchichtplanEintragGesetzt", form: "a", schema: S.SchichtplanEintragGesetzt,
      nutzlastVersion: 1, entitaet: "schichtplan", idFeld: "dienstpostenId",
      feld: ausNutzlast("datum"), klasse: "LWW_FELD" }),

  // §5.8 EEB-Meldungen und Anhaenge
  e({ typ: "EebMeldungEmpfangen", form: "b", schema: S.EebMeldungEmpfangen, nutzlastVersion: 1,
      entitaet: "meldung", idFeld: "meldungId", klasse: "REGEL", ohneUndo: true }),
  e({ typ: "EebMeldungZugeordnet", form: "a", schema: S.EebMeldungZugeordnet, nutzlastVersion: 1,
      entitaet: "meldung", idFeld: "meldungId", feld: fest("einheitSchluessel"),
      klasse: "LWW_FELD" }),
  e({ typ: "EebMeldungUebernommen", form: "a", schema: S.EebMeldungUebernommen,
      nutzlastVersion: 1, entitaet: "meldung", idFeld: "meldungId", feld: fest("uebernahme"),
      klasse: "LWW_ENTITAET", gegenereignis: "EebMeldungUebernahmeZurueckgenommen" }),
  e({ typ: "EebMeldungUebernahmeZurueckgenommen", form: "a",
      schema: S.EebMeldungUebernahmeZurueckgenommen, nutzlastVersion: 1, entitaet: "meldung",
      idFeld: "meldungId", feld: fest("uebernahme"), festerWert: null, klasse: "LWW_ENTITAET" }),
  e({ typ: "EebMeldungAbgelehnt", form: "a", schema: S.EebMeldungAbgelehnt, nutzlastVersion: 1,
      entitaet: "meldung", idFeld: "meldungId", feld: fest("abgelehnt"), klasse: "LWW_FELD",
      grundPflicht: true, gegenereignis: "EebMeldungAbgelehnt" }),
  e({ typ: "EebMeldeStatusGesetzt", form: "a", schema: S.EebMeldeStatusGesetzt,
      nutzlastVersion: 1, entitaet: "meldung", idFeld: "meldungId", feld: fest("meldeStatus"),
      klasse: "LWW_FELD" }),
  e({ typ: "AnhangHinzugefuegt", form: "b", schema: S.AnhangHinzugefuegt, nutzlastVersion: 1,
      entitaet: "anhang", idFeld: "anhangId", klasse: "REGEL",
      gegenereignis: "AnhangEntfernt" }),
  e({ typ: "AnhangEntfernt", form: "a", schema: S.AnhangEntfernt, nutzlastVersion: 1,
      entitaet: "anhang", idFeld: "anhangId", feld: fest("entfernt"), festerWert: true,
      klasse: "LWW_FELD", gegenereignis: "AnhangWiederhergestellt" }),
  e({ typ: "AnhangWiederhergestellt", form: "a", schema: S.AnhangWiederhergestellt,
      nutzlastVersion: 1, entitaet: "anhang", idFeld: "anhangId", feld: fest("entfernt"),
      festerWert: false, klasse: "LWW_FELD" }),

  // §5.9 Einsatztagebuch und Korrekturen
  e({ typ: "EtbEintragErfasst", form: "b", schema: S.EtbEintragErfasst, nutzlastVersion: 1,
      entitaet: "etbEintrag", idFeld: "etbId", klasse: "ADDITIV", ohneUndo: true }),
  e({ typ: "EtbEintragBerichtigt", form: "b", schema: S.EtbEintragBerichtigt, nutzlastVersion: 1,
      entitaet: "etbEintrag", idFeld: "etbId", klasse: "ADDITIV", grundPflicht: true,
      ohneUndo: true }),
];

/**
 * `KorrekturVon` steht **nicht** in der Tabelle.
 *
 * Es wirkt wie ein Ereignis seines `zielTyp` (§5.9.2) und hat deshalb keine
 * eigene Zeile mit Form, Feldpfad und Klasse — die stehen beim Ziel. Sein
 * Schema und seine `grund`-Pflicht stehen hier, damit die Pruefung sie findet.
 */
export const KORREKTUR_VON = e({
  typ: "KorrekturVon",
  form: "a",
  schema: S.KorrekturVon,
  nutzlastVersion: 1,
  entitaet: "einsatz",
  idFeld: "korrigiertesEreignisId",
  klasse: "REGEL",
  grundPflicht: true,
  ohneUndo: true,
});

/** Der Katalog nach `typ`, wie der Fold ihn nachschlaegt. */
export const KATALOG: ReadonlyMap<string, Katalogeintrag> = new Map(
  [...KATALOG_EINTRAEGE, KORREKTUR_VON].map((eintrag) => [eintrag.typ, eintrag]),
);

/** `true`, wenn dieser Client die Art kennt (§3.7 Regel 1). */
export function istBekannterTyp(typ: string): boolean {
  return KATALOG.has(typ);
}

/** Die dreizehn Anlagearten aus §3.11 — jede legt eine Entitaet an. */
export const ANLAGEARTEN: readonly string[] = KATALOG_EINTRAEGE.filter(
  (eintrag) => eintrag.form === "b" && eintrag.entitaet !== "archivierungen",
)
  .map((eintrag) => eintrag.typ)
  .concat("EinheitAufgeteilt")
  .sort();

/** Die neun Arten mit Pflicht-`grund` (§2.4). */
export const GRUND_PFLICHT: readonly string[] = [...KATALOG_EINTRAEGE, KORREKTUR_VON]
  .filter((eintrag) => eintrag.grundPflicht === true)
  .map((eintrag) => eintrag.typ)
  .sort();
