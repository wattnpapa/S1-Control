/**
 * Die Nutzlasten des Nachrichtenvordrucks (KONZEPT-NACHRICHTEN.md §9) —
 * additiv zum Katalog wie `schemata-funk.ts`; `schemata.ts` reicht sie weiter.
 *
 * Eine Nachricht wird einmal angelegt (`NachrichtVerfasst`, Form b) und danach
 * je Vermerk des Vordrucks fortgeschrieben (Form a). Die Werte der Vermerke
 * stehen nach §2.2 im Rahmen (`neu`); die Schemata der Werte stehen trotzdem
 * hier, damit Maske und Worker sie vor dem Schreiben prüfen können. Der Fold
 * prüft `neu` nicht — wie bei jeder Art der Form (a).
 */

import { z } from "zod";

import { NACHRICHT_RICHTUNGEN } from "../ereignis.js";
import { zId, zPflichttext, zText, zZeitpunkt } from "./bausteine.js";

/** Art, Vorrang und Mittel sind offene Bereiche (§3.7 Punkt 5), bekannte Werte in `ereignis.ts`. */
export const zNachrichtenart = zPflichttext;
export const zVorrang = zPflichttext;
export const zMittel = zPflichttext;
export const zKopie = zPflichttext;

/**
 * Eine Stelle des Verteilers: offen, aber ohne Schrägstrich. Sie wird Teil
 * eines Feldpfads (`kenntnis/<stelle>`), und ein Schrägstrich darin legte das
 * Feld eine Ebene tiefer, wo es keine Projektion mehr fände.
 */
export const zStelle = zPflichttext.max(80).regex(/^[^/]+$/);

/** Das Handzeichen des Vordrucks (Feld 2 bis 4, 17, 18): kurz, aber nicht erzwungen. */
export const zHandzeichen = zText.max(20);

/** Bezug von Anschrift oder Absender auf eine Entität des Einsatzes (wie beim ETB-Eintrag). */
export const zNachrichtenbezug = z.object({
  entitaet: z.enum(["EINHEIT", "ABSCHNITT", "FAHRZEUG", "ANFORDERUNG", "STELLE"]),
  id: zId,
});

/** Aufnahme- und Beförderungsvermerk: Mittel, Zeit, Handzeichen (Feld 1, 2, 4). */
export const zMittelvermerk = z.object({ mittel: zMittel, zeitpunkt: zZeitpunkt, handzeichen: zHandzeichen });

/**
 * Der Übermittlungsvorschlag des LdF: auf welchem Weg, an welche Gegenstelle
 * und durch welchen Fernmelder eine Nachricht übertragen werden soll. Zeit und
 * Handzeichen sind die des LdF; die Beförderung bleibt Sache des Fernmelders.
 */
export const zVorschlag = z.object({
  mittel: zMittel,
  fernmelder: zText,
  gegenstelle: zText.optional(),
  zeitpunkt: zZeitpunkt,
  handzeichen: zHandzeichen,
});

/** Annahmevermerk (Feld 3) und Kenntnisnahme je Stelle: Zeit und Handzeichen. */
export const zZeitvermerk = z.object({ zeitpunkt: zZeitpunkt, handzeichen: zHandzeichen });

/**
 * Die Nachweisung (Feld 5): die laufende Nummer, gemeinsam für Eingang und
 * Ausgang (Entscheidung 1). Die Nummer ist Nutzlast und keine Projektion —
 * eine Nummer, die auf Papier steht, darf sich nicht ändern (§9).
 */
export const zNachweis = z.object({
  nummer: z.number().int().positive(),
  zeitpunkt: zZeitpunkt,
  handzeichen: zHandzeichen,
});

/** Ein Eintrag des Verteilers (Feld 19) mit Kopiefarbe. */
export const zVerteilereintrag = z.object({ stelle: zStelle, kopie: zKopie });

/** Die Sichtung (Feld 18 bis 20) — ein Wert, weil sie auf Papier ein Laufzettel ist. */
export const zSichtung = z.object({
  zeitpunkt: zZeitpunkt,
  handzeichen: zHandzeichen,
  verteiler: z.array(zVerteilereintrag),
  vermerke: zText.optional(),
});

