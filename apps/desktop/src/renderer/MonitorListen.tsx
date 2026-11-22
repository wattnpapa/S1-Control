/**
 * Die Listenansichten des Monitors aus dem zweiten Review-Durchgang:
 * Warteschlange und „Funk still" (FmZ), Lageticker (S2), Aufträge (S3) und
 * Sofortbedarf (S4). Die Zeilen baut `monitorListen.ts`, die Tafel
 * `MonitorListentafel.tsx`.
 */

import { Listentafel } from "./MonitorListentafel.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";
import { auftragszeilen, sofortbedarfssumme, sofortbedarfszeilen, stillzeilen, tickerzeilen, warteschlangenzeilen } from "./monitorListen.js";

/** FmZ — jede wartende Nachricht ohne Inhalt: Blitz vor Sofort, längste Wartezeit zuerst. */
export function MonitorWarteschlange(e: Ansichtseigenschaften): React.JSX.Element {
  return (
    <Listentafel
      e={e}
      titel="Warteschlange"
      beschriftung="Warteschlange · beim LdF, vor der FmZ, vor dem Sichter"
      spalten={[{ titel: "Vorrang", text: true }, { titel: "E/A", text: true }, { titel: "Nr." }, { titel: "Gegenstelle", text: true }, { titel: "Stand", text: true }, { titel: "Wartet" }]}
      zeilen={e.warteschlange === undefined ? undefined : warteschlangenzeilen(e.warteschlange)}
      leer="Nichts wartet im Nachrichtenweg"
      zusatz="ohne Inhalte"
    />
  );
}

/** FmZ — wer über Funk nicht erreicht wurde. */
export function MonitorFunkStill(e: Ansichtseigenschaften): React.JSX.Element {
  const ansicht = e.funkplan;
  return (
    <Listentafel
      e={e}
      titel="Funk still"
      beschriftung={`Funk still · kein Kontakt, länger als ${String(ansicht?.plan.schwelleMinuten ?? 60)} min still, ohne Rufgruppe`}
      spalten={[{ titel: "Einheit", text: true }, { titel: "Funkrufname", text: true }, { titel: "Rufgruppe", text: true }, { titel: "Was", text: true }, { titel: "Seit", text: true }]}
      zeilen={ansicht === undefined ? undefined : stillzeilen(ansicht.plan, ansicht.jetzt)}
      leer="Alle Einheiten vor Ort haben Funkkontakt"
      zusatz="älteste zuerst"
    />
  );
}

/** S2 — die jüngsten Einträge des Einsatztagebuchs. */
export function MonitorLageticker(e: Ansichtseigenschaften): React.JSX.Element {
  return (
    <Listentafel
      e={e}
      titel="Lageticker"
      beschriftung="Lageticker · die jüngsten Einträge im Einsatztagebuch"
      spalten={[{ titel: "Zeit", text: true }, { titel: "Eintrag", text: true }]}
      zeilen={e.ticker === undefined ? undefined : tickerzeilen(e.ticker)}
      leer="Noch keine Einträge"
      zusatz="jüngste zuerst, ohne Stammdatenpflege · ⚠ = Rücknahme"
    />
  );
}

/** S3 — laufende Aufträge je Abschnitt. */
export function MonitorAuftraege(e: Ansichtseigenschaften): React.JSX.Element {
  const tafel = e.staerketafel?.tafel;
  return (
    <Listentafel
      e={e}
      titel="Aufträge"
      beschriftung="Aufträge · was wo von wem getan wird"
      spalten={[{ titel: "Seit", text: true }, { titel: "Einheit", text: true }, { titel: "Auftrag", text: true }, { titel: "Status", text: true, leise: true }]}
      zeilen={tafel === undefined ? undefined : auftragszeilen(tafel)}
      leer="Keine laufenden Aufträge"
      zusatz="laufend = nicht beendet, nicht zurückgenommen"
    />
  );
}

/** S4 — was beim Eintreffen gemeldet und noch nicht erledigt ist. */
export function MonitorSofortbedarf(e: Ansichtseigenschaften): React.JSX.Element {
  const liste = e.ansicht?.blatt.sofortbedarf;
  return (
    <Listentafel
      e={e}
      titel="Sofortbedarf"
      beschriftung="Sofortbedarf · offen seit dem Eintreffen"
      spalten={[{ titel: "Einheit", text: true }, { titel: "Bereich", text: true }, { titel: "Eingetroffen", text: true }, { titel: "Offen", text: true }]}
      zeilen={liste === undefined ? undefined : sofortbedarfszeilen(liste)}
      leer="Kein Sofortbedarf offen"
      zusatz={liste === undefined ? "" : sofortbedarfssumme(liste)}
    />
  );
}
