/**
 * Die abgeleiteten Kennzahlen K1 bis K30 (Zieldatenmodell §3.3).
 *
 * **Keine Kennzahl wird gespeichert.** v1 haelt `aktuelleStaerke` neben
 * `aktuelleStaerkeTaktisch` und muss beide bei jedem Schreibzugriff
 * gegeneinander pruefen; in einem verteilten Ereignismodell ist jede
 * redundante Speicherung eine moegliche Divergenz zwischen Clients. Hier sind
 * es reine Funktionen ueber den gefalteten Zustand — jeder Client rechnet sie
 * aus derselben Grundlage gleich aus.
 *
 * **Gerechnet wird mit `wirksameStaerke`, also geklemmt.** Der ungeklemmte
 * Wert ist die Bilanzgroesse fuer P4 (KONZEPT-EREIGNISSE.md §8.1) und taucht
 * in keiner Kennzahl auf: Eine negative Zahl ist kein Lagebild, sondern ein
 * Buchungssaldo (§1.2 dort).
 *
 * **„Zaehlt / zaehlt nicht" ist ein Attribut des Abschnittstyps**, kein
 * Sonderfall im Auswertungscode. Sonst wanderte `if (abschnitt.name ===
 * "Angefordert")` in zwanzig Auswertungen (ZDM §3.3, Entscheidung 2).
 */

import { STAERKE_NULL, staerkePlus, type Staerke, type Zeitpunkt } from "./werte.js";
import type {
  AnforderungZustand,
  EinheitZustand,
  MeldungZustand,
  Zustand,
} from "./zustand.js";

// ---------------------------------------------------------------------------
// Attribute der Abschnittstypen (ZDM §2.4)
// ---------------------------------------------------------------------------

/** `ANGEFORDERT` ist der einzige Typ mit abweichenden Zaehlregeln (ZDM §2.4). */
export const ANGEFORDERT = "ANGEFORDERT";

/** Typen, die im Druck erscheinen — alles ausser `ANGEFORDERT`, `EINGANG` und `ARCHIV`. */
const NICHT_IM_DRUCK: ReadonlySet<string> = new Set([ANGEFORDERT, "EINGANG", "ARCHIV"]);

/** Typen, deren Einheiten in die Kosten eingehen — dieselben wie in der Gesamtstaerke. */
const NICHT_IN_KOSTEN: ReadonlySet<string> = new Set([ANGEFORDERT, "EINGANG", "ARCHIV"]);

function typDesAbschnitts(zustand: Zustand, abschnittId: string): string {
  const wert = zustand.abschnitte[abschnittId]?.typ.wert;
  // Ein **unbekannter** Typ zaehlt wie `EINSATZORT` (KONZEPT-EREIGNISSE §3.7);
  // dieselbe Wahl gilt hier fuer Druck und Kosten.
  return typeof wert === "string" ? wert : "EINSATZORT";
}

// ---------------------------------------------------------------------------
// Die drei Mengen aus ZDM §3.3
// ---------------------------------------------------------------------------

/** Alles, was ueberhaupt in der Lage steht: weder entfernt noch wirksam aufgegangen. */
function inDerLage(einheit: EinheitZustand): boolean {
  return einheit.entfernt?.wert !== true && !einheit.wirksamAufgegangen;
}

/** `E` — Einheiten des Einsatzes ohne Abschnittstyp `ARCHIV`. */
export function einheitenDerLage(zustand: Zustand): EinheitZustand[] {
  return Object.values(zustand.einheiten).filter(
    (e) => inDerLage(e) && typDesAbschnitts(zustand, e.wirksamerAbschnittId) !== "ARCHIV",
  );
}

/** `E*` — Einheiten in Abschnitten mit `zaehltInGesamtstaerke`. */
export function einheitenDerGesamtstaerke(zustand: Zustand): EinheitZustand[] {
  return Object.values(zustand.einheiten).filter((e) => e.zaehlt);
}

