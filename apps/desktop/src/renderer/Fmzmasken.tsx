/**
 * Die drei kleinen Masken der Fernmeldezentrale (KONZEPT-NACHRICHTEN.md §5,
 * §6, Schnitt N2): Annahme, Beförderung und Nachweis — je ein Kasten im
 * oberen Teil des Vordrucks. Die Beförderung zeigt dazu die Nachricht (Feld 7 bis 17) schreibgeschützt,
 * damit der Fernmelder alles vor sich hat wie auf dem Vordruck.
 *
 * Zeit und Handzeichen sind vorbelegt („jetzt", Handzeichen der Sitzung) und
 * bleiben editierbar: Beim Nacherfassen vom Papier gilt, was auf dem Blatt
 * steht (§6 „Papier-Rückfall"). Die Beförderung belegt Mittel und
 * Gegenstelle aus der Nachricht vor (Übermittlungswunsch, Anschrift). Die
 * Nummer ist „höchste bekannte plus eins"; eine schon vergebene warnt vor
 * dem Schreiben, sperrt aber nicht (§9).
 *
 * Solange eine Maske offen ist, hält sie die weiche Bearbeitungssperre auf
 * die Nachricht; ein zweiter Fernmelder sieht „wird von … bearbeitet" (§6).
 * Jeder Schritt schickt den Wert, den die Maske beim Öffnen sah: Hat ein
 * anderer Platz inzwischen vermerkt, weist der Worker ab.
 *
 * Nach den Audits vom 2026-11-17:
 * - **Befördern verlangt die Annahme** (LdF P0-1): Fehlt sie, sagt die Maske
 *   „Annahme wird mit eingetragen“, und der Worker trägt sie mit Uhrzeit und
 *   Handzeichen der Beförderung als Folgeschritt nach. Fehlt die Nummer,
 *   sagt die Maske „Nummer ist vorbelegt“ und bietet das Nummernfeld
 *   gleich hier an; leer lassen geht nur mit zweitem Klick „Trotzdem ohne Nummer“.
 * - **Enter bestätigt** (Fernmelder P1-2), das Zeitfeld ist beim Öffnen
 *   markiert (P1-1), und die Zeit der Beförderung heißt, was sie ist:
 *   „Quittung der Gegenstelle“ (P2-4).
 * - Das Handzeichen hat zwei bis vier Zeichen (Sachgebietsleiter P1-4).
 * - „Berichtigen“ einer doppelten Nummer belegt die nächste freie vor (LdF P2-1).
 * - Weist der Worker ab, weil ein anderer Platz inzwischen vermerkt hat, sagt
 *   die Maske in Worten, was jetzt gilt, und „Neu laden“ öffnet sie mit dem
 *   neuen Vorher-Wert (Fernmelder P2-6, `Vorwertkonflikt.tsx`).
 */

import { useState } from "react";

import { FERNMELDER_STANDARD, NACHRICHT_MITTEL, datumZeitGruppe, projektion, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Gegenstelle } from "../kontrakt/index.js";
import { nachrichtAnnehmen, nachrichtBefoerdern, nachrichtNachweisen, nachrichtVorschlagen } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { Befoerderungszusatz } from "./Befoerderungszusatz.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { handzeichenPflicht, zeitAusEingabe } from "./nachrichtenformate.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { FmzTeil, NachrichtenteilAnzeige } from "./Vordruckteile.js";
import { Konflikthinweis, istVorwertAbweisung, konflikttext, nachrichtNeuHolen } from "./Vorwertkonflikt.js";

export type Fmzschritt = "annahme" | "vorschlag" | "befoerderung" | "nachweis";

const TITEL: Readonly<Record<Fmzschritt, string>> = { annahme: "Annehmen", vorschlag: "Übermittlung vorschlagen", befoerderung: "Befördern", nachweis: "Nachweisen" };

export interface FmzmaskeEigenschaften {
  readonly schritt: Fmzschritt;
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly naechsteNummer: number | undefined;
  readonly vergebeneNummern: readonly number[] | undefined;
  /** Die Einheiten der Lage — mögliche Gegenstellen mit Kontakt im Funkplan. */
  readonly gegenstellen?: readonly Gegenstelle[] | undefined;
  readonly aufSchliessen: () => void;
  /**
   * Additiv (2026-11-17): der Satz zur Ersatzregel, wenn der Einsatz den LdF
   * als Station führt, aber keiner besetzt ist — dann gilt das Mittel der
   * Beförderung als Übermittlungsvorschlag.
   */
  readonly ldfErsatz?: string | undefined;
}

