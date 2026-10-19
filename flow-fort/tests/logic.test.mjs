import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { console, Math, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../logic.js', import.meta.url), 'utf8'), sandbox);
const L = sandbox.FlowLogic;

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

test('breach frame never clears the level', () => {
  const result = L.breachRepro();
  assert.notEqual(result.end, 'win');
  assert.notEqual(result.end, 'cleared-on-breach');
  assert.equal(result.blue, true);
  assert.ok(result.cells > 0);
  assert.ok(result.hearts < 3);
});

test('lazy strategies lose on L3+ and greedy holds the timed line', () => {
  const late = L.LEVELS.filter((level) => level.id >= 3);
  let spamLoss = 0;
  let randomLoss = 0;
  let randomN = 0;
  let jam = 0;
  let empty = 0;
  const careful = [];
  let greedyWins = 0;
  const hurt = [];
  for (const level of L.LEVELS) {
    const calm = L.simulate(level, { policy: 'greedy', calm: true, reaction: 0, limit: 240 });
    assert.equal(calm.end, 'win', `calm L${level.id}`);
    const timed = L.simulate(level, { policy: 'greedy', reaction: 1, limit: 300 });
    if (timed.end === 'win') greedyWins += 1;
    const slow = L.simulate(level, { policy: 'greedy', reaction: 1.5, limit: 320 });
    if (level.id <= 2) assert.equal(slow.end, 'win', `1.5s L${level.id}`);
    if (level.id >= 5) hurt.push(slow.heartsLost >= 1);
    if (level.id < 3) continue;
    const care = L.simulate(level, { policy: 'greedy', reaction: 0.8, limit: 300 });
    assert.equal(care.end, 'win', `careful L${level.id}`);
    careful.push(care.time);
    const spam = L.simulate(level, { policy: 'spam', reaction: 0.35, limit: 180 });
    if (spam.end !== 'win') spamLoss += 1;
    const seeds = level.id === 8 ? 90 : 16;
    for (let seed = 1; seed <= seeds; seed++) {
      const result = L.simulate(level, {
        policy: 'random',
        reaction: level.id === 8 ? 0.2 : 0.35,
        seed,
        limit: level.id === 8 ? 200 : 160,
      });
      randomN += 1;
      if (result.end !== 'win') randomLoss += 1;
      if (result.end === 'jam') jam += 1;
      if (result.end === 'empty') empty += 1;
    }
  }
  assert.ok(spamLoss / late.length >= 0.5, `spam ${spamLoss}/${late.length}`);
  assert.ok(randomLoss / randomN >= 0.5, `random ${randomLoss}/${randomN}`);
  assert.ok(jam >= 1, 'JAMMED');
  assert.ok(empty >= 1, 'OUT OF GUNNERS');
  assert.ok(median(careful) >= 60, `median ${median(careful)}`);
  assert.ok(greedyWins / L.LEVELS.length >= 0.9);
  assert.ok(hurt.filter(Boolean).length / hurt.length >= 0.3);
  console.log(JSON.stringify({
    spam: `${spamLoss}/${late.length}`,
    random: `${randomLoss}/${randomN}`,
    jam,
    empty,
    medianCareful: Number(median(careful).toFixed(1)),
    greedy1s: `${greedyWins}/${L.LEVELS.length}`,
    heartLoss15: `${hurt.filter(Boolean).length}/${hurt.length}`,
  }));
});
