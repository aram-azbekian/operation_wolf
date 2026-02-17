import { MAX_DAMAGE } from "../data/constants";
import type { GameOutcome, HudState, WeaponKind } from "../types";

export class GameState {
  public frame = 0;
  public outcome: GameOutcome = "running";
  public score = 0;
  public rifleAmmo = 20;
  public grenadeAmmo = 5;
  public civiliansLost = 0;
  public damage = 0;

  public spendAmmo(kind: WeaponKind): boolean {
    if (kind === "rifle") {
      if (this.rifleAmmo <= 0) {
        return false;
      }
      this.rifleAmmo -= 1;
      return true;
    }

    if (this.grenadeAmmo <= 0) {
      return false;
    }
    this.grenadeAmmo -= 1;
    return true;
  }

  public addScore(value: number): void {
    this.score = Math.max(0, this.score + value);
  }

  public applyDamage(amount: number): void {
    this.damage = Math.max(0, Math.min(MAX_DAMAGE, this.damage + amount));
    if (this.damage >= MAX_DAMAGE) {
      this.outcome = "game_over";
    }
  }

  public advanceFrame(): void {
    this.frame += 1;
  }

  public markStageClear(): void {
    if (this.outcome === "running") {
      this.outcome = "stage_clear";
    }
  }

  public markCivilianLost(): void {
    this.civiliansLost += 1;
  }

  public toHudState(enemiesRemaining: number): HudState {
    return {
      score: this.score,
      rifleAmmo: this.rifleAmmo,
      grenadeAmmo: this.grenadeAmmo,
      civiliansLost: this.civiliansLost,
      damagePercent: this.damage,
      enemiesRemaining,
      frame: this.frame
    };
  }
}
