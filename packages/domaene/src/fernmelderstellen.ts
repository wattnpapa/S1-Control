/**
 * Die Fernmelder als eigene Stellen (KONZEPT-NACHRICHTEN.md §4, §5, ergänzt
 * 2026-11-21).
 *
 * Bis dahin führte jeder Fernmelder-Platz dieselbe Stelle `FMZ`. Der LdF
 * wählte im Übermittlungsvorschlag einen Fernmelder als Freitext, aber kein
 * Platz wusste, welche Nachricht ihm zugeteilt war. Jetzt gibt es die
 * Stellen `FM1`, `FM2` und `FM3` („Fm1“ bis „Fm3“): Der LdF sichtet den
 * Ausgang und teilt ihn einem Fernmelder zu, dessen Warteschlange die
 * Nachricht zuoberst zeigt.
 *
 * `FMZ` bleibt lesbar: Ältere Einsätze, Präsenzdateien und Clients tragen
 * den Wert weiter. Er gilt als Fernmelder ohne Nummer, darf alle Schritte
 * der Fernmelder und bekommt keine Nachricht als „eigene“ zugeteilt.
 */

/** Der Altwert der Fernmeldezentrale: ein Fernmelder ohne Nummer. */
export const STELLE_FMZ = "FMZ";

/** Die Stellen der Fernmelder in der Reihenfolge der Wahl. */
export const FERNMELDERSTELLEN = ["FM1", "FM2", "FM3"] as const;

const NUMMERNSTELLEN: ReadonlySet<string> = new Set(FERNMELDERSTELLEN);

/** Ist die Stelle ein Fernmelder — `FM1` bis `FM3` oder der Altwert `FMZ`? */
export function istFernmelderstelle(stelle: string): boolean {
  return stelle === STELLE_FMZ || NUMMERNSTELLEN.has(stelle);
}

/** Führt eine der Stellen einen Fernmelder? */
export function hatFernmelderstelle(stellen: readonly string[] | undefined): boolean {
  return stellen?.some(istFernmelderstelle) === true;
}

/**
 * Der Name, unter dem der LdF den Fernmelder zuteilt („Fm2“ für `FM2`) —
 * derselbe, den `FERNMELDER_STANDARD` und die Wahl im Vorschlag führen.
 * `undefined` für den Altwert `FMZ` und jede andere Stelle.
 */
export function fernmeldername(stelle: string): string | undefined {
  return NUMMERNSTELLEN.has(stelle) ? `Fm${stelle.slice(2)}` : undefined;
}

/** Die Namen der Fernmelder, die diese Stellen führen („Fm1“, „Fm3“). */
export function eigeneFernmelder(stellen: readonly string[] | undefined): readonly string[] {
  return (stellen ?? []).flatMap((s) => {
    const name = fernmeldername(s);
    return name === undefined ? [] : [name];
  });
}

function gleich(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("de-DE") === b.trim().toLocaleLowerCase("de-DE");
}

/**
 * Ist der Fernmelder des Vorschlags einer dieser Stellen zugeteilt? Ein
 * Vergleich ohne Groß- und Kleinschreibung, denn der Vorschlag ist Freitext
 * und ältere Einsätze schrieben „fm2“ oder den Anzeigenamen.
 */
export function istZugeteilt(fernmelder: string | undefined, stellen: readonly string[] | undefined): boolean {
  if (fernmelder === undefined || fernmelder.trim() === "") return false;
  return eigeneFernmelder(stellen).some((name) => gleich(name, fernmelder));
}
