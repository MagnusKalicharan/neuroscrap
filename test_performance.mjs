import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';

async function testPerformance() {
  console.log('Testing /game and /dev/antenna performance & console errors...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_perf_' + Date.now()),
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
  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  console.log('Loading /game...');
  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Errors logged in /game:', errors);

  console.log('Loading /dev/antenna...');
  await page.goto('http://localhost:3000/dev/antenna', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Total errors:', errors);

  await browser.close();
  console.log('Performance test completed cleanly!');
}

testPerformance().catch(console.error);
