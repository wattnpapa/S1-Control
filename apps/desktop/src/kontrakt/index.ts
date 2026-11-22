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

import { NACHRICHTEN_SICHTEN_LISTE } from "./nachrichtenwerte.js";
import type {
  Anforderungsausschnitt,
  Auswahlwert,
  Baumknoten,
  Funkplan,
  Funkprobenzeile,
  Kostenblatt,
  Fassungsvergleich,
  Logistikblatt,
  Meldungsausschnitt,
  Nachrichtenausschnitt,
  Nachrichtenzeile,
  Schichtplanblatt,
  Staerketafel,
  Stabsuebersicht,
  Tabellenausschnitt,
  Tagebuchzeile,
  Teilbereichsblock,
  Untertabelle,
  Versorgungsblatt,
} from "@s1/domaene";

export { BRUECKE, KANAL_MITTEILUNG, KANAL_RUF } from "./kanaele.js";

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

export const THEMEN = ["standard", "dunkel", "feld", "nacht"] as const;
export const zTheme = z.enum(THEMEN);
export type Theme = z.infer<typeof zTheme>;

/**
 * Die Profile des Arbeitsplatzes (Entwurf „Entlastung", 3.2): welche Reiter
 * im Kopfband stehen und welche unter „Mehr". Ein Zuschnitt der Oberfläche,
 * kein Recht — wie die Betriebsart. Nur anhängen: Der Wert steht als Name in
 * den Einstellungen des Geräts.
 */
export const PROFILE = ["fuehrungsstelle", "fernmeldezentrale", "versorgung", "alle", "leitung"] as const;
export const zProfil = z.enum(PROFILE);
export type Profil = z.infer<typeof zProfil>;

/**
 * Die Ansichten des Monitors, nach Sachgebiet in der Ordnung des Stabes:
 * Führung, S1, S3, S4, S6, zuletzt die FmZ. Die Tasten 1 bis 9 und 0 wählen
 * die ersten zehn, Pfeil links/rechts blättert durch alle. Die gemerkte
 * Wahl eines Geräts steht als Name in den Einstellungen und übersteht
 * deshalb ein Umsortieren; eine neue Ansicht kommt ans Ende ihrer Gruppe.
 */
export const MONITOR_ANSICHTEN = [
  "offen",
  "staerke",
  "status",
  "abschnitte",
  "organisationen",
  "kreuz",
  "kommen",
  "einsatzmittel",
  "verpflegung",
  "vorausschau",
  "unterbringung",
  "tafel",
  "iuk",
  "funkplan",
  "nachrichtenweg",
] as const;
export const zMonitorAnsicht = z.enum(MONITOR_ANSICHTEN);
export type MonitorAnsicht = z.infer<typeof zMonitorAnsicht>;

/** Die Sachgebiete, nach denen der Monitor seine Ansichten gruppiert. */
export const MONITOR_GRUPPEN = ["fuehrung", "s1", "s3", "s4", "s6", "fmz"] as const;
export const zMonitorGruppe = z.enum(MONITOR_GRUPPEN);
export type MonitorGruppe = z.infer<typeof zMonitorGruppe>;

/** Welche Ansicht zu welchem Sachgebiet gehört; die Reihenfolge gibt `MONITOR_ANSICHTEN`. */
export const MONITOR_GRUPPE_DER_ANSICHT: Readonly<Record<MonitorAnsicht, MonitorGruppe>> = {
  offen: "fuehrung",
  staerke: "s1",
  abschnitte: "s1",
  organisationen: "s1",
  kreuz: "s1",
  status: "s1",
  kommen: "s1",
  einsatzmittel: "s3",
  verpflegung: "s4",
  vorausschau: "s4",
  unterbringung: "s4",
  tafel: "s4",
  iuk: "s6",
  funkplan: "fmz",
  nachrichtenweg: "fmz",
};

/**
 * Das Ziel des Automatikdrucks (KONZEPT-NACHRICHTEN.md Entscheidung 7): ein
 * festes Verzeichnis, in das die PDFs fallen, oder ein fest eingestellter
 * Drucker (nur Desktop-Schale). Großzügig geprüft: Ein zu langer Pfad soll
 * nicht die ganzen Einstellungen kosten.
 */
export const zAutomatikdruckziel = z.discriminatedUnion("ziel", [
  z.object({ ziel: z.literal("verzeichnis"), pfad: z.string().max(2000) }),
  z.object({ ziel: z.literal("drucker"), name: z.string().max(500) }),
]);
export type Automatikdruckziel = z.infer<typeof zAutomatikdruckziel>;

/** Das Blatt des Vordrucks je Nachricht (§7): A5 hoch oder zwei auf A4 quer. */
export const zVordruckBlatt = z.enum(["a5", "a4quer"]);
export type VordruckBlatt = z.infer<typeof zVordruckBlatt>;

export const zEinstellungen = z.object({
  /** Wurzel des Shares, unterhalb derer `einsaetze/` liegt. */
  sharePfad: z.string(),
  /** Was die anderen Arbeitsplaetze in der Praesenz sehen (§6.4). */
  anzeigename: z.string(),
  /**
   * Die Betriebsart dieses Arbeitsplatzes (M6.4).
   *
   * **`meldekopf` ist keine Rolle und kein Recht**, sondern ein Zuschnitt der
   * Oberflaeche: Ein Meldekopf nimmt Boegen auf und quittiert sie; er fuehrt
   * kein Lagebild. Wer an diesem Rechner sitzt, koennte alles andere auch —
   * die Akte ist dieselbe, die Ereignisse sind dieselben, und es gibt keinen
   * Server, der etwas verweigern koennte (02-ZIELBILD.md, „kein
   * Serverprozess"). Ein Rechtesystem vorzutaeuschen, das keines ist, waere
   * die schlechtere Loesung: Es hielte niemanden auf und liesse alle glauben,
   * es taete es.
   *
   * Ohne Angabe `fuehrungsstelle` — der Arbeitsplatz, den es bisher gab.
   */
  betriebsart: z.enum(["fuehrungsstelle", "meldekopf"]).optional(),
  /**
   * Das Erscheinungsbild dieses Geraets (Entwurf „Oberflaeche").
   *
   * Es steht in den Einstellungen des **Geraets** und nicht in der Akte: Der
   * Arbeitsplatz im Zelt steht anders als der im Fahrzeug, und beide fuehren
   * denselben Einsatz. „feld" traegt 2-px-Raender und groessere Schrift fuer
   * Handschuhe und Sonne, „nacht" Bernstein auf Schwarz.
   *
   * Ohne Angabe `standard`.
   */
  theme: zTheme.optional(),
  /**
   * Additiv (Entwurf „Entlastung", E3): das Profil dieses Arbeitsplatzes.
   *
   * Es bestimmt nur, welche Reiter im Kopfband stehen; jedes Blatt bleibt
   * unter „Mehr" erreichbar. Geräteeinstellung wie `betriebsart` und
   * `theme`, nicht in der Akte: Die Fernmeldezentrale und die S4 führen
   * denselben Einsatz. Ohne Angabe `fuehrungsstelle`.
   */
  profil: zProfil.optional(),
  /**
   * Additiv (S4.1): die Ansicht des Monitors und ob er wechselt.
   *
   * Fensterzustand dieses Geräts wie `theme` und nicht in der Akte: Der
   * Monitor im Zelt zeigt Verpflegung, der im Fahrzeug Stärke, und beide
   * hängen an derselben Einsatzdatei. Ohne Angabe Stärke, ohne Wechsel.
   *
   * Additiv: `wechselgruppe` beschränkt den Wechsel auf ein Sachgebiet; ohne
   * Angabe wechselt der Monitor durch alle Ansichten.
   */
  monitor: z.object({ ansicht: zMonitorAnsicht, wechsel: z.boolean(), wechselgruppe: zMonitorGruppe.optional() }).optional(),
  /**
   * Additiv (KONZEPT-NACHRICHTEN.md Entscheidung 3): das Handzeichen dieses
   * Arbeitsplatzes, gemerkt als Vorbelegung der Abfrage beim Öffnen. Die
   * Stelle selbst wird je Sitzung abgefragt; hier steht nur, was beim
   * nächsten Öffnen desselben Einsatzes vorgeschlagen wird
   * (`stellenJeEinsatz`, Schlüssel ist der Einsatzordner). Großzügig
   * geprüft: Ein zu langer Wert soll nicht die ganzen Einstellungen kosten.
   */
  handzeichen: z.string().max(20).optional(),
  stellenJeEinsatz: z.record(z.string(), z.array(z.string().max(80)).max(20)).optional(),
  /** Additiv (Entscheidung 6): Ton bei einer Blitz-Nachricht; fehlt = an. */
  tonBeiBlitz: z.boolean().optional(),
  /** Additiv (N3, §7): das Blatt des Vordrucks je Nachricht; fehlt = A5. */
  vordruckBlatt: zVordruckBlatt.optional(),
  /**
   * Additiv (N3, Entscheidung 4): ob die Vorschau des Vordrucks aufgeklappt
   * ist, je Ort gemerkt. Fehlt = aufgeklappt in der Ansicht, zugeklappt in
   * der Maske — die Maske ist selbst der Vordruck, die Ansicht zeigt ihn.
   */
  vorschau: z.object({ maske: z.boolean().optional(), ansicht: z.boolean().optional() }).optional(),
  /**
   * Additiv (N3, Entscheidung 7): der Automatikdruck jeder Nachricht, die für
   * eine Stelle der Sitzung eintrifft. Ohne Ziel oder mit `automatikdruckAn`
   * nicht `true` ist er aus; das Ziel bleibt gemerkt, wenn er aus ist.
   */
  automatikdruck: zAutomatikdruckziel.optional(),
  automatikdruckAn: z.boolean().optional(),
});
export type Einstellungen = z.infer<typeof zEinstellungen>;

export const zUmgebung = z.object({
  plattform: z.string(),
  electron: z.string(),
  programmversion: z.string(),
  rechnername: z.string(),
  /** Die Kennung dieses Arbeitsplatzes (§4.1) — sie steht in jeder HLC. */
  clientId: z.string(),
  /**
   * Ob diese Schale eine erzeugte Datei öffnen, im Ordner zeigen und drucken
   * kann (`ausgabeZeigen`). Die Electron-Schale kann es, die Web-Schale nicht:
   * Sie liefert keine Dateien des Shares aus, und ein Öffnen auf dem Server
   * hülfe dem Browser nicht. Fehlt das Feld, gilt „nein" — der Renderer
   * blendet die Knöpfe dann aus, statt einen Weg anzubieten, der scheitert.
   */
  dateienZeigen: z.boolean().optional(),
  /**
   * Ob diese Sitzung hinter der Anmeldung der Web-Schale läuft (ADR-006).
   * Dann zeigt das Kopfband „Abmelden". Es ist ein gemeinsamer Zugang ohne
   * Namen je Person; der Akteur bleibt der Anzeigename. Fehlt das Feld, gibt
   * es keine Anmeldung — Desktop und Web-Schale im Netz der Führungsstelle.
   */
  anmeldung: z.boolean().optional(),
  /**
   * Additiv (N3, Entscheidung 7): ob diese Schale ein PDF an einen Drucker
   * geben und einen Ordner per Dialog wählen kann. Nur die Desktop-Schale;
   * die Web-Schale bietet für den Automatikdruck nur das Verzeichnis an.
   */
  druckerDrucken: z.boolean().optional(),
  ordnerWaehlen: z.boolean().optional(),
});
export type Umgebung = z.infer<typeof zUmgebung>;

