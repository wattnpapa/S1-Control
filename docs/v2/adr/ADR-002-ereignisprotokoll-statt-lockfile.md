# ADR-002 – Append-only-Ereignisprotokoll statt Ganzdatei mit Lockfile

Status: vorgeschlagen · Datum: 2026-09-08 · Entscheider: Johannes Rudolph

## Kontext

v1 hielt den Einsatz zunächst als SQLite-Datei auf dem Share (Februar bis Mai 2026; im Mehrclient-Betrieb „super langsam", viermaliger Wechsel der Journal-Strategie, dann Ausbau in 20 Minuten) und seit Ende Mai als eine JSON-Datei je Einsatz mit Lockfile, tmp+rename und Schreibzähler. Die Bestandsaufnahme hat gezeigt und zur Laufzeit reproduziert, dass dieses Modell im Mehrclient-Betrieb Daten verliert: Der Main-Prozess lädt die Datei einmal, mutiert im Speicher und schreibt bei jedem Save den kompletten RAM-Stand zurück, ohne die Platte neu zu lesen; der Schreibzähler wird gesetzt, aber nie verglichen; die Systemdatei mit Sperren und Heartbeats wird lockfrei überschrieben.

Der bmecatEditor-Bericht empfahl, das Lockfile-Modell „1:1 zu portieren" und um eine optimistische Konflikterkennung zu ergänzen; die NAS-Recherche empfahl ein Ereignisprotokoll. Dieser Widerspruch war zu entscheiden.

## Entscheidung

Der Zustand eines Einsatzes ist ein Append-only-Ereignisprotokoll auf dem Share mit genau einem Schreiber je Datei (`ereignisse\<clientId>.<segment>.jsonl`), Ordnung über Hybrid Logical Clock, deterministischem Fold mit fachlichen Konfliktregeln und lokaler Materialisierung je Client. Schnappschüsse sind Beschleuniger und jederzeit verwerfbar; Wahrheit sind die Ereignisse. Es gibt keinen Lock, keinen Master, keine TTL und kein Replace-Rename im Datenpfad.

## Begründung

1. **Kein belegter SMB-Effekt berührt den Schreibpfad.** Mandatory Byte-Range-Locks, Oplock- und Lease-Breaks, 10-Sekunden-Metadaten-Caches, nicht-atomare Übernahme veralteter Lockdateien und fehlende Multi-Writer-Append-Semantik treffen nur Modelle, in denen mehrere Clients dieselbe Datei schreiben oder ersetzen (`nas-speicher-recherche.md` §1 mit Primärquellen, §9 Bewertungsmatrix).
2. **Die Prämisse der Portierungsempfehlung ist widerlegt.** „Die Mechanismen funktionieren heute in TS und sind getestet" gilt nicht: Der Lost Update ist reproduziert, kein Test öffnet zwei Kontexte auf derselben Datei. Die vorgeschlagene Schreibzähler-Prüfung setzt ein Re-Read voraus und wäre damit kein Zusatz, sondern ein anderer Schreibpfad; auch repariert bliebe ein Single-Document-Modell mit netzweitem Lock und sechs eigenständigen Fehlerquellen (Vorschlag A §3, Urteil §3.1).
3. **Offline ist der Normalpfad.** Jedes Ereignis wird zuerst lokal angehängt; die Spiegelung auf den Share ist ein wiederholbarer Append ab Offset. NAS-Ausfall erzeugt weder Datenverlust noch Merge-Dialog. Ganzdatei-Modelle können ohne Share nicht arbeiten.
4. **Das Protokoll ist fachlich das Einsatztagebuch**, das die Führungsstelle ohnehin braucht: wer hat wann welche Einheit wohin gemeldet. Backup ist Ordnerkopie, Archiv ist ZIP, Undo ist Kompensationsereignis.
5. **Alle drei Architekturvorschläge haben unabhängig voneinander so entschieden**, obwohl einer von ihnen ausdrücklich vom bmecatEditor-Muster ausging.

## Auflagen aus der Widerlegung (verbindlich, siehe 03-MEILENSTEINE.md Nr. 4 bis 18)

Fold als Mengenfunktion mit Rebase und HLC je materialisiertem Feld; HLC als Struktur vergleichen; Vorher-Wert in jedem setzenden Ereignis für Konflikthinweise; Hash-Kette beim Lesen prüfen mit definiertem Quarantäne-Ausweg; monotone Laufnummer je Client mit Fremdschreiber-Erkennung; Segmentwechsel nach Größe; „neueste Revision zählt" über HLC mit Plausibilisierung der Meldezeit; kein Anspruch auf Revisionssicherheit über Dateigrenzen hinweg; Beweis der Architektur in M0 auf dem echten Share mit mindestens zwei Rechnern und zwei Betriebssystemen.

## Verworfene Alternativen

- **SQLite auf dem Share** (Option A der Recherche): in v1 gescheitert, laut SQLite-Dokumentation über Netzdateisysteme nicht verlässlich; stack-unabhängig.
- **JSON-Ganzdatei mit Lockfile plus Konflikterkennung** (Option B, bmecat R9): siehe Begründung 2; nur als Übergang tragbar, nicht als Fundament.
- **CRDT-Dokument** (Option D, Automerge/Loro/Yjs): bringt für Stammdaten mit fachlichen Regeln keinen Mehrwert gegenüber dem eigenen Fold; bleibt Option für spätere Freitext-Kollaboration.
- **Eine Datei je Entität und Version** (Option F): schlechtes I/O-Profil über SMB (readdir, Directory-Cache), Cross-Entity-Invarianten brauchen trotzdem eine Ordnung.

## Konsequenzen

- v1-Bausteine `file-lock.ts`, `record-lock.ts`, `clients.ts` (Heartbeat als geteilte Datei), `einsatz-sync.ts` in heutiger Form und `backup.ts` entfallen ersatzlos.
- Der Ereigniskatalog (`entwurf/zieldatenmodell-feldabgleich.md` §4) ist die Spezifikation, die vor dem ersten Code in `@s1/domaene` vollständig sein muss; jede Ereignisart braucht eine deterministische Regel inklusive Konfliktfall, geprüft per Property-Test.
- Die Oberfläche zeigt Datenstand und Peer-Status ehrlich an; Sichtbarkeitslatenzen bis 10 Sekunden für die erste Datei eines neuen Clients sind zugesagt, nicht Sub-Sekunden.
