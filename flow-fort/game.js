import { COLORS, LEVELS, resolveLane } from './logic.js';

const FONT = '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');

let W = 800;
let H = 900;
let started = false;
let levelNum = 1;
let level = LEVELS[0];
let levelStartScore = 0;
let cells = [];
let deck = [];
let bench = [];
let rail = [];
let hearts = 3;
let score = 0;
let advanceT = 0;
let marching = false;
let dropT = 0;
let shake = 0;
let flash = 0;
let toast = '';
let toastT = 0;
let particles = [];
let bullets = [];
let targets = [];
let sel = { kind: 'deck', index: 0 };
let hold = null;
let previewColor = null;
let geom = null;
let uid = 1;
let actx = null;

function audio() {
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function blip(freq, dur = 0.08, type = 'square', gain = 0.04) {
  try {
    const ac = audio();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain, t);
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

function freshBoard(keepScore) {
  level = LEVELS[levelNum - 1];
  levelStartScore = keepScore;
  cells = level.cells.map((cell) => ({ ...cell }));
  deck = level.deck.map((col) => col.map((gunner) => ({ ...gunner })));
  bench = [null, null, null, null, null];
  rail = [];
  hearts = 3;
  score = keepScore;
  advanceT = 0;
  marching = levelNum !== 1;
  dropT = 0;
  shake = 0;
  flash = 0;
  toast = '';
  particles = [];
  bullets = [];
  sel = { kind: 'deck', index: 0 };
  uid = 1;
}

function loadLevel(n, keepScore) {
  levelNum = n;
  freshBoard(keepScore);
}

function startRun() {
  loadLevel(1, 0);
}

function restartLevel() {
  loadLevel(levelNum, levelStartScore);
}

function overlaysOpen() {
  return !helpEl.classList.contains('hidden')
    || !startEl.classList.contains('hidden')
    || !overEl.classList.contains('hidden')
    || !winEl.classList.contains('hidden');
}

function showWin() {
  const empty = bench.filter((slot) => !slot).length;
  score += 100 * hearts + 50 * empty;
  const last = levelNum >= LEVELS.length;
  document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
  document.getElementById('winScore').textContent = `Score ${score}`;
  document.getElementById('nextBtn').classList.toggle('hidden', last);
  document.getElementById('againBtn').classList.toggle('hidden', !last);
  winEl.classList.remove('hidden');
  blip(523, 0.1, 'sine', 0.05);
  blip(784, 0.14, 'sine', 0.05);
}

function gameOver(reason) {
  const title = reason === 'empty' ? 'OUT OF GUNNERS' : reason === 'jam' ? 'JAMMED' : 'BROKE THROUGH';
  document.getElementById('overTitle').textContent = title;
  document.getElementById('finalScore').textContent = `Score ${score}  ·  Lv ${levelNum}`;
  overEl.classList.remove('hidden');
  document.getElementById('retryLevelBtn').focus();
}

function perimUnits() {
  return 2 * (level.cols + level.rows);
}

function markers() {
  const rows = level.rows;
  const cols = level.cols;
  const left = rows;
  const top = cols;
  const marks = [];
  for (let r = rows - 1; r >= 0; r--) marks.push({ side: 'left', index: r, dist: rows - r - 0.5 });
  for (let c = 0; c < cols; c++) marks.push({ side: 'top', index: c, dist: left + c + 0.5 });
  for (let r = 0; r < rows; r++) marks.push({ side: 'right', index: r, dist: left + top + r + 0.5 });
  for (let c = cols - 1; c >= 0; c--) marks.push({ side: 'bottom', index: c, dist: left * 2 + top + (cols - c - 0.5) });
  return marks;
}

function pointAt(unit) {
  const rows = level.rows;
  const cols = level.cols;
  const cell = geom.cell;
  const gap = geom.gap;
  let d = unit;
  if (d < rows) return { x: geom.gx - gap, y: geom.gy + (rows - d) * cell, rot: 0, travel: -Math.PI / 2 };
  d -= rows;
  if (d < cols) return { x: geom.gx + d * cell, y: geom.gy - gap, rot: Math.PI / 2, travel: 0 };
  d -= cols;
  if (d < rows) return { x: geom.gx + cols * cell + gap, y: geom.gy + d * cell, rot: Math.PI, travel: Math.PI / 2 };
  d -= rows;
  return { x: geom.gx + (cols - d) * cell, y: geom.gy + rows * cell + gap, rot: -Math.PI / 2, travel: Math.PI };
}

function burst(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(a) * 90,
      vy: Math.sin(a) * 90 - 20,
      life: 0.45,
      max: 0.45,
      color,
      s: 4 + Math.random() * 3,
    });
  }
}

