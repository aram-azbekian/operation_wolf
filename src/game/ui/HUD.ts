import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, MAX_DAMAGE } from "../data/constants";
import type { HudState, WeaponKind } from "../types";

export class HUD {
  private readonly root: Phaser.GameObjects.Container;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly rifleText: Phaser.GameObjects.Text;
  private readonly grenadeText: Phaser.GameObjects.Text;
  private readonly modeText: Phaser.GameObjects.Text;
  private readonly enemyText: Phaser.GameObjects.Text;
  private readonly damageFill: Phaser.GameObjects.Graphics;

  public constructor(scene: Phaser.Scene) {
    const hudY = GAME_HEIGHT - HUD_HEIGHT;

    const panel = scene.add.rectangle(0, hudY, GAME_WIDTH, HUD_HEIGHT, 0x000000).setOrigin(0, 0).setDepth(2000);
    const topLine = scene.add.rectangle(0, hudY, GAME_WIDTH, 1, 0xd7a32b).setOrigin(0, 0).setDepth(2001);
    const rightLine = scene.add.rectangle(GAME_WIDTH - 2, hudY + 1, 2, HUD_HEIGHT - 1, 0xd7a32b).setOrigin(0, 0).setDepth(2001);

    this.scoreText = scene.add
      .text(8, hudY + 3, "SCORE 000000", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2002);

    const slotXs = [8, 54, 100, 146] as const;
    const iconKeys = ["ow-icon-rifle", "ow-icon-grenade", "ow-icon-soldier", "ow-icon-jeep"] as const;

    for (let i = 0; i < slotXs.length; i += 1) {
      scene.add.rectangle(slotXs[i], hudY + 18, 18, 18, 0x00d9ff).setOrigin(0, 0).setDepth(2001);
      scene.add.rectangle(slotXs[i], hudY + 18, 18, 18).setOrigin(0, 0).setDepth(2002).setStrokeStyle(1, 0x000000);

      const key = iconKeys[i];
      if (scene.textures.exists(key)) {
        scene.add.image(slotXs[i] + 9, hudY + 27, key).setDepth(2003).setScale(1.5);
      }
    }

    this.rifleText = scene.add
      .text(30, hudY + 22, "20", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.grenadeText = scene.add
      .text(76, hudY + 22, "05", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.modeText = scene.add
      .text(122, hudY + 22, "R", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
      .setDepth(2003);

    this.enemyText = scene.add
      .text(170, hudY + 22, "00", { fontFamily: "monospace", fontSize: "10px", color: "#f8f9fa" })
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
      this.rifleText,
      this.grenadeText,
      this.modeText,
      this.enemyText,
      this.damageFill
    ]);
  }

  public update(state: HudState, activeWeapon: WeaponKind): void {
    this.scoreText.setText(`SCORE ${state.score.toString().padStart(6, "0")}`);
    this.rifleText.setText(state.rifleAmmo.toString().padStart(2, "0"));
    this.grenadeText.setText(state.grenadeAmmo.toString().padStart(2, "0"));
    this.modeText.setText(activeWeapon === "rifle" ? "R" : "G");
    this.enemyText.setText(state.enemiesRemaining.toString().padStart(2, "0"));

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
