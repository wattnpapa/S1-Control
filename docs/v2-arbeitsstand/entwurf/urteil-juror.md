# Urteil des Jurors — S1-Control v2 Architekturentscheidung

Status: ABGESCHLOSSEN (§0–§14)

## Gliederung
0. Kurzurteil vorab
1. Auftrag, Bewertungsmaßstab und Vorgehen
2. Was die Betriebsparameter von Johannes an den Vorschlägen ändern
3. Der gemeinsame Kern aller drei Vorschläge (und was daraus folgt)
4. Befundlage: Widerlegungen, Verdicts, Blocker — und was ich selbst nachgemessen habe
5. Bewertung Kriterium 1 — Datenintegrität SMB/Mehrclient/Offline (30)
6. Bewertung Kriterium 2 — Lieferbarkeit bis Excel-Parität (25)
7. Bewertung Kriterium 3 — Betreibbarkeit im Einsatz (15)
8. Bewertung Kriterium 4 — Wiederverwendung (15)
9. Bewertung Kriterium 5 — Wartbarkeit/Erweiterbarkeit (15)
10. Gesamtwertung und Rangfolge
11. Empfehlung: Sieger als Basis
12. Grafts — was aus den unterlegenen Vorschlägen übernommen wird
13. Offene Entscheidungen für Johannes
14. Was die Entscheidung kippen würde

---

## 0. Kurzurteil vorab

**Sieger: Vorschlag A (Electron-Evolution), 73/100.** Knapp dahinter Vorschlag C (Hybrid, geteilter TS-Kern), 70/100. Weit abgeschlagen Vorschlag B (Tauri + Rust-Kern), 50/100.

**Die Antwort auf Johannes' Ausgangsfrage lautet: Nein.** Der Stack des bmecatEditors (Tauri 2 + Rust-Kern-Crate + React) ist für S1-Control **nicht** besser als Electron + React + TypeScript. Er ist nicht schlecht — die technische Widerlegung von B bescheinigt der *Richtungsentscheidung* ausdrücklich, dass sie jedem Angriff standhält —, aber er löst kein einziges der harten Probleme (SMB-Konsistenz, Offline, Verteilung ohne Admin-Rechte) und kostet nach eigener Rechnung des Vorschlags +6 bis +10 Personenwochen allein für die Zweisprachengrenze. Für einen ehrenamtlichen Ein-Personen-Entwickler mit 8–12 h/Woche ist das der Unterschied zwischen "in einem Jahr im Einsatz" und "in drei Jahren vielleicht".

**A und C liegen nur 3 Punkte auseinander.** Das ausschlaggebende Kriterium ist **Lieferbarkeit (25)**: A hält mit Auflagen, C fällt. Und innerhalb der Lieferbarkeit ist der ausschlaggebende Einzelposten C's Meilenstein M1 (Kernextraktion, 1,5 PW, "mechanisch, ~40 Dateien") — genau der Baustein, aus dem C seinen ganzen Vorsprung zieht, und genau der, dessen Preis C unterschätzt (§6.3, eigene Messung).

**Die Empfehlung ist deshalb kein reines A**, sondern A als Basis mit dem tragenden Baustein von C eingepfropft: dem geteilten TypeScript-Kern mit erfassungsbogen.app — aber schmaler geschnitten als C ihn schneidet, mit C's Einbindungsmechanik, und unter einer Vorbedingung, die die von der Widerlegung gemessene Werkzeugschere gar nicht erst entstehen lässt: **der neue Branch startet auf der Werkzeugkette von erfassungsbogen.app** (TypeScript 7, Vite 8, Vitest 4, Electron 43, ESM), nicht auf der von v1. Auf der grünen Wiese ist das keine Migration, sondern eine Wahl bei der Anlage.

---

## 1. Auftrag, Bewertungsmaßstab und Vorgehen

### 1.1 Was bewertet wird

Gewichtete Kriterien laut Auftrag:

| # | Kriterium | Gewicht |
|---|---|---|
| K1 | Datenintegrität im Mehrclient-/Offline-Betrieb auf SMB | 30 |
| K2 | Lieferbarkeit bis Excel-Parität durch einen KI-gestützten Einzelentwickler | 25 |
| K3 | Betreibbarkeit im Einsatz (Verteilung, Update, Diagnose, Schulung) | 15 |
| K4 | Wiederverwendung mit erfassungsbogen.app und v1-Bausteinen | 15 |
| K5 | Langfristige Wartbarkeit/Erweiterbarkeit | 15 |

### 1.2 Wie mit den Widerlegungen umgegangen wird

Vorgabe: Verdicts "faellt" und Blocker-Findings müssen die Bewertung **sichtbar** senken, es sei denn, das Finding wird als falsch nachgewiesen. Ich habe kein Finding als falsch nachgewiesen; ich habe drei geprüft und **bestätigt** (§4.4) und eines **verschärft** (§6.3). Die Absenkung ist in §5–§9 je Kriterium ausgewiesen, nicht pauschal.

Zwei Präzisierungen, die für die Fairness der Wertung nötig sind:

1. **Ein "faellt" der Lieferbarkeitslinse ist kein "faellt" der Architektur.** Beide Lieferbarkeits-Widerleger sagen das selbst: bei C "Was hält: der Schnitt (geteilter TS-Kern), die Ableitung Electron daraus, E3, M0 als vorgezogenes Abbruchtor, die Teststrategie §7"; bei B "Der Entwurf ist gut, das Lieferversprechen fällt … Der Vorschlag ist reparabel ohne Antasten der Leitidee". Ein fallendes Lieferversprechen senkt K2 hart und K3 spürbar, K1/K4/K5 nur, soweit ein konkretes Finding dort greift.
2. **Ein Blocker, der alle drei gleichermaßen trifft, differenziert nicht.** Das gilt für genau einen: die per-User-Installation und das Update ohne Admin-Rechte (A-F4, B-L?/W14/W15, C-T-Nebenbefund). Der Widerleger von A schreibt das ausdrücklich: "trifft jeden Desktop-Vorschlag gleichermaßen — er ist deshalb Auflage, kein Ausschluss". Er senkt K3 bei allen drei, verschiebt aber die Rangfolge nicht.

### 1.3 Vorgehen

Gelesen: die drei Vorschläge (Kurzfassungen im Auftrag, plus gezielt die entscheidungstragenden Abschnitte im Volltext: A §5.4; B §5.4; C §2.2, §5.4), alle sechs Widerlegungen (Verdicts und Findings im Auftrag, vollständig), `zieldatenmodell-feldabgleich.md` §4 vollständig, `betriebsparameter-johannes.md` vollständig, `nas-speicher-recherche.md` §9–§12 vollständig, `vollstaendigkeitskritik.md` §3.6/§3.7/§4/§5 vollständig.

Eigene Messungen (§4.4): `package.json` beider Repos, Importgraph der von C benannten Kern-Kandidaten in `/Users/johannes/Developer/einheitenerfassungsbogen/src`.

Der Kostenwächter der Sitzung meldet "COST CRITICAL" (68,15 $). Ich habe deshalb keine Volltexte nachgelesen, wo die Zusammenfassungen des Auftrags und die Findings der Widerleger die Aussage bereits mit Datei- und Abschnittsbeleg tragen.

---

## 2. Was die Betriebsparameter von Johannes an den Vorschlägen ändern

Die Vorschläge kannten die Antworten aus `betriebsparameter-johannes.md` nicht. Sie sind verbindlich und ändern die Lage an sechs Stellen — dreimal entlastend, dreimal belastend.

### 2.1 Entlastend

**(a) Keine Altdaten (grüne Wiese ohne Migrationspfad).** Das ist die folgenreichste Antwort. Sie streicht bei allen drei Vorschlägen einen ganzen Arbeitsblock: A §3.9/§3.10 (Migration `.s1control` und Excel-Mappe) samt Risiko A11, B §3.11 vollständig und §3.12 großenteils, C §3.10 a/b/c samt R6. Grob 1,0 PW je Vorschlag. Zusätzlich verschwinden bei A zwei Ereignistypen (`EinsatzAusV1Uebernommen`, `EinsatzAusExcelUebernommen`), die laut Widerlegung A "B1 in Ereignisform" sind — die grüne Wiese repariert also nebenbei einen Blocker-Nachbarn.

**(b) NTP im Einsatznetz.** Entschärft die Uhrenfindings (A-S1, B-W5, C-T5/T6) von "tritt regelmäßig auf" zu "tritt selten auf". Es **behebt** sie nicht: A-S7 (der HLC-Text ist nur bei 13-stelliger Millisekundenzahl lexikografisch sortierbar) ist von NTP unabhängig, und C-T5 betrifft ausdrücklich die **Meldekopf-Geräte**, die nicht im NTP-synchronen FüSt-Netz hängen — für die die Wege B/C überhaupt gebaut sind. Nebenbefund: mit NTP verliert eines der sechs Argumente gegen das Lockfile-Modell (Uhrenunabhängigkeit) an Gewicht. Die Entscheidung gegen das Lockfile trägt weiterhin, aber auf Atomarität und der Lost-Update-Reproduktion, nicht auf den Uhren (§3.2).

**(c) Synology (Samba) und 1–5 Rechner.** Macht die M0-Messung sofort und billig ausführbar (bekanntes Gerät, Schalter dokumentiert), stützt die Atomaritätsannahmen (`create_new` serverseitig entschieden, Rename atomar) und deckelt den Poll-Fächer. Die von allen drei geplante Vierclient-Simulation deckt mit einem fünften Client den realen Maximalfall ab.

### 2.2 Belastend

**(d) Keine Admin-Rechte auf den FüSt-Rechnern.** Drei Folgen, alle bisher unbehandelt:
- Per-User-Installation und Update ohne Elevation werden zur harten Randbedingung. Bei Electron ist das der Normalfall (electron-builder-NSIS ist per Voreinstellung `oneClick`/per-user), bei Tauri machbar, aber in B mit keinem Wort behandelt — der Widerleger stellt fest, die Randbedingung sei nach der Schätzung dazugekommen und schlage auf den mit 1,5 PW am knappsten kalkulierten Meilenstein durch.
- Der **UDP-Beschleuniger ist faktisch tot**, wenn die Windows-Firewall keine eingehende Regel ohne Admin zulässt. Das trifft A §3.6/A13 und C §3.4/R10 direkt: die Zusage "Sichtbarkeitslatenz < 1 s" ist dann nicht haltbar, und die Gegenmaßnahme gegen "Latenz als Vertrauensverlust" fällt weg. Übrig bleibt der 2-s-Poll — der laut nas §10 Restrisiko 2 für Lageführung genügt, aber ehrlich angezeigt werden muss.
- Der Portable-Weg wird zum Regelfall, damit wird Single-Instance-Schutz (A-S6) zwingend und die `clientId` hängt am Benutzerprofil (Roaming-Profil = Multi-Writer-Fall, nas §10 Restrisiko 4; von den Betriebsparametern nicht beantwortet).

**(e) macOS/Linux bleiben Anforderung.** Macht die Latenzkonstanten plattformabhängig (der macOS-Verzeichniscache ist per App nicht abschaltbar) und reißt bei C eine CI-Lücke auf (T13: die Speicherschicht wird nur unter Windows automatisiert geprüft). M0 muss auf mindestens zwei Betriebssystemen messen (B-W8).

**(f) Windows 11 überall.** Zweischneidig. Es entwertet Tauris `fixedRuntime`-Problem (WebView2 ist vorinstalliert) — und damit zugleich **ein Hauptargument von A und C gegen Tauri**. A §1.5/§2.5 und C §2.2 rechnen vor, der Größenvorteil von Tauri verschwinde im Offline-Szenario, weil Tauri ~180 MB (fixedRuntime) bzw. ~127 MB (offlineInstaller) gegen 102 MB Electron mitschleppen müsse. Auf Windows 11 stimmt das nicht mehr: ein Tauri-Installer bleibt klein. **Ich streiche dieses Argument aus der Wertung.** Es ändert nichts an der Rangfolge, weil es ein Argument der Auswahl-, nicht der Datenintegritätslinse ist und weil Tauri an K2/K3/K4 scheitert, nicht an der Installergröße.

**(g) "SQLite war super langsam" (Latenz, keine Korruption).** Verschiebt das Risiko vom einzelnen Anhänge-Vorgang auf die **Dauerkosten des Poll-Zyklus**. Das ist unmittelbar relevant für B-W11 (Segmentzahl wächst mit den Programmstarts statt mit den Daten: ~140 Dateien nach einer Woche, ~350 SMB-Roundtrips/s bei 5 Clients) und C-T7 (dieselbe Lastform, ~109 Roundtrips nach drei Tagen). Beide Vorschläge erzeugen mit "neues Segment bei jedem App-Start" genau das Lastprofil, an dem SQLite auf diesem Share bereits gescheitert ist. **Auflage für alle:** das M0-Abbruchkriterium muss nicht nur den Einzel-Append messen, sondern die Gesamtkosten eines Poll-Zyklus bei N Segmenten und 5 Clients.

### 2.3 Nettowirkung je Vorschlag

| | Entlastung | Belastung | Netto |
|---|---|---|---|
| A | keine Altdaten (−1,0 PW, Risiko A11 weg, zwei Blocker-nahe Ereignistypen entfallen), NTP, Synology, 1–5 Clients | UDP tot ⇒ SLO-Widerspruch A13 vs. M8-DoD; Installergrößen-Argument falsifiziert; vier Zielplattformen ohne Nutzenbeleg; Portable ⇒ S6 zwingend | −0,75 bis −1,5 PW, ein Argument verloren |
| B | Windows 11 entwertet B7 weitgehend, keine Altdaten (§3.11 ganz weg), NTP, Synology (−2 bis −3 PW) | keine Admin-Rechte trifft den 1,5-PW-Meilenstein M9 ins Mark; macOS/Linux verdoppeln M0; 5 statt 4 Clients; kein Abnahme-Orakel ohne gefüllte Excel-Mappe | **+4 bis +8 PW**, also klar negativ |
| C | keine Altdaten (§3.10 gegenstandslos, R6 ohne Anlass, M8 leichter, −1,0 PW), Synology, NTP im FüSt-Netz | UDP tot ⇒ R10-Gegenmaßnahme weg; Windows 11 entwertet die WebView2-Nebenbegründung; kein Referenzdatensatz ⇒ Fixture und Abnahmemaßstab fehlen; kalter Umstieg ohne Parallelbetrieb; macOS/Linux-CI-Lücke | technisch leichter, betrieblich enger |

