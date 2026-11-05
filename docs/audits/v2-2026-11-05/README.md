# THW-Audits v2 — an der laufenden Anwendung, 05.11.2026

24 Reviews nach dem UX-Umbau (Einsatzauswahl, Profilwahl, Auswahlleiste, Menü „⋯", Filterzeilen, Fleetmapping, Nachtbild). Elf davon sind die bekannten Perspektiv-Reviewer, dreizehn sind neu: je ein Reviewer pro Sachgebiet und Funktion der Führungsstelle nach THW-DV 1-100, abgelegt als Projekt-Skills unter `.claude/skills/thw-*-reviewer/`.

Jeder Reviewer hatte eine eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems" (40 Einheiten, 130 Ereignisse aus `prueflageEreignisse()`), durfte darin schreiben, stören und zwei Arbeitsplätze nebeneinander öffnen. Bedient wurde per Playwright, am Desktop, bei Feld- und Touch-Prüfung auch in Geräteemulation. Code wurde nicht geändert. Die Fundstellen sind mit [beobachtet], [Code], [Annahme] oder [nicht prüfbar] gekennzeichnet. Bezüge auf THW-Abläufe, die nicht aus der Software selbst stammen, gelten als Annahme.

Ein Profil für S2, S5 oder die Lagekarte gibt es nicht; diese Reviewer haben mit „Führungsstelle (S1)" geprüft. Der „Leiter der Vermeldezentrale" aus dem Auftrag ist als Leiter der Fernmeldezentrale umgesetzt.

| Datei | Perspektive | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- |
| thw-s1-personal-reviewer.md | S1 Personal / Innerer Dienst | 0 | 4 | 6 | 2 |
| thw-s2-lage-reviewer.md | S2 Lage | 1 | 4 | 5 | 3 |
| thw-s3-einsatz-reviewer.md | S3 Einsatz | 0 | 6 | 6 | 2 |
| thw-s4-versorgung-reviewer.md | S4 Versorgung | 0 | 5 | 5 | 2 |
| thw-s5-presse-reviewer.md | S5 Presse- und Medienarbeit | 0 | 4 | 7 | 2 |
| thw-s6-iuk-reviewer.md | S6 Information und Kommunikation | 0 | 4 | 4 | 3 |
| thw-sichter-reviewer.md | Sichter | 1 | 4 | 5 | 3 |
| thw-etb-fuehrer-reviewer.md | ETB-Führer | 1 | 4 | 7 | 2 |
| thw-fm-zentrale-reviewer.md | Leiter Fernmeldezentrale | 2 | 4 | 2 | 2 |
| thw-fernmelder-reviewer.md | Fernmelder | 1 | 5 | 2 | 2 |
| thw-lagekarten-reviewer.md | Lagekartenführer | 0 | 4 | 5 | 4 |
| thw-fuehrungsgehilfe-reviewer.md | Führungsgehilfe | 0 | 2 | 5 | 3 |
| thw-leiter-stab-reviewer.md | Leiter Stab | 0 | 4 | 5 | 1 |
| thw-command-reviewer.md | Führungskraft, Lagebild | 0 | 2 | 6 | 1 |
| thw-workflow-reviewer.md | Vollständiger Einsatzablauf | 0 | 2 | 4 | 4 |
| thw-new-user-reviewer.md | Erstnutzung ohne Einweisung | 0 | 3 | 7 | 6 |
| thw-stress-test-user.md | Stress, Unterbrechungen | 0 | 2 | 5 | 5 |
| thw-error-recovery-reviewer.md | Provozierte Bedienfehler | 1 | 8 | 6 | 2 |
| thw-destructive-action-reviewer.md | Riskante Aktionen | 2 | 3 | 3 | 3 |
| thw-offline-resilience-reviewer.md | Ausfall, Sync, Mehrplatz | 2 | 4 | 3 | 3 |
| thw-analog-first-reviewer.md | Papier-Rückfallebene | 1 | 3 | 4 | 2 |
| thw-field-user-reviewer.md | Helfer im Feld (Handy/Tablet) | 0 | 2 | 5 | 5 |
| thw-glove-touch-reviewer.md | Handschuhe, Touch | 0 | 4 | 3 | 5 |
| thw-night-visibility-reviewer.md | Nacht, Kontrast | 0 | 1 | 4 | 3 |
| Summe | | 12 | 88 | 114 | 70 |

Die Summe zählt Doppelungen mit. Mehrere P0 sind derselbe Befund aus verschiedenen Rollen.

## Befunde, die mehrere Reviewer unabhängig fanden

Ein Tagebucheintrag mit leerem Zeitfeld wird nie gespeichert (P0, fünfmal: S2, ETB-Führer, Fm-Zentrale, Sichter, Fernmelder, dazu Leiter Stab als P1). Die Maske verspricht „leer = jetzt" und meldet dann „Invalid ISO datetime". Ursache in `TagebuchEintrag.tsx:46-47` mit `Anlegeversuch.tsx:73-76`: `kennung()` hält genau einen Wert je Versuch, der zweite Aufruf für den Zeitpunkt bekommt deshalb die ETB-Kennung zurück. Mit eingetippter Uhrzeit wird gespeichert.

Nachgetragene Zeiten werden nicht sauber geführt. Statuswechsel und Funkproben tragen immer die Klickzeit, obwohl der Vertrag `ereignisZeit` kennt; nach einer Papierphase setzt der Funkplan „letzter Kontakt" auf jetzt (Analog-first, P0). Eine nachgetragene Papierzeit „2350" wird als heute 23:50, also in der Zukunft, gespeichert (Fm-Zentrale). Bildschirm und Ausdruck sortieren nach Erfassung statt nach Meldezeit (Fm-Zentrale, S2, ETB-Führer).

Die App kennt keinen Nachrichtenverkehr (P0 Fm-Zentrale, P1 Sichter, S2, Leiter Stab). Es gibt keine Nachrichtennummer, keine Richtung, keinen Absender oder Empfänger, keine Vorrangstufe, keine Zuweisung an ein Sachgebiet und keine Quittung. Der Eingangskorb ist ein Korb für Erfassungsbögen; Lagemeldungen landen nur als Freitext im Tagebuch.

Rückgängig und Zusammenführen sind im Mehrplatzbetrieb gefährlich (P0 riskante Aktionen, P0/P1 Fehlerkorrektur). Rückgängig auf Platz A überschreibt still einen jüngeren Wert von Platz B, obwohl die Rückfrage das Gegenteil zusagt. Zusammenführen lässt sich ohne Ziel bestätigen, meldet „gespeichert", ist nicht rücknehmbar und übernimmt Status, Organisation und Bereich des Ziels; im Versuch fielen 25 Kräfte still aus der Ist-Stärke.

Die Web-Schale zeigt bei Störungen hinter dem Browser falsche Sicherheit (P0 Offline, P1 S6, P1 Leiter Stab). Nach Neustart des Dienstes steht die Lage eingefroren mit „✓ aktuell", jede Eingabe endet mit „Unbekannte Akte". Ein kurz fehlender Einsatzordner schließt den Einsatz und hinterlässt eine Lage, die keine Eingaben annimmt.

Über reines http im LAN speichern die Anlege-Masken nichts und melden nichts (P0 Offline). `kennungen.ts:30` ruft `crypto.randomUUID` auf, das es nur im sicheren Kontext gibt; `webAnfrage.ts:45` umgeht das bereits, die Kennungen im Renderer nicht.

Halbe Eingaben folgen je Feld anderen Regeln (P1 Stress, Fernmelder, Führungsgehilfe, Touch). Status in der Zelle wird beim Wegklicken verworfen, Text beim Wegklicken geschrieben, Masken verwerfen bei Esc ohne Rückfrage; nur die Anforderung hebt einen Entwurf auf. Eine per Maus gewählte Rufgruppe wird nie geschrieben, nur Enter schreibt. Ein Doppelklick auf einen Maskenknopf trifft „Abbrechen", weil der Knopf beim Speichern schmaler wird.

Eintreffende Einheiten entstehen immer als „Angefordert" (S1, Stress, Workflow). Ohne Führer, Schicht und Eintreffzeit; bis „Einsatzbereit" sind es 13 Aktionen. Auch eine Teileinheit beim Aufteilen entsteht als „Angefordert" und senkt die Ist-Stärke ohne Hinweis.

„Konflikthinweise" zeigen auf nichts (Führung, Erstnutzer, S3, Führungsgehilfe). Die Statuszeile zählt sie und verspricht ein ⚠ am Feld, die Tabelle zeigt keins, die Diagnose nur die Zahl. Normale Arbeit treibt den Zähler: Abschnitt auflösen +7, Auftrag erledigt +1.

Mehrere Gesamtzahlen ohne Erklärung (S5, S4, Lagekarte, Leiter Stab). Die Ausgaben nennen 264, 327, 330 oder 339 Kräfte; Versorgung zählt Angeforderte, Rufbereitschaft und Rückmarsch mit; Druck und Monitor zeigen für EA Deich Nord 33, Baum und Harke 71. Der HTML-Monitor zeigt nach dem Ausschalten weiter einen alten Stand.

Fristen und offene Punkte sind nicht auf einen Blick zu sehen (Führung, S3, Leiter Stab). „Verfügbar bis … läuft ab" steht nur in einer ausgeblendeten Spalte, ohne Zähler und Filter. Eine Übersicht offener Aufträge oder offener Punkte über alle Sachgebiete fehlt; der Leiter Stab brauchte dafür neun Ansichten.

THW-Vorlagen heißen „(B)" oder „(MT)" (Erstnutzer, Workflow). Die Suche nach „Bergungsgruppe" findet nichts, die angelegte Einheit heißt danach „(B)" mit Ebene „Unbestimmt".

Bestätigung und „Rückgängig" liegen am Seitenende (Feldnutzer, Touch). Unter 900 px Breite erscheint die Auswahlleiste rund 1 800 px tiefer; `sticky` greift nicht, weil `overflow-x: hidden` auf `html` und `body` liegt.

## Einzelbefunde mit hohem Gewicht

Ein Bogen, der während einer laufenden Übernahme gescannt wird, geht ohne Meldung verloren; beim Massenscan fehlten 5 von 24 (Sichter, P0, `aktendienst.ts:1334`).

Strg+P im Funkplan druckt nicht, sondern schreibt eine Funkprobe „Kontakt" (Analog-first).

Doppelte Rufgruppennamen und Funkrufnamen werden ohne Warnung angenommen und sind danach nirgends mehr zu unterscheiden (S6). Die Rufnamensuche findet nur die genaue Schreibweise, die Suche der Lage kennt Funkrufnamen gar nicht (Fernmelder).

Je Mahlzeit gilt nur eine Bestellung; eine zweite Ausgabestelle ersetzt die erste ohne Hinweis. „Bestellung ändern …" vergisst still den Lieferanten (S4, Führungsgehilfe, `Bestellkarte.tsx:139`).

Ausgaben enthalten Namen, Mobilnummern und bei kleinen Organisationen faktisch personenbezogene Kostform-Angaben, ohne Kennzeichnung als intern (S5).

Einheiten zeigen kein taktisches Zeichen, obwohl die Zeichen und `schlageZeichenVor` im Programm vorhanden sind; „Als PDF (Lagekarte)" ist eine Textliste mit internen Schlüsseln (Lagekarte).

Bearbeitungssperren gibt es nur in Einheitentabelle und Funkplan. Sagen zwei Plätze dieselbe Anforderung zu, gewinnt die zweite Zusage still (Führungsgehilfe).

Taktische Zeichen bleiben im Nachtbild grellgelb; gut, Warnung und Fehler haben im Nachtbild fast gleiche Helligkeit (Nacht).

## Seit dem 29.10. behoben, von mehreren Reviewern bestätigt

Die Stärkezelle schreibt keine Texte mehr, die Ist-Stärke stimmt nach jedem Schritt in Kopfband, Baum, Tabelle, Druck, Einheitenliste und Monitor überein. Aufträge lassen sich erfassen, Strg+D und Zeitfelder schreiben lesbare Werte, Ablösung hängt an der Einheit, „Eingetroffen" an einer Anforderung legt die Einheit an. Rückgängig überlebt ein Neuladen und fragt mit Namen nach. Ein Funkloch zwischen Browser und Dienst wird ehrlich angezeigt, offene Masken behalten ihre Eingaben, und eine Wiederholung nach verlorener Antwort legt nichts doppelt an. Das Nachtbild hält alle Ansichten dunkel. Fast alle Bedienelemente sind bei Touch 44 px hoch.
