(function () {
  var TL = TurnLogic;
  var FLAVOUR = ['#C42B42', '#3D63D8', '#2F7A28'];
  var GOLD = '#F2B84B';
  var BURNT = '#4A2E1E';
  var INK = '#3A2418';
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
  var anim = null;
  var queue = [];
  var particles = [];
  var wobble = null;
  var settled = false;
  var audio = null;
  var events = [];
  var lastMove = null;
  var progress = loadProgress();
  var booted = false;

  function loadProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem('turnover-progress-v1') || 'null');
      if (raw && raw.stars) return raw;
    } catch (err) { /* keep defaults */ }
    return { stars: {}, unlocked: 1, mute: false, burntSeen: false };
  }

  function saveProgress() {
    try { localStorage.setItem('turnover-progress-v1', JSON.stringify(progress)); } catch (err) { /* private mode */ }
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
    return ['loading', 'menu-panel', 'help', 'lesson', 'win', 'stuck', 'fail'].some(function (id) {
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
    var count = state.plates.length;
    var hud = cssH < 700 ? 60 : 74;
    var bar = 68;
    var gap = count > 3 ? 8 : 12;
    var plateW = Math.floor((cssW - 16 - gap * (count - 1)) / count);
    var room = cssH - hud - bar - 36;
    var cakeH = Math.max(40, Math.min(cssH < 700 ? 48 : 68, Math.floor(room / 5)));
    var stackH = 4 * (cakeH + 4);
    var base = Math.round((hud + 12 + cssH - bar) / 2 + stackH / 2);
    if (base - stackH < hud + 4) base = hud + 4 + stackH;
    if (base > cssH - bar - 8) base = cssH - bar - 8;
    var total = plateW * count + gap * (count - 1);
    geom = {
      hud: hud, bar: bar, gap: gap, plateW: plateW, cakeH: cakeH,
      x0: Math.round((cssW - total) / 2),
      base: base
    };
  }

  function cakeBox(plate, index) {
    var x = geom.x0 + plate * (geom.plateW + geom.gap);
    var y = geom.base - (index + 1) * (geom.cakeH + 4);
    return { x: x + 4, y: y, w: geom.plateW - 8, h: geom.cakeH };
  }

  function load(n) {
    var all = TL.levels();
    var level = all[Math.max(0, Math.min(all.length, n) - 1)];
    state = {
      n: level.n, name: level.name, level: level,
      plates: TL.clone(level.plates),
      flips: level.budget, budget: level.budget, par: level.par,
      used: 0, undos: 0, stack: [], rejects: 0
    };
    anim = null;
    drag = null;
    selected = null;
    queue = [];
    particles = [];
    settled = false;
    hideAll();
    document.getElementById('loading').classList.remove('hidden');
    syncChrome();
    layoutGeom();
    log('load', { n: level.n });
    TL.warm(level, function () {
      if (!state || state.n !== level.n) return;
      TL.prewarm(level);
      paintPaths();
      document.getElementById('loading').classList.add('hidden');
      if (levelHasBurnt(level) && !progress.burntSeen && level.n >= 3) showLesson();
      syncChrome();
    });
  }

  function paintPaths() {
    if (!state || !geom) return;
    paint();
    var moves = TL.legalMoves(state.plates);
    if (moves.length) {
      var move = moves[0];
      var before = TL.clone(state.plates);
      anim = {
        move: move,
        chunk: before[move[0]].slice(before[move[0]].length - move[1]),
        before: before,
        triple: true,
        undo: false,
        outcome: null,
        t0: now() - 220,
        dur: 400,
        popped: false
      };
      paint();
      anim = null;
      var box = cakeBox(move[0], before[move[0]].length - 1);
      drag = {
        pointer: 0, x: box.x + box.w, y: box.y, x0: box.x, y0: box.y,
        lift: { plate: move[0], d: move[1] },
        plate: move[0]
      };
      paint();
      drag = null;
    }
    wobble = { plate: 0, until: now() + 30 };
    paint();
    wobble = null;
    burst(cssW / 2, cssH / 2, GOLD, 6);
    particles = [];
    if (state.n === 1) drawCoach();
    paint();
  }

  function levelHasBurnt(level) {
    return level.sidedName !== 'none';
  }

  function hideAll() {
    ['menu-panel', 'help', 'lesson', 'win', 'stuck', 'fail'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('undo').classList.remove('pulse');
  }

  function showLesson() {
    document.getElementById('lesson').classList.remove('hidden');
  }

  function dismissLesson() {
    progress.burntSeen = true;
    saveProgress();
    document.getElementById('lesson').classList.add('hidden');
  }

  function syncChrome() {
    document.getElementById('kicker').textContent = 'Plate ' + state.n;
    document.getElementById('name').textContent = state.name;
    var pips = document.getElementById('pips');
    pips.innerHTML = '';
    for (var i = 0; i < state.budget; i++) {
      var pip = document.createElement('i');
      pip.className = 'pip' + (i >= state.flips ? ' spent' : '');
      pips.appendChild(pip);
    }
    document.getElementById('undo').disabled = settled || !state.stack.length || state.flips < 1;
    document.getElementById('mute').textContent = progress.mute ? 'Muted' : 'Snd';
  }

  function flavourOf(pancake) { return pancake >> 1; }
  function burntUp(pancake) { return (pancake & 1) === 1; }

  function undersideBurnt(pancake, sided) {
    if (!TL.twoSided(flavourOf(pancake), sided)) return false;
    return !burntUp(pancake);
  }

  function hitCake(x, y) {
    if (!geom) return null;
    var best = null;
    for (var p = 0; p < state.plates.length; p++) {
      for (var i = state.plates[p].length - 1; i >= 0; i--) {
        var box = cakeBox(p, i);
        if (x >= box.x && x <= box.x + box.w && y >= box.y && y < box.y + box.h) {
          best = { plate: p, index: i, box: box };
          break;
        }
      }
    }
    return best;
  }

  function plateAt(x) {
    if (!geom) return -1;
    for (var p = 0; p < state.plates.length; p++) {
      var left = geom.x0 + p * (geom.plateW + geom.gap);
      if (x >= left && x < left + geom.plateW) return p;
    }
    return -1;
  }

  function depthOf(plate, index) {
    return state.plates[plate].length - 1 - index;
  }

  function localPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function clientOf(x, y) {
    var rect = canvas.getBoundingClientRect();
    return { x: rect.left + x, y: rect.top + y };
  }

  function moveLegal(move) {
    if (!move) return false;
    var i = move[0], d = move[1], j = move[2];
    if (i === j || d < 1 || d > TL.SPATULA) return false;
    if (i < 0 || j < 0 || i >= state.plates.length || j >= state.plates.length) return false;
    if (state.plates[i].length < d) return false;
    if (state.plates[j].length + d > TL.CAP) return false;
    return true;
  }

  function commit(move) {
    if (!move) return;
    if (settled || state.flips <= 0) {
      rejectMove(move);
      return;
    }
    if (anim || queue.length) { queue.push({ move: move }); return; }
    beginFlip(move, false);
  }

  function rejectMove(move) {
    state.rejects += 1;
    wobble = { plate: move && move[0] >= 0 ? move[0] : 0, until: now() + 420 };
    lastMove = { spent: false, rejected: true, i: move && move[0], d: move && move[1], j: move && move[2] };
    log('reject', { move: move ? move.join(',') : '' });
    if (!anim && !queue.length) reveal(currentOutcome());
  }

  function currentOutcome() {
    if (TL.isGoal(state.plates)) return 'win';
    if (state.flips <= 0) return 'fail';
    if (!TL.canFinish(state.plates, state.flips, state.level)) return 'stuck';
    return null;
  }

  function reveal(outcome) {
    if (outcome === 'win') showWin();
    else if (outcome === 'fail') showFail();
    else if (outcome === 'stuck') showStuck();
  }

  function pumpQueue() {
    if (anim || !queue.length) return;
    var next = queue.shift();
    if (next.undo) playUndo();
    else beginFlip(next.move, false);
  }

  function beginFlip(move, isUndo) {
    if (settled || state.flips <= 0) {
      rejectMove(isUndo ? null : move);
      if (!settled) pumpQueue();
      return;
    }
    if (!isUndo && !moveLegal(move)) {
      rejectMove(move);
      pumpQueue();
      return;
    }
    var level = state.level;
    var before = TL.clone(state.plates);
    var chunk = state.plates[move[0]].slice(state.plates[move[0]].length - move[1]);
    var after = TL.apply(state.plates, move, level.sided);
    if (!isUndo) state.stack.push({ plates: before, move: move.slice() });
    state.plates = after;
    state.flips -= 1;
    state.used += 1;
    if (!isUndo) lastMove = { i: move[0], d: move[1], j: move[2], spent: true };
    var triple = move[1] === 3 && justCompleted(before, after);
    var outcome = null;
    if (TL.isGoal(state.plates)) outcome = 'win';
    else if (state.flips <= 0) outcome = 'fail';
    else if (!TL.canFinish(state.plates, state.flips, level)) outcome = 'stuck';
    anim = {
      move: move, chunk: chunk, before: before, triple: triple, undo: isUndo,
      outcome: outcome, t0: now(), dur: 400, popped: false
    };
    tone(180, 0.05, 'sawtooth', 0.03);
    syncChrome();
    log(isUndo ? 'undo' : 'flip', { move: move.join(',') });
  }

  function justCompleted(before, after) {
    for (var i = 0; i < after.length; i++) {
      if (after[i].length === 3 && isPure(after[i]) && !isPure(before[i])) return true;
    }
    return false;
  }

  function isPure(plate) {
    if (plate.length !== 3) return false;
    var flavour = plate[0] >> 1;
    return plate.every(function (pancake) { return pancake === flavour * 2; });
  }

  function finishAnim() {
    var outcome = anim.outcome;
    var triple = anim.triple;
    var move = anim.move;
    var dest = cakeBox(move[2], state.plates[move[2]].length - 1);
    anim = null;
    burst(dest.x + dest.w / 2, dest.y + dest.h / 2, '#FFF4E2', triple ? 16 : 8);
    if (triple) burst(dest.x + dest.w / 2, dest.y, GOLD, 10);
    if (outcome === 'win' || outcome === 'fail') {
      while (queue.length) {
        var dropped = queue.shift();
        state.rejects += 1;
        log('reject', { move: dropped.undo ? 'undo' : (dropped.move ? dropped.move.join(',') : '') });
      }
      settled = true;
      reveal(outcome);
      syncChrome();
      return;
    }
    if (queue.length) { pumpQueue(); syncChrome(); return; }
    reveal(outcome);
    syncChrome();
  }

  function showWin() {
    var over = state.used - state.par;
    var stars = over <= 0 ? 3 : over === 1 ? 2 : 1;
    progress.stars[state.n] = Math.max(progress.stars[state.n] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked || 1, state.n + 1);
    saveProgress();
    document.getElementById('win-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(stars);
    document.getElementById('win-copy').textContent = state.used + ' flips. Par is ' + state.par + '.';
    document.getElementById('win-next').disabled = state.n >= TL.levels().length;
    document.getElementById('win').classList.remove('hidden');
    tone(880, 0.12, 'sine', 0.05);
    log('win', { stars: stars });
  }

  function showStuck() {
    document.getElementById('stuck-copy').textContent = TL.stuckText(state.flips);
    document.getElementById('stuck').classList.remove('hidden');
    tone(90, 0.35, 'sine', 0.05);
    log('stuck', { flips: state.flips });
  }

  function showFail() {
    document.getElementById('fail').classList.remove('hidden');
    log('fail');
  }

  function undo() {
    if (settled || state.flips <= 0) {
      rejectMove(null);
      return;
    }
    if (anim || queue.length) { queue.push({ undo: true }); return; }
    playUndo();
  }

  function playUndo() {
    if (!state.stack.length || state.flips < 1) {
      rejectMove(null);
      pumpQueue();
      return;
    }
    hideAll();
    var prev = state.stack.pop();
    var forward = prev.move;
    beginFlip([forward[2], forward[1], forward[0]], true);
    state.undos += 1;
  }

  function restart() {
    load(state.n);
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
      var s = 30 + Math.random() * 70;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.4, color: color });
    }
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function paint() {
    ctx.clearRect(0, 0, cssW, cssH);
    if (!state || !geom) return;
    drawCounter();
    drawPlates();
    drawCakes(true);
    if (drag) drawGhost();
    if (!drag && state.n === 1 && state.used === 0 && !anim && !overlayOpen()) drawCoach();
    if (anim) drawFlight();
    if (wobble && now() < wobble.until) {
      ctx.fillStyle = 'rgba(196,43,66,.16)';
      ctx.fillRect(0, geom.hud, cssW, cssH - geom.hud - geom.bar);
    }
    drawParticles();
  }

  function drawCounter() {
    ctx.fillStyle = '#FFF4E2';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(58,36,24,.08)';
    ctx.lineWidth = 2;
    for (var y = geom.hud; y < cssH; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y + 8);
      ctx.stroke();
    }
  }

  function drawPlates() {
    for (var p = 0; p < state.plates.length; p++) {
      var x = geom.x0 + p * (geom.plateW + geom.gap);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2E5E9E';
      ctx.lineWidth = 4;
      round(x + 2, geom.base - 8, geom.plateW - 4, 18, 9);
      ctx.fill();
      ctx.stroke();
      var glow = drag && plateAt(drag.x) === p && drag.lift;
      if (glow) {
        var move = [drag.lift.plate, drag.lift.d, p];
        var ok = p !== drag.lift.plate && state.plates[p].length + drag.lift.d <= TL.CAP;
        ctx.strokeStyle = ok ? '#F2B84B' : '#C42B42';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  function drawCakes(skipFlight) {
    for (var p = 0; p < state.plates.length; p++) {
      for (var i = 0; i < state.plates[p].length; i++) {
        if (skipFlight && anim && anim.move[2] === p && i >= state.plates[p].length - anim.move[1]) continue;
        if (drag && drag.lift && drag.lift.plate === p && i >= state.plates[p].length - drag.lift.d) continue;
        var heavy = state.plates[p].length - 1 - i >= TL.SPATULA;
        var box = cakeBox(p, i);
        if (wobble && wobble.plate === p && now() < wobble.until) {
          box = { x: box.x + Math.sin(now() / 28) * 6, y: box.y, w: box.w, h: box.h };
        }
        if (heavy) {
          ctx.fillStyle = 'rgba(58,36,24,.22)';
          round(box.x + 5, box.y + 6, box.w, box.h, 8);
          ctx.fill();
        }
        drawCake(box, state.plates[p][i], state.level.sided, 1, 1);
        if (heavy) {
          ctx.save();
          ctx.strokeStyle = '#8A5A32';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          round(box.x, box.y, box.w, box.h, 8);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function drawCake(box, pancake, sided, alpha, squash) {
    var up = burntUp(pancake) ? BURNT : GOLD;
    var under = undersideBurnt(pancake, sided) ? BURNT : GOLD;
    var flavour = FLAVOUR[flavourOf(pancake)] || '#C4A574';
    ctx.save();
    ctx.globalAlpha = alpha;
    var h = box.h * squash;
    var y = box.y + box.h - h;
    var topH = Math.max(6, h * 0.28);
    var botH = Math.max(5, h * 0.2);
    ctx.fillStyle = under;
    round(box.x, y + h - botH, box.w, botH, 4);
    ctx.fill();
    ctx.fillStyle = flavour;
    ctx.fillRect(box.x, y + topH - 1, box.w, h - topH - botH + 2);
    ctx.fillStyle = up;
    round(box.x, y, box.w, topH + 4, 8);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    round(box.x, y, box.w, h, 8);
    ctx.stroke();
    glyph(flavourOf(pancake), box.x + box.w / 2, y + h / 2, Math.min(box.w, h) * 0.22);
    if (burntUp(pancake)) {
      ctx.strokeStyle = 'rgba(242,184,75,.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(box.x + 6, y + topH * 0.55);
      ctx.lineTo(box.x + box.w * 0.4, y + topH * 0.3);
      ctx.moveTo(box.x + box.w * 0.5, y + topH * 0.7);
      ctx.lineTo(box.x + box.w - 8, y + topH * 0.35);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.arc(box.x + box.w - 10, y - 2, 3, 0, Math.PI * 2);
      ctx.arc(box.x + box.w - 16, y - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.ellipse(box.x + box.w * 0.35, y + topH * 0.45, box.w * 0.12, topH * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function glyph(flavour, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,244,226,.9)';
    if (flavour === 0) {
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 1.2) * r, Math.sin(i * 1.2) * r * 0.6, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (flavour === 1) {
      ctx.strokeStyle = 'rgba(255,244,226,.95)';
      ctx.lineWidth = Math.max(1.5, r * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.45, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGhost() {
    if (!drag.lift) return;
    var target = plateAt(drag.x);
    if (target < 0 || target === drag.lift.plate) return;
    if (state.plates[target].length + drag.lift.d > TL.CAP) return;
    var preview = TL.apply(state.plates, [drag.lift.plate, drag.lift.d, target], state.level.sided);
    var start = preview[target].length - drag.lift.d;
    for (var i = start; i < preview[target].length; i++) {
      drawCake(cakeBox(target, i), preview[target][i], state.level.sided, 0.55, 1);
    }
  }

  function drawCoach() {
    var from = cakeBox(2, state.plates[2].length - 1);
    var to = cakeBox(1, state.plates[1].length);
    var pulse = 0.35 + 0.25 * Math.sin(now() / 280);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#2E5E9E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x + from.w / 2, from.y);
    ctx.quadraticCurveTo((from.x + to.x) / 2, from.y - 80, to.x + to.w / 2, to.y + to.h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawFlight() {
    var t = Math.min(1, (now() - anim.t0) / anim.dur);
    var e = ease(Math.min(1, t / 0.86));
    var move = anim.move;
    var srcTop = anim.before[move[0]].length - 1;
    var from = cakeBox(move[0], srcTop);
    var destIndex = anim.before[move[2]].length;
    var to = cakeBox(move[2], destIndex);
    var x = from.x + (to.x - from.x) * e;
    var y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * 120;
    var spin = Math.cos(Math.PI * e);
    var flipped = e >= 0.5;
    ctx.save();
    ctx.translate(x + from.w / 2, y + from.h / 2);
    ctx.scale(1, Math.max(0.08, Math.abs(spin)));
    ctx.translate(-(x + from.w / 2), -(y + from.h / 2));
    var pieces = flipped ? landedChunk() : anim.chunk.slice();
    for (var i = 0; i < pieces.length; i++) {
      var box = { x: x, y: y - (pieces.length - 1 - i) * (geom.cakeH + 4), w: from.w, h: geom.cakeH };
      var squash = t > 0.86 ? 1 - 0.06 * Math.sin((t - 0.86) / 0.14 * Math.PI) : 1;
      drawCake(box, pieces[i], state.level.sided, 1, squash);
    }
    ctx.restore();
    if (anim.triple && t > 0.45) {
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + from.w / 2, y, 28 + t * 20, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function landedChunk() {
    var move = anim.move;
    var plate = state.plates[move[2]];
    return plate.slice(plate.length - move[1]);
  }

  function drawParticles() {
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 0.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
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

  function frame(t) {
    if (anim && t >= anim.t0 + anim.dur) finishAnim();
    if (wobble && t > wobble.until) wobble = null;
    particles.forEach(function (p) {
      p.life -= 1 / 60;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
    });
    particles = particles.filter(function (p) { return p.life > 0; });
    paint();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    ensureAudio();
    if (overlayOpen() || landscapeLocked() || !geom || settled) return;
    var p = localPoint(event);
    var hit = hitCake(p.x, p.y);
    if (!hit) {
      var column = plateAt(p.x);
      drag = {
        pointer: event.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y,
        lift: null, plate: column
      };
      if (selected && column >= 0) canvas.setPointerCapture(event.pointerId);
      return;
    }
    var depth = depthOf(hit.plate, hit.index);
    if (depth >= TL.SPATULA) {
      wobble = { plate: hit.plate, until: now() + 280 };
      return;
    }
    drag = {
      pointer: event.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y,
      lift: { plate: hit.plate, index: hit.index, d: depth + 1 },
      plate: hit.plate,
      prior: selected ? { plate: selected.plate, d: selected.d } : null
    };
    selected = { plate: hit.plate, d: depth + 1 };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    var p = localPoint(event);
    drag.x = p.x;
    drag.y = p.y;
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    var d = drag;
    drag = null;
    var moved = Math.hypot(d.x - d.x0, d.y - d.y0);
    if (!d.lift) {
      if (moved < 12 && selected && d.plate >= 0 && d.plate !== selected.plate) {
        commit([selected.plate, selected.d, d.plate]);
        selected = null;
        return;
      }
      if (moved >= 12) rejectMove([d.plate, 1, plateAt(d.x)]);
      return;
    }
    if (moved < 12) {
      if (d.prior && d.prior.plate !== d.lift.plate) {
        commit([d.prior.plate, d.prior.d, d.lift.plate]);
        selected = null;
        return;
      }
      selected = { plate: d.lift.plate, d: d.lift.d };
      return;
    }
    var target = plateAt(d.x);
    var move = [d.lift.plate, d.lift.d, target];
    if (!moveLegal(move)) {
      rejectMove(move);
      return;
    }
    commit(move);
  }

  function cancelDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    drag = null;
    lastMove = { spent: false, cancelled: true };
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
    if (!selected && key >= '1' && key <= '4') {
      var plate = +key - 1;
      if (plate < state.plates.length && state.plates[plate].length) {
        selected = { plate: plate, d: 1 };
      }
      return;
    }
    if (selected && (key === 'q' || key === 'Q')) selected.d = 1;
    if (selected && (key === 'w' || key === 'W')) selected.d = Math.min(2, state.plates[selected.plate].length, TL.SPATULA);
    if (selected && (key === 'e' || key === 'E')) selected.d = Math.min(3, state.plates[selected.plate].length, TL.SPATULA);
    if (selected && key >= '1' && key <= '4') {
      var target = +key - 1;
      if (target !== selected.plate && target < state.plates.length && state.plates[target].length + selected.d <= TL.CAP) {
        commit([selected.plate, selected.d, target]);
      }
      selected = null;
    }
  });

  document.getElementById('undo').addEventListener('click', undo);
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
  document.getElementById('win-next').addEventListener('click', function () { if (state.n < TL.levels().length) load(state.n + 1); });
  document.getElementById('mute').addEventListener('click', function () {
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

  window.__turn = {
    get ready() { return state && document.getElementById('loading').classList.contains('hidden'); },
    snapshot: function () {
      var over = state.used - state.par;
      return {
        level: state.n,
        plates: TL.clone(state.plates),
        flips: state.flips,
        budget: state.budget,
        used: state.used,
        undos: state.undos,
        par: state.par,
        won: !document.getElementById('win').classList.contains('hidden'),
        failed: !document.getElementById('fail').classList.contains('hidden'),
        stuck: !document.getElementById('stuck').classList.contains('hidden'),
        banner: document.getElementById('stuck-copy').textContent,
        stars: over <= 0 ? 3 : over === 1 ? 2 : 1,
        queue: queue.length,
        rejects: state.rejects,
        settled: settled,
        maxPlate: state.plates.reduce(function (m, plate) { return Math.max(m, plate.length); }, 0)
      };
    },
    bufferScale: function () { return dpr; },
    animating: function () { return !!anim; },
    animMs: function () { return anim ? anim.dur : 0; },
    cellSize: function () { return geom ? geom.cakeH : 0; },
    plateWidth: function () { return geom ? geom.plateW : 0; },
    commit: function (i, d, j) { commit([i, d, j]); },
    load: load,
    reset: function () {
      state.plates = TL.clone(state.level.plates);
      state.flips = state.budget;
      state.used = 0;
      state.undos = 0;
      state.stack = [];
      state.rejects = 0;
      queue = [];
      anim = null;
      drag = null;
      selected = null;
      settled = false;
      hideAll();
      syncChrome();
    },
    dismiss: function () { progress.burntSeen = true; document.getElementById('lesson').classList.add('hidden'); },
    last: function () { return lastMove; },
    dragFrom: function (plate, index) {
      var box = cakeBox(plate, index);
      var target = cakeBox(Math.min(state.plates.length - 1, plate + 1), 0);
      return { from: clientOf(box.x + box.w / 2, box.y + box.h / 2), to: clientOf(target.x + target.w / 2, geom.base - 20) };
    },
    dragMove: function (i, d, j, fx, fy) {
      var fromIndex = state.plates[i].length - d;
      var from = cakeBox(i, fromIndex);
      var to = cakeBox(j, Math.min(3, state.plates[j].length));
      var ax = fx == null ? 0.5 : fx;
      var ay = fy == null ? 0.55 : fy;
      return {
        from: clientOf(from.x + from.w * ax, from.y + from.h * ay),
        to: clientOf(to.x + to.w / 2, to.y + to.h / 2),
        expect: TL.apply(state.plates, [i, d, j], state.level.sided)
      };
    },
    sample: function (plate, index) {
      var box = cakeBox(plate, index);
      var topH = Math.max(6, box.h * 0.28);
      var botH = Math.max(5, box.h * 0.2);
      function pixel(x, y) {
        var data = ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data;
        return [data[0], data[1], data[2]];
      }
      return {
        box: box,
        up: pixel(box.x + box.w / 2, box.y + topH / 2),
        under: pixel(box.x + box.w / 2, box.y + box.h - botH / 2),
        topH: topH,
        botH: botH
      };
    },
    metrics: function () {
      var stageBox = stage.getBoundingClientRect();
      return { sw: stageBox.width, sh: stageBox.height, bw: canvas.width, bh: canvas.height, cell: geom.cakeH, plate: geom.plateW, scale: dpr };
    },
    events: function () { return events.slice(); }
  };
})();
