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

async function swipe(page, session, id, wobble) {
  const g = await page.evaluate((lane) => window.__shish.lanePoint(lane), id);
  const steps = 6;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: g.from.x + (g.to.x - g.from.x) * (i / steps) + (wobble || 0) * side,
        y: g.from.y + (g.to.y - g.from.y) * (i / steps) + (wobble || 0) * side,
        id: 1
      }]
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !window.__shish.animating(), null, { timeout: 4000 });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__shish && window.__shish.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
    assert.equal(await page.locator('#hint').count(), 0);
  } finally {
    await browser.close();
  }
});

test('a real swipe clears L1 with three stars and a short swipe spends nothing', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__shish.ready && window.__shish.cellSize() >= 48);
    const session = await context.newCDPSession(page);
    const g = await page.evaluate(() => window.__shish.lanePoint('T0'));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.from.x, y: g.from.y + 8, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal((await page.evaluate(() => window.__shish.snapshot())).moves, 0);
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      await swipe(page, session, id);
      const dur = await page.evaluate(() => window.__shish.animMs());
      assert.ok(dur <= 350, 'anim ' + dur);
    }
    const snap = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.stars, 3);
    assert.equal(snap.tickets.length, 0);
    assert.equal(snap.skewers, 2);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('a mismatch is free, the stuck banner is exact, and undo costs one skewer', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__shish.ready);
    const before = await page.evaluate(() => window.__shish.snapshot());
    await swipe(page, session, 'L2');
    const missed = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(missed.board, before.board);
    assert.deepEqual(missed.tickets, before.tickets);
    assert.equal(missed.skewers, before.skewers);
    assert.equal(missed.moves, 0);
    await swipe(page, session, 'L0');
    await page.waitForSelector('#stuck:not(.hidden)');
    const stuck = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(stuck.banner, 'No remaining sequence can serve every ticket.');
    assert.equal(stuck.stuck, true);
    assert.equal(stuck.skewers, before.skewers - 1);
    assert.notEqual(stuck.board, before.board);
    await page.click('#stuck-undo');
    const undone = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(undone.board, before.board);
    assert.deepEqual(undone.tickets, before.tickets);
    assert.equal(undone.skewers, before.skewers - 1);
    assert.equal(undone.stuck, false);
    await page.click('#restart');
    const restarted = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(restarted.board, before.board);
    assert.equal(restarted.skewers, before.budget);
    assert.equal(restarted.undos, 0);
  } finally {
    await browser.close();
  }
});

test('lane ends are at least 44px at 360, 390 and 430', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      await page.goto(fileUrl + '?level=11');
      await page.waitForFunction(() => window.__shish.ready);
      await page.evaluate(() => window.__shish.dismiss());
      const zones = await page.evaluate(() => window.__shish.laneRects().map((box) => ({ id: box.id, w: box.w, h: box.h })));
      assert.equal(zones.length, 24);
      for (const zone of zones) {
        assert.ok(zone.w >= 44 && zone.h >= 44, `${width} ${zone.id} ${zone.w}x${zone.h}`);
      }
      if (width === 390) assert.ok(await page.evaluate(() => window.__shish.cellSize()) >= 48);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('swipe misfires stay under 3 per 100', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=11');
    await page.waitForFunction(() => window.__shish.ready);
    await page.evaluate(() => { window.__shish.dismiss(); window.__shish.recognizeOnly(true); });
    const ids = await page.evaluate(() => window.__shish.laneRects().map((box) => box.id));
    let misses = 0;
    const plan = [];
    while (plan.length < 100) plan.push(...ids);
    for (const id of plan.slice(0, 100)) {
      await swipe(page, session, id, 3);
      const got = await page.evaluate(() => window.__shish.last());
      if (!got || got.id !== id) misses += 1;
    }
    console.log(`shish-lane misfires ${misses} / 100`);
    assert.ok(misses < 3, 'misfires ' + misses);
  } finally {
    await browser.close();
  }
});

