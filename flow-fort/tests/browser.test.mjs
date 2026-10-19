import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('flow-fort/index.html')).href;
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

test('file:// has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__game);
    await page.click('#startBtn');
    assert.deepEqual(urls.filter((url) => /^https?:/i.test(url)), []);
  } finally {
    await browser.close();
  }
});

test('mute, pause, restart, and saved progress', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__game);
    await page.click('#calmBtn');
    const calm = await page.evaluate(() => window.__game.get().calm);
    assert.equal(calm, true);
    await page.click('#startBtn');
    await page.keyboard.press('m');
    assert.equal(await page.evaluate(() => window.__game.get().muted), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__game.get().phase), 'pause');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__game.get().phase), 'play');
    await page.keyboard.press('r');
    const afterR = await page.evaluate(() => window.__game.get());
    assert.equal(afterR.rail, 0);
    assert.equal(afterR.phase, 'play');
    await page.evaluate(() => window.__game.launch(0));
    assert.equal(await page.evaluate(() => window.__game.get().rail), 1);
    await page.keyboard.press('Backspace');
    assert.equal(await page.evaluate(() => window.__game.get().rail), 0);
    await page.evaluate(() => window.__game.presentClear());
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__game.get().level), 2);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('flow-fort-progress-v1')));
    assert.ok(saved.stars['1'] >= 1);
    assert.ok(saved.unlocked >= 2);
    assert.equal(saved.mute, true);
    await page.reload();
    await page.waitForFunction(() => window.__game);
    const again = await page.evaluate(() => JSON.parse(localStorage.getItem('flow-fort-progress-v1')));
    assert.equal(again.stars['1'], saved.stars['1']);
  } finally {
    await browser.close();
  }
});

test('outside release does not launch', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 1280, 800);
    await page.click('#startBtn');
    await page.waitForTimeout(400);
    const target = await page.evaluate(() => window.__game.clientTargets().find((item) => item.kind === 'deck'));
    await page.mouse.move(target.x, target.y);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();
    const state = await page.evaluate(() => window.__game.get());
    assert.equal(state.rail, 0);
    assert.equal(state.phase, 'play');
  } finally {
    await browser.close();
  }
});

test('core gesture, landscape separation, and next stays off the bench', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of VIEWPORTS) {
      const { page, errors } = await open(browser, width, height);
      await page.click('#startBtn');
      await page.waitForTimeout(350);
      const before = await page.evaluate(() => window.__game.get().rail);
      const target = await page.evaluate(() => window.__game.clientTargets().find((item) => item.kind === 'deck'));
      assert.ok(target, `deck ${width}x${height}`);
      await page.mouse.click(target.x, target.y);
      const after = await page.evaluate(() => window.__game.get().rail);
      assert.equal(after, before + 1, `gesture ${width}x${height}`);
      const boxes = await page.evaluate(() => window.__game.boxes());
      for (const pair of [['grid', 'bench'], ['grid', 'deck'], ['rail', 'bench'], ['rail', 'deck']]) {
        assert.equal(overlap(boxes[pair[0]], boxes[pair[1]]), false, `${pair.join('/')} ${width}x${height}`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const { page } = await open(browser, 844, 390);
    await page.click('#startBtn');
    await page.evaluate(() => window.__game.presentClear());
    const covered = await page.evaluate(() => window.__game.benchPoints().map((point) => {
      const el = document.elementFromPoint(point.x, point.y);
      return el && el.id;
    }));
    assert.equal(covered.includes('nextBtn'), false, covered.join(','));
    const level = await page.evaluate(() => window.__game.get().level);
    await page.click('#nextBtn');
    assert.equal(await page.evaluate(() => window.__game.get().level), level);
    await page.waitForTimeout(400);
    await page.click('#nextBtn');
    assert.equal(await page.evaluate(() => window.__game.get().level), level + 1);
  } finally {
    await browser.close();
  }
});
