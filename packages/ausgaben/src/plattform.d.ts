/**
 * `TextEncoder` — das eine Web-Standard-Global, das die ZIP-Ausgabe braucht,
 * hier von Hand deklariert.
 *
 * Es gibt ihn in jeder Zielumgebung (Node seit 11, jeder Browser, jede
 * WebView). Sein **Typ** kommt jedoch nur über `lib.dom` oder `@types/node`,
 * und beides ist in `tsconfig.json` bewusst abgeschaltet: Fehlt DOM in `lib`
 * und ist `types` leer, scheitert schon die Typprüfung an `document`,
 * `window`, `process` oder `Buffer`. Genau das ist die Wache, die diesen Ring
 * plattformneutral hält (02-ZIELBILD.md, „Vier Ringe“).
 *
 * Statt ihr ein Loch zu schlagen, steht hier genau die eine Schnittstelle,
 * und zwar nur mit dem, was tatsächlich aufgerufen wird. Dasselbe Muster
 * benutzt der geteilte Kern (`vendor/eeb-format/src/plattform.d.ts`) aus
 * demselben Grund.
 *
 * Wer hier etwas ergänzt, sollte begründen können, warum das Ergänzte in Node
 * und im Browser dasselbe tut.
 */

declare class TextEncoder {
  encode(eingabe?: string): Uint8Array;
}

declare class TextDecoder {
  constructor(kennung?: string);
  decode(eingabe?: Uint8Array): string;
}
