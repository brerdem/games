export const COLS = 72;
export const ROWS = 100;
export const PALETTE = {
  1: { name: 'Coral', hex: '#ff6f59', rgb: [255, 111, 89] },
  2: { name: 'Aqua', hex: '#2ec4b6', rgb: [46, 196, 182] },
  3: { name: 'Sun', hex: '#ffbf3c', rgb: [255, 191, 60] },
  4: { name: 'Plum', hex: '#8e5bd3', rgb: [142, 91, 211] },
};

const WALL = 255;

export function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      return Math.floor(this.next() * n);
    },
  };
}

export function carveBottle() {
  const grid = new Uint8Array(COLS * ROWS);
  grid.fill(WALL);
  const neckTop = 4;
  const neckH = 12;
  const shoulder = 8;
  const bodyTop = neckTop + neckH + shoulder;
  const bodyBot = ROWS - 5;
  const openL = Math.floor(COLS / 2 - 10);
  const openR = Math.floor(COLS / 2 + 10);
  const bodyL = 6;
  const bodyR = COLS - 6;
  for (let y = neckTop; y < neckTop + neckH; y++) {
    for (let x = openL; x < openR; x++) grid[y * COLS + x] = 0;
  }
  for (let y = neckTop + neckH; y < bodyTop; y++) {
    const t = (y - (neckTop + neckH)) / shoulder;
    const left = Math.round(openL + (bodyL - openL) * t);
    const right = Math.round(openR + (bodyR - openR) * t);
    for (let x = left; x < right; x++) grid[y * COLS + x] = 0;
  }
  for (let y = bodyTop; y < bodyBot; y++) {
    for (let x = bodyL; x < bodyR; x++) grid[y * COLS + x] = 0;
  }
  const mid = (bodyL + bodyR) / 2;
  const rad = (bodyR - bodyL) / 2;
  for (let y = bodyBot - 8; y < bodyBot + 6; y++) {
    for (let x = bodyL; x < bodyR; x++) {
      const dy = (y - (bodyBot - 8)) / 10;
      const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rad;
      if (Math.abs(x - mid) <= half) grid[y * COLS + x] = 0;
    }
  }
  return { grid, openL, openR, neckTop, bodyL, bodyR };
}

function emit(grid, shade, rng, color, x0, x1, count) {
  let emitted = 0;
  const y = 4;
  for (let n = 0; n < count; n++) {
    const x = x0 + rng.int(Math.max(1, x1 - x0));
    const i = y * COLS + x;
    if (grid[i] === 0) {
      grid[i] = color;
      shade[i] = 100 + rng.int(50);
      emitted += 1;
    }
  }
  return emitted;
}

export function fallStep(grid, rng, leftToRight) {
  let moved = 0;
  for (let y = ROWS - 2; y >= 1; y--) {
    if (leftToRight) {
      for (let x = 1; x < COLS - 1; x++) moved += settleGrain(grid, x, y, rng);
    } else {
      for (let x = COLS - 2; x >= 1; x--) moved += settleGrain(grid, x, y, rng);
    }
  }
  return moved;
}

function settleGrain(grid, x, y, rng) {
  const i = y * COLS + x;
  const mat = grid[i];
  if (mat === 0 || mat === WALL) return 0;
  const below = i + COLS;
  if (grid[below] === 0) {
    grid[below] = mat;
    grid[i] = 0;
    return 1;
  }
  const order = rng.next() < 0.5 ? [-1, 1] : [1, -1];
  for (const dx of order) {
    const nx = x + dx;
    if (nx <= 0 || nx >= COLS - 1) continue;
    if (grid[below + dx] === 0) {
      grid[below + dx] = mat;
      grid[i] = 0;
      return 1;
    }
  }
  return 0;
}

function relax(grid, rng, frames) {
  let dir = true;
  for (let n = 0; n < frames; n++) {
    const moved = fallStep(grid, rng, dir) + fallStep(grid, rng, !dir);
    dir = !dir;
    if (moved === 0 && n > 8) return;
  }
}

export function simulateScript(script, seed) {
  const bottle = carveBottle();
  const grid = bottle.grid.slice();
  const shade = new Uint8Array(COLS * ROWS);
  const rng = makeRng(seed);
  const used = {};
  for (const step of script) {
    let left = step.grains;
    let guard = 0;
    let dir = true;
    while (left > 0 && guard++ < 8000) {
      const half = 2;
      const x = Math.max(bottle.openL + half, Math.min(bottle.openR - half, step.x));
      const got = emit(grid, shade, rng, step.color, x - half, x + half, Math.min(6, left));
      if (got === 0) break;
      used[step.color] = (used[step.color] || 0) + got;
      left -= got;
      fallStep(grid, rng, dir);
      fallStep(grid, rng, !dir);
      dir = !dir;
    }
    relax(grid, rng, 80);
  }
  relax(grid, rng, 120);
  return { grid, shade, bottle, used };
}

export function matchPercent(current, target) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < current.length; i++) {
    if (target[i] === WALL) continue;
    const t = target[i];
    const c = current[i];
    if (t === 0 && c === 0) continue;
    den += 1;
    if (t !== 0 && c === t) num += 1;
  }
  return den ? num / den : 1;
}

export function countColors(grid) {
  const counts = {};
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (v !== 0 && v !== WALL) counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

export const LEVELS = [
  {
    id: 1,
    seed: 11,
    script: [
      { color: 1, x: 36, grains: 980 },
      { color: 2, x: 36, grains: 820 },
    ],
  },
  {
    id: 2,
    seed: 22,
    script: [
      { color: 3, x: 36, grains: 620 },
      { color: 1, x: 36, grains: 620 },
      { color: 2, x: 36, grains: 560 },
    ],
  },
  {
    id: 3,
    seed: 33,
    script: [
      { color: 3, x: 24, grains: 280 },
      { color: 3, x: 32, grains: 360 },
      { color: 3, x: 42, grains: 280 },
      { color: 4, x: 36, grains: 700 },
    ],
  },
];

const cache = new Map();

export function prepareLevel(level) {
  if (cache.has(level.id)) return cache.get(level.id);
  const built = simulateScript(level.script, level.seed);
  const counts = countColors(built.grid);
  const budgets = {};
  for (const [color, n] of Object.entries(counts)) budgets[color] = Math.ceil(n * 1.1);
  const prepared = { ...built, budgets, counts };
  cache.set(level.id, prepared);
  return prepared;
}
