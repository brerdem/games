import {
  COLS,
  LEVELS,
  PALETTE,
  ROWS,
  carveBottle,
  fallStep,
  makeRng,
  matchPercent,
  prepareLevel,
} from './logic.js';

const FONT = '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';
const WALL = 255;
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sandCanvas = document.createElement('canvas');
sandCanvas.width = COLS;
sandCanvas.height = ROWS;
const sandCtx = sandCanvas.getContext('2d', { willReadFrequently: true });
const sandImage = sandCtx.createImageData(COLS, ROWS);
const ghostCanvas = document.createElement('canvas');
ghostCanvas.width = COLS;
ghostCanvas.height = ROWS;
const ghostCtx = ghostCanvas.getContext('2d');

const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');

let W = 800;
let H = 900;
let started = false;
let levelNum = 1;
let levelStartScore = 0;
let score = 0;
let prepared = null;
let grid = null;
let shade = null;
let rng = null;
let budgets = null;
let colors = [];
let selected = 1;
let hopper = 36;
let pouring = false;
let pointer = null;
let still = 0;
let settled = true;
let ghost = false;
let ghostUsed = false;
let sealed = false;
let match = 1;
let bands = [];
let keys = new Set();
let actx = null;
let hiss = null;
let view = null;
let sealBox = null;
let swatches = [];

function audio() {
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function ensureHiss() {
  if (hiss) return hiss;
  const ac = audio();
  const seconds = 1;
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
  hiss = gain;
  return hiss;
}

function blip(freq, dur = 0.06) {
  try {
    const ac = audio();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.04, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* audio is optional */
  }
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
}

function overlaysOpen() {
  return !helpEl.classList.contains('hidden')
    || !startEl.classList.contains('hidden')
    || !overEl.classList.contains('hidden')
    || !winEl.classList.contains('hidden');
}

function loadLevel(n, keepScore) {
  levelNum = n;
  levelStartScore = keepScore;
  score = keepScore;
  const level = LEVELS[n - 1];
  prepared = prepareLevel(level);
  const bottle = carveBottle();
  grid = bottle.grid.slice();
  shade = new Uint8Array(COLS * ROWS);
  rng = makeRng(level.seed + 17);
  budgets = { ...prepared.budgets };
  colors = Object.keys(budgets).map(Number);
  selected = colors[0];
  hopper = Math.round((prepared.bottle.openL + prepared.bottle.openR) / 2);
  pouring = false;
  still = 30;
  settled = true;
  ghost = false;
  ghostUsed = false;
  sealed = false;
  match = 0;
  bands = layerBands(prepared.grid);
  paintBuffer(ghostCtx, ghostCanvas, prepared.grid, prepared.shade, 255);
}

function startRun() {
  loadLevel(1, 0);
}

function restartLevel() {
  loadLevel(levelNum, levelStartScore);
}

function layerBands(target) {
  const x = Math.floor(COLS / 2);
  const marks = [];
  let prev = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    const v = target[y * COLS + x];
    if (v === WALL || v === 0) continue;
    if (v !== prev) {
      marks.push({ y, color: v });
      prev = v;
    }
  }
  return marks;
}

function paintBuffer(context, surface, source, tones, alpha) {
  const image = context.createImageData(COLS, ROWS);
  const data = image.data;
  for (let i = 0; i < source.length; i++) {
    const v = source[i];
    const o = i * 4;
    if (v === WALL) {
      const edge = isEdge(source, i);
      data[o] = 230;
      data[o + 1] = 240;
      data[o + 2] = 245;
      data[o + 3] = edge ? 70 : 16;
    } else if (v === 0) {
      data[o + 3] = 0;
    } else {
      const rgb = PALETTE[v].rgb;
      const j = (tones[i] || 128) / 128;
      data[o] = Math.max(0, Math.min(255, rgb[0] * j));
      data[o + 1] = Math.max(0, Math.min(255, rgb[1] * j));
      data[o + 2] = Math.max(0, Math.min(255, rgb[2] * j));
      data[o + 3] = alpha;
    }
  }
  context.putImageData(image, 0, 0);
  void surface;
}

