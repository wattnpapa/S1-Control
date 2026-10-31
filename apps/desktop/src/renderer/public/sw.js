/*
 * Offline-Schale der Web-Schale (ADR-007).
 *
 * Was sie tut – und was bewusst nicht: Sie legt **nur** die statische Seite
 * `offline.html` zurück. Lädt der Browser die App ohne Netz (Funkloch, Dienst
 * neu gestartet, Proxy meldet 502/503/504), steht dort statt einer weißen
 * Seite ein verständlicher Hinweis mit automatischem Neuversuch. Sie zwischen-
 * speichert weder die App noch Daten und schreibt nichts nach: Ein Offline-
 * Schreiben ohne Dienst gibt es nicht (Datenintegrität vor Funktionsumfang).
 * Die geschützte Seite hinter der Anmeldung wird deshalb auch nie im Cache
 * abgelegt.
 *
 * Reines JavaScript ohne Bauschritt, damit der Test sie unverändert laden kann.
 */

/* global self, caches, fetch, Request, Response */

const VERSION = "s1-offline-v1";
const OFFLINE_SEITE = "offline.html";

async function legeOfflineSeiteAb() {
  const cache = await caches.open(VERSION);
  const antwort = await fetch(new Request(OFFLINE_SEITE, { cache: "reload" }));
  // Eine Weiterleitung (etwa auf die Anmeldeseite) ist keine Offline-Seite.
  if (!antwort.ok || antwort.redirected) throw new Error("Offline-Seite nicht abrufbar.");
  await cache.put(OFFLINE_SEITE, antwort);
}

async function raeumeAlteStaendeAuf() {
  const namen = await caches.keys();
  await Promise.all(namen.filter((name) => name !== VERSION).map((name) => caches.delete(name)));
}

async function offlineAntwort() {
  const abgelegt = await caches.match(OFFLINE_SEITE);
  if (abgelegt !== undefined) return abgelegt;
  return new Response(
    "<!doctype html><meta charset=utf-8><title>Dienst nicht erreichbar</title>" +
      "<p>Dienst nicht erreichbar, es wird neu verbunden.</p>" +
      "<script>setTimeout(function(){location.reload()},3000)</script>",
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function beantworteNavigation(anfrage) {
  try {
    const antwort = await fetch(anfrage);
    // Ein Reverse-Proxy ohne Dienst dahinter antwortet mit 502/503/504.
    if (antwort.status >= 502 && antwort.status <= 504) return await offlineAntwort();
    return antwort;
  } catch {
    return await offlineAntwort();
  }
}

self.addEventListener("install", (ereignis) => {
  ereignis.waitUntil(legeOfflineSeiteAb().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(raeumeAlteStaendeAuf().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (ereignis) => {
  // Nur das Laden der Seite selbst. Rufe, Strom und Assets gehen unverändert durch.
  if (ereignis.request.mode !== "navigate") return;
  ereignis.respondWith(beantworteNavigation(ereignis.request));
});
