const RL = globalThis.RingLogic;
const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const PIN = { neutral: '#f4f1ea', coral: '#ff7a6b', teal: '#3ecfb2', gold: '#ffc94d' };
const RING = ['#8eb6ff', '#f3a4c8', '#8fd0b4', '#f0d08a'];
const TAP_SLOP = 12;
const SAVE_KEY = 'ring-out-progress-v1';

const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');
const pauseEl = document.getElementById('pause');
const sheetEl = helpEl.querySelector('.sheet');

let W = 390;
let H = 844;
let started = false;
let phase = 'idle';
let levelNum = 1;
let level = RL.LEVELS[0];
let levelStartScore = 0;
let state = null;
let display = [];
let selectedRing = 0;
let selectedPin = 0;
let anim = null;
let pointer = null;
let particles = [];
let shake = 0;
let geom = null;
let actx = null;
let muted = false;
let history = [];
let keyQueue = [];
let ignoreUntil = 0;
let lastDown = 0;
let lastUp = 0;
let hintText = '';
let hintUntil = 0;
let flash = null;
let progress = loadProgress();
let bgCanvas = null;
let bgW = 0;
let bgH = 0;
let clearStars = 0;

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      unlocked: raw.unlocked || 1,
      stars: raw.stars || {},
      mute: Boolean(raw.mute),
    };
  } catch (err) {
    return { unlocked: 1, stars: {}, mute: false };
  }
}

function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

function audio() {
  if (muted) return null;
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function blip(freq, dur, type, gain) {
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain == null ? 0.05 : gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t);
    osc.stop(t + (dur || 0.08) + 0.02);
  } catch (err) {
    /* audio is optional */
  }
}

function lockCanvas() {
  ignoreUntil = performance.now() + 320;
}

function overlayOpen() {
  return [startEl, helpEl, overEl, winEl, pauseEl].some((el) => !el.classList.contains('hidden'));
}

function attachBoard(nextLevel, score) {
  level = nextLevel;
  levelStartScore = score || 0;
  state = RL.freshState(level, levelStartScore);
  state.gaps = RL.gapsFor(level, state.pins);
  state.gates = RL.gatesFor(level, state.pins);
  display = state.rot.slice();
  selectedRing = state.pins[0] ? state.pins[0].ring : 0;
  selectedPin = state.pins[0] ? state.pins[0].id : 0;
  anim = null;
  pointer = null;
  particles = [];
  shake = 0;
  history = [];
  keyQueue = [];
  hintText = '';
  flash = null;
  phase = 'idle';
}

function loadLevel(n, keepScore) {
  levelNum = Math.max(1, Math.min(RL.LEVELS.length, n));
  attachBoard(RL.LEVELS[levelNum - 1], keepScore || 0);
}

function snapshot() {
  return {
    rot: state.rot.slice(),
    pins: state.pins.map((pin) => ({ id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color })),
    moves: state.moves,
    hearts: state.hearts,
    score: state.score,
    combo: state.combo,
    movesUsed: state.movesUsed || 0,
    heartsLost: state.heartsLost || 0,
    display: display.slice(),
    selectedRing,
    selectedPin,
  };
}

function restore(shot) {
  state = {
    rot: shot.rot.slice(),
    pins: shot.pins.map((pin) => ({ id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color })),
    moves: shot.moves,
    hearts: shot.hearts,
    score: shot.score,
    combo: shot.combo,
    movesUsed: shot.movesUsed,
    heartsLost: shot.heartsLost,
    end: null,
  };
  state.gaps = RL.gapsFor(level, state.pins);
  state.gates = RL.gatesFor(level, state.pins);
  display = shot.display.slice();
  selectedRing = shot.selectedRing;
  selectedPin = shot.selectedPin;
  anim = null;
  pointer = null;
  flash = null;
  phase = 'idle';
}

function syncMute() {
  muted = Boolean(progress.mute);
  const btn = document.getElementById('muteBtn');
  btn.textContent = muted ? 'Muted' : 'Sound';
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}

function refreshContinue() {
  const btn = document.getElementById('continueBtn');
  btn.classList.toggle('hidden', !(progress.unlocked > 1));
}

