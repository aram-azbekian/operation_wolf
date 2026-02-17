import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../data/constants";

export class TitleScene extends Phaser.Scene {
  private blinkVisible = true;
  private blinkText!: Phaser.GameObjects.Text;
  private startKey!: Phaser.Input.Keyboard.Key;
  private frame = 0;

  public constructor() {
    super("title");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#000000");

    this.add
      .text(GAME_WIDTH / 2, 42, "OPERATION", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#c6c048"
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 80, "WOLF", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#c54736"
      })
      .setOrigin(0.5);

    this.blinkText = this.add
      .text(GAME_WIDTH / 2, 142, "PUSH START BUTTON", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f8f9fa"
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 164, "OR PULL THE TRIGGER", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f8f9fa"
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 196, "Z=A  X=B  ENTER=START  SHIFT=SELECT", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#94a3b8"
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 220, "BROWSER STAGE 1 PROTOTYPE", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#adb5bd"
      })
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        this.blinkVisible = !this.blinkVisible;
        this.blinkText.setVisible(this.blinkVisible);
      }
    });

    this.startKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.once("pointerdown", () => {
      this.scene.start("mission");
    });

    if (typeof window !== "undefined") {
      window.__owDebug = { scene: "title", frame: 0, score: 0, damage: 0 };
    }
  }

  public update(): void {
    this.frame += 1;
    if (typeof window !== "undefined") {
      window.__owDebug = { scene: "title", frame: this.frame, score: 0, damage: 0 };
    }

    if (Phaser.Input.Keyboard.JustDown(this.startKey)) {
      this.scene.start("mission");
    }
  }
}
