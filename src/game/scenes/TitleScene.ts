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

    this.addShadowText(
      GAME_WIDTH / 2,
      38,
      "OPERATION",
      { fontFamily: "monospace", fontSize: "20px", color: "#c6c048" },
      "#5f5b1f",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      77,
      "WOLF",
      { fontFamily: "monospace", fontSize: "44px", color: "#c95d4f" },
      "#6f2b25",
      2
    );

    this.blinkText = this.addShadowText(
      GAME_WIDTH / 2,
      138,
      "PUSH START BUTTON",
      { fontFamily: "monospace", fontSize: "12px", color: "#f3f3f3" },
      "#6e6e6e",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      160,
      "OR",
      { fontFamily: "monospace", fontSize: "10px", color: "#f3f3f3" },
      "#6e6e6e",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      178,
      "PULL THE TRIGGER",
      { fontFamily: "monospace", fontSize: "10px", color: "#f3f3f3" },
      "#6e6e6e",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      199,
      "TAITO",
      { fontFamily: "monospace", fontSize: "18px", color: "#b7bdc9" },
      "#4f5766",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      214,
      "(C) TAITO CORPORATION 1989",
      { fontFamily: "monospace", fontSize: "7px", color: "#f3f3f3" },
      "#6e6e6e",
      1
    );

    this.addShadowText(
      GAME_WIDTH / 2,
      223,
      "ALL RIGHTS RESERVED",
      { fontFamily: "monospace", fontSize: "7px", color: "#f3f3f3" },
      "#6e6e6e",
      1
    );

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 7, GAME_WIDTH, 14, 0x04142c).setOrigin(0.5).setDepth(5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 14, GAME_WIDTH, 1, 0x0c2f64).setOrigin(0.5).setDepth(6);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, "Z:A  X:B  ENTER:START  SHIFT:SELECT", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#76a5db"
      })
      .setOrigin(0.5)
      .setDepth(7);

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

  private addShadowText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    shadowColor: string,
    shadowOffsetY: number
  ): Phaser.GameObjects.Text {
    this.add
      .text(x, y + shadowOffsetY, text, {
        ...style,
        color: shadowColor
      })
      .setOrigin(0.5);

    return this.add.text(x, y, text, style).setOrigin(0.5);
  }
}
