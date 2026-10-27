(function (root) {
  var NAMES = ['First Pour', 'Bottom First', 'Rock On', 'Twin Tops', 'Tall Order', 'One Blue', 'Drip on Purpose', 'Rock Garden', 'Deep Layers', 'Grand Toast'];
  var PACK = root.FIZZ_PACK;

  function levels() {
    return PACK.map(function (row, index) {
      var glasses = row.glasses.slice().sort(function (a, b) {
        return a.r - b.r || a.c - b.c;
      });
      var keys = glasses.map(function (g) { return g.r + ',' + g.c; });
      var indexOf = {};
      keys.forEach(function (key, i) { indexOf[key] = i; });
      return {
        n: index + 1,
        name: NAMES[index] || row.name,
        glasses: glasses,
        keys: keys,
        indexOf: indexOf,
        cap: glasses.map(function (g) { return g.cap; }),
        rock: glasses.map(function (g) { return !!g.rocker; }),
        tilt0: glasses.map(function (g) { return g.tilt; }),
        target: glasses.map(function (g) { return g.target.slice(); }),
        bottles: row.bottles.map(function (b) { return { colour: b.colour, r: 0, c: b.entry_col }; }),
        par: row.stats.par,
        budget: row.stats.par + 2,
        expectStates: row.stats.states,
        lazy: {
          RAND: row.stats.RAND,
          GREEDY: row.stats.GREEDY,
          GREEDY2: row.stats.GREEDY2,
          FILLFIRST: row.stats.FILLFIRST
        },
        ref: row.reference_line
      };
    });
  }

  function start(level) {
    return {
      cont: level.glasses.map(function () { return []; }),
      tilt: level.tilt0.slice()
    };
  }

  function clone(state) {
    return {
      cont: state.cont.map(function (glass) { return glass.slice(); }),
      tilt: state.tilt.slice()
    };
  }

  function encode(state) {
    return state.cont.map(function (glass) { return glass.join('.'); }).join('|') + '#' + state.tilt.join('');
  }

  function won(level, state) {
    for (var i = 0; i < level.target.length; i++) {
      var glass = state.cont[i];
      var target = level.target[i];
      if (glass.length !== target.length) return false;
      for (var j = 0; j < target.length; j++) if (glass[j] !== target[j]) return false;
    }
    return true;
  }

  function score(level, state) {
    var total = 0;
    for (var i = 0; i < state.cont.length; i++) {
      var glass = state.cont[i];
      var target = level.target[i];
      for (var j = 0; j < glass.length; j++) {
        if (j < target.length && target[j] === glass[j]) total++;
      }
    }
    return total;
  }

  function pour(level, state, bottle) {
    var cont = state.cont.map(function (glass) { return glass.slice(); });
    var tilt = state.tilt.slice();
    var spec = level.bottles[bottle];
    var colour = spec.colour;
    var pos = spec.r + ',' + spec.c;
    var path = [];
    var events = [];
    while (true) {
      if (!Object.prototype.hasOwnProperty.call(level.indexOf, pos)) {
        events.push({ type: 'drip', colour: colour });
        return { state: { cont: cont, tilt: tilt }, kind: 'spill', path: path, events: events };
      }
      var i = level.indexOf[pos];
      path.push(i);
      if (cont[i].length < level.cap[i]) {
        cont[i].push(colour);
        events.push({ type: 'settle', glass: i, colour: colour });
        return { state: { cont: cont, tilt: tilt }, kind: 'land', path: path, events: events };
      }
      var out = cont[i][cont[i].length - 1];
      cont[i][cont[i].length - 1] = colour;
      var lean = tilt[i];
      var rocked = false;
      if (level.rock[i]) {
        tilt[i] = lean === 'L' ? 'R' : 'L';
        rocked = true;
      }
      var glass = level.glasses[i];
      var nextC = lean === 'L' ? glass.c : glass.c + 1;
      events.push({
        type: 'push', glass: i, colourIn: colour, colourOut: out, lean: lean, rock: rocked,
        toR: glass.r + 1, toC: nextC
      });
      colour = out;
      pos = (glass.r + 1) + ',' + nextC;
    }
  }

  function bottleFor(level, label) {
    var colour = label.slice(0, label.indexOf('@'));
    var col = +label.slice(label.indexOf('@') + 1);
    for (var i = 0; i < level.bottles.length; i++) {
      if (level.bottles[i].colour === colour && level.bottles[i].c === col) return i;
    }
    return -1;
  }

  function playRef(level) {
    var state = start(level);
    var trace = [];
    for (var s = 0; s < level.ref.length; s++) {
      var parts = level.ref[s].split(':');
      var bottle = bottleFor(level, parts[0]);
      var result = pour(level, state, bottle);
      var got = result.kind + result.path.length;
      trace.push({ step: level.ref[s], got: got, ok: got === parts[1] });
      state = result.state;
    }
    return { state: state, won: won(level, state), trace: trace };
  }

  function countUntilGoal(level) {
    var origin = start(level);
    var dist = new Map();
    var key = encode(origin);
    dist.set(key, 0);
    var queue = [{ state: origin, key: key }];
    var qi = 0;
    while (qi < queue.length) {
      var item = queue[qi++];
      var d = dist.get(item.key);
      if (won(level, item.state)) return { par: d, states: dist.size };
      for (var b = 0; b < level.bottles.length; b++) {
        var next = pour(level, item.state, b).state;
        var nk = encode(next);
        if (!dist.has(nk)) {
          dist.set(nk, d + 1);
          queue.push({ state: next, key: nk });
        }
      }
    }
    return { par: null, states: dist.size };
  }

  function graph(level) {
    if (level._graph) return level._graph;
    var origin = start(level);
    var states = new Map();
    var edges = new Map();
    var depthOf = new Map();
    var okey = encode(origin);
    states.set(okey, origin);
    depthOf.set(okey, 0);
    var queue = [okey];
    var qi = 0;
    var key;
    while (qi < queue.length) {
      key = queue[qi++];
      var d0 = depthOf.get(key);
      var here = states.get(key);
      var list = [];
      if (d0 < level.budget) {
        for (var b = 0; b < level.bottles.length; b++) {
          var nxt = pour(level, here, b).state;
          var nk = encode(nxt);
          if (!states.has(nk)) {
            states.set(nk, nxt);
            depthOf.set(nk, d0 + 1);
            queue.push(nk);
          }
          list.push({ bottle: b, key: nk });
        }
      }
      edges.set(key, list);
    }
    var dist = new Map();
    var goals = [];
    states.forEach(function (state, key) {
      if (won(level, state)) goals.push(key);
    });
    var rev = new Map();
    states.forEach(function (_s, key) { rev.set(key, []); });
    edges.forEach(function (list, key) {
      for (var i = 0; i < list.length; i++) rev.get(list[i].key).push(key);
    });
    var dq = goals.slice();
    for (var g = 0; g < goals.length; g++) dist.set(goals[g], 0);
    var di = 0;
    while (di < dq.length) {
      var cur = dq[di++];
      var preds = rev.get(cur) || [];
      var nextD = dist.get(cur) + 1;
      for (var p = 0; p < preds.length; p++) {
        if (!dist.has(preds[p])) {
          dist.set(preds[p], nextD);
          dq.push(preds[p]);
        }
      }
    }
    level._graph = { states: states, edges: edges, dist: dist, startKey: okey };
    return level._graph;
  }

  function distance(level, state) {
    var g = graph(level);
    var key = encode(state);
    return g.dist.has(key) ? g.dist.get(key) : Infinity;
  }

  function stuckText(left) {
    return 'This tower can\'t be finished in ' + left + (left === 1 ? ' pour' : ' pours');
  }

  function undoHelps(level, prev, leftAfter) {
    if (leftAfter < 0) return false;
    return distance(level, prev) <= leftAfter;
  }

  function policies(level, state) {
    var n = level.bottles.length;
    function uni(list) {
      var out = [];
      for (var i = 0; i < list.length; i++) out.push([1 / list.length, list[i]]);
      return out;
    }
    var greedyScores = [];
    var greedyMax = -1;
    for (var b = 0; b < n; b++) {
      greedyScores[b] = score(level, pour(level, state, b).state);
      if (greedyScores[b] > greedyMax) greedyMax = greedyScores[b];
    }
    var greedy = [];
    for (b = 0; b < n; b++) if (greedyScores[b] === greedyMax) greedy.push(b);
    var best2 = [];
    var max2 = -1;
    for (b = 0; b < n; b++) {
      var mid = pour(level, state, b).state;
      var value = won(level, mid) ? 1000000 : 0;
      if (!won(level, mid)) {
        var local = -1;
        for (var b2 = 0; b2 < n; b2++) {
          var nxt = pour(level, mid, b2).state;
          var sc = score(level, nxt) + (won(level, nxt) ? 100000 : 0);
          if (sc > local) local = sc;
        }
        value = local;
      }
      best2[b] = value;
      if (value > max2) max2 = value;
    }
    var greedy2 = [];
    for (b = 0; b < n; b++) if (best2[b] === max2) greedy2.push(b);
    var land = [];
    for (b = 0; b < n; b++) {
      var info = pour(level, state, b);
      if (info.kind === 'land' && info.path.length === 1) land.push(b);
    }
    var fill = greedy.slice();
    if (land.length) {
      var fillMax = -1;
      var fillScores = [];
      for (var i = 0; i < land.length; i++) {
        fillScores[i] = score(level, pour(level, state, land[i]).state);
        if (fillScores[i] > fillMax) fillMax = fillScores[i];
      }
      fill = [];
      for (i = 0; i < land.length; i++) if (fillScores[i] === fillMax) fill.push(land[i]);
    }
    return { RAND: uni(range(n)), GREEDY: uni(greedy), GREEDY2: uni(greedy2), FILLFIRST: uni(fill) };
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  function lazyRates(level) {
    var budget = level.budget;
    var names = ['RAND', 'GREEDY', 'GREEDY2', 'FILLFIRST'];
    var rates = {};
    names.forEach(function (name) {
      var memo = new Map();
      function walk(state, used) {
        if (won(level, state)) return 1;
        if (used >= budget) return 0;
        var id = used + '@' + encode(state);
        if (memo.has(id)) return memo.get(id);
        var options = policies(level, state)[name];
        var total = 0;
        for (var i = 0; i < options.length; i++) {
          total += options[i][0] * walk(pour(level, state, options[i][1]).state, used + 1);
        }
        memo.set(id, total);
        return total;
      }
      rates[name] = Math.round(walk(start(level), 0) * 10000) / 100;
    });
    return rates;
  }

  root.FizzLogic = {
    levels: levels,
    start: start,
    clone: clone,
    encode: encode,
    won: won,
    score: score,
    pour: pour,
    bottleFor: bottleFor,
    playRef: playRef,
    countUntilGoal: countUntilGoal,
    graph: graph,
    distance: distance,
    stuckText: stuckText,
    undoHelps: undoHelps,
    lazyRates: lazyRates
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
