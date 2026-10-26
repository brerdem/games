import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Map, Array, Object, String };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const W = sandbox.WhiskLogic;
const LEVELS = W.levels();
const PACK = JSON.parse(fs.readFileSync(new URL('./pack_v1.json', import.meta.url), 'utf8'));

function digest(level) {
  const g = W.graph(level);
  const keys = Array.from(g.edges.keys()).sort();
  const hash = crypto.createHash('sha256');
  for (const key of keys) {
    const labs = g.edges.get(key).map((edge) => edge.move[0] + edge.move[1] + '>' + edge.key).sort().join(',');
    const dist = g.dist.has(key) ? g.dist.get(key) : -1;
    hash.update(key + '|' + dist + '|' + labs + '\n');
  }
  return hash.digest('hex');
}

test('reference lines clear at par and the pack counts match', () => {
  for (const level of LEVELS) {
    assert.equal(level.ref.length, level.par, 'L' + level.n);
    let board = W.start(level);
    for (const move of level.ref) {
      const next = W.apply(level, board, move);
      assert.ok(next, 'L' + level.n + ' ' + move.join(''));
      board = next;
    }
    assert.equal(W.isGoal(level, board), true, 'L' + level.n);
    const g = W.graph(level);
    assert.equal(g.count, level.expectStates, 'states L' + level.n);
    assert.equal(g.par, level.par, 'par L' + level.n);
    assert.deepEqual(W.visibleCells(level), level.expectVisible, 'visible L' + level.n);
    assert.ok(level.expectVisible.every((count) => count >= 2));
  }
  assert.equal(LEVELS[9].par, 10);
  assert.ok(LEVELS.slice(0, 9).every((level) => level.par < 10));
  assert.ok(LEVELS.slice(0, 9).every((level) => level.expectStates < LEVELS[9].expectStates));
});

test('the JS graph matches the Python sim on every level', () => {
  const script = `
import json, hashlib, sys
sys.path.insert(0, ${JSON.stringify(new URL('./', import.meta.url).pathname)})
from core2 import *
pack = json.load(open(${JSON.stringify(new URL('./pack_v1.json', import.meta.url).pathname)}))
def flat_key(st):
    offs, pres, ds = st
    nums = []
    for (ox, oy), present in zip(offs, pres):
        nums.extend([ox, oy, 1 if present else 0])
    for x, y, sup in ds:
        nums.extend([x, y, sup])
    return ','.join(str(n) for n in nums)
for row in pack:
    cloths = [tuple(c) for c in row['cloths']]
    dishes = [tuple(d) for d in row['dishes']]
    targets = [tuple(t) for t in row['targets']]
    level = Lvl(row['W'], row['H'], cloths, dishes, targets)
    edges, dist = graph(level)
    mapped = {}
    flat_dist = {}
    for state, moves in edges.items():
        mapped[flat_key(state)] = moves
    for state, value in dist.items():
        flat_dist[flat_key(state)] = value
    digest = hashlib.sha256()
    for key in sorted(mapped):
        labels = ','.join(sorted(move[0] + str(move[1]) + '>' + flat_key(nxt) for move, nxt in mapped[key]))
        digest.update(f"{key}|{flat_dist.get(key, -1)}|{labels}\\n".encode())
    print(digest.hexdigest())
`;
  const py = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
  const lines = py.stdout.trim().split('\n');
  assert.equal(lines.length, 10);
  LEVELS.forEach((level, index) => {
    assert.equal(digest(level), lines[index], 'L' + level.n);
  });
});

test('lazy play stays under the brief caps and L10 is strictly hardest', () => {
  const rows = [];
  for (const level of LEVELS) {
    const rates = W.lazyRates(level);
    rows.push(rates);
    const pack = PACK[level.n - 1].lazy_pct;
    for (const name of ['RAND', 'GREEDY', 'GREEDY2', 'WHIP_FIRST', 'GREEDY_WHIPLATE']) {
      assert.ok(Math.abs(rates[name] - pack[name]) < 0.15, 'L' + level.n + ' ' + name + ' ' + rates[name] + ' vs ' + pack[name]);
    }
    if (level.n >= 5) {
      assert.ok(rates.RAND <= 21, 'rand L' + level.n + ' ' + rates.RAND);
      assert.ok(rates.GREEDY <= 5, 'greedy L' + level.n + ' ' + rates.GREEDY);
    }
    if (level.n >= 2) assert.equal(rates.WHIP_FIRST, 0, 'whip-first L' + level.n);
    if (level.n >= 7) assert.ok(rates.GREEDY2 <= 21, 'greedy2 L' + level.n);
    if (level.n >= 5) assert.ok(rates.GREEDY_WHIPLATE <= 8.3, 'late whip L' + level.n);
    console.log('L' + level.n, JSON.stringify(rates));
  }
  const hardest = rows.map((rates, index) => rates.max);
  assert.equal(hardest[9], 0);
  assert.ok(hardest.slice(4, 9).every((value) => value > hardest[9]));
});

test('the stuck check agrees with the distance on at least 200 states', () => {
  let checks = 0;
  let wrong = 0;
  for (const level of LEVELS) {
    const g = W.graph(level);
    g.states.forEach((board, key) => {
      const dist = g.dist.has(key) ? g.dist.get(key) : Infinity;
      for (let left = 0; left <= level.budget; left++) {
        const stuck = !W.isGoal(level, board) && dist > left;
        const text = W.stuckText(left);
        if (stuck !== (dist > left && !W.isGoal(level, board))) wrong++;
        if (!text.includes(String(left))) wrong++;
        checks++;
      }
      const edges = g.edges.get(key);
      for (const edge of edges) {
        const next = g.dist.has(edge.key) ? g.dist.get(edge.key) : Infinity;
        if (next <= 1) continue;
        const helps = W.undoHelps(level, board, next - 1);
        if (helps !== (dist <= next - 1)) wrong++;
        checks++;
      }
    });
  }
  assert.ok(checks >= 200, 'checks ' + checks);
  assert.equal(wrong, 0);
});
