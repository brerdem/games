(function () {
  var F = FizzLogic;
  var COLOUR = {
    A: { fill: '#E8344E', ink: '#7A1024', pattern: 'dots' },
    B: { fill: '#8BD43A', ink: '#2E5A10', pattern: 'stripes' },
    C: { fill: '#3F6FE0', ink: '#10245E', pattern: 'waves' }
  };
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var dpr = 1;
  var cssW = 390;
  var cssH = 844;
  var geom = null;
  var level = null;
  var board = null;
  var left = 0;
  var used = 0;
  var stack = [];
  var stains = [];
  var anim = null;
  var bubbles = [];
  var audio = null;
  var mute = false;
  var settled = false;
  var winShown = false;
  var failShown = false;
  var stuckShown = false;
  var blockUntilLift = false;
  var tapQuietUntil = 0;
  var graceUntil = 0;
  var wiggleCount = 0;
  var wiggles = [];
  var solveJob = null;
  var solveT0 = 0;
  var drain = null;
  var winAt = 0;
  var confetti = [];
  var levelStarted = 0;
  var lastCascadeMs = 0;
  var cascadeEndedAt = 0;
  var viewCont = [];
  var viewTilt = [];
  var sprites = {};
  var towerLayer = null;
  var prepared = null;
  var showPath = false;
  var ftLog = [];
  var backdrop = null;
  var reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { reduced = false; }

  function now() { return performance.now(); }
  function scaleTime() { return reduced ? 0.5 : 1; }

  function resize() {
    var rect = stage.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    var raw = window.devicePixelRatio || 1;
    dpr = raw > 1.5 ? 1.5 : raw;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backdrop = null;
    towerLayer = null;
    layout();
    paint();
  }

  var RIM_GAP = 12;

  function layout() {
    if (!level) return;
    var hud = document.getElementById('hud').offsetHeight || 64;
    var bar = document.getElementById('bar').offsetHeight || 72;
    var glassRows = 0;
    var glassCols = 0;
    level.glasses.forEach(function (g) {
      glassRows = Math.max(glassRows, g.r + 1);
      glassCols = Math.max(glassCols, g.c + 1);
    });
    var art = 1;
    var cell = Math.min(148, (cssW - 4) / glassCols);
    var guard = 0;
    while (guard++ < 16) {
      var fitted = largestFit(cell, glassCols, art);
      geom = {
        hud: hud, bar: bar, bottles: fitted.boxes,
        cell: cell, rows: glassRows, cols: glassCols, x0: fitted.x0, y0: 0
      };
      var y0 = 0;
      for (var i = 0; i < geom.bottles.length; i++) {
        var box = geom.bottles[i];
        var glass = entryGlass(i);
        y0 = Math.max(y0, hud + 4 + RIM_GAP + spoutDrop(box) - rimOffset(glass));
      }
      geom.y0 = y0;
      for (i = 0; i < geom.bottles.length; i++) {
        box = geom.bottles[i];
        geom.bottles[i].y = y0 + rimOffset(entryGlass(i)) - RIM_GAP - spoutDrop(box);
      }
      var towerBottom = y0 + glassRows * cell * 0.92 + 16;
      if (towerBottom <= cssH - bar - 4 || cell <= 26) break;
      cell *= 0.92;
    }
  }

  function entryGlass(i) {
    var spec = level.bottles[i];
    return level.glasses[level.indexOf[spec.r + ',' + spec.c]];
  }

  function rimOffset(glass) {
    var tall = glass.cap === 2;
    var gh = geom.cell * (tall ? 0.7 : 0.42);
    var ang = glass.tilt === 'L' ? -0.2 : 0.2;
    return glass.r * geom.cell * 0.92 + geom.cell * 0.46 - (gh / 2) * Math.cos(ang);
  }

  function aimAngle(box) {
    return Math.max(-0.4, Math.min(0.4, (box.aim - (box.x + box.w / 2)) / box.h));
  }

  function spoutDrop(box) {
    var localY = box.h * 0.42 * (box.art || 1);
    return box.h / 2 + Math.cos(aimAngle(box)) * localY;
  }

  function spoutOf(box, extra) {
    var ang = aimAngle(box) + (extra || 0);
    var localY = box.h * 0.42 * (box.art || 1);
    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    return { x: cx - Math.sin(ang) * localY, y: cy + Math.cos(ang) * localY };
  }

  function rimPoint(glass, tilt) {
    var at = glassCenter(glass);
    var tall = glass.cap === 2;
    var gh = geom.cell * (tall ? 0.7 : 0.42);
    var ang = (tilt || glass.tilt) === 'L' ? -0.2 : 0.2;
    return { x: at.x + Math.sin(ang) * gh / 2, y: at.y - Math.cos(ang) * gh / 2 };
  }

  function placeRow(x0, cell, size, art) {
    var groups = {};
    var order = [];
    for (var i = 0; i < level.bottles.length; i++) {
      var col = level.bottles[i].c;
      if (!groups[col]) { groups[col] = []; order.push(col); }
      groups[col].push(i);
    }
    var boxes = new Array(level.bottles.length);
    for (var g = 0; g < order.length; g++) {
      var ids = groups[order[g]];
      var gx = x0 + order[g] * cell + cell * 0.5;
      var left = gx - ids.length * size / 2;
      for (var k = 0; k < ids.length; k++) {
        boxes[ids[k]] = { i: ids[k], x: Math.floor(left + k * size), y: 0, w: size, h: size, aim: gx, art: art };
      }
    }
    return boxes;
  }

  function rowFits(boxes) {
    for (var i = 0; i < boxes.length; i++) {
      var a = boxes[i];
      if (a.x < 1 || a.x + a.w > cssW - 1) return false;
      for (var j = i + 1; j < boxes.length; j++) {
        var b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w) return false;
      }
    }
    return true;
  }

  function fitAt(cell, size, art, cols) {
    var x0 = (cssW - cols * cell) / 2;
    var boxes = placeRow(x0, cell, size, art);
    var min = Infinity;
    var max = -Infinity;
    for (var i = 0; i < boxes.length; i++) {
      min = Math.min(min, boxes[i].x);
      max = Math.max(max, boxes[i].x + boxes[i].w);
    }
    if (max - min > cssW - 4) return null;
    var shift = 0;
    if (min < 2) shift = 2 - min;
    if (max + shift > cssW - 2) shift = (cssW - 2) - max;
    if (min + shift < 2) return null;
    if (shift) {
      x0 += shift;
      boxes = placeRow(x0, cell, size, art);
    }
    if (!rowFits(boxes)) return null;
    return { x0: x0, boxes: boxes, size: size };
  }

  function largestFit(cell, cols, art) {
    var size = 64;
    while (size >= 44) {
      var fitted = fitAt(cell, size, art, cols);
      if (fitted) return fitted;
      size -= 1;
    }
    var x0 = (cssW - cols * cell) / 2;
    return { x0: x0, size: 44, boxes: placeRow(x0, cell, 44, art) };
  }

  function load(n) {
    var all = F.levels();
    level = all[Math.max(0, Math.min(all.length, n) - 1)];
    board = F.start(level);
    left = level.budget;
    used = 0;
    stack = [];
    stains = [];
    anim = null;
    bubbles = [];
    settled = false;
    winShown = false;
    failShown = false;
    stuckShown = false;
    hideAll();
    document.getElementById('kicker').textContent = 'Tower ' + level.n;
    document.getElementById('name').textContent = level.name;
    syncHud();
    layout();
    levelStarted = now();
    graceUntil = 0;
    winAt = 0;
    confetti = [];
    drain = null;
    solveJob = null;
    paint();
    document.getElementById('loading').classList.add('hidden');
    if (level._graph) level._solverMs = 0;
    else {
      solveJob = F.beginSolve(level);
      solveT0 = now();
      setTimeout(pumpSolve, 0);
    }
  }

  function pumpSolve() {
    if (!solveJob || !level || solveJob.level !== level) return;
    var done = F.stepSolve(solveJob, 3);
    if (!done) {
      setTimeout(pumpSolve, 0);
      return;
    }
    level._solverMs = now() - solveT0;
    solveJob = null;
    if (!anim && !settled && !winAt) reveal(judge());
  }

  function hideAll() {
    ['menu-panel', 'help', 'win', 'stuck', 'fail'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
    var checking = document.getElementById('checking');
    if (checking) checking.classList.add('hidden');
    document.getElementById('bar').classList.remove('hidden');
  }

  function syncHud() {
    document.getElementById('pours').textContent = 'Pours ' + used + '/' + level.budget;
    var pips = document.getElementById('pips');
    pips.innerHTML = '';
    for (var i = 0; i < level.budget; i++) {
      var pip = document.createElement('i');
      pip.className = 'pip' + (i < used ? ' spent' : '');
      pips.appendChild(pip);
    }
    document.getElementById('undo').disabled = settled || !stack.length || left < 1 || !!anim;
    document.getElementById('mute').textContent = mute ? 'Muted' : 'Snd';
    document.getElementById('path').textContent = showPath ? 'Spill path on' : 'Spill path off';
  }

  function overlayOpen() {
    return ['menu-panel', 'help', 'win', 'stuck', 'fail', 'loading'].some(function (id) {
      return !document.getElementById(id).classList.contains('hidden');
    });
  }

  function judge() {
    if (F.won(level, board)) return 'win';
    if (left <= 0) return 'fail';
    var known = F.distanceIfKnown(level, board);
    if (known == null) return 'pending';
    if (known > left) return 'stuck';
    return null;
  }

  function reveal(outcome) {
    var checking = document.getElementById('checking');
    if (outcome === 'pending') {
      if (checking) checking.classList.remove('hidden');
      syncHud();
      return;
    }
    if (checking) checking.classList.add('hidden');
    if (outcome === 'win') winAt = now() + 750;
    else if (outcome === 'fail') showFail();
    else if (outcome === 'stuck') showStuck();
    syncHud();
  }

  function showWin() {
    if (winShown) return;
    winShown = true;
    settled = true;
    var over = used - level.par;
    var stars = over <= 0 ? 3 : over === 1 ? 2 : 1;
    document.getElementById('win-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(stars);
    document.getElementById('win-copy').textContent = used + ' pours. Par is ' + level.par + '.';
    var next = document.getElementById('win-next');
    next.disabled = level.n >= F.levels().length;
    document.getElementById('bar').classList.add('hidden');
    document.getElementById('win').classList.remove('hidden');
    chord();
  }

  function showFail() {
    if (failShown || winShown) return;
    failShown = true;
    settled = true;
    document.getElementById('fail').classList.remove('hidden');
  }

  function showStuck() {
    if (stuckShown || winShown || failShown) return;
    stuckShown = true;
    document.getElementById('stuck-copy').textContent = F.stuckText(left);
    document.getElementById('stuck').classList.remove('hidden');
  }

  function ensureAudio() {
    if (audio) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }

  function tone(freq, dur, type, gain) {
    if (mute || !audio) return;
    if (audio.state === 'suspended') audio.resume();
    var osc = audio.createOscillator();
    var amp = audio.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    amp.gain.setValueAtTime(gain || 0.04, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }

  function chord() {
    var notes = level.glasses.length;
    for (var i = 0; i < notes; i++) {
      (function (step) {
        setTimeout(function () { tone(523 * Math.pow(2, step / 12), 0.16, 'triangle', 0.05); }, step * 70);
      })(i);
    }
  }

  function pourSound(colour) {
    var freq = colour === 'A' ? 220 : colour === 'B' ? 277 : 330;
    tone(freq, 0.12, 'sine', 0.05);
  }

  function beginPour(bottle) {
    if (anim || now() < graceUntil || settled || overlayOpen() || left < 1) return false;
    if (bottle < 0 || bottle >= level.bottles.length) return false;
    var before = F.clone(board);
    var result = F.pour(level, board, bottle);
    var spilled = false;
    if (result.kind === 'spill') {
      var push = result.events[result.events.length - 2];
      if (push && push.type === 'push') {
        var glass = level.glasses[push.glass];
        stains.push({ r: glass.r, c: glass.c, lean: push.lean, colour: push.colourOut });
        spilled = true;
      }
    }
    stack.push({ board: before, stain: spilled });
    board = result.state;
    left -= 1;
    used += 1;
    anim = {
      bottle: bottle,
      events: result.events,
      plan: cascadePlan(result.events.length),
      t0: now(),
      before: before,
      outcome: null,
      sounded: {}
    };
    pourSound(level.bottles[bottle].colour);
    syncHud();
    return true;
  }

  function undo() {
    if (anim || settled || !stack.length || overlayOpen()) return;
    var entry = stack.pop();
    board = entry.board;
    if (entry.stain && stains.length) stains.pop();
    left += 1;
    used -= 1;
    left -= 1;
    used += 1;
    tone(180, 0.06, 'triangle', 0.03);
    var outcome = F.won(level, board) ? 'win' : (left <= 0 ? 'fail' : null);
    if (!outcome) {
      var known = F.distanceIfKnown(level, board);
      if (known == null) outcome = 'pending';
      else if (known > left) outcome = 'stuck';
    }
    reveal(outcome);
    syncHud();
    paint();
  }

  function cascadePlan(count) {
    var scale = scaleTime();
    var cap = 1140 * scale;
    var lead = 200 * scale;
    var full = 280 * scale;
    var rest = Math.max(0, count - 1);
    var room = cap - lead - full;
    var mid = rest ? Math.min(full, room / rest) : 0;
    if (room < 0) {
      var fit = cap / (lead + full);
      lead *= fit;
      full *= fit;
      mid = 0;
    }
    var marks = [0, lead];
    var cursor = lead;
    for (var i = 0; i < count; i++) {
      cursor += i === 0 ? full : mid;
      marks.push(cursor);
    }
    return { lead: lead, full: full, mid: mid, total: Math.min(cap, cursor), marks: marks };
  }

  function animClock(t) {
    if (!anim) return null;
    var plan = anim.plan;
    var elapsed = t - anim.t0;
    if (elapsed >= plan.total) return { done: true, index: anim.events.length, u: 1, event: null };
    if (elapsed < plan.lead) return { done: false, index: -1, u: elapsed / plan.lead, event: null };
    for (var i = 0; i < anim.events.length; i++) {
      var start = plan.marks[i + 1];
      var end = plan.marks[i + 2];
      if (elapsed < end) return { done: false, index: i, u: (elapsed - start) / (end - start), event: anim.events[i] };
    }
    return { done: true, index: anim.events.length, u: 1, event: null };
  }

  function viewState(phase) {
    var src = anim.before;
    for (var g = 0; g < src.cont.length; g++) {
      var from = src.cont[g];
      var dest = viewCont[g];
      if (!dest) dest = viewCont[g] = [];
      dest.length = from.length;
      for (var k = 0; k < from.length; k++) dest[k] = from[k];
    }
    viewCont.length = src.cont.length;
    viewTilt.length = src.tilt.length;
    for (var t = 0; t < src.tilt.length; t++) viewTilt[t] = src.tilt[t];
    var limit = phase.index < 0 ? 0 : phase.index;
    for (var i = 0; i < limit; i++) applyShown(viewCont, viewTilt, anim.events[i]);
    return { cont: viewCont, tilt: viewTilt };
  }

  function applyShown(cont, tilt, event) {
    if (event.type === 'settle') cont[event.glass].push(event.colour);
    else if (event.type === 'push') {
      cont[event.glass][cont[event.glass].length - 1] = event.colourIn;
      if (event.rock) tilt[event.glass] = event.lean === 'L' ? 'R' : 'L';
    }
  }

  function glassCenter(glass) {
    var x = geom.x0 + glass.c * geom.cell + geom.cell * 0.5;
    var y = geom.y0 + glass.r * geom.cell * 0.92 + geom.cell * 0.46;
    return { x: x, y: y };
  }

  function leanOf(tilt) { return tilt === 'L' ? -0.2 : 0.2; }

  function ensureBackdrop() {
    if (backdrop && backdrop.w === cssW && backdrop.h === cssH && backdrop.dpr === dpr) return;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cssW * dpr));
    c.height = Math.max(1, Math.round(cssH * dpr));
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, '#2B1B3D');
    grad.addColorStop(1, '#5A2E5C');
    g.fillStyle = grad;
    g.fillRect(0, 0, cssW, cssH);
    g.globalAlpha = 0.12;
    var spots = [[0.18, 0.12, 18, '#E7C36A'], [0.8, 0.18, 14, '#E8344E'], [0.55, 0.08, 10, '#F7F3EA'], [0.1, 0.7, 12, '#3F6FE0'], [0.88, 0.62, 16, '#E7C36A']];
    for (var i = 0; i < spots.length; i++) {
      g.fillStyle = spots[i][3];
      g.beginPath();
      g.arc(spots[i][0] * cssW, spots[i][1] * cssH, spots[i][2], 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    backdrop = { canvas: c, w: cssW, h: cssH, dpr: dpr };
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

  function sprite(style) {
    if (sprites[style]) return sprites[style];
    var c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    var g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.fillStyle = 'rgba(255,255,255,.45)';
    if (style === 'dots') {
      for (var y = 4; y < 48; y += 7) {
        for (var x = 4; x < 48; x += 7) {
          g.beginPath();
          g.arc(x, y, 1.5, 0, Math.PI * 2);
          g.fill();
        }
      }
    } else if (style === 'stripes') {
      g.lineWidth = 2;
      for (var s = 3; s < 48; s += 6) {
        g.beginPath();
        g.moveTo(0, s);
        g.lineTo(48, s);
        g.stroke();
      }
    } else {
      g.lineWidth = 1.5;
      g.beginPath();
      for (var wave = 4; wave < 48; wave += 6) {
        g.moveTo(0, wave);
        g.bezierCurveTo(14, wave - 3, 30, wave + 3, 48, wave);
      }
      g.stroke();
    }
    sprites[style] = c;
    return c;
  }

  function pattern(style, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(sprite(style), x, y, w, h);
    ctx.restore();
  }

  function drawLiquid(x, y, w, h, layers) {
    if (!layers.length) return;
    var slice = h / Math.max(layers.length, 1);
    for (var i = 0; i < layers.length; i++) {
      var style = COLOUR[layers[i]] || COLOUR.A;
      var ly = y + h - (i + 1) * slice;
      ctx.fillStyle = style.fill;
      ctx.fillRect(x, ly, w, slice + 0.5);
      pattern(style.pattern, x, ly, w, slice);
    }
  }

  function drawGlass(i, cont, tilt, wobble) {
    var glass = level.glasses[i];
    var at = glassCenter(glass);
    var tall = glass.cap === 2;
    var w = geom.cell * (tall ? 0.46 : 0.62);
    var h = geom.cell * (tall ? 0.7 : 0.42);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(leanOf(tilt) + (wobble || 0));
    if (glass.rocker) {
      ctx.fillStyle = '#C6A15A';
      ctx.strokeStyle = '#6E4E16';
      ctx.lineWidth = 2;
      roundRect(-w * 0.7, h * 0.42, w * 1.4, 10, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8A6420';
      ctx.fillRect(-w * 0.62, h * 0.5, 6, 7);
      ctx.fillRect(w * 0.48, h * 0.5, 6, 7);
    }
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    roundRect(-w / 2, -h / 2, w, h, tall ? 8 : 16);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, tall ? 6 : 12);
    ctx.clip();
    drawLiquid(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, cont);
    var target = level.target[i];
    var band = (h - 6) / target.length;
    var solved = cont.length === target.length;
    for (var b = 0; b < target.length; b++) {
      var match = cont[b] === target[b];
      if (!match) solved = false;
      var colour = (COLOUR[target[b]] || COLOUR.A);
      var by = h / 2 - 6 - (b + 1) * band + 2;
      var bx = -w / 2 + 6;
      var bw = w - 12;
      var bh = band - 3;
      ctx.fillStyle = colour.fill;
      ctx.globalAlpha = match ? 0.72 : 0.58;
      ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = match ? 0.9 : 0.75;
      pattern(colour.pattern, bx, by, bw, bh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colour.ink;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.strokeRect(bx, by, bw, bh);
    }
    if (solved && target.length) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#F7F3EA';
      ctx.beginPath();
      ctx.arc(0, -h * 0.42, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    var spout = tilt === 'L' ? -1 : 1;
    ctx.fillStyle = '#F4F7FB';
    ctx.beginPath();
    ctx.moveTo(spout * w * 0.42, h * 0.05);
    ctx.lineTo(spout * (w * 0.42 + 10), h * 0.16);
    ctx.lineTo(spout * w * 0.42, h * 0.22);
    ctx.fill();
    ctx.restore();
  }

  function drawBottle(i, tipping) {
    var box = geom.bottles[i];
    var spec = level.bottles[i];
    var style = COLOUR[spec.colour];
    var bob = anim ? 0 : Math.sin(now() / 420 + i) * 3;
    var wiggle = wiggles[i] && now() < wiggles[i] ? Math.sin((wiggles[i] - now()) / 28) * 0.18 : 0;
    var aim = Math.max(-0.4, Math.min(0.4, (box.aim - (box.x + box.w / 2)) / box.h));
    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2 + bob);
    ctx.rotate((tipping || 0) + wiggle + aim);
    ctx.scale(box.art || 1, box.art || 1);
    if (level.n === 1 && used === 0 && !anim) {
      var pulse = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(now() / 180));
      ctx.strokeStyle = 'rgba(232,52,78,' + pulse + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 4, box.w * 0.34, box.h * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    roundRect(-12, -box.h * 0.34, 24, box.h * 0.62, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = style.fill;
    ctx.fillRect(-10, -box.h * 0.22, 20, box.h * 0.34);
    pattern(style.pattern, -10, -box.h * 0.22, 20, box.h * 0.34);
    ctx.fillStyle = '#FFF6EA';
    ctx.strokeStyle = '#2B1B3D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(-4, box.h * 0.26, 8, box.h * 0.16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (level.n === 2 && used === 0 && !anim && spec.colour === 'B' && now() - levelStarted > 4000) {
      ctx.fillStyle = 'rgba(139,212,58,.85)';
      ctx.beginPath();
      ctx.moveTo(box.x + box.w / 2, box.y + box.h + 8);
      ctx.lineTo(box.x + box.w / 2 - 7, box.y + box.h + 20);
      ctx.lineTo(box.x + box.w / 2 + 7, box.y + box.h + 20);
      ctx.fill();
    }
  }

  function drawStains() {
    stains.forEach(function (stain, n) {
      var x = geom.x0 + stain.c * geom.cell + (stain.lean === 'L' ? -6 : geom.cell);
      var y = geom.y0 + (stain.r + 1) * geom.cell * 0.92 + 8;
      ctx.fillStyle = 'rgba(90,40,50,.28)';
      ctx.beginPath();
      ctx.ellipse(x, Math.min(cssH - geom.bar - 8, y), 10 + (n % 3), 5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawRibbon(event, u) {
    var from = glassCenter(level.glasses[event.glass]);
    var dir = event.lean === 'L' ? -1 : 1;
    var style = COLOUR[event.colourOut];
    var x = from.x + dir * (10 + u * geom.cell * 0.55);
    var y = from.y + 8 + u * u * geom.cell * 0.55;
    ctx.fillStyle = style.fill;
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 7, dir * 0.4, 0, Math.PI * 2);
    ctx.fill();
    pattern(style.pattern, x - 10, y - 6, 20, 12);
  }

  function drawStream(x0, y0, x1, y1, colour) {
    ctx.strokeStyle = (COLOUR[colour] || COLOUR.A).fill;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0, (y0 + y1) / 2, x1, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }

  function drawPathPreview() {
    if (!showPath || anim) return;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    for (var b = 0; b < level.bottles.length; b++) {
      var info = F.pour(level, board, b);
      ctx.strokeStyle = COLOUR[level.bottles[b].colour].fill;
      ctx.beginPath();
      var box = geom.bottles[b];
      ctx.moveTo(box.x + box.w / 2, box.y + box.h);
      for (var i = 0; i < info.path.length; i++) {
        var at = glassCenter(level.glasses[info.path[i]]);
        ctx.lineTo(at.x, at.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawTowerBody(shown, tilt, skip, drainU) {
    ctx.fillStyle = '#F7F3EA';
    roundRect(geom.x0 - 18, geom.y0 - 8, geom.cell * (geom.cols + 0.2) + 20, geom.cell * geom.rows * 0.92 + 28, 16);
    ctx.fill();
    drawStains();
    for (var i = 0; i < level.glasses.length; i++) {
      if (i === skip) continue;
      var layers = shown.cont[i];
      if (drainU > 0) layers = layers.slice(0, Math.max(0, Math.ceil(layers.length * (1 - drainU)) - 1));
      drawGlass(i, layers, tilt[i], 0);
    }
  }

  function towerStamp(shown, tilt, skip) {
    var parts = level.n + '|' + skip + '|' + dpr + '|' + cssW + '|' + geom.cell + '|' + stains.length;
    for (var i = 0; i < shown.cont.length; i++) {
      parts += i === skip ? '|~' : ('|' + tilt[i] + shown.cont[i].join(''));
    }
    return parts;
  }

  function blitTower(shown, tilt, skip) {
    var stamp = towerStamp(shown, tilt, skip);
    if (!towerLayer || towerLayer.stamp !== stamp || towerLayer.w !== canvas.width) {
      var c = towerLayer ? towerLayer.canvas : document.createElement('canvas');
      if (c.width !== canvas.width || c.height !== canvas.height) {
        c.width = canvas.width;
        c.height = canvas.height;
      }
      var g = c.getContext('2d');
      var saved = ctx;
      ctx = g;
      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        drawTowerBody(shown, tilt, skip, 0);
      } finally {
        ctx = saved;
      }
      towerLayer = { canvas: c, stamp: stamp, w: canvas.width };
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(towerLayer.canvas, 0, 0);
    ctx.restore();
  }

  function paint() {
    ensureBackdrop();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(backdrop.canvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!level || !geom) return;
    var phase = animClock(now());
    var shown = board;
    var tilt = board.tilt;
    if (anim && phase && !phase.done) {
      var view = viewState(phase);
      if (phase.index >= 0 && phase.u > 0.55 && phase.event && phase.event.type !== 'drip') {
        applyShown(view.cont, view.tilt, phase.event);
      }
      shown = view;
      tilt = view.tilt;
    }
    var drainU = drain ? Math.min(1, (now() - drain.t0) / drain.dur) : 0;
    var skip = -1;
    var wobble = 0;
    if (anim && phase && phase.event && phase.event.rock && phase.event.glass != null) {
      skip = phase.event.glass;
      wobble = Math.sin(phase.u * Math.PI) * 0.14 * (phase.event.lean === 'L' ? 1 : -1);
    }
    if (drainU > 0) drawTowerBody(shown, tilt, -1, drainU);
    else blitTower(shown, tilt, skip);
    if (level.n === 3 && used === 0 && !anim) {
      var glow = 0.35 + 0.35 * Math.sin(now() / 200);
      ctx.strokeStyle = 'rgba(231,195,106,' + glow + ')';
      ctx.lineWidth = 3;
      for (var r = 0; r < level.glasses.length; r++) {
        if (!level.rock[r]) continue;
        var spot = glassCenter(level.glasses[r]);
        ctx.beginPath();
        ctx.ellipse(spot.x, spot.y + 8, geom.cell * 0.34, geom.cell * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (skip >= 0) drawGlass(skip, shown.cont[skip], tilt[skip], wobble);
    if (anim && phase && !phase.done && phase.index >= 0 && phase.event && phase.event.type === 'push') {
      drawRibbon(phase.event, phase.u);
    }
    if (anim && phase && phase.index < 0) {
      var spec = level.bottles[anim.bottle];
      var glass = level.glasses[level.indexOf[spec.r + ',' + spec.c]] || level.glasses[0];
      var tilt = anim.before.tilt[level.indexOf[spec.r + ',' + spec.c]];
      var tipNow = phase.u < 0.22 ? -0.035 : 0.4;
      var from = spoutOf(geom.bottles[anim.bottle], tipNow);
      var rim = rimPoint(glass, tilt);
      drawStream(from.x, from.y, rim.x, rim.y, spec.colour);
    }
    for (var b = 0; b < level.bottles.length; b++) {
      var tip = 0;
      if (anim && anim.bottle === b && phase && phase.index < 0) tip = phase.u < 0.22 ? -0.035 : 0.4;
      drawBottle(b, tip);
    }
    drawPathPreview();
    for (var p = 0; p < bubbles.length; p++) {
      var bub = bubbles[p];
      ctx.globalAlpha = Math.max(0, bub.life);
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (var f = 0; f < confetti.length; f++) {
      var bit = confetti[f];
      ctx.globalAlpha = Math.max(0, bit.life);
      ctx.fillStyle = bit.color;
      ctx.fillRect(bit.x, bit.y, 4, 6);
    }
    ctx.globalAlpha = 1;
  }

  function spawnBubbles(x, y, n) {
    for (var i = 0; i < n && bubbles.length < 80; i++) {
      bubbles.push({ x: x + (Math.random() - 0.5) * 16, y: y, r: 1.5 + Math.random() * 2.2, life: 1, vy: 18 + Math.random() * 20 });
    }
  }

  function frame(t) {
    if (anim) {
      var phase = animClock(t);
      if (phase && phase.index >= 0 && anim.events[phase.index] && !anim.sounded[phase.index] && phase.u > 0.15) {
        anim.sounded[phase.index] = true;
        var event = anim.events[phase.index];
        if (event.type === 'push' && event.rock) tone(520 + phase.index * 40, 0.08, 'square', 0.04);
        else if (event.type === 'settle') tone(680, 0.07, 'sine', 0.04);
        else if (event.type === 'drip') tone(160, 0.1, 'triangle', 0.04);
        var glass = level.glasses[event.glass];
        if (glass) {
          var at = glassCenter(glass);
          spawnBubbles(at.x, at.y, 4);
        }
      }
      if (phase && phase.done) {
        lastCascadeMs = t - anim.t0;
        cascadeEndedAt = t;
        var outcome = judge();
        anim = null;
        graceUntil = t + 150;
        reveal(outcome);
      }
    }
    if (winAt && t >= winAt) {
      winAt = 0;
      showWin();
      for (var c = 0; c < 28; c++) {
        confetti.push({
          x: cssW * (0.2 + Math.random() * 0.6),
          y: geom.y0,
          vx: (Math.random() - 0.5) * 80,
          vy: -40 - Math.random() * 80,
          life: 1,
          color: ['#E8344E', '#8BD43A', '#3F6FE0', '#E7C36A'][c % 4]
        });
      }
    }
    if (drain && t >= drain.t0 + drain.dur) {
      var back = drain.level;
      drain = null;
      load(back);
    }
    if (confetti.length) {
      for (var c = 0; c < confetti.length; c++) {
        confetti[c].x += confetti[c].vx / 60;
        confetti[c].y += confetti[c].vy / 60;
        confetti[c].vy += 80 / 60;
        confetti[c].life -= 0.012;
      }
      var alive = [];
      for (c = 0; c < confetti.length; c++) if (confetti[c].life > 0) alive.push(confetti[c]);
      confetti = alive;
    }
    if (bubbles.length) {
      for (var i = 0; i < bubbles.length; i++) {
        bubbles[i].y -= bubbles[i].vy / 60;
        bubbles[i].life -= 0.02;
      }
      var kept = [];
      for (var j = 0; j < bubbles.length; j++) if (bubbles[j].life > 0) kept.push(bubbles[j]);
      bubbles = kept;
    }
    paint();
    requestAnimationFrame(frame);
  }

  function localPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitBottle(x, y) {
    if (!geom) return -1;
    for (var i = geom.bottles.length - 1; i >= 0; i--) {
      var box = geom.bottles[i];
      if (x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h) return i;
    }
    return -1;
  }

  function armQuiet() { tapQuietUntil = now() + 260; }

  window.addEventListener('pointerdown', function (event) {
    var button = event.target && event.target.closest && event.target.closest('button');
    if (button || overlayOpen()) blockUntilLift = true;
  }, true);
  window.addEventListener('pointerup', function () {
    if (!blockUntilLift) return;
    blockUntilLift = false;
    armQuiet();
  }, true);
  window.addEventListener('pointercancel', function () {
    if (!blockUntilLift) return;
    blockUntilLift = false;
    armQuiet();
  }, true);

  function acknowledge(index) {
    wiggleCount += 1;
    if (index >= 0) wiggles[index] = now() + 220;
    tone(740, 0.035, 'triangle', 0.02);
    var endAt = anim ? anim.t0 + anim.plan.total : cascadeEndedAt;
    ftLog.push({
      t: Date.now(),
      level: level ? level.n : 0,
      sinceEnd: Math.round(now() - endAt),
      bottle: index
    });
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    ensureAudio();
    var p = localPoint(event);
    var hit = hitBottle(p.x, p.y);
    if (anim || now() < graceUntil) {
      acknowledge(hit);
      return;
    }
    if (overlayOpen() || !geom || settled || blockUntilLift || drain || winAt) {
      if (now() < tapQuietUntil) armQuiet();
      return;
    }
    if (now() < tapQuietUntil) {
      armQuiet();
      acknowledge(hit);
      return;
    }
    if (hit >= 0) beginPour(hit);
  });

  document.getElementById('undo').addEventListener('click', undo);
  function requestRestart() {
    if (drain || !level) return;
    hideAll();
    stuckShown = false;
    drain = { t0: now(), dur: 300, level: level.n };
  }
  document.getElementById('restart').addEventListener('click', requestRestart);
  document.getElementById('stuck-restart').addEventListener('click', requestRestart);
  document.getElementById('fail-restart').addEventListener('click', requestRestart);
  document.getElementById('win-retry').addEventListener('click', requestRestart);
  document.getElementById('win-next').addEventListener('click', function () { if (level.n < F.levels().length) load(level.n + 1); });
  document.getElementById('menu').addEventListener('click', function () {
    hideAll();
    document.getElementById('menu-panel').classList.remove('hidden');
    syncHud();
  });
  document.getElementById('fail-menu').addEventListener('click', function () {
    hideAll();
    document.getElementById('menu-panel').classList.remove('hidden');
  });
  document.getElementById('win-menu').addEventListener('click', function () {
    hideAll();
    document.getElementById('menu-panel').classList.remove('hidden');
  });
  document.getElementById('resume').addEventListener('click', function () {
    document.getElementById('menu-panel').classList.add('hidden');
  });
  document.getElementById('how').addEventListener('click', function () {
    document.getElementById('menu-panel').classList.add('hidden');
    document.getElementById('help').classList.remove('hidden');
  });
  document.getElementById('help-close').addEventListener('click', function () {
    document.getElementById('help').classList.add('hidden');
  });
  document.getElementById('path').addEventListener('click', function () {
    showPath = !showPath;
    syncHud();
    paint();
  });
  document.getElementById('mute').addEventListener('click', function () {
    ensureAudio();
    mute = !mute;
    syncHud();
  });

  window.addEventListener('keydown', function (event) {
    if (overlayOpen() || !level) return;
    if (event.key === 'z' || event.key === 'Z') { undo(); return; }
    if (event.key === 'r' || event.key === 'R') { load(level.n); return; }
    if (event.key >= '1' && event.key <= '4') {
      var index = +event.key - 1;
      if (index >= level.bottles.length) return;
      if (anim || now() < graceUntil) { acknowledge(index); return; }
      beginPour(index);
    }
  });

  var params = new URLSearchParams(location.search);
  if (params.get('path') === '1') showPath = true;
  var rawLevel = params.get('level');
  var parsedLevel = rawLevel == null || rawLevel === '' ? 1 : parseInt(rawLevel, 10);
  var initial = (isFinite(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 10) ? parsedLevel : 1;
  load(initial);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  window.__ftLog = ftLog;
  window.__fizz = {
    get ready() { return !!(level && geom && document.getElementById('loading').classList.contains('hidden')); },
    get solverReady() { return !!(level && level._graph); },
    solverMs: function () { return level ? level._solverMs || 0 : 0; },
    load: load,
    undo: function () { undo(); },
    commit: function (index) { return beginPour(index); },
    wiggles: function () { return wiggleCount; },
    stains: function () { return stains.length; },
    cascadeMs: function (count) { return cascadePlan(count).total; },
    cascadePlan: function (count) {
      var plan = cascadePlan(count);
      return { total: plan.total, lead: plan.lead, full: plan.full, mid: plan.mid };
    },
    lastCascadeMs: function () { return lastCascadeMs; },
    cascadeEnded: function () { return cascadeEndedAt; },
    graceLeft: function () { return Math.max(0, graceUntil - now()); },
    prepareLongest: function () {
      var bestN = 0;
      var bestState = null;
      var bestB = 0;
      level._graph.states.forEach(function (state) {
        for (var b = 0; b < level.bottles.length; b++) {
          var n = F.pour(level, state, b).events.length;
          if (n > bestN) { bestN = n; bestState = state; bestB = b; }
        }
      });
      prepared = { state: bestState, bottle: bestB, events: bestN };
      return bestN;
    },
    playPrepared: function () {
      if (!prepared) return 0;
      graceUntil = 0;
      anim = null;
      settled = false;
      board = F.clone(prepared.state);
      beginPour(prepared.bottle);
      paint();
      return prepared.events;
    },
    armLongest: function () {
      var n = this.prepareLongest();
      this.playPrepared();
      return n;
    },
    instant: function (index) {
      var playing = beginPour(index);
      if (!playing) return false;
      anim = null;
      reveal(judge());
      paint();
      return true;
    },
    animating: function () { return !!anim; },
    snapshot: function () {
      var over = used - level.par;
      return {
        level: level.n,
        name: level.name,
        title: document.getElementById('name').textContent,
        left: left,
        used: used,
        budget: level.budget,
        par: level.par,
        won: !document.getElementById('win').classList.contains('hidden'),
        failed: !document.getElementById('fail').classList.contains('hidden'),
        stuck: !document.getElementById('stuck').classList.contains('hidden'),
        banner: document.getElementById('stuck-copy').textContent,
        undoOffered: false,
        stars: over <= 0 ? 3 : over === 1 ? 2 : 1,
        goal: F.won(level, board),
        pours: document.getElementById('pours').textContent,
        path: showPath
      };
    },
    boxes: function () {
      var rect = canvas.getBoundingClientRect();
      return {
        hud: geom.hud,
        bar: geom.bar,
        bottles: geom.bottles.map(function (box, i) {
          return {
            i: i, x: box.x, y: box.y, w: box.w, h: box.h, art: box.art,
            cx: rect.left + box.x + box.w / 2, cy: rect.top + box.y + box.h / 2,
            aim: box.aim, col: level.bottles[i].c,
            spout: spoutOf(box, 0).y,
            rim: rimPoint(entryGlass(i), entryGlass(i).tilt).y,
            gap: rimPoint(entryGlass(i), entryGlass(i).tilt).y - spoutOf(box, 0).y
          };
        })
      };
    },
    bufferScale: function () { return dpr; }
  };
})();