export const zEinsatzEintrag = z.object({
  ordner: zText,
  name: z.string(),
  datum: z.string(),
  /**
   * Additiv: Zeit der letzten Änderung der Ereignisse auf dem Share (ISO).
   * Fehlt, wenn das Dateisystem sie nicht nennt. Status und Zahl der
   * Einheiten stehen nicht im Anker; sie kennt nur, wer den Einsatz geöffnet
   * hat (Renderer merkt sie sich).
   */
  geaendert: z.string().optional(),
});
export type EinsatzEintrag = z.infer<typeof zEinsatzEintrag>;

export const zPeer = z.object({
  clientId: z.string(),
  anzeigename: z.string(),
  rechnername: z.string(),
  /** §6.4: ab 30 Sekunden ohne Fortschreibung gilt ein Arbeitsplatz als veraltet. */
  veraltet: z.boolean(),
  wanduhr: z.string(),
  /** Additiv: Datensätze (Ids), die dieser Arbeitsplatz gerade zum Bearbeiten gesperrt hat. */
  bearbeitet: z.array(z.string()).readonly().optional(),
  // ---- Was M7.3 hinzunimmt: die Zahlen, aus denen eine Diagnose wird -------
  //
  // Sie stehen **am Peer** und nicht in einem eigenen Diagnoseruf, weil sie
  // ohnehin in jedem Praesenztakt gelesen werden (§6.4): Die Praesenzdatei
  // traegt Version, Segment und Offset seit M2.3. Sie ein zweites Mal zu holen,
  // waere ein zweiter Griff auf denselben Ordner.
  /** Die Programmfassung des anderen Platzes — ungleiche Fassungen erklaeren vieles. */
  programmversion: z.string(),
  /** Das Segment, in das der andere Platz gerade schreibt (§5.2). */
  segment: z.number().int().min(0),
  /** Wie weit er nach eigener Angabe geschrieben hat. */
  offset: z.number().int().min(0),
  /**
   * Wie weit **dieser** Platz seine laufende Datei gelesen hat.
   *
   * Die Differenz zu `offset` ist die eigentliche Auskunft der Ansicht: Steht
   * sie still, waehrend der andere schreibt, kommt der Share nicht durch. Sie
   * darf negativ wirken, wenn der andere gerade geschrieben und noch nicht
   * gespiegelt hat — deshalb wird sie gezeigt und nicht bewertet.
   */
  gelesenerOffset: z.number().int().min(0),
  /**
   * Abweichung seiner Wanduhr zur eigenen, in Millisekunden, vorzeichenbehaftet.
   *
   * §2.6: Die Ordnung haengt daran nicht. Angezeigte Zeitpunkte und die
   * Plausibilitaetsschwellen aus §2.5 hingegen schon — deshalb steht die Zahl
   * hier und nicht nur im Protokoll.
   */
  uhrAbweichungMs: z.number().int(),
  /** Dateien, die **er** in Quarantaene gemeldet hat (§8.2, §4.6.1). */
  quarantaene: z.number().int().min(0),
  /**
   * Additiv (KONZEPT-NACHRICHTEN.md §4): die Stellen, die er für seine
   * Sitzung angegeben hat, und sein Handzeichen — die „besetzten Stellen",
   * die die Nachrichtenmaske als Anschrift anbietet.
   */
  stellen: z.array(z.string()).readonly().optional(),
  handzeichen: z.string().optional(),
  /**
   * Additiv (Sichter P1-4, ETB P3-3, Sichter P3-4): Er hat seine Stelle
   * abgegeben (Akte geschlossen, Seite verlassen). Er gilt dann zugleich als
   * `veraltet`, damit Zählung und Ersatzsichter ihn sofort nicht mehr führen.
   */
  abgemeldet: z.boolean().optional(),
  /** Additiv (2026-11-21): die Fold-Fassung des anderen Platzes; fehlt bei älteren Fassungen. */
  foldVersion: z.number().int().optional(),
});
export type Peer = z.infer<typeof zPeer>;

/** So viele Konflikthinweise trägt das Lagebild höchstens mit Art und Pfad (`konflikthinweise`). */
export const KONFLIKTHINWEISE_MAX = 50;

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
 * genau das ist ihr Zweck: Eine Statuszeile, die „Share erreichbar“ zeigt,
 * ohne zu sagen, wann das zuletzt zutraf, ist keine Auskunft, sondern ein
 * Standbild. Alles Fachliche schweigt dagegen, solange sich nichts aendert.
 *
 * Was hier **nicht** steht, ist der volle Zustand. M2 zeigt eine Statuszeile,
 * kein Lagebild im fachlichen Sinn; die Tabellen kommen mit M3, und sie
 * bekommen dann ihren eigenen Ruf statt eines aufgeblaehten Dauerstroms.
 */
/**
 * Die Stammdaten des Einsatzes (Blatt „Stammdaten“ der Excel).
 *
 * Sie reisen im Lagebild mit, weil Kopfband und Maske sie dauernd zeigen und
 * sie sich fast nie ändern: Der Delta-Weg schickt sie einmal und danach nur
 * bei einer Änderung. Ein eigener Ruf hieße, für sieben kurze Texte eine
 * zweite Ansicht mit Ladezustand zu führen.
 */
export const zEinsatzstammdaten = z.object({
  name: z.string(),
  art: z.string(),
  fuestName: z.string(),
  uebergeordneteFuestName: z.string().optional(),
  ort: z.string().optional(),
  beginn: z.string(),
  schichtmodell: z.string(),
  /**
   * Additiv (KONZEPT-NACHRICHTEN.md §5, Entscheidung 8): die Parameter des
   * Nachrichtenwegs, wie sie im Zustand stehen — fehlen, solange niemand sie
   * gesetzt hat; dann gilt die Vorbelegung (nein, 20 Minuten).
   */
  sichtungAuchAusgang: z.boolean().optional(),
  fmzSchwelleMinuten: z.number().optional(),
  /** Additiv (2026-11-17): der LdF ist eigene Station im Laufweg; fehlt = nein. */
  ldfStation: z.boolean().optional(),
  /** Additiv (R2-FM P2-5, R2-Si P2-2): Minuten vor dem Sichter bei Blitz und Sofort; fehlen = 5 und 10. */
  sichterSchwelleBlitzMinuten: z.number().optional(),
  sichterSchwelleSofortMinuten: z.number().optional(),
});
export type Einsatzstammdaten = z.infer<typeof zEinsatzstammdaten>;

/** Eine eingetroffene Ablösung, deren abgelöste Einheit noch zur Ist-Stärke zählt. */
export const zOffeneAbloesung = z.object({
  anforderungId: z.string(),
  abgeloesteEinheitId: z.string(),
  abgeloesteBezeichnung: z.string(),
  abloesendeEinheitId: z.string(),
  abloesendeBezeichnung: z.string(),
});
export type OffeneAbloesungInfo = z.infer<typeof zOffeneAbloesung>;

const zZahl = z.number().int();
const zKost = { portionen: zZahl, vegetarisch: zZahl, vegan: zZahl };

/** Die Zahlen der Versorgung im Lagebild — gerechnet in Ring 2 (`projektion.versorgungszahlen`). */
export const zVersorgungszahlen = z.object({
  naechste: z.object({ mahlzeit: z.string(), zeitpunkt: z.string(), ...zKost }).optional(),
  mahlzeiten: z
    .array(
      z.object({
        mahlzeit: z.string(),
        zeitpunkt: z.string(),
        ...zKost,
        bestand: zZahl,
        zugang: zZahl,
        abgang: zZahl,
        bestellt: zZahl.optional(),
        differenz: zZahl.optional(),
      }),
    )
    .readonly(),
  anmarsch: zZahl,
  betten: z.object({ m: zZahl, w: zZahl, d: zZahl, gesamt: zZahl }),
  belegt: zZahl.optional(),
  frei: zZahl.optional(),
  ohneZuweisung: zZahl.optional(),
  ohneZuweisungEinheiten: zZahl.optional(),
});
export type Versorgungszahlen = z.infer<typeof zVersorgungszahlen>;

/**
 * Die Zahlen des Funkplans im Lagebild (KONZEPT-FUNKPLAN.md §4, F4) —
 * `projektion.funkplan(…).zahlen`, gegen die Uhr des Workers gerechnet:
 * geltende Rufgruppen, zugeordnete Einheiten, Einheiten ohne Rufgruppe,
 * Einheiten ohne Kontakt über der Schwelle und die jüngste Funkprobe (ISO).
 */
export const zFunklage = z.object({
  rufgruppen: zZahl,
  zugeordnet: zZahl,
  ohneRufgruppe: zZahl,
  ohneKontakt: zZahl,
  letzteFunkprobe: z.string().optional(),
});
export type Funklage = z.infer<typeof zFunklage>;

/**
 * Die fünf Zahlen des Bandes im Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md
 * §6, §9) — `projektion.nachrichtenlage` mit den Stellen der Sitzung.
 */
export const zNachrichtenlage = z.object({
  neuFuerStellen: zZahl,
  vorFmz: zZahl,
  vorSichter: zZahl,
  mitVorrangOffen: zZahl,
  ueberSchwelle: zZahl,
  /** Additiv: vor dem LdF — nur, wenn der Einsatz den LdF als Station führt. */
  vorLdf: zZahl.optional(),
  /** Additiv (Review 2026-11-21): davon Ausgänge vor der Zuteilung. */
  vorLdfZuteilung: zZahl.optional(),
  /**
   * Additiv (R2-LdF P2-4): der Teil von `ueberSchwelle`, der beim LdF liegt
   * (Ausgang VOR_LDF über der Schwelle); `ueberSchwelleFmz` der Rest vor der
   * FmZ. Beide nur, wenn der Einsatz den LdF als Station führt.
   */
  ueberSchwelleLdf: zZahl.optional(),
  ueberSchwelleFmz: zZahl.optional(),
  /** Additiv (LdF P2-2): fehlende Nummern zwischen 1 und der höchsten; fehlt = lückenlos. */
  nummernluecken: z.array(zZahl).optional(),
  /** Additiv (Sichter P1-4): Eingänge, die mindestens die FmZ-Schwelle lang vor dem Sichter liegen. */
  vorSichterUeberSchwelle: zZahl.optional(),
  /**
   * Additiv (zweiter Durchlauf, Wartezeit): die Minute, gegen die die Zahlen
   * gerechnet sind (ISO). Die Spalte „Wartet“ rechnet mit
   * `projektion.wartezeitMinuten(zeile, gerechnetUm)` gegen dieselbe Zeit.
   */
  gerechnetUm: z.string().optional(),
});
export type Nachrichtenlage = z.infer<typeof zNachrichtenlage>;

/**
 * Was beim Beenden des Einsatzes an Nachrichten offen ist (ETB P1-6) —
 * `projektion.offeneNachrichten` über alle Stellen, für die Rückfrage wie
 * `offeneAnforderungen`.
 */
