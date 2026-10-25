import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Map, Set, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const T = sandbox.TurnLogic;
const LEVELS = T.levels();
const PACK = JSON.parse(fs.readFileSync(new URL('./pack_v1_solved.json', import.meta.url), 'utf8'));

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function h1(plates) {
  let score = 0;
  for (const plate of plates) {
    if (!plate.length || (plate[0] & 1)) continue;
    let run = 0;
    for (const pancake of plate) {
      if (pancake === plate[0]) run += 1;
      else break;
    }
    score += run * 2 + (run === 3 && plate.length === 3 ? 4 : 0);
  }
  return score;
}

function h2(plates) {
  let score = 0;
  for (const plate of plates) {
    if (!plate.length) continue;
    let run = 1;
    for (let i = 1; i < plate.length; i++) if ((plate[i] >> 1) === (plate[i - 1] >> 1)) run += 1;
    score += run + plate.filter((pancake) => (pancake & 1) === 0).length * 0.5;
  }
  return score;
}

function best1(plates, sided, score, rng) {
  const moves = shuffle(T.legalMoves(plates), rng);
  let best = -1e9;
  let move = moves[0];
  for (const item of moves) {
    const value = score(T.apply(plates, item, sided));
    if (value > best) { best = value; move = item; }
  }
  return move;
}

function best2(plates, sided, score, rng) {
  const moves = shuffle(T.legalMoves(plates), rng);
  let best = -1e9;
  let move = moves[0];
  for (const item of moves) {
    const next = T.apply(plates, item, sided);
    let value = score(next);
    for (const follow of T.legalMoves(next)) value = Math.max(value, score(T.apply(next, follow, sided)));
    if (value > best) { best = value; move = item; }
  }
  return move;
}

function play(level, choose, rng) {
  let plates = T.clone(level.plates);
  let left = level.budget;
  while (left > 0) {
    if (T.isGoal(plates)) return true;
    const move = choose(plates, level.sided, rng);
    plates = T.apply(plates, move, level.sided);
    left -= 1;
  }
  return T.isGoal(plates);
}

test('every reference line clears and matches the solved pack', () => {
  for (const level of LEVELS) {
    const row = PACK[level.n - 1];
    assert.equal(JSON.stringify(level.plates), JSON.stringify(row.start));
    assert.equal(level.par, row.par);
    assert.equal(level.budget, row.budget);
    assert.equal(JSON.stringify(level.refLabel), JSON.stringify(row.reference_line));
    let plates = T.clone(level.plates);
    for (const move of level.ref) plates = T.apply(plates, move, level.sided);
    assert.equal(T.isGoal(plates), true, 'L' + level.n);
    assert.equal(level.ref.length, level.par);
  }
});

test('a flip reverses the chunk and turns only two-sided pancakes', () => {
  const plain = LEVELS[0];
  const burnt = LEVELS[2];
  const lifted = T.apply(plain.plates, [2, 2, 0], plain.sided);
  assert.equal(JSON.stringify(lifted[2]), JSON.stringify([2, 0]));
  assert.equal(JSON.stringify(lifted[0]), JSON.stringify([0, 2, 0]));
  const turned = T.apply(burnt.plates, [1, 2, 2], burnt.sided);
  assert.equal(JSON.stringify(turned[1]), JSON.stringify([0, 0]));
  assert.equal(JSON.stringify(turned[2]), JSON.stringify([3, 3, 3]));
  const goldenOnly = T.apply([[0, 0, 0, 0], [], []], [0, 1, 1], plain.sided);
  assert.equal(JSON.stringify(goldenOnly[1]), JSON.stringify([0]));
  assert.equal(T.legalMoves([[0, 0, 0, 0], [2, 2, 2, 2], []]).some((move) => move[0] === 0 && move[1] === 4), false);
});

test('undo is the reverse flip and restores the exact plates', () => {
  for (const level of LEVELS) {
    const move = level.ref[0];
    const next = T.apply(level.plates, move, level.sided);
    const back = T.apply(next, [move[2], move[1], move[0]], level.sided);
    assert.equal(JSON.stringify(back), JSON.stringify(level.plates), 'L' + level.n);
  }
});

