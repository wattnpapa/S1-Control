/**
 * Prüffälle zum Klappmenü-Baustein (Entwurf „Entlastung", 6e).
 *
 * Das Fenstermenü prüft die Bedienung am Kopfband (`Fenstermenue.test.tsx`);
 * hier steht, was jedes Menü des Fensters gleich tun muss: gesperrte
 * Einträge grau mit Grund, Esc schließt nur das Menü und nicht die Auswahl
 * dahinter, das Kontextmenü hängt am Körper und schließt bei einem Tipp
 * daneben.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Klappmenue, Kontextmenue, Menueeintrag } from "./Klappmenue.js";

afterEach(cleanup);

function Beispiel({ aufA }: { readonly aufA: () => void }): React.JSX.Element {
  return (
    <Klappmenue
      knopf={{ inhalt: "Mehr ▾" }}
      menue={{ beschriftung: "Beispiel", id: "beispiel" }}
      inhalt={(waehle) => (
        <>
          <Menueeintrag text="Eins" kurz="Strg+1" aufWahl={waehle(aufA)} />
          <Menueeintrag text="Zwei" sperre="Geht gerade nicht" aufWahl={waehle(aufA)} />
        </>
      )}
    />
  );
}

describe("Das Klappmenü", () => {
  it("klappt auf, setzt den Fokus auf den ersten Eintrag und führt ihn aus", async () => {
    const aufA = vi.fn();
    render(<Beispiel aufA={aufA} />);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    expect(screen.getByRole("button", { name: "Mehr ▾" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Eins" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Eins" }));
    expect(aufA).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lässt einen gesperrten Eintrag grau stehen, mit Grund, und tut nichts", async () => {
    const aufA = vi.fn();
    render(<Beispiel aufA={aufA} />);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    const zwei = screen.getByRole("menuitem", { name: "Zwei" });
    expect(zwei.getAttribute("aria-disabled")).toBe("true");
    expect(zwei.getAttribute("title")).toBe("Geht gerade nicht");
    await userEvent.click(zwei);
    expect(aufA).not.toHaveBeenCalled();
  });

  it("gibt Esc nicht an die Kürzel des Fensters weiter", async () => {
    const amFenster = vi.fn();
    window.addEventListener("keydown", amFenster);
    render(<Beispiel aufA={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    await userEvent.keyboard("{Escape}");
    window.removeEventListener("keydown", amFenster);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(amFenster).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mehr ▾" }));
  });
});

describe("Das Kontextmenü", () => {
  it("hängt am Körper, steht an der Mausposition und schließt bei Esc und Tipp daneben", () => {
    const zu = vi.fn();
    render(
      <div>
        <p>daneben</p>
        <Kontextmenue
          ort={{ x: 40, y: 60 }}
          beschriftung="Zeile"
          aufSchliessen={zu}
          inhalt={(waehle) => <Menueeintrag text="Kopieren" aufWahl={waehle(() => undefined)} />}
        />
      </div>,
    );
    const menue = screen.getByRole("menu", { name: "Zeile" });
    const huelle = menue.parentElement as HTMLElement;
    expect(huelle.parentElement).toBe(document.body);
    expect(huelle.style.getPropertyValue("--menue-x")).toBe("40px");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Kopieren" }));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(zu).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(screen.getByText("daneben"));
    expect(zu).toHaveBeenCalledTimes(2);
  });
});
