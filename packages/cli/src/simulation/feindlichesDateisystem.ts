/**
 * Die feindliche Dateisystem-Schicht aus 05-UMSETZUNGSPLAN.md, M0.4 und
 * Auflage 15 (03-MEILENSTEINE.md).
 *
 * Sie implementiert den Port `Dateisystem` aus `@s1/speicher` und wird der
 * Speicherschicht untergeschoben. Darüber merkt keine Schicht, welche der
 * beiden läuft — genau dafür ist der Port in M0.3 ohne Größen- und
 * Metadatenabfrage gebaut worden (KONZEPT-SPEICHER.md §5.4.2, §6.2) und ohne
 * dauerhaft offenes Handle (§6.6).
 *
 * ## Was hier injiziert wird und woher es kommt
 *
 * §9 (Zeile zu Auflage 15) teilt die Störungen dieses Pakets in zwei Gruppen,
 * und die Trennung wird hier eingehalten:
 *
 * **Mit Konzeptregel** — es gibt ein festgelegtes Verhalten, das geprüft wird:
 *  * abgeschnittener Schreibvorgang auf dem Share (§5.4.1, §8.1),
 *  * abgeschnittener Schreibvorgang lokal — der Kill mitten im Append (§5.2, §8.1),
 *  * Partition, also nicht erreichbarer Share (§8.3, §8.9 „vorübergehend"),
 *  * entzogenes Schreibrecht (§8.9 „dauerhaft"),
 *  * blockierender Aufruf bis zum `SessTimeout` (§8.4),
 *  * lokale Schreibstörung `ENOSPC`/`EACCES`/`EBUSY`/`EIO` (§8.8).
 *
 * **Ohne Konzeptregel** — sie sind zu injizieren, und geprüft wird allein, dass
 * sie **folgenlos** bleiben (§9, Zeile zu Auflage 15, letzter Satz):
 *  * verzögerte Sichtbarkeit neuer Bytes beim Leser,
 *  * `FileNotFound`-Cache (§6.6: 5 s unter Windows),
 *  * Verzeichnis-Cache (§6.6: 10 s unter Windows),
 *  * Rename-Fehler `EPERM`/`EBUSY` (§6.4, `nas-speicher-recherche.md` §1.4).
 *
 * Für diese vier wird hier **kein** Verhalten erfunden. Sie verzögern oder
 * scheitern, und der Nachweis besteht darin, dass die Konvergenz danach
 * trotzdem eintritt.
 *
 * ## Eine Stelle, an der die Schicht bewusst nicht feindlich ist
 *
 * Die verzögerte Sichtbarkeit gilt **nicht für die eigenen Share-Segmente des
 * Schreibers**. §6.6 („Wann die Lease-Annahme kippt") legt dafür ausdrücklich
 * fest, dass der Schreiber die Datei zur Feststellung des Share-Endes nach
 * §5.4.2 neu öffnet, und die Recherche trägt die Aussage, dass ein
 * Datenlesezugriff ohne gültige Lease zum Server durchgeht. Würde diese
 * Schicht dem Schreiber ein zu frühes Dateiende zeigen, hängte er dieselben
 * Bytes ein zweites Mal an — den einen Fehler, den §5.4.2 per Konstruktion
 * ausschließt. Das wäre kein Nachweis über das Verfahren, sondern ein Angriff
 * auf Annahme A5 (§10), die ausdrücklich in M0.5 am echten Gerät gemessen wird
 * und nicht hier.
 */

import { DateisystemFehler, type Dateisystem, type Dauerhaftigkeit } from "@s1/speicher";

import { Zufall } from "./zufall.js";

