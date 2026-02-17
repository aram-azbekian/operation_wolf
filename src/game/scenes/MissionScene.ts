import Phaser from "phaser";
import { Controller, NES } from "jsnes";
import mappers from "jsnes/src/mappers";
import romUrl from "../../../rom/operation_wolf_rom.nes?url";
import { StereoSampleRingBuffer } from "../audio/StereoSampleRingBuffer";
import { GAME_HEIGHT, GAME_WIDTH, TARGET_FPS } from "../data/constants";
import { MISSION_START_FRAME, WARMUP_INPUTS } from "../data/missionWarmup";

type NesButton = "a" | "b" | "select" | "start" | "up" | "down" | "left" | "right";

type JsnesNes = {
  frame: () => void;
  loadROM: (rom: string) => void;
  buttonDown: (controller: number, button: number) => void;
  buttonUp: (controller: number, button: number) => void;
  ppu?: {
    palTable?: {
      loadDefaultPalette?: () => void;
    };
    updatePalettes?: () => void;
  };
};

const AUDIO_RING_SIZE = 32768;
const AUDIO_PROCESS_BUFFER_SIZE = 1024;

let mapper33Installed = false;
const mapperTable = mappers as any;

const installMapper33 = (): void => {
  if (mapper33Installed || mapperTable[33]) {
    mapper33Installed = true;
    return;
  }

  mapperTable[33] = function Mapper33(this: { nes: { ppu: { setMirroring: (mode: number) => void; triggerRendering: () => void }; rom: { HORIZONTAL_MIRRORING: number; VERTICAL_MIRRORING: number; romCount: number; vromCount: number; valid: boolean } }; load8kRomBank: (bank: number, address: number) => void; load2kVromBank: (bank: number, address: number) => void; load1kVromBank: (bank: number, address: number) => void; load8kVromBank: (bank: number, address: number) => void }, nes: unknown) {
    this.nes = nes as never;
  };

  mapperTable[33].prototype = new mapperTable[0]();

  mapperTable[33].prototype.write = function write(this: { nes: { ppu: { setMirroring: (mode: number) => void }; rom: { HORIZONTAL_MIRRORING: number; VERTICAL_MIRRORING: number } }; load8kRomBank: (bank: number, address: number) => void; load2kVromBank: (bank: number, address: number) => void; load1kVromBank: (bank: number, address: number) => void }, address: number, value: number): void {
    if (address < 0x8000) {
      mapperTable[0].prototype.write.apply(this, [address, value]);
      return;
    }

    switch (address & 0xf003) {
      case 0x8000:
        this.load8kRomBank(value & 0x3f, 0x8000);
        this.nes.ppu.setMirroring(value & 0x40 ? this.nes.rom.HORIZONTAL_MIRRORING : this.nes.rom.VERTICAL_MIRRORING);
        break;
      case 0x8001:
        this.load8kRomBank(value & 0x3f, 0xa000);
        break;
      case 0x8002:
        this.load2kVromBank(value & 0x7f, 0x0000);
        break;
      case 0x8003:
        this.load2kVromBank(value & 0x7f, 0x0800);
        break;
      case 0xa000:
        this.load1kVromBank(value & 0x7f, 0x1000);
        break;
      case 0xa001:
        this.load1kVromBank(value & 0x7f, 0x1400);
        break;
      case 0xa002:
        this.load1kVromBank(value & 0x7f, 0x1800);
        break;
      case 0xa003:
        this.load1kVromBank(value & 0x7f, 0x1c00);
        break;
      default:
        break;
    }
  };

  mapperTable[33].prototype.loadROM = function loadROM(this: { nes: { rom: { valid: boolean; romCount: number; vromCount: number }; ppu: { triggerRendering: () => void } }; load8kRomBank: (bank: number, address: number) => void; load8kVromBank: (bank: number, address: number) => void }): void {
    if (!this.nes.rom.valid) {
      throw new Error("Invalid ROM for mapper 33");
    }

    this.load8kRomBank(0, 0x8000);
    this.load8kRomBank(1, 0xa000);
    this.load8kRomBank(this.nes.rom.romCount * 2 - 2, 0xc000);
    this.load8kRomBank(this.nes.rom.romCount * 2 - 1, 0xe000);

    if (this.nes.rom.vromCount > 0) {
      this.load8kVromBank(0, 0x0000);
    }

    this.nes.ppu.triggerRendering();
  };

  mapper33Installed = true;
};

