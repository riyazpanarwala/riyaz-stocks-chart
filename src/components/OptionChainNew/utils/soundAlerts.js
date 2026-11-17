// ═══════════════════════════════════════════════════════════════
// BROWSER AUDIO CHIME FOR BREAKOUT SIGNALS
// Synthesizes a clean two-tone chime via Web Audio API (no external mp3).
// Reuses a single module-level AudioContext to prevent context exhaustion.
// ═══════════════════════════════════════════════════════════════

let sharedAudioCtx = null;

export function playBreakoutChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    const startTime = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, startTime);
    gain1.gain.setValueAtTime(0.18, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.25);

    // Tone 2: A5 (880.00 Hz) - higher pitch confirmation
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, startTime + 0.12);
    gain2.gain.setValueAtTime(0.22, startTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.12);
    osc2.stop(startTime + 0.55);
  } catch {
    // Audio autoplay restrictions or browser denial; ignore safely
  }
}