---

## 3. Der gemeinsame Kern aller drei Vorschläge (und was daraus folgt)

### 3.1 Alle drei entscheiden den Speichermodell-Widerspruch gleich

Das ist der wichtigste Einzelbefund dieses Urteils und er macht drei Viertel der Stack-Debatte gegenstandslos: **Alle drei Vorschläge entscheiden unabhängig voneinander zugunsten von nas §10 Option C→E (Append-only-Ereignisprotokoll, genau ein Schreiber je Datei, HLC-Ordnung, deterministischer Fold, lokale Materialisierung) und gegen bmecat §9 R9 (1:1-Portierung des Lockfile-Modells plus optimistische Konflikterkennung).** Und alle drei begründen es mit denselben zwei Argumenten:

1. R9s tragende Prämisse — die Mechanismen "funktionieren heute in TS und sind getestet" — ist durch die Laufzeit-Reproduktion des Lost Update falsifiziert (gesicherter Fakt 2 des Auftrags).
2. Die von R9 geforderte `writeSeq`-Prüfung setzt ein Re-Read voraus, das es in v1 nirgends gibt. Sie wäre also kein Zusatz zum bestehenden Schreibpfad, sondern ein anderer — die "Portierung" wäre in Wahrheit ein Neubau, und zwar einer ohne die Vorteile des Ereignismodells.

**Hiermit ist der in `vollstaendigkeitskritik.md` §3.6 Punkt 1 gemeldete Widerspruch entschieden.** Ich schließe mich an; die Begründung der Vorschläge ist vollständig und deckt sich mit nas §10 Punkt 1 ("die einzige Option, bei der **keine** der belegten SMB-Schwächen den Schreibpfad berührt"). Beide technischen Widerleger haben zusätzlich versucht, die Entscheidung zu kippen, und sind gescheitert: C-Technik schreibt "Die tragende Entscheidung E3 ist NICHT widerlegbar — ich habe es versucht und die Primärquellen stützen sie"; B-Technik schreibt "Die RICHTUNGSENTSCHEIDUNG hält jedem Angriff stand".

Eine Bereinigung ist nötig: mit NTP (§2.1b) fällt das Argument "Uhrenunabhängigkeit" als Begründung gegen das Lockfile weitgehend weg. Die Entscheidung trägt weiter auf (i) fehlender Atomarität der Stale-Lock-Übernahme, (ii) der Lost-Update-Reproduktion, (iii) mandatory Byte-Range-Locks über CIFS, (iv) Rename-EBUSY, (v) fehlendem `fsync` im heutigen Pfad, (vi) FileNotFound-/FileInfo-Caches. Fünf von sechs Argumenten bleiben. Die Begründungstexte sollten das bereinigen, statt weiter mit den Uhren zu argumentieren.

### 3.2 Was daraus folgt

**Erstens: Die Speicherfrage ist stack-neutral und damit kein Argument im Stack-Vergleich.** nas §10 sagt das ausdrücklich ("sie spricht weder für noch gegen Tauri"). B's eigener technischer Widerleger sagt es noch schärfer: "Keines der 20 Findings hängt an Rust oder Tauri. Sie treffen den Speicherentwurf, nicht die Sprache, und gelten für Vorschlag C im selben Umfang." Damit ist das 30-Punkte-Kriterium K1 **kein Stack-Kriterium**, sondern ein Spezifikations- und Testapparat-Kriterium. Es differenziert die drei nur über die Qualität ihres Regelwerks und ihrer Beweismittel.

**Zweitens: Alle drei haben denselben Defektkern.** Die Blocker von A (B1: Schnappschuss ohne Gewinner-HLC je Feld), von B (W10: inkrementelle Faltung ohne Feld-HLC-Wasserzeichen) und von C (T1: inkrementeller Fold im Live-Pfad gegen Mengen-Fold in der Spezifikation) sind derselbe Defekt in drei Formulierungen: **eine Zustandsmaterialisierung, die mit nachrückenden älteren Ereignissen nicht komponierbar ist.** Bei 2–10 s Sichtbarkeitsverzug ist "ältere Ereignisse rücken nach" der Normalfall, nicht die Ausnahme. Die Rettung ist in allen drei Fällen dieselbe: **der Fold ist eine Mengenfunktion, der Live-Pfad ist ein Rebase, und jedes materialisierte Feld trägt die HLC seines Gewinners.** Diese eine Festlegung räumt A-B1, B-W10, C-T1, C-T3 und C-T5 gemeinsam ab. Sie gehört in die Spezifikation, bevor die erste Zeile in `packages/kern` steht.

**Drittens: Die Reparaturen liegen schon geschrieben vor.** `zieldatenmodell-feldabgleich.md` §4 enthält den Ereigniskatalog samt Konfliktregeln in einer Fassung, die die meisten Findings vorwegnimmt — §4.1 Regel 3 (`vorher`-Wert in jedem setzenden Ereignis) behebt B-W9 und liefert die Konflikterkennung, §4.2 (`AbschnittUmgehaengt` mit Zyklusregel) behebt B-W6, §4.3 U1 (Undo als normales Ereignis, kein Sonderpfad) behebt B-W4, §4.4 P4–P6 sind die Property-Eigenschaften, die B-W7 fehlen. B's Widerleger stellt fest, B habe an diesen Stellen "die semantisch stärkere, technisch schwächere Variante gewählt". **Konsequenz für die Synthese: der Ereigniskatalog wird nicht aus dem Siegervorschlag genommen, sondern aus ZDM §4.** Das gilt unabhängig davon, welcher Vorschlag gewinnt, und ist der Grund, warum K1 die drei weniger trennt, als die Blockerzahlen vermuten lassen.

**Viertens: Die drei Vorschläge unterscheiden sich in Wahrheit nur an zwei Stellen.** (i) Sprache und Laufzeit der Desktop-Hülle (Electron/TS gegen Tauri/Rust) und (ii) Breite und Mechanik der Wiederverwendung mit erfassungsbogen.app (schmales npm-Paket bei A, Submodul in eine Rust-App bei B, geteiltes Kernrepo `@bos/kern` bei C). Alles andere — Speichermodell, Dateilayout, Poll-vor-Watcher, UDP als Beschleuniger, Offline als Normalpfad, Wegfall des LAN-Peer-Updates, Snapshot-Politik, Archivierungsbarriere, acht Ausgabeprodukte, Meldekopf statt Google-Tabelle — ist identisch oder unterscheidet sich nur in Nuancen.

---

## 4. Befundlage: Widerlegungen, Verdicts, Blocker — und was ich selbst nachgemessen habe

### 4.1 Übersicht der sechs Verdicts

| Vorschlag | Linse Technik | Linse Lieferbarkeit |
|---|---|---|
| A Electron-Evolution | **haelt-mit-auflagen** — 1 Blocker, 8 schwer | **haelt-mit-auflagen** — 1 Blocker, 8 schwer |
| B Tauri/Rust-Kern | **haelt-mit-auflagen** — 3 Blocker, 7 schwer | **faellt** — 2 Blocker, 6 schwer |
| C Hybrid/geteilter TS-Kern | **haelt-mit-auflagen** — 1 Blocker, 5 schwer | **faellt** — 1 Blocker, 6 schwer |

Kein Vorschlag fällt technisch. Zwei fallen an der Lieferbarkeit. Das ist die Struktur der ganzen Entscheidung: **die Architekturfrage ist weitgehend entschieden (§3), die offene Frage ist, was ein einzelner ehrenamtlicher Entwickler tatsächlich liefern und betreiben kann.**

### 4.2 Die Blocker im Einzelnen und ihre Wirkung