/** Die Weitergabe eines Eingangs vom LdF an den Sichter: Zeit und Handzeichen. */
export const zWeitergabe = zZeitvermerk;

/**
 * Die Anlage einer Nachricht (Form b, ohne Undo wie `EtbEintragErfasst`: Ein
 * aufgegebener Vordruck wird nicht ungeschrieben, sondern zurückgezogen).
 *
 * Anschrift, Absender, Betreff und Inhalt sind Pflichtschlüssel, dürfen aber
 * leer sein: Ein nacherfasster Papiervordruck trägt, was auf dem Blatt steht.
 * Der Aufnahmevermerk und die Gegenstelle gehören zum Eingang über die FmZ.
 */
export const NachrichtVerfasst = z.object({
  nachrichtId: zId,
  richtung: z.enum(NACHRICHT_RICHTUNGEN),
  art: zNachrichtenart.optional(),
  vorrang: zVorrang.optional(),
  gespraechsnotiz: z.boolean().optional(),
  uebermittlungswunsch: zMittel.optional(),
  anschrift: zText,
  rufnummer: zText.optional(),
  betreff: zText,
  inhalt: zText,
  absender: zText,
  anschriftBezug: zNachrichtenbezug.optional(),
  absenderBezug: zNachrichtenbezug.optional(),
  abfassungszeit: zZeitpunkt.optional(),
  zeichen: zText.optional(),
  funktion: zText.optional(),
  gegenstelle: zText.optional(),
  aufnahme: zMittelvermerk.optional(),
  antwortAuf: zId.optional(),
  weitergeleitetVon: zId.optional(),
  /**
   * Additiv (R2-ETB P1-1): die Stelle der Sitzung, die schreibt — bei der
   * Aufnahme die FmZ, nicht die `funktion` des Absenders draußen. Der Worker
   * setzt sie, damit das Tagebuch sie nach dem Einsatz nicht aus der Präsenz
   * rekonstruieren muss (die Präsenz ist dann leer).
   */
  stelle: zStelle.optional(),
});

/**
 * Additiv (R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8): Ein Folgeschritt, den der
 * Worker zu einem Bedienschritt schreibt (Annahme, Nummer, Sichtung, Kopien,
 * Ersatzvorschlag, Weitergabe), trägt die Ereignis-Id des Hauptschritts.
 * „Rückgängig“ nimmt die Gruppe als einen Schritt zurück (`undogruppe.ts`).
 * Der Fold liest das Feld nicht; die Kompensation trägt es nicht.
 */
export const zFolgeVon = zId.optional();

/**
 * Die Vermerke der FmZ und des Sichters: je ein Strukturfeld, Wert in `neu`.
 * Additiv (R2-ETB P1-1, R2-LdF P3-2): `stelle` — die Stelle der Sitzung, die
 * den Vermerk schreibt (FmZ für die Kopien nach der Beförderung, nicht
 * „Sichter“). Sie wählt keinen Feldpfad; der Fold liest sie nicht.
 */
export const NachrichtAngenommen = z.object({ nachrichtId: zId, stelle: zStelle.optional(), folgeVon: zFolgeVon });
/**
 * Additiv (R2-LdF P2-1, P2-2): Der Worker hält beim Befördern fest, ob der LdF
 * als Station besetzt war und noch keinen Weg vorgeschlagen hatte
 * (`ohneVorschlag`), und ob das Mittel vom Vorschlag abweicht
 * (`abweichungVomVorschlag`, „Funk → Telefon“). Beides steht im Tagebuch so,
 * wie es zur Zeit der Beförderung galt.
 */