test('coal and slab each introduce themselves once', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=5');
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.match(await page.locator('#lesson-copy').innerText(), /Coal stops the skewer/);
    await page.click('#lesson-ok');
    await page.evaluate(() => window.__shish.load(7));
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.match(await page.locator('#lesson-copy').innerText(), /slab spears only along its length/i);
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
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=1');
      await page.waitForFunction(() => window.__shish && window.__shish.ready);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      });
      for (const id of ['T0', 'T1', 'T2', 'T3']) await swipe(page, session, id);
      await page.waitForFunction(() => window.__shish.snapshot().won, null, { timeout: 8000 });
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        const canvas = document.getElementById('c');
        return { fps: (frames.length - 1) / dt, scale: window.__shish.bufferScale(), buf: canvas.width, css: canvas.clientWidth };
      });
      samples.push(result);
      console.log(`shish-lane run ${run + 1} ${result.fps.toFixed(1)} fps scale ${result.scale} buf ${result.buf}`);
    }
    const worst = Math.min(...samples.map((item) => item.fps));
    console.log(`shish-lane min ${worst.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worst >= 50, `min fps ${worst}`);
  } finally {
    await browser.close();
  }
});

async function thrust(page, id) {
  await page.evaluate((lane) => window.__shish.commit(lane), id);
  await page.waitForFunction(() => !window.__shish.animating(), null, { timeout: 4000 });
}

test('two undos leave both spares spent once each, and a one-star clear is reachable', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__shish.ready);
    const before = await page.evaluate(() => window.__shish.snapshot());
    await thrust(page, 'T0');
    await page.click('#undo');
    const once = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(once.board, before.board);
    assert.deepEqual(once.tickets, before.tickets);
    assert.equal(once.skewers, before.budget - 1);
    assert.equal(once.undos, 1);
    assert.equal(once.stuck, false);
    await thrust(page, 'T0');
    await page.click('#undo');
    const twice = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(twice.skewers, before.budget - 2);
    assert.equal(twice.undos, 2);
    assert.equal(twice.stuck, false);
    assert.match(await page.locator('#undo').innerText(), /−1/);
    assert.equal(await page.locator('#undo .bite').count(), 1);
    for (const id of ['T0', 'T1', 'T2', 'T3']) await thrust(page, id);
    const won = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(won.won, true);
    assert.equal(won.stars, 1);
    assert.equal(won.undos, 2);
    assert.equal(won.tickets.length, 0);
  } finally {
    await browser.close();
  }
});

test('a solvable board with too few skewers does not use the unsolvable banner', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__shish.ready);
    for (let i = 0; i < 3; i++) {
      await thrust(page, 'T0');
      await page.click('#undo');
    }
    await page.waitForSelector('#stuck:not(.hidden)');
    const snap = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(snap.banner, 'Not enough skewers to serve the remaining tickets.');
    assert.equal(snap.banner.includes('No remaining sequence'), false);
    assert.equal(await page.locator('#stuck-undo').isDisabled(), true);
    assert.equal(snap.stuck, true);
    assert.equal(snap.board.length > 0, true);
  } finally {
    await browser.close();
  }
});

test('pointercancel drops the gesture and does not thrust', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__shish.ready);
    const before = await page.evaluate(() => window.__shish.snapshot());
    const g = await page.evaluate(() => window.__shish.lanePoint('T0'));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.to.x, y: g.to.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => window.__shish.snapshot());
    assert.equal(after.moves, before.moves);
    assert.equal(after.board, before.board);
    assert.equal(after.skewers, before.skewers);
  } finally {
    await browser.close();
  }
});

test('top lane zones stay clear of the ticket rail at 320x568', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    for (let level = 1; level <= 11; level++) {
      await page.goto(fileUrl + '?level=' + level);
      await page.waitForFunction(() => window.__shish.ready);
      await page.evaluate(() => window.__shish.dismiss());
      await page.waitForTimeout(50);
      const hit = await page.evaluate(() => {
        const rail = document.getElementById('rail').getBoundingClientRect();
        const tops = window.__shish.laneRects().filter((box) => box.id[0] === 'T');
        const overlap = tops.filter((box) => box.x < rail.right && box.x + box.w > rail.left && box.y < rail.bottom && box.y + box.h > rail.top);
        return { overlap: overlap.map((box) => box.id), count: tops.length, cell: window.__shish.cellSize() };
      });
      assert.equal(hit.count > 0, true, 'L' + level);
      assert.deepEqual(hit.overlap, [], 'L' + level + ' ' + hit.overlap.join(','));
    }
  } finally {
    await browser.close();
  }
});
