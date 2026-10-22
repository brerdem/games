(function (root) {
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var ELB = { a: [0, 1], b: [1, 2], c: [2, 3], d: [3, 0] };
  var SPL = { '1': 0, '2': 1, '3': 2, '4': 3 };
  var W = 6;
  var H = 8;
  var NAMES = ['First Tip', 'Two Lines', 'Side Swipe', 'Corner', 'Turnstile', 'One Way', 'Comb', 'Hook', 'Zigzag', 'Twin Corners', 'Fork', 'Grand Knock'];
  var ROWS = [
    ['......', '......', '......', 'HHHH..', '......', '......', '......', '......'],
    ['.#....', '......', '..#...', 'HHHHH.', '......', '......', '......', 'HHH...'],
    ['......', '......', '..#...', '......', '....#.', 'HHHHHV', '.....V', '.....V'],
    ['......', '...HHH', 'H.....', 'V.....', 'V.....', 'aHHHH.', '......', '......'],
    ['......', '.....#', 'HH....', '...HHH', '.#...V', '.....V', '....#H', '......'],
    ['#V....', '.V....', '.V....', '.VHH..', '..HHHH', '......', '......', '..#...'],
    ['..V...', '......', '......', 'VHHHH.', 'V.V...', 'V.V...', 'H.V...', 'V.....'],
    ['....V.', '....V.', 'bHH...', 'H.....', 'H.....', 'V.....', 'V.....', '......'],
    ['......', 'HHHHHH', '..#..V', '.....V', 'HHHHHd', '...V..', '...V..', '...V..'],
    ['......', 'VHbHc.', '..V.V.', '..V.V.', '..V.V.', '..V.V.', 'HHH#..', '......'],
    ['V.....', '3##...', 'V.....', 'VHH...', 'V.....', 'V.....', 'V.....', 'VHVHH.'],
    ['....V.', '##..V.', 'HHHH3.', '....HH', '...VV.', '...VV.', '...V..', '...V..']
  ];
  var PAR = [1, 2, 3, 3, 4, 4, 5, 4, 5, 5, 5, 6];

  function isDom(c) { return c === 'H' || c === 'V'; }
  function isPiece(c) { return c === 'H' || c === 'V' || c in ELB || c in SPL; }
  function standingCount(g) {
    var n = 0;
    for (var i = 0; i < g.length; i++) if (isPiece(g[i])) n++;
    return n;
  }
  function inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function canFall(g, p, d) {
    var x = p % W + DX[d];
    var y = (p / W | 0) + DY[d];
    if (!inb(x, y)) return false;
    var c = g[y * W + x];
    return !(c === '#' || c === '_' || c === '~');
  }
  function moves(g) {
    var m = [];
    for (var p = 0; p < g.length; p++) {
      var c = g[p];
      var ds = c === 'H' ? [1, 3] : c === 'V' ? [0, 2] : null;
      if (!ds) continue;
      for (var i = 0; i < ds.length; i++) if (canFall(g, p, ds[i])) m.push([p, ds[i]]);
    }
    return m;
  }
  // Grid steps match brief §I.4. The log, felled count and jam count match lib.mjs.
  function push(g, p, d, variant) {
    variant = variant || { spin: true };
    g = g.slice();
    var felled = 0;
    var spins = 0;
    var ticks = 0;
    var conflict = false;
    var jams = 0;
    var events = [[p, d]];
    var log = [];
    g[p] = '_';
    felled++;
    log.push([0, 'fall', p, d]);
    while (events.length) {
      var next = [];
      ticks++;
      var touched = new Set();
      for (var i = 0; i < events.length; i++) {
        var q = events[i][0];
        var dd = events[i][1];
        var x = q % W + DX[dd];
        var y = (q / W | 0) + DY[dd];
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        var t = y * W + x;
        var c = g[t];
        if (touched.has(t)) conflict = true;
        touched.add(t);
        if (c === '.') { g[t] = '~'; continue; }
        if (c === 'H' || c === 'V') {
          var par = (c === 'H') === (dd === 1 || dd === 3);
          if (par) {
            if (canFall(g, t, dd)) {
              g[t] = '_';
              felled++;
              next.push([t, dd]);
              log.push([ticks, 'fall', t, dd]);
            } else {
              jams++;
              log.push([ticks, 'jam', t, dd]);
            }
          } else if (variant.spin) {
            g[t] = c === 'H' ? 'V' : 'H';
            spins++;
            log.push([ticks, 'spin', t, dd]);
          }
        } else if (c in ELB) {
          var o = ELB[c];
          var from = (dd + 2) % 4;
          if (o.indexOf(from) >= 0) {
            var out = o[0] === from ? o[1] : o[0];
            if (canFall(g, t, out)) {
              g[t] = '_';
              felled++;
              next.push([t, out]);
              log.push([ticks, 'turn', t, out]);
            } else jams++;
          }
        } else if (c in SPL) {
          var s = SPL[c];
          if ((dd + 2) % 4 === s) {
            g[t] = '_';
            felled++;
            var a = (s + 1) % 4;
            var b = (s + 3) % 4;
            next.push([t, a], [t, b]);
            log.push([ticks, 'split', t, a]);
          }
        }
      }
      events = next;
    }
    return { g: g, felled: felled, spins: spins, ticks: ticks, conflict: conflict, jams: jams, log: log };
  }
  function solve(g0, maxD, variant) {
    maxD = maxD || 9;
    variant = variant || { spin: true };
    var k0 = g0.join('');
    if (standingCount(g0) === 0) return { par: 0, nOpt: 1, sols: [[]] };
    var frontier = new Map([[k0, { g: g0, cnt: 1 }]]);
    var parent = new Map([[k0, null]]);
    for (var depth = 1; depth <= maxD; depth++) {
      var nf = new Map();
      var solCnt = 0;
      var solEnd = null;
      frontier.forEach(function (item, k) {
        var list = moves(item.g);
        for (var i = 0; i < list.length; i++) {
          var mv = list[i];
          var r = push(item.g, mv[0], mv[1], variant);
          if (standingCount(r.g) === 0) {
            solCnt += item.cnt;
            if (!solEnd) solEnd = [k, mv];
            continue;
          }
          var kk = r.g.join('');
          if (parent.has(kk) && !nf.has(kk)) continue;
          var e = nf.get(kk);
          if (e) e.cnt += item.cnt;
          else {
            nf.set(kk, { g: r.g, cnt: item.cnt });
            parent.set(kk, [k, mv]);
          }
        }
      });
      if (solCnt) {
        var sol = [solEnd[1]];
        var key = solEnd[0];
        while (parent.get(key)) {
          var pair = parent.get(key);
          sol.unshift(pair[1]);
          key = pair[0];
        }
        return { par: depth, nOpt: solCnt, sols: [sol] };
      }
      if (!nf.size) break;
      frontier = nf;
    }
    return { par: Infinity, nOpt: 0, sols: [] };
  }
  function makeMin(g0) {
    var memo = new Map();
    var visiting = new Set();
    function f(g) {
      var k = g.join('');
      if (memo.has(k)) return memo.get(k);
      if (standingCount(g) === 0) { memo.set(k, 0); return 0; }
      if (visiting.has(k)) return Infinity;
      visiting.add(k);
      var best = Infinity;
      var list = moves(g);
      for (var i = 0; i < list.length; i++) {
        var v = 1 + f(push(g, list[i][0], list[i][1]).g);
        if (v < best) best = v;
      }
      visiting.delete(k);
      memo.set(k, best);
      return best;
    }
    f(g0.slice());
    function lookup(g) {
      var k = g.join('');
      if (memo.has(k)) return memo.get(k);
      return f(g);
    }
    lookup.entries = memo;
    return lookup;
  }
  function pinned(g) {
    var n = 0;
    for (var p = 0; p < g.length; p++) {
      var c = g[p];
      if (c === 'H') { if (!canFall(g, p, 1) && !canFall(g, p, 3)) n++; }
      else if (c === 'V') { if (!canFall(g, p, 0) && !canFall(g, p, 2)) n++; }
    }
    return n;
  }
  function pinnedAt(g, p) {
    var c = g[p];
    if (c === 'H') return !canFall(g, p, 1) && !canFall(g, p, 3);
    if (c === 'V') return !canFall(g, p, 0) && !canFall(g, p, 2);
    return false;
  }
  function felledSet(g0, g1) {
    var s = [];
    for (var i = 0; i < g0.length; i++) if (g0[i] !== g1[i] && g1[i] === '_') s.push(i);
    return s;
  }
  function argmaxAll(arr, f) {
    var best = -Infinity;
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = f(arr[i]);
      if (v > best) { best = v; out = [arr[i]]; }
      else if (v === best) out.push(arr[i]);
    }
    return out;
  }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  var POLICIES = {
    RAND: function (g, r) { return pick(moves(g), r); },
    GREEDY: function (g, r) { return pick(argmaxAll(moves(g), function (m) { return push(g, m[0], m[1]).felled; }), r); },
    GREEDY2: function (g, r) {
      return pick(argmaxAll(moves(g), function (m) {
        var a = push(g, m[0], m[1]);
        var ms = moves(a.g);
        var b = 0;
        for (var i = 0; i < ms.length; i++) {
          var f = push(a.g, ms[i][0], ms[i][1]).felled;
          if (f > b) b = f;
        }
        return a.felled * 100 + b;
      }), r);
    },
    NOSPIN: function (g, r) {
      var ms = moves(g);
      var ok = ms.filter(function (m) { return push(g, m[0], m[1]).spins === 0; });
      return pick(argmaxAll(ok.length ? ok : ms, function (m) { return push(g, m[0], m[1]).felled; }), r);
    },
    MAXIMAL: function (g, r) {
      var ms = moves(g);
      var sets = ms.map(function (m) { return felledSet(g, push(g, m[0], m[1]).g); });
      var ok = ms.filter(function (m, i) {
        return !sets.some(function (s, j) {
          return j !== i && s.length > sets[i].length && sets[i].every(function (x) { return s.indexOf(x) >= 0; });
        });
      });
      return pick(ok, r);
    },
    SAFE1: function (g, r) {
      var ms = moves(g);
      var ok = ms.filter(function (m) { return pinned(push(g, m[0], m[1]).g) === 0; });
      return pick(ok.length ? ok : ms, r);
    }
  };
  function support(name, g) {
    var ms = moves(g);
    if (!ms.length) return [];
    if (name === 'RAND') return ms;
    if (name === 'GREEDY') return argmaxAll(ms, function (m) { return push(g, m[0], m[1]).felled; });
    if (name === 'GREEDY2') {
      return argmaxAll(ms, function (m) {
        var a = push(g, m[0], m[1]);
        var next = moves(a.g);
        var b = 0;
        for (var i = 0; i < next.length; i++) {
          var f = push(a.g, next[i][0], next[i][1]).felled;
          if (f > b) b = f;
        }
        return a.felled * 100 + b;
      });
    }
    if (name === 'NOSPIN') {
      var ok = ms.filter(function (m) { return push(g, m[0], m[1]).spins === 0; });
      return argmaxAll(ok.length ? ok : ms, function (m) { return push(g, m[0], m[1]).felled; });
    }
    if (name === 'MAXIMAL') {
      var sets = ms.map(function (m) { return felledSet(g, push(g, m[0], m[1]).g); });
      return ms.filter(function (m, i) {
        return !sets.some(function (s, j) {
          return j !== i && s.length > sets[i].length && sets[i].every(function (x) { return s.indexOf(x) >= 0; });
        });
      });
    }
    if (name === 'SAFE1') {
      var safe = ms.filter(function (m) { return pinned(push(g, m[0], m[1]).g) === 0; });
      return safe.length ? safe : ms;
    }
    return ms;
  }
  function exactPolicy(name, g0, par, minF, probe, hintAt) {
    var B = par + 2;
    var memo = new Map();
    function rec(g, used, committed, hinted) {
      if (standingCount(g) === 0) return [1, used === par && hinted === 0 ? 1 : 0];
      if (used >= B) return [0, 0];
      var k = used + '|' + committed + '|' + hinted + '|' + g.join('');
      var hit = memo.get(k);
      if (hit) return hit;
      var list = moves(g);
      if (!list.length) { memo.set(k, [0, 0]); return [0, 0]; }
      var choices;
      var useHint = 0;
      if (hinted === 0 && committed === hintAt) {
        useHint = 1;
        var need = minF(g);
        choices = [];
        for (var i = 0; i < list.length; i++) {
          if (1 + minF(push(g, list[i][0], list[i][1]).g) === need) { choices = [list[i]]; break; }
        }
        if (!choices.length) choices = support(name, g).slice(0, 1);
      } else choices = support(name, g);
      if (!choices.length) { memo.set(k, [0, 0]); return [0, 0]; }
      var pc = 0;
      var ps = 0;
      var flag = hinted || useHint;
      for (var c = 0; c < choices.length; c++) {
        var ng = push(g, choices[c][0], choices[c][1]).g;
        var child;
        if (probe && standingCount(ng) > 0 && minF(ng) > B - (used + 1)) {
          child = used + 1 < B ? rec(g, used + 2, committed, flag) : [0, 0];
        } else child = rec(ng, used + 1, committed + 1, flag);
        pc += child[0];
        ps += child[1];
      }
      var ans = [pc / choices.length, ps / choices.length];
      memo.set(k, ans);
      return ans;
    }
    var out = rec(g0, 0, 0, 0);
    return { clear: out[0], star3: out[1], states: memo.size };
  }
  function play(name, g0, par, random, minF, probe, hintAt) {
    var B = par + 2;
    var g = g0;
    var used = 0;
    var undos = 0;
    var hinted = false;
    var stack = [];
    while (standingCount(g) > 0 && used < B) {
      if (!moves(g).length) break;
      var m;
      if (stack.length === hintAt && !hinted) {
        hinted = true;
        var ms = moves(g);
        var need = minF(g);
        m = null;
        for (var i = 0; i < ms.length; i++) {
          if (1 + minF(push(g, ms[i][0], ms[i][1]).g) === need) { m = ms[i]; break; }
        }
        if (!m) m = POLICIES[name](g, random);
      } else m = POLICIES[name](g, random);
      var ng = push(g, m[0], m[1]).g;
      used++;
      if (probe && standingCount(ng) > 0 && minF(ng) > B - used) {
        if (used < B) { used++; undos++; continue; }
        g = ng;
        break;
      }
      stack.push(g);
      g = ng;
    }
    var clear = standingCount(g) === 0;
    return { clear: clear, star3: clear && used === par && undos === 0 && !hinted, used: used };
  }
  function runPolicy(name, g0, par, runs, seed, minF, probe, hintAt) {
    var random = rng(seed);
    var clear = 0;
    var star3 = 0;
    for (var i = 0; i < runs; i++) {
      var o = play(name, g0, par, random, minF, probe, hintAt);
      if (o.clear) clear++;
      if (o.star3) star3++;
    }
    return { clear: clear, star3: star3, runs: runs };
  }
  function hintWorst(g0, par, runs, seed, minF) {
    var worst = { clear: -1, at: 0, star3: 0, runs: runs };
    for (var h = 0; h < par; h++) {
      var o = runPolicy('GREEDY2', g0, par, runs, seed + h, minF, true, h);
      if (o.clear > worst.clear) worst = { clear: o.clear, star3: o.star3, runs: runs, at: h };
    }
    return worst;
  }
  var LEVELS = ROWS.map(function (rows, index) {
    return {
      n: index + 1,
      id: 'L' + (index + 1),
      title: NAMES[index],
      par: PAR[index],
      pushes: PAR[index] + 2,
      rows: rows,
      cells: rows.join('').split('')
    };
  });
  function fresh(level) {
    return {
      cells: level.cells.slice(),
      pushesLeft: level.pushes,
      used: 0,
      undos: 0,
      hintUsed: false,
      won: false,
      failed: false,
      reason: '',
      history: []
    };
  }
  function snapshot(state) {
    return {
      cells: state.cells.slice(),
      pushesLeft: state.pushesLeft,
      used: state.used,
      undos: state.undos,
      hintUsed: state.hintUsed
    };
  }
  function judge(state, minF) {
    if (standingCount(state.cells) === 0) {
      state.won = true;
      state.failed = false;
      state.reason = '';
      return 'win';
    }
    if (state.pushesLeft <= 0) {
      state.won = false;
      state.failed = true;
      state.reason = 'pushes';
      return 'pushes';
    }
    if (minF(state.cells) > state.pushesLeft) {
      state.won = false;
      state.failed = true;
      state.reason = 'stuck';
      return 'stuck';
    }
    state.won = false;
    state.failed = false;
    state.reason = '';
    return 'play';
  }
  function commit(state, p, d, minF) {
    if (state.won || state.reason === 'pushes') return { ok: false, reason: 'over' };
    var legal = moves(state.cells).some(function (m) { return m[0] === p && m[1] === d; });
    if (!legal) return { ok: false, reason: 'illegal' };
    var prev = snapshot(state);
    var result = push(state.cells, p, d);
    state.history.push(prev);
    state.cells = result.g;
    state.used++;
    state.pushesLeft--;
    state.failed = false;
    state.reason = '';
    var outcome = judge(state, minF);
    return { ok: true, result: result, outcome: outcome };
  }
  function undo(state, minF) {
    if (!state.history.length || state.pushesLeft <= 0 || state.won || state.reason === 'pushes') return { ok: false };
    var prev = state.history.pop();
    state.cells = prev.cells;
    state.undos = prev.undos + 1;
    state.used = prev.used + 2;
    state.pushesLeft = prev.pushesLeft - 2;
    state.won = false;
    var outcome = judge(state, minF);
    return { ok: true, outcome: outcome };
  }
  function starsFor(level, state) {
    if (!state.won) return 0;
    if (state.used === level.par && state.undos === 0 && !state.hintUsed) return 3;
    if (state.pushesLeft >= 1) return 2;
    return 1;
  }
  function hintMove(g, minF) {
    var need = minF(g);
    if (need === Infinity) return null;
    var list = moves(g);
    for (var i = 0; i < list.length; i++) {
      if (1 + minF(push(g, list[i][0], list[i][1]).g) === need) return list[i];
    }
    return null;
  }
  function loadBearing(level) {
    var base = solve(level.cells.slice(), 9).par;
    var flags = [];
    for (var i = 0; i < level.cells.length; i++) {
      if (!(level.cells[i] in ELB) && !(level.cells[i] in SPL)) continue;
      var altered = level.cells.slice();
      altered[i] = '.';
      var next = solve(altered, 9).par;
      flags.push({ i: i, piece: level.cells[i], par: next, needed: !(next <= base) });
    }
    return { base: base, pieces: flags };
  }

  root.KnockLogic = {
    W: W,
    H: H,
    DX: DX,
    DY: DY,
    ELB: ELB,
    SPL: SPL,
    LEVELS: LEVELS,
    isPiece: isPiece,
    isDom: isDom,
    standingCount: standingCount,
    canFall: canFall,
    moves: moves,
    push: push,
    solve: solve,
    makeMin: makeMin,
    pinned: pinned,
    pinnedAt: pinnedAt,
    POLICIES: POLICIES,
    support: support,
    exactPolicy: exactPolicy,
    play: play,
    runPolicy: runPolicy,
    hintWorst: hintWorst,
    rng: rng,
    fresh: fresh,
    commit: commit,
    undo: undo,
    judge: judge,
    starsFor: starsFor,
    hintMove: hintMove,
    loadBearing: loadBearing
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
