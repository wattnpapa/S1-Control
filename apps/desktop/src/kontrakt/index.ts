/**
 * Der IPC-Kontrakt der Schale (M2.1).
 *
 * Er liegt zwischen Main, Preload, Worker und Renderer und ist deshalb die
 * einzige Datei der Schale, die **alle vier** anfassen. Entsprechend eng ist
 * sie gehalten: kein `node:`, kein DOM, kein Electron — nur zod und Typen aus
 * `@s1/domaene`.
 *
 * **Warum ueberhaupt geprueft wird.** 02-ZIELBILD.md gibt dem Renderer weder
 * Node noch Electron; die Bruecke ist die einzige Naht. Eine Naht, die
 * ungeprueftes JSON durchreicht, ist keine Naht, sondern ein Loch: Ein
 * Renderer, den ein fremdes Skript erreicht, koennte dem Worker sonst
 * beliebige Botschaften schicken. Jede Anfrage wird deshalb **im Main** gegen
 * ihr Schema geprueft, bevor sie den Worker erreicht, und nicht erst dort.
 *
 * Zwei Kanaele, mehr nicht:
 *
 *  * {@link KANAL_RUF} — Renderer fragt, Main antwortet (`invoke`).
 *  * {@link KANAL_MITTEILUNG} — Main schiebt, Renderer hoert zu (`send`).
 *
 * Die Trennung ist nicht Geschmack: Ein Ruf hat eine Antwort und einen
 * Aufrufer, eine Mitteilung hat weder das eine noch das andere. Beides ueber
 * denselben Kanal zu fuehren hiesse, im Renderer Antworten von Ereignissen zu
 * unterscheiden — genau die Buchfuehrung, die `invoke` einem abnimmt.
 */

import { z } from "zod";

export const KANAL_RUF = "s1:ruf";
export const KANAL_MITTEILUNG = "s1:mitteilung";

/** Der Name, unter dem die Bruecke im Renderer steht. */
export const BRUECKE = "s1";

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

const zText = z.string().min(1);
const zStaerke = z.object({
  fuehrer: z.number().int().min(0),
  unterfuehrer: z.number().int().min(0),
  mannschaft: z.number().int().min(0),
});

/**
 * Die Kennung einer **geoeffneten** Akte innerhalb dieses Prozesses.
 *
 * Sie ist nicht die `einsatzId`: Dieselbe Akte laesst sich nicht zweimal
 * oeffnen, aber der Renderer soll seine Fenster auch dann auseinanderhalten,
 * wenn zwei Einsaetze offen sind. Der Main vergibt sie, der Renderer gibt sie
 * zurueck.
 */
export const zAkteId = z.string().regex(/^akte-\d+$/);

export const zEinstellungen = z.object({
  /** Wurzel des Shares, unterhalb derer `einsaetze/` liegt. */
  sharePfad: z.string(),
  /** Was die anderen Arbeitsplaetze in der Praesenz sehen (§6.4). */
  anzeigename: z.string(),
});
export type Einstellungen = z.infer<typeof zEinstellungen>;

export const zUmgebung = z.object({
  plattform: z.string(),
  electron: z.string(),
  programmversion: z.string(),
  rechnername: z.string(),
  /** Die Kennung dieses Arbeitsplatzes (§4.1) — sie steht in jeder HLC. */
  clientId: z.string(),
});
export type Umgebung = z.infer<typeof zUmgebung>;

export const zEinsatzEintrag = z.object({
  ordner: zText,
  name: z.string(),
  datum: z.string(),
});
export type EinsatzEintrag = z.infer<typeof zEinsatzEintrag>;

export const zPeer = z.object({
  clientId: z.string(),
  anzeigename: z.string(),
  rechnername: z.string(),
  /** §6.4: ab 60 Sekunden ohne Fortschreibung gilt ein Arbeitsplatz als veraltet. */
  veraltet: z.boolean(),
  wanduhr: z.string(),
});
export type Peer = z.infer<typeof zPeer>;

/**
 * Das Lagebild — die Projektion, die der Worker an den Renderer schiebt.
 *
 * Sie ist **flach** gehalten, und das ist der Grund, aus dem der Delta-Weg
 * unten ueberhaupt funktioniert: Verglichen wird je oberstem Schluessel. Eine
 * verschachtelte Projektion haette entweder feinere Deltas gebraucht oder bei
 * jeder Aenderung alles geschickt.
 *
 * **Zwei Werte sind Lebenszeichen und aendern sich in jedem Takt:**
 * `letzterShareKontakt` und die `wanduhr` je Peer. Sie kosten je Akte eine
 * kleine Mitteilung je Sekunde, auch wenn fachlich nichts geschieht — und
 * genau das ist ihr Zweck: Eine Statuszeile, die „Share erreichbar" zeigt,
 * ohne zu sagen, wann das zuletzt zutraf, ist keine Auskunft, sondern ein
 * Standbild. Alles Fachliche schweigt dagegen, solange sich nichts aendert.
 *
 * Was hier **nicht** steht, ist der volle Zustand. M2 zeigt eine Statuszeile,
 * kein Lagebild im fachlichen Sinn; die Tabellen kommen mit M3, und sie
 * bekommen dann ihren eigenen Ruf statt eines aufgeblaehten Dauerstroms.
 */
