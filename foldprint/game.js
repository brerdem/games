const FL = globalThis.FoldLogic;
const SAVE_KEY = 'foldprint-progress-v1';
const INK = { 1: '#E63946', 2: '#FFC93C', 4: '#2F6FDB', 3: '#F38B2A', 6: '#3BAA5C', 5: '#8E4FC4', 7: '#6B5A4A' };
const RIM = { 1: '#9E2430', 2: '#C99A1E', 4: '#1E4E9E', 3: '#C45E10', 6: '#1E7A3A', 5: '#5E2E8A', 7: '#3E3228' };
const WORD = { 1: 'Red', 2: 'Yellow', 4: 'Blue', 3: 'Orange', 6: 'Green', 5: 'Purple', 7: 'Mud' };
const LESSON = { 2: 'Order matters.', 3: 'Paint never comes off.', 4: 'Colours mix.', 7: 'Press a crease again.', 10: 'Wax won\'t take paint.' };

const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const stampsEl = document.getElementById('stamps');
const hintBtn = document.getElementById('hint');
const muteBtn = document.getElementById('mute');
const undoBtn = document.getElementById('undo');
const freshBtn = document.getElementById('fresh');
const pressBtn = document.getElementById('press');
const lessonEl = document.getElementById('lesson');
const finger = document.getElementById('finger');
const letterEl = document.getElementById('letter');
const panels = {
  menu: document.getElementById('menu-panel'),
  help: document.getElementById('help'),
  confirm: document.getElementById('confirm'),
  win: document.getElementById('win'),
  stuck: document.getElementById('stuck'),
  fail: document.getElementById('fail')
};

let W = 390;
let H = 844;
let dpr = 1;
let layout = null;
let model = null;
let pairs = [];
let state = null;
let levelNum = 1;
let progress = loadProgress();
let muted = progress.mute;
let blind = progress.blind;
let selected = null;
let drag = null;
let anim = null;
let shown = null;
let holdOverlay = false;
let inputLock = 0;
let bake = null;
let bakeId = '';
let needPaint = true;
let audioCtx = null;
let musicOn = false;
let lastMusic = 0;
let flecks = [];
let hintPulse = null;
let label = null;
const events = [];

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      stars: raw.stars || {},
      unlocked: raw.unlocked || 1,
      mute: !!raw.mute,
      blind: !!raw.blind,
      parSeen: raw.parSeen || {}
    };
  } catch (err) {
    return { stars: {}, unlocked: 1, mute: false, blind: false, parSeen: {} };
  }
}

