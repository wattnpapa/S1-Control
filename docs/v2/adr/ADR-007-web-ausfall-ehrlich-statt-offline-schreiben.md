# ADR-007 – Verbindungsausfall der Web-Schale: ehrlich anzeigen, nicht offline schreiben

Status: umgesetzt · Datum: 2026-10-31 · Entscheider: Johannes Rudolph

## Kontext

Die Web-Schale (ADR-005) ist ein Browserfenster auf den Dienst. Fällt das Netz zwischen Browser und Dienst aus (Funkloch, WLAN-Wechsel, Dienst-Neustart), zeigte sie bisher weiter grün „Share erreichbar (gerade eben)", meldete bei einer verlorenen Antwort „nicht erreichbar", obwohl die Eingabe angekommen war (ein erneutes „Übernehmen" legte die Einheit doppelt an), blieb nach der Rückkehr mit veralteter Tabelle stehen und zeigte beim Neuladen ohne Netz eine weiße Seite (Audit Offline-Resilienz, P0-1 bis P0-3).

## Entscheidung

1. **Kein Offline-Schreiben.** Es gibt keine lokale Warteschlange, keine Entwürfe „für später", keinen Offline-Betrieb ohne Dienst. Solange die Verbindung fehlt, sind Schreibaktionen gesperrt; Eingaben in offenen Formularen bleiben stehen und können nach der Wiederverbindung übernommen werden. Wer ohne Dienst arbeiten muss, hat die Desktop-Schale (Share-basiert, NAS-Ausfall ist dort der Normalpfad) und das Papier (Meldeblock) als Rückfallebene.
2. **Idempotente Schreibrufe.** Die Web-Brücke schickt mit jedem schreibenden Ruf eine Anfrage-ID im Kopf `x-anfrage-id` (der Kontrakt bleibt unverändert). Der Dienst merkt sich je Arbeitsplatz die zuletzt verarbeiteten IDs (höchstens 500, 10 Minuten) und liefert bei Wiederholung das ursprüngliche Ergebnis, ohne erneut zu schreiben; auch ein noch laufender Ruf wird nicht doppelt gestartet. Bei unbekanntem Ausgang behält die Brücke die ID 2 Minuten für den identischen Ruf. Formulare, die eine Kennung vergeben (heute: „Einheit anlegen"), behalten sie bis zum Schließen des Dialogs, damit die Wiederholung wirklich derselbe Ruf ist.
3. **Ehrliche Meldungen.** Bleibt die Antwort eines Schreibrufs aus, steht „Unklar, ob gespeichert – bitte Liste prüfen." und die Ansichten werden automatisch neu geladen. Fehlt die Verbindung erkennbar, steht „Keine Verbindung zum Dienst. Ihre Eingabe wurde nicht gespeichert." Keine englischen Browsertexte. Nach der Wiederverbindung verschwinden diese Meldungen, und Stand und Ansichten werden neu geladen.
4. **Eigener Verbindungsstatus.** Getrennt vom Share-Status (Dienst↔NAS) misst die Brücke Browser↔Dienst: Antworten, Strom und eine Herzschlag-Abfrage an `/gesundheit` alle 5 s (bei Ausfall alle 2 s). Ab 10 s ohne Kontakt, oder sofort bei einem Fehlschlag, gilt die Verbindung als unterbrochen (gelb, ab 60 s rot, jeweils mit Symbol und Text „Keine Verbindung zum Dienst seit …"). Statuszeile und ein fester Hinweis unter dem Kopfband sagen die Folge. Share-Status und Arbeitsplätze werden dann als „unbekannt" gezeigt statt als aktuell.
5. **Offline-Seite.** Ein kleiner Service Worker (`sw.js`) legt ausschließlich die statische Seite `offline.html` ab. Lädt der Browser die App ohne Dienst (Fehler oder 502/503/504 eines Proxys), steht dort „Dienst nicht erreichbar – es wird neu verbunden" mit automatischem Neuversuch. Er speichert weder die App noch Daten, weil die App hinter der Anmeldung (ADR-006) liegt und ein Zwischenspeicher veraltete Stände oder geschützte Seiten halten würde.

## Begründung

- Datenintegrität vor Funktionsumfang (AGENTS.md, Prioritäten). Eine Offline-Warteschlange im Browser würde Eingaben später gegen einen Stand schreiben, den inzwischen andere Arbeitsplätze geändert haben: Konflikte ohne Auflösungsweg, Zahlendreher bei nachträglicher Eingabe, Doppelanlagen. Dagegen ist „gesperrt, mit klarem Grund" sicher und in der Lage verständlich.
- Eine Anfrage-ID im Kopf ist additiv und berührt weder Kontrakt noch Desktop-IPC (dort gibt es keinen Transportverlust).
- Eine Seite im Cache wäre die kleinere Hilfe und die größere Gefahr als eine Seite, die nur sagt, was los ist.

## Konsequenzen

- Ein Service Worker gibt es nur in einem sicheren Kontext (https oder `localhost`). Im reinen http-Netz der Führungsstelle fehlt die Offline-Seite; ein Neuladen ohne Dienst zeigt dort die Fehlerseite des Browsers. Statusanzeige, Sperre und Wiederholungsschutz der laufenden Seite wirken auch ohne https.
- Der Wiederholungsspeicher liegt im Arbeitsspeicher des Dienstes. Nach einem Neustart des Dienstes zwischen erstem Versuch und Wiederholung ist der erste Versuch nicht mehr erkennbar; dagegen hilft der Blick in die Liste, den die Meldung verlangt.
- Andere Masken, die Kennungen erst beim Bestätigen vergeben (Abschnitt anlegen, Untertabellen, Anforderung zu Einheit), sind noch nicht auf stabile Kennungen umgestellt; für sie gilt nur „Unklar … Liste prüfen" und die automatische Aktualisierung. Das ist ein offener Punkt.
