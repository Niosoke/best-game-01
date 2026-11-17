// Lumen Tide — all sound is synthesised live with WebAudio. No audio files.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.padNodes = null;
    this.comboStep = 0;
    // A slow, dreamy chord cycle: Am9 — Fmaj7 — Cmaj7 — G6
    this.chords = [
      [110.0, 164.81, 220.0, 261.63],
      [87.31, 174.61, 220.0, 261.63],
      [130.81, 196.0, 246.94, 329.63],
      [98.0, 196.0, 246.94, 293.66],
    ];
    this.chordIndex = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicTimer) return;
    const playChord = () => {
      if (!this.ctx || this.muted) return;
      const freqs = this.chords[this.chordIndex % this.chords.length];
      this.chordIndex += 1;
      const now = this.ctx.currentTime;
      const dur = 4.4;
      // fade out the old pad
      if (this.padNodes) {
        for (const o of this.padNodes) {
          try { o.gain.setTargetAtTime(0, now, 0.4); o.osc.stop(now + 1.6); } catch (_) { /* already stopped */ }
        }
      }
      this.padNodes = freqs.map((f) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.detune.value = (Math.random() - 0.5) * 6;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 1.8);
        gain.gain.setValueAtTime(0.5, now + dur - 1.2);
        gain.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(now); osc.stop(now + dur + 0.1);
        return { osc, gain };
      });
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 4000);
  }

  stopMusic() {
    if (this.musicTimer) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.padNodes) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      for (const o of this.padNodes) { try { o.osc.stop(now + 0.1); } catch (_) { /* noop */ } }
      this.padNodes = null;
    }
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + dur + 0.02);
  }

  _noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    src.start(now);
  }

  pickup(combo) {
    // Pentatonic ladder: higher combo climbs the scale.
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const idx = Math.min(scale.length - 1, Math.floor(combo) + this.comboStep);
    this.comboStep = (this.comboStep + 1) % 3;
    this._tone(scale[idx], 0.28, 'sine', 0.35);
    this._tone(scale[idx] * 2, 0.18, 'triangle', 0.12);
  }

  shard() { this._tone(1567.98, 0.3, 'sine', 0.25); this._tone(2093.0, 0.35, 'sine', 0.18); }

  dash() { this._noise(0.22, 0.4, 3200); this._tone(320, 0.18, 'sine', 0.18, 720); }

  hit() {
    this._tone(140, 0.35, 'sawtooth', 0.4, 55);
    this._noise(0.25, 0.5, 900);
  }

  banish() { this._tone(660, 0.4, 'triangle', 0.3, 1320); this._noise(0.3, 0.25, 5000); }

  bossHit() { this._tone(98, 0.5, 'sawtooth', 0.45, 49); this._noise(0.4, 0.4, 700); }

  waveClear() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      window.setTimeout(() => this._tone(f, 0.5, 'triangle', 0.3), i * 110);
    });
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
      window.setTimeout(() => this._tone(f, 0.7, 'triangle', 0.3), i * 140);
    });
  }

  gameOver() {
    [392.0, 329.63, 261.63, 196.0].forEach((f, i) => {
      window.setTimeout(() => this._tone(f, 0.8, 'sine', 0.3), i * 220);
    });
  }

  buy() { this._tone(880, 0.15, 'sine', 0.3); window.setTimeout(() => this._tone(1318.51, 0.25, 'sine', 0.3), 90); }

  denied() { this._tone(220, 0.2, 'square', 0.15, 180); }
}
