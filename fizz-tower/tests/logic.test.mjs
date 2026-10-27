import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const pack = JSON.parse(fs.readFileSync(new URL('./pack_v1.json', import.meta.url), 'utf8'));
const pagePack = fs.readFileSync(new URL('../pack.js', import.meta.url), 'utf8');
const sandbox = { FIZZ_PACK: pack, console, Math, Map, Object, Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(pagePack.replace('var FIZZ_PACK', 'FIZZ_PACK'), sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const F = sandbox.FizzLogic;
const LEVELS = F.levels();

function encode(state) {
  return state.cont.map((glass) => glass.join('.')).join('|') + '#' + state.tilt.join('');
}

test('pack.js matches pack_v1.json', () => {
  assert.equal(JSON.stringify(sandbox.FIZZ_PACK), JSON.stringify(pack));
});

test('every reference line wins at par and matches the pack event labels', () => {
  for (const level of LEVELS) {
    const played = F.playRef(level);
    assert.equal(played.won, true, 'L' + level.n);
    assert.equal(played.trace.length, level.par, 'L' + level.n + ' length');
    for (const step of played.trace) assert.equal(step.ok, true, 'L' + level.n + ' ' + step.step + ' got ' + step.got);
    const counted = F.countUntilGoal(level);
    assert.equal(counted.par, level.par, 'par L' + level.n);
    assert.equal(counted.states, level.expectStates, 'states L' + level.n);
  }
  assert.equal(LEVELS[9].par, 10);
  assert.ok(LEVELS.slice(0, 9).every((level) => level.par < 10));
  assert.ok(LEVELS.slice(0, 9).every((level) => level.expectStates < LEVELS[9].expectStates));
  assert.equal(F.stuckText(1), "This tower can't be finished in 1 pour");
  assert.equal(F.stuckText(4), "This tower can't be finished in 4 pours");
});

test('random pour sequences match the Python fixtures', () => {
  const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));
  assert.equal(fixtures.length, 10);
  for (const row of fixtures) {
    const level = LEVELS[row.level - 1];
    assert.ok(row.seqs.length >= 400, 'L' + row.level);
    for (const seq of row.seqs) {
      let state = F.start(level);
      for (const move of seq.moves) state = F.pour(level, state, move).state;
      assert.equal(encode(state), seq.state, 'L' + row.level + ' ' + seq.moves.join(','));
    }
  }
});

test('lazy play stays inside the brief caps and L10 is strictly hardest', () => {
  const rows = [];
  for (const level of LEVELS) {
    const rates = F.lazyRates(level);
    rows.push(rates);
    for (const name of ['RAND', 'GREEDY', 'GREEDY2', 'FILLFIRST']) {
      assert.ok(Math.abs(rates[name] - level.lazy[name]) < 0.5, 'L' + level.n + ' ' + name + ' ' + rates[name] + ' vs ' + level.lazy[name]);
    }
    if (level.n >= 4) {
      assert.ok(rates.RAND <= 6.1, 'rand L' + level.n);
      assert.equal(rates.GREEDY, 0);
      assert.ok(rates.GREEDY2 <= 1.5, 'g2 L' + level.n);
      assert.equal(rates.FILLFIRST, 0);
    }
    if (level.n >= 8) assert.ok(rates.RAND <= 1, 'late rand L' + level.n);
    if (level.n >= 2) {
      assert.equal(rates.GREEDY, 0);
      assert.equal(rates.FILLFIRST, 0);
    }
    console.log('L' + level.n, JSON.stringify(rates));
  }
  assert.ok(rows.slice(0, 9).every((rates) => rates.RAND > rows[9].RAND));
});

test('undo helps only when the previous tower is still solvable', () => {
  const level = LEVELS[1];
  const g = F.graph(level);
  let checks = 0;
  g.states.forEach((state, key) => {
    const dist = g.dist.has(key) ? g.dist.get(key) : Infinity;
    for (const edge of g.edges.get(key)) {
      const next = g.states.get(edge.key);
      const nextDist = g.dist.has(edge.key) ? g.dist.get(edge.key) : Infinity;
      if (nextDist <= 1) continue;
      const helps = F.undoHelps(level, state, nextDist - 1);
      assert.equal(helps, dist <= nextDist - 1);
      checks++;
    }
  });
  assert.ok(checks >= 10, 'checks ' + checks);
});
