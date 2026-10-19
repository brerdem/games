(function (root) {
  // Order rule: a pin that escapes opens a gap on its own ring at base sector
  // (sector - 1) mod 12, and that ring kicks forward one sector for free.
  // A gap alone cannot raise the remaining minimum, so the kick is what makes
  // a clear shot able to shut another lane. Outermost colored pins leave a
  // same-color gate in the new hole. State is rotations plus the pins still
  // mounted, which keeps the solver on (rot, remaining pins).
  var SECTORS = 12;

  function mod(n, m) {
    m = m || SECTORS;
    return ((n % m) + m) % m;
  }

  function gateAt(ring, base) {
    if (!ring.gates) return null;
    return ring.gates[base] != null ? ring.gates[base] : ring.gates[String(base)] || null;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function rng() {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gapsFor(level, pins) {
    var alive = {};
    for (var i = 0; i < pins.length; i++) alive[pins[i].id] = true;
    return level.rings.map(function (ring, index) {
      var gaps = ring.gaps.slice();
      for (var p = 0; p < level.pins.length; p++) {
        var pin = level.pins[p];
        if (pin.ring === index && !alive[pin.id]) {
          var hole = mod(pin.sector - 1);
          if (gaps.indexOf(hole) < 0) gaps.push(hole);
        }
      }
      return gaps;
    });
  }

  function gatesFor(level, pins) {
    var outer = level.rings.length - 1;
    var gates = Object.assign({}, level.rings[outer].gates || {});
    var alive = {};
    for (var i = 0; i < pins.length; i++) alive[pins[i].id] = true;
    for (var p = 0; p < level.pins.length; p++) {
      var pin = level.pins[p];
      if (pin.ring === outer && !alive[pin.id] && pin.color && pin.color !== 'neutral') {
        gates[mod(pin.sector - 1)] = pin.color;
      }
    }
    return gates;
  }

  function launchResult(level, state, pin) {
    var visual = mod(pin.sector + state.rot[pin.ring]);
    var gaps = state.gaps || gapsFor(level, state.pins);
    var gates = state.gates || gatesFor(level, state.pins);
    for (var i = pin.ring + 1; i < level.rings.length; i++) {
      var occupant = null;
      for (var p = 0; p < state.pins.length; p++) {
        var other = state.pins[p];
        if (other.ring === i && mod(other.sector + state.rot[i]) === visual) occupant = other;
      }
      if (occupant) return { ok: false, ring: i, reason: 'pin', visual: visual };
      var base = mod(visual - state.rot[i]);
      if (gaps[i].indexOf(base) < 0) return { ok: false, ring: i, reason: 'wall', visual: visual };
      if (i === level.rings.length - 1) {
        var gate = gates[base] != null ? gates[base] : gates[String(base)] || null;
        if (gate && (pin.color || 'neutral') !== gate) return { ok: false, ring: i, reason: 'gate', visual: visual };
      }
    }
    return { ok: true, visual: visual };
  }

  function freshState(level, score) {
    return {
      rot: level.rot.map(function (value) { return mod(value); }),
      pins: level.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color || 'neutral' }; }),
      moves: level.moves,
      hearts: 3,
      score: score || 0,
      combo: 0,
      movesUsed: 0,
      heartsLost: 0,
    };
  }

  function withMeta(state) {
    state.gaps = gapsFor(arguments[1] || state._level, state.pins);
    return state;
  }

  function settle(level, state) {
    var end = null;
    if (state.hearts <= 0) end = 'hearts';
    else if (!state.pins.length) end = 'win';
    else if (state.moves <= 0 && !state.pins.some(function (pin) { return launchResult(level, state, pin).ok; })) end = 'moves';
    state.end = end;
    state.gaps = gapsFor(level, state.pins);
    state.gates = gatesFor(level, state.pins);
    return state;
  }

  function applyAction(level, state, action) {
    var next = {
      rot: state.rot.slice(),
      pins: state.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color }; }),
      moves: state.moves,
      hearts: state.hearts,
      score: state.score,
      combo: state.combo,
      movesUsed: state.movesUsed || 0,
      heartsLost: state.heartsLost || 0,
    };
    if (action.type === 'rot') {
      if (next.moves <= 0) {
        next.rejected = true;
        next.end = state.end || null;
        return next;
      }
      next.rot[action.ring] = mod(next.rot[action.ring] + action.dir);
      next.moves -= 1;
      next.movesUsed += 1;
      next.combo = 0;
      return settle(level, next);
    }
    var pin = null;
    for (var i = 0; i < next.pins.length; i++) if (next.pins[i].id === action.id) pin = next.pins[i];
    if (!pin) {
      next.rejected = true;
      next.end = state.end || null;
      return next;
    }
    var result = launchResult(level, next, pin);
    next.result = result;
    if (!result.ok) {
      next.hearts -= 1;
      next.heartsLost += 1;
      next.combo = 0;
      return settle(level, next);
    }
    next.pins = next.pins.filter(function (item) { return item.id !== pin.id; });
    next.rot[pin.ring] = mod(next.rot[pin.ring] + 1);
    var combo = next.combo + 1;
    next.combo = combo;
    next.score += 100 + (combo > 1 ? 50 * (combo - 1) : 0);
    return settle(level, next);
  }

  function keyOf(state) {
    var ids = state.pins.map(function (pin) { return pin.id; }).sort(function (a, b) { return a - b; });
    return state.rot.join(',') + '|' + ids.join(',');
  }

  function solveFrom(level, state) {
    var start = {
      rot: state.rot.slice(),
      pins: state.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color }; }),
      moves: state.moves,
      hearts: 99,
      score: 0,
      combo: 0,
      movesUsed: 0,
      heartsLost: 0,
    };
    var seen = {};
    seen[keyOf(start)] = true;
    var queue = [{ state: start, actions: [] }];
    var guard = 0;
    while (queue.length && guard++ < 400000) {
      var node = queue.shift();
      if (!node.state.pins.length) return node.actions;
      for (var p = 0; p < node.state.pins.length; p++) {
        var pin = node.state.pins[p];
        if (!launchResult(level, node.state, pin).ok) continue;
        var launched = applyAction(level, node.state, { type: 'launch', id: pin.id });
        if (launched.rejected) continue;
        var stamp = keyOf(launched);
        if (seen[stamp]) continue;
        seen[stamp] = true;
        var actions = node.actions.concat([{ type: 'launch', id: pin.id }]);
        if (!launched.pins.length) return actions;
        queue.push({ state: launched, actions: actions });
      }
      if (node.state.moves <= 0) continue;
      for (var ring = 0; ring < level.rings.length; ring++) {
        for (var d = 0; d < 2; d++) {
          var dir = d === 0 ? 1 : -1;
          var turned = applyAction(level, node.state, { type: 'rot', ring: ring, dir: dir });
          var stamp2 = keyOf(turned);
          if (seen[stamp2]) continue;
          seen[stamp2] = true;
          queue.push({ state: turned, actions: node.actions.concat([{ type: 'rot', ring: ring, dir: dir }]) });
        }
      }
    }
    return null;
  }

  function rotationCount(actions) {
    var n = 0;
    for (var i = 0; i < actions.length; i++) if (actions[i].type === 'rot') n += 1;
    return n;
  }

  function cheapestOpen(level, state) {
    if (state.pins.some(function (pin) { return launchResult(level, state, pin).ok; })) return [];
    var seen = {};
    seen[keyOf(state)] = true;
    var queue = [{ state: state, actions: [] }];
    var guard = 0;
    while (queue.length && guard++ < 20000) {
      var node = queue.shift();
      if (node.actions.length && node.state.pins.some(function (pin) { return launchResult(level, node.state, pin).ok; })) return node.actions;
      if (node.state.moves - node.actions.length <= 0) continue;
      for (var ring = 0; ring < level.rings.length; ring++) {
        for (var d = 0; d < 2; d++) {
          var dir = d === 0 ? 1 : -1;
          var turned = applyAction(level, node.state, { type: 'rot', ring: ring, dir: dir });
          var stamp = keyOf(turned);
          if (seen[stamp]) continue;
          seen[stamp] = true;
          queue.push({ state: turned, actions: node.actions.concat([{ type: 'rot', ring: ring, dir: dir }]) });
        }
      }
    }
    return null;
  }

  function greedy(level) {
    var state = freshState(level);
    var guard = 0;
    while (state.pins.length && guard++ < 80) {
      var clear = state.pins.filter(function (pin) { return launchResult(level, state, pin).ok; });
      if (clear.length) {
        clear.sort(function (a, b) { return b.ring - a.ring || a.id - b.id; });
        state = applyAction(level, state, { type: 'launch', id: clear[0].id });
        if (state.end === 'hearts' || state.end === 'moves') return false;
        continue;
      }
      var opening = cheapestOpen(level, state);
      if (!opening || !opening.length) return false;
      for (var i = 0; i < opening.length; i++) {
        state = applyAction(level, state, opening[i]);
        if (state.end === 'moves' || state.end === 'hearts') return false;
      }
    }
    return state.pins.length === 0;
  }

  function clonePlay(state, moves) {
    return {
      rot: state.rot.slice(),
      pins: state.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color }; }),
      moves: moves,
      hearts: 99,
      score: 0,
      combo: 0,
      movesUsed: 0,
      heartsLost: 0,
    };
  }

  function solve(level, from) {
    var start = from ? {
      rot: from.rot.slice(),
      pins: from.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color }; }),
      moves: from.moves,
      hearts: 99,
      score: 0,
      combo: 0,
      movesUsed: 0,
      heartsLost: 0,
    } : freshState(level);
    var budget = start.moves;
    var best = {};
    var parent = {};
    var sk = keyOf(start);
    best[sk] = 0;
    parent[sk] = null;
    var deque = [start];
    var head = 0;
    var win = null;
    var guard = 0;
    while (head < deque.length && guard++ < 800000) {
      var state = deque[head++];
      var here = keyOf(state);
      var base = state.movesUsed || 0;
      if (best[here] !== base) continue;
      if (!state.pins.length) { win = here; break; }
      for (var p = 0; p < state.pins.length; p++) {
        if (!launchResult(level, state, state.pins[p]).ok) continue;
        var launched = applyAction(level, state, { type: 'launch', id: state.pins[p].id });
        var stamp = keyOf(launched);
        if (best[stamp] == null || base < best[stamp]) {
          best[stamp] = base;
          launched.movesUsed = base;
          parent[stamp] = { prev: here, action: { type: 'launch', id: state.pins[p].id } };
          deque.splice(head, 0, launched);
        }
      }
      if (base >= budget) continue;
      for (var ring = 0; ring < level.rings.length; ring++) {
        for (var d = 0; d < 2; d++) {
          var dir = d === 0 ? 1 : -1;
          var turned = applyAction(level, state, { type: 'rot', ring: ring, dir: dir });
          var stamp2 = keyOf(turned);
          var nd = base + 1;
          if (best[stamp2] == null || nd < best[stamp2]) {
            best[stamp2] = nd;
            turned.movesUsed = nd;
            parent[stamp2] = { prev: here, action: { type: 'rot', ring: ring, dir: dir } };
            deque.push(turned);
          }
        }
      }
    }
    if (!win) return null;
    var actions = [];
    var cursor = win;
    while (parent[cursor]) {
      actions.push(parent[cursor].action);
      cursor = parent[cursor].prev;
    }
    actions.reverse();
    return actions;
  }

  function analyze(level) {
    var start = clonePlay(freshState(level), 99);
    var states = {};
    var succ = {};
    var rev = {};
    var q = [start];
    var head = 0;
    states[keyOf(start)] = start;
    var guard = 0;
    function link(from, to, cost) {
      var edge = { to: to, cost: cost };
      succ[from].push(edge);
      if (!rev[to]) rev[to] = [];
      rev[to].push({ to: from, cost: cost });
    }
    while (head < q.length && guard++ < 900000) {
      var state = q[head++];
      var here = keyOf(state);
      if (succ[here]) continue;
      succ[here] = [];
      if (!state.pins.length) continue;
      for (var p = 0; p < state.pins.length; p++) {
        if (!launchResult(level, state, state.pins[p]).ok) continue;
        var launched = applyAction(level, state, { type: 'launch', id: state.pins[p].id });
        var stamp = keyOf(launched);
        link(here, stamp, 0);
        if (!states[stamp]) { states[stamp] = launched; q.push(launched); }
      }
      for (var ring = 0; ring < level.rings.length; ring++) {
        for (var d = 0; d < 2; d++) {
          var dir = d === 0 ? 1 : -1;
          var turned = applyAction(level, state, { type: 'rot', ring: ring, dir: dir });
          var stamp2 = keyOf(turned);
          link(here, stamp2, 1);
          if (!states[stamp2]) { states[stamp2] = turned; q.push(turned); }
        }
      }
    }
    var remain = {};
    var front = [];
    var back = [];
    function pushFront(item) { front.push(item); }
    function pushBack(item) { back.push(item); }
    function popFront() {
      if (!front.length) {
        front = back;
        front.reverse();
        back = [];
      }
      return front.pop();
    }
    var keys = Object.keys(states);
    var pending = 0;
    for (var i = 0; i < keys.length; i++) {
      if (!states[keys[i]].pins.length) {
        remain[keys[i]] = 0;
        pushBack(keys[i]);
        pending += 1;
      }
    }
    while (pending) {
      var key = popFront();
      pending -= 1;
      if (key == null) break;
      var base = remain[key];
      var incoming = rev[key] || [];
      for (var e = 0; e < incoming.length; e++) {
        var pred = incoming[e].to;
        var nd = base + incoming[e].cost;
        if (remain[pred] == null || nd < remain[pred]) {
          remain[pred] = nd;
          if (incoming[e].cost === 0) pushFront(pred);
          else pushBack(pred);
          pending += 1;
        }
      }
    }
    var startKey = keyOf(start);
    var trap = false;
    for (var t = 0; t < keys.length && !trap; t++) {
      if (!states[keys[t]].pins.length) continue;
      var hereDist = remain[keys[t]];
      if (hereDist == null) continue;
      var edges3 = succ[keys[t]] || [];
      for (var j = 0; j < edges3.length; j++) {
        if (edges3[j].cost !== 0) continue;
        var nextDist = remain[edges3[j].to];
        if (nextDist != null && nextDist > hereDist) { trap = true; break; }
      }
    }
    return {
      par: remain[startKey] == null ? null : remain[startKey],
      trap: trap,
      states: keys.length,
      capped: guard >= 900000,
    };
  }

  function minRotations(level) {
    var info = analyze(level);
    return info.par;
  }

  function hasOrderTrap(level) {
    return analyze(level).trap;
  }

  function starsFor(level, state) {
    if (state.movesUsed <= level.par && state.heartsLost === 0) return 3;
    if (state.movesUsed <= level.par + 3 || state.heartsLost <= 1) return 2;
    return 1;
  }

  function randInt(rng, n) {
    return Math.floor(rng() * n);
  }

  function clearBonus(state) {
    return (state.moves || 0) * 50 + (state.hearts || 0) * 200;
  }

  function generateBoard(seed, spec) {
    if (!spec || !spec._attempt) {
      for (var attempt = 0; attempt < 36; attempt++) {
        var salt = (Math.imul(seed >>> 0, 1000) + Math.imul(attempt, 97)) >>> 0;
        var made = generateBoard(salt || 1, Object.assign({}, spec, { _attempt: 1, id: spec.id || 0 }));
        if (made) return made;
      }
      return null;
    }
    return generateOnce(seed, spec);
  }

  function generateOnce(seed, spec) {
    var rng = mulberry32(seed);
    var ringsN = spec.rings;
    var colors = ['coral', 'teal', 'gold'];
    var colorN = spec.colors || 1;
    var rings = [];
    for (var i = 0; i < ringsN; i++) {
      var gapCount = 1 + randInt(rng, 2);
      if (i === ringsN - 1 && colorN > 1) gapCount = Math.max(gapCount, Math.min(3, colorN));
      var gaps = [];
      while (gaps.length < gapCount) {
        var g = randInt(rng, SECTORS);
        if (gaps.indexOf(g) < 0) gaps.push(g);
      }
      var gates = null;
      if (i === ringsN - 1 && colorN > 1) {
        gates = {};
        for (var c = 0; c < gaps.length && c < colorN; c++) gates[gaps[c]] = colors[c];
      }
      rings.push({ gaps: gaps, gates: gates });
    }
    var level = { rings: rings, pins: [], rot: [], moves: 40, par: 0, id: spec.id || 0 };
    for (var r = 0; r < ringsN; r++) level.rot.push(randInt(rng, SECTORS));
    var state = freshState(level);
    var solution = [];
    for (var n = 0; n < spec.pins; n++) {
      var placed = null;
      for (var attempt = 0; attempt < 80 && !placed; attempt++) {
        var ringIndex = spec.outerPin && n === 0 ? ringsN - 1 : randInt(rng, ringsN);
        var sector = randInt(rng, SECTORS);
        if (rings[ringIndex].gaps.indexOf(sector) >= 0) continue;
        if (level.pins.some(function (pin) { return pin.ring === ringIndex && pin.sector === sector; })) continue;
        var color = colorN === 1 ? 'neutral' : colors[randInt(rng, colorN)];
        var candidate = { id: level.pins.length + 1, ring: ringIndex, sector: sector, color: color };
        level.pins.push(candidate);
        var undone = {
          rot: state.rot.slice(),
          pins: state.pins.concat([{ id: candidate.id, ring: candidate.ring, sector: candidate.sector, color: candidate.color }]),
          moves: 40,
          hearts: 9,
          score: 0,
          combo: 0,
          movesUsed: 0,
          heartsLost: 0,
        };
        undone.rot[ringIndex] = mod(undone.rot[ringIndex] - 1);
        if (launchResult(level, undone, candidate).ok) {
          placed = candidate;
          state = undone;
          solution.unshift({ type: 'launch', id: candidate.id });
        } else {
          level.pins.pop();
        }
      }
      if (!placed) return null;
      var spins = randInt(rng, 3);
      for (var s = 0; s < spins; s++) {
        var ring = randInt(rng, ringsN);
        var dir = rng() < 0.5 ? 1 : -1;
        state = applyAction(level, state, { type: 'rot', ring: ring, dir: dir });
        solution.unshift({ type: 'rot', ring: ring, dir: -dir });
      }
    }
    level.rot = state.rot.slice();
    level.pins = state.pins.map(function (pin) { return { id: pin.id, ring: pin.ring, sector: pin.sector, color: pin.color }; });
    if (!level.pins.length) return null;
    if (level.pins.every(function (pin) { return launchResult(level, freshState(level), pin).ok; })) return null;
    var replay = freshState(level);
    for (var a = 0; a < solution.length; a++) {
      replay = applyAction(level, replay, solution[a]);
      if (replay.rejected || replay.end === 'hearts' || replay.end === 'moves') return null;
    }
    if (replay.pins.length) return null;
    var par = rotationCount(solution);
    var slack = spec.slack == null ? 1 : spec.slack;
    level.par = par;
    level.moves = par + slack;
    level.solution = solution;
    return level;
  }

  root.RingLogic = {
    SECTORS: SECTORS,
    mod: mod,
    gateAt: gateAt,
    mulberry32: mulberry32,
    gapsFor: gapsFor,
    gatesFor: gatesFor,
    launchResult: launchResult,
    freshState: freshState,
    applyAction: applyAction,
    solveFrom: solveFrom,
    solve: solve,
    analyze: analyze,
    rotationCount: rotationCount,
    greedy: greedy,
    hasOrderTrap: hasOrderTrap,
    minRotations: minRotations,
    starsFor: starsFor,
    clearBonus: clearBonus,
    SECTOR: Math.PI * 2 / SECTORS,
    generateBoard: generateBoard,
    LEVELS: [{"rings":[{"gaps":[2],"gates":null},{"gaps":[9,1],"gates":null}],"pins":[{"id":1,"ring":0,"sector":6,"color":"neutral"},{"id":2,"ring":1,"sector":3,"color":"neutral"}],"rot":[3,10],"moves":4,"par":1,"id":1},{"rings":[{"gaps":[1,11],"gates":null},{"gaps":[2,9],"gates":null}],"pins":[{"id":1,"ring":0,"sector":7,"color":"neutral"},{"id":2,"ring":1,"sector":10,"color":"neutral"}],"rot":[5,0],"moves":4,"par":2,"id":2},{"rings":[{"gaps":[0,6],"gates":null},{"gaps":[4],"gates":null},{"gaps":[2,10],"gates":null}],"pins":[{"id":1,"ring":2,"sector":4,"color":"neutral"},{"id":2,"ring":1,"sector":1,"color":"neutral"},{"id":3,"ring":2,"sector":9,"color":"neutral"}],"rot":[0,4,6],"moves":2,"par":0,"id":3},{"rings":[{"gaps":[9],"gates":null},{"gaps":[8],"gates":null},{"gaps":[0,4],"gates":null}],"pins":[{"id":1,"ring":2,"sector":2,"color":"neutral"},{"id":2,"ring":2,"sector":3,"color":"neutral"},{"id":3,"ring":1,"sector":3,"color":"neutral"},{"id":4,"ring":2,"sector":10,"color":"neutral"}],"rot":[4,10,0],"moves":2,"par":0,"id":4},{"rings":[{"gaps":[11,2],"gates":null},{"gaps":[5],"gates":null},{"gaps":[2,5],"gates":null}],"pins":[{"id":1,"ring":1,"sector":8,"color":"neutral"},{"id":2,"ring":2,"sector":11,"color":"neutral"},{"id":3,"ring":2,"sector":1,"color":"neutral"},{"id":4,"ring":2,"sector":3,"color":"neutral"}],"rot":[1,11,1],"moves":0,"par":0,"id":5},{"rings":[{"gaps":[6,7],"gates":null},{"gaps":[1,8],"gates":null},{"gaps":[8,7],"gates":null}],"pins":[{"id":1,"ring":2,"sector":11,"color":"neutral"},{"id":2,"ring":1,"sector":0,"color":"neutral"},{"id":3,"ring":2,"sector":2,"color":"neutral"},{"id":4,"ring":2,"sector":10,"color":"neutral"}],"rot":[11,4,7],"moves":0,"par":0,"id":6},{"rings":[{"gaps":[3,9],"gates":null},{"gaps":[9],"gates":null},{"gaps":[6,11],"gates":null}],"pins":[{"id":1,"ring":2,"sector":2,"color":"neutral"},{"id":2,"ring":2,"sector":10,"color":"neutral"},{"id":3,"ring":1,"sector":6,"color":"neutral"},{"id":4,"ring":2,"sector":1,"color":"neutral"}],"rot":[1,5,4],"moves":1,"par":0,"id":7},{"rings":[{"gaps":[6],"gates":null},{"gaps":[11,0],"gates":null},{"gaps":[0,10],"gates":{"0":"coral","10":"teal"}}],"pins":[{"id":1,"ring":2,"sector":5,"color":"teal"},{"id":2,"ring":2,"sector":7,"color":"coral"},{"id":3,"ring":1,"sector":10,"color":"coral"},{"id":4,"ring":2,"sector":4,"color":"teal"}],"rot":[4,5,2],"moves":1,"par":0,"id":8},{"rings":[{"gaps":[1],"gates":null},{"gaps":[8],"gates":null},{"gaps":[11,4],"gates":{"4":"teal","11":"coral"}}],"pins":[{"id":1,"ring":2,"sector":8,"color":"teal"},{"id":2,"ring":2,"sector":1,"color":"teal"},{"id":3,"ring":2,"sector":5,"color":"coral"},{"id":4,"ring":1,"sector":0,"color":"teal"}],"rot":[3,6,0],"moves":1,"par":0,"id":9},{"rings":[{"gaps":[9],"gates":null},{"gaps":[8],"gates":null},{"gaps":[8,9],"gates":{"8":"coral","9":"teal"}}],"pins":[{"id":1,"ring":2,"sector":5,"color":"coral"},{"id":2,"ring":2,"sector":2,"color":"teal"},{"id":3,"ring":1,"sector":7,"color":"teal"},{"id":4,"ring":2,"sector":10,"color":"teal"}],"rot":[8,5,2],"moves":0,"par":0,"id":10},{"rings":[{"gaps":[0,2],"gates":null},{"gaps":[5],"gates":null},{"gaps":[4],"gates":null},{"gaps":[1,8,0],"gates":{"0":"gold","1":"coral","8":"teal"}}],"pins":[{"id":1,"ring":3,"sector":6,"color":"coral"},{"id":2,"ring":2,"sector":11,"color":"gold"},{"id":3,"ring":2,"sector":0,"color":"gold"},{"id":4,"ring":3,"sector":10,"color":"teal"}],"rot":[9,4,2,2],"moves":1,"par":0,"id":11},{"rings":[{"gaps":[4,3],"gates":null},{"gaps":[8,5],"gates":null},{"gaps":[4],"gates":null},{"gaps":[3,4,0],"gates":{"0":"gold","3":"coral","4":"teal"}}],"pins":[{"id":1,"ring":3,"sector":5,"color":"teal"},{"id":2,"ring":2,"sector":5,"color":"coral"},{"id":3,"ring":3,"sector":2,"color":"teal"},{"id":4,"ring":3,"sector":8,"color":"gold"}],"rot":[11,2,4,4],"moves":1,"par":0,"id":12}],
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
