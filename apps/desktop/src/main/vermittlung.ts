/**
 * Die Vermittlung — was der Main mit einem Ruf des Renderers tut (M2.1).
 *
 * Sie ist der Grund, aus dem `main.ts` kurz bleibt: Hier steht die
 * Fallunterscheidung ueber die Rufarten, und sie kennt kein Electron. Was sie
 * braucht, bekommt sie: den Arbeiterhof, das Dateisystem, den Pfad der
 * Einstellungen und die Umgebungsangaben. Damit ist der ganze Weg
 * „Ruf → Antwort“ pruefbar, ohne dass ein Fenster oeffnet.
 *
 * **Kein Fachzustand.** Die Vermittlung faltet nichts, sie haelt keinen
 * Zustand ausser den Einstellungen und der Zuordnung Akte → Ordner. Jede
 * fachliche Frage geht an den Worker.
 */

import path from "node:path";

import {
  DATEI_MANIFEST,
  KOSTEN_VORBELEGUNG,
  ORDNER_PROGRAMM,
  einsatzKennung,
  pruefeManifest,
} from "@s1/domaene";
import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  legeEinsatzAn,
  liesEinsatzanker,
  sha256HexBytes,
  type Dateisystem,
} from "@s1/speicher";

import { liesArbeitsplatz, schreibeArbeitsplatz, type Arbeitsplatz } from "./einstellungen.js";
import { holePaket, type Netzholer } from "./programmbezug.js";
import {
  MANIFEST_GRENZE_BYTES,
  PAKET_GRENZE_BYTES,
  RELEASE_AUSKUNFT,
} from "./verteilquelle.js";
import { OHNE_SCHLUESSEL, VERTRAUTER_SCHLUESSEL } from "./verteilschluessel.js";
import type { Arbeiterhof } from "./arbeiterhof.js";
import type {
  Bezugsbefund,
  Diagnose,
  Programmbefund,
  Protokollzeile,
  Antwort,
  Ausgabeergebnis,
  Bildschirm,
  Bedienergebnis,
  EinsatzEintrag,
  Einstellungen,
  Ruf,
  Umgebung,
} from "../kontrakt/index.js";
import type { Auftragsentwurf, Startdaten } from "../worker/akte-worker.js";

/**
 * Was die Vermittlung ueber Fenster wissen muss — und mehr nicht (M3.5).
 *
 * Eine **Naht** wie der `Dateisystem`-Port in Ring 3. Die Vermittlung kennt
 * kein Electron (siehe Dateikopf), und der Staerke-Monitor ist das einzige
 * Paket von M3, das ein zweites `BrowserWindow` braucht. Ohne diese Naht
 * muesste entweder die Vermittlung `electron` importieren — dann ist der
 * ganze Weg „Ruf → Antwort“ nicht mehr ohne Fenster pruefbar — oder der Main
 * bekaeme eine zweite Fallunterscheidung ueber Rufarten neben dieser hier.
 */
export interface Fenstersteuerung {
  bildschirme(): readonly Bildschirm[];
  /** Oeffnet den Monitor auf dem genannten Bildschirm; ohne Angabe auf dem zweiten. */
  monitorOeffnen(bildschirmId?: string): void;
  monitorSchliessen(): void;
}

/**
 * Was die Vermittlung zum Drucken braucht — und mehr nicht (M4.1).
 *
 * Wieder eine **Naht** wie {@link Fenstersteuerung}: Ein PDF entsteht ueber
 * `webContents.printToPDF`, also in Electron, und die Vermittlung kennt kein
 * Electron. Ohne diese Naht waere der Weg „Ruf → Antwort“ fuer die Ausgaben
 * nicht mehr ohne Fenster pruefbar.
 */
export interface Drucker {
  /** Rendert eine vollstaendige HTML-Seite und liefert die PDF-Bytes. */
  alsPdf(html: string, quer: boolean): Promise<Uint8Array>;
}

