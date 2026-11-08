import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';

async function testGameRoute() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_test_game_route_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  // Find all buttons on /game
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
  });

  console.log('Buttons on /game:', buttons);

  // Click the JUMP TO SEC 2 button
  const jumpClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const jumpBtn = btns.find(b => b.innerText.includes('JUMP TO SEC 2'));
    if (jumpBtn) {
      jumpBtn.click();
      return true;
    }
    return false;
  });

  console.log('JUMP TO SEC 2 clicked:', jumpClicked);

  await new Promise(r => setTimeout(r, 2000));

  const toastText = await page.evaluate(() => {
    return document.body.innerText;
  });

  console.log('Page has Transmission Unlocked:', toastText.includes('TRANSMISSION UNLOCKED') || toastText.includes('SECTION 2'));
  console.log('Console errors count on /game:', errors.length, errors);

  await browser.close();
}

testGameRoute().catch(console.error);
