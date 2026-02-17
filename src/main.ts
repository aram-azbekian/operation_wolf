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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, MissionScene]
});

(window as Window & { __owGame?: Phaser.Game }).__owGame = game;
