import process from "node:process";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:4173/";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"
  ]
});

try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => window.__owDebug?.scene === "title", null, { timeout: 15000 });

  await page.click("canvas");
  await page.keyboard.press("Enter");

  await page.waitForFunction(() => window.__owDebug?.scene === "mission", null, { timeout: 15000 });
  await page.waitForFunction(() => (window.__owDebug?.frame ?? 0) >= 20, null, { timeout: 15000 });

  const stats = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Canvas element not found");
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Canvas 2D context not available");
    }

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let nonBlack = 0;
    let topBandNonBlack = 0;
    let lowerNonBlack = 0;
    let whiteLike = 0;
    let yellowLike = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r === 0 && g === 0 && b === 0) {
          continue;
        }

        nonBlack += 1;

        if (y >= 36 && y <= 64) {
          topBandNonBlack += 1;
        }
        if (y >= 80) {
          lowerNonBlack += 1;
        }
        if (r > 235 && g > 235 && b > 235) {
          whiteLike += 1;
        }
        if (r > 180 && g > 140 && b < 120) {
          yellowLike += 1;
        }
      }
    }

    return {
      nonBlack,
      ratio: nonBlack / (width * height),
      topBandNonBlack,
      lowerNonBlack,
      whiteLike,
      yellowLike
    };
  });

  const pass =
    stats.ratio < 0.02 &&
    stats.topBandNonBlack > 400 &&
    stats.lowerNonBlack < 5 &&
    stats.whiteLike > 250 &&
    stats.yellowLike > 120;

  if (!pass) {
    throw new Error(`Start menu screen signature mismatch: ${JSON.stringify(stats)}`);
  }

  console.log(`Title->Start menu screen test passed: ${JSON.stringify(stats)}`);
} finally {
  await browser.close();
}
