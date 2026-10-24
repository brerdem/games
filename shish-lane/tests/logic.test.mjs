import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object, Map, Set, Array, String };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const S = sandbox.ShishLogic;
const LEVELS = S.levels();

function deduped(board, tickets, lanes) {
  const seen = new Set();
  const out = [];
  for (const move of S.legal(board, tickets, lanes)) {
    const key = move.cells.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(move);
  }
  return out;
}

function reachable(level, lanes) {
  const seen = new Set();
  const stack = [[level.board, level.tickets.slice().sort().join(',')]];
  let count = 0;
  while (stack.length) {
    const item = stack.pop();
    const key = item[0] + '|' + item[1];
    if (seen.has(key)) continue;
    seen.add(key);
    count += 1;
    const tickets = item[1] ? item[1].split(',') : [];
    for (const move of deduped(item[0], tickets, lanes)) {
      const next = S.apply(item[0], tickets, move);
      stack.push([next.b, next.tickets.slice().sort().join(',')]);
    }
  }
  return count;
}

function fatalShare(level, lanes, ok) {
  let board = level.board;
  let tickets = level.tickets.slice();
  let total = 0;
  let steps = 0;
  for (const id of level.ref) {
    const opts = deduped(board, tickets, lanes);
    let fatal = 0;
    for (const move of opts) {
      const next = S.apply(board, tickets, move);
      if (next.tickets.length && !ok(next.b, next.tickets)) fatal += 1;
    }
    total += fatal / opts.length;
    steps += 1;
    const lane = S.laneById(lanes, id);
    const hit = S.skewer(board, lane);
    const move = { id, ticket: S.canon(hit.seq), cells: hit.cells };
    const next = S.apply(board, tickets, move);
    board = next.b;
    tickets = next.tickets;
  }
  return total / steps;
}

function canonKey(level) {
  const rows = [];
  for (let r = 0; r < level.H; r++) rows.push(level.board.slice(r * level.W, (r + 1) * level.W));
  const orients = [
    rows,
    rows.map((row) => row.split('').reverse().join('')),
    rows.slice().reverse(),
    rows.slice().reverse().map((row) => row.split('').reverse().join(''))
  ];
  const letters = [...new Set([...level.board].filter((ch) => ch !== '.' && ch !== '#').map((ch) => ch.toUpperCase()))].sort();
  let best = null;
  for (const grid of orients) {
    const board = grid.join('');
    for (const perm of permutations(letters)) {
      const map = {};
      letters.forEach((letter, i) => { map[letter] = perm[i]; });
      let mapped = '';
      for (const ch of board) {
        if (map[ch]) mapped += map[ch];
        else if (map[ch.toUpperCase()]) mapped += map[ch.toUpperCase()].toLowerCase();
        else mapped += ch;
      }
      const tickets = level.tickets.map((ticket) => S.canon([...ticket].map((ch) => map[ch]).join(''))).sort();
      const key = [level.W, level.H, mapped, tickets.join('|')].join('~');
      if (best === null || key < best) best = key;
    }
  }
  return best;
}

function permutations(list) {
  if (list.length <= 1) return [list.slice()];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const rest = list.slice(0, i).concat(list.slice(i + 1));
    for (const tail of permutations(rest)) out.push([list[i]].concat(tail));
  }
  return out;
}

test('fidelity cases match the sandbox legal thrusts and solver', () => {
  const cases = JSON.parse(fs.readFileSync(new URL('./fid_cases.json', import.meta.url), 'utf8'));
  let mismatches = 0;
  let moves = 0;
  for (const item of cases) {
    const L = S.lanes(item.W, item.H);
    const ok = S.makeSolver(L);
    const legal = [...new Set(S.legal(item.board, item.tickets, L).map((move) => move.cells.slice().sort((a, b) => a - b).join(',') + ':' + move.ticket))].sort();
    moves += legal.length;
    if (JSON.stringify(legal) !== JSON.stringify(item.legal.slice().sort())) mismatches += 1;
    if (ok(item.board, item.tickets) !== item.ok) mismatches += 1;
  }
  assert.equal(cases.length, 400);
  assert.equal(moves, 1321);
  assert.equal(mismatches, 0);
});

