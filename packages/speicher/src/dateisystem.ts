/**
 * Der Dateisystem-Port — die Naht, an der M0.4 seine feindliche Schicht
 * einhängt (verzögerte Sichtbarkeit, abgeschnittene Schreibvorgänge,
 * Rename-Fehler, blockierende Aufrufe, FileNotFound-Cache).
 *
 * **Diese Schnittstelle bietet keine Größen- oder Metadatenabfrage an.** Das
 * ist kein Versehen und keine Sparsamkeit, sondern die Umsetzung von §5.4.2
 * und §6.2: Die Metadaten-Caches des Windows-Redirectors liefern bis zu
 * 10 Sekunden alte Werte (`nas-speicher-recherche.md` §1.2, drei Caches:
 * `FileInfoCacheLifetime` 10 s, `DirectoryCacheLifetime` 10 s,
 * `FileNotFoundCacheLifetime` 5 s). Eine zu klein gemeldete Größe hängte
 * bereits übertragene Bytes ein zweites Mal an — genau den Fehler, den dieses
 * Verfahren per Konstruktion ausschließt. Das wahre Dateiende wird deshalb
 * **durch Lesen** bestimmt. Wer eine Größenabfrage braucht, kann sie hier
 * nicht bekommen; das ist der Zweck.
 *
 * Ebenso wenig gibt es ein dauerhaft offenes Handle. §6.6 („Wann die
 * Lease-Annahme kippt"): Für die Feststellung des Share-Endes nach §5.4.2 und
 * die Prüfung nach §4.5 öffnet der Schreiber die Datei **neu** — auf ein
 * dauerhaft offenes Handle kann der Server eine Write- oder RWH-Lease
 * vergeben, und dann bediente der SMB-Client eigene Lesevorgänge aus dem
 * lokalen Puffer. {@link Dateisystem.liesAb} öffnet deshalb je Aufruf frisch.
 */

/** Fehlercode eines Dateisystem-Aufrufs, wie ihn `node:fs` in `error.code` führt. */
export type Fehlercode = string;

/**
 * Ein Dateisystemfehler mit erhaltenem Code.
 *
 * Der Code trägt die gesamte Unterscheidung aus §8.9 (vorübergehend gegen
 * dauerhaft) und aus §8.8 (lokale Schreibstörung); ginge er verloren, bliebe
 * nur „irgendetwas ging schief", und §8.9 wäre nicht baubar.
 */
export class DateisystemFehler extends Error {
  readonly code: Fehlercode;
  readonly pfad: string;

  constructor(code: Fehlercode, pfad: string, ursache?: unknown) {
    super(`Dateisystemfehler ${code} bei ${pfad}`);
    this.name = "DateisystemFehler";
    this.code = code;
    this.pfad = pfad;
    if (ursache !== undefined) this.cause = ursache;
  }
}

/**
 * Welche Dauerhaftigkeit der lokale Anhang tatsächlich erreicht (§6.6).
 *
 * `fsync` ist auf Windows und Linux die volle Zusage. Auf macOS weist
 * `fsync(2)` den Datenträger nicht zwingend an, seinen eigenen Puffer zu
 * leeren — dafür wäre `fcntl(F_FULLFSYNC)` nötig, das Node ohne natives Modul
 * nicht anbietet und 02-ZIELBILD.md („kein natives Modul") ausschließt. §6.6
 * verlangt, dass die schwächere Zusage „im Messprotokoll von M0.5 vermerkt und
 * nicht stillschweigend hingenommen" wird. Dieses Feld ist der Träger dieses
 * Vermerks.
 */
export type Dauerhaftigkeit = "fsync" | "f_fullfsync";

/**
 * Der Port. Alle Aufrufe sind asynchron; kein synchroner Datei- oder
 * Netzaufruf verlässt diese Schicht (§8.4, Lint-Regel in M2.1).
 */
export interface Dateisystem {
  /**
   * Welche Dauerhaftigkeit {@link haengeAnUndSynchronisiere} lokal erreicht
   * (§6.6). Kein Verhalten hängt daran; der Wert wird gemeldet, nicht
   * ausgewertet.
   */
  readonly dauerhaftigkeit: Dauerhaftigkeit;

