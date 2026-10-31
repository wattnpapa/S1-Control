/**
 * Meldet die Offline-Schale (`public/sw.js`) im Browser an.
 *
 * Nur die Web-Schale ruft das (`haupt.tsx`). Ein Service Worker gibt es nur in
 * einem sicheren Kontext – https oder `localhost`; im reinen http-Netz der
 * Führungsstelle fehlt `navigator.serviceWorker`, und die Anmeldung unterbleibt
 * stumm. Dort bleibt es bei der Statusanzeige der laufenden Seite
 * (`Verbindungsbanner`); nur der Neustart ohne Dienst zeigt dann die Fehlerseite
 * des Browsers. Das ist dokumentiert (docs/v2/adr/ADR-007).
 */

export interface ServiceWorkerQuelle {
  readonly serviceWorker?: Pick<ServiceWorkerContainer, "register">;
}

/** @returns `true`, wenn die Schale angemeldet wurde. */
export async function registriereOfflineSchale(
  navigator: ServiceWorkerQuelle | undefined = globalThis.navigator,
): Promise<boolean> {
  if (navigator?.serviceWorker === undefined) return false;
  try {
    // Relativ zur Seite, damit es auch hinter einem Unterpfad gilt.
    await navigator.serviceWorker.register("sw.js", { scope: "./" });
    return true;
  } catch {
    // Eine fehlgeschlagene Anmeldung darf die App nie behindern.
    return false;
  }
}