const patchHeaderTail = (romBytes: Uint8Array): Uint8Array => {
  const patched = Uint8Array.from(romBytes);
  for (let i = 8; i < 16; i += 1) {
    patched[i] = 0;
  }
  return patched;
};

const toRomString = (romBytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < romBytes.length; i += 1) {
    out += String.fromCharCode(romBytes[i]);
  }
  return out;
};

const toButtonCode = (button: NesButton): number => {
  switch (button) {
    case "a":
      return Controller.BUTTON_A;
    case "b":
      return Controller.BUTTON_B;
    case "select":
      return Controller.BUTTON_SELECT;
    case "start":
      return Controller.BUTTON_START;
    case "up":
      return Controller.BUTTON_UP;
    case "down":
      return Controller.BUTTON_DOWN;
    case "left":
      return Controller.BUTTON_LEFT;
    case "right":
      return Controller.BUTTON_RIGHT;
    default:
      return Controller.BUTTON_A;
  }
};

const applyPreferredPalette = (nes: JsnesNes): void => {
  nes.ppu?.palTable?.loadDefaultPalette?.();
  nes.ppu?.updatePalettes?.();
};

export class MissionScene extends Phaser.Scene {
  private nes: JsnesNes | null = null;
  private frameTexture: Phaser.Textures.CanvasTexture | null = null;
  private frameCtx: CanvasRenderingContext2D | null = null;
  private frameImageData: ImageData | null = null;
  private frameBuffer = new Uint32Array(GAME_WIDTH * GAME_HEIGHT);
  private frameDirty = false;

  private screen!: Phaser.GameObjects.Image;
  private loadingText!: Phaser.GameObjects.Text;

  private missionFrame = 0;
  private romReady = false;

  private keys!: Record<NesButton, Phaser.Input.Keyboard.Key>;
  private audioContext: AudioContext | null = null;
  private audioNode: ScriptProcessorNode | null = null;
  private readonly audioRing = new StereoSampleRingBuffer(AUDIO_RING_SIZE);

  private readonly buttonDownState: Record<NesButton, boolean> = {
    a: false,
    b: false,
    select: false,
    start: false,
    up: false,
    down: false,
    left: false,
    right: false
  };

