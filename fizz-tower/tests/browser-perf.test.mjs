import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');
const fileUrl = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));

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

test('cold loads and the first frames of L5 L8 and L10', async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const level of [5, 8, 10]) {
      const visible = [];
      const windows = [];
      for (let run = 0; run < 10; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const started = Date.now();
        await page.goto(fileUrl + '?level=' + level);
        await page.waitForFunction(() => window.__fizz && window.__fizz.ready && window.__fizz.solverReady, null, { timeout: 8000 });
        visible.push(Date.now() - started);
        await page.evaluate(() => {
          window.__frames = [];
          function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
          requestAnimationFrame(tick);
        });
        if (level === 8) {
          await page.evaluate(() => window.__fizz.commit(0));
        }
        await page.waitForFunction(() => window.__frames && window.__frames.length >= 70, null, { timeout: 8000 });
        const sample = await page.evaluate(() => {
          const frames = window.__frames.slice(0, 70);
          let worst = Infinity;
          let worstAt = 0;
          const span = 30;
          for (let i = 0; i + span - 1 < frames.length; i++) {
            const fps = (span - 1) / ((frames[i + span - 1] - frames[i]) / 1000);
            if (fps < worst) { worst = fps; worstAt = i; }
          }
          return { worst, worstAt, solver: window.__fizz.solverMs() };
        });
        windows.push(sample.worst);
        console.log(`fizz L${level} run ${run + 1} visible ${visible[visible.length - 1]} worst30 ${sample.worst.toFixed(1)} at ${sample.worstAt} solver ${sample.solver.toFixed(0)}`);
        await context.close();
      }
      const vis = report('fizz cold L' + level + ' visible ms', visible);
      const fps = report('fizz cold L' + level + ' worst 30-frame fps', windows);
      assert.ok(vis[vis.length - 1] < 1000, 'L' + level + ' visible ' + vis[vis.length - 1]);
      assert.ok(fps[0] >= 50, 'L' + level + ' worst min ' + fps[0]);
    }
  } finally {
    await browser.close();
  }
});
