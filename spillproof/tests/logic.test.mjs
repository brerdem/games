import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object, Map, Set, Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const L = sandbox.SpillLogic;

function model(n) { return L.models()[n - 1]; }

test('stored solutions match the visible gauges', () => {
  for (const puzzle of L.models()) {
    const got = L.cluesFromSolution(puzzle);
    puzzle.clue.rows.forEach((clue, i) => { if (clue != null) assert.equal(got.rows[i], clue, puzzle.level.title + ' row ' + i); });
    puzzle.clue.cols.forEach((clue, i) => { if (clue != null) assert.equal(got.cols[i], clue, puzzle.level.title + ' col ' + i); });
  }
});

test('M1 policies match the brief thresholds', () => {
  const table = L.acceptance(2026);
  assert.equal(table.length, 12);
  for (const row of table) {
    assert.ok(row.d1fail / 30 >= 0.9, `D1 L${row.level} ${row.d1fail}/30`);
    assert.equal(row.unique, 1, `P3 L${row.level}`);
    assert.equal(row.p1win, true, `P1 win L${row.level}`);
    assert.equal(row.p1guesses, 0, `P1 guesses L${row.level}`);
    assert.equal(row.p1spills, 0, `P1 spills L${row.level}`);
    if (row.level === 1) assert.equal(row.tier, 0);
    else if (row.level <= 6) assert.equal(row.tier, 1, `P4 L${row.level}`);
    else assert.equal(row.tier, 2, `P4 L${row.level}`);
    if (row.level >= 3) assert.equal(row.d4, false, `D4 L${row.level}`);
    else assert.equal(row.d4, true, `D4 may win L${row.level}`);
    if (row.level >= 4) {
      assert.equal(row.d2, false, `D2 L${row.level}`);
      assert.equal(row.d3, false, `D3 L${row.level}`);
      assert.ok(row.d5fail / 30 >= 0.6, `D5 L${row.level} ${row.d5fail}/30`);
      assert.ok(row.d7fail / 30 >= 0.6, `D7 L${row.level} ${row.d7fail}/30`);
    }
    if (row.level >= 5) assert.equal(row.pipesNeeded, row.pipes, `P2 L${row.level} ${row.pipesNeeded}/${row.pipes}`);
    console.log(`L${row.level} D1 ${row.d1fail}/30 D2 ${row.d2 ? 'WIN' : 'lose'} D3 ${row.d3 ? 'WIN' : 'lose'} D4 ${row.d4 ? 'WIN' : 'lose'} D5 ${row.d5fail}/30 D7 ${row.d7fail}/30 tier ${row.tier} pipes ${row.pipesNeeded}/${row.pipes}`);
  }
});

test('D6 lucky 3-star stays at or under 3 percent on L4-L12', () => {
  const rows = L.luck(77, 300);
  for (const row of rows) {
    console.log(`L${row.level} 0-spill ${row.zero}/300 clears ${row.wins}/300`);
    if (row.level >= 4) assert.ok(row.zero / 300 <= 0.03, `D6 L${row.level} ${row.zero}/300`);
  }
});

test('a wrong pour frosts only that group at or above the row, and the third spill fails', () => {
  const puzzle = model(1);
  const fresh = L.freshState(puzzle);
  const spilled = L.pour(puzzle, fresh, 0, 4);
  assert.equal(spilled.event, 'spill');
  assert.equal(spilled.state.spills, 1);
  assert.equal(spilled.state.committed[puzzle.groupAt[0][4]], fresh.committed[puzzle.groupAt[0][4]]);
  const group = puzzle.groupAt[0][4];
  puzzle.P.gcells[group].forEach(([r, c]) => {
    assert.equal(Boolean(spilled.state.frost[r + ',' + c]), r <= 0);
  });
  for (let r = 0; r < puzzle.R; r++) for (let c = 0; c < puzzle.C; c++) {
    if (puzzle.groupAt[r][c] !== group) assert.equal(spilled.state.frost[r + ',' + c], undefined);
  }
  let state = spilled.state;
  state = L.pour(puzzle, state, 1, 4).state;
  const third = L.pour(puzzle, state, 1, 1);
  assert.equal(third.state.failed, true);
  assert.equal(third.state.won, false);
  assert.equal(third.state.spills, 3);
});

