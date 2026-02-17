import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const profilePath = path.join(root, "verification/config/stage1.profile.json");
const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
const appUrl = process.env.APP_URL ?? profile.candidateUrl;

const outputDir = path.join(root, "verification/candidate");
const captureFrames = [...profile.candidateCaptureFrames].sort((a, b) => a - b);

const clearOutputs = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".png") || entry.endsWith(".json"))
      .map((entry) => fs.rm(path.join(dir, entry), { force: true }))
  );
};

const captureCanvasPng = async (page, filePath) => {
  const b64 = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error("No game canvas found");
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });

  await fs.writeFile(filePath, Buffer.from(b64, "base64"));
};

await clearOutputs(outputDir);

const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"
  ]
});
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => typeof window !== "undefined" && window.__owDebug?.scene === "title", null, {
    timeout: 20000
  });

  let enteredMission = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.click("canvas");
    await page.keyboard.press("Enter");

    try {
      await page.waitForFunction(() => window.__owDebug?.scene === "mission", null, { timeout: 2500 });
      enteredMission = true;
      break;
    } catch {
      // Retry key press in case the first key event was sent before scene input was ready.
    }
  }

  if (!enteredMission) {
    throw new Error("Could not enter mission scene after repeated START input");
  }

  const metrics = [];

  for (const frame of captureFrames) {
    await page.waitForFunction(
      (targetFrame) => window.__owDebug?.scene === "mission" && window.__owDebug?.frame >= targetFrame,
      frame,
      { timeout: 120000 }
    );

    const outPath = path.join(outputDir, `frame-${String(frame).padStart(4, "0")}.png`);
    await captureCanvasPng(page, outPath);

    const metric = await page.evaluate(() => {
      const debug = window.__owDebug;
      if (!debug || debug.scene !== "mission") {
        throw new Error("Missing mission debug state");
      }
      return {
        frame: debug.frame,
        score: debug.score,
        rifleAmmo: debug.rifleAmmo ?? 0,
        grenadeAmmo: debug.grenadeAmmo ?? 0,
        damage: debug.damage
      };
    });

    metrics.push({
      targetFrame: frame,
      ...metric
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    source: "browser-canvas",
    url: appUrl,
    captureFrames,
    files: captureFrames.map((frame) => `frame-${String(frame).padStart(4, "0")}.png`),
    metrics
  };

  await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(summary, null, 2));
  console.log(`Candidate frames captured: ${captureFrames.length}`);
} finally {
  await browser.close();
}
