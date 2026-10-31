/**
 * Die Statuszeile (M2.2).
 *
 * Sie beantwortet die drei Fragen, die ein Bediener an einem
 * Mehrbenutzer-Arbeitsplatz dauernd hat: Ist mein Stand aktuell? Wer arbeitet
 * sonst noch daran? Ist meine letzte Eingabe drüben?
 *
 * **`jetzt` wird übergeben.** Eine Komponente, die selbst `Date.now()` ruft,
 * ist nicht prüfbar: „vor 8 s" hinge dann an der Laufzeit des Tests. Der
 * Aufrufer gibt die Uhr, und im Betrieb tickt sie im Fenster.
 */

import { useState } from "react";

import { staerkeText } from "./formate.js";
import { aktiveArbeitsplaetze, weitereText } from "./arbeitsplatzzahl.js";
import { Statuserklaerung, Statushinweis } from "./Statushinweis.js";
import {
  ERKLAERUNG_KONFLIKT,
  ERKLAERUNG_SHARE,
  ERKLAERUNG_UNBEKANNT,
  erklaerungQuarantaene,
  erklaerungUebertragung,
  konflikthinweisText,
  quarantaeneText,
  unbekanntText,
} from "./statushinweise.js";
import type { Lagebild } from "../kontrakt/index.js";
import { unterbrochenText, type Verbindungsstatus } from "./verbindung.js";

/**
 * „vor 8 s", „vor 3 min", „vor 2 h".
 *
 * Grob und nicht genau: Der Bediener will wissen, ob der Stand von eben ist
 * oder von vorhin, nicht auf die Sekunde. Eine Zukunftsangabe wird als „gerade
 * eben" gezeigt — eine verstellte Uhr auf einem anderen Rechner (§3.2) darf
 * hier nicht „in 4 min" ergeben.
 */
export function alter(zeitpunkt: string, jetzt: number): string {
  const dann = Date.parse(zeitpunkt);
  if (Number.isNaN(dann)) return "unbekannt";
  const sekunden = Math.floor((jetzt - dann) / 1000);
  if (sekunden < 1) return "gerade eben";
  if (sekunden < 60) return `vor ${String(sekunden)} s`;
  const minuten = Math.floor(sekunden / 60);
  if (minuten < 60) return `vor ${String(minuten)} min`;
  return `vor ${String(Math.floor(minuten / 60))} h`;
}

/** Menschenlesbare Byte-Angabe für die unübertragenen eigenen Bytes (§5.3). */
export function bytes(zahl: number): string {
  if (zahl < 1024) return `${String(zahl)} B`;
  if (zahl < 1024 * 1024) return `${(zahl / 1024).toFixed(1)} kB`;
  return `${(zahl / (1024 * 1024)).toFixed(1)} MB`;
}

type UnterbrochenerStatus = Extract<Verbindungsstatus, { zustand: "unterbrochen" }>;

export interface StatuszeileEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
  /**
   * Die Verbindung Browser↔Dienst. Fehlt sie oder ist sie „unbekannt"
   * (Electron), verhält sich die Zeile wie bisher.
   */
  readonly verbindung?: Verbindungsstatus;
}

function Unterbrochen({ status }: { readonly status: UnterbrochenerStatus }): React.JSX.Element {
  return (
    <strong className={status.stufe === "rot" ? "fehler" : "warnung"} role="status">
      {status.stufe === "rot" ? "✖" : "⚠"} {unterbrochenText(status.seitMs)}
    </strong>
  );
}

interface Warnung {
  readonly kennung: string;
  readonly ton: "warnung" | "fehler";
  readonly text: string;
  readonly erklaerung: string;
}

