import "./style.css";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, TARGET_FPS } from "./game/data/constants";
import { BootScene } from "./game/scenes/BootScene";
import { MissionScene } from "./game/scenes/MissionScene";
import { TitleScene } from "./game/scenes/TitleScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: "#000000",
  fps: {
    target: TARGET_FPS,
    forceSetTimeOut: true
  },
  scale: {
    mode: Phaser.Scale.NONE
  },
  scene: [BootScene, TitleScene, MissionScene]
});

const applyIntegerCanvasScale = (): void => {
  const canvas = game.canvas as HTMLCanvasElement | null;
  if (!canvas) {
    return;
  }

  const integerScale = Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));
  canvas.style.width = `${GAME_WIDTH * integerScale}px`;
  canvas.style.height = `${GAME_HEIGHT * integerScale}px`;
};

applyIntegerCanvasScale();
window.addEventListener("resize", applyIntegerCanvasScale);

(window as Window & { __owGame?: Phaser.Game }).__owGame = game;