export interface Eingaben {
  readonly zeit: string;
  readonly handzeichen: string;
  readonly mittel: string;
  readonly gegenstelle: string;
  readonly nummer: string;
  /** Der Fernmelder, den der LdF mit der Übermittlung beauftragt. */
  readonly fernmelder: string;
}

function vorbelegung(p: FmzmaskeEigenschaften): Eingaben {
  return {
    zeit: datumZeitGruppe(new Date()),
    handzeichen: p.handzeichen,
    mittel: p.zeile.befoerderung?.mittel ?? p.zeile.vorschlag?.mittel ?? p.zeile.uebermittlungswunsch ?? "FUNK",
    gegenstelle: p.zeile.gegenstelle ?? p.zeile.vorschlag?.gegenstelle ?? p.zeile.anschrift,
    fernmelder: p.zeile.vorschlag?.fernmelder ?? "",
    // Eine doppelte Nummer wird mit der nächsten freien berichtigt, nicht mit sich selbst (LdF P2-1).
    nummer: String((p.zeile.nummerDoppelt ? undefined : p.zeile.nummer) ?? p.naechsteNummer ?? ""),
  };
}

/** Die Beschriftung des Zeitfelds je Schritt; beim Befördern ist es die Quittung der Gegenstelle (Fernmelder P2-4). */
function zeitbeschriftung(schritt: Fmzschritt): string {
  if (schritt === "befoerderung") return "Quittung der Gegenstelle (Datum/Uhrzeit)";
  return schritt === "vorschlag" ? "Datum/Uhrzeit" : "Uhrzeit";
}

/**
 * Der Beförderungsentwurf samt Folgen (LdF P0-1): die fehlende Annahme mit
 * derselben Zeit und demselben Handzeichen, die Nummer, wenn eingetragen.
 */
function befoerderungsentwurf(zeile: Nachrichtenzeile, e: Eingaben, zeitpunkt: string, kontaktEinheitId: string | undefined): Entwurf | string {
  const vermerk = { zeitpunkt, handzeichen: e.handzeichen };
  const mitNummer = zeile.nummer === undefined && e.nummer.trim() !== "";
  const nummer = mitNummer ? nummerAusEingabe(e.nummer) : undefined;
  if (mitNummer && nummer === undefined) return "Nummer als ganze Zahl ab 1 eintragen oder leer lassen";
  const vorher = zeile.befoerderung === undefined ? null : { ...zeile.befoerderung, ...(zeile.gegenstelle === undefined ? {} : { gegenstelle: zeile.gegenstelle }) };
  return nachrichtBefoerdern(zeile.id, vorher, { mittel: e.mittel, ...vermerk, gegenstelle: e.gegenstelle }, {
    kontaktEinheitId,
    annahme: zeile.annahme === undefined ? vermerk : undefined,
    nachweis: nummer === undefined ? undefined : { nummer, ...vermerk },
  });
}

/** Der Entwurf des Schritts aus den Eingaben, oder der Satz, was fehlt. */
export function fmzEntwurf(schritt: Fmzschritt, zeile: Nachrichtenzeile, e: Eingaben, kontaktEinheitId?: string): Entwurf | string {
  const zeitpunkt = zeitAusEingabe(e.zeit);
  if (zeitpunkt === undefined) return "Zeit lesbar eintragen, etwa „1045“";
  const hz = handzeichenPflicht(e.handzeichen);
  if (hz !== undefined) return hz;
  if (schritt === "annahme") return nachrichtAnnehmen(zeile.id, zeile.annahme ?? null, { zeitpunkt, handzeichen: e.handzeichen });
  if (schritt === "vorschlag") {
    if (e.fernmelder.trim() === "") return "Fernmelder wählen";
    return nachrichtVorschlagen(zeile.id, zeile.vorschlag ?? null, { mittel: e.mittel, zeitpunkt, handzeichen: e.handzeichen, fernmelder: e.fernmelder, gegenstelle: e.gegenstelle });
  }
  if (schritt === "befoerderung") return befoerderungsentwurf(zeile, e, zeitpunkt, kontaktEinheitId);
  const nummer = nummerAusEingabe(e.nummer);
  if (nummer === undefined) return "Nummer als ganze Zahl ab 1 eintragen";
  return nachrichtNachweisen(zeile.id, zeile.nachweis ?? null, { nummer, zeitpunkt, handzeichen: e.handzeichen });
}

interface Gegenstellenwahl {
  readonly gegenstellen: readonly Gegenstelle[];
  /** Die Einheit, die zur eingegebenen Gegenstelle passt — nur dann gibt es einen Kontakt im Funkplan. */
  readonly treffer: Gegenstelle | undefined;
  readonly kontakt: boolean;
  readonly aufKontakt: (an: boolean) => void;
}

