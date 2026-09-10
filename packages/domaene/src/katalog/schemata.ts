/**
 * Die Nutzlastschemata des Ereigniskatalogs (KONZEPT-EREIGNISSE.md §5.2 bis §5.9).
 *
 * Eins zu eins aus dem Konzept uebernommen. Weicht ein Schema hier vom Konzept
 * ab, ist das ein Fehler dieses Moduls und keine Auslegung: Das Konzept ist die
 * Bauvorlage, so wie `KONZEPT-SPEICHER.md` es fuer `@s1/speicher` ist.
 */

import { z } from "zod";

import {
  eindeutig,
  gleichesTripel,
  zAbschnittstyp,
  zAnzahl,
  zAuftragQuelle,
  zDatum,
  zEbene,
  zEinsatzArt,
  zErnaehrung,
  zFahrzeugStatus,
  zGeschlecht,
  zHierarchieEbene,
  zId,
  zKontakt,
  zMeldeQuelle,
  zOrganisation,
  zPersonalErf,
  zPflichttext,
  zRolle,
  zSchicht,
  zSchichtmodell,
  zStaerke,
  zStatus,
  zText,
  zZeitpunkt,
} from "./bausteine.js";

// --- §5.2 Einsatz ----------------------------------------------------------

export const EinsatzAngelegt = z.object({
  einsatzId: zId,
  name: zPflichttext,
  art: zEinsatzArt,
  fuestName: zPflichttext,
  uebergeordneteFuestName: zText.optional(),
  ort: zText.optional(),
  beginn: zZeitpunkt,
  schichtmodell: zSchichtmodell,
  /**
   * Die Kostenparameter stehen **in der Anlage** und belegen die vier Pfade
   * `einsatz/kosten/<feld>`. Waeren sie eine Konstante im Code, haette der
   * Zustand einen Anfangswert ohne Ereignisquelle, und `vorher` der ersten
   * Aenderung passte auf nichts (§5.2).
   */
  kosten: z.object({
    psaKostenProSatz: z.number(),
    vdaProTag: z.number(),
    ukVerpflegungProTag: z.number(),
    geplanteEinsatztage: zAnzahl,
  }),
});

export const EinsatzStammdatenGeaendert = z.object({
  einsatzId: zId,
  feld: z.enum([
    "name",
    "art",
    "fuestName",
    "uebergeordneteFuestName",
    "ort",
    "beginn",
    "schichtmodell",
  ]),
});

export const KostenParameterGeaendert = z.object({
  einsatzId: zId,
  feld: z.enum(["psaKostenProSatz", "vdaProTag", "ukVerpflegungProTag", "geplanteEinsatztage"]),
});

export const EinsatzBeendet = z.object({ einsatzId: zId });
export const EinsatzWiedereroeffnet = z.object({ einsatzId: zId });

export const EinsatzArchiviert = z.object({
  einsatzId: zId,
  zeitpunkt: zZeitpunkt,
  snapshotHash: z.string().length(64),
});

/** `grund` ist Pflicht (§2.4). */
export const ArchivierungZurueckgenommen = z.object({
  einsatzId: zId,
  archivierungEreignisId: zId,
  archivierungHlc: zPflichttext,
});

// --- §5.3 Abschnitt --------------------------------------------------------

export const AbschnittAngelegt = z.object({
  abschnittId: zId,
  name: zPflichttext,
  typ: zAbschnittstyp,
  parentId: zId.optional(),
  reihenfolge: z.number().int(),
  bemerkung: zText.optional(),
});

export const AbschnittUmbenannt = z.object({ abschnittId: zId });
/** `grund` ist Pflicht (§2.4): die Aenderung wirkt auf die Zaehlregeln zurueck. */
export const AbschnittTypGeaendert = z.object({ abschnittId: zId });
export const AbschnittUmgehaengt = z.object({ abschnittId: zId });
export const AbschnittUmsortiert = z.object({ abschnittId: zId });
export const AbschnittBemerkungGesetzt = z.object({ abschnittId: zId });
export const AbschnittAufgeloest = z.object({ abschnittId: zId });
export const AbschnittWiederhergestellt = z.object({ abschnittId: zId });

// --- §5.4 Einheit ----------------------------------------------------------