function showWin() {
  phase = 'win';
  const bonus = RL.clearBonus(state);
  state = Object.assign({}, state, { score: state.score + bonus });
  const stars = RL.starsFor(level, state);
  clearStars = stars;
  const prev = Number(progress.stars[level.id] || 0);
  progress.stars[level.id] = Math.max(prev, stars);
  progress.unlocked = Math.max(progress.unlocked || 1, Math.min(RL.LEVELS.length, levelNum + 1));
  saveProgress();
  const last = levelNum >= RL.LEVELS.length;
  document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
  document.getElementById('winStars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
  document.getElementById('winScore').textContent = `Score ${state.score}`;
  document.getElementById('nextBtn').classList.toggle('hidden', last);
  document.getElementById('againBtn').classList.toggle('hidden', !last);
  winEl.classList.remove('hidden');
  const focusBtn = last ? document.getElementById('againBtn') : document.getElementById('nextBtn');
  focusBtn.focus({ preventScroll: true });
  blip(523, 0.1);
  blip(659, 0.14);
  blip(784, 0.18);
}

function gameOver(reason) {
  phase = 'over';
  document.getElementById('overTitle').textContent = reason === 'moves' ? 'OUT OF MOVES' : 'OUT OF HEARTS';
  document.getElementById('finalScore').textContent = `Score ${state.score}  ·  Lv ${levelNum}`;
  overEl.classList.remove('hidden');
  document.getElementById('retryLevelBtn').focus({ preventScroll: true });
  blip(110, 0.18, 'triangle', 0.05);
}

function beginClear() {
  phase = 'clear';
  anim = { type: 'clear', t: 0, dur: 0.95 };
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    particles.push({
      x: W / 2,
      y: H / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.3,
      max: 1,
      color: i % 2 ? '#ffd56a' : '#fff',
      star: true,
    });
  }
  blip(523, 0.08);
  blip(659, 0.1);
}

function finishAnim() {
  const end = anim && anim.end;
  if (anim && anim.type === 'rot') display[anim.ring] = RL.mod(Math.round(anim.to));
  if (anim && anim.kickRing != null) display[anim.kickRing] = state.rot[anim.kickRing];
  anim = null;
  flash = null;
  if (end === 'win') beginClear();
  else if (end) gameOver(end);
  else phase = 'idle';
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 140;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.2,
      max: 0.5,
      color,
    });
  }
}

function commit(action, animate) {
  if (phase !== 'idle' || overlayOpen()) return false;
  const prevDisplay = display.slice();
  const shot = snapshot();
  const next = RL.applyAction(level, state, action);
  if (next.rejected) return false;
  history.push(shot);
  if (history.length > 80) history.shift();
  state = next;
  if (action.type === 'rot') {
    blip(240 + action.ring * 40, 0.05, 'square', 0.03);
    if (!animate) {
      display = state.rot.slice();
      if (next.end === 'win') beginClear();
      else if (next.end) gameOver(next.end);
      return true;
    }
    phase = 'anim';
    const dir = action.dir;
    anim = {
      type: 'rot',
      ring: action.ring,
      from: prevDisplay[action.ring],
      to: prevDisplay[action.ring] + dir,
      t: 0,
      dur: 0.16,
      end: next.end,
    };
    return true;
  }
  const pin = shot.pins.find((item) => item.id === action.id);
  selectedPin = action.id;
  if (pin) selectedRing = pin.ring;
  const result = next.result || { ok: false, ring: level.rings.length, visual: 0 };
  if (!animate) {
    display = state.rot.slice();
    if (next.end === 'win') beginClear();
    else if (next.end) gameOver(next.end);
    return true;
  }
  phase = 'anim';
  anim = {
    type: result.ok ? 'out' : 'bump',
    pin: pin ? { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color } : null,
    blockRing: result.ring == null ? level.rings.length : result.ring,
    visual: result.visual,
    t: 0,
    dur: result.ok ? 0.32 : 0.36,
    end: next.end,
    kickRing: result.ok && pin ? pin.ring : null,
    kickFrom: result.ok && pin ? prevDisplay[pin.ring] : 0,
    kickTo: result.ok && pin ? prevDisplay[pin.ring] + 1 : 0,
  };
  if (result.ok && pin) display[pin.ring] = prevDisplay[pin.ring];
  if (!result.ok) {
    shake = 8;
    flash = { ring: result.ring, visual: result.visual, life: 0.36 };
    blip(90, 0.12, 'triangle', 0.06);
  } else if (pin) {
    blip(520 + pin.ring * 40, 0.1, 'sine', 0.05);
    const spot = pinPoint(pin, prevDisplay[pin.ring]);
    burst(spot.x, spot.y, PIN[pin.color] || PIN.neutral, 12);
  }
  return true;
}