  public constructor() {
    super("mission");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#000000");

    this.createFrameSurface();
    this.bindKeyboard();
    this.setupAudioOutput();

    this.loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "LOADING ROM...", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#000000"
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.publishDebugState();
    void this.initializeEmulator();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseAllButtons();
      this.teardownAudioOutput();
      this.nes = null;
    });
  }

  public update(): void {
    if (!this.romReady || !this.nes) {
      return;
    }

    this.syncControllerButtons();
    this.nes.frame();
    this.blitFrame();

    this.missionFrame += 1;
    this.publishDebugState();
  }

  private createFrameSurface(): void {
    const textureKey = "ow-nes-frame";
    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }

    const frameTexture = this.textures.createCanvas(textureKey, GAME_WIDTH, GAME_HEIGHT);
    if (!frameTexture) {
      throw new Error("Could not allocate NES frame texture");
    }
    this.frameTexture = frameTexture;
    const canvas = frameTexture.getSourceImage() as HTMLCanvasElement;
    this.frameCtx = canvas.getContext("2d");

    if (!this.frameCtx) {
      throw new Error("Could not create canvas context for NES framebuffer");
    }

    this.frameImageData = this.frameCtx.createImageData(GAME_WIDTH, GAME_HEIGHT);

    this.screen = this.add.image(0, 0, textureKey).setOrigin(0, 0).setDepth(10);
    this.screen.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is required");
    }

    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      b: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      start: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      select: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    };
  }

  private async initializeEmulator(): Promise<void> {
    try {
      installMapper33();

      const romResponse = await fetch(romUrl);
      if (!romResponse.ok) {
        throw new Error(`ROM load failed (${romResponse.status})`);
      }

      const romBytes = new Uint8Array(await romResponse.arrayBuffer());
      const patchedRom = patchHeaderTail(romBytes);
      const audioEnabled = this.audioContext !== null;

      const nes = new NES({
        preferredFrameRate: TARGET_FPS,
        sampleRate: this.audioContext?.sampleRate ?? 44100,
        emulateSound: audioEnabled,
        onFrame: (framebuffer: number[]) => {
          for (let i = 0; i < this.frameBuffer.length; i += 1) {
            this.frameBuffer[i] = framebuffer[i] ?? 0;
          }
          this.frameDirty = true;
        },
        onAudioSample: (left: number, right: number) => {
          this.queueAudioSample(left, right);
        },
        onStatusUpdate: () => {}
      }) as unknown as JsnesNes;

      nes.loadROM(toRomString(patchedRom));
      applyPreferredPalette(nes);
      this.nes = nes;

      this.runWarmupSequence();
      this.audioRing.clear();

      this.releaseAllButtons();
      this.missionFrame = 0;
      this.romReady = true;
      this.loadingText.setVisible(false);
      this.blitFrame();
      this.publishDebugState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.loadingText.setText(`ROM INIT FAILED\n${message}`);
      console.error(error);
    }
  }

  private runWarmupSequence(): void {
    if (!this.nes) {
      return;
    }

    let eventIndex = 0;

    for (let frame = 0; frame <= MISSION_START_FRAME; frame += 1) {
      while (eventIndex < WARMUP_INPUTS.length && WARMUP_INPUTS[eventIndex].frame === frame) {
        const event = WARMUP_INPUTS[eventIndex];
        const code = toButtonCode(event.button);

        if (event.state === "down") {
          this.nes.buttonDown(1, code);
          this.buttonDownState[event.button] = true;
        } else {
          this.nes.buttonUp(1, code);
          this.buttonDownState[event.button] = false;
        }

        eventIndex += 1;
      }

      this.nes.frame();
    }
  }

  private syncControllerButtons(): void {
    if (!this.nes) {
      return;
    }

    if (Object.values(this.keys).some((key) => key.isDown)) {
      this.tryResumeAudioOutput();
    }

    for (const button of Object.keys(this.keys) as NesButton[]) {
      const held = this.keys[button].isDown;
      if (held === this.buttonDownState[button]) {
        continue;
      }

      const code = toButtonCode(button);
      if (held) {
        this.nes.buttonDown(1, code);
      } else {
        this.nes.buttonUp(1, code);
      }

      this.buttonDownState[button] = held;
    }
  }

  private releaseAllButtons(): void {
    if (!this.nes) {
      return;
    }

    for (const button of Object.keys(this.buttonDownState) as NesButton[]) {
      if (!this.buttonDownState[button]) {
        continue;
      }

      this.nes.buttonUp(1, toButtonCode(button));
      this.buttonDownState[button] = false;
    }
  }

  private blitFrame(): void {
    if (!this.frameDirty || !this.frameCtx || !this.frameImageData || !this.frameTexture) {
      return;
    }

    const data = this.frameImageData.data;

    for (let i = 0; i < this.frameBuffer.length; i += 1) {
      const color = this.frameBuffer[i];
      const idx = i * 4;

      data[idx] = (color >> 16) & 0xff;
      data[idx + 1] = (color >> 8) & 0xff;
      data[idx + 2] = color & 0xff;
      data[idx + 3] = 0xff;
    }

    this.frameCtx.putImageData(this.frameImageData, 0, 0);
    this.frameTexture.refresh();
    this.frameDirty = false;
  }

  private publishDebugState(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.__owDebug = {
      scene: "mission",
      frame: this.missionFrame,
      score: 0,
      damage: 0,
      rifleAmmo: 20,
      grenadeAmmo: 5
    };
  }

  private setupAudioOutput(): void {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null);

    if (!AudioContextCtor) {
      return;
    }

    this.audioContext = new AudioContextCtor();
    this.audioNode = this.audioContext.createScriptProcessor(AUDIO_PROCESS_BUFFER_SIZE, 0, 2);
    this.audioNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const outL = event.outputBuffer.getChannelData(0);
      const outR = event.outputBuffer.getChannelData(1);
      this.audioRing.fillChannels(outL, outR);
    };
    this.audioNode.connect(this.audioContext.destination);

    this.input.on("pointerdown", this.tryResumeAudioOutput, this);
    this.input.keyboard?.on("keydown", this.tryResumeAudioOutput, this);
  }

  private teardownAudioOutput(): void {
    this.input.off("pointerdown", this.tryResumeAudioOutput, this);
    this.input.keyboard?.off("keydown", this.tryResumeAudioOutput, this);

    if (this.audioNode) {
      this.audioNode.disconnect();
      this.audioNode.onaudioprocess = null;
      this.audioNode = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.audioRing.clear();
  }

  private tryResumeAudioOutput(): void {
    if (!this.audioContext || this.audioContext.state !== "suspended") {
      return;
    }
    void this.audioContext.resume();
  }

  private queueAudioSample(left: number, right: number): void {
    if (!this.audioContext) {
      return;
    }
    this.audioRing.push(left, right);
  }
}
