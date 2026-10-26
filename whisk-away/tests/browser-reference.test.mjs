import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { armed, assertTarget, fileUrl, flick, launch, PHONE, pull } from './browser-support.mjs';

test('reference lines clear by touch at 320, 360, 390 and 430', async () => {
  const browser = await launch();
  try {
    const packed = JSON.parse(fs.readFileSync(new URL('./pack_v1_2.json', import.meta.url), 'utf8'));
    const lines = packed.levels.map((row) => row.reference_line);
    for (const [width, height] of PHONE) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      const session = await context.newCDPSession(page);
      for (let n = 1; n <= lines.length; n++) {
        await page.goto(fileUrl + '?level=' + n);
        await armed(page);
        const cell = await page.evaluate(() => window.__whisk.cellSize());
        if (width === 390) assert.ok(cell >= 56, 'cell ' + cell);
        if (width === 320) assert.ok(cell >= 48, 'cell ' + cell);
        for (const step of lines[n - 1]) {
          const whip = step.startsWith('whip');
          const index = +step.slice(step.indexOf('c') + 1);
          await assertTarget(page, index, width + ' L' + n + ' ' + step);
          if (whip) await flick(page, session, index, 0.72, 2.2, 45);
          else await pull(page, session, index, 0.78, 0.22, 0);
          const mid = await page.evaluate(() => window.__whisk.snapshot());
          assert.equal(mid.stuck, false, width + ' L' + n + ' ' + step + ' stuck');
          assert.equal(mid.failed, false, width + ' L' + n + ' ' + step + ' fail');
        }
        const snap = await page.evaluate(() => window.__whisk.snapshot());
        assert.equal(snap.won, true, width + ' L' + n + ' used ' + snap.used);
        assert.equal(snap.stars, 3, width + ' L' + n + ' stars ' + snap.used);
        assert.equal(snap.used, snap.par);
        console.log(`whisk touch ref ${width} L${n} ok`);
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