function undo() {
  if (!history.length || phase === 'anim' || phase === 'clear') return false;
  restore(history.pop());
  blip(180, 0.05, 'square', 0.03);
  return true;
}

function restartLevel() {
  loadLevel(levelNum, levelStartScore);
}

function hint() {
  if (phase !== 'idle' || overlayOpen()) return;
  const actions = RL.solve(level, state);
  if (!actions || !actions.length) {
    hintText = 'No safe line from here';
    hintUntil = performance.now() + 1200;
    return;
  }
  const next = actions[0];
  if (next.type === 'launch') {
    selectedPin = next.id;
    const pin = state.pins.find((item) => item.id === next.id);
    if (pin) selectedRing = pin.ring;
    hintText = 'Launch the highlighted pin';
  } else {
    selectedRing = next.ring;
    hintText = `Turn ring ${next.ring + 1} ${next.dir > 0 ? 'clockwise' : 'counterclockwise'}`;
  }
  hintUntil = performance.now() + 1400;
  blip(660, 0.06, 'sine', 0.03);
}

function layout() {
  const margin = 8;
  const maxR = Math.max(80, Math.min(W, H) / 2 - margin);
  const count = level.rings.length;
  const band = maxR / (count + 0.55);
  return {
    cx: W / 2,
    cy: H / 2 + (H > W ? 12 : 0),
    band,
    core: band * 0.72,
    maxR,
  };
}

function ringSpan(i, g) {
  const use = g || geom;
  const inner = use.core + i * use.band;
  const outer = inner + use.band * 0.82;
  return { inner, outer, mid: (inner + outer) / 2, width: outer - inner };
}

function pinPoint(pin, rotSteps) {
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + rotSteps + 0.5) * RL.SECTOR;
  return {
    x: geom.cx + Math.cos(angle) * span.mid,
    y: geom.cy + Math.sin(angle) * span.mid,
    angle,
  };
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  bgCanvas = null;
}

