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
  var showPath = false;
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
    layout();
    paint();
  }

  function layout() {
    if (!level) return;
    var hud = document.getElementById('hud').offsetHeight || 64;
    var bar = document.getElementById('bar').offsetHeight || 72;
    var count = level.bottles.length;
    var gap = 8;
    var margin = 10;
    var inner = cssW - margin * 2;
    var bw = Math.floor((inner - gap * (count - 1)) / count);
    bw = Math.max(64, Math.min(96, bw));
    var rowW = bw * count + gap * (count - 1);
    if (rowW > inner) {
      bw = Math.floor((inner - gap * (count - 1)) / count);
      rowW = bw * count + gap * (count - 1);
    }
    var bh = Math.max(64, Math.min(92, Math.round(cssH * 0.11)));
    var by = hud + 8;
    var x0 = Math.round((cssW - rowW) / 2);
    var bottles = [];
    for (var i = 0; i < count; i++) {
      bottles.push({ x: x0 + i * (bw + gap), y: by, w: bw, h: bh });
    }
    var rows = 0;
    var cols = 0;
    level.glasses.forEach(function (g) {
      rows = Math.max(rows, g.r + 1);
      cols = Math.max(cols, g.c + 1);
    });
    var top = by + bh + 16;
    var bottom = cssH - bar - 12;
    var roomW = cssW - 28;
    var roomH = Math.max(80, bottom - top);
    var cell = Math.min(roomW / (cols + 0.35), roomH / (rows + 0.15));
    cell = Math.max(36, Math.min(92, cell));
    var towerW = cell * (cols + 0.15);
    var towerH = cell * rows * 0.92;
    geom = {
      hud: hud, bar: bar, bottles: bottles,
      cell: cell, rows: rows, cols: cols,
      x0: (cssW - towerW) / 2 + cell * 0.08,
      y0: top + Math.max(0, (roomH - towerH) / 2)
    };
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
    if (!level._graph) {
      var started = now();
      F.graph(level);
      level._solverMs = now() - started;
    } else level._solverMs = 0;
    paint();
    document.getElementById('loading').classList.add('hidden');
  }

  function hideAll() {
    ['menu-panel', 'help', 'win', 'stuck', 'fail'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
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
    if (F.distance(level, board) > left) return 'stuck';
    return null;
  }

  function reveal(outcome) {
    if (outcome === 'win') showWin();
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
    var undo = document.getElementById('stuck-undo');
    var prev = stack[stack.length - 1];
    var offer = !!(prev && F.undoHelps(level, prev, left - 1));
    undo.classList.toggle('hidden', !offer);
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
    [523, 659, 784, 1046].forEach(function (freq, i) {
      setTimeout(function () { tone(freq, 0.18, 'triangle', 0.05); }, i * 80);
    });
  }

  function pourSound(colour) {
    var freq = colour === 'A' ? 220 : colour === 'B' ? 277 : 330;
    tone(freq, 0.12, 'sine', 0.05);
  }

  function beginPour(bottle) {
    if (anim || settled || overlayOpen() || left < 1) return false;
    if (bottle < 0 || bottle >= level.bottles.length) return false;
    var before = F.clone(board);
    var result = F.pour(level, board, bottle);
    stack.push(before);
    board = result.state;
    left -= 1;
    used += 1;
    if (result.kind === 'spill') {
      var push = result.events[result.events.length - 2];
      if (push && push.type === 'push') {
        var glass = level.glasses[push.glass];
        stains.push({ r: glass.r, c: glass.c, lean: push.lean, colour: push.colourOut });
      }
    }
    anim = {
      bottle: bottle,
      events: result.events,
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
    if (anim || settled || left < 1 || !stack.length || overlayOpen()) return;
    hideAll();
    stuckShown = false;
    failShown = false;
    board = stack.pop();
    left -= 1;
    used += 1;
    if (stains.length) stains.pop();
    var outcome = F.won(level, board) ? 'win' : (left <= 0 ? 'fail' : null);
    tone(180, 0.06, 'triangle', 0.03);
    if (!outcome && F.distance(level, board) > left) outcome = 'stuck';
    reveal(outcome);
    syncHud();
    paint();
  }

  function animClock(t) {
    if (!anim) return null;
    var intro = 280 * scaleTime();
    var step = 250 * scaleTime();
    var elapsed = t - anim.t0;
    var total = intro + anim.events.length * step;
    if (elapsed >= total) return { done: true, index: anim.events.length, u: 1 };
    if (elapsed < intro) return { done: false, index: -1, u: elapsed / intro, event: null };
    var index = Math.floor((elapsed - intro) / step);
    return { done: false, index: index, u: ((elapsed - intro) - index * step) / step, event: anim.events[index] };
  }

  function viewState(phase) {
    var cont = anim.before.cont.map(function (g) { return g.slice(); });
    var tilt = anim.before.tilt.slice();
    var limit = phase.index < 0 ? 0 : phase.index;
    for (var i = 0; i < limit; i++) applyShown(cont, tilt, anim.events[i]);
    return { cont: cont, tilt: tilt };
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
    g.globalAlpha = 0.35;
    var spots = [[0.2, 0.15, 46, '#E7C36A'], [0.78, 0.22, 36, '#E8344E'], [0.5, 0.08, 28, '#F7F3EA'], [0.12, 0.4, 22, '#3F6FE0'], [0.86, 0.55, 30, '#E7C36A']];
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

  function pattern(style, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    if (style === 'dots') {
      for (var yy = y + 4; yy < y + h; yy += 7) {
        for (var xx = x + 4; xx < x + w; xx += 7) {
          ctx.beginPath();
          ctx.arc(xx, yy, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === 'stripes') {
      ctx.lineWidth = 2;
      for (var s = y + 3; s < y + h; s += 6) {
        ctx.beginPath();
        ctx.moveTo(x, s);
        ctx.lineTo(x + w, s);
        ctx.stroke();
      }
    } else {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var wave = y + 4; wave < y + h; wave += 6) {
        ctx.moveTo(x, wave);
        ctx.bezierCurveTo(x + w * 0.3, wave - 3, x + w * 0.6, wave + 3, x + w, wave);
      }
      ctx.stroke();
    }
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
    for (var b = 0; b < target.length; b++) {
      var match = cont[b] === target[b];
      ctx.strokeStyle = (COLOUR[target[b]] || COLOUR.A).fill;
      ctx.globalAlpha = match ? 0.95 : 0.45;
      ctx.setLineDash(match ? [] : [3, 3]);
      ctx.strokeRect(-w / 2 + 6, h / 2 - 6 - (b + 1) * band + 2, w - 12, band - 3);
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
    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2 + bob);
    ctx.rotate(tipping || 0);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    roundRect(-12, -box.h * 0.42, 24, box.h * 0.78, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = style.fill;
    ctx.fillRect(-10, -box.h * 0.05, 20, box.h * 0.32);
    pattern(style.pattern, -10, -box.h * 0.05, 20, box.h * 0.32);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(-4, -box.h * 0.42, 8, 12);
    ctx.restore();
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
    drawStains();
    for (var i = 0; i < level.glasses.length; i++) {
      var wobble = 0;
      if (anim && phase && phase.event && phase.event.glass === i && phase.event.rock) {
        wobble = Math.sin(phase.u * Math.PI) * 0.14 * (phase.event.lean === 'L' ? 1 : -1);
      }
      drawGlass(i, shown.cont[i], tilt[i], wobble);
    }
    if (anim && phase && !phase.done && phase.index >= 0 && phase.event && phase.event.type === 'push') {
      drawRibbon(phase.event, phase.u);
    }
    if (anim && phase && phase.index < 0) {
      var bottle = geom.bottles[anim.bottle];
      var top = glassCenter(level.glasses[level.indexOf[level.bottles[anim.bottle].r + ',' + level.bottles[anim.bottle].c]] || level.glasses[0]);
      drawStream(bottle.x + bottle.w / 2, bottle.y + bottle.h, top.x, top.y - 10, level.bottles[anim.bottle].colour);
    }
    for (var b = 0; b < level.bottles.length; b++) {
      var tip = anim && anim.bottle === b && phase && phase.index < 0 ? 0.35 : 0;
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
        var outcome = judge();
        anim = null;
        reveal(outcome);
      }
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

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    ensureAudio();
    if (overlayOpen() || !geom || settled || blockUntilLift || anim) {
      if (now() < tapQuietUntil) armQuiet();
      return;
    }
    if (now() < tapQuietUntil) {
      armQuiet();
      return;
    }
    var p = localPoint(event);
    var hit = hitBottle(p.x, p.y);
    if (hit >= 0) beginPour(hit);
  });

  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('restart').addEventListener('click', function () { load(level.n); });
  document.getElementById('stuck-restart').addEventListener('click', function () { load(level.n); });
  document.getElementById('stuck-undo').addEventListener('click', undo);
  document.getElementById('fail-restart').addEventListener('click', function () { load(level.n); });
  document.getElementById('win-retry').addEventListener('click', function () { load(level.n); });
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
      if (index < level.bottles.length) beginPour(index);
    }
  });

  var params = new URLSearchParams(location.search);
  if (params.get('path') === '1') showPath = true;
  var initial = Math.max(1, Math.min(10, +(params.get('level') || 1)));
  load(initial);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  window.__fizz = {
    get ready() { return !!(level && geom && document.getElementById('loading').classList.contains('hidden')); },
    get solverReady() { return !!(level && level._graph); },
    solverMs: function () { return level ? level._solverMs || 0 : 0; },
    load: load,
    commit: function (index) { return beginPour(index); },
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
        undoOffered: !document.getElementById('stuck-undo').classList.contains('hidden'),
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
          return { i: i, x: box.x, y: box.y, w: box.w, h: box.h, cx: rect.left + box.x + box.w / 2, cy: rect.top + box.y + box.h / 2 };
        })
      };
    },
    bufferScale: function () { return dpr; }
  };
})();