  /**
   * Liest ab `offset` bis zum Ende und liefert die gelesenen Bytes.
   *
   * Öffnet die Datei je Aufruf neu (§6.6). Ein leeres Ergebnis heißt „ab
   * diesem Offset ist nichts (mehr) da" — und ist damit die einzige zulässige
   * Feststellung des Dateiendes (§5.4.2, §6.2).
   *
   * Wirft {@link DateisystemFehler} mit `ENOENT`, wenn die Datei fehlt. Ein
   * `offset` jenseits des Endes ist kein Fehler, sondern liefert 0 Bytes.
   */
  liesAb(pfad: string, offset: number): Promise<Uint8Array>;

  /**
   * Hängt Bytes an das bekannte Dateiende an und synchronisiert (§2.2).
   *
   * Ein einziger `write`, gefolgt von `fsync`; kein Read-Modify-Write, kein
   * Rename, kein Zwischenpuffer über mehrere Ereignisse hinweg. Die Datei wird
   * angelegt, wenn sie fehlt.
   */
  haengeAnUndSynchronisiere(pfad: string, bytes: Uint8Array): Promise<void>;

  /**
   * Überschreibt eine Datei an Ort und Stelle und kürzt auf die neue Länge,
   * **ohne** `fsync` und **ohne** Rename.
   *
   * Für die Präsenzdatei (§6.4): Rename schlägt unter Windows mit
   * `EPERM`/`EBUSY` fehl, wenn ein anderer Client die Zieldatei ohne
   * `FILE_SHARE_DELETE` geöffnet hält (`nas-speicher-recherche.md` §1.4) —
   * genau das täte ein lesender Client. Ein Leser darf dabei eine halb
   * geschriebene Datei sehen; das ist zulässig und vorgesehen.
   */
  schreibeUeberOhneSync(pfad: string, bytes: Uint8Array): Promise<void>;

  /**
   * Legt eine Datei an, **nur wenn sie nicht vorhanden ist** (`flag: 'wx'`).
   *
   * Für `einsatz.json` (§5.6) und `archiv.marker` (§5.7). Wirft
   * {@link DateisystemFehler} mit `EEXIST`, wenn sie schon da ist. Dass diese
   * Atomarität über SMB serverseitig entschieden wird, ist für den einmaligen
   * Anlegevorgang tragbar (`nas-speicher-recherche.md` §1.4).
   */
  schreibeNeuAnlegen(pfad: string, bytes: Uint8Array): Promise<void>;

  /**
   * Benennt um und ersetzt ein vorhandenes Ziel.
   *
   * **Ausschließlich lokal** zulässig. Auf dem Share ist Rename im Datenpfad
   * verboten (§1.3); lokal gilt dieses Verbot nicht (§4.4). Auf Atomarität
   * verlässt sich nichts: `MoveFileEx(MOVEFILE_REPLACE_EXISTING)` ist unter
   * Windows nicht als atomar dokumentiert (`nas-speicher-recherche.md` §1.4),
   * weshalb `schreiber.json` rekonstruierbar ausgelegt ist (§4.4).
   */
  benenneUm(vonPfad: string, nachPfad: string): Promise<void>;

  /**
   * Kürzt eine Datei auf die angegebene Länge.
   *
   * Für die Kürzung des eigenen letzten Segments beim Start auf die letzte
   * vollständige, kettenrichtige Zeile (§8.1). Die Länge wird **gelesen**
   * bestimmt, nie erfragt.
   */
  kuerzeAuf(pfad: string, laenge: number): Promise<void>;

  /** Löscht eine Datei. `ENOENT` ist kein Fehler und wird verschluckt. */
  loesche(pfad: string): Promise<void>;

  /**
   * Listet die Dateinamen eines Verzeichnisses (Takt B, §6.2).
   *
   * Die einzige Verzeichnisauflistung des Verfahrens, und deshalb im langsamen
   * Takt: Takt A liest am bekannten Offset und kommt ohne sie aus. Ein
   * fehlendes Verzeichnis liefert eine leere Liste.
   */
  listeVerzeichnis(pfad: string): Promise<readonly string[]>;

  /** Legt ein Verzeichnis samt Elternverzeichnissen an; vorhandene sind kein Fehler. */
  legeVerzeichnisAn(pfad: string): Promise<void>;
}