/** Wie feindlich die Schicht ist. Alle Werte lassen sich in der Plandatei setzen. */
export interface Stoerprofil {
  /** §6.6: `DirectoryCacheLifetime`, unter Windows 10 s. `0` schaltet den Cache ab. */
  readonly verzeichnisCacheMs: number;
  /** §6.6: `FileNotFoundCacheLifetime`, unter Windows 5 s. `0` schaltet ihn ab. */
  readonly fileNotFoundCacheMs: number;
  /** Wie lange neue Bytes einer **fremden** Datei unsichtbar bleiben dürfen. */
  readonly sichtbarkeitsverzoegerungMs: number;
  /** Wahrscheinlichkeit, dass ein Anhängen auf dem Share nur teilweise ankommt (§5.4.1). */
  readonly abgeschnittenShare: number;
  /** Wahrscheinlichkeit, dass ein lokales Anhängen nur teilweise ankommt — Kill mitten im Append. */
  readonly abgeschnittenLokal: number;
  /** Wahrscheinlichkeit eines Rename-Fehlers `EPERM` (nur lokal; auf dem Share gibt es kein Rename). */
  readonly renameFehler: number;
  /** Wahrscheinlichkeit, dass ein Share-Aufruf blockiert (§8.4). */
  readonly blockade: number;
  /** Wie lange ein blockierender Aufruf die Uhr vorstellt — Startwert über dem Zeitausstieg von 20 s (§8.4). */
  readonly blockadeMs: number;
  /** Wahrscheinlichkeit einer lokalen Schreibstörung je Aufruf (§8.8). */
  readonly lokaleSchreibstoerung: number;
}

/** Ein Profil ohne jede Störung — der Vergleichslauf zu jedem gestörten Lauf. */
export const OHNE_STOERUNG: Stoerprofil = {
  verzeichnisCacheMs: 0,
  fileNotFoundCacheMs: 0,
  sichtbarkeitsverzoegerungMs: 0,
  abgeschnittenShare: 0,
  abgeschnittenLokal: 0,
  renameFehler: 0,
  blockade: 0,
  blockadeMs: 0,
  lokaleSchreibstoerung: 0,
};

/**
 * Das Profil, mit dem die Abnahme läuft.
 *
 * Die drei Cache-Zeiten sind die gemessenen Windows-Werte aus
 * `nas-speicher-recherche.md` §1.2, wie §6.6 sie führt; die
 * Wahrscheinlichkeiten sind bewusst weit über allem, was ein reales Netz
 * erzeugt — eine Simulation, die eine Störung nur alle tausend Aufrufe zeigt,
 * weist nichts nach.
 */
export const VOLLE_STOERUNG: Stoerprofil = {
  verzeichnisCacheMs: 10_000,
  fileNotFoundCacheMs: 5_000,
  sichtbarkeitsverzoegerungMs: 2_000,
  abgeschnittenShare: 0.05,
  abgeschnittenLokal: 0.01,
  renameFehler: 0.1,
  blockade: 0.02,
  blockadeMs: 25_000,
  lokaleSchreibstoerung: 0.01,
};

export interface FeindlichOptionen {
  /** Das darunterliegende, ungestörte Dateisystem — in der Regel `knotenDateisystem()`. */
  readonly echt: Dateisystem;
  readonly profil: Stoerprofil;
  readonly zufall: Zufall;
  /** Die virtuelle Uhr der Simulation in Millisekunden. */
  readonly jetzt: () => number;
  /**
   * Stellt die virtuelle Uhr vor — der Zeitverbrauch eines blockierenden
   * Aufrufs (§8.4). In der Simulation vergeht Zeit nur so; ein echtes Warten
   * machte den Lauf um Größenordnungen langsamer, ohne etwas hinzuzufügen.
   */
  readonly vorstellen: (ms: number) => void;
  /** Erkennt Pfade auf dem Share. Alles Übrige ist lokal (§5.1, §5.2). */
  readonly istShare: (pfad: string) => boolean;
  /**
   * Erkennt die **eigenen** Share-Segmente dieses Clients. Für sie gilt die
   * verzögerte Sichtbarkeit nicht — siehe Dateikopf, §6.6 und §5.4.2.
   */
  readonly istEigen: (pfad: string) => boolean;
}

/** Ein Zeitfenster, in dem eine erzwungene Störung gilt. */
interface Fenster {
  readonly bis: number;
  readonly code: string;
}

