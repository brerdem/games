(function (root) {
  var WAX = -1;
  var W = 6;
  var H = 8;
  var CHAR = { '.': 0, R: 1, Y: 2, B: 4, O: 3, G: 6, P: 5, M: 7, '#': -1 };
  var NAMES = ['First Blot', 'Two Hops', "Don't Rush", 'Green Thumb', 'Purple Band', 'Ladder', 'Bounce Back', 'Echo', 'Long Echo', 'Wax Seal', 'Resist', 'Grand Print'];
  var RAW = [
    { id: 'L1', par: 1, presses: 3, creases: ['V3'], start: ['......', '.R....', '......', '..R...', '......', 'B.....', '......', '......'], target: ['......', '.R..R.', '......', '..RR..', '......', 'B....B', '......', '......'] },
    { id: 'L2', par: 2, presses: 4, creases: ['H3', 'H4'], start: ['.....R', '.....B', '......', '......', '..Y...', '......', '......', '......'], target: ['.....R', '..Y..B', '..Y...', '..Y...', '..Y..B', '.....R', '.....B', '.....R'] },
    { id: 'L3', par: 2, presses: 4, creases: ['V3', 'V4'], start: ['....RR', '......', '......', '......', '......', '.R....', '......', '......'], target: ['RRRRRR', '......', '......', '......', '......', '.R..R.', '......', '......'] },
    { id: 'L4', par: 3, presses: 5, creases: ['H1', 'H2', 'H4'], start: ['YR....', 'B.....', '......', '.....R', '......', '......', '......', '......'], target: ['GR...R', 'GR....', 'GR....', 'GR...R', '.....R', '......', 'B.....', 'YR....'] },
    { id: 'L5', par: 3, presses: 5, creases: ['V2', 'V4', 'V5'], start: ['R.....', '......', '......', '......', '......', '......', '....BR', '...R..'], target: ['R..R..', '......', '......', '......', '......', '......', 'PPPPPP', 'R..RR.'] },
    { id: 'L6', par: 3, presses: 5, creases: ['H3', 'H4', 'H7'], start: ['......', '......', '..Y...', '......', '..B...', '....R.', '......', '...R..'], target: ['...RR.', '..B...', '..Y.R.', '..G...', '..G...', '..Y.R.', '..BRR.', '..BRR.'] },
    { id: 'L7', par: 5, presses: 7, creases: ['V1', 'V2', 'V4', 'V5'], start: ['B.....', '...R.B', 'B.....', '......', '......', '......', '....R.', '......'], target: ['BB.BB.', 'PPBPPB', 'BB.BB.', '......', '......', '......', 'RRRRRR', '......'] },
    { id: 'L8', par: 5, presses: 7, creases: ['H1', 'H2', 'H4', 'H5'], start: ['....R.', '.R....', '......', '......', '..R...', '......', '..B...', '......'], target: ['.RP.R.', '.RP.R.', '.RP...', '..P.R.', '..P.R.', '.RR...', '.RB...', '..B.R.'] },
    { id: 'L9', par: 6, presses: 8, creases: ['H1', 'H5', 'H6', 'H7'], start: ['...Y..', '......', '.....B', '......', '..R...', '......', '..Y...', '....Y.'], target: ['...Y..', '...Y..', '..O.YB', '..Y.Y.', '..O.YB', '..O.YB', '..O.YB', '..O.YB'] },
    { id: 'L10', par: 6, presses: 8, creases: ['V4', 'H2', 'H5', 'H6', 'H7'], start: ['.....#', 'R..RY.', '...#..', '..Y...', '......', '.....B', '......', '.....B'], target: ['..Y..#', 'R.BOOB', 'R.B#YB', '..G..G', '..B..B', '..G..G', '..G..G', '..G..G'] },
    { id: 'L11', par: 6, presses: 8, creases: ['V5', 'H1', 'H2', 'H4', 'H5'], start: ['..B...', '....B.', '.....#', '......', '......', '..#...', '..Y..Y', '..B..B'], target: ['..B.BB', '..G.GG', '..G.B#', '..G.GG', '..B.BB', '..#.BB', '..G.GG', '..G.BB'] },
    { id: 'L12', par: 6, presses: 8, creases: ['V2', 'H1', 'H2', 'H4', 'H6'], start: ['..#...', '....R.', '......', '..R.#Y', '......', '.Y....', '..B.B.', '......'], target: ['.Y#.PY', '.GG.P.', '.GG.P.', '.OO.#Y', '.RR..Y', '.GG.P.', '.GG.P.', '.RR..Y'] }
  ];

  function parseCrease(code) {
    return { o: code.charAt(0), k: +code.slice(1), id: code };
  }

  function parseGrid(rows) {
    var cells = [];
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) cells.push(CHAR[rows[y].charAt(x)]);
    }
    return cells;
  }

  var LEVELS = RAW.map(function (row, index) {
    return {
      n: index + 1,
      id: row.id,
      title: NAMES[index],
      par: row.par,
      presses: row.presses,
      creases: row.creases.map(parseCrease),
      start: parseGrid(row.start),
      target: parseGrid(row.target),
      W: W,
      H: H
    };
  });

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function pairs(w, h, c) {
    var P = [];
    if (c.o === 'V') {
      var n = Math.min(c.k, w - c.k);
      for (var y = 0; y < h; y++) for (var i = 0; i < n; i++) P.push([y * w + (c.k - 1 - i), y * w + (c.k + i)]);
    } else {
      var m = Math.min(c.k, h - c.k);
      for (var x = 0; x < w; x++) for (var j = 0; j < m; j++) P.push([(c.k - 1 - j) * w + x, (c.k + j) * w + x]);
    }
    return P;
  }

  function fold(st, P) {
    var s = st.slice();
    for (var i = 0; i < P.length; i++) {
      var a = P[i][0];
      var b = P[i][1];
      if (st[a] === WAX || st[b] === WAX) continue;
      var u = st[a] | st[b];
      s[a] = u;
      s[b] = u;
    }
    return s;
  }

  function violates(s, T) {
    for (var i = 0; i < s.length; i++) {
      if (s[i] === WAX) continue;
      if (s[i] & ~T[i]) return true;
    }
    return false;
  }

  function eq(s, T) {
    for (var i = 0; i < s.length; i++) if (s[i] !== T[i]) return false;
    return true;
  }

  function changedCount(a, b) {
    var n = 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  }

  function smudgeCells(next, target) {
    var out = [];
    for (var i = 0; i < next.length; i++) {
      if (next[i] === WAX) continue;
      if (next[i] & ~target[i]) out.push(i);
    }
    return out;
  }

  function compile(level) {
    return {
      level: level,
      PP: level.creases.map(function (c) { return pairs(level.W, level.H, c); })
    };
  }

  function analyse(level) {
    var model = compile(level);
    var PP = model.PP;
    var target = level.target;
    var memo = new Map();
    function dt(s) {
      var k = s.join(',');
      if (memo.has(k)) return memo.get(k);
      if (eq(s, target)) { memo.set(k, 0); return 0; }
      memo.set(k, Infinity);
      var best = Infinity;
      for (var i = 0; i < PP.length; i++) {
        var t = fold(s, PP[i]);
        if (violates(t, target) || eq(t, s)) continue;
        best = Math.min(best, 1 + dt(t));
      }
      memo.set(k, best);
      return best;
    }
    var par = dt(level.start);
    if (par === Infinity) par = -1;
    return { par: par, PP: PP, dt: dt };
  }

  function play(level, analysis, policy, rand) {
    var budget = analysis.par + 2;
    var s = level.start.slice();
    var used = 0;
    var sm = 0;
    var creases = level.creases;
    while (used < budget) {
      if (eq(s, level.target)) break;
      var res = analysis.PP.map(function (P, i) {
        var t = fold(s, P);
        return { i: i, t: t, bad: violates(t, level.target), chg: changedCount(t, s) };
      });
      var live = res.filter(function (r) { return r.chg > 0; });
      var safe = live.filter(function (r) { return !r.bad; });
      if (!safe.length) return { win: false, sm: sm, used: used, stuck: true, stars: 0 };
      var cand = safe;
      var flap = function (i) {
        var c = creases[i];
        return c.o === 'V' ? Math.min(c.k, level.W - c.k) : Math.min(c.k, level.H - c.k);
      };
      var by = function (f, dir) {
        var v = cand.map(f);
        var b = dir > 0 ? Math.max.apply(null, v) : Math.min.apply(null, v);
        cand = cand.filter(function (r, j) { return v[j] === b; });
      };
      switch (policy) {
        case 'RAND': cand = live; break;
        case 'SAFE1': break;
        case 'SAFE2': {
          var ok = cand.filter(function (r) {
            if (eq(r.t, level.target)) return true;
            for (var p = 0; p < analysis.PP.length; p++) {
              var u = fold(r.t, analysis.PP[p]);
              if (!violates(u, level.target) && !eq(u, r.t)) return true;
            }
            return false;
          });
          if (ok.length) cand = ok;
          break;
        }
        case 'MINCHG': by(function (r) { return r.chg; }, -1); break;
        case 'MAXCHG': by(function (r) { return r.chg; }, 1); break;
        case 'OUTER': by(function (r) { return flap(r.i); }, -1); break;
        case 'INNER': by(function (r) { return flap(r.i); }, 1); break;
        case 'VFIRST': by(function (r) { return creases[r.i].o === 'V' ? 1 : 0; }, 1); break;
        case 'HFIRST': by(function (r) { return creases[r.i].o === 'H' ? 1 : 0; }, 1); break;
        case 'FRESH': {
          var cnt = {};
          (s._u || []).forEach(function (i) { cnt[i] = (cnt[i] || 0) + 1; });
          by(function (r) { return -(cnt[r.i] || 0); }, 1);
          break;
        }
        case 'OPT': by(function (r) { return analysis.dt(r.t); }, -1); break;
        default: break;
      }
      var pick = cand[Math.floor(rand() * cand.length)];
      used++;
      if (pick.bad) { sm++; continue; }
      var hist = (s._u || []).concat([pick.i]);
      s = pick.t;
      s._u = hist;
    }
    var win = eq(s, level.target);
    var left = analysis.par + 2 - used;
    var stars = win ? (left >= 2 ? 3 : left >= 1 ? 2 : 1) : 0;
    return { win: win, sm: sm, used: used, stars: stars, stuck: false };
  }

  function playHinted(level, analysis, policy, rand, hintAt) {
    var budget = analysis.par + 2;
    var s = level.start.slice();
    var used = 0;
    while (used < budget && !eq(s, level.target)) {
      var res = analysis.PP.map(function (P, i) {
        var t = fold(s, P);
        return { i: i, t: t, bad: violates(t, level.target), chg: changedCount(t, s) };
      }).filter(function (r) { return r.chg > 0; });
      var safe = res.filter(function (r) { return !r.bad; });
      if (!safe.length) return { win: false, used: used, stars: 0 };
      var cand = safe;
      if (used === hintAt) {
        var d = analysis.dt(s);
        if (d === Infinity) return { win: false, used: used, stars: 0 };
        var best = safe.filter(function (r) { return analysis.dt(r.t) === d - 1; });
        if (best.length) cand = best;
      } else if (policy === 'SAFE2') {
        var ok = cand.filter(function (r) {
          if (eq(r.t, level.target)) return true;
          for (var p = 0; p < analysis.PP.length; p++) {
            var u = fold(r.t, analysis.PP[p]);
            if (!violates(u, level.target) && !eq(u, r.t)) return true;
          }
          return false;
        });
        if (ok.length) cand = ok;
      }
      var pick = cand[Math.floor(rand() * cand.length)];
      s = pick.t;
      used++;
    }
    var win = eq(s, level.target);
    var left = analysis.par + 2 - used;
    var stars = 0;
    if (win) stars = left >= 2 ? 2 : left >= 1 ? 2 : 1;
    if (win && left === 0) stars = 1;
    if (win && left === 1) stars = 2;
    if (win && left >= 2) stars = 2;
    return { win: win, used: used, stars: stars, hinted: true };
  }

  function onceSolvable(level) {
    var PP = level.creases.map(function (c) { return pairs(level.W, level.H, c); });
    var n = PP.length;
    var seen = new Set();
    function rec(s, used) {
      if (eq(s, level.target)) return true;
      var k = used + ':' + s.join(',');
      if (seen.has(k)) return false;
      seen.add(k);
      for (var i = 0; i < n; i++) {
        if (used >> i & 1) continue;
        var t = fold(s, PP[i]);
        if (violates(t, level.target)) continue;
        if (rec(t, used | 1 << i)) return true;
      }
      return false;
    }
    return rec(level.start, 0);
  }

  function necessity(level) {
    var base = analyse(level).par;
    var creases = [];
    for (var i = 0; i < level.creases.length; i++) {
      var cut = Object.assign({}, level, { creases: level.creases.filter(function (_, j) { return j !== i; }) });
      creases.push(analyse(cut).par === -1);
    }
    var wax = [];
    level.start.forEach(function (v, j) {
      if (v !== WAX) return;
      var st = level.start.slice();
      var tg = level.target.slice();
      st[j] = 0;
      tg[j] = 0;
      var altered = Object.assign({}, level, { start: st, target: tg });
      wax.push(analyse(altered).par !== base);
    });
    return { creases: creases, wax: wax, par: base };
  }

  function freshState(level) {
    return {
      cells: level.start.slice(),
      pressesLeft: level.presses,
      hintUsed: false,
      history: [],
      counts: level.creases.map(function () { return 0; }),
      won: false,
      failed: false,
      reason: ''
    };
  }

  function options(level, cells) {
    var PP = level.creases.map(function (c) { return pairs(level.W, level.H, c); });
    return PP.map(function (P, i) {
      var next = fold(cells, P);
      var badCells = smudgeCells(next, level.target);
      return {
        i: i,
        id: level.creases[i].id,
        next: next,
        bad: badCells.length > 0,
        badCells: badCells,
        chg: changedCount(next, cells)
      };
    });
  }

  function preview(level, cells, index) {
    return options(level, cells)[index];
  }

  function stuck(level, cells) {
    var opts = options(level, cells);
    for (var i = 0; i < opts.length; i++) if (opts[i].chg > 0 && !opts[i].bad) return false;
    return true;
  }

  function starsFor(level, state) {
    if (!state.won) return 0;
    var left = state.pressesLeft;
    if (left >= 2 && !state.hintUsed) return 3;
    if (left >= 1) return 2;
    return 1;
  }

  function finish(level, state) {
    if (eq(state.cells, level.target)) {
      state.won = true;
      state.failed = false;
      state.reason = 'win';
      return 'win';
    }
    if (state.pressesLeft <= 0) {
      state.failed = true;
      state.reason = 'presses';
      return 'presses';
    }
    if (stuck(level, state.cells)) {
      state.failed = true;
      state.reason = 'stuck';
      return 'stuck';
    }
    return 'ok';
  }

  function applyFold(level, state, index) {
    if (state.won || state.failed || state.pressesLeft <= 0) return { state: state, event: 'blocked' };
    var view = preview(level, state.cells, index);
    var next = freshState(level);
    next.cells = state.cells.slice();
    next.pressesLeft = state.pressesLeft - 1;
    next.hintUsed = state.hintUsed;
    next.history = state.history.concat([state.cells.slice()]);
    next.counts = state.counts.slice();
    next.counts[index]++;
    if (view.bad) {
      var event = finish(level, next);
      return { state: next, event: event === 'ok' ? 'smudge' : event, preview: view, smudgeCells: view.badCells };
    }
    next.cells = view.next;
    var done = finish(level, next);
    return { state: next, event: done === 'ok' ? (view.chg ? 'fold' : 'noop') : done, preview: view, smudgeCells: view.badCells, rebound: state.counts[index] > 0 && view.chg > 0 };
  }

  function undo(level, state) {
    if (state.won || state.pressesLeft <= 0 || !state.history.length) return { state: state, event: 'blocked' };
    if (state.failed && state.reason !== 'stuck') return { state: state, event: 'blocked' };
    var next = freshState(level);
    next.cells = state.history[state.history.length - 1].slice();
    next.pressesLeft = state.pressesLeft - 1;
    next.hintUsed = state.hintUsed;
    next.history = state.history.slice(0, -1);
    next.counts = state.counts.slice();
    var event = finish(level, next);
    return { state: next, event: event === 'ok' ? 'undo' : event };
  }

  function useHint(level, state) {
    if (state.hintUsed || state.won || state.failed) return { state: state, crease: null, dead: false };
    var analysis = analyse(level);
    var d = analysis.dt(state.cells);
    var next = freshState(level);
    next.cells = state.cells.slice();
    next.pressesLeft = state.pressesLeft;
    next.hintUsed = true;
    next.history = state.history.map(function (row) { return row.slice(); });
    next.counts = state.counts.slice();
    next.won = state.won;
    next.failed = state.failed;
    if (d === Infinity || d < 0) return { state: next, crease: null, dead: true };
    var opts = options(level, state.cells).filter(function (opt) { return opt.chg > 0 && !opt.bad && analysis.dt(opt.next) === d - 1; });
    return { state: next, crease: opts.length ? opts[0].i : null, dead: !opts.length };
  }

  function replay(level, codes) {
    var state = freshState(level);
    var events = [];
    for (var i = 0; i < codes.length; i++) {
      var index = level.creases.findIndex(function (c) { return c.id === codes[i]; });
      var result = applyFold(level, state, index);
      state = result.state;
      events.push(result.event);
    }
    return { state: state, events: events };
  }

  root.FoldLogic = {
    WAX: WAX,
    W: W,
    H: H,
    LEVELS: LEVELS,
    rng: rng,
    pairs: pairs,
    fold: fold,
    violates: violates,
    eq: eq,
    smudgeCells: smudgeCells,
    compile: compile,
    analyse: analyse,
    play: play,
    playHinted: playHinted,
    onceSolvable: onceSolvable,
    necessity: necessity,
    freshState: freshState,
    options: options,
    preview: preview,
    stuck: stuck,
    starsFor: starsFor,
    applyFold: applyFold,
    undo: undo,
    useHint: useHint,
    replay: replay
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
