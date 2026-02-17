export class StereoSampleRingBuffer {
  private readonly mask: number;
  private readonly samplesL: Float32Array;
  private readonly samplesR: Float32Array;
  private writeCursor = 0;
  private readCursor = 0;

  public constructor(size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) {
      throw new Error("StereoSampleRingBuffer size must be a power of two and >= 2");
    }

    this.mask = size - 1;
    this.samplesL = new Float32Array(size);
    this.samplesR = new Float32Array(size);
  }

  public clear(): void {
    this.writeCursor = 0;
    this.readCursor = 0;
  }

  public push(left: number, right: number): void {
    const next = (this.writeCursor + 1) & this.mask;
    if (next === this.readCursor) {
      // Drop the oldest sample when full.
      this.readCursor = (this.readCursor + 1) & this.mask;
    }

    this.samplesL[this.writeCursor] = left;
    this.samplesR[this.writeCursor] = right;
    this.writeCursor = next;
  }

  public get availableSamples(): number {
    return (this.writeCursor - this.readCursor) & this.mask;
  }

  public fillChannels(outL: Float32Array, outR: Float32Array): void {
    for (let i = 0; i < outL.length; i += 1) {
      if (this.readCursor === this.writeCursor) {
        outL[i] = 0;
        outR[i] = 0;
        continue;
      }

      outL[i] = this.samplesL[this.readCursor];
      outR[i] = this.samplesR[this.readCursor];
      this.readCursor = (this.readCursor + 1) & this.mask;
    }
  }
}
