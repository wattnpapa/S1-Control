/**
 * „Dieser Arbeitsplatz" auf der Einsatzauswahl (Entwurf „Entlastung", 3.8,
 * Option 6g; Audit neuer Nutzer P1-5).
 *
 * Eingeklappt eine Zeile: Anzeigename, Profil (oder Meldekopf), Share und
 * „Ändern". Aufgeklappt die Einstellungen von bisher — Share-Pfad,
 * Anzeigename, Betriebsart, Profil, „Übernehmen" —, jedes Feld mit einem
 * Satz, was es bewirkt. Ohne Share-Pfad oder ohne Anzeigenamen ist die Maske
 * von Anfang an offen: Ohne beides lässt sich kein Einsatz öffnen.
 *
 * Schnitt N3: dazu Blatt und Automatikdruck des Nachrichtenvordrucks
 * (`Druckeinstellungen.tsx`, KONZEPT-NACHRICHTEN.md Entscheidung 7).
 */

import { useEffect, useState } from "react";

import type { Profil } from "../kontrakt/index.js";
import { Druckeinstellungen, druckeinstellungenAus, druckverzeichnisBestaetigt, druckwerteAus, type Druckwerte } from "./Druckeinstellungen.js";
import { useLaden } from "./laden.js";
import { PROFILNAME, Profilwahl } from "./Profilwahl.js";

type Betriebsart = "fuehrungsstelle" | "meldekopf";

/** Die Felder der Maske, solange niemand „Übernehmen" gedrückt hat. */
function useEinstellungsfelder() {
  const einstellungen = useLaden((z) => z.einstellungen);
  const [share, setzeShare] = useState(einstellungen.sharePfad);
  const [name, setzeName] = useState(einstellungen.anzeigename);
  const [betriebsart, setzeBetriebsart] = useState<Betriebsart>(einstellungen.betriebsart ?? "fuehrungsstelle");
  const [profil, setzeProfil] = useState<Profil>(einstellungen.profil ?? "fuehrungsstelle");
  const [ton, setzeTon] = useState(einstellungen.tonBeiBlitz !== false);
  const [druck, setzeDruck] = useState<Druckwerte>(() => druckwerteAus(einstellungen));
  // Die Felder folgen den geladenen Einstellungen, solange niemand tippt.
  useEffect(() => {
    setzeShare(einstellungen.sharePfad);
    setzeName(einstellungen.anzeigename);
    setzeBetriebsart(einstellungen.betriebsart ?? "fuehrungsstelle");
    setzeProfil(einstellungen.profil ?? "fuehrungsstelle");
    setzeTon(einstellungen.tonBeiBlitz !== false);
    setzeDruck(druckwerteAus(einstellungen));
  }, [einstellungen]);
  return { einstellungen, share, setzeShare, name, setzeName, betriebsart, setzeBetriebsart, profil, setzeProfil, ton, setzeTon, druck, setzeDruck };
}

