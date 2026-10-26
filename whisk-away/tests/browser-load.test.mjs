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

test('L8 to L10 show the board within 500ms and finish solving within 1s', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    for (const level of [8, 9, 10]) {
      const visible = [];
      const solver = [];
      for (let run = 0; run < 10; run++) {
        const started = Date.now();
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__whisk.ready, null, { timeout: 8000 });
        const shown = Date.now() - started;
        await page.waitForFunction(() => window.__whisk.solverReady, null, { timeout: 8000 });
        const solved = await page.evaluate(() => window.__whisk.solverMs());
        visible.push(shown);
        solver.push(solved);
        assert.ok(shown < 500, 'L' + level + ' visible ' + shown);
        assert.ok(solved < 1000, 'L' + level + ' solver ' + solved);
      }
      report('whisk L' + level + ' visible ms', visible);
      report('whisk L' + level + ' solver ms', solver);
    }
    const windows = [];
    const means = [];
    for (const level of [1, 7, 10]) {
      for (let run = 0; run < 4; run++) {
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__whisk.ready && window.__whisk.solverReady);
        await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
        await page.evaluate(() => {
          window.__frames = [];
          function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
          requestAnimationFrame(tick);
        });
        await page.evaluate((n) => window.__whisk.commit(n === 1 ? 'w' : 'd', 0), level);
        await page.waitForTimeout(900);
        const sample = await page.evaluate(() => {
          const frames = window.__frames;
          const dt = (frames[frames.length - 1] - frames[0]) / 1000;
          let worst = Infinity;
          const span = 30;
          for (let i = 0; i + span - 1 < frames.length; i++) {
            const windowDt = (frames[i + span - 1] - frames[i]) / 1000;
            const fps = (span - 1) / windowDt;
            if (fps < worst) worst = fps;
          }
          return { fps: (frames.length - 1) / dt, worst };
        });
        windows.push(sample.worst);
        means.push(sample.fps);
        console.log(`whisk fps L${level} run ${run + 1} mean ${sample.fps.toFixed(1)} worst30 ${sample.worst.toFixed(1)}`);
      }
    }
    report('whisk mean fps', means);
    report('whisk worst 30-frame fps', windows);
    assert.ok(Math.min(...means) >= 50, 'min fps ' + Math.min(...means));
    assert.ok(Math.min(...windows) >= 50, 'worst window ' + Math.min(...windows));
  } finally {
    await browser.close();
  }
});
