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
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function settle(page) {
  await page.waitForFunction(() => window.__fizz && !window.__fizz.animating(), null, { timeout: 8000 });
}
async function tap(session, x, y) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__fizz && window.__fizz.ready);
    assert.equal(urls.filter((url) => url.startsWith('http')).length, 0);
    assert.match(await page.locator('#undo').innerText(), /Undo −1/);
  } finally {
    await browser.close();
  }
});

test('a cold deep link shows that level title', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const [level, title] of [[1, 'First Pour'], [8, 'Rock Garden'], [10, 'Grand Toast']]) {
      await page.goto(fileUrl + '?level=' + level);
      await page.waitForFunction(() => window.__fizz && window.__fizz.ready);
      const snap = await page.evaluate(() => window.__fizz.snapshot());
      assert.equal(snap.level, level);
      assert.equal(snap.title, title);
      assert.equal(snap.name, title);
    }
  } finally {
    await browser.close();
  }
});

test('bottle targets stay at least 64px and clear of the HUD', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      await page.goto(fileUrl + '?level=10');
      await page.waitForFunction(() => window.__fizz.ready);
      const info = await page.evaluate(() => {
        const boxes = window.__fizz.boxes();
        const hud = document.getElementById('hud').getBoundingClientRect();
        const bar = document.getElementById('bar').getBoundingClientRect();
        const stage = document.getElementById('stage').getBoundingClientRect();
        return {
          bottles: boxes.bottles,
          hudBottom: hud.bottom - stage.top,
          barTop: bar.top - stage.top,
          w: stage.width,
          h: stage.height
        };
      });
      for (const box of info.bottles) {
        assert.ok(box.w >= 64 && box.h >= 64, width + ' bottle ' + box.w + 'x' + box.h);
        assert.ok(box.x >= 0 && box.y >= info.hudBottom - 1, width + ' under hud ' + box.y + ' vs ' + info.hudBottom);
        assert.ok(box.x + box.w <= info.w + 1 && box.y + box.h <= info.barTop + 1, width + ' clipped');
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('L1 reference taps win once at par', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__fizz.ready && window.__fizz.solverReady);
    for (let i = 0; i < 3; i++) {
      const spot = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
      await tap(session, spot.cx, spot.cy);
      await settle(page);
      await page.waitForFunction(() => window.__fizz.graceLeft() === 0);
    }
    await page.waitForFunction(() => window.__fizz.snapshot().won, null, { timeout: 4000 });
    const snap = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(snap.won, true);
    assert.equal(snap.used, 3);
    assert.equal(snap.stars, 3);
    await tap(session, (await page.evaluate(() => window.__fizz.boxes().bottles[0])).cx, (await page.evaluate(() => window.__fizz.boxes().bottles[0])).cy);
    await sleep(200);
    const again = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(again.used, 3);
    assert.equal(again.won, true);
  } finally {
    await browser.close();
  }
});

test('a rapid triple tap pours once, and taps after Next do not pour', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__fizz.ready);
    const spot = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
    for (let i = 0; i < 4; i++) {
      await tap(session, spot.cx, spot.cy);
      await sleep(70);
    }
    await settle(page);
    await sleep(300);
    const once = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(once.used, 1, 'stray pours ' + once.used);
    await page.evaluate(() => { window.__fizz.commit(0); });
    await settle(page);
    await page.waitForFunction(() => window.__fizz.graceLeft() === 0);
    await page.evaluate(() => { window.__fizz.commit(0); });
    await page.waitForFunction(() => window.__fizz.snapshot().won, null, { timeout: 4000 });
    await sleep(200);
    const next = await page.locator('#win-next').boundingBox();
    await tap(session, next.x + next.width / 2, next.y + next.height / 2);
    const bottle = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
    for (let i = 0; i < 5; i++) {
      await tap(session, bottle.cx, bottle.cy);
      await sleep(80);
    }
    await sleep(400);
    const guarded = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(guarded.level, 2);
    assert.equal(guarded.used, 0);
  } finally {
    await browser.close();
  }
});