function isEdge(source, i) {
  const x = i % COLS;
  const y = (i / COLS) | 0;
  if (source[i] !== WALL) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (source[ny * COLS + nx] !== WALL) return true;
  }
  return false;
}

function emit(count) {
  const bottle = prepared.bottle;
  const half = 2;
  const x = Math.round(Math.max(bottle.openL + half, Math.min(bottle.openR - half, hopper)));
  let got = 0;
  for (let n = 0; n < count; n++) {
    if ((budgets[selected] || 0) <= 0) break;
    const px = (x - half) + rng.int(half * 2);
    const i = 4 * COLS + px;
    if (grid[i] !== 0) continue;
    grid[i] = selected;
    shade[i] = 100 + rng.int(50);
    budgets[selected] -= 1;
    got += 1;
  }
  return got;
}

function physics() {
  const moved = fallStep(grid, rng, true) + fallStep(grid, rng, false);
  if (moved > 0) {
    still = 0;
    settled = false;
  } else {
    still += 1;
    if (still > 16) settled = true;
  }
  return moved;
}

function allSpent() {
  return colors.every((color) => (budgets[color] || 0) <= 0);
}

function seal() {
  if (sealed || !settled || overlaysOpen()) return;
  sealed = true;
  pouring = false;
  match = matchPercent(grid, prepared.grid);
  const leftover = colors.reduce((sum, color) => sum + (budgets[color] || 0), 0);
  const gained = Math.round(match * 10) * 10 + Math.round(leftover / 5) + (ghostUsed ? 0 : 200);
  score = levelStartScore + gained;
  const pct = Math.round(match * 100);
  blip(match >= 0.75 ? 620 : 180, 0.12);
  if (match >= 0.75) {
    const last = levelNum >= LEVELS.length;
    document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'SEALED';
    document.getElementById('winScore').textContent = `${pct}%  ·  Score ${score}`;
    document.getElementById('nextBtn').classList.toggle('hidden', last);
    document.getElementById('againBtn').classList.toggle('hidden', !last);
    winEl.classList.remove('hidden');
  } else {
    document.getElementById('finalScore').textContent = `${pct}% match  ·  Score ${levelStartScore}`;
    overEl.classList.remove('hidden');
    document.getElementById('retryLevelBtn').focus();
  }
}

function update() {
  if (!started || overlaysOpen() || sealed) {
    if (hiss) hiss.gain.value = 0;
    return;
  }
  const pouringNow = pouring || keys.has(' ');
  if (pouringNow && (budgets[selected] || 0) > 0) {
    const got = emit(8);
    if (got) {
      try { ensureHiss().gain.value = 0.03; } catch { /* ignore */ }
    }
  } else if (hiss) hiss.gain.value = 0;
  physics();
  match = matchPercent(grid, prepared.grid);
  if (settled && allSpent()) seal();
}

function layout() {
  const hud = Math.max(84, Math.min(110, H * 0.11));
  const bar = 92;
  const availH = H - hud - bar - 16;
  const availW = W - 48;
  const scale = Math.min(availW / COLS, availH / ROWS);
  const vw = COLS * scale;
  const vh = ROWS * scale;
  return { hud, scale, ox: (W - vw) / 2, oy: hud + (availH - vh) / 2, vw, vh };
}