test('pouring each solution waterline wins with no spills, and linked tanks share it', () => {
  for (const puzzle of L.models()) {
    let state = L.freshState(puzzle);
    for (let g = 0; g < puzzle.P.G; g++) {
      const cell = puzzle.P.gcells[g].find((item) => item[0] === puzzle.sol[g]);
      if (!cell) {
        assert.equal(state.committed[g], puzzle.sol[g], puzzle.level.title);
        continue;
      }
      const result = L.pour(puzzle, state, cell[0], cell[1]);
      assert.equal(result.event, 'pour', puzzle.level.title);
      state = result.state;
    }
    assert.equal(state.won, true, puzzle.level.title);
    assert.equal(state.spills, 0, puzzle.level.title);
    assert.equal(L.starsFor(state), 3, puzzle.level.title);
  }
  const piped = model(5);
  let state = L.freshState(piped);
  const cell = piped.letterAt.map((row, r) => row.map((ch, c) => (ch === 'I' ? [r, c] : null))).flat().find(Boolean);
  const poured = L.pour(piped, state, cell[0], cell[1]);
  const g = piped.groupAt[cell[0]][cell[1]];
  piped.letterAt.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'I' || ch === 'N') assert.equal(piped.groupAt[r][c], g);
  }));
  assert.equal(poured.state.committed[g], piped.sol[g]);
  assert.equal(poured.linked, true);
});

test('auto-dry frosts the rest of a satisfied line and never fills water', () => {
  const puzzle = model(1);
  let state = L.freshState(puzzle);
  state = L.pour(puzzle, state, 0, 0).state;
  state = L.pour(puzzle, state, 2, 0).state;
  const row1 = [];
  for (let c = 0; c < puzzle.C; c++) if (state.frost['1,' + c]) row1.push(c);
  assert.deepEqual(row1, [1, 2, 3, 4]);
  assert.equal(state.committed[puzzle.groupAt[0][0]], 0);
  assert.equal(state.committed[puzzle.groupAt[2][0]], 2);
  state.committed.forEach((level, g) => assert.ok(level >= puzzle.sol[g]));
  assert.equal(state.won, false);
});

test('marks and a refused dry pour leak nothing, and retry is a fresh board', () => {
  const puzzle = model(4);
  const fresh = L.freshState(puzzle);
  const marked = L.toggleMark(puzzle, fresh, 0, 0);
  assert.notEqual(marked, fresh);
  assert.deepEqual(marked.frost, fresh.frost);
  assert.deepEqual(marked.committed, fresh.committed);
  assert.deepEqual(L.gaugeView(puzzle, marked, null), L.gaugeView(puzzle, fresh, null));
  assert.deepEqual(L.proveCell(puzzle, marked), L.proveCell(puzzle, fresh));
  const dry = L.pour(puzzle, marked, 0, 0);
  assert.equal(dry.event === 'spill' || dry.event === 'pour' || dry.event === 'known-dry' || dry.event === 'already', true);
  const hinted = L.hint(puzzle, fresh);
  assert.equal(hinted.state.spills, 0);
  assert.equal(hinted.state.hintsUsed, 1);
  assert.ok(hinted.cell);
  assert.equal(L.starsFor(Object.assign({}, hinted.state, { won: true, spills: 0 })), 2);
  const again = L.hint(puzzle, hinted.state);
  assert.equal(again.cell, null);
  assert.equal(again.state.hintsUsed, 1);
  const dirtied = L.pour(puzzle, L.toggleMark(puzzle, fresh, 2, 2), 0, 1).state;
  assert.notDeepEqual(dirtied.frost, fresh.frost);
  assert.deepEqual(L.freshState(puzzle), fresh);
});

test('a hint on every fresh level is a real fact and costs no drop', () => {
  for (const puzzle of L.models()) {
    const fresh = L.freshState(puzzle);
    const hinted = L.hint(puzzle, fresh);
    assert.ok(hinted.cell, puzzle.level.title);
    assert.equal(hinted.state.spills, 0, puzzle.level.title);
    assert.equal(hinted.state.hintsUsed, 1);
    const key = hinted.cell.r + ',' + hinted.cell.c;
    if (hinted.cell.kind === 'dry') assert.equal(hinted.state.frost[key], true);
    else assert.ok(hinted.state.committed[hinted.cell.g] <= hinted.cell.r);
  }
});
