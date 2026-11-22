/**
 * Die Schalter über dem Einsatztagebuch — herausgelöst aus `Tagebuch.tsx`
 * (Strukturgrenze AGENTS.md §6), als der dritte dazukam.
 *
 * „Nur Tagebuchrelevantes“ (Stab-Review ETB E1) blendet Verwaltungsschritte
 * aus: Zwischenschritte von FmZ und LdF, Parameter, Stammdaten, Dienstposten
 * (`projektion.VERWALTUNGSSCHRITTE`). Vorgabe bleibt das vollständige
 * Protokoll.
 */

export interface Tagebuchschalterwerte {
  readonly aufBezug: boolean;
  readonly nurRuecknahmen: boolean;
  readonly nurRelevant: boolean;
}

interface TagebuchschalterEigenschaften {
  readonly werte: Tagebuchschalterwerte;
  readonly aufAenderung: (neu: Partial<Tagebuchschalterwerte>) => void;
}

function Schalter({ an, text, titel, aufAn }: { an: boolean; text: string; titel?: string; aufAn: (an: boolean) => void }): React.JSX.Element {
  return (
    <label className="schalter" title={titel}>
      <input type="checkbox" checked={an} onChange={(e) => aufAn(e.target.checked)} />
      {text}
    </label>
  );
}

export function Tagebuchschalter({ werte, aufAenderung }: TagebuchschalterEigenschaften): React.JSX.Element {
  return (
    <>
      <Schalter an={werte.aufBezug} text="Auf die Auswahl beschränken" aufAn={(aufBezug) => aufAenderung({ aufBezug })} />
      <Schalter
        an={werte.nurRelevant}
        text="Nur Tagebuchrelevantes"
        titel="Ohne Verwaltungsschritte: Zuteilung, Annahme, Nachweisung und Weitergabe im Fernmeldebetrieb, Parameter, Stammdaten, Dienstposten, Rufgruppen, Unterkünfte"
        aufAn={(nurRelevant) => aufAenderung({ nurRelevant })}
      />
      <Schalter an={werte.nurRuecknahmen} text="Nur Rücknahmen und Berichtigungen" aufAn={(nurRuecknahmen) => aufAenderung({ nurRuecknahmen })} />
    </>
  );
}