function saveProgress() {
  progress.mute = muted;
  progress.blind = blind;
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

function nowMs() { return performance.now(); }

function log(kind, extra) { events.push({ kind: kind, t: nowMs(), extra: extra || null }); }

function overlayOpen() {
  return Object.keys(panels).some(function (key) { return !panels[key].classList.contains('hidden'); });
}

function landscapeLocked() {
  return window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
}

function hide(el) {
  if (!el.classList.contains('hidden')) inputLock = nowMs() + 340;
  el.classList.add('hidden');
}
function show(el) { el.classList.remove('hidden'); }

function syncRotate() {
  document.getElementById('rotate').classList.toggle('hidden', !landscapeLocked());
}

function measure() {
  const rect = stage.getBoundingClientRect();
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  const raw = window.devicePixelRatio || 1;
  dpr = raw > 1.5 ? 1.5 : raw;
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const hud = 98;
  const bar = 88;
  const availW = W - 8;
  const availH = H - hud - bar - 8;
  let cell = Math.floor(Math.min(availW / 6, (availH - 36) / 8));
  cell = Math.max(36, Math.min(72, cell));
  const sheetW = cell * 6;
  const sheetH = cell * 8;
  const originX = Math.round((W - sheetW) / 2);
  const originY = Math.round(hud + Math.max(18, (availH - sheetH) / 2));
  layout = { cell: cell, originX: originX, originY: originY, sheetW: sheetW, sheetH: sheetH, tab: 48, hud: hud, bar: bar };
  bakeId = '';
  needPaint = true;
  syncRotate();
}

function loadLevel(n) {
  levelNum = Math.max(1, Math.min(FL.LEVELS.length, n));
  model = FL.LEVELS[levelNum - 1];
  pairs = model.creases.map(function (c) { return FL.pairs(model.W, model.H, c); });
  state = FL.freshState(model);
  shown = state.cells.slice();
  selected = null;
  drag = null;
  anim = null;
  holdOverlay = false;
  flecks = [];
  hintPulse = null;
  label = null;
  hide(panels.win);
  hide(panels.stuck);
  hide(panels.fail);
  hide(panels.confirm);
  document.getElementById('kicker').textContent = 'Sheet ' + levelNum;
  document.getElementById('name').textContent = model.title;
  const line = progress.stars[levelNum] ? '' : (LESSON[levelNum] || '');
  lessonEl.textContent = line;
  finger.classList.toggle('hidden', levelNum !== 1 || !!progress.stars[1]);
  if (levelNum === 1 && !progress.stars[1]) placeFinger(0);
  bakeId = '';
  needPaint = true;
  syncHud();
  log('level', { n: levelNum });
}

function syncHud() {
  stampsEl.innerHTML = '';
  for (let i = 0; i < model.presses; i++) {
    const dot = document.createElement('i');
    dot.className = 'stamp' + (i >= state.pressesLeft ? ' spent' : '');
    stampsEl.appendChild(dot);
  }
  hintBtn.disabled = state.hintUsed || state.won || state.failed;
  hintBtn.textContent = state.hintUsed ? 'Used' : 'Hint';
  undoBtn.disabled = state.won || state.pressesLeft <= 0 || !state.history.length || (state.failed && state.reason !== 'stuck');
  pressBtn.disabled = selected == null || !!anim || state.won || state.failed;
  muteBtn.textContent = muted ? 'Off' : 'Snd';
  document.getElementById('blind').textContent = blind ? 'Colour' : 'Patterns';
}

function placeFinger(step) {
  if (!layout || !model) return;
  const tabs = tabCenters(model.creases[0]);
  const p = tabs[0];
  const travel = flapPx(model.creases[0]) * 0.65;
  const x = p.x + Math.min(1, step) * travel;
  finger.style.left = (x - 14) + 'px';
  finger.style.top = (p.y - 14) + 'px';
}

function smallerSide(c) {
  if (c.o === 'V') return c.k <= model.W - c.k ? 'left' : 'right';
  return c.k <= model.H - c.k ? 'top' : 'bottom';
}

function flapPx(c) {
  const n = c.o === 'V' ? Math.min(c.k, model.W - c.k) : Math.min(c.k, model.H - c.k);
  return n * layout.cell;
}

function creasePoint(c) {
  if (c.o === 'V') return { x: layout.originX + c.k * layout.cell, y: layout.originY + layout.sheetH / 2 };
  return { x: layout.originX + layout.sheetW / 2, y: layout.originY + c.k * layout.cell };
}

function tabCenters(c) {
  const edge = creasePoint(c);
  const r = 24;
  if (c.o === 'V') {
    return [
      clampTab({ x: edge.x, y: layout.originY - 8 }),
      clampTab({ x: edge.x, y: layout.originY + layout.sheetH + 8 })
    ];
  }
  return [
    clampTab({ x: layout.originX - 8, y: edge.y }),
    clampTab({ x: layout.originX + layout.sheetW + 8, y: edge.y })
  ];
}

function clampTab(p) {
  return {
    x: Math.max(24, Math.min(W - 24, p.x)),
    y: Math.max(layout.hud + 24, Math.min(H - layout.bar - 24, p.y))
  };
}

function hitTab(x, y) {
  let best = null;
  let score = 26 * 26;
  model.creases.forEach(function (c, index) {
    tabCenters(c).forEach(function (p) {
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d <= score) { score = d; best = index; }
    });
  });
  return best;
}

function hitCrease(x, y) {
  let best = null;
  let score = 24;
  model.creases.forEach(function (c, index) {
    const side = smallerSide(c);
    if (c.o === 'V') {
      const cx = layout.originX + c.k * layout.cell;
      const onSide = side === 'left' ? x <= cx && x >= layout.originX : x >= cx && x <= layout.originX + layout.sheetW;
      if (!onSide || y < layout.originY || y > layout.originY + layout.sheetH) return;
      const d = Math.abs(x - cx);
      if (d < score) { score = d; best = index; }
    } else {
      const cy = layout.originY + c.k * layout.cell;
      const onSide = side === 'top' ? y <= cy && y >= layout.originY : y >= cy && y <= layout.originY + layout.sheetH;
      if (!onSide || x < layout.originX || x > layout.originX + layout.sheetW) return;
      const d = Math.abs(y - cy);
      if (d < score) { score = d; best = index; }
    }
  });
  return best;
}

function cellAt(x, y) {
  const c = Math.floor((x - layout.originX) / layout.cell);
  const r = Math.floor((y - layout.originY) / layout.cell);
  if (r < 0 || c < 0 || r >= 8 || c >= 6) return null;
  return r * 6 + c;
}

function localPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * (W / rect.width), y: (event.clientY - rect.top) * (H / rect.height) };
}

function boardBlocked() {
  return overlayOpen() || landscapeLocked() || nowMs() < inputLock || !!anim || holdOverlay;
}

function dragProgress(index, x, y, origin) {
  const c = model.creases[index];
  const flap = Math.max(1, flapPx(c));
  const side = smallerSide(c);
  if (c.o === 'V') {
    const dir = side === 'left' ? 1 : -1;
    return Math.max(0, Math.min(1.05, ((x - origin.x) * dir) / flap));
  }
  const dir = side === 'top' ? 1 : -1;
  return Math.max(0, Math.min(1.05, ((y - origin.y) * dir) / flap));
}

function commit(index) {
  if (boardBlocked() && !holdOverlay) return;
  if (state.won || state.failed || anim) return;
  const before = shown.slice();
  const result = FL.applyFold(model, state, index);
  state = result.state;
  selected = null;
  finger.classList.add('hidden');
  const win = result.event === 'win';
  anim = {
    index: index,
    t0: nowMs(),
    before: before,
    next: result.preview.next,
    event: result.event,
    rebound: !!result.rebound,
    smudge: !!result.preview.bad,
    finale: win,
    fold: win ? 400 : 350,
    squash: win ? 160 : 120,
    peel: win ? 520 : 300,
    hang: win ? 420 : 0
  };
  holdOverlay = true;
  if (result.rebound) label = { text: 'Bounced back', until: nowMs() + 1100 };
  const fresh = countNewMatches(before, result.preview.next);
  if (fresh >= 4 && !result.smudge) label = { text: 'Clean print ×' + fresh, until: nowMs() + 900 };
  log(result.event, { crease: model.creases[index].id });
  if (!muted) soundFold(result.event, win);
  syncHud();
  needPaint = true;
}

function countNewMatches(before, next) {
  let n = 0;
  for (let i = 0; i < next.length; i++) {
    if (model.target[i] > 0 && before[i] !== model.target[i] && next[i] === model.target[i]) n++;
  }
  return n;
}

function endAnim() {
  const done = anim;
  anim = null;
  holdOverlay = false;
  shown = state.cells.slice();
  flecks = [];
  if (done.event === 'win') openWin();
  else if (done.event === 'stuck' || state.reason === 'stuck') openStuck();
  else if (done.event === 'presses' || state.reason === 'presses') openFail();
  needPaint = true;
  syncHud();
}