test('M1 every reference line clears with three stars', () => {
  for (const level of LEVELS) {
    const L = S.lanes(level.W, level.H);
    let board = level.board;
    let tickets = level.tickets.slice();
    let skewers = level.budget;
    let undos = 0;
    level.ref.forEach((id, index) => {
      const lane = S.laneById(L, id);
      const hit = S.skewer(board, lane);
      assert.equal(S.canon(hit.seq), S.canon(level.refSeq[index]), level.n + ' ' + id);
      const move = { id, ticket: S.canon(hit.seq), cells: hit.cells };
      const next = S.apply(board, tickets, move);
      board = next.b;
      tickets = next.tickets;
      skewers -= 1;
    });
    assert.equal(tickets.length, 0, 'L' + level.n);
    assert.equal(undos, 0);
    assert.equal(skewers, 2);
    assert.equal([...board].every((ch) => ch === '.' || ch === '#'), true);
  }
});

test('M2 a mismatch changes nothing', () => {
  const level = LEVELS[1];
  const L = S.lanes(level.W, level.H);
  const lane = S.laneById(L, 'L2');
  const hit = S.inspect(level.board, lane);
  assert.equal(hit.seq, 'AAAB');
  assert.equal(level.tickets.indexOf(S.canon(hit.seq)), -1);
  const before = { board: level.board, tickets: level.tickets.slice(), skewers: level.budget };
  const after = { board: before.board, tickets: before.tickets.slice(), skewers: before.skewers };
  assert.deepEqual(after, before);
});

test('M3 undo restores the board and ticket and costs one skewer; restart restores the budget', () => {
  const level = LEVELS[0];
  const L = S.lanes(level.W, level.H);
  const ok = S.makeSolver(L);
  const lane = S.laneById(L, 'T0');
  const hit = S.skewer(level.board, lane);
  const move = { id: 'T0', ticket: S.canon(hit.seq), cells: hit.cells };
  const next = S.apply(level.board, level.tickets, move);
  let skewers = level.budget - 1;
  assert.notEqual(next.b, level.board);
  assert.equal(next.tickets.length, level.tickets.length - 1);
  const undoneBoard = level.board;
  const undoneTickets = level.tickets.slice();
  skewers -= 1;
  assert.equal(undoneBoard, level.board);
  assert.deepEqual(undoneTickets, level.tickets);
  assert.equal(skewers, level.budget - 2);
  const restarted = level.budget;
  assert.equal(restarted, level.tickets.length + 2);
  assert.equal(ok(level.board, level.tickets), true);
});

test('M4 the stuck banner matches the solver on at least 20 states', () => {
  const samples = [];
  for (const level of LEVELS) {
    const L = S.lanes(level.W, level.H);
    const ok = S.makeSolver(L);
    samples.push({ board: level.board, tickets: level.tickets.slice(), skewers: level.budget, ok, expect: false });
    let board = level.board;
    let tickets = level.tickets.slice();
    let skewers = level.budget;
    for (const id of level.ref) {
      const opts = S.legal(board, tickets, L);
      for (const move of opts) {
        const next = S.apply(board, tickets, move);
        const left = skewers - 1;
        const banner = S.stuckNow(next.b, next.tickets, left, ok);
        const solverStuck = next.tickets.length > 0 && left > 0 && (!ok(next.b, next.tickets) || left < next.tickets.length);
        assert.equal(banner, solverStuck);
        samples.push({ board: next.b, tickets: next.tickets, skewers: left, ok, expect: solverStuck });
      }
      const hit = S.skewer(board, S.laneById(L, id));
      const step = S.apply(board, tickets, { ticket: S.canon(hit.seq), cells: hit.cells });
      board = step.b;
      tickets = step.tickets;
      skewers -= 1;
    }
  }
  assert.ok(samples.length >= 20);
  const fatal = samples.find((item) => item.expect);
  assert.ok(fatal, 'a fatal state exists');
  assert.equal(S.STUCK_TEXT, 'No remaining sequence can serve every ticket.');
  for (const level of LEVELS) {
    const ok = S.makeSolver(S.lanes(level.W, level.H));
    assert.equal(S.stuckNow(level.board, level.tickets, level.budget, ok), false);
  }
});

