import assert from 'node:assert/strict';
import test from 'node:test';
import { fileUrl, launch, settle, sleep, strokeAt, tap } from './browser-support.mjs';

const SIZES = [[320, 568], [360, 800], [390, 844], [430, 932]];

async function clothSpotOutside(page, index, avoid) {
  const spot = await page.evaluate((arg) => {
    const box = window.__whisk.targetBox(arg.index);
    const canvas = document.getElementById('c').getBoundingClientRect();
    const aim = window.__whisk.point(arg.index);
    const pts = [];
    if (box) {
      for (let y = box.y + 6; y <= box.y + box.h - 6; y += 8) {
        for (let x = box.x + 6; x <= box.x + box.w - 6; x += 8) pts.push([x, y]);
      }
    }
    for (const pair of pts) {
      const cx = canvas.left + pair[0];
      const cy = canvas.top + pair[1];
      const blocked = arg.avoid && cx >= arg.avoid.l && cx <= arg.avoid.r && cy >= arg.avoid.t && cy <= arg.avoid.b;
      if (blocked) continue;
      if (window.__whisk.hit(cx, cy) === arg.index) return { x: cx, y: cy, dir: aim.dir, cell: aim.cell };
    }
    return null;
  }, { index, avoid });
  assert.ok(spot, 'no cloth spot outside the button');
  return spot;
}

test('repeat taps above Next and stuck Restart do not whip the new table', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of SIZES) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      for (const offset of [0, 20, 45, 90]) {
        await page.goto(fileUrl + '?level=1');
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady);
        await page.evaluate(() => window.__whisk.commit('w', 0));
        await page.waitForFunction(() => window.__whisk.snapshot().won);
        await sleep(700);
        const next = await page.locator('#win-next').boundingBox();
        await tap(session, next.x + next.width / 2, next.y + next.height / 2, 40);
        const above = next.y - offset;
        await tap(session, next.x + next.width / 2, above, 60);
        await tap(session, next.x + next.width / 2, above, 0);
        await sleep(400);
        const afterNext = await page.evaluate(() => window.__whisk.snapshot());
        assert.equal(afterNext.level, 2, width + ' next offset ' + offset);
        assert.equal(afterNext.used, 0, width + ' next offset ' + offset + ' used');
        assert.equal(afterNext.cloths, 1, width + ' next offset ' + offset + ' cloth');

        await page.goto(fileUrl + '?level=2');
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady);
        await page.evaluate(() => window.__whisk.commit('w', 0));
        await settle(page);
        await page.waitForFunction(() => window.__whisk.snapshot().stuck);
        const restart = await page.locator('#stuck-restart').boundingBox();
        await tap(session, restart.x + restart.width / 2, restart.y + restart.height / 2, 40);
        const aboveRestart = restart.y - offset;
        await tap(session, restart.x + restart.width / 2, aboveRestart, 60);
        await tap(session, restart.x + restart.width / 2, aboveRestart, 0);
        await sleep(400);
        const afterRestart = await page.evaluate(() => window.__whisk.snapshot());
        assert.equal(afterRestart.level, 2, width + ' restart offset ' + offset);
        assert.equal(afterRestart.used, 0, width + ' restart offset ' + offset + ' used');
        assert.equal(afterRestart.cloths, 1, width + ' restart offset ' + offset + ' cloth');
        assert.equal(afterRestart.stuck, false, width + ' restart offset ' + offset);
      }
      console.log('whisk off-spot taps ' + width + ' clean');
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('a real drag and flick still apply during the tap quiet', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    for (const delay of [100, 150, 250]) {
      for (const kind of ['pull', 'flick']) {
        await page.goto(fileUrl + '?level=1');
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady);
        await page.evaluate(() => window.__whisk.commit('w', 0));
        await page.waitForFunction(() => window.__whisk.snapshot().won);
        await sleep(700);
        const next = await page.locator('#win-next').boundingBox();
        const avoid = { l: next.x - 16, t: next.y - 16, r: next.x + next.width + 16, b: next.y + next.height + 16 };
        await page.evaluate(() => {
          window.__buttonUp = 0;
          window.addEventListener('pointerup', () => { window.__buttonUp = performance.now(); }, { once: true, capture: true });
        });
        await tap(session, next.x + next.width / 2, next.y + next.height / 2, 0);
        await page.evaluate((ms) => new Promise((resolve) => {
          const start = window.__buttonUp || performance.now();
          const step = () => {
            if (performance.now() - start >= ms) resolve();
            else setTimeout(step, 4);
          };
          step();
        }), delay);
        const spot = await clothSpotOutside(page, 0, avoid);
        if (kind === 'flick') await strokeAt(page, session, spot, 0.7, 2.2, 40);
        else await strokeAt(page, session, spot, 0.78, 0.22, 0);
        const snap = await page.evaluate(() => window.__whisk.snapshot());
        if (kind === 'flick') {
          assert.equal(snap.cloths, 0, 'flick ' + delay);
          assert.equal(JSON.stringify(snap.dishes), '[[1,1]]');
        } else {
          assert.equal(snap.cloths, 1, 'pull ' + delay);
          assert.equal(JSON.stringify(snap.dishes), '[[1,2]]');
        }
        assert.equal(snap.used, 1, kind + ' ' + delay + ' used');
      }
    }
  } finally {
    await browser.close();
  }
});
