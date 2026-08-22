let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface ToneStep {
  freq: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
}

/** Plays a short sequence of generated tones. No binary audio assets are
 * shipped — this keeps the app free of licensing questions and asset weight. */
export function playTones(steps: ToneStep[]): void {
  const audioCtx = getContext();
  if (!audioCtx) return;
  let startAt = audioCtx.currentTime;
  for (const step of steps) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = step.type ?? 'square';
    osc.frequency.value = step.freq;
    const peak = step.gain ?? 0.08;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + step.durationMs / 1000);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(startAt + step.durationMs / 1000 + 0.02);
    startAt += step.durationMs / 1000;
  }
}

export const SOUND_PRESETS: Record<string, ToneStep[]> = {
  click: [{ freq: 440, durationMs: 60 }],
  join: [{ freq: 523, durationMs: 90 }, { freq: 659, durationMs: 120 }],
  ready: [{ freq: 660, durationMs: 80 }],
  countdown: [{ freq: 392, durationMs: 90 }],
  go: [{ freq: 784, durationMs: 160 }],
  correct: [{ freq: 660, durationMs: 90 }, { freq: 880, durationMs: 140 }],
  incorrect: [{ freq: 220, durationMs: 90, type: 'sawtooth' }, { freq: 160, durationMs: 160, type: 'sawtooth' }],
  victory: [
    { freq: 523, durationMs: 120 },
    { freq: 659, durationMs: 120 },
    { freq: 784, durationMs: 120 },
    { freq: 1046, durationMs: 220 },
  ],
  defeat: [{ freq: 330, durationMs: 160, type: 'sawtooth' }, { freq: 220, durationMs: 260, type: 'sawtooth' }],
};

export type SoundName = keyof typeof SOUND_PRESETS;