/** Die vollstaendige Anlage einer Einheit — von `EinheitGemeldet` und `EinheitAufgeteilt` geteilt. */
export const zEinheitAnlage = z.object({
  abschnittId: zId,
  bezeichnung: zPflichttext,
  organisation: zOrganisation,
  organisationName: zText.optional(),
  hierarchie: z.array(zHierarchieEbene),
  standortRef: z.number().int().optional(),
  fuestKennung: zText.optional(),
  ebene: zEbene,
  staerke: zStaerke,
  personalErfassung: zPersonalErf,
  status: zStatus,
  schicht: zSchicht.optional(),
  reihenfolge: z.number().int(),
  istFuehrungDesAbschnitts: z.boolean(),
  bemerkung: zText.optional(),
  teilEtikett: zText.optional(),
  vorlageId: zId.optional(),
  meldungId: zId.optional(),
  einheitSchluessel: zText.optional(),
});

export const EinheitGemeldet = zEinheitAnlage.extend({ einheitId: zId });

export const EinheitStammdatenGeaendert = z.object({
  einheitId: zId,
  feld: z.enum([
    "bezeichnung",
    "organisation",
    "organisationName",
    "hierarchie",
    "ebene",
    "fuestKennung",
    "bemerkung",
    "teilEtikett",
    "fuehrungskraft",
    "erreichbarkeitOverride",
    "taktischesZeichen",
    "istFuehrungDesAbschnitts",
    "standortRef",
    "personalErfassung",
    "einheitSchluessel",
  ]),
});

export const StaerkeGeaendert = z.object({ einheitId: zId, meldezeit: zZeitpunkt.optional() });
export const StatusGesetzt = z.object({ einheitId: zId });
export const SchichtGesetzt = z.object({ einheitId: zId });

export const ZeitpunktGesetzt = z.object({
  einheitId: zId,
  feld: z.enum(["eingetroffenAm", "verfuegbarBis", "einsatzendeAm", "rueckfuehrungAm"]),
});

export const EinheitVerschoben = z.object({ einheitId: zId, kommentar: zText.optional() });
export const EinheitUmsortiert = z.object({ einheitId: zId });
export const EinheitArchiviert = z.object({ einheitId: zId });

export const LogistikGesetzt = z.object({
  einheitId: zId,
  feld: z.enum([
    "weiblich",
    "divers",
    "vegetarisch",
    "vegan",
    "uebernachtungM",
    "uebernachtungW",
    "uebernachtungD",
  ]),
});

export const SofortbedarfGesetzt = z.object({ einheitId: zId });
export const PsaBedarfGesetzt = z.object({ einheitId: zId });

export const EinheitAufgeteilt = z
  .object({
    quellEinheitId: zId,
    neueEinheitId: zId,
    /** Vollstaendige Anlage der abgeteilten Einheit. */
    neueEinheit: zEinheitAnlage,
    /** Was der Quelle abgezogen wird (§5.4.2). */
    abgeteilteStaerke: zStaerke,
    /** Quellstaerke, die der Bediener sah (§5.4.3). */
    gesehen: zStaerke,
    uebernommeneFahrzeuge: z.array(
      z.object({ fahrzeugId: zId, gesehenEinheitId: zId.optional() }),
    ),
    uebernommenePersonen: z.array(z.object({ personId: zId, gesehenEinheitId: zId.optional() })),
  })
  .refine(
    (n) => gleichesTripel(n.abgeteilteStaerke, n.neueEinheit.staerke),
    "abgeteilteStaerke und neueEinheit.staerke muessen gleich sein (§5.4.2)",
  )
  .refine(
    (n) => n.quellEinheitId !== n.neueEinheitId,
    "Quelle und neue Einheit muessen verschieden sein (§5.4.2a Nr. 4)",
  )
  .refine(
    (n) =>
      eindeutig(n.uebernommeneFahrzeuge.map((f) => f.fahrzeugId)) &&
      eindeutig(n.uebernommenePersonen.map((x) => x.personId)),
    "jede uebernommene Entitaet hoechstens einmal (§2.2 Form (c))",
  );

export const EinheitZusammengefuehrt = z
  .object({
    zielEinheitId: zId,
    quellen: z.array(z.object({ einheitId: zId, gesehen: zStaerke })).min(1),
  })
  .refine(
    (n) => eindeutig(n.quellen.map((q) => q.einheitId)),
    "jede Quelle hoechstens einmal (§2.2 Form (c))",
  )
  .refine(
    (n) => !n.quellen.some((q) => q.einheitId === n.zielEinheitId),
    "das Ziel darf nicht unter den Quellen stehen (§5.4.3)",
  );

