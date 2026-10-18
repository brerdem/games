import {
  LEVELS,
  SECTOR,
  applyAction,
  clearBonus,
  freshState,
  launchResult,
  mod,
  solve,
} from './logic.js';

const FONT = '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';
const PIN = { neutral: '#f4f1ea', coral: '#ff7a6b', teal: '#3ecfb2', gold: '#ffc94d' };
const RING = ['#8eb6ff', '#f3a4c8', '#8fd0b4', '#f0d08a'];

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
let phase = 'idle';
let levelNum = 1;
let level = LEVELS[0];
let levelStartScore = 0;
let state = freshState(level, 0);
let display = state.rot.slice();
let selectedRing = 0;
let selectedPin = state.pins[0]?.id ?? 0;
let anim = null;
let pointer = null;
let particles = [];
let shake = 0;
let geom = null;
let actx = null;

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

function pack(next) {
  return {
    rot: next.rot.slice(),
    pins: next.pins.map((pin) => ({ ...pin })),
    moves: next.moves,
    hearts: next.hearts,
    score: next.score,
    combo: next.combo,
  };
}

function loadLevel(n, keepScore) {
  levelNum = n;
  level = LEVELS[n - 1];
  levelStartScore = keepScore;
  state = freshState(level, keepScore);
  display = state.rot.slice();
  selectedRing = 0;
  selectedPin = state.pins[0]?.id ?? 0;
  anim = null;
  pointer = null;
  particles = [];
  shake = 0;
  phase = 'idle';
}

function startRun() {
  loadLevel(1, 0);
}

function restartLevel() {
  loadLevel(levelNum, levelStartScore);
}

function showWin() {
  phase = 'win';
  state = { ...state, score: state.score + clearBonus(state) };
  const last = levelNum >= LEVELS.length;
  document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
  document.getElementById('winScore').textContent = `Score ${state.score}`;
  document.getElementById('nextBtn').classList.toggle('hidden', last);
  document.getElementById('againBtn').classList.toggle('hidden', !last);
  winEl.classList.remove('hidden');
  blip(523, 0.1);
  blip(659, 0.12);
  blip(784, 0.16);
}

function gameOver(reason) {
  phase = 'over';
  document.getElementById('overTitle').textContent = reason === 'moves' ? 'OUT OF MOVES' : 'OUT OF HEARTS';
  document.getElementById('finalScore').textContent = `Score ${state.score}  ·  Lv ${levelNum}`;
  overEl.classList.remove('hidden');
  document.getElementById('retryLevelBtn').focus();
}

function ensureSelection() {
  if (state.pins.some((pin) => pin.id === selectedPin)) return;
  const onRing = state.pins.find((pin) => pin.ring === selectedRing);
  selectedPin = (onRing || state.pins[0])?.id ?? 0;
  if (onRing) selectedRing = onRing.ring;
}

function finishAnim() {
  const end = anim?.end;
  if (anim?.type === 'rot') display[anim.ring] = anim.to;
  anim = null;
  ensureSelection();
  if (end === 'win') showWin();
  else if (end) gameOver(end);
  else phase = 'idle';
}

function rotate(ring, steps, animate) {
  if (phase !== 'idle' || !steps) return;
  const dir = Math.sign(steps);
  const count = Math.min(Math.abs(steps), state.moves);
  if (!count) return;
  let next = state;
  for (let i = 0; i < count; i++) next = applyAction(level, next, { type: 'rot', ring, dir });
  state = pack(next);
  blip(240 + ring * 50, 0.05, 'square', 0.03);
  if (!animate) {
    ensureSelection();
    if (next.end === 'win') showWin();
    else if (next.end) gameOver(next.end);
    return;
  }
  const from = display[ring];
  phase = 'anim';
  anim = { type: 'rot', ring, from, to: from + dir * count, t: 0, dur: 0.12 + count * 0.04, end: next.end };
}

