/**
 * Woher ein Paket geholt wird (M9.1).
 *
 * **Die Quelle steht im Quelltext und nicht in den Einstellungen.** Sie ist
 * ein Vertrauensanker wie der Schlüssel daneben: Wer sie ändern kann, kann
 * bestimmen, wovon dieser Arbeitsplatz herunterlädt. Eine Adresse, die in
 * `einstellungen.json` stünde, ließe sich auf einem geklonten Profil
 * austauschen — und die Prüfung der Signatur bliebe zwar wirksam, aber der
 * Ruf wäre schon getan.
 *
 * **Die Wirte sind zwei und nicht einer.** Die Auskunft kommt von `api.github.com`,
 * die Anhänge liegen je nach Größe unter `github.com` oder auf dem
 * Auslieferungswirt `objects.githubusercontent.com`. Beides ist derselbe
 * Anbieter; eine Adresse auf irgendetwas anderes wird verworfen, bevor sie
 * gerufen wird (`deuteRelease` in Ring 2).
 */

/** Die Auskunft über die neueste Veröffentlichung. */
export const RELEASE_AUSKUNFT = "https://api.github.com/repos/wattnpapa/s1-control/releases/latest";

/** Von diesen Wirten darf ein Anhang geladen werden — und von keinem anderen. */
export const ERLAUBTE_WIRTE: readonly string[] = [
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
];

/**
 * Wie lange auf eine Antwort gewartet wird.
 *
 * Dreißig Sekunden für die Auskunft, zehn Minuten für den Anhang. Der
 * Unterschied ist der Zweck: Die Auskunft ist ein paar Kilobyte und hängt,
 * wenn das Netz nicht durchkommt; der Anhang sind neunzig Megabyte und
 * braucht auf einer schlechten Leitung Minuten. Ein Zeitausstieg, der beides
 * gleich behandelt, ist für das eine zu lang und für das andere zu kurz.
 */
export const AUSKUNFT_ZEITAUSSTIEG_MS = 30_000;
export const ANHANG_ZEITAUSSTIEG_MS = 10 * 60_000;

/**
 * Wie viel höchstens gelesen wird.
 *
 * Die Grenze ist kein Schutz vor einem großen Paket, sondern vor einer
 * Antwort ohne Ende: Wer eine Verbindung offen hält und weiterschickt, füllte
 * sonst den Arbeitsspeicher dieses Rechners. Das Manifest ist ein paar
 * hundert Byte, das Paket unter hundert Megabyte — beide Grenzen sind großzügig
 * und trotzdem endlich.
 */
export const MANIFEST_GRENZE_BYTES = 64 * 1024;
export const PAKET_GRENZE_BYTES = 300 * 1024 * 1024;
