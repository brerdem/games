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

async function drag(page, session, from, to, wobble) {
  const steps = 6;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: from.x + (to.x - from.x) * (i / steps) + (wobble || 0) * side,
        y: from.y + (to.y - from.y) * (i / steps),
        id: 1
      }]
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().queue === 0, null, { timeout: 4000 });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__turn && window.__turn.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
    assert.match(await page.locator('#undo').innerText(), /Undo −1/);
    assert.equal(await page.locator('#hint').count(), 0);
  } finally {
    await browser.close();
  }
});

test('a real drag clears L1 with three stars and a short drag spends nothing', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    const session = await context.newCDPSession(page);
    const g = await page.evaluate(() => window.__turn.dragMove(2, 1, 1));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.from.x + 8, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal((await page.evaluate(() => window.__turn.snapshot())).used, 0);
    for (const move of [[2, 1, 1], [2, 2, 0], [1, 2, 2]]) {
      const point = await page.evaluate((item) => window.__turn.dragMove(item[0], item[1], item[2]), move);
      await drag(page, session, point.from, point.to);
      const dur = await page.evaluate(() => window.__turn.animMs());
      assert.ok(dur <= 420, 'anim ' + dur);
    }
    const snap = await page.evaluate(() => window.__turn.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.stars, 3);
    assert.equal(snap.used, 3);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('a drag during the flip is queued, and undo costs one', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    await page.evaluate(() => window.__turn.commit(2, 1, 1));
    await page.waitForFunction(() => window.__turn.snapshot().used === 1 && !window.__turn.animating());
    const afterOne = await page.evaluate(() => window.__turn.snapshot());
    await page.evaluate(() => window.__turn.load(1));
    await page.waitForFunction(() => window.__turn.ready && window.__turn.snapshot().used === 0);
    await page.evaluate(() => {
      window.__turn.commit(2, 1, 1);
      window.__turn.commit(2, 2, 0);
    });
    await page.waitForFunction(() => window.__turn.snapshot().used === 2 && !window.__turn.animating());
    const afterTwo = await page.evaluate(() => window.__turn.snapshot());
    await page.click('#undo');
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().undos === 1);
    const undone = await page.evaluate(() => window.__turn.snapshot());
    assert.equal(JSON.stringify(undone.plates), JSON.stringify(afterOne.plates));
    assert.equal(undone.flips, afterTwo.flips - 1);
  } finally {
    await browser.close();
  }
});

test('pointercancel does not flip, and a stuck line uses the exact banner', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    const g = await page.evaluate(() => window.__turn.dragMove(2, 1, 1));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.to.x, y: g.to.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.waitForTimeout(50);
    assert.equal((await page.evaluate(() => window.__turn.snapshot())).used, 0);
    await page.evaluate(() => { window.__turn.commit(0, 1, 1); window.__turn.commit(2, 1, 0); });
    await page.waitForSelector('#stuck:not(.hidden)');
    const stuck = await page.evaluate(() => window.__turn.snapshot());
    assert.equal(stuck.banner, "Can't finish in 3 flips — undo or restart");
    assert.equal(stuck.stuck, true);
  } finally {
    await browser.close();
  }
});

test('burnt and golden bands read at 320 and 390', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[320, 568], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(fileUrl + '?level=9');
      await page.waitForFunction(() => window.__turn.ready);
      await page.evaluate(() => window.__turn.dismiss());
      const sample = await page.evaluate(() => window.__turn.sample(2, 1));
      assert.ok(sample.topH >= 6 && sample.botH >= 5, width + ' band');
      assert.ok(sample.box.w >= 44 && sample.box.h >= 28, width + ' cake');
      const upDark = sample.up[0] < 120 && sample.up[1] < 90;
      const underGold = sample.under[0] > 180 && sample.under[1] > 120;
      assert.equal(upDark, true, width + ' up ' + sample.up.join(','));
      assert.equal(underGold, true, width + ' under ' + sample.under.join(','));
      const plate = await page.evaluate(() => window.__turn.plateWidth());
      assert.ok(plate >= 44, 'plate ' + plate);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('drag misfires stay under 3 per 100', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    let misses = 0;
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__turn.load(1));
      await page.waitForFunction(() => window.__turn.ready && window.__turn.snapshot().used === 0);
      const point = await page.evaluate(() => window.__turn.dragMove(2, 1, 1));
      await drag(page, session, point.from, point.to, 3);
      const used = await page.evaluate(() => window.__turn.snapshot().used);
      if (used !== 1) misses += 1;
    }
    console.log(`turnover misfires ${misses} / 100`);
    assert.ok(misses < 3, 'misfires ' + misses);
  } finally {
    await browser.close();
  }
});

test('a phone-class 4x throttle stays at or above 50fps during a dragged solve', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    const session = await context.newCDPSession(page);
    const plan = [[2, 1, 1], [2, 2, 0], [1, 2, 2]];
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=1');
      await page.waitForFunction(() => window.__turn && window.__turn.ready);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      });
      for (const move of plan) {
        const point = await page.evaluate((item) => window.__turn.dragMove(item[0], item[1], item[2]), move);
        await drag(page, session, point.from, point.to);
      }
      await page.waitForFunction(() => window.__turn.snapshot().won, null, { timeout: 8000 });
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        const canvas = document.getElementById('c');
        return { fps: (frames.length - 1) / dt, scale: window.__turn.bufferScale(), buf: canvas.width, css: canvas.clientWidth };
      });
      samples.push(result);
      console.log(`turnover run ${run + 1} ${result.fps.toFixed(1)} fps scale ${result.scale} buf ${result.buf}`);
    }
    const worst = Math.min(...samples.map((item) => item.fps));
    console.log(`turnover min ${worst.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worst >= 50, `min fps ${worst}`);
  } finally {
    await browser.close();
  }
});
