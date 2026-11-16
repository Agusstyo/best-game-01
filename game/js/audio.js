// audio.js — every sound in ORBITFALL is synthesized live with WebAudio:
// no audio files, no samples, just oscillators and filtered noise shaped
// into lasers, booms and chimes.

const MASTER_VOLUME = 0.32;

export function createSoundBank() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
    noiseBuffer = buildNoiseBuffer(context);
    return true;
  }

  function buildNoiseBuffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function tone({ type = 'square', from = 440, to = null, at = 0, dur = 0.15, vol = 0.5 }) {
    if (!ensureContext()) return;
    const t0 = context.currentTime + at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ at = 0, dur = 0.3, vol = 0.6, cutoff = 1200, sweepTo = null }) {
    if (!ensureContext()) return;
    const t0 = context.currentTime + at;
    const src = context.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    if (sweepTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), t0 + dur);
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (master && context) master.gain.setValueAtTime(muted ? 0 : MASTER_VOLUME, context.currentTime);
      return muted;
    },
    isMuted() {
      return muted;
    },
    laser() {
      tone({ type: 'sawtooth', from: 920, to: 240, dur: 0.09, vol: 0.16 });
    },
    explosion(size = 1) {
      noise({ dur: 0.28 + size * 0.1, vol: 0.5, cutoff: 900 + size * 300, sweepTo: 90 });
      tone({ type: 'triangle', from: 160, to: 40, dur: 0.3 + size * 0.08, vol: 0.4 });
    },
    planetHit() {
      noise({ dur: 0.4, vol: 0.65, cutoff: 500, sweepTo: 60 });
      tone({ type: 'sine', from: 90, to: 30, dur: 0.45, vol: 0.7 });
    },
    pickup() {
      tone({ type: 'sine', from: 660, dur: 0.09, vol: 0.3 });
      tone({ type: 'sine', from: 990, at: 0.07, dur: 0.14, vol: 0.3 });
    },
    waveClear() {
      tone({ type: 'triangle', from: 523, dur: 0.12, vol: 0.3 });
      tone({ type: 'triangle', from: 659, at: 0.1, dur: 0.12, vol: 0.3 });
      tone({ type: 'triangle', from: 784, at: 0.2, dur: 0.22, vol: 0.32 });
    },
    gameOver() {
      tone({ type: 'sawtooth', from: 392, to: 380, dur: 0.25, vol: 0.3 });
      tone({ type: 'sawtooth', from: 311, to: 300, at: 0.24, dur: 0.25, vol: 0.3 });
      tone({ type: 'sawtooth', from: 262, to: 110, at: 0.48, dur: 0.6, vol: 0.34 });
    },
    victory() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.13, dur: 0.24, vol: 0.32 }));
      tone({ type: 'sine', from: 1319, at: 0.55, dur: 0.5, vol: 0.25 });
    },
    uiClick() {
      tone({ type: 'sine', from: 440, dur: 0.06, vol: 0.2 });
    },
  };
}
