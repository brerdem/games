import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright';

const GAMES = [
  'unravel',
  'pinball-pit',
  'gridlock',
  'ring-out',
  'smash-cascade',
  'scratch-and-slay',
  'flow-fort',
  'sand-strata',
  'top-turner',
  'spillproof',
];
const PHONE = 390 / 844;

function startServer() {
  const child = spawn('python3', ['-m', 'http.server', '8771', '--bind', '127.0.0.1'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });
  return child;
}

async function ready() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:8771/ring-out/');
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('layout server did not start');
}

test('every game keeps a uniform canvas scale and a phone frame on desktop', async () => {
  const server = startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item)),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    await ready();
    for (const game of GAMES) {
      for (const [width, height, phone] of [[1440, 900, false], [1920, 1080, false], [390, 844, true], [360, 800, true], [430, 932, true]]) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
        const errors = [];
        page.on('pageerror', (err) => errors.push(String(err)));
        await page.goto(`http://127.0.0.1:8771/${game}/`);
        await page.waitForFunction(() => {
          const canvas = document.querySelector('canvas');
          const box = canvas.getBoundingClientRect();
          return canvas.width > box.width * 0.9 && canvas.height > box.height * 0.9;
        });
        const measured = await page.evaluate(() => {
          const stage = document.getElementById('stage').getBoundingClientRect();
          const canvas = document.querySelector('canvas');
          const box = canvas.getBoundingClientRect();
          return {
            sw: stage.width,
            sh: stage.height,
            cw: box.width,
            ch: box.height,
            bw: canvas.width,
            bh: canvas.height,
          };
        });
        const cssAspect = measured.cw / measured.ch;
        const bufAspect = measured.bw / measured.bh;
        assert.ok(Math.abs(cssAspect - bufAspect) < 0.02, `${game} ${width}x${height} scale ${cssAspect} vs ${bufAspect}`);
        assert.ok(Math.abs(measured.bw / measured.cw - measured.bh / measured.ch) < 0.05, `${game} non-uniform`);
        if (phone) {
          assert.ok(Math.abs(measured.sw - width) <= 2 && Math.abs(measured.sh - height) <= 2, `${game} phone ${measured.sw}x${measured.sh}`);
        } else {
          assert.ok(Math.abs(measured.sw / measured.sh - PHONE) < 0.03, `${game} desktop aspect ${measured.sw}x${measured.sh}`);
          assert.ok(measured.sw < width - 200, `${game} still wide ${measured.sw}`);
          assert.ok(Math.abs(measured.sh - height) <= 2, `${game} height ${measured.sh}`);
        }
        assert.deepEqual(errors, [], `${game} errors`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }
});