/** `grund` ist Pflicht (§2.4): das Entfernen nimmt eine gemeldete Kraft aus allen Summen. */
export const EinheitEntfernt = z.object({ einheitId: zId });
export const EinheitWiederhergestellt = z.object({ einheitId: zId });

// --- §5.5 Fahrzeug und Person ---------------------------------------------

export const FahrzeugAngelegt = z.object({
  fahrzeugId: zId,
  einheitId: zId.optional(),
  abschnittId: zId.optional(),
  typ: zPflichttext,
  bezeichnung: zText.optional(),
  kennzeichen: zText.optional(),
  funkrufname: z
    .object({
      kennwort: zPflichttext,
      eigenerStandort: z.boolean(),
      ort: zText.optional(),
      teile: z.array(z.number().int()),
    })
    .optional(),
  stanKonform: z.boolean().optional(),
  aenderungen: zText.optional(),
  nutzlastText: zText.optional(),
  status: zFahrzeugStatus,
});

export const FahrzeugGeaendert = z.object({
  fahrzeugId: zId,
  feld: z.enum([
    "typ",
    "bezeichnung",
    "kennzeichen",
    "funkrufname",
    "stanKonform",
    "aenderungen",
    "nutzlastText",
    "status",
    "taktischesZeichen",
  ]),
});

export const FahrzeugVerschoben = z.object({ fahrzeugId: zId });
export const FahrzeugEinheitGewechselt = z.object({ fahrzeugId: zId });
/** `grund` ist Pflicht (§2.4). */
export const FahrzeugEntfernt = z.object({ fahrzeugId: zId });
export const FahrzeugWiederhergestellt = z.object({ fahrzeugId: zId });

export const PersonHinzugefuegt = z.object({
  personId: zId,
  einheitId: zId,
  nachname: zPflichttext,
  vorname: zPflichttext,
  rolle: zRolle,
  funktionen: z.array(zPflichttext),
  fahrerlaubnisse: z.array(zPflichttext),
  geschlecht: zGeschlecht,
  ernaehrung: zErnaehrung,
  kontakte: z.array(zKontakt),
  zusatzqualifikationen: z.array(zPflichttext),
  bemerkung: zText.optional(),
});

export const PersonGeaendert = z.object({
  personId: zId,
  feld: z.enum([
    "nachname",
    "vorname",
    "rolle",
    "funktionen",
    "fahrerlaubnisse",
    "geschlecht",
    "ernaehrung",
    "kontakte",
    "zusatzqualifikationen",
    "bemerkung",
    "einheitId",
  ]),
});

/** `grund` ist Pflicht (§2.4). */
export const PersonEntfernt = z.object({ personId: zId });
export const PersonWiederhergestellt = z.object({ personId: zId });

// --- §5.6 Auftrag und Anforderung -----------------------------------------

export const AuftragErfasst = z.object({
  auftragId: zId,
  einheitId: zId,
  von: zZeitpunkt,
  bis: zZeitpunkt.optional(),
  abschnittId: zId.optional(),
  text: zPflichttext,
  quelle: zAuftragQuelle,
});

export const AuftragBeendet = z.object({ auftragId: zId });
export const AuftragZurueckgenommen = z.object({ auftragId: zId });

export const AnforderungAngelegt = z.object({
  anforderungId: zId,
  kennung: zText.optional(),
  abzuloesendeEinheitId: zId.optional(),
  vorgeseheneEinheitText: zText.optional(),
  vorgesehenerAuftrag: zText.optional(),
  angefordertAm: zZeitpunkt,
  bemerkung: zText.optional(),
});

export const AnforderungGeaendert = z.object({
  anforderungId: zId,
  feld: z.enum([
    "kennung",
    "abzuloesendeEinheitId",
    "vorgeseheneEinheitText",
    "vorgesehenerAuftrag",
    "bemerkung",
    "angefordertAm",
  ]),
});

