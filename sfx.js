// Offline Synthesized Casino Sound FX
class CasinoSFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  boot() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, type = 'triangle', dur = 0.1, vol = 0.12, delay = 0) {
    if (!this.enabled) return;
    this.boot();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(this.ctx.currentTime + delay);
    o.stop(this.ctx.currentTime + delay + dur);
  }
  click() { this.tone(540, 'triangle', 0.05, 0.09); }
  spin() { this.tone(240 + Math.random() * 140, 'square', 0.04, 0.04); }
  tumble(step) { this.tone(440 + step * 110, 'sine', 0.18, 0.15); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 'triangle', 0.2, 0.14, i * 0.07));
  }
  jackpot() {
    [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 'sawtooth', 0.3, 0.14, i * 0.08));
  }
}
window.sfx = new CasinoSFX();