export const zOffeneNachrichten = z.object({
  vorFmz: zZahl,
  beimLdf: zZahl,
  /** Additiv (Review 2026-11-21): davon beförderte Ausgänge, denen Nummer und Verteilung fehlen. */
  beimLdfNachBefoerderung: zZahl.optional(),
  vorSichter: zZahl,
  ohneNummer: zZahl,
  ungelesenMitVorrang: zZahl,
});
export type OffeneNachrichten = z.infer<typeof zOffeneNachrichten>;

/**
 * Stelle und Handzeichen dieses Arbeitsplatzes für die Sitzung dieser Akte
 * (Entscheidung 3). Sie reisen im Lagebild, damit ein neu geladenes Fenster
 * weiß, was der Worker hält, und nicht erneut fragt.
 */
export const zSitzungsstellen = z.object({
  stellen: z.array(z.string()).readonly(),
  handzeichen: z.string().optional(),
});
export type Sitzungsstellen = z.infer<typeof zSitzungsstellen>;

export const zLagebild = z.object({
  einsatzId: z.string(),
  einsatzName: z.string(),
  einsatzArt: z.string(),
  /** Fehlt, solange `EinsatzAngelegt` noch nicht gefaltet ist. */
  stammdaten: zEinsatzstammdaten.optional(),
  /**
   * Der abgeleitete Zustand des Einsatzes (§5.2): laufend, beendet oder
   * archiviert. Er reist im Lagebild, weil Kopfband und Abschlussblock ihn
   * dauernd zeigen und weil eine Maske, die schreibt, ihn kennen muss, bevor
   * der Worker sie abweist. Fehlt er, gilt „laufend" — so wie bei einem
   * Worker einer Fassung, die ihn noch nicht schickt.
   */
  einsatzStatus: z.enum(["AKTIV", "BEENDET", "ARCHIVIERT"]).optional(),
  /**
   * Das Einsatzende (ISO-Zeitpunkt) — der `vorher`-Wert für Beenden und
   * Wiedereröffnen (§2.2a). Leer, solange keines gilt: als leere Zeichenkette
   * und nicht als fehlendes Feld, weil ein Delta über die Web-Schale als JSON
   * reist und ein `undefined` dort verschwände — das alte Ende bliebe stehen.
   */
  einsatzEnde: z.string().optional(),
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
  /** Köpfe in Angefordert/Eingang — zählen nicht in `gesamtstaerke`, stehen nur daneben. */
  staerkeErwartet: z.number().int().min(0).optional(),
  /** Köpfe im Archivbereich „Einsatz beendet“ — zählen ebenfalls nicht. */
  staerkeBeendet: z.number().int().min(0).optional(),
  hinweise: z.number().int().min(0),
  /**
   * Additiv (Fernmelder P2-6, Wunsch des Renderers): Art und Feldpfad der
   * Konflikthinweise, höchstens {@link KONFLIKTHINWEISE_MAX} — damit die
   * Diagnose an einem Hinweis mit Pfad `nachricht/<id>/…` „Nachricht öffnen“
   * anbieten kann, statt Rohdaten zu zeigen. `hinweise` bleibt die volle Zahl.
   */
  konflikthinweise: z
    .array(
      z.object({
        art: z.string(),
        feldpfad: z.string(),
        /**
         * Additiv (R2-ETB P2-4, R2-SGL P2-2): der Satz zu einem Hinweis an
         * einer Nachricht — „Nummer 7 zweimal: E 7 ‚…‘ und A 7 ‚…‘“, „E 8 ‚…‘:
         * Sichtung von Si 1420 und Zw 1421, Verteiler S2, S4 gegen S2, S3“.
         * Fehlt bei Hinweisen an anderen Entitäten.
         */
        text: z.string().optional(),
      }),
    )
    .readonly()
    .optional(),
  /**
   * Additiv: Einheiten, die aus einem Erfassungsbogen mit rohen
   * Vokabularcodes („#3") statt Namen übernommen wurden und sich aus dem
   * gespeicherten Bogen korrigieren lassen. Fehlt das Feld: nichts offen.
   */
  vokabelkorrekturen: z.number().int().min(0).optional(),
  unbekannteEreignisse: z.number().int().min(0),
  /**
   * Wie viele Schritte „rueckgaengig“ noch gehen (§6 U3). Seit der
   * Undo-Gruppe (R2-LdF P2-8) zählt ein Bedienschritt mit Folgeschritten als einer.
   */
  undoTiefe: z.number().int().min(0),
  undoObersteArt: z.string().optional(),
  /** Der Name des Gegenstands des obersten Schritts („TZ“) — leer, wenn die Art keinen nennt. */
  undoObersteObjekt: z.string().optional(),
  /**
   * Additiv (R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8): Der oberste Schritt ist
   * ein Bedienschritt mit Folgeschritten — „Eingang aufnehmen (mit Nummer und
   * Sichtung)“, „Befördern (mit Annahme, Nummer und Kopien)“. „Rückgängig“
   * nimmt alle `undoObersteTeile` Ereignisse zurück. Fehlt bei einem
   * einzelnen Schritt; dann gelten `undoObersteArt` und `undoObersteObjekt`.
   */
  undoObersteSchritt: z.string().optional(),
  undoObersteTeile: z.number().int().min(1).optional(),
  /**
   * Additiv (R2-FaBe P2-8): Der jüngste eigene Schritt lässt sich nicht
   * zurücknehmen (etwa „Nachricht aufgegeben“) und ist jünger als der
   * oberste Eintrag des Stapels — „Rückgängig“ nennt dann einen älteren
   * Schritt. `hinweis` sagt, was stattdessen gilt (zurückziehen, berichtigen).
   */
  undoOhneRuecknahme: z.object({ art: z.string(), objekt: z.string(), hinweis: z.string() }).optional(),
  /** Anforderungen, die noch nicht eingetroffen oder storniert sind — für die Rückfrage beim Beenden. */
  offeneAnforderungen: z.number().int().min(0).optional(),
  /** Additiv (ETB P1-6): offene Nachrichten für dieselbe Rückfrage; fehlt, solange der Einsatz keine führt. */
  offeneNachrichten: zOffeneNachrichten.optional(),
  /**
   * Additiv: Ablösungen, bei denen die ablösende Einheit eingetroffen ist, die
   * abgelöste aber noch zur Ist-Stärke zählt. Leer oder fehlend: nichts offen.
   */
  abloesungenOffen: z.array(zOffeneAbloesung).optional(),
  /**
   * Zaehlt bei jeder fachlichen Aenderung um eins hoch (M3.7).
   *
   * **Das ist der einzige Zuwachs, den das Lagebild in M3 erfaehrt, und er
   * ist das Gegenteil von Wachstum.** M2 hat festgelegt, dass hier keine
   * Tabelle, kein Baum und kein Tagebuch hineinwandert; ein Dauerstrom des
   * vollen Zustands waere bei 150 Einheiten das Falsche. Der Zeiger ist die
   * kleinste Auskunft, mit der eine offene Ansicht erfaehrt, dass ihr Bild
   * veraltet ist: eine Zahl. **Was** sich geaendert hat, sagt er nicht — das
   * holt sich die Ansicht mit ihrem eigenen Ruf, gefiltert und auf ihren
   * Ausschnitt beschnitten.
   *
   * Er laeuft ueber den bestehenden Delta-Weg mit und kostet dort nichts: Er
   * ist ein oberster Schluessel wie jeder andere.
   */
  lageZeiger: z.number().int().min(0),
  /**
   * Additiv (S4.1): die Zahlen der Versorgung für Monitor und KPI-Band
   * (KONZEPT-S4.md §6) — nächste Mahlzeit, je Mahlzeit der nächsten 24 h
   * sieben Zahlen, Anmarsch und Betten. Keine Tabelle: Mahlzeitenplan,
   * Bedarfsliste und Tafel holt das Blatt mit `versorgungAnfordern`.
   */
  versorgung: zVersorgungszahlen.optional(),
  /**
   * Additiv (Funkplan F4): die fünf Zahlen des Funkplans für Monitor und
   * Band. Die Tafel mit Rufgruppen und Teilnehmern holt der Monitor mit
   * `funkplanAnfordern`, wie die Versorgungstafel mit `versorgungAnfordern`.
   */
  funk: zFunklage.optional(),
  /** Additiv (Nachrichten N1): die fünf Zahlen des Bandes, je Stelle der Sitzung gerechnet. */
  nachrichten: zNachrichtenlage.optional(),
  /** Additiv (Nachrichten N1): Stellen und Handzeichen der Sitzung; fehlt, solange nicht angegeben. */
  sitzung: zSitzungsstellen.optional(),
  /**
   * Additiv (R2-FaBe P0-3, R2-SGL): die besetzten Stellen aus der Präsenz —
   * die eigene Sitzung und jeder lebende Arbeitsplatz, ohne Doppelte,
   * geordnet (Schlüssel wie „FMZ“, „SICHTER“, „LDF“, „S3“). Daran sieht die
   * Oberfläche, ob jemand die FmZ oder den Sichter besetzt.
   */
  besetzteStellen: z.array(z.string()).readonly().optional(),
});
export type Lagebild = z.infer<typeof zLagebild>;

/** Ein Ereignisentwurf, wie der Renderer ihn schickt (KONZEPT-SPEICHER.md §2.4). */
export const zEntwurf = z.object({
  typ: zText,
  nutzlast: z.unknown().optional(),
  vorher: z.unknown().optional(),
  neu: z.unknown().optional(),
  grund: z.string().optional(),
  /**
   * Additiv: `vorher` ist der Wert, den der Editor beim Öffnen sah. Gilt im
   * Zustand inzwischen ein anderer, den ein anderer Arbeitsplatz gesetzt hat,
   * weist der Worker ab (`VORWERT`) statt still zu überschreiben.
   */
  vorwertPruefen: z.boolean().optional(),
  korrekturVon: z.string().optional(),
  schemaVersion: z.number().int().min(1).optional(),
  /**
   * Additiv (KONZEPT-NACHRICHTEN.md §5, Schnitt N2): die Vermerke, die beim
   * Aufnehmen eines Eingangs oder beim Aufgeben einer Gesprächsnotiz in
   * **einem** Zug mitgeschrieben werden — die Nachweisungsnummer der FmZ und
   * die Sichtung des Ersatzsichters. Der Worker plant sie als Folgeschritte
   * (`schreibfolgen.ts`) und prüft jeden Wert gegen die Schemata der Domäne;
   * ins Protokoll geht dieses Feld selbst nicht.
   */
  nachrichtenfolge: z
    .object({
      nachweis: z.unknown().optional(),
      sichtung: z.unknown().optional(),
      /** Additiv (2026-11-21): die Weitergabe des LdF an den Sichter, die dem Nachweis folgt. */
      weitergabe: z.unknown().optional(),
      /**
       * Additiv: die Einheit, an die befördert oder von der aufgenommen
       * wurde. Der Worker vermerkt dort im Funkplan einen Kontakt
       * (Funkprobe „Kontakt“ zur Zeit der Beförderung bzw. der Aufnahme).
       */
      kontaktEinheitId: z.string().min(1).optional(),
      /**
       * Additiv: die Rufgruppe, über die der Kontakt lief — vorbelegt mit der
       * Hauptrufgruppe der Einheit. Steht die Einheit ohne geltende
       * Rufgruppe, ordnet der Worker sie dieser Gruppe zu. Gilt für die
       * Beförderung eines Ausgangs und die Aufnahme eines Eingangs.
       */
      kontaktRufgruppeId: z.string().min(1).optional(),
      /**
       * Additiv (Audit LdF P0-1): die Annahme, die beim Befördern fehlt. Der
       * Worker trägt sie mit Uhrzeit und Handzeichen der Beförderung nach,
       * damit keine Nachricht ohne Annahmevermerk die FmZ verlässt.
       */
      annahme: z.unknown().optional(),
      /**
       * Additiv (Fernmelder P2-9, Papier-Nachtrag): die Beförderung eines
       * Ausgangs, der vom Papier nacherfasst wird — an `NachrichtVerfasst`
       * wie `annahme` und `nachweis`. Der Worker schreibt danach im selben
       * Zug `NachrichtBefoerdert` und dessen Folgen (Kopien, Kontakt).
       */
      befoerderung: z.unknown().optional(),
      /**
       * Additiv (R2-SGL P1-2, R2-ETB P1-1): Die Anlage kommt vom Papier
       * („Vom Papier nachtragen“). Der Worker schreibt sie und ihre Folgen mit
       * dem `grund` „vom Papier nachgetragen“; das Tagebuch sagt dann
       * „vom Papier nachgetragen durch <Stelle der Sitzung>“.
       */
      nachtrag: z.boolean().optional(),
    })
    .optional(),
});
export type Entwurf = z.infer<typeof zEntwurf>;

