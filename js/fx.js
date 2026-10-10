// Read-aloud voice, little sounds, and celebration effects (confetti, stars, bubbles, hearts).
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const fx = {};
  const soundOn = () => !APP.state || !APP.state.settings || APP.state.settings.sound !== false;

  // ---------- speech ----------
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let voice = null;
  function pickVoice() {
    const vs = window.speechSynthesis.getVoices();
    voice =
      vs.find((v) => /^en[-_]US/i.test(v.lang) && /Samantha|Google US|Aria|Jenny|Ava|Allison/i.test(v.name)) ||
      vs.find((v) => /^en[-_]US/i.test(v.lang)) ||
      vs.find((v) => /^en/i.test(v.lang)) ||
      null;
  }
  if (canSpeak) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  fx.canSpeak = canSpeak;
  fx.speak = (text, rate = 0.85) => {
    if (!canSpeak || !text) return false;
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.05;
    const busy = synth.speaking || synth.pending;
    synth.cancel();
    // Some browsers drop an utterance queued right after cancel().
    if (busy) setTimeout(() => synth.speak(u), 80);
    else synth.speak(u);
    return true;
  };
  fx.hush = () => { if (canSpeak) window.speechSynthesis.cancel(); };

  // ---------- sounds (WebAudio, no files) ----------
  let ctx = null;
  function tone(freq, start = 0, dur = 0.1, type = 'sine', vol = 0.12) {
    if (!soundOn()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ctx.currentTime + start;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  fx.sfx = {
    good: () => { tone(880, 0, 0.09, 'triangle'); tone(1320, 0.05, 0.08, 'triangle', 0.08); },
    bad: () => tone(180, 0, 0.18, 'square', 0.06),
    done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle')),
    coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.15, 'square', 0.05); },
    knock: () => [0, 0.5, 1.0, 1.4].forEach((t, i) => tone(300 + i * 30, t, 0.1)),
    hatch: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.25)),
  };

  // ---------- celebrations ----------
  const COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff8fab'];
  let canvas = null, c2d = null, parts = [], running = false;
  fx.celebrate = (count = 80, kind) => {
    if (typeof document === 'undefined') return;
    kind = kind || (APP.state && APP.state.equipped && APP.state.equipped.effect) || 'confetti';
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'fx';
      document.body.appendChild(canvas);
      c2d = canvas.getContext('2d');
    }
    const w = (canvas.width = window.innerWidth), h = (canvas.height = window.innerHeight);
    for (let i = 0; i < count; i++) {
      const p = { kind, life: 0, max: 90 + Math.random() * 60, color: COLORS[i % COLORS.length], size: 6 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 };
      if (kind === 'bubbles') Object.assign(p, { x: Math.random() * w, y: h + 20, vx: (Math.random() - 0.5), vy: -2 - Math.random() * 3, size: 8 + Math.random() * 18 });
      else {
        const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
        Object.assign(p, { x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6 });
      }
      parts.push(p);
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
  function loop() {
    c2d.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life < p.max);
    for (const p of parts) {
      p.life++;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.kind !== 'bubbles') { p.vy += 0.3; p.vx *= 0.99; }
      c2d.globalAlpha = Math.max(0, 1 - p.life / p.max);
      c2d.save();
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      if (p.kind === 'confetti') { c2d.fillStyle = p.color; c2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
      else if (p.kind === 'bubbles') { c2d.strokeStyle = p.color; c2d.lineWidth = 2; c2d.beginPath(); c2d.arc(0, 0, p.size, 0, Math.PI * 2); c2d.stroke(); }
      else { c2d.font = p.size * 2.4 + 'px serif'; c2d.fillText(p.kind === 'stars' ? '⭐' : '💖', 0, 0); }
      c2d.restore();
    }
    c2d.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; c2d.clearRect(0, 0, canvas.width, canvas.height); }
  }

  APP.fx = fx;
})();
