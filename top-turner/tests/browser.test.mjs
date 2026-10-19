import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('top-turner/index.html')).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));
const VIEWPORTS = [
  [360, 800],
  [375, 667],
  [390, 844],
  [414, 896],
  [430, 932],
  [768, 1024],
  [844, 390],
  [932, 430],
];

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

async function launch() {
  return chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

async function open(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(fileUrl);
  await page.waitForFunction(() => window.__game);
  return { page, errors };
}

test('pointer carve does not touch slice 16, and overlay taps do not carve', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.dblclick('#startBtn');
    await page.waitForTimeout(400);
    const afterStart = await page.evaluate(() => window.__game.radii());
    assert.ok(afterStart.every((value) => value === 1));
    const point = await page.evaluate(() => {
      const g = window.__game.lathe();
      const canvas = document.getElementById('c');
      const rect = canvas.getBoundingClientRect();
      const y = g.top + 4.5 * g.slice;
      return {
        x: rect.left + (g.axisX / g.width) * rect.width,
        y: rect.top + (y / g.height) * rect.height,
        dx: (g.scale * 0.4 / g.width) * rect.width,
      };
    });
    await page.mouse.move(point.x - point.dx, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + point.dx, point.y, { steps: 6 });
    await page.mouse.up();
    const radii = await page.evaluate(() => window.__game.radii());
    assert.ok(radii[4] < 1, 'carved slice');
    assert.equal(radii[16], 1);
    assert.ok(radii.filter((value, index) => value !== 1 && index !== 3 && index !== 4 && index !== 5).length === 0);
  } finally {
    await browser.close();
  }
});

test('blank stays fully on screen with slices at least 12 px', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[360, 800], [390, 844], [430, 932], [844, 390]]) {
      const { page, errors } = await open(browser, width, height);
      await page.click('#startBtn');
      const g = await page.evaluate(() => window.__game.lathe());
      const blank = { x: g.axisX - g.scale, y: g.top, w: g.scale * 2, h: g.bottom - g.top };
      assert.ok(blank.x >= -0.5, `left ${width}`);
      assert.ok(blank.x + blank.w <= g.width + 0.5, `right ${width}`);
      assert.ok(blank.y >= -0.5 && blank.y + blank.h <= g.height + 0.5, `vertical ${width}`);
      assert.ok(g.slice >= 12, `slice ${g.slice} at ${width}x${height}`);
      assert.equal(overlap(blank, g.stats), false, `stats ${width}`);
      assert.equal(overlap(blank, g.battle), false, `battle ${width}`);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('a nudge away from the top does not launch, and an outside release keeps the throw', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 1280, 800);
    await page.click('#startBtn');
    await page.waitForTimeout(350);
    await page.evaluate(() => window.__game.battle());
    await page.waitForTimeout(100);
    await page.mouse.move(30, 40);
    await page.mouse.down();
    await page.mouse.move(40, 48);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__game.get().mode), 'launch');
    const start = await page.evaluate(() => {
      const g = window.__game.get();
      return g;
    });
    assert.equal(start.mode, 'launch');
    const from = await page.evaluate(() => window.__game.launchPoint());
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, from.y - 80, { steps: 4 });
    await page.mouse.move(5, 5);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__game.get().mode), 'battle');
  } finally {
    await browser.close();
  }
});

test('keys and a carve gesture on eight viewports', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__game);
    await page.click('#startBtn');
    await page.waitForTimeout(400);
    await page.keyboard.press('m');
    assert.equal(await page.evaluate(() => window.__game.get().muted), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__game.get().phase), 'pause');
    await page.keyboard.press('Escape');
    const point = await page.evaluate(() => {
      const g = window.__game.lathe();
      const rect = document.getElementById('c').getBoundingClientRect();
      const y = g.top + 6.5 * g.slice;
      return {
        x: rect.left + (g.axisX / g.width) * rect.width,
        y: rect.top + (y / g.height) * rect.height,
        dx: (g.scale * 0.45 / g.width) * rect.width,
      };
    });
    await page.mouse.move(point.x - point.dx, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + point.dx, point.y, { steps: 4 });
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__game.radii().some((value) => value < 1)), true);
    await page.keyboard.press('r');
    assert.ok(await page.evaluate(() => window.__game.radii().every((value) => value === 1)));
    await page.close();
    for (const [width, height] of VIEWPORTS) {
      const opened = await open(browser, width, height);
      await opened.page.click('#startBtn');
      await opened.page.waitForTimeout(350);
      const point = await opened.page.evaluate(() => {
        const g = window.__game.lathe();
        const rect = document.getElementById('c').getBoundingClientRect();
        const y = g.top + 8.5 * g.slice;
        return {
          x: rect.left + (g.axisX / g.width) * rect.width,
          y: rect.top + (y / g.height) * rect.height,
          dx: (g.scale * 0.45 / g.width) * rect.width,
        };
      });
      await opened.page.mouse.move(point.x - point.dx, point.y);
      await opened.page.mouse.down();
      await opened.page.mouse.move(point.x + point.dx, point.y, { steps: 4 });
      await opened.page.mouse.up();
      const changed = await opened.page.evaluate(() => window.__game.radii().some((value) => value < 1));
      assert.equal(changed, true, `gesture ${width}x${height}`);
      assert.deepEqual(opened.errors, []);
      await opened.page.close();
    }
  } finally {
    await browser.close();
  }
});
