import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function capture() {
  console.log('Capturing Step B1: Corrected Massing Views...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_comp_b1_' + Date.now()),
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

  // 1. Screenshot Match (Catwalk View)
  console.log('Capturing Preset 1: Screenshot Match (Catwalk View)...');
  await clickButtonWithText('1. Screenshot Match');
  await new Promise(r => setTimeout(r, 1200));
  const buf1 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_catwalk_match.png'), buf1);
  console.log('Saved computers_B1_catwalk_match.png');

  // 2. Greyscale Silhouette Test
  console.log('Capturing Preset 1 in Greyscale Silhouette Mode...');
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 1000));
  const buf2 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_greyscale_silhouette.png'), buf2);
  console.log('Saved computers_B1_greyscale_silhouette.png');

  // Return to normal color
  await clickButtonWithText('Silhouette Test');
  await new Promise(r => setTimeout(r, 500));

  // 3. Top-Down Clearance Plan
  console.log('Capturing Preset 3: Top-Down Clearance Plan...');
  await clickButtonWithText('3. Top-Down Clearance');
  await new Promise(r => setTimeout(r, 1200));
  const buf3 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_clearance_plan.png'), buf3);
  console.log('Saved computers_B1_clearance_plan.png');

  // 4. CORE-A Close-Up (Server Monolith)
  console.log('Capturing Preset 4: CORE-A Close-Up...');
  await clickButtonWithText('4. CORE-A Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf4 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreA_framed.png'), buf4);
  console.log('Saved computers_B1_coreA_framed.png');

  // 5. CORE-B Close-Up (Command Core Hero)
  console.log('Capturing Preset 5: CORE-B Close-Up...');
  await clickButtonWithText('5. CORE-B Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf5 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreB_command.png'), buf5);
  console.log('Saved computers_B1_coreB_command.png');

  // 6. CORE-C Close-Up (Honeycomb Lattice Array)
  console.log('Capturing Preset 6: CORE-C Close-Up...');
  await clickButtonWithText('6. CORE-C Close-Up');
  await new Promise(r => setTimeout(r, 1200));
  const buf6 = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'computers_B1_coreC_honeycomb.png'), buf6);
  console.log('Saved computers_B1_coreC_honeycomb.png');

  await browser.close();
  console.log('All B1 massing captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
