# 03 – Meilensteine und Auflagen

Stand: 2026-09-08 · Einheit: Personenwoche (PW) = 5 konzentrierte Arbeitstage eines KI-gestützten Einzelentwicklers. Kalenderzeit folgt erst aus der Verfügbarkeit (offene Entscheidung 2); bei 10 Stunden je Woche entspricht 1 PW etwa 4 Kalenderwochen.

## Vorschaltungen vor der ersten Codezeile (zusammen unter 1 PW)

| Schritt | Dauer | Inhalt | Abbruchkriterium |
|---|---|---|---|
| **M-1 Feldversuch ohne Code** | ½ Tag | Am heutigen v1-Release-Artefakt auf einem echten FüSt-Rechner: (a) installiert der NSIS-Installer per-User ohne Elevation? (b) läuft der stille Update-Start ohne Elevation? (c) startet die unsignierte EXE überhaupt (SmartScreen, AppLocker, WDAC)? | (c) negativ ⇒ jeder Desktop-Ansatz fällt; Randbedingung „kein Serverprozess" neu verhandeln |
| **M-0 Werkzeug- und Verdrahtungs-Spike** | ½ Tag | Leeres `@bos/kern` mit einer Funktion als Submodul in beiden Repos; beide bauen und testen grün unter TS 7, Vite 8, Vitest 4, ESM (Vite-, Capacitor- und PWA-Kette des Erfassungsbogens eingeschlossen) | Kette bricht ⇒ Kernaufteilung überdenken, bevor die Extraktion beginnt |
| **M0 Beweis der Speicherarchitektur ohne UI** | 1,5 bis 2,0 PW | `@s1/domaene` Minimalfold + `@s1/speicher` Segmente/Spiegelung + `s1 simuliere`: SMB-Latenzmessung auf dem echten Synology-Share; Gesamtkosten eines Poll-Zyklus bei N Segmenten und 5 Clients; feindliche Dateisystem-Schicht in der Simulation; Läufe auf mindestens zwei Rechnern und zwei Betriebssystemen; Fehlerinjektion (hartes Töten mitten im Append, Kabel ziehen, NAS-Neustart, verstellte Uhr, geklontes Profil) | zählbares Kriterium: Konvergenz aller Clients per Hash nach jeder Ruhephase, lokales Log gleich Share-Segment je Client, Sichtbarkeitslatenz p95 innerhalb der Zusage aus dem Zielbild |

## Meilensteine

Ausgangspunkt ist die Gliederung von Vorschlag A, korrigiert um die Posten, die die Widerlegungen als fehlend nachgewiesen haben (Renderer, CI/Verteilung, Diagnose, Anwenderdokumentation, Abnahme). Alle Zahlen sind Spannen; die Summe für Excel-Parität liegt nach Korrektur bei **20,5 bis 32 PW**.

| Nr. | Meilenstein | Definition of Done | PW |
|---|---|---|---|
| M1 | Kern-Pakete | `@bos/kern` Stufe 1 extrahiert (Bogenmodell, Codec, Signatur, Vokabulare, Meldekopf-Sammlung mit injizierter Speicherhülle, Aufteilen/Zusammenführen, Diff), Erfassungsbogen läuft damit; `@s1/domaene` mit Zielmodell, Ereigniskatalog, Fold, HLC, Kennzahlen, Property-Tests grün | 3,0 bis 5,0 |
| M2 | Schale, Worker, Store | Electron-Main ohne Fachzustand, Worker je Akte, Zustand-Store, Präsenz, Undo; zwei Rechner auf dem echten Share führen denselben Einsatz | 2,0 bis 3,0 |
| M3 | Lagebild | Einsatz anlegen, Abschnittsbaum, Einheiten mit Stärke, Status, Schicht, Verschieben, Aufteilen, Zusammenführen, ETB-Ansicht, Vorlagenkatalog, taktische Zeichen, Stärke-Monitor | 2,5 bis 3,5 |
| M4 | Kernausgaben | Druck für die Lagekarte, Status-Matrix, Auswertung, HTML-Monitor, Einsatzakte als ZIP; Abgleich gegen die synthetische Referenzlage | 2,0 bis 3,0 |
| **Zwischenziel „besser als die Excel"** | **M0 bis M4 plus Verteilung** | Mehrbenutzerfähig, Einsatztagebuch, druckbar; Kosten, Schichtplan, Logistik bleiben in der Excel | **10 bis 14** |
| M5 | Ressourcenplanung, Logistik, Kosten, FüSt-Personal | Anforderung/Zusage/Ablösung/Rückführung, Logistikbedarf und Log-Ausgabe, Kostenparameter, FüSt-Personal mit Schichtplan | 3,0 bis 4,0 |
| M6 | EEB und Meldekopf | QR per Kamera und Handscanner mit Segmentsammlung und Signaturprüfung, Bündeldatei, Meldekopf-Modus direkt auf dem Share, Eingangskorb mit Quittierung, Revisionen und Diff | 2,0 bis 3,0 |
| M7 | Verteilung und Betrieb | Installer per-User, Update-Ablage auf dem Share mit Ed25519-Manifest, Diagnoseansicht, CLI, Störfallmatrix, Reparatur- und Rückfallstrecke | 1,5 bis 2,5 |
| M8 | Dokumentation und Abnahme | Anwenderdokumentation, In-App-Hilfe, Tastenkürzel, Abkürzungsliste; eine Übung vollständig in v2 geführt; FüOrg-Editor | 2,0 bis 3,0 |
| — | Laufende Pflege | Electron-Majors, Signaturmaterial, Abhängigkeiten in zwei Repos | 1,0 bis 2,0 je Jahr |