test('the stuck card matches the solver and offers undo only when it still wins', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=7');
    await page.waitForFunction(() => window.__fizz.solverReady);
    await page.evaluate(() => window.__fizz.instant(0));
    await page.waitForFunction(() => window.__fizz.snapshot().stuck);
    const stuck = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(stuck.stuck, true);
    assert.equal(stuck.banner, "This tower can't be finished in " + stuck.left + (stuck.left === 1 ? ' pour' : ' pours'));
    assert.equal(stuck.failed, false);
    assert.equal(stuck.won, false);
    assert.equal(stuck.undoOffered, true);
    await page.click('#stuck-undo');
    await sleep(50);
    const undone = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(undone.stuck, false);
    assert.equal(undone.used, stuck.used + 1);
    assert.equal(undone.level, 7);
    assert.equal(undone.goal, false);
  } finally {
    await browser.close();
  }
});

test('an invalid level query opens tower 1', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl + '?level=abc');
    await page.waitForFunction(() => window.__fizz && window.__fizz.ready, null, { timeout: 4000 });
    const snap = await page.evaluate(() => window.__fizz.snapshot());
    assert.equal(snap.level, 1);
    assert.equal(snap.title, 'First Pour');
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.goto(fileUrl + '?level=99');
    await page.waitForFunction(() => window.__fizz.ready);
    assert.equal((await page.evaluate(() => window.__fizz.snapshot())).level, 1);
  } finally {
    await browser.close();
  }
});

test('bottles hang over their entry glass and do not overlap', async () => {
  const browser = await launch();
  try {
    for (const level of [2, 3, 8, 10]) {
      for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932]]) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__fizz.ready);
        const info = await page.evaluate(() => window.__fizz.boxes());
        const bottles = info.bottles;
        for (let i = 0; i < bottles.length; i++) {
          assert.ok(bottles[i].w >= 64 && bottles[i].h >= 44, width + ' L' + level + ' size');
          assert.ok(Math.abs((bottles[i].x + bottles[i].w / 2) - bottles[i].aim) < bottles[i].w, width + ' L' + level + ' aim');
          for (let j = i + 1; j < bottles.length; j++) {
            const overlap = bottles[i].x < bottles[j].x + bottles[j].w - 0.5
              && bottles[j].x < bottles[i].x + bottles[i].w - 0.5
              && bottles[i].y < bottles[j].y + bottles[j].h
              && bottles[j].y < bottles[i].y + bottles[i].h;
            assert.equal(overlap, false, width + ' L' + level + ' overlap ' + i + ' ' + j);
          }
        }
        const cols = {};
        bottles.forEach((box) => {
          (cols[box.col] = cols[box.col] || []).push(box);
        });
        Object.keys(cols).forEach((col) => {
          const group = cols[col];
          for (let k = 1; k < group.length; k++) {
            assert.ok(group[k].x > group[k - 1].x, 'order ' + level + ' col ' + col);
          }
          if (group.length === 2) {
            const c0 = group[0].x + group[0].w / 2;
            const c1 = group[1].x + group[1].w / 2;
            assert.ok(Math.abs((group[0].aim - c0) - group[0].w / 2) < 1.5, width + ' L' + level + ' half left');
            assert.ok(Math.abs((c1 - group[1].aim) - group[1].w / 2) < 1.5, width + ' L' + level + ' half right');
          }
        });
        if (width <= 360) {
          for (const box of bottles) assert.ok(box.art <= 0.75 && box.w >= 64, width + ' art ' + box.art);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test('a drip stain stays until the pour that made it is undone', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=3');
    await page.waitForFunction(() => window.__fizz.solverReady);
    await page.evaluate(() => { window.__fizz.instant(0); window.__fizz.instant(0); window.__fizz.instant(0); });
    const stained = await page.evaluate(() => window.__fizz.stains());
    assert.ok(stained >= 1, 'stain ' + stained);
    await page.evaluate(() => window.__fizz.undo());
    assert.equal(await page.evaluate(() => window.__fizz.stains()), stained);
    await page.evaluate(() => window.__fizz.undo());
    assert.equal(await page.evaluate(() => window.__fizz.stains()), stained - 1);
  } finally {
    await browser.close();
  }
});

