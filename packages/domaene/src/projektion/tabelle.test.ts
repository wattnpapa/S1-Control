/**
 * Prüffälle zur Einheitentabelle (M3.2).
 *
 * Sie messen die Projektion, nicht den Fold: Dass ein `vorher`-Wert, der nicht
 * zum verdrängten passt, einen Hinweis erzeugt, steht in `fold.test.ts`. Hier
 * steht, dass die Tabelle diesen Befund an der **richtigen Zelle** zeigt — und
 * dass Text und Wert einer Zelle getrennt bleiben, weil die Inline-Bearbeitung
 * den Wert als `vorher` zurückschickt (§2.2a, Auflage 6).
 *
 * Die Spaltenzuschnitte folgen der Bestandsaufnahme `excel-domaenenmodell.md`
 * §2: eine Einheit ist eine Zeile über B..AW des Blatts „Stärke", und die drei
 * Gruppen L:Y, AC:AI und AN:AW sind in der Vorlage ausgeblendet.
 */

import { describe, expect, it } from "vitest";

import {
  SPALTEN,
  SPALTENGRUPPEN,
  SICHTBARE_GRUPPEN_VORBELEGUNG,
  einheitentabelle,
  spalte,
  spaltenDerGruppen,
  tabellenzeile,
} from "./tabelle.js";
import { SCHEMA_VERSION, ereignisId } from "../ereignis.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import type { Hlc } from "../hlc.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
  staerkeGeaendert,
} from "../pruefhilfen/ereignisbau.js";
import { EINGANG_ABSCHNITT_ID } from "../zustand.js";
import type { Zustand } from "../zustand.js";

function falte(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

/** Bezugspunkt der abgeleiteten Wanduhr — dieselbe Wahl wie in der Bauhilfe. */
const BEZUGSZEIT = Date.parse("2026-09-08T08:00:00+02:00");

/**
 * Ein Ereignis beliebiger Art.
 *
 * Für `EinheitEntfernt` gibt es keine Bauhilfe, und es braucht zweierlei, was
 * die vorhandenen Bauhilfen nicht kennen: den festen Wert `neu: true` und den
 * Pflichtgrund aus §2.4 — das Entfernen nimmt eine gemeldete Kraft aus allen
 * Summen, und das darf nicht ohne Begründung geschehen.
 */
function bau(
  h: Hlc,
  laufnummer: number,
  typ: string,
  nutzlast: unknown,
  weiteres: Partial<EingehendesEreignis> = {},
): EingehendesEreignis {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    wanduhr: new Date(BEZUGSZEIT + h.millisekunden).toISOString(),
    typ,
    nutzlast,
    ...weiteres,
  };
}