export const zLagebild = z.object({
  einsatzId: z.string(),
  einsatzName: z.string(),
  einsatzArt: z.string(),
  /** Hoechste gesehene HLC in Textform fester Stellenzahl (§3.2). */
  standHlc: z.string(),
  /** Wanduhr des zuletzt eingetroffenen Ereignisses — Anzeige, nie Ordnung (§2.6). */
  standWanduhr: z.string(),
  /** Wann dieser Arbeitsplatz zuletzt erfolgreich auf den Share gesehen hat. */
  letzterShareKontakt: z.string(),
  shareErreichbar: z.boolean(),
  shareMeldung: z.string().optional(),
  peers: z.array(zPeer).readonly(),
  /** §5.3: eigene Bytes, die noch nicht auf dem Share liegen. */
  unuebertrageneBytes: z.number().int().min(0),
  /** §8.2, endgueltige Stellen. Nicht leer heisst: dieser Platz ist im Vergleich aussen vor. */
  quarantaene: z.array(z.string()).readonly(),
  abschnitte: z.number().int().min(0),
  einheiten: z.number().int().min(0),
  gesamtstaerke: zStaerke,
  staerkeJeStatus: z.record(z.string(), z.number().int()),
  hinweise: z.number().int().min(0),
  unbekannteEreignisse: z.number().int().min(0),
  /** Wie viele Schritte „rueckgaengig" noch gehen (§6 U3). */
  undoTiefe: z.number().int().min(0),
  undoObersteArt: z.string().optional(),
});
export type Lagebild = z.infer<typeof zLagebild>;

/** Ein Ereignisentwurf, wie der Renderer ihn schickt (KONZEPT-SPEICHER.md §2.4). */
export const zEntwurf = z.object({
  typ: zText,
  nutzlast: z.unknown().optional(),
  vorher: z.unknown().optional(),
  neu: z.unknown().optional(),
  grund: z.string().optional(),
  korrekturVon: z.string().optional(),
  schemaVersion: z.number().int().min(1).optional(),
});
export type Entwurf = z.infer<typeof zEntwurf>;

// ---------------------------------------------------------------------------
// Rufe
// ---------------------------------------------------------------------------

export const zRuf = z.discriminatedUnion("art", [
  z.object({ art: z.literal("umgebung") }),
  z.object({ art: z.literal("einstellungenLesen") }),
  z.object({ art: z.literal("einstellungenSetzen"), einstellungen: zEinstellungen }),
  z.object({ art: z.literal("einsaetzeAuflisten") }),
  z.object({
    art: z.literal("einsatzAnlegen"),
    name: zText,
    datum: z.string(),
    einsatzArt: zText,
    fuestName: zText,
    beginn: z.string(),
    schichtmodell: zText,
  }),
  z.object({ art: z.literal("einsatzOeffnen"), ordner: zText }),
  z.object({ art: z.literal("einsatzSchliessen"), akteId: zAkteId }),
  z.object({ art: z.literal("standAnfordern"), akteId: zAkteId }),
  z.object({ art: z.literal("bedienen"), akteId: zAkteId, entwurf: zEntwurf }),
  z.object({ art: z.literal("zurueck"), akteId: zAkteId, grund: z.string().optional() }),
  z.object({ art: z.literal("undoStapel"), akteId: zAkteId }),
]);
export type Ruf = z.infer<typeof zRuf>;

/**
 * Der Ausgang eines Bedienschritts.
 *
 * `abgewiesen` ist keine Ausnahme, sondern ein regulaerer Ausgang: §8.8 Punkt 1
 * verlangt, dass ein gescheiterter Bedienschritt **sichtbar** abgewiesen wird
 * und der Wert nicht in den Zustand kommt. Ihn als geworfenen Fehler zu fuehren
 * hiesse, ihn im Renderer irgendwo abfangen zu muessen, wo er nicht hingehoert.
 */
export const zBedienergebnis = z.discriminatedUnion("art", [
  z.object({ art: z.literal("geschrieben"), ereignisId: z.string() }),
  z.object({
    art: z.literal("abgewiesen"),
    meldung: z.string(),
    code: z.string().optional(),
    dauerhafterHinweis: z.boolean(),
  }),
  z.object({ art: z.literal("uhrSteht"), meldung: z.string() }),
  /** §6 U2: die strukturellen Arten brauchen die Maske ihres Fachvorgangs. */
  z.object({ art: z.literal("strukturell"), inverseArt: z.string(), meldung: z.string() }),
  /** §2.4: die Zielart verlangt einen `grund`; der Renderer fragt nach und ruft erneut. */
  z.object({ art: z.literal("brauchtGrund"), zielArt: z.string() }),
  z.object({ art: z.literal("nichtMoeglich"), meldung: z.string() }),
]);
export type Bedienergebnis = z.infer<typeof zBedienergebnis>;

