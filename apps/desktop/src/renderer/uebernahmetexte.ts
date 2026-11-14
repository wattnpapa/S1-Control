/**
 * Die Sätze unter der Erfassungsbogen-Maske nach einer Übernahme.
 *
 * Eine Übernahme, die nicht dort ankommt, wo der Bediener sie hingeschickt
 * hat, ist eine **Warnung** und kein Erfolg: Eine schon erfasste Einheit wird
 * nur aktualisiert und nicht verschoben, eine entfernte nimmt den Bogen gar
 * nicht an. Wer dann im gewählten Abschnitt sucht und nichts findet, muss
 * hier lesen können, warum.
 */

import type { Sammeluebernahme, Uebernahmeergebnis } from "../kontrakt/index.js";

export interface Ergebnistext {
  readonly text: string;
  /** Rot statt grau: Nicht alles ist im gewählten Abschnitt angekommen. */
  readonly warnung: boolean;
}

/** Der Satz nach „Übernehmen“. */
export function einzelergebnis(ausgang: Uebernahmeergebnis, zielname: string): Ergebnistext {
  if (ausgang.art === "nichtMoeglich") return { text: ausgang.meldung, warnung: true };
  if (ausgang.art === "abgewiesen") return { text: `Nicht übernommen: ${ausgang.meldung}`, warnung: true };
  const satz = `Übernommen: ${String(ausgang.ereignisse)} Ereignisse geschrieben.`;
  if (ausgang.wiederhergestellt === true) {
    return { text: `${satz} Die Einheit war gelöscht und ist jetzt wieder da, in „${zielname}“.`, warnung: false };
  }
  if (ausgang.bereitsIn === undefined) return { text: satz, warnung: false };
  return {
    text: `${satz} Die Einheit war schon erfasst und wurde nicht nach „${zielname}“ verschoben, sondern nur aktualisiert. Sie steht weiter in „${ausgang.bereitsIn}“.`,
    warnung: true,
  };
}

/** Der Satz nach „Alle übernehmen“. */
export function sammelergebnis(ausgang: Sammeluebernahme, zielname: string): Ergebnistext {
  const anfang = ausgang.abgebrochen === true ? `Abgebrochen. ${offentext(ausgang.naechster)}` : "";
  const boegen = ausgang.uebernommen === 1 ? "1 Bogen" : `${String(ausgang.uebernommen)} Bögen`;
  const teile = [
    `${anfang}${boegen} übernommen (${String(ausgang.ereignisse)} Ereignisse).`,
    wiederhergestellttext(ausgang.wiederhergestellt, zielname),
    aktualisierttext(ausgang.aktualisiert, zielname),
    fehlertext(ausgang.fehlgeschlagen),
  ].filter((teil) => teil !== "");
  const warnung = ausgang.fehlgeschlagen.length > 0 || (ausgang.aktualisiert?.length ?? 0) > 0;
  return { text: teile.join(" "), warnung };
}

function wiederhergestellttext(namen: Sammeluebernahme["wiederhergestellt"], zielname: string): string {
  if (namen === undefined || namen.length === 0) return "";
  const anzahl = namen.length === 1 ? "1 gelöschte Einheit ist" : `${String(namen.length)} gelöschte Einheiten sind`;
  return `${anzahl} wieder da, in „${zielname}“: ${namen.join(", ")}.`;
}

function aktualisierttext(aktualisiert: Sammeluebernahme["aktualisiert"], zielname: string): string {
  if (aktualisiert === undefined || aktualisiert.length === 0) return "";
  const wo = aktualisiert.map((a) => `${a.bezeichnung} (steht in „${a.abschnitt}“)`).join(", ");
  const einzeln = aktualisiert.length === 1;
  const anzahl = einzeln ? "1 Einheit war" : `${String(aktualisiert.length)} Einheiten waren`;
  return `${anzahl} schon erfasst und ${einzeln ? "wurde" : "wurden"} nicht nach „${zielname}“ verschoben, nur aktualisiert: ${wo}.`;
}

function fehlertext(fehlgeschlagen: Sammeluebernahme["fehlgeschlagen"]): string {
  if (fehlgeschlagen.length === 0) return "";
  const gruende = fehlgeschlagen.map((f) => `${f.bezeichnung}: ${f.meldung}`).join(" ");
  return `${String(fehlgeschlagen.length)} nicht übernommen — ${gruende}`;
}

/** „Noch 43 Bögen offen. " — was nach einem Abbruch in der Datei bleibt. */
function offentext(naechster: { readonly wartend?: number } | undefined): string {
  if (naechster === undefined) return "";
  const offen = (naechster.wartend ?? 0) + 1;
  return offen === 1 ? "Noch 1 Bogen offen. " : `Noch ${String(offen)} Bögen offen. `;
}
