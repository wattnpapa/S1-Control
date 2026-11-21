/**
 * Gegenstelle mit Vorschlagsliste der Einheiten, Freitext bleibt erlaubt —
 * in der Maske „Eingang aufnehmen“ wie beim Befördern.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Gegenstellenfeld, gegenstellenvorschlaege } from "./Gegenstellenfeld.js";
import { useLaden } from "./laden.js";
import { leereMaske } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";

const EINHEITEN = [
  { einheitId: "e1", name: "Heros Wildeshausen 10" },
  { einheitId: "e2", name: "FGr N Meppen" },
  { einheitId: "e3", name: "FGr N Meppen" },
  { einheitId: "e4", name: "  " },
];

afterEach(cleanup);

function Halter({ gegenstellen }: { readonly gegenstellen?: typeof EINHEITEN }): React.JSX.Element {
  const [wert, setzeWert] = useState("");
  return <Gegenstellenfeld wert={wert} aufAenderung={setzeWert} gegenstellen={gegenstellen} />;
}

function vorschlaegeZu(feld: HTMLInputElement): readonly string[] {
  const id = feld.getAttribute("list");
  const liste = id === null ? null : document.getElementById(id);
  return liste === null ? [] : [...liste.querySelectorAll("option")].map((o) => o.getAttribute("value") ?? "");
}

describe("Gegenstellenfeld", () => {
  it("schlägt die Einheiten ohne leere und doppelte Namen vor", () => {
    expect(gegenstellenvorschlaege(EINHEITEN)).toEqual(["Heros Wildeshausen 10", "FGr N Meppen"]);
    expect(gegenstellenvorschlaege(undefined)).toEqual([]);
  });

  it("bietet die Liste an und lässt Freitext zu", () => {
    render(<Halter gegenstellen={EINHEITEN} />);
    const feld = screen.getByLabelText("Rufname der Gegenstelle / Spruchkopf") as HTMLInputElement;
    expect(vorschlaegeZu(feld)).toEqual(["Heros Wildeshausen 10", "FGr N Meppen"]);
    expect(feld.placeholder).toBe("Einheit wählen oder Freitext");
    fireEvent.change(feld, { target: { value: "Leitstelle Oldenburg" } });
    expect(feld.value).toBe("Leitstelle Oldenburg");
  });

  it("ohne Einheiten: nur Freitext, keine leere Liste", () => {
    render(<Halter />);
    const feld = screen.getByLabelText("Rufname der Gegenstelle / Spruchkopf") as HTMLInputElement;
    expect(feld.getAttribute("list")).toBeNull();
    expect(feld.placeholder).toBe("z. B. Heros Wildeshausen");
  });

  it("zeigt die Einheiten der Lage in der Maske „Eingang aufnehmen“", () => {
    useLaden.setState({ lagebild: undefined });
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={{ ...leereMaske(undefined), richtung: "EINGANG", anschrift: "FüSt" }} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} gegenstellen={EINHEITEN} aufSchliessen={vi.fn()} />);
    const oben = within(screen.getByRole("form", { name: "Eingang aufnehmen" })).getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" });
    const feld = within(oben).getByLabelText("Rufname der Gegenstelle / Spruchkopf") as HTMLInputElement;
    expect(vorschlaegeZu(feld)).toContain("Heros Wildeshausen 10");
  });
});
