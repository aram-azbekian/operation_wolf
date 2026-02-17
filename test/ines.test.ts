import { describe, expect, it } from "vitest";
import { decodeChrToRgba, parseINes } from "../src/game/core/ines";

describe("parseINes", () => {
  it("parses valid header and offsets", () => {
    const rom = new Uint8Array(16 + 16384 + 8192);
    rom.set([0x4e, 0x45, 0x53, 0x1a, 0x01, 0x01, 0x00, 0x00], 0);
    const info = parseINes(rom);

    expect(info.prgBanks).toBe(1);
    expect(info.chrBanks).toBe(1);
    expect(info.prgOffset).toBe(16);
    expect(info.chrOffset).toBe(16 + 16384);
    expect(info.chrSize).toBe(8192);
  });

  it("decodes chr bytes into rgba output", () => {
    const chr = new Uint8Array(16);
    chr[0] = 0b11110000;
    chr[8] = 0b00001111;

    const decoded = decodeChrToRgba(chr, 1);
    expect(decoded.width).toBe(8);
    expect(decoded.height).toBe(8);
    expect(decoded.rgba.length).toBe(8 * 8 * 4);
  });
});
