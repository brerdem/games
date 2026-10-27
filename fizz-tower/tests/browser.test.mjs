import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');
const fileUrl = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));

async function launch() {
  return chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function settle(page) {
  await page.waitForFunction(() => window.__fizz && !window.__fizz.animating(), null, { timeout: 8000 });
}
async function tap(session, x, y) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__fizz && window.__fizz.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
    assert.match(await page.locator('#undo').innerText(), /Undo −1/);
  } finally {
    await browser.close();
  }
});

test('a cold deep link shows that level title', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const [level, title] of [[1, 'First Pour'], [8, 'Rock Garden'], [10, 'Grand Toast']]) {
      await page.goto(fileUrl + '?level=' + level);
      await page.waitForFunction(() => window.__fizz && window.__fizz.ready);
      const snap = await page.evaluate(() => window.__fizz.snapshot());
      assert.equal(snap.level, level);
      assert.equal(snap.title, title);
      assert.equal(snap.name, title);
    }
  } finally {
    await browser.close();
  }
});

test('bottle targets stay at least 64px and clear of the HUD', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      await page.goto(fileUrl + '?level=10');
      await page.waitForFunction(() => window.__fizz.ready);
      const info = await page.evaluate(() => {
        const boxes = window.__fizz.boxes();
        const hud = document.getElementById('hud').getBoundingClientRect();
        const bar = document.getElementById('bar').getBoundingClientRect();
        const stage = document.getElementById('stage').getBoundingClientRect();
        return {
          bottles: boxes.bottles,
          hudBottom: hud.bottom - stage.top,
          barTop: bar.top - stage.top,
          w: stage.width,
          h: stage.height
        };
      });
      for (const box of info.bottles) {
        assert.ok(box.w >= 64 && box.h >= 64, width + ' bottle ' + box.w + 'x' + box.h);
        assert.ok(box.x >= 0 && box.y >= info.hudBottom - 1, width + ' under hud ' + box.y + ' vs ' + info.hudBottom);
        assert.ok(box.x + box.w <= info.w + 1 && box.y + box.h <= info.barTop + 1, width + ' clipped');
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('L1 reference taps win once at par', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__fizz.ready && window.__fizz.solverReady);
    for (let i = 0; i < 3; i++) {
      const spot = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
      await tap(session, spot.cx, spot.cy);
      await settle(page);
    }
    const snap = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.used, 3);
    assert.equal(snap.stars, 3);
    await tap(session, (await page.evaluate(() => window.__fizz.boxes().bottles[0])).cx, (await page.evaluate(() => window.__fizz.boxes().bottles[0])).cy);
    await sleep(200);
    const again = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(again.used, 3);
    assert.equal(again.won, true);
  } finally {
    await browser.close();
  }
});

test('a rapid triple tap pours once, and taps after Next do not pour', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__fizz.ready);
    const spot = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
    for (let i = 0; i < 4; i++) {
      await tap(session, spot.cx, spot.cy);
      await sleep(70);
    }
    await settle(page);
    await sleep(300);
    const once = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(once.used, 1, 'stray pours ' + once.used);
    await page.evaluate(() => { window.__fizz.commit(0); });
    await settle(page);
    await page.evaluate(() => { window.__fizz.commit(0); });
    await page.waitForFunction(() => window.__fizz.snapshot().won);
    await sleep(200);
    const next = await page.locator('#win-next').boundingBox();
    await tap(session, next.x + next.width / 2, next.y + next.height / 2);
    const bottle = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
    for (let i = 0; i < 5; i++) {
      await tap(session, bottle.cx, bottle.cy);
      await sleep(80);
    }
    await sleep(400);
    const guarded = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(guarded.level, 2);
    assert.equal(guarded.used, 0);
  } finally {
    await browser.close();
  }
});

test('the stuck card matches the solver and offers undo only when it still wins', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__fizz.solverReady);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.__fizz.commit(0));
      await settle(page);
    }
    const stuck = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(stuck.stuck, true);
    assert.equal(stuck.banner, "This tower can't be finished in " + stuck.left + (stuck.left === 1 ? ' pour' : ' pours'));
    assert.equal(stuck.failed, false);
    assert.equal(stuck.won, false);
  } finally {
    await browser.close();
  }
});
