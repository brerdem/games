(function (root) {
const COLORS = {
  R: '#ff5d6c',
  B: '#4da3ff',
  Y: '#ffd23f',
  G: '#3ddc97',
  P: '#b47cff',
};

function picture(lines, ox, oy) {
  const cells = [];
  lines.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      cells.push({ id: cells.length + 1, c: ox + c, r: oy + r, color: ch, hp: 1 });
    });
  });
  return cells;
}

function gun(color, ammo) {
  return { color, ammo };
}

function addRing(cells, c0, r0, w, h, color, ids) {
  const put = (c, r) => {
    const key = c + ',' + r;
    if (cells.has(key)) return;
    cells.set(key, { id: ids.n++, c, r, color, hp: 1 });
  };
  if (w <= 1 || h <= 1) {
    put(c0, r0);
    return;
  }
  for (let c = c0; c < c0 + w; c++) {
    put(c, r0);
    put(c, r0 + h - 1);
  }
  for (let r = r0 + 1; r < r0 + h - 1; r++) {
    put(c0, r);
    put(c0 + w - 1, r);
  }
}

function onion(layers, origin) {
  const cells = new Map();
  const ids = { n: 1 };
  layers.forEach((color, index) => {
    const size = (layers.length - index) * 2 + 1;
    addRing(cells, index, origin + index, size, size, color, ids);
  });
  return [...cells.values()];
}

function chunks(color, total, size) {
  const out = [];
  let left = total;
  while (left > 0) {
    const n = Math.min(size, left);
    out.push(gun(color, n));
    left -= n;
  }
  return out;
}

function countColors(cells) {
  const need = {};
  for (const cell of cells) need[cell.color] = (need[cell.color] || 0) + cell.hp;
  return need;
}

function shellLevel(spec) {
  const cells = onion(spec.layers, spec.origin || 0);
  const need = countColors(cells);
  const solution = [];
  for (const color of spec.layers) solution.push(...chunks(color, need[color], spec.chunk));
  const bait = Array.from({ length: spec.decoys || 0 }, () => gun('P', 1));
  const cut = Math.ceil(solution.length / 2);
  const deck = [bait, solution.slice(0, cut), solution.slice(cut)];
  const cols = Math.max(10, Math.max(...cells.map((cell) => cell.c)) + 2);
  return {
    id: spec.id,
    cols,
    rows: spec.rows,
    advanceSec: spec.advance,
    cap: spec.cap || 1,
    march: spec.march || 'start',
    cells,
    deck,
  };
}

const LEVELS = [
  {
    id: 1,
    cols: 8,
    rows: 10,
    advanceSec: 16,
    cap: 3,
    march: 'afterLaunch',
    cells: picture(['RRRR', 'BBBB', 'RRRR'], 2, 1),
    deck: [[gun('R', 4)], [gun('B', 4)], [gun('R', 4)]],
  },
  {
    id: 2,
    cols: 10,
    rows: 12,
    advanceSec: 14,
    cap: 2,
    march: 'start',
    cells: onion(['R', 'Y'], 1),
    deck: [
      [gun('P', 1), gun('P', 1), gun('P', 1)],
      chunks('R', countColors(onion(['R', 'Y'], 1)).R, 6),
      chunks('Y', countColors(onion(['R', 'Y'], 1)).Y, 4),
    ],
  },
  shellLevel({ id: 3, layers: ['G', 'R', 'Y', 'B'], chunk: 2, rows: 18, advance: 12, origin: 0, decoys: 8 }),
  shellLevel({ id: 4, layers: ['R', 'G', 'Y', 'B'], chunk: 2, rows: 18, advance: 13, origin: 0, decoys: 8 }),
  shellLevel({ id: 5, layers: ['G', 'R', 'Y', 'B'], chunk: 2, rows: 16, advance: 9, origin: 2, decoys: 8 }),
  shellLevel({ id: 6, layers: ['G', 'R', 'Y', 'B'], chunk: 2, rows: 16, advance: 8, origin: 2, decoys: 8 }),
  shellLevel({ id: 7, layers: ['R', 'G', 'Y', 'B'], chunk: 2, rows: 16, advance: 9, origin: 3, decoys: 8 }),
  (() => {
    const cells = onion(['G', 'B'], 0);
    const need = countColors(cells);
    const greens = chunks('G', need.G, 4);
    const blues = chunks('B', need.B, 1);
    return {
      id: 8,
      cols: 10,
      rows: 18,
      advanceSec: 18,
      cap: 1,
      march: 'start',
      cells,
      deck: [greens, blues.slice(0, 4), blues.slice(4)],
    };
  })(),
];

