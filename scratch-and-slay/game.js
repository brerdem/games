import {
  cashIn,
  makeRun,
  pickReward,
  restartFight,
  revealCell,
  revealedSkulls,
  scoreOf,
} from './logic.js';

const FONT = '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startEl = document.getElementById('start');
const helpEl = document.getElementById('help');
const rewardEl = document.getElementById('reward');
const overEl = document.getElementById('over');
const winEl = document.getElementById('win');
const cashBtn = document.getElementById('cashBtn');

let W = 800;
let H = 900;
let started = false;
let run = null;
let coat = null;
let coatCard = null;
let cursor = 0;
let pointer = null;
let flakes = [];
let shake = 0;
let announced = '';
let actx = null;
let noiseAt = 0;
let usedUrl = false;

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

function scratchNoise() {
  const now = performance.now();
  if (now - noiseAt < 70) return;
  noiseAt = now;
  try {
    const ac = audio();
    const n = Math.floor(ac.sampleRate * 0.05);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    const amp = ac.createGain();
    amp.gain.value = 0.04;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    src.start();
  } catch {
    /* audio is optional */
  }
}

function rollSeed() {
  const fromUrl = Number(new URLSearchParams(location.search).get('seed'));
  if (!usedUrl && Number.isFinite(fromUrl) && fromUrl > 0) {
    usedUrl = true;
    return fromUrl >>> 0;
  }
  usedUrl = true;
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function startRun() {
  run = makeRun(rollSeed());
  coat = null;
  coatCard = null;
  cursor = 0;
  announced = '';
  shake = 0;
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, rect.width);
  H = Math.max(1, rect.height);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  coat = null;
  coatCard = null;
}

function layout() {
  const hud = Math.max(78, Math.min(110, H * 0.12));
  const bottom = 84;
  const top = hud + Math.min(150, H * 0.2);
  const size = Math.max(180, Math.min(W * 0.72, H - top - bottom, 460));
  return {
    hud,
    card: { x: (W - size) / 2, y: top + Math.max(0, (H - top - bottom - size) / 2), s: size },
    enemy: { x: W / 2, y: hud + Math.min(78, H * 0.1) },
  };
}

function ensureCoat(card, size) {
  if (!run?.card) {
    coat = null;
    coatCard = null;
    return;
  }
  if (coat && coatCard === card && coat.width === Math.round(size)) return;
  const px = Math.round(size);
  const next = document.createElement('canvas');
  next.width = px;
  next.height = px;
  const g = next.getContext('2d');
  const grad = g.createLinearGradient(0, 0, px, px);
  grad.addColorStop(0, '#c5cad3');
  grad.addColorStop(0.45, '#f7f8fa');
  grad.addColorStop(1, '#aeb6c2');
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  const img = g.getImageData(0, 0, px, px);
  for (let i = 0; i < img.data.length; i += 16) {
    const n = (Math.random() * 28) | 0;
    img.data[i] = Math.min(255, img.data[i] + n);
    img.data[i + 1] = Math.min(255, img.data[i + 1] + n);
    img.data[i + 2] = Math.min(255, img.data[i + 2] + n);
  }
  g.putImageData(img, 0, 0);
  if (coat && coatCard === card) {
    for (let i = 0; i < card.cells.length; i++) if (card.cells[i].revealed) punch(next, i);
  }
  coat = next;
  coatCard = card;
}

function punch(target, index) {
  const g = target.getContext('2d');
  const cs = target.width / 3;
  g.globalCompositeOperation = 'destination-out';
  g.fillRect((index % 3) * cs, Math.floor(index / 3) * cs, cs + 1, cs + 1);
  g.globalCompositeOperation = 'source-over';
}

function fraction(index) {
  const cs = coat.width / 3;
  const data = coat.getContext('2d').getImageData((index % 3) * cs, Math.floor(index / 3) * cs, cs, cs).data;
  const step = Math.max(1, Math.floor(cs / 12));
  let total = 0;
  let clear = 0;
  for (let y = 0; y < cs; y += step) {
    for (let x = 0; x < cs; x += step) {
      total += 1;
      if (data[(y * cs + x) * 4 + 3] < 40) clear += 1;
    }
  }
  return total ? clear / total : 0;
}