/** `E_A` — Einheiten im **wirksamen** Abschnitt `A`. */
export function einheitenImAbschnitt(zustand: Zustand, abschnittId: string): EinheitZustand[] {
  return einheitenDerLage(zustand).filter((e) => e.wirksamerAbschnittId === abschnittId);
}

function summiere(einheiten: readonly EinheitZustand[]): Staerke {
  return einheiten.reduce<Staerke>(
    (summe, e) => staerkePlus(summe, e.wirksameStaerke),
    STAERKE_NULL,
  );
}

// ---------------------------------------------------------------------------
// K1 bis K3 — Staerkesummen
// ---------------------------------------------------------------------------

/** **K1** — die Gesamtstaerke einer Einheit: `fuehrer + unterfuehrer + mannschaft`. */
export function gesamtstaerke(einheit: EinheitZustand): number {
  const s = einheit.wirksameStaerke;
  return s.fuehrer + s.unterfuehrer + s.mannschaft;
}

/** **K2** — die Staerke eines Abschnitts, je Rolle. */
export function abschnittStaerke(zustand: Zustand, abschnittId: string): Staerke {
  return summiere(einheitenImAbschnitt(zustand, abschnittId));
}

/**
 * **K3** — die Gesamtstaerke des Einsatzes, je Rolle, mit `ANGEFORDERT`
 * **separat** ausgewiesen.
 *
 * Die Trennung ist der Sinn der Kennzahl: Wer angefordert ist, ist noch nicht
 * da. Sie steht deshalb im Ergebnis daneben und nicht in der Summe.
 */
export function einsatzGesamtstaerke(zustand: Zustand): {
  readonly gesamt: Staerke;
  readonly angefordert: Staerke;
} {
  const angefordert = einheitenDerLage(zustand).filter(
    (e) => typDesAbschnitts(zustand, e.wirksamerAbschnittId) === ANGEFORDERT,
  );
  return {
    gesamt: summiere(einheitenDerGesamtstaerke(zustand)),
    angefordert: summiere(angefordert),
  };
}

// ---------------------------------------------------------------------------
// K4 bis K6 — Logistik
// ---------------------------------------------------------------------------

export interface Logistikzahlen {
  readonly weiblich: number;
  readonly divers: number;
  readonly maennlich: number;
  readonly vegetarisch: number;
  readonly vegan: number;
}

interface Personenmerkmal {
  readonly geschlecht?: string;
  readonly ernaehrung?: string;
}

function personenDer(zustand: Zustand, einheitId: string): Personenmerkmal[] {
  return Object.values(zustand.personen)
    .filter((p) => p.einheitId?.wert === einheitId && p.entfernt?.wert !== true)
    .map((p) => ({
      geschlecht: typeof p.geschlecht?.wert === "string" ? p.geschlecht.wert : undefined,
      ernaehrung: typeof p.ernaehrung?.wert === "string" ? p.ernaehrung.wert : undefined,
    }));
}

function override(einheit: EinheitZustand, feld: string): number | undefined {
  const wert = einheit.logistik[feld]?.wert;
  return typeof wert === "number" ? wert : undefined;
}

/**
 * **K4** und **K5** — die Logistikzahlen einer Einheit.
 *
 * `logistikOverride` sticht die Zaehlung ueber die Personen: Wer nur die
 * Staerke erfasst (`personalErfassung = NUR_STAERKE`), hat keine Personen, und
 * die Zaehlung ergaebe null, wo jemand eine Zahl gemeldet hat. **K5** leitet
 * `maennlich` als Rest ab — so wie `Log!I7` es tut; es ist eine Kennzahl und
 * kein Feld (ZDM §3.2 Nr. 2).
 */