export const AbloesungZugesagt = z.object({ anforderungId: zId });
export const ZusageZurueckgenommen = z.object({ anforderungId: zId });
export const AnforderungErledigt = z.object({ anforderungId: zId });
export const ErledigungZurueckgenommen = z.object({ anforderungId: zId });
/** `grund` ist Pflicht (§2.4): der Vorgang wird gegenueber einer fremden Stelle beendet. */
export const AnforderungStorniert = z.object({ anforderungId: zId });
export const StornoZurueckgenommen = z.object({ anforderungId: zId });

// --- §5.7 Dienstposten und Schichtplan ------------------------------------

export const DienstpostenAngelegt = z.object({
  dienstpostenId: zId,
  teileinheit: zPflichttext,
  funktion: zPflichttext,
  schicht: zSchicht,
  reihenfolge: z.number().int(),
});

export const DienstpostenGeaendert = z.object({
  dienstpostenId: zId,
  feld: z.enum(["teileinheit", "funktion", "schicht", "reihenfolge"]),
});

export const DienstpostenBesetzt = z.object({ dienstpostenId: zId });
export const DienstpostenEntfernt = z.object({ dienstpostenId: zId });
export const DienstpostenWiederhergestellt = z.object({ dienstpostenId: zId });
export const SchichtplanEintragGesetzt = z.object({ dienstpostenId: zId, datum: zDatum });

// --- §5.8 EEB-Meldungen und Anhaenge --------------------------------------

export const EebMeldungEmpfangen = z.object({
  meldungId: zId,
  einheitSchluessel: zPflichttext,
  stand: zZeitpunkt,
  empfangenAm: zZeitpunkt,
  quelle: zMeldeQuelle,
  signatur: z
    .object({
      zustand: z.enum(["GUELTIG", "UNGUELTIG"]),
      pubkey: zText.optional(),
      kurzform: zText.optional(),
      absender: z
        .object({
          name: zText.optional(),
          email: zText.optional(),
          telefon: zText.optional(),
        })
        .optional(),
    })
    .optional(),
  rohPayload: zText.optional(),
  bogen: z.unknown(),
});

export const EebMeldungZugeordnet = z.object({ meldungId: zId });

export const EebMeldungUebernommen = z.object({
  meldungId: zId,
  einheitId: zId,
  uebernommeneFelder: z.array(zPflichttext),
});

export const EebMeldungUebernahmeZurueckgenommen = z.object({ meldungId: zId });
/** `grund` ist Pflicht (§2.4) — ausser bei `neu = false`, der Ruecknahme der Ablehnung. */
export const EebMeldungAbgelehnt = z.object({ meldungId: zId });
export const EebMeldeStatusGesetzt = z.object({ meldungId: zId });

/** Die Anhang-Id ist der Inhaltsschluessel: ein Hash fester Laenge (§3.6). */
const zAnhangId = z.string().length(64);

export const AnhangHinzugefuegt = z.object({
  anhangId: zAnhangId,
  einheitId: zId.optional(),
  dateiname: zPflichttext,
  mimeTyp: zPflichttext,
  groesse: zAnzahl,
  hinzugefuegtAm: zZeitpunkt,
});

export const AnhangEntfernt = z.object({ anhangId: zAnhangId });
export const AnhangWiederhergestellt = z.object({ anhangId: zAnhangId });

// --- §5.9 Einsatztagebuch und Korrekturen ---------------------------------

export const EtbEintragErfasst = z.object({
  etbId: zId,
  zeitpunkt: zZeitpunkt,
  text: zPflichttext,
  bezug: z
    .object({
      entitaet: z.enum(["EINHEIT", "ABSCHNITT", "FAHRZEUG", "ANFORDERUNG"]),
      id: zId,
    })
    .optional(),
});

/** `grund` ist Pflicht (§2.4). */
export const EtbEintragBerichtigt = z.object({
  etbId: zId,
  berichtigtEintragId: zId,
  zeitpunkt: zZeitpunkt,
  text: zPflichttext,
});

/**
 * Die Berichtigung eines fachlich falschen Ereignisses (§5.9.2).
 *
 * `grund` ist Pflicht, und zwar am eigenen Rahmenfeld `typ`, nicht am
 * `zielTyp` (§2.4). Fuer Anlagearten ist `KorrekturVon` verboten.
 */
export const KorrekturVon = z.object({
  korrigiertesEreignisId: zId,
  zielTyp: zPflichttext,
  zielNutzlast: z.unknown(),
});
