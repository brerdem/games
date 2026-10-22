import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object, Map, Set, Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const K = sandbox.KnockLogic;
const DIR = { N: 0, E: 1, S: 2, W: 3 };
const REF = [
  ['(0,3)E', [4], 1],
  ['(0,3)E (0,7)E', [5, 3], 2],
  ['(0,5)E (5,7)N (5,5)N', [5, 2, 1], 1],
  ['(5,1)W (0,2)E (0,3)S', [3, 1, 7], 9],
  ['(0,2)E (5,3)W (5,4)S (5,6)S', [2, 3, 2, 1], 12],
  ['(5,4)W (1,0)S (3,3)W (1,3)W', [4, 3, 2, 1], 1],
  ['(2,0)S (1,3)E (2,4)S (0,7)N (0,6)N', [1, 4, 3, 1, 4], 60],
  ['(4,0)S (2,2)W (0,3)S (0,4)S', [2, 3, 1, 3], 8],
  ['(0,1)E (3,7)N (0,4)E (3,4)E (5,1)N', [5, 3, 3, 5, 1], 3],
  ['(0,1)N (1,1)E (0,6)E (4,5)N (2,6)S', [1, 1, 2, 11, 1], 20],
  ['(0,0)S (1,3)E (0,7)N (1,7)E (2,7)E', [1, 2, 7, 1, 3], 30],
  ['(4,0)S (0,2)E (3,7)N (5,3)W (4,5)N (4,3)N', [2, 4, 4, 1, 2, 2], 20]
];

function parseStep(token) {
  const m = token.match(/\((\d+),(\d+)\)([NESW])/);
  return [+m[2] * 6 + +m[1], DIR[m[3]]];
}
function steps(spec) { return spec.split(' ').map(parseStep); }

function oracle(level) {
  const t0 = Date.now();
  const minF = K.makeMin(level.cells);
  return { minF: minF, ms: Date.now() - t0 };
}

test('I.3 lines clear with the listed felled counts, and BFS par matches', () => {
  REF.forEach(function (row, index) {
    const level = K.LEVELS[index];
    let g = level.cells.slice();
    const felled = [];
    steps(row[0]).forEach(function (mv) {
      assert.ok(K.moves(g).some(function (m) { return m[0] === mv[0] && m[1] === mv[1]; }), level.id + ' ' + mv);
      const result = K.push(g, mv[0], mv[1]);
      felled.push(result.felled);
      g = result.g;
    });
    assert.deepEqual(felled, row[1], level.id);
    assert.equal(K.standingCount(g), 0, level.id);
    const solved = K.solve(level.cells.slice(), 9);
    assert.equal(solved.par, level.par, level.id + ' par');
    assert.equal(solved.nOpt, row[2], level.id + ' nOpt ' + solved.nOpt);
  });
});

test('preview grid equals the committed grid on every legal push along each solution', () => {
  REF.forEach(function (row, index) {
    const level = K.LEVELS[index];
    let g = level.cells.slice();
    K.moves(g).forEach(function (mv) {
      const a = K.push(g, mv[0], mv[1]);
      const b = K.push(g, mv[0], mv[1]);
      assert.equal(a.g.join(''), b.g.join(''));
      assert.equal(g.join(''), level.cells.join(''));
    });
    steps(row[0]).forEach(function (mv) {
      const preview = K.push(g, mv[0], mv[1]);
      const state = K.fresh(level);
      state.cells = g.slice();
      const minF = function () { return 0; };
      const committed = K.commit(state, mv[0], mv[1], minF);
      assert.equal(committed.result.g.join(''), preview.g.join(''));
      g = preview.g;
    });
  });
});