// ---------------------------------------------------------------------------
// Rufe
// ---------------------------------------------------------------------------

/**
 * Wie viele Zeilen ein einzelner Ansichtsruf hoechstens zurueckgibt.
 *
 * Die Schranke steht **im Schema** und nicht in der Ansicht: Der Main prueft
 * jeden Ruf, bevor er den Worker erreicht, und ein Renderer, den ein fremdes
 * Skript erreicht hat, koennte sonst `anzahl: 5_000_000` schicken und den
 * Worker eine Antwort bauen lassen, die keiner liest. Fuenfhundert ist
 * grosszuegig gegenueber der Zahl aus der DoD von M3.2 (150 Einheiten) und
 * klein genug, dass eine Antwort in Millisekunden serialisiert.
 */
export const AUSSCHNITT_MAX = 500;

/**
 * Wie viele Texte ein Ruf `eebDatei` hoechstens traegt. Eine Sammel-PDF fuehrt
 * je Einheit einen Anhang; fuenfhundert ist mehr, als ein Einsatz Einheiten hat.
 */
export const EEB_DATEITEXTE_MAX = 500;

/**
 * Eine Stelle, wie sie in Präsenz und Feldpfad steht (KONZEPT-NACHRICHTEN.md
 * §4, §9): Text ohne Schrägstrich — dieselbe Regel wie `zStelle` der Domäne.
 */
const zStellenname = z.string().min(1).max(80).regex(/^[^/]+$/);

