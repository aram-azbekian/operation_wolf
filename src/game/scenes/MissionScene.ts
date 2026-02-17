import Phaser from "phaser";
import { AudioBus } from "../audio/AudioBus";
import { GameState } from "../core/GameState";
import { HitSystem, type HitTarget } from "../core/HitSystem";
import { InputManager } from "../core/InputManager";
import { Spawner } from "../core/Spawner";
import { WeaponSystem } from "../core/WeaponSystem";
import {
  CROSSHAIR_SPEED,
  DAMAGE_PER_ENEMY_SHOT,
  FIRE_HIT_RADIUS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRENADE_HIT_RADIUS,
  HUD_HEIGHT,
  PATHS,
  SCORES,
  STAGE_1_LENGTH_FRAMES,
  TARGET_FPS
} from "../data/constants";
import stageTimeline from "../data/stage1.timeline.json";
import type { StageEvent } from "../types";
import { HUD } from "../ui/HUD";

type ActorKind = "soldier" | "jeep" | "helicopter" | "civilian";

type StageActor = {
  id: number;
  kind: ActorKind;
  sprite: Phaser.GameObjects.Image;
  speed: number;
  direction: 1 | -1;
  health: number;
  radius: number;
  scoreValue: number;
  isCivilian: boolean;
  fireRateFrames: number;
  nextFireFrame: number;
  alive: boolean;
  animKeys: string[];
};

type Dot = {
  x: number;
  y: number;
  color: number;
};

type ActorVisual = {
  key: string;
  animKeys: string[];
  radius: number;
  fireRate: number;
};

export class MissionScene extends Phaser.Scene {
  private state!: GameState;
  private spawner!: Spawner;
  private weaponSystem!: WeaponSystem;
  private audioBus!: AudioBus;

  private readonly hitSystem = new HitSystem();

  private inputManager!: InputManager;
  private hud!: HUD;

  private crosshairX = GAME_WIDTH / 2;
  private crosshairY = (GAME_HEIGHT - HUD_HEIGHT) / 2;
  private crosshair!: Phaser.GameObjects.Graphics;

  private background!: Phaser.GameObjects.Graphics;

  private pauseText!: Phaser.GameObjects.Text;
  private outcomeText!: Phaser.GameObjects.Text;

  private actors: StageActor[] = [];
  private actorId = 0;

  private accumulatorMs = 0;
  private isPaused = false;

  private grassDots: Dot[] = [];
  private roadDots: Dot[] = [];

  public constructor() {
    super("mission");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#000000");

    this.initializeSession();
    this.buildDecorCaches();
    this.ensureRomTextures();

    this.background = this.add.graphics().setDepth(0);

    this.inputManager = new InputManager(this);
    this.hud = new HUD(this);

    this.crosshair = this.add.graphics().setDepth(3000);

    this.pauseText = this.add
      .text(GAME_WIDTH / 2, 14, "PAUSED", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f8f9fa",
        backgroundColor: "#000000"
      })
      .setOrigin(0.5)
      .setDepth(4000)
      .setVisible(false);

