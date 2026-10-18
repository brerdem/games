export const MATERIALS = {
  g: { id: 'glass', hp: 1, value: 1, debris: 3, r: 5, mass: 1, color: '#b7f0fb' },
  w: { id: 'wood', hp: 2, value: 2, debris: 1, r: 9, mass: 1, color: '#e2b15c' },
  s: { id: 'stone', hp: 3, value: 3, debris: 1, r: 10, mass: 2, color: '#9aa4b0' },
  t: { id: 'tnt', hp: 1, value: 0, debris: 0, r: 6, mass: 1, color: '#ff5d4e' },
  c: { id: 'crown', hp: 1, value: 10, debris: 1, r: 9, mass: 1, color: '#ffc94d' },
};

export const LEVELS = [
  {
    id: 1,
    balls: 3,
    map: ['..c..', '..g..', '..g..', 'ggggg'],
  },
  {
    id: 2,
    balls: 3,
    map: ['..c..', '.wsw.', '..g..', 'ggggg'],
  },
  {
    id: 3,
    balls: 4,
    map: ['.c.c.', '.tst.', '..g..', 'ggggg'],
  },
];

export function makeLayout(w, h) {
  const hud = Math.max(74, Math.min(110, h * 0.1));
  const bucketH = Math.max(62, h * 0.09);
  const plinkoH = Math.max(200, h * 0.36);
  const bucketTop = h - bucketH - 8;
  const plinkoTop = bucketTop - plinkoH;
  const shelfW = Math.min(w * 0.4, 360);
  const shelf = { x: w * 0.46, y: plinkoTop - 22, w: shelfW, h: 16 };
  const cannon = { x: Math.max(56, w * 0.14), y: shelf.y - 8 };
  const pegs = [];
  const rows = 7;
  for (let row = 0; row < rows; row++) {
    const y = plinkoTop + 28 + row * ((plinkoH - 48) / rows);
    const count = row % 2 === 0 ? 8 : 7;
    const span = w * 0.8;
    const left = (w - span) / 2;
    for (let i = 0; i < count; i++) {
      pegs.push({ x: left + ((i + 0.5) * span) / count, y, r: 6, flash: 0 });
    }
  }
  const labels = [
    { mult: 1 },
    { mult: 2 },
    { kind: 'ball' },
    { mult: 5 },
    { kind: 'ball' },
    { mult: 2 },
    { mult: 1 },
  ];
  const span = w * 0.88;
  const bw = span / labels.length;
  const bx = (w - span) / 2;
  const buckets = labels.map((label, i) => ({ ...label, x: bx + i * bw, w: bw, y: bucketTop }));
  return {
    w,
    h,
    hud,
    shelf,
    cannon,
    pegs,
    buckets,
    plinkoTop,
    bucketTop,
    scale: h / 960,
  };
}

function cellOf(layout, map) {
  const width = map[0].length;
  return Math.min(34, (layout.shelf.w - 12) / width);
}

export function createState(levelIndex, layout, score = 0) {
  const level = LEVELS[levelIndex];
  const map = level.map;
  const cell = cellOf(layout, map);
  const originX = layout.shelf.x + (layout.shelf.w - map[0].length * cell) / 2;
  const blocks = [];
  let id = 1;
  for (let row = 0; row < map.length; row++) {
    const gridR = map.length - 1 - row;
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      if (ch === '.' || !MATERIALS[ch]) continue;
      blocks.push({
        id: id++,
        c: col,
        r: gridR,
        mat: MATERIALS[ch],
        hp: MATERIALS[ch].hp,
        x: originX + col * cell,
        y: layout.shelf.y - (gridR + 1) * cell,
        s: cell - 3,
      });
    }
  }
  return {
    levelIndex,
    layout,
    blocks,
    bodies: [],
    balls: level.balls,
    score,
    phase: 'aim',
    angle: -0.55,
    power: 0.62,
    sinceFire: 0,
    hitStop: 0,
    slow: 0,
    shake: 0,
    refunds: 0,
    shot: 0,
    popups: [],
    pendingWin: false,
    cell,
  };
}

export function crownsLeft(state) {
  return state.blocks.filter((block) => block.mat.id === 'crown').length;
}

export function canFire(state) {
  return state.phase === 'aim' && state.balls > 0;
}

