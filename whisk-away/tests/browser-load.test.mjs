import assert from 'node:assert/strict';
import test from 'node:test';
import { fileUrl, launch } from './browser-support.mjs';

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function report(label, values) {
  const sorted = values.slice().sort((a, b) => a - b);
  console.log(`${label} min ${sorted[0].toFixed(1)} median ${median(sorted).toFixed(1)} max ${sorted[sorted.length - 1].toFixed(1)} n ${sorted.length}`);
  return sorted;
}

// Visible-time gate is 1000 ms. A 500 ms cap failed on a slower machine at 623 ms
// for a cold L8 load, so the suite keeps that margin and prints the real distribution.
const VISIBLE_LIMIT = 1000;

test('cold L8 to L10 loads and the first frames after L7 L9 L10', async () => {
  const browser = await launch();
  try {
    for (const level of [8, 9, 10]) {
      const visible = [];
      const solver = [];
      for (let run = 0; run < 10; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const started = Date.now();
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__whisk.ready, null, { timeout: 8000 });
        const shown = Date.now() - started;
        await page.waitForFunction(() => window.__whisk.solverReady, null, { timeout: 8000 });
        const solved = await page.evaluate(() => window.__whisk.solverMs());
        visible.push(shown);
        solver.push(solved);
        assert.ok(shown < VISIBLE_LIMIT, 'L' + level + ' visible ' + shown);
        assert.ok(solved < 1000, 'L' + level + ' solver ' + solved);
        await context.close();
      }
      report('whisk cold L' + level + ' visible ms', visible);
      report('whisk cold L' + level + ' solver ms', solver);
    }
    for (const level of [7, 9, 10]) {
      const windows = [];
      for (let run = 0; run < 10; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady, null, { timeout: 8000 });
        await page.evaluate(() => {
          window.__frames = [];
          function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
          requestAnimationFrame(tick);
        });
        await page.waitForFunction(() => window.__frames && window.__frames.length >= 70, null, { timeout: 8000 });
        const sample = await page.evaluate(() => {
          const frames = window.__frames.slice(0, 70);
          let worst = Infinity;
          let worstAt = 0;
          const span = 30;
          for (let i = 0; i + span - 1 < frames.length; i++) {
            const windowDt = (frames[i + span - 1] - frames[i]) / 1000;
            const fps = (span - 1) / windowDt;
            if (fps < worst) { worst = fps; worstAt = i; }
          }
          return { worst, worstAt, frames: frames.length };
        });
        windows.push(sample.worst);
        console.log(`whisk cold fps L${level} run ${run + 1} worst30 ${sample.worst.toFixed(1)} at frame ${sample.worstAt}`);
        await context.close();
      }
      const sorted = report('whisk cold L' + level + ' worst 30-frame fps', windows);
      assert.ok(sorted[0] >= 50, 'L' + level + ' worst-window min ' + sorted[0]);
      assert.ok(median(sorted) >= 55, 'L' + level + ' worst-window median ' + median(sorted));
    }
  } finally {
    await browser.close();
  }
});
