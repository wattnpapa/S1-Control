/**
 * Die Anmeldung der Offline-Schale: still, wo es nicht geht.
 */

import { describe, expect, it, vi } from "vitest";

import { registriereOfflineSchale } from "./offlineSchale.js";

describe("registriereOfflineSchale", () => {
  it("meldet sw.js relativ zur Seite an", async () => {
    const register = vi.fn(async () => ({}) as ServiceWorkerRegistration);
    expect(await registriereOfflineSchale({ serviceWorker: { register } })).toBe(true);
    expect(register).toHaveBeenCalledWith("sw.js", { scope: "./" });
  });

  it("tut ohne Service-Worker-Unterstützung (http, Electron) nichts", async () => {
    expect(await registriereOfflineSchale({})).toBe(false);
    expect(await registriereOfflineSchale(undefined)).toBe(false);
  });

  it("lässt die App weiterlaufen, wenn die Anmeldung scheitert", async () => {
    const register = vi.fn(async () => {
      throw new Error("SecurityError");
    });
    expect(await registriereOfflineSchale({ serviceWorker: { register } })).toBe(false);
  });
});