function cloneLevel(level) {
  return {
    cells: level.cells.map((cell) => ({ ...cell })),
    deck: level.deck.map((col) => col.map((item) => ({ ...item }))),
    bench: [null, null, null, null, null],
    hearts: 3,
    cap: level.cap,
    cols: level.cols,
    rows: level.rows,
  };
}

function firstCell(cells, side, index) {
  const line = cells.filter((cell) => cell.hp > 0 && ((side === 'left' || side === 'right') ? cell.r === index : cell.c === index));
  if (!line.length) return null;
  line.sort((a, b) => {
    if (side === 'left') return a.c - b.c;
    if (side === 'right') return b.c - a.c;
    if (side === 'top') return a.r - b.r;
    return b.r - a.r;
  });
  return line[0];
}

function laneMarkers(cols, rows) {
  const marks = [];
  for (let r = rows - 1; r >= 0; r--) marks.push({ side: 'left', index: r });
  for (let c = 0; c < cols; c++) marks.push({ side: 'top', index: c });
  for (let r = 0; r < rows; r++) marks.push({ side: 'right', index: r });
  for (let c = cols - 1; c >= 0; c--) marks.push({ side: 'bottom', index: c });
  return marks;
}

function resolveLane(cells, side, index, color) {
  const first = firstCell(cells, side, index);
  if (!first) return { kind: 'empty' };
  if (first.color !== color) return { kind: 'blocked', cell: first };
  first.hp -= 1;
  if (first.hp <= 0) {
    const at = cells.findIndex((cell) => cell.id === first.id);
    if (at >= 0) cells.splice(at, 1);
    return { kind: 'hit', cell: first, removed: true };
  }
  return { kind: 'hit', cell: first, removed: false };
}

function validLanes(cells, color, cols, rows) {
  let count = 0;
  for (const mark of laneMarkers(cols, rows)) {
    const first = firstCell(cells, mark.side, mark.index);
    if (first && first.color === color) count += 1;
  }
  return count;
}

function fronts(state) {
  const options = [];
  state.deck.forEach((col, index) => {
    if (col.length) options.push({ where: 'deck', index, gunner: col[0] });
  });
  state.bench.forEach((gunner, index) => {
    if (gunner) options.push({ where: 'bench', index, gunner });
  });
  return options;
}

function takeGunner(state, choice) {
  if (choice.where === 'deck') return state.deck[choice.index].shift();
  const gunner = state.bench[choice.index];
  state.bench[choice.index] = null;
  return gunner;
}

function park(state, gunner) {
  const slot = state.bench.findIndex((item) => !item);
  if (slot < 0) return false;
  state.bench[slot] = gunner;
  return true;
}

function simulateLap(state, gunner) {
  const marks = laneMarkers(state.cols, state.rows);
  let hits = 0;
  for (const mark of marks) {
    if (gunner.ammo <= 0) break;
    const result = resolveLane(state.cells, mark.side, mark.index, gunner.color);
    if (result.kind === 'hit') {
      gunner.ammo -= 1;
      hits += 1;
    }
  }
  return hits;
}

function greedyClear(level) {
  const state = cloneLevel(level);
  let guard = 0;
  while (state.cells.length && guard++ < 80) {
    const options = fronts(state);
    if (!options.length) return false;
    let best = null;
    let bestLanes = -1;
    for (const option of options) {
      const lanes = validLanes(state.cells, option.gunner.color, state.cols, state.rows);
      if (lanes > bestLanes || (lanes === bestLanes && best && option.gunner.ammo < best.gunner.ammo)) {
        best = option;
        bestLanes = lanes;
      }
    }
    if (!best || bestLanes <= 0) return false;
    const gunner = takeGunner(state, best);
    simulateLap(state, gunner);
    if (gunner.ammo > 0 && !park(state, gunner)) return false;
  }
  return state.cells.length === 0;
}

