import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
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
function worstWindow(frames) {
  let worst = Infinity;
  const span = 30;
  if (frames.length < span) return worst;
  for (let i = 0; i + span - 1 < frames.length; i++) {
    const fps = (span - 1) / ((frames[i + span - 1] - frames[i]) / 1000);
    if (fps < worst) worst = fps;
  }
  return worst;
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(root, path.normalize(rel));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('missing'); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('cold loads and the first frames of L5 L8 and L10 over http', async () => {
  const server = await serve();
  const port = server.address().port;
  const pageUrl = `http://127.0.0.1:${port}/index.html`;
  console.log('fizz served ' + pageUrl);
  const browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const level of [5, 8, 10]) {
      const visible = [];
      const windows = [];
      const cascades = [];
      const undos = [];
      const stuckLate = [];
      for (let run = 0; run < 10; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const started = Date.now();
        await page.goto(pageUrl + '?level=' + level);
        await page.waitForFunction(() => window.__fizz && window.__fizz.ready, null, { timeout: 8000 });
        visible.push(Date.now() - started);
        await page.evaluate(() => {
          window.__frames = [];
          window.__long = [];
          try {
            const obs = new PerformanceObserver((list) => {
              list.getEntries().forEach((entry) => window.__long.push(entry.duration));
            });
            obs.observe({ entryTypes: ['longtask'] });
          } catch (err) { /* longtask is optional */ }
          function tick(now) { window.__frames.push(now); requestAnimationFrame(tick); }
          requestAnimationFrame(tick);
        });
        let undoMs = null;
        if (level === 10) {
          undoMs = await page.evaluate(() => {
            window.__fizz.instant(0);
            const started = performance.now();
            window.__fizz.undo();
            return performance.now() - started;
          });
        }
        if (level === 8) await page.evaluate(() => window.__fizz.commit(0));
        await page.waitForFunction(() => window.__frames && window.__frames.length >= 70, null, { timeout: 8000 });
        await page.waitForFunction(() => window.__fizz.solverReady, null, { timeout: 15000 });
        const sample = await page.evaluate(() => {
          const frames = window.__frames.slice(0, 70);
          let worst = Infinity;
          const span = 30;
          for (let i = 0; i + span - 1 < frames.length; i++) {
            const fps = (span - 1) / ((frames[i + span - 1] - frames[i]) / 1000);
            if (fps < worst) worst = fps;
          }
          return { worst, solver: window.__fizz.solverMs() };
        });
        let worst = sample.worst;
        let cascadeWorst = null;
        if (level === 10) {
          await page.waitForFunction(() => window.__fizz.solverReady, null, { timeout: 15000 });
          const events = await page.evaluate(async () => {
            const count = window.__fizz.prepareLongest();
            window.__fizz.playPrepared();
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            window.__cascadeFrames = [];
            function tick(now) { window.__cascadeFrames.push(now); requestAnimationFrame(tick); }
            requestAnimationFrame(tick);
            return count;
          });
          await page.waitForFunction(() => !window.__fizz.animating() && window.__cascadeFrames.length >= 30, null, { timeout: 8000 });
          const cascade = await page.evaluate(() => ({
            ms: window.__fizz.lastCascadeMs(),
            frames: window.__cascadeFrames.slice()
          }));
          cascades.push(cascade.ms);
          cascadeWorst = worstWindow(cascade.frames);
          worst = Math.min(worst, cascadeWorst);
          const late = await page.evaluate(async () => {
            window.__fizz.load(10);
            window.__fizz.commit(1);
            await new Promise((resolve) => {
              function watch() {
                if (window.__fizz.animating()) requestAnimationFrame(watch);
                else resolve();
              }
              requestAnimationFrame(watch);
            });
            const snap = window.__fizz.snapshot();
            return { after: performance.now() - window.__fizz.cascadeEnded(), stuck: snap.stuck, banner: snap.banner };
          });
          stuckLate.push(late.after);
          assert.equal(late.stuck, true, late.banner);
          console.log(`fizz L10 run ${run + 1} cascade ${cascade.ms.toFixed(1)} events ${events} cascadeWorst ${cascadeWorst.toFixed(1)} idleWorst ${sample.worst.toFixed(1)} undo ${undoMs.toFixed(1)} stuckAfter ${late.after.toFixed(1)}`);
        }
        windows.push(worst);
        if (undoMs != null) {
          undos.push(undoMs);
          assert.ok(undoMs < 50, 'undo long task ' + undoMs);
        }
        console.log(`fizz L${level} run ${run + 1} visible ${visible[visible.length - 1]} worst30 ${worst.toFixed(1)} solver ${sample.solver.toFixed(0)} url ${pageUrl}`);
        await context.close();
      }
      const vis = report('fizz cold L' + level + ' visible ms', visible);
      const fps = report('fizz cold L' + level + ' worst 30-frame fps', windows);
      if (cascades.length) report('fizz cold L' + level + ' cascade ms', cascades);
      if (undos.length) {
        const undoSorted = report('fizz L' + level + ' undo during solve ms', undos);
        assert.ok(undoSorted[undoSorted.length - 1] < 50, 'undo max ' + undoSorted[undoSorted.length - 1]);
      }
      if (stuckLate.length) {
        const lateSorted = report('fizz L' + level + ' stuck after cascade ms', stuckLate);
        assert.ok(lateSorted[lateSorted.length - 1] < 100, 'stuck late ' + lateSorted[lateSorted.length - 1]);
      }
      assert.ok(vis[vis.length - 1] < 1000, 'L' + level + ' visible ' + vis[vis.length - 1]);
      assert.ok(fps[0] >= 50, 'L' + level + ' worst min ' + fps[0]);
      if (cascades.length) assert.ok(Math.max(...cascades) <= 1200, 'cascade ' + Math.max(...cascades));
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