function gravity(state) {
  return 1800 * state.layout.scale;
}

export function launchVelocity(state, angle, power) {
  const speed = (680 + power * 860) * state.layout.scale;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

export function trajectory(state, angle, power) {
  const { vx, vy } = launchVelocity(state, angle, power);
  const muzzle = 42;
  let x = state.layout.cannon.x + Math.cos(angle) * muzzle;
  let y = state.layout.cannon.y + Math.sin(angle) * muzzle;
  let vyy = vy;
  const g = gravity(state);
  const points = [];
  for (let t = 0; t < 0.35; t += 0.03) {
    points.push({ x, y });
    vyy += g * 0.03;
    x += vx * 0.03;
    y += vyy * 0.03;
  }
  return points;
}

export function fire(state, angle, power) {
  if (!canFire(state)) return false;
  const { vx, vy } = launchVelocity(state, angle, power);
  const muzzle = 42;
  state.balls -= 1;
  state.phase = 'fly';
  state.sinceFire = 0;
  state.shot = 0;
  state.angle = angle;
  state.power = power;
  state.bodies.push({
    id: `ball-${state.sinceFire}-${state.balls}`,
    kind: 'ball',
    mat: null,
    x: state.layout.cannon.x + Math.cos(angle) * muzzle,
    y: state.layout.cannon.y + Math.sin(angle) * muzzle,
    vx,
    vy,
    r: 9,
    value: 0,
    angle: 0,
    spin: 0,
    mass: 1,
    slow: 0,
    hit: false,
  });
  state.shake = 4;
  return true;
}

function bounce(body, nx, ny, rest) {
  const vn = body.vx * nx + body.vy * ny;
  if (vn >= 0) return 0;
  body.vx -= (1 + rest) * vn * nx;
  body.vy -= (1 + rest) * vn * ny;
  return -vn;
}

function collideCircle(body, cx, cy, radius, rest) {
  const dx = body.x - cx;
  const dy = body.y - cy;
  const dist = Math.hypot(dx, dy);
  const min = body.r + radius;
  if (dist >= min || dist === 0) return 0;
  const nx = dx / dist;
  const ny = dy / dist;
  const push = min - dist;
  body.x += nx * push;
  body.y += ny * push;
  return bounce(body, nx, ny, rest);
}

function collideBox(body, box, rest) {
  const closestX = Math.max(box.x, Math.min(body.x, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(body.y, box.y + box.h));
  let dx = body.x - closestX;
  let dy = body.y - closestY;
  let dist = Math.hypot(dx, dy);
  if (dist > body.r) return null;
  let nx = 0;
  let ny = -1;
  if (dist === 0) {
    const left = body.x - box.x;
    const right = box.x + box.w - body.x;
    const top = body.y - box.y;
    const bottom = box.y + box.h - body.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) nx = -1;
    else if (m === right) nx = 1;
    else if (m === bottom) ny = 1;
    else ny = -1;
    if (nx !== 0) ny = 0;
    body.x += nx * (body.r + 0.5);
    body.y += ny * (body.r + 0.5);
  } else {
    nx = dx / dist;
    ny = dy / dist;
    body.x += nx * (body.r - dist);
    body.y += ny * (body.r - dist);
  }
  const impact = bounce(body, nx, ny, rest);
  return { nx, ny, impact };
}

function spawnDebris(state, block, vx, vy) {
  const mat = block.mat;
  const count = mat.debris;
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 220 * state.layout.scale;
    state.bodies.push({
      id: `d-${block.id}-${i}-${state.bodies.length}`,
      kind: 'debris',
      mat,
      x: block.x + block.s / 2 + (Math.random() - 0.5) * 6,
      y: block.y + block.s / 2,
      vx: vx * 0.6 + spread,
      vy: vy * 0.6 - Math.random() * 80 * state.layout.scale,
      r: mat.r,
      value: mat.id === 'glass' ? 1 : mat.value,
      angle: Math.random() * 6,
      spin: (Math.random() - 0.5) * 8,
      mass: mat.mass,
      slow: 0,
      hit: true,
    });
  }
}

