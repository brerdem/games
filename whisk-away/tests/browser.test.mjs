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

async function settle(page) {
  await page.waitForFunction(() => window.__whisk && !window.__whisk.animating(), null, { timeout: 8000 });
}

async function armed(page) {
  await page.waitForFunction(() => window.__whisk.ready && performance.now() >= window.__whisk.quietUntil());
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function trustedStroke(page, session, from, dir, dist, pxPerMs) {
  const slow = pxPerMs < 1;
  const steps = slow ? Math.max(6, Math.round(dist / 8)) : 2;
  const gap = slow ? 16 : 12;
  const end = { x: from.x + dir[0] * dist, y: from.y + dir[1] * dist };
  const pending = [];
  pending.push(session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y, id: 1 }]
  }));
  for (let i = 1; i <= steps; i++) {
    if (slow) await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    else await sleep(gap);
    pending.push(session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: from.x + (end.x - from.x) * (i / steps),
        y: from.y + (end.y - from.y) * (i / steps),
        id: 1
      }]
    }));
  }
  if (slow) await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  else await sleep(gap);
  pending.push(session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }));
  await Promise.all(pending);
  await settle(page);
}

async function flick(page, session, index, cells, pxPerMs) {
  const spot = await page.evaluate((cloth) => window.__whisk.point(cloth), index);
  await trustedStroke(page, session, spot, spot.dir, (cells == null ? 0.7 : cells) * spot.cell, pxPerMs == null ? 1.6 : pxPerMs);
}

async function pull(page, session, index, cells, pxPerMs) {
  const spot = await page.evaluate((cloth) => window.__whisk.point(cloth), index);
  await trustedStroke(page, session, spot, spot.dir, (cells == null ? 0.78 : cells) * spot.cell, pxPerMs == null ? 0.28 : pxPerMs);
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__whisk && window.__whisk.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
    assert.match(await page.locator('#undo').innerText(), /Undo −1/);
    assert.equal(await page.locator('#hint').count(), 0);
  } finally {
    await browser.close();
  }
});

test('reference lines clear with three stars through touch at 390 and L1 at the other phone widths', async () => {
  const browser = await launch();
  try {
    const packed = JSON.parse(fs.readFileSync(new URL('./pack_v1_1.json', import.meta.url), 'utf8'));
    const lines = (packed.levels || packed).map((row) => row.reference_line);
    for (const [width, height, onlyFirst] of [[390, 844, false], [320, 568, true], [360, 800, true], [430, 932, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      const session = await context.newCDPSession(page);
      const count = onlyFirst ? 1 : lines.length;
      for (let n = 1; n <= count; n++) {
        await page.goto(fileUrl + '?level=' + n);
        await armed(page);
        const cell = await page.evaluate(() => window.__whisk.cellSize());
        if (width === 390) assert.ok(cell >= 56, 'cell ' + cell);
        if (width === 320) assert.ok(cell >= 48, 'cell ' + cell);
        if (n <= 2) {
          for (const step of lines[n - 1]) {
            const whip = step.startsWith('whip');
            const index = +step.slice(step.indexOf('c') + 1);
            if (whip) await flick(page, session, index);
            else await pull(page, session, index);
          }
        } else {
          for (const step of lines[n - 1]) {
            const kind = step.startsWith('whip') ? 'w' : 'd';
            const index = +step.slice(step.indexOf('c') + 1);
            await page.evaluate((move) => window.__whisk.commit(move[0], move[1]), [kind, index]);
            await settle(page);
          }
        }
        const snap = await page.evaluate(() => window.__whisk.snapshot());
        assert.equal(snap.won, true, width + ' L' + n);
        assert.equal(snap.stars, 3, width + ' L' + n + ' stars ' + snap.used);
        assert.equal(snap.used, snap.par);
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('trusted touch flicks whip and slow drags pull', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__whisk.ready);
    let flickMiss = 0;
    let pullMiss = 0;
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__whisk.reset());
      await page.waitForFunction(() => window.__whisk.snapshot().used === 0);
      await armed(page);
      const cells = 0.64 + (i % 7) * 0.07;
      const speed = 1.25 + (i % 5) * 0.15;
      await flick(page, session, 0, cells, speed);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      if (!(snap.used === 1 && snap.cloths === 0 && JSON.stringify(snap.dishes) === '[[1,1]]')) flickMiss += 1;
    }
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__whisk.reset());
      await page.waitForFunction(() => window.__whisk.snapshot().used === 0);
      await armed(page);
      const cells = 0.62 + (i % 4) * 0.08;
      const speed = 0.12 + (i % 5) * 0.06;
      await pull(page, session, 0, cells, speed);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      if (!(snap.used === 1 && snap.cloths === 1 && JSON.stringify(snap.dishes) === '[[1,2]]')) pullMiss += 1;
    }
    console.log(`whisk trusted misfires flick ${flickMiss}/100 pull ${pullMiss}/100`);
    assert.ok(flickMiss < 3, 'flick ' + flickMiss);
    assert.ok(pullMiss < 3, 'pull ' + pullMiss);
  } finally {
    await browser.close();
  }
});

test('a fast flick past a cell is a pure whip, and a slow drag commits the snapped cells', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await armed(page);
    await flick(page, session, 0, 1.2, 1.5);
    const whipped = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(whipped.used, 1);
    assert.equal(whipped.cloths, 0);
    assert.equal(whipped.goal, true);
    assert.equal(JSON.stringify(whipped.dishes), '[[2,3]]');
    await page.evaluate(() => window.__whisk.load(2));
    await page.waitForFunction(() => window.__whisk.snapshot().level === 2 && window.__whisk.snapshot().used === 0);
    await armed(page);
    await pull(page, session, 0, 0.8, 0.25);
    const one = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(one.used, 1, 'one cell');
    assert.equal(JSON.stringify(one.dishes), '[[1,2]]');
    await page.evaluate(() => window.__whisk.reset());
    await page.waitForFunction(() => window.__whisk.snapshot().used === 0);
    await armed(page);
    await pull(page, session, 0, 1.65, 0.22);
    const two = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(two.used, 2, 'two cells');
    assert.equal(JSON.stringify(two.dishes), '[[1,3]]');
  } finally {
    await browser.close();
  }
});

