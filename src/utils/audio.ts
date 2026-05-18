// Procedural Cozy Audio Synthesizer - High-Fidelity Web Audio Engine
// Creates real-time atmospheric audio loops and SFX procedurally without external audio assets.

class CozyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Rain
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  
  // River
  private riverNode: AudioBufferSourceNode | null = null;
  private riverGain: GainNode | null = null;
  private riverLFO: OscillatorNode | null = null;

  // Piano / Lounge Music Loop
  private pianoInterval: any = null;
  private pianoGain: GainNode | null = null;
  private isPianoPlaying = false;
  private currentChordIndex = 0;

  // Auto Chimes
  private chimesInterval: any = null;

  constructor() {
    // Graceful setup on user interaction
    if (typeof window !== "undefined") {
      const handleUserInteraction = () => {
        this.init();
        window.removeEventListener("pointerdown", handleUserInteraction);
        window.removeEventListener("keydown", handleUserInteraction);
      };
      window.addEventListener("pointerdown", handleUserInteraction);
      window.addEventListener("keydown", handleUserInteraction);
    }
  }

  public init() {
    if (this.ctx) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Master level 40%
      this.masterGain.connect(this.ctx.destination);

      console.log("[CozyAudioEngine] Web Audio context initialized successfully.");
    } catch (e) {
      console.warn("[CozyAudioEngine] Web Audio API initialization failed:", e);
    }
  }

  private ensureContextActive(): boolean {
    this.init();
    if (!this.ctx) return false;
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return true;
  }

  // --- Rain Generator (White Noise + Cozy Lowpass Filter) ---
  public startRain() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;
    if (this.rainNode) return;

    try {
      // Create white noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = buffer;
      this.rainNode.loop = true;

      // Filter to make the noise sound like cozy roof rain
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.rainGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 2.0); // 2 second fade in

      this.rainNode.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      this.rainNode.start(0);
      console.log("[CozyAudioEngine] Procedural cozy rain started.");
    } catch (e) {
      console.error("[CozyAudioEngine] Failed to start rain:", e);
    }
  }

  public stopRain() {
    if (!this.rainNode || !this.rainGain) return;
    try {
      const current = this.ctx?.currentTime || 0;
      this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, current);
      this.rainGain.gain.linearRampToValueAtTime(0, current + 1.5); // fade out
      
      const node = this.rainNode;
      setTimeout(() => {
        try {
          node.stop();
        } catch (e) {}
      }, 1600);

      this.rainNode = null;
      this.rainGain = null;
      console.log("[CozyAudioEngine] Cozy rain stopped.");
    } catch (e) {}
  }

  public setRainVolume(vol: number) {
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.linearRampToValueAtTime(vol * 0.18, this.ctx.currentTime + 0.3);
    }
  }

  // --- River Generator (White Noise + LFO-Modulated Cozy Ripple Bandpass Filter) ---
  public startRiver() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;
    if (this.riverNode) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.riverNode = this.ctx.createBufferSource();
      this.riverNode.buffer = buffer;
      this.riverNode.loop = true;

      // Filter for water splash/ripple sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      // Low frequency oscillator (LFO) to modulate filter frequency organically
      this.riverLFO = this.ctx.createOscillator();
      this.riverLFO.type = "sine";
      this.riverLFO.frequency.setValueAtTime(0.18, this.ctx.currentTime); // very slow oscillation

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(180, this.ctx.currentTime); // modulate around 180hz range

      this.riverLFO.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.riverGain = this.ctx.createGain();
      this.riverGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.riverGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 2.5); // soft fade in

      this.riverNode.connect(filter);
      filter.connect(this.riverGain);
      this.riverGain.connect(this.masterGain);

      this.riverLFO.start(0);
      this.riverNode.start(0);
      console.log("[CozyAudioEngine] Procedural cozy river ripples started.");
    } catch (e) {
      console.error("[CozyAudioEngine] Failed to start river:", e);
    }
  }

  public stopRiver() {
    if (!this.riverNode || !this.riverGain) return;
    try {
      const current = this.ctx?.currentTime || 0;
      this.riverGain.gain.setValueAtTime(this.riverGain.gain.value, current);
      this.riverGain.gain.linearRampToValueAtTime(0, current + 2.0); // smooth fade out
      
      const node = this.riverNode;
      const lfo = this.riverLFO;
      setTimeout(() => {
        try {
          node.stop();
          lfo?.stop();
        } catch (e) {}
      }, 2100);

      this.riverNode = null;
      this.riverGain = null;
      this.riverLFO = null;
      console.log("[CozyAudioEngine] River ripples stopped.");
    } catch (e) {}
  }

  public setRiverVolume(vol: number) {
    if (this.riverGain && this.ctx) {
      this.riverGain.gain.linearRampToValueAtTime(vol * 0.12, this.ctx.currentTime + 0.3);
    }
  }

  // --- Luxurious Lounge Piano (Procedurally Loops warm jazz chord progressions) ---
  public startPiano() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;
    if (this.isPianoPlaying) return;
    this.isPianoPlaying = true;

    this.pianoGain = this.ctx.createGain();
    this.pianoGain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    this.pianoGain.connect(this.masterGain);

    // Jazzy cozy chords: Cmaj7 ➡️ Am7 ➡️ Dm7 ➡️ G7(9)
    const jazzChords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
      [110.00, 130.81, 164.81, 196.00], // Am7 (A2, C3, E3, G3)
      [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
      [98.00,  146.83, 174.61, 220.00]  // G7(9) (G2, D3, F3, A3)
    ];

    console.log("[CozyAudioEngine] Cozy Jazz Lounge Piano melody loop active.");

    const playNextJazzChord = () => {
      if (!this.isPianoPlaying || !this.ctx || !this.pianoGain) return;

      const chord = jazzChords[this.currentChordIndex];
      const now = this.ctx.currentTime;

      // Play notes of chord with slight arpeggiation (strum look)
      chord.forEach((freq, index) => {
        if (!this.ctx || !this.pianoGain) return;
        
        const noteDelay = index * 0.08; // elegant strum delay
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        // Warm cozy Rhodes sound: triangle wave + soft lowpass filter
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + noteDelay);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(700, now + noteDelay);

        noteGain.gain.setValueAtTime(0, now + noteDelay);
        noteGain.gain.linearRampToValueAtTime(0.18, now + noteDelay + 0.05); // quick soft attack
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + noteDelay + 3.8); // warm long decay

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.pianoGain);

        osc.start(now + noteDelay);
        osc.stop(now + noteDelay + 4.0);
      });

      this.currentChordIndex = (this.currentChordIndex + 1) % jazzChords.length;
    };

    // Strum immediately
    playNextJazzChord();

    // Loop every 4 seconds
    this.pianoInterval = setInterval(playNextJazzChord, 4000);
  }

  public stopPiano() {
    this.isPianoPlaying = false;
    if (this.pianoInterval) {
      clearInterval(this.pianoInterval);
      this.pianoInterval = null;
    }
    if (this.pianoGain) {
      try {
        this.pianoGain.disconnect();
      } catch (e) {}
      this.pianoGain = null;
    }
    console.log("[CozyAudioEngine] Jazz Lounge Piano melody loop stopped.");
  }

  public setPianoVolume(vol: number) {
    if (this.pianoGain && this.ctx) {
      this.pianoGain.gain.linearRampToValueAtTime(vol * 0.16, this.ctx.currentTime + 0.3);
    }
  }

  // --- Sound FX: Wind Chime (Crystal Bell Sound) ---
  public playChime() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      // High glass chime frequencies
      const frequencies = [1200, 1580, 1920];
      
      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04); // tiny delays

        gain.gain.setValueAtTime(0.06, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.2); // ring out

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 1.3);
      });
    } catch (e) {}
  }

  // --- Sound FX: UI Button Click ---
  public playClick() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // --- Sound FX: Cute popping bubble (Emojis & Chat bubbles) ---
  public playCuteBubble() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08); // high pitch pop

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // --- Sound FX: Sweet Gift Ring Bell ---
  public playGiftBell() {
    if (!this.ensureContextActive() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      // Beautiful pure ringing bell harmonies (A5 & E6)
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now);

      gain1.gain.setValueAtTime(0.05, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      gain2.gain.setValueAtTime(0.03, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 1.6);
      osc2.stop(now + 1.6);
    } catch (e) {}
  }

  // --- Auto Chimes (Gentle winds blowing in background) ---
  public activateAutoChimes() {
    if (this.chimesInterval) return;

    const playRandomChime = () => {
      // 30% chance to play gentle wind chime every 10 seconds
      if (Math.random() < 0.3) {
        this.playChime();
      }
    };

    this.chimesInterval = setInterval(playRandomChime, 10000);
  }

  public stopAutoChimes() {
    if (this.chimesInterval) {
      clearInterval(this.chimesInterval);
      this.chimesInterval = null;
    }
  }
}

export const cozyAudio = new CozyAudioEngine();
