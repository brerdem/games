export function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      return Math.floor(this.next() * n);
    },
    state() {
      return a >>> 0;
    },
    set(n) {
      a = n >>> 0;
    },
  };
}

export const TICKETS = {
  rusty: {
    name: 'Rusty Ticket',
    cells: [
      ['sword', 1, 2], ['sword', 1, 2], ['sword', 1, 2],
      ['shield', 1, 2], ['shield', 1, 2],
      ['coin', 1, 3], ['heart', 1, 1],
      ['skull', 1, 1], ['skull', 1, 1],
    ],
  },
  guard: {
    name: 'Guard Ticket',
    cells: [
      ['shield', 2, 3], ['shield', 2, 3], ['shield', 2, 3], ['shield', 2, 3],
      ['sword', 1, 1], ['heart', 2, 2], ['coin', 2, 2],
      ['skull', 1, 1], ['skull', 1, 1],
    ],
  },
  lucky: {
    name: 'Lucky Ticket',
    cells: [
      ['star', 0, 0],
      ['sword', 2, 3], ['sword', 2, 3],
      ['shield', 2, 2],
      ['coin', 3, 3], ['coin', 3, 3],
      ['skull', 1, 1], ['skull', 1, 1], ['skull', 1, 1],
    ],
  },
  blade: {
    name: 'Blade Ticket',
    cells: [
      ['sword', 2, 4], ['sword', 2, 4], ['sword', 2, 4], ['sword', 2, 4], ['sword', 2, 4],
      ['star', 0, 0],
      ['skull', 1, 1], ['skull', 1, 1], ['skull', 1, 1],
    ],
  },
};

export const FIGHTS = [
  {
    name: 'Rat',
    hp: 16,
    pattern: [
      { kind: 'attack', n: 4, label: 'Attack 4' },
      { kind: 'attack', n: 4, label: 'Attack 4' },
      { kind: 'defend', n: 3, label: 'Defend 3' },
    ],
  },
  {
    name: 'Skeleton',
    hp: 24,
    pattern: [
      { kind: 'attack', n: 6, label: 'Attack 6' },
      { kind: 'curse', n: 1, label: 'Curse' },
      { kind: 'attack', n: 5, label: 'Attack 5' },
    ],
  },
  {
    name: 'Lich',
    hp: 34,
    pattern: [
      { kind: 'attack', n: 8, label: 'Attack 8' },
      { kind: 'attack', n: 4, times: 2, label: 'Attack 4 ×2' },
      { kind: 'defend', n: 6, label: 'Defend 6' },
      { kind: 'curse', n: 1, label: 'Curse' },
    ],
  },
];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function freshDeck() {
  return ['rusty', 'rusty', 'rusty', 'rusty', 'guard', 'lucky'];
}

function rollCard(typeId, rng, curse) {
  const type = TICKETS[typeId];
  const cells = type.cells.map(([kind, lo, hi]) => ({
    kind,
    n: kind === 'skull' || kind === 'star' ? 0 : lo + rng.int(hi - lo + 1),
    revealed: false,
  }));
  shuffle(cells, rng);
  if (curse > 0) {
    const pool = cells.map((cell, index) => ({ cell, index })).filter((item) => item.cell.kind !== 'skull');
    if (pool.length) {
      const pick = pool[rng.int(pool.length)];
      cells[pick.index] = { kind: 'skull', n: 0, revealed: false };
    }
  }
  return {
    type: typeId,
    name: type.name,
    cells,
    skulls: cells.filter((cell) => cell.kind === 'skull').length,
    pops: [],
  };
}

export function makeRun(seed) {
  const rng = makeRng(seed);
  const run = {
    seed: seed >>> 0,
    rng,
    fight: 0,
    hp: 30,
    maxHp: 30,
    block: 0,
    gold: 0,
    damageDealt: 0,
    charms: [],
    deck: freshDeck(),
    draw: [],
    discard: [],
    enemy: null,
    card: null,
    attackBonus: 0,
    curseNext: 0,
    rewards: [],
    phase: 'fight',
    floors: 0,
    snap: null,
  };
  beginFight(run);
  return run;
}