/** Die aufgeklappte Maske. */
function Einstellungen({ aufUebernommen }: { readonly aufUebernommen: () => void }): React.JSX.Element {
  const f = useEinstellungsfelder();
  const setzeEinstellungen = useLaden((z) => z.setzeEinstellungen);
  const beschaeftigt = useLaden((z) => z.beschaeftigt);
  // Im Browser gibt der Dienst den Share vor (ADR-005) — er hat ihn eingehängt,
  // und ein Bediener könnte ihn ohnehin nicht auf ein anderes Verzeichnis des
  // Servers umstellen. Das Feld zeigt ihn deshalb nur.
  const shareFest = useLaden((z) => z.umgebung?.plattform === "web");
  const uebernimm = async (): Promise<void> => {
    // FM P2-11: Ein fehlendes Druckverzeichnis wird nicht still angelegt, sondern erfragt.
    if (!(await druckverzeichnisBestaetigt(f.druck))) return;
    await setzeEinstellungen({
      // Was diese Maske nicht zeigt, bleibt (Handzeichen und Stellen je
      // Einsatz aus der Abfrage beim Öffnen, Monitorwahl).
      ...f.einstellungen,
      sharePfad: f.share,
      anzeigename: f.name,
      betriebsart: f.betriebsart,
      // Auch im Meldekopf: Das Profil bleibt gemerkt, es gilt nur nicht.
      profil: f.profil,
      tonBeiBlitz: f.ton,
      ...druckeinstellungenAus(f.druck, f.einstellungen),
      // Das Erscheinungsbild gehört dem Fenstermenü; diese Maske reicht es
      // durch, statt es auf den Stand beim Öffnen zurückzudrehen.
      ...(f.einstellungen.theme === undefined ? {} : { theme: f.einstellungen.theme }),
    });
    aufUebernommen();
  };
  return (
    <section aria-label="Einstellungen" className="karte einstellungen">
      <label>
        Share-Pfad
        {shareFest ? <output className="hinweistext">{f.share} (vom Dienst vorgegeben)</output> : <input value={f.share} aria-describedby="erklaerung-share" onChange={(e) => f.setzeShare(e.target.value)} />}
      </label>
      <p id="erklaerung-share" className="hinweistext">
        Das Verzeichnis, in dem die Einsätze liegen. Alle Arbeitsplätze eines Einsatzes brauchen denselben Share; über ihn gleichen sie sich ab.
      </p>
      <label>
        Anzeigename
        <input value={f.name} aria-describedby="erklaerung-name" onChange={(e) => f.setzeName(e.target.value)} />
      </label>
      <p id="erklaerung-name" className="hinweistext">
        Steht an jedem Eintrag im Einsatztagebuch und bei den anderen Arbeitsplätzen, etwa „Meier“ oder „S1 Lage“.
      </p>
      <label>
        Betriebsart
        <select value={f.betriebsart} aria-describedby="erklaerung-betriebsart" onChange={(e) => f.setzeBetriebsart(e.target.value as Betriebsart)}>
          <option value="fuehrungsstelle">Führungsstelle</option>
          <option value="meldekopf">Meldekopf</option>
        </select>
      </label>
      <p id="erklaerung-betriebsart" className="hinweistext">
        {f.betriebsart === "meldekopf"
          ? "Der Meldekopf sieht Scanner, Eingangskorb und Bündeldatei — kein Lagebild. Er schreibt in dieselbe Akte auf demselben Share; die Betriebsart ist ein Zuschnitt der Oberfläche und kein Recht."
          : "Die Führungsstelle führt das Lagebild. Ein Meldekopf am Bereitstellungsraum nimmt nur Bögen auf und quittiert sie."}
      </p>
      <Profilwahl profil={f.profil} aufWahl={f.setzeProfil} gesperrt={f.betriebsart === "meldekopf"} />
      <label className="kaestchen">
        <input type="checkbox" checked={f.ton} aria-describedby="erklaerung-ton" onChange={(e) => f.setzeTon(e.target.checked)} />
        Ton bei Blitz-Nachricht
      </label>
      <p id="erklaerung-ton" className="hinweistext">
        Zwei kurze Töne, wenn eine gesichtete Blitz-Nachricht für eine Stelle dieses Arbeitsplatzes eintrifft. Der Hinweis in der Leiste steht auch ohne Ton.
      </p>
      <Druckeinstellungen werte={f.druck} aufAenderung={f.setzeDruck} />
      <button type="button" className="haupt" disabled={beschaeftigt} onClick={() => void uebernimm()}>
        Übernehmen
      </button>
    </section>
  );
}

/** Die Zeile „Dieser Arbeitsplatz", aufklappbar zur Maske. */
export function Arbeitsplatzzeile(): React.JSX.Element {
  const einstellungen = useLaden((z) => z.einstellungen);
  const [gewuenscht, setzeGewuenscht] = useState(false);
  const unvollstaendig = einstellungen.sharePfad === "" || einstellungen.anzeigename === "";
  const offen = gewuenscht || unvollstaendig;
  const zuschnitt = einstellungen.betriebsart === "meldekopf" ? "Meldekopf" : PROFILNAME[einstellungen.profil ?? "fuehrungsstelle"];
  return (
    <>
      <div className="arbeitsplatzzeile" role="group" aria-label="Dieser Arbeitsplatz">
        <span className="lbl">Dieser Arbeitsplatz</span>
        <span>
          <b>{einstellungen.anzeigename === "" ? "—" : einstellungen.anzeigename}</b> · Anzeigename
        </span>
        <span>
          <b>{zuschnitt}</b> · {einstellungen.betriebsart === "meldekopf" ? "Betriebsart" : "Profil, bestimmt die Reiter"}
        </span>
        <span>
          <b>{einstellungen.sharePfad === "" ? "kein Share" : einstellungen.sharePfad}</b> · Share
        </span>
        {!unvollstaendig && (
          <button type="button" className="alsLink" aria-expanded={offen} onClick={() => setzeGewuenscht(!gewuenscht)}>
            {offen ? "Zuklappen" : "Ändern"}
          </button>
        )}
      </div>
      {offen && <Einstellungen aufUebernommen={() => setzeGewuenscht(false)} />}
    </>
  );
}
