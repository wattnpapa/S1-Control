# ADR-006 – Anmeldung nur für die Internet-Bereitstellung

Status: umgesetzt · Datum: 2026-10-30 · Entscheider: Johannes Rudolph

## Kontext

Die Web-Schale (ADR-005) läuft im Netz der Führungsstelle bewusst ohne Anmeldung: Wer den Dienst erreicht, arbeitet mit, wie auf dem Share jeder schreibt, der das Verzeichnis sieht (Entscheidung 9: keine Rollen und Rechte). Sie soll zusätzlich zentral im Internet bereitgestellt werden. Dort erreicht sie jeder, und „wer sie erreicht, gehört dazu“ gilt nicht mehr.

Gefragt ist ein Schutz gegen einfachen Zugriff Dritter — nicht eine Benutzerverwaltung, nicht ein Rollenmodell und nicht die Zuordnung von Ereignissen zu Personen.

## Entscheidung

1. **Zuschaltbar.** `S1_WEB_ZUGANG=offen` (Vorgabe, heutiges Verhalten) oder `anmeldung`. Ein unbekannter Wert ist ein Startfehler: Ein Dienst, der wegen eines Tippfehlers still offen im Internet stünde, wäre der schlimmste Ausgang. Die Desktop-Schale und die Web-Schale im Netz der Führungsstelle bleiben ohne Anmeldung.
2. **Ein gemeinsamer Zugang.** `S1_WEB_ANMELDENAME` und `S1_WEB_PASSWORT` (mind. 12 Zeichen) aus der Umgebung (`.env`). Beim Start wird das Passwort mit `scrypt` und zufälligem Salz zu einem Hash im Speicher, aus `process.env` entfernt und nirgends protokolliert; verglichen wird zeitkonstant (`timingSafeEqual`), Anmeldename und Passwort immer beide. Keine Benutzerdatei, keine Verwaltungsbefehle.
3. **Kein Rollenmodell — Entscheidung 9 bleibt.** Die Anmeldung hält Dritte draußen, sie sagt nicht, wer drinnen ist. **Der Akteur der Ereignisse bleibt der Anzeigename des Arbeitsplatzes** (ADR-005 Entscheidung 3); ein gemeinsamer Anmeldename sagte nichts über die Person. Ein Browser bleibt ein Arbeitsplatz (Entscheidungen 1–4 und 6 von ADR-005 gelten unverändert).
4. **Sitzungen serverseitig.** Nach der Anmeldung ein Cookie `s1-sitzung` (zufällig, 24 Bytes, `HttpOnly`, `SameSite=Strict`, `Secure` hinter HTTPS). Der Dienst hält nur den SHA-256 des Schlüssels in `<S1_DATEN>/sitzungen.json` (atomar geschrieben), mit gleitender Lebensdauer `S1_WEB_SITZUNG_H` (Vorgabe 12 h). Abgelaufenes wird beim Start und alle 15 Minuten entfernt; gültige Sitzungen überleben einen Neustart.
5. **Vor dem Dienst, nicht in ihm.** Die Anmeldung (`apps/desktop/src/web/anmeldung.ts`) prüft jede Anfrage außer `/gesundheit`, bevor der Dienst sie sieht: ohne Sitzung `POST /ruf` und `GET /mitteilungen` → 401 (JSON), jede andere Seite → 303 auf die Anmeldeseite. Die Anmeldeseite ist ein Formular ohne Skript (`POST anmeldung`), `POST abmeldung` beendet die Sitzung. Herkunftsprüfung wie bei `/ruf`. Arbeitsplätze, Vermittlung und Worker wissen von der Anmeldung nichts; der Dienst ergänzt nur `umgebung` um `anmeldung: true`, damit das Kopfband „Abmelden“ zeigt.
6. **Bremse gegen Durchprobieren.** Je Absender-IP höchstens 5 Fehlversuche in 15 Minuten, danach 429 mit Wartezeit, auch für das richtige Passwort. Fehlversuche stehen mit Anmeldename und IP im Protokoll, nie mit Passwort oder Cookie-Wert. Die IP kommt hinter dem Proxy (`S1_WEB_HINTER_PROXY=1`) aus `X-Forwarded-For`, sonst vom Socket.
7. **TLS vor dem Dienst.** Der Dienst spricht selbst kein HTTPS. `docker-compose.internet.yml` stellt Caddy davor (automatisches Zertifikat für `S1_DOMAIN`); der Dienst lauscht nur im Compose-Netz. Ohne Proxy-Kennzeichen warnt der Dienst beim Start.

## Begründung

- Ein gemeinsamer Zugang deckt den Auftrag (Dritte draußen halten) mit dem kleinsten Bestand: keine Datei mit Konten, keine Befehle, keine Fragen, wer ein Konto anlegt oder sperrt. Wer den Zugang ändern will, ändert `.env` und startet neu.
- Den Akteur an den Anmeldenamen zu binden, wäre bei einem gemeinsamen Zugang eine Scheingenauigkeit: Im Einsatztagebuch stünde für alle derselbe Name. Der Anzeigename je Arbeitsplatz ist die bessere Angabe — und dieselbe wie im Netz der Führungsstelle.
- Serverseitige Sitzungen statt signierter Cookies: Abmelden wirkt sofort, und ein Neustart braucht kein zusätzliches Geheimnis, das verwaltet werden müsste.
- Keine Abhängigkeit: `node:crypto` und `node:http` reichen.

## Konsequenzen

- Wer das Share-Volume oder das Daten-Volume des Servers lesen kann, liest alles — die Anmeldung schützt den HTTP-Weg, nicht die Dateien. Sicherungen der Volumes sind entsprechend zu behandeln.
- Alle Bediener teilen ein Passwort. Scheidet jemand aus, wird das Passwort in `.env` geändert und der Dienst neu gestartet; bestehende Sitzungen enden spätestens nach `S1_WEB_SITZUNG_H` ohne Nutzung, sofort durch Löschen von `sitzungen.json` im Daten-Volume.
- Das Arbeitsplatz-Cookie `s1-arbeitsplatz` bleibt ohne `Secure` (ADR-005); im Internet leitet Caddy `http` auf `https` um, und ohne gültige Sitzung führt es zu keinem Arbeitsplatz.
- Betrieb: `docs/v2/BETRIEB.md`, Abschnitt „Bereitstellung im Internet mit Anmeldung“.
