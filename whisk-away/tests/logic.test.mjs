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
const PACK_V1 = JSON.parse(fs.readFileSync(new URL('./pack_v1.json', import.meta.url), 'utf8'));
const PACK_FILE = JSON.parse(fs.readFileSync(new URL('./pack_v1_1.json', import.meta.url), 'utf8'));
const PACK = PACK_FILE.levels;

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
  assert.equal(W.stuckText(1), "Can't set the table in 1 move");
  assert.equal(W.stuckText(4), "Can't set the table in 4 moves");
  for (const index of [0, 1, 2, 3, 4, 5, 7, 8]) {
    assert.deepEqual(PACK[index].cloths, PACK_V1[index].cloths, 'cloths L' + (index + 1));
    assert.deepEqual(PACK[index].dishes, PACK_V1[index].dishes, 'dishes L' + (index + 1));
    assert.deepEqual(PACK[index].targets, PACK_V1[index].targets, 'marks L' + (index + 1));
    assert.deepEqual(PACK[index].reference_line, PACK_V1[index].reference_line, 'ref L' + (index + 1));
    assert.equal(PACK[index].par, PACK_V1[index].par);
  }
  assert.equal(PACK[6].source_seed, 110060);
  assert.equal(PACK[9].source_seed, 121131);
  assert.notDeepEqual(PACK[6].cloths, PACK_V1[6].cloths);
  assert.notDeepEqual(PACK[9].cloths, PACK_V1[9].cloths);
});

test('the JS graph matches the Python sim on every level', () => {
  const script = `
import json, hashlib, sys
sys.path.insert(0, ${JSON.stringify(new URL('./', import.meta.url).pathname)})
from core2 import *
raw = json.load(open(${JSON.stringify(new URL('./pack_v1_1.json', import.meta.url).pathname)}))
pack = raw['levels'] if isinstance(raw, dict) else raw
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
    for (const name of ['RAND', 'GREEDY', 'GREEDY2', 'WHIP_FIRST', 'GREEDY_WHIPLATE', 'GREEDY_BRIEF', 'GREEDY2_BRIEF']) {
      assert.ok(Math.abs(rates[name] - pack[name]) < 0.06, 'L' + level.n + ' ' + name + ' ' + rates[name] + ' vs ' + pack[name]);
    }
    if (level.n >= 5) {
      assert.ok(rates.RAND <= 21, 'rand L' + level.n + ' ' + rates.RAND);
      for (const name of ['GREEDY', 'GREEDY2', 'GREEDY_WHIPLATE', 'GREEDY_BRIEF', 'GREEDY2_BRIEF']) {
        assert.ok(rates[name] <= 5, name + ' L' + level.n + ' ' + rates[name]);
      }
    }
    if (level.n >= 2) assert.equal(rates.WHIP_FIRST, 0, 'whip-first L' + level.n);
    console.log('L' + level.n, JSON.stringify(rates));
  }
  assert.equal(rows[6].RAND, 1.3);
  assert.equal(rows[6].GREEDY, 0);
  assert.equal(rows[6].GREEDY2, 0);
  assert.equal(rows[9].RAND, 0.05);
  assert.equal(rows[9].GREEDY2, 0.09);
  assert.ok(rows.slice(0, 9).every((rates) => rates.RAND > rows[9].RAND));
  assert.ok(rows.slice(4, 9).every((rates) => rates.max > rows[9].max));
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