test('an illegal push spends nothing, L1 middle-east is stuck, and out of pushes is reachable', () => {
  const level = K.LEVELS[0];
  const minF = K.makeMin(level.cells);
  const state = K.fresh(level);
  const illegal = K.commit(state, 18, 3, minF);
  assert.equal(illegal.ok, false);
  assert.equal(state.pushesLeft, 3);
  const third = K.commit(state, 3 * 6 + 2, 1, minF);
  assert.equal(third.outcome, 'stuck');
  assert.equal(state.pushesLeft, 2);
  assert.equal(K.standingCount(state.cells) > 0, true);
  const back = K.undo(state, minF);
  assert.equal(back.ok, true);
  assert.equal(state.cells.join(''), level.cells.join(''));
  assert.equal(state.pushesLeft, 1);
  assert.equal(state.undos, 1);
  const spent = K.commit(state, 3 * 6 + 2, 1, minF);
  assert.equal(spent.outcome, 'pushes');
  assert.equal(state.pushesLeft, 0);
  assert.equal(state.reason, 'pushes');
  assert.equal(K.undo(state, minF).ok, false);
});

test('three stars need par pushes with no undo and no hint', () => {
  const level = K.LEVELS[0];
  const minF = K.makeMin(level.cells);
  const state = K.fresh(level);
  K.commit(state, 18, 1, minF);
  assert.equal(state.won, true);
  assert.equal(K.starsFor(level, state), 3);
  const hinted = K.fresh(level);
  hinted.hintUsed = true;
  K.commit(hinted, 18, 1, minF);
  assert.equal(K.starsFor(level, hinted), 2);
  const wasted = K.fresh(level);
  K.commit(wasted, 3 * 6 + 2, 1, minF);
  K.undo(wasted, minF);
  K.commit(wasted, 18, 1, minF);
  assert.equal(wasted.won, true);
  assert.equal(K.starsFor(level, wasted), 1);
});

test('every elbow and splitter is load-bearing and fires on the reference line', () => {
  K.LEVELS.forEach(function (level, index) {
    const bearing = K.loadBearing(level);
    bearing.pieces.forEach(function (piece) {
      assert.equal(piece.needed, true, level.id + ' ' + piece.piece + '@' + piece.i + ' par ' + piece.par);
    });
    let g = level.cells.slice();
    const fired = new Set();
    steps(REF[index][0]).forEach(function (mv) {
      const result = K.push(g, mv[0], mv[1]);
      result.log.forEach(function (event) {
        if (event[1] === 'turn' || event[1] === 'split') fired.add(event[2]);
      });
      g = result.g;
    });
    bearing.pieces.forEach(function (piece) {
      assert.equal(fired.has(piece.i), true, level.id + ' unused ' + piece.piece);
    });
  });
});

test('levels stay distinct under mirror and 180 degree rotation', () => {
  const FH = { H: 'H', V: 'V', '.': '.', '#': '#', a: 'd', b: 'c', c: 'b', d: 'a', '1': '1', '2': '4', '3': '3', '4': '2' };
  const FV = { H: 'H', V: 'V', '.': '.', '#': '#', a: 'b', b: 'a', c: 'd', d: 'c', '1': '3', '2': '2', '3': '1', '4': '4' };
  function mapGrid(cells, table, flip) {
    const out = new Array(48);
    for (var i = 0; i < 48; i++) {
      const c = i % 6;
      const r = (i / 6) | 0;
      const nc = flip === 'H' || flip === 'R' ? 5 - c : c;
      const nr = flip === 'V' || flip === 'R' ? 7 - r : r;
      const ch = cells[nr * 6 + nc];
      out[i] = table[ch] || ch;
    }
    return out.join('');
  }
  const forms = K.LEVELS.map(function (level) {
    return [
      level.cells.join(''),
      mapGrid(level.cells, FH, 'H'),
      mapGrid(level.cells, FV, 'V'),
      mapGrid(mapGrid(level.cells, FH, 'H').split(''), FV, 'V')
    ];
  });
  for (var a = 0; a < forms.length; a++) {
    for (var b = a + 1; b < forms.length; b++) {
      forms[a].forEach(function (form) {
        assert.notEqual(form, K.LEVELS[b].cells.join(''), 'L' + (a + 1) + ' vs L' + (b + 1));
      });
    }
  }
});

