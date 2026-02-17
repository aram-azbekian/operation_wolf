import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PNG } from "pngjs";
import { decodeChrToRgba, parseINes } from "./ines-parser.mjs";

const romPath = process.env.OW_ROM_PATH;
if (!romPath) {
  throw new Error("Set OW_ROM_PATH to an Operation Wolf .nes file path");
}

const outDir = path.resolve("public/generated");
await fs.mkdir(outDir, { recursive: true });

const rom = new Uint8Array(await fs.readFile(romPath));
const info = parseINes(rom);

const chr = rom.slice(info.chrOffset, info.chrOffset + info.chrSize);
const decoded = decodeChrToRgba(chr);

const png = new PNG({ width: decoded.width, height: decoded.height });
png.data = Buffer.from(decoded.rgba);

await fs.writeFile(path.join(outDir, "chr-sheet.png"), PNG.sync.write(png));

const meta = {
  generatedAt: new Date().toISOString(),
  romPath,
  mapper: info.mapper,
  prgBanks: info.prgBanks,
  chrBanks: info.chrBanks,
  mirroring: info.mirroring,
  tileCount: info.chrSize / 16,
  spriteSheet: "chr-sheet.png"
};

await fs.writeFile(path.join(outDir, "sprites.json"), JSON.stringify(meta, null, 2));

console.log(`Extracted ${meta.tileCount} tiles to ${path.join(outDir, "chr-sheet.png")}`);
