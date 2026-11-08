import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTIFACTS_DIR = 'C:\\Users\\mukun\\.gemini\\antigravity\\brain\\aa9bc9cd-2992-458e-8d52-086378094637';

async function generate() {
  console.log('Generating Side-by-Side comparison at 1280x720...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'puppeteer_side_by_side_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // 1. Visit /dev/terminal
  await page.goto('http://localhost:3000/dev/terminal', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Hide the dev harness toolbar for the clean capture
  await page.evaluate(() => {
    const bar = document.querySelector('div.fixed.top-3');
    if (bar) bar.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 300));

  // Capture our full terminal at 1280x720
  const terminalScreenshotBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'terminal_ui_1280x720.png'), terminalScreenshotBuf);
  console.log('Saved terminal_ui_1280x720.png');

  // 2. Build 1280x720 Side-by-Side Canvas in browser
  const refBuf = fs.readFileSync('public/terminal-reference.png');
  const refBase64 = refBuf.toString('base64');
  const termBase64 = terminalScreenshotBuf.toString('base64');

  await page.setContent(`
    <html>
      <body style="margin:0; padding:0; background:#000; overflow:hidden;">
        <canvas id="c" width="1280" height="720"></canvas>
      </body>
    </html>
  `);

  await page.evaluate(async (refB64, termB64) => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    const loadImg = (b64) => new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = 'data:image/png;base64,' + b64;
    });

    const [imgRef, imgTerm] = await Promise.all([loadImg(refB64), loadImg(termB64)]);

    // Clear background
    ctx.fillStyle = '#020502';
    ctx.fillRect(0, 0, 1280, 720);

    // Left Half (0..640): Reference Image
    ctx.drawImage(imgRef, 0, 0, 640, 720);

    // Divider line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(640, 0);
    ctx.lineTo(640, 720);
    ctx.stroke();

    // Right Half (640..1280): Our Terminal
    ctx.drawImage(imgTerm, 640, 0, 640, 720);

    // Subtle bottom labels (do NOT obscure the top header)
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(6, 20, 9, 0.85)';
    ctx.fillRect(10, 685, 200, 24);
    ctx.fillRect(650, 685, 220, 24);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 685, 200, 24);
    ctx.strokeRect(650, 685, 220, 24);

    ctx.fillStyle = '#2ee85c';
    ctx.fillText('REFERENCE (CRT PHOTO)', 18, 702);
    ctx.fillText('OUR PENDRIVE TERMINAL', 658, 702);
  }, refBase64, termBase64);

  const sideBySideBuf = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'terminal_side_by_side_1280x720.png'), sideBySideBuf);
  console.log('Saved terminal_side_by_side_1280x720.png');

  await browser.close();
}

generate().catch(console.error);
