import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('foldprint/index.html')).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));
const SIZES = [[360, 800], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932], [768, 1024], [1440, 900]];

async function launch() {
  return chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
}

async function drag(page, session, id) {
  const g = await page.evaluate((code) => window.__fold.creaseGesture(code), id);
  const steps = 5;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: g.from.x + (g.to.x - g.from.x) * (i / steps), y: g.from.y + (g.to.y - g.from.y) * (i / steps), id: 1 }]
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !window.__fold.animating(), null, { timeout: 5000 });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__fold && window.__fold.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
  } finally {
    await browser.close();
  }
});

test('a dragged fold matches the stencil and idle frames stay still', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__fold.ready && window.__fold.cellSize() >= 52);
    await page.evaluate(() => window.__fold.dismiss());
    const same = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const canvas = document.getElementById('c');
        const a = canvas.toDataURL();
        requestAnimationFrame(() => resolve(a === canvas.toDataURL()));
      });
    }));
    assert.equal(same, true);
    const session = await context.newCDPSession(page);
    const before = await page.evaluate(() => window.__fold.snapshot().presses);
    const g = await page.evaluate(() => window.__fold.creaseGesture('V3'));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.from.x + 12, y: g.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const mid = await page.evaluate(() => window.__fold.snapshot().presses);
    assert.equal(mid, before);
    await drag(page, session, 'V3');
    const snap = await page.evaluate(() => window.__fold.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.presses, 2);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
});

test('stuck and out of presses both open, and a closed menu ignores the next press', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(fileUrl + '?level=3');
    await page.waitForFunction(() => window.__fold.ready);
    const session = await context.newCDPSession(page);
    await drag(page, session, 'V3');
    await page.waitForSelector('#stuck:not(.hidden)');
    await page.click('#stuck-undo');
    const restored = await page.evaluate(() => window.__fold.snapshot());
    assert.equal(restored.failed, false);
    assert.equal(restored.presses, 2);
    await page.evaluate(() => window.__fold.load(4));
    const burned = await page.evaluate(() => {
      const events = ['H1', 'H4', 'H4', 'H4', 'H4'].map((id) => window.__fold.fastCommit(id));
      return { events: events, text: document.querySelector('#fail h2').textContent, open: !document.getElementById('fail').classList.contains('hidden') };
    });
    assert.equal(burned.open, true);
    assert.equal(burned.text, 'Out of presses');
    assert.equal(burned.events[burned.events.length - 1], 'presses');
    await page.evaluate(() => {
      window.__fold.load(2);
      document.getElementById('menu').click();
      document.getElementById('resume').click();
      document.getElementById('resume').click();
      document.getElementById('resume').click();
    });
    const presses = await page.evaluate(() => window.__fold.snapshot().presses);
    const folded = await page.evaluate(() => {
      const g = window.__fold.creaseGesture('H4');
      const canvas = document.getElementById('c');
      const opts = { bubbles: true, pointerId: 3, clientX: g.to.x, clientY: g.to.y };
      canvas.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ clientX: g.from.x, clientY: g.from.y }, opts)));
      canvas.dispatchEvent(new PointerEvent('pointermove', opts));
      canvas.dispatchEvent(new PointerEvent('pointerup', opts));
      return window.__fold.snapshot().presses;
    });
    assert.equal(folded, presses);
  } finally {
    await browser.close();
  }
});

test('eight viewports keep the sheet on screen and accept a drag', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of SIZES) {
      const context = await browser.newContext({ viewport: { width: width, height: height }, isMobile: width < 700, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(fileUrl);
      await page.waitForFunction(() => window.__fold.ready && window.__fold.cellSize() > 0);
      const info = await page.evaluate(() => {
        const stage = document.getElementById('stage').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('#bar button, #hint, #mute')];
        const off = buttons.some((btn) => {
          const box = btn.getBoundingClientRect();
          return box.left < -1 || box.top < -1 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1 || box.height < 48;
        });
        return { cell: window.__fold.cellSize(), tabs: window.__fold.tabsInside(), off: off, stage: [stage.width, stage.height] };
      });
      assert.equal(info.tabs, true, width + ' tabs');
      assert.equal(info.off, false, width + ' buttons');
      if (width >= 360 && width <= 430) assert.ok(info.cell >= 52, width + ' cell ' + info.cell);
      if (width >= 1000) {
        assert.ok(Math.abs(info.stage[0] / info.stage[1] - 390 / 844) < 0.03, 'frame ' + info.stage);
        assert.ok(info.stage[0] < width - 200);
      }
      const session = await context.newCDPSession(page);
      await drag(page, session, 'V3');
      assert.equal(await page.evaluate(() => window.__fold.snapshot().won), true, width + ' solve');
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('landscape shows only the rotate card', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await page.goto(fileUrl + '?level=12');
    await page.waitForFunction(() => window.__fold.ready);
    const visible = await page.evaluate(() => !document.getElementById('rotate').classList.contains('hidden'));
    assert.equal(visible, true);
    const before = await page.evaluate(() => window.__fold.snapshot().presses);
    await page.touchscreen.tap(200, 200);
    assert.equal(await page.evaluate(() => window.__fold.snapshot().presses), before);
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
    const plan = ['V2', 'V5', 'V4', 'V2', 'V1'];
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=7');
      await page.waitForFunction(() => window.__fold && window.__fold.ready);
      await page.evaluate(() => window.__fold.dismiss());
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      });
      for (const id of plan) await drag(page, session, id);
      await page.waitForFunction(() => window.__fold.snapshot().won, null, { timeout: 8000 });
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        const canvas = document.getElementById('c');
        return {
          fps: (frames.length - 1) / dt,
          scale: window.__fold.bufferScale(),
          buf: canvas.width,
          css: canvas.clientWidth
        };
      });
      samples.push(result);
      console.log(`foldprint run ${run + 1} ${result.fps.toFixed(1)} fps scale ${result.scale} buf ${result.buf}`);
    }
    const worst = Math.min(...samples.map((item) => item.fps));
    console.log(`foldprint min ${worst.toFixed(1)} of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(samples[0].scale <= 1.5);
    assert.ok(Math.abs(samples[0].buf - Math.round(samples[0].css * Math.min(1.5, 2))) <= 2);
    assert.ok(worst >= 50, `min fps ${worst}`);
  } finally {
    await browser.close();
  }
});