Reihenfolge nach M4 kann nach Bedarf der FüSt getauscht werden; M6 vor M5 ist plausibel, wenn Meldeköpfe früh mitarbeiten sollen.

## Die 25 Auflagen aus den Widerlegungen

Konsolidiert aus den sechs Widerlegungen (Urteil §12.5), nach Fälligkeit.

**Vor der ersten Codezeile**
1. M-1 durchführen und dokumentieren.
2. M-0 durchführen (Werkzeugkette und Submodul-Verdrahtung in beiden Repos).
3. Verfügbarkeit in Stunden je Woche festschreiben; PW in Kalenderdaten übersetzen; je Meilenstein ein Abbruchdatum.

**In die Spezifikation, vor dem ersten Code in `@s1/domaene`**
4. Fold als Mengenfunktion mit Rebase; jedes materialisierte Feld trägt die HLC seines Gewinners; Schnappschüsse tragen `foldVersion`.
5. HLC als Struktur vergleichen, nicht als Zeichenkette; Textform mit fester Stellenzahl.
6. Jedes setzende Ereignis trägt den Vorher-Wert; Abweichung vom gefalteten Zustand ⇒ Konflikthinweis.
7. Vorgänger-Hash beim Lesen prüfen; defekte Zeile ⇒ Quarantäne ab Offset mit Hinweis, kein Stillstand.
8. Ereignis-ID mit persistenter, monotoner Laufnummer je Client; Fremdschreiber-Erkennung beim Start; Single-Instance-Lock.
9. Segmentwechsel nach Größe, nicht bei jedem Start; `mindestClientVersion` als Warnung, nicht als Sperre.
10. Zyklusregel für `AbschnittUmgehaengt`; relative statt absoluter Stärkeänderung bei Aufteilen/Zusammenführen; Auffangregel für aufgelöste Abschnitte.
11. Undo als normales Ereignis mit `undoOf`, Stapel je Client, `KorrekturVon`, kein Redo.
12. „Neueste Revision zählt" definieren: HLC entscheidet, fachliche Meldezeit wird angezeigt und plausibilisiert; große Abweichung ⇒ Konflikthinweis am Stärkewert.
13. Ereignis nach `archiv.marker` hat genau eine Behandlung; Ordnerverschiebung darf keinen Upload-Retry ins Leere laufen lassen.
14. Anspruch „revisionssicher" streichen; zugesagt wird nur „Änderung innerhalb einer Datei erkennbar".

**In M0 und dessen Abnahme**
15. Feindliche Dateisystem-Schicht in der Simulation.
16. SMB-Latenzmessung auf dem echten Share und Gesamtkosten eines Poll-Zyklus bei fünf Clients.
17. Läufe auf mindestens zwei Betriebssystemen; CI-Jobs der Speicherschicht auf Windows und macOS/Linux.
18. Zählbares Abbruchkriterium; Property 1 darf keine Tautologie über die Sortierfunktion sein.

**In den Plan als eigene Posten**
19. Anwenderdokumentation, In-App-Hilfe, Tastenkürzel (+1,0 bis 2,0 PW, in M8 enthalten).
20. Diagnose und Störfallmatrix (+0,25 bis 0,5 PW, in M7 enthalten).
21. Reparatur- und Rückfallstrecke, wenn die Anwendung ausfällt, nicht nur das NAS.
22. Synthetische Referenzlage: eine realistische Übungslage einmal von Hand in der Excel erfassen und ausdrucken; ohne sie gibt es kein Abnahme-Orakel für Goldfiles und den Paritätsvergleich.
23. Windows-Entwicklungsmaschine benennen; mindestens sieben Arbeitspakete sind Windows-spezifisch.
24. Zielplattformen festlegen: Windows Produkt, macOS Entwicklungsplattform mit Best-Effort-Paket, Linux nur CI-Lauf.
25. Laufende Pflege einplanen (1,0 bis 2,0 PW je Jahr).
