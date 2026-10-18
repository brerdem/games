export const SECTORS = 12;
export const SECTOR = (Math.PI * 2) / SECTORS;

export function mod(n, m = SECTORS) {
  return ((n % m) + m) % m;
}

export function visualOf(sector, rot) {
  return mod(sector + rot);
}

export function baseOf(visual, rot) {
  return mod(visual - rot);
}

export function gateAt(ring, base) {
  if (!ring.gates) return null;
  return ring.gates[base] ?? ring.gates[String(base)] ?? null;
}

export function launchResult(level, rot, pins, pin) {
  const visual = visualOf(pin.sector, rot[pin.ring]);
  for (let i = pin.ring + 1; i < level.rings.length; i++) {
    const ring = level.rings[i];
    const occupant = pins.find((item) => item.ring === i && visualOf(item.sector, rot[i]) === visual);
    if (occupant) return { ok: false, ring: i, reason: 'pin', visual };
    const base = baseOf(visual, rot[i]);
    if (!ring.gaps.includes(base)) return { ok: false, ring: i, reason: 'wall', visual };
    if (i === level.rings.length - 1) {
      const gate = gateAt(ring, base);
      if (gate && (pin.color || 'neutral') !== gate) return { ok: false, ring: i, reason: 'gate', visual };
    }
  }
  return { ok: true, visual };
}

export function anyClear(level, state) {
  return state.pins.some((pin) => launchResult(level, state.rot, state.pins, pin).ok);
}

export function freshState(level, score = 0) {
  return {
    rot: level.rot.map((value) => mod(value)),
    pins: level.pins.map((pin) => ({ ...pin, color: pin.color || 'neutral' })),
    moves: level.moves,
    hearts: 3,
    score,
    combo: 0,
  };
}

function settle(level, state, extra = {}) {
  const next = {
    rot: state.rot,
    pins: state.pins,
    moves: state.moves,
    hearts: state.hearts,
    score: state.score,
    combo: state.combo,
    ...extra,
  };
  let end = null;
  if (next.hearts <= 0) end = 'hearts';
  else if (!next.pins.length) end = 'win';
  else if (next.moves <= 0 && !anyClear(level, next)) end = 'moves';
  return { ...next, end };
}

export function applyAction(level, state, action) {
  if (action.type === 'rot') {
    if (state.moves <= 0) return { ...state, end: null, rejected: true };
    const rot = state.rot.slice();
    rot[action.ring] = mod(rot[action.ring] + action.dir);
    return settle(level, state, { rot, moves: state.moves - 1, combo: 0 });
  }
  const pin = state.pins.find((item) => item.id === action.id);
  if (!pin) return { ...state, end: null, rejected: true };
  const result = launchResult(level, state.rot, state.pins, pin);
  if (!result.ok) return settle(level, state, { hearts: state.hearts - 1, combo: 0, result });
  const combo = state.combo + 1;
  const bonus = combo > 1 ? 50 * (combo - 1) : 0;
  return settle(level, state, {
    pins: state.pins.filter((item) => item.id !== pin.id),
    score: state.score + 100 + bonus,
    combo,
    result,
  });
}

export function clearBonus(state) {
  return 50 * state.moves + 200 * state.hearts;
}

export function solve(level) {
  const start = freshState(level);
  const key = (rot, pins) => `${rot.join(',')}|${pins.map((pin) => pin.id).sort((a, b) => a - b).join(',')}`;
  const seen = new Set([key(start.rot, start.pins)]);
  const queue = [{ rot: start.rot, pins: start.pins, moves: start.moves, actions: [] }];
  while (queue.length) {
    const node = queue.shift();
    if (!node.pins.length) return node.actions;
    for (const pin of node.pins) {
      if (!launchResult(level, node.rot, node.pins, pin).ok) continue;
      const pins = node.pins.filter((item) => item.id !== pin.id);
      const actions = node.actions.concat({ type: 'launch', id: pin.id });
      if (!pins.length) return actions;
      const stamp = key(node.rot, pins);
      if (seen.has(stamp)) continue;
      seen.add(stamp);
      queue.push({ rot: node.rot, pins, moves: node.moves, actions });
    }
    if (node.moves <= 0) continue;
    for (let ring = 0; ring < level.rings.length; ring++) {
      for (const dir of [1, -1]) {
        const rot = node.rot.slice();
        rot[ring] = mod(rot[ring] + dir);
        const stamp = key(rot, node.pins);
        if (seen.has(stamp)) continue;
        seen.add(stamp);
        queue.push({
          rot,
          pins: node.pins,
          moves: node.moves - 1,
          actions: node.actions.concat({ type: 'rot', ring, dir }),
        });
      }
    }
  }
  return null;
}

export const LEVELS = [
  {
    id: 1,
    rings: [{ gaps: [3, 9] }, { gaps: [0, 6] }],
    pins: [
      { id: 1, ring: 0, sector: 0 },
      { id: 2, ring: 0, sector: 6 },
    ],
    rot: [0, 11],
    par: 1,
    moves: 4,
  },
  {
    id: 2,
    rings: [{ gaps: [2, 5, 8, 11] }, { gaps: [0] }],
    pins: [
      { id: 1, ring: 0, sector: 0 },
      { id: 2, ring: 0, sector: 4 },
      { id: 3, ring: 1, sector: 4 },
    ],
    rot: [0, 0],
    par: 4,
    moves: 7,
  },
  {
    id: 3,
    rings: [
      { gaps: [0, 6] },
      { gaps: [1, 7] },
      { gaps: [0, 4, 8], gates: { 0: 'coral', 4: 'teal', 8: 'gold' } },
    ],
    pins: [
      { id: 1, ring: 0, sector: 2, color: 'coral' },
      { id: 2, ring: 0, sector: 5, color: 'teal' },
      { id: 3, ring: 1, sector: 3, color: 'gold' },
    ],
    rot: [0, 0, 1],
    par: 6,
    moves: 10,
  },
];

export function rotationCount(actions) {
  return actions.filter((action) => action.type === 'rot').length;
}
