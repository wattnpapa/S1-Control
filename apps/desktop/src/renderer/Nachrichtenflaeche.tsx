/**
 * Die Listenfläche des Blatts „Nachrichten“ — herausgelöst aus
 * `Nachrichten.tsx`, damit jene Datei unter der Strukturgrenze bleibt
 * (AGENTS.md §6). Verhalten wie vorher (Ladezustand, leere Sicht, Hinweis
 * auf weitere Zeilen, Nachweisung als zweite Ansicht für Sichter und FmZ);
 * neu im Nachzug der zweiten Runde:
 *
 * - **Ausgang ohne fremde Eingänge** (R2-FaBe P2-9): Die Sicht zeigt eigene
 *   Ausgänge und die eigenen Gesprächsnotizen, keinen Eingang; Ring 2 ordnet
 *   so, die Fläche hält es auch für ältere Stände fest.
 * - **Zurückgezogene eingeklappt** (R2-ETB P3-3, R2-FaBe P3): Im Posteingang
 *   und in „Offen“ stehen zurückgezogene Nachrichten unter „zurückgezogen“,
 *   zugeklappt — sie verlangen nichts mehr, sollen aber auffindbar bleiben.
 * - **Leere Sicht Sichter** (R2-Si P3-2): Liegt etwas beim LdF, sagt die
 *   leere Sicht es, mit Sprung in die Sicht LdF.
 * - **Nummernlücken** (R2-LdF P2-7, R2-ETB P2-2): In der Sicht Nachweisung
 *   steht „Fehlende Nummern: 6–49, 51“ aus `nummernluecken` (Ring 2) — vorher
 *   nur im Ausdruck.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import { AUSSCHNITT_MAX, type Nachrichtenlage } from "../kontrakt/index.js";
import type { Kontextort } from "./Klappmenue.js";
import { Laufzettel } from "./Laufzettel.js";
import { NACHRICHTENSICHTEN, type Nachrichtensicht } from "./Nachrichtenkopf.js";
import { Nachrichtenliste } from "./Nachrichtenliste.js";
import { gesichteteZeilen, type Sichterstand } from "./Nachrichtenzusatz.js";
import { useNachrichtenansicht, type Nachrichtenabruf } from "./useNachrichtenansicht.js";

/** Was die Sicht zeigt: im Ausgang nur Ausgänge und Gesprächsnotizen (R2-FaBe P2-9), sonst alles. */
export function sichtzeilen(sicht: Nachrichtensicht, zeilen: readonly Nachrichtenzeile[]): readonly Nachrichtenzeile[] {
  return sicht === "ausgang" ? zeilen.filter((z) => z.richtungKurz === "A" || z.gespraechsnotiz) : zeilen;
}

/** Die Zeilen in gültige und zurückgezogene getrennt — nur im Posteingang und in „Offen“ (R2-FaBe P3). */
export function getrennt(sicht: Nachrichtensicht, zeilen: readonly Nachrichtenzeile[]): { readonly gueltig: readonly Nachrichtenzeile[]; readonly zurueck: readonly Nachrichtenzeile[] } {
  if (sicht !== "posteingang" && sicht !== "offen") return { gueltig: zeilen, zurueck: [] };
  return { gueltig: zeilen.filter((z) => !z.zurueckgezogen), zurueck: zeilen.filter((z) => z.zurueckgezogen) };
}

/** „6–49, 51“ — die fehlenden Nummern als Bereiche (R2-LdF P2-7). */
export function lueckentext(luecken: readonly number[]): string {
  const sortiert = [...new Set(luecken)].sort((a, b) => a - b);
  const bereiche: string[] = [];
  let i = 0;
  while (i < sortiert.length) {
    const anfang = sortiert[i] ?? 0;
    let ende = anfang;
    while (sortiert[i + 1] === ende + 1) {
      ende += 1;
      i += 1;
    }
    bereiche.push(anfang === ende ? String(anfang) : `${String(anfang)}–${String(ende)}`);
    i += 1;
  }
  return bereiche.join(", ");
}

/** Die Zeile über der Nachweisung, wenn Nummern fehlen; sonst nichts. */
export function Lueckenzeile({ luecken }: { readonly luecken: readonly number[] | undefined }): React.JSX.Element | null {
  if (luecken === undefined || luecken.length === 0) return null;
  return (
    <p className="warnung nummernluecken" role="status" title="Nummern zwischen 1 und der höchsten, die an keiner Nachricht stehen — Papierbetrieb oder Zahlendreher?">
      Fehlende Nummern: {lueckentext(luecken)}
    </p>
  );
}

/** „1 Nachricht liegt noch beim LdF.“ in der leeren Sicht Sichter (R2-Si P3-2). */
export function beimLdfText(anzahl: number | undefined): string | undefined {
  if (anzahl === undefined || anzahl <= 0) return undefined;
  return anzahl === 1 ? "1 Nachricht liegt noch beim LdF." : `${String(anzahl)} Nachrichten liegen noch beim LdF.`;
}

export interface ListenEigenschaften {
  readonly abruf: Nachrichtenabruf;
  /** Additiv: die gezeigten Zeilen, wenn sie nicht die der Ansicht sind (Sichter „gesichtet“). */
  readonly zeilenErsatz?: readonly Nachrichtenzeile[] | undefined;
  readonly sicht: Nachrichtensicht;
  readonly stellen: readonly string[];
  readonly gewaehltId: string | undefined;
  readonly aufWahl: (id: string) => void;
  readonly aufLesen: (zeile: Nachrichtenzeile) => void;
  readonly aufKontext: (ort: Kontextort) => void;
  /** Additiv (R2-Si P3-2): die Lage der Nachrichten für „liegt noch beim LdF“, und der Sprung dorthin. */
  readonly lage?: Nachrichtenlage | undefined;
  readonly aufLdf?: (() => void) | undefined;
}