export class FeindlichesDateisystem implements Dateisystem {
  readonly #o: FeindlichOptionen;
  /** §6.6: zuletzt beobachtetes `ENOENT` je Pfad — der `FileNotFound`-Cache. */
  readonly #nichtGefunden = new Map<string, number>();
  /** §6.6: zwischengespeicherte Verzeichnisauflistung je Pfad. */
  readonly #verzeichnis = new Map<string, { stand: readonly string[]; bis: number }>();
  /** Das sichtbare Ende je fremder Datei und wann es neu bestimmt werden darf. */
  readonly #sichtbar = new Map<string, { ende: number; frei: number }>();
  /** §8.3: Partition — jeder Share-Zugriff scheitert bis zu diesem Zeitpunkt. */
  #partition: Fenster | undefined;
  /** §8.9 „dauerhaft": entzogenes Schreibrecht auf dem Share. */
  #keinSchreibrecht = false;
  /** §8.8: erzwungene lokale Schreibstörung, für die nächsten n Aufrufe. */
  #lokaleStoerung: { code: string; malen: number } | undefined;

  /** Zählt, welche Störung wie oft gegriffen hat — der Nachweis, dass sie überhaupt vorkam. */
  readonly zaehler: Record<string, number> = Object.create(null) as Record<string, number>;

  constructor(optionen: FeindlichOptionen) {
    this.#o = optionen;
  }

  get dauerhaftigkeit(): Dauerhaftigkeit {
    return this.#o.echt.dauerhaftigkeit;
  }

  // -------------------------------------------------------------------------
  // Steuerung von außen — die Fehlerinjektion aus M0.4
  // -------------------------------------------------------------------------

  /** §8.3: Der Share ist für `dauerMs` nicht erreichbar. */
  partitioniere(dauerMs: number, code = "ETIMEDOUT"): void {
    this.#partition = { bis: this.#o.jetzt() + dauerMs, code };
    this.#zaehle("partition");
  }

  /** §8.9 „dauerhaft": Dem Arbeitsplatz wird im laufenden Betrieb das Schreibrecht entzogen. */
  entzieheSchreibrecht(): void {
    this.#keinSchreibrecht = true;
    this.#zaehle("schreibrechtEntzogen");
  }

  gibSchreibrechtZurueck(): void {
    this.#keinSchreibrecht = false;
  }

  /** §8.8: Die nächsten `malen` lokalen Schreibvorgänge scheitern mit `code`. */
  erzwingeLokaleSchreibstoerung(code: string, malen = 1): void {
    this.#lokaleStoerung = { code, malen };
    this.#zaehle(`lokal:${code}`);
  }

  // -------------------------------------------------------------------------
  // Der Port
  // -------------------------------------------------------------------------