export function logistik(zustand: Zustand, einheit: EinheitZustand): Logistikzahlen {
  const personen = personenDer(zustand, einheit.id);
  const zaehle = (treffer: (p: Personenmerkmal) => boolean): number =>
    personen.filter(treffer).length;

  const weiblich = override(einheit, "weiblich") ?? zaehle((p) => p.geschlecht === "WEIBLICH");
  const divers = override(einheit, "divers") ?? zaehle((p) => p.geschlecht === "DIVERS");
  return {
    weiblich,
    divers,
    maennlich: gesamtstaerke(einheit) - weiblich - divers,
    vegetarisch: override(einheit, "vegetarisch") ?? zaehle((p) => p.ernaehrung === "VEGETARISCH"),
    vegan: override(einheit, "vegan") ?? zaehle((p) => p.ernaehrung === "VEGAN"),
  };
}

/**
 * **K6** — der Uebernachtungsbedarf, aufgeteilt nach m/w/d.
 *
 * Ohne `sofortbedarf.unterbringung` ist er null; ein Override sticht auch das,
 * denn er ist die ausdrueckliche Meldung eines Bedieners.
 */
export function uebernachtung(
  zustand: Zustand,
  einheit: EinheitZustand,
): { readonly m: number; readonly w: number; readonly d: number } {
  const zahlen = logistik(zustand, einheit);
  const bedarf = einheit.sofortbedarf?.wert as { unterbringung?: boolean } | null | undefined;
  const gewuenscht = bedarf?.unterbringung === true;
  return {
    m: override(einheit, "uebernachtungM") ?? (gewuenscht ? zahlen.maennlich : 0),
    w: override(einheit, "uebernachtungW") ?? (gewuenscht ? zahlen.weiblich : 0),
    d: override(einheit, "uebernachtungD") ?? (gewuenscht ? zahlen.divers : 0),
  };
}

// ---------------------------------------------------------------------------
// K7 und K8 — Druck
// ---------------------------------------------------------------------------

/** **K7** — ein Abschnitt erscheint im Druck, wenn er Kraefte traegt und sein Typ es zulaesst. */
export function imDruckSichtbar(zustand: Zustand, abschnittId: string): boolean {
  const staerke = abschnittStaerke(zustand, abschnittId);
  const gesamt = staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
  return gesamt > 0 && !NICHT_IM_DRUCK.has(typDesAbschnitts(zustand, abschnittId));
}

/**
 * **K8** — die Plausibilitaetsprobe des Druckblatts.
 *
 * `Σ(Fü) + Σ(UFü) + Σ(He) − Σ(Gesamt) = 0`. Sie kann in dieser Umsetzung nicht
 * fehlschlagen, weil beide Seiten aus denselben drei Rollen gebildet werden —
 * anders als in der Excel, wo sie getrennt gepflegt sind. Sie steht trotzdem
 * hier: Der Druck zeigt sie, und ein Verbraucher, der sie selbst nachrechnet,
 * soll dieselbe Formel benutzen.
 */
export function druckPlausibel(zustand: Zustand): boolean {
  const { gesamt } = einsatzGesamtstaerke(zustand);
  const summe = gesamt.fuehrer + gesamt.unterfuehrer + gesamt.mannschaft;
  const koepfe = einheitenDerGesamtstaerke(zustand).reduce((s, e) => s + gesamtstaerke(e), 0);
  return summe - koepfe === 0;
}

// ---------------------------------------------------------------------------
// K9 bis K12 — Texte und Verweise
// ---------------------------------------------------------------------------

const alsText = (wert: unknown): string | undefined =>
  typeof wert === "string" && wert.length > 0 ? wert : undefined;

/**
 * **K9** — die Erreichbarkeit einer Einheit, in drei Stufen.
 *
 * Override, dann die Fuehrungskraft mit ihren Kontakten, dann die erste
 * Hierarchieebene. Verbunden mit einem Schraegstrich, wie
 * `erreichbarkeitText()` im Erfassungsbogen.
 */