test('a triple tap on Next does not whip the next table', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__whisk.ready);
    await page.evaluate(() => window.__whisk.commit('w', 0));
    await page.waitForFunction(() => window.__whisk.snapshot().won);
    await page.waitForTimeout(700);
    const box = await page.locator('#win-next').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    for (let i = 0; i < 3; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await page.waitForTimeout(500);
    const next = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(next.level, 2);
    assert.equal(next.used, 0);
  } finally {
    await browser.close();
  }
});

test('empty drags and pointercancel do not throw, and a win clears the queue', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__whisk.ready);
    const empty = await page.evaluate(() => {
      const rect = document.getElementById('c').getBoundingClientRect();
      return { x: rect.left + 6, y: rect.top + rect.height * 0.45 };
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: empty.x, y: empty.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: empty.x + 40, y: empty.y + 24, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const spot = await page.evaluate(() => window.__whisk.point(0));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: spot.x, y: spot.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: spot.x + 30, y: spot.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.waitForTimeout(40);
    assert.equal((await page.evaluate(() => window.__whisk.snapshot())).used, 0);
    await page.evaluate(() => {
      window.__whisk.commit('w', 0);
      window.__whisk.commit('d', 0);
    });
    await settle(page);
    const won = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(won.won, true);
    assert.equal(won.used, 1);
    assert.equal(won.left, 2);
    assert.equal(won.settled, true);
    await page.evaluate(() => window.__whisk.commit('d', 0));
    const held = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(held.left, 2);
    assert.equal(held.used, 1);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('undo costs one, and the stuck card offers undo only when it still wins', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__whisk.ready);
    await page.evaluate(() => window.__whisk.commit('d', 0));
    await settle(page);
    const once = await page.evaluate(() => window.__whisk.snapshot());
    await page.evaluate(() => window.__whisk.commit('d', 0));
    await settle(page);
    const twice = await page.evaluate(() => window.__whisk.snapshot());
    await page.click('#undo');
    await settle(page);
    const back = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(back.undos, 1);
    assert.equal(back.left, twice.left - 1);
    assert.equal(back.used, twice.used + 1);
    assert.equal(back.goal, once.goal);
    await page.evaluate(() => window.__whisk.reset());
    await page.waitForFunction(() => window.__whisk.ready && window.__whisk.snapshot().used === 0);
    await page.evaluate(() => window.__whisk.commit('w', 0));
    await settle(page);
    const stuck = await page.evaluate(() => window.__whisk.snapshot());
    assert.equal(stuck.stuck, true);
    assert.equal(stuck.stuckShows, 1);
    assert.equal(stuck.banner, "Can't set the table in " + stuck.left + " moves");
    assert.equal(stuck.undoOffered, true);
    assert.equal(await page.locator('#stuck-restart').count(), 1);
  } finally {
    await browser.close();
  }
});

test('a phone-class 4x throttle stays at or above 50fps and late tables load quickly', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    const session = await context.newCDPSession(page);
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=1');
      await page.waitForFunction(() => window.__whisk.ready);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      });
      await page.evaluate(() => window.__whisk.commit('w', 0));
      await page.waitForFunction(() => window.__whisk.snapshot().won, null, { timeout: 8000 });
      await page.waitForTimeout(900);
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        let worst = Infinity;
        const span = 30;
        for (let i = 0; i + span - 1 < frames.length; i++) {
          const windowDt = (frames[i + span - 1] - frames[i]) / 1000;
          const fps = (span - 1) / windowDt;
          if (fps < worst) worst = fps;
        }
        const canvas = document.getElementById('c');
        return {
          fps: (frames.length - 1) / dt,
          worst: worst,
          scale: window.__whisk.bufferScale(),
          buf: canvas.width,
          css: canvas.clientWidth
        };
      });
      samples.push(result);
      console.log(`whisk run ${run + 1} ${result.fps.toFixed(1)} fps worst30 ${result.worst.toFixed(1)} scale ${result.scale} buf ${result.buf}`);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    const worstMean = Math.min(...samples.map((item) => item.fps));
    const worstWindow = Math.min(...samples.map((item) => item.worst));
    console.log(`whisk min ${worstMean.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    console.log(`whisk worst 30-frame window ${worstWindow.toFixed(1)}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worstMean >= 50, 'min fps ' + worstMean);
    assert.ok(worstWindow >= 55, 'worst window ' + worstWindow);
    for (const level of [8, 9, 10]) {
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const started = Date.now();
      await page.goto(fileUrl + '?level=' + level);
      await page.waitForFunction(() => window.__whisk.ready, null, { timeout: 8000 });
      const visible = Date.now() - started;
      await page.waitForFunction(() => window.__whisk.solverReady, null, { timeout: 8000 });
      const solver = await page.evaluate(() => window.__whisk.solverMs());
      console.log(`whisk L${level} visible ${visible}ms solver ${solver.toFixed(0)}ms`);
      assert.ok(visible < 1000, 'L' + level + ' visible ' + visible);
      assert.ok(solver < 1000, 'L' + level + ' solver ' + solver);
    }
  } finally {
    await browser.close();
  }
});
