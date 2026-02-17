import { describe, expect, it } from "vitest";
import { GameState } from "../src/game/core/GameState";
import { WeaponSystem } from "../src/game/core/WeaponSystem";

const none = { pressed: false, held: false, released: false };

describe("WeaponSystem", () => {
  it("fires rifle repeatedly using cooldown", () => {
    const system = new WeaponSystem();
    const state = new GameState();

    const input = {
      up: none,
      down: none,
      left: none,
      right: none,
      a: none,
      b: { pressed: true, held: true, released: false },
      start: none,
      select: none
    };

    const shot1 = system.update(input, state);
    expect(shot1.length).toBe(1);

    state.advanceFrame();
    const shot2 = system.update(input, state);
    expect(shot2.length).toBe(0);

    for (let i = 0; i < 4; i += 1) {
      state.advanceFrame();
    }

    const shot3 = system.update(input, state);
    expect(shot3.length).toBe(1);
  });
});
