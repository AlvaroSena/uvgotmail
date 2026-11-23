/**
 * A synthesized ~7s 56k dial-up connection sound (Web Audio API, no audio files).
 * Browser-only: every entry point must run from a user gesture or after one.
 */

const SOUND_KEY = "ygm:sound";
const DIALED_KEY = "ygm:dialed";
const DURATION = 7;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let endsAt = 0;

/* ---------- preferences ---------- */

export function isMuted(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "off";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, muted ? "off" : "on");
  } catch {
    /* storage unavailable: preference just won't persist */
  }
  if (muted) stopDialup();
  window.dispatchEvent(new Event(SOUND_EVENT));
}

const SOUND_EVENT = "ygm:sound-change";

/** For useSyncExternalStore: notifies on mute changes (this tab or others). */
export function subscribeSound(cb: () => void) {
  window.addEventListener(SOUND_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SOUND_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function playedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DIALED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPlayedThisSession() {
  try {
    sessionStorage.setItem(DIALED_KEY, "1");
  } catch {}
}

export function clearPlayedThisSession() {
  try {
    sessionStorage.removeItem(DIALED_KEY);
  } catch {}
}

/* ---------- synthesis ---------- */

const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "0": [941, 1336],
};

function envelope(c: AudioContext, out: AudioNode, start: number, dur: number, level: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(level, start + 0.01);
  g.gain.setValueAtTime(level, Math.max(start + 0.01, start + dur - 0.015));
  g.gain.linearRampToValueAtTime(0, start + dur);
  g.connect(out);
  return g;
}

function tone(c: AudioContext, out: AudioNode, freqs: number[], start: number, dur: number, type: OscillatorType = "sine", level = 0.5) {
  const g = envelope(c, out, start, dur, level / freqs.length);
  return freqs.map((f) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    o.connect(g);
    o.start(start);
    o.stop(start + dur + 0.02);
    return o;
  });
}

function noise(c: AudioContext, out: AudioNode, start: number, dur: number, filterFreq: number, level = 0.4) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(filterFreq, start);
  filter.Q.setValueAtTime(0.7, start);
  src.connect(filter);
  filter.connect(envelope(c, out, start, dur, level));
  src.start(start);
  src.stop(start + dur + 0.02);
  return filter;
}

function schedule(c: AudioContext, out: AudioNode, t0: number) {
  // 1. Dial tone
  tone(c, out, [350, 440], t0, 1.0);

  // 2. Keypad digits
  let t = t0 + 1.1;
  for (const d of "5550199561") {
    tone(c, out, DTMF[d], t, 0.07);
    t += 0.13;
  }

  // 3. Ring-back
  tone(c, out, [440, 480], t0 + 2.6, 1.0, "sine", 0.4);

  // 4. Answer tone with phase-reversal blips
  tone(c, out, [2100], t0 + 3.7, 0.6, "sine", 0.35);
  tone(c, out, [1050], t0 + 3.9, 0.03, "square", 0.2);
  tone(c, out, [1050], t0 + 4.1, 0.03, "square", 0.2);

  // 5. Handshake: low "bong" pair, then hopping chirps
  tone(c, out, [980, 1180], t0 + 4.3, 0.35, "triangle", 0.45);
  const [hop] = tone(c, out, [1650], t0 + 4.65, 0.95, "square", 0.18);
  const [hop2] = tone(c, out, [1850], t0 + 4.65, 0.95, "sawtooth", 0.12);
  const hops = [1650, 2400, 1200, 1850, 2950, 1450, 2250, 1750, 3100, 1300, 2600, 1900];
  hops.forEach((f, i) => {
    hop.frequency.setValueAtTime(f, t0 + 4.65 + i * 0.075);
    hop2.frequency.setValueAtTime(f * 1.12, t0 + 4.65 + i * 0.075 + 0.03);
  });

  // 6. Scrambled data static with a warble, fading out
  noise(c, out, t0 + 5.55, 1.45, 1800, 0.5);
  const [warble] = tone(c, out, [1200], t0 + 5.55, 1.45, "sawtooth", 0.08);
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.setValueAtTime(23, t0 + 5.55);
  lfoGain.gain.setValueAtTime(400, t0 + 5.55);
  lfo.connect(lfoGain).connect(warble.frequency);
  lfo.start(t0 + 5.55);
  lfo.stop(t0 + DURATION);
}

/** Plays the connection sound. No-op if muted, unsupported, or already playing. */
export function playDialup() {
  if (typeof window === "undefined" || isMuted()) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.currentTime < endsAt) return;
  void ctx.resume();

  master?.disconnect();
  master = ctx.createGain();
  master.gain.setValueAtTime(0.25, ctx.currentTime);
  master.gain.setValueAtTime(0.25, ctx.currentTime + DURATION - 0.4);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + DURATION);
  master.connect(ctx.destination);

  const t0 = ctx.currentTime + 0.05;
  schedule(ctx, master, t0);
  endsAt = t0 + DURATION;
}

/** Hangs up: fades out and disconnects whatever is playing. */
export function stopDialup() {
  if (!ctx || !master) return;
  const m = master;
  const now = ctx.currentTime;
  m.gain.cancelScheduledValues(now);
  m.gain.setValueAtTime(m.gain.value, now);
  m.gain.linearRampToValueAtTime(0, now + 0.08);
  setTimeout(() => m.disconnect(), 120);
  master = null;
  endsAt = 0;
}

/* ---------- call rings ---------- */

let ringGain: GainNode | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;

function startRingLoop(cycle: (c: AudioContext, out: AudioNode, t: number) => void, periodSec: number) {
  if (typeof window === "undefined" || isMuted()) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  stopRinging();
  ctx ??= new AC();
  void ctx.resume();
  const c = ctx;
  ringGain = c.createGain();
  ringGain.gain.setValueAtTime(0.22, c.currentTime);
  ringGain.connect(c.destination);
  const out = ringGain;
  const run = () => cycle(c, out, c.currentTime + 0.05);
  run();
  ringTimer = setInterval(run, periodSec * 1000);
}

/** What the caller hears while waiting: US ring-back, 2s on / 4s off. */
export function playRingback() {
  startRingLoop((c, out, t) => tone(c, out, [440, 480], t, 2, "sine", 0.45), 6);
}

/** What the callee hears: a trilling desk-phone ring, two bursts every 4s. */
export function playRing() {
  startRingLoop((c, out, t) => {
    for (const offset of [0, 0.5]) {
      for (let i = 0; i < 8; i++) {
        tone(c, out, i % 2 ? [480, 620] : [440, 960], t + offset + i * 0.05, 0.05, "square", 0.25);
      }
    }
  }, 4);
}

export function stopRinging() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  if (ringGain && ctx) {
    const g = ringGain;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    setTimeout(() => g.disconnect(), 50);
  }
  ringGain = null;
}
