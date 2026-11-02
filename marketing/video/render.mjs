import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const DURATION = 30;
const dominio = process.argv[2];
const mode = process.argv[3] || "video";
const times = (process.argv[4] || "").split(",").filter(Boolean).map(Number);

const FFMPEG = process.env.FFMPEG || (fs.existsSync("C:/ffmpeg/bin/ffmpeg.exe") ? "C:/ffmpeg/bin/ffmpeg.exe" : "ffmpeg");

if (!dominio) {
  console.error("Uso: node marketing/video/render.js <dominio> [preview <segundos,...>]");
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const url = pathToFileURL(path.join(DIR, "promo.html"));
  url.searchParams.set("dominio", dominio);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.evaluate(() => window.ready);
  await page.waitForTimeout(500);

  if (mode === "preview") {
    const out = path.join(DIR, "preview");
    fs.mkdirSync(out, { recursive: true });
    for (const t of times) {
      await page.evaluate((x) => window.render(x), t);
      await page.screenshot({ path: path.join(out, `t${String(t).replace(".", "_")}.png`) });
    }
    await browser.close();
    console.log(`listo: ${out}`);
    return;
  }

  const frames = fs.mkdtempSync(path.join(os.tmpdir(), "barberdesk-video-"));
  try {
    const total = FPS * DURATION;
    for (let i = 0; i < total; i++) {
      await page.evaluate((x) => window.render(x), i / FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
      if (i % 150 === 0) console.log(`cuadro ${i}/${total}`);
    }
    await browser.close();

    const salida = path.join(DIR, `barberdesk-promo-${dominio}.mp4`);
    execFileSync(FFMPEG, [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-movflags", "+faststart", salida,
    ], { stdio: "inherit" });
    console.log(`listo: ${salida}`);
  } finally {
    fs.rmSync(frames, { recursive: true, force: true });
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
