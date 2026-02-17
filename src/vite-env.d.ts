/// <reference types="vite/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.nes" {
  const src: string;
  export default src;
}

declare module "jsnes" {
  export const Controller: {
    BUTTON_A: number;
    BUTTON_B: number;
    BUTTON_SELECT: number;
    BUTTON_START: number;
    BUTTON_UP: number;
    BUTTON_DOWN: number;
    BUTTON_LEFT: number;
    BUTTON_RIGHT: number;
  };

  export class NES {
    public constructor(opts?: Record<string, unknown>);
    public frame(): void;
    public loadROM(data: string): void;
    public buttonDown(controller: number, button: number): void;
    public buttonUp(controller: number, button: number): void;
  }
}

declare module "jsnes/src/mappers" {
  const mapperTable: any;
  export default mapperTable;
}

interface Window {
  __owDebug?: {
    scene: "title" | "mission";
    frame: number;
    score: number;
    damage: number;
    rifleAmmo?: number;
    grenadeAmmo?: number;
  };
}
