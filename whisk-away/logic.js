(function (root) {
  var DIR = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
  var NAMES = ['First Flick', 'Slow Cloth', 'Two Layers', 'Blocked Lane', 'Change Hands', 'Four Runners', 'The Hand-off', 'Long Napkin', 'Side Step', 'Last Setting'];
  var PACK = 
[{"W":5,"H":6,"cloths":[[1,2,3,2,"E"]],"dishes":[[2,3]],"targets":[[2,3]],"par":1,"states":6,"ref":[["w",0]],"vis":[6]},{"W":5,"H":6,"cloths":[[0,1,3,3,"S"]],"dishes":[[1,1]],"targets":[[1,3]],"par":3,"states":10,"ref":[["d",0],["d",0],["w",0]],"vis":[9]},{"W":5,"H":6,"cloths":[[0,0,3,4,"S"],[0,0,2,2,"E"]],"dishes":[[0,0],[2,2]],"targets":[[1,2],[2,4]],"par":5,"states":164,"ref":[["d",0],["d",0],["w",0],["d",1],["w",1]],"vis":[8,4]},{"W":5,"H":6,"cloths":[[2,2,3,3,"W"],[2,3,3,2,"N"],[0,3,3,2,"W"]],"dishes":[[2,4],[0,4]],"targets":[[2,2],[0,3]],"par":5,"states":212,"ref":[["w",0],["d",1],["w",2],["d",1],["w",1]],"vis":[3,4,6]},{"W":5,"H":6,"cloths":[[1,0,4,4,"W"],[0,2,3,2,"S"],[2,1,2,3,"W"]],"dishes":[[3,0],[1,1]],"targets":[[2,0],[0,1]],"par":5,"states":602,"ref":[["d",0],["w",0],["d",1],["w",1],["w",2]],"vis":[8,4,6]},{"W":5,"H":6,"cloths":[[1,2,4,4,"E"],[0,3,4,2,"E"],[1,3,4,2,"E"],[2,1,2,3,"S"]],"dishes":[[2,5],[1,2]],"targets":[[3,5],[2,2]],"par":6,"states":6488,"ref":[["d",0],["w",0],["w",1],["d",2],["w",2],["w",3]],"vis":[6,2,6,6]},{"W":5,"H":6,"cloths":[[2,1,2,4,"E"],[2,4,3,2,"N"],[1,0,4,3,"S"],[0,4,4,2,"W"]],"dishes":[[2,2],[2,0],[1,5]],"targets":[[4,2],[3,0],[2,5]],"par":6,"states":10664,"ref":[["d",0],["w",1],["w",2],["w",3],["d",0],["w",0]],"vis":[2,2,12,8]},{"W":5,"H":6,"cloths":[[3,1,2,4,"N"],[1,0,2,3,"S"],[0,2,2,3,"N"],[0,0,2,4,"E"]],"dishes":[[3,2],[3,1]],"targets":[[3,1],[3,0]],"par":7,"states":19356,"ref":[["d",0],["w",0],["d",1],["d",1],["w",1],["w",2],["w",3]],"vis":[8,3,2,8]},{"W":5,"H":6,"cloths":[[0,0,4,2,"E"],[0,2,3,3,"W"],[3,3,2,2,"S"],[2,2,2,3,"W"]],"dishes":[[1,1],[1,3],[0,1]],"targets":[[2,1],[0,3],[1,1]],"par":8,"states":1344,"ref":[["d",0],["w",0],["d",2],["d",2],["d",1],["w",1],["w",2],["w",3]],"vis":[8,6,2,6]},{"W":5,"H":6,"cloths":[[1,1,4,2,"N"],[3,0,2,4,"S"],[1,3,4,3,"W"],[2,2,3,2,"E"]],"dishes":[[4,3],[4,4],[3,2]],"targets":[[1,1],[1,2],[3,1]],"par":10,"states":57169,"ref":[["d",0],["d",0],["w",0],["w",3],["d",2],["d",2],["d",1],["w",1],["d",2],["w",2]],"vis":[3,4,9,6]}]
;

  function covers(r, x, y) {
    return r[0] <= x && x < r[0] + r[2] && r[1] <= y && y < r[1] + r[3];
  }

  function overlap(a, b) {
    return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  }

  function onboard(r, level) {
    return !(r[0] >= level.W || r[1] >= level.H || r[0] + r[2] <= 0 || r[1] + r[3] <= 0);
  }

  function baseOf(level) { return level.cloths.length * 3; }

  function ox(st, i) { return st[i * 3]; }
  function oy(st, i) { return st[i * 3 + 1]; }
  function on(st, i) { return st[i * 3 + 2] === 1; }
  function dishX(level, st, d) { return st[baseOf(level) + d * 3]; }
  function dishY(level, st, d) { return st[baseOf(level) + d * 3 + 1]; }
  function dishS(level, st, d) { return st[baseOf(level) + d * 3 + 2]; }

  function rectAt(level, st, i, into) {
    var cloth = level.cloths[i];
    into[0] = cloth[0] + st[i * 3];
    into[1] = cloth[1] + st[i * 3 + 1];
    into[2] = cloth[2];
    into[3] = cloth[3];
    return into;
  }

  function laneInto(level, r, dir, into) {
    var x = r[0], y = r[1], w = r[2], h = r[3];
    if (dir === 'E') { into[0] = x; into[1] = y; into[2] = level.W - x; into[3] = h; }
    else if (dir === 'W') { into[0] = 0; into[1] = y; into[2] = x + w; into[3] = h; }
    else if (dir === 'S') { into[0] = x; into[1] = y; into[2] = w; into[3] = level.H - y; }
    else { into[0] = x; into[1] = 0; into[2] = w; into[3] = y + h; }
    return into;
  }

  function lane(level, r, dir) { return laneInto(level, r, dir, [0, 0, 0, 0]); }

  function clone(st) { return st.slice(); }

  function keyOf(st) { return st.join(','); }

  function start(level) {
    var n = level.cloths.length;
    var st = new Array(n * 3 + level.dishes.length * 3);
    for (var i = 0; i < n; i++) { st[i * 3] = 0; st[i * 3 + 1] = 0; st[i * 3 + 2] = 1; }
    var rect = [0, 0, 0, 0];
    for (var d = 0; d < level.dishes.length; d++) {
      var x = level.dishes[d][0];
      var y = level.dishes[d][1];
      var sup = -1;
      for (var c = 0; c < n; c++) {
        rectAt(level, st, c, rect);
        if (covers(rect, x, y)) sup = c;
      }
      var b = n * 3 + d * 3;
      st[b] = x; st[b + 1] = y; st[b + 2] = sup;
    }
    return st;
  }

  function moves(level, st) {
    var n = level.cloths.length;
    var dishCount = level.dishes.length;
    var base = n * 3;
    var rs = new Array(n);
    for (var i = 0; i < n; i++) rs[i] = rectAt(level, st, i, [0, 0, 0, 0]);
    var out = [];
    for (var c = 0; c < n; c++) {
      if (st[c * 3 + 2] !== 1) continue;
      var dir = level.cloths[c][4];
      var ln = lane(level, rs[c], dir);
      var blocked = false;
      for (var di = 0; di < dishCount; di++) {
        var sb = base + di * 3;
        if (st[sb + 2] < c && covers(ln, st[sb], st[sb + 1])) { blocked = true; break; }
      }
      if (!blocked) {
        var whipped = st.slice();
        whipped[c * 3 + 2] = 0;
        for (var dj = 0; dj < dishCount; dj++) {
          var jb = base + dj * 3;
          if (whipped[jb + 2] !== c) continue;
          var ns = -1;
          for (var k = 0; k < n; k++) {
            if (whipped[k * 3 + 2] === 1 && covers(rs[k], whipped[jb], whipped[jb + 1])) ns = k;
          }
          whipped[jb + 2] = ns;
        }
        out.push({ move: ['w', c], state: whipped });
      }
      var member = new Array(n);
      member[c] = 1;
      var members = [c];
      for (var up = c + 1; up < n; up++) {
        if (st[up * 3 + 2] !== 1) continue;
        for (var m = 0; m < members.length; m++) {
          if (overlap(rs[up], rs[members[m]])) { member[up] = 1; members.push(up); break; }
        }
      }
      var delta = DIR[dir];
      var dx = delta[0];
      var dy = delta[1];
      var newr = new Array(n);
      for (var mi = 0; mi < members.length; mi++) {
        var id0 = members[mi];
        var rr = rs[id0];
        newr[id0] = [rr[0] + dx, rr[1] + dy, rr[2], rr[3]];
      }
      var ok = true;
      for (var dd = 0; dd < dishCount; dd++) {
        var db = base + dd * 3;
        if (!member[st[db + 2]]) continue;
        var nx = st[db] + dx;
        var ny = st[db + 1] + dy;
        if (nx < 0 || ny < 0 || nx >= level.W || ny >= level.H) { ok = false; break; }
      }
      if (!ok) continue;
      var clash = false;
      for (var a = 0; a < dishCount && !clash; a++) {
        var ab = base + a * 3;
        if (!member[st[ab + 2]]) continue;
        var ax = st[ab] + dx;
        var ay = st[ab + 1] + dy;
        for (var b = 0; b < dishCount; b++) {
          var bb = base + b * 3;
          if (member[st[bb + 2]]) continue;
          if (ax === st[bb] && ay === st[bb + 1]) { clash = true; break; }
        }
      }
      if (clash) continue;
      for (var s = 0; s < dishCount && !clash; s++) {
        var sp = base + s * 3;
        if (member[st[sp + 2]]) continue;
        for (var mm = 0; mm < members.length; mm++) {
          if (members[mm] > st[sp + 2] && covers(newr[members[mm]], st[sp], st[sp + 1])) { clash = true; break; }
        }
      }
      if (clash) continue;
      for (var mv = 0; mv < dishCount && !clash; mv++) {
        var mb = base + mv * 3;
        if (!member[st[mb + 2]]) continue;
        var mx = st[mb] + dx;
        var my = st[mb + 1] + dy;
        for (var ii = 0; ii < n; ii++) {
          if (st[ii * 3 + 2] === 1 && !member[ii] && ii > st[mb + 2] && covers(rs[ii], mx, my)) { clash = true; break; }
        }
      }
      if (clash) continue;
      var dragged = st.slice();
      for (var mj = 0; mj < members.length; mj++) {
        var id = members[mj];
        dragged[id * 3] = st[id * 3] + dx;
        dragged[id * 3 + 1] = st[id * 3 + 1] + dy;
        if (!onboard(newr[id], level)) dragged[id * 3 + 2] = 0;
      }
      for (var md = 0; md < dishCount; md++) {
        var qb = base + md * 3;
        if (!member[st[qb + 2]]) continue;
        dragged[qb] = st[qb] + dx;
        dragged[qb + 1] = st[qb + 1] + dy;
      }
      out.push({ move: ['d', c], state: dragged });
    }
    return out;
  }

  function isGoal(level, st) {
    var n = level.cloths.length;
    for (var i = 0; i < n; i++) if (st[i * 3 + 2] === 1) return false;
    var base = n * 3;
    for (var d = 0; d < level.dishes.length; d++) {
      if (st[base + d * 3] !== level.targets[d][0] || st[base + d * 3 + 1] !== level.targets[d][1]) return false;
    }
    return true;
  }

  function apply(level, st, move) {
    var list = moves(level, st);
    for (var i = 0; i < list.length; i++) {
      if (list[i].move[0] === move[0] && list[i].move[1] === move[1]) return list[i].state;
    }
    return null;
  }

  function graph(level, withEdges) {
    if (level._graph && (!withEdges || level._graph.edges)) return level._graph;
    var origin = start(level);
    var originKey = keyOf(origin);
    var states = new Map();
    var edges = new Map();
    states.set(originKey, origin);
    var queue = [originKey];
    var qi = 0;
    while (qi < queue.length) {
      var uk = queue[qi++];
      var list = moves(level, states.get(uk));
      var packed = new Array(list.length);
      for (var i = 0; i < list.length; i++) {
        var nk = keyOf(list[i].state);
        if (!states.has(nk)) {
          states.set(nk, list[i].state);
          queue.push(nk);
        }
        packed[i] = { move: list[i].move, key: nk };
      }
      edges.set(uk, packed);
    }
    var rev = new Map();
    states.forEach(function (_st, key) { rev.set(key, []); });
    edges.forEach(function (list, key) {
      for (var e = 0; e < list.length; e++) rev.get(list[e].key).push(key);
    });
    var dist = new Map();
    var dq = [];
    states.forEach(function (st, key) {
      if (isGoal(level, st)) { dist.set(key, 0); dq.push(key); }
    });
    var di = 0;
    while (di < dq.length) {
      var cur = dq[di++];
      var preds = rev.get(cur);
      var next = dist.get(cur) + 1;
      for (var p = 0; p < preds.length; p++) {
        if (!dist.has(preds[p])) { dist.set(preds[p], next); dq.push(preds[p]); }
      }
    }
    level._graph = {
      states: states,
      edges: edges,
      dist: dist,
      startKey: originKey,
      count: states.size,
      par: dist.has(originKey) ? dist.get(originKey) : null
    };
    return level._graph;
  }

  function distance(level, st) {
    var g = graph(level);
    var key = keyOf(st);
    return g.dist.has(key) ? g.dist.get(key) : Infinity;
  }

  function manhattan(level, st) {
    var base = baseOf(level);
    var sum = 0;
    for (var i = 0; i < level.dishes.length; i++) {
      sum += Math.abs(st[base + i * 3] - level.targets[i][0]) + Math.abs(st[base + i * 3 + 1] - level.targets[i][1]);
    }
    return sum;
  }

  function clothsLeft(level, st) {
    var n = 0;
    for (var i = 0; i < level.cloths.length; i++) if (st[i * 3 + 2] === 1) n++;
    return n;
  }

  function hSort(level, st) { return manhattan(level, st) * 2 + clothsLeft(level, st); }

  function argmin(list, score) {
    var best = Infinity;
    var chosen = [];
    for (var i = 0; i < list.length; i++) {
      var value = score(list[i]);
      if (value < best - 1e-9) { best = value; chosen = [list[i]]; }
      else if (Math.abs(value - best) < 1e-9) chosen.push(list[i]);
    }
    return chosen;
  }

  function clearProb(level, g, policy, budget) {
    var memo = new Map();
    function walk(key, left) {
      if (isGoal(level, g.states.get(key))) return 1;
      if (left === 0) return 0;
      var id = left + '@' + key;
      var hit = memo.get(id);
      if (hit !== undefined) return hit;
      var options = g.edges.get(key);
      if (!options.length) { memo.set(id, 0); return 0; }
      var picked = policy(options);
      var sum = 0;
      for (var i = 0; i < picked.length; i++) sum += walk(picked[i].key, left - 1);
      var prob = sum / picked.length;
      memo.set(id, prob);
      return prob;
    }
    return walk(g.startKey, budget);
  }

  function stateAt(g, key) { return g.states.get(key); }

  function lazyRates(level) {
    var g = graph(level);
    var budget = level.par + 2;
    function greedy(ms) {
      return argmin(ms, function (edge) { return hSort(level, g.states.get(edge.key)); });
    }
    function whipFirst(ms) {
      return argmin(ms, function (edge) {
        return (edge.move[0] === 'w' ? 0 : 1) * 100 + hSort(level, g.states.get(edge.key));
      });
    }
    function greedy2(ms) {
      return argmin(ms, function (edge) {
        var best = hSort(level, g.states.get(edge.key));
        var next = g.edges.get(edge.key);
        for (var i = 0; i < next.length; i++) {
          var alt = hSort(level, g.states.get(next[i].key)) + 0.5;
          if (alt < best) best = alt;
        }
        return best;
      });
    }
    function lateWhip(ms) {
      return argmin(ms, function (edge) {
        var st = g.states.get(edge.key);
        var man = manhattan(level, st);
        return man * 10 + (man === 0 ? clothsLeft(level, st) : 0) + (edge.move[0] === 'w' ? 0.5 : 0);
      });
    }
    var pols = { RAND: function (ms) { return ms; }, GREEDY: greedy, GREEDY2: greedy2, WHIP_FIRST: whipFirst, GREEDY_WHIPLATE: lateWhip };
    var names = ['RAND', 'GREEDY', 'GREEDY2', 'WHIP_FIRST', 'GREEDY_WHIPLATE'];
    var rates = {};
    var max = 0;
    for (var i = 0; i < names.length; i++) {
      var pct = Math.round(clearProb(level, g, pols[names[i]], budget) * 1000) / 10;
      rates[names[i]] = pct;
      if (pct > max) max = pct;
    }
    rates.max = Math.round(max * 10) / 10;
    return rates;
  }

  function visibleCells(level) {
    var st = start(level);
    var rect = [0, 0, 0, 0];
    var counts = [];
    for (var i = 0; i < level.cloths.length; i++) {
      rectAt(level, st, i, rect);
      var seen = 0;
      for (var x = rect[0]; x < rect[0] + rect[2]; x++) {
        for (var y = rect[1]; y < rect[1] + rect[3]; y++) {
          if (x < 0 || y < 0 || x >= level.W || y >= level.H) continue;
          var covered = false;
          var above = [0, 0, 0, 0];
          for (var k = i + 1; k < level.cloths.length; k++) {
            if (st[k * 3 + 2] === 1 && covers(rectAt(level, st, k, above), x, y)) { covered = true; break; }
          }
          if (!covered) seen++;
        }
      }
      counts.push(seen);
    }
    return counts;
  }

  function whipBlockers(level, st, cloth) {
    var rect = rectAt(level, st, cloth, [0, 0, 0, 0]);
    var ln = lane(level, rect, level.cloths[cloth][4]);
    var cells = [];
    var base = baseOf(level);
    for (var i = 0; i < level.dishes.length; i++) {
      var x = st[base + i * 3];
      var y = st[base + i * 3 + 1];
      if (st[base + i * 3 + 2] < cloth && covers(ln, x, y)) cells.push([x, y]);
    }
    return cells;
  }

  function carrySet(level, st, cloth) {
    var n = level.cloths.length;
    var rs = new Array(n);
    for (var i = 0; i < n; i++) rs[i] = rectAt(level, st, i, [0, 0, 0, 0]);
    var members = [cloth];
    for (var k = cloth + 1; k < n; k++) {
      if (st[k * 3 + 2] !== 1) continue;
      for (var m = 0; m < members.length; m++) {
        if (overlap(rs[k], rs[members[m]])) { members.push(k); break; }
      }
    }
    return members;
  }

  function stuckText(left) { return "Can't set the table in " + left + " moves"; }

  function undoHelps(level, prev, leftAfter) {
    if (leftAfter < 0) return false;
    return distance(level, prev) <= leftAfter;
  }

  var cached = null;
  function levels() {
    if (cached) return cached;
    cached = PACK.map(function (row, index) {
      return {
        n: index + 1,
        name: NAMES[index],
        W: row.W,
        H: row.H,
        cloths: row.cloths,
        dishes: row.dishes,
        targets: row.targets,
        par: row.par,
        budget: row.par + 2,
        expectStates: row.states,
        ref: row.ref,
        expectVisible: row.vis
      };
    });
    return cached;
  }

  root.WhiskLogic = {
    DIR: DIR,
    levels: levels,
    start: start,
    clone: clone,
    keyOf: keyOf,
    ox: ox,
    oy: oy,
    on: on,
    dishX: dishX,
    dishY: dishY,
    dishS: dishS,
    rectAt: rectAt,
    lane: lane,
    moves: moves,
    apply: apply,
    isGoal: isGoal,
    graph: graph,
    distance: distance,
    lazyRates: lazyRates,
    visibleCells: visibleCells,
    whipBlockers: whipBlockers,
    carrySet: carrySet,
    stuckText: stuckText,
    undoHelps: undoHelps,
    covers: covers
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

