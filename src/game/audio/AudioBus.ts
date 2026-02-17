export class AudioBus {
  private readonly ctx: AudioContext | null;

  public constructor() {
    this.ctx = typeof window !== "undefined" && "AudioContext" in window ? new AudioContext() : null;
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public playShot(): void {
    this.beep(880, 0.04, "square", 0.05);
  }

  public playGrenade(): void {
    this.beep(160, 0.15, "triangle", 0.09);
  }

  public playHit(): void {
    this.beep(420, 0.06, "square", 0.04);
  }

  public playExplosion(): void {
    this.beep(90, 0.22, "sawtooth", 0.1);
  }

  public playCivilianPenalty(): void {
    this.beep(240, 0.12, "square", 0.06);
  }

  private beep(freq: number, durationSec: number, type: OscillatorType, gainValue: number): void {
    if (!this.ctx) {
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  }
}