function openWin() {
  const stars = FL.starsFor(model, state);
  progress.stars[levelNum] = Math.max(progress.stars[levelNum] || 0, stars);
  progress.unlocked = Math.max(progress.unlocked, Math.min(FL.LEVELS.length, levelNum + 1));
  progress.parSeen[levelNum] = true;
  saveProgress();
  document.getElementById('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('win-copy').textContent = 'Par is ' + model.par + ' press' + (model.par === 1 ? '' : 'es') + '. You had ' + state.pressesLeft + ' stamp' + (state.pressesLeft === 1 ? '' : 's') + ' left.';
  const next = document.getElementById('win-next');
  next.disabled = levelNum >= FL.LEVELS.length;
  show(panels.win);
  (next.disabled ? document.getElementById('win-retry') : next).focus();
  if (!muted) chime();
}

function openStuck() { show(panels.stuck); }
function openFail() { show(panels.fail); }

function doUndo() {
  if (anim) return;
  const result = FL.undo(model, state);
  if (result.event === 'blocked') return;
  state = result.state;
  shown = state.cells.slice();
  selected = null;
  hide(panels.stuck);
  hide(panels.fail);
  needPaint = true;
  syncHud();
  log('undo');
  if (!muted) paper(180);
}

function doHint() {
  if (state.hintUsed || state.won || state.failed || anim) return;
  const result = FL.useHint(model, state);
  state = result.state;
  if (result.dead || result.crease == null) {
    lessonEl.textContent = 'This sheet can\'t be finished.';
  } else {
    hintPulse = { index: result.crease, until: nowMs() + 1600 };
    lessonEl.textContent = 'Try ' + model.creases[result.crease].id + '.';
    if (!muted) blip(660);
  }
  needPaint = true;
  syncHud();
  log('hint', { crease: result.crease });
}

function ensureBake() {
  const id = [Math.round(W), Math.round(H), dpr, layout.cell, layout.originX, layout.originY].join(':');
  if (bake && bakeId === id) return;
  bake = document.createElement('canvas');
  bake.width = canvas.width;
  bake.height = canvas.height;
  const g = bake.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const desk = g.createLinearGradient(0, 0, 0, H);
  desk.addColorStop(0, '#4A3428');
  desk.addColorStop(1, '#2A1C14');
  g.fillStyle = desk;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#F7F1E3';
  roundRect(g, layout.originX - 6, layout.originY - 6, layout.sheetW + 12, layout.sheetH + 12, 8);
  g.fill();
  let s = levelNum * 997;
  g.fillStyle = 'rgba(120, 90, 50, .08)';
  for (let i = 0; i < 80; i++) {
    s = (s * 16807) % 2147483647;
    const x = layout.originX + (s % layout.sheetW);
    s = (s * 16807) % 2147483647;
    const y = layout.originY + (s % layout.sheetH);
    g.fillRect(x, y, 1, 2);
  }
  bakeId = id;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function cellBox(i) {
  const c = i % 6;
  const r = (i / 6) | 0;
  return {
    x: layout.originX + c * layout.cell,
    y: layout.originY + r * layout.cell,
    w: layout.cell,
    h: layout.cell
  };
}

function paintBits(mask) {
  const bits = [];
  if (mask & 1) bits.push(1);
  if (mask & 2) bits.push(2);
  if (mask & 4) bits.push(4);
  return bits;
}

function drawBlob(box, mask, alpha, seed) {
  if (!mask) return;
  const cx = box.x + box.w * 0.5;
  const cy = box.y + box.h * 0.52;
  const rx = box.w * 0.30;
  const ry = box.h * 0.26;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(((seed % 7) - 3) * 0.04);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK[mask] || '#6B5A4A';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = RIM[mask] || '#3E3228';
  ctx.stroke();
  if (blind) {
    ctx.clip();
    paintBits(mask).forEach(function (bit) { pattern(bit, rx, ry); });
  }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.25, -ry * 0.35, rx * 0.22, ry * 0.14, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pattern(bit, rx, ry) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1.5;
  if (bit === 1) {
    for (let y = -ry; y <= ry; y += 7) for (let x = -rx; x <= rx; x += 7) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (bit === 2) {
    for (let i = -rx - ry; i < rx + ry; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -ry);
      ctx.lineTo(i + ry * 2, ry);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    for (let x = -rx; x <= rx; x += 3) {
      const y = Math.sin(x * 0.45) * ry * 0.35;
      if (x === -rx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWax(box) {
  ctx.fillStyle = '#F3EFE4';
  ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  ctx.strokeStyle = 'rgba(180,160,120,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box.x + 4, box.y + box.h - 6);
  ctx.lineTo(box.x + box.w - 6, box.y + 4);
  ctx.stroke();
  ctx.fillStyle = '#C9BBA0';
  ctx.beginPath();
  ctx.arc(box.x + box.w * 0.72, box.y + box.h * 0.28, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPencil(box, mask) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#9C8F7A';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.ellipse(box.x + box.w * 0.5, box.y + box.h * 0.52, box.w * 0.30, box.h * 0.26, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function inFlap(i, c) {
  const col = i % 6;
  const row = (i / 6) | 0;
  const side = smallerSide(c);
  if (c.o === 'V') {
    const cols = Math.min(c.k, model.W - c.k);
    const x0 = side === 'left' ? c.k - cols : c.k;
    return col >= x0 && col < x0 + cols;
  }
  const rows = Math.min(c.k, model.H - c.k);
  const y0 = side === 'top' ? c.k - rows : c.k;
  return row >= y0 && row < y0 + rows;
}

function drawSheet(cells, reveal, skipCrease) {
  for (let i = 0; i < cells.length; i++) {
    if (skipCrease != null && inFlap(i, model.creases[skipCrease])) continue;
    const box = cellBox(i);
    if (cells[i] === -1 || model.target[i] === -1) drawWax(box);
    const show = cells[i] > 0 ? cells[i] : 0;
    if (show > 0) drawBlob(box, show, 1, i + 3);
    else if (model.target[i] > 0 && !(reveal && reveal.hidePencil)) drawPencil(box, model.target[i]);
  }
}

function drawCreases() {
  ctx.save();
  ctx.strokeStyle = '#C9BBA0';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 6]);
  model.creases.forEach(function (c, index) {
    ctx.globalAlpha = selected === index ? 1 : 0.9;
    ctx.beginPath();
    if (c.o === 'V') {
      const x = layout.originX + c.k * layout.cell;
      ctx.moveTo(x, layout.originY + 4);
      ctx.lineTo(x, layout.originY + layout.sheetH - 4);
    } else {
      const y = layout.originY + c.k * layout.cell;
      ctx.moveTo(layout.originX + 4, y);
      ctx.lineTo(layout.originX + layout.sheetW - 4, y);
    }
    ctx.stroke();
  });
  ctx.restore();
}

function drawTabs() {
  const t = nowMs();
  model.creases.forEach(function (c, index) {
    const hot = selected === index || (hintPulse && hintPulse.index === index && t < hintPulse.until) || (drag && drag.index === index);
    tabCenters(c).forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, hot ? 16 : 14, 0, Math.PI * 2);
      ctx.fillStyle = hot ? '#E63946' : '#F7F1E3';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2A1C14';
      ctx.stroke();
    });
  });
}

function drawGhost(index) {
  const view = FL.preview(model, shown, index);
  view.next.forEach(function (value, i) {
    if (value === shown[i]) return;
    const box = cellBox(i);
    if (value > 0) drawBlob(box, value, 0.45, i + 9);
  });
  ctx.save();
  ctx.strokeStyle = '#D7263D';
  ctx.fillStyle = '#D7263D';
  ctx.lineWidth = 2;
  view.badCells.forEach(function (i) {
    const box = cellBox(i);
    const x = box.x + box.w * 0.5;
    const y = box.y + box.h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 7);
    ctx.lineTo(x + 7, y + 7);
    ctx.moveTo(x + 7, y - 7);
    ctx.lineTo(x - 7, y + 7);
    ctx.stroke();
  });
  ctx.restore();
}

function flapRect(c) {
  const side = smallerSide(c);
  if (c.o === 'V') {
    const cols = Math.min(c.k, model.W - c.k);
    const x = side === 'left' ? layout.originX + (c.k - cols) * layout.cell : layout.originX + c.k * layout.cell;
    return { x: x, y: layout.originY, w: cols * layout.cell, h: layout.sheetH, axis: 'x', crease: layout.originX + c.k * layout.cell };
  }
  const rows = Math.min(c.k, model.H - c.k);
  const y = side === 'top' ? layout.originY + (c.k - rows) * layout.cell : layout.originY + c.k * layout.cell;
  return { x: layout.originX, y: y, w: layout.sheetW, h: rows * layout.cell, axis: 'y', crease: layout.originY + c.k * layout.cell };
}

function withFlap(c, scale, fn) {
  const flap = flapRect(c);
  ctx.save();
  if (flap.axis === 'x') {
    ctx.translate(flap.crease, 0);
    ctx.scale(Math.max(0.02, scale), 1);
    ctx.translate(-flap.crease, 0);
  } else {
    ctx.translate(0, flap.crease);
    ctx.scale(1, Math.max(0.02, scale));
    ctx.translate(0, -flap.crease);
  }
  ctx.beginPath();
  ctx.rect(flap.x - 2, flap.y - 2, flap.w + 4, flap.h + 4);
  ctx.clip();
  fn(flap);
  ctx.restore();
}

function drawFlecks() {
  const t = nowMs();
  flecks = flecks.filter(function (f) { return t - f.t0 < f.life; });
  flecks.forEach(function (f) {
    const u = (t - f.t0) / f.life;
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x + f.vx * u, f.y + f.vy * u, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function spawnFlecks(cells) {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === shown[i] || cells[i] <= 0) continue;
    const box = cellBox(i);
    for (let n = 0; n < 4; n++) {
      flecks.push({
        x: box.x + box.w * 0.5,
        y: box.y + box.h * 0.5,
        vx: (n - 1.5) * 18,
        vy: -10 - n * 4,
        t0: nowMs(),
        life: 420,
        color: INK[cells[i]] || '#E63946'
      });
    }
  }
}

function drawStencilCard() {
  const x = 10;
  const y = layout.hud - 2;
  ctx.fillStyle = 'rgba(247,241,227,.92)';
  roundRect(ctx, x, y, 92, 34, 6);
  ctx.fill();
  const tw = 6;
  const th = 8;
  const s = 3;
  for (let i = 0; i < model.target.length; i++) {
    const v = model.target[i];
    const px = x + 6 + (i % tw) * (s + 1);
    const py = y + 4 + ((i / tw) | 0) * (s + 1);
    ctx.fillStyle = v === -1 ? '#E4D8C4' : (v > 0 ? (INK[v] || '#999') : 'rgba(156,143,122,.35)');
    ctx.fillRect(px, py, s, s);
  }
}

function drawPegLine() {
  const y = layout.hud + 6;
  ctx.strokeStyle = '#E7D7B8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, y);
  ctx.lineTo(W - 16, y);
  ctx.stroke();
  ctx.fillStyle = '#F7F1E3';
  ctx.beginPath();
  ctx.arc(W / 2, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabel() {
  if (!label || nowMs() > label.until) { label = null; return; }
  ctx.save();
  ctx.fillStyle = '#2A1C14';
  ctx.font = '16px Palatino, Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(label.text, layout.originX, layout.originY - 18);
  ctx.restore();
}

function currentScale() {
  if (drag) return 1 - Math.min(1, drag.progress);
  if (!anim) return 1;
  const t = nowMs() - anim.t0;
  if (t < anim.fold) {
    const u = t / anim.fold;
    const ease = u * u;
    return 1 - ease;
  }
  if (t < anim.fold + anim.squash) return 0.02;
  const peelT = t - anim.fold - anim.squash;
  if (peelT < anim.peel) {
    const u = peelT / anim.peel;
    const back = 1 + 1.4 * Math.pow(u - 1, 3) + 0.4 * Math.pow(u - 1, 2);
    return Math.max(0.02, Math.min(1, back));
  }
  return 1;
}

function cellsForFrame() {
  if (drag) return { base: shown, ghost: drag.index, scale: currentScale(), crease: drag.index, squash: 1 };
  if (!anim) return { base: shown, ghost: selected, scale: 1, crease: selected, squash: 1 };
  const t = nowMs() - anim.t0;
  const peeling = t >= anim.fold + anim.squash && t < anim.fold + anim.squash + anim.peel;
  const pressing = t >= anim.fold && t < anim.fold + anim.squash;
  let base = anim.before;
  if (!anim.smudge && (peeling || t >= anim.fold + anim.squash)) base = state.cells;
  if (anim.smudge && pressing) base = anim.next;
  const squash = pressing ? 1.03 : 1;
  return { base: base, ghost: null, scale: currentScale(), crease: anim.index, squash: squash, hidePencil: anim.finale && t > anim.fold + anim.squash };
}

function draw(now) {
  const moving = !!(drag || anim || flecks.length || (hintPulse && now < hintPulse.until) || (label && now < label.until));
  if (anim) {
    const end = anim.t0 + anim.fold + anim.squash + anim.peel + anim.hang;
    if (now >= end) endAnim();
  }
  if (levelNum === 1 && !finger.classList.contains('hidden') && !drag && !anim) {
    placeFinger(((now / 1400) % 1));
  }
  if (!moving && !needPaint) return;
  ensureBake();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(bake, 0, 0, W, H);
  const frame = cellsForFrame();
  ctx.save();
  if (frame.squash !== 1) {
    ctx.translate(W / 2, layout.originY + layout.sheetH / 2);
    ctx.scale(frame.squash, 1 / frame.squash);
    ctx.translate(-W / 2, -(layout.originY + layout.sheetH / 2));
  }
  if (anim && anim.finale && now - anim.t0 > anim.fold + anim.squash + anim.peel) {
    const u = (now - (anim.t0 + anim.fold + anim.squash + anim.peel)) / anim.hang;
    ctx.translate(0, -u * 28);
  }
  const folding = frame.crease != null && frame.scale < 0.98;
  drawSheet(frame.base, frame, folding ? frame.crease : null);
  if (folding) {
    withFlap(model.creases[frame.crease], frame.scale, function () {
      ctx.fillStyle = '#EFE6D4';
      const flap = flapRect(model.creases[frame.crease]);
      ctx.fillRect(flap.x, flap.y, flap.w, flap.h);
      let lifted = frame.base;
      if (anim && nowMs() - anim.t0 < anim.fold + anim.squash) lifted = anim.before;
      else if (anim && !anim.smudge) lifted = state.cells;
      drawSheet(lifted, frame, null);
    });
  }
  drawCreases();
  if (frame.ghost != null) drawGhost(frame.ghost);
  if (drag && drag.progress > 0.5) {
    ctx.strokeStyle = 'rgba(230,57,70,.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(layout.originX + 2, layout.originY + 2, layout.sheetW - 4, layout.sheetH - 4);
  }
  ctx.restore();
  drawTabs();
  drawStencilCard();
  if (anim && anim.finale && now - anim.t0 > anim.fold + anim.squash + anim.peel) drawPegLine();
  drawFlecks();
  drawLabel();
  if (anim && !anim.flecked && nowMs() - anim.t0 >= anim.fold) {
    anim.flecked = true;
    if (!anim.smudge) spawnFlecks(state.cells);
  }
  needPaint = !!(drag || anim || flecks.length || (hintPulse && now < hintPulse.until) || (label && now < label.until));
}

function frame(now) {
  if (musicOn && audioCtx && !muted && now - lastMusic > 1400) {
    lastMusic = now;
    tone(196, 0.4, 'triangle', 0.012);
  }
  draw(now);
  requestAnimationFrame(frame);
}

function unlockAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
  musicOn = true;
  lastMusic = nowMs();
}

function tone(freq, dur, type, gain) {
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  amp.gain.value = gain || 0.05;
  amp.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function paper(freq) { tone(freq || 240, 0.12, 'triangle', 0.04); }
function blip(freq) { tone(freq, 0.08, 'sine', 0.05); }
function chime() { tone(523, 0.2, 'sine', 0.05); tone(659, 0.24, 'sine', 0.04); tone(784, 0.3, 'triangle', 0.04); }

function soundFold(event, finale) {
  paper(finale ? 140 : 220);
  setTimeout(function () { tone(event === 'smudge' ? 90 : 120, 0.1, 'sine', 0.06); }, finale ? 400 : 340);
  if (event === 'smudge') setTimeout(function () { tone(180, 0.18, 'sawtooth', 0.03); }, 500);
  if (finale) setTimeout(chime, 900);
}

function renderLevels() {
  const box = document.getElementById('levels');
  box.innerHTML = '';
  FL.LEVELS.forEach(function (level, index) {
    const n = index + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    const stars = progress.stars[n] || 0;
    btn.textContent = n + (stars ? '★' : '');
    btn.disabled = n > progress.unlocked && n !== levelNum;
    btn.addEventListener('click', function () {
      hide(panels.menu);
      loadLevel(n);
    });
    box.appendChild(btn);
  });
}

canvas.addEventListener('pointerdown', function (event) {
  unlockAudio();
  if (boardBlocked()) return;
  const p = localPoint(event);
  const tab = hitTab(p.x, p.y);
  const crease = tab != null ? tab : hitCrease(p.x, p.y);
  if (crease == null) {
    selected = null;
    syncHud();
    needPaint = true;
    return;
  }
  drag = { index: crease, x: p.x, y: p.y, ox: p.x, oy: p.y, progress: 0, moved: false, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', function (event) {
  if (!drag || event.pointerId !== drag.id) return;
  const p = localPoint(event);
  if (Math.hypot(p.x - drag.ox, p.y - drag.oy) > 8) drag.moved = true;
  drag.x = p.x;
  drag.y = p.y;
  drag.progress = dragProgress(drag.index, p.x, p.y, { x: drag.ox, y: drag.oy });
  needPaint = true;
});

function endDrag(event, cancel) {
  if (!drag || (event && event.pointerId !== drag.id)) return;
  const info = drag;
  drag = null;
  needPaint = true;
  if (cancel || boardBlocked()) return;
  if (!info.moved && info.progress < 0.2) {
    selected = info.index;
    syncHud();
    if (!muted) blip(480);
    return;
  }
  if (info.progress >= 0.5) commit(info.index);
}

canvas.addEventListener('pointerup', function (event) { endDrag(event, false); });
canvas.addEventListener('pointercancel', function (event) { endDrag(event, true); });
canvas.addEventListener('pointerleave', function (event) { if (drag) endDrag(event, true); });
canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

let hold = 0;
canvas.addEventListener('pointerdown', function (event) {
  const p = localPoint(event);
  const cell = cellAt(p.x, p.y);
  clearTimeout(hold);
  if (cell == null) { letterEl.classList.add('hidden'); return; }
  hold = setTimeout(function () {
    const mask = shown[cell];
    if (!mask || mask < 0) { letterEl.classList.add('hidden'); return; }
    letterEl.textContent = WORD[mask] || 'Paint';
    letterEl.style.left = p.x + 'px';
    letterEl.style.top = (p.y - 28) + 'px';
    letterEl.classList.remove('hidden');
  }, 350);
});
canvas.addEventListener('pointerup', function () { clearTimeout(hold); });

pressBtn.addEventListener('click', function () {
  unlockAudio();
  if (selected == null) return;
  commit(selected);
});
undoBtn.addEventListener('click', function () { unlockAudio(); doUndo(); });
freshBtn.addEventListener('click', function () { loadLevel(levelNum); });
document.getElementById('menu').addEventListener('click', function () { renderLevels(); show(panels.menu); });
document.getElementById('resume').addEventListener('click', function () { hide(panels.menu); });
document.getElementById('how').addEventListener('click', function () { hide(panels.menu); show(panels.help); });
document.getElementById('help-close').addEventListener('click', function () { hide(panels.help); show(panels.menu); });
document.getElementById('blind').addEventListener('click', function () { blind = !blind; saveProgress(); syncHud(); needPaint = true; });
hintBtn.addEventListener('click', function () { unlockAudio(); doHint(); });
muteBtn.addEventListener('click', function () { unlockAudio(); muted = !muted; saveProgress(); syncHud(); });
document.getElementById('confirm-yes').addEventListener('click', function () { hide(panels.confirm); loadLevel(levelNum); });
document.getElementById('confirm-no').addEventListener('click', function () { hide(panels.confirm); });
document.getElementById('stuck-undo').addEventListener('click', doUndo);
document.getElementById('stuck-fresh').addEventListener('click', function () { hide(panels.stuck); loadLevel(levelNum); });
document.getElementById('fail-fresh').addEventListener('click', function () { hide(panels.fail); loadLevel(levelNum); });
document.getElementById('fail-menu').addEventListener('click', function () { hide(panels.fail); renderLevels(); show(panels.menu); });
document.getElementById('win-next').addEventListener('click', function () { hide(panels.win); loadLevel(levelNum + 1); });
document.getElementById('win-retry').addEventListener('click', function () { hide(panels.win); loadLevel(levelNum); });
document.getElementById('win-menu').addEventListener('click', function () { hide(panels.win); renderLevels(); show(panels.menu); });

window.addEventListener('keydown', function (event) {
  unlockAudio();
  if (event.key === 'Escape') {
    if (overlayOpen()) Object.keys(panels).forEach(function (key) { hide(panels[key]); });
    else { renderLevels(); show(panels.menu); }
    return;
  }
  if (overlayOpen() || anim) return;
  if (event.key === 'z' || event.key === 'Z') { doUndo(); return; }
  if (event.key === 'h' || event.key === 'H') { doHint(); return; }
  if (event.key === 'r' || event.key === 'R') { show(panels.confirm); return; }
  if (event.key === 'Enter' && selected != null) { commit(selected); return; }
  const n = +event.key;
  if (n >= 1 && n <= model.creases.length) {
    selected = n - 1;
    syncHud();
    needPaint = true;
  }
});

window.addEventListener('resize', function () { measure(); if (model) loadLevel(levelNum); });
if (window.ResizeObserver) new ResizeObserver(function () { measure(); needPaint = true; }).observe(stage);

function toViewport(p) {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + p.x * (rect.width / W), y: rect.top + p.y * (rect.height / H) };
}

window.__fold = {
  ready: true,
  load: loadLevel,
  cellSize: function () { return layout.cell; },
  tabSize: function () { return 48; },
  bufferScale: function () { return dpr; },
  animating: function () { return !!anim || !!drag; },
  snapshot: function () {
    return { cells: state.cells.slice(), presses: state.pressesLeft, won: state.won, failed: state.failed, reason: state.reason, hint: state.hintUsed };
  },
  creaseGesture: function (id) {
    const index = model.creases.findIndex(function (c) { return c.id === id; });
    const from = tabCenters(model.creases[index])[0];
    const c = model.creases[index];
    const flap = flapPx(c) * 0.72;
    const to = { x: from.x, y: from.y };
    if (c.o === 'V') to.x += (smallerSide(c) === 'left' ? 1 : -1) * flap;
    else to.y += (smallerSide(c) === 'top' ? 1 : -1) * flap;
    return { from: toViewport(from), to: toViewport(to), index: index };
  },
  tabsInside: function () {
    return model.creases.every(function (c) {
      return tabCenters(c).every(function (p) { return p.x >= 24 && p.x <= W - 24 && p.y >= 24 && p.y <= H - 24; });
    });
  },
  dismiss: function () { finger.classList.add('hidden'); lessonEl.textContent = ''; },
  landscape: landscapeLocked,
  fastCommit: function (id) {
    const index = model.creases.findIndex(function (c) { return c.id === id; });
    const result = FL.applyFold(model, state, index);
    state = result.state;
    shown = state.cells.slice();
    anim = null;
    holdOverlay = false;
    if (result.event === 'win') openWin();
    else if (state.reason === 'stuck') openStuck();
    else if (state.reason === 'presses') openFail();
    needPaint = true;
    syncHud();
    return result.event;
  }
};

const params = new URLSearchParams(location.search);
measure();
loadLevel(+(params.get('level') || 1));
requestAnimationFrame(frame);
