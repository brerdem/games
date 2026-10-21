(function (root) {
  // Spillproof rules. Water is an integer waterline per pipe group: every cell
  // at or below that row is water (row 0 is the top). A value of R means empty.
  // The solver and the D1–D7 policies are the sandbox reference, ported as-is.

  var LEVELS = [{"level":1,"title":"First Pour","size":[5,5],"grid":["AAAAB","ACCCB","DCCEB","DEEEF","DDDFF"],"pipes":[],"rowClues":[4,1,4,4,5],"colClues":[5,4,4,3,2],"ducks":[[3,1]],"solutionFirstWaterRow":{"A":0,"B":2,"C":2,"D":2,"E":3,"F":4}},{"level":2,"title":"Two Gauges","size":[5,5],"grid":["AABBB","CABBB","CCBDE","CCDDE","FFFDD"],"pipes":[],"rowClues":[2,2,3,3,2],"colClues":[4,4,1,1,2],"ducks":[],"solutionFirstWaterRow":{"A":0,"B":2,"C":1,"D":4,"E":3,"F":5}},{"level":3,"title":"Hidden Floor","size":[6,6],"grid":["AABCDD","AABCCC","EABFFF","EGBFFH","EGIIIH","EIIJJH"],"pipes":[],"rowClues":[2,3,1,2,2,2],"colClues":[1,1,2,1,2,5],"ducks":[],"solutionFirstWaterRow":{"A":3,"B":2,"C":1,"D":0,"E":5,"F":4,"G":4,"H":3,"I":6,"J":6}},{"level":4,"title":"Blind Row","size":[6,6],"grid":["AAABCC","ADEBFF","GDEEHH","GDDHHI","GJKKLI","JJKKLI"],"pipes":[],"rowClues":[2,null,2,4,2,null],"colClues":[3,3,3,4,2,2],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":1,"C":0,"D":3,"E":2,"F":2,"G":4,"H":3,"I":5,"J":4,"K":5,"L":6}},{"level":5,"title":"First Pipe","size":[7,7],"grid":["AABBBCC","AABDBCC","EEDDFFC","GHHDDFF","GIIDJKK","LMMJJKN","LLMJJKN"],"pipes":[["I","N"]],"rowClues":[3,4,1,2,2,3,null],"colClues":[2,3,4,3,4,1,null],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":0,"C":2,"D":5,"E":3,"F":3,"G":5,"H":4,"I":4,"J":5,"K":7,"L":6,"M":6,"N":4}},{"level":6,"title":"Long Pipe","size":[7,7],"grid":["AABBCCD","EBBBCCD","EEFBCDD","GEFHHDI","GEFJJJI","KKLJMMN","KLLLMMN"],"pipes":[["I","L"]],"rowClues":[4,4,5,null,4,null,6],"colClues":[3,6,5,6,null,4,4],"ducks":[],"solutionFirstWaterRow":{"A":0,"B":0,"C":3,"D":1,"E":2,"F":4,"G":4,"H":3,"I":4,"J":5,"K":7,"L":4,"M":5,"N":6}},{"level":7,"title":"Short Fuse","size":[7,7],"grid":["AAABBCD","AEFFBCD","GEHIIJK","GEHHJJK","LMMMNOO","LLMNNOO","LLLPPOO"],"pipes":[["O","D"]],"rowClues":[null,3,3,3,null,3,null],"colClues":[null,4,3,5,3,3,null],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":2,"C":0,"D":6,"E":1,"F":2,"G":4,"H":3,"I":2,"J":4,"K":4,"L":7,"M":4,"N":5,"O":6,"P":6}},{"level":8,"title":"Twin Pipes","size":[7,7],"grid":["AABCCCD","AABCEDD","AFBBEDD","GFHIEJD","GKHIJJL","MKHINNL","MKHHNNL"],"pipes":[["F","N"],["M","J"]],"rowClues":[null,4,5,2,2,3,7],"colClues":[4,4,null,null,null,4,4],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":2,"C":2,"D":1,"E":3,"F":5,"G":4,"H":6,"I":6,"J":6,"K":4,"L":6,"M":6,"N":5}},{"level":9,"title":"Cross Current","size":[7,7],"grid":["AACCCCD","AABCEDD","AFBBEDD","GFHIEJD","GKHIJJL","MKHINNL","MKHNNNN"],"pipes":[["F","N"],["M","J"]],"rowClues":[null,4,5,2,2,3,7],"colClues":[4,4,null,null,null,4,4],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":2,"C":2,"D":1,"E":3,"F":5,"G":4,"H":6,"I":6,"J":6,"K":4,"L":6,"M":6,"N":5}},{"level":10,"title":"Deep Cistern","size":[8,8],"grid":["AABBCCDD","EEBBCCCD","EEBBFCGG","HEBIFJGG","HEKIJJGG","HKKIILMM","NNKOOLLP","NNKOOLPP"],"pipes":[["J","M"],["H","L"]],"rowClues":[null,null,3,4,4,null,4,6],"colClues":[null,3,3,3,4,4,null,4],"ducks":[],"solutionFirstWaterRow":{"A":0,"B":2,"C":2,"D":1,"E":5,"F":3,"G":3,"H":6,"I":5,"J":4,"K":7,"L":6,"M":4,"N":6,"O":7,"P":8}},{"level":11,"title":"Three Siphons","size":[8,8],"grid":["AAABBDDD","EEAABCCD","FFGGHHHI","FJGGKHLI","JJMKKHLL","NJMMKKLL","NOOMMPLQ","NOOOPPQQ"],"pipes":[["D","Q"],["A","J"],["I","E"]],"rowClues":[null,4,null,null,3,null,4,null],"colClues":[6,null,3,2,3,3,null,3],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":1,"C":2,"D":1,"E":4,"F":2,"G":4,"H":4,"I":4,"J":1,"K":5,"L":7,"M":7,"N":5,"O":6,"P":7,"Q":1}},{"level":12,"title":"Grand Cistern","size":[8,8],"grid":["AAABBCDD","EEAABCCD","FFGGHHHI","FJGGKHLI","FJMKKHLL","NJMMKKLL","NOOMMPLQ","NOOOPPQQ"],"pipes":[["D","Q"],["A","J"],["I","E"]],"rowClues":[null,4,null,null,3,null,4,null],"colClues":[6,null,3,2,3,3,null,3],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":1,"C":2,"D":1,"E":4,"F":2,"G":4,"H":4,"I":4,"J":1,"K":5,"L":7,"M":7,"N":5,"O":6,"P":7,"Q":1}}];

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function build(R, C, id, nTanks, links) {
    var par = [];
    for (var i = 0; i < nTanks; i++) par.push(i);
    function find(x) { return par[x] === x ? x : (par[x] = find(par[x])); }
    for (var L = 0; L < links.length; L++) par[find(links[L][0])] = find(links[L][1]);
    var gmap = new Map();
    var tankGroup = [];
    for (var t = 0; t < nTanks; t++) {
      var k = find(t);
      if (!gmap.has(k)) gmap.set(k, gmap.size);
      tankGroup[t] = gmap.get(k);
    }
    var G = gmap.size;
    var gcells = [];
    for (var g = 0; g < G; g++) gcells.push([]);
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) gcells[tankGroup[id[r][c]]].push([r, c]);
    var gvals = gcells.map(function (cs) {
      var rows = [];
      cs.forEach(function (cell) { if (rows.indexOf(cell[0]) < 0) rows.push(cell[0]); });
      rows.sort(function (a, b) { return a - b; });
      return rows.concat([rows[rows.length - 1] + 1]);
    });
    var tanksInGroup = [];
    for (var g2 = 0; g2 < G; g2++) tanksInGroup.push([]);
    for (var t2 = 0; t2 < nTanks; t2++) tanksInGroup[tankGroup[t2]].push(t2);
    return { R: R, C: C, id: id, nTanks: nTanks, tankGroup: tankGroup, G: G, gcells: gcells, gvals: gvals, links: links, tanksInGroup: tanksInGroup };
  }

  function contrib(rs, t) {
    var n = 0;
    for (var i = 0; i < rs.length; i++) if (rs[i] >= t) n++;
    return n;
  }

  function makeLines(P, clue) {
    var L = [];
    for (var r = 0; r < P.R; r++) if (clue.rows[r] != null) L.push({ kind: 'row', i: r, count: clue.rows[r], cells: range(P.C).map(function (c) { return [r, c]; }) });
    for (var c = 0; c < P.C; c++) if (clue.cols[c] != null) L.push({ kind: 'col', i: c, count: clue.cols[c], cells: range(P.R).map(function (r) { return [r, c]; }) });
    L.forEach(function (line) {
      var m = new Map();
      line.cells.forEach(function (cell) {
        var g = P.tankGroup[P.id[cell[0]][cell[1]]];
        if (!m.has(g)) m.set(g, []);
        m.get(g).push(cell[0]);
      });
      line.groups = [];
      m.forEach(function (rs, g) { line.groups.push({ g: g, rs: rs }); });
    });
    return L;
  }

  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  function initDomains(P, clue) {
    var D = P.gvals.map(function (v) { return new Set(v); });
    (clue.ducks || []).forEach(function (duck) {
      var g = P.tankGroup[P.id[duck[0]][duck[1]]];
      D[g] = new Set(Array.from(D[g]).filter(function (t) { return t === duck[0]; }));
    });
    return D;
  }

  function propT0(P, L, D) {
    var changed = true, any = false;
    while (changed) {
      changed = false;
      for (var li = 0; li < L.length; li++) {
        var line = L[li];
        var mn = 0, mx = 0, info = [];
        for (var gi = 0; gi < line.groups.length; gi++) {
          var group = line.groups[gi];
          var cs = Array.from(D[group.g]).map(function (t) { return contrib(group.rs, t); });
          var a = Math.min.apply(null, cs);
          var b = Math.max.apply(null, cs);
          mn += a; mx += b;
          info.push({ g: group.g, rs: group.rs, a: a, b: b });
        }
        if (mn > line.count || mx < line.count) return 'contra';
        if (mx === line.count && mn < mx) {
          info.forEach(function (x) {
            if (x.a < x.b) {
              D[x.g] = new Set(Array.from(D[x.g]).filter(function (t) { return contrib(x.rs, t) === x.b; }));
              changed = any = true;
            }
          });
        } else if (mn === line.count && mn < mx) {
          info.forEach(function (x) {
            if (x.a < x.b) {
              D[x.g] = new Set(Array.from(D[x.g]).filter(function (t) { return contrib(x.rs, t) === x.a; }));
              changed = any = true;
            }
          });
        }
      }
      for (var d = 0; d < D.length; d++) if (D[d].size === 0) return 'contra';
    }
    return any;
  }

  function propT1(P, L, D) {
    var changed = true, any = false;
    while (changed) {
      changed = false;
      for (var li = 0; li < L.length; li++) {
        var line = L[li];
        var gs = line.groups;
        var k = gs.length;
        var opts = gs.map(function (group) {
          return Array.from(D[group.g]).map(function (t) { return [t, contrib(group.rs, t)]; });
        });
        var fw = [new Set([0])];
        for (var i = 0; i < k; i++) {
          var s = new Set();
          fw[i].forEach(function (a) {
            opts[i].forEach(function (pair) { if (a + pair[1] <= line.count) s.add(a + pair[1]); });
          });
          fw.push(s);
        }
        if (!fw[k].has(line.count)) return 'contra';
        var bw = new Array(k + 1);
        bw[k] = new Set([0]);
        for (var j = k - 1; j >= 0; j--) {
          var back = new Set();
          bw[j + 1].forEach(function (a) {
            opts[j].forEach(function (pair) { if (a + pair[1] <= line.count) back.add(a + pair[1]); });
          });
          bw[j] = back;
        }
        for (var n = 0; n < k; n++) {
          var keep = opts[n].filter(function (pair) {
            var ok = false;
            fw[n].forEach(function (a) { if (bw[n + 1].has(line.count - a - pair[1])) ok = true; });
            return ok;
          }).map(function (pair) { return pair[0]; });
          if (keep.length < opts[n].length) {
            D[gs[n].g] = new Set(keep);
            changed = any = true;
            if (!keep.length) return 'contra';
          }
        }
      }
    }
    return any;
  }

  function cloneDomains(D) { return D.map(function (s) { return new Set(s); }); }
  function solved(D) { return D.every(function (s) { return s.size === 1; }); }

  function propT2(P, L, D) {
    var any = false;
    for (var g = 0; g < P.G; g++) {
      if (D[g].size < 2) continue;
      var values = Array.from(D[g]);
      for (var vi = 0; vi < values.length; vi++) {
        var v = values[vi];
        if (!D[g].has(v)) continue;
        var E = cloneDomains(D);
        E[g] = new Set([v]);
        if (propT1(P, L, E) === 'contra') {
          D[g].delete(v);
          any = true;
          if (propT1(P, L, D) === 'contra') return 'contra';
        }
      }
    }
    return any;
  }

  function grade(model) {
    var L = model.lines;
    var D = initDomains(model.P, model.clue);
    if (propT0(model.P, L, D) === 'contra') return { tier: -1 };
    if (solved(D)) return { tier: 0 };
    if (propT1(model.P, L, D) === 'contra') return { tier: -1 };
    if (solved(D)) return { tier: 1 };
    var rounds = 0;
    while (true) {
      var result = propT2(model.P, L, D);
      if (result === 'contra') return { tier: -1 };
      rounds++;
      if (solved(D)) return { tier: 2, rounds: rounds };
      if (!result) return { tier: 3 };
    }
  }

  function countSolutions(model, cap) {
    cap = cap || 2;
    var L = model.lines;
    var start = initDomains(model.P, model.clue);
    var n = 0;
    function rec(D) {
      if (n >= cap) return;
      if (propT1(model.P, L, D) === 'contra') return;
      if (solved(D)) { n++; return; }
      var best = -1, bs = 1e9;
      for (var g = 0; g < model.P.G; g++) if (D[g].size > 1 && D[g].size < bs) { bs = D[g].size; best = g; }
      if (best < 0) return;
      Array.from(D[best]).forEach(function (v) {
        var E = cloneDomains(D);
        E[best] = new Set([v]);
        rec(E);
      });
    }
    rec(start);
    return n;
  }

  function play(model, deduce, rand, opts) {
    opts = opts || {};
    var hearts = opts.hearts || 3;
    var guessRule = opts.guessRule || 'bottom';
    var P = model.P;
    var sol = model.sol;
    var L = model.lines;
    var D = initDomains(P, model.clue);
    var mistakes = 0, guesses = 0, steps = 0;
    function run() {
      if (deduce === 'none') return;
      propT0(P, L, D);
      if (deduce === 'T0') return;
      propT1(P, L, D);
      if (deduce === 'T1') return;
      while (propT2(P, L, D) === true) { /* keep probing */ }
    }
    while (steps++ < 500) {
      run();
      var unk = false;
      for (var g = 0; g < P.G; g++) if (Math.max.apply(null, Array.from(D[g])) > sol[g]) unk = true;
      if (!unk) return { win: true, mistakes: mistakes, guesses: guesses };
      var cand = [];
      for (var gg = 0; gg < P.G; gg++) {
        if (D[gg].size < 2) continue;
        var vals = Array.from(D[gg]).sort(function (a, b) { return a - b; });
        var rows = P.gvals[gg].slice(0, -1);
        for (var ri = 0; ri < rows.length; ri++) {
          var rr = rows[ri];
          if (rr >= vals[0] && rr < vals[vals.length - 1]) cand.push([gg, rr, vals]);
        }
      }
      if (!cand.length) return { win: false, mistakes: mistakes, guesses: guesses, stuck: true };
      var pick;
      if (guessRule === 'bottom') {
        cand.sort(function (a, b) { return b[1] - a[1] || b[2].length - a[2].length; });
        pick = cand[0];
      } else if (guessRule === 'prob') {
        var best = -1;
        cand.forEach(function (item) {
          var p = item[2].filter(function (t) { return t <= item[1]; }).length / item[2].length;
          if (p > best) { best = p; pick = item; }
        });
      } else if (guessRule === 'top') {
        cand.sort(function (a, b) { return a[1] - b[1]; });
        pick = cand[0];
      } else pick = cand[Math.floor(rand() * cand.length)];
      var pg = pick[0], pr = pick[1];
      guesses++;
      if (sol[pg] <= pr) D[pg] = new Set(Array.from(D[pg]).filter(function (t) { return t <= pr; }));
      else {
        mistakes++;
        D[pg] = new Set(Array.from(D[pg]).filter(function (t) { return t > pr; }));
        if (mistakes >= hearts) return { win: false, mistakes: mistakes, guesses: guesses };
      }
    }
    return { win: false, mistakes: mistakes, guesses: guesses, stuck: true };
  }

  function hintBit(model, rand) {
    var P = model.P;
    var sol = model.sol;
    var Lines = model.lines;
    var D = initDomains(P, model.clue);
    var m = 0, h = 0, steps = 0;
    while (steps++ < 500) {
      propT0(P, Lines, D);
      var known = true;
      for (var g = 0; g < P.G; g++) if (Math.max.apply(null, Array.from(D[g])) > sol[g]) known = false;
      if (known) return true;
      if (h < 1) {
        var hg = -1, bs = 1;
        D.forEach(function (d, i) { if (d.size > bs) { bs = d.size; hg = i; } });
        if (hg >= 0) {
          var v = Array.from(D[hg]).sort(function (a, b) { return a - b; });
          var r = v[Math.floor(v.length / 2) - 1];
          if (r == null) r = v[0];
          D[hg] = new Set(v.filter(function (t) { return sol[hg] <= r ? t <= r : t > r; }));
          h++;
          continue;
        }
      }
      var cands = [];
      for (var gg = 0; gg < P.G; gg++) {
        if (D[gg].size < 2) continue;
        var vals = Array.from(D[gg]).sort(function (a, b) { return a - b; });
        P.gvals[gg].slice(0, -1).forEach(function (rr) {
          if (rr >= vals[0] && rr < vals[vals.length - 1]) cands.push([gg, rr]);
        });
      }
      if (!cands.length) return false;
      var choice = cands[Math.floor(rand() * cands.length)];
      if (sol[choice[0]] <= choice[1]) D[choice[0]] = new Set(Array.from(D[choice[0]]).filter(function (t) { return t <= choice[1]; }));
      else {
        m++;
        D[choice[0]] = new Set(Array.from(D[choice[0]]).filter(function (t) { return t > choice[1]; }));
        if (m >= 3) return false;
      }
    }
    return false;
  }

  function compile(level) {
    var R = level.size[0], C = level.size[1];
    var id = level.grid.map(function (row) { return Array.from(row).map(function (ch) { return ch.charCodeAt(0) - 65; }); });
    var nTanks = 0;
    id.forEach(function (row) { row.forEach(function (t) { if (t + 1 > nTanks) nTanks = t + 1; }); });
    var links = (level.pipes || []).map(function (pair) { return [pair[0].charCodeAt(0) - 65, pair[1].charCodeAt(0) - 65]; });
    var P = build(R, C, id, nTanks, links);
    var sol = [];
    for (var g = 0; g < P.G; g++) sol.push(null);
    Object.keys(level.solutionFirstWaterRow).forEach(function (letter) {
      var tank = letter.charCodeAt(0) - 65;
      var group = P.tankGroup[tank];
      var value = level.solutionFirstWaterRow[letter];
      if (sol[group] != null && sol[group] !== value) throw new Error('piped tanks disagree in ' + level.title);
      sol[group] = value;
    });
    var clue = {
      rows: level.rowClues.slice(),
      cols: level.colClues.slice(),
      ducks: (level.ducks || []).map(function (d) { return d.slice(); }),
    };
    var groupAt = id.map(function (row, r) { return row.map(function (t) { return P.tankGroup[t]; }); });
    return {
      level: level,
      R: R,
      C: C,
      id: id,
      P: P,
      sol: sol,
      clue: clue,
      lines: makeLines(P, clue),
      groupAt: groupAt,
      letterAt: level.grid.map(function (row) { return Array.from(row); }),
    };
  }

  function cluesFromSolution(model) {
    var rows = [];
    var cols = [];
    for (var r = 0; r < model.R; r++) rows.push(0);
    for (var c = 0; c < model.C; c++) cols.push(0);
    for (var g = 0; g < model.P.G; g++) {
      model.P.gcells[g].forEach(function (cell) {
        if (cell[0] >= model.sol[g]) { rows[cell[0]]++; cols[cell[1]]++; }
      });
    }
    return { rows: rows, cols: cols };
  }

  function cellKey(r, c) { return r + ',' + c; }

  function freshState(model) {
    var committed = [];
    for (var g = 0; g < model.P.G; g++) {
      var vals = model.P.gvals[g];
      committed.push(vals[vals.length - 1]);
    }
    var state = { committed: committed, frost: {}, marks: {}, spills: 0, hintsUsed: 0, won: false, failed: false };
    applyAutoDry(model, state);
    return state;
  }

  function cloneState(state) {
    return {
      committed: state.committed.slice(),
      frost: Object.assign({}, state.frost),
      marks: Object.assign({}, state.marks),
      spills: state.spills,
      hintsUsed: state.hintsUsed,
      won: state.won,
      failed: state.failed,
    };
  }

  function waterCount(model, state, cells) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0], c = cells[i][1];
      if (r >= state.committed[model.groupAt[r][c]]) n++;
    }
    return n;
  }

  function satisfiedLines(model, state) {
    var out = [];
    model.lines.forEach(function (line) {
      if (waterCount(model, state, line.cells) === line.count) out.push(line.kind + line.i);
    });
    return out;
  }

  function applyAutoDry(model, state) {
    var added = [];
    model.lines.forEach(function (line) {
      if (waterCount(model, state, line.cells) !== line.count) return;
      line.cells.forEach(function (cell) {
        var r = cell[0], c = cell[1];
        if (r >= state.committed[model.groupAt[r][c]]) return;
        var key = cellKey(r, c);
        if (!state.frost[key]) {
          state.frost[key] = true;
          delete state.marks[key];
          added.push([r, c]);
        }
      });
    });
    return added;
  }

  function checkWin(model, state) {
    for (var g = 0; g < model.P.G; g++) if (state.committed[g] !== model.sol[g]) return false;
    return true;
  }

  function pour(model, state, r, c) {
    if (state.won || state.failed) return { state: state, event: 'blocked' };
    if (r < 0 || c < 0 || r >= model.R || c >= model.C) return { state: state, event: 'blocked' };
    var key = cellKey(r, c);
    if (state.frost[key]) return { state: state, event: 'known-dry' };
    var g = model.groupAt[r][c];
    var correct = model.sol[g] <= r;
    if (correct && state.committed[g] <= r) return { state: state, event: 'already' };
    var next = cloneState(state);
    var before = satisfiedLines(model, state);
    if (correct) {
      next.committed[g] = Math.min(state.committed[g], r);
      Object.keys(next.marks).forEach(function (mk) {
        var parts = mk.split(',');
        var mr = +parts[0], mc = +parts[1];
        if (model.groupAt[mr][mc] === g && mr >= next.committed[g]) delete next.marks[mk];
      });
    } else {
      next.spills = state.spills + 1;
      model.P.gcells[g].forEach(function (cell) {
        if (cell[0] <= r) {
          var fk = cellKey(cell[0], cell[1]);
          next.frost[fk] = true;
          delete next.marks[fk];
        }
      });
      if (next.spills >= 3) next.failed = true;
    }
    var dried = applyAutoDry(model, next);
    if (checkWin(model, next)) next.won = true;
    var after = {};
    satisfiedLines(model, next).forEach(function (id) { after[id] = true; });
    var popped = before.filter(function (id) { return !after[id]; });
    // before is the old satisfied list; new ones are in after but not before.
    var old = {};
    before.forEach(function (id) { old[id] = true; });
    popped = Object.keys(after).filter(function (id) { return !old[id]; });
    return {
      state: next,
      event: correct ? 'pour' : 'spill',
      correct: correct,
      group: g,
      row: r,
      col: c,
      dried: dried,
      popped: popped,
      linked: model.P.tanksInGroup[g].length > 1,
    };
  }

  function toggleMark(model, state, r, c) {
    if (state.won || state.failed) return state;
    if (r < 0 || c < 0 || r >= model.R || c >= model.C) return state;
    var key = cellKey(r, c);
    var g = model.groupAt[r][c];
    if (r >= state.committed[g] || state.frost[key]) return state;
    var next = cloneState(state);
    if (next.marks[key]) delete next.marks[key];
    else next.marks[key] = true;
    return next;
  }

  function knowledgeDomains(model, state) {
    var D = initDomains(model.P, model.clue);
    for (var g = 0; g < model.P.G; g++) {
      var cap = state.committed[g];
      D[g] = new Set(Array.from(D[g]).filter(function (t) { return t <= cap; }));
    }
    Object.keys(state.frost).forEach(function (key) {
      var parts = key.split(',');
      var r = +parts[0], c = +parts[1];
      var g = model.groupAt[r][c];
      D[g] = new Set(Array.from(D[g]).filter(function (t) { return t > r; }));
    });
    return D;
  }

  function proveCell(model, state) {
    var D0 = knowledgeDomains(model, state);
    var D = cloneDomains(D0);
    var L = model.lines;
    if (propT0(model.P, L, D) === 'contra') return null;
    if (propT1(model.P, L, D) === 'contra') return null;
    for (var guard = 0; guard < 8; guard++) {
      var result = propT2(model.P, L, D);
      if (result === 'contra') return null;
      if (result !== true) break;
    }
    var order = [];
    for (var g = 0; g < D.length; g++) order.push(g);
    order.sort(function (a, b) { return D0[b].size - D0[a].size; });
    for (var i = 0; i < order.length; i++) {
      var group = order[i];
      var proven = [];
      model.P.gcells[group].forEach(function (cell) {
        var r = cell[0], c = cell[1];
        var key = cellKey(r, c);
        var d0 = Array.from(D0[group]);
        var d1 = Array.from(D[group]);
        if (!d0.length || !d1.length) return;
        var wasWater = d0.every(function (t) { return t <= r; });
        var wasDry = state.frost[key] || d0.every(function (t) { return t > r; });
        if (wasWater || wasDry) return;
        var nowWater = d1.every(function (t) { return t <= r; });
        var nowDry = d1.every(function (t) { return t > r; });
        if (nowWater) proven.push({ r: r, c: c, g: group, kind: 'water' });
        else if (nowDry) proven.push({ r: r, c: c, g: group, kind: 'dry' });
      });
      if (!proven.length) continue;
      proven.sort(function (a, b) {
        if (a.kind !== b.kind) return a.kind === 'dry' ? -1 : 1;
        return b.r - a.r;
      });
      return proven[0];
    }
    return null;
  }

  function hint(model, state) {
    if (state.hintsUsed >= 1 || state.won || state.failed) return { state: state, cell: null };
    var cell = proveCell(model, state);
    if (!cell) return { state: state, cell: null };
    var next;
    if (cell.kind === 'water') {
      var poured = pour(model, state, cell.r, cell.c);
      next = cloneState(poured.state);
      if (poured.event === 'spill') return { state: state, cell: null, refused: true };
    } else {
      next = cloneState(state);
      var key = cellKey(cell.r, cell.c);
      next.frost[key] = true;
      delete next.marks[key];
      applyAutoDry(model, next);
      if (checkWin(model, next)) next.won = true;
    }
    next.hintsUsed = state.hintsUsed + 1;
    return { state: next, cell: cell };
  }

  function starsFor(state) {
    if (!state.won) return 0;
    if (state.spills === 0 && state.hintsUsed === 0) return 3;
    if (state.spills <= 1) return 2;
    return 1;
  }

  function gaugeView(model, state, preview) {
    function tally(cells, usePreview) {
      var n = 0;
      for (var i = 0; i < cells.length; i++) {
        var r = cells[i][0], c = cells[i][1];
        var g = model.groupAt[r][c];
        var line = state.committed[g];
        if (usePreview && preview && preview.g === g && preview.row < line) line = preview.row;
        if (r >= line) n++;
      }
      return n;
    }
    var rows = [];
    var cols = [];
    for (var r = 0; r < model.R; r++) {
      var cells = range(model.C).map(function (c) { return [r, c]; });
      rows.push({ clue: model.clue.rows[r], committed: tally(cells, false), ghost: tally(cells, true) });
    }
    for (var c = 0; c < model.C; c++) {
      var colCells = range(model.R).map(function (rr) { return [rr, c]; });
      cols.push({ clue: model.clue.cols[c], committed: tally(colCells, false), ghost: tally(colCells, true) });
    }
    return { rows: rows, cols: cols };
  }

  var MODELS = null;
  function models() {
    if (!MODELS) MODELS = LEVELS.map(compile);
    return MODELS;
  }

  function acceptance(seed) {
    var rand = rng(seed == null ? 2026 : seed);
    return models().map(function (model, index) {
      var d1 = 0;
      for (var s = 0; s < 30; s++) {
        var guess = s % 2 ? 'rand' : 'bottom';
        if (!play(model, 'none', rand, { guessRule: guess }).win) d1++;
      }
      var d2 = play(model, 'T0', rand, { guessRule: 'bottom' }).win;
      var d3 = play(model, 'T0', rand, { guessRule: 'prob' }).win;
      var d4 = play(model, 'T0', rand, { guessRule: 'top' }).win;
      var d5 = 0;
      for (var a = 0; a < 30; a++) if (!play(model, 'T0', rand, { guessRule: 'rand' }).win) d5++;
      var d7 = 0;
      for (var b = 0; b < 30; b++) if (!hintBit(model, rand)) d7++;
      var full = play(model, 'T2', rand, { guessRule: 'rand' });
      var pipes = (model.level.pipes || []).length;
      var needed = 0;
      for (var p = 0; p < pipes; p++) {
        var cut = Object.assign({}, model.level, { pipes: model.level.pipes.filter(function (_, j) { return j !== p; }) });
        if (countSolutions(compile(cut)) !== 1) needed++;
      }
      return {
        level: index + 1,
        title: model.level.title,
        tier: grade(model).tier,
        unique: countSolutions(model),
        d1fail: d1,
        d2: d2,
        d3: d3,
        d4: d4,
        d5fail: d5,
        d7fail: d7,
        p1guesses: full.guesses,
        p1win: full.win,
        p1spills: full.mistakes,
        pipesNeeded: needed,
        pipes: pipes,
      };
    });
  }

  function uncertainty(model) {
    var D = initDomains(model.P, model.clue);
    var lineset = model.lines;
    if (propT0(model.P, lineset, D) === 'contra') return { groups: 0, cells: 0 };
    if (propT1(model.P, lineset, D) === 'contra') return { groups: 0, cells: 0 };
    var groups = 0;
    var cells = 0;
    for (var g = 0; g < model.P.G; g++) {
      if (D[g].size < 2) continue;
      groups++;
      var vals = Array.from(D[g]).sort(function (a, b) { return a - b; });
      var rows = model.P.gvals[g].slice(0, -1);
      for (var i = 0; i < rows.length; i++) if (rows[i] >= vals[0] && rows[i] < vals[vals.length - 1]) cells++;
    }
    return { groups: groups, cells: cells };
  }

  function trapScore(model) {
    var D = initDomains(model.P, model.clue);
    var lineset = model.lines;
    if (propT0(model.P, lineset, D) === 'contra') return { groups: 0, cells: 0, correct: 0 };
    if (propT1(model.P, lineset, D) === 'contra') return { groups: 0, cells: 0, correct: 0 };
    var groups = 0;
    var cells = 0;
    var correct = 0;
    for (var g = 0; g < model.P.G; g++) {
      if (D[g].size < 2) continue;
      groups++;
      var vals = Array.from(D[g]).sort(function (a, b) { return a - b; });
      var rows = model.P.gvals[g].slice(0, -1);
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row >= vals[0] && row < vals[vals.length - 1]) {
          cells++;
          if (model.sol[g] <= row) correct++;
        }
      }
    }
    return { groups: groups, cells: cells, correct: correct };
  }

  function singleLine(seed, runs) {
    var rand = rng(seed == null ? 20261020 : seed);
    runs = runs || 300;
    return models().map(function (model, index) {
      var zero = 0, wins = 0;
      for (var n = 0; n < runs; n++) {
        var result = play(model, 'T1', rand, { guessRule: 'rand' });
        if (result.win) {
          wins++;
          if (result.mistakes === 0) zero++;
        }
      }
      return { level: index + 1, zero: zero, wins: wins, runs: runs };
    });
  }

  function luck(seed, runs) {
    var rand = rng(seed == null ? 77 : seed);
    runs = runs || 300;
    return models().map(function (model, index) {
      var zero = 0, wins = 0;
      for (var n = 0; n < runs; n++) {
        var result = play(model, 'T0', rand, { guessRule: 'rand' });
        if (result.win) {
          wins++;
          if (result.mistakes === 0) zero++;
        }
      }
      return { level: index + 1, zero: zero, wins: wins, runs: runs };
    });
  }

  function loadLevels(data) { LEVELS = data; MODELS = null; }

  root.SpillLogic = {
    LEVELS: LEVELS,
    loadLevels: loadLevels,
    rng: rng,
    compile: compile,
    grade: grade,
    countSolutions: countSolutions,
    play: play,
    hintBit: hintBit,
    cluesFromSolution: cluesFromSolution,
    freshState: freshState,
    pour: pour,
    toggleMark: toggleMark,
    hint: hint,
    proveCell: proveCell,
    starsFor: starsFor,
    gaugeView: gaugeView,
    acceptance: acceptance,
    luck: luck,
    uncertainty: uncertainty,
    trapScore: trapScore,
    singleLine: singleLine,
    models: models,
    cellKey: cellKey,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
