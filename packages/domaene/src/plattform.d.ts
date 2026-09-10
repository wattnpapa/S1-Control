/**
 * `TextEncoder` — das eine Web-Standard-Global, das dieser Ring braucht, hier
 * von Hand deklariert.
 *
 * Es gibt ihn in jeder Zielumgebung (Node seit 11, jeder Browser, jede
 * WebView). Sein **Typ** kommt jedoch nur über `lib.dom` oder `@types/node`,
 * und beides ist in `tsconfig.json` bewusst abgeschaltet: Fehlt DOM in `lib`
 * und ist `types` leer, scheitert schon die Typprüfung an `document`,
 * `window`, `process` oder `Buffer`. Genau das ist die Wache, die diesen Ring
 * plattformneutral hält (02-ZIELBILD.md, „Vier Ringe“).
 *
 * Statt ihr ein Loch zu schlagen, steht hier genau die eine Schnittstelle, und
 * zwar nur mit dem, was tatsächlich aufgerufen wird. Dasselbe Muster benutzen
 * `@s1/ausgaben` und der geteilte Kern, aus demselben Grund.
 *
 * Gebraucht wird er seit M7.2: Signiert wird über **Bytes**, und die
 * kanonische Serialisierung liefert eine Zeichenkette. Wer hier etwas
 * ergänzt, sollte begründen können, warum das Ergänzte in Node und im Browser
 * dasselbe tut.
 */

declare class TextEncoder {
  encode(eingabe?: string): Uint8Array;
}

/**
 * `URL` — dasselbe Muster, seit M9.1.
 *
 * Gebraucht wird er, um die Adresse eines Anhangs aus einer Veröffentlichung
 * zu **zerlegen**, statt sie mit einem regulären Ausdruck zu prüfen. Der
 * Unterschied ist nicht Bequemlichkeit: `https://gute.stelle@boese.stelle/x`
 * besteht jede naive Prüfung auf ein Präfix und zeigt trotzdem woandershin.
 * Wer den Wirt wissen will, muss die Adresse nach denselben Regeln zerlegen,
 * nach denen sie später aufgerufen wird.
 *
 * Es gibt ihn in Node seit 10 und in jedem Browser; der Konstruktor wirft bei
 * einer unbrauchbaren Adresse, und genau darauf stützt sich der Aufrufer.
 */
declare class URL {
  constructor(eingabe: string, basis?: string);
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly href: string;
}
