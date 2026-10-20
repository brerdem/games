const SL = globalThis.SpillLogic;
const SAVE_KEY = 'spillproof-progress-v1';
const GHOST = { alpha: 0.35, dash: [6, 5], color: '#2FD9C9', sound: false };
const BRASS = '#C99A4B';
const MINT = '#7CF5B0';
const SPILL = '#FFB347';
const GLYPH = ['●', '▲', '◆'];

const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const levelKicker = document.getElementById('level-kicker');
const levelLabel = document.getElementById('level-label');
const dropEls = Array.from(document.querySelectorAll('.drop'));
const hintBtn = document.getElementById('hint');
const muteBtn = document.getElementById('mute');
const pourBtn = document.getElementById('pour');
const markBtn = document.getElementById('mark');
const bubble = document.getElementById('bubble');
const menuPanel = document.getElementById('menu-panel');
const helpPanel = document.getElementById('help');
const confirmPanel = document.getElementById('confirm');
const winPanel = document.getElementById('win');
const failPanel = document.getElementById('fail');
const levelsEl = document.getElementById('levels');

let W = 390;
let H = 844;
let dpr = 1;
let model = null;
let state = null;
let levelNum = 1;
let layout = null;
let mode = 'pour';
let preview = null;
let cursor = { r: 0, c: 0 };
let progress = loadProgress();
let muted = progress.mute;
let reduce = progress.reduce;
let shown = {};
let slosh = {};
let tweens = [];
let later = [];
let frostAt = {};
let pops = {};
let bubbles = [];
let laser = null;
let bead = null;
let spillFx = null;
let cracks = null;
let shake = 0;
let pulse = null;
let pipes = [];
let tut = null;
let levelT = 0;
let introPlayed = false;
let winAt = 0;
let failAt = 0;
let ended = '';
let solveStart = 0;
let pausedAt = 0;
let pausedFor = 0;
let lastFrame = 0;
let audioCtx = null;
let noiseBuf = null;
const audioLog = [];
const events = [];
let down = null;
let holdTimer = 0;
let lastPreview = null;
let keysOn = false;

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      unlocked: raw.unlocked || 1,
      stars: raw.stars || {},
      bestMs: raw.bestMs || {},
      mute: Boolean(raw.mute),
      reduce: Boolean(raw.reduce),
      streak: raw.streak || 0,
    };
  } catch (err) {
    return { unlocked: 1, stars: {}, bestMs: {}, mute: false, reduce: false, streak: 0 };
  }
}

function saveProgress() {
  progress.mute = muted;
  progress.reduce = reduce;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (err) { /* private mode */ }
}

function log(type, extra) {
  events.push(Object.assign({ t: Date.now(), type: type }, extra || {}));
}

function audio() {
  if (muted) return null;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (err) {
    return null;
  }
}

function note(name, freq, dur, type, gain, slide) {
  audioLog.push(name);
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(Math.max(40, freq), t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
  amp.gain.setValueAtTime(gain || 0.07, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function crackle() {
  audioLog.push('crackle');
  const ac = audio();
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const amp = ac.createGain();
  const t = ac.currentTime;
  amp.gain.setValueAtTime(0.05, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ac.destination);
  src.start(t);
  src.stop(t + 0.14);
}

function whoosh() {
  audioLog.push('whoosh');
  const ac = audio();
  if (!ac) return;
  if (!noiseBuf) crackle();
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1400, ac.currentTime + 0.25);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.05, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.28);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + 0.3);
  note('ring', 680, 0.22, 'triangle', 0.04, 520);
}

function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) { /* unsupported */ }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function nowMs() { return performance.now(); }

function emptyOf(g) {
  const vals = model.P.gvals[g];
  return vals[vals.length - 1];
}

function loadLevel(n) {
  levelNum = clamp(n, 1, SL.LEVELS.length);
  model = SL.compile(SL.LEVELS[levelNum - 1]);
  state = SL.freshState(model);
  preview = null;
  mode = 'pour';
  cursor = { r: Math.floor(model.R / 2), c: Math.floor(model.C / 2) };
  tweens = [];
  later = [];
  frostAt = {};
  pops = {};
  bubbles = [];
  laser = null;
  bead = null;
  spillFx = null;
  cracks = null;
  shake = 0;
  pulse = null;
  shown = {};
  slosh = {};
  for (let t = 0; t < model.P.nTanks; t++) {
    const letter = String.fromCharCode(65 + t);
    const g = model.P.tankGroup[t];
    shown[letter] = state.committed[g];
    slosh[letter] = { x: 0, v: 0 };
  }
  Object.keys(state.frost).forEach(function (key, i) { frostAt[key] = nowMs() + i * 20; });
  levelT = nowMs();
  introPlayed = false;
  winAt = 0;
  failAt = 0;
  ended = '';
  solveStart = nowMs();
  pausedFor = 0;
  pausedAt = 0;
  lastPreview = null;
  setupTut();
  hide(winPanel);
  hide(failPanel);
  hide(confirmPanel);
  measure();
  buildPipes();
  syncHud(true);
  log('level', { n: levelNum });
}

function setupTut() {
  tut = null;
  if (progress.stars[levelNum]) return;
  if (levelNum === 1) tut = { step: 'full', at: nowMs() };
  else if (levelNum === 4) tut = { step: 'hidden', at: nowMs() };
  else if (levelNum === 5) tut = { step: 'pipe', at: nowMs() };
}

function setStep(step) { tut = { step: step, at: nowMs() }; }

