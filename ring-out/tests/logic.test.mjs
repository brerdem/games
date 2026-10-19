import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const L = sandbox.RingLogic;

function endOf(level, actions) {
  let state = L.freshState(level);
  for (const action of actions) {
    state = L.applyAction(level, state, action);
    if (state.end) return state;
  }
  return state;
}

function heartsScript(level) {
  let state = L.freshState(level);
  const actions = [];
  for (let n = 0; n < 6 && state.end !== 'hearts'; n++) {
    const blocked = state.pins.find((pin) => !L.launchResult(level, state, pin).ok);
    if (!blocked) break;
    actions.push({ type: 'launch', id: blocked.id });
    state = L.applyAction(level, state, actions[actions.length - 1]);
  }
  return state.end === 'hearts' ? actions : null;
}

function movesScript(level) {
  const queue = [{ state: L.freshState(level), actions: [] }];
  const seen = new Set();
  let guard = 0;
  while (queue.length && guard++ < 60000) {
    const node = queue.shift();
    const key = `${node.state.rot.join(',')}|${node.state.pins.map((pin) => pin.id).sort((a, b) => a - b).join(',')}|${node.state.moves}|${node.state.hearts}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (node.state.end === 'moves') return node.actions;
    if (node.state.end) continue;
    for (const pin of node.state.pins) {
      const next = L.applyAction(level, node.state, { type: 'launch', id: pin.id });
      const actions = node.actions.concat([{ type: 'launch', id: pin.id }]);
      if (next.end === 'moves') return actions;
      if (!next.end && L.launchResult(level, node.state, pin).ok) queue.push({ state: next, actions });
    }
    if (node.state.moves <= 0) continue;
    for (let ring = 0; ring < level.rings.length; ring++) {
      for (const dir of [1, -1]) {
        const next = L.applyAction(level, node.state, { type: 'rot', ring, dir });
        const actions = node.actions.concat([{ type: 'rot', ring, dir }]);
        if (next.end === 'moves') return actions;
        if (!next.end && !next.rejected) queue.push({ state: next, actions });
      }
    }
  }
  return null;
}

test('twelve solver-verified levels stay inside their budgets', () => {
  assert.equal(L.LEVELS.length, 12);
  for (const level of L.LEVELS) {
    const actions = L.solve(level);
    assert.ok(actions, `L${level.id} has no solution`);
    const spent = L.rotationCount(actions);
    assert.equal(spent, level.par, `L${level.id} par`);
    assert.ok(spent <= level.moves, `L${level.id} budget`);
    const end = endOf(level, actions);
    assert.equal(end.end, 'win');
    assert.equal(end.pins.length, 0);
  }
});

test('slack is at most 1 from level 8', () => {
  for (const level of L.LEVELS.slice(7)) {
    assert.ok(level.moves - level.par <= 1, `L${level.id} slack ${level.moves - level.par}`);
  }
});

test('lazy greedy policy fails at least half of the levels from L5', () => {
  const late = L.LEVELS.slice(4);
  const failed = late.filter((level) => !L.greedy(level));
  assert.ok(failed.length / late.length >= 0.5, `${failed.length}/${late.length}`);
  assert.ok(failed.length >= 4);
});

test('each level has an order trap', { timeout: 120000 }, () => {
  for (const level of L.LEVELS) {
    const info = L.analyze(level);
    assert.equal(info.capped, false, `L${level.id} search capped`);
    assert.equal(info.par, level.par, `L${level.id} remaining minimum`);
    assert.equal(info.trap, true, `L${level.id} trap`);
  }
});

test('a script reaches both lose states', () => {
  assert.ok(L.LEVELS.some((level) => heartsScript(level)));
  assert.ok(L.LEVELS.some((level) => movesScript(level)));
  const hearts = L.LEVELS.find((level) => heartsScript(level));
  const moves = L.LEVELS.find((level) => movesScript(level));
  assert.equal(endOf(hearts, heartsScript(hearts)).end, 'hearts');
  assert.equal(endOf(moves, movesScript(moves)).end, 'moves');
});

test('twenty consecutive generated boards are solvable', () => {
  for (let i = 0; i < 20; i++) {
    const board = L.generateBoard(4000 + i, { rings: 3, pins: 4, colors: 1, slack: 1, id: 100 + i });
    assert.ok(board, `seed ${4000 + i}`);
    const actions = L.solve(board);
    assert.ok(actions, `solve ${4000 + i}`);
    assert.ok(L.rotationCount(actions) <= board.moves);
    assert.equal(endOf(board, actions).end, 'win');
  }
});

test('stars follow the brief thresholds', () => {
  const level = L.LEVELS[0];
  assert.equal(L.starsFor(level, { movesUsed: level.par, heartsLost: 0 }), 3);
  assert.equal(L.starsFor(level, { movesUsed: level.par + 1, heartsLost: 0 }), 2);
  assert.equal(L.starsFor(level, { movesUsed: level.par + 4, heartsLost: 2 }), 1);
});
