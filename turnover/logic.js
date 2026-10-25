(function (root) {
  var CAP = 4;
  var SPATULA = 3;
  var NAMES = ['First Flip', 'Reverse Two', 'Burnt Side', 'Second Turn', 'Both Sides', 'Matcha', 'Spare Plate', 'Triple Stack', 'Long Order', 'Last Call'];
  var PACK = [
    { sided: 'none', par: 3, plates: [[0], [2], [2, 0, 0, 2]], ref: [[3, 1, 2], [3, 2, 1], [2, 2, 3]] },
    { sided: 'none', par: 5, plates: [[], [0, 2], [2, 0, 2, 0]], ref: [[2, 1, 1], [3, 1, 2], [3, 1, 1], [3, 1, 2], [1, 2, 3]] },
    { sided: '1', par: 3, plates: [[0], [0, 0, 2, 2], [3]], ref: [[2, 2, 3], [1, 1, 2], [3, 3, 1]] },
    { sided: '1', par: 5, plates: [[0], [0, 2], [3, 2, 0]], ref: [[3, 2, 1], [1, 1, 2], [2, 2, 3], [1, 2, 2], [3, 3, 1]] },
    { sided: 'all', par: 5, plates: [[1, 1, 3, 1], [2], [2]], ref: [[1, 1, 2], [1, 1, 3], [2, 2, 1], [1, 1, 3], [1, 3, 2]] },
    { sided: '2', par: 6, plates: [[0, 2, 2, 2], [0, 5, 0], [4], [4]], ref: [[1, 3, 3], [2, 1, 1], [4, 1, 2], [3, 3, 4], [2, 2, 3], [1, 2, 2]] },
    { sided: '1,2', par: 7, plates: [[0], [0, 3, 3, 0], [4], [4, 5, 3]], ref: [[2, 1, 1], [3, 1, 1], [2, 2, 3], [4, 2, 3], [3, 1, 1], [1, 2, 4], [1, 2, 2]] },
    { sided: 'all', par: 7, plates: [[2], [2, 1, 3], [4, 5, 0, 0], [5]], ref: [[2, 1, 1], [3, 2, 2], [1, 2, 3], [2, 3, 1], [3, 3, 2], [2, 1, 4], [4, 2, 3]] },
    { sided: 'all', par: 8, plates: [[3], [3], [3, 5, 5, 1], [4, 1, 0]], ref: [[1, 1, 4], [3, 1, 1], [4, 2, 2], [2, 1, 1], [4, 1, 1], [3, 3, 4], [4, 1, 2], [2, 3, 3]] },
    { sided: 'all', par: 9, plates: [[2, 0, 5, 1], [3], [5, 0], [5, 3]], ref: [[1, 1, 3], [2, 1, 1], [1, 1, 4], [1, 2, 2], [3, 2, 2], [4, 3, 1], [1, 1, 3], [2, 3, 4], [3, 2, 2]] }
  ];

  function sidedSet(sd) {
    if (sd === 'all') return null;
    if (sd === 'none') return {};
    var set = {};
    sd.split(',').forEach(function (part) { set[+part] = true; });
    return set;
  }

  function twoSided(flavour, sided) {
    return sided === null || !!sided[flavour];
  }

  function clone(plates) {
    return plates.map(function (plate) { return plate.slice(); });
  }

  function canonKey(plates) {
    var parts = [];
    for (var i = 0; i < plates.length; i++) parts.push(plates[i].join(','));
    parts.sort();
    return parts.join('|');
  }

  function legalMoves(plates) {
    var out = [];
    var p = plates.length;
    var i, d, j, len;
    for (i = 0; i < p; i++) {
      len = plates[i].length;
      for (d = 1; d <= len && d <= SPATULA; d++) {
        for (j = 0; j < p; j++) {
          if (j === i) continue;
          if (plates[j].length + d > CAP) continue;
          out.push([i, d, j]);
        }
      }
    }
    return out;
  }

  function apply(plates, move, sided) {
    var i = move[0], d = move[1], j = move[2];
    var next = clone(plates);
    var chunk = next[i].slice(next[i].length - d);
    next[i] = next[i].slice(0, next[i].length - d);
    var landed = [];
    for (var k = chunk.length - 1; k >= 0; k--) {
      var pancake = chunk[k];
      if (twoSided(pancake >> 1, sided)) pancake = pancake ^ 1;
      landed.push(pancake);
    }
    next[j] = next[j].concat(landed);
    return next;
  }

  function isGoal(plates) {
    for (var i = 0; i < plates.length; i++) {
      var plate = plates[i];
      if (!plate.length) continue;
      if (plate.length !== 3) return false;
      var flavour = plate[0] >> 1;
      for (var k = 0; k < plate.length; k++) {
        if (plate[k] !== flavour * 2) return false;
      }
    }
    return true;
  }

  function decodeKey(key) {
    if (!key) return [];
    return key.split('|').map(function (part) {
      if (!part) return [];
      return part.split(',').map(function (n) { return +n; });
    });
  }

  function goalKey(plateCount, colours) {
    var plates = [];
    for (var c = 0; c < colours; c++) plates.push([c * 2, c * 2, c * 2]);
    while (plates.length < plateCount) plates.push([]);
    return canonKey(plates);
  }

  function expand(keys, depth, sided) {
    var seen = new Map();
    var i;
    for (i = 0; i < keys.length; i++) seen.set(keys[i], 0);
    var layer = keys.slice();
    for (var d = 0; d < depth; d++) {
      var next = [];
      for (i = 0; i < layer.length; i++) {
        var plates = decodeKey(layer[i]);
        var moves = legalMoves(plates);
        for (var m = 0; m < moves.length; m++) {
          var key = canonKey(apply(plates, moves[m], sided));
          if (!seen.has(key)) {
            seen.set(key, d + 1);
            next.push(key);
          }
        }
      }
      layer = next;
      if (!layer.length) break;
    }
    return seen;
  }

  var goalBalls = {};
  var finishCache = new Map();

  function goalBall(level, depth) {
    var cache = goalBalls[level.n];
    if (!cache || cache.depth < depth) {
      var start = [goalKey(level.plates.length, level.colours)];
      cache = { depth: depth, set: expand(start, depth, level.sided) };
      goalBalls[level.n] = cache;
    }
    return cache.set;
  }

  function warm(level, done) {
    var depth = Math.min(6, level.budget);
    var key = goalKey(level.plates.length, level.colours);
    var seen = new Map();
    seen.set(key, 0);
    var layer = [key];
    var d = 0;
    function finish() {
      goalBalls[level.n] = { depth: depth, set: seen };
      done();
    }
    function step() {
      if (d >= depth || !layer.length) { finish(); return; }
      var next = [];
      var i = 0;
      function chunk() {
        var guard = 0;
        while (i < layer.length && guard < 300) {
          var plates = decodeKey(layer[i]);
          var moves = legalMoves(plates);
          for (var m = 0; m < moves.length; m++) {
            var landed = canonKey(apply(plates, moves[m], level.sided));
            if (!seen.has(landed)) {
              seen.set(landed, d + 1);
              next.push(landed);
            }
          }
          i++;
          guard++;
        }
        if (i < layer.length) setTimeout(chunk, 0);
        else {
          layer = next;
          d++;
          setTimeout(step, 0);
        }
      }
      chunk();
    }
    step();
  }

  function prewarm(level) {
    var ply = level.budget <= 7 ? 2 : 1;
    var frontier = [clone(level.plates)];
    for (var depth = 0; depth <= ply; depth++) {
      var next = [];
      for (var i = 0; i < frontier.length; i++) {
        canFinish(frontier[i], level.budget - depth, level);
        if (depth === ply) continue;
        var moves = legalMoves(frontier[i]);
        for (var m = 0; m < moves.length; m++) next.push(apply(frontier[i], moves[m], level.sided));
      }
      frontier = next;
    }
    if (level.budget > 7) return;
    var along = clone(level.plates);
    var left = level.budget;
    for (var r = 0; r < level.ref.length; r++) {
      along = apply(along, level.ref[r], level.sided);
      left -= 1;
      canFinish(along, left, level);
    }
  }

  function canFinish(plates, flipsLeft, level) {
    if (isGoal(plates)) return true;
    if (flipsLeft <= 0) return false;
    var memoKey = level.n + '#' + flipsLeft + '#' + canonKey(plates);
    if (finishCache.has(memoKey)) return finishCache.get(memoKey);
    var here = canonKey(plates);
    var cache = goalBalls[level.n];
    var goalSide = cache ? Math.min(cache.depth, flipsLeft) : Math.floor(flipsLeft / 2);
    var stateSide = flipsLeft - goalSide;
    var goals = goalBall(level, goalSide);
    var answer = false;
    if (goals.has(here) && goals.get(here) <= goalSide) answer = true;
    else if (stateSide > 0) {
      var near = expand([here], stateSide, level.sided);
      for (var key of near.keys()) {
        if (goals.has(key) && goals.get(key) + near.get(key) <= flipsLeft) { answer = true; break; }
      }
    }
    finishCache.set(memoKey, answer);
    return answer;
  }

  function stuckText(flipsLeft) {
    return "Can't finish in " + flipsLeft + " flips — restart";
  }

  function levels() {
    return PACK.map(function (row, index) {
      var flavours = 0;
      row.plates.forEach(function (plate) {
        plate.forEach(function (pancake) { flavours = Math.max(flavours, (pancake >> 1) + 1); });
      });
      return {
        n: index + 1,
        name: NAMES[index],
        sidedName: row.sided,
        sided: sidedSet(row.sided),
        par: row.par,
        budget: row.par + 2,
        colours: flavours,
        plates: clone(row.plates),
        ref: row.ref.map(function (move) { return [move[0] - 1, move[1], move[2] - 1]; }),
        refLabel: row.ref.map(function (move) { return move.slice(); })
      };
    });
  }

  root.TurnLogic = {
    CAP: CAP,
    SPATULA: SPATULA,
    clone: clone,
    canonKey: canonKey,
    legalMoves: legalMoves,
    apply: apply,
    isGoal: isGoal,
    canFinish: canFinish,
    warm: warm,
    prewarm: prewarm,
    stuckText: stuckText,
    twoSided: twoSided,
    levels: levels
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
