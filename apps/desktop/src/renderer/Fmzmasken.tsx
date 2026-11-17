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
 */

import { useState } from "react";

import { NACHRICHT_MITTEL, datumZeitGruppe, projektion, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Gegenstelle } from "../kontrakt/index.js";
import { nachrichtAnnehmen, nachrichtBefoerdern, nachrichtNachweisen } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { zeitAusEingabe } from "./nachrichtenformate.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { FmzTeil, NachrichtenteilAnzeige } from "./Vordruckteile.js";

export type Fmzschritt = "annahme" | "befoerderung" | "nachweis";

const TITEL: Readonly<Record<Fmzschritt, string>> = { annahme: "Annehmen", befoerderung: "Befördern", nachweis: "Nachweisen" };

export interface FmzmaskeEigenschaften {
  readonly schritt: Fmzschritt;
  readonly zeile: Nachrichtenzeile;
  readonly handzeichen: string;
  readonly naechsteNummer: number | undefined;
  readonly vergebeneNummern: readonly number[] | undefined;
  /** Die Einheiten der Lage — mögliche Gegenstellen mit Kontakt im Funkplan. */
  readonly gegenstellen?: readonly Gegenstelle[] | undefined;
  readonly aufSchliessen: () => void;
}

interface Eingaben {
  readonly zeit: string;
  readonly handzeichen: string;
  readonly mittel: string;
  readonly gegenstelle: string;
  readonly nummer: string;
}

function vorbelegung(p: FmzmaskeEigenschaften): Eingaben {
  return {
    zeit: datumZeitGruppe(new Date()),
    handzeichen: p.handzeichen,
    mittel: p.zeile.befoerderung?.mittel ?? p.zeile.uebermittlungswunsch ?? "FUNK",
    gegenstelle: p.zeile.gegenstelle ?? p.zeile.anschrift,
    nummer: String(p.zeile.nummer ?? p.naechsteNummer ?? ""),
  };
}

/** Der Entwurf des Schritts aus den Eingaben, oder der Satz, was fehlt. */
export function fmzEntwurf(schritt: Fmzschritt, zeile: Nachrichtenzeile, e: Eingaben, kontaktEinheitId?: string): Entwurf | string {
  const zeitpunkt = zeitAusEingabe(e.zeit);
  if (zeitpunkt === undefined) return "Zeit lesbar eintragen, etwa „1045“";
  if (e.handzeichen.trim() === "") return "Handzeichen eintragen";
  if (schritt === "annahme") return nachrichtAnnehmen(zeile.id, zeile.annahme ?? null, { zeitpunkt, handzeichen: e.handzeichen });
  if (schritt === "befoerderung") {
    const vorher = zeile.befoerderung === undefined ? null : { ...zeile.befoerderung, ...(zeile.gegenstelle === undefined ? {} : { gegenstelle: zeile.gegenstelle }) };
    return nachrichtBefoerdern(zeile.id, vorher, { mittel: e.mittel, zeitpunkt, handzeichen: e.handzeichen, gegenstelle: e.gegenstelle }, kontaktEinheitId);
  }
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

function Beforderungsfelder({ e, setze, wahl }: { readonly e: Eingaben; readonly setze: (feld: keyof Eingaben, wert: string) => void; readonly wahl: Gegenstellenwahl }): React.JSX.Element {
  return (
    <>
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
      {wahl.treffer !== undefined && e.mittel === "FUNK" && (
        <label className="kaestchen">
          <input type="checkbox" checked={wahl.kontakt} onChange={(ev) => wahl.aufKontakt(ev.target.checked)} />
          Kontakt mit „{wahl.treffer.name}“ im Funkplan vermerken
        </label>
      )}
    </>
  );
}

function Zusatzfelder({ schritt, e, setze, warnung, wahl }: { readonly schritt: Fmzschritt; readonly e: Eingaben; readonly setze: (feld: keyof Eingaben, wert: string) => void; readonly warnung: string | undefined; readonly wahl: Gegenstellenwahl }): React.JSX.Element | null {
  if (schritt === "befoerderung") return <Beforderungsfelder e={e} setze={setze} wahl={wahl} />;
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

export function Fmzmaske(p: FmzmaskeEigenschaften): React.JSX.Element {
  const [e, setzeE] = useState<Eingaben>(() => vorbelegung(p));
  const versuch = useAnlegeversuch();
  useSperreHalten(p.zeile.id);
  const fremd = useFremdsperren().von(p.zeile.id);
  const setze = (feld: keyof Eingaben, wert: string): void => setzeE((bisher) => ({ ...bisher, [feld]: wert }));
  const [kontakt, setzeKontakt] = useState(true);
  const treffer = gegenstelleTreffer(p.gegenstellen ?? [], e.gegenstelle);
  const wahl: Gegenstellenwahl = { gegenstellen: p.gegenstellen ?? [], treffer, kontakt, aufKontakt: setzeKontakt };
  const kontaktEinheitId = p.schritt === "befoerderung" && kontakt && e.mittel === "FUNK" ? treffer?.einheitId : undefined;
  const entwurf = fmzEntwurf(p.schritt, p.zeile, e, kontaktEinheitId);
  const warnung = p.schritt === "nachweis" ? nummerWarnung(nummerAusEingabe(e.nummer), p.vergebeneNummern, p.zeile.nummer) : undefined;

  async function schreibe(): Promise<void> {
    if (typeof entwurf === "string") return;
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    for (const satz of ergebnis.warnungen ?? []) useLaden.getState().melde("info", satz);
    p.aufSchliessen();
  }

  const nummer = p.zeile.nummer === undefined ? p.zeile.richtungKurz : `${p.zeile.richtungKurz} ${String(p.zeile.nummer)}`;
  return (
    <Maske
      titel={`${TITEL[p.schritt]} · ${nummer} ${p.zeile.betreff}`}
      bestaetigungstext={warnung === undefined ? TITEL[p.schritt] : "Trotzdem nachweisen"}
      nurKnopf
      bereit={typeof entwurf !== "string" && !versuch.gesperrt}
      bereitGrund={typeof entwurf === "string" ? entwurf : versuch.sperre}
      aufAbbrechen={p.aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {fremd !== undefined && <p className="warnung">{sperrtext(fremd)}</p>}
      {p.schritt === "befoerderung" && (
        <div className="vordruck">
          <FmzTeil zeile={p.zeile} />
          <NachrichtenteilAnzeige zeile={p.zeile} />
        </div>
      )}
      <div className="vordruckzeile">
        <Dtgfeld beschriftung={p.schritt === "befoerderung" ? "Datum/Uhrzeit" : "Uhrzeit"} wert={e.zeit} aufAenderung={(wert) => setze("zeit", wert)} />
        <label>
          Handzeichen
          <input value={e.handzeichen} maxLength={20} onChange={(ev) => setze("handzeichen", ev.target.value)} />
        </label>
      </div>
      <Zusatzfelder schritt={p.schritt} e={e} setze={setze} warnung={warnung} wahl={wahl} />
      {versuch.anzeige}
    </Maske>
  );
}