function measure() {
  const rect = stage.getBoundingClientRect();
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!model) return;
  const cols = model.C;
  const rows = model.R;
  const topH = 78;
  const botH = 88;
  const margin = 2;
  const innerW = W - margin * 2;
  const innerH = H - topH - botH;
  let gauge = Math.max(20, Math.min(36, Math.round(innerW * 0.09)));
  let cell = Math.floor(Math.min((innerW - gauge) / cols, (innerH - gauge) / rows));
  const minCell = W >= 380 ? 44 : (W >= 350 ? 42 : 30);
  if (cols <= 8 && cell < minCell) {
    const g2 = Math.floor(innerW - minCell * cols);
    const gH = Math.floor(innerH - minCell * rows);
    if (g2 >= 18 && gH >= 18) {
      cell = minCell;
      gauge = Math.min(g2, gH);
    }
  }
  cell = Math.min(cell, 76);
  const blockW = cell * cols + gauge;
  const blockH = cell * rows + gauge;
  layout = {
    cell: cell,
    gauge: gauge,
    cols: cols,
    rows: rows,
    originX: margin + Math.max(0, (innerW - blockW) / 2),
    originY: topH + Math.max(0, (innerH - blockH) / 2),
    topH: topH,
    botH: botH,
  };
}

function buildPipes() {
  pipes = [];
  const pairs = model.level.pipes || [];
  const glyphOf = {};
  pairs.forEach(function (pair, index) {
    pair.forEach(function (letter) { if (glyphOf[letter] == null) glyphOf[letter] = index % 3; });
    const a = nearest(pair[0], pair[1]);
    const b = nearest(pair[1], pair[0]);
    const pa = localCenter(a[0], a[1]);
    const pb = localCenter(b[0], b[1]);
    pipes.push({
      letters: pair,
      glyph: index % 3,
      path: [pa, { x: pb.x, y: pa.y }, pb],
    });
  });
  model.glyphOf = glyphOf;
}

function nearest(letter, other) {
  let best = null;
  let score = 1e9;
  const target = cellsOf(other)[0];
  cellsOf(letter).forEach(function (cell) {
    const d = Math.abs(cell[0] - target[0]) + Math.abs(cell[1] - target[1]);
    if (d < score) { score = d; best = cell; }
  });
  return best;
}

function cellsOf(letter) {
  const out = [];
  for (let r = 0; r < model.R; r++) for (let c = 0; c < model.C; c++) if (model.letterAt[r][c] === letter) out.push([r, c]);
  return out;
}

function localCenter(r, c) {
  return {
    x: layout.originX + (c + 0.5) * layout.cell,
    y: layout.originY + (r + 0.5) * layout.cell,
  };
}

function cellRect(r, c) {
  return {
    x: layout.originX + c * layout.cell,
    y: layout.originY + r * layout.cell,
    w: layout.cell,
    h: layout.cell,
  };
}

function hitCell(x, y) {
  const c = Math.floor((x - layout.originX) / layout.cell);
  const r = Math.floor((y - layout.originY) / layout.cell);
  if (r < 0 || c < 0 || r >= model.R || c >= model.C) return null;
  if (x < layout.originX || y < layout.originY) return null;
  return { r: r, c: c };
}

function overlayOpen() {
  return [menuPanel, helpPanel, confirmPanel, winPanel, failPanel].some(function (el) { return !el.classList.contains('hidden'); });
}

function hide(el) { el.classList.add('hidden'); }
function show(el) { el.classList.remove('hidden'); }

function syncHud(force) {
  const kicker = 'Level ' + levelNum;
  const title = model.level.title;
  if (force || levelKicker.textContent !== kicker) levelKicker.textContent = kicker;
  if (force || levelLabel.textContent !== title) levelLabel.textContent = title;
  dropEls.forEach(function (el, i) {
    el.classList.toggle('gone', i < state.spills);
  });
  hintBtn.disabled = state.hintsUsed >= 1 || state.won || state.failed;
  hintBtn.textContent = state.hintsUsed ? 'Used' : 'Hint';
  pourBtn.disabled = !preview || mode !== 'pour' || state.won || state.failed;
  markBtn.setAttribute('aria-pressed', mode === 'mark' ? 'true' : 'false');
  muteBtn.textContent = muted ? 'Off' : 'Snd';
  const sound = document.getElementById('sound');
  const motion = document.getElementById('motion');
  sound.textContent = muted ? 'Sound off' : 'Sound on';
  motion.textContent = reduce ? 'Motion low' : 'Motion full';
}

function schedule(delay, fn) { later.push({ at: nowMs() + delay, fn: fn }); }

function visualOf(letter, now) {
  let value = shown[letter];
  tweens.forEach(function (tw) {
    if (tw.letter !== letter) return;
    const u = (now - tw.start - tw.delay) / tw.dur;
    if (u <= 0) value = tw.from;
    else if (u >= 1) value = tw.to;
    else value = tw.from + (tw.to - tw.from) * easeOutBack(clamp(u, 0, 1));
  });
  return value;
}

function animateLetter(letter, to, now, delay, dur) {
  const from = visualOf(letter, now);
  tweens = tweens.filter(function (tw) { return tw.letter !== letter; });
  shown[letter] = from;
  tweens.push({ letter: letter, from: from, to: to, start: now, delay: delay, dur: dur });
  slosh[letter].v += reduce ? 0 : 2.2;
}

function groupLetters(g) {
  return model.P.tanksInGroup[g].map(function (t) { return String.fromCharCode(65 + t); });
}