export function erreichbarkeit(einheit: EinheitZustand): string {
  const uebersteuert = alsText(einheit.erreichbarkeitOverride?.wert);
  if (uebersteuert !== undefined) return uebersteuert;

  const kraft = einheit.fuehrungskraft?.wert as
    | { name?: string; kontakte?: { wert?: string }[] }
    | null
    | undefined;
  if (kraft !== null && kraft !== undefined) {
    const teile = [kraft.name, ...(kraft.kontakte ?? []).map((k) => k.wert)]
      .map(alsText)
      .filter((s): s is string => s !== undefined);
    if (teile.length > 0) return teile.join(" / ");
  }

  const hierarchie = einheit.hierarchie?.wert as
    | readonly { telefon?: string; email?: string }[]
    | null
    | undefined;
  const oberste = hierarchie?.[0];
  return [oberste?.telefon, oberste?.email]
    .map(alsText)
    .filter((s): s is string => s !== undefined)
    .join(" / ");
}

/**
 * **K10** — die Geraetespalte: Fahrzeuge nach `typ` gruppiert, mit Stueckzahl.
 *
 * Gruppiert wird in der Codepoint-Ordnung der Fahrzeug-Ids. Sonst haenge die
 * Spalte an der Reihenfolge, in der ein Client die Fahrzeuge gefaltet hat, und
 * zwei Ausdrucke desselben Einsatzes saehen verschieden aus.
 */
export function geraeteText(zustand: Zustand, einheitId: string): string {
  const nachTyp = new Map<string, number>();
  for (const id of Object.keys(zustand.fahrzeuge).sort()) {
    const fahrzeug = zustand.fahrzeuge[id];
    if (fahrzeug === undefined) continue;
    if (fahrzeug.einheitId?.wert !== einheitId || fahrzeug.entfernt?.wert === true) continue;
    const typ = alsText(fahrzeug.typ.wert) ?? "";
    nachTyp.set(typ, (nachTyp.get(typ) ?? 0) + 1);
  }
  return [...nachTyp]
    .map(([typ, anzahl]) => (anzahl > 1 ? `${String(anzahl)}× ${typ}` : typ))
    .join(",\n");
}

/** **K11** — die Auftragsspalte: je Auftrag eine Zeile „von–bis; Abschnitt; Text". */
export function auftragsText(zustand: Zustand, einheitId: string): string {
  return Object.values(zustand.auftraege)
    .filter((a) => a.einheitId?.wert === einheitId && a.zurueckgenommen?.wert !== true)
    .sort((a, b) => String(a.von?.wert ?? "").localeCompare(String(b.von?.wert ?? "")))
    .map((a) => {
      const id = alsText(a.abschnittId?.wert);
      const abschnitt =
        id === undefined ? "" : (alsText(zustand.abschnitte[id]?.name.wert) ?? id);
      const spanne = `${String(a.von?.wert ?? "")}–${String(a.bis?.wert ?? "")}`;
      return [spanne, abschnitt, String(a.text.wert ?? "")].join("; ");
    })
    .join("\n");
}

/**
 * **K12** — die juengste nicht stornierte Anforderung, in der diese Einheit
 * die **abzuloesende** ist.
 *
 * „Juengste" nach `angefordertAm`; bei Gleichstand entscheidet die Id, damit
 * zwei Clients dieselbe waehlen.
 */
export function abloesendeAnforderung(
  zustand: Zustand,
  einheitId: string,
): AnforderungZustand | undefined {
  return Object.values(zustand.anforderungen)
    .filter((a) => a.abzuloesendeEinheitId?.wert === einheitId && a.zustand !== "STORNIERT")
    .sort((a, b) => {
      const nachZeit = String(b.angefordertAm?.wert ?? "").localeCompare(
        String(a.angefordertAm?.wert ?? ""),
      );
      return nachZeit !== 0 ? nachZeit : a.id.localeCompare(b.id);
    })[0];
}