export const zStapelEintrag = z.object({
  id: z.string(),
  typ: z.string(),
  wanduhr: z.string(),
});

/**
 * Die Antwort auf einen Ruf.
 *
 * Ein Fehler kommt als `{ ok: false }` zurueck und nicht als geworfene
 * Ausnahme: Ueber `ipcRenderer.invoke` wuerde eine Ausnahme im Main als
 * Zeichenkette mit angehaengtem Stapelabzug im Renderer landen — eine
 * Auskunft ueber den Aufbau der Schale, die dort niemanden angeht.
 */
export type Antwort<T> = { readonly ok: true; readonly wert: T } | { readonly ok: false; readonly meldung: string; readonly code?: string };

/** Die Antwortform je Ruf-Art — die Tabelle, an der Main und Renderer haengen. */
export interface Antworten {
  umgebung: Umgebung;
  einstellungenLesen: Einstellungen;
  einstellungenSetzen: Einstellungen;
  einsaetzeAuflisten: readonly EinsatzEintrag[];
  einsatzAnlegen: { readonly akteId: string; readonly einsatzId: string; readonly ordner: string };
  einsatzOeffnen: { readonly akteId: string; readonly einsatzId: string; readonly ordner: string };
  einsatzSchliessen: null;
  standAnfordern: null;
  bedienen: Bedienergebnis;
  zurueck: Bedienergebnis;
  undoStapel: readonly z.infer<typeof zStapelEintrag>[];
}

// ---------------------------------------------------------------------------
// Mitteilungen
// ---------------------------------------------------------------------------

/**
 * Ein Delta auf dem Lagebild.
 *
 * `folge` zaehlt je Akte lueckenlos hoch. Der Renderer prueft die Folge und
 * fordert bei einer Luecke mit `standAnfordern` den vollen Stand an, statt
 * still auf einem halben Bild sitzen zu bleiben. Eine Luecke ist im Betrieb
 * moeglich: Ein Fenster, das waehrend eines Deltas neu laedt, hat die
 * vorherige Mitteilung nie gesehen.
 */
export const zStandMitteilung = z.object({
  art: z.literal("stand"),
  akteId: zAkteId,
  folge: z.number().int().min(0),
  /** Bei `folge === 0` und nach `standAnfordern` das ganze Bild. */
  voll: zLagebild.optional(),
  /** Sonst nur die geaenderten obersten Schluessel. */
  geaendert: zLagebild.partial().optional(),
});

export const zMitteilung = z.discriminatedUnion("art", [
  zStandMitteilung,
  z.object({
    art: z.literal("hinweis"),
    akteId: zAkteId.optional(),
    stufe: z.enum(["info", "warnung", "fehler"]),
    text: z.string(),
  }),
  /** Die Akte hat sich geschlossen — Ordner fort (§5.7) oder Bediener. */
  z.object({ art: z.literal("akteGeschlossen"), akteId: zAkteId, meldung: z.string() }),
]);
export type Mitteilung = z.infer<typeof zMitteilung>;
export type StandMitteilung = z.infer<typeof zStandMitteilung>;

// ---------------------------------------------------------------------------
// Der Delta-Weg
// ---------------------------------------------------------------------------

/** Die obersten Schluessel des Lagebilds — Grundlage des Vergleichs. */
export const LAGEBILD_SCHLUESSEL = Object.keys(zLagebild.shape) as readonly (keyof Lagebild)[];

/**
 * Was sich zwischen zwei Lagebildern geaendert hat.
 *
 * Verglichen wird ueber `JSON.stringify` je oberstem Schluessel. Das ist hier
 * zulaessig und nicht die kanonische Serialisierung aus §7.6: Beide Seiten
 * entstehen aus **derselben** Projektionsfunktion, also in derselben
 * Schluesselreihenfolge. Fuer den Zustandshash waere das zu wenig; fuer die
 * Frage „hat sich die Statuszeile geaendert" ist es genau richtig und um
 * Groessenordnungen billiger.
 */
export function lagebildDelta(vorher: Lagebild, nachher: Lagebild): Partial<Lagebild> {
  const delta: Record<string, unknown> = {};
  for (const schluessel of LAGEBILD_SCHLUESSEL) {
    if (JSON.stringify(vorher[schluessel]) !== JSON.stringify(nachher[schluessel])) {
      delta[schluessel] = nachher[schluessel];
    }
  }
  return delta as Partial<Lagebild>;
}

/** Traegt ein Delta auf ein Lagebild auf — die Gegenrichtung, im Renderer. */
export function lagebildMit(bisher: Lagebild, delta: Partial<Lagebild>): Lagebild {
  return { ...bisher, ...delta };
}