function applyResult(result, sourceLetter) {
  const now = nowMs();
  const dur = reduce ? 0.08 : 0.26;
  if (result.event === 'pour') {
    const letters = groupLetters(result.group);
    const linked = result.linked && !reduce;
    letters.forEach(function (letter) {
      const delay = linked && letter !== sourceLetter ? 0.45 : 0;
      const span = linked && letter !== sourceLetter ? 0.28 : (linked ? 0.25 : dur);
      animateLetter(letter, state.committed[result.group], now, delay * 1000, span * 1000);
    });
    const pitch = 220 + (model.R - 1 - result.row) * 36;
    note('glug', pitch, 0.18, 'sine', 0.08, pitch * 0.55);
    buzz(result.linked ? 20 : 10);
    if (result.linked && !reduce) {
      shake = Math.max(shake, 2);
      laser = { row: state.committed[result.group], start: now + 220, dur: 200 };
      const pipe = pipes.find(function (item) { return item.letters.indexOf(sourceLetter) >= 0; });
      if (pipe) bead = { path: pipe.path, start: now + 280, dur: 300 };
      schedule(280, whoosh);
    } else shake = Math.max(shake, 1);
    spawnBubbles(result.group, result.row);
  } else if (result.event === 'spill') {
    shake = Math.max(shake, 4);
    spillFx = { group: result.group, row: result.row, start: now };
    cracks = { group: result.group, start: now };
    note('crack', 180, 0.16, 'sawtooth', 0.04, 70);
    crackle();
    schedule(160, function () { note('drip', 420, 0.18, 'sine', 0.05, 160); });
    buzz(30);
    dropEls[Math.min(2, state.spills - 1)].classList.add('shatter');
    if (state.failed) schedule(420, function () { note('descend', 280, 0.45, 'sine', 0.06, 70); });
  }
  (result.dried || []).forEach(function (cell, i) {
    frostAt[cell[0] + ',' + cell[1]] = now + (reduce ? 0 : i * 30);
  });
  (result.popped || []).forEach(function (id, i) {
    const when = now + (reduce ? 0 : 180 + i * 70);
    pops[id] = when;
    schedule(Math.max(0, when - now), function () {
      note('tink', [523, 587, 659, 784, 880][i % 5], 0.12, 'sine', 0.06);
      crackle();
    });
  });
  if (tut && tut.step === 'again' && result.event === 'pour') setStep('wait');
  if (tut && tut.step === 'wait' && result.popped && result.popped.length) setStep('dry');
  if (state.won && !winAt) {
    winAt = now;
    celebrate();
  }
  if (state.failed && !failAt) failAt = now;
  syncHud(false);
  log(result.event, { r: result.row, c: result.col, spills: state.spills });
}

function spawnBubbles(g, row) {
  model.P.gcells[g].forEach(function (cell) {
    if (cell[0] < row) return;
    for (let i = 0; i < 2; i++) {
      const box = cellRect(cell[0], cell[1]);
      bubbles.push({
        x: box.x + 6 + Math.random() * (box.w - 12),
        y: box.y + box.h - 6,
        start: nowMs(),
        life: 700,
      });
    }
  });
}

function celebrate() {
  const now = nowMs();
  groupLettersAll().forEach(function (letter) { slosh[letter].v += 3; });
  schedule(180, function () {
    note('chord', 523, 0.4, 'sine', 0.05);
    note('chord', 659, 0.4, 'triangle', 0.04);
    note('chord', 784, 0.45, 'sine', 0.04);
  });
  schedule(420, function () { note('squeak', 880, 0.12, 'sine', 0.05, 1400); });
  const elapsed = Math.max(0, now - solveStart - pausedFor);
  const prev = progress.stars[levelNum] || 0;
  const stars = SL.starsFor(state);
  progress.stars[levelNum] = Math.max(prev, stars);
  if (!progress.bestMs[levelNum] || elapsed < progress.bestMs[levelNum]) progress.bestMs[levelNum] = elapsed;
  progress.unlocked = Math.max(progress.unlocked, Math.min(SL.LEVELS.length, levelNum + 1));
  progress.streak = state.spills === 0 ? (progress.streak || 0) + 1 : 0;
  saveProgress();
  log('win', { stars: stars, ms: elapsed });
}

function groupLettersAll() {
  const letters = [];
  for (let t = 0; t < model.P.nTanks; t++) letters.push(String.fromCharCode(65 + t));
  return letters;
}

function doPreview(r, c) {
  const key = r + ',' + c;
  if (state.frost[key]) return;
  const g = model.groupAt[r][c];
  if (r >= state.committed[g]) return;
  preview = { r: r, c: c, g: g, row: r };
  lastPreview = { row: r, group: g, style: Object.assign({}, GHOST) };
  if (tut && tut.step === 'full') setStep('again');
  syncHud(false);
}

function doPour(r, c) {
  const letter = model.letterAt[r][c];
  const result = SL.pour(model, state, r, c);
  state = result.state;
  preview = null;
  if (result.event === 'pour' || result.event === 'spill') applyResult(result, letter);
  else syncHud(false);
}

function doTap(r, c) {
  if (state.won || state.failed || overlayOpen()) return;
  cursor = { r: r, c: c };
  if (mode === 'mark') { doMark(r, c); return; }
  if (preview && preview.r === r && preview.c === c) doPour(r, c);
  else doPreview(r, c);
}

function doMark(r, c) {
  if (state.won || state.failed) return;
  const before = Object.keys(state.marks).length;
  state = SL.toggleMark(model, state, r, c);
  if (Object.keys(state.marks).length !== before) log('mark', { r: r, c: c });
  if (preview && preview.r === r && preview.c === c) preview = null;
  syncHud(false);
}

