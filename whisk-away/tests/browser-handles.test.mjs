import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileUrl, launch, settle } from './browser-support.mjs';

const SIZES = [[320, 568], [360, 800], [390, 844], [430, 932], [1440, 900], [1920, 1080]];

function inside(box, w, h) {
  return box.x >= -0.5 && box.y >= -0.5 && box.x + box.w <= w + 0.5 && box.y + box.h <= h + 0.5;
}

test('handles and 44px targets stay inside the canvas', async () => {
  const browser = await launch();
  try {
    const lines = JSON.parse(fs.readFileSync(new URL('./pack_v1_2.json', import.meta.url), 'utf8')).levels
      .map((row) => row.reference_line);
    for (const [width, height] of SIZES) {
      const page = await browser.newPage({ viewport: { width, height } });
      for (let n = 1; n <= lines.length; n++) {
        await page.goto(fileUrl + '?level=' + n);
        await page.waitForFunction(() => window.__whisk.ready);
        const steps = [null].concat(lines[n - 1]);
        for (let s = 0; s < steps.length; s++) {
          if (steps[s]) {
            const kind = steps[s].startsWith('whip') ? 'w' : 'd';
            const index = +steps[s].slice(steps[s].indexOf('c') + 1);
            await page.evaluate((move) => window.__whisk.commit(move[0], move[1]), [kind, index]);
            await settle(page);
          }
          const report = await page.evaluate(() => window.__whisk.handles());
          for (const handle of report.list) {
            const where = width + 'x' + height + ' L' + n + ' step ' + s + ' c' + handle.i;
            assert.ok(inside(handle.tassel, report.w, report.h), where + ' tassel ' + JSON.stringify(handle.tassel));
            assert.ok(handle.target, where + ' missing target');
            assert.ok(handle.target.w >= 44 && handle.target.h >= 44, where + ' target ' + handle.target.w);
            assert.ok(inside(handle.target, report.w, report.h), where + ' target box ' + JSON.stringify(handle.target));
            assert.equal(handle.targetHit, handle.i, where + ' target hit ' + handle.targetHit);
            if (handle.body < 0 || handle.body === handle.i) {
              assert.equal(handle.tasselHit, handle.i, where + ' tassel hit ' + handle.tasselHit);
            }
            if (n === 7 && s === 0 && handle.i === 3) {
              assert.equal(handle.tasselHit, 3, where + ' cream handle hit ' + handle.tasselHit);
            }
          }
        }
      }
      console.log(`whisk handles ${width}x${height} inside`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
