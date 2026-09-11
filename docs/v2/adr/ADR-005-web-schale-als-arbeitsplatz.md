# ADR-005 – Web-Schale als weiterer Arbeitsplatz, nicht als Server

Status: umgesetzt · Datum: 2026-09-11 · Entscheider: Johannes Rudolph

## Kontext

Die Randbedingung „kein Serverprozess" (01-ENTSCHEIDUNG.md, 02-ZIELBILD.md) meint den Datenpfad: Die Wahrheit liegt in den Ereignisdateien auf dem Share, jeder Client schreibt nur eigene Dateien, und nichts zwischen Client und Share entscheidet über Daten. Sie meint nicht, dass jeder Bediener eine installierte Anwendung braucht.

In der Führungsstelle gibt es Rechner, auf denen sich S1-Control nicht starten lässt: fremde Geräte, Rechner mit AppLocker oder WDAC, Konten ohne das Recht, eine EXE aus dem Profil auszuführen (03-MEILENSTEINE.md, M-1 Fall (c)). Für diese Plätze soll die Anwendung im Browser laufen, und zwar **neben** den Desktop-Arbeitsplätzen auf demselben Share, ohne eigenen Datenbestand und ohne zweite Wahrheit.

Der Renderer erreicht die Schale seit M2.1 ausschließlich über eine injizierbare Brücke mit zwei Funktionen (`ruf`, `aufMitteilung`); Vermittlung, Arbeiterhof und Worker kennen kein Electron. Die Frage war deshalb nicht, ob eine Web-Schale geht, sondern was sie fachlich ist.

## Entscheidung

1. **Die Web-Schale ist ein Rechner mit mehreren Arbeitsplätzen, kein Server.** Sie läuft als Node-Prozess (`apps/desktop/src/web/`, gebaut nach `out/web.mjs`), typischerweise in einem Container, der das Share eingehängt hat. Dateizugriff, Spiegelung, Fold und Präsenz sind dieselben Worker wie auf dem Desktop; die Web-Schale liest und schreibt das Share genau so, wie es ein weiterer Windows-Rechner täte.
2. **Jeder Browser ist ein Arbeitsplatz** mit eigener `clientId` (§4.1), eigenem lokalen Spiegel (§5.1) unter der Datenwurzel des Dienstes, eigenen Ereignisdateien und eigenem Undo-Stapel (§6 U3). Die Zuordnung Browser → Arbeitsplatz ist ein `HttpOnly`-Cookie mit zufälligem Schlüssel; die `clientId` verlässt den Dienst nur zur Anzeige. Zwei Reiter eines Browsers teilen den Arbeitsplatz — das ist der Fall „zwei Fenster einer Instanz", nicht „zwei Schreiber mit einer Kennung" (§4.4).
3. **Der Share-Pfad ist fest** und kommt aus der Umgebung des Dienstes (`S1_SHARE`); ein Browser kann ihn nicht umstellen. Der Anzeigename bleibt je Arbeitsplatz einstellbar und wird zum `akteur.benutzer` der Ereignisse, weil ein Browser kein Benutzerkonto hat.
4. **Transport:** `POST /ruf` für Rufe (Kontraktprüfung mit denselben zod-Schemata wie im Main), `GET /mitteilungen` als Server-Sent Events für die Mitteilungen. Keine zusätzliche Abhängigkeit; `EventSource` verbindet selbst neu, und der Delta-Weg des Stores (Folge, `standAnfordern`) fängt die Lücke.
5. **Keine Anmeldung.** Wer den Dienst im Netz der Führungsstelle erreicht, arbeitet mit — wie auf dem Share jeder schreibt, der das Verzeichnis sieht (Entscheidung 9). Rufe werden nur aus derselben Herkunft angenommen (`Origin`, `Sec-Fetch-Site`, `SameSite=Strict`), damit keine fremde Seite über das Cookie mitarbeitet.
6. **Lebensdauer:** Ein Arbeitsplatz bleibt nach dem letzten Browser eine Gnadenfrist (Vorgabe 120 s) offen, damit ein Neuladen den Worker nicht neu startet; danach werden seine Akten geordnet geschlossen. Beim Beenden des Dienstes (SIGTERM) werden alle Arbeitsplätze geschlossen, der Upload-Stand fortgeschrieben, die Präsenz bleibt liegen (§6.4).

## Begründung

- Ein Arbeitsplatz für alle Browser wäre kürzer gewesen und falsch: Der Undo-Stapel ist je Client, und ein Bediener, der den Schritt eines anderen zurücknimmt, ohne es zu wissen, ist genau das stille Verwerfen, das 02-ZIELBILD.md Nr. 5 ausschließt. Als eigener Arbeitsplatz erscheint jeder Browser außerdem in der Präsenz der anderen, mit Anzeigename und Rechnername des Dienstes.
- Ein eigener Datenpfad (Datenbank, API, Sync) hätte eine zweite Wahrheit geschaffen — den Fehler, den ADR-002 mit dem Ereignisprotokoll gerade beseitigt.
- Die Ringgrenzen bleiben: `src/web` ist eine zweite Schale in Ring 4, ohne Electron und ohne Renderer-Bibliothek, mit demselben Verbot synchroner Aufrufe wie der Main (ein Thread bedient alle Browser); ESLint erzwingt beides.

## Konsequenzen

- Der Bau erzeugt neben `main.mjs` auch `web.mjs`; `npm run start:web` startet die Schale lokal, `Dockerfile` und `docker-compose.yml` bauen das Laufbild aus `out/`. Das Laufbild enthält kein `node_modules` und kein Electron.
- Der Linux-Leser gilt: KONZEPT-SPEICHER.md §6.6 (actimeo, Verzeichnis-Cache). Ob ein cifs-Mount im Container die Messwerte aus M0.5 hält, ist am echten NAS nachzumessen — derselbe Prüfpunkt wie für jeden weiteren Client-Typ.
- Der Dienst ist eine weitere Instanz des Programms und gehört in die Update-Überlegung von V.2: Ein Container wird durch ein neues Bild aktualisiert, nicht über `programm\` auf dem Share; `mindestClientVersion` im Manifest warnt ihn wie jeden anderen Client.
- Offen (Stufe 2): Anmeldung mit Namen beim ersten Besuch statt Anzeigename in den Einstellungen; HTTPS hinter einem Reverse-Proxy, sobald die Führungsstelle das braucht; Ausgaben (PDF über `printToPDF`) haben im Container kein Electron und brauchen dort einen anderen Weg.
