import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, MAX_DAMAGE } from "../data/constants";
import type { HudState, WeaponKind } from "../types";

export class HUD {
  private readonly root: Phaser.GameObjects.Container;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly clipText: Phaser.GameObjects.Text;
  private readonly rifleText: Phaser.GameObjects.Text;
  private readonly grenadeText: Phaser.GameObjects.Text;
  private readonly civilianText: Phaser.GameObjects.Text;
  private readonly enemyText: Phaser.GameObjects.Text;
  private readonly vehicleText: Phaser.GameObjects.Text;
  private readonly modeText: Phaser.GameObjects.Text;
  private readonly damageFill: Phaser.GameObjects.Graphics;

  public constructor(scene: Phaser.Scene) {
    const hudY = GAME_HEIGHT - HUD_HEIGHT;

    const panel = scene.add.rectangle(0, hudY, GAME_WIDTH, HUD_HEIGHT, 0x000000).setOrigin(0, 0).setDepth(2000);
    const topLine = scene.add.rectangle(0, hudY, GAME_WIDTH, 1, 0xd7a32b).setOrigin(0, 0).setDepth(2001);
    const rightLine = scene.add.rectangle(GAME_WIDTH - 2, hudY + 1, 2, HUD_HEIGHT - 1, 0xd7a32b).setOrigin(0, 0).setDepth(2001);

    this.scoreText = scene.add
      .text(8, hudY + 3, "SCORE 000000", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2002);

    const slots = [
      { x: 8, key: "ow-icon-rifle" },
      { x: 46, key: "ow-icon-rifle" },
      { x: 84, key: "ow-icon-grenade" },
      { x: 122, key: "ow-icon-soldier" },
      { x: 168, key: "ow-icon-soldier" },
      { x: 206, key: "ow-icon-jeep" }
    ] as const;

    for (const slot of slots) {
      scene.add.rectangle(slot.x, hudY + 18, 16, 16, 0x00d9ff).setOrigin(0, 0).setDepth(2001);
      scene.add.rectangle(slot.x, hudY + 18, 16, 16).setOrigin(0, 0).setDepth(2002).setStrokeStyle(1, 0x000000);

      if (scene.textures.exists(slot.key)) {
        scene.add.image(slot.x + 8, hudY + 26, slot.key).setDepth(2003).setScale(1.4);
      }
    }

    this.clipText = scene.add
      .text(26, hudY + 22, "0", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.rifleText = scene.add
      .text(64, hudY + 22, "00", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.grenadeText = scene.add
      .text(102, hudY + 22, "0", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.civilianText = scene.add
      .text(140, hudY + 22, "0", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.enemyText = scene.add
      .text(186, hudY + 22, "00", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.vehicleText = scene.add
      .text(224, hudY + 22, "00", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.modeText = scene.add
      .text(154, hudY + 22, "R", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    scene.add
      .text(8, hudY + 38, "DAMAGE", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2002);

    scene.add.rectangle(58, hudY + 40, 176, 6, 0x2b2b2b).setOrigin(0, 0).setDepth(2001);
    this.damageFill = scene.add.graphics().setDepth(2003);

    this.root = scene.add.container(0, 0, [
      panel,
      topLine,
      rightLine,
      this.scoreText,
      this.clipText,
      this.rifleText,
      this.grenadeText,
      this.civilianText,
      this.enemyText,
      this.vehicleText,
      this.modeText,
      this.damageFill
    ]);
  }

  public update(state: HudState, activeWeapon: WeaponKind): void {
    this.scoreText.setText(`SCORE ${state.score.toString().padStart(6, "0")}`);
    this.clipText.setText(Math.ceil(state.rifleAmmo / 10).toString());
    this.rifleText.setText(state.rifleAmmo.toString().padStart(2, "0"));
    this.grenadeText.setText(state.grenadeAmmo.toString());
    this.civilianText.setText(state.civiliansLost.toString());
    this.enemyText.setText(state.enemiesRemaining.toString().padStart(2, "0"));
    this.vehicleText.setText(state.vehiclesRemaining.toString().padStart(2, "0"));
    this.modeText.setText(activeWeapon === "rifle" ? "R" : "G");

    const damage = Phaser.Math.Clamp(state.damagePercent, 0, MAX_DAMAGE);
    const width = Math.floor((damage / 100) * 176);

    this.damageFill.clear();
    if (width > 0) {
      this.damageFill.fillStyle(0xe03131, 1);
      this.damageFill.fillRect(58, GAME_HEIGHT - HUD_HEIGHT + 40, width, 6);
    }
  }

  public destroy(): void {
    this.root.destroy(true);
  }
}
