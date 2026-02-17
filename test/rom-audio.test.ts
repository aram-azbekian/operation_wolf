import fs from "node:fs";
import path from "node:path";
import { Controller, NES } from "jsnes";
import mappers from "jsnes/src/mappers";
import { describe, expect, it } from "vitest";
import { StereoSampleRingBuffer } from "../src/game/audio/StereoSampleRingBuffer";
import { MISSION_START_FRAME, WARMUP_INPUTS } from "../src/game/data/missionWarmup";

const romPath = path.resolve(process.cwd(), "rom/operation_wolf_rom.nes");
const describeWithRom = fs.existsSync(romPath) ? describe : describe.skip;

let mapper33Installed = false;
const mapperTable = mappers as any;

const installMapper33 = (): void => {
  if (mapper33Installed || mapperTable[33]) {
    mapper33Installed = true;
    return;
  }

  mapperTable[33] = function Mapper33(this: { nes: unknown }, nes: unknown) {
    this.nes = nes;
  };

  mapperTable[33].prototype = new mapperTable[0]();
  mapperTable[33].prototype.write = function write(this: any, address: number, value: number): void {
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

  mapperTable[33].prototype.loadROM = function loadROM(this: any): void {
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

const toPatchedRomString = (romBuffer: Uint8Array): string => {
  const patched = Uint8Array.from(romBuffer);
  for (let i = 8; i < 16; i += 1) {
    patched[i] = 0;
  }
  return Array.from(patched, (byte) => String.fromCharCode(byte)).join("");
};

const toButtonCode = (button: (typeof WARMUP_INPUTS)[number]["button"]): number => {
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

describeWithRom("ROM audio pipeline", () => {
  it("emits JSNES audio samples and queues them into the ring buffer", async () => {
    installMapper33();

    const ring = new StereoSampleRingBuffer(4096);
    const romBuffer = await fs.promises.readFile(romPath);

    let audioSampleCount = 0;
    const nes = new NES({
      emulateSound: true,
      sampleRate: 44100,
      onFrame: () => {},
      onStatusUpdate: () => {},
      onAudioSample: (left: number, right: number) => {
        audioSampleCount += 1;
        ring.push(left, right);
      }
    });

    nes.loadROM(toPatchedRomString(romBuffer));
    const nesWithPpu = nes as unknown as {
      ppu: {
        palTable: { loadDefaultPalette: () => void };
        updatePalettes: () => void;
      };
    };
    nesWithPpu.ppu.palTable.loadDefaultPalette();
    nesWithPpu.ppu.updatePalettes();

    let eventIndex = 0;
    for (let frame = 0; frame <= MISSION_START_FRAME; frame += 1) {
      while (eventIndex < WARMUP_INPUTS.length && WARMUP_INPUTS[eventIndex].frame === frame) {
        const event = WARMUP_INPUTS[eventIndex];
        const code = toButtonCode(event.button);
        if (event.state === "down") {
          nes.buttonDown(1, code);
        } else {
          nes.buttonUp(1, code);
        }
        eventIndex += 1;
      }
      nes.frame();
    }

    expect(audioSampleCount).toBeGreaterThan(2000);
    expect(ring.availableSamples).toBeGreaterThan(0);

    const outL = new Float32Array(256);
    const outR = new Float32Array(256);
    ring.fillChannels(outL, outR);

    const nonZero = outL.some((v) => v !== 0) || outR.some((v) => v !== 0);
    expect(nonZero).toBe(true);
  });
});
