import { useUiStore } from '../stores/ui';

/**
 * Synthesized UI sounds (Web Audio, no asset files). Browsers block audio
 * until the user interacts with the page, so the context unlocks on the
 * first pointer/key event and every play is a silent no-op before that.
 */
let ctx: AudioContext | null = null;

function unlock() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function initSounds(): void {
  document.addEventListener('pointerdown', unlock, { once: false, passive: true });
  document.addEventListener('keydown', unlock, { once: false, passive: true });
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', peak = 0.06): void {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const muted = () => useUiStore.getState().soundsMuted;

/** Bell notification — gentle two-note chime. */
export function playNotify(): void {
  if (muted()) return;
  tone(880, 0, 0.18);
  tone(1174.66, 0.12, 0.28);
}

/** Chat / assistant message — soft pop. */
export function playChat(): void {
  if (muted()) return;
  tone(523.25, 0, 0.1, 'triangle', 0.05);
  tone(659.25, 0.06, 0.14, 'triangle', 0.05);
}

/** SOS alert — urgent triple beep (staff only receive this event). */
export function playSos(): void {
  if (muted()) return;
  for (let i = 0; i < 3; i++) {
    tone(950, i * 0.22, 0.14, 'square', 0.07);
    tone(760, i * 0.22 + 0.07, 0.12, 'square', 0.05);
  }
}
