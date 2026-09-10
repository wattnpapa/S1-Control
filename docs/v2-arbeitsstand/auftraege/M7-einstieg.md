# Einstieg in M7 — Verteilung und Betrieb

Stand: 2026-09-10 · Meilenstein M7 aus [03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md), im Umsetzungsplan der Block [V](../../v2/05-UMSETZUNGSPLAN.md) · Status: **in Arbeit**

M7 beantwortet die Frage, die nach sechs Meilensteinen Fachlichkeit übrig ist:
**Wie kommt das Programm auf einen Rechner der Führungsstelle, und was tut
jemand, wenn es klemmt?**

Es ist der Meilenstein, auf den vier offene Abnahmen warten. M0.5 (Messung am
echten Share), M2.4 (zwei Rechner), M3.5 (Monitor auf einer zweiten Anzeige)
und Prüfpunkt 3 (Parität mit dem Excel-Ausdruck) brauchen alle dasselbe: eine
installierte Anwendung auf einem Rechner, der nicht dieser hier ist. Seit M6
kommt die Kamerafrage dazu.

## Was der Bestand hergibt

| Was M7 braucht | Wo es liegt |
|---|---|
| Bau von Renderer und Schale | `npm run build` seit M-0 |
| Eine Paketierung, die schon einmal lief | `legacy-v1/package.json`, Block `build` — NSIS, DMG, deb |
| CI auf drei Plattformen | `.github/workflows/build-v2.yml` seit M2.5 |
| Ed25519 signieren und prüfen | `@bos/eeb-format`, `signatur.ts` |
| `s1 diagnose` | `@s1/cli` seit M-0.3 |
| Präsenz, Offsets, Quarantäne, Hinweise | im Lagebild seit M2.3 |
| Die Rauchprobe als Messwerkzeug | `S1_SMOKE=1`, `=ausgaben`, `=kamera` |

Was **nicht** dasteht: eine `electron-builder`-Konfiguration im v2-Baum, ein
Update-Weg, eine Diagnoseansicht, `BETRIEB.md`, eine Kurzanleitung.

## Was M7 nicht beweisen kann, und warum das im Plan steht

Drei der fünf Pakete enden mit einer Abnahme, die Hardware oder Geheimnisse
braucht:

* **Die Installation ohne Elevation** (V.1) ist auf einem FüSt-Rechner zu
  zeigen. `M-1` im Meilensteindokument nennt genau das als Vorschaltung mit
  Abbruchkriterium — „(c) negativ ⇒ jeder Desktop-Ansatz fällt". Ob dieser
  Versuch je gefahren wurde, steht nirgends im Arbeitsstand.
* **Signierung und Notarisierung** (V.1) brauchen ein Zertifikat und eine
  Apple-Kennung. Beides sind Geheimnisse, die dieser Baum nicht hat und nicht
  haben soll.
* **Die Abnahmeübung** (V.5) braucht drei bis vier Rechner und ein NAS.

Gebaut wird deshalb alles bis unmittelbar davor, und zwar so, dass der Versuch
ohne weitere Arbeit gefahren werden kann: eine Konfiguration, die auf einer
Maschine mit Zertifikat signiert und ohne eines unsigniert baut; ein
Update-Weg, dessen **Prüfung** vollständig testbar ist, auch wenn die
Installation es nicht ist; eine Abnahmeliste zum Abhaken statt einer
Behauptung, sie sei abgehakt.

## Reihenfolge

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M7.1** Paketierung: NSIS per-User, Portable, DMG, deb; CI-Artefakte | ohne Paket gibt es nichts zu verteilen und nichts zu aktualisieren |
| 2 | M7.2 Update über den Share mit signiertem Manifest | braucht ein Paket, auf das es zeigen kann |
| 3 | M7.3 Diagnoseansicht und Störfallmatrix | die sechs Fälle sind erst vollständig, wenn „Update schlägt fehl" einer sein kann |
| 4 | M7.4 `BETRIEB.md`, Kurzanleitung, Abnahmeliste | sie beschreiben, was 1 bis 3 gebaut haben |

## Definition of Done je Paket

| WP | DoD |
|---|---|
| M7.1 | `electron-builder` baut aus dem v2-Baum ein NSIS-Paket **per User** (`perMachine: false`), eine Portable-EXE, ein DMG und ein deb; die CI legt sie als Artefakt ab. Signierung ist konfiguriert und wird ohne Zertifikat übersprungen, nicht erzwungen. **Installation auf einem FüSt-Rechner: offen** |
| M7.2 | Manifest mit Version, Datei, Größe, SHA-256 und Ed25519-Signatur; die Prüfung lehnt eine falsche Signatur ab, eine fremde Datei und ein älteres Manifest ebenso; die Anwendung zeigt einen Hinweis. **Das Einspielen selbst: offen** |
| M7.3 | Die Ansicht zeigt Peers, Offsets, Quarantäne, Hinweise und den Ort der Logdatei; die sechs Fälle der Störfallmatrix stehen als Daten in Ring 2 und werden von Ansicht **und** Kurzanleitung gelesen |
| M7.4 | `BETRIEB.md` beschreibt Share einrichten, Ordnerrechte, Notverfahren bei NAS-Ausfall und die USB-Übergabe; die Kurzanleitung passt auf zwei Seiten; die Abnahmeliste ist abhakbar. **Durchgearbeitet von einer zweiten Person: offen** |

## Was M7 nicht liefert

* **Keine automatische Installation ohne Rückfrage.** Ein Update wird
  angeboten und angezeigt; ausgelöst wird es von einem Menschen. Ein Programm,
  das sich mitten in einer Lage selbst ersetzt, ist ein Ausfall mit Ansage.
* **Kein LAN-Peer-Update.** Entscheidung 7: gestrichen, der Share ersetzt es.
* **Keine Telemetrie.** Was auf dem Rechner der Führungsstelle geschieht,
  bleibt dort.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten, begründender Stil mit Paragraphenverweis.
* Ringgrenzen aus 02-ZIELBILD.md. Die Prüfung eines Manifests ist rein und
  gehört nach Ring 2; der Griff auf Dateien und Prozesse in die Schale.
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