/** Stelle und Handzeichen der Sitzung (Entscheidung 3), beide optional. */
const zSitzungsangaben = {
  stellen: z.array(zStellenname).max(20).optional(),
  handzeichen: z.string().max(20).optional(),
};

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
  // Additiv (Demo-Einsatz): legt einen Einsatz an, der zwölf Stunden vor jetzt
  // beginnt, und spielt das Demo-Drehbuch ein (`worker/demo/demoeinsatz.ts`).
  // Ohne Angaben: Name, Beginn und Inhalt stehen im Drehbuch.
  z.object({ art: z.literal("demoEinsatzAnlegen") }),
  // Additiv (KONZEPT-NACHRICHTEN.md Entscheidung 3): Stelle und Handzeichen
  // der Sitzung, wie die Abfrage beim Öffnen sie erhoben hat.
  z.object({ art: z.literal("einsatzOeffnen"), ordner: zText, ...zSitzungsangaben }),
  // Stelle und Handzeichen während der Sitzung ändern (Fenstermenü).
  z.object({ art: z.literal("stellenSetzen"), akteId: zAkteId, ...zSitzungsangaben }),
  z.object({ art: z.literal("einsatzSchliessen"), akteId: zAkteId }),
  z.object({ art: z.literal("standAnfordern"), akteId: zAkteId }),
  /**
   * Additiv: Bearbeitungssperre für einen Datensatz (Einheit, Fahrzeug,
   * Abschnitt, Rufgruppe). Setzen und Verlängern ohne `frei`, Freigeben mit `frei: true`.
   * Eine Sperre läuft nach 30 s ab; der offene Editor verlängert sie.
   */
  z.object({ art: z.literal("sperre"), akteId: zAkteId, entitaetId: zText, frei: z.boolean().optional() }),
  z.object({ art: z.literal("bedienen"), akteId: zAkteId, entwurf: zEntwurf }),
  z.object({ art: z.literal("zurueck"), akteId: zAkteId, grund: z.string().optional() }),
  z.object({ art: z.literal("undoStapel"), akteId: zAkteId }),

  // ---- Die drei Ansichtsrufe (M3.7) ---------------------------------------
  //
  // Sie holen, was das geschobene Lagebild ausdruecklich **nicht** traegt.
  // Jeder von ihnen nimmt seinen Filter und seinen Ausschnitt entgegen, und
  // das ist der Grund ihrer Existenz: Ein Ruf ohne Ausschnitt zwingt den
  // Worker, bei 5.000 Einheiten alles zu bauen, um 50 Zeilen zu zeigen —
  // und zwar bei jeder Aenderung (Entscheidung 10 des Umsetzungsplans).
  z.object({
    art: z.literal("baumAnfordern"),
    akteId: zAkteId,
    ohneAufgeloeste: z.boolean().optional(),
    ohneArchiv: z.boolean().optional(),
  }),
  z.object({
    art: z.literal("tabelleAnfordern"),
    akteId: zAkteId,
    abschnittId: z.string().optional(),
    suche: z.string().optional(),
    mitStillgelegten: z.boolean().optional(),
    status: z.array(z.string()).optional(),
    // Gliederung nach Bereichen wie im Blatt „Stärke“; additiv, ohne sie
    // bleibt die Antwort flach.
    gliederung: z.boolean().optional(),
    ohneLeereBereiche: z.boolean().optional(),
    von: z.number().int().min(0).optional(),
    anzahl: z.number().int().min(1).max(AUSSCHNITT_MAX).optional(),
  }),
  // Die Untertabellen **einer** Einheit — ein eigener Ruf und keine Spalte der
  // Tabelle. Eine Einheit mit vollstaendiger Personalerfassung fuehrt bis zu
  // dreissig Personen (ZDM §3.4); sie an jeder Zeile mitzuschicken hiesse, bei
  // 150 Einheiten viertausend Datensaetze zu tragen, um die einer einzigen
  // aufgeklappten Zeile zu zeigen.
  z.object({ art: z.literal("untertabelleAnfordern"), akteId: zAkteId, einheitId: zText }),

  // ---- Die Ansichten von M5 -----------------------------------------------
  //
  // Auch sie sind eigene Rufe und keine Felder des Lagebilds: Die
  // Kostenuebersicht traegt eine Zeile je Einheit, die Anforderungsliste eine
  // je Anforderung, und das Blatt der Fuehrungsstelle eine je Dienstposten.
  // Sie am Lagebild mitzuschieben hiesse, bei jeder Statusaenderung drei
  // Tabellen zu uebertragen, die niemand offen hat.
  //
  // Die Kostenuebersicht hat **keinen** Ausschnitt: Sie ist eine Abrechnung,
  // und eine Abrechnung mit der ersten Seite waere keine. Bei 150 Einheiten
  // sind es 150 Zeilen mit je acht Zahlen — das traegt ein Ruf.
  z.object({ art: z.literal("kostenAnfordern"), akteId: zAkteId }),
  // Das Blatt „Versorgung" (S4.1): Vorausschau, Mahlzeitenplan, Bedarf,
  // Sofortbedarf und das Logistikblatt in einem Ruf. Die Liste ist eine je
  // Bereich bzw. je Einheit mit Bedarf — kein Ausschnitt, wie die Kosten.
  z.object({
    art: z.literal("versorgungAnfordern"),
    akteId: zAkteId,
    stunden: z.union([z.literal(24), z.literal(48)]).optional(),
  }),
  // Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5, additiv): Rufgruppen,
  // Zuordnung je Rufgruppe und je Bereich, Zahlen des Bandes. Die Suche
  // schneidet nur die Teilnehmer zu, nie die Zahlen; kein Ausschnitt, der
  // Plan ist eine Zeile je Einheit wie die Kosten.
  z.object({ art: z.literal("funkplanAnfordern"), akteId: zAkteId, suche: z.string().max(200).optional() }),
  // Die Stärketafeln des Sachgebiets 1 für den Monitor (additiv): Ist-Stärke
  // je Abschnitt und je Organisation in einem Ruf — eine Zeile je Abschnitt
  // bzw. Organisation, kein Ausschnitt.
  z.object({ art: z.literal("staerketafelAnfordern"), akteId: zAkteId }),
  // Die Stabsübersicht (additiv, Stab-Review 2026-11-22): Kräfte nach Status
  // je Teilbaum und alle Aufträge in einem Ruf, kein Ausschnitt.
  z.object({ art: z.literal("stabsuebersichtAnfordern"), akteId: zAkteId }),
  // Das Blatt der Fuehrungsstelle (M5.4) traegt beides in **einem** Ruf: das
  // Dienstpostenblatt und den Schichtplan. Sie sind zwei Ansichten derselben
  // Menge — jede Planzeile haengt an einem Dienstposten (§5.7) —, und zwei
  // Rufe holten dieselben Posten zweimal.
  // Der Eingangskorb (M6.1) und die Revisionen einer Reihe (M6.2) — **ein**
  // Ruf mit Filter, wie jede Liste seit M3.7. `einheitSchluessel` schneidet
  // ihn auf eine Reihe zu; das ist die Revisionsansicht.
  z.object({
    art: z.literal("eingangskorbAnfordern"),
    akteId: zAkteId,
    zustaende: z.array(z.enum(["NEU", "GEAENDERT", "UEBERNOMMEN", "ABGELEHNT"])).optional(),
    einheitSchluessel: z.string().optional(),
    suche: z.string().optional(),
    nurKoepfe: z.boolean().optional(),
    von: z.number().int().min(0).optional(),
    anzahl: z.number().int().min(1).max(AUSSCHNITT_MAX).optional(),
  }),
  // Der Vergleich zweier Fassungen (M6.2) — ein eigener Ruf und kein Feld der
  // Korbzeile: Er traegt bei einer Einheit mit dreissig Personen mehr Text als
  // die ganze Liste, und gebraucht wird er fuer **eine** Zeile, wenn jemand
  // hinsieht.
  // Die Buendeldatei (M6.3). Der **Text** geht ueber die Grenze, nicht ein
  // Pfad: Die Datei kommt vom USB-Stick eines Meldekopfs, und den Griff ins
  // Dateisystem tut der Renderer ueber sein Dateifeld — der Worker soll keine
  // Pfade oeffnen, die ihm jemand nennt.
  z.object({ art: z.literal("buendelEinlesen"), akteId: zAkteId, text: z.string(), abschnittId: zText }),
  // Der Rueckweg schreibt in `ausgaben\` wie jede andere Ausgabe (M4.1) und
  // liefert den Pfad: Wer sie weitergibt, muss wissen, wo sie liegt.
  z.object({ art: z.literal("buendelSchreiben"), akteId: zAkteId }),
  // Die Erfassungsboegen gewaehlter Einheiten als eine Buendeldatei — der
  // Sammel-Download aus der Einheitentabelle. Dasselbe Format wie der
  // Rueckweg darueber, nur auf die Auswahl beschraenkt.
  z.object({
    art: z.literal("erfassungsboegenSchreiben"),
    akteId: zAkteId,
    einheitIds: z.array(zText).min(1).max(AUSSCHNITT_MAX),
  }),
  // Die Korrektur übernommener Einheiten mit rohen Vokabularcodes: Der Worker
  // rechnet aus seinem Zustand, was zu schreiben ist; der Renderer nennt nur
  // die Akte.
  z.object({ art: z.literal("vokabelnKorrigieren"), akteId: zAkteId }),

  // Der Update-Weg (M7.2). **Ohne Akte**: Er haengt am Share und nicht an
  // einem Einsatz — geprueft wird auch dann, wenn keine Akte offen ist.
  z.object({ art: z.literal("programmstandPruefen") }),

  // Ein Paket aus der Veröffentlichung holen und in den Share legen (M9.1).
  // **Ohne Akte** wie die Pruefung darueber, und mit derselben Festlegung:
  // Es wird geholt und abgelegt, nicht installiert. Der Ruf ist der einzige
  // im ganzen Kontrakt, der einen Ruf nach draussen ausloest — und er
  // geschieht ausschliesslich, weil ein Mensch einen Knopf gedrueckt hat.
  z.object({ art: z.literal("programmpaketHolen") }),

  // Die Diagnoseansicht (M7.3). **Ohne Akte**: Was sie zeigt, gehoert dem
  // Arbeitsplatz und nicht einem Einsatz — Pfade, Fassungen, die letzten
  // Meldungen des Protokolls. Das Fachliche (Peers, Quarantaene, Hinweise)
  // steht laengst im geschobenen Lagebild; es hier zu wiederholen hiesse,
  // dieselbe Zahl aus zwei Quellen zu zeigen, die sich unterscheiden koennen.
  z.object({ art: z.literal("diagnoseAnfordern") }),
  z.object({
    art: z.literal("fassungsvergleichAnfordern"),
    akteId: zAkteId,
    /** Ohne Angabe: die beiden juengsten Fassungen der Reihe. */
    vonId: z.string().optional(),
    nachId: z.string().optional(),
    einheitSchluessel: z.string().optional(),
  }),
  z.object({
    art: z.literal("fuestAnfordern"),
    akteId: zAkteId,
    mitEntfernten: z.boolean().optional(),
    /** Erster angezeigter Tag des Schichtplans, ISO-Datum, einschliesslich. */
    planVon: z.string().optional(),
    planBis: z.string().optional(),
  }),
  z.object({
    art: z.literal("anforderungenAnfordern"),
    akteId: zAkteId,
    zustaende: z.array(z.enum(["OFFEN", "ZUGESAGT", "EINGETROFFEN", "STORNIERT"])).optional(),
    suche: z.string().optional(),
    von: z.number().int().min(0).optional(),
    anzahl: z.number().int().min(1).max(AUSSCHNITT_MAX).optional(),
  }),

  // ---- Der Handscanner-Weg (M3.4) -----------------------------------------
  //
  // Ein Handscanner ist fuer den Rechner eine Tastatur; was ankommt, ist Text.
  // Er wird **im Worker** entpackt und nicht im Renderer: Das Entpacken
  // braucht einen Kompressor (`node:zlib`), und der Renderer hat kein Node
  // (02-ZIELBILD.md, „Vier Ringe“). Der Sammelstand liegt aus demselben Grund
  // dort — er besteht aus Byte-Abschnitten, und die haben im Renderer nichts
  // verloren, der sie ohnehin nicht deuten kann.
  z.object({ art: z.literal("eebScan"), akteId: zAkteId, text: z.string() }),
  // Der Datei-Weg: Die PDF der Erfassungsbogen-App fuehrt den Bogen als
  // JSON-Anhang. Der Renderer zieht die Texte aus der Datei (sein Dateifeld,
  // wie beim Buendel) und schickt **nur sie** — die PDF selbst mit Schriften
  // und Bildern bleibt, wo sie ist. Was davon ein Bogen ist, entscheidet der
  // Worker.
  z.object({
    art: z.literal("eebDatei"),
    akteId: zAkteId,
    texte: z.array(z.string()).max(EEB_DATEITEXTE_MAX),
  }),
  // Legt den angezeigten Bogen beiseite und zeigt den naechsten der Datei.
  z.object({ art: z.literal("eebUeberspringen"), akteId: zAkteId }),
  z.object({ art: z.literal("eebZuruecksetzen"), akteId: zAkteId }),
  z.object({
    art: z.literal("eebUebernehmen"),
    akteId: zAkteId,
    abschnittId: zText,
  }),
  // Der Massenimport: der angezeigte Bogen und alle wartenden der Datei in
  // einen Abschnitt, ohne jeden einzeln zu bestaetigen.
  z.object({
    art: z.literal("eebAlleUebernehmen"),
    akteId: zAkteId,
    abschnittId: zText,
  }),
  // Haelt einen laufenden Massenimport nach dem aktuellen Bogen an.
  z.object({ art: z.literal("eebAbbrechen"), akteId: zAkteId }),

  // ---- Die Kernausgaben (M4.1) --------------------------------------------
  //
  // Gerendert wird im **Worker**: Er haelt den Zustand, und die Vorlagen
  // liefern eine Zeichenkette (`@s1/ausgaben` hat kein `node:`). Das PDF
  // entsteht in der Schale ueber `webContents.printToPDF` — dafuer braucht es
  // eine Rendering-Engine, und die gibt es nur dort.
  z.object({
    art: z.literal("ausgabeErzeugen"),
    akteId: zAkteId,
    // `oldenburg` ist die Exportvariante aus M4.2: derselbe Bestand in der
    // Spaltenordnung des Blatts „Staerke" der Vorlage, zum Einfuegen in die
    // gewohnte Excel. Eine eigene Ausgabeart und keine Option der Auswertung,
    // weil es eine andere Datei mit einem anderen Zweck ist.
    // `log` ist das Blatt „Logistik Details" (M5.1), `logfrei` seine
    // Wertekopie zum Weiterverarbeiten — zwei Ausgaben, weil die Vorlage
    // zwei Blaetter hat und sie verschieden benutzt werden: eines wird
    // ausgedruckt, das andere weitergeschickt.
    ausgabe: z.enum([
      "druck",
      "status",
      "auswertung",
      "oldenburg",
      "log",
      "logfrei",
      "kosten",
      // Die Führungsharke (M8.3) — das Blatt „FüOrg“ der Excel.
      "fueorg",
      // Die Einheitenliste — das Blatt „Stärke“ als Ausdruck, die
      // Papier-Rückfallebene für Lagebesprechung und Rechnerausfall.
      "einheitenliste",
      // Druckbare Listen und der leere Papier-Vordruck (additiv): nur als HTML
      // und PDF; Anforderungen und Tagebuch tragen Seitenzahl und Notizspalte.
      "anforderungen",
      "tagebuch",
      "papier",
      // Die Ausgaben der Versorgung (S4, additiv): Belegungsliste je
      // Unterkunft, Bestellliste und Vorausschau für den Verpflegungsträger.
      "belegung",
      "bestellliste",
      "vorausschau",
      // Die Kraftstoffliste (S4.4): Liter je Einheit für den Tankwagen.
      "kraftstoff",
      // Der Funkplan (KONZEPT-FUNKPLAN.md §7, additiv): A4 hoch für den
      // Platz der Sprechfunker, mit leeren Zeilen zum Nachtragen.
      "funkplan",
      // Die Nachweisung (KONZEPT-NACHRICHTEN.md §7, additiv): A4 hoch, eine
      // Zeile je Nachricht nach Nummer — das Technische Betriebsbuch.
      "nachweisung",
    ]),
    format: z.enum(["html", "pdf", "xlsx"]),
    /** Nur beim Druck: der Organisationsfilter „Davon Staerke“ (`Druck!S4`). */
    organisation: z.string().optional(),
    /**
     * Additiv (LdF P2-5), nur bei `nachweisung`: der Ausschnitt einer Schicht
     * (ISO, beide einschließlich). Fehlt beides, kommen alle Nachrichten.
     */
    von: z.string().max(40).optional(),
    bis: z.string().max(40).optional(),
  }),

  // Der HTML-Monitor (M4.3): eine Datei in `ausgaben\`, die sich alle sechzig
  // Sekunden selbst neu laedt und die ein **zweites Geraet** ueber das Netz
  // oeffnet. Nicht zu verwechseln mit dem Staerke-Monitor aus M3.5: Der ist
  // ein Fenster dieser Anwendung auf einem zweiten Bildschirm, dieser hier
  // eine Datei fuer ein fremdes Geraet.
  z.object({
    art: z.literal("htmlMonitorSchalten"),
    akteId: zAkteId,
    an: z.boolean(),
    mitStatus: z.boolean().optional(),
    organisation: z.string().optional(),
  }),

  // ---- Der Staerke-Monitor (M3.5) -----------------------------------------
  //
  // Diese drei Rufe fassen als einzige ein **Fenster** an. Sie tragen deshalb
  // keine `akteId`: Der Monitor haengt nicht an einer Akte, sondern am
  // Arbeitsplatz — er zeigt, was dieses Fenster ohnehin geschoben bekommt.
  z.object({ art: z.literal("bildschirmeAuflisten") }),
  z.object({ art: z.literal("monitorOeffnen"), bildschirmId: z.string().optional() }),
  z.object({ art: z.literal("monitorSchliessen") }),
  // ---- Der Abschluss des Einsatzes ----------------------------------------
  //
  // Beenden und Wiedereröffnen gehen als gewöhnliche Bedienschritte über
  // `bedienen`. Das Archivieren hat einen eigenen Ruf, weil sein Ereignis
  // einen Beleg trägt, den nur der Worker bilden kann: den `zustandsHash`
  // der Lage, die archiviert wird (`snapshotHash`, KONZEPT-EREIGNISSE.md
  // §7). Ein Renderer, der ihn rechnete, hätte den Fachzustand.
  z.object({ art: z.literal("einsatzArchivieren"), akteId: zAkteId, zeitpunkt: zText }),
  // Die Einsatzakte (M4.4) als ZIP im Ordner des Einsatzes — derselbe Kern
  // wie `s1 akte exportiere`.
  z.object({ art: z.literal("akteErzeugen"), akteId: zAkteId }),
  // Eine erzeugte Datei öffnen, im Ordner zeigen oder drucken. Der Pfad ist
  // der, den `ausgabeErzeugen` oder `akteErzeugen` gemeldet hat; der Main
  // prüft, dass er im Ordner dieses Einsatzes liegt (`ausgabezeiger.ts`).
  z.object({
    art: z.literal("ausgabeZeigen"),
    akteId: zAkteId,
    pfad: zText,
    wie: z.enum(["oeffnen", "ordner", "drucken"]),
  }),
  // Das Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §9, additiv) nach dem
  // Muster von `tagebuchAnfordern`: Sicht, Stellen, Zustandsfilter, Suche,
  // Zeigerstand und Seitenlänge. Ohne `stellen` gelten die der Sitzung.
  z.object({
    art: z.literal("nachrichtenAnfordern"),
    akteId: zAkteId,
    sicht: z.enum(NACHRICHTEN_SICHTEN_LISTE),
    stellen: z.array(zStellenname).max(20).optional(),
    zustaende: z.array(z.enum(["NEU", "GELESEN", "ERLEDIGT"])).optional(),
    suche: z.string().max(200).optional(),
    von: z.number().int().min(0).optional(),
    anzahl: z.number().int().min(1).max(AUSSCHNITT_MAX).optional(),
    // Additiv (ETB P0-1): nur diese Nachricht, über die Kennung statt über Text.
    nachrichtId: zText.optional(),
    // Additiv (Sichter-Audit), Sicht „gesichtet": nur die Sichtungen dieses
    // Arbeitsplatzes oder des Handzeichens der Sitzung.
    nurEigeneSichtungen: z.boolean().optional(),
  }),
  // Additiv (ETB P0-1): eine einzelne Nachricht — „Nachricht öffnen" an der
  // Tagebuchzeile. Antwort: die Zeile oder `null`, wenn es sie nicht gibt.
  z.object({ art: z.literal("nachrichtAnfordern"), akteId: zAkteId, nachrichtId: zText }),
  // Schnitt N3 (KONZEPT-NACHRICHTEN.md §7, Entscheidung 7, additiv): der
  // Vordruck je Nachricht als PDF in `ausgaben\nachrichten`; die Drucker
  // dieses Rechners und die Ordnerwahl (nur Desktop); der Probedruck des
  // leeren Vordrucks an ein Ziel des Automatikdrucks.
  z.object({ art: z.literal("nachrichtVordruckErzeugen"), akteId: zAkteId, nachrichtId: zText, blatt: zVordruckBlatt }),
  z.object({ art: z.literal("druckerAuflisten") }),
  z.object({ art: z.literal("ordnerWaehlen"), titel: z.string().max(200).optional() }),
  // Additiv (FM P2-11): `anlegen` legt ein fehlendes Verzeichnis erst auf
  // ausdrückliche Rückfrage an; ohne meldet der Probedruck `verzeichnisFehlt`.
  z.object({ art: z.literal("probedruck"), ziel: zAutomatikdruckziel, anlegen: z.boolean().optional() }),
  // Additiv (FM P2-11): Gibt es das Druckverzeichnis, und lässt es sich
  // beschreiben? Für die Rückfrage „anlegen?“ beim Speichern der Druckeinstellungen;
  // `anlegen: true` legt es nach der Rückfrage an und prüft dann.
  z.object({ art: z.literal("verzeichnisPruefen"), pfad: z.string().max(1000), anlegen: z.boolean().optional() }),
  // Additiv (Sichter P1-4, ETB P3-3): Die Stelle abgeben — die Präsenz steht
  // sofort ohne Stellen und Handzeichen, mit `abgemeldet`. Der Worker tut es
  // auch selbst beim Schließen der Akte; die Web-Schale beim Verlassen der Seite.
  z.object({ art: z.literal("stelleAbgeben"), akteId: zAkteId }),
  z.object({
    art: z.literal("tagebuchAnfordern"),
    akteId: zAkteId,
    einheitId: z.string().optional(),
    abschnittId: z.string().optional(),
    suche: z.string().optional(),
    nurRuecknahmen: z.boolean().optional(),
    // Additiv (ETB P0-1): nur die Zeilen dieser Nachricht — Kennung, kein Teilstring.
    nachrichtId: z.string().optional(),
    von: z.number().int().min(0).optional(),
    anzahl: z.number().int().min(1).max(AUSSCHNITT_MAX).optional(),
  }),
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
  z.object({
    art: z.literal("geschrieben"),
    ereignisId: z.string(),
    /**
     * Additiv: Hinweise des Workers zu einem **geschriebenen** Schritt —
     * mögliche Dubletten (gleiche Kennung/gleicher Name im selben Elternteil),
     * Folgen („Einheit entfernt“) und Offenes. Klartext, deutsch, zur Anzeige
     * als Hinweis; das Schreiben selbst ist gelungen.
     */
    warnungen: z.array(z.string()).optional(),
    /**
     * Additiv (R2-ETB P3-1): die Stufe je Satz in `warnungen`, gleich lang und
     * in derselben Folge. „warnung“ heißt: bleibt im Hinweiskasten stehen,
     * bis jemand ihn schließt (doppelte Nummer, Prüfungen des Papier-Nachtrags,
     * Zurückziehen einer verteilten Nachricht); „info“ darf verfallen. Fehlt
     * das Feld, gilt für alle die bisherige Anzeige.
     */
    warnungStufen: z.array(z.enum(["info", "warnung"])).optional(),
    /**
     * Additiv: Nach „Eingetroffen“ zählt die abgelöste Einheit noch zur
     * Ist-Stärke. Der Worker ändert nichts; die Oberfläche kann fragen, ob
     * sie zurückgeführt wird.
     */
    abloesungOffen: zOffeneAbloesung.optional(),
  }),
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
  z.object({
    art: z.literal("brauchtGrund"),
    zielArt: z.string(),
    /**
     * Additiv (R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2): Der Schritt ist einer
     * Stelle vorbehalten, die die Sitzung nicht hat (Stellenvorbehalt,
     * Entscheidung 13) — „SICHTER“ oder „FMZ“. Der Renderer zeigt `hinweis`
     * mit „Trotzdem“ und ruft mit `grund` erneut. Bewusst nicht `meldung`:
     * Aufrufer erkennen Abweisungen an `"meldung" in ergebnis`.
     */
    stelle: z.string().optional(),
    hinweis: z.string().optional(),
  }),
  z.object({ art: z.literal("nichtMoeglich"), meldung: z.string() }),
]);
export type Bedienergebnis = z.infer<typeof zBedienergebnis>;

