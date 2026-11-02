/**
 * Unteransicht „Nächste 24 h" (4g): was zu welcher Mahlzeit gebraucht wird.
 *
 * Oben je Mahlzeit eine Karte mit der Vorausschau als großer Zahl und der
 * Rechnung dahinter, die nächste mit 2-px-Rahmen. Darunter die Tabelle je
 * Bereich mit Bestand, Zugängen, Abgängen und Vorausschau, rechts die Liste
 * der Zu- und Abgänge. Alle Zahlen stammen aus `projektion.vorausschau`.
 */

import { projektion, type Bestellstand, type Kost, type Mahlzeitvorausschau, type Versorgungsbewegung, type Vorausschau } from "@s1/domaene";

import { kurzzeit, mahlzeitText, restzeitText, tagText, vorzeichen } from "./versorgungstext.js";

/** Der Stand der Bestellung an der Karte: offen, oder bestellt mit Differenz — Bernstein, wenn Portionen fehlen. */
function Bestellmarke({ stand }: { readonly stand: Bestellstand | undefined }): React.JSX.Element {
  const b = stand?.bestellung;
  if (b === undefined || stand?.differenz === undefined) return <span className="marke-zustand">offen</span>;
  const d = stand.differenz;
  const text = d === 0 ? "" : ` · ${d > 0 ? "+" : "−"}${String(Math.abs(d))}`;
  return <span className={d < 0 ? "marke-zustand warn" : "marke-zustand ok"}>bestellt {b.portionen}{text}</span>;
}

function Karte({ m, jetzt, erste, stand }: { readonly m: Mahlzeitvorausschau; readonly jetzt: number; readonly erste: boolean; readonly stand?: Bestellstand }): React.JSX.Element {
  return (
    <article className={erste ? "vorausschaukarte naechste" : "vorausschaukarte"} aria-label={`${mahlzeitText(m.mahlzeit)} ${m.uhrzeit}`}>
      <header>
        <strong>
          {mahlzeitText(m.mahlzeit)} {m.uhrzeit}
        </strong>{" "}
        <span className="leise">
          {tagText(m.zeitpunkt, jetzt)} · {restzeitText(m.zeitpunkt, jetzt)}
        </span>
        <Bestellmarke stand={stand} />
      </header>
      <p className="grosszahl">
        {m.vorausschau.portionen}{" "}
        <span className="leise">
          {m.vorausschau.vegetarisch} veg. · {m.vorausschau.vegan} vegan
        </span>
      </p>
      <p className="rechnung">
        {m.bestand.portionen} Bestand · <span className="zugang">{vorzeichen(m.zugang.portionen, "plus")}</span> Zugang ·{" "}
        <span className="abgang">{vorzeichen(m.abgang.portionen, "minus")}</span> Abgang
      </p>
    </article>
  );
}

function Kostzellen({ kost, art }: { readonly kost: Kost; readonly art?: "plus" | "minus" }): React.JSX.Element {
  const text = (n: number): string => (art === undefined ? String(n) : vorzeichen(n, art));
  return (
    <>
      <td className="zahl trenner">{text(kost.portionen)}</td>
      <td className="zahl">{text(kost.vegetarisch)}</td>
      <td className="zahl">{text(kost.vegan)}</td>
    </>
  );
}

