/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY - Audio Engine
 *  8-bit sound synthesis using Web Audio API
 *  Procedural chiptune BGM and retro SFX
 *  Awsome antique Music Vibes
 * ═══════════════════════════════════════════════════════════
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
    this.musicPlaying = false;
    this.musicInterval = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.currentNoteIndex = 0;
  }

  /** Initialize audio context (must be called from user gesture) */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);

      // Music channel
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);

      // SFX channel
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  /** Resume audio context if suspended */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ─── Sound Effect Helpers ───────────────────────────────

  _playTone(freq, duration, type = 'square', gainNode = null, volume = 0.3) {
    if (!this.initialized || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _playNoise(duration, volume = 0.1) {
    if (!this.initialized || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(t);
    source.stop(t + duration);
  }

  // ─── Game Sound Effects ─────────────────────────────────

  /** Piece moved left/right */
  playMove() {
    this._playTone(180, 0.06, 'square', null, 0.15);
  }

  /** Piece rotated */
  playRotate() {
    this._playTone(360, 0.08, 'square', null, 0.2);
  }

  /** Piece soft-dropped */
  playSoftDrop() {
    this._playTone(100, 0.04, 'triangle', null, 0.1);
  }

  /** Piece hard-dropped */
  playHardDrop() {
    this._playNoise(0.12, 0.2);
    this._playTone(60, 0.15, 'sawtooth', null, 0.25);
  }

  /** Piece locked in place */
  playLock() {
    this._playTone(120, 0.1, 'square', null, 0.15);
    this._playNoise(0.05, 0.08);
  }

  /** Lines cleared */
  playLineClear(lineCount) {
    if (!this.initialized || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    
    if (lineCount === 4) {
      // TETRIS! Triumphant ascending arpeggio
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.3);
      });
    } else {
      // Normal line clear - ascending sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(800 + lineCount * 200, t + 0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }

  /** Level up celebration */
  playLevelUp() {
    if (!this.initialized || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const melody = [523, 659, 784, 1047];
    
    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.25);
    });
  }

  /** Combo sound */
  playCombo(comboCount) {
    if (!this.initialized || !this.sfxEnabled) return;
    const freq = 400 + comboCount * 100;
    this._playTone(freq, 0.1, 'square', null, 0.2);
    setTimeout(() => this._playTone(freq * 1.5, 0.08, 'square', null, 0.15), 60);
  }

  /** Hold piece */
  playHold() {
    this._playTone(440, 0.06, 'triangle', null, 0.15);
    setTimeout(() => this._playTone(550, 0.06, 'triangle', null, 0.12), 50);
  }

  /** Game over sound */
  playGameOver() {
    if (!this.initialized || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const notes = [400, 350, 300, 250, 200, 150];
    
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.35);
    });
  }

  // ─── Background Music ───────────────────────────────────
  // Simple procedural chiptune melody (original composition)

  startMusic() {
    if (!this.initialized || !this.musicEnabled || this.musicPlaying) return;
    this.musicPlaying = true;
    this.currentNoteIndex = 0;
    
    // Simple 8-bit melody - original composition inspired by retro games
    // Notes in Hz (C major and pentatonic patterns)
    this._melody = [
      // Phrase 1
      523, 494, 440, 494, 523, 523, 523, 0,
      494, 440, 392, 440, 494, 494, 494, 0,
      440, 392, 349, 392, 440, 440, 494, 523,
      494, 440, 392, 440, 494, 0, 523, 0,
      // Phrase 2  
      659, 623, 587, 523, 494, 494, 523, 0,
      587, 523, 494, 440, 392, 392, 440, 0,
      494, 440, 392, 349, 330, 330, 349, 392,
      440, 494, 523, 0, 494, 440, 392, 0,
    ];

    this._bass = [
      262, 0, 262, 0, 220, 0, 220, 0,
      247, 0, 247, 0, 196, 0, 196, 0,
      220, 0, 220, 0, 175, 0, 175, 0,
      247, 0, 247, 0, 262, 0, 262, 0,
      330, 0, 330, 0, 247, 0, 247, 0,
      294, 0, 294, 0, 220, 0, 220, 0,
      247, 0, 247, 0, 165, 0, 165, 0,
      220, 0, 220, 0, 196, 0, 196, 0,
    ];

    const tempo = 180; // BPM
    const noteLength = (60 / tempo) * 1000; // ms per beat

    this.musicInterval = setInterval(() => {
      if (!this.musicPlaying) return;
      
      const t = this.ctx.currentTime;
      const melodyNote = this._melody[this.currentNoteIndex % this._melody.length];
      const bassNote = this._bass[this.currentNoteIndex % this._bass.length];
      const dur = (60 / tempo) * 0.8;

      // Melody voice
      if (melodyNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = melodyNote;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + dur);
      }

      // Bass voice
      if (bassNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = bassNote;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + dur);
      }

      this.currentNoteIndex++;
    }, noteLength);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
}
