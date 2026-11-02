/**
 * Die Versorgungsansichten des Monitors (S4.1, KONZEPT-S4.md §4).
 *
 * Vier Bilder neben der unveränderten Stärke: Verpflegung (4a), Nächste 24 h
 * (4h), Unterbringung (4b) und die Tafel „Bereiche · Schichten" (4c). Jedes
 * folgt den Regeln des Stärke-Monitors: eine große Zahl, wenige Worte,
 * Beschriftung über der Zahl, taktische Zeit darunter, Einsatz und Stand im
 * Fuß. Die Schrift kommt aus `schriftgroesse` — keine zweite Heuristik.
 *
 * Gerechnet wird nichts: Die Zahlen stehen in `Lagebild.versorgung`, die
 * Tafel und die Zeile der Zu- und Abgänge in der Versorgungsansicht.
 */

import { projektion, type Logistikzeile } from "@s1/domaene";

import { alter } from "./Statuszeile.js";
import { schriftgroesse } from "./monitorZahlen.js";
import type { Fenstermass } from "./Monitor.js";
import { mahlzeitText, nachtText, restzeitText, tagText, uhrzeitText, vorzeichen } from "./versorgungstext.js";
import type { Lagebild, Versorgungsansicht } from "../kontrakt/index.js";

export interface Ansichtseigenschaften {
  readonly lagebild: Lagebild;
  readonly jetzt: number;
  readonly zeit: string;
  readonly mass: Fenstermass;
  readonly ansicht?: Versorgungsansicht | undefined;
  readonly fusszusatz?: string;
}

function Fuss({ lagebild, jetzt, zusatz }: { readonly lagebild: Lagebild; readonly jetzt: number; readonly zusatz: string }): React.JSX.Element {
  return (
    <p className="monitorfuss">
      <span className="monitoreinsatz">{lagebild.einsatzName}</span>
      {" · "}
      <span className="monitorstand" title={lagebild.standHlc}>
        Stand: {lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt)}
      </span>
      {zusatz === "" ? "" : ` · ${zusatz}`}
    </p>
  );
}

function OhneZahlen({ titel, e }: { readonly titel: string; readonly e: Ansichtseigenschaften }): React.JSX.Element {
  return (
    <section className="monitor monitorruhig" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">{titel}</p>
      <p className="monitorhinweis">Noch keine Versorgungszahlen</p>
      <p className="monitorzeit">{e.zeit}</p>
    </section>
  );
}

/** Die Fensterhöhe, die die große Zahl bekommt, wenn darunter mehr steht als beim Stärkebild. */
const ANTEIL_GROSSE_ZAHL = 0.62;

/** 4a — Verpflegung: die nächste Mahlzeit, Portionen groß, Anmarsch daneben. */
export function MonitorVerpflegung(e: Ansichtseigenschaften): React.JSX.Element {
  const v = e.lagebild.versorgung;
  if (v?.naechste === undefined) return <OhneZahlen titel="Verpflegung" e={e} />;
  const n = v.naechste;
  const text = String(n.portionen);
  const grad = schriftgroesse(Math.max(text.length, 3), e.mass.breite, e.mass.hoehe * ANTEIL_GROSSE_ZAHL);
  return (
    <section className="monitor" aria-label="Monitor Verpflegung">
      <p className="monitorbeschriftung">Verpflegung · nächste Mahlzeit</p>
      <p className="monitorunterzeile">
        <strong>
          {mahlzeitText(n.mahlzeit, true)} {uhrzeitText(n.zeitpunkt)}
        </strong>{" "}
        · {restzeitText(n.zeitpunkt, e.jetzt)}
      </p>
      <p className="monitorstaerke" style={{ fontSize: `${String(grad)}px` }}>
        {text}
      </p>
      <p className="monitorbeschriftung">Portionen</p>
      <p className="monitorunterzeile">
        davon {n.vegetarisch} vegetarisch · {n.vegan} vegan
      </p>
      <Bestellzeile e={e} />
      {v.anmarsch > 0 && <p className="monitornebenzeile monitorwarn">Anmarsch +{v.anmarsch} nicht enthalten</p>}
      <p className="monitorzeit">{e.zeit}</p>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz="Zählung: alle erfassten Einheiten der Einsatzbereiche" />
    </section>
  );
}

/** „bestellt 280" unter den Portionen, sofern für die nächste Mahlzeit bestellt ist. */
function Bestellzeile({ e }: { readonly e: Ansichtseigenschaften }): React.JSX.Element | null {
  const m = e.lagebild.versorgung?.mahlzeiten[0];
  if (m?.bestellt === undefined) return null;
  return (
    <p className={m.differenz !== undefined && m.differenz < 0 ? "monitornebenzeile monitorwarn" : "monitornebenzeile"}>
      bestellt {m.bestellt}
      {m.differenz !== undefined && m.differenz < 0 ? ` · Vorausschau ${String(m.portionen)}, es fehlen ${String(-m.differenz)}` : ""}
    </p>
  );
}

