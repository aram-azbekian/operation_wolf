import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PNG } from "pngjs";
import { buttonCode, createConfiguredJsnes, toPatchedRomString } from "./jsnes-setup.mjs";

const jsnes = createConfiguredJsnes();
const { NES, Controller } = jsnes;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const profilePath = path.join(root, "verification/config/stage1.profile.json");
const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));

const romPath = path.resolve(root, process.env.OW_ROM_PATH ?? profile.romPath);
const outputDir = path.join(root, "verification/reference");

const clearOutputs = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".png") || entry.endsWith(".json"))
      .map((entry) => fs.rm(path.join(dir, entry), { force: true }))
  );
};

const writeFramePng = async (framebuffer, frameNumber, outDir) => {
  const png = new PNG({ width: 256, height: 240 });

  for (let i = 0; i < framebuffer.length; i += 1) {
    const value = framebuffer[i] ?? 0;
    const idx = i * 4;
    png.data[idx] = (value >> 16) & 0xff;
    png.data[idx + 1] = (value >> 8) & 0xff;
    png.data[idx + 2] = value & 0xff;
    png.data[idx + 3] = 0xff;
  }

  const outPath = path.join(outDir, `frame-${String(frameNumber).padStart(4, "0")}.png`);
  await fs.writeFile(outPath, PNG.sync.write(png));
};

await clearOutputs(outputDir);

const relativeFrames = [...profile.candidateCaptureFrames].sort((a, b) => a - b);
const absoluteFrames = relativeFrames.map((frame) => profile.referenceMissionStartFrame + frame);
const frameMap = new Map(absoluteFrames.map((absolute, idx) => [absolute, relativeFrames[idx]]));

const maxFrame = Math.max(...absoluteFrames, ...profile.referenceInputEvents.map((event) => event.frame));

const romBuffer = await fs.readFile(romPath);
let latestFrameBuffer = new Uint32Array(256 * 240);

const nes = new NES({
  onFrame: (framebuffer) => {
    latestFrameBuffer = Uint32Array.from(framebuffer);
  },
  onStatusUpdate: () => {},
  onAudioSample: () => {}
});

nes.loadROM(toPatchedRomString(romBuffer));
nes.ppu.palTable.loadDefaultPalette();
nes.ppu.updatePalettes();

for (let frame = 0; frame <= maxFrame; frame += 1) {
  for (const event of profile.referenceInputEvents) {
    if (event.frame !== frame) {
      continue;
    }

    const code = buttonCode(Controller, event.button);
    if (event.state === "down") {
      nes.buttonDown(1, code);
    } else {
      nes.buttonUp(1, code);
    }
  }

  nes.frame();

  const relative = frameMap.get(frame);
  if (typeof relative === "number") {
    await writeFramePng(latestFrameBuffer, relative, outputDir);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  source: "jsnes-mapper33",
  romPath,
  missionStartFrame: profile.referenceMissionStartFrame,
  relativeFrames,
  absoluteFrames,
  files: relativeFrames.map((frame) => `frame-${String(frame).padStart(4, "0")}.png`)
};

await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(summary, null, 2));
console.log(`Reference frames captured: ${relativeFrames.length}`);
