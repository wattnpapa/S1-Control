# Übungsbögen des Demo-Einsatzes

Übernommen aus `wattnpapa/erfassungsbogen`, Verzeichnis `examples/`, Stand
`f41f024` (2026-11-22). 25 Bögen, unverändert bis auf den Dateinamen. Alle
Personen sind erfunden, alle Rufnummern beginnen mit 555, die Bögen sind
upstream als Übung gekennzeichnet.

| Datei hier | Quelle unter `examples/` |
|---|---|
| `thw-oldenburg-*.json` (8) | `thw/ortsverbaende/lv-bremen-niedersachsen/rst-oldenburg/ov-oldenburg-ni/` |
| `thw-nordenham-b.json`, `thw-varel-*.json`, `thw-leer-fgr-w.json`, `thw-aurich-fgr-log-v.json`, `thw-westerstede-b.json` | `thw/ortsverbaende/lv-bremen-niedersachsen/rst-oldenburg/ov-*/` |
| `feuerwehr-ammerland-fachzug-th.json` | `feuerwehr/niedersachsen/kreisfeuerwehren/landkreis-ammerland/kfb/03-fachzug-technische-hilfeleistung.json` |
| `feuerwehr-emden-loeschgruppe-kats.json`, `kats-*.json`, `dlrg-langenhagen-staffel-wasserrettung.json`, `asb-soltau-verpflegungsgruppe.json` | `katastrophenschutz/niedersachsen/` |
| `drk-rastede-bereitschaft.json` | `drk/niedersachsen/standorte/lk-ammerland/wache-drk-kv-ammerland-bs-rastede.json` |
| `juh-ahlhorn.json` | `juh/niedersachsen/standorte/lk-oldenburg-land/wache-juh-ov-ahlhorn.json` |
| `mhd-sandkrug.json` | `mhd/niedersachsen/standorte/lk-oldenburg-land/wache-mhd-sandkrug.json` |
| `bundeswehr-kreisverbindungskommando.json` | `bundeswehr/kreisverbindungskommando.json` |

Sie liegen hier und nicht unter `pruefdaten/`, weil sie zum Programm gehören:
Der Knopf „Demo-Einsatz" liest sie zur Laufzeit ein, und `pruefdaten/` wird
nicht ausgeliefert. Stand, Zeitraum und Auftrag setzt das Drehbuch beim
Einspielen (`demokraefte.ts`); Einheit, Personal, Fahrzeuge und Sofortbedarf
bleiben, wie sie im Bogen stehen.

Eine Einheit austauschen: Bogen hierher legen, in `index.ts` eintragen, in
`../demoeinheiten.ts` die Zeile ändern.
