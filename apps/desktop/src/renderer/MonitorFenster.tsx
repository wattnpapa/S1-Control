/**
 * Das Zweitfenster des Stärke-Monitors — die Verdrahtung (M3.5).
 *
 * {@link Monitor} ist das Bild; diese Datei besorgt ihm sein Lagebild und
 * seine Uhr. Sie ist bewusst **nicht** der Store aus `laden.ts`:
 *
 *  * Der Store gehört dem Arbeitsplatzfenster. Er hält Einstellungen,
 *    Einsatzliste, Masken und Ansichten — nichts davon zeigt der Monitor, und
 *    ein zweites Fenster, das denselben Store füllt, holte Tabellen, die
 *    niemand sieht.
 *  * Der Monitor kennt **keine `akteId`**. Er hat keinen Einsatz geöffnet; er
 *    sieht nur, was der Main ohnehin an alle Fenster schiebt. Er übernimmt
 *    deshalb die Akte der ersten Standmitteilung, die er sieht — und stellt
 *    bei einer Lücke den vollen Stand nach, genau wie der Store es tut.
 *
 * **Push aus dem Worker** heisst genau das: Der Worker schiebt, dieses
 * Fenster hört zu. Es ruft von sich aus nur in einem Fall — wenn ein Delta
 * auf kein Bild trifft.
 */

import { useEffect, useState } from "react";

import { Monitor } from "./Monitor.js";
import { bruecke, rufe } from "./bruecke.js";
import type { Lagebild } from "../kontrakt/index.js";

/**
 * Die Uhr des Monitors — sie tickt im Sekundentakt.
 *
 * Ohne sie stünde die NATO-Zeit still, und „vor 8 s“ alterte nicht: Beides
 * sind Aussagen über die Gegenwart und nicht über die letzte Mitteilung.
 */
function useJetzt(): number {
  const [jetzt, setzeJetzt] = useState(() => Date.now());
  useEffect(() => {
    const zeitgeber = setInterval(() => {
      setzeJetzt(Date.now());
    }, 1000);
    return () => {
      clearInterval(zeitgeber);
    };
  }, []);
  return jetzt;
}

export function MonitorFenster(): React.JSX.Element {
  const jetzt = useJetzt();
  const [lagebild, setzeLagebild] = useState<Lagebild | undefined>(undefined);

  useEffect(() => {
    let akteId: string | undefined;
    let folge = -1;
    return bruecke().aufMitteilung((mitteilung) => {
      if (mitteilung.art === "akteGeschlossen") {
        if (mitteilung.akteId !== akteId) return;
        akteId = undefined;
        folge = -1;
        setzeLagebild(undefined);
        return;
      }
      if (mitteilung.art !== "stand") return;
      // Die erste Akte, die sich meldet, ist die des Monitors. Zwei offene
      // Einsätze sind in Stufe 1 nicht vorgesehen; träfen doch zwei ein,
      // zeigte er den ersten und nicht abwechselnd beide.
      akteId ??= mitteilung.akteId;
      if (mitteilung.akteId !== akteId) return;

      if (mitteilung.voll !== undefined) {
        folge = mitteilung.folge;
        setzeLagebild(mitteilung.voll);
        return;
      }
      if (mitteilung.folge !== folge + 1) {
        // Eine Lücke oder ein Delta ohne Bild: Der volle Stand wird
        // angefordert, statt ein halbes Bild zu erfinden. Auf einem Monitor
        // an der Wand ist eine falsche Zahl schlimmer als eine alte.
        void rufe({ art: "standAnfordern", akteId: mitteilung.akteId });
        return;
      }
      folge = mitteilung.folge;
      setzeLagebild((bisher) =>
        bisher === undefined ? undefined : { ...bisher, ...mitteilung.geaendert },
      );
    });
  }, []);

  return <Monitor lagebild={lagebild} jetzt={jetzt} />;
}