function roundRect(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function chunkText(text, x, y, size, fill, stroke = '#2a160f') {
  ctx.font = `700 ${Math.round(size)}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function render() {
  if (!prepared) return;
  view = layout();
  const dpr = canvas.width / W;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3a2a40');
  sky.addColorStop(1, '#241826');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(view.ox + view.vw / 2, view.oy + view.vh * 0.45, 20, view.ox + view.vw / 2, view.oy + view.vh * 0.4, view.vh * 0.7);
  glow.addColorStop(0, 'rgba(255, 214, 160, .18)');
  glow.addColorStop(1, 'rgba(255, 214, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hudY = Math.max(36, view.hud * 0.42);
  roundRect(W / 2 - 54, hudY - 18, 108, 36, 14);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(`Lv ${levelNum}`, W / 2, hudY, 22, '#fff6ea');
  const scoreLabel = String(score);
  ctx.font = `700 26px ${FONT}`;
  const scoreW = Math.max(70, ctx.measureText(scoreLabel).width + 24);
  roundRect(W - 16 - scoreW, hudY - 18, scoreW, 36, 14);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(scoreLabel, W - 16 - scoreW / 2, hudY, 24, '#fff4c2');
  const pct = `${Math.round(match * 100)}%`;
  chunkText(pct, 54, hudY, 26, '#fff6ea');

  paintBuffer(sandCtx, sandCanvas, grid, shade, 255);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sandCanvas, view.ox, view.oy, view.vw, view.vh);
  if (ghost) {
    ctx.globalAlpha = 0.32;
    ctx.drawImage(ghostCanvas, view.ox, view.oy, view.vw, view.vh);
    ctx.globalAlpha = 1;
  }

  const thumb = 74;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ghostCanvas, W - thumb - 18, hudY + 28, thumb, thumb * (ROWS / COLS));
  ctx.strokeStyle = 'rgba(255,246,234,.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - thumb - 18, hudY + 28, thumb, thumb * (ROWS / COLS));

  for (const band of bands) {
    const y = view.oy + (band.y + 0.5) * view.scale;
    ctx.fillStyle = PALETTE[band.color].hex;
    ctx.fillRect(view.ox - 14, y - 3, 10, 6);
  }

  const hx = view.ox + hopper * view.scale;
  const hy = view.oy + 4 * view.scale - 18;
  ctx.fillStyle = PALETTE[selected].hex;
  ctx.beginPath();
  ctx.moveTo(hx - 16, hy - 16);
  ctx.lineTo(hx + 16, hy - 16);
  ctx.lineTo(hx + 5, hy + 6);
  ctx.lineTo(hx - 5, hy + 6);
  ctx.closePath();
  ctx.fill();

  swatches = [];
  const sw = Math.min(86, (W - 40) / colors.length);
  const sx0 = (W - sw * colors.length) / 2;
  const sy = H - 62;
  colors.forEach((color, index) => {
    const x = sx0 + index * sw + sw / 2;
    const selectedNow = color === selected;
    ctx.beginPath();
    ctx.arc(x, sy, selectedNow ? 24 : 20, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE[color].hex;
    ctx.fill();
    ctx.lineWidth = selectedNow ? 4 : 2;
    ctx.strokeStyle = '#fff6ea';
    ctx.stroke();
    const max = prepared.budgets[color] || 1;
    const left = budgets[color] || 0;
    roundRect(x - 22, sy + 28, 44, 8, 4);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fill();
    roundRect(x - 22, sy + 28, 44 * (left / max), 8, 4);
    ctx.fillStyle = '#fff6ea';
    ctx.fill();
    swatches.push({ color, x, y: sy, r: 28 });
  });

  sealBox = { x: W / 2 - 54, y: sy - 46, w: 108, h: 32 };
  roundRect(sealBox.x, sealBox.y, sealBox.w, sealBox.h, 12);
  ctx.fillStyle = settled && !sealed ? '#ffbf3c' : 'rgba(255,255,255,.16)';
  ctx.fill();
  chunkText('Seal', W / 2, sealBox.y + 16, 16, settled && !sealed ? '#3a2414' : '#fff6ea', settled && !sealed ? '#b58122' : '#2a160f');
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function setHopperFrom(x) {
  if (!view) return;
  hopper = Math.round((x - view.ox) / view.scale);
  const bottle = prepared.bottle;
  hopper = Math.max(bottle.openL + 2, Math.min(bottle.openR - 2, hopper));
}

function swatchAt(x, y) {
  return swatches.find((swatch) => Math.hypot(swatch.x - x, swatch.y - y) <= swatch.r);
}

function onDown(e) {
  if (!started || overlaysOpen() || sealed) return;
  audio();
  const p = pointerPos(e);
  const swatch = swatchAt(p.x, p.y);
  if (swatch) {
    selected = swatch.color;
    return;
  }
  if (sealBox && p.x >= sealBox.x && p.x <= sealBox.x + sealBox.w && p.y >= sealBox.y && p.y <= sealBox.y + sealBox.h) {
    if (settled) seal();
    return;
  }
  pointer = e.pointerId;
  setHopperFrom(p.x);
  pouring = true;
  e.preventDefault();
}

function onMove(e) {
  if (!started || overlaysOpen() || sealed) return;
  if (pointer !== e.pointerId && !pouring) {
    setHopperFrom(pointerPos(e).x);
    return;
  }
  if (pointer !== e.pointerId) return;
  setHopperFrom(pointerPos(e).x);
}

function onUp(e) {
  if (pointer !== e.pointerId) return;
  pointer = null;
  pouring = false;
}

function frame(now) {
  if (!frame.last) frame.last = now;
  frame.last = now;
  if (keys.has('arrowleft') || keys.has('a')) hopper -= 0.45;
  if (keys.has('arrowright') || keys.has('d')) hopper += 0.45;
  if (prepared) {
    const bottle = prepared.bottle;
    hopper = Math.max(bottle.openL + 2, Math.min(bottle.openR - 2, hopper));
  }
  update();
  render();
  requestAnimationFrame(frame);
}

document.getElementById('helpBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  helpEl.classList.remove('hidden');
  document.getElementById('helpClose').focus();
});
document.getElementById('helpClose').addEventListener('click', (e) => {
  e.stopPropagation();
  helpEl.classList.add('hidden');
});
helpEl.addEventListener('click', (e) => {
  if (e.target === helpEl) helpEl.classList.add('hidden');
});
document.getElementById('startBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  started = true;
  startEl.classList.add('hidden');
  startRun();
});
document.getElementById('retryLevelBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  restartLevel();
});
document.getElementById('retryBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  startRun();
});
document.getElementById('nextBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  loadLevel(levelNum + 1, score);
});
document.getElementById('replayBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  restartLevel();
});
document.getElementById('againBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  startRun();
});
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', () => { pointer = null; pouring = false; });
window.addEventListener('keydown', (e) => {
  if (!helpEl.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      helpEl.classList.add('hidden');
    }
    return;
  }
  if (!startEl.classList.contains('hidden')) {
    if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      document.getElementById('startBtn').click();
    }
    return;
  }
  if (!overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  const key = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) e.preventDefault();
  audio();
  keys.add(key);
  if (key === 'g' && !e.repeat) {
    ghost = !ghost;
    if (ghost) ghostUsed = true;
  }
  if (['1', '2', '3', '4'].includes(key)) {
    const color = colors[Number(key) - 1];
    if (color) selected = color;
  }
  if (key === 'enter' && !e.repeat) seal();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('resize', resize);
resize();
prepared = prepareLevel(LEVELS[0]);
loadLevel(1, 0);
window.__game = {
  get: () => ({
    level: levelNum,
    score,
    match,
    settled,
    sealed,
    budgets: { ...budgets },
    hopper,
    selected,
    phase: winEl.classList.contains('hidden') ? (overEl.classList.contains('hidden') ? 'play' : 'over') : 'win',
    started,
  }),
  pour(color, x, grains) {
    selected = color;
    hopper = x;
    let left = grains;
    while (left > 0) {
      const got = emit(Math.min(8, left));
      if (!got) break;
      left -= got;
      physics();
    }
    for (let i = 0; i < 40; i++) physics();
  },
  seal() { seal(); },
};
requestAnimationFrame(frame);