function releaseBlock(state, block, vx, vy) {
  state.bodies.push({
    id: `loose-${block.id}`,
    kind: 'block',
    mat: block.mat,
    x: block.x + block.s / 2,
    y: block.y + block.s / 2,
    vx,
    vy,
    r: block.s * 0.46,
    value: block.mat.value,
    angle: (Math.random() - 0.5) * 0.4,
    spin: (Math.random() - 0.5) * 5,
    mass: block.mat.mass,
    slow: 0,
    hit: true,
    crown: block.mat.id === 'crown',
  });
}

function dropUnsupported(state) {
  const by = new Map(state.blocks.map((block) => [`${block.c},${block.r}`, block]));
  const seen = new Set();
  const queue = [];
  for (const block of state.blocks) {
    if (block.r === 0) {
      seen.add(block.id);
      queue.push(block);
    }
  }
  while (queue.length) {
    const block = queue.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = by.get(`${block.c + dc},${block.r + dr}`);
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      queue.push(next);
    }
  }
  const loose = state.blocks.filter((block) => !seen.has(block.id));
  if (!loose.length) return;
  state.blocks = state.blocks.filter((block) => seen.has(block.id));
  for (const block of loose) {
    releaseBlock(state, block, (Math.random() - 0.5) * 40, 20);
    if (block.mat.id === 'crown') state.slow = Math.max(state.slow, 0.4);
  }
}

function resolveBroken(state) {
  const loose = state.blocks.filter((block) => block.loose && block.hp > 0);
  if (loose.length) {
    const looseIds = new Set(loose.map((block) => block.id));
    state.blocks = state.blocks.filter((block) => !looseIds.has(block.id));
    for (const block of loose) {
      releaseBlock(state, block, block.impVx || 0, block.impVy || 0);
      if (block.mat.id === 'crown') state.slow = Math.max(state.slow, 0.4);
    }
  }
  let guard = 0;
  while (guard++ < 6) {
    const dead = state.blocks.filter((block) => block.hp <= 0);
    if (!dead.length) break;
    const deadIds = new Set(dead.map((block) => block.id));
    state.blocks = state.blocks.filter((block) => !deadIds.has(block.id));
    for (const block of dead) {
      const vx = block.impVx || 0;
      const vy = block.impVy || -40;
      if (block.mat.id === 'tnt') {
        state.shake = 12;
        for (const other of state.blocks) {
          if (Math.abs(other.c - block.c) <= 2 && Math.abs(other.r - block.r) <= 2) {
            other.hp -= 1;
            other.impVx = (other.c - block.c) * 80;
            other.impVy = -120;
          }
        }
      } else {
        spawnDebris(state, block, vx, vy);
      }
    }
  }
  dropUnsupported(state);
  if (crownsLeft(state) === 0) state.pendingWin = true;
}

function payout(state, body, bucket) {
  if (bucket.kind === 'ball') {
    const allow = body.kind === 'ball' || state.refunds < 2;
    if (allow) {
      if (body.kind !== 'ball') state.refunds += 1;
      state.balls += 1;
      state.popups.push({ x: bucket.x + bucket.w / 2, y: bucket.y, text: '+BALL', life: 0.9 });
    }
    return;
  }
  const base = body.kind === 'ball' ? 5 : body.value || 0;
  const coins = base * bucket.mult;
  if (coins <= 0) return;
  state.score += coins;
  state.shot += coins;
  state.popups.push({ x: bucket.x + bucket.w / 2, y: bucket.y, text: `+${coins}`, life: 0.9 });
}

function catchBucket(state, body) {
  if (body.y < state.layout.bucketTop || body.vy < 0) return false;
  const bucket = state.layout.buckets.find((item) => body.x >= item.x && body.x < item.x + item.w);
  if (!bucket) return false;
  payout(state, body, bucket);
  return true;
}

function separateBodies(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const min = a.r + b.r;
  if (dist >= min) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const push = (min - dist) / (a.mass + b.mass);
  a.x -= nx * push * b.mass;
  a.y -= ny * push * b.mass;
  b.x += nx * push * a.mass;
  b.y += ny * push * a.mass;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  const impulse = -(1.35) * vn / (1 / a.mass + 1 / b.mass);
  a.vx -= (impulse / a.mass) * nx;
  a.vy -= (impulse / a.mass) * ny;
  b.vx += (impulse / b.mass) * nx;
  b.vy += (impulse / b.mass) * ny;
}

