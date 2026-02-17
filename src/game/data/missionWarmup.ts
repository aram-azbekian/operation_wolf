export type WarmupEvent = {
  frame: number;
  button: "a" | "b" | "select" | "start" | "up" | "down" | "left" | "right";
  state: "down" | "up";
};

export const MISSION_START_FRAME = 240;

export const WARMUP_INPUTS: WarmupEvent[] = [
  { frame: 181, button: "start", state: "down" },
  { frame: 184, button: "start", state: "up" }
];
