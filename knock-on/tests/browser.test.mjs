import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('knock-on/index.html')).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));
const SIZES = [[360, 800], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932], [768, 1024], [1440, 900]];
const BOXES = [[320, 568], [360, 640], [360, 800], [375, 667], [390, 844], [393, 852], [402, 874], [412, 915], [414, 896], [428, 926], [430, 932], [768, 1024], [820, 1180], [1024, 1366], [1280, 800], [1440, 900], [1920, 1080]];

async function launch() {
  return chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

async function swipe(page, session, p, d) {
  const g = await page.evaluate((args) => window.__knock.swipe(args.p, args.d), { p: p, d: d });
  const steps = 5;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: g.from.x + (g.to.x - g.from.x) * (i / steps), y: g.from.y + (g.to.y - g.from.y) * (i / steps), id: 1 }]
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !window.__knock.animating(), null, { timeout: 8000 });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock && window.__knock.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
  } finally {
    await browser.close();
  }
});

test('a real swipe clears L1, idle frames match, and a short swipe spends nothing', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready && window.__knock.cellSize() >= 54);
    await page.evaluate(() => window.__knock.dismiss());
    const same = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const canvas = document.getElementById('c');
        const a = canvas.toDataURL();
        requestAnimationFrame(() => resolve(a === canvas.toDataURL()));
      });
    }));
    assert.equal(same, true);
    const session = await context.newCDPSession(page);
    const g = await page.evaluate(() => window.__knock.swipe(18, 1));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.from.x + 10, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 3);
    await swipe(page, session, 18, 1);
    const snap = await page.evaluate(() => window.__knock.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.stars, 3);
    assert.equal(snap.pushes, 2);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('stuck, out of pushes, undo, arrows, and a release over the bar spend nothing extra', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.dismiss());
    const places = await page.evaluate(() => {
      const g = window.__knock.swipe(18, 1);
      const bar = document.getElementById('bar').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('#bar button')].map((el) => el.getBoundingClientRect());
      const y = bar.top + Math.min(bar.height / 2, bar.height - 20);
      let barPoint = null;
      for (let x = 24; x < bar.right - 24; x += 6) {
        const onButton = buttons.some((box) => x >= box.left - 2 && x <= box.right + 2 && y >= box.top && y <= box.bottom);
        if (!onButton && y > bar.top && y < bar.bottom) { barPoint = { x: x, y: y }; break; }
      }
      if (!barPoint) barPoint = { x: bar.left + bar.width / 2, y: y };
      return { g: g, bar: barPoint, edge: { x: window.innerWidth - 1, y: g.to.y } };
    });
    async function lift(point) {
      const g = places.g;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.to.x, y: g.to.y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(40);
    }
    await lift(places.bar);
    const overBar = await page.evaluate(() => ({ pushes: window.__knock.snapshot().pushes, at: window.__knock.lastRelease() }));
    assert.equal(overBar.pushes, 3);
    assert.ok(Math.abs(overBar.at.x - places.bar.x) < 8 && Math.abs(overBar.at.y - places.bar.y) < 8, JSON.stringify({ at: overBar.at, bar: places.bar }));
    await lift(places.edge);
    const atEdge = await page.evaluate(() => ({ pushes: window.__knock.snapshot().pushes, at: window.__knock.lastRelease() }));
    assert.equal(atEdge.pushes, 3);
    assert.ok(atEdge.at.x > places.edge.x - 8, JSON.stringify(atEdge.at));
    await swipe(page, session, 20, 1);
    await page.waitForSelector('#stuck:not(.hidden)');
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 2);
    const stuckMs = await page.evaluate(() => window.__knock.stuckMs());
    assert.ok(stuckMs < 50, 'stuck ' + stuckMs);
    await page.click('#stuck-undo');
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 1);
    assert.equal(await page.evaluate(() => window.__knock.snapshot().failed), false);
    const outcome = await page.evaluate(() => window.__knock.fastCommit(20, 1));
    assert.equal(outcome, 'pushes');
    await page.waitForSelector('#fail:not(.hidden)');
    const box = await page.locator('#fail-restart').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    for (let i = 0; i < 3; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x, y: y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const after = await page.evaluate(() => window.__knock.snapshot());
    assert.equal(after.pushes, 3);
    assert.equal(after.won, false);
    await page.evaluate(() => window.__knock.fastCommit(18, 1));
    const next = await page.locator('#win-next').boundingBox();
    const nx = next.x + next.width / 2;
    const ny = next.y + next.height / 2;
    for (let i = 0; i < 3; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: nx, y: ny, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    assert.equal(await page.evaluate(() => document.getElementById('kicker').textContent), 'Table 2');
    await page.evaluate(() => window.__knock.load(1));
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const start = document.elementFromPoint(200, 400);
      start && start.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    const selected = await page.evaluate(() => {
      const canvas = document.getElementById('c');
      const rect = canvas.getBoundingClientRect();
      const g = window.__knock.swipe(18, 1);
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: g.from.x, clientY: g.from.y }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: g.from.x, clientY: g.from.y }));
      return !document.getElementById('arrows').classList.contains('hidden');
    });
    assert.equal(selected, true);
    await page.click('#arrow-b');
    await page.waitForFunction(() => !window.__knock.animating(), null, { timeout: 8000 });
    assert.equal(await page.evaluate(() => window.__knock.snapshot().won), true);
  } finally {
    await browser.close();
  }
});