function doHint() {
  if (state.hintsUsed >= 1 || state.won || state.failed) return;
  const result = SL.hint(model, state);
  if (!result.cell) return;
  state = result.state;
  pulse = { r: result.cell.r, c: result.cell.c, start: nowMs() };
  if (result.cell.kind === 'water') {
    const g = model.groupAt[result.cell.r][result.cell.c];
    groupLetters(g).forEach(function (letter) {
      animateLetter(letter, state.committed[g], nowMs(), 0, reduce ? 80 : 260);
    });
    note('glug', 360, 0.16, 'sine', 0.07, 180);
  } else {
    frostAt[result.cell.r + ',' + result.cell.c] = nowMs();
    crackle();
  }
  if (state.won && !winAt) { winAt = nowMs(); celebrate(); }
  log('hint', result.cell);
  syncHud(false);
}

function openMenu() {
  if (!pausedAt && !overlayOpen()) pausedAt = nowMs();
  renderLevels();
  show(menuPanel);
  syncHud(false);
}

function closeMenu() {
  hide(menuPanel);
  hide(helpPanel);
  if (pausedAt && !overlayOpen()) {
    pausedFor += nowMs() - pausedAt;
    pausedAt = 0;
  }
}

function renderLevels() {
  levelsEl.innerHTML = '';
  SL.LEVELS.forEach(function (level, index) {
    const n = index + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    const stars = progress.stars[n] || 0;
    btn.innerHTML = n + '<small>' + (stars ? '★'.repeat(stars) : (n <= progress.unlocked ? '·' : '–')) + '</small>';
    btn.disabled = n > progress.unlocked && n !== levelNum;
    btn.addEventListener('click', function () {
      closeMenu();
      loadLevel(n);
    });
    levelsEl.appendChild(btn);
  });
}

function showWin() {
  if (ended === 'win') return;
  ended = 'win';
  const stars = SL.starsFor(state);
  document.getElementById('stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
  document.getElementById('stamp').classList.toggle('hidden', state.spills !== 0);
  document.getElementById('win-title').textContent = model.level.title;
  const ms = progress.bestMs[levelNum] || 0;
  document.getElementById('time').textContent = (ms / 1000).toFixed(0) + 's';
  document.getElementById('win-next').disabled = levelNum >= SL.LEVELS.length;
  show(winPanel);
}

function showFail() {
  if (ended === 'fail') return;
  ended = 'fail';
  show(failPanel);
  log('fail', { spills: state.spills });
}

function localPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener('pointerdown', function (event) {
  if (overlayOpen()) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  const pt = localPoint(event);
  down = { x: event.clientX, y: event.clientY, pt: pt, held: false };
  clearTimeout(holdTimer);
  holdTimer = setTimeout(function () {
    if (!down) return;
    down.held = true;
    const hit = hitCell(down.pt.x, down.pt.y);
    if (hit) doMark(hit.r, hit.c);
  }, 350);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointerup', function (event) {
  clearTimeout(holdTimer);
  if (!down || down.held) { down = null; return; }
  const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y) > 12;
  const pt = down.pt;
  down = null;
  if (moved || overlayOpen()) return;
  const hit = hitCell(pt.x, pt.y);
  if (!hit) { preview = null; syncHud(false); return; }
  doTap(hit.r, hit.c);
});

canvas.addEventListener('contextmenu', function (event) {
  event.preventDefault();
  const pt = localPoint(event);
  const hit = hitCell(pt.x, pt.y);
  if (hit) doMark(hit.r, hit.c);
});

bubble.addEventListener('click', function () {
  if (!tut) return;
  if (tut.step === 'dry') setStep('duck');
  else if (tut.step === 'duck' || tut.step === 'hidden' || tut.step === 'pipe' || tut.step === 'again') tut = null;
  else if (tut.step === 'full') setStep('again');
});

pourBtn.addEventListener('click', function () {
  if (preview) doPour(preview.r, preview.c);
});
markBtn.addEventListener('click', function () {
  mode = mode === 'mark' ? 'pour' : 'mark';
  if (mode === 'mark') preview = null;
  syncHud(false);
});
document.getElementById('retry').addEventListener('click', function () { show(confirmPanel); });
document.getElementById('confirm-yes').addEventListener('click', function () { hide(confirmPanel); loadLevel(levelNum); });
document.getElementById('confirm-no').addEventListener('click', function () { hide(confirmPanel); });
document.getElementById('menu').addEventListener('click', openMenu);
document.getElementById('resume').addEventListener('click', closeMenu);
document.getElementById('how').addEventListener('click', function () { hide(menuPanel); show(helpPanel); });
document.getElementById('help-close').addEventListener('click', function () { hide(helpPanel); show(menuPanel); });
document.getElementById('sound').addEventListener('click', function () { muted = !muted; saveProgress(); syncHud(false); });
muteBtn.addEventListener('click', function () { muted = !muted; saveProgress(); syncHud(false); });
document.getElementById('motion').addEventListener('click', function () { reduce = !reduce; saveProgress(); syncHud(false); });
hintBtn.addEventListener('click', doHint);
document.getElementById('fail-retry').addEventListener('click', function () { loadLevel(levelNum); });
document.getElementById('fail-menu').addEventListener('click', function () { hide(failPanel); openMenu(); });
document.getElementById('win-retry').addEventListener('click', function () { loadLevel(levelNum); });
document.getElementById('win-next').addEventListener('click', function () { loadLevel(levelNum + 1); });
document.getElementById('win-menu').addEventListener('click', function () { hide(winPanel); openMenu(); });

