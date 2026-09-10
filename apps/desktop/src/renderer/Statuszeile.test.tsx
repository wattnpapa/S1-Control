/**
 * Die Statuszeile als Komponente (M2.2).
 *
 * Geprüft wird, was der Bediener liest — nicht, welche Elemente entstehen.
 * Deshalb `getByText` statt Baumvergleich: Eine Statuszeile, deren Aufbau sich
 * ändert, aber die dasselbe sagt, ist dieselbe Statuszeile.
 */

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Statuszeile, alter, bytes } from "./Statuszeile.js";
import type { Lagebild } from "../kontrakt/index.js";

afterEach(cleanup);

const JETZT = Date.parse("2026-09-10T08:00:30.000Z");

const GRUND: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:22.000Z",
  letzterShareKontakt: "2026-09-10T08:00:29.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 3,
  einheiten: 2,
  gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 20 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 7,
};

function zeige(teil: Partial<Lagebild> = {}): void {
  render(<Statuszeile lagebild={{ ...GRUND, ...teil }} jetzt={JETZT} />);
}

describe("alter", () => {
  it("rundet grob und in vier Stufen", () => {
    expect(alter("2026-09-10T08:00:30.000Z", JETZT)).toBe("gerade eben");
    expect(alter("2026-09-10T08:00:22.000Z", JETZT)).toBe("vor 8 s");
    expect(alter("2026-09-10T07:57:00.000Z", JETZT)).toBe("vor 3 min");
    expect(alter("2026-09-10T06:00:00.000Z", JETZT)).toBe("vor 2 h");
  });

  it("zeigt eine Zeit aus der Zukunft als gerade eben", () => {
    // §3.2: Eine verstellte Uhr auf einem anderen Rechner ist ein bekannter
    // Fall. „in 4 min" wäre für den Bediener keine Auskunft, sondern ein Rätsel.
    expect(alter("2026-09-10T09:00:00.000Z", JETZT)).toBe("gerade eben");
  });

  it("nennt eine unlesbare Zeit beim Namen", () => {
    expect(alter("kein Zeitpunkt", JETZT)).toBe("unbekannt");
  });
});

describe("bytes", () => {
  it("wechselt die Einheit", () => {
    expect(bytes(512)).toBe("512 B");
    expect(bytes(2048)).toBe("2.0 kB");
    expect(bytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("Statuszeile", () => {
  it("sagt es, wenn kein Einsatz offen ist", () => {
    render(<Statuszeile lagebild={undefined} jetzt={JETZT} />);
    expect(screen.getByText("Kein Einsatz geöffnet")).toBeDefined();
  });

  it("zeigt Stand, Share und Stärke", () => {
    zeige();
    expect(screen.getByText("Stand: vor 8 s")).toBeDefined();
    expect(screen.getByText(/Share erreichbar/)).toBeDefined();
    expect(screen.getByText("2 Einheiten · 1/2/20/23")).toBeDefined();
  });

  it("meldet einen Einsatz ohne Ereignisse nicht als uralt", () => {
    zeige({ standWanduhr: "" });
    expect(screen.getByText("Stand: keine Ereignisse")).toBeDefined();
  });

  it("nennt den unerreichbaren Share mit seiner Meldung", () => {
    zeige({ shareErreichbar: false, shareMeldung: "ENOENT" });
    expect(screen.getByText(/Share nicht erreichbar — ENOENT/)).toBeDefined();
  });

  it("zählt die wachen und die veralteten Arbeitsplätze getrennt (§6.4)", () => {
    zeige({
      peers: [
        { clientId: "b", anzeigename: "B", rechnername: "rb", veraltet: false, wanduhr: "" },
        { clientId: "c", anzeigename: "C", rechnername: "rc", veraltet: true, wanduhr: "" },
      ],
    });
    expect(screen.getByText("1 weitere, 1 veraltet")).toBeDefined();
  });

  it("sagt allein am Einsatz, wenn niemand sonst da ist", () => {
    zeige();
    expect(screen.getByText("allein am Einsatz")).toBeDefined();
  });

  it("zeigt unübertragene Bytes nur, wenn es welche gibt (§5.3)", () => {
    zeige();
    expect(screen.queryByText(/nicht übertragen/)).toBeNull();
    cleanup();
    zeige({ unuebertrageneBytes: 4096 });
    expect(screen.getByText("4.0 kB noch nicht übertragen")).toBeDefined();
  });

  it("verschweigt eine Quarantäne nicht (§8.2)", () => {
    zeige({ quarantaene: ["aa.000001.jsonl@1234"] });
    expect(screen.getByText("1 Stelle(n) in Quarantäne")).toBeDefined();
  });

  it("nennt Konflikthinweise und unbekannte Ereignisse", () => {
    zeige({ hinweise: 2, unbekannteEreignisse: 5 });
    expect(screen.getByText("2 Konflikthinweis(e)")).toBeDefined();
    expect(screen.getByText("5 unbekannte Ereignisse")).toBeDefined();
  });
});
