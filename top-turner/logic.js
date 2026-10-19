(function (root) {
const SLICES = 32;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blank() {
  return Array.from({ length: SLICES }, () => 1);
}

function cutProfile(radii, index, cut, dt) {
  const k = Math.max(0, Math.min(SLICES - 1, index));
  const c = Math.max(0.08, Math.min(1, cut));
  if (c >= radii[k]) return false;
  const step = 2.5 * dt;
  radii[k] = Math.max(c, radii[k] - step);
  for (const n of [k - 1, k + 1]) {
    if (n < 0 || n >= SLICES) continue;
    const goal = Math.max(c, radii[k]);
    if (radii[n] > goal) radii[n] = Math.max(goal, radii[n] - step * 0.5);
  }
  return true;
}

function statsOf(radii) {
  const n = radii.length;
  let vSum = 0;
  let iSum = 0;
  let hNum = 0;
  let reach = 0;
  for (let i = 0; i < n; i++) {
    const r = radii[i];
    const r2 = r * r;
    vSum += r2;
    iSum += r2 * r2;
    hNum += (n - 1 - i) * r2;
    if (r > reach) reach = r;
  }
  const volume = vSum / n;
  const mass = volume;
  const inertia = iSum / (2 * n);
  const com = vSum ? hNum / ((n - 1) * vSum) : 0.5;
  const tip = (radii[n - 3] + radii[n - 2] + radii[n - 1]) / 3;
  const mu = 0.35 + 1.6 * tip;
  const decay = (0.04 * mu) / (inertia + 0.08);
  const stamina = Math.log(1 / 0.12) / decay;
  const traction = 0.2 + 1.8 * tip;
  const wobbleAt = 0.12 + 0.45 * com;
  const bars = {
    stamina: clamp01((stamina - 1.2) / 4.5),
    stability: clamp01(1 - com),
    weight: clamp01((mass - 0.15) / 0.85),
    reach: clamp01((reach - 0.2) / 0.8),
    speed: clamp01((traction - 0.2) / 1.6),
  };
  return { mass, inertia, reach, com, tip, mu, decay, stamina, traction, wobbleAt, bars, label: archetype(bars) };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function archetype(bars) {
  const pairs = [
    ['Attack', bars.speed + bars.reach],
    ['Defense', bars.weight + bars.stability],
    ['Stamina', bars.stamina + bars.stability],
  ].sort((a, b) => b[1] - a[1]);
  if (pairs[0][1] < pairs[1][1] * 1.12) return 'Balance';
  return pairs[0][0];
}

function shaped(tip, body, shoulder = 0.62) {
  return Array.from({ length: SLICES }, (_, i) => {
    const t = i / (SLICES - 1);
    if (t < shoulder) return body;
    const u = (t - shoulder) / (1 - shoulder);
    return Math.max(0.08, body * (1 - u * u) + tip * u);
  });
}

function designTop(radii, name, color, x, y) {
  const stats = statsOf(radii);
  return {
    name,
    color,
    radii: radii.slice(),
    x,
    y,
    vx: 0,
    vy: 0,
    w: 0,
    m: Math.max(0.2, stats.mass),
    R: stats.reach,
    rho: 16 + 26 * stats.reach,
    mu: stats.mu,
    k: stats.decay,
    tau: stats.traction,
    ww: stats.wobbleAt,
    out: null,
    stats,
  };
}

const ARENA = 230;

function launchTop(top, vx, vy, omega) {
  top.vx = vx;
  top.vy = vy;
  top.w = omega;
  top.out = null;
}

function separateRim(top) {
  const rad = Math.hypot(top.x, top.y);
  const limit = ARENA - top.rho;
  if (rad <= limit || rad === 0) return;
  const nx = top.x / rad;
  const ny = top.y / rad;
  const outward = top.vx * nx + top.vy * ny;
  if (outward > 150) {
    top.out = 'edge';
    return;
  }
  top.x = nx * limit;
  top.y = ny * limit;
  if (outward > 0) {
    top.vx -= 1.5 * outward * nx;
    top.vy -= 1.5 * outward * ny;
  }
}

function stepTop(top, dt, rng) {
  if (top.out) return;
  top.vx += -0.9 * top.x * dt;
  top.vy += -0.9 * top.y * dt;
  const len = Math.hypot(top.x, top.y) || 1;
  const drive = top.tau * top.w * 120 * dt;
  top.vx += (-top.y / len) * drive;
  top.vy += (top.x / len) * drive;
  const damp = Math.max(0, 1 - 0.6 * top.mu * dt);
  top.vx *= damp;
  top.vy *= damp;
  top.w -= top.k * top.w * dt + 0.004 * dt;
  if (top.w < top.ww) {
    const mag = 180 * ((top.ww - top.w) / top.ww) * dt;
    top.vx += (rng() * 2 - 1) * mag;
    top.vy += (rng() * 2 - 1) * mag;
  }
  top.x += top.vx * dt;
  top.y += top.vy * dt;
  separateRim(top);
  if (!top.out && top.w < 0.12) top.out = 'spin';
}

function collide(a, b) {
  if (a.out || b.out) return 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const min = a.rho + b.rho;
  if (dist >= min) return 0;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  const total = a.m + b.m;
  a.x -= nx * overlap * (b.m / total);
  a.y -= ny * overlap * (b.m / total);
  b.x += nx * overlap * (a.m / total);
  b.y += ny * overlap * (a.m / total);
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return 0;
  const impulse = -(1.8) * rel / (1 / a.m + 1 / b.m);
  a.vx -= (impulse / a.m) * nx;
  a.vy -= (impulse / a.m) * ny;
  b.vx += (impulse / b.m) * nx;
  b.vy += (impulse / b.m) * ny;
  const impact = -rel;
  const hurtB = Math.min(0.014, 0.00007 * impact * (a.R / Math.max(0.08, b.R)) * (a.m / total));
  const hurtA = Math.min(0.014, 0.00007 * impact * (b.R / Math.max(0.08, a.R)) * (b.m / total));
  a.w = Math.max(0, a.w - hurtA);
  b.w = Math.max(0, b.w - hurtB);
  return impulse;
}

function cone(tip, body = 0.85) {
  return Array.from({ length: SLICES }, (_, i) => {
    const t = i / (SLICES - 1);
    return Math.max(0.08, body * (1 - t) + tip * t);
  });
}

const LAUNCH_SCALE = 1.15;

const OPPONENTS = [
  { name: 'Pine Pawn', color: '#e2b15c', radii: shaped(0.45, 0.74, 0.48), pull: 64, omega: 0.7, aim: 0.1 },
  { name: 'Flat Jack', color: '#ff6f59', radii: shaped(0.62, 0.94, 0.58), pull: 72, omega: 0.78, aim: -0.08 },
  { name: 'Needle', color: '#8fd0ff', radii: shaped(0.085, 0.75, 0.43), pull: 86, omega: 1.0, aim: 0 },
];

function fightSim(playerRadii, fightIndex, aim, pull, seed) {
  const opp = OPPONENTS[fightIndex];
  const player = designTop(playerRadii, 'You', '#3ecfb2', 0, ARENA * 0.62);
  const enemy = designTop(opp.radii, opp.name, opp.color, 0, -ARENA * 0.62);
  const len = Math.max(0, Math.min(160, pull));
  const omega = 0.55 + 0.45 * (len / 160);
  const speed = len * LAUNCH_SCALE;
  launchTop(player, Math.cos(aim) * speed, Math.sin(aim) * speed, omega);
  const enemySpeed = opp.pull * 0.85;
  launchTop(enemy, Math.sin(opp.aim) * enemySpeed * 0.25, enemySpeed, opp.omega);
  const rng = makeRng(seed == null ? 1 : seed);
  const step = 1 / 120;
  let time = 0;
  let hits = 0;
  let guard = 0;
  while (!player.out && !enemy.out && time < 45 && guard++ < 12000) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    enemy.vx += 130 * (dx / dist) * step;
    enemy.vy += 130 * (dy / dist) * step;
    stepTop(player, step, rng);
    stepTop(enemy, step, rng);
    const impulse = collide(player, enemy);
    if (impulse > 8) hits += 1;
    time += step;
  }
  const won = !player.out && (Boolean(enemy.out) || player.w >= enemy.w);
  return {
    won,
    time,
    hits,
    reason: player.out || (enemy.out ? 'ko' : 'time'),
    playerSpin: player.w,
    enemySpin: enemy.w,
  };
}

  root.TopLogic = {
    SLICES, makeRng, blank, cutProfile, statsOf, shaped, designTop, ARENA, launchTop, stepTop, collide, cone, OPPONENTS, fightSim, LAUNCH_SCALE,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