test('the stuck check matches par on at least 20 states', () => {
  let checks = 0;
  for (const level of LEVELS) {
    assert.equal(T.canFinish(level.plates, level.par, level), true, 'L' + level.n);
    assert.equal(T.canFinish(level.plates, level.par - 1, level), false, 'L' + level.n + ' short');
    checks += 2;
    let plates = T.clone(level.plates);
    const move = level.ref[0];
    plates = T.apply(plates, move, level.sided);
    const dist = level.par - 1;
    assert.equal(T.canFinish(plates, dist, level), true);
    assert.equal(T.canFinish(plates, dist - 1, level), false);
    checks += 2;
  }
  assert.ok(checks >= 20);
  assert.equal(T.stuckText(3), "Can't finish in 3 flips — restart");
});

test('javascript flips match the python sim on random lines', () => {
  const picks = [];
  const rng = mulberry32(7);
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) picks.push(Array.from({ length: 12 }, () => rng()));
  const script = `
import json, sys
sys.path.insert(0, ${JSON.stringify(new URL('./', import.meta.url).pathname)})
import core
from pack_sided import sided
pack = json.load(open(${JSON.stringify(new URL('./pack_v1_solved.json', import.meta.url).pathname)}))
picks = json.loads(${JSON.stringify(JSON.stringify(picks))})
out = []
for L, seq in zip(pack, picks):
    core.SIDED = sided(L['sided'])
    s = tuple(tuple(p) for p in L['start'])
    for roll in seq:
        ms = core.moves(s, 4, 3, False)
        if not ms: break
        s = core.apply(s, ms[int(roll * len(ms)) % len(ms)])
    out.append([[list(p) for p in s], core.is_goal(s, 3)])
print(json.dumps(out))
`;
  const py = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
  const expected = JSON.parse(py.stdout.trim().split('\n').at(-1));
  LEVELS.forEach((level, index) => {
    let plates = T.clone(level.plates);
    for (const roll of picks[index]) {
      const moves = T.legalMoves(plates);
      if (!moves.length) break;
      plates = T.apply(plates, moves[Math.floor(roll * moves.length) % moves.length], level.sided);
    }
    assert.equal(JSON.stringify(plates), JSON.stringify(expected[index][0]), 'L' + level.n);
    assert.equal(T.isGoal(plates), expected[index][1], 'goal L' + level.n);
  });
});

test('lazy play on L7 to L10 stays at or under 30 percent', () => {
  const rates = [];
  for (const level of LEVELS.filter((item) => item.n >= 7)) {
    const rng = mulberry32(9 + level.n * 17);
    const policies = [
      ['g1', (plates, sided, random) => best1(plates, sided, h1, random), 80],
      ['g2', (plates, sided, random) => best1(plates, sided, h2, random), 80],
      ['g1x2', (plates, sided, random) => best2(plates, sided, h1, random), 40],
      ['g2x2', (plates, sided, random) => best2(plates, sided, h2, random), 40]
    ];
    let worst = 0;
    for (const [name, choose, n] of policies) {
      let clears = 0;
      for (let i = 0; i < n; i++) if (play(level, choose, rng)) clears += 1;
      const rate = clears / n;
      worst = Math.max(worst, rate);
      assert.ok(rate <= 0.30, `L${level.n} ${name} ${rate}`);
    }
    rates.push(worst);
    console.log(`L${level.n} lazy ${worst.toFixed(3)}`);
  }
  assert.ok(Math.max(...rates) <= 0.30);
});

test('the ten starts stay distinct under plate order and flavour relabelling', () => {
  function sidedColours(level) {
    const colours = [];
    for (let c = 0; c < level.colours; c++) colours.push(c);
    return colours.filter((c) => T.twoSided(c, level.sided));
  }
  const keys = new Set();
  for (const level of LEVELS) {
    const sided = sidedColours(level);
    const free = [];
    for (let c = 0; c < level.colours; c++) if (!sided.includes(c)) free.push(c);
    let clash = false;
    for (const perm of permutations([...Array(level.colours).keys()])) {
      const mapsSided = sided.every((c) => sided.includes(perm[c])) && free.every((c) => free.includes(perm[c]));
      if (!mapsSided) continue;
      const mapped = level.plates.map((plate) => plate.map((pancake) => (perm[pancake >> 1] << 1) | (pancake & 1)));
      const key = level.colours + ':' + level.sidedName + ':' + T.canonKey(mapped);
      if (keys.has(key)) clash = true;
      keys.add(key);
    }
    assert.equal(clash, false, 'L' + level.n);
  }
});

function permutations(list) {
  if (list.length <= 1) return [list.slice()];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (const tail of permutations(list.slice(0, i).concat(list.slice(i + 1)))) out.push([list[i]].concat(tail));
  }
  return out;
}