function launch(id) {
  if (phase !== 'idle') return;
  const pin = state.pins.find((item) => item.id === id);
  if (!pin) return;
  selectedPin = id;
  selectedRing = pin.ring;
  const result = launchResult(level, state.rot, state.pins, pin);
  const next = applyAction(level, state, { type: 'launch', id });
  state = pack(next);
  phase = 'anim';
  anim = {
    type: result.ok ? 'out' : 'bump',
    pin: { ...pin },
    blockRing: result.ring ?? level.rings.length,
    t: 0,
    dur: result.ok ? 0.34 : 0.38,
    end: next.end,
  };
  if (!result.ok) {
    shake = 7;
    blip(90, 0.12, 'triangle', 0.06);
  } else {
    blip(520 + pin.ring * 40, 0.1, 'sine', 0.05);
    const spot = pinPoint(pin, display[pin.ring]);
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: spot.x,
        y: spot.y,
        vx: Math.cos(angle) * 90,
        vy: Math.sin(angle) * 90,
        life: 0.4,
        max: 0.4,
        color: PIN[pin.color] || PIN.neutral,
      });
    }
  }
}

function layout() {
  const hud = Math.max(96, Math.min(128, H * 0.14));
  const avail = Math.min(W - 36, H - hud - 28);
  const maxR = avail / 2;
  const count = level.rings.length;
  const band = maxR / (count + 0.55);
  return {
    hud,
    cx: W / 2,
    cy: hud + (H - hud) / 2 + 6,
    band,
    core: band * 0.7,
    maxR,
  };
}

function ringSpan(i, g = geom) {
  const inner = g.core + i * g.band;
  const outer = inner + g.band * 0.8;
  return { inner, outer, mid: (inner + outer) / 2, width: outer - inner };
}

function pinPoint(pin, rotSteps) {
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + rotSteps + 0.5) * SECTOR;
  return {
    x: geom.cx + Math.cos(angle) * span.mid,
    y: geom.cy + Math.sin(angle) * span.mid,
    angle,
  };
}

