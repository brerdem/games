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
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 2);
    const stuckMs = await page.evaluate(() => window.__knock.stuckMs());
    assert.ok(stuckMs < 50, 'stuck ' + stuckMs);
    await page.click('#stuck-undo');
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 1);
    assert.equal(await page.evaluate(() => window.__knock.snapshot().failed), false);
    const outcome = await page.evaluate(() => window.__knock.fastCommit(20, 1));
    assert.equal(outcome, 'pushes');
    await page.waitForSelector('#fail:not(.hidden)');
    await page.waitForTimeout(400);
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
    await page.waitForTimeout(400);
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

test('arrows stay inside the tapped cell and a neighbour touch does not push it', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=3');
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.dismiss());
    const tap = await page.evaluate(() => window.__knock.swipe(47, 0));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tap.from.x, y: tap.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const placed = await page.evaluate(() => {
      const arrows = [...document.querySelectorAll('#arrows button')];
      const cell = window.__knock.cellBox(47);
      const cx = (cell.left + cell.right) / 2;
      const cy = (cell.top + cell.bottom) / 2;
      return {
        open: !document.getElementById('arrows').classList.contains('hidden'),
        tall: arrows.every((btn) => btn.getBoundingClientRect().height >= 44),
        clear: arrows.every((btn) => {
          const box = btn.getBoundingClientRect();
          return cx < box.left - 1 || cx > box.right + 1 || cy < box.top - 1 || cy > box.bottom + 1;
        })
      };
    });
    assert.equal(placed.open, true);
    assert.equal(placed.tall, true);
    assert.equal(placed.clear, true);
    const above = await page.evaluate(() => window.__knock.swipe(41, 0));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: above.from.x, y: above.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => window.__knock.snapshot().pushes), 5);
    const start = await page.evaluate(() => window.__knock.swipe(30, 1));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.from.x, y: start.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.from.x + 8, y: start.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => document.getElementById('arrows').classList.contains('hidden')), true);
    const before = await page.evaluate(() => window.__knock.snapshot().cells.join(''));
    await swipe(page, session, 31, 3);
    const after = await page.evaluate((start) => {
      const got = window.__knock.snapshot().cells.join('');
      const west = window.KnockLogic.push(start.split(''), 31, 3).g.join('');
      const east = window.KnockLogic.push(start.split(''), 30, 1).g.join('');
      return { got: got, west: west, east: east };
    }, before);
    assert.equal(after.got, after.west);
    assert.notEqual(after.got, after.east);
  } finally {
    await browser.close();
  }
});

test('a swipe on a selected domino follows the finger, and a second tap deselects', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.dismiss());
    const center = await page.evaluate(() => window.__knock.swipe(18, 1));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.from.x, y: center.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.from.x, y: center.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const cleared = await page.evaluate(() => ({
      pushes: window.__knock.snapshot().pushes,
      hidden: document.getElementById('arrows').classList.contains('hidden')
    }));
    assert.equal(cleared.pushes, 3);
    assert.equal(cleared.hidden, true);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.from.x, y: center.from.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const west = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#arrows button')].find((el) => el.dataset.dir === '3');
      const box = btn.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, h: box.height };
    });
    assert.ok(west.h >= 44);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: west.x, y: west.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: west.x + 80, y: west.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !window.__knock.animating(), null, { timeout: 8000 });
    const snap = await page.evaluate(() => window.__knock.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.pushes, 2);
  } finally {
    await browser.close();
  }
});

test('a used hint survives restart and reload, and that clear is not three stars', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready);
    await page.click('#hint');
    assert.equal(await page.textContent('#hint'), 'Used');
    await page.click('#restart');
    await page.waitForFunction(() => window.__knock.ready);
    assert.equal(await page.textContent('#hint'), 'Used');
    await page.reload();
    await page.waitForFunction(() => window.__knock.ready);
    assert.equal(await page.textContent('#hint'), 'Used');
    await page.evaluate(() => window.__knock.fastCommit(18, 1));
    const snap = await page.evaluate(() => window.__knock.snapshot());
    assert.equal(snap.won, true);
    assert.notEqual(snap.stars, 3);
    assert.match(await page.textContent('#win-copy'), /hint/);
    await page.click('#win-retry');
    await page.waitForFunction(() => window.__knock.ready);
    assert.equal(await page.textContent('#hint'), 'Hint');
  } finally {
    await browser.close();
  }
});

