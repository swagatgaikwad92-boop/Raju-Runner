'use strict';
/* =====================================================================
   audio.js -- fully procedural WebAudio: SFX, street ambience, horns and
   a small Indian-scale (Bhairav) loop with tabla-ish percussion.
   No audio files, so the game starts offline. Optional voice lines use the
   browser's built-in speechSynthesis (off by default).
   ===================================================================== */
const Sound = {
  ctx: null, master: null, on: true, voice: false, musicTimer: null, hornTimer: null, step: 0, nextT: 0, mel: 3, noiseBuf: null, amb: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.9 : 0; this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
    } catch (e) { this.ctx = null; }
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.9 : 0; if (!v) { this.stopAll(); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {} } },
  tone(f, dur, type, vol, slide, delay) {
    if (!this.ctx || !this.on) return; const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, fc, type, delay) {
    if (!this.ctx || !this.on || !this.noiseBuf) return; const t0 = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf;
    f.type = type || 'lowpass'; f.frequency.value = fc || 800; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0, Math.random()); s.stop(t0 + dur + 0.02);
  },
  coin() { this.tone(988, 0.07, 'square', 0.05); this.tone(1319, 0.14, 'square', 0.05, 0, 0.06); },
  token() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, 0, i * 0.06)); },
  jump() { this.tone(260, 0.2, 'sine', 0.12, 380); },
  land() { this.noise(0.08, 0.1, 500); },
  slide() { this.noise(0.3, 0.07, 1400, 'bandpass'); },
  lane() { this.noise(0.06, 0.04, 2500, 'highpass'); },
  hit() { this.noise(0.45, 0.28, 400); this.tone(140, 0.4, 'sawtooth', 0.14, -90); },
  over() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, 0, i * 0.18)); },
  power() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.06, 0, i * 0.05)); },
  shield() { this.tone(300, 0.3, 'sine', 0.12, 500); this.noise(0.25, 0.1, 3000, 'highpass'); },
  ui() { this.tone(560, 0.06, 'square', 0.04); },
  buy() { this.tone(660, 0.08, 'triangle', 0.1); this.tone(990, 0.16, 'triangle', 0.1, 0, 0.08); },
  horn() { if (!this.ctx) return; const f = 380 + Math.random() * 120; this.tone(f, 0.22, 'sawtooth', 0.025); this.tone(f * 1.26, 0.22, 'sawtooth', 0.02); if (Math.random() < .5) { this.tone(f, 0.22, 'sawtooth', 0.025, 0, 0.3); this.tone(f * 1.26, 0.22, 'sawtooth', 0.02, 0, 0.3); } },
  startAmbience() {
    if (!this.ctx || !this.on || this.amb) return;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf; s.loop = true;
    f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.035; s.connect(f); f.connect(g); g.connect(this.master); s.start(); this.amb = { s, g };
    const hornLoop = () => { this.horn(); this.hornTimer = setTimeout(hornLoop, 3500 + Math.random() * 6000); }; this.hornTimer = setTimeout(hornLoop, 2000);
  },
  startMusic() {
    if (!this.ctx || !this.on || this.musicTimer) return; this.step = 0; this.nextT = this.ctx.currentTime + 0.08;
    this.musicTimer = setInterval(() => this.sched(), 90); this.startAmbience();
  },
  stopAll() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.hornTimer) { clearTimeout(this.hornTimer); this.hornTimer = null; }
    if (this.amb) { try { this.amb.s.stop(); } catch (e) {} this.amb = null; }
  },
  sched() {
    if (!this.ctx) return; const SC = [0, 1, 4, 5, 7, 8, 11, 12], stepDur = 0.19;
    while (this.nextT < this.ctx.currentTime + 0.3) {
      const t = this.nextT, s = this.step, dt = t - this.ctx.currentTime;
      if (s % 8 === 0 || s % 8 === 5) this.tone(95, 0.18, 'sine', 0.16, -45, dt);
      if (s % 2 === 0) this.noise(0.05, 0.05, 3500, 'highpass', dt);
      if (s % 4 === 2) this.tone(420, 0.07, 'triangle', 0.05, -120, dt);
      if (s % 16 === 0) this.tone(65.4, 1.4, 'sine', 0.07, 0, dt);
      if (Math.random() < 0.72) {
        this.mel = Math.max(0, Math.min(SC.length - 1, this.mel + Math.floor(Math.random() * 3) - 1 + (Math.random() < .1 ? 2 : 0)));
        const f = 261.6 * Math.pow(2, SC[this.mel] / 12) * (this.mel > 5 ? 1 : 1);
        this.tone(f, 0.16, 'sawtooth', 0.022, 0, dt); this.tone(f * 2, 0.1, 'triangle', 0.012, 0, dt);
      }
      this.step++; this.nextT += stepDur;
    }
  },
  say(text) {
    if (!this.voice || !this.on || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[×₹]/g, '')); u.lang = 'en-IN'; u.rate = 1.15; u.pitch = 1.5; u.volume = 0.8; speechSynthesis.speak(u); } catch (e) {}
  }
};
