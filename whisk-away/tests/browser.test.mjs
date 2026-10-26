import assert from 'node:assert/strict';
import test from 'node:test';
import { armed, assertTarget, fileUrl, flick, launch, PHONE, pull, settle, tap } from './browser-support.mjs';

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

test('a fast flick past a cell is a pure whip, and a slow drag commits the snapped cells', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await armed(page);
    await flick(page, session, 0, 1.2, 2.2, 50);
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

test('three, four and five taps on Next do not whip the next table', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const runs = [[3, 70], [4, 150], [5, 120]];
    for (const [count, gap] of runs) {
      await page.goto(fileUrl + '?level=1');
      await page.waitForFunction(() => window.__whisk.ready);
      await page.evaluate(() => window.__whisk.commit('w', 0));
      await page.waitForFunction(() => window.__whisk.snapshot().won);
      await page.waitForTimeout(700);
      const box = await page.locator('#win-next').boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      for (let i = 0; i < count; i++) await tap(session, x, y, i + 1 < count ? gap : 0);
      await page.waitForTimeout(500);
      const next = await page.evaluate(() => window.__whisk.snapshot());
      assert.equal(next.level, 2, count + ' taps level');
      assert.equal(next.used, 0, count + ' taps used ' + next.used);
      assert.equal(next.cloths, 1, count + ' taps cloth');
    }
  } finally {
    await browser.close();
  }
});

test('tapping stuck Undo does not whip afterwards', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of PHONE) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      for (const gap of [70, 200]) {
        await page.goto(fileUrl + '?level=2');
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady);
        await page.evaluate(() => window.__whisk.commit('w', 0));
        await settle(page);
        await page.waitForFunction(() => window.__whisk.snapshot().stuck);
        const box = await page.locator('#stuck-undo').boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        for (let i = 0; i < 3; i++) await tap(session, x, y, i < 2 ? gap : 0);
        await settle(page);
        await page.waitForTimeout(400);
        const snap = await page.evaluate(() => window.__whisk.snapshot());
        assert.equal(snap.undos, 1, width + ' gap ' + gap + ' undos');
        assert.equal(snap.cloths, 1, width + ' gap ' + gap + ' cloth');
        assert.equal(snap.used, 2, width + ' gap ' + gap + ' used ' + snap.used);
        assert.equal(snap.stuck, false, width + ' gap ' + gap);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('a cloth hanging off the table stays drawn and keeps a 44px target', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(fileUrl + '?level=1');
    await armed(page);
    await page.evaluate(() => window.__whisk.commit('d', 0));
    await settle(page);
    await page.evaluate(() => window.__whisk.commit('d', 0));
    await settle(page);
    const sample = await page.evaluate(() => {
      const info = window.__whisk.clothRect(0);
      const rect = info.rect;
      const off = [];
      for (let y = rect[1]; y < rect[1] + rect[3]; y++) {
        for (let x = rect[0]; x < rect[0] + rect[2]; x++) {
          if (x < 0 || y < 0 || x >= 5 || y >= 6) off.push(window.__whisk.gridPoint(x, y));
        }
      }
      const spot = off[0];
      const canvas = document.getElementById('c');
      const bounds = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      const scale = window.__whisk.bufferScale();
      const px = Math.round((spot.x - bounds.left) * scale);
      const py = Math.round((spot.y - bounds.top) * scale);
      const pixels = [];
      for (let dy = -6; dy <= 6; dy += 3) {
        for (let dx = -6; dx <= 6; dx += 3) {
          pixels.push(Array.from(ctx.getImageData(px + dx, py + dy, 1, 1).data.slice(0, 3)));
        }
      }
      const wood = pixels.filter((rgb) => Math.abs(rgb[0] - 200) < 18 && Math.abs(rgb[1] - 149) < 18 && Math.abs(rgb[2] - 92) < 18);
      return { rect, hits: off.map((item) => item.hit), wood: wood.length, pixels: pixels.length };
    });
    assert.ok(sample.rect[0] + sample.rect[2] > 5, 'overhang rect ' + sample.rect);
    assert.ok(sample.hits.length > 0, 'no off-table cell');
    assert.ok(sample.hits.every((hit) => hit === 0), 'overhang hits ' + sample.hits);
    assert.ok(sample.wood < sample.pixels, 'overhang still looks like bare wood');
    await assertTarget(page, 0, 'L1 overhang');
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
