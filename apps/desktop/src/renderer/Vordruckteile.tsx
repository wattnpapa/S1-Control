/**
 * Die Teile des Nachrichtenvordrucks, die Maske und Ansicht teilen
 * (KONZEPT-NACHRICHTEN.md §3, §6).
 *
 * Der Vordruck ist in drei Teile geteilt: oben die Vermerke der FmZ (Feld 1
 * bis 6), in der Mitte die Nachricht (Feld 7 bis 17), unten der Laufzettel
 * mit Quittung, Verteiler und Vermerken (Feld 18 bis 20). Maske und Ansicht
 * zeigen ihn in dieser Anordnung, nicht als Formular mit zwanzig Feldern
 * untereinander; wer den Papiervordruck kennt, findet jedes Feld dort, wo er
 * es sucht. Die Teile, die an diesem Platz niemand ausfüllt, stehen grau und
 * schreibgeschützt.
 */

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { dtg, kopieklasse, stellenname } from "./nachrichtenformate.js";

/** Ein Kästchen des Vordrucks als Anzeige — Kreuz und Wort, nicht nur Farbe. */
export function Kaestchen({ an, text }: { readonly an: boolean; readonly text: string }): React.JSX.Element {
  return (
    <span className={an ? "kaestchen an" : "kaestchen"} aria-label={`${text}: ${an ? "angekreuzt" : "leer"}`}>
      <span aria-hidden="true">{an ? "☒" : "☐"}</span> {text}
    </span>
  );
}

function Wert({ titel, wert }: { readonly titel: string; readonly wert: string | undefined }): React.JSX.Element {
  return (
    <span className="vordruckwert">
      <span className="vordrucktitel">{titel}</span> {wert === undefined || wert === "" ? "—" : wert}
    </span>
  );
}

