(function () {
  var SL = ShishLogic;
  var FOOD = { A: '#E8483B', B: '#4DB34A', C: '#F2C14E' };
  var INK = '#140E0C';
  var BED = '#1A1412';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var rail = document.getElementById('rail');
  var cost = document.getElementById('cost');
  var dpr = 1;
  var cssW = 390;
  var cssH = 844;
  var layout = { cell: 48, x: 44, y: 160, w: 200, h: 200 };
  var state = null;
  var solver = null;
  var drag = null;
  var anim = null;
  var particles = [];
  var lastCommit = null;
  var keyLane = 0;
  var keyArmed = false;
  var recognizeOnly = false;
  var lastDur = 0;
  var audio = null;
  var events = [];
  var fade = 1;
  var booted = false;
  var progress = loadProgress();

  function loadProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem('shish-lane-progress-v1') || 'null');
      if (raw && raw.stars) return raw;
    } catch (err) { /* keep the default */ }
    return { stars: {}, unlocked: 1, mute: false, coalSeen: false, slabSeen: false };
  }

  function saveProgress() {
    try { localStorage.setItem('shish-lane-progress-v1', JSON.stringify(progress)); } catch (err) { /* private mode */ }
  }

  function log(type, extra) {
    var row = { t: Date.now(), type: type, level: state ? state.n : 0 };
    if (extra) Object.keys(extra).forEach(function (key) { row[key] = extra[key]; });
    events.push(row);
    if (events.length > 200) events.shift();
  }

  function now() { return performance.now(); }

  function landscapeLocked() {
    return window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  }

  function overlayOpen() {
    return ['menu-panel', 'help', 'lesson', 'win', 'stuck', 'fail'].some(function (id) {
      return !document.getElementById(id).classList.contains('hidden');
    });
  }

  function blocked() {
    return overlayOpen() || landscapeLocked() || !!anim || !state;
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
    fit();
    document.getElementById('rotate').classList.toggle('hidden', !landscapeLocked());
    paint();
  }

  function fit() {
    if (!state) return;
    var hud = 72;
    var railH = Math.max(52, rail.getBoundingClientRect().height || 52);
    var bar = 78;
    var gutter = 44;
    var top = hud + railH;
    var availW = cssW - gutter * 2;
    var availH = cssH - top - bar - 8;
    var cell = Math.floor(Math.min(availW / state.W, availH / state.H));
    if (cell < 36) cell = 36;
    var w = cell * state.W;
    var h = cell * state.H;
    layout = {
      cell: cell,
      x: Math.round((cssW - w) / 2),
      y: Math.round(top + Math.max(0, availH - h) / 2),
      w: w,
      h: h
    };
  }

  function load(n) {
    var levels = SL.levels();
    var level = levels[Math.max(0, Math.min(levels.length, n) - 1)];
    solver = SL.makeSolver(SL.lanes(level.W, level.H));
    state = {
      n: level.n,
      name: level.name,
      W: level.W,
      H: level.H,
      board: level.board,
      tickets: level.tickets.slice(),
      startBoard: level.board,
      startTickets: level.tickets.slice(),
      skewers: level.budget,
      budget: level.budget,
      undos: 0,
      stack: [],
      moves: 0,
      coal: level.coal,
      slab: level.slab
    };
    anim = null;
    drag = null;
    particles = [];
    keyLane = 0;
    if (booted) fade = 0;
    booted = true;
    hideAll();
    var queue = [];
    if (level.coal && !progress.coalSeen) queue.push('coal');
    if (level.slab && !progress.slabSeen) queue.push('slab');
    state.lessons = queue;
    if (queue.length) showLesson(queue[0]);
    syncChrome();
    fit();
    log('load', { n: level.n });
  }

  function hideAll() {
    ['menu-panel', 'help', 'lesson', 'win', 'stuck', 'fail'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  }

  function showLesson(kind) {
    document.getElementById('lesson-title').textContent = kind === 'coal' ? 'Coal' : 'Slab';
    document.getElementById('lesson-copy').textContent = kind === 'coal'
      ? 'Coal stops the skewer.'
      : 'A slab spears only along its length.';
    document.getElementById('lesson').classList.remove('hidden');
  }

  function dismissLesson() {
    if (!state || !state.lessons.length) {
      document.getElementById('lesson').classList.add('hidden');
      return;
    }
    var kind = state.lessons.shift();
    if (kind === 'coal') progress.coalSeen = true;
    if (kind === 'slab') progress.slabSeen = true;
    saveProgress();
    if (state.lessons.length) showLesson(state.lessons[0]);
    else document.getElementById('lesson').classList.add('hidden');
  }

  function syncChrome() {
    document.getElementById('kicker').textContent = 'Grill ' + state.n;
    document.getElementById('name').textContent = state.name;
    var pips = document.getElementById('pips');
    pips.innerHTML = '';
    for (var i = 0; i < state.budget; i++) {
      var pip = document.createElement('i');
      pip.className = 'pip' + (i >= state.skewers ? ' spent' : '');
      pips.appendChild(pip);
    }
    document.getElementById('undo').disabled = state.skewers < 1 || !state.stack.length;
    document.getElementById('mute').textContent = progress.mute ? 'Muted' : 'Snd';
    renderTickets();
  }

  function renderTickets() {
    var hot = previewTicket();
    rail.innerHTML = '';
    state.tickets.forEach(function (ticket, index) {
      rail.appendChild(ticketChip(ticket, index === hot, false));
    });
    if (anim && anim.kind === 'take' && anim.label) rail.appendChild(ticketChip(anim.label, false, true));
  }

  function ticketChip(ticket, hot, served) {
    var el = document.createElement('div');
    el.className = 'ticket' + (hot ? ' hot' : '') + (served ? ' served' : '');
    var shapes = document.createElement('div');
    shapes.className = 'shapes';
    shapes.textContent = ticket.split('').map(function (ch) {
      return ch === 'A' ? '●' : ch === 'B' ? '■' : '▲';
    }).join('');
    var word = document.createElement('div');
    word.className = 'word';
    word.textContent = served ? 'SERVED' : ticket;
    el.appendChild(shapes);
    el.appendChild(word);
    if (served) {
      var stamp = document.createElement('div');
      stamp.className = 'stamp';
      stamp.textContent = 'SERVED';
      el.appendChild(stamp);
    }
    return el;
  }

  function previewTicket() {
    if (!drag || !drag.axis || blocked()) return -1;
    var hit = inspectId(drag.id);
    if (!axisOk(drag) || inwardOf(drag) < 12 || !hit.seq) return -1;
    return state.tickets.indexOf(SL.canon(hit.seq));
  }

  function lanes() { return SL.lanes(state.W, state.H); }

  function inspectId(id) {
    return SL.inspect(state.board, SL.laneById(lanes(), id));
  }

  function localPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function clientOf(x, y) {
    var rect = canvas.getBoundingClientRect();
    return { x: rect.left + x, y: rect.top + y };
  }

  function edgeAt(x, y) {
    var g = layout;
    var inX = x >= g.x - g.cell && x <= g.x + g.w + g.cell;
    var inY = y >= g.y - g.cell && y <= g.y + g.h + g.cell;
    if (!inX || !inY) return null;
    var cands = [];
    if (x >= g.x - 44 && x <= g.x + 28 && y >= g.y && y < g.y + g.h) cands.push({ side: 'L', dist: Math.abs(x - g.x) });
    if (x <= g.x + g.w + 44 && x >= g.x + g.w - 28 && y >= g.y && y < g.y + g.h) cands.push({ side: 'R', dist: Math.abs(x - (g.x + g.w)) });
    if (y >= g.y - 44 && y <= g.y + 28 && x >= g.x && x < g.x + g.w) cands.push({ side: 'T', dist: Math.abs(y - g.y) });
    if (y <= g.y + g.h + 44 && y >= g.y + g.h - 28 && x >= g.x && x < g.x + g.w) cands.push({ side: 'B', dist: Math.abs(y - (g.y + g.h)) });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return a.dist - b.dist; });
    var side = cands[0].side;
    var index = side === 'L' || side === 'R'
      ? clamp(Math.floor((y - g.y) / g.cell), 0, state.H - 1)
      : clamp(Math.floor((x - g.x) / g.cell), 0, state.W - 1);
    return { id: side + index, side: side, index: index };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function axisOk(d) {
    var side = d.id[0];
    var horizontal = side === 'L' || side === 'R';
    return d.axis === (horizontal ? 'h' : 'v');
  }

  function inwardOf(d) {
    var dx = d.x - d.x0;
    var dy = d.y - d.y0;
    var side = d.id[0];
    if (side === 'L') return dx;
    if (side === 'R') return -dx;
    if (side === 'T') return dy;
    return -dy;
  }

  function commit(id) {
    if (anim) return;
    var hit = inspectId(id);
    lastCommit = { id: id, spent: false };
    log('thrust', { id: id, seq: hit.seq });
    if (recognizeOnly) return;
    var ticket = hit.seq ? SL.canon(hit.seq) : '';
    var index = ticket ? state.tickets.indexOf(ticket) : -1;
    if (index === -1) {
      startAnim('back', id, hit, '', []);
      tone(150, 0.12, 'triangle', 0.08);
      rail.classList.remove('shake');
      void rail.offsetWidth;
      rail.classList.add('shake');
      return;
    }
    var letters = hit.cells.map(function (cell) { return state.board[cell]; });
    state.stack.push({ board: state.board, tickets: state.tickets.slice() });
    var next = SL.apply(state.board, state.tickets, { ticket: ticket, cells: hit.cells });
    state.board = next.b;
    state.tickets = next.tickets;
    state.skewers -= 1;
    state.moves += 1;
    lastCommit.spent = true;
    var outcome = null;
    if (!state.tickets.length) outcome = 'win';
    else if (!state.skewers) outcome = 'fail';
    else if (SL.stuckNow(state.board, state.tickets, state.skewers, solver)) outcome = 'stuck';
    startAnim('take', id, hit, ticket, letters, outcome);
    letters.forEach(function (ch, i) {
      setTimeout(function () { tone(220 * Math.pow(1.18, i), 0.05, 'square', 0.04); }, Math.min(70, i * 50));
    });
  }

  function startAnim(kind, id, hit, label, letters, outcome) {
    var travelPx = Math.max(layout.cell, (hit.cells.length + 1) * layout.cell);
    var travel = clamp(travelPx / 900 * 1000, 120, 220);
    var tail = kind === 'take' ? 110 : 120;
    var dur = Math.min(340, travel + tail);
    lastDur = dur;
    anim = {
      kind: kind,
      id: id,
      cells: hit.cells.slice(),
      seq: hit.seq,
      stop: hit.stop,
      label: label,
      letters: letters,
      outcome: outcome || null,
      t0: now(),
      dur: dur,
      travel: travel / Math.min(340, travel + tail)
    };
    syncChrome();
  }

  function finishAnim() {
    var outcome = anim.outcome;
    var stop = anim.stop;
    var full = anim.cells.length === SL.CAP;
    var end = anim.kind === 'take' ? tipPoint(anim, 1) : null;
    anim = null;
    if (outcome === 'win') {
      tone(880, 0.12, 'sine', 0.06);
      setTimeout(function () { tone(1320, 0.18, 'sine', 0.05); }, 90);
      showWin();
    } else if (outcome === 'fail') {
      showFail();
    } else if (outcome === 'stuck') {
      tone(90, 0.4, 'sine', 0.07);
      showStuck();
    } else if (end) {
      tone(660, 0.08, 'sine', 0.05);
      burst(end.x, end.y, '#F3E6C8', 8);
    }
    if (stop === 'coal' && end) burst(end.x, end.y, '#FF7A1A', 10);
    if (full && end) burst(end.x, end.y, '#F7F4EF', 6);
    syncChrome();
  }

  function showWin() {
    var stars = state.undos === 0 ? 3 : state.undos === 1 ? 2 : 1;
    progress.stars[state.n] = Math.max(progress.stars[state.n] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked || 1, state.n + 1);
    saveProgress();
    document.getElementById('win-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(stars);
    document.getElementById('win-copy').textContent = state.undos === 0
      ? 'Every order, and both spare skewers.'
      : 'Cleared with ' + state.undos + (state.undos === 1 ? ' undo.' : ' undos.');
    document.getElementById('win-next').disabled = state.n >= SL.levels().length;
    document.getElementById('win').classList.remove('hidden');
    log('win', { stars: stars, undos: state.undos });
  }

  function showStuck() {
    document.getElementById('stuck-copy').textContent = SL.STUCK_TEXT;
    document.getElementById('stuck').classList.remove('hidden');
    log('stuck');
  }

  function showFail() {
    document.getElementById('fail').classList.remove('hidden');
    log('fail');
  }

  function undo() {
    if (!state.stack.length || state.skewers < 1 || anim) return;
    var prev = state.stack.pop();
    state.board = prev.board;
    state.tickets = prev.tickets.slice();
    state.skewers -= 1;
    state.undos += 1;
    hideAll();
    if (state.lessons && state.lessons.length) showLesson(state.lessons[0]);
    cost.classList.remove('show');
    void cost.offsetWidth;
    cost.classList.add('show');
    log('undo', { skewers: state.skewers });
    if (!state.skewers && state.tickets.length) showFail();
    else if (SL.stuckNow(state.board, state.tickets, state.skewers, solver)) showStuck();
    syncChrome();
  }

  function restart() {
    var n = state.n;
    load(n);
    fade = 0;
    log('restart');
  }

  function ensureAudio() {
    if (audio) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }

  function tone(freq, dur, type, gain) {
    if (progress.mute || !audio) return;
    if (audio.state === 'suspended') audio.resume();
    var osc = audio.createOscillator();
    var amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 20 + Math.random() * 50;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.45, color: color });
    }
  }

  function cellCenter(index) {
    var col = index % state.W;
    var row = Math.floor(index / state.W);
    return { x: layout.x + (col + 0.5) * layout.cell, y: layout.y + (row + 0.5) * layout.cell };
  }

  function entryPoint(id) {
    var side = id[0];
    var index = +id.slice(1);
    var g = layout;
    if (side === 'L') return { x: g.x - 10, y: g.y + (index + 0.5) * g.cell };
    if (side === 'R') return { x: g.x + g.w + 10, y: g.y + (index + 0.5) * g.cell };
    if (side === 'T') return { x: g.x + (index + 0.5) * g.cell, y: g.y - 10 };
    return { x: g.x + (index + 0.5) * g.cell, y: g.y + g.h + 10 };
  }

  function pathOf(id, hit) {
    var pts = [entryPoint(id)];
    hit.cells.forEach(function (index) { pts.push(cellCenter(index)); });
    if (hit.stop === 'coal' || hit.stop === 'slab') {
      var lane = SL.laneById(lanes(), id);
      for (var i = 0; i < lane.cells.length; i++) {
        var ch = (anim && anim.kind ? state.board : state.board)[lane.cells[i]];
        if ((hit.stop === 'coal' && ch === '#') || (hit.stop === 'slab' && SL.isSlab(ch))) {
          pts.push(cellCenter(lane.cells[i]));
          break;
        }
      }
    }
    return pts;
  }

  function pointAlong(pts, u) {
    if (pts.length === 1) return pts[0];
    var lengths = [];
    var total = 0;
    for (var i = 1; i < pts.length; i++) {
      var step = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lengths.push(step);
      total += step;
    }
    var dist = clamp(u, 0, 1) * total;
    for (var j = 0; j < lengths.length; j++) {
      if (dist <= lengths[j] || j === lengths.length - 1) {
        var t = lengths[j] ? dist / lengths[j] : 0;
        return {
          x: pts[j].x + (pts[j + 1].x - pts[j].x) * t,
          y: pts[j].y + (pts[j + 1].y - pts[j].y) * t
        };
      }
      dist -= lengths[j];
    }
    return pts[pts.length - 1];
  }

  function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }

  function tipPoint(record, u) {
    var hit = { cells: record.cells, stop: record.stop };
    var pts = [entryPoint(record.id)];
    record.cells.forEach(function (index) { pts.push(cellCenter(index)); });
    if (record.stop === 'coal' || record.stop === 'slab') {
      var lane = SL.laneById(lanes(), record.id);
      var board = record.boardBefore || state.board;
      for (var i = 0; i < lane.cells.length; i++) {
        var ch = board[lane.cells[i]];
        if (record.cells.indexOf(lane.cells[i]) !== -1) continue;
        if ((record.stop === 'coal' && ch === '#') || (record.stop === 'slab' && ch >= 'a' && ch <= 'd')) {
          pts.push(cellCenter(lane.cells[i]));
          break;
        }
      }
    }
    var recoil = (record.stop === 'coal' || record.stop === 'slab') && u > 0.92 ? 4 : 0;
    var p = pointAlong(pts, u);
    if (recoil && pts.length > 1) {
      var prev = pts[pts.length - 2];
      var last = pts[pts.length - 1];
      var mag = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
      p = { x: p.x - (last.x - prev.x) / mag * recoil, y: p.y - (last.y - prev.y) / mag * recoil };
    }
    return p;
  }

  function paint() {
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalAlpha = fade;
    drawGrill();
    drawFoods();
    drawGhost();
    drawKey();
    drawDrag();
    drawAnim();
    drawParticles();
    ctx.globalAlpha = 1;
  }

  function drawGrill() {
    var g = layout;
    ctx.fillStyle = BED;
    roundRect(g.x - 8, g.y - 8, g.w + 16, g.h + 16, 18);
    ctx.fill();
    ctx.strokeStyle = '#3C342F';
    ctx.lineWidth = 2;
    for (var c = 0; c <= state.W; c++) {
      ctx.beginPath();
      ctx.moveTo(g.x + c * g.cell, g.y);
      ctx.lineTo(g.x + c * g.cell, g.y + g.h);
      ctx.stroke();
    }
    for (var r = 0; r <= state.H; r++) {
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + r * g.cell);
      ctx.lineTo(g.x + g.w, g.y + r * g.cell);
      ctx.stroke();
    }
  }

  function drawFoods() {
    for (var i = 0; i < state.board.length; i++) drawFood(state.board[i], cellCenter(i).x, cellCenter(i).y, layout.cell);
  }

  function drawFood(ch, x, y, cell) {
    if (!ch || ch === '.') return;
    var size = cell * 0.62;
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    if (ch === '#') {
      roundRect(x - size / 2, y - size / 2, size, size, 6);
      ctx.fillStyle = '#120E0C';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FF7A1A';
      [[-0.12, -0.08], [0.14, 0.02], [0, 0.16]].forEach(function (p) {
        ctx.beginPath();
        ctx.arc(x + p[0] * cell, y + p[1] * cell, cell * 0.06, 0, Math.PI * 2);
        ctx.fill();
      });
      return;
    }
    var slab = ch >= 'a' && ch <= 'd';
    var food = slab ? ch.toUpperCase() : ch;
    ctx.fillStyle = FOOD[food] || '#F3E6C8';
    if (slab) {
      var w = cell * 0.86;
      var h = cell * 0.42;
      roundRect(x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '700 ' + Math.round(cell * 0.28) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⟷', x, y + 1);
      return;
    }
    if (food === 'A') {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (food === 'B') {
      roundRect(x - size / 2, y - size / 2, size, size, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawPin(from, to, glint) {
    ctx.strokeStyle = '#8E99A1';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.strokeStyle = '#E7EEF2';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#D5DDE2';
    ctx.beginPath();
    ctx.arc(from.x, from.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (glint) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - (to.x - from.x) * 0.25, to.y - (to.y - from.y) * 0.25);
      ctx.stroke();
    }
  }

  function drawKey() {
    if (!keyArmed || drag || anim || overlayOpen()) return;
    ctx.fillStyle = 'rgba(255,122,26,0.16)';
    band(lanes()[keyLane].id);
    ctx.fill();
  }

  function drawGhost() {
    if (!state || state.n !== 1 || state.moves || drag || anim || overlayOpen()) return;
    var pulse = 0.35 + 0.25 * Math.sin(now() / 280);
    ctx.globalAlpha *= pulse;
    var from = entryPoint('T0');
    var hit = inspectId('T0');
    var to = hit.cells.length ? cellCenter(hit.cells[hit.cells.length - 1]) : { x: from.x, y: from.y + layout.cell };
    drawPin(from, to, false);
    ctx.globalAlpha = fade;
  }

  function drawDrag() {
    if (!drag || !drag.axis || !axisOk(drag) || inwardOf(drag) < 12) return;
    var hit = inspectId(drag.id);
    var u = clamp(inwardOf(drag) / (layout.cell * Math.max(1, hit.cells.length)), 0, 1);
    var from = entryPoint(drag.id);
    var tip = pointAlong(dragPath(drag.id, hit), easeOut(u));
    ctx.fillStyle = 'rgba(255,122,26,0.14)';
    band(drag.id);
    ctx.fill();
    drawPin(from, tip, hit.cells.length === SL.CAP);
    hit.cells.forEach(function (index, i) {
      if (i / Math.max(1, hit.cells.length) > u) return;
      var at = cellCenter(index);
      ctx.strokeStyle = '#FF7A1A';
      ctx.lineWidth = 3;
      ctx.strokeRect(at.x - layout.cell * 0.38, at.y - layout.cell * 0.38, layout.cell * 0.76, layout.cell * 0.76);
    });
  }

  function dragPath(id, hit) {
    var pts = [entryPoint(id)];
    hit.cells.forEach(function (index) { pts.push(cellCenter(index)); });
    return pts.length > 1 ? pts : [pts[0], { x: pts[0].x + 1, y: pts[0].y + layout.cell }];
  }

  function band(id) {
    var side = id[0];
    var index = +id.slice(1);
    var g = layout;
    ctx.beginPath();
    if (side === 'L' || side === 'R') ctx.rect(g.x, g.y + index * g.cell, g.w, g.cell);
    else ctx.rect(g.x + index * g.cell, g.y, g.cell, g.h);
  }

  function drawAnim() {
    if (!anim) return;
    var t = (now() - anim.t0) / anim.dur;
    var travelEnd = anim.kind === 'take' ? anim.travel : 0.45;
    var u;
    if (anim.kind === 'back') {
      u = t < 0.5 ? easeOut(t / 0.5) * 0.7 : (1 - easeOut((t - 0.5) / 0.5)) * 0.7;
    } else if (t < travelEnd) {
      u = easeOut(t / travelEnd);
    } else {
      u = 1;
    }
    var from = entryPoint(anim.id);
    var tip = tipPoint(anim, u);
    if (anim.kind === 'take' && t >= travelEnd) {
      var chips = rail.querySelectorAll('.ticket');
      var chip = chips[chips.length - 1];
      if (chip) {
        var rect = chip.getBoundingClientRect();
        var host = canvas.getBoundingClientRect();
        var dest = { x: rect.left - host.left + rect.width / 2, y: rect.top - host.top + rect.height / 2 };
        var k = easeOut((t - travelEnd) / Math.max(0.001, 1 - travelEnd));
        var dx = (dest.x - tip.x) * k;
        var dy = (dest.y - tip.y) * k;
        from = { x: from.x + dx, y: from.y + dy };
        tip = { x: tip.x + dx, y: tip.y + dy };
      }
    }
    drawPin(from, tip, anim.cells.length === SL.CAP && t > 0.7);
    anim.letters.forEach(function (ch, i) {
      var stick = anim.kind === 'back' ? u : Math.min(1, u * anim.cells.length - i * 0.15);
      if (stick <= 0) return;
      var at = cellCenter(anim.cells[i]);
      var p = { x: tip.x + (at.x - tip.x) * (1 - stick), y: tip.y + (at.y - tip.y) * (1 - stick) };
      if (anim.kind === 'take' && t >= travelEnd) {
        var back = 18 + i * 16;
        var mag = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
        p = { x: tip.x - (tip.x - from.x) / mag * back, y: tip.y - (tip.y - from.y) / mag * back };
      }
      drawFood(ch, p.x, p.y, layout.cell);
    });
  }

  function drawParticles() {
    particles.forEach(function (p) {
      ctx.globalAlpha = fade * Math.max(0, p.life / 0.45);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = fade;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function frame(t) {
    if (fade < 1) fade = Math.min(1, fade + (1 / 60) / 0.16);
    if (anim && t >= anim.t0 + anim.dur) finishAnim();
    particles.forEach(function (p) {
      p.life -= 1 / 60;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
    });
    particles = particles.filter(function (p) { return p.life > 0; });
    if (drag) renderTickets();
    paint();
    requestAnimationFrame(frame);
  }

  function lanePoint(id) {
    var side = id[0];
    var index = +id.slice(1);
    var g = layout;
    var x;
    var y;
    var tx;
    var ty;
    if (side === 'L') {
      x = g.x - 16; y = g.y + (index + 0.5) * g.cell; tx = x + g.cell * 0.55; ty = y;
    } else if (side === 'R') {
      x = g.x + g.w + 16; y = g.y + (index + 0.5) * g.cell; tx = x - g.cell * 0.55; ty = y;
    } else if (side === 'T') {
      x = g.x + (index + 0.5) * g.cell; y = g.y - 16; tx = x; ty = y + g.cell * 0.55;
    } else {
      x = g.x + (index + 0.5) * g.cell; y = g.y + g.h + 16; tx = x; ty = y - g.cell * 0.55;
    }
    return { from: clientOf(x, y), to: clientOf(tx, ty) };
  }

  function laneRects() {
    var g = layout;
    var rect = canvas.getBoundingClientRect();
    var out = [];
    for (var r = 0; r < state.H; r++) {
      out.push({ id: 'L' + r, x: rect.left + g.x - 44, y: rect.top + g.y + r * g.cell, w: 44, h: g.cell });
      out.push({ id: 'R' + r, x: rect.left + g.x + g.w, y: rect.top + g.y + r * g.cell, w: 44, h: g.cell });
    }
    for (var c = 0; c < state.W; c++) {
      out.push({ id: 'T' + c, x: rect.left + g.x + c * g.cell, y: rect.top + g.y - 44, w: g.cell, h: 44 });
      out.push({ id: 'B' + c, x: rect.left + g.x + c * g.cell, y: rect.top + g.y + g.h, w: g.cell, h: 44 });
    }
    return out;
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    ensureAudio();
    if (blocked()) return;
    var p = localPoint(event);
    var edge = edgeAt(p.x, p.y);
    if (!edge) return;
    drag = { id: edge.id, side: edge.side, x0: p.x, y0: p.y, x: p.x, y: p.y, axis: null, pointer: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    var p = localPoint(event);
    drag.x = p.x;
    drag.y = p.y;
    var dx = p.x - drag.x0;
    var dy = p.y - drag.y0;
    if (!drag.axis && Math.hypot(dx, dy) >= 12) drag.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    var d = drag;
    drag = null;
    if (Math.hypot(d.x - d.x0, d.y - d.y0) < 12) return;
    if (!axisOk(d)) return;
    if (inwardOf(d) < layout.cell * 0.4) return;
    commit(d.id);
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', function (event) {
    if (!state || overlayOpen() || anim) return;
    var list = lanes();
    var key = event.key;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') keyLane = (keyLane + list.length - 1) % list.length;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') keyLane = (keyLane + 1) % list.length;
    else if (key === 'ArrowUp' || key === 'w' || key === 'W') keyLane = (keyLane + list.length - 2) % list.length;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') keyLane = (keyLane + 2) % list.length;
    else if (key === 'Enter') { keyArmed = true; commit(list[keyLane].id); event.preventDefault(); return; }
    else return;
    keyArmed = true;
    drag = null;
    event.preventDefault();
    renderTickets();
  });

  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('stuck-undo').addEventListener('click', undo);
  document.getElementById('restart').addEventListener('click', restart);
  document.getElementById('stuck-restart').addEventListener('click', restart);
  document.getElementById('fail-restart').addEventListener('click', restart);
  document.getElementById('win-retry').addEventListener('click', restart);
  document.getElementById('lesson-ok').addEventListener('click', dismissLesson);
  document.getElementById('menu').addEventListener('click', openMenu);
  document.getElementById('fail-menu').addEventListener('click', openMenu);
  document.getElementById('win-menu').addEventListener('click', openMenu);
  document.getElementById('resume').addEventListener('click', function () { document.getElementById('menu-panel').classList.add('hidden'); });
  document.getElementById('how').addEventListener('click', function () {
    document.getElementById('menu-panel').classList.add('hidden');
    document.getElementById('help').classList.remove('hidden');
  });
  document.getElementById('help-close').addEventListener('click', function () { document.getElementById('help').classList.add('hidden'); });
  document.getElementById('win-next').addEventListener('click', function () { if (state.n < SL.levels().length) load(state.n + 1); });
  document.getElementById('mute').addEventListener('click', function () {
    progress.mute = !progress.mute;
    saveProgress();
    syncChrome();
  });

  function openMenu() {
    hideAll();
    var box = document.getElementById('levels');
    box.innerHTML = '';
    SL.levels().forEach(function (level) {
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
  var startLevel = Math.max(1, Math.min(11, +(params.get('level') || 1)));
  load(startLevel);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  window.__shish = {
    ready: true,
    snapshot: function () {
      var stars = state.undos === 0 ? 3 : state.undos === 1 ? 2 : 1;
      return {
        level: state.n,
        name: state.name,
        board: state.board,
        tickets: state.tickets.slice(),
        skewers: state.skewers,
        budget: state.budget,
        undos: state.undos,
        moves: state.moves,
        won: !document.getElementById('win').classList.contains('hidden'),
        failed: !document.getElementById('fail').classList.contains('hidden'),
        stuck: !document.getElementById('stuck').classList.contains('hidden'),
        banner: document.getElementById('stuck-copy').textContent,
        stars: stars,
        cell: layout.cell
      };
    },
    cellSize: function () { return layout.cell; },
    bufferScale: function () { return dpr; },
    animating: function () { return !!anim; },
    animMs: function () { return lastDur; },
    lanePoint: lanePoint,
    laneRects: laneRects,
    commit: commit,
    load: load,
    dismiss: function () { state.lessons = []; document.getElementById('lesson').classList.add('hidden'); },
    last: function () { return lastCommit; },
    recognizeOnly: function (value) { recognizeOnly = value; },
    metrics: function () {
      var stageBox = stage.getBoundingClientRect();
      return { sw: stageBox.width, sh: stageBox.height, bw: canvas.width, bh: canvas.height, cell: layout.cell, scale: dpr };
    },
    events: function () { return events.slice(); }
  };
})();
