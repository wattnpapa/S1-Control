# Reale Betriebsparameter (Auskunft Johannes, 2026-09-07)

Diese Angaben stammen direkt von Johannes und schließen Lücke 3 der Vollständigkeitskritik.
Sie sind für alle Architekturvorschläge, Widerlegungen und das Urteil verbindlich.

| Frage | Antwort | Konsequenz für den Entwurf |
|---|---|---|
| NAS / Share | **Synology** (SMB) | Samba-basiert, SMB3 mit Leases; Directory-Cache-Verhalten der Windows-Clients gilt. NFS spielt keine Rolle. |
| Zeitsynchronisation | **NTP vorhanden** im Einsatznetz | Uhren sind grob synchron; HLC bleibt sinnvoll für Ordnung, aber TTL-/Stale-Mechanismen sind nicht mehr prinzipiell undefiniert. |
| Client-Betriebssystem | **Windows 11** | WebView2-Evergreen-Laufzeit ist auf Windows 11 vorinstalliert; `fixedRuntime`/`offlineInstaller` ist kein Muss mehr, nur noch Absicherung. |
| Rechte | **keine Admin-Rechte** auf den FüSt-Rechnern | Installer müssen per-User installieren (NSIS per-user / portable / MSI per-user). Kein Dienst, kein Treiber, keine Systemänderung. Auto-Update muss ohne Admin funktionieren. |
| Gleichzeitige Rechner | **1 bis 5** | Kleine Client-Zahl; Polling auf wenige Dateien ist unkritisch; Presence-Liste bleibt klein. |
| macOS / Linux | **berücksichtigen** | Cross-Plattform bleibt Anforderung (Entwicklung auf macOS; Linux als Tier 2). |
| Mehrclient-Betrieb v1 | **wurde versucht; mit SQLite "super langsam"** | Der SQLite-Abbruch war ein Latenz-/Sperr-Problem über SMB, keine Korruption. Bestätigt die Einordnung der NAS-Recherche (Option A ausgeschlossen). |
| LAN-Peer-Update | nicht beantwortet | Als offen führen; Standardannahme: nicht zwingend. |
| Altdaten | **keine**: keine produktiven SQLite-/JSON-Einsatzdateien, keine gefüllten Excel-Mappen | **Grüne Wiese ohne Migrationspfad.** Weder v1-`.s1control` noch Excel-Einsatzdaten müssen importiert werden. Nur die Kopiervorlagen (StAN-Katalog) der Excel sind als Vorlagen fachlich weiter interessant. |
| Größter Einsatz bisher | nicht beantwortet | Auslegung auf 100 bis 300 Einheiten (Excel-Kapazität 272 Zeilen) als Zielgröße, 5.000 als obere Schranke der Speicherbewertung. |