/** Die Warnungen dieses Lagebilds in fester Reihenfolge – jede mit Symbol, Wort und Erklärung. */
function warnungen(lagebild: Lagebild, getrennt: boolean): readonly Warnung[] {
  const liste: Warnung[] = [];
  if (!getrennt && !lagebild.shareErreichbar) {
    // §1.3: „Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad." Die Zeile
    // sagt deshalb, was gilt, und nicht, dass etwas kaputt ist.
    const grund = lagebild.shareMeldung === undefined ? "" : ` — ${lagebild.shareMeldung}`;
    liste.push({ kennung: "share", ton: "warnung", text: `Share nicht erreichbar${grund}`, erklaerung: ERKLAERUNG_SHARE });
  }
  if (lagebild.unuebertrageneBytes > 0) {
    const menge = bytes(lagebild.unuebertrageneBytes);
    liste.push({
      kennung: "uebertragung",
      ton: "warnung",
      text: `${menge} noch nicht übertragen`,
      erklaerung: erklaerungUebertragung(menge),
    });
  }
  if (lagebild.quarantaene.length > 0) {
    // §8.2: Eine endgültige Quarantäne nimmt diesen Arbeitsplatz aus dem
    // Konvergenzvergleich (§8.6.1 Regel 3). Sie zu verschweigen hieße, ihm
    // einen Stand zu zeigen, für den niemand mehr geradesteht.
    liste.push({
      kennung: "quarantaene",
      ton: "fehler",
      text: quarantaeneText(lagebild.quarantaene.length),
      erklaerung: erklaerungQuarantaene(lagebild.quarantaene),
    });
  }
  if (lagebild.hinweise > 0) {
    liste.push({ kennung: "konflikt", ton: "warnung", text: konflikthinweisText(lagebild.hinweise), erklaerung: ERKLAERUNG_KONFLIKT });
  }
  if (lagebild.unbekannteEreignisse > 0) {
    // §3.7: Ein unbekanntes Ereignis heißt fast immer, dass ein anderer
    // Arbeitsplatz eine neuere Fassung fährt.
    liste.push({ kennung: "unbekannt", ton: "warnung", text: unbekanntText(lagebild.unbekannteEreignisse), erklaerung: ERKLAERUNG_UNBEKANNT });
  }
  return liste;
}

function Arbeitsplaetze({ lagebild }: { readonly lagebild: Lagebild }): React.JSX.Element {
  const aktiv = aktiveArbeitsplaetze(lagebild);
  const inaktiv = lagebild.peers.length - aktiv;
  const hinweis = inaktiv > 0 ? `${String(inaktiv)} weitere nicht mehr aktiv (seit Kurzem kein Lebenszeichen)` : undefined;
  return <span title={hinweis}>{aktiv === 0 ? "allein am Einsatz" : weitereText(aktiv)}</span>;
}

export function Statuszeile({ lagebild, jetzt, verbindung }: StatuszeileEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState<string | undefined>(undefined);
  if (lagebild === undefined) {
    return (
      <footer className="statuszeile" aria-label="Statuszeile">
        {verbindung?.zustand === "unterbrochen" && <Unterbrochen status={verbindung} />}
        <span>Kein Einsatz geöffnet</span>
      </footer>
    );
  }

  // Unterbrochen: Share-Status und Peers stammen vom Dienst und sind jetzt
  // **nicht** mehr belegt. Statt „Share erreichbar (gerade eben)" steht, was
  // gilt – sonst hielte der Bediener veraltete Zahlen für aktuell.
  const getrennt = verbindung?.zustand === "unterbrochen" ? verbindung : undefined;
  const liste = warnungen(lagebild, getrennt !== undefined);
  const aufgeklappt = liste.find((w) => w.kennung === offen);

  return (
    <footer className="statuszeile" aria-label="Statuszeile">
      {getrennt !== undefined && <Unterbrochen status={getrennt} />}

      <span title={lagebild.standHlc}>
        Stand: {lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt)}
        {getrennt !== undefined && " (veraltet)"}
      </span>

      {getrennt !== undefined ? (
        <span>Share-Stand unbekannt</span>
      ) : (
        lagebild.shareErreichbar && <span>Share erreichbar ({alter(lagebild.letzterShareKontakt, jetzt)})</span>
      )}

      {getrennt !== undefined ? <span>Arbeitsplätze unbekannt</span> : <Arbeitsplaetze lagebild={lagebild} />}

      {liste.map((w) => (
        <Statushinweis
          key={w.kennung}
          kennung={w.kennung}
          ton={w.ton}
          text={w.text}
          offen={offen === w.kennung}
          umschalten={() => setzeOffen(offen === w.kennung ? undefined : w.kennung)}
        />
      ))}

      {/* Rechts steht die Stärke in derselben Schreibweise wie im Kopfband
          (Entwurf „Oberfläche"): `42 EINH · 24/61/183 // 268`. Sie ist die
          Zahl, die abgelesen und weitergegeben wird — sie darf sich zwischen
          zwei Stellen des Fensters nicht in der Form unterscheiden. */}
      <span className="staerke">
        {String(lagebild.einheiten)} EINH · {staerkeText(lagebild.gesamtstaerke)}
      </span>
      {aufgeklappt !== undefined && <Statuserklaerung kennung={aufgeklappt.kennung} text={aufgeklappt.erklaerung} />}
    </footer>
  );
}
