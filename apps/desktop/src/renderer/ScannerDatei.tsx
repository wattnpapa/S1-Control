/**
 * Der Datei-Weg des Scanners: PDFs der Erfassungsbogen-App hineinziehen oder
 * über das Dateifeld wählen.
 *
 * Wer den Bogen per Mail oder Stick als PDF bekommt, müsste den QR-Code sonst
 * vom Bildschirm abscannen. Die PDF trägt den Bogen aber schon in sich
 * (`pdfBogen.ts`); eine Sammel-PDF des Meldekopfs trägt alle ihre Bögen.
 *
 * **Der Griff nach der Datei geschieht hier**, wie beim Bündel: Dateifeld und
 * Ablegen liefern die Bytes, der Worker bekommt Text und keinen Pfad.
 */

import { useRef, useState } from "react";

import { useLaden } from "./laden.js";
import { PDF_MAX_BYTES, bogentexteAusPdf, istPdf } from "./pdfBogen.js";

export interface Bogendateien {
  /** Liest die Dateien und schickt, was darin ein Bogen sein könnte. */
  readonly lies: (dateien: readonly File[]) => Promise<void>;
  /** Was an den Dateien selbst nicht stimmte — der Befund über den Inhalt kommt vom Worker. */
  readonly hinweis: string | undefined;
}

export function useBogendateien(): Bogendateien {
  const liesBogendateien = useLaden((z) => z.liesBogendateien);
  const [hinweis, setzeHinweis] = useState<string | undefined>(undefined);

  const lies = async (dateien: readonly File[]): Promise<void> => {
    if (dateien.length === 0) return;
    const texte: string[] = [];
    const abgelehnt: string[] = [];
    for (const datei of dateien) {
      const bytes = datei.size > PDF_MAX_BYTES ? undefined : new Uint8Array(await datei.arrayBuffer());
      if (bytes === undefined || !istPdf(bytes)) abgelehnt.push(datei.name);
      else texte.push(...(await bogentexteAusPdf(bytes)));
    }
    setzeHinweis(abgelehnt.length === 0 ? undefined : `Keine PDF: ${abgelehnt.join(", ")}`);
    // Sind alle Dateien abgelehnt, gibt es nichts zu fragen — der Hinweis sagt es schon.
    if (abgelehnt.length < dateien.length) await liesBogendateien(texte);
  };

  return { lies, hinweis };
}

/** Die Ablegefläche: Eigenschaften für das Element, auf das Dateien gezogen werden. */
export function useAblage(aufDateien: (dateien: readonly File[]) => void): {
  readonly ziehend: boolean;
  readonly griffe: Pick<React.HTMLAttributes<HTMLElement>, "onDragOver" | "onDragLeave" | "onDrop">;
} {
  const [ziehend, setzeZiehend] = useState(false);
  return {
    ziehend,
    griffe: {
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        // Ohne das nimmt der Browser die Datei selbst und zeigt sie an.
        e.preventDefault();
        setzeZiehend(true);
      },
      onDragLeave: () => {
        setzeZiehend(false);
      },
      onDrop: (e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setzeZiehend(false);
        aufDateien([...e.dataTransfer.files]);
      },
    },
  };
}

export interface DateiknopfEigenschaften {
  readonly aufDateien: (dateien: readonly File[]) => void;
}

/** „PDF wählen …“ — ein deutscher Knopf vor dem versteckten Dateifeld des Browsers. */
export function Dateiknopf({ aufDateien }: DateiknopfEigenschaften): React.JSX.Element {
  const dateifeld = useRef<HTMLInputElement>(null);
  return (
    <div className="dateiwahl">
      <button type="button" onClick={() => dateifeld.current?.click()}>
        PDF wählen …
      </button>
      <span className="hinweistext">oder PDFs aus der Erfassungsbogen-App hierher ziehen</span>
      <input
        ref={dateifeld}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        aria-label="Erfassungsbogen als PDF"
        style={{ display: "none" }}
        onChange={(e) => {
          aufDateien([...(e.target.files ?? [])]);
          // Dieselbe Datei muss ein zweites Mal wählbar sein.
          e.target.value = "";
        }}
      />
    </div>
  );
}