test('D1-D10 lazy policies stay under the brief caps, and L12 is strictly hardest', () => {
  const rates = [];
  K.LEVELS.forEach(function (level) {
    const built = oracle(level);
    const minF = built.minF;
    const g = level.cells;
    const pct = function (name, probe, hintAt) {
      return K.exactPolicy(name, g, level.par, minF, probe, hintAt == null ? -1 : hintAt).clear;
    };
    let hint = { clear: -1, at: 0, star3: 1 };
    for (let h = 0; h < level.par; h++) {
      const exact = K.exactPolicy('GREEDY2', g, level.par, minF, true, h);
      if (exact.clear > hint.clear) hint = { clear: exact.clear, at: h, star3: exact.star3 };
    }
    const row = {
      id: level.id,
      par: level.par,
      oracleMs: built.ms,
      RAND: pct('RAND', false),
      RANDp: pct('RAND', true),
      GREEDY: pct('GREEDY', false),
      GREEDY2: pct('GREEDY2', false),
      GREEDY2p: pct('GREEDY2', true),
      MAXIMAL: pct('MAXIMAL', false),
      MAXIMALp: pct('MAXIMAL', true),
      NOSPIN: pct('NOSPIN', false),
      SAFE1: pct('SAFE1', false),
      hint: hint.clear,
      hintAt: hint.at,
      hintStar: hint.star3
    };
    const sample = K.runPolicy('MAXIMAL', g, level.par, 300, 11, minF, true, -1);
    row.sampleMaxp = sample.clear;
    const lookup0 = Date.now();
    minF(K.push(g, K.moves(g)[0][0], K.moves(g)[0][1]).g);
    row.lookupMs = Date.now() - lookup0;
    rates.push(row);
    console.log(level.id + ' exact RAND ' + (row.RAND * 100).toFixed(1) + ' Rp ' + (row.RANDp * 100).toFixed(1) + ' G ' + (row.GREEDY * 100).toFixed(1) + ' G2 ' + (row.GREEDY2 * 100).toFixed(1) + ' G2p ' + (row.GREEDY2p * 100).toFixed(1) + ' MAX ' + (row.MAXIMAL * 100).toFixed(1) + ' MAXp ' + (row.MAXIMALp * 100).toFixed(1) + ' NS ' + (row.NOSPIN * 100).toFixed(1) + ' S1 ' + (row.SAFE1 * 100).toFixed(1) + ' hint ' + (row.hint * 100).toFixed(1) + '@' + row.hintAt + ' sampleMAXp ' + row.sampleMaxp + '/300');
    if (level.n >= 7) {
      assert.ok(row.RAND <= 0.03, 'D1 ' + level.id);
      assert.ok(row.RANDp <= 0.05, 'D2 ' + level.id);
      assert.equal(row.GREEDY, 0, 'D3 ' + level.id);
      assert.ok(row.GREEDY2 <= 0.10, 'D4 ' + level.id);
      assert.ok(row.GREEDY2p <= 0.15, 'D5 ' + level.id);
      assert.ok(row.MAXIMALp <= 0.30, 'D6 ' + level.id);
      assert.ok(row.SAFE1 <= 0.05, 'D8 ' + level.id);
      assert.ok(row.hint <= 0.60, 'D9 ' + level.id);
      assert.equal(row.hintStar, 0, 'D9 star ' + level.id);
      assert.ok(row.sampleMaxp / 300 <= 0.45, 'D6 sample ' + level.id);
    }
    if (level.n >= 5) assert.equal(row.NOSPIN, 0, 'D7 ' + level.id);
    assert.ok(row.lookupMs < 50, 'lookup ' + level.id + ' ' + row.lookupMs);
  });
  const hard = rates.filter(function (row) { return +row.id.slice(1) >= 7 && row.id !== 'L12'; });
  const l12 = rates[11];
  assert.ok(hard.every(function (row) { return l12.MAXIMALp < row.MAXIMALp; }), 'MAXIMAL+probe ' + l12.MAXIMALp);
  assert.ok(hard.every(function (row) { return l12.MAXIMAL < row.MAXIMAL; }), 'MAXIMAL ' + l12.MAXIMAL);
  assert.ok(hard.every(function (row) { return l12.par > row.par; }));
});