test('eight viewports keep targets on screen and accept a swipe', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of SIZES) {
      const context = await browser.newContext({ viewport: { width: width, height: height }, isMobile: width < 700, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(fileUrl);
      await page.waitForFunction(() => window.__knock.ready && window.__knock.cellSize() > 0);
      const info = await page.evaluate(() => {
        const stage = document.getElementById('stage').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('#bar button, #hint, #mute')];
        const off = buttons.some((btn) => {
          const box = btn.getBoundingClientRect();
          return box.left < -1 || box.top < -1 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1 || box.height < 48;
        });
        return { cell: window.__knock.cellSize(), off: off, stage: [stage.width, stage.height] };
      });
      assert.equal(info.off, false, width + ' buttons');
      if (width === 360 && height === 800) assert.ok(info.cell >= 54, 'cell ' + info.cell);
      if (width >= 1000) {
        assert.ok(Math.abs(info.stage[0] / info.stage[1] - 390 / 844) < 0.03, 'frame ' + info.stage);
      }
      const session = await context.newCDPSession(page);
      await swipe(page, session, 18, 1);
      assert.equal(await page.evaluate(() => window.__knock.snapshot().won), true, width + ' solve');
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('seventeen sizes keep the buttons on screen', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of BOXES) {
      const page = await browser.newPage({ viewport: { width: width, height: height }, isMobile: width < 700, hasTouch: true });
      await page.goto(fileUrl + '?level=12');
      await page.waitForFunction(() => window.__knock.ready);
      const off = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('#bar button, #hint, #mute')];
        return buttons.some((btn) => {
          const box = btn.getBoundingClientRect();
          return box.width < 44 || box.height < 44 || box.left < -1 || box.top < -1 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1;
        });
      });
      assert.equal(off, false, width + 'x' + height);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('resize and rotate keep the table, and a reload opens the last unlock', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.fastCommit(18, 1));
    const kept = await page.evaluate(() => window.__knock.snapshot());
    await page.setViewportSize({ width: 390, height: 780 });
    await page.waitForTimeout(80);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(50);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(80);
    const turned = await page.evaluate(() => window.__knock.snapshot());
    assert.deepEqual(turned.cells, kept.cells);
    assert.equal(turned.pushes, kept.pushes);
    await page.evaluate(() => localStorage.setItem('knock-on-progress-v1', JSON.stringify({ stars: { 1: 3 }, unlocked: 4, mute: false, parSeen: {} })));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready);
    assert.equal(await page.textContent('#kicker'), 'Table 4');
  } finally {
    await browser.close();
  }
});

test('landscape shows only the rotate card', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await page.goto(fileUrl + '?level=12');
    await page.waitForFunction(() => window.__knock.ready);
    assert.equal(await page.evaluate(() => !document.getElementById('rotate').classList.contains('hidden')), true);
    const before = await page.evaluate(() => window.__knock.snapshot().pushes);
    await page.touchscreen.tap(200, 200);
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), before);
  } finally {
    await browser.close();
  }
});

test('a phone-class 4x throttle stays at or above 50fps during a swiped solve', async () => {
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
    const plan = [[6, 0], [7, 1], [36, 1], [34, 0], [38, 2]];
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=10');
      await page.waitForFunction(() => window.__knock && window.__knock.ready);
      await page.evaluate(() => window.__knock.dismiss());
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      });
      for (const step of plan) await swipe(page, session, step[0], step[1]);
      await page.waitForFunction(() => window.__knock.snapshot().won, null, { timeout: 8000 });
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        const canvas = document.getElementById('c');
        return { fps: (frames.length - 1) / dt, scale: window.__knock.bufferScale(), buf: canvas.width, css: canvas.clientWidth };
      });
      samples.push(result);
      console.log(`knock-on run ${run + 1} ${result.fps.toFixed(1)} fps scale ${result.scale} buf ${result.buf}`);
    }
    const worst = Math.min(...samples.map((item) => item.fps));
    console.log(`knock-on min ${worst.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worst >= 50, `min fps ${worst}`);
  } finally {
    await browser.close();
  }
});
