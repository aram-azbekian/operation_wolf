import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const profilePath = path.join(root, "verification/config/stage1.profile.json");
const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));

const refDir = path.join(root, "verification/reference");
const candDir = path.join(root, "verification/candidate");
const diffDir = path.join(root, "verification/diff");

await fs.mkdir(diffDir, { recursive: true });
const existingDiffs = await fs.readdir(diffDir);
await Promise.all(existingDiffs.map((entry) => fs.rm(path.join(diffDir, entry), { force: true })));

const captureFrames = [...profile.candidateCaptureFrames].sort((a, b) => a - b);
const results = [];

for (const frame of captureFrames) {
  const file = `frame-${String(frame).padStart(4, "0")}.png`;
  const refPath = path.join(refDir, file);
  const candPath = path.join(candDir, file);

  const [refBuf, candBuf] = await Promise.all([fs.readFile(refPath), fs.readFile(candPath)]);
  const refPng = PNG.sync.read(refBuf);
  const candPng = PNG.sync.read(candBuf);

  if (refPng.width !== candPng.width || refPng.height !== candPng.height) {
    throw new Error(`Size mismatch for ${file}: ${refPng.width}x${refPng.height} vs ${candPng.width}x${candPng.height}`);
  }

  const diffPng = new PNG({ width: refPng.width, height: refPng.height });
  const mismatch = pixelmatch(refPng.data, candPng.data, diffPng.data, refPng.width, refPng.height, {
    threshold: profile.diffThreshold
  });

  const total = refPng.width * refPng.height;
  const ratio = mismatch / total;

  await fs.writeFile(path.join(diffDir, file), PNG.sync.write(diffPng));
  results.push({ frame, file, mismatchPixels: mismatch, totalPixels: total, mismatchRatio: ratio });
}

const averageRatio = results.reduce((sum, item) => sum + item.mismatchRatio, 0) / results.length;
const maxRatio = results.reduce((max, item) => Math.max(max, item.mismatchRatio), 0);
const pass = maxRatio <= profile.maxDiffRatio;

const summary = {
  generatedAt: new Date().toISOString(),
  settings: {
    diffThreshold: profile.diffThreshold,
    maxDiffRatio: profile.maxDiffRatio
  },
  averageMismatchRatio: averageRatio,
  maxMismatchRatio: maxRatio,
  pass,
  frames: results
};

await fs.writeFile(path.join(diffDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`Average mismatch ratio: ${(averageRatio * 100).toFixed(2)}%`);
console.log(`Max mismatch ratio: ${(maxRatio * 100).toFixed(2)}%`);

if (!pass) {
  console.error(`Fidelity check failed: max mismatch ratio exceeds ${profile.maxDiffRatio}`);
  process.exitCode = 1;
}
