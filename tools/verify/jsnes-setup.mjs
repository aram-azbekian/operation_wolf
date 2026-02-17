import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jsnes = require("jsnes");
const Mappers = require("jsnes/src/mappers");

const installMapper33 = () => {
  if (Mappers[33]) {
    return;
  }

  Mappers[33] = function Mapper33(nes) {
    this.nes = nes;
  };

  Mappers[33].prototype = new Mappers[0]();

  Mappers[33].prototype.write = function write(address, value) {
    if (address < 0x8000) {
      Mappers[0].prototype.write.apply(this, arguments);
      return;
    }

    switch (address & 0xf003) {
      case 0x8000:
        this.load8kRomBank(value & 0x3f, 0x8000);
        if (value & 0x40) {
          this.nes.ppu.setMirroring(this.nes.rom.HORIZONTAL_MIRRORING);
        } else {
          this.nes.ppu.setMirroring(this.nes.rom.VERTICAL_MIRRORING);
        }
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

  Mappers[33].prototype.loadROM = function loadROM() {
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
};

export const createConfiguredJsnes = () => {
  installMapper33();
  return jsnes;
};

export const toPatchedRomString = (romBuffer) => {
  const patched = Uint8Array.from(romBuffer);

  // Operation Wolf ROM has a non-zero header tail byte that makes jsnes drop mapper high bits.
  for (let i = 8; i < 16; i += 1) {
    patched[i] = 0;
  }

  return Array.from(patched, (byte) => String.fromCharCode(byte)).join("");
};

export const buttonCode = (Controller, button) => {
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
      throw new Error(`Unsupported button: ${button}`);
  }
};
