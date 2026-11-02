/**
 * Die Karte „Zuordnung" des Blattes „Funkplan" (Option 5b, rechts).
 *
 * **Je Rufgruppe**: alle Einheiten, gruppiert nach Hauptrufgruppe wie die
 * Gliederung der Einheitentabelle nach Bereichen, mit Kopfzeile je Gruppe
 * (Marke, Name, Zweck, Teilnehmerzahl, Gateway, hört). Die Gruppe „ohne
 * Rufgruppe" steht immer zuletzt und immer sichtbar, auch leer — dort
 * beginnt die Arbeit nach jeder Ankunft. **Je Bereich**: dieselben Zeilen nach
 * Bereich gruppiert, die Sicht des S1, der fragt, ob sein Abschnitt
 * vollständig erreichbar ist.
 *
 * F2: Unter jeder Gruppe stehen nach den Teilnehmern die Mithörer — Einheiten,
 * die sie als weitere Gruppe tragen —, gekennzeichnet und nicht gezählt; in
 * der Sicht „Je Bereich" stehen die weiteren Gruppen als „auch: …" hinter der
 * Hauptgruppe. Der Funkhinweis ist eine Textzelle wie in der
 * Einheitentabelle; „Bereich ≠ Gruppe" bleibt ein eigener Hinweis.
 *
 * Der Name der Einheit öffnet die Maske „Funk und Erreichbarkeit"
 * (Doppelklick, Enter oder ✎), wie die Lage sie über „Funk …" öffnet.
 *
 * F3: „Letzter Kontakt" als Marke — Bernstein über der Schwelle, mit Alter —
 * und „kein Kontakt" daneben. Ein Klick markiert die Zeile; die markierte
 * Einheit ist die, für die „Funkprobe eintragen" (Strg+P) schreibt.
 *
 * Gerechnet wird nichts: Die Gruppen, die Reihenfolge und der Hinweis
 * „Bereich ≠ Gruppe" kommen aus `projektion.funkplan`. Funkrufname und
 * Erreichbarkeit sind hier Ableitungen und werden nur gelesen.
 */

import { statusTitel, statusTon, type Funkplan, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import { Funkhinweiszelle } from "./Funkhinweiszelle.js";
import { Betriebsartmarke, KeinKontaktmarke, Kontaktmarke, OhneRufgruppe, teilnehmerKontaktmarke } from "./Funkmarken.js";
import { Rufgruppenzelle } from "./Rufgruppenzelle.js";
import { einheitenText } from "./versorgungstext.js";

/** Die drei Sichten des Blattes; „Funkproben" zeigt `Funkprobenliste.tsx`, die beiden anderen diese Karte. */
export type Funksicht = "rufgruppe" | "bereich" | "funkproben";
export type Zuordnungssicht = Exclude<Funksicht, "funkproben">;

const SPALTEN = ["Einheit", "Bereich", "Status", "Rufgruppe", "Funkrufname", "Erreichbarkeit", "Funkhinweis", "Hinweis", "Letzter Kontakt"] as const;

export interface FunkzuordnungEigenschaften {
  readonly plan: Funkplan;
  readonly sicht: Zuordnungssicht;
  /** Die Uhr der Ansicht (Worker), gegen die das Alter des letzten Kontakts steht. */
  readonly jetzt: string;
  /** Die markierte Einheit — Ziel von „Funkprobe eintragen". */
  readonly markiertId: string | undefined;
  readonly aufMarkieren: (teilnehmer: Funkteilnehmer) => void;
  readonly nurLesen: boolean;
  readonly aufNeu: (teilnehmer: Funkteilnehmer) => void;
  /** Öffnet „Funk und Erreichbarkeit" der Einheit (Doppelklick auf den Namen oder ✎). */
  readonly aufEinheit: (teilnehmer: Funkteilnehmer) => void;
}

/** Der Name der Einheit: Doppelklick, Enter oder ✎ öffnen die Maske „Funk und Erreichbarkeit". */
function Einheitenname({ t, aufEinheit, mithoerer }: { readonly t: Funkteilnehmer; readonly aufEinheit: (t: Funkteilnehmer) => void; readonly mithoerer: boolean }): React.JSX.Element {
  return (
    <th
      scope="row"
      tabIndex={0}
      title="Doppelklick oder Enter: Funk und Erreichbarkeit bearbeiten"
      onDoubleClick={() => aufEinheit(t)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) aufEinheit(t);
      }}
    >
      {t.einheit}{" "}
      {mithoerer && <span className="marke-zustand">hört mit</span>}{" "}
      <button type="button" className="symbolknopf" aria-label={`Funk und Erreichbarkeit von ${t.einheit} bearbeiten`} title="Einheit bearbeiten: Funk und Erreichbarkeit" onClick={() => aufEinheit(t)}>
        ✎
      </button>
    </th>
  );
}

