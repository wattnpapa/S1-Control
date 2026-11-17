/**
 * Die Schritte „Angenommen" und „Wenn": wer am Laufweg des Vordrucks was tut.
 *
 * Jeder Schritt baut den Entwurf mit den Bedienschritten des Kontrakts
 * (`nachrichtenschritte.ts`, `fmzschritte.ts`), schreibt ihn vom Platz der
 * handelnden Stelle und gleicht danach alle Plätze ab — wie der Bediener am
 * Rechner, nicht wie ein Test am Fold vorbei.
 *
 * Die Schritte des LdF (Weg festlegen, an den Sichter weitergeben) und der
 * Parameter `ldfStation` stehen noch nicht im Kontrakt. Sie werden hier mit
 * den vereinbarten Namen (`NachrichtWegFestgelegt`, `NachrichtWeitergegeben`)
 * als roher Entwurf geschrieben: Kennt der Worker sie nicht, weist er ab, und
 * der Schritt wird mit dieser Abweisung rot. Genau das soll sichtbar sein.
 */

import { nachrichtAnnehmen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtNachweisen } from "../../src/kontrakt/fmzschritte.js";
import { erledigt, kenntnisGenommen, nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../../src/kontrakt/nachrichtenschritte.js";
import { EINSATZ_ID } from "../../src/worker/pruefhilfen/werkstatt.js";
import { felder, mittelAus, pflicht, schritt, verteilerAus, vorrangAus, type Definiere, type Tabelle } from "./ausdruecke.js";
import {
  aktuelleNachricht,
  aktuelleWelt,
  bediene,
  besetze,
  gleicheAb,
  jetzt,
  laufzettel,
  legeEinsatzAn,
  merkeLaufzettel,
  neueNachricht,
  stuhlVon,
  vorMinuten,
  zeileDer,
  type Rolle,
} from "./welt.js";

/** „jetzt" oder „vor 5 Minuten" — die Abfassungszeit, wie der Verfasser sie einträgt. */
function zeitAus(wort: string | undefined): string {
  const minuten = /^vor (\d+) Minuten?$/u.exec(wort ?? "");
  return minuten === null ? jetzt() : vorMinuten(Number(minuten[1]));
}

function sichtungVon(rolle: Rolle, verteiler: string) {
  return { zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen, verteiler: verteilerAus(verteiler) };
}

/** Die Anlage eines Ausgangs aus der Tabelle des Verfassers. */
function ausgangAus(rolle: Rolle, f: Map<string, string>): Nachrichtenanlage {
  const betreff = pflicht(f, "Betreff");
  const vorrang = vorrangAus(f.get("Vorrang"));
  return {
    nachrichtId: neueNachricht(betreff),
    richtung: "AUSGANG",
    anschrift: pflicht(f, "Anschrift"),
    betreff,
    inhalt: pflicht(f, "Inhalt"),
    absender: f.get("Absender") ?? rolle.stelle,
    funktion: rolle.stelle,
    zeichen: stuhlVon(rolle).handzeichen,
    abfassungszeit: zeitAus(f.get("Abfassungszeit")),
    ...(vorrang === undefined ? {} : { vorrang }),
  };
}

/** Die Anlage eines Eingangs oder einer Gesprächsnotiz aus der Tabelle. */
function eingangAus(rolle: Rolle, f: Map<string, string>, gespraechsnotiz: boolean): Nachrichtenanlage {
  const betreff = pflicht(f, "Betreff");
  const vorrang = vorrangAus(f.get("Vorrang"));
  const hz = stuhlVon(rolle).handzeichen;
  const rufnummer = f.get("Ruf-Nr.");
  const gegenstelle = f.get("Gegenstelle");
  return {
    nachrichtId: neueNachricht(betreff),
    richtung: "EINGANG",
    anschrift: pflicht(f, "Anschrift"),
    betreff,
    inhalt: pflicht(f, "Inhalt"),
    absender: pflicht(f, "Absender"),
    abfassungszeit: zeitAus(f.get("Abfassungszeit")),
    ...(vorrang === undefined ? {} : { vorrang }),
    ...(rufnummer === undefined ? {} : { rufnummer }),
    ...(gegenstelle === undefined ? {} : { gegenstelle }),
    ...(gespraechsnotiz ? { gespraechsnotiz: true, funktion: rolle.stelle, zeichen: hz } : { aufnahme: { mittel: mittelAus(pflicht(f, "Mittel")), zeitpunkt: jetzt(), handzeichen: hz } }),
  };
}

/** Aufnehmen oder Festhalten, mit Verteiler und Nummer als Folgeschritt in einem Zug (§5 „Ersatzsichter"). */
async function legeEingangAn(rolle: Rolle, tabelle: Tabelle, gespraechsnotiz: boolean): Promise<void> {
  const f = felder(tabelle);
  const anlage = eingangAus(rolle, f, gespraechsnotiz);
  const verteiler = f.get("Verteiler");
  const nummer = f.get("Nummer");
  const hz = stuhlVon(rolle).handzeichen;
  const folge = {
    ...(verteiler === undefined ? {} : { sichtung: sichtungVon(rolle, verteiler) }),
    ...(nummer === undefined ? {} : { nachweis: { nummer: Number(nummer), zeitpunkt: jetzt(), handzeichen: hz } }),
  };
  await bediene(rolle, nachrichtAufnehmen(anlage, folge));
}

async function sichte(rolle: Rolle, verteiler: string): Promise<void> {
  const { id } = aktuelleNachricht();
  const vorher = laufzettel(rolle, zeileDer(id).sichtung ?? null);
  await bediene(rolle, nachrichtSichten(id, vorher as Parameters<typeof nachrichtSichten>[1], sichtungVon(rolle, verteiler)), true);
}

function einrichtung(d: Definiere): void {
  schritt(d, "ein Einsatz ist angelegt", legeEinsatzAn, true);
  schritt(d, "in der Präsenz stehen diese Arbeitsplätze", async (tabelle: Tabelle) => {
    for (const zeile of tabelle) await besetze(zeile["Stelle"] ?? "", zeile["Handzeichen"] ?? "");
    await gleicheAb();
  });
  schritt(d, "ein weiterer Arbeitsplatz mit der Stelle {string} und dem Handzeichen {string} ist in der Präsenz", async (stelle: string, hz: string) => {
    await besetze(stelle, hz);
    await gleicheAb();
  });
  schritt(d, "die Station LdF ist für den Einsatz eingeschaltet", async () => {
    const erste = aktuelleWelt().stuehle[0]!;
    const rolle = { stelle: erste.stelle, nr: 1, wort: `Der Arbeitsplatz ${erste.stelle}` };
    await bediene(rolle, { typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId: EINSATZ_ID, feld: "ldfStation" }, vorher: null, neu: true });
  });
}