function walls(state, body) {
  const layout = state.layout;
  const t = Math.max(0, Math.min(1, (body.y - layout.plinkoTop) / (layout.bucketTop - layout.plinkoTop)));
  const left = 16 + t * 18;
  const right = layout.w - 16 - t * 18;
  if (body.y > layout.plinkoTop - 10) {
    if (body.x < left + body.r) {
      body.x = left + body.r;
      body.vx = Math.abs(body.vx) * 0.5;
    } else if (body.x > right - body.r) {
      body.x = right - body.r;
      body.vx = -Math.abs(body.vx) * 0.5;
    }
  }
  if (body.y > layout.h + 40 || body.x < -40 || body.x > layout.w + 40) return false;
  return true;
}

export function step(state, dt) {
  if (state.phase === 'win' || state.phase === 'over') return;
  state.shake = Math.max(0, state.shake - dt * 28);
  for (const peg of state.layout.pegs) peg.flash = Math.max(0, peg.flash - dt);
  state.popups = state.popups.filter((popup) => {
    popup.life -= dt;
    popup.y -= 18 * dt;
    return popup.life > 0;
  });
  if (state.hitStop > 0) {
    state.hitStop -= dt;
    return;
  }
  const g = gravity(state);
  for (const body of state.bodies) {
    body.vy += g * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.angle += body.spin * dt;
  }
  const shelf = state.layout.shelf;
  for (const body of state.bodies) {
    const shelfHit = collideBox(body, shelf, 0.3);
    if (shelfHit && body.y < shelf.y) body.vy = Math.min(body.vy, 0);
    for (const block of state.blocks) {
      const hit = collideBox(body, { x: block.x, y: block.y, w: block.s, h: block.s }, block.mat.id === 'stone' ? 0.2 : 0.35);
      if (!hit || hit.impact <= 0) continue;
      const speed = Math.hypot(body.vx, body.vy) + hit.impact;
      const damage = body.kind === 'ball' ? Math.max(1, Math.floor(speed / 300)) : Math.floor(speed / 450);
      if (body.kind === 'ball' && !body.hit) {
        body.hit = true;
        state.hitStop = 0.04;
      }
      block.hp -= damage;
      block.impVx = body.vx;
      block.impVy = body.vy;
      if (block.hp > 0 && speed > 650) block.loose = true;
      body.vx *= block.mat.id === 'stone' ? 0.82 : 0.9;
      body.vy *= block.mat.id === 'stone' ? 0.82 : 0.9;
    }
    for (const peg of state.layout.pegs) {
      const impact = collideCircle(body, peg.x, peg.y, peg.r, 0.5);
      if (impact > 40) {
        peg.flash = 0.12;
        const jitter = 40 * state.layout.scale;
        body.vx += (Math.random() - 0.5) * jitter;
      }
    }
    if (catchBucket(state, body)) body.dead = true;
    else if (!walls(state, body)) body.dead = true;
    const speed = Math.hypot(body.vx, body.vy);
    body.slow = speed < 8 ? body.slow + dt : 0;
    if (body.slow > 1.5) {
      body.vx += (Math.random() - 0.5) * 60;
      body.vy += 40;
      body.slow = 0;
    }
  }
  if (state.bodies.length) {
    const limit = Math.min(state.bodies.length, 50);
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) separateBodies(state.bodies[i], state.bodies[j]);
    }
  }
  state.bodies = state.bodies.filter((body) => !body.dead);
  if (state.bodies.length > 100) state.bodies.splice(0, state.bodies.length - 100);
  resolveBroken(state);
  if (state.phase === 'fly') state.sinceFire += dt;
  const moving = state.bodies.some((body) => Math.hypot(body.vx, body.vy) > 24);
  const ballGone = !state.bodies.some((body) => body.kind === 'ball');
  const settled = ballGone && !moving;
  const timedOut = state.sinceFire > 4.6 && ballGone;
  if (state.phase === 'fly' && (settled || timedOut)) {
    if (state.pendingWin || crownsLeft(state) === 0) {
      state.score += 20 * state.balls;
      state.phase = 'win';
    } else if (state.balls <= 0) state.phase = 'over';
    else state.phase = 'aim';
  }
}

export function clearBonus(balls) {
  return 20 * balls;
}