export const NachrichtBefoerdert = z.object({
  nachrichtId: zId,
  stelle: zStelle.optional(),
  folgeVon: zFolgeVon,
  ohneVorschlag: z.boolean().optional(),
  abweichungVomVorschlag: zText.optional(),
});
export const NachrichtUebermittlungVorgeschlagen = z.object({ nachrichtId: zId, stelle: zStelle.optional(), folgeVon: zFolgeVon });
export const NachrichtNachgewiesen = z.object({ nachrichtId: zId, stelle: zStelle.optional(), folgeVon: zFolgeVon });
export const NachrichtGesichtet = z.object({ nachrichtId: zId, stelle: zStelle.optional(), folgeVon: zFolgeVon });
/**
 * Der Eingangsschritt des LdF (additiv, 2026-11-17): Weitergabe an den
 * Sichter — ein Strukturfeld. Den Ausgangsschritt führt
 * `NachrichtUebermittlungVorgeschlagen`.
 */
export const NachrichtWeitergegeben = z.object({ nachrichtId: zId, stelle: zStelle.optional(), folgeVon: zFolgeVon });
/** Vermerke nach der Sichtung ohne Neusichtung (Feld 20), Text in `neu`. */
export const NachrichtVermerkt = z.object({ nachrichtId: zId, stelle: zStelle.optional() });

/**
 * Additiv (FM P2-7, Runde 1): „Aufnahme berichtigen“ — Mittel, Zeit und
 * Handzeichen der Aufnahme (Feld 1, 2, 6) eines Eingangs, Wert in `neu` wie
 * die übrigen Vermerke (Form a auf `aufnahme`, LWW). Ein Zahlendreher in der
 * Aufnahmezeit oder das falsche Mittel ließen sich bisher nur durch
 * Zurückziehen und Neuaufnehmen beheben; `grund` ist Pflicht, weil der
 * Vermerk auf Papier schon stehen kann.
 */
export const NachrichtAufnahmeBerichtigt = z.object({ nachrichtId: zId, stelle: zStelle.optional() });

/**
 * Die Stelle wählt den Feldpfad `kenntnis/<stelle>` bzw. `erledigt/<stelle>`.
 * Additiv (ETB P1-7, Runde 1): Erledigung und ihre Rücknahme tragen das
 * Handzeichen der Sitzung — das Tagebuch nannte sonst nur den Arbeitsplatz.
 */
export const NachrichtKenntnisGenommen = z.object({ nachrichtId: zId, stelle: zStelle });
export const NachrichtErledigt = z.object({ nachrichtId: zId, stelle: zStelle, handzeichen: zHandzeichen.optional() });
export const ErledigungDerNachrichtZurueckgenommen = z.object({ nachrichtId: zId, stelle: zStelle, handzeichen: zHandzeichen.optional() });

/**
 * Rücknahme einer Fehlanlage; `grund` ist Pflicht, die Nachricht bleibt sichtbar.
 * Additiv (ETB P1-7): das Handzeichen der Sitzung neben der Stelle.
 */
export const NachrichtZurueckgezogen = z.object({ nachrichtId: zId, stelle: zStelle.optional(), handzeichen: zHandzeichen.optional() });

/**
 * Die Parameter des Einsatzes für den Nachrichtenweg, Wert in `neu`:
 * `sichtungAuchAusgang` (Entscheidung 8, Vorbelegung nein) und
 * `fmzSchwelleMinuten` (§5, Vorbelegung 20) und — additiv — `ldfStation`
 * (der LdF ist eigene Station im Laufweg, Vorbelegung nein). Ein eigenes
 * Ereignis nach dem Muster von `FunkParameterGesetzt`, weil alle drei keine
 * Stammdaten sind. Ein älterer Client, der `ldfStation` nicht kennt, faltet
 * das Ereignis nach §3.7 als unbekannt und behält den Laufweg ohne LdF.
 */
export const NachrichtenParameterGesetzt = z.object({
  einsatzId: zId,
  // Additiv (R2-FM P2-5, R2-Si P2-2): die Schwelle vor dem Sichter je Vorrang (Vorbelegung 5 und 10 Minuten).
  feld: z.enum(["sichtungAuchAusgang", "fmzSchwelleMinuten", "ldfStation", "sichterSchwelleBlitzMinuten", "sichterSchwelleSofortMinuten"]),
});
