import { describe, expect, it } from "vitest";
import { GameState } from "../src/game/core/GameState";

describe("GameState", () => {
  it("enters game_over when damage reaches threshold", () => {
    const state = new GameState();
    state.applyDamage(50);
    expect(state.outcome).toBe("running");

    state.applyDamage(50);
    expect(state.outcome).toBe("game_over");
    expect(state.damage).toBe(100);
  });
});