function Tabelle({ schau, jetzt }: { readonly schau: Vorausschau; readonly jetzt: number }): React.JSX.Element {
  const bereiche = schau.mahlzeiten[0]?.jeBereich ?? [];
  return (
    <table className="versorgungstabelle vorausschautabelle" aria-label="Vorausschau je Bereich">
      <thead>
        <tr>
          <th scope="col" rowSpan={2}>Bereich</th>
          {schau.mahlzeiten.map((m) => (
            <th key={m.zeitpunkt} scope="colgroup" colSpan={3} className="trenner">
              {mahlzeitText(m.mahlzeit)} {m.uhrzeit} {tagText(m.zeitpunkt, jetzt)}
            </th>
          ))}
        </tr>
        <tr>
          {schau.mahlzeiten.map((m) => (
            <Kopf key={m.zeitpunkt} />
          ))}
        </tr>
      </thead>
      <tbody>
        {bereiche.map((b, i) => (
          <tr key={b.abschnittId}>
            <th scope="row">{b.bereich}</th>
            {schau.mahlzeiten.map((m) => (
              <Kostzellen key={m.zeitpunkt} kost={m.jeBereich[i]?.bestand ?? projektion.KOST_NULL} />
            ))}
          </tr>
        ))}
        <Summenzeile titel="Bestand (erfasst)" schau={schau} wert={(m) => m.bestand} klasse="summenzeile" />
        <Summenzeile titel="Zugänge (Anmarsch, Eintreffzeit)" schau={schau} wert={(m) => m.zugang} art="plus" klasse="zugangszeile" />
        <Summenzeile titel="Abgänge (verfügbar bis, Ende)" schau={schau} wert={(m) => m.abgang} art="minus" klasse="abgangszeile" />
        <Summenzeile titel="Vorausschau" schau={schau} wert={(m) => m.vorausschau} klasse="summenzeile" />
      </tbody>
    </table>
  );
}

function Kopf(): React.JSX.Element {
  return (
    <>
      <th scope="col" className="zahl trenner">Port.</th>
      <th scope="col" className="zahl">Veg.</th>
      <th scope="col" className="zahl">Vegan</th>
    </>
  );
}

function Summenzeile(props: {
  readonly titel: string;
  readonly schau: Vorausschau;
  readonly wert: (m: Mahlzeitvorausschau) => Kost;
  readonly art?: "plus" | "minus";
  readonly klasse: string;
}): React.JSX.Element {
  return (
    <tr className={props.klasse}>
      <th scope="row">{props.titel}</th>
      {props.schau.mahlzeiten.map((m) => (
        <Kostzellen key={m.zeitpunkt} kost={props.wert(m)} {...(props.art === undefined ? {} : { art: props.art })} />
      ))}
    </tr>
  );
}

function Bewegung({ b }: { readonly b: Versorgungsbewegung }): React.JSX.Element {
  const zahl = b.art === "ABGANG" ? vorzeichen(b.koepfe, "minus") : vorzeichen(b.koepfe, "plus");
  return (
    <li className={`bewegung-${b.art.toLowerCase()}`}>
      <span className="wann">{b.zeitpunkt === undefined ? "ohne Zeit" : kurzzeit(b.zeitpunkt)}</span>
      <strong className="zahl">{zahl}</strong>
      <span>
        {b.einheit} · {b.bereich} · {b.grund}
      </span>
      {b.art === "OHNE_ZEIT" && <span className="marke-zustand warn">nicht eingerechnet</span>}
    </li>
  );
}

export function VersorgungVorausschau({
  schau,
  jetzt,
  bestellstand = [],
}: {
  readonly schau: Vorausschau;
  readonly jetzt: number;
  readonly bestellstand?: readonly Bestellstand[];
}): React.JSX.Element {
  return (
    <div className="karte versorgungskarte">
      <h3>
        Vorausschau <span className="leise">· {schau.mahlzeiten.length} Mahlzeiten in {schau.stunden} h</span>
      </h3>
      <div className="vorausschaukarten">
        {schau.mahlzeiten.map((m, i) => (
          <Karte key={m.zeitpunkt} m={m} jetzt={jetzt} erste={i === 0} {...(bestellstand[i] === undefined ? {} : { stand: bestellstand[i] })} />
        ))}
      </div>
      <div className="vorausschauflaeche">
        <div className="tabellenrahmen">
          <Tabelle schau={schau} jetzt={jetzt} />
        </div>
        <section className="bewegungsliste" aria-label="Zu- und Abgänge">
          <h4>Zu- und Abgänge</h4>
          {schau.bewegungen.length === 0 ? (
            <p className="hinweistext">Keine gemeldeten Zu- oder Abgänge im Horizont.</p>
          ) : (
            <ul>
              {schau.bewegungen.map((b) => (
                <Bewegung key={`${b.art}-${b.einheitId}`} b={b} />
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="hinweistext">{projektion.VORAUSSCHAU_REGEL}</p>
    </div>
  );
}
