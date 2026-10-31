/**
 * Die Seitenausgaben über die Vermittlung — Ruf, Kontrakt, Drucker, Ablage.
 *
 * Die Vorlagen selbst prüfen `@s1/ausgaben` und die Goldfiles. Hier steht der
 * Weg: dass eine Ausgabeart, die der Kontrakt kennt, über die Prozessgrenze
 * auch ankommt, im Ordner `ausgaben\` liegt und im richtigen Format an den
 * Drucker geht. Eine Art, die im Kontrakt steht und im Worker fehlt, liefe
 * sonst still in die Vorgabe des Drucks.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof } from "./arbeiterhof.js";
import { baueDirektenArbeiter } from "./pruefhilfen/direkterArbeiter.js";
import { Vermittlung, type Drucker } from "./vermittlung.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import { zRuf, type Ruf } from "../kontrakt/index.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

/** Ein Drucker, der sich merkt, wie er gerufen wurde, und Bytes erfindet. */
function merkenderDrucker(): Drucker & { readonly rufe: { html: string; quer: boolean }[] } {
  const rufe: { html: string; quer: boolean }[] = [];
  return {
    rufe,
    alsPdf(html, quer) {
      rufe.push({ html, quer });
      return Promise.resolve(new TextEncoder().encode("%PDF-attrappe"));
    },
  };
}

async function vermittlungMitEinsatz(
  drucker: Drucker | undefined,
  plattform = "linux",
): Promise<{ vermittlung: Vermittlung; akteId: string }> {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-ausgaben-vermittlung-"));
  wegwerf.push(wurzel);
  const dienste = new Map<string, Aktendienst>();
  const vermittlung = new Vermittlung({
    hof: new Arbeiterhof({ fabrik: (start) => baueDirektenArbeiter(start, dienste), sende: () => undefined }),
    ...(drucker === undefined ? {} : { drucker }),
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(wurzel, "profil", "einstellungen.json"),
    spiegelwurzel: path.join(wurzel, "profil", "spiegel"),
    plattform,
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "pruefrechner",
    benutzer: "pruefer",
    protokolliere: () => undefined,
  });
  await ruf(vermittlung, {
    art: "einstellungenSetzen",
    einstellungen: { sharePfad: path.join(wurzel, "share"), anzeigename: "Führungsstelle 1" },
  });
  const { akteId } = await ruf<{ akteId: string }>(vermittlung, {
    art: "einsatzAnlegen",
    name: "Hochwasser Weser-Ems",
    datum: "2026-09-10",
    einsatzArt: "EINSATZ",
    fuestName: "FüSt Oldenburg",
    beginn: "2026-09-10T08:00:00+02:00",
    schichtmodell: "ZWEI_SCHICHT",
  });
  return { vermittlung, akteId };
}

async function ruf<T>(vermittlung: Vermittlung, anfrage: Ruf): Promise<T> {
  const antwort = await vermittlung.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

describe("Die Einheitenliste als Ausgabe", () => {
  it("steht im Kontrakt neben den anderen Seitenausgaben", () => {
    for (const format of ["html", "pdf"]) {
      const geprueft = zRuf.safeParse({ art: "ausgabeErzeugen", akteId: "akte-1", ausgabe: "einheitenliste", format });
      expect(geprueft.success, format).toBe(true);
    }
    expect(zRuf.safeParse({ art: "ausgabeErzeugen", akteId: "akte-1", ausgabe: "gibtsnicht", format: "html" }).success)
      .toBe(false);
  });

  it("legt die HTML-Seite in „ausgaben“ ab — ohne Drucker", async () => {
    const drucker = merkenderDrucker();
    const { vermittlung, akteId } = await vermittlungMitEinsatz(drucker);
    const { pfad } = await ruf<{ pfad: string }>(vermittlung, {
      art: "ausgabeErzeugen",
      akteId,
      ausgabe: "einheitenliste",
      format: "html",
    });
    expect(path.basename(path.dirname(pfad))).toBe("ausgaben");
    expect(path.basename(pfad)).toMatch(/^einheitenliste_\d{4}-\d{2}-\d{2}_\d{4}\.html$/);
    const html = readFileSync(pfad, "utf8");
    expect(html).toContain("<title>Einheitenliste — Hochwasser Weser-Ems</title>");
    expect(html).toContain("FüSt Oldenburg");
    expect(drucker.rufe).toEqual([]);
  });

  it("druckt das PDF quer, wie das Blatt „Stärke“ der Excel", async () => {
    const drucker = merkenderDrucker();
    const { vermittlung, akteId } = await vermittlungMitEinsatz(drucker);
    const { pfad } = await ruf<{ pfad: string }>(vermittlung, {
      art: "ausgabeErzeugen",
      akteId,
      ausgabe: "einheitenliste",
      format: "pdf",
    });
    expect(pfad).toMatch(/einheitenliste_.*\.pdf$/);
    expect(drucker.rufe).toHaveLength(1);
    expect(drucker.rufe[0]?.quer).toBe(true);
    expect(drucker.rufe[0]?.html).toContain("Einheitenliste");
  });

  it("lässt die Status-Matrix hochkant", async () => {
    const drucker = merkenderDrucker();
    const { vermittlung, akteId } = await vermittlungMitEinsatz(drucker);
    await ruf(vermittlung, { art: "ausgabeErzeugen", akteId, ausgabe: "status", format: "pdf" });
    expect(drucker.rufe[0]?.quer).toBe(false);
  });

  it("sagt ohne PDF-Erzeugung nie „kein Drucker“, sondern nennt den HTML-Weg", async () => {
    for (const plattform of ["web", "linux"]) {
      const { vermittlung, akteId } = await vermittlungMitEinsatz(undefined, plattform);
      const antwort = await vermittlung.beantworte({
        art: "ausgabeErzeugen",
        akteId,
        ausgabe: "einheitenliste",
        format: "pdf",
      });
      expect(antwort.ok).toBe(false);
      const meldung = antwort.ok ? "" : antwort.meldung;
      expect(meldung).not.toMatch(/Drucker/u);
      expect(meldung).toMatch(/HTML/u);
      if (plattform === "web") expect(meldung).toMatch(/nur in der Desktop-App/u);
    }
  });
});
