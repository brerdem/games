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

const SIZES = [
  [360, 800], [375, 667], [390, 844], [393, 852], [412, 915], [414, 896], [430, 932],
  [768, 1024],
  [667, 375], [740, 360], [844, 390], [932, 430],
  [1024, 768], [1280, 800], [1366, 768], [1440, 900], [1920, 1080],
];

async function burst(page, selector, times) {
  const box = await page.locator(selector).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (let i = 0; i < times; i++) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(60);
  }
}

test('overlay double and triple taps do not pour', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[390, 844], [1280, 800], [844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: height < 500 || width < 500 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(fileUrl);
      await page.waitForFunction(() => window.__spill && window.__spill.ready);
      await page.evaluate(() => window.__spill.dismissTut());
      const initial = await page.evaluate(() => window.__spill.snapshot());
      if (await page.evaluate(() => window.__spill.landscape())) {
        const before = await page.evaluate(() => window.__spill.snapshot());
        const box = await page.locator('#rotate').boundingBox();
        await page.touchscreen.tap(box.x + 20, box.y + 20);
        await page.touchscreen.tap(box.x + 20, box.y + 20);
        await page.touchscreen.tap(box.x + 20, box.y + 20);
        const after = await page.evaluate(() => window.__spill.snapshot());
        assert.deepEqual(after.committed, before.committed, `landscape ${width}x${height}`);
        assert.equal(after.spills, 0);
        await context.close();
        continue;
      }
      await page.evaluate(() => { while (window.__spill.pourNext()) { /* fill */ } });
      await page.waitForSelector('#win:not(.hidden)');
      await burst(page, '#win-retry', 3);
      await page.waitForTimeout(250);
      let now = await page.evaluate(() => window.__spill.snapshot());
      assert.equal(now.spills, 0, `retry spills ${width}x${height}`);
      assert.deepEqual(now.committed, initial.committed);
      assert.deepEqual(now.marks, {});
      await page.evaluate(() => { while (window.__spill.pourNext()) { /* fill */ } });
      await page.waitForSelector('#win:not(.hidden)');
      await burst(page, '#win-next', 2);
      await page.waitForTimeout(200);
      now = await page.evaluate(() => window.__spill.snapshot());
      assert.equal(now.spills, 0, `next spills ${width}x${height}`);
      await page.click('#menu');
      await burst(page, '#resume', 3);
      await page.waitForTimeout(200);
      now = await page.evaluate(() => window.__spill.snapshot());
      assert.equal(now.spills, 0, `resume spills ${width}x${height}`);
      await page.click('#retry');
      await burst(page, '#confirm-yes', 3);
      await page.waitForTimeout(200);
      now = await page.evaluate(() => window.__spill.snapshot());
      assert.equal(now.spills, 0, `confirm spills ${width}x${height}`);
      assert.equal(now.failed, false);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('the tutorial bubble covers no cells', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of SIZES) {
      for (const level of [1, 4, 5]) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.goto(`${fileUrl}?level=${level}`);
        await page.waitForFunction(() => window.__spill && window.__spill.ready);
        if (level === 1 && height > 520) await page.waitForTimeout(600);
        const hits = await page.evaluate(() => window.__spill.landscape() ? 0 : window.__spill.bubbleHits());
        assert.equal(hits, 0, `bubble covers ${hits} at ${width}x${height} L${level}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test('landscape phones ask to rotate and a drag or cancel leaves no mark', async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[844, 390], [932, 430], [740, 360], [667, 375]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(fileUrl + '?level=12');
      await page.waitForFunction(() => window.__spill.ready);
      const shown = await page.locator('#rotate').isVisible();
      assert.equal(shown, true, `rotate ${width}x${height}`);
      const text = await page.locator('#rotate').innerText();
      assert.match(text, /portrait/i);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__spill.ready);
    await page.evaluate(() => window.__spill.dismissTut());
    const point = await page.evaluate(() => window.__spill.cellCenter(0, 4));
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 36, point.y + 28);
    await page.waitForTimeout(420);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.__spill.snapshot().marks), {});
    await page.evaluate((pt) => {
      const canvas = document.getElementById('c');
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: pt.x, clientY: pt.y, pointerId: 7 }));
      canvas.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, clientX: pt.x, clientY: pt.y, pointerId: 7 }));
    }, point);
    await page.waitForTimeout(420);
    assert.deepEqual(await page.evaluate(() => window.__spill.snapshot().marks), {});
  } finally {
    await browser.close();
  }
});

test('Enter focuses Next, help scrolls, and audio waits for a gesture', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__spill.ready);
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.__spill.audioReady()), false);
    assert.equal(logs.some((line) => /AudioContext|autoplay/i.test(line)), false);
    await page.evaluate(() => window.__spill.dismissTut());
    await page.evaluate(() => { while (window.__spill.pourNext()) { /* fill */ } });
    await page.waitForSelector('#win:not(.hidden)');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'win-next');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('level-kicker').textContent.includes('2'));
    await context.close();

    for (const [width, height] of [[360, 800], [740, 360]]) {
      const helpPage = await browser.newPage({ viewport: { width, height } });
      await helpPage.goto(fileUrl);
      await helpPage.waitForFunction(() => window.__spill.ready);
      const reachable = await helpPage.evaluate(() => {
        const help = document.getElementById('help');
        help.classList.remove('hidden');
        const sheet = help.querySelector('.sheet');
        const end = document.getElementById('help-end');
        sheet.scrollTop = sheet.scrollHeight;
        const s = sheet.getBoundingClientRect();
        const e = end.getBoundingClientRect();
        return e.bottom <= s.bottom + 2 && e.top < s.bottom;
      });
      assert.equal(reachable, true, `help ${width}x${height}`);
      await helpPage.close();
    }
  } finally {
    await browser.close();
  }
});

test('a touch pour changes the board and 375-wide cells are at least 44 px', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__spill.ready);
    await page.evaluate(() => window.__spill.dismissTut());
    const before = await page.evaluate(() => window.__spill.snapshot().committed.join(','));
    const cell = await page.evaluate(() => window.__spill.solutionTaps()[0]);
    const point = await page.evaluate((item) => window.__spill.cellCenter(item.r, item.c), cell);
    await page.touchscreen.tap(point.x, point.y);
    await page.touchscreen.tap(point.x, point.y);
    const after = await page.evaluate(() => window.__spill.snapshot().committed.join(','));
    assert.notEqual(after, before);
    await context.close();
    const narrow = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await narrow.goto(fileUrl + '?level=12');
    await narrow.waitForFunction(() => window.__spill.ready);
    const size = await narrow.evaluate(() => window.__spill.cellSize());
    assert.ok(size >= 44, `375 cell ${size}`);
  } finally {
    await browser.close();
  }
});

test('a phone-class 4x throttle stays at or above 50fps during a tapped L12 solve', async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    const session = await context.newCDPSession(page);
    const samples = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(fileUrl + '?level=12');
      await page.waitForFunction(() => window.__spill && window.__spill.ready && window.__spill.cellSize() > 0);
      await page.evaluate(() => window.__spill.dismissTut());
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));
      await page.evaluate(() => {
        window.__frames = [];
        function tick(now) {
          window.__frames.push(now);
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      const taps = await page.evaluate(() => window.__spill.solutionTaps());
      for (const cell of taps) {
        const point = await page.evaluate((item) => window.__spill.cellCenter(item.r, item.c), cell);
        await page.touchscreen.tap(point.x, point.y);
        await new Promise((resolve) => { setTimeout(resolve, 80); });
        await page.touchscreen.tap(point.x, point.y);
        await page.waitForFunction(() => window.__spill.snapshot().won || !window.__spill.animating(), null, { timeout: 8000 });
      }
      await page.waitForFunction(() => window.__spill.snapshot().won, null, { timeout: 20000 });
      await page.waitForFunction(() => !window.__spill.animating(), null, { timeout: 8000 });
      const result = await page.evaluate(() => {
        const frames = window.__frames;
        const dt = (frames[frames.length - 1] - frames[0]) / 1000;
        const gaps = [];
        for (let i = 1; i < frames.length; i++) gaps.push(frames[i] - frames[i - 1]);
        gaps.sort((a, b) => a - b);
        const canvas = document.getElementById('c');
        return {
          fps: (frames.length - 1) / dt,
          frames: frames.length,
          p95: gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * 0.95))],
          dpr: window.devicePixelRatio,
          scale: window.__spill.bufferScale(),
          buf: canvas.width,
          css: canvas.clientWidth,
          bufH: canvas.height,
          cssH: canvas.clientHeight,
          cell: window.__spill.cellSize(),
        };
      });
      samples.push(result);
      console.log(`tapped L12 run ${run + 1} @4x dpr${result.dpr} scale ${result.scale} ${result.fps.toFixed(1)} fps p95 ${result.p95.toFixed(1)} ms buf ${result.buf}x${result.bufH} cell ${result.cell}`);
    }
    const worst = samples.reduce((min, item) => Math.min(min, item.fps), Infinity);
    const sample = samples[0];
    const cap = Math.min(1.5, sample.dpr);
    console.log(`tapped L12 min ${worst.toFixed(1)} fps of ${samples.map((item) => item.fps.toFixed(1)).join(', ')}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(sample.scale <= 1.5, `buffer scale ${sample.scale}`);
    assert.ok(Math.abs(sample.buf - Math.round(sample.css * cap)) <= 2, `backing store ${sample.buf} css ${sample.css} cap ${cap}`);
    assert.ok(Math.abs(sample.buf / sample.css - sample.bufH / sample.cssH) < 0.02, 'non-uniform buffer');
    assert.ok(worst >= 50, `min fps ${worst}`);
  } finally {
    await browser.close();
  }
});
