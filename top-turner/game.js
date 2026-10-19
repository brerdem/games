const {
  ARENA,
  OPPONENTS,
  blank,
  collide,
  cutProfile,
  designTop,
  launchTop,
  makeRng,
  statsOf,
  stepTop,
} = globalThis.TopLogic;

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');

let ignoreUntil = 0;
let W = 800;
let H = 900;
let started = false;
let mode = 'carve';
let fight = 0;
let radii = blank();
let score = 0;
let levelStartScore = 0;
let player = null;
let enemy = null;
let rng = makeRng(7);
let dash = 100;
let dashing = false;
let dashX = 0;
let dashY = 0;
let battleT = 0;
let chips = [];
let spinAnim = 0;
let chiselIndex = 16;
let chiselCut = 0.7;
let cutting = false;
let launchAim = -Math.PI / 2;
let launchPull = 0;
let charging = false;
let chargeDir = 1;
let drag = null;
let perfect = false;
let battleBox = null;
let actx = null;
let keys = new Set();

function audio() {
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function blip(freq, dur = 0.07, type = 'square', gain = 0.04) {
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

function overlaysOpen() {
  return !helpEl.classList.contains('hidden')
    || !startEl.classList.contains('hidden')
    || !overEl.classList.contains('hidden')
    || !winEl.classList.contains('hidden');
}

function beginFight(index, keepShape, keepScore) {
  fight = index;
  levelStartScore = keepScore;
  score = keepScore;
  if (!keepShape) radii = blank();
  mode = 'carve';
  player = null;
  enemy = null;
  dash = 100;
  dashing = false;
  battleT = 0;
  perfect = false;
  launchPull = 0;
  charging = false;
}

function startRun() {
  beginFight(0, false, 0);
}

function goBattle() {
  const opp = OPPONENTS[fight];
  player = designTop(radii, 'You', '#3ecfb2', 0, ARENA * 0.68);
  enemy = designTop(opp.radii, opp.name, opp.color, 0, -ARENA * 0.68);
  mode = 'launch';
  launchAim = -Math.PI / 2;
  launchPull = 0;
  perfect = false;
  rng = makeRng(40 + fight * 17);
}

function fireLaunch(pull, aim, isPerfect) {
  const len = Math.max(0, Math.min(160, pull));
  const omega = (0.6 + 0.4 * (len / 160)) * (isPerfect ? 1.15 : 1);
  const speed = len * 3.2;
  launchTop(player, Math.cos(aim) * speed, Math.sin(aim) * speed, omega);
  const opp = OPPONENTS[fight];
  launchTop(enemy, 0, opp.pull * 1.5, 0.62);
  player.omega0 = omega;
  mode = 'battle';
  battleT = 0;
  dash = 100;
  if (isPerfect) blip(880, 0.12, 'sine', 0.05);
}

function finishBattle(won, reason) {
  const ratio = player.omega0 ? Math.max(0, player.w / player.omega0) : 0;
  const gained = won ? Math.round(1000 * ratio + 500 + (perfect ? 200 : 0)) : 0;
  score = levelStartScore + gained;
  if (won) {
    const last = fight >= OPPONENTS.length - 1;
    document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
    document.getElementById('winScore').textContent = `${OPPONENTS[fight].name} down  ·  Score ${score}`;
    document.getElementById('nextBtn').classList.toggle('hidden', last);
    document.getElementById('againBtn').classList.toggle('hidden', !last);
    winEl.classList.remove('hidden');
    const focusBtn = last ? document.getElementById('againBtn') : document.getElementById('nextBtn');
    focusBtn.focus({ preventScroll: true });
    blip(523, 0.1, 'sine', 0.05);
    blip(784, 0.14, 'sine', 0.05);
  } else {
    const title = reason === 'edge' ? 'OVER THE EDGE' : reason === 'time' ? 'OUTSPUN' : 'SPUN OUT';
    document.getElementById('overTitle').textContent = title;
    document.getElementById('finalScore').textContent = `Score ${levelStartScore}  ·  Fight ${fight + 1}`;
    overEl.classList.remove('hidden');
    document.getElementById('retryLevelBtn').focus();
  }
  mode = won ? 'win' : 'over';
}

function latheGeom() {
  const top = 100;
  const bottom = H - 130;
  const axisX = Math.min(W * 0.42, W - 280);
  const scale = 118;
  return { top, bottom, axisX, scale, slice: (bottom - top) / radii.length };
}

function carveAt(x, y, dt) {
  const g = latheGeom();
  if (y < g.top || y > g.bottom) return;
  const index = Math.max(0, Math.min(radii.length - 1, Math.floor((y - g.top) / g.slice)));
  const cut = Math.abs(x - g.axisX) / g.scale;
  if (cutProfile(radii, index, cut, dt)) {
    chips.push({ x, y, vx: (x > g.axisX ? 1 : -1) * 80, vy: -30, life: 0.4, color: '#e2b15c' });
  }
}

function update(dt) {
  spinAnim += dt;
  for (const chip of chips) {
    chip.life -= dt;
    chip.x += chip.vx * dt;
    chip.y += chip.vy * dt;
  }
  chips = chips.filter((chip) => chip.life > 0);
  if (!started || overlaysOpen()) return;
  if (mode === 'carve' && (cutting || keys.has(' '))) {
    const g = latheGeom();
    const y = g.top + (chiselIndex + 0.5) * g.slice;
    carveAt(g.axisX + chiselCut * g.scale, y, dt);
  }
  if (mode === 'launch' && charging) {
    launchPull += chargeDir * dt * 140;
    if (launchPull >= 160) {
      launchPull = 160;
      chargeDir = -1;
    }
    if (launchPull <= 0) {
      launchPull = 0;
      chargeDir = 1;
    }
  }
  if (mode !== 'battle') return;
  const step = 1 / 120;
  for (let n = 0; n < 2; n++) {
    if (dashing && dash > 0 && player && !player.out) {
      const len = Math.hypot(dashX, dashY) || 1;
      player.vx += 380 * (dashX / len) * step;
      player.vy += 380 * (dashY / len) * step;
      player.w = Math.max(0, player.w - 0.03 * step);
      dash = Math.max(0, dash - 45 * step);
    } else {
      dash = Math.min(100, dash + 12 * step);
    }
    stepTop(player, step, rng);
    stepTop(enemy, step, rng);
    const hit = collide(player, enemy);
    if (hit > 40) blip(180 + Math.min(80, hit), 0.04, 'square', 0.03);
    if (enemy && !enemy.out && dash > 50) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.vx += 220 * (dx / len) * step;
      enemy.vy += 220 * (dy / len) * step;
    }
    if (player.out) {
      finishBattle(false, player.out === 'edge' ? 'edge' : 'spin');
      return;
    }
    if (enemy.out) {
      finishBattle(true, enemy.out);
      return;
    }
  }
  battleT += dt;
  if (battleT > 45 && mode === 'battle') finishBattle(player.w >= enemy.w, 'time');
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
  ctx.lineWidth = Math.max(4, size * 0.15);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawBlank() {
  const g = latheGeom();
  const stats = statsOf(radii);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  roundRect(W / 2 - 70, 28, 140, 36, 14);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(`Fight ${fight + 1}`, W / 2, 46, 20, '#fff6ea');
  chunkText(OPPONENTS[fight].name, W / 2, 78, 16, '#ffe08a', '#3a2414');
  const scoreLabel = String(score);
  ctx.font = `700 24px ${FONT}`;
  const scoreW = Math.max(64, ctx.measureText(scoreLabel).width + 22);
  roundRect(W - 16 - scoreW, 26, scoreW, 34, 12);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(scoreLabel, W - 16 - scoreW / 2, 43, 22, '#fff4c2');

  ctx.fillStyle = '#3a342f';
  ctx.fillRect(g.axisX - 18, g.top - 28, 36, 22);
  ctx.fillRect(g.axisX - 14, g.bottom + 6, 28, 18);
  ctx.beginPath();
  ctx.moveTo(g.axisX, g.top);
  for (let i = 0; i < radii.length; i++) {
    ctx.lineTo(g.axisX + radii[i] * g.scale, g.top + (i + 0.5) * g.slice);
  }
  ctx.lineTo(g.axisX, g.bottom);
  for (let i = radii.length - 1; i >= 0; i--) {
    ctx.lineTo(g.axisX - radii[i] * g.scale, g.top + (i + 0.5) * g.slice);
  }
  ctx.closePath();
  const wood = ctx.createLinearGradient(g.axisX - g.scale, 0, g.axisX + g.scale, 0);
  wood.addColorStop(0, '#a56b32');
  wood.addColorStop(0.5, '#e2b15c');
  wood.addColorStop(1, '#8a5528');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120, 60, 20, .35)';
  ctx.lineWidth = 2;
  const shift = (spinAnim * 40) % 16;
  for (let y = g.top - 20; y < g.bottom + 20; y += 8) {
    ctx.beginPath();
    ctx.moveTo(g.axisX - g.scale, y + shift);
    ctx.lineTo(g.axisX + g.scale, y + shift + 6);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#fff1d0';
  ctx.lineWidth = 2;
  ctx.stroke();

  const labels = [
    ['Stamina', stats.bars.stamina],
    ['Steady', stats.bars.stability],
    ['Weight', stats.bars.weight],
    ['Reach', stats.bars.reach],
    ['Speed', stats.bars.speed],
  ];
  const panelX = Math.min(W - 210, g.axisX + g.scale + 36);
  ctx.textAlign = 'left';
  chunkText(stats.label, panelX, g.top + 10, 22, '#fff6ea', '#3a2414');
  labels.forEach((row, i) => {
    const y = g.top + 48 + i * 36;
    chunkText(row[0], panelX, y, 14, '#fff6ea', '#3a2414');
    roundRect(panelX, y + 12, 150, 10, 5);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fill();
    roundRect(panelX, y + 12, 150 * row[1], 10, 5);
    ctx.fillStyle = '#e2b15c';
    ctx.fill();
  });

  battleBox = { x: W / 2 - 70, y: H - 64, w: 140, h: 40 };
  roundRect(battleBox.x, battleBox.y, battleBox.w, battleBox.h, 16);
  ctx.fillStyle = '#e2b15c';
  ctx.fill();
  ctx.textAlign = 'center';
  chunkText('Battle', W / 2, battleBox.y + 20, 20, '#3a2414', '#8a6230');
  for (const chip of chips) {
    ctx.globalAlpha = Math.max(0, chip.life / 0.4);
    ctx.fillStyle = chip.color;
    ctx.fillRect(chip.x, chip.y, 4, 3);
  }
  ctx.globalAlpha = 1;
}

function arenaPoint(x, y) {
  const size = Math.min(W, H) * 0.78;
  const scale = size / (ARENA * 2);
  return { x: W / 2 + x * scale, y: H / 2 + y * scale, scale, r: ARENA * scale };
}

function drawTop(top, angle) {
  const p = arenaPoint(top.x, top.y);
  const radius = top.rho * p.scale;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = top.color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.8, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = top.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.max(0.15, top.w) * Math.PI);
  ctx.stroke();
}

function drawArena() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  roundRect(W / 2 - 78, 22, 156, 34, 14);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(`Fight ${fight + 1}`, W / 2, 39, 20, '#fff6ea');
  const bowl = arenaPoint(0, 0);
  const grad = ctx.createRadialGradient(bowl.x, bowl.y, 20, bowl.x, bowl.y, bowl.r);
  grad.addColorStop(0, '#6a727c');
  grad.addColorStop(1, '#2c333b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bowl.x, bowl.y, bowl.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d7dde6';
  ctx.lineWidth = 8;
  ctx.stroke();
  if (mode === 'launch') {
    drawTop(player, spinAnim);
    drawTop(enemy, 0);
    const ring = 70 - ((spinAnim % 1.2) / 1.2) * 58;
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(arenaPoint(player.x, player.y).x, arenaPoint(player.x, player.y).y, ring, 0, Math.PI * 2);
    ctx.stroke();
    if (drag || charging) {
      const from = arenaPoint(player.x, player.y);
      const ang = launchAim;
      ctx.strokeStyle = '#fff6ea';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(from.x + Math.cos(ang) * launchPull * 0.6, from.y + Math.sin(ang) * launchPull * 0.6);
      ctx.stroke();
    }
    chunkText('Pull back, release on the ring', W / 2, H - 36, 16, '#fff6ea', '#1b1612');
  } else if (player) {
    drawTop(player, spinAnim * (player.w || 0) * 6);
    drawTop(enemy, spinAnim * (enemy.w || 0) * 6);
    roundRect(24, H - 36, 120, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fill();
    roundRect(24, H - 36, 120 * (dash / 100), 12, 6);
    ctx.fillStyle = '#3ecfb2';
    ctx.fill();
  }
}

function render() {
  const dpr = canvas.width / W;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1b1612';
  ctx.fillRect(0, 0, W, H);
  const light = ctx.createRadialGradient(W / 2, 80, 10, W / 2, 120, 420);
  light.addColorStop(0, 'rgba(255, 196, 120, .18)');
  light.addColorStop(1, 'rgba(255, 196, 120, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
  if (mode === 'carve') drawBlank();
  else drawArena();
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function armOverlayLock() {
  ignoreUntil = performance.now() + 320;
}

function onDown(e) {
  if (!started || overlaysOpen() || performance.now() < ignoreUntil) return;
  audio();
  const p = pointerPos(e);
  if (mode === 'carve') {
    if (battleBox && p.x >= battleBox.x && p.x <= battleBox.x + battleBox.w && p.y >= battleBox.y && p.y <= battleBox.y + battleBox.h) {
      goBattle();
      return;
    }
    cutting = true;
    carveAt(p.x, p.y, 0.05);
    drag = { id: e.pointerId, x: p.x, y: p.y };
  } else if (mode === 'launch') {
    drag = { id: e.pointerId, x: p.x, y: p.y };
  } else if (mode === 'battle' && player) {
    dashing = true;
    const spot = arenaPoint(player.x, player.y);
    dashX = p.x - spot.x;
    dashY = p.y - spot.y;
    drag = { id: e.pointerId, x: p.x, y: p.y };
  }
  e.preventDefault();
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const p = pointerPos(e);
  drag.x = p.x;
  drag.y = p.y;
  if (mode === 'carve' && cutting) carveAt(p.x, p.y, 0.016);
  if (mode === 'launch' && player) {
    const spot = arenaPoint(player.x, player.y);
    const dx = p.x - spot.x;
    const dy = p.y - spot.y;
    const len = Math.min(160, Math.hypot(dx, dy));
    launchPull = len;
    launchAim = Math.atan2(-dy, -dx);
  }
  if (mode === 'battle' && player) {
    const spot = arenaPoint(player.x, player.y);
    dashX = p.x - spot.x;
    dashY = p.y - spot.y;
  }
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (mode === 'launch' && player && launchPull > 12) {
    const spot = arenaPoint(player.x, player.y);
    const ring = 70 - ((spinAnim % 1.2) / 1.2) * 58;
    const perfectNow = Math.abs(ring - player.rho * (Math.min(W, H) * 0.78) / (ARENA * 2)) < 10;
    perfect = perfectNow;
    fireLaunch(launchPull, launchAim, perfectNow);
  }
  cutting = false;
  dashing = false;
  drag = null;
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
  if (mode === 'carve') {
    if (keys.has('arrowup') || keys.has('w')) chiselIndex = Math.max(0, chiselIndex - dt * 18);
    if (keys.has('arrowdown') || keys.has('s')) chiselIndex = Math.min(radii.length - 1, chiselIndex + dt * 18);
    if (keys.has('arrowleft') || keys.has('a')) chiselCut = Math.max(0.08, chiselCut - dt * 0.45);
    if (keys.has('arrowright') || keys.has('d')) chiselCut = Math.min(1, chiselCut + dt * 0.45);
  }
  if (mode === 'launch') {
    if (keys.has('arrowleft') || keys.has('a')) launchAim -= dt * 1.4;
    if (keys.has('arrowright') || keys.has('d')) launchAim += dt * 1.4;
  }
  if (mode === 'battle') {
    const kx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    const ky = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
    if (kx || ky) {
      dashX = kx;
      dashY = ky;
      dashing = true;
    } else if (!drag) dashing = false;
  }
  update(dt);
  render();
  requestAnimationFrame(frame);
}

document.getElementById('helpBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  helpEl.classList.remove('hidden');
  const sheet = helpEl.querySelector('.sheet');
  if (sheet) sheet.scrollTop = 0;
  document.getElementById('helpClose').focus({ preventScroll: true });
  if (sheet) sheet.scrollTop = 0;
});
document.getElementById('helpClose').addEventListener('click', (e) => {
  e.stopPropagation();
  helpEl.classList.add('hidden');
  armOverlayLock();
});
helpEl.addEventListener('click', (e) => {
  if (e.target === helpEl) {
    helpEl.classList.add('hidden');
    armOverlayLock();
  }
});
document.getElementById('startBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  started = true;
  startEl.classList.add('hidden');
  startRun();
  armOverlayLock();
});
document.getElementById('retryLevelBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  beginFight(fight, false, levelStartScore);
  armOverlayLock();
});
document.getElementById('retryBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  startRun();
  armOverlayLock();
});
document.getElementById('nextBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  beginFight(fight + 1, true, score);
  armOverlayLock();
});
document.getElementById('replayBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  beginFight(fight, true, levelStartScore);
  armOverlayLock();
});
document.getElementById('againBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  startRun();
  armOverlayLock();
});
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', () => { drag = null; cutting = false; dashing = false; });
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
  if (key === ' ' && mode === 'launch' && !charging) {
    charging = true;
    chargeDir = 1;
  }
  keys.add(key);
  if ((key === 'b' || key === 'enter') && mode === 'carve' && !e.repeat) goBattle();
});
window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  keys.delete(key);
  if (key === ' ' && mode === 'launch' && charging) {
    charging = false;
    if (launchPull > 12 && player) {
      const ring = 70 - ((spinAnim % 1.2) / 1.2) * 58;
      const perfectNow = Math.abs(ring - 28) < 12;
      perfect = perfectNow;
      fireLaunch(launchPull, launchAim, perfectNow);
    }
  }
  if (mode === 'battle' && !drag) dashing = keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown');
});
window.addEventListener('resize', resize);
resize();
beginFight(0, false, 0);
window.__game = {
  get: () => ({
    mode,
    fight: fight + 1,
    score,
    label: statsOf(radii).label,
    stamina: statsOf(radii).stamina,
    started,
    phase: winEl.classList.contains('hidden') ? (overEl.classList.contains('hidden') ? mode : 'over') : 'win',
  }),
  battle() { goBattle(); },
  launch(pull, aim, isPerfect) { fireLaunch(pull, aim, isPerfect); },
  radii() { return radii.slice(); },
};
requestAnimationFrame(frame);
