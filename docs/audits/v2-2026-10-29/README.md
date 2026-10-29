# THW-Perspektiv-Audits v2 — an der laufenden Anwendung, 29.10.2026

Fünf Reviews der v2 (Branch `v2-architektur`, Stand nach den Commits für
Beschriftungen, Statusleiste und Maskenprüfung). Anders als die Audits vom
18.09. unter `docs/audits/` liefen sie **gegen die laufende Anwendung**: die
Web-Schale derselben Oberfläche mit der Prüflage aus `pruefage.ts` (40
Einheiten, drei Einsatzstellen, Bereitstellungsraum, alle Status- und
Schichtwerte), Screenshots je Ansicht, eigene Begehungen der Reviewer.

Perspektive aller fünf: ein Helfer, der die Excel „Einsatzkräfteübersicht
V 1.5.2“ routiniert bedient und nun S1-Control benutzt. Leitfrage: Kommt er
damit so gut zurecht wie mit der Excel?

| Datei | Perspektive | Urteil |
|---|---|---|
| thw-new-user-reviewer.md | Erstnutzung ohne Einweisung | Kernablauf ohne Hilfe machbar, mit Umwegen |
| thw-workflow-reviewer.md | Vollständiger Einsatzablauf | Mit Umwegen abbildbar; Excel-Begriffe, Baum, Druck/Status/Log gut übernommen |
| thw-command-reviewer.md | Leiter FüSt / S1–S3 | Zahlen rechnerisch konsistent; Lesbarkeit der Unterschiede ist das Problem |
| thw-error-recovery-reviewer.md | Provozierte Bedienfehler | Verhindern besser als Excel, Korrigieren teils schlechter |
| thw-analog-first-reviewer.md | Papier-Rückfallebene | Für den Tagesbetrieb am Share ja, Meldeblock daneben |

## Befunde, die mehrere Reviewer unabhängig fanden

**Die Stärkezelle schrieb Text (P0, behoben).** Doppelklick in „Fü / UFü / He“
und Wegklicken, auch ohne Änderung, schrieb `StaerkeGeaendert` mit
`neu: "1/2/1"` als Zeichenkette; Kopfband, Baum und Ausgaben zeigten danach
an allen Arbeitsplätzen `null/null/null // 0`. Drei Reviewer haben es
unabhängig ausgelöst. Behoben im Commit „Stärke- und Zeitzellen schreiben
Werte, keinen Text“: Tripel wird gelesen, Ungültiges wird nicht geschrieben
und an der Zelle benannt, Escape schreibt nicht mehr über den Blur, der
Dienst weist Text-Stärken ab.

**Zeitfelder nahmen rohen Text und zeigten ISO-UTC (P0/P1, behoben).**
Strg+D schrieb `2026-10-29T19:44:32.380Z`; Freitext ging ungeprüft ins
Ereignis. Jetzt gilt die Schreibweise der Excel-Spalten „Dat. / Zeit“
(TT.MM.JJJJ HH:MM, „5.11. 06:00“, „14:30“ für heute), Anzeige ebenso.

**Aufträge und Geräte/Fahrzeuge (Excel-Spalten J und K) sind in der Tabelle
nur berechnet (P0, offen).** Die Untertabellen zeigen, aber schreiben nicht;
ein Auftrag lässt sich nirgends erfassen. Vier Reviewer. Vorschlag: Freitext
an der Zeile oder Anlegeweg in den Untertabellen.

**Angefordert, Ablösung, Anforderungs-ID fehlen in der Tabelle; das Blatt
„Anforderungen“ hängt nicht an der Einheit (P1).** K12 (Ablösung) und K18
(„Verfügbar bis“ läuft ab) werden berechnet, aber nirgends gezeichnet;
„Eingetroffen“ an einer Anforderung erzeugt keine Einheit (Doppelerfassung).

**Zwei Gesamtzahlen ohne Erklärung (P1/P2).** Kopfband 293 (ohne
Angefordert) neben „40 EINH“ und Status-Matrix 330 (mit Angefordert), Baum
und Harke mit Teilbaumsummen, Druck mit Eigenstärke. Rechnerisch richtig,
aber unbeschriftet.

**Rückgängig nur im selben Fenster, nach Neuladen leer (P0 aus Sicht
Fehlerkorrektur).** Begriffe Rückgängig / Rücknahme / Berichtigung
uneinheitlich, der Grund für den grauen Knopf wird nicht genannt.

**Ausgaben nur als Dateipfad (P1).** Druck/Status/Log werden auf den Share
geschrieben; es gibt keinen Öffnen- oder Drucken-Knopf und keinen
druckbaren Gesamtstand der Einheitenliste für den Rechnerausfall.

**Rohwerte und Konzeptverweise in der Oberfläche (P2/P3).**
`NUR_STAERKE`, „ORTSVERBAND Landkreis Ammerland“, §-Verweise in Masken und
Hilfe, englisches Datumsfeld im Schichtplan.

## Positiv, von mehreren Reviewern genannt

Statuswerte, Schichten, Spaltengruppen und Bereiche sind sofort
wiedererkennbar; die Statusleiste zählt wie das Blatt Status; Druck und
Status als HTML sind ohne die App lesbar; Entfernen ist kein Löschen;
Verschieben-Maske und Stärkefelder der Masken sind sauber gesperrt; die
Statuszeile sagt ehrlich, was nicht übertragen ist; Klickzahl je Zelle ist
der Excel gleichwertig.
