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

import type {
  Anforderungsausschnitt,
  Baumknoten,
  Kostenblatt,
  Fassungsvergleich,
  Meldungsausschnitt,
  Schichtplanblatt,
  Tabellenausschnitt,
  Tagebuchzeile,
  Teilbereichsblock,
  Untertabelle,
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
 * genau das ist ihr Zweck: Eine Statuszeile, die „Share erreichbar“ zeigt,
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
  /** Wie viele Schritte „rueckgaengig“ noch gehen (§6 U3). */
  undoTiefe: z.number().int().min(0),
  undoObersteArt: z.string().optional(),
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

  // Der Update-Weg (M7.2). **Ohne Akte**: Er haengt am Share und nicht an
  // einem Einsatz — geprueft wird auch dann, wenn keine Akte offen ist.
  z.object({ art: z.literal("programmstandPruefen") }),
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
  z.object({ art: z.literal("eebZuruecksetzen"), akteId: zAkteId }),
  z.object({
    art: z.literal("eebUebernehmen"),
    akteId: zAkteId,
    abschnittId: zText,
  }),

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
    ausgabe: z.enum(["druck", "status", "auswertung", "oldenburg", "log", "logfrei", "kosten"]),
    format: z.enum(["html", "pdf", "xlsx"]),
    /** Nur beim Druck: der Organisationsfilter „Davon Staerke“ (`Druck!S4`). */
    organisation: z.string().optional(),
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
  z.object({
    art: z.literal("tagebuchAnfordern"),
    akteId: zAkteId,
    einheitId: z.string().optional(),
    abschnittId: z.string().optional(),
    suche: z.string().optional(),
    nurRuecknahmen: z.boolean().optional(),
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
  baumAnfordern: Baumansicht;
  kostenAnfordern: Kostenansicht;
  anforderungenAnfordern: Anforderungsansicht;
  fuestAnfordern: Fuestansicht;
  eingangskorbAnfordern: Eingangskorbansicht;
  /** `null`, wenn eine der beiden Fassungen fehlt oder ihren Bogen nicht mitfuehrt. */
  fassungsvergleichAnfordern: Fassungsvergleich | null;
  buendelEinlesen: Buendelergebnis;
  buendelSchreiben: Ausgabeergebnis;
  programmstandPruefen: Programmbefund;
  tabelleAnfordern: Tabellenansicht;
  untertabelleAnfordern: Untertabellenansicht;
  eebScan: EebStand;
  eebZuruecksetzen: EebStand;
  eebUebernehmen: Uebernahmeergebnis;
  ausgabeErzeugen: Ausgabeergebnis;
  /** Der Pfad der Monitordatei, oder `null` nach dem Ausschalten. */
  htmlMonitorSchalten: string | null;
  bildschirmeAuflisten: readonly Bildschirm[];
  monitorOeffnen: null;
  monitorSchliessen: null;
  tagebuchAnfordern: Tagebuchansicht;
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

export interface Tabellenansicht extends Ansichtsstand, Tabellenausschnitt {}

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
export interface Ausgabeergebnis {
  readonly pfad: string;
  readonly bytes: number;
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
  | { readonly art: "uebernommen"; readonly einheitId: string; readonly ereignisse: number }
  | { readonly art: "nichtMoeglich"; readonly meldung: string }
  | { readonly art: "abgewiesen"; readonly meldung: string; readonly beiEreignis: string };

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