/** Die Einheit, deren Name der Gegenstelle gleicht (ohne Groß-/Kleinschreibung); sonst keine. */
export function gegenstelleTreffer(gegenstellen: readonly Gegenstelle[], eingabe: string): Gegenstelle | undefined {
  const gesucht = eingabe.trim().toLocaleLowerCase("de");
  return gesucht === "" ? undefined : gegenstellen.find((g) => g.name.toLocaleLowerCase("de") === gesucht);
}

function Beforderungsfelder({ schritt, e, setze, wahl }: { readonly schritt: Fmzschritt; readonly e: Eingaben; readonly setze: (feld: keyof Eingaben, wert: string) => void; readonly wahl: Gegenstellenwahl }): React.JSX.Element {
  return (
    <>
      {schritt === "vorschlag" && (
        <div className="vordruckzeile">
          <label>
            Fernmelder
            <select value={e.fernmelder} onChange={(ev) => setze("fernmelder", ev.target.value)}>
              <option value="">— wählen —</option>
              {FERNMELDER_STANDARD.map((fm) => (
                <option key={fm} value={fm}>
                  {fm}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="vordruckzeile">
        <label>
          Mittel
          <select value={e.mittel} onChange={(ev) => setze("mittel", ev.target.value)}>
            {NACHRICHT_MITTEL.map((m) => (
              <option key={m} value={m}>
                {projektion.mittelWort(m)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gegenstelle
          <input value={e.gegenstelle} list="gegenstellenliste" placeholder="Einheit wählen oder Freitext" onChange={(ev) => setze("gegenstelle", ev.target.value)} />
          <datalist id="gegenstellenliste">
            {wahl.gegenstellen.map((g) => (
              <option key={g.einheitId} value={g.name} />
            ))}
          </datalist>
        </label>
      </div>
      {schritt === "befoerderung" && wahl.treffer !== undefined && e.mittel === "FUNK" && (
        <label className="kaestchen">
          <input type="checkbox" checked={wahl.kontakt} onChange={(ev) => wahl.aufKontakt(ev.target.checked)} />
          Kontakt mit „{wahl.treffer.name}“ im Funkplan vermerken
        </label>
      )}
    </>
  );
}

function Zusatzfelder({ schritt, e, setze, warnung, wahl }: { readonly schritt: Fmzschritt; readonly e: Eingaben; readonly setze: (feld: keyof Eingaben, wert: string) => void; readonly warnung: string | undefined; readonly wahl: Gegenstellenwahl }): React.JSX.Element | null {
  if (schritt === "befoerderung" || schritt === "vorschlag") return <Beforderungsfelder schritt={schritt} e={e} setze={setze} wahl={wahl} />;
  if (schritt !== "nachweis") return null;
  return (
    <>
      <label>
        Nr.
        <input value={e.nummer} inputMode="numeric" className="mono" onChange={(ev) => setze("nummer", ev.target.value)} />
      </label>
      {warnung !== undefined && (
        <p className="warnung" role="alert">
          {warnung}
        </p>
      )}
    </>
  );
}

/**
 * Die Maske mit „Neu laden“ (Fernmelder P2-6): Nach einer Abweisung holt sie
 * die Nachricht neu und zeichnet die Maske frisch — Vorbelegung und
 * Vorher-Wert sind dann der geltende Stand.
 */
export function Fmzmaske(p: FmzmaskeEigenschaften): React.JSX.Element {
  const [stand, setzeStand] = useState({ zeile: p.zeile, runde: 0 });
  return <FmzmaskeInnen key={stand.runde} {...p} zeile={stand.zeile} aufNeuLaden={(zeile) => setzeStand((s) => ({ zeile, runde: s.runde + 1 }))} />;
}

function FmzmaskeInnen(p: FmzmaskeEigenschaften & { readonly aufNeuLaden: (zeile: Nachrichtenzeile) => void }): React.JSX.Element {
  const [e, setzeE] = useState<Eingaben>(() => vorbelegung(p));
  const [konflikt, setzeKonflikt] = useState<string | undefined>(undefined);
  const peers = useLaden((z) => z.lagebild?.peers);
  // Der zweite Klick bei leerer Nummer: „Trotzdem ohne Nummer“ (LdF P0-1).
  const [ohneNummerBestaetigt, setzeOhneNummerBestaetigt] = useState(false);
  const versuch = useAnlegeversuch();
  useSperreHalten(p.zeile.id);
  const fremd = useFremdsperren().von(p.zeile.id);
  const setze = (feld: keyof Eingaben, wert: string): void => {
    if (feld === "nummer") setzeOhneNummerBestaetigt(false);
    setzeE((bisher) => ({ ...bisher, [feld]: wert }));
  };
  const [kontakt, setzeKontakt] = useState(true);
  const treffer = gegenstelleTreffer(p.gegenstellen ?? [], e.gegenstelle);
  const wahl: Gegenstellenwahl = { gegenstellen: p.gegenstellen ?? [], treffer, kontakt, aufKontakt: setzeKontakt };
  const befoerdern = p.schritt === "befoerderung";
  const kontaktEinheitId = befoerdern && kontakt && e.mittel === "FUNK" ? treffer?.einheitId : undefined;
  const entwurf = fmzEntwurf(p.schritt, p.zeile, e, kontaktEinheitId);
  const mitNummernfeld = p.schritt === "nachweis" || (befoerdern && p.zeile.nummer === undefined);
  const warnung = mitNummernfeld ? nummerWarnung(nummerAusEingabe(e.nummer), p.vergebeneNummern, p.zeile.nummerDoppelt ? undefined : p.zeile.nummer) : undefined;
  const ohneNummer = befoerdern && p.zeile.nummer === undefined && e.nummer.trim() === "";

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
    const ergebnis = await versuch.schreibe(entwurf);
    if (istVorwertAbweisung(ergebnis)) {
      setzeKonflikt(konflikttext(entwurf.typ, ergebnis.meldung, peers ?? []));
      return;
    }
    if (ergebnis?.art !== "geschrieben") return;
    for (const satz of ergebnis.warnungen ?? []) useLaden.getState().melde("info", satz);
    p.aufSchliessen();
  }

  const neuLaden = async (): Promise<void> => {
    const neu = await nachrichtNeuHolen(p.zeile.id);
    if (neu !== undefined) p.aufNeuLaden(neu);
  };

  const nummer = p.zeile.nummer === undefined ? p.zeile.richtungKurz : `${p.zeile.richtungKurz} ${String(p.zeile.nummer)}`;
  const knopf = ohneNummer && ohneNummerBestaetigt ? "Trotzdem ohne Nummer" : warnung !== undefined && p.schritt === "nachweis" ? "Trotzdem nachweisen" : TITEL[p.schritt];
  return (
    <Maske
      titel={`${TITEL[p.schritt]} · ${nummer} ${p.zeile.betreff}`}
      bestaetigungstext={knopf}
      bereit={typeof entwurf !== "string" && !versuch.gesperrt}
      bereitGrund={typeof entwurf === "string" ? entwurf : versuch.sperre}
      aufAbbrechen={p.aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {fremd !== undefined && <p className="warnung">{sperrtext(fremd)}</p>}
      {befoerdern && p.zeile.vorschlag === undefined && p.ldfErsatz !== undefined && (
        <p className="hinweistext" role="status">
          {p.ldfErsatz}
        </p>
      )}
      {(befoerdern || p.schritt === "vorschlag") && (
        <div className="vordruck">
          <FmzTeil zeile={p.zeile} />
          <NachrichtenteilAnzeige zeile={p.zeile} />
        </div>
      )}
      <div className="vordruckzeile">
        <Dtgfeld
          beschriftung={zeitbeschriftung(p.schritt)}
          wert={e.zeit}
          aufAenderung={(wert) => setze("zeit", wert)}
          {...(befoerdern ? { hilfe: "Uhrzeit, zu der die Gegenstelle quittiert hat" } : {})}
        />
        <label>
          Handzeichen
          <input value={e.handzeichen} maxLength={4} placeholder="2 bis 4 Zeichen" onChange={(ev) => setze("handzeichen", ev.target.value)} />
        </label>
      </div>
      <Zusatzfelder schritt={p.schritt} e={e} setze={setze} warnung={p.schritt === "nachweis" ? warnung : undefined} wahl={wahl} />
      {befoerdern && <Befoerderungszusatz zeile={p.zeile} nummer={e.nummer} aufNummer={(wert) => setze("nummer", wert)} warnung={warnung} ohneNummerBestaetigt={ohneNummerBestaetigt} />}
      {/* Statt „Nicht gespeichert – … (neu: {…})“ der Satz in Worten mit „Neu laden“ (Fernmelder P2-6). */}
      {konflikt === undefined ? versuch.anzeige : <Konflikthinweis text={konflikt} aufNeuLaden={() => void neuLaden()} />}
    </Maske>
  );
}
