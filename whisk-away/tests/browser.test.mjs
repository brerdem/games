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

async function gesture(page, index, kind) {
  await page.evaluate(({ cloth, kind: mode }) => {
    const spot = window.__whisk.point(cloth);
    const canvas = document.getElementById('c');
    function fire(type, x, y) {
      canvas.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0,
        buttons: type === 'pointerup' ? 0 : 1, pointerType: 'touch', isPrimary: true
      }));
    }
    function wait(ms) {
      const start = performance.now();
      while (performance.now() - start < ms) { /* pace the gesture */ }
    }
    const dist = mode === 'whip' ? 24 : spot.cell * 0.78;
    const steps = mode === 'whip' ? 4 : 8;
    const gap = mode === 'whip' ? 4 : 42;
    fire('pointerdown', spot.x, spot.y);
    for (let i = 1; i <= steps; i++) {
      wait(gap);
      fire('pointermove', spot.x + spot.dir[0] * dist * (i / steps), spot.y + spot.dir[1] * dist * (i / steps));
    }
    fire('pointerup', spot.x + spot.dir[0] * dist, spot.y + spot.dir[1] * dist);
  }, { cloth: index, kind });
  await settle(page);
}

async function flick(page, _session, index) { await gesture(page, index, 'whip'); }
async function pull(page, _session, index) { await gesture(page, index, 'pull'); }

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
    const lines = JSON.parse(fs.readFileSync(new URL('./pack_v1.json', import.meta.url), 'utf8')).map((row) => row.reference_line);
    for (const [width, height, onlyFirst] of [[390, 844, false], [320, 568, true], [360, 800, true], [430, 932, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      const session = await context.newCDPSession(page);
      const count = onlyFirst ? 1 : lines.length;
      for (let n = 1; n <= count; n++) {
        await page.goto(fileUrl + '?level=' + n);
        await page.waitForFunction(() => window.__whisk.ready);
        const cell = await page.evaluate(() => window.__whisk.cellSize());
        if (width === 390) assert.ok(cell >= 56, 'cell ' + cell);
        if (width === 320) assert.ok(cell >= 48, 'cell ' + cell);
        for (const step of lines[n - 1]) {
          const whip = step.startsWith('whip');
          const index = +step.slice(step.indexOf('c') + 1);
          if (whip) await flick(page, session, index);
          else await pull(page, session, index);
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

test('a flick is a whip and a slow drag is a pull', async () => {
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
      await page.waitForFunction(() => window.__whisk.ready && window.__whisk.snapshot().used === 0);
      await flick(page, session, 0);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      if (!(snap.used === 1 && snap.cloths === 0)) flickMiss += 1;
    }
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__whisk.reset());
      await page.waitForFunction(() => window.__whisk.ready && window.__whisk.snapshot().used === 0);
      await pull(page, session, 0);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      if (!(snap.used === 1 && snap.cloths === 1 && !snap.goal)) pullMiss += 1;
    }
    console.log(`whisk misfires flick ${flickMiss}/100 pull ${pullMiss}/100`);
    assert.ok(flickMiss < 3, 'flick ' + flickMiss);
    assert.ok(pullMiss < 3, 'pull ' + pullMiss);
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
        const canvas = document.getElementById('c');
        return { fps: (frames.length - 1) / dt, scale: window.__whisk.bufferScale(), buf: canvas.width, css: canvas.clientWidth };
      });
      samples.push(result);
      console.log(`whisk run ${run + 1} ${result.fps.toFixed(1)} fps scale ${result.scale} buf ${result.buf}`);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    const worst = Math.min(...samples.map((item) => item.fps));
    console.log(`whisk min ${worst.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worst >= 50, 'min fps ' + worst);
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