// ---------------------------------------------------------------------------
// K13 bis K16 — Kosten
// ---------------------------------------------------------------------------

export interface Kostenzahlen {
  readonly psaProTag: number;
  readonly vdaUkProTag: number;
  readonly personentage: number;
  readonly gesamt: number;
}

function kostenparameter(zustand: Zustand): {
  readonly psaKostenProSatz: number;
  readonly vdaProTag: number;
  readonly ukVerpflegungProTag: number;
  readonly geplanteEinsatztage: number;
} {
  const k = zustand.einsatz?.kosten;
  const zahl = (wert: unknown): number => (typeof wert === "number" ? wert : 0);
  return {
    psaKostenProSatz: zahl(k?.psaKostenProSatz?.wert),
    vdaProTag: zahl(k?.vdaProTag?.wert),
    ukVerpflegungProTag: zahl(k?.ukVerpflegungProTag?.wert),
    geplanteEinsatztage: zahl(k?.geplanteEinsatztage?.wert),
  };
}

/**
 * **K13** bis **K16** — die vier Kostenzahlen einer Einheit.
 *
 * `gesamt` ist bei einer Einheit ohne Kraefte **null**, wie `AW` es ueber
 * `IFERROR` erzwingt: Die Excel teilt dort durch die Gesamtstaerke.
 */
export function kosten(zustand: Zustand, einheit: EinheitZustand): Kostenzahlen {
  const p = kostenparameter(zustand);
  const koepfe = gesamtstaerke(einheit);
  const saetze =
    typeof einheit.psaSaetzeProTag?.wert === "number" ? einheit.psaSaetzeProTag.wert : 0;
  const psaProTag = koepfe * saetze * p.psaKostenProSatz;
  const vdaUkProTag = (p.vdaProTag + p.ukVerpflegungProTag) * koepfe;
  return {
    psaProTag,
    vdaUkProTag,
    personentage: p.geplanteEinsatztage * koepfe,
    gesamt: koepfe === 0 ? 0 : (psaProTag + vdaUkProTag) * p.geplanteEinsatztage,
  };
}

/** Die Typen, deren Einheiten in die Kosten eingehen (ZDM §2.4). */
export function zaehltInKosten(zustand: Zustand, abschnittId: string): boolean {
  return !NICHT_IN_KOSTEN.has(typDesAbschnitts(zustand, abschnittId));
}

// ---------------------------------------------------------------------------
// K17 und K18 — Fuehrungsstelle und Verfuegbarkeit
// ---------------------------------------------------------------------------

export interface FuestZeile {
  readonly teileinheit: string;
  readonly schicht: string;
  readonly staerke: Staerke;
}

/**
 * **K17** — die Projektion der Fuehrungsstelle.
 *
 * Je `teileinheit × schicht` eine virtuelle Einheit; ihre Staerke ist die
 * Summe der besetzten Dienstposten. **Keine Doppelerfassung**: Die FueSt
 * erscheint nicht als gemeldete Einheit, sondern entsteht aus dem Dienstplan.
 *
 * Die Rolle eines Dienstpostens folgt seiner `funktion`; die Zuordnung ist ein
 * Stammdatum und wird **injiziert**, damit dieses Modul kein Vokabular kennt
 * (KONZEPT-EREIGNISSE §1.2).
 */
export function fuestProjektion(
  zustand: Zustand,
  rolleDerFunktion: (funktion: string) => keyof Staerke,
): FuestZeile[] {
  const zeilen = new Map<string, FuestZeile>();
  for (const id of Object.keys(zustand.dienstposten).sort()) {
    const posten = zustand.dienstposten[id];
    if (posten === undefined || posten.entfernt?.wert === true) continue;
    if (alsText(posten.besetzung?.wert) === undefined) continue;
    const teileinheit = String(posten.teileinheit.wert ?? "");
    const schicht = String(posten.schicht?.wert ?? "");
    const schluessel = `${teileinheit} ${schicht}`;
    const bisher = zeilen.get(schluessel) ?? { teileinheit, schicht, staerke: STAERKE_NULL };
    const rolle = rolleDerFunktion(String(posten.funktion.wert ?? ""));
    zeilen.set(schluessel, {
      ...bisher,
      staerke: { ...bisher.staerke, [rolle]: bisher.staerke[rolle] + 1 },
    });
  }
  return [...zeilen.values()];
}

