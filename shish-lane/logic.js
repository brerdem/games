(function (root) {
  var CAP = 4;
  var NAMES = ['First Order', 'Crossing', 'Third Colour', 'The Bend', 'Coal', 'Tight Lanes', 'Slabs', 'Split Grill', 'Long Orders', 'The Gate', 'Finale'];
  var PACK = [
    { W: 4, H: 3, board: 'BBBBAAABABBB', tickets: ['AAB', 'BAB', 'BAB', 'BBB'], ref: ['T0', 'T1', 'T2', 'T3'], refSeq: ['AAB', 'BAB', 'BAB', 'BBB'] },
    { W: 4, H: 4, board: 'ABABBABAAAABBABA', tickets: ['AAB', 'AAB', 'ABA', 'ABAB', 'ABB'], ref: ['L3', 'T2', 'L0', 'L1', 'L2'], refSeq: ['ABAB', 'ABA', 'ABB', 'AAB', 'AAB'] },
    { W: 5, H: 4, board: 'CCBACAAAAAABBCBBBCBC', tickets: ['AAA', 'AAC', 'BAC', 'BAC', 'BBCB', 'BCBC'], ref: ['R2', 'T1', 'L3', 'T0', 'L0', 'L1'], refSeq: ['BBCB', 'BAC', 'BCBC', 'AAC', 'BAC', 'AAA'] },
    { W: 4, H: 5, board: 'BBABBABBCBBBABCCBCAA', tickets: ['ABA', 'ABC', 'ACBB', 'BABB', 'BBC', 'BCB'], ref: ['L1', 'T3', 'L3', 'T0', 'T1', 'T2'], refSeq: ['BABB', 'ACBB', 'ABC', 'BCB', 'BBC', 'ABA'] },
    { W: 5, H: 5, board: 'CCAA#CBAACBBBABBCBBCBBBBB', tickets: ['AABB', 'ACC', 'BAB', 'BBB', 'BBBC', 'BBCB', 'CAC'], ref: ['B1', 'L3', 'T2', 'L0', 'L1', 'L2', 'L4'], refSeq: ['BBCB', 'BBBC', 'AABB', 'ACC', 'CAC', 'BAB', 'BBB'] },
    { W: 5, H: 5, board: 'BCCBCBCBCCBBACBCCCABBBCBB', tickets: ['ACB', 'BACB', 'BBBC', 'BBCB', 'BCC', 'CBC', 'CBCC'], ref: ['T0', 'T1', 'L2', 'T3', 'L4', 'T2', 'T4'], refSeq: ['BBBC', 'CBCC', 'ACB', 'BACB', 'BBCB', 'CBC', 'BCC'] },
    { W: 5, H: 5, board: 'CCBCC#CBcABACABCBABCACcAA', tickets: ['ABA', 'ACA', 'ACB', 'BCB', 'CABC', 'CACC', 'CBCC'], ref: ['B3', 'L3', 'T1', 'L0', 'R1', 'L2', 'L4'], refSeq: ['ABA', 'CABC', 'CACC', 'CBCC', 'ACB', 'BCB', 'ACA'] },
    { W: 5, H: 6, board: 'AB#CBBBAAAACCCCAACCCBBCCB#ABBB', tickets: ['AAAB', 'AABB', 'ABBB', 'ACCC', 'BACB', 'BCCB', 'CCCC'], ref: ['R5', 'B2', 'L1', 'T0', 'T1', 'T3', 'T4'], refSeq: ['ABBB', 'ACCC', 'AABB', 'AAAB', 'BACB', 'CCCC', 'BCCB'] },
    { W: 6, H: 6, board: 'CACAAAAAaCCBCACABCBCCCACABACBABC#bAC', tickets: ['AAB', 'AAB', 'ACAC', 'ACAC', 'ACB', 'ACBC', 'ACC', 'BABC', 'BAC', 'CACC'], ref: ['R3', 'R5', 'B0', 'T3', 'L2', 'T4', 'L0', 'L4', 'T1', 'L1'], refSeq: ['CACC', 'BAC', 'BABC', 'ACAC', 'ACBC', 'ACB', 'ACAC', 'AAB', 'ACC', 'AAB'] },
    { W: 5, H: 6, board: 'CCBCBAABaC#CBBCBCBACAAAAbABACB', tickets: ['AAB', 'AABB', 'ABAC', 'ACB', 'BAAC', 'BCAC', 'BCBC', 'CBC'], ref: ['B2', 'R2', 'L3', 'T1', 'L0', 'L1', 'L4', 'L5'], refSeq: ['AABB', 'CBC', 'BCAC', 'BAAC', 'BCBC', 'ABAC', 'AAB', 'ACB'] },
    { W: 6, H: 6, board: 'AAABCCAAAACABAAABBbbBBaAA#CAACA#BACA', tickets: ['AAA', 'AAB', 'AAB', 'AABA', 'AABB', 'AABB', 'ABCC', 'ACA', 'ACB', 'CAC'], ref: ['R2', 'T1', 'B3', 'R4', 'R5', 'T2', 'L0', 'L1', 'L3', 'T0'], refSeq: ['AABB', 'AAA', 'AABA', 'CAC', 'ACB', 'AAB', 'ABCC', 'ACA', 'AABB', 'AAB'] }
  ];
  var STUCK_TEXT = 'No remaining sequence can serve every ticket.';
  var SHORT_TEXT = 'Not enough skewers to serve the remaining tickets.';

  function lanes(W, H) {
    var L = [];
    var r;
    var c;
    for (r = 0; r < H; r++) {
      L.push({ id: 'L' + r, vert: false, cells: range(W).map(function (col) { return r * W + col; }) });
      L.push({ id: 'R' + r, vert: false, cells: range(W).reverse().map(function (col) { return r * W + col; }) });
    }
    for (c = 0; c < W; c++) {
      L.push({ id: 'T' + c, vert: true, cells: range(H).map(function (row) { return row * W + c; }) });
      L.push({ id: 'B' + c, vert: true, cells: range(H).reverse().map(function (row) { return row * W + c; }) });
    }
    return L;
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  function canon(s) {
    var r = s.split('').reverse().join('');
    return s < r ? s : r;
  }

  function isSlab(ch) {
    return ch >= 'a' && ch <= 'd';
  }

  function inspect(b, lane) {
    var got = '';
    var cells = [];
    var stop = 'edge';
    var i;
    var ch;
    for (var k = 0; k < lane.cells.length; k++) {
      i = lane.cells[k];
      ch = b[i];
      if (ch === '#') { stop = 'coal'; break; }
      if (ch === '.') continue;
      if (lane.vert && isSlab(ch)) { stop = 'slab'; break; }
      got += ch.toUpperCase();
      cells.push(i);
      if (got.length === CAP) { stop = 'cap'; break; }
    }
    return { seq: got, cells: cells, stop: stop };
  }

  function skewer(b, lane) {
    var hit = inspect(b, lane);
    return { seq: hit.seq, cells: hit.cells };
  }

  function legal(b, tickets, L) {
    var out = [];
    for (var i = 0; i < L.length; i++) {
      var s = skewer(b, L[i]);
      if (s.seq && tickets.indexOf(canon(s.seq)) !== -1) {
        out.push({ id: L[i].id, ticket: canon(s.seq), cells: s.cells });
      }
    }
    return out;
  }

  function apply(b, tickets, mv) {
    var a = b.split('');
    for (var i = 0; i < mv.cells.length; i++) a[mv.cells[i]] = '.';
    var t = tickets.slice();
    t.splice(t.indexOf(mv.ticket), 1);
    return { b: a.join(''), tickets: t };
  }

  function makeSolver(L) {
    var memo = new Map();
    var ok = function (b, t) {
      if (t.length === 0) return true;
      var k = b + '|' + t.slice().sort().join(',');
      if (memo.has(k)) return memo.get(k);
      var r = false;
      var moves = legal(b, t, L);
      for (var i = 0; i < moves.length; i++) {
        var n = apply(b, t, moves[i]);
        if (ok(n.b, n.tickets)) { r = true; break; }
      }
      memo.set(k, r);
      return r;
    };
    return ok;
  }

  function laneById(L, id) {
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  }

  function budgetOf(tickets) {
    return tickets.length + 2;
  }

  // '' clear, 'unsolvable' when no sequence can finish, 'short' when the board can but the skewers cannot.
  // An empty budget is the fail state, not either banner.
  function stuckReason(board, tickets, skewers, ok) {
    if (!(tickets.length > 0 && skewers > 0)) return '';
    if (!ok(board, tickets)) return 'unsolvable';
    if (skewers < tickets.length) return 'short';
    return '';
  }

  function stuckNow(board, tickets, skewers, ok) {
    return stuckReason(board, tickets, skewers, ok) !== '';
  }

  function levels() {
    return PACK.map(function (row, i) {
      return {
        n: i + 1,
        name: NAMES[i],
        W: row.W,
        H: row.H,
        board: row.board,
        tickets: row.tickets.slice(),
        ref: row.ref.slice(),
        refSeq: row.refSeq.slice(),
        budget: row.tickets.length + 2,
        coal: row.board.indexOf('#') !== -1,
        slab: /[a-d]/.test(row.board)
      };
    });
  }

  root.ShishLogic = {
    CAP: CAP,
    STUCK_TEXT: STUCK_TEXT,
    SHORT_TEXT: SHORT_TEXT,
    lanes: lanes,
    canon: canon,
    isSlab: isSlab,
    inspect: inspect,
    skewer: skewer,
    legal: legal,
    apply: apply,
    makeSolver: makeSolver,
    laneById: laneById,
    budgetOf: budgetOf,
    stuckReason: stuckReason,
    stuckNow: stuckNow,
    levels: levels
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
