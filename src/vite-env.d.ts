/// <reference types="vite/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
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
