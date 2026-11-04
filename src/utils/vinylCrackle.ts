/**
 * Realistic procedural vinyl crackle generator using Web Audio API
 */
export class VinylCrackleEffect {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning: boolean = false;

  constructor() {}

  public start(audioCtx: AudioContext) {
    if (this.isRunning) return;
    this.ctx = audioCtx;

    try {
      const bufferSize = audioCtx.sampleRate * 4; // 4 seconds looping buffer
      const buffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          // Vinyl needle surface hiss + random pops/clicks
          const isPop = Math.random() < 0.0006;
          const popAmplitude = isPop ? (Math.random() - 0.5) * 0.45 : 0;
          const hiss = (Math.random() - 0.5) * 0.015;
          data[i] = popAmplitude + hiss;
        }
      }

      this.noiseNode = audioCtx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      // Filter: vinyl hiss usually peaks in high-mids
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 0.8;

      this.gainNode = audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);

      this.noiseNode.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(audioCtx.destination);

      this.noiseNode.start(0);
      this.isRunning = true;
    } catch (err) {
      console.warn('Vinyl crackle audio initialization failed:', err);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    try {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        if (this.noiseNode) {
          this.noiseNode.stop();
          this.noiseNode.disconnect();
          this.noiseNode = null;
        }
        this.isRunning = false;
      }, 120);
    } catch {
      this.isRunning = false;
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol * 0.05, this.ctx.currentTime);
    }
  }
}
