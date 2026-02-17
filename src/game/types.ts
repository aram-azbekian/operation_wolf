export type ButtonState = {
  pressed: boolean;
  held: boolean;
  released: boolean;
};

export type InputSnapshot = {
  up: ButtonState;
  down: ButtonState;
  left: ButtonState;
  right: ButtonState;
  a: ButtonState;
  b: ButtonState;
  start: ButtonState;
  select: ButtonState;
};

export type StageEventType = "spawn_enemy" | "spawn_civilian";

export type StageEvent = {
  frame: number;
  type: StageEventType;
  lane: number;
  entityKind: "soldier" | "jeep" | "helicopter" | "civilian";
  pathId: string;
  params?: {
    speed?: number;
    health?: number;
    fireRateFrames?: number;
    value?: number;
  };
};

export type WeaponKind = "rifle" | "grenade";

export type WeaponConfig = {
  id: WeaponKind;
  label: string;
  fireIntervalFrames: number;
  ammoCap: number;
  damage: number;
  spread: number;
};

export type HudState = {
  score: number;
  rifleAmmo: number;
  grenadeAmmo: number;
  civiliansLost: number;
  damagePercent: number;
  enemiesRemaining: number;
  frame: number;
};

export type GameOutcome = "running" | "stage_clear" | "game_over";