function beginFight(run) {
  const spec = FIGHTS[run.fight];
  run.draw = shuffle(run.deck.map((type) => type), run.rng);
  run.discard = [];
  run.enemy = {
    name: spec.name,
    hp: spec.hp,
    maxHp: spec.hp,
    pattern: spec.pattern,
    step: 0,
    intent: spec.pattern[0],
    block: 0,
  };
  run.card = null;
  run.attackBonus = 0;
  run.block = run.charms.includes('thick') ? 5 : 0;
  run.phase = 'fight';
  run.snap = snapshot(run);
  drawCard(run);
}

function snapshot(run) {
  return JSON.stringify({
    fight: run.fight,
    hp: run.hp,
    block: run.block,
    gold: run.gold,
    damageDealt: run.damageDealt,
    charms: run.charms,
    deck: run.deck,
    draw: run.draw,
    discard: run.discard,
    enemy: run.enemy,
    attackBonus: run.attackBonus,
    curseNext: run.curseNext,
    floors: run.floors,
    rng: run.rng.state(),
  });
}

export function restartFight(run) {
  if (!run.snap) return;
  const data = JSON.parse(run.snap);
  Object.assign(run, {
    fight: data.fight,
    hp: data.hp,
    block: data.block,
    gold: data.gold,
    damageDealt: data.damageDealt,
    charms: data.charms,
    deck: data.deck,
    draw: data.draw,
    discard: data.discard,
    enemy: data.enemy,
    attackBonus: data.attackBonus,
    curseNext: data.curseNext,
    floors: data.floors,
    card: null,
    rewards: [],
    phase: 'fight',
  });
  run.rng.set(data.rng);
  drawCard(run);
}

export function drawCard(run) {
  if (!run.draw.length) {
    run.draw = shuffle(run.discard, run.rng);
    run.discard = [];
  }
  const type = run.draw.pop();
  const curse = run.curseNext;
  run.curseNext = 0;
  run.card = rollCard(type, run.rng, curse);
  run.card.first = true;
  return run.card;
}

export function revealCell(run, index) {
  const card = run.card;
  if (!card || card.cells[index].revealed || run.phase !== 'fight') return { ok: false };
  let cell = card.cells[index];
  if (card.first && run.charms.includes('steady') && cell.kind === 'skull') {
    const swap = card.cells.findIndex((item, i) => i !== index && !item.revealed && item.kind !== 'skull');
    if (swap >= 0) {
      [card.cells[index], card.cells[swap]] = [card.cells[swap], card.cells[index]];
      cell = card.cells[index];
    }
  }
  card.first = false;
  cell.revealed = true;
  card.pops.push({ index, t: 0.16 });
  const skulls = card.cells.filter((item) => item.revealed && item.kind === 'skull').length;
  if (skulls >= 3) {
    run.discard.push(card.type);
    run.card = null;
    run.attackBonus += 2;
    enemyTurn(run);
    return { ok: true, bust: true };
  }
  return { ok: true, bust: false, cell };
}

function applyLineAndStar(cells) {
  const values = cells.map((cell) => ({ ...cell }));
  let used = false;
  for (const line of LINES) {
    if (used) break;
    const group = line.map((index) => values[index]);
    if (!group.every((cell) => cell.revealed)) continue;
    const kind = group[0].kind;
    if (!group.every((cell) => cell.kind === kind)) continue;
    if (!['sword', 'shield', 'heart', 'coin'].includes(kind)) continue;
    for (const index of line) values[index] = { ...values[index], n: values[index].n * 2, lined: true };
    used = true;
  }
  if (values.some((cell) => cell.revealed && cell.kind === 'star')) {
    let best = -1;
    let bestN = -1;
    values.forEach((cell, index) => {
      if (!cell.revealed || !['sword', 'shield', 'heart', 'coin'].includes(cell.kind)) return;
      if (cell.n > bestN) {
        bestN = cell.n;
        best = index;
      }
    });
    if (best >= 0) values[best] = { ...values[best], n: values[best].n * 2, starred: true };
  }
  return values;
}