interface ZeilenEigenschaften extends Omit<FunkzuordnungEigenschaften, "sicht"> {
  readonly t: Funkteilnehmer;
  /** Unter einer weiteren Gruppe: hört mit, wird dort nicht gerufen. */
  readonly mithoerer?: boolean;
  readonly mitWeiteren?: boolean;
}

function Zeile(props: ZeilenEigenschaften): React.JSX.Element {
  const { t } = props;
  const markiert = props.markiertId === t.einheitId && props.mithoerer !== true;
  const klassen = [t.erwartet ? "erwartet" : "", props.mithoerer === true ? "mithoerer" : "", markiert ? "gewaehlt" : ""].filter((k) => k !== "").join(" ");
  return (
    <tr className={klassen === "" ? undefined : klassen} aria-selected={markiert} onClick={() => props.aufMarkieren(t)}>
      <Einheitenname t={t} aufEinheit={props.aufEinheit} mithoerer={props.mithoerer === true} />
      <td className="leise">{t.bereich}</td>
      <td>
        <span className={`marke-zustand ${statusTon(t.status)}`}>{t.status === "" ? "—" : statusTitel(t.status)}</span>
      </td>
      <Rufgruppenzelle teilnehmer={t} rufgruppen={props.plan.rufgruppen} nurLesen={props.nurLesen} aufNeu={props.aufNeu} mitWeiteren={props.mitWeiteren === true} />
      <td className="mono">{t.funkrufname === "" ? "—" : t.funkrufname}</td>
      <td className="leise">{t.erreichbarkeit === "" ? "—" : t.erreichbarkeit}</td>
      <Funkhinweiszelle teilnehmer={t} nurLesen={props.nurLesen} />
      <td>{t.hinweis === "" ? <span className="leise">—</span> : <span className="marke-zustand warn">{t.hinweis}</span>}</td>
      <td className="kontaktzelle">
        <Kontaktmarke marke={teilnehmerKontaktmarke(t, props.jetzt, props.plan.schwelleMinuten)} />
        <KeinKontaktmarke t={t} />
      </td>
    </tr>
  );
}

function Kopf({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <tr className="gruppenkopf">
      <th scope="rowgroup" colSpan={SPALTEN.length}>
        {children}
      </th>
    </tr>
  );
}

function gruppenzusatz(r: Rufgruppenkarte): string {
  const mit = r.mithoerer.length === 0 ? undefined : `${String(r.mithoerer.length)} hören mit`;
  const teile = [r.zweck, `${String(r.teilnehmer.length)} Teilnehmer`, mit, r.gateway === undefined ? undefined : `Gateway ${r.gateway}`, r.hoert === undefined ? undefined : `hört ${r.hoert}`];
  return teile.filter((t): t is string => t !== undefined).join(" · ");
}

