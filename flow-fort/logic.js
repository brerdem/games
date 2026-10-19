export const COLORS = {
  R: '#ff5d6c',
  B: '#4da3ff',
  Y: '#ffd23f',
  G: '#3ddc97',
};

export function picture(lines, ox, oy) {
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

export const LEVELS = [
  {
    id: 1,
    cols: 8,
    rows: 8,
    advanceSec: 12,
    cap: 4,
    cells: picture(['RRRR', 'BBBB', 'RRRR'], 2, 1),
    deck: [[gun('R', 4)], [gun('B', 4)], [gun('R', 4)]],
  },
  {
    id: 2,
    cols: 9,
    rows: 9,
    advanceSec: 9,
    cap: 4,
    cells: picture(['RRRRR', 'RYYYR', 'RYBYR', 'RYYYR', 'RRRRR'], 2, 1),
    deck: [[gun('R', 10), gun('Y', 4)], [gun('R', 6), gun('Y', 4)], [gun('B', 1)]],
  },
  {
    id: 3,
    cols: 9,
    rows: 9,
    advanceSec: 7,
    cap: 4,
    cells: picture(['GGGGG', 'GRRRG', 'GRYRG', 'GRRRG', 'GGGGG'], 2, 1),
    deck: [[gun('G', 8), gun('Y', 1)], [gun('G', 8), gun('R', 4)], [gun('R', 4)]],
  },
];

export function cloneLevel(level) {
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

export function firstCell(cells, side, index) {
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

export function laneMarkers(cols, rows) {
  const marks = [];
  for (let r = rows - 1; r >= 0; r--) marks.push({ side: 'left', index: r });
  for (let c = 0; c < cols; c++) marks.push({ side: 'top', index: c });
  for (let r = 0; r < rows; r++) marks.push({ side: 'right', index: r });
  for (let c = cols - 1; c >= 0; c--) marks.push({ side: 'bottom', index: c });
  return marks;
}

export function resolveLane(cells, side, index, color) {
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

export function validLanes(cells, color, cols, rows) {
  let count = 0;
  for (const mark of laneMarkers(cols, rows)) {
    const first = firstCell(cells, mark.side, mark.index);
    if (first && first.color === color) count += 1;
  }
  return count;
}

export function fronts(state) {
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

export function simulateLap(state, gunner) {
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

export function greedyClear(level) {
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

export function ammoMatches(level) {
  const need = {};
  for (const cell of level.cells) need[cell.color] = (need[cell.color] || 0) + cell.hp;
  const have = {};
  for (const col of level.deck) {
    for (const gunner of col) have[gunner.color] = (have[gunner.color] || 0) + gunner.ammo;
  }
  return Object.keys(need).every((color) => need[color] === have[color])
    && Object.keys(have).every((color) => need[color] === have[color]);
}