/**
 * Der Code einer Abweisung, weil der Einsatz beendet oder archiviert ist.
 *
 * Er steht im Kontrakt, weil beide Seiten ihn kennen: Der Worker weist mit
 * ihm ab, der Renderer macht daraus einen sichtbaren Hinweis — gleich, welche
 * Maske oder Zelle geschrieben hat. Viele Masken werten ein `abgewiesen` gar
 * nicht aus; ohne den zentralen Hinweis bliebe ein Schreibversuch nach dem
 * Einsatzende dort stumm.
 */
export const CODE_EINSATZ_ABGESCHLOSSEN = "EINSATZ_ABGESCHLOSSEN";

/** Der Code der Abweisung, weil ein anderer Arbeitsplatz das Feld inzwischen geändert hat. */
export const CODE_VORWERT = "VORWERT";

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
  demoEinsatzAnlegen: { readonly akteId: string; readonly einsatzId: string; readonly ordner: string };
  einsatzOeffnen: { readonly akteId: string; readonly einsatzId: string; readonly ordner: string };
  stellenSetzen: null;
  einsatzSchliessen: null;
  standAnfordern: null;
  sperre: null;
  bedienen: Bedienergebnis;
  zurueck: Bedienergebnis;
  undoStapel: readonly z.infer<typeof zStapelEintrag>[];
  baumAnfordern: Baumansicht;
  kostenAnfordern: Kostenansicht;
  versorgungAnfordern: Versorgungsansicht;
  funkplanAnfordern: Funkplanansicht;
  staerketafelAnfordern: Staerketafelansicht;
  stabsuebersichtAnfordern: Stabsuebersichtansicht;
  anforderungenAnfordern: Anforderungsansicht;
  fuestAnfordern: Fuestansicht;
  eingangskorbAnfordern: Eingangskorbansicht;
  /** `null`, wenn eine der beiden Fassungen fehlt oder ihren Bogen nicht mitfuehrt. */
  fassungsvergleichAnfordern: Fassungsvergleich | null;
  buendelEinlesen: Buendelergebnis;
  buendelSchreiben: Ausgabeergebnis;
  erfassungsboegenSchreiben: Erfassungsbogenergebnis;
  vokabelnKorrigieren: Vokabelkorrekturergebnis;
  programmstandPruefen: Programmbefund;
  programmpaketHolen: Bezugsbefund;
  diagnoseAnfordern: Diagnose;
  tabelleAnfordern: Tabellenansicht;
  untertabelleAnfordern: Untertabellenansicht;
  eebScan: EebStand;
  eebDatei: EebStand;
  eebUeberspringen: EebStand;
  eebZuruecksetzen: EebStand;
  eebUebernehmen: Uebernahmeergebnis;
  eebAlleUebernehmen: Sammeluebernahme;
  eebAbbrechen: null;
  ausgabeErzeugen: Ausgabeergebnis;
  /** Der Pfad der Monitordatei, oder `null` nach dem Ausschalten. */
  htmlMonitorSchalten: string | null;
  bildschirmeAuflisten: readonly Bildschirm[];
  monitorOeffnen: null;
  monitorSchliessen: null;
  tagebuchAnfordern: Tagebuchansicht;
  nachrichtenAnfordern: Nachrichtenansicht;
  /** Additiv (ETB P0-1): die Zeile einer Nachricht, oder `null`. */
  nachrichtAnfordern: Nachrichtenzeile | null;
  einsatzArchivieren: Bedienergebnis;
  akteErzeugen: Akteergebnis;
  ausgabeZeigen: null;
  nachrichtVordruckErzeugen: Ausgabeergebnis;
  druckerAuflisten: readonly Druckerangabe[];
  /** Der gewählte Ordner, oder `null`, wenn der Dialog abgebrochen wurde. */
  ordnerWaehlen: string | null;
  probedruck: Probedruckergebnis;
  verzeichnisPruefen: Verzeichnispruefung;
  stelleAbgeben: null;
}

/**
 * Die Antwort eines Ansichtsrufs traegt **immer** den Zeigerstand mit, zu dem
 * sie gebaut wurde.
 *
 * Ohne ihn haette der Renderer ein Wettrennen: Trifft ein Delta mit dem neuen
 * Zeiger ein, waehrend die Antwort auf den vorigen noch unterwegs ist, traegt
 * er ein aelteres Bild ueber ein neueres. Mit dem Stand in der Antwort ist der
 * Fall entscheidbar — und zwar im Renderer, ohne dass der Worker sich merken
 * muesste, welche Ansicht welchen Stand hat.
 */
export interface Ansichtsstand {
  readonly lageZeiger: number;
}

export interface Baumansicht extends Ansichtsstand {
  readonly baum: readonly Baumknoten[];
}