function ammoMatches(level) {
  const need = {};
  for (const cell of level.cells) need[cell.color] = (need[cell.color] || 0) + cell.hp;
  const have = {};
  for (const col of level.deck) {
    for (const gunner of col) have[gunner.color] = (have[gunner.color] || 0) + gunner.ammo;
  }
  return Object.keys(need).every((color) => need[color] === have[color])
    && Object.keys(have).every((color) => need[color] === have[color]);
}

function applyAdvance(cells, rows) {
  const kept = [];
  const doomed = [];
  for (const cell of cells) {
    if (cell.r >= rows - 1) doomed.push(cell);
    else kept.push({ id: cell.id, c: cell.c, r: cell.r + 1, color: cell.color, hp: cell.hp });
  }
  for (const cell of doomed) {
    let r = 0;
    while (kept.some((item) => item.c === cell.c && item.r === r)) r += 1;
    if (r >= rows) r = 0;
    kept.push({ id: cell.id, c: cell.c, r, color: cell.color, hp: cell.hp });
  }
  return { cells: kept, breached: doomed.length > 0 };
}

function starsFor(hearts, jammed, calm) {
  let stars = hearts >= 3 && !jammed ? 3 : hearts >= 2 ? 2 : 1;
  if (calm) stars = Math.min(2, stars);
  return stars;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simMarkers(cols, rows) {
  const left = rows;
  const top = cols;
  const marks = [];
  for (let r = rows - 1; r >= 0; r--) marks.push({ side: 'left', index: r, dist: rows - r - 0.5 });
  for (let c = 0; c < cols; c++) marks.push({ side: 'top', index: c, dist: left + c + 0.5 });
  for (let r = 0; r < rows; r++) marks.push({ side: 'right', index: r, dist: left + top + r + 0.5 });
  for (let c = cols - 1; c >= 0; c--) marks.push({ side: 'bottom', index: c, dist: left * 2 + top + (cols - c - 0.5) });
  return marks;
}

function chooseSpam(state) {
  if (!state.deck[0] || !state.deck[0].length) return null;
  return { where: 'deck', index: 0 };
}

function chooseGreedy(state) {
  const options = fronts(state);
  let best = null;
  let bestLanes = 0;
  for (const option of options) {
    const lanes = validLanes(state.cells, option.gunner.color, state.cols, state.rows);
    if (lanes <= 0) continue;
    const better = !best
      || lanes > bestLanes
      || (lanes === bestLanes && option.gunner.ammo < best.gunner.ammo)
      || (lanes === bestLanes && option.gunner.ammo === best.gunner.ammo && option.where === 'deck' && best.where !== 'deck')
      || (lanes === bestLanes && option.gunner.ammo === best.gunner.ammo && option.where === best.where && option.index < best.index);
    if (better) {
      best = option;
      bestLanes = lanes;
    }
  }
  return best;
}

function chooseRandom(state, rng) {
  const options = fronts(state);
  if (!options.length) return null;
  return options[Math.floor(rng() * options.length)];
}

function simulate(level, options) {
  const opts = options || {};
  const policy = opts.policy || 'greedy';
  const reaction = opts.reaction == null ? 0.8 : opts.reaction;
  const calm = Boolean(opts.calm);
  const rng = mulberry32(opts.seed == null ? 1 : opts.seed);
  const dt = 0.1;
  const state = cloneLevel(level);
  const marks = simMarkers(level.cols, level.rows);
  const perim = 2 * (level.cols + level.rows);
  const speed = perim / 6.4;
  const rail = [];
  let time = 0;
  let cooldown = 0;
  let advanceT = 0;
  let marching = level.march !== 'afterLaunch';
  let heartsLost = 0;
  let jammed = false;
  let end = null;
  let breachedThisTick = false;
  const cap = level.cap || 4;
  const advanceSec = level.advanceSec;

  function finish(reason) {
    if (!end) end = reason;
  }

  function loseHeart(reason) {
    state.hearts -= 1;
    heartsLost += 1;
    if (reason === 'jam') jammed = true;
    if (state.hearts <= 0) finish(reason === 'jam' ? 'jam' : 'breach');
  }

  function launchChoice(choice) {
    if (!choice || rail.length >= cap) return false;
    const gunner = takeGunner(state, choice);
    if (!gunner) return false;
    rail.push({ color: gunner.color, ammo: gunner.ammo, dist: 0, seen: {} });
    marching = true;
    cooldown = reaction;
    return true;
  }

  const limit = opts.limit == null ? 180 : opts.limit;
  while (!end && time < limit) {
    breachedThisTick = false;
    for (const gunner of rail.slice()) {
      if (!rail.includes(gunner)) continue;
      const prev = gunner.dist;
      gunner.dist += speed * dt;
      for (const mark of marks) {
        if (mark.dist <= prev || mark.dist > gunner.dist) continue;
        const key = mark.side + ':' + mark.index;
        if (gunner.seen[key] || gunner.ammo <= 0) continue;
        gunner.seen[key] = true;
        const result = resolveLane(state.cells, mark.side, mark.index, gunner.color);
        if (result.kind !== 'hit') continue;
        gunner.ammo -= 1;
        if (gunner.ammo <= 0) {
          const at = rail.indexOf(gunner);
          if (at >= 0) rail.splice(at, 1);
          break;
        }
      }
      if (rail.includes(gunner) && gunner.dist >= perim) {
        const at = rail.indexOf(gunner);
        if (at >= 0) rail.splice(at, 1);
        if (gunner.ammo > 0) {
          if (!park(state, { color: gunner.color, ammo: gunner.ammo })) loseHeart('jam');
        }
      }
    }
    if (!end && !calm && marching && state.cells.length && state.hearts > 0) {
      advanceT += dt;
      if (advanceT >= advanceSec) {
        advanceT = 0;
        const stepped = applyAdvance(state.cells, state.rows);
        state.cells = stepped.cells;
        if (stepped.breached) {
          breachedThisTick = true;
          loseHeart('breach');
        }
      }
    }
    if (!end && !breachedThisTick && state.cells.length === 0) finish('win');
    if (!end && state.cells.length > 0 && rail.length === 0 && fronts(state).length === 0) finish('empty');
    if (!end) {
      cooldown -= dt;
      if (cooldown <= 0 && rail.length < cap) {
        let choice = null;
        if (policy === 'spam') choice = chooseSpam(state);
        else if (policy === 'random') choice = chooseRandom(state, rng);
        else choice = chooseGreedy(state);
        if (choice) launchChoice(choice);
      }
    }
    time += dt;
  }
  if (!end) end = 'timeout';
  return {
    end,
    time,
    hearts: state.hearts,
    heartsLost,
    jammed,
    cells: state.cells.length,
    colors: state.cells.map((cell) => cell.color),
    deck: state.deck.map((col) => col.map((gunner) => gunner.color + gunner.ammo)),
    bench: state.bench.map((gunner) => (gunner ? gunner.color + gunner.ammo : null)),
  };
}

function breachRepro() {
  const level = {
    id: 0,
    cols: 8,
    rows: 8,
    advanceSec: 1,
    cap: 4,
    march: 'start',
    cells: picture(['RRR', 'RBR', 'RRR'], 2, 5),
    deck: [[gun('R', 8)], [gun('B', 1)]],
  };
  const state = cloneLevel(level);
  const red = fronts(state).find((option) => option.gunner.color === 'R');
  const gunner = takeGunner(state, red);
  simulateLap(state, gunner);
  let hearts = 3;
  let end = 'playing';
  let guard = 0;
  while (state.cells.length && hearts > 0 && guard++ < 20) {
    const before = state.cells.length;
    const stepped = applyAdvance(state.cells, state.rows);
    state.cells = stepped.cells;
    if (stepped.breached) {
      hearts -= 1;
      if (hearts <= 0) end = 'breach';
      else end = 'playing';
      if (state.cells.length === 0) end = 'cleared-on-breach';
      break;
    }
    if (state.cells.length === 0 && before > 0) end = 'win';
  }
  return { end, hearts, cells: state.cells.length, blue: state.cells.some((cell) => cell.color === 'B') };
}

  root.FlowLogic = {
    COLORS, picture, LEVELS, cloneLevel, firstCell, laneMarkers, resolveLane, validLanes,
    fronts, simulateLap, greedyClear, ammoMatches, applyAdvance, starsFor, simulate, breachRepro, gun,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