function shownRot() {
  return display.map((value) => mod(Math.round(value)));
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
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

function chunkText(text, x, y, size, fill, stroke = '#14203a') {
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

function wallRuns(gaps) {
  const wall = Array.from({ length: 12 }, (_, i) => !gaps.includes(i));
  if (wall.every(Boolean)) return [[0, 12]];
  const runs = [];
  let i = 0;
  while (i < 12) {
    if (!wall[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < 12 && wall[j]) j += 1;
    runs.push([i, j]);
    i = j;
  }
  if (wall[0] && wall[11] && runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === 12) {
    const last = runs.pop();
    runs[0] = [last[0] - 12, runs[0][1]];
  }
  return runs;
}

function drawHeart(x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-12, -4, -7, -14, 0, -7);
  ctx.bezierCurveTo(7, -14, 12, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,255,255,.28)';
  ctx.fill();
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath();
    ctx.ellipse(-3, -5, 2.2, 1.4, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRing(index) {
  const span = ringSpan(index);
  const color = RING[index % RING.length];
  const rot = display[index] * SECTOR;
  const inset = Math.min(0.12, (span.width * 0.45) / span.mid);
  ctx.save();
  ctx.translate(geom.cx, geom.cy);
  ctx.rotate(rot);
  ctx.lineCap = 'round';
  for (const [a, b] of wallRuns(level.rings[index].gaps)) {
    const start = -Math.PI / 2 + a * SECTOR + inset;
    const end = -Math.PI / 2 + b * SECTOR - inset;
    ctx.strokeStyle = 'rgba(8, 12, 28, .28)';
    ctx.lineWidth = span.width;
    ctx.beginPath();
    ctx.arc(0, 3, span.mid, start, end);
    ctx.stroke();
    ctx.strokeStyle = selectedRing === index ? shiftColor(color, 18) : color;
    ctx.lineWidth = span.width * 0.86;
    ctx.beginPath();
    ctx.arc(0, 0, span.mid, start, end);
    ctx.stroke();
  }
  const ring = level.rings[index];
  if (ring.gates) {
    for (const gap of ring.gaps) {
      const gate = ring.gates[gap] ?? ring.gates[String(gap)];
      if (!gate) continue;
      const angle = -Math.PI / 2 + (gap + 0.5) * SECTOR;
      const gem = span.mid;
      ctx.fillStyle = PIN[gate];
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * gem, Math.sin(angle) * gem, Math.max(7, span.width * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 16, 40, .45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPin(pin, rotSteps, ghost = 1) {
  const spot = pinPoint(pin, rotSteps);
  const len = Math.max(16, geom.band * 0.28);
  ctx.save();
  ctx.translate(spot.x, spot.y);
  ctx.rotate(spot.angle);
  ctx.globalAlpha = ghost;
  ctx.fillStyle = 'rgba(10, 14, 28, .28)';
  ctx.beginPath();
  ctx.moveTo(len, 2);
  ctx.lineTo(-len * 0.55, len * 0.48);
  ctx.lineTo(-len * 0.55, -len * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PIN[pin.color] || PIN.neutral;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(-len * 0.62, len * 0.46);
  ctx.lineTo(-len * 0.62, -len * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1b2438';
  ctx.stroke();
  if (pin.id === selectedPin && phase === 'idle') {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLane(pin) {
  const rot = shownRot();
  const result = launchResult(level, rot, state.pins, pin);
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + display[pin.ring] + 0.5) * SECTOR;
  const dist = result.ok ? geom.maxR + 16 : ringSpan(result.ring).inner;
  ctx.save();
  ctx.translate(geom.cx, geom.cy);
  ctx.rotate(angle);
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = result.ok ? 'rgba(126, 214, 164, .9)' : 'rgba(255, 122, 122, .92)';
  ctx.beginPath();
  ctx.moveTo(span.mid + Math.max(14, geom.band * 0.22), 0);
  ctx.lineTo(dist, 0);
  ctx.stroke();
  ctx.restore();
}

function animPinPoint() {
  const pin = anim.pin;
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + display[pin.ring] + 0.5) * SECTOR;
  const u = Math.min(1, anim.t / anim.dur);
  let dist = span.mid;
  if (anim.type === 'out') {
    const eased = 1 - (1 - u) ** 3;
    dist = span.mid + (geom.maxR + geom.band * 0.8 - span.mid) * eased;
  } else {
    const reach = ringSpan(anim.blockRing).inner + 2;
    const trip = u < 0.42 ? u / 0.42 : 1 - (u - 0.42) / 0.58;
    dist = span.mid + (reach - span.mid) * trip;
  }
  return {
    x: geom.cx + Math.cos(angle) * dist,
    y: geom.cy + Math.sin(angle) * dist,
    angle,
  };
}

function render() {
  geom = layout();
  const scale = canvas.width / W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const bg = ctx.createRadialGradient(geom.cx, geom.cy, 30, geom.cx, geom.cy, Math.max(W, H) * 0.72);
  bg.addColorStop(0, '#1c2a52');
  bg.addColorStop(1, '#0c1224');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  const hudY = Math.max(46, geom.hud * 0.38);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  roundRect(W / 2 - 58, hudY - 34, 116, 36, 16);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fill();
  chunkText(`Lv ${levelNum}`, W / 2, hudY - 16, 22, '#fff');
  const low = state.moves <= 1;
  roundRect(W / 2 - 70, hudY + 8, 140, 48, 18);
  ctx.fillStyle = low ? '#ffd5dc' : 'rgba(255,255,255,.9)';
  ctx.fill();
  chunkText(String(state.moves), W / 2, hudY + 30, 32, low ? '#ff2d4a' : '#fff');
  const scoreLabel = String(state.score);
  ctx.font = `700 28px ${FONT}`;
  const scoreW = Math.max(72, ctx.measureText(scoreLabel).width + 28);
  roundRect(W - 18 - scoreW, hudY - 22, scoreW, 44, 16);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fill();
  chunkText(scoreLabel, W - 18 - scoreW / 2, hudY, 28, '#fff4c8');
  for (let i = 0; i < 3; i++) drawHeart(36 + i * 34, hudY, i < state.hearts);

  const coreGrad = ctx.createRadialGradient(geom.cx, geom.cy - 6, 8, geom.cx, geom.cy, geom.core);
  coreGrad.addColorStop(0, '#ffe7ad');
  coreGrad.addColorStop(1, '#e0a24a');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(geom.cx, geom.cy, geom.core * 0.86, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < level.rings.length; i++) drawRing(i);
  if (phase === 'idle') {
    const pin = state.pins.find((item) => item.id === selectedPin);
    if (pin) drawLane(pin);
  }
  for (const pin of state.pins) {
    if (anim && (anim.type === 'out' || anim.type === 'bump') && anim.pin.id === pin.id) continue;
    drawPin(pin, display[pin.ring]);
  }
  if (anim && (anim.type === 'out' || anim.type === 'bump')) {
    const spot = animPinPoint();
    const pin = anim.pin;
    const len = Math.max(16, geom.band * 0.28);
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle);
    ctx.fillStyle = PIN[pin.color] || PIN.neutral;
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(-len * 0.62, len * 0.46);
    ctx.lineTo(-len * 0.62, -len * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1b2438';
    ctx.stroke();
    ctx.restore();
  }
  for (const bit of particles) {
    ctx.globalAlpha = Math.max(0, bit.life / bit.max);
    ctx.fillStyle = bit.color;
    ctx.beginPath();
    ctx.arc(bit.x, bit.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (levelNum === 1 && started && phase === 'idle') {
    ctx.textAlign = 'center';
    chunkText('Drag a ring, then tap a pin', W / 2, H - 28, 16, '#f4f7ff', '#1a2444');
  }
  ctx.restore();
}

function update(dt) {
  shake = Math.max(0, shake - dt * 30);
  for (const bit of particles) {
    bit.life -= dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
  }
  particles = particles.filter((bit) => bit.life > 0);
  if (!anim) return;
  anim.t += dt;
  if (anim.type === 'rot') {
    const u = Math.min(1, anim.t / anim.dur);
    const eased = 1 - (1 - u) ** 3;
    display[anim.ring] = anim.from + (anim.to - anim.from) * eased;
  }
  if (anim.t >= anim.dur) finishAnim();
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function hitPin(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const pin of state.pins) {
    const spot = pinPoint(pin, display[pin.ring]);
    const reach = Math.max(26, geom.band * 0.42);
    const dist = Math.hypot(x - spot.x, y - spot.y);
    if (dist <= reach && dist < bestD) {
      best = pin;
      bestD = dist;
    }
  }
  return best;
}

function hitRing(x, y) {
  const dist = Math.hypot(x - geom.cx, y - geom.cy);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < level.rings.length; i++) {
    const delta = Math.abs(dist - ringSpan(i).mid);
    if (delta <= Math.max(geom.band * 0.46, 24) && delta < bestD) {
      best = i;
      bestD = delta;
    }
  }
  return best;
}

function onDown(e) {
  if (!started || phase !== 'idle' || !startEl.classList.contains('hidden')) return;
  if (!helpEl.classList.contains('hidden') || !overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  audio();
  geom = layout();
  const p = pointerPos(e);
  const pin = hitPin(p.x, p.y);
  const ring = pin ? pin.ring : hitRing(p.x, p.y);
  if (!pin && ring < 0) return;
  if (pin) {
    selectedPin = pin.id;
    selectedRing = pin.ring;
  } else {
    selectedRing = ring;
  }
  pointer = {
    id: e.pointerId,
    x: p.x,
    y: p.y,
    t: performance.now(),
    pin: pin?.id ?? null,
    ring: ring,
    angle: Math.atan2(p.y - geom.cy, p.x - geom.cx),
    startDisplay: display[ring],
    steps: 0,
    moved: false,
  };
  try { canvas.setPointerCapture(e.pointerId); } catch { /* already released */ }
  e.preventDefault();
}

function onMove(e) {
  if (!pointer || e.pointerId !== pointer.id || pointer.ring < 0) return;
  const p = pointerPos(e);
  if (Math.hypot(p.x - pointer.x, p.y - pointer.y) > 8) pointer.moved = true;
  if (!pointer.moved && pointer.pin) return;
  let delta = Math.atan2(p.y - geom.cy, p.x - geom.cx) - pointer.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  let steps = Math.round(delta / SECTOR);
  steps = Math.max(-state.moves, Math.min(state.moves, steps));
  if (steps !== pointer.steps) {
    pointer.steps = steps;
    blip(210 + pointer.ring * 36, 0.035, 'square', 0.025);
  }
  display[pointer.ring] = pointer.startDisplay + steps;
}

function onUp(e) {
  if (!pointer || (e && e.pointerId !== pointer.id)) return;
  const elapsed = performance.now() - pointer.t;
  const tap = Boolean(pointer.pin) && !pointer.moved && elapsed < 280;
  const steps = pointer.steps;
  const ring = pointer.ring;
  const pin = pointer.pin;
  pointer = null;
  if (tap) launch(pin);
  else if (steps) rotate(ring, steps, false);
}

function selectRing(dir) {
  selectedRing = mod(selectedRing + dir, level.rings.length);
  const onRing = state.pins.find((pin) => pin.ring === selectedRing);
  if (onRing) selectedPin = onRing.id;
}

function cyclePin(dir) {
  const pins = state.pins.filter((pin) => pin.ring === selectedRing);
  const list = pins.length ? pins : state.pins;
  if (!list.length) return;
  const index = list.findIndex((pin) => pin.id === selectedPin);
  const next = list[mod((index < 0 ? 0 : index) + dir, list.length)];
  selectedPin = next.id;
  selectedRing = next.ring;
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
  if (started) update(dt);
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
canvas.addEventListener('pointercancel', onUp);

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
  if (e.repeat) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab'].includes(e.key)) e.preventDefault();
  audio();
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') selectRing(-1);
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') selectRing(1);
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotate(selectedRing, -1, true);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotate(selectedRing, 1, true);
  if (e.key === 'Tab') cyclePin(e.shiftKey ? -1 : 1);
  if (e.key === 'Enter' || e.key === ' ') launch(selectedPin);
});

window.addEventListener('resize', resize);
resize();
loadLevel(1, 0);
window.__game = {
  get: () => ({
    phase,
    level: levelNum,
    score: state.score,
    hearts: state.hearts,
    moves: state.moves,
    rot: state.rot.slice(),
    pins: state.pins.map((pin) => ({ ...pin })),
    started,
  }),
  rot(ring, dir) { rotate(ring, dir, false); },
  launch(id) { launch(id); },
  solution() { return solve(level); },
  playSolution() {
    const actions = solve(level) || [];
    let end = null;
    for (const action of actions) {
      const next = applyAction(level, state, action);
      state = pack(next);
      display = state.rot.map((value, index) => {
        const turns = Math.round((display[index] - value) / 12);
        return value + turns * 12;
      });
      end = next.end;
      if (end === 'hearts' || end === 'moves' || end === 'win') break;
    }
    ensureSelection();
    if (end === 'win') showWin();
    else if (end) gameOver(end);
    else phase = 'idle';
    return actions;
  },
};
requestAnimationFrame(frame);
