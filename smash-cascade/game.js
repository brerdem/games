import {
  LEVELS,
  canFire,
  createState,
  crownsLeft,
  fire,
  makeLayout,
  step,
  trajectory,
} from './logic.js';

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
let layout = null;
let state = null;
let levelNum = 1;
let levelStartScore = 0;
let drag = null;
let acc = 0;
let actx = null;
let announced = '';

function audio() {
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function blip(freq, dur = 0.08, type = 'sine', gain = 0.05) {
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

function view() {
  const scale = Math.min(W / layout.w, H / layout.h);
  return { scale, ox: (W - layout.w * scale) / 2, oy: (H - layout.h * scale) / 2 };
}

function loadLevel(n, keepScore) {
  levelNum = n;
  levelStartScore = keepScore;
  if (!layout) layout = makeLayout(W, H);
  state = createState(n - 1, layout, keepScore);
  announced = '';
  acc = 0;
}

function startRun() {
  layout = makeLayout(W, H);
  loadLevel(1, 0);
}

function restartLevel() {
  loadLevel(levelNum, levelStartScore);
}

function showWin() {
  announced = 'win';
  const last = levelNum >= LEVELS.length;
  document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
  document.getElementById('winScore').textContent = `Score ${state.score}`;
  document.getElementById('nextBtn').classList.toggle('hidden', last);
  document.getElementById('againBtn').classList.toggle('hidden', !last);
  winEl.classList.remove('hidden');
  blip(523, 0.1);
  blip(659, 0.14);
}

function gameOver() {
  announced = 'over';
  document.getElementById('finalScore').textContent = `Score ${state.score}  ·  Lv ${levelNum}`;
  overEl.classList.remove('hidden');
  document.getElementById('retryLevelBtn').focus();
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

function chunkText(text, x, y, size, fill, stroke = '#3a2414') {
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

function drawBlock(block) {
  const { x, y, s, mat, hp } = block;
  const grad = ctx.createLinearGradient(x, y, x, y + s);
  grad.addColorStop(0, shiftColor(mat.color, 18));
  grad.addColorStop(1, shiftColor(mat.color, -16));
  ctx.fillStyle = grad;
  roundRect(x, y, s, s, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 30, 20, .35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  roundRect(x + 2, y + 2, s - 4, s - 4, 4);
  ctx.clip();
  if (mat.id === 'wood') {
    ctx.strokeStyle = 'rgba(120, 70, 20, .35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + s * 0.35);
    ctx.lineTo(x + s - 4, y + s * 0.35);
    ctx.moveTo(x + 4, y + s * 0.68);
    ctx.lineTo(x + s - 4, y + s * 0.68);
    ctx.stroke();
  } else if (mat.id === 'stone') {
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x + s * 0.2, y + s * 0.25, 3, 3);
    ctx.fillRect(x + s * 0.6, y + s * 0.55, 4, 3);
  } else if (mat.id === 'tnt') {
    ctx.fillStyle = '#fff4d0';
    ctx.fillRect(x + s * 0.28, y + 4, s * 0.18, s - 8);
    ctx.strokeStyle = '#3a2414';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.55, y + 6);
    ctx.lineTo(x + s * 0.75, y - 2);
    ctx.stroke();
  } else if (mat.id === 'crown') {
    ctx.fillStyle = '#fff8df';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, y + s * 0.22);
    ctx.lineTo(x + s * 0.62, y + s * 0.48);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.38, y + s * 0.48);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (hp < mat.hp) {
    ctx.fillStyle = 'rgba(80, 30, 20, .35)';
    ctx.fillRect(x + 4, y + s - 7, (s - 8) * (1 - hp / mat.hp), 3);
  }
}

function drawBody(body) {
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(body.angle || 0);
  if (body.kind === 'ball') {
    const grad = ctx.createRadialGradient(-2, -2, 2, 0, 0, body.r);
    grad.addColorStop(0, '#6d7682');
    grad.addColorStop(1, '#2b3138');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, body.r, 0, Math.PI * 2);
    ctx.fill();
  } else if (body.kind === 'block') {
    const s = body.r * 2;
    ctx.fillStyle = body.mat.color;
    ctx.fillRect(-body.r, -body.r, s, s);
  } else {
    ctx.fillStyle = body.mat?.color || '#ddd';
    ctx.beginPath();
    ctx.arc(0, 0, body.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCannon() {
  const { x, y } = layout.cannon;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#8a5a32';
  ctx.beginPath();
  ctx.arc(0, 8, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(state.angle);
  ctx.fillStyle = '#3c4652';
  roundRect(0, -8, 46, 16, 6);
  ctx.fill();
  if (state.phase === 'fly' && state.sinceFire < 0.08) {
    ctx.fillStyle = 'rgba(255, 220, 140, .9)';
    ctx.beginPath();
    ctx.arc(52, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  if (!layout || !state) return;
  const v = view();
  const dpr = canvas.width / W;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#8fd4fb');
  sky.addColorStop(1, '#f6e2c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(v.ox, v.oy);
  ctx.scale(v.scale, v.scale);
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.arc(layout.w * 0.2, layout.hud + 30, 70, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(layout.w * 0.78, layout.hud + 10, 90, Math.PI, 0);
  ctx.fill();

  const hudY = Math.max(42, layout.hud * 0.45);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  roundRect(layout.w / 2 - 58, hudY - 28, 116, 34, 14);
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fill();
  chunkText(`Lv ${levelNum}`, layout.w / 2, hudY - 11, 22, '#fff');
  const scoreLabel = String(state.score);
  ctx.font = `700 26px ${FONT}`;
  const scoreW = Math.max(72, ctx.measureText(scoreLabel).width + 26);
  roundRect(layout.w - 16 - scoreW, hudY - 24, scoreW, 40, 14);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fill();
  chunkText(scoreLabel, layout.w - 16 - scoreW / 2, hudY - 4, 26, '#fff4c2');
  for (let i = 0; i < Math.min(6, state.balls); i++) {
    ctx.fillStyle = '#2c333b';
    ctx.beginPath();
    ctx.arc(28 + i * 22, hudY - 4, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.shot > 0 && state.phase === 'fly') {
    chunkText(`This shot ${state.shot}`, layout.w / 2, hudY + 28, 16, '#fffaf2', '#6a3a16');
  }

  const shelf = layout.shelf;
  ctx.fillStyle = '#c9843e';
  roundRect(shelf.x, shelf.y, shelf.w, shelf.h, 4);
  ctx.fill();
  ctx.fillStyle = '#a8682c';
  ctx.fillRect(shelf.x, shelf.y + shelf.h - 4, shelf.w, 4);

  for (const block of state.blocks) drawBlock(block);
  drawCannon();

  if (state.phase === 'aim' || drag) {
    const points = trajectory(state, state.angle, state.power);
    ctx.fillStyle = 'rgba(40, 40, 50, .45)';
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const peg of layout.pegs) {
    ctx.fillStyle = 'rgba(40, 50, 70, .18)';
    ctx.beginPath();
    ctx.arc(peg.x + 1, peg.y + 2, peg.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = peg.flash > 0 ? '#ffe08a' : '#fffaf2';
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bucket of layout.buckets) {
    const color = bucket.kind === 'ball' ? '#ff8a3d' : bucket.mult === 5 ? '#7d5bd4' : bucket.mult === 2 ? '#3dae6a' : '#8d97a3';
    ctx.fillStyle = color;
    roundRect(bucket.x + 3, bucket.y + 6, bucket.w - 6, layout.h - bucket.y - 16, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    chunkText(bucket.kind === 'ball' ? '+BALL' : `×${bucket.mult}`, bucket.x + bucket.w / 2, bucket.y + 28, 13, '#fffaf2', '#2a241c');
  }

  for (const body of state.bodies) drawBody(body);
  for (const popup of state.popups) {
    ctx.globalAlpha = Math.max(0, popup.life);
    chunkText(popup.text, popup.x, popup.y, 20, '#fffaf2', '#6a3a16');
    ctx.globalAlpha = 1;
  }
  if (levelNum === 1 && started && state.phase === 'aim' && state.score === levelStartScore && state.balls === LEVELS[0].balls) {
    chunkText('Pull back, then release', layout.w / 2, layout.buckets[0].y - 22, 16, '#fffaf2', '#6a3a16');
  }
  ctx.restore();
}

function update(dt) {
  if (!started || !state) return;
  if (!helpEl.classList.contains('hidden') || !overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  acc += Math.min(0.05, dt);
  let guard = 0;
  while (acc >= 1 / 120 && guard++ < 8) {
    acc -= 1 / 120;
    const before = state.layout.pegs.reduce((sum, peg) => sum + peg.flash, 0);
    step(state, 1 / 120);
    const after = state.layout.pegs.reduce((sum, peg) => sum + peg.flash, 0);
    if (after > before) blip(520 + (state.bodies[0]?.y || 0) % 180, 0.04, 'sine', 0.03);
  }
  if (state.phase === 'win' && announced !== 'win') showWin();
  if (state.phase === 'over' && announced !== 'over') gameOver();
}

function worldPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const v = view();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const y = ((e.clientY - rect.top) / rect.height) * H;
  return { x: (x - v.ox) / v.scale, y: (y - v.oy) / v.scale };
}

function aimFrom(x, y) {
  const dx = layout.cannon.x - x;
  const dy = layout.cannon.y - y;
  let angle = Math.atan2(dy, dx);
  angle = Math.max(-1.35, Math.min(0.45, angle));
  const len = Math.hypot(dx, dy);
  const power = Math.max(0, Math.min(1, (len - 24) / 180));
  state.angle = angle;
  state.power = power;
  return len;
}

function onDown(e) {
  if (!started || !state || !canFire(state)) return;
  if (!startEl.classList.contains('hidden') || !helpEl.classList.contains('hidden')) return;
  audio();
  const p = worldPoint(e);
  drag = { id: e.pointerId, x: p.x, y: p.y };
  aimFrom(p.x, p.y);
  try { canvas.setPointerCapture(e.pointerId); } catch { /* released */ }
  e.preventDefault();
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const p = worldPoint(e);
  drag.x = p.x;
  drag.y = p.y;
  aimFrom(p.x, p.y);
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const len = aimFrom(drag.x, drag.y);
  drag = null;
  if (len > 18 && canFire(state)) {
    fire(state, state.angle, state.power);
    blip(180, 0.09, 'triangle', 0.05);
  }
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
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
  started = true;
  restartLevel();
});
document.getElementById('retryBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  started = true;
  startRun();
});
document.getElementById('nextBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  loadLevel(levelNum + 1, state.score);
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
canvas.addEventListener('pointercancel', () => { drag = null; });
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
  if (!state) return;
  audio();
  const big = e.shiftKey ? 0.18 : 0.04;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.angle = Math.max(-1.35, state.angle - (e.shiftKey ? 0.12 : 0.03));
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.angle = Math.min(0.45, state.angle + (e.shiftKey ? 0.12 : 0.03));
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.power = Math.min(1, state.power + big);
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.power = Math.max(0.05, state.power - big);
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && canFire(state)) {
    fire(state, state.angle, state.power);
    blip(180, 0.09, 'triangle', 0.05);
  }
});
window.addEventListener('resize', resize);
resize();
layout = makeLayout(Math.max(W, 2), Math.max(H, 2));
state = createState(0, layout, 0);
window.__game = {
  get: () => ({
    phase: state.phase,
    level: levelNum,
    score: state.score,
    balls: state.balls,
    crowns: crownsLeft(state),
    angle: state.angle,
    power: state.power,
    blocks: state.blocks.length,
    bodies: state.bodies.length,
    started,
  }),
  fire(angle, power) {
    started = true;
    startEl.classList.add('hidden');
    return fire(state, angle, power);
  },
  step(frames) {
    for (let i = 0; i < frames; i++) step(state, 1 / 120);
  },
};
requestAnimationFrame(frame);