export function cashIn(run) {
  const card = run.card;
  if (!card || run.phase !== 'fight') return null;
  const values = applyLineAndStar(card.cells);
  const breakdown = { sword: 0, shield: 0, heart: 0, coin: 0, skull: 0 };
  for (const cell of values) {
    if (!cell.revealed) continue;
    if (cell.kind === 'sword') breakdown.sword += cell.n;
    if (cell.kind === 'shield') breakdown.shield += cell.n;
    if (cell.kind === 'heart') breakdown.heart += cell.n;
    if (cell.kind === 'coin') breakdown.coin += cell.n;
    if (cell.kind === 'skull' && run.charms.includes('bone')) breakdown.skull += 1;
  }
  if (run.charms.includes('purse')) breakdown.sword += Math.floor(breakdown.coin / 2);
  const dealt = Math.max(0, breakdown.sword - run.enemy.block);
  run.enemy.block = Math.max(0, run.enemy.block - breakdown.sword);
  run.enemy.hp -= dealt;
  run.damageDealt += dealt;
  run.block += breakdown.shield;
  run.hp = Math.min(run.maxHp, run.hp + breakdown.heart);
  run.gold += breakdown.coin;
  run.discard.push(card.type);
  run.card = null;
  const summary = { ...breakdown, dealt, enemyHp: run.enemy.hp };
  if (run.enemy.hp <= 0) winFight(run);
  else enemyTurn(run);
  return summary;
}

function enemyTurn(run) {
  const enemy = run.enemy;
  const intent = enemy.intent;
  const times = intent.times || 1;
  if (intent.kind === 'attack') {
    for (let i = 0; i < times; i++) {
      const raw = intent.n + (i === 0 ? run.attackBonus : 0);
      const hit = Math.max(0, raw - run.block);
      run.block = Math.max(0, run.block - raw);
      run.hp -= hit;
    }
    run.attackBonus = 0;
  } else if (intent.kind === 'defend') {
    enemy.block += intent.n;
    run.attackBonus = 0;
  } else if (intent.kind === 'curse') {
    run.curseNext += intent.n || 1;
    run.attackBonus = 0;
  }
  run.block = 0;
  enemy.step += 1;
  enemy.intent = enemy.pattern[enemy.step % enemy.pattern.length];
  if (run.hp <= 0) {
    run.hp = 0;
    run.phase = 'over';
    return;
  }
  if (run.phase === 'fight') drawCard(run);
}

function winFight(run) {
  run.floors += 1;
  run.card = null;
  if (run.fight >= FIGHTS.length - 1) {
    run.phase = 'win';
    return;
  }
  run.rewards = buildRewards(run);
  run.phase = 'reward';
}

function buildRewards(run) {
  const options = [{ id: 'heal', label: 'Heal 8' }];
  if (!run.deck.includes('blade')) options.push({ id: 'blade', label: 'Blade Ticket' });
  else options.push({ id: 'guard', label: 'Guard Ticket' });
  if (!run.charms.includes('steady')) options.push({ id: 'steady', label: 'Steady Hand' });
  else if (!run.charms.includes('bone')) options.push({ id: 'bone', label: 'Bone Collector' });
  else options.push({ id: 'heal', label: 'Heal 8' });
  return options.slice(0, 3);
}

export function pickReward(run, index) {
  if (run.phase !== 'reward') return;
  const reward = run.rewards[index];
  if (!reward) return;
  if (reward.id === 'heal') run.hp = Math.min(run.maxHp, run.hp + 8);
  if (reward.id === 'blade' || reward.id === 'guard') run.deck.push(reward.id);
  if (reward.id === 'steady' || reward.id === 'bone') run.charms.push(reward.id);
  run.rewards = [];
  run.fight += 1;
  beginFight(run);
}

export function scoreOf(run) {
  return run.floors * 100 + run.damageDealt + run.gold + (run.phase === 'win' ? 500 : 0);
}

export function revealedSkulls(card) {
  if (!card) return 0;
  return card.cells.filter((cell) => cell.revealed && cell.kind === 'skull').length;
}