function layout() {
  const hud = Math.max(86, Math.min(116, H * 0.12));
  const deckH = Math.max(132, Math.min(168, H * 0.18));
  const benchH = 64;
  const margin = 18;
  const availW = W - margin * 2;
  const availH = H - hud - deckH - benchH - 28;
  const cell = Math.max(18, Math.floor(Math.min(availW / (level.cols + 2.4), availH / (level.rows + 2.4))));
  const gridW = cell * level.cols;
  const gridH = cell * level.rows;
  const gx = (W - gridW) / 2;
  const gy = hud + Math.max(8, (availH - gridH) / 2);
  return { hud, deckH, cell, gx, gy, gap: Math.max(26, cell * 0.72), gridW, gridH };
}

function noGunnersLeft() {
  return cells.length > 0 && rail.length === 0 && deck.every((col) => col.length === 0) && bench.every((slot) => !slot);
}

function checkEnd() {
  if (!overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  if (hearts <= 0) return;
  if (!cells.length) showWin();
  else if (noGunnersLeft()) gameOver('empty');
}

function loseHeart(reason) {
  hearts -= 1;
  shake = reason === 'jam' ? 8 : 5;
  flash = 0.25;
  if (reason === 'jam') blip(90, 0.18, 'sawtooth', 0.05);
  else blip(70, 0.16, 'triangle', 0.05);
  if (hearts <= 0) gameOver(reason);
}

function finishLap(gunner) {
  rail = rail.filter((item) => item !== gunner);
  if (gunner.ammo <= 0) return;
  const slot = bench.findIndex((item) => !item);
  if (slot < 0) {
    burst(geom.gx, geom.gy + geom.gridH + geom.gap, COLORS[gunner.color], 12);
    loseHeart('jam');
    return;
  }
  bench[slot] = { color: gunner.color, ammo: gunner.ammo };
}

function advance() {
  const doomed = cells.filter((cell) => cell.r >= level.rows - 1);
  cells = cells.filter((cell) => cell.r < level.rows - 1);
  for (const cell of cells) cell.r += 1;
  dropT = 0.12;
  blip(55, 0.12, 'sine', 0.04);
  if (doomed.length) {
    burst(geom.gx + geom.gridW / 2, geom.gy + geom.gridH, '#ff5d6c', 10);
    loseHeart('breach');
  }
}

function launch(where, index) {
  if (!started || overlaysOpen()) return;
  if (rail.length >= level.cap) {
    toast = 'Rail full';
    toastT = 1.1;
    blip(140, 0.08, 'square', 0.03);
    return;
  }
  let gunner = null;
  if (where === 'deck') {
    if (!deck[index]?.length) return;
    gunner = deck[index].shift();
  } else {
    gunner = bench[index];
    if (!gunner) return;
    bench[index] = null;
  }
  rail.push({ id: uid++, color: gunner.color, ammo: gunner.ammo, dist: 0, seen: new Set() });
  marching = true;
  blip(320, 0.05, 'square', 0.03);
  sel = { kind: where, index };
}

function updateRail(dt) {
  const speed = perimUnits() / 6.4;
  const marks = markers();
  const limit = perimUnits();
  for (const gunner of [...rail]) {
    if (!rail.includes(gunner)) continue;
    const prev = gunner.dist;
    gunner.dist += speed * dt;
    for (const mark of marks) {
      if (mark.dist <= prev || mark.dist > gunner.dist) continue;
      const key = `${mark.side}:${mark.index}`;
      if (gunner.seen.has(key) || gunner.ammo <= 0) continue;
      gunner.seen.add(key);
      const result = resolveLane(cells, mark.side, mark.index, gunner.color);
      if (result.kind !== 'hit') continue;
      gunner.ammo -= 1;
      score += 10;
      const spot = pointAt(mark.dist);
      const cellX = geom.gx + result.cell.c * geom.cell + geom.cell / 2;
      const cellY = geom.gy + result.cell.r * geom.cell + geom.cell / 2 - (dropT > 0 ? geom.cell * (dropT / 0.12) : 0);
      bullets.push({ x: spot.x, y: spot.y, tx: cellX, ty: cellY, t: 0, color: COLORS[gunner.color] });
      if (result.removed) burst(cellX, cellY, COLORS[gunner.color]);
      blip(480 + (gunner.color.charCodeAt(0) % 5) * 40, 0.05, 'square', 0.035);
      if (gunner.ammo <= 0) {
        burst(spot.x, spot.y, COLORS[gunner.color], 10);
        rail = rail.filter((item) => item !== gunner);
        break;
      }
    }
    if (rail.includes(gunner) && gunner.dist >= limit) finishLap(gunner);
  }
}

function update(dt) {
  shake = Math.max(0, shake - dt * 26);
  flash = Math.max(0, flash - dt);
  toastT = Math.max(0, toastT - dt);
  dropT = Math.max(0, dropT - dt);
  for (const bit of particles) {
    bit.life -= dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.vy += 80 * dt;
  }
  particles = particles.filter((bit) => bit.life > 0);
  for (const bullet of bullets) bullet.t += dt;
  bullets = bullets.filter((bullet) => bullet.t < 0.08);
  if (!started || overlaysOpen() || !overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  if (!winEl.classList.contains('hidden')) return;
  updateRail(dt);
  if (marching && cells.length && hearts > 0 && winEl.classList.contains('hidden') && overEl.classList.contains('hidden')) {
    advanceT += dt;
    if (advanceT >= level.advanceSec) {
      advanceT = 0;
      advance();
    }
  }
  checkEnd();
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

function chunkText(text, x, y, size, fill, stroke = '#1a120e') {
  ctx.font = `700 ${Math.round(size)}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function shiftColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amt));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function drawHeart(x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -3, -6, -13, 0, -6);
  ctx.bezierCurveTo(6, -13, 11, -3, 0, 5);
  ctx.fillStyle = filled ? '#ff5d6c' : 'rgba(255,255,255,.25)';
  ctx.fill();
  ctx.restore();
}

function drawGunner(x, y, color, ammo, rot, radius, selected) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8,10,20,.28)';
  ctx.beginPath();
  ctx.arc(1, 3, radius, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createLinearGradient(0, -radius, 0, radius);
  grad.addColorStop(0, shiftColor(color, 18));
  grad.addColorStop(1, shiftColor(color, -18));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#fffaf3' : '#241820';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();
  ctx.rotate(rot);
  ctx.fillStyle = '#241820';
  ctx.fillRect(radius * 0.15, -3.5, radius * 0.85, 7);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chunkText(String(ammo), x, y + 1, Math.max(12, radius * 0.85), '#fffaf3');
}

function render() {
  geom = layout();
  const g = geom;
  const dpr = canvas.width / W;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = flash > 0 ? '#4a2430' : '#141a2e';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hudY = Math.max(40, g.hud * 0.42);
  roundRect(W / 2 - 54, hudY - 20, 108, 36, 14);
  ctx.fillStyle = 'rgba(255,250,243,.9)';
  ctx.fill();
  chunkText(`Lv ${levelNum}`, W / 2, hudY - 2, 22, '#fffaf3');
  const scoreLabel = String(score);
  ctx.font = `700 26px ${FONT}`;
  const scoreW = Math.max(70, ctx.measureText(scoreLabel).width + 26);
  roundRect(W - 16 - scoreW, hudY - 20, scoreW, 40, 14);
  ctx.fillStyle = 'rgba(255,250,243,.9)';
  ctx.fill();
  chunkText(scoreLabel, W - 16 - scoreW / 2, hudY, 24, '#fff4c2');
  for (let i = 0; i < 3; i++) drawHeart(32 + i * 32, hudY, i < hearts);
  const barW = Math.min(220, W * 0.28);
  const barX = W / 2 - barW / 2;
  const barY = hudY + 28;
  roundRect(barX, barY, barW, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fill();
  const ratio = marching ? Math.min(1, advanceT / level.advanceSec) : 0;
  roundRect(barX, barY, Math.max(8, barW * ratio), 12, 6);
  ctx.fillStyle = ratio > 0.8 ? '#ff5d6c' : '#ffd23f';
  ctx.fill();

  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.015)';
      ctx.fillRect(g.gx + c * g.cell, g.gy + r * g.cell, g.cell, g.cell);
    }
  }

  const drop = dropT > 0 ? g.cell * (dropT / 0.12) : 0;
  for (const cell of cells) {
    const x = g.gx + cell.c * g.cell + 3;
    const y = g.gy + cell.r * g.cell + 3 - drop;
    const s = g.cell - 6;
    const grad = ctx.createLinearGradient(x, y, x, y + s);
    grad.addColorStop(0, shiftColor(COLORS[cell.color], 16));
    grad.addColorStop(1, shiftColor(COLORS[cell.color], -14));
    ctx.fillStyle = grad;
    roundRect(x, y, s, s, 6);
    ctx.fill();
  }

  ctx.strokeStyle = '#2a3348';
  ctx.lineWidth = Math.max(10, g.cell * 0.28);
  ctx.lineJoin = 'round';
  ctx.strokeRect(g.gx - g.gap, g.gy - g.gap, g.gridW + g.gap * 2, g.gridH + g.gap * 2);
  const chevT = (performance.now() / 700) % 1;
  ctx.fillStyle = 'rgba(255, 214, 120, .8)';
  for (let i = 0; i < 10; i++) {
    const spot = pointAt(((i + chevT) / 10) * perimUnits());
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.travel);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-5, -5);
    ctx.fill();
    ctx.restore();
  }

  if (previewColor) {
    ctx.save();
    ctx.strokeStyle = COLORS[previewColor];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 6]);
    for (const mark of markers()) {
      const first = cells.filter((cell) => cell.hp > 0 && ((mark.side === 'left' || mark.side === 'right') ? cell.r === mark.index : cell.c === mark.index))
        .sort((a, b) => {
          if (mark.side === 'left') return a.c - b.c;
          if (mark.side === 'right') return b.c - a.c;
          if (mark.side === 'top') return a.r - b.r;
          return b.r - a.r;
        })[0];
      if (!first || first.color !== previewColor) continue;
      const spot = pointAt(mark.dist);
      const cx = g.gx + first.c * g.cell + g.cell / 2;
      const cy = g.gy + first.r * g.cell + g.cell / 2;
      ctx.beginPath();
      ctx.moveTo(spot.x, spot.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const gunner of rail) {
    const spot = pointAt(Math.min(gunner.dist, perimUnits() - 0.01));
    drawGunner(spot.x, spot.y, COLORS[gunner.color], gunner.ammo, spot.rot, Math.max(14, g.cell * 0.34), false);
  }
  for (const bullet of bullets) {
    const u = bullet.t / 0.08;
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x + (bullet.tx - bullet.x) * u, bullet.y + (bullet.ty - bullet.y) * u, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const wallY = g.gy + g.gridH + g.gap + Math.max(18, g.cell * 0.42);
  ctx.fillStyle = '#c9b38f';
  for (let i = 0; i < 8; i++) {
    const bw = g.gridW / 8;
    const tall = i % 2 === 0 ? 10 : 4;
    ctx.fillRect(g.gx + i * bw, wallY, bw - 3, 14 + tall);
  }
  ctx.fillStyle = 'rgba(60,40,30,.45)';
  for (let i = 0; i < 3 - hearts; i++) {
    ctx.fillRect(g.gx + 18 + i * 28, wallY + 8, 16, 3);
  }

  targets = [];
  const benchY = H - g.deckH - 36;
  const slotW = Math.min(78, (W - 40) / 5);
  const benchX0 = (W - slotW * 5) / 2;
  for (let i = 0; i < 5; i++) {
    const x = benchX0 + i * slotW + slotW / 2;
    roundRect(x - 24, benchY - 24, 48, 48, 12);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fill();
    const gunner = bench[i];
    const selected = sel.kind === 'bench' && sel.index === i;
    if (gunner) {
      drawGunner(x, benchY, COLORS[gunner.color], gunner.ammo, -Math.PI / 2, 20, selected);
      targets.push({ kind: 'bench', index: i, x, y: benchY, r: 28 });
    }
  }

  const colW = Math.min(120, (W - 48) / deck.length);
  const deckX0 = (W - colW * deck.length) / 2;
  deck.forEach((col, index) => {
    const x = deckX0 + index * colW + colW / 2;
    const shown = col.slice(0, 4);
    let frontY = H - 46;
    for (let depth = shown.length - 1; depth >= 0; depth--) {
      const y = H - 46 - (shown.length - 1 - depth) * 42;
      if (depth === 0) frontY = y;
      const selected = depth === 0 && sel.kind === 'deck' && sel.index === index;
      drawGunner(x, y, COLORS[shown[depth].color], shown[depth].ammo, -Math.PI / 2, depth === 0 ? 28 : 16, selected);
    }
    if (shown[0]) targets.push({ kind: 'deck', index, x, y: frontY, r: 32 });
  });

  for (let i = 0; i < level.cap; i++) {
    ctx.beginPath();
    ctx.arc(28 + i * 16, g.gy + g.gridH / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < rail.length ? '#ffd23f' : 'rgba(255,255,255,.25)';
    ctx.fill();
  }
  if (toastT > 0) chunkText(toast, W / 2, g.gy - g.gap - 28, 20, '#fffaf3');
  for (const bit of particles) {
    ctx.globalAlpha = Math.max(0, bit.life / bit.max);
    ctx.fillStyle = bit.color;
    ctx.fillRect(bit.x, bit.y, bit.s, bit.s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function hitTarget(x, y) {
  return targets.find((target) => Math.hypot(target.x - x, target.y - y) <= target.r) || null;
}

function onDown(e) {
  if (!started || overlaysOpen()) return;
  audio();
  const p = pointerPos(e);
  const target = hitTarget(p.x, p.y);
  if (!target) return;
  hold = { id: e.pointerId, target, x: p.x, y: p.y, t: performance.now() };
  try { canvas.setPointerCapture(e.pointerId); } catch { /* released */ }
  e.preventDefault();
}

function onMove(e) {
  if (!hold || e.pointerId !== hold.id) return;
  const p = pointerPos(e);
  hold.x = p.x;
  hold.y = p.y;
  if (performance.now() - hold.t > 250) {
    const gunner = hold.target.kind === 'deck' ? deck[hold.target.index]?.[0] : bench[hold.target.index];
    previewColor = gunner?.color || null;
  }
}

function onUp(e) {
  if (!hold || e.pointerId !== hold.id) return;
  const p = pointerPos(e);
  const still = hitTarget(p.x, p.y);
  const same = still && still.kind === hold.target.kind && still.index === hold.target.index;
  const target = hold.target;
  hold = null;
  previewColor = null;
  if (same) launch(target.kind, target.index);
}

function syncPreview() {
  if (!(hold && performance.now() - hold.t > 250)) {
    previewColor = null;
    return;
  }
  const gunner = hold.target.kind === 'deck' ? deck[hold.target.index]?.[0] : bench[hold.target.index];
  previewColor = gunner?.color || null;
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
  if (started) syncPreview();
  update(dt);
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
canvas.addEventListener('pointercancel', () => { hold = null; });
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
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  audio();
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    sel.index = Math.max(0, sel.index - 1);
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    const max = sel.kind === 'deck' ? deck.length - 1 : 4;
    sel.index = Math.min(max, sel.index + 1);
  }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') sel = { kind: 'bench', index: Math.min(sel.index, 4) };
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') sel = { kind: 'deck', index: Math.min(sel.index, deck.length - 1) };
  if (e.key === 'Enter' || e.key === ' ') launch(sel.kind, sel.index);
  if (['1', '2', '3', '4'].includes(e.key)) launch('deck', Number(e.key) - 1);
  const benchKey = { q: 0, w: 1, e: 2, r: 3, t: 4 }[e.key.toLowerCase()];
  if (benchKey != null) launch('bench', benchKey);
});
window.addEventListener('resize', resize);
resize();
freshBoard(0);
window.__game = {
  get: () => ({
    level: levelNum,
    score,
    hearts,
    cells: cells.length,
    rail: rail.length,
    bench: bench.filter(Boolean).length,
    deck: deck.map((col) => col.map((gunner) => gunner.color + gunner.ammo)),
    phase: overEl.classList.contains('hidden') ? (winEl.classList.contains('hidden') ? 'play' : 'win') : 'over',
    started,
  }),
  launch(index) { launch('deck', index); },
  bench(index) { launch('bench', index); },
};
requestAnimationFrame(frame);