function openCell(index) {
  if (!run?.card || run.card.cells[index].revealed) return;
  const result = revealCell(run, index);
  if (!result.ok) return;
  if (coat && run.card) punch(coat, index);
  const cell = result.cell;
  if (cell) {
    const tone = { sword: 880, shield: 520, heart: 640, coin: 760, star: 980, skull: 140 };
    blip(tone[cell.kind] || 400, cell.kind === 'skull' ? 0.14 : 0.07, cell.kind === 'skull' ? 'triangle' : 'sine', 0.05);
  }
  if (result.bust) {
    shake = 8;
    blip(90, 0.2, 'sawtooth', 0.04);
    syncPanels();
  }
}

function doCash() {
  if (!run?.card || run.phase !== 'fight') return;
  const summary = cashIn(run);
  if (summary) console.log('cash-in', summary);
  blip(660, 0.08);
  coat = null;
  syncPanels();
}

function syncPanels() {
  const playing = started && run && startEl.classList.contains('hidden') && helpEl.classList.contains('hidden');
  cashBtn.classList.toggle('hidden', !(playing && run.phase === 'fight' && run.card));
  rewardEl.classList.toggle('hidden', !(playing && run.phase === 'reward'));
  if (run?.phase === 'reward') {
    run.rewards.forEach((reward, index) => {
      const button = document.getElementById(`reward${index}`);
      button.textContent = reward.label;
      button.classList.remove('hidden');
    });
  }
  if (run?.phase === 'over' && announced !== 'over') {
    announced = 'over';
    document.getElementById('finalScore').textContent = `Score ${scoreOf(run)}  ·  seed ${run.seed}`;
    overEl.classList.remove('hidden');
    document.getElementById('retryLevelBtn').focus();
  }
  if (run?.phase === 'win' && announced !== 'win') {
    announced = 'win';
    document.getElementById('winScore').textContent = `Score ${scoreOf(run)}  ·  seed ${run.seed}`;
    winEl.classList.remove('hidden');
    blip(523, 0.1);
    blip(784, 0.14);
  }
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
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawSword(s) {
  ctx.fillStyle = '#d5dbe6';
  ctx.fillRect(-s * 0.08, -s * 0.42, s * 0.16, s * 0.62);
  ctx.fillStyle = '#8d6a3a';
  ctx.fillRect(-s * 0.22, s * 0.12, s * 0.44, s * 0.1);
  ctx.fillStyle = '#d5dbe6';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.48);
  ctx.lineTo(s * 0.14, -s * 0.28);
  ctx.lineTo(-s * 0.14, -s * 0.28);
  ctx.fill();
}

function drawShield(s) {
  ctx.fillStyle = '#6aa6e6';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.lineTo(s * 0.32, -s * 0.22);
  ctx.lineTo(s * 0.22, s * 0.28);
  ctx.lineTo(0, s * 0.46);
  ctx.lineTo(-s * 0.22, s * 0.28);
  ctx.lineTo(-s * 0.32, -s * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawHeart(s) {
  ctx.fillStyle = '#e15d6c';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.36);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.05, -s * 0.28, -s * 0.48, 0, -s * 0.16);
  ctx.bezierCurveTo(s * 0.28, -s * 0.48, s * 0.5, -s * 0.05, 0, s * 0.36);
  ctx.fill();
}