function JeRufgruppe(props: Omit<FunkzuordnungEigenschaften, "sicht">): React.JSX.Element {
  const { plan } = props;
  return (
    <>
      {plan.rufgruppen
        .filter((r) => !r.aufgeloest)
        .map((r) => (
          <tbody key={r.rufgruppeId} aria-label={`Rufgruppe ${r.name}`}>
            <Kopf>
              <Betriebsartmarke betriebsart={r.betriebsart} /> <span className="mono">{r.name}</span> <small>{gruppenzusatz(r)}</small>
            </Kopf>
            {r.teilnehmer.map((t) => (
              <Zeile key={t.einheitId} t={t} {...props} />
            ))}
            {r.mithoerer.map((t) => (
              <Zeile key={`mit-${t.einheitId}`} t={t} {...props} mithoerer />
            ))}
          </tbody>
        ))}
      <tbody aria-label="ohne Rufgruppe">
        <Kopf>
          <OhneRufgruppe lang /> <small>{einheitenText(plan.ohneRufgruppe.length)} · hier beginnt die Arbeit</small>
        </Kopf>
        {plan.ohneRufgruppe.map((t) => (
          <Zeile key={t.einheitId} t={t} {...props} />
        ))}
      </tbody>
    </>
  );
}

function JeBereich(props: Omit<FunkzuordnungEigenschaften, "sicht">): React.JSX.Element {
  return (
    <>
      {props.plan.jeBereich.map((b) => {
        const ohne = b.teilnehmer.filter((t) => t.rufgruppeId === undefined || t.rufgruppeAufgeloest).length;
        return (
          <tbody key={b.abschnittId} aria-label={`Bereich ${b.name}`}>
            <Kopf>
              {b.name} <small>{einheitenText(b.teilnehmer.length)}{ohne > 0 ? ` · ${String(ohne)} ohne Rufgruppe` : " · alle erreichbar"}</small>
            </Kopf>
            {b.teilnehmer.map((t) => (
              <Zeile key={t.einheitId} t={t} {...props} mitWeiteren />
            ))}
          </tbody>
        );
      })}
    </>
  );
}

export function Funkzuordnung({ sicht, ...props }: FunkzuordnungEigenschaften): React.JSX.Element {
  const { plan } = props;
  const zugeordnet = plan.rufgruppen.reduce((summe, r) => summe + r.teilnehmer.length, 0);
  return (
    <section className="karte funkkarte zuordnungskarte" aria-label="Zuordnung">
      <h3>
        Zuordnung {sicht === "rufgruppe" ? "je Rufgruppe" : "je Bereich"}{" "}
        <span className="leise">
          · {einheitenText(zugeordnet + plan.ohneRufgruppe.length)} · {plan.ohneRufgruppe.length} ohne Rufgruppe
        </span>
      </h3>
      <div className="tabellenrahmen">
        <table className="funktabelle zuordnung" aria-label={sicht === "rufgruppe" ? "Zuordnung je Rufgruppe" : "Zuordnung je Bereich"}>
          <thead>
            <tr>
              {SPALTEN.map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          {sicht === "rufgruppe" ? <JeRufgruppe {...props} /> : <JeBereich {...props} />}
        </table>
      </div>
      <p className="hinweistext">
        Zuordnung = Hauptrufgruppe der Einheit: die Gruppe, über die die Führungsstelle sie ruft; „hört mit“ steht, wer die Gruppe als weitere trägt.
        Doppelklick auf Rufgruppe oder Funkhinweis bearbeitet die Zelle · Enter schreibt · Esc verwirft. Funkrufname und Erreichbarkeit kommen aus
        Fahrzeug und Führungskraft; überschrieben werden sie in der Maske der Einheit (Doppelklick auf den Namen). „Letzter Kontakt“ ist die jüngere
        von Funkprobe und Statusmeldung; älter als {props.plan.schwelleMinuten} Minuten wird Bernstein. Klick markiert eine Einheit für „Funkprobe eintragen“.
      </p>
    </section>
  );
}