/** Die Zelle „Bestellt" der Tafel 4h: Menge und Differenz, Bernstein, wenn Portionen fehlen. */
function Bestelltzelle({ bestellt, differenz }: { readonly bestellt?: number; readonly differenz?: number }): React.JSX.Element {
  if (bestellt === undefined) return <td className="trenner monitorleise">offen</td>;
  const d = differenz ?? 0;
  return (
    <td className={d < 0 ? "trenner monitorwarn" : "trenner"}>
      {bestellt}
      {d === 0 ? "" : ` · ${d > 0 ? "+" : "−"}${String(Math.abs(d))}`}
    </td>
  );
}

/** 4b — Unterbringung: die Betten der Nacht, m/w/d darunter. */
export function MonitorUnterbringung(e: Ansichtseigenschaften): React.JSX.Element {
  const v = e.lagebild.versorgung;
  if (v === undefined) return <OhneZahlen titel="Unterbringung" e={e} />;
  const text = String(v.betten.gesamt);
  const grad = schriftgroesse(Math.max(text.length, 3), e.mass.breite, e.mass.hoehe * ANTEIL_GROSSE_ZAHL);
  return (
    <section className="monitor" aria-label="Monitor Unterbringung">
      <p className="monitorbeschriftung">Unterbringung · {nachtText(e.jetzt)}</p>
      <p className="monitorstaerke" style={{ fontSize: `${String(grad)}px` }}>
        {text}
      </p>
      <p className="monitorbeschriftung">Betten benötigt</p>
      <p className="monitorunterzeile">
        m {v.betten.m} · w {v.betten.w} · d {v.betten.d}
      </p>
      {(v.belegt !== undefined || (v.ohneZuweisung ?? 0) > 0) && (
        <p className="monitornebenzeile">
          {v.belegt === undefined ? "" : `belegt ${String(v.belegt)} · frei ${String(v.frei ?? 0)}`}
          {(v.ohneZuweisung ?? 0) > 0 && (
            <span className="monitorwarn">
              {v.belegt === undefined ? "" : " · "}ohne Zuweisung {v.ohneZuweisung} ({v.ohneZuweisungEinheiten ?? 0} Einheiten)
            </span>
          )}
        </p>
      )}
      <Unterkunftszeilen e={e} />
      <p className="monitorzeit">{e.zeit}</p>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz="Bedarf aus Bogen (Unterbringung ja) und Personen, Overrides je Einheit" />
    </section>
  );
}