const EINSATZ = einsatzAngelegt(hlc(1, 0, "aa"), 1, {
  einsatzId: "E1",
  name: "Hochwasser",
  art: "EINSATZ",
  fuestName: "FüSt 1",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const ABSCHNITT_NORD = abschnittAngelegt(hlc(2, 0, "aa"), 2, {
  abschnittId: "EA-NORD",
  name: "EA Nord",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

const ABSCHNITT_SUED = abschnittAngelegt(hlc(3, 0, "aa"), 3, {
  abschnittId: "EA-SUED",
  name: "EA Süd",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 2,
});

interface EinheitWunsch {
  readonly abschnittId?: string;
  readonly bezeichnung?: string;
  readonly reihenfolge?: number;
  readonly staerke?: ReturnType<typeof staerke>;
}

function einheit(
  ms: number,
  laufnummer: number,
  id: string,
  wunsch: EinheitWunsch = {},
): EingehendesEreignis {
  return einheitGemeldet(hlc(ms, 0, "aa"), laufnummer, {
    einheitId: id,
    abschnittId: wunsch.abschnittId ?? "EA-NORD",
    bezeichnung: wunsch.bezeichnung ?? `Einheit ${id}`,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: wunsch.staerke ?? staerke(0, 1, 8),
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
    reihenfolge: wunsch.reihenfolge ?? 0,
  });
}

const GRUNDMENGE: readonly EingehendesEreignis[] = [EINSATZ, ABSCHNITT_NORD, ABSCHNITT_SUED];

describe("SPALTEN — die Tabelle der Excel-Spalten (excel-domaenenmodell.md §2)", () => {
  it("führt jeden Schlüssel genau einmal", () => {
    // Der Schlüssel adressiert die Zelle im Zeilenobjekt und ist zugleich der
    // Name des Zustandsfeldes (§3.2). Zwei Spalten mit demselben Schlüssel
    // hießen: eine der beiden ist im gerenderten Zeilenobjekt unsichtbar.
    const schluessel = SPALTEN.map((sp) => sp.schluessel);
    expect(new Set(schluessel).size).toBe(schluessel.length);
  });

  it("gibt jeder schreibbaren Spalte einen Schreibweg und einen Feldpfad", () => {
    // §5.4 nennt zu jedem Feld die Ereignisart, mit der es geschrieben wird;
    // §3.8a hängt Konflikthinweise an den Feldpfad. Fehlt eines von beidem,
    // kann die Zelle entweder nicht bearbeitet werden oder ihr Hinweis findet
    // sie nicht — beides fällt erst am fremden Arbeitsplatz auf.
    for (const sp of SPALTEN.filter((eintrag) => eintrag.art !== "berechnet")) {
      expect(sp.schreibt, `Spalte ${sp.schluessel} ohne Schreibweg`).toBeDefined();
      expect(sp.feldpfad, `Spalte ${sp.schluessel} ohne Feldpfad`).toBeDefined();
    }
  });

  it("ordnet jede Spalte einer bekannten Gruppe zu", () => {
    // Die Gruppen sind die Ein-/Ausblendeinheit der Excel und der DoD von
    // M3.2. Eine Spalte in keiner Gruppe wäre über das Menü nicht erreichbar.
    for (const sp of SPALTEN) {
      expect(SPALTENGRUPPEN, `Spalte ${sp.schluessel}`).toContain(sp.gruppe);
    }
  });

  it("findet eine Spalte über ihren Schlüssel und meldet einen fremden zurück", () => {
    expect(spalte("staerke")?.excel).toBe("AJ/AK/AL");
    expect(spalte("gibtEsNicht")).toBeUndefined();
  });
});

describe("spaltenDerGruppen", () => {
  it("liefert nur die verlangten Gruppen", () => {
    // Die Vorlage der Excel blendet „Ressourcenplanung" (L:Y), „Logistikdaten"
    // (AC:AI) und „Kostenübersicht" (AN:AW) aus; sichtbar sind B..K, Z..AB und
    // AJ..AM. Genau diese Wahl ist die Vorbelegung, und sie muss die drei
    // ausgeblendeten Gruppen auch wirklich weglassen.
    const sichtbar = spaltenDerGruppen(["GRUNDDATEN", "STAERKE"]);
    const schluessel = sichtbar.map((sp) => sp.schluessel);

    expect(schluessel).toContain("bezeichnung");
    expect(schluessel).toContain("status");
    expect(schluessel).toContain("staerke");
    // Logistik (AC:AI) und Kosten (AN:AW) sind ausgeblendet.
    expect(schluessel).not.toContain("weiblich");
    expect(schluessel).not.toContain("uebernachtungD");
    expect(schluessel).not.toContain("psaSaetzeProTag");
    // Und Ressourcenplanung (L:Y) ebenso.
    expect(schluessel).not.toContain("bemerkung");

    expect(sichtbar.every((sp) => sp.gruppe === "GRUNDDATEN" || sp.gruppe === "STAERKE")).toBe(true);
    expect(SICHTBARE_GRUPPEN_VORBELEGUNG).toEqual(["GRUNDDATEN", "STAERKE"]);
  });

  it("liefert für eine zugeschaltete Gruppe genau deren Spalten", () => {
    const logistik = spaltenDerGruppen(["LOGISTIKDATEN"]);
    expect(logistik.map((sp) => sp.schluessel)).toEqual([
      "weiblich",
      "divers",
      "vegetarisch",
      "vegan",
      "uebernachtungM",
      "uebernachtungW",
      "uebernachtungD",
    ]);
  });
});

describe("tabellenzeile", () => {
  const zustand = falte([...GRUNDMENGE, einheit(10, 4, "U1", { staerke: staerke(1, 2, 9) })]);
  const einheitU1 = zustand.einheiten["U1"];

  it("trennt den angezeigten Text vom Wert, den ein Bedienschritt zurückschickt", () => {
    // §2.2a, Auflage 6: Der Bedienschritt schickt als `vorher` den Wert mit,
    // den **dieser** Client gesehen hat. Angezeigt wird „1/2/9", geschickt
    // wird das Tripel — eine Zelle, die nur Text führte, könnte den Vorher-
    // Wert nur zurückparsen, und aus „1/2/9" wird beim Parsen keine Stärke,
    // sondern eine Auslegung.
    expect(einheitU1).toBeDefined();
    if (einheitU1 === undefined) return;
    const zeile = tabellenzeile(zustand, einheitU1);

    expect(zeile.zellen["staerke"]?.text).toBe("1/2/9");
    expect(zeile.zellen["staerke"]?.wert).toEqual({ fuehrer: 1, unterfuehrer: 2, mannschaft: 9 });
    expect(zeile.staerke).toEqual({ fuehrer: 1, unterfuehrer: 2, mannschaft: 9 });
  });

  it("lässt eine berechnete Spalte ohne Wert", () => {
    // „Gesamt" (AM) ist in der Excel eine Formel über AJ..AL und im Zielmodell
    // eine Kennzahl. Eine berechnete Zelle darf keinen `wert` tragen, denn ein
    // Wert wäre die Einladung, sie zu bearbeiten — und geschrieben würde dann
    // eine Summe, die kein Ereignis des Katalogs (§5.4) setzen kann.
    expect(einheitU1).toBeDefined();
    if (einheitU1 === undefined) return;
    const zeile = tabellenzeile(zustand, einheitU1);

    expect(zeile.zellen["gesamt"]?.text).toBe("12");
    expect(zeile.zellen["gesamt"]?.wert).toBeUndefined();
    expect(zeile.gesamt).toBe(12);
  });
});

describe("einheitentabelle — Sortierung", () => {
  it("sortiert nach Reihenfolge und bei Gleichstand nach Id in Codepoint-Ordnung", () => {
    // §5.3, „Sekundärsortierung": Ohne die zweite Stufe hinge die Reihenfolge
    // zweier gleichrangiger Zeilen an der Schlüsselreihenfolge der Sammlung,
    // und zwei Arbeitsplätze zeigten Verschiedenes, obwohl ihr Zustand
    // konvergiert ist.
    const zustand = falte([
      ...GRUNDMENGE,
      einheit(10, 4, "U-SUED", { reihenfolge: 5 }),
      einheit(11, 5, "U-NORD", { reihenfolge: 5 }),
      einheit(12, 6, "U-WEST", { reihenfolge: 1 }),
    ]);

    expect(einheitentabelle(zustand).zeilen.map((zeile) => zeile.einheitId)).toEqual([
      "U-WEST",
      "U-NORD",
      "U-SUED",
    ]);
  });
});

describe("einheitentabelle — Filter", () => {
  it("filtert über den wirksamen Abschnitt und findet die Einheit im Eingang wieder", () => {
    // §5.3.3: Eine Einheit, deren gemeldeter Abschnitt unbekannt ist, geht in
    // den Eingang und nicht verloren — ihre Stärke zählt weiter. Deshalb muss
    // der Filter den **wirksamen** Abschnitt lesen: Wer nach dem gemeldeten
    // filterte, verlöre sie in jeder Ansicht.
    const zustand = falte([
      ...GRUNDMENGE,
      einheit(10, 4, "U1", { abschnittId: "EA-NORD" }),
      einheit(11, 5, "U2", { abschnittId: "EA-SUED" }),
      einheit(12, 6, "U3", { abschnittId: "NOCH-NICHT-GEMELDET" }),
    ]);

    expect(einheitentabelle(zustand, { abschnittId: "EA-NORD" }).zeilen.map((z) => z.einheitId))
      .toEqual(["U1"]);
    const imEingang = einheitentabelle(zustand, { abschnittId: EINGANG_ABSCHNITT_ID });
    expect(imEingang.zeilen.map((z) => z.einheitId)).toEqual(["U3"]);
    expect(imEingang.zeilen[0]?.abschnittId).toBe(EINGANG_ABSCHNITT_ID);
  });

  it("sucht in der Bezeichnung ohne Rücksicht auf Groß-/Kleinschreibung", () => {
    // Die Suche ist das Werkzeug der Führungsstelle am Telefon: Dort wird
    // „bergungsgruppe" getippt, während in der Zeile „Bergungsgruppe 2" steht.
    const zustand = falte([
      ...GRUNDMENGE,
      einheit(10, 4, "U1", { bezeichnung: "Bergungsgruppe 2" }),
      einheit(11, 5, "U2", { bezeichnung: "Fachgruppe Räumen" }),
    ]);

    expect(einheitentabelle(zustand, { suche: "bergungsgruppe" }).zeilen.map((z) => z.einheitId))
      .toEqual(["U1"]);
    expect(einheitentabelle(zustand, { suche: "BERGUNGSGRUPPE" }).zeilen.map((z) => z.einheitId))
      .toEqual(["U1"]);
    expect(einheitentabelle(zustand, { suche: "räumen" }).zeilen.map((z) => z.einheitId))
      .toEqual(["U2"]);
  });
});

describe("einheitentabelle — Ausschnitt", () => {
  it("schneidet mit von/anzahl und nennt trotzdem die volle Trefferzahl", () => {
    // Die Zahl unter der Tabelle ist die Trefferzahl des Filters, nicht die
    // Länge des Ausschnitts: Sonst stünde bei 5.000 Einheiten (Entscheidung
    // 10) unter jeder Seite „50".
    const zustand = falte([
      ...GRUNDMENGE,
      einheit(10, 4, "U1", { reihenfolge: 1 }),
      einheit(11, 5, "U2", { reihenfolge: 2 }),
      einheit(12, 6, "U3", { reihenfolge: 3 }),
      einheit(13, 7, "U4", { reihenfolge: 4 }),
    ]);

    const ausschnitt = einheitentabelle(zustand, { von: 1, anzahl: 2 });
    expect(ausschnitt.zeilen.map((z) => z.einheitId)).toEqual(["U2", "U3"]);
    expect(ausschnitt.gesamtzahl).toBe(4);
    expect(ausschnitt.von).toBe(1);
  });
});

describe("einheitentabelle — entfernte Einheiten (§5.4.5)", () => {
  it("blendet eine entfernte Einheit aus und zeigt sie nur auf Verlangen", () => {
    // Entfernte Einheiten bleiben im Zustand — gelöscht wird nichts (§5.4.5),
    // sonst könnte ein nachträglich eintreffendes Ereignis die Einheit wieder
    // auferstehen lassen, ohne dass jemand den Grund (§2.4) noch sähe. Die
    // Tabelle blendet sie nur aus.
    const entfernt = bau(hlc(20, 0, "bb"), 1, "EinheitEntfernt", { einheitId: "U2" }, {
      neu: true,
      grund: "Doppelmeldung — dieselbe Gruppe kam über zwei Wege",
    });
    const zustand = falte([
      ...GRUNDMENGE,
      einheit(10, 4, "U1", { reihenfolge: 1 }),
      einheit(11, 5, "U2", { reihenfolge: 2 }),
      entfernt,
    ]);

    expect(einheitentabelle(zustand).zeilen.map((z) => z.einheitId)).toEqual(["U1"]);
    expect(einheitentabelle(zustand).gesamtzahl).toBe(1);

    const mit = einheitentabelle(zustand, { mitStillgelegten: true });
    expect(mit.zeilen.map((z) => z.einheitId)).toEqual(["U1", "U2"]);
    expect(mit.zeilen.find((z) => z.einheitId === "U2")?.entfernt).toBe(true);
    expect(mit.zeilen.find((z) => z.einheitId === "U1")?.entfernt).toBe(false);
  });
});

describe("einheitentabelle — Konflikthinweise an der Zelle (§3.8, §3.8a)", () => {
  it("markiert die Stärke-Zelle, wenn ein vorher-Wert nicht zum verdrängten passt", () => {
    // Zwei Arbeitsplätze ändern nebenläufig dieselbe Stärke. `cc` hat 0/1/8
    // gesehen und nicht 0/2/17, das `bb` inzwischen geschrieben hat — `cc`
    // gewinnt nach HLC, aber der verdrängte Wert war ihm nie bekannt. §3.8
    // verlangt dafür einen Hinweis, §3.8a hängt ihn an den Feldpfad des
    // Feldes. Die Tabelle muss ihn genau dort zeigen, wo bearbeitet wurde:
    // an der Zelle „staerke" — ein Hinweis in einer Fußzeile sagt nicht,
    // welche der 26 Zellen streitig ist.
    const erste = staerkeGeaendert(hlc(2000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(0, 2, 17));
    const zweite = staerkeGeaendert(hlc(3000, 0, "cc"), 1, "U1", staerke(0, 1, 8), staerke(0, 3, 20));
    const zustand = falte([...GRUNDMENGE, einheit(10, 4, "U1"), erste, zweite]);

    expect(zustand.hinweise).toEqual([
      expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "einheit/U1/staerke" }),
    ]);

    const einheitU1 = zustand.einheiten["U1"];
    expect(einheitU1).toBeDefined();
    if (einheitU1 === undefined) return;
    const zeile = tabellenzeile(zustand, einheitU1);

    expect(zeile.zellen["staerke"]?.umstritten).toBe(true);
    // Und nur dort: Der Status ist unstreitig und darf nicht mitmarkiert
    // werden, sonst wäre die Markierung im Streitfall wertlos.
    expect(zeile.zellen["status"]?.umstritten).toBe(false);
    expect(zeile.hinweise).toEqual([
      expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "einheit/U1/staerke" }),
    ]);
    // Der Gewinner steht in der Zelle: 0/3/20 von `cc`.
    expect(zeile.zellen["staerke"]?.text).toBe("0/3/20");
  });
});