export interface VermittlungOptionen {
  readonly hof: Arbeiterhof;
  /**
   * Fehlt in den Tests zum Datenpfad. Ohne ihn ist nur die HTML-Ausgabe
   * verfuegbar; sie meldet das, statt dass die Vermittlung ohne Electron
   * nicht baut.
   */
  readonly drucker?: Drucker;
  /**
   * Fehlt in den Tests zum Datenpfad: Wer den Weg „Ruf → Antwort“ prueft,
   * braucht kein Fenster. Fehlt sie, sind die drei Monitorrufe schlicht nicht
   * verfuegbar und melden das — besser als eine Vermittlung, die ohne
   * Bildschirm nicht baut.
   */
  readonly fenstersteuerung?: Fenstersteuerung;
  readonly dateisystem: Dateisystem;
  /** Wo `einstellungen.json` liegt — im Profil des Benutzers. */
  readonly einstellungsdatei: string;
  /** Wurzel der lokalen Spiegel (§5.1), ebenfalls im Profil. */
  readonly spiegelwurzel: string;
  readonly plattform: string;
  readonly electron: string;
  readonly programmversion: string;
  readonly rechnername: string;
  readonly benutzer: string;
  readonly protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void;
  /** Wo die Protokolldatei liegt — die Diagnoseansicht nennt den Ort (M7.3). */
  readonly protokolldatei?: string;
  /**
   * Die letzten Meldungen, juengste zuerst.
   *
   * Als Funktion und nicht als Feld: Sie aendern sich waehrend der Laufzeit,
   * und die Vermittlung soll sie im Augenblick der Frage holen statt eine
   * Fassung vom Start zu halten. Fehlt sie — in den Tests zum Datenpfad —,
   * bleibt die Liste leer; das ist eine leere Liste und keine Luecke.
   */
  readonly letzteMeldungen?: () => readonly Protokollzeile[];
  /**
   * Der Griff ins Netz (M9.1) — der einzige Ruf dieses Programms nach draussen.
   *
   * Optional, und das ist die Aussage: Ohne ihn tut die Vermittlung alles,
   * was sie sonst tut, und der eine Weg, der das Netz braucht, meldet sich
   * als nicht verfuegbar. Die Tests zum Datenpfad laufen damit ohne Netz —
   * und ein Bau, in dem er versehentlich fehlte, faellt auf, statt still zu
   * schweigen.
   */
  readonly netz?: Netzholer;
}

/** Der Unterordner, unter dem die Einsaetze auf dem Share liegen. */
export const ORDNER_EINSAETZE = "einsaetze";

export class Vermittlung {
  readonly #o: VermittlungOptionen;
  #arbeitsplatz: Arbeitsplatz | undefined;
  /** Akte → Ordnername auf dem Share. Mehr merkt sich der Main nicht. */
  readonly #ordnerJeAkte = new Map<string, string>();

  constructor(optionen: VermittlungOptionen) {
    this.#o = optionen;
  }