/** Die Unterkünfte unter den Betten: belegt/Kapazität und m/w/d, höchstens fünf. */
function Unterkunftszeilen({ e }: { readonly e: Ansichtseigenschaften }): React.JSX.Element | null {
  const karten = (e.ansicht?.blatt.belegung.unterkuenfte ?? []).filter((k) => !k.aufgeloest).slice(0, 5);
  if (karten.length === 0) return null;
  return (
    <table className="monitorunterkuenfte" style={{ fontSize: `${String(tafelgrad(e.mass, 56, karten.length + 9))}px` }}>
      <tbody>
        {karten.map((k) => (
          <tr key={k.unterkunftId} className={k.ueberbelegt ? "monitorwarn" : undefined}>
            <th scope="row">{k.name}</th>
            <td>
              {k.belegt.gesamt} / {k.kapazitaet}
            </td>
            <td className="trenner">{k.belegt.gesamt === 0 ? "—" : `m ${String(k.belegt.m)} · w ${String(k.belegt.w)} · d ${String(k.belegt.d)}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Wie groß eine Tafelzeile sein darf: so breit wie die Zeile, so hoch wie die Zeilenzahl erlaubt. */
function tafelgrad(mass: Fenstermass, zeichen: number, zeilen: number): number {
  return Math.min(schriftgroesse(zeichen, mass.breite, mass.hoehe), Math.floor(mass.hoehe / (zeilen * 1.9 + 6)));
}

/** 4h — Nächste 24 h: eine Zeile je Mahlzeit in Zeitfolge, die nächste fett. */
export function MonitorVorausschau(e: Ansichtseigenschaften): React.JSX.Element {
  const v = e.lagebild.versorgung;
  if (v === undefined || v.mahlzeiten.length === 0) return <OhneZahlen titel="Nächste 24 h" e={e} />;
  // 78 Zeichen: Bezeichnung mit Tag und Restzeit plus sieben Zahlenspalten
  // samt Zellabstand — so passt die Zeile auch bei 960 px ohne Anschnitt.
  const grad = tafelgrad(e.mass, 78, v.mahlzeiten.length + 1);
  const bewegungen = e.ansicht?.blatt.vorausschau.bewegungen ?? [];
  return (
    <section className="monitor monitortafel" aria-label="Monitor Nächste 24 h">
      <p className="monitorbeschriftung">Verpflegung · nächste 24 h · Vorausschau</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">Mahlzeit</th>
            <th scope="col">Portionen</th>
            <th scope="col">Veg.</th>
            <th scope="col">Vegan</th>
            <th scope="col" className="trenner">Bestand</th>
            <th scope="col">Zugang</th>
            <th scope="col">Abgang</th>
            <th scope="col" className="trenner">Bestellt</th>
          </tr>
        </thead>
        <tbody>
          {v.mahlzeiten.map((m, i) => (
            <tr key={m.zeitpunkt} className={i === 0 ? "naechste" : undefined}>
              <th scope="row">
                {mahlzeitText(m.mahlzeit)} {uhrzeitText(m.zeitpunkt)}{" "}
                <small>
                  {tagText(m.zeitpunkt, e.jetzt)}
                  {i === 0 ? ` · ${restzeitText(m.zeitpunkt, e.jetzt)}` : ""}
                </small>
              </th>
              <td>{m.portionen}</td>
              <td>{m.vegetarisch}</td>
              <td>{m.vegan}</td>
              <td className="trenner">{m.bestand}</td>
              <td>{vorzeichen(m.zugang, "plus")}</td>
              <td>{vorzeichen(m.abgang, "minus")}</td>
              <Bestelltzelle {...(m.bestellt === undefined ? {} : { bestellt: m.bestellt })} {...(m.differenz === undefined ? {} : { differenz: m.differenz })} />
            </tr>
          ))}
        </tbody>
      </table>
      {bewegungen.length > 0 && (
        <p className="monitornebenzeile">
          {bewegungen
            .map((b) => `${b.einheit} ${b.art === "ABGANG" ? "−" : "+"}${String(b.koepfe)} ${b.zeitpunkt === undefined ? "ohne Zeit" : `ab ${uhrzeitText(b.zeitpunkt)}`}`)
            .join(" · ")}
        </p>
      )}
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit} · ohne gemeldete Zeit zählt nichts`} />
    </section>
  );
}

/** Die Schichtspalten der Tafel: Früh und Spät nur, wenn eine Einheit sie trägt. */
function tafelschichten(gesamt: Logistikzeile): readonly string[] {
  return projektion.LOG_SCHICHTEN.filter((s) => s === "TAG" || s === "NACHT" || (gesamt.jeSchicht[s] ?? 0) > 0);
}

const SCHICHTKOPF: Readonly<Record<string, string>> = { FRUEH: "Früh", SPAET: "Spät", TAG: "Tag", NACHT: "Nacht" };

function Tafelzeile({ z, schichten, klasse }: { readonly z: Logistikzeile; readonly schichten: readonly string[]; readonly klasse?: string }): React.JSX.Element {
  const anmarsch = klasse === "anmarsch";
  return (
    <tr className={klasse}>
      <th scope="row">{z.name}</th>
      {schichten.map((s) => (
        <td key={s}>{anmarsch ? "—" : (z.jeSchicht[s] ?? 0)}</td>
      ))}
      <td>{z.gesamt}</td>
      <td className="trenner">{z.vegetarisch}</td>
      <td>{z.vegan}</td>
      <td className="trenner">{z.uebernachtung.m}</td>
      <td>{z.uebernachtung.w}</td>
      <td>{z.uebernachtung.d}</td>
    </tr>
  );
}

/** 4c — die Tafel: das Logistikblatt in groß, Anmarsch abgesetzt darunter. */
export function MonitorTafel(e: Ansichtseigenschaften): React.JSX.Element {
  const blatt = e.ansicht?.logistik;
  if (blatt === undefined) return <OhneZahlen titel="Bereiche · Schichten" e={e} />;
  const schichten = tafelschichten(blatt.gesamt);
  const grad = tafelgrad(e.mass, 52, blatt.zeilen.length + 3);
  return (
    <section className="monitor monitortafel" aria-label="Monitor Bereiche · Schichten">
      <p className="monitorbeschriftung">Bereiche und Schichten · Köpfe, Kostform, Betten</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">Bereich</th>
            {schichten.map((s) => (
              <th key={s} scope="col">
                {SCHICHTKOPF[s]}
              </th>
            ))}
            <th scope="col">Summe</th>
            <th scope="col" className="trenner">Veg.</th>
            <th scope="col">Vegan</th>
            <th scope="col" className="trenner">ÜN m</th>
            <th scope="col">ÜN w</th>
            <th scope="col">ÜN d</th>
          </tr>
        </thead>
        <tbody>
          {blatt.zeilen.map((z) => (
            <Tafelzeile key={z.abschnittId} z={z} schichten={schichten} />
          ))}
          <Tafelzeile z={blatt.gesamt} schichten={schichten} klasse="summe" />
          <Tafelzeile z={blatt.angefordert} schichten={schichten} klasse="anmarsch" />
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit}${e.fusszusatz ?? ""}`} />
    </section>
  );
}
