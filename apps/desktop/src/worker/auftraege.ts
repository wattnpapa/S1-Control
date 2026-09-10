/**
 * Die Zuordnung Auftrag → Methode des Aktendienstes — **eine** Stelle.
 *
 * **Warum sie ein eigenes Modul ist.** Sie stand bis M5.3 im Worker-Einstieg,
 * und die Werkstatt der Vermittlungstests hatte daneben eine zweite,
 * handgeschriebene Fassung mit sechs Auftragsarten. Damit war jeder
 * Ansichtsruf, der nach M2 dazukam, im Test nicht abgedeckt — und genau so ist
 * `kostenAnfordern` aus M5.2 durch die Vermittlung gefallen, ohne dass ein
 * Test es bemerkt haette: Der Aktendienst konnte die Ansicht, die Naht dorthin
 * war nicht verdrahtet.
 *
 * Zwei Verteiler ueber derselben Menge sind eine Verdopplung, bei der die
 * zweite Fassung immer die aeltere ist. Jetzt gibt es eine, und der Test
 * benutzt dieselbe wie der Betrieb.
 *
 * `schliesse` fehlt hier mit Absicht: Es raeumt neben dem Dienst auch den
 * Zeitgeber des Workers ab, und der gehoert dem Worker-Einstieg.
 */

import type { Aktendienst } from "./aktendienst.js";
import type { Auftrag } from "./akte-worker.js";

export async function bearbeiteAuftrag(dienst: Aktendienst, auftrag: Auftrag): Promise<unknown> {
  switch (auftrag.art) {
    case "oeffne":
      return { befund: (await dienst.oeffne()).befund.art };
    case "bediene":
      return dienst.bediene(auftrag.entwurf);
    case "zurueck":
      return dienst.zurueck(auftrag.grund);
    case "undoStapel":
      return dienst.undoStapel();
    case "standAnfordern":
      dienst.sendeVollenStand();
      return null;
    case "kostenAnfordern":
      return dienst.kosten();
    case "anforderungenAnfordern":
      return dienst.anforderungen(auftrag.ruf);
    case "baumAnfordern":
      return dienst.baum(auftrag.ruf);
    case "tabelleAnfordern":
      return dienst.tabelle(auftrag.ruf);
    case "untertabelleAnfordern":
      return dienst.untertabelle(auftrag.ruf);
    case "ausgabeHtml":
      return dienst.ausgabeHtml(auftrag.ausgabe, auftrag.organisation);
    case "auswertungXlsx":
      return dienst.auswertungXlsx();
    case "oldenburgXlsx":
      return dienst.oldenburgXlsx();
    case "logFreiXlsx":
      return dienst.logFreiXlsx();
    case "htmlMonitorSchalten":
      return dienst.monitorSchalten(auftrag.ruf.an, {
        ...(auftrag.ruf.mitStatus === undefined ? {} : { mitStatus: auftrag.ruf.mitStatus }),
        ...(auftrag.ruf.organisation === undefined ? {} : { organisation: auftrag.ruf.organisation }),
      });
    case "ausgabeSchreiben":
      return { pfad: await dienst.ausgabeSchreiben(auftrag.dateiname, auftrag.bytes) };
    case "eebScan":
      return dienst.eebScan(auftrag.ruf.text);
    case "eebZuruecksetzen":
      return dienst.eebZuruecksetzen();
    case "eebUebernehmen":
      return dienst.eebUebernehmen(auftrag.ruf.abschnittId);
    case "tagebuchAnfordern":
      return dienst.tagebuch(auftrag.ruf);
    case "schliesse":
      // Hier bewusst nicht behandelt: Der Worker-Einstieg faengt ihn ab, weil
      // er neben dem Dienst seinen Zeitgeber abraeumen muss.
      return null;
  }
}