| Blocker | Vorschlag | Wirkung | Trifft nur diesen Vorschlag? |
|---|---|---|---|
| B1 Schnappschuss ohne Gewinner-HLC je Feld | A | zwei Clients mit derselben Ereignismenge zeigen verschiedene Zustände | nein, Klassendefekt (§3.2) |
| F4 per-User-Installation, stiller Update-Start, unsignierte EXE ohne Admin-Rechte | A | erst in M7 geprüft; kippt im schlimmsten Fall jeden Desktop-Vorschlag | nein, trifft alle drei |
| W1 verwaister Segment-Rest | B | stiller Datenverlust: Ereignisse alter Segmente werden nie hochgeladen | ja (Folge von B's "neues Segment bei jedem Start" + Offset-Spiegelung) |
| W2 abgerissener Share-Append | B | defekte Zeile in der Dateimitte, Leser bleibt dauerhaft stehen | teilweise (C-T2 ist derselbe Defekt) |
| W3 Ereignis-`id` ohne Persistenz-/Monotoniezusage | B | die Dedup-Regel verwirft echte Ereignisse | ja |
| M9-Unterkalkulation (1,5 PW für Verteilung/Update/Signierung) | B | der Meilenstein, an dem v1 nachweislich am teuersten war (24 % der Commits), ist der knappste | ja |
| F-L4 (Tastenkürzel, ControlTips, Handbuch) nirgends eingeplant | B | "Excel-Parität" ist mit diesem Plan definitorisch nicht erreichbar (Volltextsuche über 665 Zeilen: null Treffer) | ja |
| T1 inkrementeller Fold gegen Mengen-Fold | C | zwei Clients zeigen dauerhaft verschiedene Führungsstrukturen | nein, Klassendefekt (§3.2) |
| F1 "21 PW Planwert" ohne Kalenderachse und Verfügbarkeitsannahme | C | die Lieferzusage hat keine Bedeutung; 18–30 PW werden bei 8–12 h/Woche zu 1,3–2,9 Jahren | teilweise (A hat dieselbe Lücke, aber mit kleinerer Spanne) |

**Bewertungswirkung:** B trägt drei technische Blocker, von denen zwei (W1, W3) ausschließlich aus B's eigenen Festlegungen folgen, plus zwei Lieferblocker, von denen einer den Zielbegriff selbst zerstört. Das ist die härteste Befundlage der drei und schlägt in K1, K2 und K3 durch.

### 4.3 Der schwerwiegendste nicht-Blocker-Befund je Vorschlag

- **A: M5** — die Mehrclient-Simulation läuft auf einem lokalen Dateisystem und kann per Konstruktion keine der SMB-Eigenschaften verletzen, deren Nachweis der ganze Aufwand ist. A's zentrale Qualitätszusage ("weist in jedem CI-Lauf nach, was v1 nicht konnte") ist damit für die eigentliche Fehlerklasse unbelegt. Die vom Widerleger vorgeschlagene "feindliche Dateisystem"-Schicht (fünf Zeilen, jede die direkte Übersetzung einer Primärquelle) ist die billigste und wirksamste Einzelmaßnahme der ganzen Liste.
- **B: W7** — Property-Eigenschaft 1 ist eine Tautologie über die Sortierfunktion. Damit ist B's selbsterklärtes Top-Risiko B1 ("das gefährlichste Risiko, weil es nicht auffällt") praktisch unabgedeckt. Zusammen mit W8 (`s1 sim` als Vier-Prozesse-auf-einer-Maschine-Lauf blendet Caches, Leases und Sperren aus) heißt das: **M0 würde in der vorliegenden Fassung grün und damit das einzige Abbruchkriterium des Vorschlags entwerten.** Das ist besonders bitter, weil erschöpfendes `match` plus Property-Tests der eine Punkt ist, an dem sich ein Rust-Kern unter dieser Linse ausgezahlt hätte — und ausgerechnet dort ist B nicht belastbar ausgebaut.
- **C: T5** — K7 "neueste Revision zählt" ist nicht definiert (HLC oder fachliche Meldezeit?). Ein Meldekopf mit sechs Stunden nachgehender Uhr liefert die real neueste Meldung mit dem kleinsten HLC; K4s 120-s-Fenster greift nicht; Ergebnis ist eine **stille Falschstärke im wichtigsten Ausgabewert überhaupt**. NTP hilft hier nicht, weil die Meldekopf-Geräte gerade nicht im FüSt-Netz hängen.

### 4.4 Eigene Nachmessungen

Ich habe vier Behauptungen selbst geprüft, weil sie tragend sind und weil ihre Bestätigung oder Widerlegung die Rangfolge verschieben kann.

**(1) Die Werkzeugschere zwischen den beiden Repos — BESTÄTIGT und größer als beschrieben.**
Quelle: `/Users/johannes/Developer/S1-Control/package.json` und `/Users/johannes/Developer/einheitenerfassungsbogen/package.json`.

| | S1-Control (v1, HEAD) | erfassungsbogen.app |
|---|---|---|
| TypeScript | `^5.7.3` | `^7.0.2` |
| Vite | `^6.2.0` | `^8.1.4` |
| Vitest | `^3.0.7` | `^4.1.10` |
| Electron | `^35.0.0` | `^43.4.0` |
| electron-builder | `^25.1.8` | `^26.15.3` |
| `@vitejs/plugin-react` | `^4.3.4` | `^6.0.3` |
| `@types/node` | `^22.13.10` | `^26.1.1` |
| Modulsystem | `"type": "commonjs"` | `"type": "module"` |
| ESLint | `eslint ^9.20.1` + 5 Plugins, `"lint": "eslint ."` | **keiner** — kein `eslint` in den devDependencies, kein `lint`-Skript |

Damit sind gleich drei Findings der C-Lieferbarkeitswiderlegung bestätigt: F16 (Werkzeugschere), F17 (die Durchsetzungsmechanik soll in ein Repo eingeführt werden, das keinen Linter hat) und implizit F18 (die Paketverdrahtung existiert in keinem der beiden Repos — in keiner der beiden `package.json` steht ein `workspaces`-Feld oder eine `file:`-Abhängigkeit).

**Zusatzbefund, den keiner der Widerleger nennt:** der Modulsystem-Bruch. `@bos/kern` müsste zugleich von einem CommonJS-Electron-Main (S1) und einer ESM-Vite-App (erfassungsbogen) konsumierbar sein. Das ist lösbar (Dual-Build oder S1 auf ESM heben), aber es ist Arbeit, die in C's 1,5-PW-Position M1 nicht sichtbar ist.

**(2) A's Behauptung "electron ^43.4.0 in beiden Repos" (A §2.1) — WIDERLEGT.** S1-Control steht auf `electron ^35.0.0`. A's eigene Risikoeinschätzung A12 ("Ohne native Module ist ein Electron-Upgrade ein Versionsdreher plus CI-Lauf") ist damit nicht auf dem Ist-Stand kalibriert: es sind acht Majors Rückstand, nicht null. Das ist keine große Position, aber es zeigt, dass auch A an einer Stelle mit einer nicht geprüften Zahl argumentiert.

**(3) Der Capacitor-Sog in erfassungsbogen.app — BESTÄTIGT, und C behandelt ihn korrekt, B nicht.**
`src/app/hilfen.ts:48` importiert `binaerTeilen, istNativ, textTeilen` aus `./nativ`; `src/app/nativ.ts:9–12` importiert `@capacitor/core`, `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`. `hilfen.ts` ist 825 Zeilen groß.
- **B §5.4 nennt `src/app/hilfen.ts` ausdrücklich als eine der sechs einzubindenden Dateien** — und zieht damit vier Capacitor-Pakete in eine Tauri-App, obwohl B zusagt, Capacitor werde nicht gebaut. Das Finding der B-Lieferbarkeitswiderlegung (17 Dateien / 5.176 Zeilen statt sechs) ist bestätigt.
- **C §5.4 lässt `hilfen.ts` bewusst im Produkt** ("es ist ausdrücklich Browser-Helfer für die SPA") und verschiebt nur die acht reinen Funktionen, die der Kern braucht, nach `bos-kern/src/darstellung.ts`. Das ist die richtige Behandlung und ein echter Qualitätsunterschied zugunsten von C.

**(4) C's Extraktionsliste ist unvollständig — NEUER BEFUND, verschärft F18.**
C §5.4 listet die zu verschiebenden Module namentlich auf, darunter `pdf-dokument.ts`, aber **nicht** `taktische-zeichen.ts`. Gemessen:
- `src/app/pdf-dokument.ts:45` importiert `fahrzeugSymbolSvg` aus `./taktische-zeichen`
- `src/app/taktische-zeichen.ts:28` importiert `vokabText, vokabularFuer` aus `./hilfen`
- `hilfen.ts:48` → `nativ.ts` → vier Capacitor-Pakete

Es gibt also im Kern-Kandidatensatz von C mindestens eine ungelöste Kante `pdf-dokument.ts → taktische-zeichen.ts → hilfen.ts → nativ.ts → Capacitor`, und `vokabText` steht nicht auf C's Liste der nach `darstellung.ts` zu verschiebenden Funktionen. `taktische-zeichen.ts` ist 421 Zeilen, `pdf-dokument.ts` 833 Zeilen. Das ist kein Architekturfehler — C's Regel 2 ("keine `node:`-, keine DOM-, keine React-Importe, prüfbar per ESLint und Testlauf unter `node` und `jsdom`") würde die Kante beim ersten Lauf aufdecken. Aber es zeigt, dass die 1,5-PW-Position M1 ("mechanisch, ~40 Dateien") vor der Kontaktaufnahme mit dem Importgraphen geschätzt wurde. **Das ist der Einzelposten, an dem C gegen A verliert (§10.2).**

---

## 5. Kriterium 1 — Datenintegrität im Mehrclient-/Offline-Betrieb auf SMB (Gewicht 30)

**Vorbemerkung:** Nach §3.1/§3.2 ist dieses Kriterium **kein Stack-Kriterium**. Alle drei Vorschläge haben dasselbe Speichermodell, denselben Klassendefekt und dieselbe Reparaturquelle (ZDM §4). Bewertet wird deshalb: (a) wie vollständig und widerspruchsfrei das Regelwerk spezifiziert ist, (b) wie viele eigenständige, nicht klassenbedingte Defekte hinzukommen, (c) **ob der eigene Beweisapparat die eigenen Fehler finden könnte** — das ist der eigentliche Trennschärfe-Punkt.

### 5.1 Vorschlag C — 78

**Für C:** Die beste Spezifikationsqualität der drei. Ein Blocker (T1, Klassendefekt), fünf schwere, acht mittlere Befunde. Der Widerleger bescheinigt ausdrücklich, dass er E3 zu kippen versucht und daran gescheitert ist. Zwölf benannte Fold-/Konfliktregeln K1–K12, darunter die **fachlich richtige bewusste Abweichung von nas §4(a)**: Stärke ist ein absoluter Meldestand mit LWW, kein additiver Zähler — weil zwei unabhängige Meldungen desselben Stands sich sonst verdoppeln würden. Diese Regel deckt sich mit ZDM §4.2 (`StaerkeGeaendert`: LWW/Entität über das Tripel, nicht je Rolle) und mit ZDM §4.4 Punkt 1 ("feldweises LWW mischt zwei Meldungen zu einer dritten, die niemand gemeldet hat"). C hat als einziger Vorschlag den eigenen Abweichungsgrund von der Primärquelle ausgeschrieben.
Zusätzlich: eigener Windows-CI-Job für die Speicherschicht; vierstufige Mehrclient-Simulation **mit Fehlerinjektion**; M0 (2,0 PW) als vorgezogenes Abbruchtor vor jeder UI-Zeile.
Der strukturell stärkste Einzelbaustein: **die Meldekopf-Sammlung aus erfassungsbogen.app ist selbst schon ein Append-Store** (Revisionen stapeln, Inhalts-Hash als ID, `neuesteJeEinheit` als Fold). C bettet damit einen bereits erprobten, getesteten Append-Fold ein, statt einen zweiten daneben zu bauen. Das ist unter der Integritätslinse ein echter Vorteil, kein bloßer Wiederverwendungsgewinn.

**Gegen C:** T5 (K7 "neueste Revision zählt" undefiniert ⇒ stille Falschstärke, §4.3) ist der gefährlichste Einzeldefekt aller drei Vorschläge, weil er den wichtigsten Ausgabewert trifft, weil NTP dagegen nicht hilft und weil ihn keine der vier Properties findet. T2 (defekte Zeile in der Dateimitte nach Teilübertragung, Leser bleibt dauerhaft stehen) und T3 (Undo trägt zwangsläufig den größten HLC und vernichtet fremde neuere Korrekturen ohne Hinweis) sind schwer, aber lokal reparabel. T9 (Hash-Kette endet an der Dateigrenze, ganze Segmente löschbar ohne Erkennung) entwertet den Anspruch "Ersatz für Revisionssicherheit" — der ist überzogen und sollte gestrichen statt repariert werden. T13 (Speicherschicht nur unter Windows automatisiert geprüft) wird durch die Betriebsparameter zur echten Lücke.
T12 (die Update-Ablage auf dem Share ist ein aktiver, unsignierter Codeverteilungskanal; die SHA-256 liegt im selben beschreibbaren Verzeichnis) ist streng genommen K3, wiegt aber unter Integrität mit, weil es der einzige Weg ist, auf dem ein Angreifer oder ein Versehen die Wahrheit **aller** Clients gleichzeitig verfälschen kann.

**Wertung 78.** Beste Spezifikation, gefährlichster Einzeldefekt, sauber begründete Abweichungen, Beweisapparat mit einer klaren Lücke (Property 3 widerspricht §3.6).

### 5.2 Vorschlag A — 75

**Für A:** Die Grundentscheidung ist korrekt begründet (A §3.2 argumentiert die R9-Falsifikation vollständig aus). Der Widerleger hat zehn naheliegende Einwände geprüft und **verworfen** — darunter mehrere, die die Synthese sonst erneut aufwerfen würde: `fsync` über SMB ist wirksam; die Ein-Schreiber-Invariante ist korrekt konstruiert; `create-new` reicht für Archivierungsatomarität; In-Memory reicht für 300 Einheiten; `printToPDF` blockiert den Fold nicht; UDP ist korrekt als bloßer Beschleuniger behandelt; das Timeout-Problem spricht nicht gegen Electron, weil Rust es genauso hat. Das ist eine belastbare Entlastung.
A §3.4 nimmt dieselbe Stärke-Entscheidung wie C (`EinheitStaerkeGesetzt {fue,ufue,he,basis}` statt additiver Ereignisse) und trägt als einziger einen **Vorher-Wert im Ereignis** (`basis`) — allerdings nur bei diesem einen Typ, während ZDM §4.1 Regel 3 ihn für jedes setzende Ereignis fordert.

**Gegen A:** Ein Blocker (B1, Klassendefekt) und **acht** schwere Befunde, die höchste Zahl der drei. Vier davon führen zu stillen Falschzuständen im Einsatz. Zwei sind eigenständig und schwer:
- **S7:** Der HLC-Text ist nur bei 13-stelliger Millisekundenzahl lexikografisch sortierbar. Ein offline mit zurückgestellter Uhr gestarteter Meldekopf — genau die von A beworbene Konstellation — gewinnt danach **dauerhaft und unumkehrbar** jedes LWW-Feld. Eigenschaft 4 (±3 h) findet das nie. NTP hilft nicht.
- **S8:** Ein einziger Worker trägt Kommandopfad und Share-I/O. Das Offline-Versprechen gilt deshalb nur bei "Share weg", nicht bei "Share hängt" (SessTimeout 60 s, blockierender SMB2 FLUSH) — und "hängt" ist im Feld der häufigere Fall.
- **M5:** Die Mehrclient-Simulation läuft auf einem lokalen Dateisystem und kann per Konstruktion keine SMB-Eigenschaft verletzen. A verkauft sie als "der Test, den v1 nicht bestanden hätte … braucht kein NAS" — das ist genau falsch herum: er braucht kein NAS, findet dafür aber auch keinen NAS-Fehler.

Anders als bei C fehlt A eine ausgeschriebene Konfliktregel-Liste; A §3.5 hat acht Regeln, aber keine für `EinheitGeteilt`/`EinheitZusammengefuehrt` (ZDM §4.2 zeigt, dass genau dort die nebenläufig falschen Zustände entstehen: v1 setzt die Quellstärke absolut und wäre nebenläufig falsch) und keine für `AbschnittSortiert`/`EinheitPositionGesetzt` außer der Grundregel.

**Wertung 75.** Richtige Entscheidung, gut verteidigt, aber die breiteste Defektfläche und ein Simulationsapparat, der die Zielfehlerklasse per Konstruktion nicht sehen kann.

### 5.3 Vorschlag B — 66

**Für B:** Dieselbe richtige Richtungsentscheidung, am ausführlichsten begründet (sechs Argumente gegen das Lockfile). Die Präzisierungen (kein Lock, kein Master, keine TTL, damit auch kein Mechanismus, der fremde Zeitstempel vergleicht) sind sauber. `uhlc` als fertige Bibliothek statt Eigenbau ist ein echter Vorteil gegenüber A's und C's handgeschriebenem HLC-String — A-S7 könnte in B gar nicht entstehen. Rust ist für diesen Kern die technisch natürlichste Sprache (nas §10 Punkt 5 sagt das ausdrücklich).

**Gegen B:** **Drei technische Blocker**, davon zwei ausschließlich aus B's eigenen Festlegungen:
- **W1** verwaister Segment-Rest: "neues Segment bei jedem App-Start" und die Offset-Spiegelung widersprechen sich; es gibt keinen Nachholpfad für alte Segmente. Stiller Datenverlust.
- **W3** Ereignis-`id` ohne Persistenz-/Monotoniezusage: die Dedup-Regel verwirft echte Ereignisse.
- **W2** abgerissener Share-Append: die Leserregel deckt nur die *letzte* Zeile; `prev` wird von keiner der neun Fold-Regeln geprüft. Die Betriebsparameter **verschärfen** das: Synology = Samba, und nas §1.11 belegt wörtlich, dass bei Oplock-Pufferung und Verbindungsabriss die Arbeit der vorherigen Sitzung verloren geht.

Dazu W10 (Klassendefekt) und, entscheidend, **ein Beweisapparat, der die eigenen Fehler nicht sehen kann**: Eigenschaft 1 ist eine Tautologie über die Sortierfunktion (W7), Eigenschaft 3 ist mit der eigenen Kompensationsregel (W4) und mit den Snapshot-Hinweisen (W13) unvereinbar, Eigenschaft 4 ist mit dem spezifizierten Regelwerk gar nicht erfüllbar (W6, fehlende Zyklusregel), und `s1 sim` als Vier-Prozesse-auf-einer-Maschine-Lauf blendet Caches, Leases und Sperren aus (W8). **M0 würde grün und damit das einzige Abbruchkriterium des Vorschlags entwerten.** Ein Abbruchtor, das nicht schließen kann, ist schlechter als keines, weil es Sicherheit vortäuscht.

W11 (Segmentzahl wächst mit den Neustarts: ~140 Dateien nach einer Woche, ~350 SMB-Roundtrips/s bei 5 Clients) trifft unmittelbar auf den Betriebsparameter "SQLite war super langsam" — dieselbe Lastform am selben Share. W16 (Backup und HTML-Monitor sind die zwei Ausnahmen von "nur eigene Dateien, nur Append" — ohne Schreiberwahl, mit Replace-Rename) durchlöchert die Invariante, die die ganze Konstruktion trägt.

**Wertung 66.** Richtige Richtung, schwächste Ausführung, und als einziger der drei ein Testapparat, der die eigenen Blocker strukturell nicht finden kann. Der bittere Befund: der eine Punkt, an dem der Rust-Kern unter dieser Linse etwas eingebracht hätte — erschöpfendes `match` plus ernsthafte Property-Tests — ist genau der, den B nicht ausgebaut hat.

### 5.4 K1 im Überblick

| | Blocker | schwer | Beweisapparat | Punkte | gewichtet (×0,30) |
|---|---|---|---|---|---|
| C | 1 (Klassendefekt) | 5 | eine klare Lücke (P3 ↔ §3.6) | **78** | 23,4 |
| A | 1 (Klassendefekt) + 1 gemeinsamer | 8 | Simulation blind für die Zielfehlerklasse | **75** | 22,5 |
| B | 3 (2 eigen) | 7 | strukturell blind; M0 kann nicht schließen | **66** | 19,8 |

---

## 6. Kriterium 2 — Lieferbarkeit bis Excel-Parität durch einen KI-gestützten Einzelentwickler (Gewicht 25)

Dies ist das Kriterium, das die Entscheidung trägt (§10.2).

### 6.1 Vorschlag A — 74

**Verdict der Widerlegung: haelt-mit-auflagen.** Korrigierte Spanne **20,5–32 PW** statt 16–24 PW; jeder Aufschlag ist einem Finding zugeordnet (Testkorpus neu +1,5–2,5; M2b Pipeline +1,5–2,5; Anwenderdoku/Schulung +1,0–2,0; Diagnose +0,25–0,5; Electron-Upgrade +0,25–0,5; EEB-Paketschnitt +0,25–0,75; Referenzmappe +0,25–0,5; Notbetrieb +0,25; abzüglich 0,75–1,5 Entlastung durch die Betriebsparameter). In Kalenderzeit mit dem **im Repo gemessenen** Rhythmus (21 Commit-Tage / 104 Kalendertage = 3,5 Kalenderwochen je PW): **17–26 Monate**; mit A's eigener optimistischer Annahme 9–15 Monate.

**Was A trägt und die anderen nicht:**
- **Kein Sprachwechsel, kein Werkzeugwechsel, kein Neubau der Testinfrastruktur** — der konservativste der drei Entwürfe. Die Velocity-Annahme ist ausdrücklich **nicht** widerlegt: v1 lieferte in 4,2 PW gemessener Arbeitszeit 70.488 Zeilen und einen lauffähigen Einbenutzer-Client.
- **Mit dem Wegfall von SQLite verschwindet der bisher gravierendste Electron-Nachteil.** Verifiziert an `S1-Control/package.json`: `better-sqlite3 ^11.8.1`, `drizzle-orm ^0.39.3`, `drizzle-kit ^0.30.4` und das Skript `rebuild:native` entfallen ersatzlos. Danach hat S1 **kein einziges natives Modul** mehr — kein node-gyp, kein ABI-Risiko, kein `rebuild:native` in sieben Build-Skripten. Das ist ein realer, prüfbarer Wegfall von Risiko und Bauzeit.
- Der einzige Blocker (F4) ist **mit einem 30-Minuten-Versuch am heutigen Release-Artefakt vor jeder Codezeile ausräumbar** und trifft alle drei Vorschläge gleich.
- Der Widerleger benennt den wirksamsten Hebel: **Ziel von "Excel-Parität" auf "M3+M4 plus Kernausgaben" verschieben**, Excel für Kosten, Schichtplan und Logistik parallel weiterlaufen lassen ⇒ 10–14 PW und rund ein Jahr, und die Schätzkritik verliert ihr Gewicht. Das ist realisierbar, weil A selbst schreibt, nach M3+M4 sei das Werkzeug bereits besser als die Excel (mehrbenutzerfähig, ETB).

**Gegen A:** Kein Posten für Anwenderschulung, Anwenderdokumentation oder In-App-Hilfe in neun Meilensteinen; M5-DoD hakt die Anforderungsgruppe L pauschal ab. Keine Kalenderzahl im ganzen Dokument. 1,0–2,0 PW je Jahr Dauerbetrieb fehlen in §8. Drei bis vier Fremdtermine, die keine Arbeitszeit sind, aber das Lieferdatum bestimmen.

**Wertung 74.** Einziger Vorschlag mit haltendem Lieferversprechen; die Korrektur ist bezifferbar, jede Position hat einen Beleg, und es gibt einen ausformulierten Weg zu 10–14 PW.

### 6.2 Vorschlag C — 58

**Verdict: faellt.** 18 Findings, ein Blocker. Die Zusage "21 PW Planwert, 18–30 PW bis Excel-Parität, danach Betrieb im Einsatz" fällt an fünf unabhängigen Stellen:
1. **F1 (Blocker):** keine Kalenderachse, keine Verfügbarkeitsannahme. Bei ehrenamtlichen 8–12 h/Woche werden 18–30 PW zu **1,3–2,9 Jahren**, und M0s "billiger Abbruch" zu einem Vierteljahr.
2. Positionen sind zugleich ausgeschlossen und als DoD gefordert (Schulung/Feldabnahme: "nicht enthalten" gegen M8-DoD "eine Übung wird vollständig in v2 geführt" und M7-DoD "Abnahme mit Johannes"), bzw. doppelt oder gar nicht gebucht (Updater, Renderer, M8).
3. Die Kalibrierung (erfassungsbogen.app: 300 Commits / ~24.800 Zeilen in gut zwei Monaten; bmecatEditor: 31,5 kLoC Rust in 9 Tagen) stammt aus Projekten **ohne Mehrclient- und Netzlaufwerk-Dimension**, während v1 45 % seiner Commits genau dort versenkt hat.
4. Der Betriebsteil ist unvollständig (kein Reparaturweg im Feld, kein Diagnosekonzept, keine Anwenderbasis, kein Einführungspfad; UDP fällt ohne Admin-Rechte aus).
5. Die Kopplung reicht tiefer als der Quelltext: Werkzeugschere, kein Linter im Zielrepo, keine Paketverdrahtung.

**Was C dennoch trägt:** Der Planwert 21 PW liegt **unter** A's korrigierter Untergrenze von 20,5 PW nur scheinbar — nach Anwendung der neun Auflagen (Positionen neu schneiden, Renderer, CI/Release/Verteilung, Diagnose, Einführung, Abnahme, M8 auflösen) liegt C's ehrliche Zahl mindestens auf A's Niveau, plus dem Extraktionsaufwand, den nur C hat. C's Struktur ist dabei besser als A's: M0 (2,0 PW) ist als Abbruchtor vor jeder UI-Zeile gesetzt, die Meilensteine sind feiner geschnitten, und der Umfang der Anforderungsliste ist als Untergrenze ehrlich benannt.

**Der ausschlaggebende Posten (§4.4 Befunde 1 und 4):** M1 "Kern extrahieren, Grenze durchsetzen · 1,5 PW · mechanisch, ~40 Dateien". In dieser Position stecken tatsächlich:
- ein Sprung von TypeScript 5.7 auf 7, Vite 6 auf 8, Vitest 3 auf 4, Electron 35 auf 43 (oder der umgekehrte Rückbau im Schwesterprodukt),
- ein Modulsystemwechsel CommonJS ↔ ESM oder ein Dual-Build des Kerns,
- die Einführung von ESLint samt Grenzregeln in ein Repo, **das keinen Linter hat** — und damit die erstmalige Konfrontation von ~24.800 Zeilen mit einem Regelsatz,
- ein Bundle-Budget im CI eines Repos, dessen CI diese Prüfung noch nicht kennt,
- die Auflösung mindestens einer ungelösten Importkante (`pdf-dokument.ts → taktische-zeichen.ts → hilfen.ts → nativ.ts → Capacitor`), die C's eigene Liste nicht erfasst.

Das ist keine mechanische Position. **[Annahme, nicht gemessen]** realistisch 3,0–5,0 PW statt 1,5 — und sie steht am Anfang, vor allem anderen, und blockiert bei Verzug ein zweites, produktiv genutztes Produkt. Das ist der Grund, warum C hinter A zurückfällt, obwohl C die bessere Spezifikation hat.

**Wertung 58.** Fallendes Lieferversprechen mit reparierbarer Struktur, aber der Reparaturaufwand sitzt ausgerechnet in dem Meilenstein, aus dem C seinen ganzen Vorsprung zieht.

### 6.3 Vorschlag B — 38

**Verdict: faellt**, und zwar härter als C.
- **Vier ganze Arbeitspakete fehlen** in der Meilensteintabelle (EEB-Kernextraktion, Herstellung der Referenzlage, Bedienschicht/Anwenderdoku, laufende Werkzeugpflege). Eine Schätzung mit fehlenden Positionen ist nicht durch Puffer heilbar.
- **Der Meilenstein, an dem v1 nachweislich am teuersten war** (Updater/Release/Signing: 24 % der Commits, 62 % der Testzeilen), ist mit 1,5 PW der am knappsten kalkulierte — und seine zentrale Randbedingung (keine Admin-Rechte) ist mit keinem Wort behandelt.
- **"Excel-Parität" ist mit diesem Plan definitorisch nicht erreichbar:** hb F-L4 (Tastenkürzel, ControlTips, Handbuch in der Anwendung) ist im gesamten Vorschlag weder eingeplant noch bewusst gestrichen; eine Volltextsuche über 665 Zeilen ergab null Treffer zu Schulung, Hilfe oder Anwenderdoku.
- Korrigierter Erwartungswert **35–40 PW statt 28,5** — die eigene Obergrenze wird zum neuen Mittelwert. Bei 8–10 h/Woche: **3 bis 3,5 Jahre**.
- Die Betriebsparameter entlasten um 2–3 PW, belasten aber um 4–8 PW.
- `tauri >= 2.11` macht die jüngste Minor-Linie zur Pflicht für die riskanteste UI-Funktion (Zweitmonitor); 2.11.1 trägt zwei Security-Fixes in Windows-relevantem Code. **Updatefähigkeit wird damit zur Betriebspflicht** und koppelt auf denselben 1,5-PW-Meilenstein zurück.

**Der entscheidende Satz steht in B selbst.** B §8.2/§10.4 enthält eine Notbremse: nach M3 Neubewertung zugunsten desselben Speichermodells in TypeScript, weil der Entwurf stackneutral ist. B schreibt sogar explizit: "bei unter 10 h/Woche ist die ehrliche Empfehlung, den Speicherentwurf aus §3 unverändert zu nehmen, ihn aber in TypeScript zu bauen." Der Betriebsparameter, der die Kalenderzeit setzt, ist nicht beantwortet — aber der Rhythmus im Repo (21 Commit-Tage in 104 Kalendertagen, 21 Nachtcommits, eine Pause von 10 Wochen) macht "unter 10 h/Woche" zur wahrscheinlichsten Annahme. **B empfiehlt unter dieser Annahme selbst, B nicht zu bauen.** Der Widerleger stellt fest, die Notbremse sei nach der Prüfung "nicht mehr neutral": die Findings L1, L7, L8 und der Zweisprachenpreis von +6 bis +10 PW fallen dort sämtlich weg.

**Wertung 38.** Zwei Lieferblocker, vier fehlende Arbeitspakete, ein Zielbegriff, der mit dem Plan nicht erreichbar ist, und ein Vorschlag, der unter den tatsächlich vorliegenden Betriebsparametern seine eigene Alternative empfiehlt.

### 6.4 K2 im Überblick

| | Verdict | korrigierte Spanne | Kalenderzeit [Annahme 8–12 h/Woche] | Punkte | gewichtet (×0,25) |
|---|---|---|---|---|---|
| A | haelt-mit-auflagen | 20,5–32 PW (10–14 bei Zielverschiebung) | 17–26 Monate (bzw. ~12) | **74** | 18,5 |
| C | faellt | ≥21 PW + unterschätztes M1 | 1,3–2,9 Jahre | **58** | 14,5 |
| B | faellt | 35–45 PW | 3–3,5 Jahre | **38** | 9,5 |

---

## 7. Kriterium 3 — Betreibbarkeit im Einsatz (Gewicht 15)

Gemeint sind Verteilung, Update, Diagnose und Schulung. **Alle drei Vorschläge sind hier schwach**; das ist der gemeinsame blinde Fleck der Entwurfsphase. Bewertet wird der Abstand zur Betriebsfähigkeit.

### 7.1 Was alle drei gleich trifft

Der Betriebsparameter "keine Admin-Rechte" ist der härteste Einzelpunkt und in keinem Vorschlag behandelt. Er zerfällt in drei Ja/Nein-Fragen, die **vor jeder Codezeile** an einem heutigen Release-Artefakt zu beantworten sind:
1. Startet und installiert sich die Anwendung per-User ohne Elevation?
2. Läuft ein Update ohne Elevation durch?
3. Darf eine unsignierte, nicht freigegebene EXE auf den FüSt-Rechnern überhaupt starten (AppLocker/WDAC/SmartScreen)?

Fällt Frage 3 negativ aus, **fällt nicht ein Vorschlag, sondern jeder Desktop-Vorschlag** — dann ist die Randbedingung "kein Serverprozess, Client auf dem FüSt-Rechner" neu zu verhandeln. Das ist das gemeinsame Kippkriterium.

Ebenfalls alle drei: kein ausformuliertes Schulungs- und Anwenderdokumentationspaket, kein Reparaturweg im Feld ("die Anwendung selbst fällt aus" — behandelt wird überall nur "das NAS fällt aus"), und der UDP-Beschleuniger, dessen Firewall-Freigabe ohne Admin-Rechte fraglich ist.

### 7.2 Vorschlag A — 66

**Für A:** Der gesamte Verteilungsapparat existiert und läuft: electron-builder mit NSIS (per Voreinstellung per-user, also admin-frei), Portable-EXE, macOS-Signierung **und Notarisierung**, deb/pacman, vier gebaute Zielplattformen, CI-Median 5:16 min, 70 Releases, ein reparierter Versionsvergleich im Updater. Der Windows-Installer ist per Konstruktion offline vollständig — bei Tauri wäre auf Windows 11 dasselbe erreichbar, aber es müsste erst hergestellt werden. `webContents.printToPDF` und `print` liefern einen Druckweg, den Tauri gar nicht hat (bmecat R7); für acht Ausgabeprodukte, deren Kern "sieht aus wie der Excel-Ausdruck" ist, zählt das.

**Gegen A:** Windows-Codesignierung bleibt aus (bmecat R13). Der Update-Kanal 2 startet den NSIS-Installer still mit `/S` unter der ungeprüften Annahme, das gehe ohne Adminrechte. Das Frühwarnzeichen ist erst "Update auf einem zweiten Rechner in M7 schlägt fehl" — zu spät. Kein Diagnosekonzept (das Debug-Log-Forwarding wird sogar gestrichen). Kein Posten für Schulung. Vier Zielplattformen ohne Nutzenbeleg — nirgends wird entschieden, welche davon ein Produkt ist und welche eine Bequemlichkeit. Der SLO-Widerspruch: A13 führt die UDP-Blockade als Umgebungsrisiko mit der Gegenmaßnahme "Polling ist immer aktiv und ausreichend", während M8-DoD "Fremdänderung < 5 s auf der Zielhardware gemessen" fordert — beides kann nicht gleichzeitig gelten, wenn UDP ausfällt und der Poll bei 2 s plus Directory-Cache liegt.

**Wertung 66.**

### 7.3 Vorschlag C — 62

**Für C:** Dieselben Electron-Vorteile wie A. Zusätzlich ein zweigleisiges Update (electron-updater bei Internet, sonst Update-Ablage auf dem Share mit SHA-256) und die ehrliche Anzeige der Sichtbarkeitslatenz im UI ("bis 10 s für die erste Datei eines neuen Clients"). Die Streichung des LAN-Peer-Updates (796+123 Zeilen) ist begründet und richtig.

**Gegen C:** Die Update-Ablage ist ein **aktiver, unsignierter Codeverteilungskanal**: die SHA-256 liegt im selben beschreibbaren Verzeichnis wie das Artefakt, und Windows-Codesigning gibt es nicht (T12). Wer auf den Share schreiben darf — und das dürfen alle Clients — kann Code auf allen FüSt-Rechnern austauschen. Das ist der schwerste Betriebsbefund aller drei Vorschläge. Die Rettung liegt allerdings **bereits im Haus**: das Ed25519 des eigenen geteilten Kerns (`src/signatur.ts`, 340 Zeilen, 484 Testzeilen) signiert die Update-Manifeste; das ist eine Sache von Stunden, nicht von PW.
Dazu: kein Reparaturweg im Feld, kein Diagnosekonzept, keine Anwenderbasis (70 Releases / 76 Windows-Downloads, v1 nie im Einsatz), kein Einführungspfad — und weil es keine Altdaten gibt, ist der Umstieg zwingend kalt.

**Wertung 62.**

### 7.4 Vorschlag B — 46

**Für B:** Als einziger denkt B die Diagnose im Einsatz ohne Entwickler vor Ort systematisch durch (`s1-cli` + `tracing`/`tauri-plugin-log` + Diagnoseansicht + Störfallmatrix). Das ist der beste Betriebsbaustein der drei und gehört als Graft übernommen. Der signaturgeprüfte Update-Weg über denselben Share (minisign) ist B's Antwort auf genau das Problem, an dem C scheitert.

**Gegen B:** Der gesamte Apparat wird neu gebaut — Installer, Signierung, Updater, E2E — und ist mit 1,5 PW (5,3 % der Gesamtsumme) für den Bereich veranschlagt, der in v1 24 % der Commits verbraucht hat. Die Randbedingung "keine Admin-Rechte" ist unbehandelt, obwohl B als einziger einen MSI-Weg erwägt (MSI ist der schwierigste Weg ohne Admin). `tauri >= 2.11` macht ständiges Nachziehen zur Betriebspflicht. Kein Druck-API — gedruckt wird über den Systembrowser, ein Umweg mit eigenen Fehlerquellen ausgerechnet bei den Ausgabeprodukten. Kein einziger Treffer zu Schulung, Hilfe oder Anwenderdoku im ganzen Dokument (Blocker). Sieben Windows-spezifische Arbeitspakete ohne benannte Windows-Entwicklungsmaschine — bei einem Entwickler, der auf macOS arbeitet.

**Wertung 46.**

### 7.5 K3 im Überblick

| | Punkte | gewichtet (×0,15) |
|---|---|---|
| A | **66** | 9,9 |
| C | **62** | 9,3 |
| B | **46** | 6,9 |

---

## 8. Kriterium 4 — Wiederverwendung mit erfassungsbogen.app und v1-Bausteinen (Gewicht 15)

Hier sind die Abstände am größten, und hier gewinnt C deutlich.

### 8.1 Vorschlag C — 86

C teilt die **gesamte EEB-Domäne** als `@bos/kern`: Bogenmodell samt abgeleiteter Werte, Binärcodec EEB2/EEB2C, Ed25519-Signatur, Meldekopf-Sammlung mit Revisionen/Inhalts-Hash/Fingerabdruck, Aufteilen/Zusammenführen, Meldungs-Diff, Einheitenliste, Vokabulare, eigener XLSX-Schreiber, PDF-Dokumentdefinitionen. Belegt: 44 Testdateien, 684 `it`/`test` im Ursprungsrepo; nur zwei der Kandidatenmodule berühren Plattform-APIs, und dort ist die Hülle bereits abgetrennt (`einsaetze.ts` ab Z. 318).

Der **fachlich stärkste Einzelgewinn** ist nicht die Zeilenzahl, sondern die Struktur: die Meldekopf-Sammlung ist selbst ein Append-Store (Revisionen stapeln, Inhalts-Hash als ID, `neuesteJeEinheit` als Fold). Sie lässt sich **einbetten statt umbauen**. Daraus folgt der Meldekopf auf drei Wegen (direkt auf dem Share, per `.s1meld`-Bündeldatei, per QR), die dieselben Ereignisse erzeugen — und die Google-Tabelle der Excel entfällt ersatzlos. Das ist die beste fachliche Idee in allen drei Dokumenten.

Ebenfalls C: die tragende Modellgrenze **Meldung (gehört der meldenden Einheit) gegen EinsatzEinheit (gehört der Führungsstelle)** — genau die Grenze, die der Kopfkommentar von `oldenburg-xlsx.ts` bereits benennt. Sie ist in ZDM §3 wiederzufinden und sollte unabhängig vom Sieger übernommen werden.

**Abzüge:** die gemessene Werkzeugschere und der fehlende Linter im Zielrepo (§4.4 Befund 1), die unvollständige Extraktionsliste (§4.4 Befund 4), das erklärte Hauptrisiko R3 (zwei Produkte mit verschiedenem Release-Takt). Gemildert durch eine **ausformulierte, geordnete Rückfallstrecke**: Additiv-Regel, Aufnahmeregel, ESLint-Grenzregeln, Bundle-Budget, gepinnte Submodul-Commits, und die Abbruchbedingung "zweimal in drei Monaten ein Release blockiert ⇒ eingefrorenes Vendoring". Das ist mehr Kopplungsdisziplin, als die meisten Zweipersonenprojekte haben.

**Wertung 86.**

### 8.2 Vorschlag A — 70

A pinnt ein schmales npm-Paket `@erfassungsbogen/kern` (nur `model.ts`, `codec.ts`, `signatur.ts`, `qr-node.ts` und die reinen Teile von `einsaetze.ts`) als Git-Abhängigkeit mit Tag, offline-tauglich über den npm-Cache, ~0,5 PW in M6. Weniger Wiederverwendung als C, aber auch weniger Kopplung, und der Schnitt geht durch dieselbe Naht, die C zieht — nur schmaler.

**Dafür holt A die größte v1-Erbschaft:** 190 Vitest-Tests, 10 BDD-Szenarien mit Playwright, die vierfache CI-Matrix mit gemessenem Median 5:16 min, macOS-Signierung und -Notarisierung, der reparierte Versionsvergleich des Updaters, die erprobte Zweitmonitor-Logik des Stärke-Monitors, Domänenmodell, Zeichen-Inferenz, STAN-Daten, `printToPDF`.
**Abzug:** Die Widerlegung stellt fest, dass diese Erbschaft überschätzt wird — der Testkorpus ist zum großen Teil Updater/Sync-Tests, die mit dem Speichermodell wegfallen (nur ~1.000 Zeilen Fachlogiktests sind wirklich portierbar), und der Renderer ist nicht kostenlos übernehmbar (150-Props-Drilling, 91 Typfehler, null Komponententests). Die Position "Testinfrastruktur existiert bereits" als Begründung der Untergrenze 16 PW ist deshalb nicht tragfähig (+1,5–2,5 PW).

**Wertung 70.**

### 8.3 Vorschlag B — 34

B bindet den EEB-Codec als git-Submodul in eine Tauri-App ein und lässt ihn im WebView laufen — richtig entschieden (kein Rust-Port, ADR dokumentiert). Aber: die als "sechs Dateien" zugesagte Einbindung zieht nachweislich 17 Dateien / 5.176 Zeilen inklusive vier Capacitor-Paketen (§4.4 Befund 3), obwohl B zusagt, Capacitor werde nicht gebaut.

Vor allem aber wird **die gesamte v1-Erbschaft weggeworfen**: 190 Tests (nur ~1.000 Zeilen Fachlogik wären konzeptionell portierbar, und die müssten neu in Rust geschrieben werden), die 10 Playwright-BDD-Szenarien (Werkzeugwechsel), CI-Matrix, Signierung, Updater (~920 Zeilen Peer-Update plus electron-updater-Integration), `printToPDF`. Der Renderer wäre ohnehin neu — das gilt aber für alle drei. Was übrig bleibt, ist die Domänenkenntnis und die Gherkin-Dateien, die B wörtlich übernehmen will.

**Wertung 34.**

### 8.4 K4 im Überblick

| | Punkte | gewichtet (×0,15) |
|---|---|---|
| C | **86** | 12,9 |
| A | **70** | 10,5 |
| B | **34** | 5,1 |

---

## 9. Kriterium 5 — Langfristige Wartbarkeit und Erweiterbarkeit (Gewicht 15)

Maßstab: ein ehrenamtlicher Ein-Personen-Entwickler, Bus-Faktor 1, unbekannte Verfügbarkeit, Zeithorizont Jahre. Was hier zählt, ist nicht theoretische Eleganz, sondern **wie viel laufende Pflege der Stack pro Jahr fordert und wie viele Wege es gibt, sich selbst zu blockieren.**

### 9.1 Vorschlag A — 78

Eine Sprache über alle Schichten. **Nach dem Wegfall von SQLite kein einziges natives Modul** (verifiziert, §6.1) — damit ist ein Electron-Major-Upgrade wirklich "ein Versionsdreher plus CI-Lauf", und das Argument A12 stimmt (auch wenn seine Prämisse "electron ^43 in beiden Repos" für S1 falsch ist: es sind acht Majors Rückstand, §4.4 Befund 2). Ein Repo, ein Werkzeugsatz, kein Registry-Konto, keine Submodul-Disziplin. Der Kern ist Electron- und node-frei geschnitten mit maschinell erzwungenen Importgrenzen — das ist derselbe Schnitt wie bei B und C, nur ohne Sprachgrenze. Die einzige junge Abhängigkeit ist `playwright-bdd`, und die sitzt an einem Release-Gate, nicht im Produkt. ADRs, §-nummerierte Konzepte und pausenfeste DoDs adressieren den Bus-Faktor.

**Abzug:** 1,0–2,0 PW je Jahr Dauerbetrieb sind in §8 nicht veranschlagt; das Ablaufen des Signaturmaterials ist nur als Verlust behandelt, nicht als Ablauf; vier Zielplattformen ohne Nutzenbeleg sind Dauerlast.

### 9.2 Vorschlag C — 66

Auch eine Sprache, auch ein moderner Werkzeugsatz — aber **zwei Repos in dauerhaftem Gleichschritt**. C verkauft das als Ersparnis ("Electron-Majors werden gemeinsam gehoben — ein Aktualisierungsvorgang für zwei Produkte"); es ist in Wahrheit eine Kopplung, die erst hergestellt und dann für immer gehalten werden muss. Die gemessene Schere (§4.4) zeigt, was passiert, wenn sie nicht gehalten wird: acht Electron-Majors, zwei TypeScript-Majors, zwei Vite-Majors, zwei Vitest-Majors Abstand in unter einem Jahr, dazu CommonJS gegen ESM. Ab dem Moment, in dem `@bos/kern` existiert, ist jedes Werkzeug-Upgrade eines Produkts ein Upgrade beider.

Dagegen steht eine ernsthafte Mitigation: die Aufnahme- und Additivregeln, die maschinelle Grenzdurchsetzung, das Bundle-Budget, die gepinnten Commits — und vor allem die **dokumentierte, geordnete Abbruchbedingung** hin zu eingefrorenem Vendoring. C ist der einzige Vorschlag, der seinen eigenen Rückweg ausformuliert hat. Das ist Reife und wird angerechnet.

**Erweiterbarkeit:** hier ist C am stärksten. Ein geteilter BOS-Kern trägt auch das dritte und vierte Produkt; das EEB-Format entwickelt sich (SCHEMA_VERSION 8, Weichen v2–v8) und wird an genau einer Stelle gepflegt statt an zweien. Der Vorschlag argumentiert richtig, dass ein Nachbau Doppelpflege bei jedem EEB-Schemaschritt bedeutet.

### 9.3 Vorschlag B — 58

Der Rust-Kern ist objektiv das langlebigste Artefakt der drei: `serde`, erschöpfendes `match` über den Ereigniskatalog, Property-Tests als natürliche Ausdrucksform, dieselbe Crate für App und CLI, `tauri-specta` statt handgepflegter Bindings. nas §10 Punkt 5 bestätigt, dass das Ereignisprotokoll in Rust "besonders natürlich" ist. Wäre die Frage "welcher Kern hält zehn Jahre", wäre B vorn.

Dagegen: **zwei Sprachen für einen ehrenamtlichen Einzelentwickler.** B beziffert den Aufschlag selbst mit +20 bis +35 % (+6 bis +10 PW) und schreibt, die Rechnung gehe "nur auf, wenn der Kern langlebig ist". Dazu kommt die Bindung an `tauri >= 2.11` — die jüngste von 12 Minor-Linien in 47 stabilen 2.x-Releases — für die riskanteste UI-Funktion, mit Security-Fixes in Windows-relevantem Code in 2.11.1. Das ist keine Wartbarkeit, das ist eine Abonnementpflicht. Dreifache CI-Zeit gegenüber den gemessenen 5:16 min. Kein Druck-API, also ein dauerhafter Umweg bei den Ausgabeprodukten. Und alles, was heute funktioniert (Signierung, Updater, E2E), muss neu gebaut und dann dauerhaft gepflegt werden.

**Und der zentrale Vorteil ist im Vorschlag nicht eingelöst:** der eine Ort, an dem der Rust-Kern die Wartbarkeit tatsächlich erhöht hätte — belastbare Property-Tests über den Fold — ist ausgerechnet der, den B nicht ausgebaut hat (W7).

### 9.4 K5 im Überblick

| | Punkte | gewichtet (×0,15) |
|---|---|---|
| A | **78** | 11,7 |
| C | **66** | 9,9 |
| B | **58** | 8,7 |

---

## 10. Gesamtwertung und Rangfolge

### 10.1 Die Tabelle

| Kriterium (Gewicht) | A Electron-Evolution | C Hybrid/geteilter TS-Kern | B Tauri/Rust-Kern |
|---|---|---|---|
| K1 Datenintegrität SMB (30) | 75 → **22,5** | 78 → **23,4** | 66 → **19,8** |
| K2 Lieferbarkeit (25) | 74 → **18,5** | 58 → **14,5** | 38 → **9,5** |
| K3 Betreibbarkeit (15) | 66 → **9,9** | 62 → **9,3** | 46 → **6,9** |
| K4 Wiederverwendung (15) | 70 → **10,5** | 86 → **12,9** | 34 → **5,1** |
| K5 Wartbarkeit (15) | 78 → **11,7** | 66 → **9,9** | 58 → **8,7** |
| **Gesamt** | **73,1** | **70,0** | **50,0** |

**Rangfolge: 1. A (73) — 2. C (70) — 3. B (50).**

### 10.2 Das ausschlaggebende Kriterium

A und C liegen 3,1 Punkte auseinander. Die Differenz entsteht **ausschließlich** an K2 (Lieferbarkeit): dort trennen sie 4,0 gewichtete Punkte. In allen anderen Kriterien summiert sich C's Vorsprung auf +0,9. Ohne K2 gewönne C.

Und innerhalb von K2 sitzt der Unterschied nicht in der Gesamtzahl der Personenwochen — C's Planwert 21 PW und A's korrigierte Untergrenze 20,5 PW sind praktisch gleich —, sondern an **einer** Stelle: **C's Meilenstein M1** (Kernextraktion, 1,5 PW, "mechanisch"). Das ist der Baustein, aus dem C seinen gesamten Vorsprung bei K4 und einen Teil bei K1 zieht, und es ist der einzige Posten, bei dem ich durch eigene Messung zeigen kann, dass er unterschätzt ist (§4.4 Befunde 1 und 4; **[Annahme]** 3,0–5,0 PW statt 1,5). Er steht am Anfang aller Arbeit, er blockiert bei Verzug ein zweites, produktiv genutztes Produkt, und C's eigener Widerleger stellt fest, dass die Durchsetzungsmechanik in ein Repo eingeführt werden soll, das nicht einmal einen Linter hat.

**Das ist die Entscheidung in einem Satz: A gewinnt, weil C seinen eigenen Vorsprung mit einer Vorleistung bezahlt, deren Preis nicht ermittelt wurde — und weil diese Vorleistung ganz am Anfang steht.**

### 10.3 Warum B so deutlich verliert

B verliert nicht an der Idee. Die Richtungsentscheidung ist korrekt (§3.1), der Rust-Kern ist das langlebigste Artefakt (§9.3), `uhlc` statt handgeschriebenem HLC-String vermeidet A-S7, und die Diagnose-Bausteine sind die besten der drei. B verliert an vier Dingen, die alle nicht die Architektur betreffen:
1. **Der Preis ist bekannt und wird nicht bezahlt:** +6 bis +10 PW allein für die Zweisprachengrenze, bei einem korrigierten Gesamtwert von 35–45 PW und 3–3,5 Jahren Kalenderzeit.
2. **Der Gegenwert wird nicht eingelöst:** der einzige Ort, an dem Rust unter der Integritätslinse zahlt, ist im Vorschlag nicht belastbar ausgebaut (W7).
3. **Nichts, was heute funktioniert, überlebt:** Tests, E2E, Updater, Signierung, CI, Druckweg — alles neu, und der Meilenstein dafür ist der knappste im Plan.
4. **B empfiehlt unter den tatsächlichen Betriebsparametern selbst seine eigene Alternative** ("bei unter 10 h/Woche … denselben Speicherentwurf, aber in TypeScript bauen").

Der Betriebsparameter Windows 11 nimmt B zwar sein größtes Handicap (WebView2-Offline). Das ändert nichts: B scheitert an K2, K3 und K4, nicht an der Installergröße.

### 10.4 Prüfung der Rangfolge auf Robustheit

Ich habe drei Gegenrechnungen durchgespielt:

- **Wenn man K1 auf 40 und K2 auf 15 gewichtet** (Integrität über Lieferbarkeit): A 73,2 / C 72,0 / B 49,8 — A gewinnt weiterhin, knapper. Die Rangfolge ist gegen eine Umgewichtung *innerhalb* der Integritäts-/Lieferbarkeitsachse robust.
- **Was die Rangfolge tatsächlich kippt, ist eine Umgewichtung zugunsten der Wiederverwendung.** Bei K4 = 30 und K2 = 10 (also: die Integration mit erfassungsbogen.app wird zur Hauptsache erklärt, die Lieferbarkeit zur Nebensache): A 72,5 / C 74,2 — **C gewinnt**. Praktisch heißt das: Wenn der Meldekopf mit Revisionen, Diff, Aufteilen/Zusammenführen und XLSX-Ausgabe eine harte Anforderung *ab Tag 1* ist statt ein späteres Modul, wandert C's Vorsprung aus K4 in K2 hinüber — denn dann müsste A diese Domäne selbst bauen. Das ist die eine Auskunft von Johannes, die den Sieger wechselt (§14.1).
- **Wenn A's Blocker F4 negativ ausgeht** (keine unsignierte EXE startbar): alle drei fallen gleichzeitig; die Rangfolge bleibt, das Problem ist keines der Architektur.
- **Wenn C's M1 doch 1,5 PW kostet** (meine Messung wäre also folgenlos): C's K2 steigt auf ~66, Gesamt 72,0 — **immer noch knapp hinter A (73,1)**, weil die übrigen Lieferbarkeitsfindings (F1 Kalenderachse, F4 Updater, F6 Einführung, F8 Renderer, F11 M8, F5 UDP) davon unberührt bleiben. Die Rangfolge ist also nicht allein von meiner Messung abhängig.

---

## 11. Empfehlung

### 11.1 Die Empfehlung in einem Absatz

**S1-Control v2 wird auf der Basis von Vorschlag A gebaut: Electron + React 19 + Vite + TypeScript, eine Sprache über alle Schichten, npm-Workspaces, keine nativen Module.** Der Zustand ist ein append-only Ereignisprotokoll auf dem NAS-Share mit genau einem Schreiber je Datei, HLC-Ordnung und deterministischem Fold (nas §10 Option C→E); der Ereigniskatalog und die Konfliktregeln kommen nicht aus dem Siegervorschlag, sondern aus `zieldatenmodell-feldabgleich.md` §4, weil der dort bereits die Reparaturen enthält, die alle drei Vorschläge brauchen. In diese Basis wird der tragende Baustein von Vorschlag C eingepfropft — der **geteilte TypeScript-Kern mit erfassungsbogen.app** —, aber schmaler geschnitten, mit C's Einbindungsmechanik und unter einer Vorbedingung, die A nicht formuliert hat und die auf der grünen Wiese nichts kostet: **der neue Branch startet auf der Werkzeugkette des Schwesterprodukts** (TypeScript 7, Vite 8, Vitest 4, Electron 43, `"type": "module"`), damit die gemessene Werkzeugschere gar nicht erst zu schließen ist. Von Vorschlag B werden die Diagnose- und Signaturbausteine übernommen; Rust und Tauri werden nicht übernommen.

### 11.2 Der Stack

| Schicht | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript, strict, **Ziel TS 7** | eine Sprache über Kern, Schale, Renderer, CLI und geteilten Kern; kein Sprachwechsel im Plan |
| Desktop-Schale | **Electron ^43** (nicht ^35 wie v1) | grüne Wiese ⇒ direkt auf den Stand des Schwesterprodukts; `printToPDF`/`print` für die Ausgabeprodukte; Installer per Konstruktion offline vollständig; per-user-NSIS ohne Admin |
| Renderer | React 19 + Vite 8, **Zustand-Store statt Props-Drilling**, Komponententests | v1s 150-Props-Drilling, 91 Typfehler und null Komponententests werden nicht übernommen |
| Modulsystem | ESM (`"type": "module"`) | Voraussetzung für den geteilten Kern; v1s CommonJS wird nicht fortgeschrieben |
| Bau | Vite (Renderer), tsup (Main/Preload), electron-builder (Pakete) | unverändert erprobt; CI-Median 5:16 min bleibt die Messlatte |
| Schemata | zod für Ereignis-, IPC- und Manifestschemata | Ersatz für Rusts serde-Typsicherheit an der einzigen Stelle, wo sie wirklich fehlt |
| Tests | Vitest 4 + fast-check (Property), Testing Library, Playwright + playwright-bdd | die 10 BDD-Szenarien bleiben lauffähig (Tauri hätte sie gekostet, bmecat R6) |
| **Nicht im Stack** | Rust, Tauri, SQLite, better-sqlite3, drizzle-orm/-kit, `rebuild:native`, LAN-Peer-Update | siehe §10.3, §6.1, §12.4 |

### 11.3 Das Speichermodell

Unverändert die gemeinsame Entscheidung aller drei Vorschläge (§3.1), mit den Präzisierungen aus §3.2 und den Auflagen aus §12.5:

```
\\NAS\...\S1-Control\
  manifest.json                       # formatVersion; KEINE harte mindestClientVersion (siehe §12.5 Nr. 9)
  einsaetze\<datum>_<slug>_<kurzid>\
    einsatz.json                      # create_new, unveraenderlich
    ereignisse\<clientId>.<segment>.jsonl     # len \t crc32 \t json, fsync je Zeile, Hash-Kette
    schnappschuesse\                  # Versionsvektor + blake3 + foldVersion, jederzeit verwerfbar
    praesenz\<clientId>.json          # einzige ueberschriebene Datei, nur die eigene
    anhaenge\  ausgaben\  archiv.marker
  programm\                           # Update-Ablage, Manifest Ed25519-signiert (§12.4 Nr. 3)
  stammdaten\stan-<version>.json
```

Tragende Festlegungen:
1. Jeder Client schreibt ausschließlich eigene Dateien. Kein Lock, kein Master, keine TTL, kein Replace-Rename im Datenpfad.
2. **Local-first:** jedes Ereignis wird zuerst lokal angehängt, die Share-Spiegelung ist ein wiederholbarer Append ab Offset. NAS-Ausfall ist der Normalpfad, kein Fehlerpfad; es gibt keinen Merge-Dialog.
3. **Der Fold ist eine Mengenfunktion, der Live-Pfad ist ein Rebase, jedes materialisierte Feld trägt die HLC seines Gewinners** (§3.2 — die eine Festlegung, die A-B1, B-W10, C-T1, C-T3 und C-T5 gemeinsam abräumt).
4. Ordnung über HLC, niemals über die Wanduhr; die Wanduhr steht nur in der Anzeige und im ETB.
5. Sichtbarkeit über Poll am bekannten Byte-Offset (Intervall aus der M0-Messung zu kalibrieren), UDP nur als Beschleuniger — und mit der ehrlichen Annahme, dass er ohne Admin-Rechte ausfallen kann (§12.5 Nr. 6).

### 11.4 Die Kernaufteilung

Vier Ringe, jeder mit maschinell erzwungenen Importgrenzen (ESLint `no-restricted-imports` / `import/no-restricted-paths`), jeder ohne den nächstäußeren:

```
@bos/kern      plattformneutral, geteilt mit erfassungsbogen.app
               EEB-Bogenmodell, Codec EEB2/EEB2C, Ed25519-Signatur,
               Meldekopf-Sammlung (Revisionen, Inhalts-Hash, neuesteJeEinheit),
               Aufteilen/Zusammenfuehren, Meldungs-Diff, Vokabulare, XLSX-Schreiber
               KEIN node:, kein DOM, kein React, kein Electron

@s1/domaene    plattformneutral, nur S1
               Zielmodell (ZDM §3), Ereigniskatalog + Fold + Konfliktregeln (ZDM §4),
               HLC, Kennzahlen, Zeichen-Inferenz und STAN-Uebernahme aus v1, Validierung
               KEIN node:, kein DOM, kein React, kein Electron

@s1/speicher   node:fs, node:crypto        @s1/netz  node:dgram
@s1/ausgaben   Rendering der acht Produkte  @s1/cli   bin "s1"

apps/desktop   Electron-Main (duenn, kein Fachzustand)
               + ein worker_thread je offener Akte (Share-I/O, Fold, Projektion)
               + zwei Renderer (index.html, monitor.html)
```

**Wichtige Abweichung von C:** HLC, Ereigniskatalog und Fold-Motor bleiben in `@s1/domaene` und wandern **nicht** in `@bos/kern` (C §1.1(d)/§4.6 wollte sie dorthin, "ja, generisch"). Begründung: erfassungsbogen.app braucht sie nicht, und C's eigene Aufnahmeregel 1 lautet "Aufnahme nur, wenn **beide** Produkte den Baustein aufrufen". C verletzt hier seine eigene Regel; die C-Lieferbarkeitswiderlegung hat das als Auflage 7 aufgeführt. Der Fold ist außerdem der Teil, der sich in den ersten Monaten am häufigsten ändert — er darf nicht am Release-Takt eines zweiten Produkts hängen.

### 11.5 Der Weg: erst beweisen, dann bauen, und ein kleineres Ziel

Drei Vorschaltungen vor M1, die zusammen unter einer Personenwoche kosten und drei der schwersten Risiken abräumen:

**M-1 (ein halber Tag): Der Feldversuch ohne Code.** Am *heutigen* Release-Artefakt von v1 auf einem echten FüSt-Rechner prüfen: (a) installiert sich der NSIS-Installer per-user ohne Elevation? (b) läuft der stille Update-Start `/S` ohne Elevation? (c) startet die unsignierte EXE überhaupt (SmartScreen/AppLocker/WDAC)? Ergebnis (c) negativ ⇒ **jeder** Desktop-Vorschlag fällt und die Randbedingung ist neu zu verhandeln. Das ist der billigste Blocker-Test des ganzen Projekts und er steht heute vor der ersten Codezeile (A-F4, B-W14/W15).

**M-0 (ein halber Tag): Der Werkzeug- und Verdrahtungs-Spike.** Ein leeres `@bos/kern` mit einer Funktion, eingebunden in beide Repos, beide bauen und testen grün, unter TS 7 / Vite 8 / Vitest 4 / ESM. Damit ist §4.4 Befund 1 beantwortet, bevor die Extraktion beginnt.

**M0 (1,5–2,0 PW): Beweis der Speicherarchitektur ohne UI**, mit benanntem Abbruchkriterium. Enthält zwingend: die SMB-Latenzmessung auf dem **echten Synology-Share** (bislang nirgends gemessen, kritik §3.7), die Messung der **Gesamtkosten eines Poll-Zyklus bei N Segmenten und 5 Clients** (§2.2g), eine "feindliche Dateisystem"-Schicht in der Mehrclient-Simulation (A-M5), und Läufe auf **mindestens zwei Betriebssystemen** (B-W8, Betriebsparameter macOS/Linux).

**Danach: das Ziel verkleinern.** Das erklärte Ziel "Excel-Parität" (alle F-A1…F-L6 und N-1…N-9) kostet nach korrigierter Rechnung 20,5–32 PW und 17–26 Kalendermonate. Das Ziel **"M3 + M4 plus Kernausgaben"** — Lagebild führen, Einheiten vollständig, ETB, Stärkeübersicht drucken, Stärke-Monitor — kostet 10–14 PW und rund ein Jahr, und ist ab Tag 1 der Auslieferung **besser als die Excel**, weil es mehrbenutzerfähig ist und ein Einsatztagebuch führt. Kosten, Schichtplan und Logistik laufen so lange in der Excel weiter. Das ist die wirksamste Einzelentscheidung des ganzen Vorhabens und sie gehört Johannes (§13 Nr. 1).

---

## 12. Grafts — was aus den unterlegenen Vorschlägen übernommen wird

### 12.1 Aus Vorschlag C: der geteilte TypeScript-Kern (der Hauptgraft)

**Übernommen:** `@bos/kern` als eigenes Repo, in beiden Produkten als git-Submodul unter `vendor/bos-kern` mit `"@bos/kern": "file:vendor/bos-kern"`. C's Mechanikbegründung schlägt A's: ein Einzelentwickler ändert Kern und Produkt häufig zusammen und braucht lokale Bearbeitbarkeit; A's git-Tag-npm-Abhängigkeit erzwingt dafür `npm link`. Übernommen werden ebenso C's sechs Aufnahmeregeln (beide Produkte müssen den Baustein aufrufen; keine `node:`-/DOM-/React-Importe, geprüft per ESLint **und** Testlauf unter `node` und `jsdom`; keine Rückimporte; additive Änderungen; Bundle-Budget im CI; gepinnte Submodul-Commits) und die dokumentierte Abbruchbedingung ("zweimal in drei Monaten ein Release blockiert ⇒ eingefrorenes Vendoring in `pakete/kern-vendor/` mit festgehaltenem Herkunfts-Commit").

**Abweichungen:**
- **Schmaler Erstschnitt.** Stufe 1 (in M1): `model.ts`, `codec.ts`, `signatur.ts`, `qr-node.ts`, `vokabulare/**`, `einsaetze.ts` (mit injizierter `SpeicherHuelle` statt `globalThis.localStorage`, Z. 318–360), `aufteilen.ts`, `zusammenfuehren.ts`, `meldung-diff.ts`, `papierkorb.ts` sowie die acht reinen Funktionen aus `hilfen.ts` nach `darstellung.ts`. Stufe 2 (später, in M6/M7, nur bei Bedarf): `auswertung.ts`, `einheiten-liste.ts`, `xlsx.ts`, `oldenburg-xlsx.ts`, `csv.ts`, `bogen-csv.ts`. **Nicht in Stufe 1:** `pdf-dokument.ts` — es zieht `taktische-zeichen.ts` nach, das wiederum `vokabText`/`vokabularFuer` aus `hilfen.ts` importiert, das über `nativ.ts` vier Capacitor-Pakete anzieht (§4.4 Befund 4). Wer `pdf-dokument.ts` teilen will, muss zuerst `taktische-zeichen.ts` und `vokabText` mitnehmen; das ist eine eigene, bewusst zu treffende Entscheidung, keine mechanische Verschiebung.
- **`hilfen.ts` bleibt im Produkt** — C hat das bereits richtig entschieden (§4.4 Befund 3); es wird hier ausdrücklich festgeschrieben, weil B es falsch macht.
- **HLC, Ereigniskatalog und Fold bleiben in `@s1/domaene`** (§11.4).
- **Werkzeug-Gleichstand als Vorbedingung**, nicht als Nebenbedingung (§11.5 M-0).

**Übernommen ohne Änderung — die fachlichen Ideen von C, die keiner der anderen hat:**
1. **Die Meldekopf-Sammlung ist selbst schon ein Append-Store** und wird eingebettet statt nachgebaut. Daraus folgt der Meldekopf auf drei Wegen (direkt auf dem Share, per `.s1meld`-Bündeldatei, per QR), die alle dieselben Ereignisse erzeugen — **und die Google-Tabelle der Excel entfällt ersatzlos.**
2. **Die Modellgrenze Meldung ↔ EinsatzEinheit** (die Meldung gehört der meldenden Einheit, die EinsatzEinheit der Führungsstelle) — genau die Grenze, die der Kopfkommentar von `oldenburg-xlsx.ts` benennt.
3. Die ehrliche Latenzanzeige im UI ("Stand: vor 8 s", Peer-Status, bis 10 s für die erste Datei eines neuen Clients).
4. Der eigene CI-Job für die Speicherschicht — erweitert auf macOS und Linux (C-T13).
5. Die zwölf Fold-/Konfliktregeln K1–K12 als Ausgangstext, abgeglichen gegen ZDM §4 (wo beide sich widersprechen, gilt ZDM).

### 12.2 Aus Vorschlag C: der Stack-Ableitungsgedanke

C's Argument, dass die Stack-Wahl **eine Folge des Schnitts** ist und keine Vorliebe, wird übernommen und ist der sauberste Beleg gegen Tauri, den die drei Dokumente enthalten: Ein TypeScript-Kern, der das Ereignisprotokoll faltet, muss außerhalb des UI-Threads mit Dateizugriff laufen; Tauris Rust-Seite kann kein TypeScript ausführen; alle drei Auswege (Kern im WebView mit zwei getrennten JS-Kontexten für die zwei Fenster, Kern in Rust nachbauen als Doppelpflege bei jedem EEB-Schemaschritt, Node als Sidecar neben WebView2) sind schlechter. **Wichtig für die Ehrlichkeit der Synthese:** C's *Neben*begründung gegen Tauri (WebView2 offline, `fixedRuntime` ≈180 MB) ist durch Windows 11 entwertet (§2.2f) und darf nicht weiterverwendet werden. Das Hauptargument bleibt unberührt.

### 12.3 Aus Vorschlag A: was den Zuschlag begründet und deshalb erhalten bleibt

Kein Graft, sondern die Basis — aber der Vollständigkeit halber die tragenden Stücke: der Wegfall aller nativen Module mit SQLite (verifiziert); Main ohne Fachzustand, jede Share-I/O in einem Worker-Thread; `packages/cli` mit `akte pruefe|falte|exportiere|migriere|simuliere`; die vierfache CI-Matrix; macOS-Signierung und -Notarisierung; die erprobte Zweitmonitor-Logik des Stärke-Monitors (aus `strength-display.ts:144-192`, ohne Prewarm/Splash/SLO-Ballast); `webContents.printToPDF` als Druckweg; die Vierclient-Dateisimulation mit Partition, Uhrsprung, Absturz und abgeschnittenen Zeilen in jedem CI-Lauf.

### 12.4 Aus Vorschlag B: vier Bausteine, kein Rust

1. **Der Diagnoseapparat.** B ist der einzige Vorschlag, der "Diagnose im Einsatz ohne Entwickler vor Ort" systematisch löst: CLI-Werkzeug plus strukturiertes Logging plus **Diagnoseansicht in der Anwendung** plus **Störfallmatrix** (was tut der Bediener bei welchem Symptom). A streicht sogar das Debug-Log-Forwarding. Übernommen, mit eigenem Meilensteinposten statt als Stichwort.
2. **`s1 sim` als Release-Gate.** B's Werkzeug, das mehrere Clients gegen ein echtes Share fährt und die Konvergenz per Hash vergleicht — aber repariert nach B-W8: **auf mindestens zwei Rechnern und zwei Betriebssystemen**, nicht als vier Prozesse auf einer Maschine, und **automatisch am Release-Gate**, nicht manuell. Das ist die Antwort auf A-M5 (Simulation auf lokalem Dateisystem) und macht A's Qualitätszusage erst einlösbar.
3. **Signaturgeprüftes Update über den Share (minisign-Prinzip).** B's Antwort auf genau das Problem, an dem C scheitert (C-T12: unsignierter Codeverteilungskanal auf einem für alle beschreibbaren Verzeichnis). Umgesetzt wird es aber nicht mit minisign, sondern mit dem **Ed25519 des eigenen geteilten Kerns** (`signatur.ts`, 340 Zeilen, 484 Testzeilen) — die Primitive liegt bereits im Haus, das ist eine Sache von Stunden.
4. **`uhlc`-Semantik statt handgeschriebener HLC-String-Vergleich.** B's Entscheidung, eine erprobte HLC-Implementierung zu nehmen, vermeidet A-S7 (der HLC-Text ist nur bei 13-stelliger Millisekundenzahl lexikografisch sortierbar; ein offline mit zurückgestellter Uhr gestarteter Meldekopf gewinnt sonst dauerhaft jedes LWW-Feld). In TypeScript heißt das: **HLC wird als Struktur verglichen, nicht als Zeichenkette**, und wo eine Textform nötig ist, mit fester Stellenzahl und Nullauffüllung.

Zusätzlich als Dokumentation übernommen: B's Messung am Tauri-Changelog (47 stabile 2.x-Releases über 12 Minor-Linien; `>= 2.11` als Pflicht für den Multi-Monitor-Fix; zwei Security-Fixes in 2.11.1 in Windows-relevantem Code). Sie gehört als ADR "Warum nicht Tauri" ins Repo, damit die Frage nicht in zwei Jahren erneut gestellt wird.

**Nicht übernommen aus B:** Rust, Tauri, `tauri-specta`, WDIO/tauri-driver, die harte `mindestClientVersion` als Sperre (B-W15: kann eine laufende Lage aussperren — sie wird zur Warnung), MSI, Segmentwechsel bei jedem App-Start (B-W1/W11, siehe §12.5 Nr. 4).

### 12.5 Auflagen — die konsolidierte Liste

Aus den sechs Widerlegungen destilliert, ohne Dubletten, nach Fälligkeit sortiert.

**Vor der ersten Codezeile (Feldversuch und Spike, §11.5):**
1. Per-User-Installation, Update ohne Elevation und Startbarkeit der unsignierten EXE am heutigen Artefakt prüfen (A-F4, B-W14/W15). Ergebnis dokumentieren; bei negativem (c) das ganze Vorhaben neu ansetzen.
2. Werkzeug- und Verdrahtungs-Spike für `@bos/kern` unter TS 7 / Vite 8 / Vitest 4 / ESM in beiden Repos (§4.4 Befund 1, C-F16/F17/F18).
3. Verfügbarkeit in Stunden je Woche festschreiben und die Personenwochen in Kalenderdaten übersetzen (A-F: keine Kalenderzahl im Dokument; C-F1 Blocker). Ohne diese Zahl hat kein Lieferversprechen eine Bedeutung.

**In die Spezifikation, vor dem ersten Code in `@s1/domaene`:**
4. Fold als Mengenfunktion mit Rebase; jedes materialisierte Feld trägt die HLC seines Gewinners; Schnappschüsse tragen zusätzlich `foldVersion` (A-B1, B-W10, C-T1/T3/T5, C-T11).
5. HLC als Struktur vergleichen, nicht als Zeichenkette; Textform mit fester Stellenzahl (A-S7).
6. Jedes setzende Ereignis trägt `vorher` (ZDM §4.1 Regel 3) — das liefert Konflikterkennung (B-W9), lesbare ETB-Sätze und triviale Kompensation.
7. Zeilenformat: `prev`-Hash wird beim Lesen **geprüft**, nicht nur mitgeschrieben; eine defekte Zeile in der Dateimitte hat einen definierten Ausweg (Quarantäne der Datei ab Offset plus sichtbarer Hinweis), damit ein Leser nicht dauerhaft stehenbleibt (B-W2, C-T2).
8. Ereignis-`id` mit persistenter, monotoner Laufnummer je `clientId`; die Laufnummer überlebt Neustart und Absturz (B-W3). Zusätzlich Fremdschreiber-Erkennung beim Start (nas §10 Restrisiko 4, Roaming-Profil).
9. Segmentwechsel **nach Größe, nicht bei jedem Programmstart** (B-W1/W11, C-T7); beim Start wird das eigene letzte Segment weitergeschrieben, sofern der lokale Offset zum Share-Zustand passt. `mindestClientVersion` ist eine Warnung, keine Sperre (B-W15).
10. Zyklusregel für `AbschnittUmgehaengt`, Regeln für `EinheitAufgeteilt`/`EinheitZusammengefuehrt` (relative statt absoluter Stärkeänderung — v1 setzt absolut und wäre nebenläufig falsch), Auffangregel für aufgelöste Abschnitte: alle drei stehen ausformuliert in ZDM §4.2/§4.4 (B-W6, A: fehlende Regeln).
11. Undo ist ein normales Ereignis mit `undoOf` und **ohne Sonderpfad im Fold**; Undo-Stapel je Client, nicht global; `KorrekturVon` für "war fachlich falsch"; kein Redo (ZDM §4.3 U1–U6; B-W4, C-T3).
12. "Neueste Revision zählt" wird definiert: **HLC entscheidet, die fachliche Meldezeit wird angezeigt und plausibilisiert, nie zur Ordnung verwendet** — und bei Abweichung über einer Schwelle erscheint ein Konflikthinweis am Stärkewert (C-T5, der gefährlichste Einzeldefekt).
13. Ein Ereignis nach `archiv.marker` hat genau eine definierte Behandlung, und das Verschieben des Quellordners darf keinen laufenden Upload-Retry ins Leere laufen lassen (C-T4, B-W12).
14. Der Anspruch "Ersatz für Revisionssicherheit" wird gestrichen, nicht repariert: die Hash-Kette endet an der Dateigrenze, ganze Segmente sind ohne Erkennung löschbar (C-T9). Was bleibt, ist "nachträgliche Änderung **innerhalb** einer Datei wird erkennbar" — das ist wahr und genügt.

**In M0 und dessen Abnahmekriterien:**
15. "Feindliches Dateisystem"-Schicht in der Mehrclient-Simulation: verzögerte Sichtbarkeit, abgeschnittene Schreibvorgänge, Rename-EBUSY, blockierende Operationen, FileNotFound-Cache (A-M5, A-S8).
16. SMB-Latenzmessung auf dem echten Synology-Share **und** Messung der Gesamtkosten eines Poll-Zyklus bei N Segmenten mit 5 Clients (§2.2g; kritik §3.7 "nirgends gemessen").
17. Läufe auf mindestens zwei Betriebssystemen; die Speicherschicht bekommt CI-Jobs für Windows **und** macOS/Linux (B-W8, C-T13).
18. Zählbares Abbruchkriterium, das auch tatsächlich schließen kann — Property-Eigenschaft 1 darf keine Tautologie über die Sortierfunktion sein (B-W7).

**In den Plan, als eigene Posten statt als Stichwort:**
19. Anwenderdokumentation, In-App-Hilfe und Tastenkürzel (hb F-L4) — bei A nicht vorhanden, bei B Blocker, bei C ausgeschlossen und zugleich als DoD gefordert. +1,0–2,0 PW.
20. Diagnose und Störfallmatrix als eigener Posten (+0,25–0,5 PW), aus B übernommen.
21. Reparatur- und Rückfallstrecke im Feld: was tut die FüSt, wenn **die Anwendung** ausfällt (nicht nur das NAS)? Alle drei behandeln nur den NAS-Ausfall.
22. **Synthetische Referenzlage.** Es gibt keine Altdaten und keine gefüllten Excel-Mappen (Betriebsparameter), damit fehlt das Abnahme-Orakel für Goldfiles, Kennzahlen und den Paritätsvergleich des Ausdrucks. Eine realistische Übungslage muss einmal von Hand in der Excel erzeugt und ausgedruckt werden — ohne sie ist "zellgenau" und "prüfbar gleichwertig" eine Tautologie (A-F15, B-Finding, C-F13).
23. Windows-Entwicklungsmaschine benennen. Mindestens sieben Arbeitspakete sind Windows-spezifisch; entwickelt wird auf macOS.
24. Entscheiden, welche der vier Zielplattformen ein Produkt ist und welche eine Bequemlichkeit (A-F10). Vorschlag: Windows = Produkt, macOS = Entwicklungsplattform mit Best-Effort-Paket, Linux = nur CI-Lauf.
25. Laufende Pflege: 1,0–2,0 PW je Jahr Dauerbetrieb einplanen (Electron-Majors zweimal jährlich, Signaturmaterial-Ablauf, Abhängigkeitspflege in **zwei** Repos).

---

## 13. Offene Entscheidungen für Johannes

Nach Wirkung sortiert. Die ersten drei bestimmen, ob das Vorhaben gelingt; der Rest sind Festlegungen, die früh billig und spät teuer sind.

1. **Ist das Ziel "Excel-Parität" oder "besser als die Excel für Lage führen und ausdrucken"?** Der Unterschied ist 20,5–32 PW gegen 10–14 PW, also grob 17–26 Kalendermonate gegen rund ein Jahr. Empfehlung: das kleinere Ziel, Excel für Kosten, Schichtplan und Logistik parallel weiterlaufen lassen, den Rest als Ausbaustufen. **Diese Entscheidung muss vor M0 fallen**, weil sie den Zuschnitt der Meilensteine bestimmt.
2. **Wie viele Stunden je Woche stehen realistisch zur Verfügung?** Ohne diese Zahl gibt es kein Lieferdatum, nur Personenwochen. Der im Repo gemessene Rhythmus (21 Commit-Tage in 104 Kalendertagen, 21 Nachtcommits, eine Pause von zehn Wochen) legt 8–12 h/Woche nahe **[Annahme]** — bitte bestätigen oder korrigieren.
3. **Der Feldversuch (§11.5 M-1).** Startet auf einem FüSt-Rechner ohne Admin-Rechte eine unsignierte, per-user installierte EXE, und läuft ein Update ohne Elevation durch? Ein halber Tag, vor jeder Codezeile. Bei "nein" fällt jeder Desktop-Vorschlag.
4. **Wird der geteilte Kern `@bos/kern` gebaut — ja oder nein?** Ja bedeutet: höchster Wiederverwendungsgewinn, die Google-Tabelle des Meldekopfs entfällt ersatzlos, aber zwei Repos in dauerhaftem Gleichschritt und eine einmalige Vorleistung von **[Annahme]** 3,0–5,0 PW. Nein bedeutet: schmales gepinntes EEB-Paket wie in Vorschlag A (~0,5 PW), der Meldekopf-Apparat (Revisionen, Diff, Aufteilen/Zusammenführen) müsste in S1 nachgebaut werden. **Diese Antwort entscheidet zugleich, ob die Empfehlung bei A bleibt oder faktisch zu C wird (§14.1).**
5. **Darf der neue Branch auf TS 7 / Vite 8 / Vitest 4 / Electron 43 / ESM starten?** Empfehlung: ja, unbedingt — auf der grünen Wiese kostet es nichts und es verhindert die Werkzeugschere, die heute acht Electron-Majors breit ist.
6. **Windows-Codesignierung: Zertifikat beschaffen oder nicht?** Ohne Zertifikat: SmartScreen-Warnung bei jeder Installation, und der Update-Kanal über den Share muss zwingend Ed25519-signiert sein (§12.4 Nr. 3). Mit Zertifikat: laufende Kosten und ein Ablaufdatum, das gepflegt werden muss.
7. **LAN-Peer-Update: streichen oder harte Anforderung?** Alle drei Vorschläge streichen es (796+123 bzw. ~920 Zeilen). Standardannahme: gestrichen. Bei "harte Anforderung": +1,0 PW.
8. **Wer erzeugt die synthetische Referenzlage, und wann?** (§12.5 Nr. 22) Ohne sie gibt es kein Abnahmekriterium für Ausdrucke und Kennzahlen. Das ist Fachhandarbeit, keine Entwicklungsarbeit — aber sie blockiert die Abnahme.
9. **Rollen und Rechte: zum Start streichen?** Die Excel kennt sie nicht, v1 kennt sie nicht, und der Ereigniskatalog braucht sie nur an zwei Stellen (Archivieren, Kompensation fremder Ereignisse). Empfehlung: zum Start streichen, alle Clients gleichberechtigt, Nachvollziehbarkeit über den Akteur im Ereignis.
10. **Wie groß war der größte Einsatz bisher?** (Betriebsparameter unbeantwortet.) Bestimmt den Poll- und Fold-Kostenrahmen. Auslegung bis zur Antwort: 100–300 Einheiten, 5.000 als obere Schranke.
11. **Wird die Windows-Firewall-Regel für den UDP-Beschleuniger je genehmigt?** Wenn nein (wahrscheinlich, ohne Admin-Rechte): UDP ersatzlos streichen und das SLO von "< 1 s" auf "Poll-Intervall plus Cache, ehrlich angezeigt" korrigieren — dann gibt es keinen Widerspruch mehr zwischen A13 und dem M8-DoD.
12. **Windows-Entwicklungsmaschine: welche, ab wann?** (§12.5 Nr. 23)

---

## 14. Was die Entscheidung kippen würde

### 14.1 Was A gegen C kippt

**Eine einzige Auskunft: dass der Meldekopf-Apparat eine harte Anforderung ab Tag 1 ist.** Gemeint sind Revisionen je Einheit, Inhalts-Hash als Identität, Meldungs-Diff, Aufteilen und Zusammenführen von Meldungen, Quittierung gelb/grün, Fingerabdruck-Zuordnung und der Oldenburg-XLSX-Export. Diese Domäne liegt in erfassungsbogen.app fertig, getestet und plattformneutral vor. Solange sie eine *spätere Ausbaustufe* ist, ist ihre Wiederverwendung ein Bonus (K4, Gewicht 15) und A gewinnt mit 73:70. Wird sie zur *Kernanforderung des ersten Releases*, wandert ihr Wert nach K2 (Gewicht 25), weil A sie dann selbst bauen müsste — und die Rechnung dreht sich (§10.4: bei K4=30/K2=10 gewinnt C mit 74,2:72,5).

Praktisch heißt das: Johannes' Antwort auf Frage 4 in §13 *ist* die Entscheidung zwischen A und C. Und weil die Empfehlung den Graft ohnehin vorsieht (§12.1), ist der Unterschied kleiner, als die Punktzahlen nahelegen: die empfohlene Architektur ist A's Stack mit C's Kern, schmaler geschnitten. Wer sie "A" nennt, betont den Stack; wer sie "C" nennt, betont den Schnitt. Der reale Unterschied liegt allein in der **Breite** des geteilten Kerns und darin, ob er in M1 oder in M6 entsteht.

### 14.2 Was B zurück ins Spiel brächte

Drei Bedingungen, die **gemeinsam** erfüllt sein müssten:
1. Verfügbarkeit deutlich über 20 h/Woche (B selbst rechnet: bei 20 h/Woche ~14 Monate, bei 8 h/Woche ~2,5 Jahre — und empfiehlt unter 10 h/Woche ausdrücklich den TypeScript-Weg).
2. Ein zweiter Entwickler oder eine belastbare Aussicht darauf, sodass der Bus-Faktor die Zweisprachigkeit trägt.
3. Ein perspektivischer dritter Konsument des Kerns, der **nicht** in TypeScript geschrieben ist (etwa ein Server, ein eingebettetes Anzeigegerät, eine Mobil-App mit nativem Kern). Ohne den ist der Rust-Kern eine Investition ohne Rendite: er ersetzt einen TypeScript-Kern, der dieselben Konsumenten bedient.

Was B **nicht** zurückholt: Windows 11 (nimmt nur ein Handicap weg), ein kleinerer Installer (B verliert an K2/K3/K4, nicht an der Größe), oder die Eleganz des Rust-Folds (im Vorschlag nicht eingelöst, W7).

### 14.3 Was die gesamte Empfehlung kippt

- **Der Feldversuch (§11.5 M-1) fällt negativ aus:** unsignierte, nicht freigegebene EXE startet auf den FüSt-Rechnern nicht. Dann fällt nicht A, sondern **jeder Desktop-Vorschlag**, und die Randbedingung "kein Serverprozess" ist neu zu verhandeln (etwa: ein Rechner der FüSt betreibt einen lokalen Dienst, die anderen sind Browser-Clients — womit die ganze SMB-Analyse gegenstandslos würde).
- **M0 zeigt, dass ein Leser Fremdanhängungen nur durch Neu-Öffnen sieht UND das Neu-Öffnen den Poll-Zyklus über das SLO treibt.** Dann fällt das Sichtbarkeitsmodell (Poll am bekannten Byte-Offset), und mit ihm die Annahme, dass ein Ereignisprotokoll auf SMB ohne Serverprozess mehrbenutzerfähig ist. Auch das trifft alle drei gleich.
- **Der Poll-Zyklus bei 5 Clients und N Segmenten erweist sich als so teuer wie der SQLite-Betrieb** (§2.2g). Dann ist nicht das Speichermodell falsch, aber die Segmentpolitik und das Poll-Intervall müssen neu ausgelegt werden, bevor irgendetwas gebaut wird.

Keines dieser drei Kippkriterien unterscheidet zwischen den Vorschlägen. Das ist die letzte und wichtigste Beobachtung dieses Urteils: **die Risiken, die das Vorhaben tatsächlich beenden können, sind stack-unabhängig — und sie sind alle drei innerhalb einer Woche messbar, bevor die erste Zeile Produktionscode entsteht.**

---

Status: ABGESCHLOSSEN (§0–§14).
