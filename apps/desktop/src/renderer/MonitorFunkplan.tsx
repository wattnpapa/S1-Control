/**
 * Die Monitoransicht „Funkplan" (KONZEPT-FUNKPLAN.md §4, Option 5a).
 *
 * Keine große Zahl: Die Frage der Sprechfunker ist eine Zuordnung — wer ist
 * auf welcher Rufgruppe. Die Ansicht folgt deshalb der Tafel „Bereiche ·
 * Schichten": Beschriftung oben, eine Zeile je geltender Rufgruppe, Fuß mit
 * Einsatz, Stand und taktischer Zeit. Links der Name groß in Mono mit der
 * Betriebsart (DMO Bernstein, Analog gestrichelt), darunter Zweck, Gateway und
 * wer abhört; rechts die Teilnehmer als Kacheln mit Bezeichnung und
 * Funkrufname. Die linke Kante einer Kachel trägt den Einheitenstatus, ein
 * Bernsteinrahmen heißt „kein Kontakt über der Schwelle", mit der Zeit des
 * letzten Kontakts im Kleingedruckten. Wer die Gruppe nur als weitere trägt,
 * steht gestrichelt mit „hört mit" dabei.
 *
 * Aufgelöste Rufgruppen stehen nicht an der Wand. Eine Gruppe ohne
 * Teilnehmer bleibt mit leerer Zelle stehen — sie ist dann gerade die Frage.
 * Viele Gruppen verkleinern die Schrift (`funktafelmass.ts`), statt zu
 * blättern. Der Fuß nennt in Bernstein, was ansteht: Einheiten ohne
 * Rufgruppe mit Namen und die Zahl ohne Kontakt.
 *
 * Gerechnet wird nichts: Kacheln, Zahlen und Schwelle kommen aus der
 * Funkplanansicht des Workers, gegen seine Uhr.
 */

import { statusTon, type Funkplan, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import { Betriebsartmarke } from "./Funkmarken.js";
import { Fuss, OhneZahlen, type Ansichtseigenschaften } from "./Monitoransichten.js";
import { funktafelgrad, kachelzeile, rufgruppenbreite, rufgruppenzeile } from "./funktafelmass.js";
import { ZEICHENBREITE } from "./monitorZahlen.js";

/** So viele Namen ohne Rufgruppe nennt der Fuß; der Rest steht als Zahl. */
export const FUSS_NAMEN = 3;

/** „Ohne Rufgruppe: 2 (A, B) · kein Kontakt > 60 min: 1" — nur, was ansteht. */
export function fusswarnung(plan: Funkplan): string {
  const teile: string[] = [];
  const ohne = plan.ohneRufgruppe;
  if (ohne.length > 0) {
    const namen = ohne.slice(0, FUSS_NAMEN).map((t) => t.einheit);
    const rest = ohne.length - namen.length;
    teile.push(`Ohne Rufgruppe: ${String(ohne.length)} (${namen.join(", ")}${rest > 0 ? ` und ${String(rest)} weitere` : ""})`);
  }
  // Geschützte Leerzeichen: „kein Kontakt > 60 min: 1" bricht nicht mitten durch.
  if (plan.zahlen.ohneKontakt > 0) teile.push(`kein Kontakt > ${String(plan.schwelleMinuten)} min: ${String(plan.zahlen.ohneKontakt)}`.replaceAll(" ", "\u00a0"));
  return teile.join(" · ");
}

function kachelklasse(t: Funkteilnehmer, mithoerer: boolean): string {
  // `ton-…` und nicht `fehler`/`warn`: Die gibt es im Arbeitsplatz als
  // Textfarbe, und eine rote Bezeichnung hieße an der Wand etwas anderes.
  return ["funkkachel", `ton-${statusTon(t.status)}`, t.letzterKontakt?.ueberSchwelle === true ? "still" : "", mithoerer ? "mithoerer" : ""]
    .filter((k) => k !== "")
    .join(" ");
}

function Kachel({ t, mithoerer = false }: { readonly t: Funkteilnehmer; readonly mithoerer?: boolean }): React.JSX.Element {
  const zeile = kachelzeile(t, mithoerer);
  return (
    <li className={kachelklasse(t, mithoerer)}>
      <span className="funkkachelname">{t.einheit}</span>
      <small>
        {zeile.leise.length === 0 && zeile.warn.length === 0 ? "—" : zeile.leise.join(" · ")}
        {zeile.warn.length > 0 && (
          <span className="monitorwarn">
            {zeile.leise.length > 0 ? " · " : ""}
            {zeile.warn.join(" · ")}
          </span>
        )}
      </small>
    </li>
  );
}

function Rufgruppenzeile({ r, breite }: { readonly r: Rufgruppenkarte; readonly breite: number }): React.JSX.Element {
  const beschreibung = rufgruppenzeile(r);
  return (
    <tr>
      <th scope="row" style={{ width: `${breite.toFixed(1)}em` }}>
        <span className="funkname">{r.name}</span> <Betriebsartmarke betriebsart={r.betriebsart} />
        {beschreibung !== "" && <small>{beschreibung}</small>}
      </th>
      <td>
        {r.teilnehmer.length + r.mithoerer.length > 0 && (
          <ul className="funkkacheln" aria-label={`Teilnehmer ${r.name}`}>
            {r.teilnehmer.map((t) => (
              <Kachel key={t.einheitId} t={t} />
            ))}
            {r.mithoerer.map((t) => (
              <Kachel key={`m-${t.einheitId}`} t={t} mithoerer />
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

/** Die Ansicht „Funkplan": eine Zeile je geltender Rufgruppe, Teilnehmer als Kacheln. */
export function MonitorFunkplan(e: Ansichtseigenschaften): React.JSX.Element {
  const plan = e.funkplan?.plan;
  if (plan === undefined) {
    const keine = (e.lagebild.funk?.rufgruppen ?? 0) === 0;
    return <OhneZahlen titel="Funkplan" e={e} hinweis={keine ? "Noch keine Rufgruppen" : "Funkplan wird geholt …"} />;
  }
  const gruppen = plan.rufgruppen.filter((r) => !r.aufgeloest);
  if (gruppen.length === 0) return <OhneZahlen titel="Funkplan" e={e} hinweis="Noch keine Rufgruppen" />;
  const warnung = fusswarnung(plan);
  const zusatz = `${e.zeit}${e.fusszusatz ?? ""}`;
  const fusszeichen = warnung.length + e.lagebild.einsatzName.length + zusatz.length + 24;
  const grad = funktafelgrad(e.mass, gruppen, fusszeichen);
  // Die Spalte bekommt die geschätzte Breite, damit Zweck und „hört"
  // darunter umbrechen, statt die Kacheln zu verdrängen.
  const breite = rufgruppenbreite(gruppen) * ZEICHENBREITE;
  return (
    <section className="monitor monitorfunkplan" aria-label="Monitor Funkplan">
      <p className="monitorbeschriftung">Funkplan · wer ist auf welcher Rufgruppe</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">Rufgruppe · Betrieb · hört</th>
            <th scope="col">Teilnehmer</th>
          </tr>
        </thead>
        <tbody>
          {gruppen.map((r) => (
            <Rufgruppenzeile key={r.rufgruppeId} r={r} breite={breite} />
          ))}
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={zusatz} {...(warnung === "" ? {} : { vorne: <span className="monitorwarn">{warnung}</span> })} />
    </section>
  );
}