    this.outcomeText = this.add
      .text(GAME_WIDTH / 2, 24, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f8f9fa",
        backgroundColor: "#000000"
      })
      .setOrigin(0.5)
      .setDepth(4000)
      .setVisible(false);

    this.input.keyboard?.once("keydown", () => {
      this.audioBus.resume();
    });

    this.hud.update(this.state.toHudState(0), this.weaponSystem.activeWeapon);
    this.renderBackground();
    this.drawCrosshair();
  }

  private initializeSession(): void {
    for (const actor of this.actors) {
      actor.sprite.destroy();
    }

    this.state = new GameState();
    this.spawner = new Spawner(stageTimeline as StageEvent[]);
    this.weaponSystem = new WeaponSystem();
    this.audioBus = new AudioBus();

    this.actors = [];
    this.actorId = 0;
    this.accumulatorMs = 0;
    this.isPaused = false;

    this.crosshairX = GAME_WIDTH / 2;
    this.crosshairY = (GAME_HEIGHT - HUD_HEIGHT) / 2;
  }

  private buildDecorCaches(): void {
    const playableHeight = GAME_HEIGHT - HUD_HEIGHT;

    this.grassDots = [];
    for (let i = 0; i < 90; i += 1) {
      this.grassDots.push({
        x: (i * 17 + 11) % GAME_WIDTH,
        y: 84 + ((i * 29 + 7) % (playableHeight - 88)),
        color: i % 3 === 0 ? 0x1c7f22 : 0x27a137
      });
    }

    this.roadDots = [];
    for (let i = 0; i < 45; i += 1) {
      this.roadDots.push({
        x: (i * 31 + 19) % GAME_WIDTH,
        y: 106 + ((i * 23 + 5) % (playableHeight - 114)),
        color: i % 2 === 0 ? 0x0f4f93 : 0x2a86da
      });
    }
  }

  public update(_: number, delta: number): void {
    this.accumulatorMs += delta;
    const stepMs = 1000 / TARGET_FPS;

    while (this.accumulatorMs >= stepMs) {
      this.simulateFrame();
      this.accumulatorMs -= stepMs;
    }

    this.renderBackground();
    this.drawCrosshair();

    if (typeof window !== "undefined") {
      window.__owDebug = {
        scene: "mission",
        frame: this.state.frame,
        score: this.state.score,
        damage: this.state.damage,
        rifleAmmo: this.state.rifleAmmo,
        grenadeAmmo: this.state.grenadeAmmo
      };
    }
  }

  private simulateFrame(): void {
    const input = this.inputManager.snapshot();

    if (input.start.pressed && this.state.frame > 8) {
      if (this.state.outcome !== "running") {
        this.scene.start("title");
        return;
      }
      this.isPaused = !this.isPaused;
      this.pauseText.setVisible(this.isPaused);
    }

    this.updateCrosshairPosition(input);

    if (this.isPaused) {
      return;
    }

    if (this.state.outcome !== "running") {
      this.hud.update(this.state.toHudState(this.countAliveEnemies()), this.weaponSystem.activeWeapon);
      return;
    }

    this.state.advanceFrame();

    for (const event of this.spawner.pull(this.state.frame)) {
      this.spawnActor(event);
    }

    for (const shot of this.weaponSystem.update(input, this.state)) {
      this.resolveShot(shot.radius, shot.damage, shot.kind === "grenade");
    }

    this.updateActors();
    this.actors = this.actors.filter((actor) => actor.alive);

    if (this.state.frame >= STAGE_1_LENGTH_FRAMES && this.spawner.isDone && this.countAliveEnemies() === 0) {
      this.state.markStageClear();
      this.outcomeText.setText("STAGE 1 CLEAR - PRESS START").setVisible(true);
    }

    if (this.state.damage >= 100) {
      this.outcomeText.setText("MISSION FAILED - PRESS START").setVisible(true);
    }

    this.hud.update(this.state.toHudState(this.countAliveEnemies()), this.weaponSystem.activeWeapon);
  }

  private updateCrosshairPosition(input: ReturnType<InputManager["snapshot"]>): void {
    const dt = 1 / TARGET_FPS;
    if (input.left.held) {
      this.crosshairX -= CROSSHAIR_SPEED * dt;
    }
    if (input.right.held) {
      this.crosshairX += CROSSHAIR_SPEED * dt;
    }
    if (input.up.held) {
      this.crosshairY -= CROSSHAIR_SPEED * dt;
    }
    if (input.down.held) {
      this.crosshairY += CROSSHAIR_SPEED * dt;
    }

    this.crosshairX = Phaser.Math.Clamp(this.crosshairX, 4, GAME_WIDTH - 4);
    this.crosshairY = Phaser.Math.Clamp(this.crosshairY, 4, GAME_HEIGHT - HUD_HEIGHT - 4);
  }

  private spawnActor(event: StageEvent): void {
    const path = PATHS[event.pathId];
    if (!path) {
      return;
    }

    const kind = event.entityKind;
    const isCivilian = event.type === "spawn_civilian" || kind === "civilian";

    const visual = this.getActorVisual(kind);
    const sprite = this.add.image(path.startX, path.y + 8, visual.key).setOrigin(0.5, 1).setDepth(160 + path.y);

    sprite.setFlipX(path.direction === -1);

    let health = event.params?.health ?? 1;
    let scoreValue: number = SCORES.soldier;

    if (kind === "jeep") {
      scoreValue = SCORES.jeep;
      health = Math.max(health, 2);
    } else if (kind === "helicopter") {
      scoreValue = SCORES.helicopter;
      health = Math.max(health, 3);
      sprite.setY(path.y - 4);
      sprite.setDepth(120 + path.y);
    } else if (kind === "civilian") {
      scoreValue = SCORES.civilianPenalty;
    }

    const speed = event.params?.speed ?? (kind === "helicopter" ? 50 : 34);
    const fireRateFrames = event.params?.fireRateFrames ?? visual.fireRate;

    this.actors.push({
      id: ++this.actorId,
      kind,
      sprite,
      speed,
      direction: path.direction,
      health,
      radius: visual.radius,
      scoreValue,
      isCivilian,
      fireRateFrames,
      nextFireFrame: this.state.frame + Phaser.Math.Between(20, Math.max(25, fireRateFrames)),
      alive: true,
      animKeys: visual.animKeys
    });
  }

  private updateActors(): void {
    for (const actor of this.actors) {
      if (!actor.alive) {
        continue;
      }

      actor.sprite.x += (actor.speed * actor.direction) / TARGET_FPS;

      if (actor.animKeys.length > 1 && this.state.frame % 10 === 0) {
        const idx = (Math.floor(this.state.frame / 10) + actor.id) % actor.animKeys.length;
        actor.sprite.setTexture(actor.animKeys[idx]);
      }

      if (!actor.isCivilian && this.state.frame > 360 && this.state.frame >= actor.nextFireFrame && this.actorInRange(actor)) {
        this.state.applyDamage(DAMAGE_PER_ENEMY_SHOT);
        actor.nextFireFrame = this.state.frame + actor.fireRateFrames;
      }

      if (actor.sprite.x < -30 || actor.sprite.x > GAME_WIDTH + 30) {
        actor.alive = false;
        actor.sprite.destroy();
      }
    }
  }

  private resolveShot(radius: number, damage: number, explosive: boolean): void {
    if (explosive) {
      this.audioBus.playGrenade();
      radius = Math.max(radius, GRENADE_HIT_RADIUS);
    } else {
      this.audioBus.playShot();
      radius = Math.max(radius, FIRE_HIT_RADIUS);
    }

    const targets: HitTarget[] = this.actors.map((actor) => ({
      x: actor.sprite.x,
      y: actor.sprite.y - actor.sprite.displayHeight * 0.5,
      radius: actor.radius,
      depth: actor.sprite.depth,
      isCivilian: actor.isCivilian,
      alive: actor.alive,
      scoreValue: actor.scoreValue,
      applyDamage: (dealt: number): boolean => {
        actor.health -= dealt;
        if (actor.health > 0) {
          return false;
        }

        actor.alive = false;
        actor.sprite.destroy();
        return true;
      }
    }));

    const result = this.hitSystem.resolve(this.crosshairX, this.crosshairY, radius, damage, targets);
    if (!result.hit) {
      return;
    }

    if (!result.killed) {
      this.audioBus.playHit();
      return;
    }

    if (result.civilian) {
      this.state.addScore(SCORES.civilianPenalty);
      this.state.markCivilianLost();
      this.audioBus.playCivilianPenalty();
      return;
    }

    this.state.addScore(result.target?.scoreValue ?? 0);
    if (explosive) {
      this.audioBus.playExplosion();
    } else {
      this.audioBus.playHit();
    }
  }

  private actorInRange(actor: StageActor): boolean {
    return actor.sprite.x >= 18 && actor.sprite.x <= GAME_WIDTH - 18;
  }

  private countAliveEnemies(): number {
    return this.actors.filter((actor) => actor.alive && !actor.isCivilian).length;
  }

  private renderBackground(): void {
    const playableHeight = GAME_HEIGHT - HUD_HEIGHT;
    const drift = this.state.frame * 0.35;

    this.background.clear();

    this.background.fillStyle(0xf3ab44, 1);
    this.background.fillRect(0, 0, GAME_WIDTH, 74);

    const mountainOffset = drift % 20;
    for (let x = -20; x < GAME_WIDTH + 20; x += 20) {
      const left = x - mountainOffset;
      this.background.fillStyle(0x06103a, 1);
      this.background.fillTriangle(left, 76, left + 10, 58, left + 20, 76);
      this.background.fillStyle(0x152a74, 1);
      this.background.fillTriangle(left + 3, 76, left + 10, 64, left + 16, 76);
    }

    this.background.fillStyle(0x0a8b25, 1);
    this.background.fillRect(0, 76, GAME_WIDTH, playableHeight - 76);

    this.background.fillStyle(0x1b6f21, 1);
    this.background.fillRect(0, 94, GAME_WIDTH, 18);

    const treeOffset = (drift * 0.5) % 36;
    for (let x = -30; x < GAME_WIDTH + 30; x += 36) {
      const trunkX = x - treeOffset;
      this.background.fillStyle(0x815a31, 1);
      this.background.fillRect(trunkX, 84, 2, 14);
      this.background.fillStyle(0x4fae45, 1);
      this.background.fillTriangle(trunkX - 6, 86, trunkX + 1, 75, trunkX + 8, 86);
    }

    const roadCurve = Math.sin(this.state.frame / 210) * 10;
    const centerTop = 150 + roadCurve;
    const centerBottom = 150 - roadCurve * 0.3;
    const topHalf = 13;
    const bottomHalf = 36;

    const roadPoints = [
      new Phaser.Geom.Point(centerTop - topHalf, 92),
      new Phaser.Geom.Point(centerTop + topHalf, 92),
      new Phaser.Geom.Point(centerBottom + bottomHalf, playableHeight),
      new Phaser.Geom.Point(centerBottom - bottomHalf, playableHeight)
    ];

    this.background.fillStyle(0x166cc4, 1);
    this.background.fillPoints(roadPoints, true);

    for (const dot of this.grassDots) {
      this.background.fillStyle(dot.color, 1);
      this.background.fillRect(dot.x, dot.y, 1, 1);
    }

    for (const dot of this.roadDots) {
      if (this.pointInsideRoad(dot.x, dot.y, centerTop, centerBottom, topHalf, bottomHalf)) {
        this.background.fillStyle(dot.color, 1);
        this.background.fillRect(dot.x, dot.y, 1, 1);
      }
    }
  }

  private pointInsideRoad(
    x: number,
    y: number,
    centerTop: number,
    centerBottom: number,
    topHalf: number,
    bottomHalf: number
  ): boolean {
    const playableHeight = GAME_HEIGHT - HUD_HEIGHT;
    if (y < 92 || y > playableHeight) {
      return false;
    }

    const t = (y - 92) / (playableHeight - 92);
    const center = Phaser.Math.Linear(centerTop, centerBottom, t);
    const half = Phaser.Math.Linear(topHalf, bottomHalf, t);
    return x >= center - half && x <= center + half;
  }

  private drawCrosshair(): void {
    this.crosshair.clear();
    this.crosshair.lineStyle(1, 0xff0000, 1);
    this.crosshair.strokeCircle(this.crosshairX, this.crosshairY, 6);
    this.crosshair.lineBetween(this.crosshairX - 10, this.crosshairY, this.crosshairX - 4, this.crosshairY);
    this.crosshair.lineBetween(this.crosshairX + 4, this.crosshairY, this.crosshairX + 10, this.crosshairY);
    this.crosshair.lineBetween(this.crosshairX, this.crosshairY - 10, this.crosshairX, this.crosshairY - 4);
    this.crosshair.lineBetween(this.crosshairX, this.crosshairY + 4, this.crosshairX, this.crosshairY + 10);
  }

  private getActorVisual(kind: ActorKind): ActorVisual {
    if (kind === "soldier") {
      return { key: "ow-soldier-0", animKeys: ["ow-soldier-0", "ow-soldier-1"], radius: 8, fireRate: 45 };
    }
    if (kind === "jeep") {
      return { key: "ow-jeep", animKeys: ["ow-jeep"], radius: 11, fireRate: 34 };
    }
    if (kind === "helicopter") {
      return { key: "ow-heli", animKeys: ["ow-heli"], radius: 12, fireRate: 28 };
    }
    return { key: "ow-civilian", animKeys: ["ow-civilian"], radius: 8, fireRate: 99999 };
  }

  private ensureRomTextures(): void {
    if (this.textures.exists("ow-soldier-0")) {
      return;
    }

    this.createSolidTexture("ow-soldier-0", 12, 18, (ctx) => {
      ctx.fillStyle = "#0b143d";
      ctx.fillRect(5, 1, 2, 2);
      ctx.fillRect(4, 3, 4, 5);
      ctx.fillRect(3, 8, 6, 6);
      ctx.fillRect(2, 14, 3, 3);
      ctx.fillRect(7, 14, 3, 3);
    });

    this.createSolidTexture("ow-soldier-1", 12, 18, (ctx) => {
      ctx.fillStyle = "#0b143d";
      ctx.fillRect(5, 1, 2, 2);
      ctx.fillRect(4, 3, 4, 5);
      ctx.fillRect(3, 8, 6, 6);
      ctx.fillRect(1, 14, 3, 3);
      ctx.fillRect(8, 14, 3, 3);
    });

    this.createSolidTexture("ow-civilian", 12, 18, (ctx) => {
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(5, 1, 2, 2);
      ctx.fillRect(4, 3, 4, 5);
      ctx.fillRect(3, 8, 6, 6);
      ctx.fillRect(2, 14, 3, 3);
      ctx.fillRect(7, 14, 3, 3);
    });

    this.createSolidTexture("ow-jeep", 24, 12, (ctx) => {
      ctx.fillStyle = "#1c2f56";
      ctx.fillRect(1, 6, 22, 5);
      ctx.fillRect(6, 3, 8, 3);
      ctx.fillStyle = "#8aa3cf";
      ctx.fillRect(8, 4, 4, 2);
      ctx.fillStyle = "#000000";
      ctx.fillRect(4, 10, 4, 2);
      ctx.fillRect(16, 10, 4, 2);
    });

    this.createSolidTexture("ow-heli", 26, 12, (ctx) => {
      ctx.fillStyle = "#1c2f56";
      ctx.fillRect(4, 6, 16, 4);
      ctx.fillRect(9, 3, 7, 3);
      ctx.fillRect(20, 7, 5, 1);
      ctx.fillRect(1, 1, 24, 1);
      ctx.fillRect(12, 2, 1, 9);
    });

    if (this.textures.exists("chr-sheet")) {
      this.createMetaTexture("ow-icon-rifle", [102], 1, 1, [null, "#2d2d2d", "#b19f58", "#f5e7aa"]);
      this.createMetaTexture("ow-icon-grenade", [103], 1, 1, [null, "#2d2d2d", "#a15c2d", "#f2c28b"]);
      this.createMetaTexture("ow-icon-soldier", [104], 1, 1, [null, "#2d2d2d", "#a0352a", "#f5d2a6"]);
      this.createMetaTexture("ow-icon-jeep", [105], 1, 1, [null, "#2d2d2d", "#60707b", "#d0d8de"]);
    } else {
      this.createSolidTexture("ow-icon-rifle", 8, 8, (ctx) => {
        ctx.fillStyle = "#f5e7aa";
        ctx.fillRect(3, 1, 2, 6);
        ctx.fillRect(2, 5, 3, 2);
      });
      this.createSolidTexture("ow-icon-grenade", 8, 8, (ctx) => {
        ctx.fillStyle = "#f2c28b";
        ctx.fillRect(2, 2, 4, 4);
      });
      this.createSolidTexture("ow-icon-soldier", 8, 8, (ctx) => {
        ctx.fillStyle = "#f5d2a6";
        ctx.fillRect(3, 1, 2, 2);
        ctx.fillRect(2, 3, 4, 4);
      });
      this.createSolidTexture("ow-icon-jeep", 8, 8, (ctx) => {
        ctx.fillStyle = "#d0d8de";
        ctx.fillRect(1, 3, 6, 3);
      });
    }
  }

  private createSolidTexture(key: string, width: number, height: number, painter: (ctx: CanvasRenderingContext2D) => void): void {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    painter(ctx);

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    this.textures.addCanvas(key, canvas);
  }

  private createMetaTexture(
    key: string,
    tiles: number[],
    tilesWide: number,
    tilesHigh: number,
    palette: Array<string | null>
  ): void {
    const sourceImage = this.textures.get("chr-sheet").getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceImage.width;
    sourceCanvas.height = sourceImage.height;
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceCtx) {
      return;
    }

    sourceCtx.drawImage(sourceImage, 0, 0);
    const src = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = tilesWide * 8;
    outCanvas.height = tilesHigh * 8;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) {
      return;
    }

    const outImage = outCtx.createImageData(outCanvas.width, outCanvas.height);

    for (let i = 0; i < tiles.length; i += 1) {
      const tileIndex = tiles[i];
      if (tileIndex < 0) {
        continue;
      }

      const tileX = (tileIndex % 16) * 8;
      const tileY = Math.floor(tileIndex / 16) * 8;
      const dstTileX = (i % tilesWide) * 8;
      const dstTileY = Math.floor(i / tilesWide) * 8;

      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const s = ((tileY + py) * sourceCanvas.width + (tileX + px)) * 4;
          const v = src[s];
          const level = v < 32 ? 0 : v < 130 ? 1 : v < 220 ? 2 : 3;
          const color = palette[level];

          const d = ((dstTileY + py) * outCanvas.width + (dstTileX + px)) * 4;
          if (!color) {
            outImage.data[d + 3] = 0;
            continue;
          }

          const rgb = Phaser.Display.Color.HexStringToColor(color);
          outImage.data[d] = rgb.red;
          outImage.data[d + 1] = rgb.green;
          outImage.data[d + 2] = rgb.blue;
          outImage.data[d + 3] = 255;
        }
      }
    }

    outCtx.putImageData(outImage, 0, 0);

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    this.textures.addCanvas(key, outCanvas);
  }
}