test('swallowed taps wiggle and do not pour, including just after a cascade', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=1');
    await page.waitForFunction(() => window.__fizz.ready);
    const spot = await page.evaluate(() => window.__fizz.boxes().bottles[0]);
    await tap(session, spot.cx, spot.cy);
    await page.waitForFunction(() => window.__fizz.animating());
    await tap(session, spot.cx, spot.cy);
    await tap(session, spot.cx, spot.cy);
    const timed = await page.evaluate(({ x, y }) => {
      return new Promise((resolve) => {
        function watch() {
          if (window.__fizz.animating()) { requestAnimationFrame(watch); return; }
          const ended = window.__fizz.cascadeEnded();
          const during = window.__fizz.wiggles();
          const used = window.__fizz.snapshot().used;
          function poke(ms) {
            return new Promise((done) => {
              const wait = Math.max(0, ms - (performance.now() - ended));
              setTimeout(() => {
                document.getElementById('c').dispatchEvent(new PointerEvent('pointerdown', {
                  bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'touch'
                }));
                done(performance.now() - ended);
              }, wait);
            });
          }
          poke(100).then((at100) => {
            const after100 = { used: window.__fizz.snapshot().used, wiggles: window.__fizz.wiggles() };
            poke(200).then((at200) => {
              resolve({
                ended, during, used, at100, after100, at200,
                used200: window.__fizz.snapshot().used
              });
            });
          });
        }
        requestAnimationFrame(watch);
      });
    }, { x: spot.cx, y: spot.cy });
    assert.equal(timed.used, 1);
    assert.ok(timed.during >= 2, 'wiggles during ' + timed.during);
    assert.ok(timed.at100 >= 80 && timed.at100 < 150, '100ms tap landed at ' + timed.at100);
    assert.equal(timed.after100.used, 1);
    assert.ok(timed.after100.wiggles >= timed.during + 1, 'wiggle for the grace tap');
    assert.ok(timed.at200 >= 180 && timed.at200 < 260, '200ms tap landed at ' + timed.at200);
    assert.equal(timed.used200, 2);
  } finally {
    await browser.close();
  }
});

test('cascades finish within 1.2s and the first push stays full speed', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=10');
    await page.waitForFunction(() => window.__fizz.ready);
    const plans = await page.evaluate(() => [1, 2, 3, 4, 5, 6].map((n) => window.__fizz.cascadePlan(n)));
    for (const plan of plans) {
      assert.ok(plan.total <= 1200, 'schedule ' + plan.total);
      assert.ok(plan.full >= 270 && plan.full <= 290, 'first push ' + plan.full);
      if (plan.mid) assert.ok(plan.mid <= plan.full + 0.01, 'middle ' + plan.mid);
    }
    assert.ok(plans[3].mid < plans[3].full, '4-event middles shorten');
    assert.ok(plans[3].total <= 1200);
    await page.waitForFunction(() => window.__fizz.solverReady, null, { timeout: 8000 });
    const events = await page.evaluate(() => window.__fizz.armLongest());
    assert.ok(events >= 4, 'longest ' + events);
    await settle(page);
    const measured = await page.evaluate(() => window.__fizz.lastCascadeMs());
    assert.ok(measured <= 1200, 'measured ' + measured + ' for ' + events);
    assert.ok(measured >= 600, 'measured too short ' + measured);
  } finally {
    await browser.close();
  }
});

test('landscape keeps the portrait frame and usable targets', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.goto(fileUrl + '?level=8');
    await page.waitForFunction(() => window.__fizz.ready);
    const info = await page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      return { w: stage.width, h: stage.height, bottles: window.__fizz.boxes().bottles };
    });
    assert.ok(info.w < info.h, 'portrait frame ' + info.w + 'x' + info.h);
    assert.ok(Math.abs(info.w / info.h - 390 / 844) < 0.08, 'aspect ' + info.w / info.h);
    assert.ok(info.w < 520, 'not full bleed ' + info.w);
    for (const box of info.bottles) {
      assert.ok(box.w >= 44 && box.h >= 44, 'target ' + box.w);
    }
  } finally {
    await browser.close();
  }
});
