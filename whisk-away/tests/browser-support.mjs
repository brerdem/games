import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');
export const fileUrl = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));

export const PHONE = [[320, 568], [360, 800], [390, 844], [430, 932]];

export async function launch() {
  return chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

export async function settle(page) {
  await page.waitForFunction(() => window.__whisk && !window.__whisk.animating(), null, { timeout: 8000 });
}

export async function armed(page) {
  await page.waitForFunction(() => window.__whisk.ready && performance.now() >= window.__whisk.quietUntil());
}

export function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function trustedStroke(page, session, from, dir, dist, pxPerMs, pauseMs) {
  const pause = pauseMs == null ? 0 : pauseMs;
  const pending = [];
  const send = (type, x, y) => {
    const touchPoints = type === 'touchEnd' ? [] : [{ x, y, id: 1 }];
    pending.push(session.send('Input.dispatchTouchEvent', { type, touchPoints }));
  };
  send('touchStart', from.x, from.y);
  const pauseSteps = pause > 0 ? Math.max(2, Math.round(pause / 16)) : 0;
  for (let i = 1; i <= pauseSteps; i++) {
    await sleep(pause / pauseSteps);
    send('touchMove', from.x, from.y);
  }
  const moveMs = dist / Math.max(0.05, pxPerMs);
  const steps = Math.max(5, Math.round(moveMs / 8));
  const stepGap = moveMs / steps;
  for (let i = 1; i <= steps; i++) {
    await sleep(stepGap);
    send('touchMove', from.x + dir[0] * dist * (i / steps), from.y + dir[1] * dist * (i / steps));
  }
  await sleep(Math.min(10, stepGap));
  send('touchEnd');
  await Promise.all(pending);
  await settle(page);
}

export async function flick(page, session, index, cells, pxPerMs, pauseMs) {
  const spot = await page.evaluate((cloth) => window.__whisk.point(cloth), index);
  await trustedStroke(
    page, session, spot, spot.dir,
    (cells == null ? 0.7 : cells) * spot.cell,
    pxPerMs == null ? 1.6 : pxPerMs,
    pauseMs == null ? 55 : pauseMs
  );
}

export async function pull(page, session, index, cells, pxPerMs, pauseMs) {
  const spot = await page.evaluate((cloth) => window.__whisk.point(cloth), index);
  await trustedStroke(
    page, session, spot, spot.dir,
    (cells == null ? 0.78 : cells) * spot.cell,
    pxPerMs == null ? 0.22 : pxPerMs,
    pauseMs == null ? 0 : pauseMs
  );
}

export async function assertTarget(page, index, where) {
  const info = await page.evaluate((cloth) => {
    const box = window.__whisk.targetBox(cloth);
    const spot = window.__whisk.point(cloth);
    const rect = document.getElementById('c').getBoundingClientRect();
    const samples = box ? [
      [box.x + box.w / 2, box.y + box.h / 2],
      [box.x + 2, box.y + 2],
      [box.x + box.w - 3, box.y + 2],
      [box.x + 2, box.y + box.h - 3],
      [box.x + box.w - 3, box.y + box.h - 3]
    ] : [];
    return {
      w: box ? box.w : 0,
      h: box ? box.h : 0,
      spotHit: window.__whisk.hit(spot.x, spot.y),
      hits: samples.map((pair) => window.__whisk.hit(rect.left + pair[0], rect.top + pair[1]))
    };
  }, index);
  assert.ok(info.w >= 44 && info.h >= 44, where + ' target ' + info.w + 'x' + info.h);
  assert.equal(info.spotHit, index, where + ' point');
  info.hits.forEach((hit, sample) => assert.equal(hit, index, where + ' sample ' + sample + ' hit ' + hit));
}

export async function tap(session, x, y, gap) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (gap) await sleep(gap);
}

export async function runMisfire(width, height) {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto(fileUrl + '?level=2');
    await page.waitForFunction(() => window.__whisk.ready);
    let flickMiss = 0;
    let pullMiss = 0;
    const flickNotes = [];
    const pullNotes = [];
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__whisk.reset());
      await page.waitForFunction(() => window.__whisk.snapshot().used === 0);
      await armed(page);
      const cells = 0.5 + (i % 8) * 0.1;
      const speed = cells < 0.85 ? 2.8 : 2.1;
      const pause = 40 + (i % 5) * 10;
      await flick(page, session, 0, cells, speed, pause);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      const gesture = await page.evaluate(() => window.__whisk.lastGesture());
      const ok = snap.used === 1 && snap.cloths === 0 && JSON.stringify(snap.dishes) === '[[1,1]]';
      if (!ok) {
        flickMiss += 1;
        if (flickNotes.length < 6) flickNotes.push({ i, cells, speed, pause, gesture, used: snap.used, cloths: snap.cloths, dishes: snap.dishes });
      }
    }
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.__whisk.reset());
      await page.waitForFunction(() => window.__whisk.snapshot().used === 0);
      await armed(page);
      const cells = 0.62 + (i % 5) * 0.1;
      const speed = 0.15 + (i % 4) * 0.05;
      const pause = i % 2 === 0 ? 0 : 40 + (i % 4) * 10;
      await pull(page, session, 0, cells, speed, pause);
      const snap = await page.evaluate(() => window.__whisk.snapshot());
      const gesture = await page.evaluate(() => window.__whisk.lastGesture());
      const ok = snap.used === 1 && snap.cloths === 1 && JSON.stringify(snap.dishes) === '[[1,2]]';
      if (!ok) {
        pullMiss += 1;
        if (pullNotes.length < 6) pullNotes.push({ i, cells, speed, pause, gesture, used: snap.used, cloths: snap.cloths, dishes: snap.dishes });
      }
    }
    console.log(`whisk misfires ${width} flick ${flickMiss}/100 pull ${pullMiss}/100`);
    if (flickNotes.length) console.log('flick misses ' + width + ' ' + JSON.stringify(flickNotes));
    if (pullNotes.length) console.log('pull misses ' + width + ' ' + JSON.stringify(pullNotes));
    assert.ok(flickMiss <= 2, width + ' flick ' + flickMiss);
    assert.ok(pullMiss <= 2, width + ' pull ' + pullMiss);
  } finally {
    await browser.close();
  }
}
