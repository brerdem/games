import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('ring-out/index.html')).href;
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
  await page.waitForFunction(() => window.__game && window.__game.get);
  return { page, errors };
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__game);
    await page.click('#startBtn');
    const http = urls.filter((url) => /^https?:/i.test(url));
    assert.deepEqual(http, []);
    const started = await page.evaluate(() => window.__game.get().started);
    assert.equal(started, true);
  } finally {
    await browser.close();
  }
});

test('help sheet opens at scrollTop 0', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[360, 800], [844, 390]]) {
      const { page, errors } = await open(browser, width, height);
      await page.click('#helpBtn');
      const top = await page.$eval('.sheet', (el) => el.scrollTop);
      assert.equal(top, 0, `${width}x${height}`);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('double tap on overlay buttons does not act on the next screen', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.click('#helpBtn');
    await page.dblclick('#helpClose');
    const helpClosed = await page.evaluate(() => document.getElementById('help').classList.contains('hidden'));
    assert.equal(helpClosed, true);
    await page.dblclick('#startBtn');
    const afterStart = await page.evaluate(() => window.__game.get());
    assert.equal(afterStart.started, true);
    assert.equal(afterStart.level, 1);
    assert.equal(afterStart.movesUsed, 0);
    assert.equal(afterStart.hearts, 3);

    await page.click('#pauseBtn');
    await page.dblclick('#resumeBtn');
    const afterResume = await page.evaluate(() => window.__game.get());
    assert.equal(afterResume.movesUsed, 0);
    assert.equal(afterResume.phase === 'pause', false);

    await page.evaluate(() => {
      const game = window.__game;
      const level = RingLogic.LEVELS[game.get().level - 1];
      let guard = 0;
      while (guard++ < 8 && game.get().phase !== 'over') {
        const snap = game.get();
        const view = { rot: snap.rot, pins: snap.pins, moves: snap.moves };
        const blocked = snap.pins.find((pin) => !RingLogic.launchResult(level, view, pin).ok);
        if (!blocked) game.rot(0, 1);
        else game.launch(blocked.id);
      }
    });
    await page.waitForSelector('#over:not(.hidden)');
    await page.dblclick('#retryLevelBtn');
    const afterRetry = await page.evaluate(() => window.__game.get());
    assert.equal(afterRetry.hearts, 3);
    assert.equal(afterRetry.movesUsed, 0);
    assert.equal(documentHidden(await page.evaluate(() => document.getElementById('over').className)), true);

    await page.evaluate(() => window.__game.playSolution());
    await page.waitForSelector('#win:not(.hidden)');
    await page.dblclick('#nextBtn');
    const afterNext = await page.evaluate(() => window.__game.get());
    assert.equal(afterNext.level, 2);
    assert.equal(afterNext.movesUsed, 0);
    assert.equal(afterNext.hearts, 3);
  } finally {
    await browser.close();
  }
});

function documentHidden(className) {
  return className.split(/\s+/).includes('hidden');
}

test('Enter advances after a win and progress survives reload', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__game);
    await page.click('#startBtn');
    await page.evaluate(() => window.__game.playSolution());
    await page.waitForSelector('#win:not(.hidden)');
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert.equal(focused, 'nextBtn');
    await page.keyboard.press('Enter');
    const next = await page.evaluate(() => window.__game.get());
    assert.equal(next.level, 2);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ring-out-progress-v1')));
    assert.ok(saved.stars['1'] >= 1);
    assert.ok(saved.unlocked >= 2);
    await page.reload();
    await page.waitForFunction(() => window.__game);
    const again = await page.evaluate(() => JSON.parse(localStorage.getItem('ring-out-progress-v1')));
    assert.equal(again.stars['1'], saved.stars['1']);
    assert.ok(again.unlocked >= 2);
    const continueVisible = await page.evaluate(() => !document.getElementById('continueBtn').classList.contains('hidden'));
    assert.equal(continueVisible, true);
  } finally {
    await browser.close();
  }
});

