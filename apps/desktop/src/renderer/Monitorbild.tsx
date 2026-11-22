/**
 * Das Bild des Monitors mit seinen Ansichten (S4.1, KONZEPT-S4.md §4).
 *
 * Der Monitor bleibt ein Fenster mit einem Bild; diese Datei entscheidet,
 * welches: die Stärke (`Monitor.tsx`, unverändert), eine der vier
 * Versorgungsansichten (`Monitoransichten.tsx`), der Funkplan
 * (`MonitorFunkplan.tsx`, KONZEPT-FUNKPLAN.md §4) oder eine der beiden
 * Stärketafeln des Sachgebiets 1 (`MonitorStaerketafeln.tsx`,
 * `MonitorKreuztafel.tsx`). Darüber liegen die
 * Hover-Leiste und das Kontextmenü, rechts unten die Punkte. Alles im
 * Renderer, damit es in Electron und in der Web-Schale gleich geht.
 *
 * Die Tafel, die Zeile der Zu- und Abgänge und die Unterkünfte brauchen mehr
 * als das Lagebild; sie holen die Versorgungsansicht mit eigenem Ruf, und
 * zwar nur, solange eine dieser Ansichten zu sehen ist. Ebenso holt der
 * Funkplan sein Blatt mit `funkplanAnfordern`, einmal je Minute und bei
 * jedem neuen Zeigerstand: Der letzte Kontakt altert auch ohne Ereignis.
 */

import { useEffect } from "react";

import { Monitor, useFenstermass } from "./Monitor.js";
import { MonitorFunkplan } from "./MonitorFunkplan.js";
import { MonitorIukLage, MonitorNachrichtenweg, MonitorOffenePunkte } from "./MonitorKacheln.js";
import { MonitorKreuztafel } from "./MonitorKreuztafel.js";
import { MonitorAbschnitte, MonitorOrganisationen } from "./MonitorStaerketafeln.js";
import { MonitorTafel, MonitorUnterbringung, MonitorVerpflegung, MonitorVorausschau, type Ansichtseigenschaften } from "./Monitoransichten.js";
import { Monitorleiste, Monitorpunkte } from "./Monitorleiste.js";
import { Monitormenue } from "./Monitormenue.js";
import { Verbindungswarnung } from "./Monitorwarnung.js";
import { taktischeZeit } from "./formate.js";
import { ANSICHT_TITEL, useMonitorsteuerung } from "./monitorSteuerung.js";
import { modusKurz, naechsteAnsicht } from "./monitorWechsel.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";
import { useStaerketafel } from "./useStaerketafel.js";
import { useVersorgungsansicht } from "./useVersorgungsansicht.js";
import type { Verbindungsstatus } from "./verbindung.js";
import type { Lagebild, MonitorAnsicht } from "../kontrakt/index.js";

export interface MonitorbildEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly akteId: string | undefined;
  readonly jetzt: number;
  readonly verbindung?: Verbindungsstatus;
}

function Ansicht({ welche, e }: { readonly welche: Exclude<MonitorAnsicht, "staerke">; readonly e: Ansichtseigenschaften }): React.JSX.Element {
  switch (welche) {
    case "verpflegung":
      return <MonitorVerpflegung {...e} />;
    case "vorausschau":
      return <MonitorVorausschau {...e} />;
    case "unterbringung":
      return <MonitorUnterbringung {...e} />;
    case "tafel":
      return <MonitorTafel {...e} />;
    case "funkplan":
      return <MonitorFunkplan {...e} />;
    case "abschnitte":
      return <MonitorAbschnitte {...e} />;
    case "organisationen":
      return <MonitorOrganisationen {...e} />;
    case "kreuz":
      return <MonitorKreuztafel {...e} />;
    case "offen":
      return <MonitorOffenePunkte {...e} />;
    case "iuk":
      return <MonitorIukLage {...e} />;
    case "nachrichtenweg":
      return <MonitorNachrichtenweg {...e} />;
  }
}

export function Monitorbild({ lagebild, akteId, jetzt, verbindung }: MonitorbildEigenschaften): React.JSX.Element {
  const steuerung = useMonitorsteuerung();
  const mass = useFenstermass();
  const braucheAnsicht = lagebild !== undefined && ["tafel", "vorausschau", "unterbringung"].includes(steuerung.ansicht);
  const abruf = useVersorgungsansicht(akteId, lagebild?.lageZeiger, 24, braucheAnsicht);
  const braucheFunkplan = lagebild !== undefined && steuerung.ansicht === "funkplan";
  const funk = useFunkplanansicht(braucheFunkplan ? akteId : undefined, lagebild?.lageZeiger, "", braucheFunkplan);
  const braucheStaerke = lagebild !== undefined && ["abschnitte", "organisationen", "kreuz"].includes(steuerung.ansicht);
  const staerketafel = useStaerketafel(akteId, lagebild?.lageZeiger, braucheStaerke);

  useEffect(() => {
    // Der Titel nennt die Ansicht: Auf einer Taskleiste mit zwei Einträgen
    // „S1-Control" findet niemand den Monitor wieder.
    document.title = `S1-Control — ${ANSICHT_TITEL[steuerung.ansicht]}`;
  }, [steuerung.ansicht]);

  const wechseltext = steuerung.wechsel
    ? ` · Wechsel${steuerung.modus === "alle" ? "" : ` ${modusKurz(steuerung.modus)}`} alle 20 s, weiter: ${ANSICHT_TITEL[naechsteAnsicht(steuerung.ansicht, steuerung.modus)]}`
    : "";

  return (
    <div
      className="monitorrahmen"
      onMouseMove={steuerung.zeigeLeiste}
      onContextMenu={(ereignis) => {
        ereignis.preventDefault();
        steuerung.oeffneMenue(ereignis.clientX, ereignis.clientY);
      }}
    >
      <Monitorleiste steuerung={steuerung} />
      {steuerung.ansicht === "staerke" || lagebild === undefined ? (
        <Monitor lagebild={lagebild} jetzt={jetzt} {...(verbindung === undefined ? {} : { verbindung })} />
      ) : (
        <>
          {verbindung?.zustand === "unterbrochen" && <Verbindungswarnung status={verbindung} jetzt={jetzt} />}
          <Ansicht
            welche={steuerung.ansicht}
            e={{ lagebild, jetzt, zeit: taktischeZeit(jetzt), mass, ansicht: abruf.ansicht, funkplan: funk.ansicht, staerketafel, fusszusatz: wechseltext }}
          />
        </>
      )}
      <Monitorpunkte steuerung={steuerung} />
      <Monitormenue steuerung={steuerung} />
    </div>
  );
}