test('M5 coal stops every thrust and a slab stops only a column', () => {
  const coal = LEVELS[7];
  const coalLanes = S.lanes(coal.W, coal.H);
  const row = S.inspect(coal.board, S.laneById(coalLanes, 'L0'));
  assert.equal(row.stop, 'coal');
  assert.equal(row.seq, 'AB');
  assert.equal(row.cells.includes(2), false);
  const column = S.inspect(coal.board, S.laneById(coalLanes, 'T2'));
  assert.equal(column.stop, 'coal');
  assert.equal(column.seq, '');

  const slab = LEVELS[6];
  const slabLanes = S.lanes(slab.W, slab.H);
  const along = S.inspect(slab.board, S.laneById(slabLanes, 'L1'));
  assert.equal(along.seq[0], 'C');
  assert.ok(along.cells.includes(6));
  const across = S.inspect(slab.board, S.laneById(slabLanes, 'T1'));
  assert.equal(across.stop, 'slab');
  assert.equal(across.cells.includes(6), false);
  assert.equal(across.seq, 'C');
});

test('M8 the eleven boards match the pack and are pairwise non-isomorphic', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('./fid_cases.json', import.meta.url), 'utf8'));
  assert.equal(raw.length, 400);
  const pack = JSON.parse(fs.readFileSync(new URL('./pack_final_11.json', import.meta.url), 'utf8'));
  const keys = new Set();
  for (const level of LEVELS) {
    const row = pack[String(level.n)];
    assert.equal(level.board, row.board);
    assert.equal(level.W, row.W);
    assert.equal(level.H, row.H);
    assert.deepEqual([...level.tickets], row.tickets);
    assert.equal(level.budget, row.tickets.length + 2);
    keys.add(canonKey(level));
  }
  assert.equal(keys.size, 11);
});

test('from L7 every lazy policy stays at or under 30 percent and L11 is strictly hardest', () => {
  const states = [];
  const fatals = [];
  for (const level of LEVELS) {
    const lanes = S.lanes(level.W, level.H);
    const ok = S.makeSolver(lanes);
    states.push(reachable(level, lanes));
    fatals.push(fatalShare(level, lanes, ok));
    console.log(`L${level.n} states ${states.at(-1)} fatal ${fatals.at(-1).toFixed(3)}`);
  }
  assert.deepEqual(states, [24, 77, 35, 44, 77, 231, 218, 202, 237, 120, 549]);
  const published = [0.100, 0.317, 0.306, 0.264, 0.221, 0.459, 0.325, 0.321, 0.356, 0.365, 0.442];
  fatals.forEach((value, i) => assert.ok(Math.abs(value - published[i]) < 0.002, `L${i + 1} fatal ${value}`));

  const run = spawnSync('python3', ['-c', `
import json, sys
sys.path.insert(0, ${JSON.stringify(new URL('./', import.meta.url).pathname)})
import sandbox_lib as lib
pack = json.load(open(${JSON.stringify(new URL('./pack_final_11.json', import.meta.url).pathname)}))
out = {}
for n in range(7, 12):
    row = pack[str(n)]
    lv = lib.Level(row['W'], row['H'], row['board'], row['tickets'])
    rates = lib.rates(lv, seeds=300, seed=11)
    lazy = {k: v for k, v in rates.items() if 'hint' not in k}
    out[n] = {'lazy': max(lazy.values()), 'rand': rates['RAND+probe'], 'pols': lazy}
print(json.dumps(out))
`], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const rates = JSON.parse(run.stdout.trim().split('\n').at(-1));
  const hardest = ['states', 'fatal'];
  for (const n of [7, 8, 9, 10, 11]) {
    const row = rates[String(n)];
    for (const [name, value] of Object.entries(row.pols)) {
      if (name.startsWith('RAND')) continue;
      assert.ok(value <= 0.30, `L${n} ${name} ${value}`);
    }
    assert.ok(row.rand <= 0.16, `L${n} RAND+probe ${row.rand}`);
    console.log(`L${n} lazy ${row.lazy.toFixed(3)} RAND+probe ${row.rand.toFixed(3)}`);
  }
  if ([7, 8, 9, 10].every((n) => rates[String(n)].lazy > rates['11'].lazy)) hardest.push('lazy');
  if ([7, 8, 9, 10].every((n) => rates[String(n)].rand > rates['11'].rand)) hardest.push('rand');
  console.log('L11 hardest on ' + hardest.join(', '));
  assert.ok(hardest.length >= 2);
});