function LeereSicht({ sicht, stellen, lage, aufLdf }: Pick<ListenEigenschaften, "sicht" | "stellen" | "lage" | "aufLdf">): React.JSX.Element {
  const titel = NACHRICHTENSICHTEN.find((s) => s.schluessel === sicht)?.titel ?? sicht;
  const ohneStelle = (sicht === "posteingang" || sicht === "offen") && stellen.length === 0;
  // Review 2026-11-21: nur, was der LdF als Nächstes an den Sichter gibt — nicht die Ausgänge vor der Zuteilung.
  const beimLdf = sicht === "sichter" ? beimLdfText(lage?.vorLdf === undefined ? undefined : lage.vorLdf - (lage.vorLdfZuteilung ?? 0)) : undefined;
  return (
    <p className="hinweistext">
      {ohneStelle ? "Keine Stelle gewählt — über das Fenstermenü „Stelle und Handzeichen …“ angeben oder oben eine Stelle wählen." : `Keine Nachricht in „${titel}“.`}
      {beimLdf !== undefined && (
        <>
          {" "}
          {beimLdf}{" "}
          {aufLdf !== undefined && (
            <button type="button" className="link" onClick={aufLdf}>
              Sicht LdF ansehen
            </button>
          )}
        </>
      )}
    </p>
  );
}

/** Die Liste der Sicht, mit Ladezustand, leerer Sicht und Hinweis auf weitere Zeilen. */
export function Listenflaeche(p: ListenEigenschaften): React.JSX.Element {
  const { abruf, zeilenErsatz, sicht, stellen } = p;
  const titel = NACHRICHTENSICHTEN.find((s) => s.schluessel === sicht)?.titel ?? sicht;
  const zeilen = sichtzeilen(sicht, zeilenErsatz ?? abruf.ansicht?.zeilen ?? []);
  if (abruf.ansicht === undefined) return <p className="hinweistext">{abruf.fehler ?? "Wird geladen …"}</p>;
  if (zeilen.length === 0) return <LeereSicht sicht={sicht} stellen={stellen} lage={p.lage} aufLdf={p.aufLdf} />;
  const { gueltig, zurueck } = getrennt(sicht, zeilen);
  const liste = (teil: readonly Nachrichtenzeile[], beschriftung: string): React.JSX.Element => (
    <Nachrichtenliste
      zeilen={teil}
      beschriftung={beschriftung}
      stellen={stellen}
      posteingang={sicht === "posteingang" || sicht === "offen"}
      eingangsspalte={sicht === "sichter"}
      gewaehltId={p.gewaehltId}
      aufWahl={p.aufWahl}
      aufLesen={(id) => {
        const zeile = zeilen.find((z) => z.id === id);
        if (zeile !== undefined) p.aufLesen(zeile);
      }}
      aufKontext={p.aufKontext}
    />
  );
  return (
    <>
      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      {gueltig.length > 0 && liste(gueltig, `Nachrichten: ${titel}`)}
      {zurueck.length > 0 && (
        <details className="zurueckgezogene">
          <summary>zurückgezogen ({zurueck.length})</summary>
          {liste(zurueck, `Nachrichten: ${titel}, zurückgezogen`)}
        </details>
      )}
      {zeilenErsatz === undefined && abruf.ansicht.gesamtzahl > zeilen.length && (
        <p className="hinweistext">
          {zeilen.length} von {abruf.ansicht.gesamtzahl} Nachrichten; die Suche grenzt ein.
        </p>
      )}
    </>
  );
}

/**
 * Die Nachweisung als zweite Ansicht, nur in den Sichten Sichter und FmZ:
 * gesichtete Eingänge zum Nachsichten (Sichter P0-1, P0-3) und beförderte
 * Nachrichten ohne Nummer (LdF P0-1). Dazu der Verlauf für „wie zuletzt bei
 * diesem Absender“ im Laufzettel (Sichter P1-3).
 */
export function useNachweisungDazu(akteId: string | undefined, lageZeiger: number | undefined, sicht: Nachrichtensicht, stand: Sichterstand) {
  const mit = sicht === "sichter" || sicht === "fmz";
  const nachweisung = useNachrichtenansicht(mit ? akteId : undefined, lageZeiger, { sicht: "nachweisung", anzahl: AUSSCHNITT_MAX });
  const alle = mit ? (nachweisung.ansicht?.zeilen ?? []) : [];
  return { alle, gesichtet: sicht === "sichter" && stand === "gesichtet" ? gesichteteZeilen(alle) : undefined };
}

/**
 * Der Laufzettel der FmZ, die selbst sichtet (Sichter P1-4) — wie beim Ersatzsichter.
 * Er rollt beim Öffnen in den Blick und fokussiert die Quittung (R2-FM P1-2, R2-Si P2):
 * Vorher lag er unter der Falz, und „Sichten“ war blind drückbar.
 */
export function SelbstLaufzettel({
  zeile,
  handzeichen,
  nurLesen,
  aufFertig,
  verlauf,
  saeumig = false,
}: {
  readonly zeile: Nachrichtenzeile | undefined;
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  readonly aufFertig: () => void;
  readonly verlauf?: readonly Nachrichtenzeile[];
  /** R2-FM P2-5: Der Sichter ist besetzt; die Karte bot den Knopf, weil er säumig ist. */
  readonly saeumig?: boolean;
}): React.JSX.Element | null {
  if (zeile === undefined) return null;
  return <Laufzettel key={zeile.id} zeile={zeile} handzeichen={handzeichen} nurLesen={nurLesen} aufGesichtet={aufFertig} fokus saeumig={saeumig} {...(verlauf === undefined ? {} : { verlauf })} />;
}
