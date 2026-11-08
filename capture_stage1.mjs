import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function capture() {
  console.log('Capturing Stage 1: Colour and Massing Fixes...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_stage1_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000/dev/computers', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

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

  // 1. Catwalk View (Colour)
  console.log('Capturing 1. Catwalk View (Colour)...');
  await clickButtonWithText('1. Catwalk View');
  await new Promise(r => setTimeout(r, 1200));
  const buf1 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_catwalk_colour.png'), buf1);
  console.log('Saved computers_stage1_catwalk_colour.png');

  // 2. Catwalk View (Greyscale)
  console.log('Capturing 2. Catwalk View (Greyscale)...');
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 1000));
  const buf2 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_catwalk_greyscale.png'), buf2);
  console.log('Saved computers_stage1_catwalk_greyscale.png');

  // Toggle back to colour
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 600));

  // 3. Bridge Entry View (Colour)
  console.log('Capturing 3. Bridge Entry View (Colour)...');
  await clickButtonWithText('2. Bridge Entry');
  await new Promise(r => setTimeout(r, 1200));
  const buf3 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_bridge_entry.png'), buf3);
  console.log('Saved computers_stage1_bridge_entry.png');

  // 3b. Bridge Entry View (Greyscale)
  console.log('Capturing 3b. Bridge Entry View (Greyscale)...');
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 1000));
  const buf3g = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_bridge_entry_greyscale.png'), buf3g);
  console.log('Saved computers_stage1_bridge_entry_greyscale.png');

  // Toggle back to colour
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 600));

  // 4. Top-Down Clearance Plan
  console.log('Capturing 4. Top-Down Clearance Plan...');
  await clickButtonWithText('3. Top-Down Clearance');
  await new Promise(r => setTimeout(r, 1200));
  const buf4 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_plan.png'), buf4);
  console.log('Saved computers_stage1_plan.png');

  // 5. CORE-A Close-Up (Teal Monolith)
  console.log('Capturing 5. CORE-A Close-Up...');
  await clickButtonWithText('4. CORE-A Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf5 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_coreA_closeup.png'), buf5);
  console.log('Saved computers_stage1_coreA_closeup.png');

  // 6. CORE-B Close-Up (Amber Command Core with 2.2x1.3m unblocked screen)
  console.log('Capturing 6. CORE-B Close-Up...');
  await clickButtonWithText('5. CORE-B Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf6 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_coreB_closeup.png'), buf6);
  console.log('Saved computers_stage1_coreB_closeup.png');

  // 7. CORE-C Close-Up (Violet Honeycomb with solid edge strips)
  console.log('Capturing 7. CORE-C Close-Up...');
  await clickButtonWithText('6. CORE-C Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf7 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_stage1_coreC_closeup.png'), buf7);
  console.log('Saved computers_stage1_coreC_closeup.png');

  await browser.close();
  console.log('All Stage 1 captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