function ensureBackground() {
  if (bgCanvas && bgW === canvas.width && bgH === canvas.height) return;
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  bgW = canvas.width;
  bgH = canvas.height;
  const g = bgCanvas.getContext('2d');
  const scale = canvas.width / W;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const grad = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#243463');
  grad.addColorStop(0.55, '#172445');
  grad.addColorStop(1, '#0c1224');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
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

function chunkText(text, x, y, size, fill) {
  ctx.font = `700 ${Math.round(size)}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.strokeStyle = '#14203a';
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
  const wall = Array.from({ length: 12 }, (_, i) => gaps.indexOf(i) < 0 && gaps.indexOf(String(i)) < 0);
  if (wall.every(Boolean)) return [[0, 12]];
  const runs = [];
  let i = 0;
  while (i < 12) {
    if (!wall[i]) { i += 1; continue; }
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
  ctx.bezierCurveTo(-11, -4, -6, -13, 0, -6);
  ctx.bezierCurveTo(6, -13, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,255,255,.28)';
  ctx.fill();
  ctx.restore();
}

function drawGlyph(color, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PIN[color] || '#fff';
  ctx.strokeStyle = '#1b2438';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (color === 'coral') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.9, r * 0.75);
    ctx.lineTo(-r * 0.9, r * 0.75);
  } else if (color === 'teal') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
  } else {
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRing(index) {
  const span = ringSpan(index);
  const color = RING[index % RING.length];
  const rot = display[index] * RL.SECTOR;
  const gaps = (state.gaps && state.gaps[index]) || level.rings[index].gaps;
  const inset = Math.min(0.12, (span.width * 0.35) / Math.max(20, span.mid));
  ctx.save();
  ctx.translate(geom.cx, geom.cy);
  ctx.rotate(rot);
  ctx.lineCap = 'butt';
  wallRuns(gaps).forEach(([a, b]) => {
    const start = -Math.PI / 2 + a * RL.SECTOR + inset;
    const end = -Math.PI / 2 + b * RL.SECTOR - inset;
    ctx.strokeStyle = 'rgba(8, 12, 28, .28)';
    ctx.lineWidth = span.width;
    ctx.beginPath();
    ctx.arc(0, 3, span.mid, start, end);
    ctx.stroke();
    ctx.strokeStyle = selectedRing === index ? shiftColor(color, 24) : color;
    ctx.lineWidth = span.width * 0.86;
    ctx.beginPath();
    ctx.arc(0, 0, span.mid, start, end);
    ctx.stroke();
    if (selectedRing === index) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, span.mid, start, end);
      ctx.stroke();
    }
  });
  if (index === level.rings.length - 1 && state.gates) {
    Object.keys(state.gates).forEach((key) => {
      const gate = state.gates[key];
      if (!gate) return;
      const gap = Number(key);
      const angle = -Math.PI / 2 + (gap + 0.5) * RL.SECTOR;
      drawGlyph(gate, Math.cos(angle) * span.mid, Math.sin(angle) * span.mid, Math.max(8, span.width * 0.28));
    });
  }
  ctx.restore();
}

function drawPinShape(pin, x, y, angle, ghost) {
  const len = Math.max(16, geom.band * 0.34);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = ghost == null ? 1 : ghost;
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
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLane(pin) {
  const result = RL.launchResult(level, state, pin);
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + display[pin.ring] + 0.5) * RL.SECTOR;
  const dist = result.ok ? geom.maxR + 18 : ringSpan(Math.min(result.ring, level.rings.length - 1)).inner;
  ctx.save();
  ctx.translate(geom.cx, geom.cy);
  ctx.rotate(angle);
  ctx.setLineDash([5, 7]);
  ctx.lineWidth = pin.id === selectedPin ? 4 : 3;
  ctx.strokeStyle = result.ok ? 'rgba(126, 214, 164, .95)' : 'rgba(255, 122, 122, .9)';
  ctx.beginPath();
  ctx.moveTo(span.outer + 2, 0);
  ctx.lineTo(Math.max(span.outer + 8, dist), 0);
  ctx.stroke();
  ctx.restore();
}

function drawFlash() {
  if (!flash || flash.ring == null) return;
  const span = ringSpan(flash.ring);
  const angle = -Math.PI / 2 + (flash.visual + 0.5) * RL.SECTOR;
  ctx.save();
  ctx.translate(geom.cx, geom.cy);
  ctx.rotate(angle);
  ctx.globalAlpha = Math.max(0, flash.life / 0.36);
  ctx.fillStyle = 'rgba(255, 70, 90, .55)';
  ctx.beginPath();
  ctx.arc(0, 0, span.outer, -RL.SECTOR * 0.45, RL.SECTOR * 0.45);
  ctx.arc(0, 0, span.inner, RL.SECTOR * 0.45, -RL.SECTOR * 0.45, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function animPinPoint() {
  const pin = anim.pin;
  const span = ringSpan(pin.ring);
  const angle = -Math.PI / 2 + (pin.sector + (anim.kickFrom || display[pin.ring]) + 0.5) * RL.SECTOR;
  const u = Math.min(1, anim.t / anim.dur);
  let dist = span.mid;
  if (anim.type === 'out') {
    const eased = 1 - (1 - u) ** 3;
    dist = span.mid + (geom.maxR + geom.band - span.mid) * eased;
  } else {
    const reach = ringSpan(Math.min(anim.blockRing, level.rings.length - 1)).inner + 2;
    const trip = u < 0.42 ? u / 0.42 : 1 - (u - 0.42) / 0.58;
    dist = span.mid + (reach - span.mid) * Math.max(0, trip);
  }
  return {
    x: geom.cx + Math.cos(angle) * dist,
    y: geom.cy + Math.sin(angle) * dist,
    angle,
  };
}

function render() {
  geom = layout();
  ensureBackground();
  const scale = canvas.width / W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(bgCanvas, 0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hudY = H > W ? 36 : 28;
  roundRect(W / 2 - 54, hudY - 18, 108, 36, 14);
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fill();
  chunkText(`Lv ${levelNum}`, W / 2, hudY, 18, '#243056');
  const pending = pointer ? Math.abs(pointer.steps) : 0;
  const shownMoves = Math.max(0, state.moves - pending);
  const low = shownMoves <= 1;
  roundRect(W / 2 - 36, hudY + 26, 72, 40, 14);
  ctx.fillStyle = low ? '#ffd0d8' : 'rgba(255,255,255,.92)';
  ctx.fill();
  chunkText(String(shownMoves), W / 2, hudY + 46, 24, low ? '#c4233c' : '#243056');
  if (pending) {
    roundRect(W / 2 + 44, hudY + 30, 54, 32, 12);
    ctx.fillStyle = '#ff7a6b';
    ctx.fill();
    chunkText(`−${pending}`, W / 2 + 71, hudY + 46, 16, '#fff');
  }
  for (let i = 0; i < 3; i++) drawHeart(28 + i * 28, hudY + 8, i < state.hearts);

  const core = ctx.createRadialGradient(geom.cx, geom.cy - 4, 6, geom.cx, geom.cy, geom.core);
  core.addColorStop(0, '#ffe7ad');
  core.addColorStop(1, '#e0a24a');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(geom.cx, geom.cy, geom.core * 0.82, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < level.rings.length; i++) drawRing(i);
  drawFlash();
  if (phase === 'idle' || pointer) {
    state.pins.forEach((pin) => drawLane(pin));
  }
  state.pins.forEach((pin) => {
    if (anim && anim.pin && anim.pin.id === pin.id && (anim.type === 'out' || anim.type === 'bump')) return;
    drawPinShape(pin, pinPoint(pin, display[pin.ring]).x, pinPoint(pin, display[pin.ring]).y, pinPoint(pin, display[pin.ring]).angle);
  });
  if (anim && anim.pin && (anim.type === 'out' || anim.type === 'bump')) {
    const spot = animPinPoint();
    drawPinShape(anim.pin, spot.x, spot.y, spot.angle);
  }
  particles.forEach((bit) => {
    ctx.globalAlpha = Math.max(0, bit.life / bit.max);
    ctx.fillStyle = bit.color;
    ctx.beginPath();
    if (bit.star) {
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.life * 4);
      ctx.fillRect(-4, -1.2, 8, 2.4);
      ctx.fillRect(-1.2, -4, 2.4, 8);
      ctx.restore();
    } else {
      ctx.arc(bit.x, bit.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  if (phase === 'clear') {
    chunkText('CLEARED', W / 2, Math.max(78, geom.cy - geom.maxR + 18), H > W ? 36 : 28, '#fff');
    const stars = RL.starsFor(level, state);
    chunkText('★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars), W / 2, Math.max(112, geom.cy - geom.maxR + 52), 22, '#ffd56a');
  }
  if (hintText && performance.now() < hintUntil) {
    roundRect(W / 2 - 150, H - 78, 300, 36, 12);
    ctx.fillStyle = 'rgba(20, 28, 52, .88)';
    ctx.fill();
    chunkText(hintText, W / 2, H - 60, 14, '#f4f7ff');
  } else if (levelNum === 1 && started && phase === 'idle' && !overlayOpen()) {
    chunkText('Green lane out. A shot kicks its ring.', W / 2, H - 64, 13, '#f4f7ff');
  }
  ctx.restore();
}

function update(dt) {
  shake = Math.max(0, shake - dt * 28);
  if (flash) {
    flash.life -= dt;
    if (flash.life <= 0) flash = null;
  }
  particles.forEach((bit) => {
    bit.life -= dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
  });
  particles = particles.filter((bit) => bit.life > 0);
  if (phase === 'clear' && anim) {
    anim.t += dt;
    for (let i = 0; i < display.length; i++) display[i] += dt * (1.4 + i * 0.35);
    if (anim.t >= anim.dur) {
      display = state.rot.slice();
      anim = null;
      showWin();
    }
    return;
  }
  if (!anim || phase === 'pause') return;
  anim.t += dt;
  if (anim.type === 'rot') {
    const u = Math.min(1, anim.t / anim.dur);
    const c1 = 1.35;
    const eased = 1 + (c1 + 1) * (u - 1) ** 3 + c1 * (u - 1) ** 2;
    display[anim.ring] = anim.from + (anim.to - anim.from) * eased;
  } else if (anim.kickRing != null) {
    const u = Math.min(1, anim.t / anim.dur);
    const eased = 1 - (1 - u) ** 3;
    display[anim.kickRing] = anim.kickFrom + (anim.kickTo - anim.kickFrom) * eased;
  }
  if (anim.t >= anim.dur) finishAnim();
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
    inside: e.clientX >= rect.left && e.clientY >= rect.top && e.clientX <= rect.right && e.clientY <= rect.bottom,
  };
}

function hitPin(x, y) {
  let best = null;
  let bestD = Infinity;
  const reach = Math.max(22, geom.band * 0.46);
  state.pins.forEach((pin) => {
    const spot = pinPoint(pin, display[pin.ring]);
    const dist = Math.hypot(x - spot.x, y - spot.y);
    if (dist <= reach && dist < bestD) {
      best = pin;
      bestD = dist;
    }
  });
  return best;
}

function hitRing(x, y) {
  const dist = Math.hypot(x - geom.cx, y - geom.cy);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < level.rings.length; i++) {
    const delta = Math.abs(dist - ringSpan(i).mid);
    const slop = Math.max(geom.band * 0.5, 22);
    if (delta <= slop && delta < bestD) {
      best = i;
      bestD = delta;
    }
  }
  return best;
}

function onDown(e) {
  if (e.target && e.target.closest && e.target.closest('button')) return;
  const now = performance.now();
  if (!started || phase !== 'idle' || overlayOpen()) return;
  if (now < ignoreUntil) return;
  if (lastUp && now - lastUp < 300 && now - lastDown < 480) {
    lastDown = now;
    return;
  }
  lastDown = now;
  audio();
  geom = layout();
  const p = pointerPos(e);
  const pin = hitPin(p.x, p.y);
  const ring = pin ? pin.ring : hitRing(p.x, p.y);
  if (!pin && ring < 0) return;
  if (pin) {
    selectedPin = pin.id;
    selectedRing = pin.ring;
  } else selectedRing = ring;
  pointer = {
    id: e.pointerId,
    x: p.x,
    y: p.y,
    t: now,
    pin: pin ? pin.id : null,
    ring,
    angle: Math.atan2(p.y - geom.cy, p.x - geom.cx),
    startDisplay: display[ring],
    steps: 0,
    moved: false,
  };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
  e.preventDefault();
}

function onMove(e) {
  if (!pointer || e.pointerId !== pointer.id || pointer.ring < 0) return;
  const p = pointerPos(e);
  if (Math.hypot(p.x - pointer.x, p.y - pointer.y) > TAP_SLOP) pointer.moved = true;
  if (!pointer.moved && pointer.pin) return;
  let delta = Math.atan2(p.y - geom.cy, p.x - geom.cx) - pointer.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  let steps = Math.round(delta / RL.SECTOR);
  steps = Math.max(-state.moves, Math.min(state.moves, steps));
  if (steps !== pointer.steps) {
    pointer.steps = steps;
    blip(200 + pointer.ring * 30, 0.03, 'square', 0.02);
  }
  display[pointer.ring] = pointer.startDisplay + steps;
}

function onUp(e) {
  if (!pointer || (e && e.pointerId != null && e.pointerId !== pointer.id)) return;
  const elapsed = performance.now() - pointer.t;
  const tap = Boolean(pointer.pin) && !pointer.moved && elapsed < 450;
  const steps = pointer.steps;
  const ring = pointer.ring;
  const pin = pointer.pin;
  const startDisplay = pointer.startDisplay;
  const p = e ? pointerPos(e) : { x: 0, y: 0, inside: false };
  const far = Math.hypot(p.x - geom.cx, p.y - geom.cy) > geom.maxR + geom.band;
  pointer = null;
  lastUp = performance.now();
  if (!p.inside || far) {
    display[ring] = startDisplay;
    return;
  }
  if (tap) commit({ type: 'launch', id: pin }, true);
  else if (steps) commit({ type: 'rot', ring, dir: Math.sign(steps) === 0 ? 1 : Math.sign(steps) }, false);
  if (Math.abs(steps) > 1 && !tap && p.inside && !far) {
    const dir = Math.sign(steps);
    for (let i = 1; i < Math.abs(steps); i++) commit({ type: 'rot', ring, dir }, false);
  }
}

function selectRing(dir) {
  selectedRing = RL.mod(selectedRing + dir, level.rings.length);
  const onRing = state.pins.find((pin) => pin.ring === selectedRing);
  if (onRing) selectedPin = onRing.id;
}

function cyclePin(dir) {
  const pins = state.pins.filter((pin) => pin.ring === selectedRing);
  const list = pins.length ? pins : state.pins;
  if (!list.length) return;
  const index = list.findIndex((pin) => pin.id === selectedPin);
  const next = list[RL.mod((index < 0 ? 0 : index) + dir, list.length)];
  selectedPin = next.id;
  selectedRing = next.ring;
}

function toggleMute() {
  progress.mute = !progress.mute;
  saveProgress();
  syncMute();
}

function openPause() {
  if (!started || overlayOpen() || phase === 'win' || phase === 'over') return;
  phase = 'pause';
  pauseEl.classList.remove('hidden');
  document.getElementById('resumeBtn').focus({ preventScroll: true });
}

function closePause() {
  pauseEl.classList.add('hidden');
  if (phase === 'pause') phase = 'idle';
  lockCanvas();
}

function openHelp() {
  helpEl.classList.remove('hidden');
  sheetEl.scrollTop = 0;
  document.getElementById('helpClose').focus({ preventScroll: true });
  sheetEl.scrollTop = 0;
}

function closeHelp() {
  helpEl.classList.add('hidden');
  sheetEl.scrollTop = 0;
  lockCanvas();
}

function applyKey(key, shift) {
  if (key === 'm' || key === 'M') { toggleMute(); return; }
  if (key === 'Escape') {
    if (!helpEl.classList.contains('hidden')) closeHelp();
    else if (!pauseEl.classList.contains('hidden')) closePause();
    else openPause();
    return;
  }
  if (overlayOpen()) return;
  if (key === 'r' || key === 'R') { restartLevel(); return; }
  if (key === 'z' || key === 'Z') { undo(); return; }
  if (key === 'h' || key === 'H') { hint(); return; }
  if (phase !== 'idle') return;
  if (key === 'ArrowUp' || key === 'w' || key === 'W') selectRing(-1);
  if (key === 'ArrowDown' || key === 's' || key === 'S') selectRing(1);
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') commit({ type: 'rot', ring: selectedRing, dir: -1 }, true);
  if (key === 'ArrowRight' || key === 'd' || key === 'D') commit({ type: 'rot', ring: selectedRing, dir: 1 }, true);
  if (key === 'Tab') cyclePin(shift ? -1 : 1);
  if (key === 'Enter' || key === ' ') commit({ type: 'launch', id: selectedPin }, true);
}

function flushKeys() {
  if (phase !== 'idle' || !keyQueue.length || overlayOpen()) return;
  const item = keyQueue.shift();
  applyKey(item.key, item.shift);
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
  if (started && phase !== 'pause') update(dt);
  if (phase === 'idle') flushKeys();
  render();
  requestAnimationFrame(frame);
}

document.getElementById('helpBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  openHelp();
});
document.getElementById('helpClose').addEventListener('click', (e) => {
  e.stopPropagation();
  closeHelp();
});
helpEl.addEventListener('click', (e) => {
  if (e.target === helpEl) closeHelp();
});
document.getElementById('startBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  started = true;
  startEl.classList.add('hidden');
  loadLevel(1, 0);
  lockCanvas();
});
document.getElementById('continueBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  started = true;
  startEl.classList.add('hidden');
  loadLevel(progress.unlocked || 1, 0);
  lockCanvas();
});
document.getElementById('retryLevelBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  started = true;
  restartLevel();
  lockCanvas();
});
document.getElementById('retryBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  started = true;
  loadLevel(1, 0);
  lockCanvas();
});
document.getElementById('nextBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  loadLevel(levelNum + 1, state.score);
  lockCanvas();
});
document.getElementById('replayBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  restartLevel();
  lockCanvas();
});
document.getElementById('againBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  loadLevel(1, 0);
  lockCanvas();
});
document.getElementById('undoBtn').addEventListener('click', (e) => { e.currentTarget.blur(); undo(); });
document.getElementById('hintBtn').addEventListener('click', (e) => { e.currentTarget.blur(); hint(); });
document.getElementById('restartBtn').addEventListener('click', (e) => { e.currentTarget.blur(); if (started && !overlayOpen()) restartLevel(); });
document.getElementById('muteBtn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleMute(); });
document.getElementById('pauseBtn').addEventListener('click', (e) => { e.currentTarget.blur(); openPause(); });
document.getElementById('resumeBtn').addEventListener('click', (e) => { e.currentTarget.blur(); closePause(); });
document.getElementById('pauseRestart').addEventListener('click', (e) => {
  e.currentTarget.blur();
  closePause();
  restartLevel();
});

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);

window.addEventListener('keydown', (e) => {
  if (!startEl.classList.contains('hidden')) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('startBtn').click();
    }
    return;
  }
  if (!winEl.classList.contains('hidden')) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const again = document.getElementById('againBtn');
      const next = document.getElementById('nextBtn');
      (again.classList.contains('hidden') ? next : again).click();
    }
    return;
  }
  if (!overEl.classList.contains('hidden')) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('retryLevelBtn').click();
    }
    return;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab'].includes(e.key)) e.preventDefault();
  if ((phase === 'anim' || phase === 'clear') && !overlayOpen()) {
    keyQueue.push({ key: e.key, shift: e.shiftKey });
    return;
  }
  applyKey(e.key, e.shiftKey);
});

window.addEventListener('resize', resize);
resize();
loadLevel(1, 0);
syncMute();
refreshContinue();

function clientOf(x, y) {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + (x / W) * rect.width, y: rect.top + (y / H) * rect.height };
}

window.__game = {
  get: () => ({
    phase,
    level: levelNum,
    score: state.score,
    hearts: state.hearts,
    moves: state.moves,
    movesUsed: state.movesUsed || 0,
    heartsLost: state.heartsLost || 0,
    rot: state.rot.slice(),
    pins: state.pins.map((pin) => ({ id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color })),
    started,
    muted,
    stars: clearStars,
    history: history.length,
    pending: pointer ? Math.abs(pointer.steps) : 0,
  }),
  rot(ring, dir) { return commit({ type: 'rot', ring, dir }, false); },
  launch(id) { return commit({ type: 'launch', id }, false); },
  undo,
  hint,
  restart: restartLevel,
  loadLevel(n) { started = true; startEl.classList.add('hidden'); loadLevel(n, 0); },
  solution() { return RL.solve(level, state); },
  playSolution() {
    const actions = RL.solve(level, state) || [];
    actions.forEach((action) => {
      if (phase !== 'idle') return;
      commit(action, false);
    });
    return actions;
  },
  metrics() {
    geom = layout();
    const span = ringSpan(0);
    return {
      band: geom.band,
      hitBand: geom.band,
      pinSlop: TAP_SLOP,
      pinHit: Math.max(22, geom.band * 0.46) * 2,
      cx: geom.cx,
      cy: geom.cy,
      maxR: geom.maxR,
      rings: level.rings.length,
      mid0: span.mid,
    };
  },
  ringClient(index, t) {
    geom = layout();
    const span = ringSpan(index);
    const radius = span.inner + (span.outer - span.inner) * (t == null ? 0.5 : t);
    const point = clientOf(geom.cx, geom.cy - radius);
    return { x: point.x, y: point.y, radius, cx: clientOf(geom.cx, geom.cy).x, cy: clientOf(geom.cx, geom.cy).y };
  },
  pinClient(id) {
    geom = layout();
    const pin = state.pins.find((item) => item.id === id) || state.pins[0];
    const spot = pinPoint(pin, display[pin.ring]);
    const point = clientOf(spot.x, spot.y);
    return { x: point.x, y: point.y, id: pin.id };
  },
  stress() {
    const rings = [0, 1, 2, 3].map((i) => ({
      gaps: [0, 6],
      gates: i === 3 ? { 0: 'coral', 6: 'teal' } : null,
    }));
    const pins = [];
    for (let i = 0; i < 8; i++) {
      pins.push({ id: i + 1, ring: i % 4, sector: (i * 3 + 1) % 12, color: ['neutral', 'coral', 'teal', 'gold'][i % 4] });
    }
    started = true;
    startEl.classList.add('hidden');
    [winEl, overEl, helpEl, pauseEl].forEach((el) => el.classList.add('hidden'));
    attachBoard({ id: 99, rings, pins, rot: [0, 1, 2, 3], moves: 12, par: 4 }, 0);
    levelNum = 12;
  },
};
requestAnimationFrame(frame);
