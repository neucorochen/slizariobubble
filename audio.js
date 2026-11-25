(function () {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function playTone(freqStart, freqEnd, duration, type = "sine", vol = 0.08) {
    if (muted) return;
    ensureCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  window.AeroAudio = {
    pop() { playTone(520, 880, 0.09, "sine", 0.06); },
    click() { playTone(640, 960, 0.06, "triangle", 0.05); },
    buy() {
      playTone(523, 659, 0.1, "sine", 0.08);
      setTimeout(() => playTone(659, 1046, 0.14, "sine", 0.08), 80);
    },
    burst() { playTone(320, 90, 0.28, "sine", 0.12); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; }
  };
})();