window.addEventListener('keydown', function (event) {
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    event.preventDefault();
    if (!confirmPanel.classList.contains('hidden')) hide(confirmPanel);
    else if (!helpPanel.classList.contains('hidden')) { hide(helpPanel); show(menuPanel); }
    else if (!menuPanel.classList.contains('hidden')) closeMenu();
    else if (winPanel.classList.contains('hidden') && failPanel.classList.contains('hidden')) openMenu();
    return;
  }
  if (!confirmPanel.classList.contains('hidden')) {
    if (key === 'enter') { hide(confirmPanel); loadLevel(levelNum); }
    return;
  }
  if (overlayOpen()) return;
  if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' || key === ' ' || key === 'enter' || key === 'x') {
    keysOn = true;
  }
  if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
    event.preventDefault();
    if (key === 'arrowup') cursor.r = Math.max(0, cursor.r - 1);
    if (key === 'arrowdown') cursor.r = Math.min(model.R - 1, cursor.r + 1);
    if (key === 'arrowleft') cursor.c = Math.max(0, cursor.c - 1);
    if (key === 'arrowright') cursor.c = Math.min(model.C - 1, cursor.c + 1);
  } else if (key === ' ' || key === 'enter') {
    event.preventDefault();
    doTap(cursor.r, cursor.c);
  } else if (key === 'x') doMark(cursor.r, cursor.c);
  else if (key === 'h') doHint();
  else if (key === 'r') show(confirmPanel);
  else if (key === 'm') { muted = !muted; saveProgress(); syncHud(false); }
});

window.addEventListener('resize', function () { measure(); buildPipes(); });
if (window.ResizeObserver) new ResizeObserver(function () { measure(); buildPipes(); }).observe(stage);

function tutorialAnchor() {
  if (!tut) return null;
  if (tut.step === 'full' && nowMs() - levelT < 480) return null;
  if (tut.step === 'full' || tut.step === 'dry') {
    const row = tut.step === 'full' ? model.R - 1 : 1;
    return {
      x: layout.originX + layout.cell * layout.cols + layout.gauge / 2,
      y: layout.originY + row * layout.cell + layout.cell / 2,
      text: tut.step === 'full' ? '5 of 5 → all water' : 'Line done → rest dries',
    };
  }
  if (tut.step === 'again' && preview) {
    const box = cellRect(preview.r, preview.c);
    return { x: box.x + box.w / 2, y: box.y, text: 'Tap again to pour' };
  }
  if (tut.step === 'duck' && model.clue.ducks[0]) {
    const duck = model.clue.ducks[0];
    const box = cellRect(duck[0], duck[1]);
    return { x: box.x + box.w / 2, y: box.y, text: 'Duck = water surface' };
  }
  if (tut.step === 'hidden') {
    let spot = null;
    model.clue.rows.forEach(function (clue, r) { if (clue == null && !spot) spot = { r: r, col: false }; });
    model.clue.cols.forEach(function (clue, c) { if (clue == null && !spot) spot = { c: c, col: true }; });
    if (!spot) return { x: W / 2, y: H / 2, text: 'Hidden gauges show ?' };
    if (spot.col) return { x: layout.originX + spot.c * layout.cell + layout.cell / 2, y: layout.originY + layout.rows * layout.cell + 16, text: 'Hidden gauges show ?' };
    return { x: layout.originX + layout.cols * layout.cell + layout.gauge / 2, y: layout.originY + spot.r * layout.cell, text: 'Hidden gauges show ?' };
  }
  if (tut.step === 'pipe' && pipes[0]) {
    const p = pipes[0].path[0];
    return { x: p.x, y: p.y, text: 'Pipes share one waterline' };
  }
  return null;
}

