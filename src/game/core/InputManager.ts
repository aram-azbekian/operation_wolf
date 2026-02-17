import Phaser from "phaser";
import type { ButtonState, InputSnapshot } from "../types";

const toButtonState = (key: Phaser.Input.Keyboard.Key): ButtonState => ({
  pressed: Phaser.Input.Keyboard.JustDown(key),
  held: key.isDown,
  released: Phaser.Input.Keyboard.JustUp(key)
});

export class InputManager {
  private readonly keys: Record<keyof InputSnapshot, Phaser.Input.Keyboard.Key>;

  public constructor(scene: Phaser.Scene) {
    this.keys = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      a: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      b: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      start: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      select: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    };
  }

  public snapshot(): InputSnapshot {
    return {
      up: toButtonState(this.keys.up),
      down: toButtonState(this.keys.down),
      left: toButtonState(this.keys.left),
      right: toButtonState(this.keys.right),
      a: toButtonState(this.keys.a),
      b: toButtonState(this.keys.b),
      start: toButtonState(this.keys.start),
      select: toButtonState(this.keys.select)
    };
  }
}
