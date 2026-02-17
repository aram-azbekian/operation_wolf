import type { WeaponConfig } from "../types";

export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 240;
export const HUD_HEIGHT = 48;
export const TARGET_FPS = 60;
export const STAGE_1_LENGTH_FRAMES = TARGET_FPS * 90;

export const CROSSHAIR_SPEED = 170;
export const FIRE_HIT_RADIUS = 7;
export const GRENADE_HIT_RADIUS = 18;

export const MAX_DAMAGE = 100;
export const DAMAGE_PER_ENEMY_SHOT = 2;

export const WEAPONS: Record<string, WeaponConfig> = {
  rifle: {
    id: "rifle",
    label: "RIFLE",
    fireIntervalFrames: 10,
    ammoCap: 300,
    damage: 1,
    spread: 0
  },
  grenade: {
    id: "grenade",
    label: "GRENADE",
    fireIntervalFrames: 20,
    ammoCap: 8,
    damage: 5,
    spread: 6
  }
};

export const SCORES = {
  soldier: 100,
  jeep: 350,
  helicopter: 450,
  civilianPenalty: -400
} as const;

export const ENEMY_COLORS = {
  soldier: 0x2b8a3e,
  jeep: 0x6c757d,
  helicopter: 0x495057
} as const;

export const CIVILIAN_COLOR = 0xf8f9fa;

export const PATHS: Record<string, { startX: number; endX: number; y: number; direction: 1 | -1 }> = {
  lane_top_ltr: { startX: -20, endX: 280, y: 92, direction: 1 },
  lane_mid_ltr: { startX: -20, endX: 280, y: 126, direction: 1 },
  lane_low_ltr: { startX: -20, endX: 280, y: 160, direction: 1 },
  lane_mid_rtl: { startX: 276, endX: -24, y: 132, direction: -1 },
  lane_low_rtl: { startX: 276, endX: -24, y: 168, direction: -1 },
  lane_air_rtl: { startX: 278, endX: -26, y: 74, direction: -1 }
};
