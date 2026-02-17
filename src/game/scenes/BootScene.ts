import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("boot");
  }

  public preload(): void {
    this.load.image("chr-sheet", "/generated/chr-sheet.png");
    this.load.json("generated-sprites", "/generated/sprites.json");
  }

  public create(): void {
    this.scene.start("title");
  }
}