  /**
   * Beantwortet einen Ruf.
   *
   * Fehler werden hier zu `{ ok: false }` und **nicht** geworfen: Ueber
   * `ipcRenderer.invoke` reiste eine Ausnahme als Zeichenkette samt
   * Stapelabzug in den Renderer, und der Aufbau der Schale geht dort niemanden
   * an.
   */
  async beantworte(ruf: Ruf): Promise<Antwort<unknown>> {
    try {
      return { ok: true, wert: await this.#fuehreAus(ruf) };
    } catch (fehler) {
      const meldung = fehler instanceof Error ? fehler.message : String(fehler);
      this.#o.protokolliere("fehler", `${ruf.art}: ${meldung}`);
      return { ok: false, meldung };
    }
  }

  async arbeitsplatz(): Promise<Arbeitsplatz> {
    this.#arbeitsplatz ??= await liesArbeitsplatz(this.#o.einstellungsdatei);
    return this.#arbeitsplatz;
  }

  async #fuehreAus(ruf: Ruf): Promise<unknown> {
    switch (ruf.art) {
      case "umgebung":
        return this.#umgebung();
      case "programmstandPruefen":
        return this.#programmstand();
      case "programmpaketHolen":
        return this.#holePaket();
      case "diagnoseAnfordern":
        return this.#diagnose();
      case "einstellungenLesen":
        return this.#einstellungen();
      case "einstellungenSetzen":
        return this.#setzeEinstellungen(ruf.einstellungen);
      case "einsaetzeAuflisten":
        return this.#listeEinsaetze();
      case "einsatzAnlegen":
        return this.#legeEinsatzAn(ruf);
      case "einsatzOeffnen":
        return this.#oeffneEinsatz(ruf.ordner);
      case "einsatzSchliessen":
        await this.#o.hof.schliesse(ruf.akteId);
        this.#ordnerJeAkte.delete(ruf.akteId);
        return null;
      case "standAnfordern":
        return this.#o.hof.frage(ruf.akteId, { art: "standAnfordern" });
      case "bedienen":
        return (await this.#o.hof.frage(ruf.akteId, {
          art: "bediene",
          entwurf: ruf.entwurf,
        })) as Bedienergebnis;
      case "zurueck":
        return (await this.#o.hof.frage(ruf.akteId, {
          art: "zurueck",
          ...(ruf.grund === undefined ? {} : { grund: ruf.grund }),
        })) as Bedienergebnis;
      case "undoStapel":
        return this.#o.hof.frage(ruf.akteId, { art: "undoStapel" });
      // Die Ansichtsrufe (M3.7) und der Handscanner-Weg (M3.4) gehen
      // unveraendert an den Worker; der Main deutet weder eine Projektion noch
      // einen Bogen — das Entpacken braucht einen Kompressor, und der liegt im
      // Worker. Der
      // Main deutet sie nicht: Er haette dazu den Fachzustand gebraucht, und
      // genau den hat er nicht (02-ZIELBILD.md, „Electron-Main ohne
      // Fachzustand"). Geprueft sind sie zu diesem Zeitpunkt bereits — `zRuf`
      // faengt eine zu grosse `anzahl` ab, bevor sie den Worker erreicht.
      case "baumAnfordern":
      case "kostenAnfordern":
      case "anforderungenAnfordern":
      case "fuestAnfordern":
      case "eingangskorbAnfordern":
      case "fassungsvergleichAnfordern":
      case "buendelEinlesen":
      case "tabelleAnfordern":
      case "untertabelleAnfordern":
      case "tagebuchAnfordern":
      case "eebScan":
      case "eebZuruecksetzen":
      case "eebUebernehmen":
        return this.#o.hof.frage(ruf.akteId, { art: ruf.art, ruf } as Auftragsentwurf);
      case "ausgabeErzeugen":
        return this.#erzeugeAusgabe(ruf);
      case "buendelSchreiben":
        return this.#o.hof.frage(ruf.akteId, { art: "buendelSchreiben" });
      case "htmlMonitorSchalten":
        return this.#o.hof.frage(ruf.akteId, { art: "htmlMonitorSchalten", ruf });
      case "bildschirmeAuflisten":
        return this.#fenstersteuerung().bildschirme();
      case "monitorOeffnen":
        this.#fenstersteuerung().monitorOeffnen(ruf.bildschirmId);
        return null;
      case "monitorSchliessen":
        this.#fenstersteuerung().monitorSchliessen();
        return null;
    }
  }

  /**
   * Erzeugt eine Ausgabe und legt sie in `ausgaben\` ab (M4.1).
   *
   * Gerendert wird im Worker (er haelt den Zustand), das PDF entsteht in der
   * Schale (nur dort gibt es eine Rendering-Engine), geschrieben wird wieder
   * im Worker (er haelt die Ablage). Drei Schritte, drei Zustaendigkeiten —
   * und **eine** Vorlage: Ein PDF aus einer zweiten Vorlage waere ein zweites
   * Layout, das niemand pflegt.
   */
  async #erzeugeAusgabe(ruf: Extract<Ruf, { art: "ausgabeErzeugen" }>): Promise<Ausgabeergebnis> {
    // Die Auswertung ist keine Seite, sondern eine Datei aus Bytes: Sie
    // braucht weder Vorlage noch Rendering-Engine und geht deshalb den
    // kuerzeren Weg (M4.2).
    // Drei Ausgaben sind keine Seite, sondern eine Datei aus Bytes: Sie
    // brauchen weder Vorlage noch Rendering-Engine und gehen deshalb den
    // kuerzeren Weg (M4.2, M5.1).
    const alsBytes: Readonly<
      Partial<Record<string, "auswertungXlsx" | "oldenburgXlsx" | "logFreiXlsx">>
    > = {
      auswertung: "auswertungXlsx",
      oldenburg: "oldenburgXlsx",
      logfrei: "logFreiXlsx",
    };
    const byteweg = alsBytes[ruf.ausgabe];
    if (byteweg !== undefined || ruf.format === "xlsx") {
      const { dateiname, bytes: xlsx } = (await this.#o.hof.frage(ruf.akteId, {
        art: byteweg ?? "auswertungXlsx",
      })) as { dateiname: string; bytes: Uint8Array };
      const { pfad } = (await this.#o.hof.frage(ruf.akteId, {
        art: "ausgabeSchreiben",
        dateiname: `${dateiname}.xlsx`,
        bytes: xlsx,
      })) as { pfad: string };
      this.#o.protokolliere("info", `Ausgabe erzeugt: ${pfad} (${String(xlsx.length)} Bytes)`);
      return { pfad, bytes: xlsx.length };
    }

    // Was hier ankommt, ist eine der drei Seiten — die drei Byte-Ausgaben
    // sind oben schon zurueck. Der Zuschnitt steht im Typ und nicht in einer
    // Zusicherung: `ausgabeHtml` kennt genau diese drei.
    const seite = ruf.ausgabe as "druck" | "status" | "log" | "kosten";
    const gerendert = (await this.#o.hof.frage(ruf.akteId, {
      art: "ausgabeHtml",
      ausgabe: seite,
      ...(ruf.organisation === undefined ? {} : { organisation: ruf.organisation }),
    })) as { dateiname: string; html: string };

    let bytes: Uint8Array;
    let endung: string;
    if (ruf.format === "pdf") {
      const drucker = this.#o.drucker;
      if (drucker === undefined) {
        throw new Error("Auf diesem Arbeitsplatz ist kein Drucker eingerichtet.");
      }
      // Der Druck liegt quer, die Status-Matrix hochkant — so wie die
      // Vorlagen der Excel gedruckt werden (`excel-domaenenmodell.md` §4).
      bytes = await drucker.alsPdf(gerendert.html, ruf.ausgabe === "druck");
      endung = "pdf";
    } else {
      bytes = new TextEncoder().encode(gerendert.html);
      endung = "html";
    }

    const dateiname = `${gerendert.dateiname}.${endung}`;
    const { pfad } = (await this.#o.hof.frage(ruf.akteId, {
      art: "ausgabeSchreiben",
      dateiname,
      bytes,
    })) as { pfad: string };
    this.#o.protokolliere("info", `Ausgabe erzeugt: ${pfad} (${String(bytes.length)} Bytes)`);
    return { pfad, bytes: bytes.length };
  }

  #fenstersteuerung(): Fenstersteuerung {
    const steuerung = this.#o.fenstersteuerung;
    if (steuerung === undefined) {
      throw new Error("Auf diesem Arbeitsplatz ist keine Fenstersteuerung eingerichtet.");
    }
    return steuerung;
  }

  /**
   * Holt ein Paket aus der Veroeffentlichung und legt es in den Share (M9.1).
   *
   * **Der Vergleichsmassstab ist die hoehere von zwei Fassungen**: der
   * laufenden dieses Arbeitsplatzes und der, die bereits geprueft im Share
   * liegt. Nur die **geprueft** vorhandene zaehlt: Ein unsigniertes Manifest,
   * das eine Fassung 99 behauptete, unterbaende sonst jedes weitere Holen —
   * kein Einbruch, aber eine wirksame Blockade, und die waere von aussen zu
   * legen.
   *
   * Der Griff ins Netz ist eingespritzt (`netz`). Fehlt er — in den Tests zum
   * Datenpfad —, ist der Weg schlicht nicht verfuegbar und sagt das.
   */
  async #holePaket(): Promise<Bezugsbefund> {
    // **Erst der Share, dann das Netz.** Der fehlende Share ist die Lage des
    // Bedieners und die nuetzlichere Auskunft; der fehlende Holer ist eine
    // Eigenschaft dieses Baus. Andersherum bekaeme jemand ohne eingestellten
    // Share eine Meldung ueber den Netzzugang zu lesen und suchte an der
    // falschen Stelle.
    const platz = await this.arbeitsplatz();
    if (platz.sharePfad === "") {
      return {
        art: "abgelehnt",
        grund: "keinShare",
        meldung: "Es ist kein Share eingestellt, in den ein Paket zu legen waere.",
      };
    }
    const netz = this.#o.netz;
    if (netz === undefined) {
      return {
        art: "abgelehnt",
        grund: "netzfehler",
        meldung: "Diese Fassung hat keinen Netzzugang eingerichtet.",
      };
    }

    const vorhanden = await this.#programmstand();
    const befund = await holePaket({
      netz,
      dateisystem: this.#o.dateisystem,
      auskunft: RELEASE_AUSKUNFT,
      programmordner: path.join(platz.sharePfad, ORDNER_PROGRAMM),
      verbinde: (ordner, name) => path.join(ordner, name),
      vertrauterSchluessel: VERTRAUTER_SCHLUESSEL,
      laufendeVersion: this.#o.programmversion,
      ...(vorhanden.art === "verfuegbar" ? { vorhandeneVersion: vorhanden.version } : {}),
      plattform: this.#o.plattform,
      manifestGrenze: MANIFEST_GRENZE_BYTES,
      paketGrenze: PAKET_GRENZE_BYTES,
      protokolliere: this.#o.protokolliere,
    });
    if (befund.art === "abgelehnt") {
      this.#o.protokolliere("warnung", `Paket nicht geholt (${befund.grund}): ${befund.meldung}`);
    }
    return befund;
  }

  /**
   * Was dieser Arbeitsplatz ueber sich selbst weiss (M7.3).
   *
   * **Der Sharepfad wird lesend geprueft und nicht schreibend.** Eine
   * Schreibprobe waere die genauere Auskunft — und sie legte eine Datei auf
   * einer fremden Freigabe an, jedes Mal, wenn jemand die Ansicht oeffnet.
   * Ob geschrieben werden kann, sagt der Datenpfad ohnehin: Er tut es
   * dauernd, und die unuebertragenen Bytes im Lagebild zeigen, wenn nicht.
   */
  async #diagnose(): Promise<Diagnose> {
    const platz = await this.arbeitsplatz();
    // `existiert` und nicht `listeVerzeichnis`: Letzteres liefert bei einem
    // fehlenden Ordner eine leere Liste (§1.4), und ein verschwundener Share
    // saehe damit aus wie ein frisch eingerichteter — die eine Verwechslung,
    // die diese Ansicht nicht machen darf.
    const shareLesbar =
      platz.sharePfad !== "" && (await this.#o.dateisystem.existiert(platz.sharePfad));
    return {
      plattform: this.#o.plattform,
      electron: this.#o.electron,
      programmversion: this.#o.programmversion,
      rechnername: this.#o.rechnername,
      benutzer: this.#o.benutzer,
      clientId: platz.clientId,
      protokolldatei: this.#o.protokolldatei ?? "(kein Protokoll)",
      einstellungsdatei: this.#o.einstellungsdatei,
      spiegelwurzel: this.#o.spiegelwurzel,
      sharePfad: platz.sharePfad,
      shareLesbar,
      wanduhr: new Date().toISOString(),
      letzteMeldungen: this.#o.letzteMeldungen?.() ?? [],
    };
  }

  async #umgebung(): Promise<Umgebung> {
    const platz = await this.arbeitsplatz();
    return {
      plattform: this.#o.plattform,
      electron: this.#o.electron,
      programmversion: this.#o.programmversion,
      rechnername: this.#o.rechnername,
      clientId: platz.clientId,
    };
  }

  async #einstellungen(): Promise<Einstellungen> {
    const platz = await this.arbeitsplatz();
    return {
      sharePfad: platz.sharePfad,
      anzeigename: platz.anzeigename,
      ...(platz.betriebsart === undefined ? {} : { betriebsart: platz.betriebsart }),
      ...(platz.theme === undefined ? {} : { theme: platz.theme }),
    };
  }

  /**
   * Prueft, ob im Ordner `programm\` des Shares ein neueres Paket liegt (M7.2).
   *
   * **Der Griff auf die Dateien geschieht hier, das Urteil in Ring 2.** Die
   * Vermittlung liest zwei Dateien und rechnet einen Hash; ob daraus ein
   * Angebot wird, entscheidet `pruefeManifest` — rein, ohne Share, mit Tests
   * fuer jeden Ablehnungsgrund einzeln.
   *
   * **Kein Manifest ist kein Fehler.** Auf den meisten Shares liegt keines,
   * und eine Fehlermeldung darueber waere eine Meldung ueber einen
   * Normalzustand.
   *
   * **Die Datei wird gelesen, um ihren Hash zu bilden** — nicht ausgefuehrt.
   * Das Einspielen loest ein Mensch aus, und zwar ausserhalb dieser
   * Anwendung: Ein Programm, das sich mitten in einer Lage selbst ersetzt,
   * ist ein Ausfall mit Ansage (M7-Auftragsdokument).
   */
  async #programmstand(): Promise<Programmbefund> {
    const platz = await this.arbeitsplatz();
    const ordner = path.join(platz.sharePfad, ORDNER_PROGRAMM);
    const manifestPfad = path.join(ordner, DATEI_MANIFEST);

    // **Erst nachsehen, dann urteilen.** Liegt gar kein Manifest da, ist das
    // der Normalfall und keine Ablehnung — auch dann nicht, wenn ausserdem
    // kein Schluessel hinterlegt ist. Zwei Nachrichten ueber denselben leeren
    // Ordner waeren eine zu viel.
    let text: string;
    try {
      text = new TextDecoder().decode(await this.#o.dateisystem.liesAb(manifestPfad, 0));
    } catch {
      return { art: "keinManifest", ordner };
    }

    // Ohne Vertrauensanker keine Pruefung und damit kein Angebot. Das ist die
    // sichere Vorbelegung und keine Panne: Eine Fassung ohne Schluessel kann
    // nicht entscheiden, wem sie glaubt.
    if (VERTRAUTER_SCHLUESSEL === "") {
      this.#o.protokolliere("warnung", OHNE_SCHLUESSEL);
      return { art: "abgelehnt", grund: "fremderSchluessel", meldung: OHNE_SCHLUESSEL };
    }

    // Der Hash der Datei wird nur gebildet, wenn das Manifest ihn nennen
    // koennte — also nach dem ersten Deuten. Eine 90-MB-Datei zu lesen, bevor
    // klar ist, ob sie ueberhaupt gemeint ist, waere Arbeit auf Verdacht.
    const ergebnis = await pruefeManifest({
      text,
      vertrauterSchluessel: VERTRAUTER_SCHLUESSEL,
      laufendeVersion: this.#o.programmversion,
      plattform: this.#o.plattform,
    });
    if (ergebnis.art === "abgelehnt") {
      if (ergebnis.grund === "nichtNeuer") return { art: "aktuell", laufend: this.#o.programmversion };
      this.#o.protokolliere("warnung", `Programmmanifest abgelehnt: ${ergebnis.meldung}`);
      return { art: "abgelehnt", grund: ergebnis.grund, meldung: ergebnis.meldung };
    }

    const dateiPfad = path.join(ordner, ergebnis.stand.datei);
    let dateiHash: string;
    try {
      dateiHash = sha256HexBytes(await this.#o.dateisystem.liesAb(dateiPfad, 0));
    } catch {
      return {
        art: "abgelehnt",
        grund: "dateiPasstNicht",
        meldung: `Das Manifest nennt ${ergebnis.stand.datei}; die Datei liegt nicht daneben.`,
      };
    }

    const mitDatei = await pruefeManifest({
      text,
      vertrauterSchluessel: VERTRAUTER_SCHLUESSEL,
      laufendeVersion: this.#o.programmversion,
      plattform: this.#o.plattform,
      dateiHash,
    });
    if (mitDatei.art !== "angeboten") {
      const grund = mitDatei.art === "abgelehnt" ? mitDatei.grund : "unlesbar";
      const meldung = mitDatei.art === "abgelehnt" ? mitDatei.meldung : "";
      this.#o.protokolliere("warnung", `Programmpaket abgelehnt: ${meldung}`);
      return { art: "abgelehnt", grund, meldung };
    }

    this.#o.protokolliere("info", `Neues Paket auf dem Share: ${mitDatei.stand.version}`);
    return {
      art: "verfuegbar",
      version: mitDatei.stand.version,
      datei: mitDatei.stand.datei,
      pfad: dateiPfad,
      groesse: mitDatei.stand.groesse,
      veroeffentlicht: mitDatei.stand.veroeffentlicht,
      ...(mitDatei.stand.hinweis === undefined ? {} : { hinweis: mitDatei.stand.hinweis }),
      kurzform: mitDatei.kurzform,
    };
  }

  async #setzeEinstellungen(neu: Einstellungen): Promise<Einstellungen> {
    const platz = await this.arbeitsplatz();
    // Die `clientId` wird **nicht** aus dem Renderer gesetzt. Sie ist die
    // Kennung dieses Profils (§4.1); sie von aussen aendern zu lassen hiesse,
    // die Fremdschreiber-Erkennung aus §4.5 aushebelbar zu machen.
    const gemerkt: Arbeitsplatz = { ...neu, clientId: platz.clientId };
    await schreibeArbeitsplatz(this.#o.einstellungsdatei, gemerkt);
    this.#arbeitsplatz = gemerkt;
    this.#o.protokolliere("info", `Einstellungen geändert: Share ${neu.sharePfad}`);
    return neu;
  }

  /**
   * Listet die Einsaetze unter `<share>/einsaetze`.
   *
   * Gelesen wird je Ordner die `einsatz.json` und sonst nichts — kein Fold,
   * kein Blick in die Ereignisse. Die Liste soll auch dann erscheinen, wenn
   * ein Einsatz 50.000 Ereignisse hat (§2.6), und genau dafuer traegt der
   * Anker Name und Datum (§5.6).
   */
  async #listeEinsaetze(): Promise<readonly EinsatzEintrag[]> {
    const platz = await this.arbeitsplatz();
    if (platz.sharePfad.length === 0) return [];
    const wurzel = path.join(platz.sharePfad, ORDNER_EINSAETZE);
    const namen = await this.#o.dateisystem.listeVerzeichnis(wurzel);
    const eintraege: EinsatzEintrag[] = [];
    for (const name of namen) {
      const anker = await liesEinsatzanker(
        this.#o.dateisystem,
        path.join(wurzel, name, "einsatz.json"),
      );
      if (anker === undefined) continue;
      eintraege.push({ ordner: name, name: anker.name, datum: anker.datum });
    }
    // Neueste zuerst: Wer einen Einsatz oeffnet, meint fast immer den letzten.
    eintraege.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
    return eintraege;
  }

  async #legeEinsatzAn(ruf: Extract<Ruf, { art: "einsatzAnlegen" }>): Promise<unknown> {
    const platz = await this.arbeitsplatz();
    if (platz.sharePfad.length === 0) throw new Error("Es ist kein Share-Pfad eingestellt.");
    const kennung = einsatzKennung(ruf.datum, ruf.name);
    const ablage = this.#ablage(platz.sharePfad, kennung.ordner);

    await legeEinsatzAn(
      this.#o.dateisystem,
      ablage,
      {
        einsatzId: kennung.ordner,
        name: ruf.name,
        datum: ruf.datum,
        angelegtAm: new Date().toISOString(),
        angelegtVon: this.#o.benutzer,
      },
      EINSATZ_UNTERORDNER,
    );
    this.#o.protokolliere("info", `Einsatz angelegt: ${kennung.ordner}`);

    const akteId = await this.#starteUndOeffne(platz, kennung.ordner);
    // Das erste fachliche Ereignis schreibt der Worker, nicht der Main —
    // sonst haette der Main eine HLC-Uhr und damit Fachzustand.
    const ergebnis = (await this.#o.hof.frage(akteId, {
      art: "bediene",
      entwurf: {
        typ: "EinsatzAngelegt",
        nutzlast: {
          einsatzId: kennung.ordner,
          name: ruf.name,
          art: ruf.einsatzArt,
          fuestName: ruf.fuestName,
          beginn: ruf.beginn,
          schichtmodell: ruf.schichtmodell,
          // Startwert S9: Die vier Kostenparameter sind Pflicht in der Anlage
          // (§5.2) und werden von der Fuehrungsstelle spaeter ueber
          // `KostenParameterGeaendert` gesetzt. Sie hier abzufragen hiesse,
          // die Maske „Einsatz anlegen“ mit Zahlen zu belasten, die im ersten
          // Augenblick eines Einsatzes niemanden interessieren.
          kosten: KOSTEN_VORBELEGUNG,
        },
      },
    })) as Bedienergebnis;
    if (ergebnis.art !== "geschrieben") {
      throw new Error(
        `Der Einsatz wurde angelegt, aber das erste Ereignis nicht geschrieben: ${JSON.stringify(ergebnis)}`,
      );
    }
    return { akteId, einsatzId: kennung.ordner, ordner: kennung.ordner };
  }

  async #oeffneEinsatz(ordner: string): Promise<unknown> {
    const platz = await this.arbeitsplatz();
    if (platz.sharePfad.length === 0) throw new Error("Es ist kein Share-Pfad eingestellt.");
    const bereits = [...this.#ordnerJeAkte.entries()].find(([, o]) => o === ordner);
    if (bereits !== undefined) {
      // Zweimal dieselbe Akte zu oeffnen hiesse zwei Schreiber mit derselben
      // Kennung auf demselben Segment — genau der Fall, den §4.4 mit dem
      // Single-Instance-Lock ausschliesst, hier nur innerhalb eines Prozesses.
      return { akteId: bereits[0], einsatzId: ordner, ordner };
    }
    const anker = await liesEinsatzanker(
      this.#o.dateisystem,
      path.join(platz.sharePfad, ORDNER_EINSAETZE, ordner, "einsatz.json"),
    );
    if (anker === undefined) throw new Error(`Unter ${ordner} liegt kein Einsatz.`);
    const akteId = await this.#starteUndOeffne(platz, ordner);
    return { akteId, einsatzId: anker.einsatzId, ordner };
  }

  async #starteUndOeffne(platz: Arbeitsplatz, ordner: string): Promise<string> {
    const start: Omit<Startdaten, "akteId"> = {
      shareEinsatzOrdner: path.join(platz.sharePfad, ORDNER_EINSAETZE, ordner),
      lokalerEinsatzOrdner: path.join(this.#o.spiegelwurzel, ordner),
      clientId: platz.clientId,
      einsatzId: ordner,
      benutzer: this.#o.benutzer,
      anzeigename: platz.anzeigename,
      programmversion: this.#o.programmversion,
    };
    const akteId = this.#o.hof.starte(start);
    this.#ordnerJeAkte.set(akteId, ordner);
    try {
      await this.#o.hof.frage(akteId, { art: "oeffne" });
    } catch (fehler) {
      // Ein Worker, der nicht oeffnen konnte, bleibt sonst als Karteileiche
      // stehen und faengt Auftraege ab, die er nicht bedienen kann.
      this.#ordnerJeAkte.delete(akteId);
      await this.#o.hof.schliesse(akteId);
      throw fehler;
    }
    this.#o.protokolliere("info", `Einsatz geöffnet: ${ordner} als ${akteId}`);
    return akteId;
  }

  #ablage(sharePfad: string, ordner: string): Einsatzablage {
    return new Einsatzablage(
      path.join(sharePfad, ORDNER_EINSAETZE, ordner),
      path.join(this.#o.spiegelwurzel, ordner),
    );
  }
}
