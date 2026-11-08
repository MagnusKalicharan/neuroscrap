import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function capture() {
  console.log('Capturing Antenna Blockout Angles 1 to 3 from /dev/antenna...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_antenna_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // 1. Visit /dev/antenna
  await page.goto('http://localhost:3000/dev/antenna', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Helper to click preset and capture
  const presets = [
    { key: '1. Spawn View (Through Roof)', filename: 'antenna_stepA_angle1_spawn.png' },
    { key: '2. From Relay Riser', filename: 'antenna_stepA_angle2_riser.png' },
    { key: '3. Low-Angle Side (Screenshot Match)', filename: 'antenna_stepA_angle3_low_angle.png' }
  ];

  for (const p of presets) {
    console.log(`Selecting preset: ${p.key}`);
    await page.evaluate((btnText) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetBtn = buttons.find(b => b.textContent && b.textContent.includes(btnText));
      if (targetBtn) targetBtn.click();
    }, p.key);

    await new Promise(r => setTimeout(r, 1200));

    // Capture screenshot
    const buf = await page.screenshot();
    const outPath = path.join(ARTIFACTS_DIR, p.filename);
    fs.writeFileSync(outPath, buf);
    console.log(`Saved ${p.filename} to ${outPath}`);
  }

  // Also capture in Greyscale Silhouette Mode for Angle 3
  console.log('Enabling greyscale silhouette mode...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const silhouetteBtn = buttons.find(b => b.textContent && b.textContent.includes('Silhouette Test'));
    if (silhouetteBtn) silhouetteBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const greyBuf = await page.screenshot();
  const greyPath = path.join(ARTIFACTS_DIR, 'antenna_stepA_angle3_greyscale_silhouette.png');
  fs.writeFileSync(greyPath, greyBuf);
  console.log(`Saved ${greyPath}`);

  await browser.close();
  console.log('All Step A captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