export interface Tabellenansicht extends Ansichtsstand, Tabellenausschnitt {
  /**
   * Additiv (Funkplan F1): die Auswahl der Spalten mit `werteAus` je
   * Spaltenschlüssel, gerechnet mit `projektion.auswahlwerte`. Die Rufgruppen
   * sind Daten des Einsatzes und keine feste Liste; der Renderer hat keinen
   * Zustand, aus dem er sie holen könnte. Fehlt das Feld, bietet die Zelle
   * nur „—" an.
   */
  readonly auswahlwerte?: { readonly [spalte: string]: readonly Zustandswahl[] };
}

/** Ein Eintrag einer Auswahl aus dem Zustand; bei Rufgruppen mit Betriebsart für die Marke „DMO". */
export interface Zustandswahl extends Auswahlwert {
  readonly betriebsart?: string;
}

/**
 * Was die Pruefung des Programmordners ergeben hat (M7.2).
 *
 * `keinManifest` ist **kein Fehler**: Auf den meisten Shares liegt keines,
 * und ein Fehlerbild dafuer waere eine Meldung ueber einen Normalzustand.
 */
export type Programmbefund =
  | { readonly art: "keinManifest"; readonly ordner: string }
  | { readonly art: "aktuell"; readonly laufend: string }
  | {
      readonly art: "verfuegbar";
      readonly version: string;
      readonly datei: string;
      readonly pfad: string;
      readonly groesse: number;
      readonly veroeffentlicht: string;
      readonly hinweis?: string;
      readonly kurzform: string;
    }
  | { readonly art: "abgelehnt"; readonly grund: string; readonly meldung: string };

/**
 * Eine Zeile des Protokolls, wie die Diagnoseansicht sie zeigt (M7.3).
 *
 * Sie kommt aus dem Ringpuffer der Schale und nicht aus der Datei: Die Datei
 * liegt im Benutzerprofil und kann vier Megabyte gross sein; gefragt ist,
 * was zuletzt schiefging.
 */
export interface Protokollzeile {
  readonly wanduhr: string;
  readonly stufe: "info" | "warnung" | "fehler";
  readonly text: string;
}

/**
 * Was die Diagnoseansicht ueber diesen Arbeitsplatz weiss (M7.3).
 *
 * **Warum Pfade und keine Inhalte.** Die Ansicht sagt, **wo** die
 * Protokolldatei liegt, und zeigt die letzten Meldungen aus dem Speicher.
 * Sie liest die Datei nicht in den Renderer: Ein Protokoll von vier Megabyte
 * ueber die IPC-Grenze zu tragen, um zwanzig Zeilen zu zeigen, waere derselbe
 * Fehler wie ein Ansichtsruf ohne Ausschnitt (Entscheidung 10).
 */
export interface Diagnose {
  readonly plattform: string;
  readonly electron: string;
  readonly programmversion: string;
  readonly rechnername: string;
  readonly benutzer: string;
  readonly clientId: string;
  /** Der Ort der Protokolldatei — die Frage, die im Stoerfall zuerst kommt. */
  readonly protokolldatei: string;
  readonly einstellungsdatei: string;
  /** Die Wurzel des lokalen Spiegels (§1.3) — sie darf geloescht werden. */
  readonly spiegelwurzel: string;
  readonly sharePfad: string;
  /** Ob der Sharepfad in diesem Augenblick als Ordner lesbar ist. */
  readonly shareLesbar: boolean;
  /** Die eigene Wanduhr im Augenblick der Auskunft — Bezug jeder Abweichung. */
  readonly wanduhr: string;
  readonly letzteMeldungen: readonly Protokollzeile[];
}

/**
 * Was beim Holen eines Pakets herauskam (M9.1).
 *
 * `aktuell` ist **kein** Fehler und der haeufigste Fall: Es gibt nichts
 * Neueres als das, was schon laeuft oder schon im Share liegt.
 */
export type Bezugsbefund =
  | {
      readonly art: "geholt";
      readonly version: string;
      readonly datei: string;
      readonly groesse: number;
      readonly pfad: string;
      readonly kurzform: string;
    }
  | { readonly art: "aktuell"; readonly vorhanden: string }
  | { readonly art: "abgelehnt"; readonly grund: string; readonly meldung: string };

/** Was beim Einlesen einer Buendeldatei herauskam (M6.3). */
export interface Buendelergebnis {
  /** So viele Meldungen sind neu in die Akte gekommen. */
  readonly aufgenommen: number;
  /**
   * So viele waren schon da.
   *
   * §3.6: Derselbe Bogen ergibt dieselbe `meldungId` und damit **eine**
   * Meldung. Ein zweimal eingelesenes Buendel ist deshalb kein Fehler,
   * sondern ein Vorgang ohne Wirkung — und das ist die Auskunft, die der
   * Bediener braucht.
   */
  readonly bekannt: number;
  /** Eintraege, die die Datei fuehrt und die nicht lesbar waren. */
  readonly uebersprungen: number;
  readonly name: string;
  /**
   * Additiv: Warum nichts oder nicht alles aufgenommen wurde — Klartext je
   * Ursache (Datei nicht lesbar, falsches Format, Einträge unlesbar, Schreiben
   * abgewiesen). Leer oder fehlend, wenn alles in Ordnung war.
   */
  readonly abgelehnt?: readonly { readonly grund: string }[];
}

/** Der Eingangskorb des Meldekopfs (M6.1) — mit Ausschnitt, wie jede Liste. */
export interface Eingangskorbansicht extends Ansichtsstand, Meldungsausschnitt {}

/** Das Blatt der Fuehrungsstelle (M5.4): Dienstposten, Summen und Schichtplan. */
export interface Fuestansicht extends Ansichtsstand {
  readonly bloecke: readonly Teilbereichsblock[];
  readonly plan: Schichtplanblatt;
  /** K17: je Teileinheit und Schicht die Staerke der besetzten Posten. */
  readonly staerke: readonly {
    readonly teileinheit: string;
    readonly schicht: string;
    readonly staerke: { readonly fuehrer: number; readonly unterfuehrer: number; readonly mannschaft: number };
  }[];
}

/** Die Anforderungsliste (M5.3) — mit Ausschnitt, wie jede Liste (M3.7). */
export interface Anforderungsansicht extends Ansichtsstand, Anforderungsausschnitt {}

/** Die Kostenuebersicht (M5.2) — Parameter, Zeilen, Summe. */
export interface Kostenansicht extends Ansichtsstand {
  readonly blatt: Kostenblatt;
}

/** Ein Bereich zur Wahl in der Maske der Rufgruppe, in der Ordnung des Abschnittsbaums. */
export interface Funkplanbereich {
  readonly abschnittId: string;
  readonly name: string;
  readonly tiefe: number;
}

/**
 * Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5) — `projektion.funkplan`,
 * mit `suche` auf die passenden Teilnehmer zugeschnitten; `plan.zahlen` gilt
 * immer für den ganzen Einsatz.
 */
export interface Funkplanansicht extends Ansichtsstand {
  readonly plan: Funkplan;
  /** Die geltenden Bereiche ohne Systemabschnitte — der optionale Bereichsbezug der Rufgruppe. */
  readonly bereiche: readonly Funkplanbereich[];
  /**
   * F3: die Uhr des Workers, gegen die der letzte Kontakt und die Schwelle
   * (`plan.schwelleMinuten`) gerechnet sind (ISO).
   */
  readonly jetzt: string;
  /**
   * F3: die jüngsten Funkproben (höchstens `FUNKPROBEN_GRENZE`), jüngste
   * zuerst, mit der Suche zugeschnitten — die Sicht „Funkproben".
   */
  readonly funkproben: readonly Funkprobenzeile[];
}

/** Das Blatt „Versorgung" (S4.1) — aus derselben Projektion wie `Lagebild.versorgung`. */
export interface Versorgungsansicht extends Ansichtsstand {
  /** Der Zeitpunkt, für den gerechnet wurde (ISO). */
  readonly jetzt: string;
  readonly blatt: Versorgungsblatt;
  /** Das Logistikblatt unverändert (Bereiche · Schichten, Tafel 4c). */
  readonly logistik: Logistikblatt;
  /** Die Fußnote des Blattes „Log" (`LOG_FUSSNOTE`), wörtlich wie auf Papier. */
  readonly logistikFussnote: string;
}

/** Die Stärketafeln des Sachgebiets 1 (Monitor: Abschnitte, Organisationen). */
export interface Staerketafelansicht extends Ansichtsstand {
  readonly tafel: Staerketafel;
}

/** Die Stabsübersicht: Kräfte nach Status je Abschnitt (Teilbaum) und alle Aufträge. */
export interface Stabsuebersichtansicht extends Ansichtsstand {
  readonly uebersicht: Stabsuebersicht;
}

export interface Untertabellenansicht extends Ansichtsstand, Untertabelle {
  readonly einheitId: string;
}

/**
 * Was der Renderer ueber den Sammelstand eines Bogens erfaehrt (M3.4).
 *
 * **Kein einziges Byte des Bogens.** Der Renderer bekommt den Fortschritt
 * („Teil 2 von 3“), den Signaturbefund und eine Vorschau in Klartext — genug,
 * um zu entscheiden, ob uebernommen wird. Die Byte-Abschnitte bleiben im
 * Worker: Sie sind nur mit dem Codec zu deuten, und der liegt dort.
 */
export interface EebStand {
  readonly art: "leer" | "unlesbar" | "gesammelt" | "duplikat" | "fremd" | "vollstaendig";
  readonly haben: number;
  readonly anzahl: number;
  readonly meldung?: string;
  /**
   * Wie viele weitere Boegen aus einer eingelesenen Datei noch anstehen.
   * Fehlt beim Handscanner — der liefert einen Bogen nach dem anderen.
   */
  readonly wartend?: number;
  /** Nur bei `vollstaendig` — der Bogen in Klartext, so weit die Maske ihn zeigt. */
  readonly vorschau?: EebVorschau;
}

export interface EebVorschau {
  readonly meldungId: string;
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly herkunft: string;
  readonly ebene: string;
  readonly staerke: { readonly fuehrer: number; readonly unterfuehrer: number; readonly mannschaft: number };
  readonly personen: number;
  readonly fahrzeuge: number;
  readonly stand: string;
  /** §5.8.1: Der Befund wird **angezeigt**, er entscheidet nichts. */
  readonly signatur: "unsigniert" | "gueltig" | "ungueltig";
  readonly signaturKurzform?: string;
  readonly absender?: string;
  readonly bemerkung?: string;
}

/**
 * Wo eine erzeugte Ausgabe liegt (M4.1).
 *
 * Der Pfad ist absolut und zeigt in den Ordner `ausgaben\` des Einsatzes
 * (KONZEPT-SPEICHER.md §1.4). Er geht an den Renderer zurueck, damit die
 * Oberflaeche sagen kann, **wohin** geschrieben wurde — ein „fertig“ ohne
 * Pfad zwingt den Bediener, danach zu suchen.
 */
/**
 * Der Ausgang der Vokabularkorrektur.
 *
 * Ein Abbruch mittendrin lässt das Geschriebene stehen (append-only); der
 * nächste Lauf findet nur noch, was fehlt.
 */
export type Vokabelkorrekturergebnis =
  | { readonly art: "korrigiert"; readonly einheiten: number; readonly ereignisse: number }
  | { readonly art: "abgewiesen"; readonly meldung: string; readonly ereignisse: number };

