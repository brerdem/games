(function () {
  var TL = WhiskLogic;
  var CLOTH = [
    { fill: '#C23B22', ink: '#6E120C', kind: 'check' },
    { fill: '#1F7A8C', ink: '#08343C', kind: 'stripe' },
    { fill: '#E0A100', ink: '#6A4A00', kind: 'dots' },
    { fill: '#F3E6C8', ink: '#8A7048', kind: 'lace' }
  ];
  var DISH = [
    { rim: '#9C2F2F', kind: 'round' },
    { rim: '#1F6B62', kind: 'square' },
    { rim: '#C47A12', kind: 'bowl' },
    { rim: '#2C4A7A', kind: 'cup' }
  ];
  var GOLD = '#E2B657';
  var INK = '#2A160E';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var dpr = 1;
  var cssW = 390;
  var cssH = 844;
  var geom = null;
  var state = null;
  var drag = null;
  var selected = null;
  var lastTap = null;
  var anim = null;
  var queue = [];
  var gestureSerial = 1;
  var particles = [];
  var wobble = null;
  var laneFlash = null;
  var audio = null;
  var settled = false;
  var solverReady = false;
    var solveToken = 0;
  var solverMs = 0;
  var quietUntil = 0;
  var blockUntilLift = false;
  var guardRect = null;
  var guardUntil = 0;
  var lastGesture = null;
  var winShown = false;
  var failShown = false;
  var stuckShown = false;
  var failShows = 0;
  var stuckShows = 0;
  var applause = 0;
  var cleanStamp = 0;
  var progress = loadProgress();

  function loadProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem('whisk-away-progress-v1') || 'null');
      if (raw && raw.stars) return raw;
    } catch (err) { /* keep defaults */ }
    return { stars: {}, unlocked: 1, mute: false };
  }

  function saveProgress() {
    try { localStorage.setItem('whisk-away-progress-v1', JSON.stringify(progress)); } catch (err) { /* private mode */ }
  }

  function now() { return performance.now(); }

  function landscapeLocked() {
    return window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  }

  function overlayOpen() {
    return ['loading', 'menu-panel', 'help', 'win', 'stuck', 'fail'].some(function (id) {
      return !document.getElementById(id).classList.contains('hidden');
    });
  }

  function resize() {
    var rect = stage.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    var raw = window.devicePixelRatio || 1;
    dpr = raw > 1.5 ? 1.5 : raw;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutGeom();
    document.getElementById('rotate').classList.toggle('hidden', !landscapeLocked());
    paint();
  }

  function layoutGeom() {
    if (!state) return;
    var level = state.level;
    var hud = cssH < 700 ? 52 : 68;
    var bar = cssH < 700 ? 56 : 72;
    var room = cssH - hud - bar;
    var cell = Math.min(Math.floor((cssW - 12) / level.W), Math.floor((room - 8) / level.H));
    cell = Math.max(36, cell);
    var tableW = cell * level.W;
    var tableH = cell * level.H;
    geom = {
      hud: hud, bar: bar, cell: cell,
      x0: Math.round((cssW - tableW) / 2),
      y0: Math.round(hud + (room - tableH) / 2)
    };
  }

  function load(n) {
    var all = TL.levels();
    var level = all[Math.max(0, Math.min(all.length, n) - 1)];
    solveToken += 1;
    var token = solveToken;
    state = {
      n: level.n, level: level, board: TL.start(level),
      left: level.budget, budget: level.budget, par: level.par,
      used: 0, undos: 0, stack: [], rejects: 0
    };
    anim = null;
    drag = null;
    selected = null;
    lastTap = null;
    queue = [];
    particles = [];
    wobble = null;
    laneFlash = null;
    settled = false;
    solverReady = !!level._graph;
    winShown = false;
    failShown = false;
    stuckShown = false;
    failShows = 0;
    stuckShows = 0;
    applause = 0;
    cleanStamp = 0;
    hideAll();
    syncChrome();
    layoutGeom();
    paint();
    quiet();
    ensureAudio();
    document.getElementById('loading').classList.add('hidden');
    if (level._graph) {
      solverReady = true;
      solverMs = 0;
      return;
    }
    // L8–L10: paint the table first, then search. A synchronous search
    // (or the first slice of one) was keeping the board hidden.
    var late = level.n >= 8;
    if (!late) {
      var started = now();
      TL.graph(level);
      solverMs = now() - started;
      solverReady = true;
      return;
    }
    solverReady = false;
    solverMs = 0;
    var job = TL.beginGraph(level);
    var clock = 0;
    var pumpSolver = function () {
      if (token !== solveToken) return;
      if (!clock) clock = now();
      var slice = now();
      var done = TL.stepGraph(job, 8000);
      solverMs += now() - slice;
      if (!done) {
        setTimeout(pumpSolver, 0);
        return;
      }
      solverMs = now() - clock;
      solverReady = true;
      if (!anim && !queue.length && !settled) reveal(judge());
      syncChrome();
      paint();
    };
    var armSolver = function () {
      if (token !== solveToken) return;
      setTimeout(pumpSolver, 40);
    };
    if (document.readyState === 'complete') armSolver();
    else window.addEventListener('load', armSolver, { once: true });
  }

  function quiet() { quietUntil = now() + 350; }

  function hideAll() {
    ['menu-panel', 'help', 'win', 'stuck', 'fail'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  }

  function syncChrome() {
    document.getElementById('kicker').textContent = 'Table ' + state.n;
    document.getElementById('name').textContent = state.level.name;
    var pips = document.getElementById('pips');
    pips.innerHTML = '';
    for (var i = 0; i < state.budget; i++) {
      var pip = document.createElement('i');
      pip.className = 'pip' + (i >= state.left ? ' spent' : '');
      pips.appendChild(pip);
    }
    document.getElementById('undo').disabled = settled || !state.stack.length || state.left < 1;
    document.getElementById('mute').textContent = progress.mute ? 'Muted' : 'Snd';
  }

  function judge() {
    if (TL.isGoal(state.level, state.board)) return 'win';
    if (state.left <= 0) return 'fail';
    if (solverReady && TL.distance(state.level, state.board) > state.left) return 'stuck';
    return null;
  }

  function reveal(outcome) {
    if (outcome === 'win') showWin();
    else if (outcome === 'fail') showFail();
    else if (outcome === 'stuck') showStuck();
  }

  function showWin() {
    if (winShown) return;
    winShown = true;
    settled = true;
    var over = state.used - state.par;
    var stars = over <= 0 ? 3 : over === 1 ? 2 : 1;
    progress.stars[state.n] = Math.max(progress.stars[state.n] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked || 1, state.n + 1);
    saveProgress();
    document.getElementById('win-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(stars);
    document.getElementById('win-copy').textContent = state.used + ' moves. Par is ' + state.par + '.';
    var next = document.getElementById('win-next');
    next.disabled = true;
    setTimeout(function () { next.disabled = state.n >= TL.levels().length; }, 600);
    document.getElementById('win').classList.remove('hidden');
    applause = now() + 1400;
    chord();
  }

  function showFail() {
    if (failShown) return;
    failShown = true;
    failShows += 1;
    settled = true;
    document.getElementById('fail').classList.remove('hidden');
  }

  function showStuck() {
    if (stuckShown || winShown || failShown) return;
    stuckShown = true;
    stuckShows += 1;
    document.getElementById('stuck-copy').textContent = TL.stuckText(state.left);
    var undo = document.getElementById('stuck-undo');
    var prev = state.stack[state.stack.length - 1];
    var offer = !!(prev && state.left >= 1 && TL.undoHelps(state.level, prev, state.left - 1));
    undo.classList.toggle('hidden', !offer);
    document.getElementById('stuck').classList.remove('hidden');
    tone(120, 0.12, 'square', 0.03);
  }

  function reject(move) {
    state.rejects += 1;
    var cloth = move && move[1] >= 0 ? move[1] : (selected ? selected : 0);
    wobble = { cloth: cloth, until: now() + 420 };
    if (move && move[0] === 'w' && state.level.cloths[move[1]] && TL.on(state.board, move[1])) {
      laneFlash = { cloth: move[1], cells: TL.whipBlockers(state.level, state.board, move[1]), until: now() + 400 };
    }
    tone(90, 0.08, 'square', 0.04);
  }

  function enqueue(move, gesture) {
    if (settled || state.left <= 0) { reject(move); return false; }
    queue.push({ move: move, gesture: gesture });
    return true;
  }

  function futureBoard() {
    var sim = TL.clone(state.board);
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].undo) return sim;
      var next = TL.apply(state.level, sim, queue[i].move);
      if (!next) return sim;
      sim = next;
    }
    return sim;
  }

  function playChain(cloth, pulls, whip) {
    if (settled) return;
    var gesture = ++gestureSerial;
    var sim = futureBoard();
    var accepted = 0;
    for (var i = 0; i < pulls; i++) {
      var next = TL.apply(state.level, sim, ['d', cloth]);
      if (!next) {
        if (accepted === 0) reject(['d', cloth]);
        whip = false;
        break;
      }
      enqueue(['d', cloth], gesture);
      sim = next;
      accepted++;
    }
    if (whip) {
      if (TL.apply(state.level, sim, ['w', cloth])) enqueue(['w', cloth], gesture);
      else {
        laneFlash = { cloth: cloth, cells: TL.whipBlockers(state.level, sim, cloth), until: now() + 400 };
        wobble = { cloth: cloth, until: now() + 420 };
        state.rejects += 1;
        tone(90, 0.08, 'square', 0.04);
      }
    }
    if (!anim) pump();
  }

  function pump() {
    if (anim || !queue.length || settled) return;
    var item = queue.shift();
    if (item.undo) playUndo();
    else begin(item.move, item.gesture);
  }

  function begin(move, gesture) {
    if (settled || state.left <= 0) {
      reject(move);
      dropGesture(gesture);
      if (!settled) pump();
      return;
    }
    var next = TL.apply(state.level, state.board, move);
    if (!next) {
      reject(move);
      dropGesture(gesture);
      pump();
      return;
    }
    var before = state.board;
    var marked = marksGained(before, next);
    state.stack.push(TL.clone(before));
    state.board = next;
    state.left -= 1;
    state.used += 1;
    if (move[0] === 'w' && marked >= 2) cleanStamp = now() + 700;
    var outcome = TL.isGoal(state.level, next) ? 'win' : (state.left <= 0 ? 'fail' : null);
    anim = {
      move: move, before: before, after: next, gesture: gesture,
      carry: move[0] === 'd' ? TL.carrySet(state.level, before, move[1]) : [move[1]],
      outcome: outcome, t0: now(), dur: move[0] === 'w' ? 160 : 120
    };
    if (move[0] === 'w') tone(880, 0.09, 'sawtooth', 0.04, 220);
    else tone(180, 0.07, 'triangle', 0.03);
    if (navigator.vibrate) navigator.vibrate(8);
    syncChrome();
  }

  function marksGained(before, after) {
    var level = state.level;
    var gained = 0;
    for (var i = 0; i < level.dishes.length; i++) {
      var was = TL.dishX(level, before, i) === level.targets[i][0] && TL.dishY(level, before, i) === level.targets[i][1];
      var nowOn = TL.dishX(level, after, i) === level.targets[i][0] && TL.dishY(level, after, i) === level.targets[i][1];
      if (!was && nowOn) gained++;
    }
    return gained;
  }

  function dropGesture(gesture) {
    if (!gesture) return;
    queue = queue.filter(function (item) { return item.gesture !== gesture; });
  }

  function finishAnim() {
    var outcome = anim.outcome;
    var move = anim.move;
    anim = null;
    if (move[0] === 'w') {
      var box = clothScreen(move[1], state.board, null);
      burst(box.x + box.w / 2, box.y + box.h / 2, '#F6E7C1', 10);
      tone(1480, 0.05, 'sine', 0.03);
    }
    if (outcome === 'win' || outcome === 'fail') {
      queue = [];
      settled = true;
      if (!solverReady && outcome !== 'win' && outcome !== 'fail') outcome = null;
      reveal(outcome === 'win' || outcome === 'fail' ? outcome : judge());
      syncChrome();
      return;
    }
    if (queue.length) { pump(); syncChrome(); return; }
    reveal(judge());
    syncChrome();
  }

  function playUndo() {
    if (settled || state.left < 1 || !state.stack.length) {
      reject(null);
      pump();
      return;
    }
    hideAll();
    stuckShown = false;
    var current = state.board;
    var prev = state.stack.pop();
    state.board = prev;
    state.left -= 1;
    state.used += 1;
    state.undos += 1;
    var outcome = TL.isGoal(state.level, prev) ? 'win' : (state.left <= 0 ? 'fail' : null);
    anim = {
      move: ['u', 0], before: current, after: prev, carry: [],
      outcome: outcome, t0: now(), dur: 120, undo: true
    };
    tone(240, 0.06, 'triangle', 0.03);
    syncChrome();
  }

  function undo() {
    if (settled || state.left < 1) { reject(null); return; }
    if (anim || queue.length) { queue.push({ undo: true, gesture: 0 }); return; }
    playUndo();
  }

  function restart() { load(state.n); }

  function ensureAudio() {
    if (audio) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }

  function tone(freq, dur, type, gain, slide) {
    if (progress.mute || !audio) return;
    if (audio.state === 'suspended') audio.resume();
    var osc = audio.createOscillator();
    var amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), audio.currentTime + dur);
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }

  function chord() {
    tone(523, 0.18, 'triangle', 0.04);
    setTimeout(function () { tone(659, 0.18, 'triangle', 0.04); }, 90);
    setTimeout(function () { tone(784, 0.28, 'triangle', 0.05); }, 180);
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 40 + Math.random() * 90;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5, color: color });
    }
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function paint() {
    ctx.clearRect(0, 0, cssW, cssH);
    if (!state || !geom) return;
    drawTable();
    drawAudience();
    drawMarks(false);
    drawCloths();
    drawDishes();
    drawTassels();
    drawGrabs();
    drawLane();
    drawCaption();
    if (!drag && !anim && state.n <= 4 && state.used === 0 && !overlayOpen()) drawCoach();
    if (cleanStamp > now()) drawStamp();
    if (wobble && now() < wobble.until) {
      ctx.fillStyle = 'rgba(224,82,74,.14)';
      ctx.fillRect(geom.x0, geom.y0, geom.cell * state.level.W, geom.cell * state.level.H);
    }
    drawParticles();
  }

  function drawTable() {
    ctx.fillStyle = '#C8955C';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(90,48,18,.18)';
    ctx.lineWidth = 2;
    for (var y = geom.hud; y < cssH - geom.bar; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(cssW * 0.3, y + 4, cssW * 0.6, y - 3, cssW, y + 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,236,196,.18)';
    ctx.fillRect(geom.x0 - 6, geom.y0 - 6, geom.cell * state.level.W + 12, geom.cell * state.level.H + 12);
  }

  function drawAudience() {
    var gasp = (wobble && now() < wobble.until) || (laneFlash && now() < laneFlash.until);
    var cheer = applause > now();
    var y = Math.max(18, geom.y0 - 22);
    ctx.fillStyle = gasp ? '#4A2418' : '#3A2218';
    for (var i = 0; i < 5; i++) {
      var x = geom.x0 + 16 + i * Math.min(48, geom.cell);
      var lift = cheer ? -6 : gasp ? 3 : 0;
      ctx.beginPath();
      ctx.arc(x, y + lift, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 8, y + 8 + lift, 16, 8);
      if (cheer) {
        ctx.strokeStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + lift);
        ctx.lineTo(x - 14, y - 8 + lift);
        ctx.moveTo(x + 8, y + lift);
        ctx.lineTo(x + 14, y - 8 + lift);
        ctx.stroke();
      }
    }
  }

  function drawMarks() {
    var level = state.level;
    for (var i = 0; i < level.targets.length; i++) {
      var on = TL.dishX(level, state.board, i) === level.targets[i][0] && TL.dishY(level, state.board, i) === level.targets[i][1];
      var o = cellOrigin(level.targets[i][0], level.targets[i][1]);
      var pad = geom.cell * 0.14;
      ctx.save();
      ctx.strokeStyle = on ? '#F2D48A' : GOLD;
      ctx.fillStyle = on ? 'rgba(226,182,87,.45)' : 'rgba(226,182,87,.05)';
      ctx.lineWidth = 2;
      ctx.setLineDash(on ? [] : [5, 4]);
      round(o.x + pad, o.y + pad, geom.cell - pad * 2, geom.cell - pad * 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawGlyph(DISH[i % DISH.length].kind, o.x + geom.cell / 2, o.y + geom.cell / 2, geom.cell * 0.16, GOLD);
    }
  }

  function clothScreen(i, board, extra) {
    var rect = TL.rectAt(state.level, board, i, [0, 0, 0, 0]);
    var dx = extra ? extra[0] : 0;
    var dy = extra ? extra[1] : 0;
    return {
      x: geom.x0 + (rect[0] + dx) * geom.cell,
      y: geom.y0 + (rect[1] + dy) * geom.cell,
      w: rect[2] * geom.cell,
      h: rect[3] * geom.cell
    };
  }

  function previewExtra() {
    if (!drag || !drag.pull) return null;
    var along = drag.alongPx / geom.cell;
    var visual;
    if (along < 0.5) visual = Math.max(-0.18, along * 0.2);
    else {
      var whole = Math.floor(along);
      var frac = along - whole;
      visual = frac >= 0.5 ? whole + 1 : whole + frac * 0.2;
    }
    var dir = TL.DIR[state.level.cloths[drag.cloth][4]];
    return { cells: visual, parts: drag.carry, dx: dir[0] * visual, dy: dir[1] * visual };
  }

  function animExtra(i) {
    if (!anim || anim.undo) return null;
    var move = anim.move;
    var riding = false;
    for (var c = 0; c < anim.carry.length; c++) if (anim.carry[c] === i) riding = true;
    if (!riding && move[0] !== 'w') return null;
    var t = Math.min(1, (now() - anim.t0) / anim.dur);
    var e = ease(t);
    if (move[0] === 'w' && i === move[1]) {
      var dir = TL.DIR[state.level.cloths[i][4]];
      var span = Math.max(state.level.W, state.level.H) + 2;
      return { dx: dir[0] * span * e, dy: dir[1] * span * e, alpha: 1 - e, flap: e };
    }
    if (!riding) return null;
    var b = TL.rectAt(state.level, anim.before, i, [0, 0, 0, 0]);
    var a = TL.rectAt(state.level, anim.after, i, [0, 0, 0, 0]);
    return { dx: (b[0] + (a[0] - b[0]) * e) - b[0], dy: (b[1] + (a[1] - b[1]) * e) - b[1], alpha: 1 };
  }

  function drawCloths() {
    var level = state.level;
    var preview = previewExtra();
    for (var i = 0; i < level.cloths.length; i++) {
      var board = anim && anim.undo ? anim.before : (anim ? anim.before : state.board);
      if (anim && anim.undo) board = anim.before;
      var presentBefore = TL.on(anim ? anim.before : state.board, i);
      if (!presentBefore) continue;
      if (anim && anim.move[0] !== 'w' && anim.move[0] !== 'u' && !TL.on(anim.after, i) && animExtra(i) && ease(Math.min(1, (now() - anim.t0) / anim.dur)) > 0.92) continue;
      var extra = null;
      var alpha = 1;
      var flap = 0;
      if (preview && preview.parts.indexOf(i) >= 0) extra = [preview.dx, preview.dy];
      var flight = animExtra(i);
      if (flight) { extra = [flight.dx, flight.dy]; alpha = flight.alpha; flap = flight.flap || 0; }
      if (anim && anim.undo) {
        var t = ease(Math.min(1, (now() - anim.t0) / anim.dur));
        var from = TL.rectAt(level, anim.before, i, [0, 0, 0, 0]);
        var to = TL.rectAt(level, anim.after, i, [0, 0, 0, 0]);
        if (!TL.on(anim.before, i) && !TL.on(anim.after, i)) continue;
        extra = [(from[0] + (to[0] - from[0]) * t) - from[0], (from[1] + (to[1] - from[1]) * t) - from[1]];
        board = anim.before;
        if (!TL.on(anim.before, i)) continue;
      }
      var box = clothScreen(i, board, extra);
      var shake = wobble && wobble.cloth === i && now() < wobble.until ? Math.sin(now() / 28) * 5 : 0;
      box.x += shake;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = 'rgba(42,22,14,.22)';
      round(box.x + 3, box.y + 3 + i, box.w, box.h, 10);
      ctx.fill();
      var style = CLOTH[i % CLOTH.length];
      ctx.fillStyle = style.fill;
      round(box.x, box.y, box.w, box.h, 10);
      ctx.fill();
      ctx.save();
      round(box.x, box.y, box.w, box.h, 10);
      ctx.clip();
      drawPattern(style, box);
      ctx.restore();
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = 2.5;
      round(box.x, box.y, box.w, box.h, 10);
      ctx.stroke();
      if (flap > 0) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * (1 - flap), box.y + box.h / 2, box.w * 0.18, box.h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (selected === i) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3;
        round(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPattern(style, box) {
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    if (style.kind === 'check') {
      var s = Math.max(8, geom.cell * 0.34);
      for (var y = box.y; y < box.y + box.h; y += s) {
        for (var x = box.x; x < box.x + box.w; x += s) {
          if (((x - box.x) / s | 0) % 2 === ((y - box.y) / s | 0) % 2) ctx.fillRect(x, y, s, s);
        }
      }
    } else if (style.kind === 'stripe') {
      ctx.lineWidth = 3;
      for (var x2 = box.x - box.h; x2 < box.x + box.w; x2 += 10) {
        ctx.beginPath();
        ctx.moveTo(x2, box.y);
        ctx.lineTo(x2 + box.h, box.y + box.h);
        ctx.stroke();
      }
    } else if (style.kind === 'dots') {
      for (var y2 = box.y + 8; y2 < box.y + box.h; y2 += 12) {
        for (var x3 = box.x + 8; x3 < box.x + box.w; x3 += 12) {
          ctx.beginPath();
          ctx.arc(x3, y2, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x + 5, box.y + 5, box.w - 10, box.h - 10);
      for (var y3 = box.y + 8; y3 < box.y + box.h; y3 += 14) {
        ctx.beginPath();
        ctx.arc(box.x + 8, y3, 3, 0, Math.PI);
        ctx.stroke();
      }
    }
  }

  function drawDishes() {
    var level = state.level;
    var board = anim ? (anim.undo ? anim.before : anim.before) : state.board;
    for (var i = 0; i < level.dishes.length; i++) {
      var x = TL.dishX(level, board, i);
      var y = TL.dishY(level, board, i);
      var sup = TL.dishS(level, board, i);
      var dx = 0;
      var dy = 0;
      var squash = 1;
      if (previewExtra() && previewExtra().parts.indexOf(sup) >= 0) {
        dx = previewExtra().dx;
        dy = previewExtra().dy;
      }
      if (anim && !anim.undo && anim.move[0] === 'd' && anim.carry.indexOf(sup) >= 0) {
        var t = ease(Math.min(1, (now() - anim.t0) / anim.dur));
        var dir = TL.DIR[level.cloths[anim.move[1]][4]];
        dx = dir[0] * t;
        dy = dir[1] * t;
      }
      if (anim && anim.undo) {
        var t2 = ease(Math.min(1, (now() - anim.t0) / anim.dur));
        var x0 = TL.dishX(level, anim.before, i);
        var y0 = TL.dishY(level, anim.before, i);
        var x1 = TL.dishX(level, anim.after, i);
        var y1 = TL.dishY(level, anim.after, i);
        x = x0; y = y0;
        dx = (x1 - x0) * t2;
        dy = (y1 - y0) * t2;
      }
      if (anim && anim.move[0] === 'w') {
        var tw = Math.min(1, (now() - anim.t0) / 80);
        squash = 1 - 0.06 * Math.sin(Math.min(1, tw) * Math.PI);
      }
      var o = cellOrigin(x + dx, y + dy);
      var sway = anim && anim.move[0] === 'd' ? Math.sin(now() / 80) * 0.03 : 0;
      drawDish(i, o.x + geom.cell / 2, o.y + geom.cell / 2, squash, sway);
    }
  }

  function drawDish(i, cx, cy, squash, sway) {
    var style = DISH[i % DISH.length];
    var r = geom.cell * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sway || 0);
    ctx.scale(1, squash || 1);
    ctx.fillStyle = '#F4EFE6';
    ctx.strokeStyle = style.rim;
    ctx.lineWidth = 4;
    if (style.kind === 'round') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (style.kind === 'square') {
      round(-r, -r, r * 2, r * 2, 6);
      ctx.fill();
      ctx.stroke();
    } else if (style.kind === 'bowl') {
      ctx.beginPath();
      ctx.ellipse(0, 2, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.15, r * 0.72, r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      round(-r * 0.7, -r * 0.55, r * 1.4, r * 1.3, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.85, 0, r * 0.28, -1, 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGlyph(kind, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.translate(cx, cy);
    if (kind === 'round') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'square') ctx.strokeRect(-r, -r, r * 2, r * 2);
    else if (kind === 'bowl') { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.strokeRect(-r * 0.6, -r * 0.5, r * 1.2, r); }
    ctx.restore();
  }

  function drawTassels() {
    var level = state.level;
    var board = anim ? anim.before : state.board;
    for (var i = level.cloths.length - 1; i >= 0; i--) {
      if (!TL.on(board, i)) continue;
      var extra = null;
      if (previewExtra() && previewExtra().parts.indexOf(i) >= 0) extra = [previewExtra().dx, previewExtra().dy];
      var flight = anim && !anim.undo ? animExtra(i) : null;
      if (flight) extra = [flight.dx, flight.dy];
      var box = tasselBox(i, board, extra);
      ctx.fillStyle = '#F6E7C1';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      round(box.x, box.y, box.w, box.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#6B3A22';
      ctx.beginPath();
      var dir = level.cloths[i][4];
      if (dir === 'E' || dir === 'W') {
        for (var k = 0; k < 3; k++) {
          var yy = box.y + 4 + k * (box.h - 8) / 2;
          ctx.moveTo(box.x + 3, yy);
          ctx.lineTo(box.x + box.w - 3, yy);
        }
      } else {
        for (var k2 = 0; k2 < 3; k2++) {
          var xx = box.x + 4 + k2 * (box.w - 8) / 2;
          ctx.moveTo(xx, box.y + 3);
          ctx.lineTo(xx, box.y + box.h - 3);
        }
      }
      ctx.stroke();
    }
  }

  function clampBox(box) {
    var pad = 2;
    var maxX = Math.max(pad, cssW - box.w - pad);
    var maxY = Math.max(pad, cssH - box.h - pad);
    return {
      x: Math.min(maxX, Math.max(pad, box.x)),
      y: Math.min(maxY, Math.max(pad, box.y)),
      w: box.w,
      h: box.h
    };
  }

  function tasselBox(i, board, extra) {
    var cloth = clothScreen(i, board, extra);
    var dir = state.level.cloths[i][4];
    var long = Math.max(22, geom.cell * 0.34);
    var thick = Math.max(14, geom.cell * 0.2);
    var box;
    if (dir === 'E') box = { x: cloth.x + cloth.w - 2, y: cloth.y + cloth.h / 2 - long / 2, w: thick, h: long };
    else if (dir === 'W') box = { x: cloth.x - thick + 2, y: cloth.y + cloth.h / 2 - long / 2, w: thick, h: long };
    else if (dir === 'S') box = { x: cloth.x + cloth.w / 2 - long / 2, y: cloth.y + cloth.h - 2, w: long, h: thick };
    else box = { x: cloth.x + cloth.w / 2 - long / 2, y: cloth.y - thick + 2, w: long, h: thick };
    var fitted = clampBox(box);
    fitted.w = box.w;
    fitted.h = box.h;
    return fitted;
  }

  var grabCache = null;

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function grabRoom() {
    return { left: 4, top: geom.hud + 4, right: cssW - 4, bottom: cssH - geom.bar - 4 };
  }

  function boxOnCanvas(box) {
    var room = grabRoom();
    return box.x >= room.left && box.y >= room.top && box.x + box.w <= room.right && box.y + box.h <= room.bottom;
  }

  function placeGrabs(board) {
    var level = state.level;
    var size = 44;
    var boxes = new Array(level.cloths.length);
    var reserved = [];
    function blocked(i, box, external) {
      if (!boxOnCanvas(box)) return true;
      for (var k = 0; k < level.cloths.length; k++) {
        if (k === i || !TL.on(board, k)) continue;
        if (!external && k < i) continue;
        if (boxesOverlap(box, clothScreen(k, board, null))) return true;
        if (external && boxesOverlap(box, tasselBox(k, board, null))) return true;
      }
      if (external) {
        for (var r = 0; r < reserved.length; r++) if (boxesOverlap(box, reserved[r])) return true;
      }
      return false;
    }
    for (var i = level.cloths.length - 1; i >= 0; i--) {
      boxes[i] = null;
      if (!TL.on(board, i)) continue;
      var cloth = clothScreen(i, board, null);
      var found = null;
      var step = 4;
      for (var y = cloth.y; y + size <= cloth.y + cloth.h && !found; y += step) {
        for (var x = cloth.x; x + size <= cloth.x + cloth.w; x += step) {
          var inside = { x: x, y: y, w: size, h: size, drawn: false };
          if (!blocked(i, inside, false)) { found = inside; break; }
        }
      }
      if (!found) {
        var dirName = level.cloths[i][4];
        var v = TL.DIR[dirName];
        var lx = v[0] > 0 ? cloth.x + cloth.w : v[0] < 0 ? cloth.x : cloth.x + cloth.w / 2;
        var ly = v[1] > 0 ? cloth.y + cloth.h : v[1] < 0 ? cloth.y : cloth.y + cloth.h / 2;
        var perpX = -v[1];
        var perpY = v[0];
        for (var along = 0; along <= cssH && !found; along += 8) {
          for (var side = 0; side <= cssW && !found; side += 8) {
            var signs = side === 0 ? [0] : [-1, 1];
            for (var s = 0; s < signs.length; s++) {
              var px = lx + v[0] * (along + size / 2) + perpX * side * signs[s] - size / 2;
              var py = ly + v[1] * (along + size / 2) + perpY * side * signs[s] - size / 2;
              var outside = { x: px, y: py, w: size, h: size, drawn: true };
              if (!blocked(i, outside, true)) { found = outside; break; }
            }
          }
        }
      }
      boxes[i] = found;
      if (found && found.drawn) reserved.push(found);
    }
    return boxes;
  }

  function grabsFor() {
    if (!state || !geom) return [];
    var key = TL.keyOf(state.board) + '|' + geom.cell + '|' + cssW + '|' + cssH;
    if (grabCache && grabCache.key === key) return grabCache.boxes;
    var boxes = placeGrabs(state.board);
    grabCache = { key: key, boxes: boxes };
    return boxes;
  }

  function drawGrabs() {
    var grabs = grabsFor();
    for (var i = 0; i < grabs.length; i++) {
      var box = grabs[i];
      if (!box || !box.drawn) continue;
      var style = CLOTH[i % CLOTH.length];
      var dir = state.level.cloths[i][4];
      var v = TL.DIR[dir];
      ctx.save();
      ctx.fillStyle = 'rgba(42,22,14,.28)';
      round(box.x + 2, box.y + 3, box.w, box.h, 12);
      ctx.fill();
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = '#F6E7C1';
      ctx.lineWidth = 3;
      round(box.x, box.y, box.w, box.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var cx = box.x + box.w / 2;
      var cy = box.y + box.h / 2;
      ctx.moveTo(cx - v[0] * 8 + v[1] * 7, cy - v[1] * 8 - v[0] * 7);
      ctx.lineTo(cx + v[0] * 8, cy + v[1] * 8);
      ctx.lineTo(cx - v[0] * 8 - v[1] * 7, cy - v[1] * 8 + v[0] * 7);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawLane() {
    if (!laneFlash || now() > laneFlash.until) return;
    ctx.fillStyle = 'rgba(224,82,74,.35)';
    for (var i = 0; i < laneFlash.cells.length; i++) {
      var o = cellOrigin(laneFlash.cells[i][0], laneFlash.cells[i][1]);
      ctx.fillRect(o.x, o.y, geom.cell, geom.cell);
    }
  }

  function drawCaption() {
    if (!drag || !drag.label) return;
    ctx.fillStyle = INK;
    ctx.font = '700 14px "Avenir Next", "Century Gothic", Futura, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(drag.label, drag.x, drag.y - 28);
  }

  function drawCoach() {
    var level = state.level;
    var cloth = 0;
    for (var i = 0; i < level.cloths.length; i++) if (TL.on(state.board, i)) cloth = i;
    if (level.n === 3) cloth = 0;
    var box = tasselBox(cloth, state.board, null);
    var dir = TL.DIR[level.cloths[cloth][4]];
    var pulse = 0.5 + 0.5 * Math.sin(now() / 220);
    var reach = level.n === 1 ? 26 : geom.cell * 0.7;
    ctx.strokeStyle = '#2A160E';
    ctx.globalAlpha = 0.35 + pulse * 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box.x + box.w / 2, box.y + box.h / 2);
    ctx.lineTo(box.x + box.w / 2 + dir[0] * reach, box.y + box.h / 2 + dir[1] * reach);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.font = '700 13px "Avenir Next", Futura, sans-serif';
    ctx.textAlign = 'center';
    var words = ['Fast flick', 'Slow pull', 'Lower cloth', 'Blocked lane'][level.n - 1];
    if (words) ctx.fillText(words, geom.x0 + geom.cell * level.W / 2, geom.y0 - 8);
  }

  function drawStamp() {
    ctx.save();
    ctx.translate(cssW / 2, geom.y0 + 28);
    ctx.rotate(-0.08);
    ctx.strokeStyle = '#9C2F2F';
    ctx.lineWidth = 3;
    ctx.font = '700 28px "Avenir Next", Futura, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('Clean!', 0, 0);
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function round(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function cellOrigin(x, y) {
    return { x: geom.x0 + x * geom.cell, y: geom.y0 + y * geom.cell };
  }

  function localPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function clientOf(x, y) {
    var rect = canvas.getBoundingClientRect();
    return { x: rect.left + x, y: rect.top + y };
  }

  function hitBody(x, y) {
    var level = state.level;
    var board = state.board;
    for (var c = level.cloths.length - 1; c >= 0; c--) {
      if (!TL.on(board, c)) continue;
      var box = clothScreen(c, board, null);
      if (x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h) return c;
    }
    return -1;
  }

  function hitTassel(x, y) {
    var level = state.level;
    var board = state.board;
    for (var i = level.cloths.length - 1; i >= 0; i--) {
      if (!TL.on(board, i)) continue;
      var tab = tasselBox(i, board, null);
      if (x >= tab.x && x <= tab.x + tab.w && y >= tab.y && y <= tab.y + tab.h) return i;
    }
    return -1;
  }

  function hitExtension(gx, gy) {
    var level = state.level;
    var board = state.board;
    if (gx < 0 || gy < 0 || gx >= level.W || gy >= level.H) return -1;
    var best = -1;
    var bestDist = 99;
    for (var i = 0; i < level.cloths.length; i++) {
      if (!TL.on(board, i)) continue;
      var r = TL.rectAt(level, board, i, [0, 0, 0, 0]);
      var dir = level.cloths[i][4];
      var dist = 0;
      if (dir === 'N' && gx >= r[0] && gx < r[0] + r[2] && gy < r[1]) dist = r[1] - gy;
      else if (dir === 'S' && gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] + r[3]) dist = gy - (r[1] + r[3] - 1);
      else if (dir === 'E' && gy >= r[1] && gy < r[1] + r[3] && gx >= r[0] + r[2]) dist = gx - (r[0] + r[2] - 1);
      else if (dir === 'W' && gy >= r[1] && gy < r[1] + r[3] && gx < r[0]) dist = r[0] - gx;
      if (dist > 0 && dist <= 4 && dist < bestDist) { best = i; bestDist = dist; }
    }
    return best;
  }

  function hitCloth(x, y) {
    var body = hitBody(x, y);
    if (body >= 0) return body;
    var grabs = grabsFor();
    for (var i = grabs.length - 1; i >= 0; i--) {
      var grab = grabs[i];
      if (grab && grab.drawn && x >= grab.x && y >= grab.y && x < grab.x + grab.w && y < grab.y + grab.h) return i;
    }
    var tab = hitTassel(x, y);
    if (tab >= 0) return tab;
    var gx = Math.floor((x - geom.x0) / geom.cell);
    var gy = Math.floor((y - geom.y0) / geom.cell);
    return hitExtension(gx, gy);
  }

  function pushSamples(target, event) {
    var list = [event];
    if (event.getCoalescedEvents) {
      var extra = event.getCoalescedEvents();
      if (extra && extra.length) list = extra;
    }
    for (var i = 0; i < list.length; i++) {
      var p = localPoint(list[i]);
      target.samples.push({ t: list[i].timeStamp || now(), x: p.x, y: p.y });
    }
    var main = localPoint(event);
    var last = target.samples[target.samples.length - 1];
    if (!last || Math.abs(last.x - main.x) > 0.5 || Math.abs(last.y - main.y) > 0.5) {
      target.samples.push({ t: event.timeStamp || now(), x: main.x, y: main.y });
    }
    if (target.samples.length > 64) target.samples.splice(0, target.samples.length - 64);
  }

  var lastWindow = { dt: 0, along: 0 };

  function releaseSpeed(samples, dir) {
    lastWindow = { dt: 0, along: 0 };
    if (!samples || samples.length < 2) return 0;
    var origin = samples[0];
    var moveAt = -1;
    for (var i = 1; i < samples.length; i++) {
      if (Math.hypot(samples[i].x - origin.x, samples[i].y - origin.y) >= 6) {
        moveAt = i;
        break;
      }
    }
    if (moveAt < 0) return 0;
    var v = TL.DIR[dir];
    var b = samples[samples.length - 1];
    var chosen = samples[moveAt];
    for (var j = samples.length - 2; j >= moveAt; j--) {
      if (b.t - samples[j].t > 60) break;
      chosen = samples[j];
    }
    var dt = b.t - chosen.t;
    if (dt < 1) dt = 1;
    var along = (b.x - chosen.x) * v[0] + (b.y - chosen.y) * v[1];
    lastWindow = { dt: dt, along: along };
    return along / dt;
  }

  function frame(t) {
    if (anim && t >= anim.t0 + anim.dur) finishAnim();
    if (wobble && t > wobble.until) wobble = null;
    if (laneFlash && t > laneFlash.until) laneFlash = null;
    particles.forEach(function (p) { p.life -= 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; });
    particles = particles.filter(function (p) { return p.life > 0; });
    paint();
    requestAnimationFrame(frame);
  }

  function rememberGuard(rect) {
    guardRect = rect;
    guardUntil = now() + 350;
  }

  function inGuard(x, y) {
    if (!guardRect || now() > guardUntil) return false;
    return x >= guardRect.l && x <= guardRect.r && y >= guardRect.t && y <= guardRect.b;
  }

  function guardFromButton(button) {
    var bounds = button.getBoundingClientRect();
    return { l: bounds.left - 16, t: bounds.top - 16, r: bounds.right + 16, b: bounds.bottom + 16 };
  }

  window.addEventListener('pointerdown', function (event) {
    var button = event.target && event.target.closest && event.target.closest('button');
    if (button) {
      guardRect = guardFromButton(button);
      blockUntilLift = true;
      return;
    }
    if (overlayOpen()) {
      guardRect = { l: event.clientX - 28, t: event.clientY - 28, r: event.clientX + 28, b: event.clientY + 28 };
      blockUntilLift = true;
      return;
    }
    if (inGuard(event.clientX, event.clientY)) blockUntilLift = true;
  }, true);

  window.addEventListener('pointerup', function () {
    if (!blockUntilLift) return;
    blockUntilLift = false;
    rememberGuard(guardRect);
  }, true);

  window.addEventListener('pointercancel', function () {
    if (!blockUntilLift) return;
    blockUntilLift = false;
    rememberGuard(guardRect);
  }, true);

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    ensureAudio();
    if (overlayOpen() || landscapeLocked() || !geom || settled || blockUntilLift) return;
    if (inGuard(event.clientX, event.clientY)) return;
    var p = localPoint(event);
    var hit = hitCloth(p.x, p.y);
    if (hit < 0) {
      selected = null;
      lastTap = null;
      drag = null;
      return;
    }
    drag = {
      pointer: event.pointerId, cloth: hit, x: p.x, y: p.y, x0: p.x, y0: p.y, t0: now(),
      samples: [], label: '', alongPx: 0, carry: TL.carrySet(state.level, state.board, hit)
    };
    pushSamples(drag, event);
    selected = hit;
    try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* synthetic events */ }
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    pushSamples(drag, event);
    var p = localPoint(event);
    drag.x = p.x;
    drag.y = p.y;
    var dir = state.level.cloths[drag.cloth][4];
    var v = TL.DIR[dir];
    drag.alongPx = (p.x - drag.x0) * v[0] + (p.y - drag.y0) * v[1];
    var speed = releaseSpeed(drag.samples, dir);
    if (speed >= 1 && drag.alongPx > 8 && now() - drag.t0 <= 250) drag.label = 'Whip';
    else if (drag.alongPx >= geom.cell * 0.5) drag.label = 'Pull';
    else drag.label = '';
  });

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointer)) return;
    if (event) pushSamples(drag, event);
    var d = drag;
    drag = null;
    selected = null;
    var moved = Math.hypot(d.x - d.x0, d.y - d.y0);
    var dt = now() - d.t0;
    var dirName = state.level.cloths[d.cloth][4];
    var v = TL.DIR[dirName];
    var along = (d.x - d.x0) * v[0] + (d.y - d.y0) * v[1];
    var across = (d.x - d.x0) * (-v[1]) + (d.y - d.y0) * v[0];
    if (moved < 12 && dt < 300) {
      if (lastTap && lastTap.cloth === d.cloth && now() - lastTap.t < 320) {
        lastTap = null;
        playChain(d.cloth, 0, true);
        return;
      }
      lastTap = { cloth: d.cloth, t: now() };
      return;
    }
    lastTap = null;
    var speed = releaseSpeed(d.samples, dirName);
    lastGesture = { speed: speed, dt: dt, along: along, samples: d.samples.length, windowDt: lastWindow.dt, windowAlong: lastWindow.along };
    if (dt <= 250 && speed >= 1 && along > 8) {
      playChain(d.cloth, 0, true);
      return;
    }
    if (along < geom.cell * 0.35 && Math.abs(across) > Math.abs(along)) {
      wobble = { cloth: d.cloth, until: now() + 280 };
      return;
    }
    var snapped = along >= geom.cell * 0.5 ? Math.min(6, Math.floor(along / geom.cell + 0.5)) : 0;
    if (snapped < 1) {
      if (along < -8) wobble = { cloth: d.cloth, until: now() + 280 };
      return;
    }
    playChain(d.cloth, snapped, false);
  }

  function cancelDrag(event) {
    if (drag && event && event.pointerId !== undefined && event.pointerId !== drag.pointer) return;
    drag = null;
    selected = null;
    lastTap = null;
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', cancelDrag);

  window.addEventListener('keydown', function (event) {
    if (!state || overlayOpen() || !geom) return;
    var key = event.key;
    if (settled) {
      if (key === 'r' || key === 'R') restart();
      return;
    }
    if (key === 'u' || key === 'U') { undo(); return; }
    if (key === 'r' || key === 'R') { restart(); return; }
    if (key >= '1' && key <= '9') {
      var index = +key - 1;
      if (index < state.level.cloths.length && TL.on(state.board, index)) selected = index;
      return;
    }
    if (selected === null) return;
    var dir = state.level.cloths[selected][4];
    var arrow = { E: 'ArrowRight', W: 'ArrowLeft', N: 'ArrowUp', S: 'ArrowDown' }[dir];
    if (key === 'w' || key === 'W') { playChain(selected, 0, true); selected = null; return; }
    if (key === ' ' || key === arrow) { playChain(selected, 1, false); selected = null; }
  });

  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('restart').addEventListener('click', restart);
  document.getElementById('stuck-restart').addEventListener('click', restart);
  document.getElementById('stuck-undo').addEventListener('click', function () { undo(); });
  document.getElementById('fail-restart').addEventListener('click', restart);
  document.getElementById('win-retry').addEventListener('click', restart);
  document.getElementById('menu').addEventListener('click', openMenu);
  document.getElementById('fail-menu').addEventListener('click', openMenu);
  document.getElementById('win-menu').addEventListener('click', openMenu);
  document.getElementById('resume').addEventListener('click', function () {
    document.getElementById('menu-panel').classList.add('hidden');
    quiet();
  });
  document.getElementById('how').addEventListener('click', function () {
    document.getElementById('menu-panel').classList.add('hidden');
    document.getElementById('help').classList.remove('hidden');
  });
  document.getElementById('help-close').addEventListener('click', function () {
    document.getElementById('help').classList.add('hidden');
    quiet();
  });
  document.getElementById('win-next').addEventListener('click', function () { if (state.n < TL.levels().length) load(state.n + 1); });
  document.getElementById('mute').addEventListener('click', function () {
    ensureAudio();
    progress.mute = !progress.mute;
    saveProgress();
    syncChrome();
  });

  function openMenu() {
    hideAll();
    var box = document.getElementById('levels');
    box.innerHTML = '';
    TL.levels().forEach(function (level) {
      var button = document.createElement('button');
      button.type = 'button';
      var stars = progress.stars[level.n] || 0;
      button.textContent = level.n + (stars ? '★' : '');
      button.disabled = level.n > (progress.unlocked || 1);
      button.addEventListener('click', function () { load(level.n); });
      box.appendChild(button);
    });
    document.getElementById('menu-panel').classList.remove('hidden');
  }

  var params = new URLSearchParams(location.search);
  load(Math.max(1, Math.min(10, +(params.get('level') || 1))));
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  window.__whisk = {
    get ready() { return !!(state && geom && document.getElementById('loading').classList.contains('hidden')); },
    get solverReady() { return solverReady; },
    snapshot: function () {
      var over = state.used - state.par;
      return {
        level: state.n,
        left: state.left,
        budget: state.budget,
        used: state.used,
        undos: state.undos,
        par: state.par,
        won: !document.getElementById('win').classList.contains('hidden'),
        failed: !document.getElementById('fail').classList.contains('hidden'),
        stuck: !document.getElementById('stuck').classList.contains('hidden'),
        banner: document.getElementById('stuck-copy').textContent,
        undoOffered: !document.getElementById('stuck-undo').classList.contains('hidden'),
        stars: over <= 0 ? 3 : over === 1 ? 2 : 1,
        queue: queue.length,
        rejects: state.rejects,
        settled: settled,
        failShows: failShows,
        stuckShows: stuckShows,
        goal: TL.isGoal(state.level, state.board),
        dishes: state.level.dishes.map(function (_dish, i) {
          return [TL.dishX(state.level, state.board, i), TL.dishY(state.level, state.board, i)];
        }),
        cloths: state.level.cloths.reduce(function (n, _c, i) { return n + (TL.on(state.board, i) ? 1 : 0); }, 0),
        cell: geom ? geom.cell : 0
      };
    },
    bufferScale: function () { return dpr; },
    animating: function () { return !!anim || queue.length > 0; },
    cellSize: function () { return geom ? geom.cell : 0; },
    commit: function (kind, index) { playChain(index, kind === 'd' ? 1 : 0, kind === 'w'); },
    load: load,
    reset: function () { load(state.n); },
    solverMs: function () { return solverMs; },
    lastGesture: function () { return lastGesture; },
    quietUntil: function () { return quietUntil; },
    clothRect: function (index) {
      var rect = TL.rectAt(state.level, state.board, index, [0, 0, 0, 0]);
      return { rect: rect, on: TL.on(state.board, index) };
    },
    hit: function (x, y) {
      var rect = canvas.getBoundingClientRect();
      return hitCloth(x - rect.left, y - rect.top);
    },
    gridPoint: function (gx, gy) {
      var local = cellOrigin(gx + 0.5, gy + 0.5);
      var client = clientOf(local.x, local.y);
      return { x: client.x, y: client.y, hit: hitCloth(local.x, local.y) };
    },
    targetBox: function (index) {
      var grabs = grabsFor();
      return grabs[index] || null;
    },
    handles: function () {
      var grabs = grabsFor();
      var list = [];
      for (var i = 0; i < state.level.cloths.length; i++) {
        if (!TL.on(state.board, i)) continue;
        var tassel = tasselBox(i, state.board, null);
        var target = grabs[i];
        var tx = tassel.x + tassel.w / 2;
        var ty = tassel.y + tassel.h / 2;
        list.push({
          i: i,
          tassel: tassel,
          target: target,
          body: hitBody(tx, ty),
          tasselHit: hitCloth(tx, ty),
          targetHit: target ? hitCloth(target.x + target.w / 2, target.y + target.h / 2) : -1
        });
      }
      return { w: cssW, h: cssH, list: list };
    },
    point: function (index) {
      var level = state.level;
      var dir = TL.DIR[level.cloths[index][4]];
      var grab = grabsFor()[index];
      var local = null;
      if (grab) local = { x: grab.x + grab.w / 2, y: grab.y + grab.h / 2 };
      if (!local || hitCloth(local.x, local.y) !== index) {
        var cloth = clothScreen(index, state.board, null);
        local = null;
        var step = 6;
        for (var y = cloth.y + 3; y < cloth.y + cloth.h - 3 && !local; y += step) {
          for (var x = cloth.x + 3; x < cloth.x + cloth.w - 3; x += step) {
            if (hitCloth(x, y) === index) { local = { x: x, y: y }; break; }
          }
        }
      }
      if (!local) local = { x: geom.x0 + geom.cell / 2, y: geom.y0 + geom.cell / 2 };
      var client = clientOf(local.x, local.y);
      return { x: client.x, y: client.y, dir: dir, cell: geom.cell };
    }
  };
})();
