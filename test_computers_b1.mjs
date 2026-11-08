import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';

async function testComputersB1() {
  console.log('Testing /dev/computers metrics, console errors & geometry budget...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_test_comp_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  await page.goto('http://localhost:3000/dev/computers', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Query WebGL info and triangle counts from Three.js scene
  const metrics = await page.evaluate(() => {
    let totalTriangles = 0;
    let computerMeshes = 0;
    let computerTriangles = 0;

    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas found' };

    // Traverse R3F fiber if accessible
    try {
      const r3f = (canvas).__r3f;
      if (r3f && r3f.root && r3f.root.current) {
        const scene = r3f.root.current;
        scene.traverse((obj) => {
          if (obj.isMesh && obj.geometry) {
            const geo = obj.geometry;
            const triCount = geo.index
              ? geo.index.count / 3
              : geo.attributes.position
              ? geo.attributes.position.count / 3
              : 0;
            totalTriangles += triCount;
            // Check if part of cockpit computers
            let parent = obj.parent;
            let isComp = false;
            while (parent) {
              if (parent.name && parent.name.includes('computer')) {
                isComp = true;
                break;
              }
              parent = parent.parent;
            }
            if (isComp) {
              computerMeshes++;
              computerTriangles += triCount;
            }
          }
        });
      }
    } catch (e) {
      console.warn('Traverse error:', e);
    }

    return {
      canvasFound: true,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      totalTriangles,
      computerMeshes,
      computerTriangles,
    };
  });

  console.log('Page metrics:', metrics);
  console.log('Console errors (count):', errors.length, errors);
  console.log('Console warnings (count):', warnings.length, warnings);

  await browser.close();
  console.log('Test completed.');
}

testComputersB1().catch(console.error);
