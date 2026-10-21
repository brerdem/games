import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import * as Ref from './ref-lib.mjs';

const sandbox = { console, Math, Object, Map, Set, Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const L = sandbox.FoldLogic;

const SOLUTIONS = [
  ['V3'],
  ['H4', 'H3'],
  ['V4', 'V3'],
  ['H4', 'H1', 'H2'],
  ['V5', 'V4', 'V2'],
  ['H3', 'H4', 'H7'],
  ['V2', 'V5', 'V4', 'V2', 'V1'],
  ['H5', 'H2', 'H4', 'H2', 'H1'],
  ['H1', 'H7', 'H6', 'H5', 'H6', 'H7'],
  ['H6', 'H5', 'H2', 'V4', 'H6', 'H7'],
  ['H1', 'H2', 'H4', 'H2', 'V5', 'H5'],
  ['H6', 'H4', 'H1', 'H2', 'V2', 'H6']
];

function refLevel(level) {
  return { W: level.W, H: level.H, creases: level.creases.map((c) => ({ o: c.o, k: c.k })), start: level.start.slice(), target: level.target.slice() };
}

test('fold matches the reference simulator on every crease and on random sequences', () => {
  for (const level of L.LEVELS) {
    const ref = refLevel(level);
    for (const crease of level.creases) {
      const mine = L.fold(level.start, L.pairs(level.W, level.H, crease));
      const theirs = Ref.fold(level.start, Ref.pairs(level.W, level.H, crease));
      assert.deepEqual(mine, theirs, level.id + ' ' + crease.id);
    }
    const rand = L.rng(level.n * 97);
    for (let n = 0; n < 12; n++) {
      let mine = level.start.slice();
      let theirs = level.start.slice();
      const steps = 4 + (n % 5);
      for (let s = 0; s < steps; s++) {
        const crease = level.creases[Math.floor(rand() * level.creases.length)];
        mine = L.fold(mine, L.pairs(level.W, level.H, crease));
        theirs = Ref.fold(theirs, Ref.pairs(level.W, level.H, crease));
      }
      assert.deepEqual(mine, theirs, level.id + ' sequence ' + n);
    }
  }
});

test('preview equals the committed fold, and the crosses are the smudge cells', () => {
  for (const level of L.LEVELS) {
    const state = L.freshState(level);
    level.creases.forEach((crease, index) => {
      const view = L.preview(level, state.cells, index);
      const direct = L.fold(state.cells, L.pairs(level.W, level.H, crease));
      assert.deepEqual(view.next, direct, level.id + ' ' + crease.id);
      assert.deepEqual(view.badCells, L.smudgeCells(direct, level.target));
      assert.equal(view.bad, L.violates(direct, level.target));
    });
  }
});

test('each published solution finishes at par and the BFS par matches the brief', () => {
  L.LEVELS.forEach((level, index) => {
    const analysis = L.analyse(level);
    assert.equal(analysis.par, level.par, level.id);
    assert.equal(level.presses, level.par + 2, level.id);
    const played = L.replay(level, SOLUTIONS[index]);
    assert.equal(played.state.won, true, level.id + ' ' + played.events.join(','));
    assert.equal(played.state.pressesLeft, 2, level.id);
    assert.equal(L.starsFor(level, played.state), 3, level.id);
  });
});

test('a smudge reverts the sheet and still spends a press; L3 V3 first gets stuck', () => {
  const l4 = L.LEVELS[3];
  const hopped = L.applyFold(l4, L.freshState(l4), 0);
  assert.equal(hopped.event, 'fold');
  const view = L.preview(l4, hopped.state.cells, 2);
  assert.equal(view.bad, true);
  assert.ok(view.badCells.length > 0);
  const smudged = L.applyFold(l4, hopped.state, 2);
  assert.equal(smudged.event, 'smudge');
  assert.deepEqual(smudged.state.cells, hopped.state.cells);
  assert.equal(smudged.state.pressesLeft, hopped.state.pressesLeft - 1);
  const l3 = L.LEVELS[2];
  const trapped = L.applyFold(l3, L.freshState(l3), 0);
  assert.equal(trapped.event, 'stuck');
  assert.deepEqual(trapped.state.cells, L.fold(l3.start, L.pairs(6, 8, l3.creases[0])));
  assert.equal(trapped.state.pressesLeft, 3);
  assert.equal(L.preview(l3, trapped.state.cells, 1).bad, true);
  const undone = L.undo(l3, trapped.state);
  assert.equal(undone.event, 'undo');
  assert.equal(undone.state.failed, false);
  assert.deepEqual(undone.state.cells, l3.start);
  const burn = L.LEVELS[3];
  let sheet = L.applyFold(burn, L.freshState(burn), 0).state;
  let guard = 0;
  while (!sheet.failed && guard < 8) {
    sheet = L.applyFold(burn, sheet, 2).state;
    guard++;
  }
  assert.equal(sheet.failed, true);
  assert.equal(sheet.reason, 'presses');
  assert.equal(sheet.pressesLeft, 0);
});

test('undo spends a press and restores the previous sheet; a hint blocks three stars', () => {
  const level = L.LEVELS[1];
  const folded = L.applyFold(level, L.freshState(level), 1);
  assert.equal(folded.event, 'fold');
  const back = L.undo(level, folded.state);
  assert.equal(back.event, 'undo');
  assert.deepEqual(back.state.cells, level.start);
  assert.equal(back.state.pressesLeft, level.presses - 2);
  const hinted = L.useHint(level, L.freshState(level));
  assert.equal(hinted.state.hintUsed, true);
  assert.equal(typeof hinted.crease, 'number');
  const won = L.replay(level, SOLUTIONS[1]);
  won.state.hintUsed = true;
  assert.equal(L.starsFor(level, won.state), 2);
});

function pct(q) {
  return (Number(q[0]) / Number(q[1]) * 100).toFixed(2) + '% (' + q[0] + '/' + q[1] + ')';
}

test('exact policy odds meet the brief caps and L12 is the hardest', () => {
  const rows = L.LEVELS.map((level) => {
    const tally = {};
    for (const policy of ['RAND', 'SAFE1', 'SAFE2', 'MINCHG', 'MAXCHG', 'OUTER', 'INNER', 'VFIRST', 'HFIRST', 'FRESH', 'OPT']) {
      tally[policy] = L.exact(level, policy);
    }
    const t = tally;
    console.log(`${level.id} RAND ${pct(t.RAND.clear)} SAFE1 ${pct(t.SAFE1.clear)} SAFE2 ${pct(t.SAFE2.clear)} FRESH ${pct(t.FRESH.clear)} MIN ${pct(t.MINCHG.clear)}/${pct(t.MINCHG.stars)} OPT ${pct(t.OPT.clear)}`);
    return { level, tally };
  });
  for (const row of rows) {
    const n = row.level.n;
    const t = row.tally;
    const c = (p) => t[p].clearRate;
    const s = (p) => t[p].starRate;
    assert.equal(c('OPT'), 1, row.level.id);
    assert.equal(s('OPT'), 1, row.level.id + ' par');
    if (n >= 7) {
      assert.ok(c('RAND') <= 0.06, `D1 ${row.level.id} ${c('RAND')}`);
      assert.ok(c('SAFE1') <= 0.10, `D2 ${row.level.id} ${c('SAFE1')}`);
      assert.ok(c('SAFE2') <= 0.20, `D3 ${row.level.id} ${c('SAFE2')}`);
      assert.ok(c('VFIRST') <= 0.15 && c('HFIRST') <= 0.15, `D7 ${row.level.id}`);
      assert.ok(c('FRESH') <= 0.16, `D8 ${row.level.id} ${c('FRESH')}`);
      assert.equal(L.onceSolvable(row.level), false, row.level.id);
    }
    if (n >= 4 && n <= 6) assert.ok(c('SAFE1') <= 0.20, `D2 ${row.level.id} ${c('SAFE1')}`);
    if (n >= 3) assert.equal(c('MAXCHG'), 0, `D4 ${row.level.id}`);
    if (n >= 4) {
      assert.ok(c('MINCHG') <= 0.30, `D5 ${row.level.id} ${c('MINCHG')}`);
      assert.ok(s('MINCHG') <= 0.05, `D5 stars ${row.level.id}`);
    }
    if (n >= 6) {
      assert.equal(c('OUTER'), 0, `D6 outer ${row.level.id}`);
      assert.equal(c('INNER'), 0, `D6 inner ${row.level.id}`);
    }
    if (n === 4 || n === 5) assert.ok(c('OUTER') <= 0.55 && c('INNER') <= 0.55, `D6 ${row.level.id}`);
  }
  const late = rows.filter((row) => row.level.n >= 7);
  const safe1 = late.map((row) => row.tally.SAFE1.clearRate);
  const safe2 = late.map((row) => row.tally.SAFE2.clearRate);
  assert.equal(safe1[safe1.length - 1], Math.min(...safe1), 'L12 SAFE1');
  assert.equal(safe2[safe2.length - 1], Math.min(...safe2), 'L12 SAFE2');
});

test('a hint on the best press still leaves L7-L12 under 55 percent for two-step play', () => {
  for (const level of L.LEVELS.filter((item) => item.n >= 7)) {
    let best = 0;
    let bestAt = 0;
    for (let at = 0; at < level.par; at++) {
      const rate = L.exact(level, 'SAFE2', at).clearRate;
      if (rate > best) { best = rate; bestAt = at; }
    }
    console.log(`${level.id} SAFE2+hint exact ${(best * 100).toFixed(2)}% at press ${bestAt}`);
    assert.ok(best <= 0.55, `D9 ${level.id} ${best}`);
  }
});

test('every crease is necessary, and every wax cell on L10-L12 changes the puzzle', () => {
  for (const level of L.LEVELS) {
    const need = L.necessity(level);
    assert.equal(need.par, level.par, level.id);
    need.creases.forEach((flag, i) => assert.equal(flag, true, level.id + ' crease ' + level.creases[i].id));
    if (level.n >= 10) {
      assert.ok(need.wax.length >= 2, level.id);
      need.wax.forEach((flag, i) => assert.equal(flag, true, level.id + ' wax ' + i));
    }
  }
});
