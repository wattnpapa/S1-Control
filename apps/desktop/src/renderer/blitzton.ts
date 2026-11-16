/**
 * Der Ton bei einer Blitz-Nachricht (KONZEPT-NACHRICHTEN.md Entscheidung 6).
 *
 * Die Führungsstelle ist laut; eStab spielt dafür eine WAV-Datei. Hier sind es
 * zwei kurze Töne aus Web Audio — kein Asset, das im Bündel fehlen oder auf
 * dem Share veralten könnte. Nur bei Blitz, abschaltbar je Arbeitsplatz
 * (`tonBeiBlitz`, Vorbelegung an).
 *
 * Ein Fenster ohne Audio (jsdom, ein Browser, der vor der ersten Bedienung
 * keinen Ton erlaubt) bleibt still, statt zu werfen: Der Hinweis steht
 * ohnehin in der Leiste.
 */

const TONHOEHE_HZ = 880;
const DAUER_S = 0.12;
const PAUSE_S = 0.08;

type AudioKonstruktor = new () => AudioContext;

let kontext: AudioContext | undefined;

function audio(): AudioContext | undefined {
  const Bauart = (globalThis as { AudioContext?: AudioKonstruktor; webkitAudioContext?: AudioKonstruktor }).AudioContext ??
    (globalThis as { webkitAudioContext?: AudioKonstruktor }).webkitAudioContext;
  if (Bauart === undefined) return undefined;
  kontext ??= new Bauart();
  return kontext;
}

function ton(ctx: AudioContext, beginn: number): void {
  const schwinger = ctx.createOscillator();
  const lautstaerke = ctx.createGain();
  schwinger.type = "square";
  schwinger.frequency.value = TONHOEHE_HZ;
  lautstaerke.gain.setValueAtTime(0.15, beginn);
  lautstaerke.gain.exponentialRampToValueAtTime(0.001, beginn + DAUER_S);
  schwinger.connect(lautstaerke).connect(ctx.destination);
  schwinger.start(beginn);
  schwinger.stop(beginn + DAUER_S);
}

/** Zwei kurze Töne; still, wo es kein Audio gibt. */
export function spieleBlitzton(): void {
  try {
    const ctx = audio();
    if (ctx === undefined) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const jetzt = ctx.currentTime;
    ton(ctx, jetzt);
    ton(ctx, jetzt + DAUER_S + PAUSE_S);
  } catch {
    // Kein Ton ist kein Fehler: Der Hinweis steht in der Leiste.
  }
}