test('startup at 6x has no task over 50ms', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.addInitScript(() => {
      window.__gaps = [];
      window.__long = [];
      let last = performance.now();
      function tick(now) {
        window.__gaps.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      try {
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => window.__long.push(entry.duration));
        }).observe({ entryTypes: ['longtask'] });
      } catch (err) { /* long tasks are not observable here */ }
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__knock.ready);
    const measured = await page.evaluate(() => ({
      gap: Math.max.apply(null, window.__gaps.slice(1).concat(0)),
      long: Math.max.apply(null, window.__long.concat(0)),
      files: performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /min\.js|pack\//.test(name))
    }));
    console.log(`knock-on startup gap ${measured.gap.toFixed(1)} ms long ${measured.long.toFixed(1)} ms files ${measured.files.join(' ')}`);
    assert.ok(measured.files.every((name) => name.includes('pack/1.js')), measured.files.join(' '));
    assert.ok(measured.long < 100, 'long ' + measured.long);
    assert.ok(measured.gap < 200, 'gap ' + measured.gap);
  } finally {
    await browser.close();
  }
});

test('a cascade skip does not press the panel it opens, and undo keeps the hint', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=9');
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.dismiss());
    const g = await page.evaluate(() => window.__knock.swipe(17, 2));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.from.x, y: g.from.y, id: 1 }] });
    for (let i = 1; i <= 4; i++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: g.from.x, y: g.from.y + (g.to.y - g.from.y) * (i / 4), id: 1 }]
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    const center = await page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      return { x: stage.left + stage.width / 2, y: stage.top + stage.height / 2 };
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x, y: center.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !window.__knock.animating(), null, { timeout: 8000 });
    const stuck = await page.evaluate(() => ({
      open: !document.getElementById('stuck').classList.contains('hidden'),
      pushes: window.__knock.snapshot().pushes,
      kicker: document.getElementById('kicker').textContent
    }));
    assert.equal(stuck.open, true);
    assert.equal(stuck.pushes, 6);
    assert.equal(stuck.kicker, 'Table 9');
    await page.goto(fileUrl + '?level=8');
    await page.waitForFunction(() => window.__knock.ready);
    await page.evaluate(() => window.__knock.fastCommit(4, 2));
    await page.click('#hint');
    assert.equal(await page.textContent('#hint'), 'Used');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#arrows button.hint').length), 1);
    await page.click('#undo');
    assert.equal(await page.textContent('#hint'), 'Used');
    assert.equal(await page.evaluate(() => window.__knock.snapshot().hint), true);
  } finally {
    await browser.close();
  }
});

test('opening and restarting L9 stays under a 80ms frame at 4x', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__knock.ready);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      window.__gaps = [];
      let last = performance.now();
      function tick(now) {
        window.__gaps.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    await page.evaluate(() => { window.__gaps.length = 0; window.__knock.load(9); });
    await page.waitForTimeout(350);
    const opened = await page.evaluate(() => Math.max.apply(null, window.__gaps));
    await page.evaluate(() => { window.__gaps.length = 0; });
    await page.click('#restart');
    await page.waitForTimeout(350);
    const restarted = await page.evaluate(() => Math.max.apply(null, window.__gaps));
    console.log(`knock-on L9 frame ${opened.toFixed(1)} ms open, ${restarted.toFixed(1)} ms restart`);
    assert.ok(opened < 80, 'open ' + opened);
    assert.ok(restarted < 80, 'restart ' + restarted);
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