  async liesAb(pfad: string, offset: number): Promise<Uint8Array> {
    await this.#vorZugriff(pfad, "liesAb");
    this.#fileNotFoundCache(pfad);
    let bytes: Uint8Array;
    try {
      bytes = await this.#o.echt.liesAb(pfad, offset);
    } catch (fehler) {
      if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
        this.#merkeNichtGefunden(pfad);
      }
      throw fehler;
    }
    return this.#verzoegereSichtbarkeit(pfad, offset, bytes);
  }

  async haengeAnUndSynchronisiere(pfad: string, bytes: Uint8Array): Promise<void> {
    await this.#vorZugriff(pfad, "haengeAnUndSynchronisiere");
    const share = this.#o.istShare(pfad);
    const anteil = share ? this.#o.profil.abgeschnittenShare : this.#o.profil.abgeschnittenLokal;
    if (bytes.byteLength > 1 && this.#o.zufall.trifft(anteil)) {
      // §5.4.1: „Ein Teilschreiben auf dem Share verletzt die Invariante
      // nicht: Was dort ankommt, ist ein Präfix dessen, was gesendet wurde."
      // Lokal ist derselbe Vorgang der Kill mitten im Append; §8.1 kürzt ihn
      // beim nächsten Start weg.
      const teil = this.#o.zufall.zwischen(1, bytes.byteLength - 1);
      await this.#o.echt.haengeAnUndSynchronisiere(pfad, bytes.subarray(0, teil));
      this.#zaehle(share ? "abgeschnittenShare" : "abgeschnittenLokal");
      throw new DateisystemFehler(share ? "ETIMEDOUT" : "EIO", pfad);
    }
    await this.#o.echt.haengeAnUndSynchronisiere(pfad, bytes);
  }

  async schreibeUeberOhneSync(pfad: string, bytes: Uint8Array): Promise<void> {
    await this.#vorZugriff(pfad, "schreibeUeberOhneSync");
    await this.#o.echt.schreibeUeberOhneSync(pfad, bytes);
  }

  async schreibeNeuAnlegen(pfad: string, bytes: Uint8Array): Promise<void> {
    await this.#vorZugriff(pfad, "schreibeNeuAnlegen");
    await this.#o.echt.schreibeNeuAnlegen(pfad, bytes);
  }

  async benenneUm(vonPfad: string, nachPfad: string): Promise<void> {
    await this.#vorZugriff(vonPfad, "benenneUm");
    if (this.#o.zufall.trifft(this.#o.profil.renameFehler)) {
      // §6.4 und `nas-speicher-recherche.md` §1.4: Rename scheitert unter
      // Windows mit `EPERM`/`EBUSY`, wenn ein anderer die Zieldatei offen
      // hält. Ohne Konzeptregel (§9, Auflage 15) — geprüft wird allein, dass
      // es folgenlos bleibt. Folgenlos ist es, weil `schreiber.json` nach §4.4
      // ein Beschleuniger ist und aus dem Dateibestand rekonstruiert wird.
      this.#zaehle("renameFehler");
      throw new DateisystemFehler("EPERM", vonPfad);
    }
    await this.#o.echt.benenneUm(vonPfad, nachPfad);
  }

  async kuerzeAuf(pfad: string, laenge: number): Promise<void> {
    await this.#vorZugriff(pfad, "kuerzeAuf");
    await this.#o.echt.kuerzeAuf(pfad, laenge);
  }

  async loesche(pfad: string): Promise<void> {
    await this.#vorZugriff(pfad, "loesche");
    await this.#o.echt.loesche(pfad);
  }

  async listeVerzeichnis(pfad: string): Promise<readonly string[]> {
    await this.#vorZugriff(pfad, "listeVerzeichnis");
    // §6.6: Der Verzeichnis-Cache ist ein Cache des SMB-Clients und gilt
    // deshalb nur für den Share. Der lokale Spiegel liegt auf der eigenen
    // Platte; ihn hier mit zu verzögern erfände eine Störung, die es nicht
    // gibt, und §9 verbietet für diese Gruppe gerade das Erfinden.
    if (!this.#o.istShare(pfad) || this.#o.profil.verzeichnisCacheMs <= 0) {
      return this.#o.echt.listeVerzeichnis(pfad);
    }
    const jetzt = this.#o.jetzt();
    const gemerkt = this.#verzeichnis.get(pfad);
    if (gemerkt !== undefined && jetzt < gemerkt.bis) {
      this.#zaehle("verzeichnisCache");
      return gemerkt.stand;
    }
    const stand = await this.#o.echt.listeVerzeichnis(pfad);
    this.#verzeichnis.set(pfad, { stand, bis: jetzt + this.#o.profil.verzeichnisCacheMs });
    return stand;
  }

  async legeVerzeichnisAn(pfad: string): Promise<void> {
    await this.#vorZugriff(pfad, "legeVerzeichnisAn");
    await this.#o.echt.legeVerzeichnisAn(pfad);
  }

  // -------------------------------------------------------------------------
  // Innere Mechanik
  // -------------------------------------------------------------------------

  #zaehle(name: string): void {
    this.zaehler[name] = (this.zaehler[name] ?? 0) + 1;
  }

  /** Blockade (§8.4), Partition (§8.3), Schreibrechtentzug (§8.9) und lokale Störung (§8.8). */
  async #vorZugriff(pfad: string, aufruf: keyof Dateisystem): Promise<void> {
    // `await` genau einmal, damit jeder Aufruf die Ereignisschleife durchläuft
    // und die Reihung aus §8.4 im Leser und in der Akte überhaupt greifen kann.
    await Promise.resolve();
    const share = this.#o.istShare(pfad);
    if (share) {
      if (this.#o.zufall.trifft(this.#o.profil.blockade)) {
        // §8.4: „Ein laufender `fs`-Aufruf lässt sich in Node nicht abbrechen."
        // Der Aufruf kehrt zurück — nur eben viel später. Die Simulation
        // verbraucht diese Zeit auf der virtuellen Uhr statt in Wirklichkeit.
        this.#zaehle("blockade");
        this.#o.vorstellen(this.#o.profil.blockadeMs);
      }
      const partition = this.#partition;
      if (partition !== undefined) {
        if (this.#o.jetzt() < partition.bis) {
          this.#zaehle("partitionTraf");
          throw new DateisystemFehler(partition.code, pfad);
        }
        this.#partition = undefined;
      }
      if (this.#keinSchreibrecht && SCHREIBENDE_AUFRUFE.has(aufruf)) {
        this.#zaehle("eaccesTraf");
        throw new DateisystemFehler("EACCES", pfad);
      }
      return;
    }
    if (!SCHREIBENDE_AUFRUFE.has(aufruf)) return;
    const erzwungen = this.#lokaleStoerung;
    if (erzwungen !== undefined && erzwungen.malen > 0) {
      erzwungen.malen -= 1;
      throw new DateisystemFehler(erzwungen.code, pfad);
    }
    if (this.#o.zufall.trifft(this.#o.profil.lokaleSchreibstoerung)) {
      // §8.8: `EBUSY` und `EACCES` werden einmal nach 250 ms wiederholt; die
      // beiden anderen führen sofort zur sichtbaren Abweisung. Beide Wege
      // gehören in die Simulation, deshalb wird gezogen und nicht gewählt.
      const code = this.#o.zufall.waehle(["EBUSY", "EACCES", "ENOSPC", "EIO"]);
      this.#zaehle(`lokal:${code}`);
      throw new DateisystemFehler(code, pfad);
    }
  }

  #merkeNichtGefunden(pfad: string): void {
    if (this.#o.profil.fileNotFoundCacheMs > 0 && this.#o.istShare(pfad)) {
      this.#nichtGefunden.set(pfad, this.#o.jetzt());
    }
  }

  /** §6.6: Ein einmal als fehlend gesehener Pfad bleibt für die Cache-Dauer fehlend. */
  #fileNotFoundCache(pfad: string): void {
    const vermerk = this.#nichtGefunden.get(pfad);
    if (vermerk === undefined) return;
    if (this.#o.jetzt() - vermerk < this.#o.profil.fileNotFoundCacheMs) {
      this.#zaehle("fileNotFoundCache");
      throw new DateisystemFehler("ENOENT", pfad);
    }
    this.#nichtGefunden.delete(pfad);
  }

  /**
   * Hält neue Bytes einer fremden Datei für eine Weile zurück.
   *
   * Monoton: Das sichtbare Ende wächst nur. Damit ist die Verzögerung
   * folgenlos im Sinne von §9 — was jetzt fehlt, kommt beim nächsten Takt, und
   * es wird nie etwas sichtbar, das später wieder verschwindet.
   */
  #verzoegereSichtbarkeit(pfad: string, offset: number, bytes: Uint8Array): Uint8Array {
    const verzoegerung = this.#o.profil.sichtbarkeitsverzoegerungMs;
    if (verzoegerung <= 0 || bytes.byteLength === 0) return bytes;
    if (!this.#o.istShare(pfad) || this.#o.istEigen(pfad)) return bytes;
    const jetzt = this.#o.jetzt();
    const wahresEnde = offset + bytes.byteLength;
    let lage = this.#sichtbar.get(pfad);
    if (lage === undefined || jetzt >= lage.frei) {
      lage = { ende: wahresEnde, frei: jetzt + verzoegerung };
      this.#sichtbar.set(pfad, lage);
      return bytes;
    }
    if (lage.ende >= wahresEnde) return bytes;
    this.#zaehle("sichtbarkeitVerzoegert");
    return bytes.subarray(0, Math.max(0, lage.ende - offset));
  }
}

/** Die Aufrufe, die den Datenträger verändern — nur sie treffen §8.8 und §8.9. */
const SCHREIBENDE_AUFRUFE: ReadonlySet<keyof Dateisystem> = new Set<keyof Dateisystem>([
  "haengeAnUndSynchronisiere",
  "schreibeUeberOhneSync",
  "schreibeNeuAnlegen",
  "benenneUm",
  "kuerzeAuf",
  "loesche",
  "legeVerzeichnisAn",
]);