export interface Ausgabeergebnis {
  readonly pfad: string;
  readonly bytes: number;
  /**
   * Additiv (N3, Entscheidung 9): weitere Dateien derselben Ausgabe — der
   * Papier-Vordruck legt den leeren Nachrichtenvordruck als eigenes PDF
   * daneben, weil er kein HTML ist.
   */
  readonly weitere?: readonly { readonly pfad: string; readonly bytes: number }[];
}

/** Ein Drucker dieses Rechners (`webContents.getPrintersAsync`). `name` ist der Systemname, den `print` verlangt. */
export interface Druckerangabe {
  readonly name: string;
  readonly anzeigename: string;
}

/** Wohin der Probedruck ging (Entscheidung 7). */
export type Probedruckergebnis =
  | { readonly art: "verzeichnis"; readonly pfad: string; readonly bytes: number }
  | { readonly art: "drucker"; readonly name: string }
  /**
   * Additiv (FM P2-11): Das Verzeichnis gibt es nicht. Nichts wurde
   * angelegt; `anlegen: true` sagt, dass ein zweiter Ruf mit `anlegen: true`
   * es anlegt und dann druckt.
   */
  | { readonly art: "verzeichnisFehlt"; readonly pfad: string; readonly meldung: string; readonly anlegen: true };

/** Was `verzeichnisPruefen` über ein Druckverzeichnis weiß (FM P2-11). */
export interface Verzeichnispruefung {
  readonly vorhanden: boolean;
  /** Nur bei einem vorhandenen Verzeichnis: ob eine Probedatei sich schreiben ließ. */
  readonly beschreibbar?: boolean;
}

/**
 * Was der Sammel-Download der Erfassungsbögen geschrieben hat.
 *
 * `pfad` fehlt, wenn keine der gewählten Einheiten einen Bogen hat — eine
 * leere Datei wäre ein Fund ohne Inhalt. `ohneBogen` nennt die Einheiten, die
 * von Hand angelegt wurden und deshalb fehlen.
 */
export interface Erfassungsbogenergebnis {
  readonly pfad?: string;
  readonly bytes: number;
  readonly boegen: number;
  readonly ohneBogen: readonly string[];
}

/**
 * Wo die Einsatzakte liegt und was sie trägt (M4.4).
 *
 * `befunde` ist die Zahl der endgültigen Befunde nach §8.2, die beim Packen
 * offen waren — die Akte wird trotzdem geschrieben, weil sie gerade dann
 * gebraucht wird; die Oberfläche sagt es dazu.
 */
export interface Akteergebnis extends Ausgabeergebnis {
  readonly ereignisse: number;
  readonly befunde: number;
  /**
   * Additiv (ETB P1-5): die Vordruck-PDFs der Nachrichten, die vor dem Packen
   * fehlten und jetzt erzeugt wurden, die schon lagen, und Beilagen, die
   * nicht geschrieben werden konnten. Fehlt, wenn der Einsatz keine
   * Nachrichten führt.
   */
  readonly nachrichtenbeilagen?: {
    readonly erzeugt: number;
    readonly vorhanden: number;
    readonly fehlgeschlagen: number;
    /** Additiv (R2-ETB P2-1): Vordrucke zurückgezogener Nachrichten, mit Stempel neu geschrieben. */
    readonly gestempelt?: number;
    /** Additiv (R2-ETB P2-7): das Handzeichenverzeichnis liegt der Akte bei. */
    readonly handzeichenverzeichnis?: boolean;
  };
}

/**
 * Ein angeschlossener Bildschirm — die Auswahl fuer den Staerke-Monitor.
 *
 * `id` kommt vom Betriebssystem und ist zwischen zwei Starts **nicht**
 * stabil; sie wird deshalb nicht gemerkt. Was gemerkt werden koennte, waere
 * die Reihenfolge — und die aendert sich, sobald jemand ein Kabel umsteckt.
 * Die Wahl ist ein Handgriff je Einsatz und kein Einstellungswert.
 */
export interface Bildschirm {
  readonly id: string;
  readonly name: string;
  readonly breite: number;
  readonly hoehe: number;
  readonly primaer: boolean;
}

/** Der Ausgang einer Uebernahme — mehrere Ereignisse, ein Ergebnis. */
export type Uebernahmeergebnis =
  | {
      readonly art: "uebernommen";
      readonly einheitId: string;
      readonly ereignisse: number;
      /**
       * Nur bei einer Revision einer Einheit, die in einem **anderen** als dem
       * gewaehlten Abschnitt steht: Sie bleibt dort, die Uebernahme
       * verschiebt sie nicht.
       */
      readonly bereitsIn?: string;
      /** Die Einheit war entfernt und ist mit diesem Bogen zurueck (im gewaehlten Abschnitt). */
      readonly wiederhergestellt?: true;
      /** Der naechste Bogen derselben Datei, wenn noch einer ansteht. */
      readonly naechster?: EebStand;
    }
  | { readonly art: "nichtMoeglich"; readonly meldung: string }
  | { readonly art: "abgewiesen"; readonly meldung: string; readonly beiEreignis: string };

/**
 * Der Ausgang des Massenimports: Jeder Bogen geht einzeln durch dieselbe
 * Uebernahme wie per Knopf. Ein abgewiesener Bogen haelt die anderen nicht
 * auf; er steht mit Grund in `fehlgeschlagen`.
 */
export interface Sammeluebernahme {
  readonly uebernommen: number;
  readonly ereignisse: number;
  readonly fehlgeschlagen: readonly { readonly bezeichnung: string; readonly meldung: string }[];
  /**
   * Boegen zu Einheiten, die schon erfasst waren: Sie wurden aktualisiert und
   * stehen weiter in ihrem bisherigen Abschnitt, nicht im gewaehlten.
   */
  readonly aktualisiert?: readonly { readonly bezeichnung: string; readonly abschnitt: string }[];
  /** Frueher entfernte Einheiten, die der Import zurueckgeholt hat. */
  readonly wiederhergestellt?: readonly string[];
  /** Der Bediener hat abgebrochen; was noch offen ist, wartet weiter. */
  readonly abgebrochen?: boolean;
  /** Bei Abbruch: der Bogen, der jetzt in der Maske steht. */
  readonly naechster?: EebStand;
}

/**
 * Das Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §6, §9): der Ausschnitt
 * einer Sicht mit Gesamtzahl, wie `projektion.nachrichtenausschnitt` ihn
 * liefert, dazu die Uhr des Workers und die Anschriften zur Auswahl in der
 * Maske (Abschnitte und Einheiten des Einsatzes; die besetzten Stellen stehen
 * an den Peers).
 */
/** Eine Einheit der Lage als Gegenstelle der Beförderung. */
export interface Gegenstelle {
  readonly einheitId: string;
  readonly name: string;
  /** Additiv: die geltende Hauptrufgruppe der Einheit — Vorbelegung der Rufgruppe beim Kontakt. */
  readonly rufgruppeId?: string;
  /** Additiv: der Funkrufname (K31), damit die Gegenstelle „Heros Oldenburg 22“ die Einheit findet. */
  readonly funkrufname?: string;
}

/** Additiv: eine geltende Rufgruppe zur Wahl beim Kontakt einer Nachricht. */
export interface Rufgruppenwahl {
  readonly rufgruppeId: string;
  readonly name: string;
}

export interface Nachrichtenansicht extends Ansichtsstand, Nachrichtenausschnitt {
  readonly jetzt: string;
  readonly anschriften: readonly string[];
  /**
   * Additiv: die Einheiten der Lage als mögliche Gegenstellen der
   * Beförderung — mit Kennung, damit der Funkplan den Kontakt bekommt.
   */
  readonly gegenstellen?: readonly Gegenstelle[];
  /** Additiv: die geltenden Rufgruppen in der Ordnung des Funkplans, für den Kontakt beim Aufnehmen und Befördern. */
  readonly rufgruppen?: readonly Rufgruppenwahl[];
  /**
   * Additiv (Schnitt N2, §6 „Papier-Rückfall"): die Vorbelegung der
   * Nachweisungsnummer, höchste bekannte plus eins (Entscheidung 1: Eingang
   * und Ausgang gemeinsam).
   */
  readonly naechsteNummer?: number;
  /** Additiv (N2, §9): die vergebenen Nummern — die Maske warnt vor einer doppelten, sie sperrt nicht. */
  readonly vergebeneNummern?: readonly number[];
  /** Additiv (N2, §6): die Zahlen hinter den Chips des Posteingangs, für die Stellen der Anfrage. */
  readonly zaehlung?: Readonly<Record<"NEU" | "GELESEN" | "ERLEDIGT", number>> & { readonly OFFEN?: number };
  /** Additiv (LdF P2-2): die fehlenden Nummern zwischen 1 und der höchsten, für den Fuß der Nachweisung. */
  readonly nummernluecken?: readonly number[];
  /**
   * Additiv (R2-LdF P1-2 alt, P2-3), nur bei der Sicht `fmz`: die Karte
   * „Ohne Nummer“ — beförderte Ausgänge **und** aufgenommene Eingänge ohne
   * Nummer der Nachweisung, nicht zurückgezogen (`projektion.ohneNummerZeilen`).
   */
  readonly ohneNummer?: readonly Nachrichtenzeile[];
  /**
   * Additiv (R2-LdF P3-4): die Auswahl „Fernmelder“ im Vorschlag des LdF.
   * Seit 2026-11-21 Fm1 bis Fm3 (die Stellen FM1 bis FM3), danach die
   * Anzeigenamen der Plätze mit dem Altwert FMZ.
   */
  readonly fernmelder?: readonly string[];
  /** Additiv (2026-11-21): je Fernmelder („Fm2“) die Anzeigenamen der Plätze, die die Stelle besetzen. */
  readonly fernmelderbesetzung?: Readonly<Record<string, string>>;
}

export interface Tagebuchansicht extends Ansichtsstand {
  readonly zeilen: readonly Tagebuchzeile[];
  /** Wie viele Zeilen der Filter insgesamt trifft — die Zahl unter der Liste. */
  readonly gesamtzahl: number;
  readonly von: number;
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
    /**
     * Additiv (KONZEPT-NACHRICHTEN.md Entscheidung 6): Der Hinweis gilt einer
     * Blitz-Nachricht; der Renderer spielt dann einen kurzen Ton, sofern er
     * in den Einstellungen nicht abgeschaltet ist.
     */
    ton: z.literal("blitz").optional(),
  }),
  /** Die Akte hat sich geschlossen — Ordner fort (§5.7) oder Bediener. */
  z.object({ art: z.literal("akteGeschlossen"), akteId: zAkteId, meldung: z.string() }),
  /**
   * Der Stand eines laufenden Massenimports (`eebAlleUebernehmen`): `fertig`
   * von `gesamt` Boegen sind abgearbeitet, uebernommen oder abgewiesen.
   */
  z.object({
    art: z.literal("eebFortschritt"),
    akteId: zAkteId,
    fertig: z.number().int().min(0),
    gesamt: z.number().int().min(0),
  }),
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
 * Frage „hat sich die Statuszeile geaendert“ ist es genau richtig und um
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
