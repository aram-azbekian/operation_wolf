import type { InputSnapshot, WeaponKind } from "../types";
import { FIRE_HIT_RADIUS, GRENADE_HIT_RADIUS, WEAPONS } from "../data/constants";
import { GameState } from "./GameState";

export type FiredShot = {
  kind: WeaponKind;
  damage: number;
  radius: number;
};

export class WeaponSystem {
  private readonly nextAllowedFrame: Record<WeaponKind, number> = {
    rifle: 0,
    grenade: 0
  };

  private active: WeaponKind = "rifle";

  public get activeWeapon(): WeaponKind {
    return this.active;
  }

  public update(input: InputSnapshot, state: GameState): FiredShot[] {
    if (input.select.pressed) {
      this.active = this.active === "rifle" ? "grenade" : "rifle";
    }

    const shots: FiredShot[] = [];

    if (input.b.held) {
      const shot = this.tryFire(this.active, state);
      if (shot) {
        shots.push(shot);
      }
    }

    if (input.a.pressed) {
      const shot = this.tryFire("grenade", state);
      if (shot) {
        shots.push(shot);
      }
    }

    return shots;
  }

  private tryFire(kind: WeaponKind, state: GameState): FiredShot | null {
    const config = WEAPONS[kind];
    if (state.frame < this.nextAllowedFrame[kind]) {
      return null;
    }

    if (!state.spendAmmo(kind)) {
      return null;
    }

    this.nextAllowedFrame[kind] = state.frame + config.fireIntervalFrames;

    return {
      kind,
      damage: config.damage,
      radius: kind === "rifle" ? FIRE_HIT_RADIUS : GRENADE_HIT_RADIUS
    };
  }
}
