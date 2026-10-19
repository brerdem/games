import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const L = sandbox.TopLogic;

const AIMS = Array.from({ length: 12 }, (_, i) => -Math.PI / 2 + (i - 5.5) * 0.12);
const PULLS = [60, 100, 140, 160];

function rate(radii, fight) {
  let wins = 0;
  let n = 0;
  const rows = [];
  for (const aim of AIMS) {
    for (const pull of PULLS) {
      const result = L.fightSim(radii, fight, aim, pull, 21 + fight);
      rows.push(result);
      n += 1;
      if (result.won) wins += 1;
    }
  }
  return { wins, n, rows };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

test('blank loses the later fights and a heavy carve beats every opponent', () => {
  const blank = rate(L.blank(), 1);
  const blankF3 = rate(L.blank(), 2);
  const heavy = L.shaped(0.5, 0.98, 0.8);
  const heavyRates = [0, 1, 2].map((fight) => rate(heavy, fight));
  const pool = [...rate(L.blank(), 0).rows, ...blank.rows, ...blankF3.rows, ...heavyRates.flatMap((item) => item.rows)];
  const time = median(pool.map((row) => row.time));
  const hits = median(pool.map((row) => row.hits));
  assert.ok(blank.wins / blank.n <= 0.5, `F2 blank ${blank.wins}/${blank.n}`);
  assert.ok(blankF3.wins / blankF3.n <= 0.3, `F3 blank ${blankF3.wins}/${blankF3.n}`);
  heavyRates.forEach((item, fight) => {
    assert.ok(item.wins / item.n >= 0.7, `heavy F${fight + 1} ${item.wins}/${item.n}`);
  });
  assert.ok(time >= 8, `median ${time}`);
  assert.ok(hits >= 3, `hits ${hits}`);
  console.log(JSON.stringify({
    blankF2: `${blank.wins}/${blank.n}`,
    blankF3: `${blankF3.wins}/${blankF3.n}`,
    heavy: heavyRates.map((item) => `${item.wins}/${item.n}`),
    medianSeconds: Number(time.toFixed(2)),
    medianHits: hits,
  }));
});

test('a script can spin out and go over the edge', () => {
  const thin = Array.from({ length: 32 }, () => 0.08);
  const spun = L.fightSim(thin, 0, Math.PI / 2, 160, 2);
  assert.equal(spun.won, false);
  assert.equal(spun.reason, 'spin');
  const top = L.designTop(L.blank(), 'You', '#fff', 0, L.ARENA - 20);
  top.vy = 220;
  top.w = 0.8;
  L.stepTop(top, 0.05, L.makeRng(1));
  assert.equal(top.out, 'edge');
});
