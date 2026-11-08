import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function capture() {
  console.log('Capturing Updated Antenna States (Verifying Sky Pointing & Beam)...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_antenna_v2_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000/dev/antenna', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  async function clickButtonWithText(text) {
    await page.evaluate((btnText) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetBtn = buttons.find(b => b.textContent && b.textContent.trim().toLowerCase().includes(btnText.toLowerCase()));
      if (targetBtn) {
        targetBtn.click();
      } else {
        console.error('Could not find button with text:', btnText);
      }
    }, text);
  }

  // 1. Switch to ALIGNING state and capture Angle 3
  console.log('Switching to aligning state...');
  await clickButtonWithText('aligning');
  await new Promise(r => setTimeout(r, 1800)); // Allow 1.8s for smooth ease-in-out rotation to sky

  await clickButtonWithText('3. Low-Angle Side');
  await new Promise(r => setTimeout(r, 1000));
  const alignBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'antenna_v2_aligning_sky_pointing.png'), alignBuf);
  console.log('Saved antenna_v2_aligning_sky_pointing.png');

  // 2. Also capture Spawn View (Angle 1) in Aligning State
  await clickButtonWithText('1. Spawn View');
  await new Promise(r => setTimeout(r, 1000));
  const alignSpawnBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'antenna_v2_aligning_spawn_view.png'), alignSpawnBuf);
  console.log('Saved antenna_v2_aligning_spawn_view.png');

  // 3. Switch to TRANSMITTING state and capture Angle 3
  console.log('Switching to transmitting state...');
  await clickButtonWithText('transmitting');
  await new Promise(r => setTimeout(r, 1500)); // Allow beam to fade in

  await clickButtonWithText('3. Low-Angle Side');
  await new Promise(r => setTimeout(r, 1000));
  const transmitBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'antenna_v2_transmitting_beam.png'), transmitBuf);
  console.log('Saved antenna_v2_transmitting_beam.png');

  // 4. Capture Dish Face close-up in Transmitting State
  await clickButtonWithText('4. Dish Face');
  await new Promise(r => setTimeout(r, 1000));
  const transmitDishBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'antenna_v2_transmitting_dish.png'), transmitDishBuf);
  console.log('Saved antenna_v2_transmitting_dish.png');

  await browser.close();
  console.log('All state verification captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
