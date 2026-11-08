import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function capture() {
  console.log('Capturing Step B1 Revised Massing Views...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_comp_b1_rev_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000/dev/computers', { waitUntil: 'networkidle0', timeout: 30000 });
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

  // 1. Preset 1: Catwalk View - Normal Color
  console.log('Capturing 1. Catwalk View (Normal Color)...');
  await clickButtonWithText('1. Screenshot Match');
  await new Promise(r => setTimeout(r, 1200));
  const buf1 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_catwalk_normal.png'), buf1);
  console.log('Saved computers_B1_catwalk_normal.png');

  // 2. Preset 1: Catwalk View - Greyscale Silhouette Mode
  console.log('Capturing 2. Catwalk View (Greyscale Silhouette Mode)...');
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 1000));
  const buf2 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_catwalk_greyscale.png'), buf2);
  console.log('Saved computers_B1_catwalk_greyscale.png');

  // 3. Preset 2: Bridge Entry View - Greyscale Silhouette Mode
  console.log('Capturing 3. Bridge Entry View (Greyscale Silhouette Mode)...');
  await clickButtonWithText('2. Bridge Entry');
  await new Promise(r => setTimeout(r, 1200));
  const buf3 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_bridge_entry_greyscale.png'), buf3);
  console.log('Saved computers_B1_bridge_entry_greyscale.png');

  // 4. Preset 2: Bridge Entry View - Normal Color
  console.log('Capturing 4. Bridge Entry View (Normal Color)...');
  await clickButtonWithText('Silhouette Test'); // Toggle back to normal color
  await new Promise(r => setTimeout(r, 1000));
  const buf4 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_bridge_entry_normal.png'), buf4);
  console.log('Saved computers_B1_bridge_entry_normal.png');

  // 5. Preset 3: Top-Down Clearance Plan
  console.log('Capturing 5. Top-Down Clearance Plan...');
  await clickButtonWithText('3. Top-Down Clearance');
  await new Promise(r => setTimeout(r, 1200));
  const buf5 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_clearance_plan.png'), buf5);
  console.log('Saved computers_B1_clearance_plan.png');

  // 6. Preset 4: CORE-A Close-Up (Framed)
  console.log('Capturing 6. CORE-A Close-Up...');
  await clickButtonWithText('4. CORE-A Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf6 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreA_closeup.png'), buf6);
  console.log('Saved computers_B1_coreA_closeup.png');

  // 7. Preset 5: CORE-B Hero Close-Up (Struts & attached ring)
  console.log('Capturing 7. CORE-B Hero Close-Up...');
  await clickButtonWithText('5. CORE-B Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf7 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreB_hero_closeup.png'), buf7);
  console.log('Saved computers_B1_coreB_hero_closeup.png');

  // 8. Preset 6: CORE-C Honeycomb Close-Up (Hex tops, lit seams, stepped skyline)
  console.log('Capturing 8. CORE-C Honeycomb Close-Up...');
  await clickButtonWithText('6. CORE-C Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf8 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreC_hex_closeup.png'), buf8);
  console.log('Saved computers_B1_coreC_hex_closeup.png');

  await browser.close();
  console.log('All revised B1 captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
