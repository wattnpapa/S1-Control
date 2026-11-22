/**
 * Die Maske „An den Sichter weitergeben" des Leiters des Fernmeldebetriebes
 * (bestätigt am 2026-11-17, KONZEPT-NACHRICHTEN.md §5): Der LdF hat Aufnahme
 * und Nachweisung eines Eingangs geprüft und gibt ihn mit Zeit und
 * Handzeichen an den Sichter. Den Ausgangsschritt des LdF führt die Maske
 * „Fernmelder zuteilen" der FmZ (`Fmzmasken.tsx`).
 *
 * Wie die Masken der FmZ: Zeit „jetzt" und Handzeichen der Sitzung
 * vorbelegt und editierbar (Papier-Rückfall, §6), die weiche Sperre auf der
 * Nachricht, solange die Maske offen ist, und der Vorher-Wert vom Öffnen.
 * Eine Abweisung wegen eines fremden neueren Werts steht in Worten da, mit
 * „Neu laden“ (Fernmelder P2-6, `Vorwertkonflikt.tsx`).
 *
 * Nachzug (R2-LdF P2-3 teilweise): Die Maske zeigt den Aufnahmevermerk, den
 * der LdF prüfen soll — Mittel, Zeit, Handzeichen, Gegenstelle, Nummer —, und
 * fragt bei einem Eingang ohne Nummer einmal nach („Trotzdem ohne Nummer
 * weitergeben“), wie die Beförderung. Vorher stand dort nur die Überschrift,
 * und der Knopf versprach eine Prüfung, die er nicht machte.
 *
 * Ergänzt 2026-11-21: Auch der beförderte Ausgang kommt hierher. Der LdF
 * trägt die Nummer der Nachweisung (Technisches Betriebsbuch) gleich in
 * dieser Maske ein, wenn sie fehlt — der Worker schreibt sie als Folge der
 * Weitergabe —, und gibt an den Sichter, der S2 und den Verfasser verteilt.
 */

import { useState } from "react";

