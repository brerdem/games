const RL = globalThis.TopLogic;
const {
  ARENA,
  LAUNCH_SCALE,
  OPPONENTS,
  blank,
  collide,
  cutProfile,
  designTop,
  launchTop,
  makeRng,
  statsOf,
  stepTop,
} = RL;

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');
const pauseEl = document.getElementById('pause');
const SAVE_KEY = 'top-turner-progress-v1';

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
let pointerCarve = false;
let muted = false;
let paused = false;
let hitStop = 0;
let perfectPop = 0;
let sparks = [];
let settle = null;
let banner = '';
let progress = loadProgress();

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { unlocked: raw.unlocked || 1, mute: Boolean(raw.mute), best: raw.best || 0 };
  } catch (err) {
    return { unlocked: 1, mute: false, best: 0 };
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

function blip(freq, dur = 0.07, type = 'square', gain = 0.04) {
  try {
    const ac = audio();
    if (!ac) return;
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
    || !winEl.classList.contains('hidden')
    || !pauseEl.classList.contains('hidden');
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
  const omega = (0.55 + 0.45 * (len / 160)) * (isPerfect ? 1.15 : 1);
  const speed = len * LAUNCH_SCALE;
  launchTop(player, Math.cos(aim) * speed, Math.sin(aim) * speed, omega);
  const opp = OPPONENTS[fight];
  const enemySpeed = opp.pull * 0.85;
  launchTop(enemy, Math.sin(opp.aim || 0) * enemySpeed * 0.25, enemySpeed, opp.omega);
  player.omega0 = omega;
  mode = 'battle';
  battleT = 0;
  dash = 100;
  settle = null;
  banner = '';
  if (isPerfect) {
    perfectPop = 0.9;
    blip(880, 0.12, 'sine', 0.05);
  }
}

function reasonLine(won, reason) {
  const you = player && player.stats ? player.stats.stamina.toFixed(1) : '?';
  const them = enemy && enemy.stats ? enemy.stats.stamina.toFixed(1) : '?';
  if (reason === 'edge') return won ? `${OPPONENTS[fight].name} went over the edge` : 'Over the edge: the rim caught a fast launch';
  if (reason === 'spin') return won ? `${OPPONENTS[fight].name} spun out (${them}s)` : `Spun out: stamina ${you}s vs ${them}s`;
  if (reason === 'time') return won ? 'You outlasted the clock' : 'Outspun when time ran out';
  return won ? `Knocked out ${OPPONENTS[fight].name}` : 'Knocked out';
}

function finishBattle(won, reason) {
  if (settle || mode === 'win' || mode === 'over') return;
  settle = { t: 0, won, reason };
  banner = won ? 'KNOCKED OUT' : (reason === 'edge' ? 'OVER THE EDGE' : reason === 'time' ? 'OUTSPUN' : 'SPUN OUT');
  mode = 'settle';
  blip(won ? 520 : 90, 0.16, won ? 'sine' : 'triangle', 0.05);
}

function revealResult(won, reason) {
  const ratio = player.omega0 ? Math.max(0, player.w / player.omega0) : 0;
  const gained = won ? Math.round(1000 * ratio + 500 + (perfect ? 200 : 0)) : 0;
  score = levelStartScore + gained;
  if (won) {
    const last = fight >= OPPONENTS.length - 1;
    document.getElementById('winTitle').textContent = last ? 'YOU WIN' : 'CLEARED';
    document.getElementById('winScore').textContent = `${reasonLine(true, reason)}  ·  Score ${score}`;
    progress.unlocked = Math.max(progress.unlocked || 1, Math.min(OPPONENTS.length, fight + 2));
    progress.best = Math.max(progress.best || 0, score);
    saveProgress();
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
    document.getElementById('finalScore').textContent = `${reasonLine(false, reason)}  ·  Fight ${fight + 1}`;
    overEl.classList.remove('hidden');
    document.getElementById('retryLevelBtn').focus();
  }
  mode = won ? 'win' : 'over';
}

function latheGeom() {
  const slices = radii.length;
  const landscape = W > H;
  if (landscape) {
    const top = 1;
    const bottom = H - 1;
    const slice = (bottom - top) / slices;
    const scale = Math.min(118, (bottom - top) * 0.22);
    const axisX = scale + 16;
    const statsX = axisX + scale + 18;
    return {
      top, bottom, axisX, scale, slice, landscape,
      statsX, statsY: 20, statsW: Math.max(120, W - statsX - 16), statsH: 150,
      battle: { x: statsX, y: H - 64, w: Math.min(200, W - statsX - 16), h: 52 },
    };
  }
  const battleH = 70;
  const statsH = 128;
  const top = 86;
  const bottom = Math.max(top + slices * 12, H - battleH - statsH);
  const slice = (bottom - top) / slices;
  const scale = Math.min(W * 0.3, 130, (W / 2) - 10);
  const axisX = W / 2;
  return {
    top, bottom, axisX, scale, slice, landscape: false,
    statsX: 20, statsY: bottom + 10, statsW: W - 40, statsH: statsH - 16,
    battle: { x: W / 2 - 84, y: H - 62, w: 168, h: 52 },
  };
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
  perfectPop = Math.max(0, perfectPop - dt);
  sparks = sparks.filter((spark) => {
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    return spark.life > 0;
  });
  if (!started || overlaysOpen() || paused) return;
  if (mode === 'settle' && settle) {
    settle.t += dt;
    if (settle.t >= 0.55) revealResult(settle.won, settle.reason);
    return;
  }
  if (mode === 'carve' && keys.has(' ') && !pointerCarve) {
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
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt);
    return;
  }
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
    if (hit > 8) {
      hitStop = 0.03;
      blip(220 + Math.min(80, hit), 0.05, 'square', 0.04);
      const spot = arenaPoint((player.x + enemy.x) / 2, (player.y + enemy.y) / 2);
      for (let i = 0; i < 8; i++) {
        const ang = Math.random() * Math.PI * 2;
        sparks.push({ x: spot.x, y: spot.y, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.35, color: '#ffe08a' });
      }
    }
    if (enemy && !enemy.out && player && !player.out) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.vx += 130 * (dx / len) * step;
      enemy.vy += 130 * (dy / len) * step;
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
  chunkText(`Fight ${fight + 1}`, W / 2, 46, 20, '#3a2414', '#fff6ea');
  chunkText(OPPONENTS[fight].name, W / 2, 78, 16, '#ffe08a', '#3a2414');
  const scoreLabel = String(score);
  ctx.font = `700 18px ${FONT}`;
  const scoreW = Math.max(52, ctx.measureText(scoreLabel).width + 16);
  roundRect(16, 54, scoreW, 28, 10);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(scoreLabel, 16 + scoreW / 2, 68, 16, '#3a2414', '#fff6ea');

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
  const panelX = g.statsX;
  const panelY = g.statsY;
  ctx.textAlign = 'left';
  chunkText(stats.label, panelX, panelY, 18, '#fff6ea', '#3a2414');
  labels.forEach((row, i) => {
    const y = panelY + 22 + i * 22;
    chunkText(row[0], panelX, y, 12, '#fff6ea', '#3a2414');
    roundRect(panelX + 78, y - 6, Math.min(120, g.statsW - 86), 8, 4);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fill();
    roundRect(panelX + 78, y - 6, Math.min(120, g.statsW - 86) * row[1], 8, 4);
    ctx.fillStyle = '#e2b15c';
    ctx.fill();
  });

  battleBox = g.battle;
  roundRect(battleBox.x, battleBox.y, battleBox.w, battleBox.h, 16);
  ctx.fillStyle = '#e2b15c';
  ctx.fill();
  ctx.textAlign = 'center';
  chunkText('Battle', battleBox.x + battleBox.w / 2, battleBox.y + battleBox.h / 2, 20, '#3a2414', '#8a6230');
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
    const tilt = mode === 'settle' && settle && !settle.won ? Math.min(0.8, settle.t * 2) : 0;
    drawTop(player, spinAnim * (player.w || 0) * 6 + (settle && !settle.won ? tilt : 0));
    drawTop(enemy, spinAnim * (enemy.w || 0) * 6 + (settle && settle.won ? tilt : 0));
    roundRect(24, H - 36, 120, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fill();
    roundRect(24, H - 36, 120 * (dash / 100), 12, 6);
    ctx.fillStyle = '#3ecfb2';
    ctx.fill();
    if (player && enemy) {
      chunkText(`You ${Math.round(player.w * 100)}`, 70, 78, 13, '#3ecfb2', '#10241f');
      chunkText(`${Math.round(enemy.w * 100)}`, W - 70, 78, 13, enemy.color, '#10241f');
    }
  }
  if (perfectPop > 0) {
    ctx.globalAlpha = Math.min(1, perfectPop);
    chunkText('PERFECT', W / 2, H * 0.38, 42, '#fff6ea', '#8a6230');
    ctx.globalAlpha = 1;
  }
  if (banner) {
    chunkText(banner, W / 2, H * 0.22, 36, '#fff6ea', '#6a3e22');
  }
  for (const spark of sparks) {
    ctx.globalAlpha = Math.max(0, spark.life / 0.35);
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x, spark.y, 4, 4);
  }
  ctx.globalAlpha = 1;
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

function pointerInside(e) {
  if (!e || e.clientX == null) return false;
  const rect = canvas.getBoundingClientRect();
  return e.clientX >= rect.left && e.clientY >= rect.top && e.clientX <= rect.right && e.clientY <= rect.bottom;
}

function onDown(e) {
  if (!started || overlaysOpen() || paused || performance.now() < ignoreUntil) return;
  audio();
  const p = pointerPos(e);
  if (mode === 'carve') {
    if (battleBox && p.x >= battleBox.x && p.x <= battleBox.x + battleBox.w && p.y >= battleBox.y && p.y <= battleBox.y + battleBox.h) {
      goBattle();
      return;
    }
    pointerCarve = true;
    carveAt(p.x, p.y, 0.05);
    drag = { id: e.pointerId, x: p.x, y: p.y, startX: p.x, startY: p.y };
  } else if (mode === 'launch' && player) {
    const spot = arenaPoint(player.x, player.y);
    const radius = player.rho * spot.scale;
    if (Math.hypot(p.x - spot.x, p.y - spot.y) > radius * 2.2) return;
    drag = { id: e.pointerId, x: p.x, y: p.y, startX: p.x, startY: p.y };
    launchPull = 0;
  } else if (mode === 'battle' && player) {
    dashing = true;
    const spot = arenaPoint(player.x, player.y);
    dashX = p.x - spot.x;
    dashY = p.y - spot.y;
    drag = { id: e.pointerId, x: p.x, y: p.y, startX: p.x, startY: p.y };
  }
  e.preventDefault();
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (!pointerInside(e)) return;
  const p = pointerPos(e);
  drag.x = p.x;
  drag.y = p.y;
  if (mode === 'carve' && pointerCarve) carveAt(p.x, p.y, 0.016);
  if (mode === 'launch' && player) {
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    launchPull = Math.min(160, Math.hypot(dx, dy));
    if (launchPull > 4) launchAim = Math.atan2(-dy, -dx);
  }
  if (mode === 'battle' && player) {
    const spot = arenaPoint(player.x, player.y);
    dashX = p.x - spot.x;
    dashY = p.y - spot.y;
  }
}

function releaseDrag(e) {
  if (!drag || (e && e.pointerId != null && e.pointerId !== drag.id)) return;
  if (mode === 'launch' && player && launchPull > 12) {
    const spot = arenaPoint(player.x, player.y);
    const ring = 70 - ((spinAnim % 1.2) / 1.2) * 58;
    const perfectNow = Math.abs(ring - player.rho * spot.scale) < 10;
    perfect = perfectNow;
    fireLaunch(launchPull, launchAim, perfectNow);
  }
  pointerCarve = false;
  dashing = false;
  drag = null;
}

function onUp(e) {
  releaseDrag(e);
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
function toggleMute() {
  muted = !muted;
  progress.mute = muted;
  saveProgress();
  const btn = document.getElementById('muteBtn');
  btn.textContent = muted ? 'Muted' : 'Sound';
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}

function restartFight() {
  pauseEl.classList.add('hidden');
  paused = false;
  overEl.classList.add('hidden');
  winEl.classList.add('hidden');
  settle = null;
  banner = '';
  beginFight(fight, false, levelStartScore);
}

document.getElementById('muteBtn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleMute(); });
document.getElementById('pauseBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  if (!started || !startEl.classList.contains('hidden')) return;
  paused = true;
  pauseEl.classList.remove('hidden');
});
document.getElementById('resumeBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  pauseEl.classList.add('hidden');
  paused = false;
  armOverlayLock();
});
document.getElementById('restartBtn').addEventListener('click', (e) => { e.currentTarget.blur(); restartFight(); });

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', (e) => releaseDrag(e));
window.addEventListener('keydown', (e) => {
  if (!helpEl.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      helpEl.classList.add('hidden');
      armOverlayLock();
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
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!pauseEl.classList.contains('hidden')) {
      pauseEl.classList.add('hidden');
      paused = false;
    } else if (mode === 'battle' || mode === 'carve' || mode === 'launch' || mode === 'settle') {
      paused = true;
      pauseEl.classList.remove('hidden');
    }
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    toggleMute();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    restartFight();
    return;
  }
  if (!overEl.classList.contains('hidden') || !winEl.classList.contains('hidden') || !pauseEl.classList.contains('hidden')) return;
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
muted = Boolean(progress.mute);
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
  muteBtn.textContent = muted ? 'Muted' : 'Sound';
  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}
window.__game = {
  get: () => ({
    mode,
    fight: fight + 1,
    score,
    label: statsOf(radii).label,
    stamina: statsOf(radii).stamina,
    started,
    muted,
    paused,
    pull: launchPull,
    phase: !winEl.classList.contains('hidden') ? 'win' : (!overEl.classList.contains('hidden') ? 'over' : (!pauseEl.classList.contains('hidden') ? 'pause' : mode)),
  }),
  battle() { goBattle(); },
  launch(pull, aim, isPerfect) { fireLaunch(pull, aim, isPerfect); },
  radii() { return radii.slice(); },
  launchPoint() {
    if (!player) return null;
    const spot = arenaPoint(player.x, player.y);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (spot.x / W) * rect.width,
      y: rect.top + (spot.y / H) * rect.height,
    };
  },
  lathe() {
    const g = latheGeom();
    return {
      axisX: g.axisX,
      top: g.top,
      bottom: g.bottom,
      scale: g.scale,
      slice: g.slice,
      stats: { x: g.statsX, y: g.statsY, w: g.statsW, h: g.statsH },
      battle: g.battle,
      width: W,
      height: H,
    };
  },
};
requestAnimationFrame(frame);