function vermerk(v: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string | undefined {
  return v === undefined ? undefined : `${dtg(v.zeitpunkt)} ${v.handzeichen}`.trim();
}

/** „Fm2 · Funk an HK · 1030 LdF" — der Vorschlag des LdF in einer Zeile. */
export function vorschlagText(zeile: Nachrichtenzeile | undefined): string | undefined {
  const v = zeile?.vorschlag;
  if (v === undefined) return undefined;
  const gegen = v.gegenstelle === undefined ? "" : ` an ${v.gegenstelle}`;
  return `${v.fernmelder} · ${projektion.mittelWort(v.mittel)}${gegen} · ${vermerk(v) ?? ""}`;
}

/** Der obere Teil (Feld 1 bis 6): grau und schreibgeschützt, solange dieser Platz nicht FmZ ist. */
export function FmzTeil({ zeile }: { readonly zeile?: Nachrichtenzeile | undefined }): React.JSX.Element {
  // Feld 1: das tatsächliche Mittel, sonst der Vorschlag des LdF (additiv, 2026-11-17).
  const mittel = zeile?.aufnahme?.mittel ?? zeile?.befoerderung?.mittel ?? zeile?.vorschlag?.mittel;
  return (
    <fieldset className="vordruckteil grau" disabled aria-label="Vermerke der Fernmeldezentrale">
      <legend>Fernmeldezentrale</legend>
      <Wert titel="Mittel" wert={mittel === undefined ? undefined : projektion.mittelWort(mittel)} />
      <Wert titel="Aufnahme" wert={vermerk(zeile?.aufnahme)} />
      <Wert titel="Annahme" wert={vermerk(zeile?.annahme)} />
      <Wert titel="Vorschlag LdF" wert={vorschlagText(zeile)} />
      <Wert titel="Beförderung" wert={vermerk(zeile?.befoerderung)} />
      {/* Eine gemeinsame Zählung für Eingang und Ausgang: „Nr.“ ohne Zusatz, die Richtung steht für sich (Audits ETB P3-2, LdF P3-1). */}
      <Wert titel="Nr." wert={zeile?.nummer === undefined ? undefined : String(zeile.nummer)} />
      <Wert titel="Richtung" wert={zeile === undefined ? undefined : zeile.richtungKurz === "A" ? "Ausgang" : "Eingang"} />
      <Wert titel="Gegenstelle" wert={zeile?.gegenstelle} />
      {zeile?.weitergabe !== undefined && <Wert titel="Weitergabe (LdF)" wert={vermerk(zeile.weitergabe)} />}
    </fieldset>
  );
}

/**
 * Was bei leerem Verteiler steht. Ein Ausgang läuft nicht zum Sichter (Vorbelegung
 * nein, Entscheidung 8): „noch nicht gesichtet“ wäre irreführend (Audit SGL P3-18).
 * Die Kopien kommen bei ihm erst mit der Beförderung.
 */
export function verteilerleer(zeile: Nachrichtenzeile | undefined, gesichtet: boolean): string {
  if (gesichtet) return "ohne Verteiler";
  return zeile?.richtungKurz === "A" ? "entfällt (Ausgang), Kopien mit der Beförderung" : "noch nicht gesichtet";
}

/** Der untere Teil (Feld 18 bis 20) zum Lesen: Quittung, Verteiler mit Kopiefarbe und Marken, Vermerke. */
export function LaufzettelAnzeige({ zeile }: { readonly zeile?: Nachrichtenzeile | undefined }): React.JSX.Element {
  const sichtung = zeile?.sichtung;
  return (
    <fieldset className="vordruckteil grau" disabled aria-label="Laufzettel">
      <legend>Laufzettel</legend>
      <Wert titel="Quittung" wert={vermerk(sichtung)} />
      {/* Zwei Sichter ohne Abgleich (§5): beide Quittungen, der Verteiler ist die Vereinigung. */}
      {zeile?.zweiteSichtung !== undefined && <Wert titel="Zweite Sichtung" wert={vermerk(zeile.zweiteSichtung)} />}
      {zeile === undefined || zeile.verteiler.length === 0 ? (
        <Wert titel="Verteiler" wert={verteilerleer(zeile, sichtung !== undefined)} />
      ) : (
        <ul className="verteileranzeige" aria-label="Verteiler">
          {zeile.verteiler.map((m) => (
            <li key={m.stelle} className={kopieklasse(m.kopie)}>
              {stellenname(m.stelle)} · {projektion.kopieWort(m.kopie)}
              {m.gelesen ? ` · gelesen${m.kenntnis === undefined ? "" : ` ${dtg(m.kenntnis.zeitpunkt)} ${m.kenntnis.handzeichen}`}` : " · neu"}
              {m.erledigt && " · erledigt"}
            </li>
          ))}
        </ul>
      )}
      <Wert titel="Vermerke" wert={zeile?.vermerke} />
    </fieldset>
  );
}

/** Der mittlere Teil zum Lesen (Feld 7 bis 17). */
export function NachrichtenteilAnzeige({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element {
  return (
    <fieldset className="vordruckteil" aria-label="Nachricht">
      <legend>Nachricht</legend>
      <div className="kaestchenzeile">
        <Kaestchen an={zeile.uebermittlungswunsch !== undefined} text={zeile.uebermittlungswunsch === undefined ? "Übermittlung" : projektion.mittelWort(zeile.uebermittlungswunsch)} />
        <Kaestchen an={zeile.art === "SPRUCH"} text="Spruch" />
        <Kaestchen an={zeile.art === "DURCHSAGE"} text="Durchsage" />
        <Kaestchen an={zeile.vorrang === "SOFORT"} text="Sofort" />
        <Kaestchen an={zeile.vorrang === "BLITZ"} text="Blitz" />
        <Kaestchen an={zeile.gespraechsnotiz} text="Gesprächsnotiz" />
      </div>
      <Wert titel="Anschrift" wert={zeile.anschrift} />
      <Wert titel="Ruf-Nr." wert={zeile.rufnummer} />
      <Wert titel="Betreff" wert={zeile.betreff} />
      <pre className="vordruckinhalt" aria-label="Inhalt">
        {zeile.inhalt}
      </pre>
      <Wert titel="Absender" wert={zeile.absender} />
      <Wert titel="Abfassungszeit" wert={dtg(zeile.abfassungszeit)} />
      <Wert titel="Zeichen" wert={zeile.zeichen} />
      <Wert titel="Funktion" wert={zeile.funktion} />
    </fieldset>
  );
}
