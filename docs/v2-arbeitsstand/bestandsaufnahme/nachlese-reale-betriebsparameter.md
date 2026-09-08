# Nachlese: Reale Betriebsparameter (NAS/SMB, Clients, Einsatzgrößen, Dateigrößen, Updater, Migration, Lost Update, SMB-Latenzen)

Status: IN ARBEIT (Datei wird nach jedem Teilthema fortgeschrieben)

## Gliederung
1. Methodik und Quellenlage (was auf diesem Mac prüfbar ist, was nicht)
2. NAS/SMB-Implementierung
3. Client-OS-Mischung / Windows-Version / Build-Targets
4. Anzahl gleichzeitiger Clients
5. NTP / Zeitsynchronisation
6. Reale Einsatzgrößen (Einheiten/Fahrzeuge/Helfer/Bewegungen/Dauer)
7. Reale .s1control-Dateien (Größe, Arrays, commandLog)
8. LAN-Peer-Updater: je genutzt?
9. Legacy-.sqlite / gefüllte Excel-Mappen (Migrationsbedarf)
10. Lost Update im Betrieb aufgefallen?
11. SMB-Roundtrip-Zeiten (Messskript, Ergebnisse, was fehlt)
12. Zusammenfassung: Was ist belegt, was muss Johannes/THW liefern

---

## 1. Methodik und Quellenlage (Zwischenstand 1)

Geprüft wurden auf diesem Mac (read-only):
- `~/Library/Application Support/S1-Control/` (Electron userData; identisch mit `s1-control/`, Groß-/Kleinschreibung auf APFS case-insensitive): `settings.json`, Legacy-`.sqlite`-Dateien, `einsaetze/`, `backup/`, `update-cache/`, `Network Persistent State`.
- Repo `/Users/johannes/Developer/S1-Control` (main @ bcf15c6): README.md, AGENTS.md, agends.md, TODO.md, package.json (build-Block), `.github/workflows/build-main.yml`, git log, Testdateien.
- GitHub: `gh release list`, `gh api repos/wattnpapa/S1-Control/releases` (Asset-Downloadzähler), `gh issue list`.
- `~/Downloads` und `~/Documents` nur nach Dateinamen/Metadaten (keine Personendaten geöffnet).
- Lokale Systemumgebung: `mount`, `/Volumes`, `smbutil statshares`, `sntp`.

Nicht prüfbar auf diesem Mac: FüSt-Rechner (`%APPDATA%\S1-Control\settings.json`), Share-Inhalt (`_system.json`, `backup/`, reale `.s1control`), NAS-Modell, NTP im Einsatznetz, SMB-Latenzen. Es ist aktuell **kein SMB/AFP/NFS-Share gemountet** (`mount | grep smbfs` leer, `/Volumes` enthält nur `Macintosh HD`, `Install Hermes`, `NextcloudTalk`; `smbutil statshares -a` leer).

## 2. NAS/SMB-Implementierung — Befund

**Nicht belegt.** Weder Repo noch lokale Dateien nennen Hersteller/Modell/Samba-Version. Was belegt ist:
- Einladungstext „Digitale Einsatzunterstützung in der Führungsstelle“ (`~/Downloads/Digitale Einsatzunterstützung in der Führungsstelle.docx`, mtime 2026-07-03, Absender-Domain thw-oldenburg.de): Materialliste für ein Führungsgehilfen-Wochenende in Hoya: „3x FüKomKW, 3x Anh FüLa, 12 x Laptop, **1x Netzwerkfestplatte**, Internet, Zugriff auf FK Emailadresse, Scanner/Drucker“. Die „Netzwerkfestplatte“ ist der einzige Beleg für eine NAS im Einsatz-/Übungsnetz; Typ ungenannt.
- Code-Hinweise auf gemischte Mount-Pfade: `test/einsatz-sync.test.ts:160-184` (Commit 5b79209, 2026-03-03 „Sync remote refresh by einsatzId across different share paths“) testet dieselbe Datei als `/Volumes/share/hochwasser-1.s1control` (macOS) und `Z:\share\hochwasser-1.s1control` (Windows-Laufwerksbuchstabe). Das belegt, dass Johannes mit einem macOS-Client und einem Windows-Client auf demselben Share gearbeitet hat (Übungs-/Testbetrieb, kein Beleg für Echteinsatz).
- Commit-Serie 2026-02-28 00:47–01:10 („Fixe SMB Datenbankzugriff“, „Fix einsatz metadata on SMB share“, „Behebe SMB Share Datenbankzugriff“, ohne Body) und 2026-03-02 20:20–21:50 (network-safe SQLite pragmas, „increase sqlite open timeout for SMB lock contention“) belegen, dass ein realer SMB-Share getestet wurde; die Implementierung des Servers ist nicht dokumentiert.
- `src/main/db/connection.ts` (Stand 0ca506a) erkennt Netzpfade nur heuristisch über Präfix `/Volumes/` und `\\` (aus nas-speicher-recherche.md §0.1 übernommen; nicht erneut geprüft).

Was zu prüfen wäre: auf dem FüSt-Rechner unter Windows `Get-SmbConnection` (liefert Dialect z.B. 3.1.1 und ServerName), am Mac `smbutil statshares -a` bei gemountetem Share (liefert `SERVER_NAME`, `SMB_VERSION`, `SIGNING`, `FILE_IDS_SUPPORTED`, `DFS_SUPPORTED`, `STREAMS_SUPPORTED`). Bei Synology/QNAP zusätzlich DSM/QTS-Version und „SMB-Durable-Handles/Oplocks“-Einstellungen.
