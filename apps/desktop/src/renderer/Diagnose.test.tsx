/**
 * Komponententests zur Diagnoseansicht (M7.3).
 *
 * Geprüft wird das, worauf es im Störfall ankommt: dass die Ansicht die
 * zutreffenden Fälle **aus derselben Liste** zeigt, die die Kurzanleitung
 * druckt, dass sie den Rückstand eines Arbeitsplatzes benennt statt ihn zu
 * bewerten, und dass sie den Ort der Protokolldatei nennt. Dass sie nichts
 * misst, steht in der letzten Prüfung: Ohne Auskunft aus der Schale zeigt sie
 * eine Zeile Text und stürzt nicht ab — der Fall, der eintritt, wenn der
 * Ruf ins Leere geht.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { STOERFAELLE, UHR_GRENZE_MS } from "@s1/domaene";

import { Diagnose, abweichung, befundAus } from "./Diagnose.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { peer } from "../kontrakt/pruefhilfen.js";
import type { Diagnose as Auskunft, Lagebild } from "../kontrakt/index.js";

afterEach(cleanup);

const JETZT = Date.parse("2026-09-10T12:00:00.000Z");

const AUSKUNFT: Auskunft = {
  plattform: "win32",
  electron: "43.6.0",
  programmversion: "2.0.0",
  rechnername: "FUEST-1",
  benutzer: "zugtrupp",
  clientId: "c1",
  protokolldatei: "C:\\Users\\zugtrupp\\AppData\\Roaming\\s1-control\\logs\\s1-control.log",
  einstellungsdatei: "C:\\Users\\zugtrupp\\AppData\\Roaming\\s1-control\\einstellungen.json",
  spiegelwurzel: "C:\\Users\\zugtrupp\\AppData\\Roaming\\s1-control\\spiegel",
  sharePfad: "\\\\nas\\einsatz",
  shareLesbar: true,
  wanduhr: "2026-09-10T12:00:00.000Z",
  letzteMeldungen: [{ wanduhr: "2026-09-10T11:59:00.000Z", stufe: "warnung", text: "Share nicht erreichbar" }],
};

/** Ein Lagebild mit den Feldern, die diese Ansicht liest — der Rest ist ihr gleich. */
function lagebild(teile: Partial<Lagebild> = {}): Lagebild {
  return {
    shareErreichbar: true,
    peers: [],
    hinweise: 0,
    unbekannteEreignisse: 0,
    unuebertrageneBytes: 0,
    quarantaene: [],
    ...teile,
  } as Lagebild;
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("diagnoseAnfordern", AUSKUNFT);
  useLaden.setState({
    akteId: "akte-1",
    diagnose: undefined,
    programmstand: undefined,
    lagebild: lagebild(),
    fehler: undefined,
    hinweise: [],
  });
});

describe("Abweichung", () => {
  it("nennt Richtung und Größenordnung, nicht die Millisekunde", () => {
    expect(abweichung(0)).toBe("gleich");
    expect(abweichung(-4000)).toBe("4 s nach");
    expect(abweichung(300_000)).toBe("5 min vor");
  });
});

describe("Befund", () => {
  it("nimmt die größte Abweichung, nicht die des ersten Platzes", () => {
    const befund = befundAus(
      lagebild({ peers: [peer({ clientId: "b", uhrAbweichungMs: 1000 }), peer({ clientId: "c", uhrAbweichungMs: -600_000 })] }),
      false,
    );
    expect(befund.groessteUhrabweichungMs).toBe(600_000);
  });

  it("wertet ein abgelehntes Programmpaket als Störfall", () => {
    expect(befundAus(lagebild(), true).programmpaketAbgelehnt).toBe(true);
  });
});

describe("Die Ansicht", () => {
  it("holt ihre Auskunft eigens und nennt den Ort der Protokolldatei", async () => {
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText(AUSKUNFT.protokolldatei)).toBeDefined();
    });
    expect(attrappe.rufe.some((r) => r.art === "diagnoseAnfordern")).toBe(true);
  });

  it("zeigt bei ruhiger Lage keinen Störfall, aber die sechs zum Nachlesen", async () => {
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText(/Kein Störfall erkannt/)).toBeDefined();
    });
    for (const fall of STOERFAELLE) {
      expect(screen.getAllByText(fall.titel).length, fall.kennung).toBeGreaterThan(0);
    }
  });

  it("zeigt die Schritte des zutreffenden Falls, wenn der Share weg ist", async () => {
    useLaden.setState({ lagebild: lagebild({ shareErreichbar: false }) });
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText(/Alles Eingetippte liegt im lokalen Spiegel/)).toBeDefined();
    });
  });

  it("nennt den Rückstand eines Arbeitsplatzes, ohne ihn zu bewerten", async () => {
    useLaden.setState({
      lagebild: lagebild({
        peers: [peer({ clientId: "b", anzeigename: "Lage", offset: 4096, gelesenerOffset: 1024 })],
      }),
    });
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText("Lage")).toBeDefined();
    });
    // 3072 Bytes Rückstand — als Zahl in der Zeile, nicht als Urteil daneben.
    expect(screen.getByText("3.0 kB")).toBeDefined();
  });

  it("hebt eine abweichende Uhr erst ab der Grenze aus Ring 2 hervor", async () => {
    useLaden.setState({
      lagebild: lagebild({ peers: [peer({ clientId: "b", uhrAbweichungMs: UHR_GRENZE_MS })] }),
    });
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText("2 min vor")).toBeDefined();
    });
    // Zweimal: einmal oben als zutreffender Fall, einmal unten in der Liste
    // zum Nachlesen. Dass es dieselbe Zeile ist, ist der Zweck der Matrix.
    expect(screen.getAllByText(/Die Uhr eines Arbeitsplatzes weicht ab/)).toHaveLength(2);
  });

  it("steht auch ohne Auskunft aus der Schale", async () => {
    // Der Fall, den M7.2 teuer gelernt hat: Eine Attrappe, die den Ruf nicht
    // kennt, antwortet `null`. Eine Ansicht, die darauf ein Feld liest,
    // stürzt genau dann ab, wenn sie gebraucht wird.
    attrappe.antwortet("diagnoseAnfordern", null);
    render(<Diagnose jetzt={JETZT} />);
    await waitFor(() => {
      expect(screen.getByText("Wird geholt …")).toBeDefined();
    });
  });
});
