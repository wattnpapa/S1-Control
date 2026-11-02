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
 * Der Name der Einheit öffnet die Maske „Funk und Erreichbarkeit"
 * (Doppelklick, Enter oder ✎), wie die Lage sie über „Funk …" öffnet.
 *
 * Gerechnet wird nichts: Die Gruppen, die Reihenfolge und der Hinweis
 * „Bereich ≠ Gruppe" kommen aus `projektion.funkplan`. Funkrufname und
 * Erreichbarkeit sind hier Ableitungen und werden nur gelesen.
 */

import { statusTitel, statusTon, type Funkplan, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import { Betriebsartmarke, OhneRufgruppe } from "./Funkmarken.js";
import { Rufgruppenzelle } from "./Rufgruppenzelle.js";
import { einheitenText } from "./versorgungstext.js";

export type Funksicht = "rufgruppe" | "bereich";

const SPALTEN = ["Einheit", "Bereich", "Status", "Rufgruppe", "Funkrufname", "Erreichbarkeit", "Hinweis"] as const;

export interface FunkzuordnungEigenschaften {
  readonly plan: Funkplan;
  readonly sicht: Funksicht;
  readonly nurLesen: boolean;
  readonly aufNeu: (teilnehmer: Funkteilnehmer) => void;
  /** Öffnet „Funk und Erreichbarkeit" der Einheit (Doppelklick auf den Namen oder ✎). */
  readonly aufEinheit: (teilnehmer: Funkteilnehmer) => void;
}

/** Der Name der Einheit: Doppelklick, Enter oder ✎ öffnen die Maske „Funk und Erreichbarkeit". */
function Einheitenname({ t, aufEinheit }: { readonly t: Funkteilnehmer; readonly aufEinheit: (t: Funkteilnehmer) => void }): React.JSX.Element {
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
      <button type="button" className="symbolknopf" aria-label={`Funk und Erreichbarkeit von ${t.einheit} bearbeiten`} title="Einheit bearbeiten: Funk und Erreichbarkeit" onClick={() => aufEinheit(t)}>
        ✎
      </button>
    </th>
  );
}

function Zeile(props: { readonly t: Funkteilnehmer } & Omit<FunkzuordnungEigenschaften, "sicht">): React.JSX.Element {
  const { t } = props;
  return (
    <tr className={t.erwartet ? "erwartet" : undefined}>
      <Einheitenname t={t} aufEinheit={props.aufEinheit} />
      <td className="leise">{t.bereich}</td>
      <td>
        <span className={`marke-zustand ${statusTon(t.status)}`}>{t.status === "" ? "—" : statusTitel(t.status)}</span>
      </td>
      <Rufgruppenzelle teilnehmer={t} rufgruppen={props.plan.rufgruppen} nurLesen={props.nurLesen} aufNeu={props.aufNeu} />
      <td className="mono">{t.funkrufname === "" ? "—" : t.funkrufname}</td>
      <td className="leise">{t.erreichbarkeit === "" ? "—" : t.erreichbarkeit}</td>
      <td>{t.hinweis === "" ? <span className="leise">—</span> : <span className="marke-zustand warn">{t.hinweis}</span>}</td>
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
  const teile = [r.zweck, `${String(r.teilnehmer.length)} Teilnehmer`, r.gateway === undefined ? undefined : `Gateway ${r.gateway}`, r.hoert === undefined ? undefined : `hört ${r.hoert}`];
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
              <Zeile key={t.einheitId} t={t} {...props} />
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
        Zuordnung = Hauptrufgruppe der Einheit: die Gruppe, über die die Führungsstelle sie ruft. Doppelklick auf die Rufgruppe bearbeitet die Zelle · Enter
        schreibt · Esc verwirft. Funkrufname und Erreichbarkeit kommen aus Fahrzeug und Führungskraft und werden hier nur gelesen.
      </p>
    </section>
  );
}