function draw(now) {
  const dt = Math.min(0.033, lastFrame ? (now - lastFrame) / 1000 : 0.016);
  lastFrame = now;
  later = later.filter(function (item) {
    if (item.at <= now) { item.fn(); return false; }
    return true;
  });
  groupLettersAll().forEach(function (letter) {
    shown[letter] = visualOf(letter, now);
    const s = slosh[letter];
    s.v += (-180 * s.x - 14 * s.v) * dt;
    s.x += s.v * dt;
  });
  shake *= Math.pow(0.04, dt);
  if (tut && tut.step === 'dry' && now - tut.at > 2400) setStep('duck');
  else if (tut && (tut.step === 'duck' || tut.step === 'hidden' || tut.step === 'pipe') && now - tut.at > 3200) tut = null;
  if (winAt && !ended && now - winAt > (reduce ? 180 : 700)) showWin();
  if (failAt && !ended && now - failAt > (reduce ? 180 : 480)) showFail();
  if (!introPlayed && now - levelT > 420) {
    introPlayed = true;
    note('tink', 523, 0.1, 'sine', 0.05);
    schedule(90, function () { note('tink', 659, 0.1, 'sine', 0.04); });
  }

  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0B1426');
  sky.addColorStop(1, '#14233D');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1;
  for (let x = 24; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 24; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  const jx = reduce ? 0 : (Math.random() - 0.5) * shake;
  const jy = reduce ? 0 : (Math.random() - 0.5) * shake;
  ctx.save();
  ctx.translate(jx, jy);
  drawTanks(now);
  drawPipes(now);
  drawGauges(now);
  drawCursor();
  ctx.restore();
  placeTutorial(now);
}

function drawTanks(now) {
  const cell = layout.cell;
  for (let r = 0; r < model.R; r++) for (let c = 0; c < model.C; c++) {
    const box = cellRect(r, c);
    ctx.fillStyle = 'rgba(30, 46, 74, 0.78)';
    ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
  }
  for (let t = 0; t < model.P.nTanks; t++) {
    const letter = String.fromCharCode(65 + t);
    const visual = shown[letter] + (reduce ? 0 : slosh[letter].x * 0.04);
    cellsOf(letter).forEach(function (pos) {
      const frac = wetFraction(pos[0], visual);
      if (frac <= 0) return;
      const box = cellRect(pos[0], pos[1]);
      const h = frac * cell;
      ctx.fillStyle = '#0E8C9A';
      ctx.fillRect(box.x + 2, box.y + box.h - h, box.w - 4, h);
      ctx.fillStyle = 'rgba(47, 217, 201, 0.85)';
      ctx.fillRect(box.x + 2, box.y + box.h - h, box.w - 4, Math.min(h, Math.max(3, cell * 0.22)));
    });
    drawMeniscus(letter, visual);
  }
  if (spillFx && now - spillFx.start < 360) {
    const u = (now - spillFx.start) / 360;
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - u);
    ctx.fillStyle = '#7FE7DE';
    model.P.gcells[spillFx.group].forEach(function (pos) {
      if (pos[0] > spillFx.row) return;
      if (pos[0] >= state.committed[spillFx.group]) return;
      const box = cellRect(pos[0], pos[1]);
      const over = u < 0.25 ? 6 : 0;
      ctx.fillRect(box.x + 3, box.y - over, box.w - 6, box.h * (1 - u));
    });
    ctx.restore();
  }
  if (preview) drawGhost();
  Object.keys(state.frost).forEach(function (key) {
    if ((frostAt[key] || 0) > now) return;
    const parts = key.split(',');
    drawFrost(+parts[0], +parts[1], now);
  });
  Object.keys(state.marks).forEach(function (key) {
    const parts = key.split(',');
    drawMark(+parts[0], +parts[1]);
  });
  drawSeams();
  drawDucks(now);
  drawGlyphs();
  if (pulse) {
    const u = (now - pulse.start) / 800;
    if (u < 1) {
      const box = cellRect(pulse.r, pulse.c);
      ctx.strokeStyle = 'rgba(244, 239, 226,' + (1 - u) + ')';
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
    }
  }
  bubbles = bubbles.filter(function (bub) { return now - bub.start < bub.life; });
  bubbles.forEach(function (bub) {
    const u = (now - bub.start) / bub.life;
    ctx.globalAlpha = 0.5 * (1 - u);
    ctx.fillStyle = '#E7FFFB';
    ctx.beginPath();
    ctx.arc(bub.x, bub.y - u * 18, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  if (cracks && now - cracks.start < 700) {
    ctx.strokeStyle = SPILL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cells = model.P.gcells[cracks.group];
    const first = cellRect(cells[0][0], cells[0][1]);
    ctx.moveTo(first.x + 4, first.y + first.h * 0.4);
    cells.forEach(function (pos, i) {
      const box = cellRect(pos[0], pos[1]);
      ctx.lineTo(box.x + box.w * (0.3 + (i % 2) * 0.4), box.y + box.h * (0.35 + (i % 3) * 0.15));
    });
    ctx.stroke();
  }
  if (laser && now >= laser.start && now <= laser.start + laser.dur && !reduce) {
    const u = (now - laser.start) / laser.dur;
    const y = layout.originY + laser.row * layout.cell;
    ctx.save();
    ctx.shadowColor = '#E9FFF8';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(233,255,248,' + (1 - u) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(layout.originX, y);
    ctx.lineTo(layout.originX + layout.cols * layout.cell, y);
    ctx.stroke();
    ctx.restore();
  }
}

function wetFraction(row, visual) {
  if (row >= visual) return 1;
  if (row + 1 <= visual) return 0;
  return row + 1 - visual;
}

function drawMeniscus(letter, visual) {
  const rows = cellsOf(letter).map(function (cell) { return cell[0]; });
  const minRow = Math.min.apply(null, rows);
  const maxRow = Math.max.apply(null, rows);
  if (visual >= maxRow + 1) return;
  const surface = visual <= minRow ? minRow : visual;
  const y = layout.originY + surface * layout.cell + (reduce ? 0 : Math.sin(nowMs() / 180 + surface) * 0.6);
  ctx.strokeStyle = '#E7FFFB';
  ctx.lineWidth = 2;
  cellsOf(letter).forEach(function (pos) {
    if (Math.floor(surface) !== pos[0] && !(visual <= minRow && pos[0] === minRow)) return;
    const box = cellRect(pos[0], pos[1]);
    ctx.beginPath();
    ctx.moveTo(box.x + 3, y);
    ctx.lineTo(box.x + box.w - 3, y);
    ctx.stroke();
  });
}

function drawGhost() {
  const g = preview.g;
  ctx.save();
  ctx.globalAlpha = GHOST.alpha;
  ctx.fillStyle = GHOST.color;
  ctx.setLineDash(GHOST.dash);
  model.P.gcells[g].forEach(function (pos) {
    const committed = state.committed[g];
    if (pos[0] < preview.row || pos[0] >= committed) return;
    const box = cellRect(pos[0], pos[1]);
    ctx.fillRect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
  });
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = GHOST.color;
  ctx.lineWidth = 2;
  const y = layout.originY + preview.row * layout.cell;
  model.P.gcells[g].forEach(function (pos) {
    if (pos[0] !== preview.row) return;
    const box = cellRect(pos[0], pos[1]);
    ctx.beginPath();
    ctx.moveTo(box.x + 2, y);
    ctx.lineTo(box.x + box.w - 2, y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawFrost(r, c, now) {
  const box = cellRect(r, c);
  ctx.fillStyle = 'rgba(185, 182, 232, 0.35)';
  ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  ctx.fillStyle = 'rgba(244, 239, 226, 0.55)';
  const step = Math.max(4, Math.floor(layout.cell / 6));
  for (let y = box.y + 4; y < box.y + box.h - 2; y += step) {
    for (let x = box.x + 4 + ((y / step) % 2) * 2; x < box.x + box.w - 2; x += step) {
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }
}

function drawMark(r, c) {
  const box = cellRect(r, c);
  ctx.strokeStyle = '#d7d4f2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(box.x + 10, box.y + 10);
  ctx.lineTo(box.x + box.w - 10, box.y + box.h - 10);
  ctx.moveTo(box.x + box.w - 10, box.y + 10);
  ctx.lineTo(box.x + 10, box.y + box.h - 10);
  ctx.stroke();
}

function drawSeams() {
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 4;
  ctx.lineCap = 'square';
  for (let r = 0; r < model.R; r++) for (let c = 0; c < model.C; c++) {
    const here = model.letterAt[r][c];
    const box = cellRect(r, c);
    const edges = [
      [c === 0 || model.letterAt[r][c - 1] !== here, box.x, box.y, box.x, box.y + box.h],
      [c === model.C - 1 || model.letterAt[r][c + 1] !== here, box.x + box.w, box.y, box.x + box.w, box.y + box.h],
      [r === 0 || model.letterAt[r - 1][c] !== here, box.x, box.y, box.x + box.w, box.y],
      [r === model.R - 1 || model.letterAt[r + 1][c] !== here, box.x, box.y + box.h, box.x + box.w, box.y + box.h],
    ];
    edges.forEach(function (edge) {
      if (!edge[0]) return;
      ctx.beginPath();
      ctx.moveTo(edge[1], edge[2]);
      ctx.lineTo(edge[3], edge[4]);
      ctx.stroke();
    });
  }
  ctx.fillStyle = '#E4C27A';
  [
    [layout.originX, layout.originY],
    [layout.originX + layout.cols * layout.cell, layout.originY],
    [layout.originX, layout.originY + layout.rows * layout.cell],
    [layout.originX + layout.cols * layout.cell, layout.originY + layout.rows * layout.cell],
  ].forEach(function (point) {
    ctx.beginPath();
    ctx.arc(point[0], point[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDucks(now) {
  model.clue.ducks.forEach(function (duck) {
    const box = cellRect(duck[0], duck[1]);
    const bob = Math.sin(now / 280 + duck[1]) * 1.4;
    duckSprite(box.x + box.w * 0.62, box.y + 4 + bob, layout.cell * 0.42);
  });
}

function duckSprite(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#F6D34D';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.35, s * 0.46, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-s * 0.28, s * 0.12, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8892A';
  ctx.beginPath();
  ctx.ellipse(-s * 0.5, s * 0.16, s * 0.16, s * 0.08, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1208';
  ctx.beginPath();
  ctx.arc(-s * 0.34, s * 0.06, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlyphs() {
  Object.keys(model.glyphOf || {}).forEach(function (letter) {
    const cell = cellsOf(letter)[0];
    const box = cellRect(cell[0], cell[1]);
    ctx.fillStyle = 'rgba(201, 154, 75, 0.9)';
    ctx.fillRect(box.x + 3, box.y + 3, 16, 16);
    ctx.fillStyle = '#1A1208';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GLYPH[model.glyphOf[letter]], box.x + 11, box.y + 12);
  });
}

function drawPipes(now) {
  pipes.forEach(function (pipe) {
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = Math.max(6, layout.cell * 0.16);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pipe.path[0].x, pipe.path[0].y);
    pipe.path.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.strokeStyle = '#E4C27A';
    ctx.lineWidth = 2;
    ctx.stroke();
    pipe.path.forEach(function (p, index) {
      if (index === 1) return;
      ctx.fillStyle = '#8C6730';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F4EFE2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y);
      ctx.lineTo(p.x + 4, p.y);
      ctx.moveTo(p.x, p.y - 4);
      ctx.lineTo(p.x, p.y + 4);
      ctx.stroke();
    });
  });
  if (bead && now >= bead.start && now <= bead.start + bead.dur) {
    const u = (now - bead.start) / bead.dur;
    const point = pointAlong(bead.path, u);
    ctx.fillStyle = '#F7FFF8';
    ctx.shadowColor = '#E9FFF8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function pointAlong(path, u) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    seg.push(len);
    total += len;
  }
  let dist = total * u;
  for (let i = 1; i < path.length; i++) {
    if (dist <= seg[i - 1] || i === path.length - 1) {
      const f = seg[i - 1] ? dist / seg[i - 1] : 0;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * f,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * f,
      };
    }
    dist -= seg[i - 1];
  }
  return path[path.length - 1];
}

function drawGauges(now) {
  const view = SL.gaugeView(model, state, preview);
  const intro = clamp((now - levelT) / 450, 0, 1);
  view.rows.forEach(function (gauge, r) { drawGauge(gauge, layout.originX + layout.cols * layout.cell, layout.originY + r * layout.cell, 'row' + r, intro, now); });
  view.cols.forEach(function (gauge, c) { drawGauge(gauge, layout.originX + c * layout.cell, layout.originY + layout.rows * layout.cell, 'col' + c, intro, now); });
}

function drawGauge(gauge, x, y, id, intro, now) {
  const w = id[0] === 'r' ? layout.gauge : layout.cell;
  const h = id[0] === 'r' ? layout.cell : layout.gauge;
  const satisfied = gauge.clue != null && gauge.committed === gauge.clue;
  const pop = pops[id] ? clamp(1 - (now - pops[id]) / 160, 0, 1) : 0;
  const scale = 1 + pop * 0.25 * Math.sin(pop * Math.PI);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = gauge.clue == null ? 'rgba(80, 90, 110, 0.55)' : 'rgba(20, 28, 48, 0.9)';
  roundRect(0, 0, w - 2, h - 2, 6);
  ctx.fill();
  ctx.strokeStyle = satisfied ? MINT : BRASS;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = satisfied ? MINT : '#F4EFE2';
  ctx.font = '600 ' + Math.max(12, Math.floor(Math.min(w, h) * 0.46)) + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = gauge.clue == null ? '?' : String(Math.round(gauge.clue * intro));
  ctx.fillText(label, (w - 2) / 2, (h - 2) / 2 + (gauge.clue == null ? 0 : -2));
  if (preview && gauge.ghost !== gauge.committed && gauge.clue != null) {
    ctx.fillStyle = '#9aa4b5';
    ctx.font = '600 10px Georgia, serif';
    ctx.fillText(String(gauge.ghost), (w - 2) / 2, h - 8);
  } else if (gauge.clue != null) {
    const frac = clamp(gauge.committed / gauge.clue, 0, 1);
    ctx.fillStyle = satisfied ? MINT : BRASS;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(4, h - 7, (w - 10) * frac, 3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (tut && ((tut.step === 'full' && id === 'row' + (model.R - 1)) || (tut.step === 'hidden' && gauge.clue == null))) {
    ctx.strokeStyle = 'rgba(244, 239, 226, 0.8)';
    ctx.lineWidth = 2;
    const pulse = 4 + Math.sin(now / 160) * 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.42 + pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function roundRect(x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCursor() {
  if (!keysOn) return;
  const box = cellRect(cursor.r, cursor.c);
  ctx.strokeStyle = 'rgba(244, 239, 226, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 5, box.y + 5, box.w - 10, box.h - 10);
}

function placeTutorial(now) {
  const anchor = tutorialAnchor();
  if (!anchor) { bubble.classList.add('hidden'); return; }
  bubble.classList.remove('hidden');
  bubble.textContent = anchor.text;
  bubble.style.left = clamp(anchor.x - 90, 8, W - 198) + 'px';
  bubble.style.top = clamp(anchor.y - 74, 76, H - 160) + 'px';
}

function frame(now) { draw(now); requestAnimationFrame(frame); }

function snapshot() {
  return {
    committed: state.committed.slice(),
    frost: Object.assign({}, state.frost),
    marks: Object.assign({}, state.marks),
    spills: state.spills,
    hintsUsed: state.hintsUsed,
    won: state.won,
    failed: state.failed,
    preview: preview ? { r: preview.r, c: preview.c } : null,
  };
}

function countSpillPixels() {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let n = 0;
  for (let i = 0; i < img.length; i += 4) {
    if (img[i] > 245 && img[i + 1] > 165 && img[i + 1] < 200 && img[i + 2] < 90) n++;
  }
  return n;
}

function solutionTaps() {
  const taps = [];
  for (let g = 0; g < model.P.G; g++) {
    const cell = model.P.gcells[g].find(function (item) { return item[0] === model.sol[g]; });
    if (cell) taps.push({ r: cell[0], c: cell[1] });
  }
  return taps;
}

function wrongTaps() {
  const taps = [];
  for (let g = 0; g < model.P.G && taps.length < 3; g++) {
    const cells = model.P.gcells[g].slice().sort(function (a, b) { return a[0] - b[0]; });
    if (cells[0][0] < model.sol[g]) taps.push({ r: cells[0][0], c: cells[0][1] });
  }
  return taps;
}

window.__spill = {
  ready: true,
  cellCenter: function (r, c) {
    const rect = canvas.getBoundingClientRect();
    const box = cellRect(r, c);
    return { x: rect.left + box.x + box.w / 2, y: rect.top + box.y + box.h / 2 };
  },
  cellSize: function () { return layout.cell; },
  snapshot: snapshot,
  previewProbe: function (r, c) {
    const before = JSON.stringify(snapshot().committed) + JSON.stringify(snapshot().frost) + snapshot().spills + snapshot().hintsUsed;
    const sounds = audioLog.length;
    const t0 = performance.now();
    doPreview(r, c);
    draw(nowMs());
    const after = snapshot();
    const same = JSON.stringify(after.committed) + JSON.stringify(after.frost) + after.spills + after.hintsUsed === before;
    return {
      alpha: lastPreview && lastPreview.style.alpha,
      dashed: Boolean(lastPreview && lastPreview.style.dash),
      color: lastPreview && lastPreview.style.color,
      sound: lastPreview && lastPreview.style.sound,
      sounds: audioLog.length - sounds,
      ms: performance.now() - t0,
      stateSame: same && after.won === false,
      spillPixels: countSpillPixels(),
      style: lastPreview && JSON.parse(JSON.stringify(lastPreview.style)),
    };
  },
  solutionTaps: solutionTaps,
  wrongTaps: wrongTaps,
  dismissTut: function () { tut = null; },
  pipeCell: function () {
    const pair = (model.level.pipes || [])[0];
    if (!pair) return null;
    const g = model.P.tankGroup[pair[0].charCodeAt(0) - 65];
    const cell = model.P.gcells[g].find(function (item) { return item[0] === model.sol[g]; });
    return cell ? { r: cell[0], c: cell[1], letters: pair } : null;
  },
  levels: function () {
    const out = {};
    for (let r = 0; r < model.R; r++) for (let c = 0; c < model.C; c++) out[model.letterAt[r][c]] = state.committed[model.groupAt[r][c]];
    return out;
  },
  visualTops: function () { return Object.assign({}, shown); },
  load: loadLevel,
  retry: function () { loadLevel(levelNum); },
  hintCell: function () { return SL.proveCell(model, state); },
  events: events,
  audioLog: audioLog,
  GHOST: GHOST,
};

const params = new URLSearchParams(location.search);
const requested = parseInt(params.get('level') || '', 10);
loadLevel(requested >= 1 && requested <= 12 ? requested : (progress.unlocked > 1 ? 1 : 1));
requestAnimationFrame(frame);
