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
    assert.equal(await page.locator('#stuck-undo').count(), 0);
    assert.equal(await page.locator('#stuck-restart').count(), 1);
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
      const bottom = await page.evaluate(() => window.__turn.sample(2, 0));
      assert.ok(contrast(bottom.up, bottom.under) >= 4.5, width + ' depth4 ' + contrast(bottom.up, bottom.under).toFixed(2));
      const plate = await page.evaluate(() => window.__turn.plateWidth());
      assert.ok(plate >= 44, 'plate ' + plate);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

function contrast(a, b) {
  function lin(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  function lum(rgb) {
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }
  const left = lum(a);
  const right = lum(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

test('a queued over-cap move is rejected and the keyboard sequence stays within 4', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    await page.evaluate(() => {
      window.__turn.commit(2, 1, 1);
      window.__turn.commit(2, 3, 0);
      window.__turn.commit(1, 2, 0);
    });
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().queue === 0);
    const queued = await page.evaluate(() => window.__turn.snapshot());
    assert.ok(queued.maxPlate <= 4, JSON.stringify(queued.plates));
    assert.ok(queued.rejects >= 1, 'rejects ' + queued.rejects);
    assert.equal(queued.used, 2);
    await page.evaluate(() => window.__turn.load(1));
    await page.waitForFunction(() => window.__turn.ready && window.__turn.snapshot().used === 0);
    for (const key of ['3', 'q', '2', '3', 'e', '1', '2', 'w', '1']) await page.keyboard.press(key);
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().queue === 0);
    const keyed = await page.evaluate(() => window.__turn.snapshot());
    assert.ok(keyed.maxPlate <= 4, JSON.stringify(keyed.plates));
    assert.ok(keyed.rejects >= 1, 'key rejects ' + keyed.rejects);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('L4 undo steps back one flip at a time', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=4');
    await page.waitForFunction(() => window.__turn.ready);
    await page.evaluate(() => window.__turn.dismiss());
    const start = await page.evaluate(() => window.__turn.snapshot());
    await page.evaluate(() => window.__turn.commit(2, 2, 0));
    await page.waitForFunction(() => window.__turn.snapshot().used === 1 && !window.__turn.animating());
    const once = await page.evaluate(() => window.__turn.snapshot());
    await page.evaluate(() => window.__turn.commit(0, 1, 1));
    await page.waitForFunction(() => window.__turn.snapshot().used === 2 && !window.__turn.animating());
    await page.click('#undo');
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().undos === 1);
    const backOne = await page.evaluate(() => window.__turn.snapshot());
    assert.equal(JSON.stringify(backOne.plates), JSON.stringify(once.plates));
    await page.click('#undo');
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().undos === 2);
    const backTwo = await page.evaluate(() => window.__turn.snapshot());
    assert.equal(JSON.stringify(backTwo.plates), JSON.stringify(start.plates));
    assert.equal(backTwo.flips, start.budget - 4);
    assert.notEqual(JSON.stringify(backOne.plates), JSON.stringify(start.plates));
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
    const plan = [];
    for (const level of [1, 4, 9, 10]) {
      for (let i = 0; i < 25; i++) {
        plan.push({
          level: level,
          fx: [0.2, 0.5, 0.8][i % 3],
          fy: [0.12, 0.5, 0.82][i % 3]
        });
      }
    }
    let misses = 0;
    let loaded = 0;
    for (const item of plan) {
      if (loaded !== item.level) {
        await page.goto(fileUrl + '?level=' + item.level);
        await page.waitForFunction(() => window.__turn.ready);
        await page.evaluate(() => window.__turn.dismiss());
        loaded = item.level;
      } else {
        await page.evaluate(() => window.__turn.reset());
      }
      const point = await page.evaluate((spec) => {
        const plates = window.__turn.snapshot().plates;
        let choice = null;
        for (let i = 0; i < plates.length; i++) {
          for (let d = 1; d <= Math.min(3, plates[i].length); d++) {
            for (let j = 0; j < plates.length; j++) {
              if (j !== i && plates[j].length + d <= 4) choice = [i, d, j];
            }
          }
        }
        const spot = window.__turn.dragMove(choice[0], choice[1], choice[2], spec.fx, spec.fy);
        return { from: spot.from, to: spot.to, expect: JSON.stringify(spot.expect) };
      }, item);
      await drag(page, session, point.from, point.to, 2);
      const got = await page.evaluate(() => JSON.stringify(window.__turn.snapshot().plates));
      if (got !== point.expect) misses += 1;
    }
    console.log(`turnover misfires ${misses} / 100`);
    assert.ok(misses < 3, 'misfires ' + misses);
  } finally {
    await browser.close();
  }
});

test('a tap on a pancake then a tap on a plate flips', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__turn.ready);
    const point = await page.evaluate(() => window.__turn.dragMove(2, 1, 1));
    async function tap(at) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await tap(point.from);
    await tap(point.to);
    await page.waitForFunction(() => !window.__turn.animating() && window.__turn.snapshot().used === 1);
    assert.equal((await page.evaluate(() => window.__turn.snapshot())).used, 1);
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
