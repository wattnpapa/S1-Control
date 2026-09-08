# 04 – Offene Entscheidungen für Johannes

Stand: 2026-09-08 · Quelle: Urteil §13, ergänzt um die Betriebsparameter vom 2026-09-07. Bereits beantwortet und hier nicht mehr aufgeführt: NAS (Synology), NTP (vorhanden), Client-OS (Windows 11 ohne Admin-Rechte), gleichzeitige Rechner (1 bis 5), macOS/Linux (berücksichtigen), Altdaten (keine).

Die Entscheidungen 1, 2 und 4 müssen vor M0 fallen, weil sie den Meilensteinzuschnitt bestimmen. Alle anderen können bis zum jeweils genannten Meilenstein warten.

| Nr. | Entscheidung | Optionen und Folgen | Empfehlung | Fällig |
|---|---|---|---|---|
| 1 | **Zielumfang** | Excel-Parität (alle Anforderungen F-A1 bis F-L6 und N-1 bis N-9): 20,5 bis 32 PW. Oder „besser als die Excel für Lage führen und ausdrucken" (M0 bis M4): 10 bis 14 PW; Kosten, Schichtplan, Logistik laufen so lange in der Excel weiter | das kleinere Ziel; Parität als zweite Stufe | vor M0 |
| 2 | **Verfügbarkeit** | Stunden je Woche. Der v1-Rhythmus (21 Commit-Tage in 104 Kalendertagen, zehn Wochen Pause) legt 8 bis 12 nahe. Daraus folgen Kalenderdaten und Abbruchdaten je Meilenstein | Zahl festlegen und in 03-MEILENSTEINE.md eintragen | vor M0 |
| 3 | **Feldversuch M-1** | Ein halber Tag an einem echten FüSt-Rechner mit dem heutigen v1-Installer: per-User-Installation, Update ohne Elevation, Start der unsignierten EXE. Negativ beim Start ⇒ jeder Desktop-Ansatz fällt | sofort durchführen, Ergebnis in den ADR-Ordner | vor allem anderen |
| 4 | **Geteilter Kern `@bos/kern` ja oder nein** | Ja: höchster Wiederverwendungsgewinn, Google-Tabelle entfällt, Meldekopf-Apparat eingebettet; dafür zwei Repos im Gleichschritt und Vorleistung 3 bis 5 PW. Nein: schmales gepinntes EEB-Paket (~0,5 PW), Meldekopf-Apparat in S1 nachbauen. **Das ist zugleich die Wahl zwischen A und C** | Ja, mit schmalem Erstschnitt, sechs Aufnahmeregeln und dokumentiertem Rückweg (ADR-003) | vor M0 |
| 5 | **Werkzeugkette** | Start auf TS 7, Vite 8, Vitest 4, Electron 43, ESM (Stand des Erfassungsbogens) statt v1-Stand TS 5.7, Vite 6, Vitest 3, Electron 35, CommonJS | ja; auf der grünen Wiese kostet es nichts und schließt die Werkzeugschere | M-0 |
| 6 | **Windows-Codesignatur** | Ohne: SmartScreen-Warnung bei jeder Installation, Share-Update-Weg muss zwingend Ed25519-signiert sein. Mit: laufende Kosten, Ablaufdatum pflegen | zunächst ohne, Entscheidung nach M-1 | M7 |
| 7 | **LAN-Peer-Update** | Streichen (Annahme aller drei Vorschläge) oder harte Anforderung (+1,0 PW) | streichen; Update über den Share ersetzt es | M7 |
| 8 | **Synthetische Referenzlage** | Es gibt keine gefüllten Excel-Mappen. Eine realistische Übungslage muss einmal von Hand in der Excel erfasst und ausgedruckt werden; sie ist das Abnahme-Orakel für Kennzahlen, Goldfiles und Ausdrucke. Fachhandarbeit, keine Entwicklung | wer macht sie, bis wann; spätestens vor M4 | M3 |
| 9 | **Rollen und Rechte** | Zum Start streichen: Excel und v1 kennen sie nicht; der Ereigniskatalog braucht sie nur bei Archivieren und Kompensation fremder Ereignisse | streichen; alle Clients gleichberechtigt, Nachvollziehbarkeit über den Akteur im Ereignis | M2 |
| 10 | **Größter Einsatz bisher** | Einheiten, Fahrzeuge, Dauer. Bestimmt Poll- und Fold-Kostenrahmen | bis zur Antwort Auslegung auf 100 bis 300 Einheiten, 5.000 als obere Schranke | M0 |
| 11 | **UDP-Beschleuniger** | Wird eine Windows-Firewall-Eingangsregel ohne Admin-Rechte je aktiv? Wenn nein: UDP streichen, Zusage „unter 1 Sekunde" durch „Poll-Intervall plus Cache, ehrlich angezeigt" ersetzen | im Feldversuch M-1 mitprüfen (`Get-NetFirewallRule`); im Zweifel streichen | M-1 |
| 12 | **Windows-Entwicklungsmaschine** | Entwickelt wird auf macOS; mindestens sieben Arbeitspakete sind Windows-spezifisch (Installer, Update, SMB-Cache, Firewall, SmartScreen, Zweitmonitor, Handscanner) | Rechner benennen, spätestens für M0 | M0 |
| 13 | **Zielplattformen** | Vier gebaute Plattformen sind Dauerlast | Windows Produkt, macOS Entwicklungsplattform mit Best-Effort-Paket, Linux nur CI-Lauf | M7 |

## Fachliche Klärungen mit der FüSt (kein Entwicklungsthema)

Aus dem Zieldatenmodell (`../v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §6) und dem Handbuch-Bericht:

- Gilt die Statusliste der Eingabemaske („Rufbereitschaft", „Einsatzvorbehalt") oder die Kurzform des Status-Blatts? Die Excel widerspricht sich.
- Bedeutung der Kürzel „HK" (HK/NLWKN), „MT", „LdF", „TLtg." und der unbeschrifteten Zeichen der FüOrg-Palette.
- Wird Schichtbetrieb mit zwei oder drei Schichten geführt, oder beides je Einsatz?
- Format der Anforderungs-ID mit der übergeordneten Stelle.
- Welche der Ausgabeprodukte werden im Einsatz tatsächlich gedruckt, welche nur am Bildschirm gelesen?