/**
 * **K18** — die Ablaufwarnung: Die Verfuegbarkeit endet innerhalb eines Tages.
 *
 * `jetzt` wird uebergeben und nicht gelesen: Dieses Paket kennt keine Uhr
 * (02-ZIELBILD.md, „Vier Ringe"), und eine Kennzahl, die von der Systemzeit
 * abhinge, waere zwischen zwei Clients verschieden.
 */
export function verfuegbarkeitLaeuftAb(einheit: EinheitZustand, jetzt: Zeitpunkt): boolean {
  const bis = einheit.verfuegbarBis?.wert;
  if (typeof bis !== "string") return false;
  const ende = Date.parse(bis);
  const gegenwart = Date.parse(jetzt);
  if (Number.isNaN(ende) || Number.isNaN(gegenwart)) return false;
  return gegenwart >= ende - 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// K19 bis K25 — die Matrizen des Blattes „Status"
// ---------------------------------------------------------------------------

/** Eine Zeile der Matrizen: Staerke plus die Logistikzahlen. */
export interface Matrixzeile {
  readonly staerke: Staerke;
  readonly gesamt: number;
  readonly weiblich: number;
  readonly divers: number;
  readonly vegetarisch: number;
  readonly vegan: number;
}

const LEERE_ZEILE: Matrixzeile = {
  staerke: STAERKE_NULL,
  gesamt: 0,
  weiblich: 0,
  divers: 0,
  vegetarisch: 0,
  vegan: 0,
};

function zeileFuer(zustand: Zustand, einheiten: readonly EinheitZustand[]): Matrixzeile {
  return einheiten.reduce<Matrixzeile>((zeile, e) => {
    const l = logistik(zustand, e);
    return {
      staerke: staerkePlus(zeile.staerke, e.wirksameStaerke),
      gesamt: zeile.gesamt + gesamtstaerke(e),
      weiblich: zeile.weiblich + l.weiblich,
      divers: zeile.divers + l.divers,
      vegetarisch: zeile.vegetarisch + l.vegetarisch,
      vegan: zeile.vegan + l.vegan,
    };
  }, LEERE_ZEILE);
}

function gruppiere(
  zustand: Zustand,
  einheiten: readonly EinheitZustand[],
  schluessel: (e: EinheitZustand) => string | undefined,
): { readonly [wert: string]: Matrixzeile } {
  const gruppen = new Map<string, EinheitZustand[]>();
  for (const e of einheiten) {
    const k = schluessel(e);
    if (k === undefined) continue;
    gruppen.set(k, [...(gruppen.get(k) ?? []), e]);
  }
  const ergebnis = Object.create(null) as Record<string, Matrixzeile>;
  for (const k of [...gruppen.keys()].sort()) {
    ergebnis[k] = zeileFuer(zustand, gruppen.get(k) as EinheitZustand[]);
  }
  return ergebnis;
}

/**
 * **Die drei Matrizen laufen ueber `E`, nicht ueber `E*`** — abweichend vom
 * Wortlaut von ZDM §3.3 und mit dessen eigener Arithmetik begruendet.
 *
 * K23 verlangt `Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0`. Liefen beide
 * Matrizen ueber `E*`, waeren sie gleich gross — angeforderte Einheiten sind
 * in `E*` gar nicht enthalten —, und die Probe ergaebe `+Σ_ANGEFORDERT`
 * statt null. Sie geht genau dann auf, wenn die Organisationsmatrix die
 * angeforderten Einheiten **enthaelt** und die Schichtmatrix sie mangels
 * Schicht auslaesst. Dasselbe sagt K25 mit seiner dritten Bedingung
 * (`schicht = null ∧ abschnitt.typ ≠ ANGEFORDERT`): Sie waere sinnlos, wenn
 * angeforderte Einheiten ohnehin nicht in der Menge staenden. Und dasselbe
 * tut die Excel — `Status!D7..J18` summiert ueber das ganze Blatt
 * einschliesslich der Zeilen 138 bis 160.
 *
 * Aufgeschrieben als Befund K-B1 im Bericht zu M1.3; ZDM ist ein Entwurf und
 * wird nicht von hier aus geaendert.
 */

/** **K19** — Organisation × Kennzahl. */
export function matrixOrganisation(zustand: Zustand): { readonly [org: string]: Matrixzeile } {
  return gruppiere(zustand, einheitenDerLage(zustand), (e) => alsText(e.organisation.wert));
}

/** **K20** — Status × Kennzahl. */
export function matrixStatus(zustand: Zustand): { readonly [status: string]: Matrixzeile } {
  return gruppiere(zustand, einheitenDerLage(zustand), (e) => alsText(e.status.wert));
}

/** **K22** — Schicht × Kennzahl; angeforderte Einheiten fehlen hier mangels Schicht. */
export function matrixSchicht(zustand: Zustand): { readonly [schicht: string]: Matrixzeile } {
  return gruppiere(zustand, einheitenDerLage(zustand), (e) => alsText(e.schicht?.wert));
}

/** **K24** — Abschnitt × Schicht, je Rolle. */
export function matrixAbschnittSchicht(
  zustand: Zustand,
  abschnittId: string,
): { readonly [schicht: string]: Matrixzeile } {
  return gruppiere(zustand, einheitenImAbschnitt(zustand, abschnittId), (e) =>
    alsText(e.schicht?.wert),
  );
}

function summeDerZeilen(matrix: { readonly [wert: string]: Matrixzeile }): number {
  return Object.values(matrix).reduce((summe, zeile) => summe + zeile.gesamt, 0);
}

/**
 * **K21** — die Konsistenzprobe des Statusblatts.
 *
 * `Σ_Status − Σ_Organisation = 0`. Weicht sie ab, fehlt bei mindestens einer
 * Einheit der Status oder die Organisation; welche das sind, sagt K25.
 */
export function konsistenzStatus(zustand: Zustand): number {
  return summeDerZeilen(matrixStatus(zustand)) - summeDerZeilen(matrixOrganisation(zustand));
}

/**
 * **K23** — die Konsistenzprobe der Schichtmatrix.
 *
 * `Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0`: Bei `ANGEFORDERT` ist die
 * Schicht keine Pflicht (ZDM §2.4), die Einheiten fehlen also zu Recht in der
 * Schichtmatrix — und stehen dafuer im dritten Summanden.
 */
export function konsistenzSchicht(zustand: Zustand): number {
  const angefordert = einheitenDerLage(zustand).filter(
    (e) => typDesAbschnitts(zustand, e.wirksamerAbschnittId) === ANGEFORDERT,
  );
  return (
    summeDerZeilen(matrixSchicht(zustand)) -
    summeDerZeilen(matrixOrganisation(zustand)) +
    angefordert.reduce((s, e) => s + gesamtstaerke(e), 0)
  );
}

/** **K25** — Einheiten ohne Pflichtangabe, nach Id geordnet. */
export function einheitenOhnePflichtangabe(zustand: Zustand): EinheitZustand[] {
  return einheitenDerLage(zustand)
    .filter((e) => {
      if (alsText(e.status.wert) === undefined) return true;
      if (alsText(e.organisation.wert) === undefined) return true;
      const schichtPflicht = typDesAbschnitts(zustand, e.wirksamerAbschnittId) !== ANGEFORDERT;
      return schichtPflicht && alsText(e.schicht?.wert) === undefined;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// K26 und K27 — der Meldekopf
// ---------------------------------------------------------------------------

/**
 * **K26** — der Revisionskopf je Reihe: die juengste Meldung nach `stand`, bei
 * Gleichstand nach `empfangenAm`.
 *
 * **Nicht nach HLC** (KONZEPT-EREIGNISSE §2.6): Ein nachgescannter
 * Papierbogen von gestern hat die hoehere HLC und den aelteren `stand`.
 */
export function revisionskoepfe(zustand: Zustand): MeldungZustand[] {
  const jeReihe = new Map<string, MeldungZustand>();
  for (const id of Object.keys(zustand.meldungen).sort()) {
    const meldung = zustand.meldungen[id];
    if (meldung === undefined) continue;
    const reihe = alsText(meldung.einheitSchluessel?.wert);
    if (reihe === undefined) continue;
    const bisher = jeReihe.get(reihe);
    const stand = String(meldung.stand.wert ?? "");
    const bisherigerStand = String(bisher?.stand.wert ?? "");
    const juenger =
      bisher === undefined ||
      stand > bisherigerStand ||
      (stand === bisherigerStand &&
        String(meldung.empfangenAm.wert ?? "") > String(bisher.empfangenAm.wert ?? ""));
    if (juenger) jeReihe.set(reihe, meldung);
  }
  return [...jeReihe.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** **K27** — der Eingangskorb des Meldekopfs, nach `empfangenAm` geordnet. */
export function meldekopfEingang(zustand: Zustand): MeldungZustand[] {
  return Object.values(zustand.meldungen)
    .filter((m) => m.uebernahmeZustand === "NEU" || m.uebernahmeZustand === "GEAENDERT")
    .sort((a, b) => {
      const nachZeit = String(a.empfangenAm.wert ?? "").localeCompare(
        String(b.empfangenAm.wert ?? ""),
      );
      return nachZeit !== 0 ? nachZeit : a.id.localeCompare(b.id);
    });
}

// ---------------------------------------------------------------------------
// K28 bis K30 — die Textspalten des Exports
// ---------------------------------------------------------------------------

/** **K28** — der Anzeigename: Bezeichnung, dazu das Teiletikett in Klammern. */
export function anzeigename(einheit: EinheitZustand): string {
  const bezeichnung = String(einheit.bezeichnung.wert ?? "");
  const etikett = alsText(einheit.teilEtikett?.wert);
  return etikett === undefined ? bezeichnung : `${bezeichnung} (${etikett})`;
}

/** **K29** — die Herkunftsspalte aus der obersten Hierarchieebene. */
export function herkunftText(einheit: EinheitZustand): string {
  const hierarchie = einheit.hierarchie?.wert as
    | readonly { art?: string; name?: string; kurz?: string }[]
    | null
    | undefined;
  const oberste = hierarchie?.[0];
  if (oberste === undefined) return "";
  const kurz = alsText(oberste.kurz);
  return [oberste.art, oberste.name, kurz === undefined ? undefined : `(${kurz})`]
    .map(alsText)
    .filter((s): s is string => s !== undefined)
    .join(" ");
}

/**
 * **K30** — die Bemerkungsspalte.
 *
 * Bei einer Uebung steht „ÜBUNG" davor — der Hinweis gehoert auf jeden
 * Ausdruck, damit eine Uebungslage nicht fuer eine echte gehalten wird.
 */
export function bemerkungText(zustand: Zustand, einheit: EinheitZustand): string {
  const uebung = zustand.einsatz?.art.wert === "UEBUNG" ? "ÜBUNG" : undefined;
  return [uebung, alsText(einheit.bemerkung?.wert)]
    .filter((s): s is string => s !== undefined)
    .join(" — ");
}
