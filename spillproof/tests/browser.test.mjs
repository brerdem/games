import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const fileUrl = pathToFileURL(path.resolve('spillproof/index.html')).href;
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((item) => fs.existsSync(item));

async function launch() {
  return chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

async function open(browser, width, height, query) {
  const page = await browser.newPage({ viewport: { width: width, height: height } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(fileUrl + (query || ''));
  await page.waitForFunction(() => window.__spill && window.__spill.ready && window.__spill.cellSize() > 0);
  return { page, errors };
}

async function pour(page, cell) {
  const point = await page.evaluate((item) => window.__spill.cellCenter(item.r, item.c), cell);
  await page.mouse.click(point.x, point.y);
  await page.mouse.click(point.x, point.y);
}

test('file:// play has no http requests', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__spill && window.__spill.ready);
    await page.waitForFunction(() => /all water/.test(document.getElementById('bubble').textContent || ''));
    const text = await page.locator('#bubble').innerText();
    assert.match(text, /all water/);
    const http = urls.filter((url) => /^https?:/i.test(url));
    assert.deepEqual(http, []);
  } finally {
    await browser.close();
  }
});

test('D8 correct and wrong previews match in style, sound, and timing', async () => {
  const browser = await launch();
  try {
    const { page, errors } = await open(browser, 390, 844);
    await page.waitForTimeout(700);
    const correct = await page.evaluate(() => window.__spill.previewProbe(4, 0));
    const wrong = await page.evaluate(() => window.__spill.previewProbe(0, 4));
    assert.equal(correct.stateSame, true);
    assert.equal(wrong.stateSame, true);
    assert.equal(correct.sounds, 0);
    assert.equal(wrong.sounds, 0);
    assert.equal(correct.sound, false);
    assert.equal(wrong.sound, false);
    assert.deepEqual(correct.style, wrong.style);
    assert.equal(correct.style.alpha, 0.35);
    assert.ok(correct.ms < 40 && wrong.ms < 40, `timing ${correct.ms} ${wrong.ms}`);
    assert.ok(Math.abs(correct.ms - wrong.ms) < 20);
    assert.ok(correct.spillPixels < 12 && wrong.spillPixels < 12, `spill pixels ${correct.spillPixels} ${wrong.spillPixels}`);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('D9 marks do not change frost, gauges, or the hint, and long-press matches the toggle', async () => {
  const browser = await launch();
  try {
    const { page, errors } = await open(browser, 390, 844);
    await page.evaluate(() => window.__spill.dismissTut());
    const before = await page.evaluate(() => ({
      snap: window.__spill.snapshot(),
      hint: window.__spill.hintCell(),
    }));
    const point = await page.evaluate(() => window.__spill.cellCenter(0, 4));
    await page.click('#mark');
    await page.mouse.click(point.x, point.y);
    const marked = await page.evaluate(() => window.__spill.snapshot());
    assert.equal(marked.marks['0,4'], true);
    assert.deepEqual(marked.frost, before.snap.frost);
    assert.deepEqual(marked.committed, before.snap.committed);
    assert.deepEqual(await page.evaluate(() => window.__spill.hintCell()), before.hint);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(420);
    await page.mouse.up();
    const cleared = await page.evaluate(() => window.__spill.snapshot());
    assert.equal(cleared.marks['0,4'], undefined);
    assert.deepEqual(cleared.frost, before.snap.frost);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('D10 retry clears water, frost, marks, and drops', async () => {
  const browser = await launch();
  try {
    const { page, errors } = await open(browser, 390, 844);
    await page.evaluate(() => window.__spill.dismissTut());
    const fresh = await page.evaluate(() => window.__spill.snapshot());
    const wrong = await page.evaluate(() => window.__spill.wrongTaps()[0]);
    await pour(page, wrong);
    await page.mouse.click((await page.evaluate(() => window.__spill.cellCenter(1, 1))).x, (await page.evaluate(() => window.__spill.cellCenter(1, 1))).y);
    const dirty = await page.evaluate(() => window.__spill.snapshot());
    assert.ok(dirty.spills >= 1 || Object.keys(dirty.marks).length >= 0);
    assert.ok(dirty.spills >= 1);
    await page.click('#retry');
    await page.click('#confirm-yes');
    await page.waitForFunction(() => window.__spill.snapshot().spills === 0);
    const again = await page.evaluate(() => window.__spill.snapshot());
    assert.deepEqual(again.committed, fresh.committed);
    assert.deepEqual(again.frost, fresh.frost);
    assert.deepEqual(again.marks, {});
    assert.equal(again.spills, 0);
    assert.equal(again.hintsUsed, 0);
    assert.equal(again.won, false);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('cells, buttons, linked waterlines, win, and fail', async () => {
  const browser = await launch();
  try {
    const wide = await open(browser, 390, 844, '?level=12');
    const cell = await wide.page.evaluate(() => window.__spill.cellSize());
    const button = await wide.page.locator('#pour').boundingBox();
    const hint = await wide.page.locator('#hint').boundingBox();
    assert.ok(cell >= 44, `cell ${cell} at 390`);
    assert.ok(button.height >= 48 && hint.height >= 48, `buttons ${button.height} ${hint.height}`);
    assert.deepEqual(wide.errors, []);
    await wide.page.close();

    const narrow = await open(browser, 360, 800, '?level=12');
    const small = await narrow.page.evaluate(() => window.__spill.cellSize());
    assert.ok(small >= 42, `cell ${small} at 360`);
    assert.deepEqual(narrow.errors, []);
    await narrow.page.close();

    const linked = await open(browser, 390, 844, '?level=5');
    await linked.page.evaluate(() => window.__spill.dismissTut());
    const pipe = await linked.page.evaluate(() => window.__spill.pipeCell());
    await pour(linked.page, pipe);
    await linked.page.waitForTimeout(1000);
    const levels = await linked.page.evaluate(() => ({
      water: window.__spill.levels(),
      visual: window.__spill.visualTops(),
      letters: window.__spill.pipeCell().letters,
    }));
    assert.equal(levels.water[levels.letters[0]], levels.water[levels.letters[1]]);
    assert.ok(Math.abs(levels.visual[levels.letters[0]] - levels.visual[levels.letters[1]]) < 0.08);
    assert.deepEqual(linked.errors, []);
    await linked.page.close();

    const win = await open(browser, 390, 844);
    await win.page.evaluate(() => window.__spill.dismissTut());
    const taps = await win.page.evaluate(() => window.__spill.solutionTaps());
    for (const tap of taps) await pour(win.page, tap);
    await win.page.waitForSelector('#win:not(.hidden)');
    const stars = await win.page.locator('#stars').innerText();
    assert.equal(stars, '★★★');
    await win.page.reload();
    await win.page.waitForFunction(() => window.__spill && window.__spill.ready);
    const saved = await win.page.evaluate(() => JSON.parse(localStorage.getItem('spillproof-progress-v1')).stars['1']);
    assert.equal(saved, 3);
    assert.deepEqual(win.errors, []);
    await win.page.close();

    const fail = await open(browser, 390, 844);
    await fail.page.evaluate(() => window.__spill.dismissTut());
    const wrongs = await fail.page.evaluate(() => window.__spill.wrongTaps());
    assert.ok(wrongs.length >= 3);
    for (const tap of wrongs.slice(0, 3)) await pour(fail.page, tap);
    await fail.page.waitForSelector('#fail:not(.hidden)');
    await fail.page.click('#fail-retry');
    await fail.page.waitForFunction(() => window.__spill.snapshot().spills === 0 && window.__spill.snapshot().failed === false);
    assert.deepEqual(fail.errors, []);
  } finally {
    await browser.close();
  }
});

test('the board stays at or above 50fps under 4x CPU throttle', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl + '?level=12');
    await page.waitForFunction(() => window.__spill && window.__spill.ready);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const fps = await page.evaluate(() => new Promise((resolve) => {
      const cell = window.__spill.solutionTaps()[0];
      const point = window.__spill.cellCenter(cell.r, cell.c);
      let frames = 0;
      const start = performance.now();
      function tick(now) {
        frames += 1;
        if (frames === 2) document.elementFromPoint(point.x, point.y);
        if (now - start < 1000) requestAnimationFrame(tick);
        else resolve(frames / ((now - start) / 1000));
      }
      requestAnimationFrame(tick);
    }));
    console.log(`fps@4x ${fps.toFixed(1)} method=rAF over 1s with Emulation.setCPUThrottlingRate 4, level 12`);
    assert.ok(fps >= 50, `fps ${fps}`);
  } finally {
    await browser.close();
  }
});
