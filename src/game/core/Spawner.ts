import type { StageEvent } from "../types";

export class Spawner {
  private readonly events: StageEvent[];
  private cursor = 0;

  public constructor(events: StageEvent[]) {
    this.events = [...events].sort((a, b) => a.frame - b.frame);
  }

  public pull(frame: number): StageEvent[] {
    const spawned: StageEvent[] = [];
    while (this.cursor < this.events.length && this.events[this.cursor].frame <= frame) {
      spawned.push(this.events[this.cursor]);
      this.cursor += 1;
    }
    return spawned;
  }

  public get isDone(): boolean {
    return this.cursor >= this.events.length;
  }
}
