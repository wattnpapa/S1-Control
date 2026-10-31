import { expect, it, vi } from "vitest";

import { meldeBeimSchliessenAb, type Abmeldeziel } from "./abmeldung.js";

function fenster(): Abmeldeziel & { feuere(persisted: boolean): void } {
  const hoerer = new Set<(e: PageTransitionEvent) => void>();
  return {
    addEventListener: (_art, h) => void hoerer.add(h),
    removeEventListener: (_art, h) => void hoerer.delete(h),
    feuere: (persisted) => {
      for (const h of hoerer) h({ persisted } as PageTransitionEvent);
    },
  };
}

it("sendet beim endgültigen Schließen genau eine Abmeldung", () => {
  const f = fenster();
  const sende = vi.fn(() => true);
  meldeBeimSchliessenAb(f, sende);
  f.feuere(false);
  expect(sende).toHaveBeenCalledWith("abmelden");
});

it("meldet nicht ab, wenn die Seite nur in den Rückwärts-Cache geht", () => {
  const f = fenster();
  const sende = vi.fn(() => true);
  meldeBeimSchliessenAb(f, sende);
  f.feuere(true);
  expect(sende).not.toHaveBeenCalled();
});

it("verträgt fehlendes oder werfendes sendBeacon und hört nach dem Entfernen auf", () => {
  const f = fenster();
  meldeBeimSchliessenAb(f, undefined);
  expect(() => f.feuere(false)).not.toThrow();
  const sende = vi.fn(() => {
    throw new Error("kaputt");
  });
  const weg = meldeBeimSchliessenAb(f, sende);
  expect(() => f.feuere(false)).not.toThrow();
  weg();
  f.feuere(false);
  expect(sende).toHaveBeenCalledTimes(1);
});