function drawCoin(s) {
  ctx.fillStyle = '#f0c14a';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a67c22';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawStar(s) {
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.36 : s * 0.16;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSkull(s) {
  ctx.fillStyle = '#f4f0e8';
  ctx.beginPath();
  ctx.arc(0, -s * 0.06, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a211c';
  ctx.beginPath();
  ctx.arc(-s * 0.08, -s * 0.08, s * 0.05, 0, Math.PI * 2);
  ctx.arc(s * 0.08, -s * 0.08, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawSymbol(kind, n, pop) {
  const s = 1 + (pop > 0 ? Math.sin((0.16 - pop) / 0.16 * Math.PI) * 0.12 : 0);
  ctx.save();
  ctx.scale(s, s);
  if (kind === 'sword') drawSword(54);
  else if (kind === 'shield') drawShield(54);
  else if (kind === 'heart') drawHeart(54);
  else if (kind === 'coin') drawCoin(54);
  else if (kind === 'star') drawStar(54);
  else drawSkull(54);
  ctx.restore();
  if (n > 0) chunkText(String(n), 18, 20, 18, '#2a211c', '#fff6ea');
}

function drawEnemy(g) {
  const { x, y } = g.enemy;
  const name = run.enemy.name;
  ctx.save();
  ctx.translate(x, y);
  if (name === 'Rat') {
    ctx.fillStyle = '#c4a574';
    ctx.beginPath();
    ctx.ellipse(0, 8, 48, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(30, -10, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -22, 8, 0, Math.PI * 2);
    ctx.arc(40, -22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a211c';
    ctx.beginPath();
    ctx.arc(36, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === 'Skeleton') {
    ctx.strokeStyle = '#f3efe6';
    ctx.fillStyle = '#f3efe6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 36);
    ctx.moveTo(0, 12);
    ctx.lineTo(-22, 28);
    ctx.moveTo(0, 12);
    ctx.lineTo(22, 28);
    ctx.moveTo(0, 36);
    ctx.lineTo(-16, 54);
    ctx.moveTo(0, 36);
    ctx.lineTo(16, 54);
    ctx.stroke();
    ctx.fillStyle = '#2a211c';
    ctx.fillRect(-6, -20, 4, 4);
    ctx.fillRect(3, -20, 4, 4);
  } else {
    ctx.fillStyle = '#3c2a4a';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(40, 48);
    ctx.lineTo(-40, 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7dcea0';
    ctx.beginPath();
    ctx.arc(-8, -4, 4, 0, Math.PI * 2);
    ctx.arc(8, -4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const barW = 180;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(x - barW / 2, y + 62, barW, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#e15d6c';
  roundRect(x - barW / 2, y + 62, barW * Math.max(0, run.enemy.hp) / run.enemy.maxHp, 12, 6);
  ctx.fill();
  ctx.textAlign = 'center';
  chunkText(run.enemy.intent.label, x, y - 58, 22, '#fff6ea');
  chunkText(`${run.enemy.name}  ${Math.max(0, run.enemy.hp)}`, x, y + 86, 16, '#fff6ea');
  if (run.enemy.block > 0) chunkText(`Block ${run.enemy.block}`, x, y + 106, 14, '#d5e6ff');
}

function render() {
  if (!run) return;
  const g = layout();
  const dpr = canvas.width / W;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#241c20';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 30) {
    for (let x = (y / 30) % 2 ? 0 : -18; x < W; x += 52) {
      ctx.fillStyle = ((x + y) / 10) % 2 < 1 ? '#2c2428' : '#342a2e';
      ctx.fillRect(x, y, 48, 26);
    }
  }
  const glow = ctx.createRadialGradient(g.enemy.x, g.enemy.y, 10, g.enemy.x, g.enemy.y, 180);
  glow.addColorStop(0, 'rgba(255, 170, 90, .28)');
  glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  const hudY = Math.max(36, g.hud * 0.4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = run.fight === 2 ? 'Boss' : `Fight ${run.fight + 1}`;
  roundRect(W / 2 - 70, hudY - 22, 140, 40, 16);
  ctx.fillStyle = 'rgba(255,246,234,.9)';
  ctx.fill();
  chunkText(label, W / 2, hudY - 2, 22, '#fff6ea');
  const scoreLabel = String(scoreOf(run));
  ctx.font = `700 26px ${FONT}`;
  const scoreW = Math.max(72, ctx.measureText(scoreLabel).width + 24);
  roundRect(W - 16 - scoreW, hudY - 22, scoreW, 40, 14);
  ctx.fillStyle = 'rgba(255,246,234,.92)';
  ctx.fill();
  chunkText(scoreLabel, W - 16 - scoreW / 2, hudY - 2, 24, '#fff4c2');
  chunkText(`HP ${run.hp}`, 58, hudY - 2, 22, '#ffd0d6');
  if (run.block > 0) chunkText(`Blk ${run.block}`, 58, hudY + 24, 16, '#d5e8ff');
  chunkText(`Gold ${run.gold}`, W * 0.22, hudY + 24, 16, '#ffe08a');

  if (run.enemy && run.phase !== 'win') drawEnemy(g);

  const card = g.card;
  if (run.card) {
    ensureCoat(run.card, card.s);
    const danger = revealedSkulls(run.card) >= 2;
    ctx.fillStyle = '#f3e6c8';
    roundRect(card.x - 10, card.y - 36, card.s + 20, card.s + 52, 18);
    ctx.fill();
    ctx.textAlign = 'center';
    chunkText(`${run.card.name}   Skulls ${run.card.skulls}`, card.x + card.s / 2, card.y - 16, 16, '#3a261c', '#f3e6c8');
    const cell = card.s / 3;
    for (let i = 0; i < 9; i++) {
      const item = run.card.cells[i];
      const x = card.x + (i % 3) * cell + cell / 2;
      const y = card.y + Math.floor(i / 3) * cell + cell / 2;
      const pop = run.card.pops.find((entry) => entry.index === i)?.t || 0;
      ctx.save();
      ctx.translate(x, y);
      drawSymbol(item.kind, item.n, item.revealed ? pop : 0);
      ctx.restore();
    }
    ctx.drawImage(coat, card.x, card.y, card.s, card.s);
    ctx.strokeStyle = danger ? '#e15d6c' : 'rgba(90, 60, 40, .35)';
    ctx.lineWidth = danger ? 4 : 2;
    ctx.strokeRect(card.x, card.y, card.s, card.s);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(card.x + i * cell, card.y);
      ctx.lineTo(card.x + i * cell, card.y + card.s);
      ctx.moveTo(card.x, card.y + i * cell);
      ctx.lineTo(card.x + card.s, card.y + i * cell);
      ctx.stroke();
    }
    if (started && cursor >= 0) {
      ctx.strokeStyle = '#fff6ea';
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x + (cursor % 3) * cell + 4, card.y + Math.floor(cursor / 3) * cell + 4, cell - 8, cell - 8);
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(card.x + card.s / 2 + (i - 1) * 28, card.y + card.s + 22, 8, 0, Math.PI * 2);
      ctx.fillStyle = i < revealedSkulls(run.card) ? '#e15d6c' : 'rgba(255,246,234,.35)';
      ctx.fill();
    }
  }
  for (const flake of flakes) {
    ctx.globalAlpha = Math.max(0, flake.life);
    ctx.fillStyle = '#d5dbe3';
    ctx.fillRect(flake.x, flake.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function update(dt) {
  shake = Math.max(0, shake - dt * 24);
  if (run?.card?.pops) {
    for (const pop of run.card.pops) pop.t -= dt;
    run.card.pops = run.card.pops.filter((pop) => pop.t > 0);
  }
  for (const flake of flakes) {
    flake.life -= dt;
    flake.y += 40 * dt;
  }
  flakes = flakes.filter((flake) => flake.life > 0);
  syncPanels();
}

function worldPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function cellAt(x, y) {
  const card = layout().card;
  if (!run?.card || x < card.x || y < card.y || x > card.x + card.s || y > card.y + card.s) return -1;
  const col = Math.min(2, Math.floor(((x - card.x) / card.s) * 3));
  const row = Math.min(2, Math.floor(((y - card.y) / card.s) * 3));
  return row * 3 + col;
}

function scratch(x, y) {
  if (!coat || !run?.card) return;
  const card = layout().card;
  const lx = ((x - card.x) / card.s) * coat.width;
  const ly = ((y - card.y) / card.s) * coat.height;
  const screenRadius = Math.max(22, (card.s / 3) * 0.34);
  const radius = (screenRadius / card.s) * coat.width;
  const g = coat.getContext('2d');
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(lx, ly, radius, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  flakes.push({ x, y, life: 0.35 });
  scratchNoise();
  const cs = coat.width / 3;
  for (let i = 0; i < 9; i++) {
    if (run.card.cells[i].revealed) continue;
    const cx = (i % 3) * cs + cs / 2;
    const cy = Math.floor(i / 3) * cs + cs / 2;
    if (Math.hypot(lx - cx, ly - cy) > cs * 0.85) continue;
    if (fraction(i) >= 0.45) openCell(i);
    if (!run.card) break;
  }
}

function onDown(e) {
  if (!started || !run || run.phase !== 'fight' || !run.card) return;
  if (!helpEl.classList.contains('hidden') || !startEl.classList.contains('hidden')) return;
  audio();
  const p = worldPoint(e);
  pointer = { id: e.pointerId, x: p.x, y: p.y, t: performance.now(), moved: false };
  const index = cellAt(p.x, p.y);
  if (index >= 0) cursor = index;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* released */ }
  e.preventDefault();
}

function onMove(e) {
  if (!pointer || e.pointerId !== pointer.id) return;
  const p = worldPoint(e);
  if (Math.hypot(p.x - pointer.x, p.y - pointer.y) > 6) pointer.moved = true;
  pointer.x = p.x;
  pointer.y = p.y;
  if (pointer.moved) scratch(p.x, p.y);
}

function onUp(e) {
  if (!pointer || e.pointerId !== pointer.id) return;
  const elapsed = performance.now() - pointer.t;
  const tap = !pointer.moved && elapsed < 280;
  const index = cellAt(pointer.x, pointer.y);
  pointer = null;
  if (tap && index >= 0) openCell(index);
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
  if (!run) startRun();
  syncPanels();
});
cashBtn.addEventListener('click', (e) => {
  e.currentTarget.blur();
  doCash();
});
for (let i = 0; i < 3; i++) {
  document.getElementById(`reward${i}`).addEventListener('click', (e) => {
    e.currentTarget.blur();
    pickReward(run, i);
    coat = null;
    announced = '';
    syncPanels();
  });
}
document.getElementById('retryLevelBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  announced = '';
  restartFight(run);
  coat = null;
  syncPanels();
});
document.getElementById('retryBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  overEl.classList.add('hidden');
  startRun();
  syncPanels();
});
document.getElementById('againBtn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  winEl.classList.add('hidden');
  startRun();
  syncPanels();
});
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', () => { pointer = null; });
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
  if (run?.phase === 'reward') {
    if (['1', '2', '3'].includes(e.key)) pickReward(run, Number(e.key) - 1);
    return;
  }
  if (!overEl.classList.contains('hidden') || !winEl.classList.contains('hidden')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) e.preventDefault();
  if (!run?.card || e.repeat) return;
  audio();
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') cursor = Math.max(0, cursor - 1);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') cursor = Math.min(8, cursor + 1);
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') cursor = Math.max(0, cursor - 3);
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') cursor = Math.min(8, cursor + 3);
  if (e.key === ' ') openCell(cursor);
  if (e.key === 'Enter') doCash();
});
window.addEventListener('resize', resize);
resize();
run = makeRun(rollSeed());
window.__game = {
  get: () => ({
    phase: run.phase,
    fight: run.fight,
    hp: run.hp,
    block: run.block,
    gold: run.gold,
    score: scoreOf(run),
    seed: run.seed,
    enemy: run.enemy && { name: run.enemy.name, hp: run.enemy.hp, intent: run.enemy.intent.label, block: run.enemy.block },
    skulls: run.card?.skulls ?? null,
    cells: run.card ? run.card.cells.map((cell) => ({ kind: cell.kind, n: cell.n, revealed: cell.revealed })) : null,
    rewards: run.rewards.map((reward) => reward.id),
    cardBox: layout().card,
    started,
  }),
  reveal(index) { openCell(index); },
  cash() { doCash(); },
  pick(index) { pickReward(run, index); coat = null; },
};
requestAnimationFrame(frame);