import { datumZeitGruppe, projektion, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import { nachrichtNachweisenUndWeitergeben, nachrichtWeitergeben } from "../kontrakt/ldfschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung } from "./fmzformate.js";
import { sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { useLaden } from "./laden.js";
import { meldeWarnungen } from "./warnungsstufen.js";
import { Maske } from "./Maske.js";
import { dtg, zeitAusEingabe } from "./nachrichtenformate.js";
import { useStellenvorbehalt } from "./Stellenvorbehalt.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { Konflikthinweis, istVorwertAbweisung, konflikttext, nachrichtNeuHolen } from "./Vorwertkonflikt.js";

export interface Weitergabeeingaben {
  readonly zeit: string;
  readonly handzeichen: string;
  /** Additiv (2026-11-21): die Nummer der Nachweisung, wenn die Nachricht noch keine trägt; leer = ohne. */
  readonly nummer?: string;
}

/** Der Entwurf der Weitergabe aus den Eingaben, oder der Satz, was fehlt. */
export function weitergabeEntwurf(zeile: Nachrichtenzeile, e: Weitergabeeingaben, jetzt: Date = new Date()): Entwurf | string {
  const zeitpunkt = zeitAusEingabe(e.zeit, jetzt);
  if (zeitpunkt === undefined) return "Zeit lesbar eintragen, etwa „1045“";
  if (e.handzeichen.trim() === "") return "Handzeichen eintragen";
  const eingabe = zeile.nummer === undefined ? (e.nummer ?? "").trim() : "";
  const nummer = nummerAusEingabe(eingabe);
  if (eingabe !== "" && nummer === undefined) return "Nummer als ganze Zahl eintragen";
  if (nummer === undefined) return nachrichtWeitergeben(zeile.id, zeile.weitergabe ?? null, { zeitpunkt, handzeichen: e.handzeichen });
  // Review 2026-11-21: erst die Nummer (mit Vorwert-Prüfung), dann die Weitergabe als Folge.
  return nachrichtNachweisenUndWeitergeben(zeile.id, { nummer, zeitpunkt, handzeichen: e.handzeichen }, { zeitpunkt, handzeichen: e.handzeichen });
}

/** „Funk 171045NOV26 Fm · von Heros Wildeshausen 10 · Nr. 7“ — der Aufnahmevermerk zum Prüfen (R2-LdF P2-3). */
export function aufnahmevermerkText(zeile: Nachrichtenzeile): string {
  const a = zeile.aufnahme;
  const teile = [
    a === undefined ? "ohne Aufnahmevermerk" : `${projektion.mittelWort(a.mittel)} ${dtg(a.zeitpunkt)} ${a.handzeichen}`,
    zeile.gegenstelle === undefined ? "ohne Gegenstelle" : `von ${zeile.gegenstelle}`,
    zeile.nummer === undefined ? "ohne Nummer" : `Nr. ${String(zeile.nummer)}`,
  ];
  return teile.join(" · ");
}

/** „Funk 171045NOV26 Ka · an Heros Wildeshausen 10 · ohne Nummer“ — der Beförderungsvermerk eines Ausgangs (2026-11-21). */
export function befoerderungsvermerkText(zeile: Nachrichtenzeile): string {
  const b = zeile.befoerderung;
  const teile = [
    b === undefined ? "nicht befördert" : `${projektion.mittelWort(b.mittel)} ${dtg(b.zeitpunkt)} ${b.handzeichen}`,
    zeile.gegenstelle === undefined ? "ohne Gegenstelle" : `an ${zeile.gegenstelle}`,
    zeile.nummer === undefined ? "ohne Nummer" : `Nr. ${String(zeile.nummer)}`,
  ];
  return teile.join(" · ");
}

export interface WeitergabemaskeEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly aufSchliessen: () => void;
  /** Additiv (2026-11-21): die nächste freie Nummer der Nachweisung als Vorbelegung. */
  readonly naechsteNummer?: number | undefined;
  /** Additiv (Review 2026-11-21): die vergebenen Nummern — Warnung vor einer doppelten. */
  readonly vergebeneNummern?: readonly number[] | undefined;
}

/** „Danach verteilt der Sichter: S2 rot, S4 grün.“ — was beim Ausgang nach dem Klick geschieht (Review 2026-11-21). */
export function danachText(zeile: Nachrichtenzeile, sichterDa: boolean): string | undefined {
  if (zeile.richtung !== "AUSGANG" || zeile.gespraechsnotiz) return undefined;
  const verfasser = projektion.verfasserstelleAus(zeile.funktion, zeile.absender);
  const gruen = verfasser === undefined || verfasser === "S2" ? "" : `, ${projektion.stellenWort(verfasser)} grün`;
  return sichterDa ? `Danach verteilt der Sichter: S2 rot${gruen}.` : `Kein Sichter besetzt: Mit dem Weitergeben gehen die Kopien gleich hinaus (S2 rot${gruen}).`;
}

/** Mit „Neu laden“ (Fernmelder P2-6): nach einer Abweisung frisch gezeichnet, mit dem geltenden Vorher-Wert. */
export function Weitergabemaske(p: WeitergabemaskeEigenschaften): React.JSX.Element {
  const [stand, setzeStand] = useState({ zeile: p.zeile, runde: 0 });
  return <WeitergabemaskeInnen key={stand.runde} {...p} zeile={stand.zeile} aufNeuLaden={(zeile) => setzeStand((s) => ({ zeile, runde: s.runde + 1 }))} />;
}

function WeitergabemaskeInnen(p: WeitergabemaskeEigenschaften & { readonly aufNeuLaden: (zeile: Nachrichtenzeile) => void }): React.JSX.Element {
  const [konflikt, setzeKonflikt] = useState<string | undefined>(undefined);
  const peers = useLaden((z) => z.lagebild?.peers);
  const eigeneStellen = useLaden((z) => z.lagebild?.sitzung?.stellen);
  const [e, setzeE] = useState<Weitergabeeingaben>(() => ({ zeit: datumZeitGruppe(new Date()), handzeichen: p.handzeichen, nummer: p.naechsteNummer === undefined ? "" : String(p.naechsteNummer) }));
  const versuch = useAnlegeversuch();
  useSperreHalten(p.zeile.id);
  const fremd = useFremdsperren().von(p.zeile.id);
  // Entscheidung 13, LdF P2-3: Hinweis statt Recht (Folie 7), `grund` im Tagebuch.
  const vorbehalt = useStellenvorbehalt("weitergabe");
  const entwurf = weitergabeEntwurf(p.zeile, e);
  // R2-LdF P2-3: Ohne Nummer fragt der erste Klick, der zweite gibt weiter.
  const [ohneNummerBestaetigt, setzeOhneNummerBestaetigt] = useState(false);
  const ohneNummer = p.zeile.nummer === undefined && (e.nummer ?? "").trim() === "";
  const ausgang = p.zeile.richtung === "AUSGANG";
  const doppelt = p.zeile.nummer === undefined ? nummerWarnung(nummerAusEingabe(e.nummer ?? ""), p.vergebeneNummern) : undefined;
  const danach = danachText(p.zeile, sichterBesetzt(eigeneStellen, peers ?? []));

  async function schreibe(): Promise<void> {
    if (typeof entwurf === "string") return;
    if (ohneNummer && !ohneNummerBestaetigt) {
      setzeOhneNummerBestaetigt(true);
      return;
    }
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(vorbehalt.grund === undefined ? entwurf : { ...entwurf, grund: vorbehalt.grund });
    if (istVorwertAbweisung(ergebnis)) {
      setzeKonflikt(konflikttext(entwurf.typ, ergebnis.meldung, peers ?? []));
      return;
    }
    if (ergebnis?.art !== "geschrieben") return;
    // R2-ETB P3-1: „Nummer bereits vergeben“ bleibt stehen, wenn der Worker es als Warnung führt.
    meldeWarnungen(ergebnis, "info");
    p.aufSchliessen();
  }

  const nummer = p.zeile.nummer === undefined ? p.zeile.richtungKurz : `${p.zeile.richtungKurz} ${String(p.zeile.nummer)}`;
  return (
    <Maske
      titel={`An den Sichter weitergeben · ${nummer} ${p.zeile.betreff}`}
      bestaetigungstext={ohneNummer && ohneNummerBestaetigt ? "Trotzdem ohne Nummer weitergeben" : "Weitergeben"}
      nurKnopf
      bereit={typeof entwurf !== "string" && !versuch.gesperrt && !vorbehalt.gesperrt}
      bereitGrund={typeof entwurf === "string" ? entwurf : (versuch.sperre ?? (vorbehalt.gesperrt ? "Erst „Trotzdem“ wählen" : undefined))}
      aufAbbrechen={p.aufSchliessen}
      aufBestaetigen={schreibe}
      fusszeile={
        ohneNummer && ohneNummerBestaetigt ? (
          <p className="warnung fussfrage" role="alert">
            {ausgang ? "Dieser Ausgang" : "Dieser Eingang"} hat keine Nachweisungsnummer. Ohne Nummer an den Sichter weitergeben?
          </p>
        ) : undefined
      }
    >
      {fremd !== undefined && <p className="warnung">{sperrtext(fremd)}</p>}
      <p className="aufnahmevermerk">
        {ausgang ? <strong>Beförderung:</strong> : <strong>Aufnahme:</strong>} {ausgang ? befoerderungsvermerkText(p.zeile) : aufnahmevermerkText(p.zeile)}
      </p>
      {vorbehalt.hinweis}
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Uhrzeit" wert={e.zeit} aufAenderung={(wert) => setzeE((bisher) => ({ ...bisher, zeit: wert }))} />
        <label>
          Handzeichen
          <input value={e.handzeichen} maxLength={20} onChange={(ev) => setzeE((bisher) => ({ ...bisher, handzeichen: ev.target.value }))} />
        </label>
        {p.zeile.nummer === undefined && (
          <label title="Die Nummer im Technischen Betriebsbuch (Nachweisung). Leer lassen, wenn sie später kommt.">
            Nummer (Nachweisung)
            <input inputMode="numeric" value={e.nummer ?? ""} maxLength={6} onChange={(ev) => setzeE((bisher) => ({ ...bisher, nummer: ev.target.value }))} />
          </label>
        )}
      </div>
      {doppelt !== undefined && (
        <p className="warnung" role="alert">
          {doppelt}
        </p>
      )}
      {danach !== undefined && <p className="hinweistext">{danach}</p>}
      {konflikt === undefined ? (
        versuch.anzeige
      ) : (
        <Konflikthinweis
          text={konflikt}
          aufNeuLaden={() => {
            void nachrichtNeuHolen(p.zeile.id).then((neu) => {
              if (neu !== undefined) p.aufNeuLaden(neu);
            });
          }}
        />
      )}
    </Maske>
  );
}