function ausgang(d: Definiere): void {
  schritt(d, "{stelle} eine Nachricht mit diesen Angaben verfasst", async (rolle: Rolle, tabelle: Tabelle) => {
    await bediene(rolle, nachrichtVerfassen(ausgangAus(rolle, felder(tabelle))));
  });
  schritt(d, "{stelle} eine Nachricht {string} mit Vorrang {string} verfasst", async (rolle: Rolle, betreff: string, vorrang: string) => {
    const f = new Map([["Anschrift", "OV Wildeshausen"], ["Betreff", betreff], ["Inhalt", `${betreff}.`], ["Vorrang", vorrang]]);
    await bediene(rolle, nachrichtVerfassen(ausgangAus(rolle, f)));
  });
  const annehmen = async (rolle: Rolle, zeitpunkt: string): Promise<void> => {
    const { id } = aktuelleNachricht();
    await bediene(rolle, nachrichtAnnehmen(id, zeileDer(id).annahme ?? null, { zeitpunkt, handzeichen: stuhlVon(rolle).handzeichen }));
  };
  schritt(d, "{stelle} die Nachricht annimmt", (rolle: Rolle) => annehmen(rolle, jetzt()));
  schritt(d, "{stelle} die Nachricht vor {int} Minuten angenommen hat", (rolle: Rolle, minuten: number) => annehmen(rolle, vorMinuten(minuten)));
  schritt(d, "{stelle} als Übertragungsmittel {string} festlegt", async (rolle: Rolle, mittel: string) => {
    const neu = { mittel: mittelAus(mittel), zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen };
    await bediene(rolle, { typ: "NachrichtWegFestgelegt", nutzlast: { nachrichtId: aktuelleNachricht().id }, vorher: null, neu, vorwertPruefen: true });
  });
  schritt(d, "{stelle} die Nachricht über {string} an {string} befördert", async (rolle: Rolle, mittel: string, gegenstelle: string) => {
    const { id } = aktuelleNachricht();
    const neu = { mittel: mittelAus(mittel), zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen, gegenstelle };
    await bediene(rolle, nachrichtBefoerdern(id, zeileDer(id).befoerderung ?? null, neu));
  });
  schritt(d, "{stelle} die Nachricht unter Nummer {int} nachweist", async (rolle: Rolle, nummer: number) => {
    const { id } = aktuelleNachricht();
    await bediene(rolle, nachrichtNachweisen(id, zeileDer(id).nachweis ?? null, { nummer, zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen }));
  });
}

function eingang(d: Definiere): void {
  schritt(d, "{stelle} eine Nachricht mit diesen Angaben aufnimmt", (rolle: Rolle, tabelle: Tabelle) => legeEingangAn(rolle, tabelle, false));
  schritt(d, "{stelle} ein Gespräch als Gesprächsnotiz mit diesen Angaben festhält", (rolle: Rolle, tabelle: Tabelle) => legeEingangAn(rolle, tabelle, true));
  schritt(d, "{stelle} die Nachricht an den Sichter weitergibt", async (rolle: Rolle) => {
    const neu = { zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen };
    await bediene(rolle, { typ: "NachrichtWeitergegeben", nutzlast: { nachrichtId: aktuelleNachricht().id }, vorher: null, neu, vorwertPruefen: true });
  });
  schritt(d, "beide Sichter den Laufzettel der Nachricht öffnen", () => {
    const gesehen = zeileDer(aktuelleNachricht().id).sichtung ?? null;
    for (const nr of [1, 2]) {
      const rolle = { stelle: "SICHTER", nr, wort: `Sichter ${String(nr)}` };
      stuhlVon(rolle);
      merkeLaufzettel(rolle, gesehen);
    }
  });
  schritt(d, "{stelle} die Nachricht quittiert und an {string} verteilt", sichte);
  schritt(d, "{stelle} die Nachricht selbst an {string} verteilt", sichte);
  schritt(d, "{stelle} die Nachricht zur Kenntnis nimmt", async (rolle: Rolle) => {
    await bediene(rolle, kenntnisGenommen(aktuelleNachricht().id, rolle.stelle, { zeitpunkt: jetzt(), handzeichen: stuhlVon(rolle).handzeichen }));
  });
  schritt(d, "{stelle} die Nachricht erledigt", async (rolle: Rolle) => {
    await bediene(rolle, erledigt(aktuelleNachricht().id, rolle.stelle));
  });
}

/** Alle Schritte „Angenommen" und „Wenn" der drei Features. */
export function ablaufschritte(d: Definiere): void {
  einrichtung(d);
  ausgang(d);
  eingang(d);
}