test('keys, undo, and mute', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 390, 844);
    await page.click('#startBtn');
    const before = await page.evaluate(() => window.__game.get());
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    const turned = await page.evaluate(() => window.__game.get());
    assert.equal(turned.moves, before.moves - 2);
    await page.keyboard.press('z');
    await page.keyboard.press('z');
    await page.waitForTimeout(50);
    const undone = await page.evaluate(() => window.__game.get());
    assert.equal(undone.moves, before.moves);
    assert.deepEqual(undone.rot, before.rot);
    const restored = await page.evaluate(() => {
      const game = window.__game;
      const prior = game.get();
      game.launch(prior.pins[0].id);
      game.undo();
      const back = game.get();
      return prior.pins.length === back.pins.length && prior.hearts === back.hearts && prior.moves === back.moves;
    });
    assert.equal(restored, true);
    await page.keyboard.press('m');
    const muted = await page.evaluate(() => window.__game.get().muted);
    assert.equal(muted, true);
    await page.keyboard.press('Escape');
    const paused = await page.evaluate(() => !document.getElementById('pause').classList.contains('hidden'));
    assert.equal(paused, true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');
    const restarted = await page.evaluate(() => window.__game.get());
    assert.equal(restarted.moves, before.moves);
    assert.equal(restarted.hearts, 3);
    await page.keyboard.press('h');
    const hint = await page.evaluate(() => window.__game.get().phase);
    assert.equal(hint, 'idle');
  } finally {
    await browser.close();
  }
});

test('outside release spends nothing and a 10px wobble launches', async () => {
  const browser = await launch();
  try {
    const { page } = await open(browser, 1280, 800);
    await page.click('#startBtn');
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => window.__game.get());
    const ring = await page.evaluate(() => window.__game.ringClient(0, 0.5));
    await page.mouse.move(ring.x, ring.y);
    await page.mouse.down();
    await page.mouse.move(ring.x + Math.max(36, ring.radius * 0.55), ring.y, { steps: 4 });
    const pending = await page.evaluate(() => window.__game.get().pending);
    assert.ok(pending >= 1, 'live drag cost');
    await page.mouse.move(5, 5);
    await page.mouse.up();
    const cancelled = await page.evaluate(() => window.__game.get());
    assert.equal(cancelled.moves, before.moves);
    assert.equal(cancelled.movesUsed, 0);
    assert.deepEqual(cancelled.rot, before.rot);

    await page.waitForTimeout(400);
    const pin = await page.evaluate(() => {
      const pins = window.__game.get().pins;
      for (const item of pins) {
        const point = window.__game.pinClient(item.id);
        const el = document.elementFromPoint(point.x, point.y);
        if (el && el.id === 'c') return point;
      }
      return window.__game.pinClient(pins[0].id);
    });
    const pinsBefore = await page.evaluate(() => window.__game.get().pins.length);
    await page.mouse.move(pin.x, pin.y);
    await page.mouse.down();
    await page.mouse.move(pin.x + 10, pin.y);
    await page.mouse.up();
    const after = await page.evaluate(() => window.__game.get());
    assert.ok(after.pins.length < pinsBefore || after.hearts < 3);
  } finally {
    await browser.close();
  }
});

test('core gesture and hit band on eight viewports', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of VIEWPORTS) {
      const { page, errors } = await open(browser, width, height);
      const stage = await page.$eval('#stage', (el) => {
        const box = el.getBoundingClientRect();
        return { w: box.width, h: box.height };
      });
      const phone = width <= 520 || height <= 520;
      if (phone) assert.ok(Math.abs(stage.w - width) <= 2, `phone stage ${stage.w} at ${width}x${height}`);
      else assert.ok(Math.abs(stage.w / stage.h - 390 / 844) < 0.03, `desktop aspect ${stage.w}x${stage.h}`);
      await page.click('#startBtn');
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => window.__game.get());
      const ring = await page.evaluate(() => window.__game.ringClient(0, 0.5));
      const dx = ring.radius * (Math.PI / 6) * 1.15;
      await page.mouse.move(ring.x, ring.y);
      await page.mouse.down();
      await page.mouse.move(ring.x + dx, ring.y, { steps: 6 });
      await page.mouse.up();
      const after = await page.evaluate(() => window.__game.get());
      assert.equal(after.moves, before.moves - 1, `gesture ${width}x${height}`);
      await page.evaluate(() => window.__game.loadLevel(3));
      const band = await page.evaluate(() => window.__game.metrics().hitBand);
      if (height <= 520 || width >= 360) {
        assert.ok(band >= 44, `L3 band ${band.toFixed(1)} at ${width}x${height}`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('four-ring stress board stays at or above 50fps under 4x CPU throttle', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__game);
    await page.evaluate(() => window.__game.stress());
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const fps = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick(now) {
        frames += 1;
        if (now - start < 1000) requestAnimationFrame(tick);
        else resolve(frames / ((now - start) / 1000));
      }
      requestAnimationFrame(tick);
    }));
    console.log(`fps@4x ${fps.toFixed(1)} method=rAF over 1s with Emulation.setCPUThrottlingRate 4, 4 rings / 8 pins`);
    assert.ok(fps >= 50, `fps ${fps}`);
  } finally {
    await browser.close();
  }
});
