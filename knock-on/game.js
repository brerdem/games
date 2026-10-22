(function () {
  const KL = window.KnockLogic;
  const DX = KL.DX;
  const DY = KL.DY;
  const ELB = KL.ELB;
  const SPL = KL.SPL;
  const LESSON = {
    1: 'Swipe to knock them over.',
    2: 'Fallen dominoes take up space.',
    3: 'A side hit turns a domino.',
    4: 'Corners turn the chain.',
    6: 'Order matters.',
    11: 'Splitters send it both ways.'
  };
  const ARROW = ['\u2191', '\u2192', '\u2193', '\u2190'];
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const tokensEl = document.getElementById('tokens');
  const lessonEl = document.getElementById('lesson');
  const finger = document.getElementById('finger');
  const arrows = document.getElementById('arrows');
  const arrowA = document.getElementById('arrow-a');
  const arrowB = document.getElementById('arrow-b');
  const knockEl = document.getElementById('knock');
  const panels = {
    menu: document.getElementById('menu-panel'),
    help: document.getElementById('help'),
    confirm: document.getElementById('confirm'),
    win: document.getElementById('win'),
    stuck: document.getElementById('stuck'),
    fail: document.getElementById('fail')
  };

  let W = 390;
  let H = 844;
  let dpr = 1;
  let layout = null;
  let bake = null;
  let bakeId = '';
  let levelNum = 1;
  let level = KL.LEVELS[0];
  let state = KL.fresh(level);
  let pose = [];
  let poseStack = [];
  let fellMarks = [];
  let fellOrder = [];
  let minF = function () { return 0; };
  let oracleMs = 0;
  let selected = null;
  let hintDir = null;
  let drag = null;
  let preview = null;
  let anim = null;
  let needPaint = true;
  let inputLock = 0;
  let releaseLog = null;
  let muted = false;
  let audioCtx = null;
  let musicOn = false;
  let lastMusic = 0;
  const dust = [];
  const events = [];

  const saved = loadProgress();
  let progress = saved;

  function nowMs() { return performance.now(); }
  function log(kind, extra) { events.push({ kind: kind, t: nowMs(), extra: extra || null }); }
  function overlayOpen() {
    return Object.keys(panels).some(function (key) { return !panels[key].classList.contains('hidden'); });
  }
  function landscapeLocked() {
    return window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  }
  function boardBlocked() {
    return overlayOpen() || landscapeLocked() || nowMs() < inputLock || !!anim;
  }
  function hide(el) {
    if (!el.classList.contains('hidden')) inputLock = nowMs() + 340;
    el.classList.add('hidden');
  }
  let panelLock = 0;
  function show(el) {
    el.classList.remove('hidden');
    panelLock = nowMs() + 340;
  }
  function syncRotate() {
    document.getElementById('rotate').classList.toggle('hidden', !landscapeLocked());
  }

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem('knock-on-progress-v1') || 'null');
      if (!raw || typeof raw !== 'object') throw new Error('empty');
      return {
        stars: raw.stars || {},
        unlocked: raw.unlocked || 1,
        mute: !!raw.mute,
        parSeen: raw.parSeen || {}
      };
    } catch (err) {
      return { stars: {}, unlocked: 1, mute: false, parSeen: {} };
    }
  }
  function saveProgress() {
    progress.mute = muted;
    localStorage.setItem('knock-on-progress-v1', JSON.stringify(progress));
  }

  function measure() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    const raw = window.devicePixelRatio || 1;
    dpr = raw > 1.5 ? 1.5 : raw;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const hud = Math.max(92, Math.ceil(document.getElementById('hud').getBoundingClientRect().height) + 6);
    const bar = 84;
    const availW = W - 16;
    const availH = H - hud - bar - 8;
    let cell = Math.floor(Math.min(availW / 6, availH / 8));
    cell = Math.max(44, Math.min(78, cell));
    const sheetW = cell * 6;
    const sheetH = cell * 8;
    const originX = Math.round((W - sheetW) / 2);
    const originY = Math.round(hud + Math.max(8, (availH - sheetH) / 2));
    layout = { cell: cell, originX: originX, originY: originY, sheetW: sheetW, sheetH: sheetH, hud: hud, bar: bar };
    bakeId = '';
    needPaint = true;
    syncRotate();
    placeArrows();
  }

  function basePose(cells) {
    return cells.map(function (c) {
      if (c === 'H' || c === 'V') return { kind: c };
      if (c === '#') return { kind: 'wall' };
      if (c in ELB) return { kind: 'elbow', piece: c };
      if (c in SPL) return { kind: 'split', piece: c };
      if (c === '_') return { kind: 'flat', dir: 1 };
      if (c === '~') return { kind: 'tail', dir: 1 };
      return { kind: 'floor' };
    });
  }
  function poseAfter(before, result) {
    const next = before.map(function (item) { return Object.assign({}, item); });
    result.log.forEach(function (event) {
      const kind = event[1];
      const pos = event[2];
      const dir = event[3];
      if (kind === 'fall' || kind === 'turn' || kind === 'split') {
        next[pos] = { kind: 'flat', dir: dir };
        const x = pos % 6 + DX[dir];
        const y = (pos / 6 | 0) + DY[dir];
        if (x >= 0 && y >= 0 && x < 6 && y < 8 && result.g[y * 6 + x] === '~') {
          next[y * 6 + x] = { kind: 'tail', dir: dir, from: pos };
        }
      } else if (kind === 'spin') {
        next[pos] = { kind: result.g[pos], spun: true };
      }
    });
    return next;
  }

  function loadLevel(n) {
    levelNum = Math.max(1, Math.min(KL.LEVELS.length, n));
    level = KL.LEVELS[levelNum - 1];
    state = KL.fresh(level);
    pose = basePose(state.cells);
    poseStack = [];
    fellMarks = [];
    fellOrder = [];
    selected = null;
    hintDir = null;
    drag = null;
    preview = null;
    anim = null;
    dust.length = 0;
    const t0 = nowMs();
    minF = minFor(levelNum);
    minF(state.cells);
    oracleMs = nowMs() - t0;
    if (nowMs() >= inputLock) inputLock = 0;
    Object.keys(panels).forEach(function (key) { panels[key].classList.add('hidden'); });
    document.getElementById('kicker').textContent = 'Table ' + levelNum;
    document.getElementById('name').textContent = level.title;
    lessonEl.textContent = progress.stars[levelNum] ? '' : (LESSON[levelNum] || '');
    finger.classList.toggle('hidden', levelNum !== 1 || !!progress.stars[1]);
    knockEl.textContent = '';
    if (levelNum === 1 && !progress.stars[1]) placeFinger();
    bakeId = '';
    needPaint = true;
    syncHud();
    measure();
    log('level', { n: levelNum, oracleMs: oracleMs });
  }

  function syncHud() {
    tokensEl.innerHTML = '';
    for (let i = 0; i < level.pushes; i++) {
      const dot = document.createElement('i');
      dot.className = 'token' + (i >= state.pushesLeft ? ' spent' : '');
      tokensEl.appendChild(dot);
    }
    document.getElementById('hint').disabled = state.hintUsed || state.won || state.reason === 'pushes';
    document.getElementById('hint').textContent = state.hintUsed ? 'Used' : 'Hint';
    document.getElementById('undo').disabled = state.won || state.reason === 'pushes' || state.pushesLeft <= 0 || !state.history.length;
    document.getElementById('mute').textContent = muted ? 'Off' : 'Snd';
    placeArrows();
  }

  function placeFinger() {
    if (!layout) return;
    const o = cellOrigin(18);
    finger.style.left = (o.x + layout.cell * 0.2) + 'px';
    finger.style.top = (o.y + layout.cell * 0.25) + 'px';
  }

  function cellOrigin(i) {
    return {
      x: layout.originX + (i % 6) * layout.cell,
      y: layout.originY + ((i / 6) | 0) * layout.cell
    };
  }
  function cellAt(x, y) {
    const c = Math.floor((x - layout.originX) / layout.cell);
    const r = Math.floor((y - layout.originY) / layout.cell);
    if (c < 0 || r < 0 || c >= 6 || r >= 8) return null;
    return r * 6 + c;
  }
  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (W / rect.width), y: (event.clientY - rect.top) * (H / rect.height) };
  }
  function toViewport(p) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + p.x * (rect.width / W), y: rect.top + p.y * (rect.height / H) };
  }

  function minFor(n) {
    const table = window.KnockMin && window.KnockMin[n];
    if (!table) return KL.makeMin(KL.LEVELS[n - 1].cells);
    return function (g) {
      const v = table[g.join('')];
      return v == null || v >= 99 ? Infinity : v;
    };
  }
  function placeArrows() {
    if (!layout || selected == null || anim || state.won || state.reason === 'pushes' || overlayOpen()) {
      arrows.classList.add('hidden');
      return;
    }
    const ch = state.cells[selected];
    const dirs = ch === 'H' ? [3, 1] : ch === 'V' ? [0, 2] : null;
    if (!dirs) { arrows.classList.add('hidden'); return; }
    arrows.classList.remove('hidden');
    const origin = cellOrigin(selected);
    const s = layout.cell;
    const horizontal = ch === 'H';
    const bw = Math.max(16, Math.floor((s - 6) / 2));
    const bh = Math.max(16, s - 8);
    [arrowA, arrowB].forEach(function (btn, i) {
      const d = dirs[i];
      btn.dataset.dir = String(d);
      btn.textContent = ARROW[d];
      btn.classList.toggle('hint', hintDir === d);
      const width = horizontal ? bw : bh;
      const height = horizontal ? bh : bw;
      const x = origin.x + (horizontal ? (d === 3 ? 2 : s - bw - 2) : 4);
      const y = origin.y + (horizontal ? 4 : (d === 0 ? 2 : s - bw - 2));
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.width = width + 'px';
      btn.style.height = height + 'px';
      btn.style.fontSize = Math.max(14, Math.floor(s * 0.28)) + 'px';
    });
  }

  function releaseOutside(event) {
    if (!event || !layout) return false;
    const p = localPoint(event);
    if (p.x <= 2 || p.y <= 2 || p.x >= W - 2 || p.y >= H - 2) return true;
    const bar = document.getElementById('bar').getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const barTop = (bar.top - rect.top) * (H / rect.height);
    const barBottom = (bar.bottom - rect.top) * (H / rect.height);
    if (p.y >= barTop && p.y <= barBottom + 2) return true;
    const reach = 28;
    return p.x < layout.originX - reach || p.y < layout.originY - reach
      || p.x > layout.originX + layout.sheetW + reach
      || p.y > layout.originY + layout.sheetH + reach;
  }

  function projection(dir, dx, dy) {
    if (dir === 1) return dx;
    if (dir === 3) return -dx;
    if (dir === 2) return dy;
    if (dir === 0) return -dy;
    return 0;
  }
  function axisDir(ch, dx, dy) {
    if (ch === 'H') {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return null;
      return dx > 0 ? 1 : 3;
    }
    if (ch === 'V') {
      if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx)) return null;
      return dy > 0 ? 2 : 0;
    }
    return null;
  }

  function doPush(p, d) {
    const result = KL.commit(state, p, d, minF);
    if (!result.ok) return result;
    const before = pose;
    poseStack.push(before);
    fellMarks.push(fellOrder.length);
    pose = poseAfter(pose, result.result);
    result.result.log.forEach(function (event) {
      if (event[1] === 'fall' || event[1] === 'turn' || event[1] === 'split') fellOrder.push(event[2]);
    });
    selected = null;
    hintDir = null;
    preview = null;
    finger.classList.add('hidden');
    if (result.result.felled >= 6) knockEl.textContent = 'Knock-on \u00d7' + result.result.felled;
    else knockEl.textContent = '';
    startAnim(result, before);
    syncHud();
    log('push', { p: p, d: d, outcome: result.outcome, felled: result.result.felled });
    return result;
  }
  function startAnim(result, before) {
    let maxTick = 0;
    result.result.log.forEach(function (event) { if (event[0] > maxTick) maxTick = event[0]; });
    let tickMs = 85;
    const span = (maxTick + 1) * tickMs + 140;
    if (span > 2200) tickMs = Math.max(18, (2060) / (maxTick + 1));
    anim = {
      t0: nowMs(),
      log: result.result.log,
      tickMs: tickMs,
      maxTick: maxTick,
      outcome: result.outcome,
      felled: result.result.felled,
      before: before,
      heard: -1,
      phase: 'cascade',
      wave: 0
    };
    needPaint = true;
  }
  function finishAnim() {
    const outcome = anim.outcome;
    anim = null;
    needPaint = true;
    if (outcome === 'win') openWin();
    else if (outcome === 'stuck') openStuck();
    else if (outcome === 'pushes') openFail();
    syncHud();
  }
  function wobble(cell) {
    anim = { t0: nowMs(), phase: 'wobble', cell: cell, outcome: 'play', log: [], tickMs: 150, maxTick: 0, heard: 99, before: pose };
    if (!muted) tone(90, 0.08, 'square', 0.03);
    needPaint = true;
  }

  function openWin() {
    const stars = KL.starsFor(level, state);
    progress.stars[levelNum] = Math.max(progress.stars[levelNum] || 0, stars);
    if (levelNum >= progress.unlocked && levelNum < 12) progress.unlocked = levelNum + 1;
    progress.parSeen[levelNum] = true;
    saveProgress();
    document.getElementById('win-stars').textContent = stars === 3 ? '\u2605\u2605\u2605' : stars === 2 ? '\u2605\u2605\u2606' : '\u2605\u2606\u2606';
    document.getElementById('win-copy').textContent = 'Par is ' + level.par + '. You used ' + state.used + (state.hintUsed ? ', with a hint.' : '.');
    show(panels.win);
    const nextBtn = document.getElementById('win-next');
    nextBtn.disabled = levelNum >= 12;
    (nextBtn.disabled ? document.getElementById('win-retry') : nextBtn).focus();
    chime();
  }
  function openStuck() {
    document.getElementById('stuck-copy').textContent = 'Undo or Restart. ' + state.pushesLeft + ' push' + (state.pushesLeft === 1 ? '' : 'es') + ' left.';
    document.getElementById('stuck-undo').disabled = state.pushesLeft <= 0;
    show(panels.stuck);
  }
  function openFail() {
    show(panels.fail);
  }
  function doUndo() {
    const result = KL.undo(state, minF);
    if (!result.ok) return;
    pose = poseStack.pop() || basePose(state.cells);
    fellOrder.length = fellMarks.pop() || 0;
    selected = null;
    hintDir = null;
    preview = null;
    knockEl.textContent = '';
    hide(panels.stuck);
    if (result.outcome === 'pushes') openFail();
    else if (result.outcome === 'stuck') openStuck();
    syncHud();
    needPaint = true;
  }
  function doHint() {
    if (state.hintUsed || state.won || state.reason === 'pushes' || anim) return;
    state.hintUsed = true;
    const mv = KL.hintMove(state.cells, minF);
    if (!mv) {
      lessonEl.textContent = "This table can't be finished.";
      selected = null;
      hintDir = null;
      preview = null;
    } else {
      selected = mv[0];
      hintDir = mv[1];
      preview = KL.push(state.cells, mv[0], mv[1]);
      lessonEl.textContent = 'Try the highlighted domino.';
      if (!muted) blip(660);
    }
    syncHud();
    needPaint = true;
    log('hint', { move: mv });
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function ensureBake() {
    const id = [Math.round(W), Math.round(H), dpr, layout.cell, layout.originX, layout.originY].join(':');
    if (bake && bakeId === id) return;
    bake = document.createElement('canvas');
    bake.width = canvas.width;
    bake.height = canvas.height;
    const g = bake.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#4A3324';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2E5E4E';
    roundRect(g, layout.originX - 8, layout.originY - 8, layout.sheetW + 16, layout.sheetH + 16, 16);
    g.fill();
    g.strokeStyle = '#3C6F5E';
    g.lineWidth = 1;
    for (let c = 1; c < 6; c++) {
      g.beginPath();
      g.moveTo(layout.originX + c * layout.cell, layout.originY);
      g.lineTo(layout.originX + c * layout.cell, layout.originY + layout.sheetH);
      g.stroke();
    }
    for (let r = 1; r < 8; r++) {
      g.beginPath();
      g.moveTo(layout.originX, layout.originY + r * layout.cell);
      g.lineTo(layout.originX + layout.sheetW, layout.originY + r * layout.cell);
      g.stroke();
    }
    bakeId = id;
  }

  function drawPlank(cx, cy, dir, len, thick, fill) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);
    ctx.fillStyle = fill;
    roundRect(ctx, -thick / 2, -len / 2, thick, len, Math.min(8, thick / 2));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-thick / 2 + 2, -len / 2 + 2, thick - 4, 3);
    ctx.restore();
  }
  function drawPips(cx, cy, horizontal) {
    ctx.fillStyle = '#1E1E1E';
    const ax = horizontal ? 7 : 0;
    const ay = horizontal ? 0 : 7;
    ctx.beginPath();
    ctx.arc(cx - ax, cy - ay, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + ax, cy + ay, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawStanding(i, kind, alpha, wobbleX) {
    const o = cellOrigin(i);
    const s = layout.cell;
    const cx = o.x + s / 2 + (wobbleX || 0);
    const cy = o.y + s / 2;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    const w = kind === 'H' ? s * 0.72 : s * 0.42;
    const h = kind === 'H' ? s * 0.42 : s * 0.72;
    roundRect(ctx, cx - w / 2 + 2, cy - h / 2 + 3, w, h, 7);
    ctx.fill();
    ctx.fillStyle = '#F4EEDF';
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = '#1E1E1E';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawPips(cx, cy, kind === 'H');
    ctx.restore();
  }
  function drawFlat(i, dir, alpha, span) {
    const o = cellOrigin(i);
    const s = layout.cell;
    const reach = span ? s * 0.5 : s * 0.12;
    const len = span ? s * 1.22 : s * 0.7;
    const cx = o.x + s / 2 + DX[dir] * reach;
    const cy = o.y + s / 2 + DY[dir] * reach;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    drawPlank(cx + 2, cy + 3, dir, len, s * 0.28, 'rgba(0,0,0,.2)');
    drawPlank(cx, cy, dir, len, s * 0.28, '#F4EEDF');
    ctx.restore();
  }
  function drawTailMark(i) {
    const o = cellOrigin(i);
    const s = layout.cell;
    ctx.save();
    ctx.strokeStyle = '#EF476F';
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    roundRect(ctx, o.x + 8, o.y + 8, s - 16, s - 16, 6);
    ctx.stroke();
    ctx.restore();
  }
  function drawWall(i) {
    const o = cellOrigin(i);
    const s = layout.cell;
    ctx.fillStyle = '#7B6A58';
    roundRect(ctx, o.x + 4, o.y + 4, s - 8, s - 8, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,51,36,.45)';
    ctx.beginPath();
    ctx.moveTo(o.x + 8, o.y + s * 0.45);
    ctx.lineTo(o.x + s - 8, o.y + s * 0.45);
    ctx.stroke();
  }
  function chevron(cx, cy, dir) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-6, 3);
    ctx.lineTo(0, -5);
    ctx.lineTo(6, 3);
    ctx.stroke();
    ctx.restore();
  }
  function drawElbow(i, piece) {
    const o = cellOrigin(i);
    const s = layout.cell;
    ctx.fillStyle = '#E9B44C';
    roundRect(ctx, o.x + 6, o.y + 6, s - 12, s - 12, 8);
    ctx.fill();
    ctx.strokeStyle = '#2A1C12';
    ctx.lineWidth = 2;
    ELB[piece].forEach(function (d) {
      chevron(o.x + s / 2 + DX[d] * s * 0.22, o.y + s / 2 + DY[d] * s * 0.22, d);
    });
  }
  function drawSplit(i, piece) {
    const o = cellOrigin(i);
    const s = layout.cell;
    const input = SPL[piece];
    ctx.fillStyle = '#5BC0BE';
    roundRect(ctx, o.x + 6, o.y + 6, s - 12, s - 12, 8);
    ctx.fill();
    ctx.strokeStyle = '#14302F';
    ctx.lineWidth = 2;
    [ (input + 1) % 4, (input + 3) % 4 ].forEach(function (d) {
      chevron(o.x + s / 2 + DX[d] * s * 0.22, o.y + s / 2 + DY[d] * s * 0.22, d);
    });
  }
  function drawPin(i) {
    const o = cellOrigin(i);
    const s = layout.cell;
    const x = o.x + s * 0.7;
    const y = o.y + s * 0.34;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#EF476F';
    ctx.strokeStyle = '#2A1C12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#F4EEDF';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.restore();
  }
  function drawCell(i, poseItem, alpha, wobbleX) {
    const item = poseItem || { kind: 'floor' };
    if (item.kind === 'wall') drawWall(i);
    else if (item.kind === 'elbow') drawElbow(i, item.piece);
    else if (item.kind === 'split') drawSplit(i, item.piece);
    else if (item.kind === 'H' || item.kind === 'V') drawStanding(i, item.kind, alpha, wobbleX);
    else if (item.kind === 'flat') {
      const dir = item.dir == null ? 1 : item.dir;
      const nx = i % 6 + DX[dir];
      const ny = (i / 6 | 0) + DY[dir];
      const next = nx >= 0 && ny >= 0 && nx < 6 && ny < 8 ? pose[ny * 6 + nx] : null;
      drawFlat(i, dir, alpha, !!(next && next.kind === 'tail'));
    } else if (item.kind === 'tail') drawTailMark(i);
  }
  function eventAt(log, i) {
    for (let n = log.length - 1; n >= 0; n--) if (log[n][2] === i) return log[n];
    return null;
  }
  function drawPreviewMarks(result) {
    result.log.forEach(function (event) {
      const kind = event[1];
      const pos = event[2];
      const dir = event[3];
      if (kind === 'fall' || kind === 'turn' || kind === 'split') {
        const tx = pos % 6 + DX[dir];
        const ty = (pos / 6 | 0) + DY[dir];
        const spans = tx >= 0 && ty >= 0 && tx < 6 && ty < 8 && result.g[ty * 6 + tx] === '~';
        drawFlat(pos, dir, 0.4, spans);
        const x = pos % 6 + DX[dir];
        const y = (pos / 6 | 0) + DY[dir];
        if (x >= 0 && y >= 0 && x < 6 && y < 8 && result.g[y * 6 + x] === '~') {
          const o = cellOrigin(y * 6 + x);
          ctx.save();
          ctx.strokeStyle = '#F4EEDF';
          ctx.globalAlpha = 0.7;
          ctx.setLineDash([2, 3]);
          roundRect(ctx, o.x + 6, o.y + 6, layout.cell - 12, layout.cell - 12, 6);
          ctx.stroke();
          ctx.restore();
        }
      } else if (kind === 'spin') {
        const o = cellOrigin(pos);
        const s = layout.cell;
        ctx.save();
        ctx.strokeStyle = '#FFD166';
        ctx.fillStyle = '#FFD166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(o.x + s / 2, o.y + s / 2, s * 0.28, Math.PI * 0.2, Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      } else if (kind === 'jam') {
        const o = cellOrigin(pos);
        const x = o.x + layout.cell / 2;
        const y = o.y + layout.cell / 2;
        ctx.strokeStyle = '#EF476F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 7);
        ctx.lineTo(x + 7, y + 7);
        ctx.moveTo(x + 7, y - 7);
        ctx.lineTo(x - 7, y + 7);
        ctx.stroke();
      }
    });
  }
  function drawDust() {
    const t = nowMs();
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      const u = (t - p.t0) / p.life;
      if (u >= 1) { dust.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = '#E7D7B8';
      ctx.beginPath();
      ctx.arc(p.x + p.vx * u, p.y + p.vy * u, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function spawnDust(i) {
    const o = cellOrigin(i);
    const s = layout.cell;
    for (let n = 0; n < 4; n++) {
      dust.push({ x: o.x + s / 2, y: o.y + s / 2, vx: (n - 1.5) * 14, vy: -8 - n * 3, t0: nowMs(), life: 360 });
    }
  }

  function draw(now) {
    if (!layout) return;
    ensureBake();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bake, 0, 0, canvas.width, canvas.height, 0, 0, W, H);
    const tickF = anim && anim.phase === 'cascade' ? (now - anim.t0) / anim.tickMs : 99;
    const wobbleCell = anim && anim.phase === 'wobble' ? anim.cell : null;
    const wobbleX = wobbleCell != null ? Math.sin((now - anim.t0) / 24) * 3 : 0;
    for (let i = 0; i < 48; i++) {
      let item = pose[i];
      if (anim && anim.phase === 'cascade') {
        const event = eventAt(anim.log, i);
        if (event && event[0] > tickF) item = anim.before[i];
      }
      if (anim && anim.phase === 'wave') {
        const idx = Math.floor((now - anim.waveT) / anim.waveStep);
        if (fellOrder[idx] === i) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = '#F4EEDF';
          const o = cellOrigin(i);
          ctx.fillRect(o.x + 2, o.y + 2, layout.cell - 4, layout.cell - 4);
          ctx.restore();
        }
      }
      drawCell(i, item, 1, i === wobbleCell ? wobbleX : 0);
      if ((item.kind === 'H' || item.kind === 'V') && KL.pinnedAt(state.cells, i) && (!anim || anim.phase !== 'cascade')) drawPin(i);
    }
    if (preview && preview.log) drawPreviewMarks(preview);
    if (selected != null && !anim) {
      const o = cellOrigin(selected);
      ctx.strokeStyle = hintDir != null ? '#FFD166' : '#F4EEDF';
      ctx.lineWidth = 2;
      roundRect(ctx, o.x + 2, o.y + 2, layout.cell - 4, layout.cell - 4, 8);
      ctx.stroke();
    }
    drawDust();
    const labelY = layout.originY - 16;
    if (knockEl.textContent) {
      knockEl.style.top = Math.max(78, labelY) + 'px';
    }
  }

  function updateAnim(now) {
    if (!anim) return;
    if (anim.phase === 'wobble') {
      if (now - anim.t0 > 150) finishAnim();
      return;
    }
    if (anim.phase === 'cascade') {
      const tick = Math.floor((now - anim.t0) / anim.tickMs);
      if (tick > anim.heard) {
        for (let k = anim.heard + 1; k <= tick && k <= anim.maxTick; k++) soundTick(k);
        anim.heard = tick;
      }
      const doneAt = anim.t0 + (anim.maxTick + 1) * anim.tickMs + 140;
      if (now >= doneAt) {
        if (anim.outcome === 'win' && fellOrder.length) {
          anim.phase = 'wave';
          anim.waveT = now;
          anim.waveStep = Math.min(70, 800 / fellOrder.length);
        } else finishAnim();
      }
      return;
    }
    if (anim.phase === 'wave' && now - anim.waveT > anim.waveStep * fellOrder.length + 80) finishAnim();
  }
  function soundTick(tick) {
    const eventsNow = anim.log.filter(function (event) { return event[0] === tick; });
    eventsNow.forEach(function (event, index) {
      if (event[1] === 'fall' || event[1] === 'turn' || event[1] === 'split') {
        const step = [523, 587, 659, 784, 880, 1046][Math.min(5, tick + index)];
        tone(event[1] === 'fall' ? step : step * 0.5, 0.08, event[1] === 'split' ? 'square' : 'triangle', 0.05);
        if (event[1] !== 'fall') tone(event[1] === 'split' ? 180 : 320, 0.1, 'sawtooth', 0.03);
        const x = event[2] % 6 + DX[event[3]];
        const y = (event[2] / 6 | 0) + DY[event[3]];
        if (x >= 0 && y >= 0 && x < 6 && y < 8) spawnDust(y * 6 + x);
        else spawnDust(event[2]);
      } else if (event[1] === 'spin') tone(240, 0.09, 'square', 0.04);
      else if (event[1] === 'jam') tone(110, 0.08, 'square', 0.04);
    });
    if (tick === anim.maxTick) tone(140, 0.14, 'triangle', 0.06);
  }

  function unlockAudio() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    musicOn = true;
    lastMusic = nowMs();
  }
  function tone(freq, dur, type, gain) {
    if (!audioCtx || muted) return;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    amp.gain.value = gain || 0.04;
    amp.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }
  function blip(freq) { tone(freq, 0.07, 'sine', 0.04); }
  function chime() { tone(523, 0.18, 'sine', 0.05); tone(659, 0.22, 'sine', 0.04); tone(784, 0.28, 'triangle', 0.04); }
  function music() {
    if (!musicOn || !audioCtx || muted || overlayOpen()) return;
    const t = nowMs();
    if (t - lastMusic < 520) return;
    lastMusic = t;
    tone([392, 440, 494, 440][(t / 520 | 0) % 4], 0.18, 'sine', 0.015);
  }

  function endDrag(event, cancel) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const info = drag;
    drag = null;
    if (info.skip) { finishAnim(); return; }
    const outside = !cancel && releaseOutside(event);
    releaseLog = event ? { x: event.clientX, y: event.clientY, outside: !!(cancel || outside) } : null;
    const point = event ? localPoint(event) : { x: info.x, y: info.y };
    const dx = point.x - info.ox;
    const dy = point.y - info.oy;
    const moved = Math.hypot(dx, dy) >= 8;
    needPaint = true;
    if (cancel || outside || boardBlocked() || moved) {
      selected = null;
      hintDir = null;
      preview = null;
      syncHud();
      if (cancel || outside || boardBlocked()) return;
      if (info.dir == null || projection(info.dir, dx, dy) < 24) return;
      if (!KL.canFall(state.cells, info.cell, info.dir)) { wobble(info.cell); return; }
      if (navigator.vibrate) navigator.vibrate(8);
      doPush(info.cell, info.dir);
      return;
    }
    syncHud();
  }

  canvas.addEventListener('pointerdown', function (event) {
    unlockAudio();
    if (anim && anim.phase !== 'wobble' && nowMs() - anim.t0 > 500) {
      drag = { skip: true, id: event.pointerId };
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* synthetic */ }
      event.preventDefault();
      return;
    }
    if (boardBlocked()) return;
    const p = localPoint(event);
    const cell = cellAt(p.x, p.y);
    if (cell == null || (state.cells[cell] !== 'H' && state.cells[cell] !== 'V')) {
      selected = null;
      hintDir = null;
      syncHud();
      needPaint = true;
      return;
    }
    selected = cell;
    hintDir = null;
    drag = { cell: cell, x: p.x, y: p.y, ox: p.x, oy: p.y, id: event.pointerId, dir: null };
    arrows.classList.add('hidden');
    try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* a synthetic pointer has nothing to capture */ }
    finger.classList.add('hidden');
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    const p = localPoint(event);
    drag.x = p.x;
    drag.y = p.y;
    const dir = axisDir(state.cells[drag.cell], p.x - drag.ox, p.y - drag.oy);
    drag.dir = dir;
    if (dir != null && projection(dir, p.x - drag.ox, p.y - drag.oy) >= 12 && KL.canFall(state.cells, drag.cell, dir)) {
      preview = KL.push(state.cells, drag.cell, dir);
    } else preview = null;
    needPaint = true;
  });
  canvas.addEventListener('pointerup', function (event) { endDrag(event, false); });
  canvas.addEventListener('pointercancel', function (event) { endDrag(event, true); });
  canvas.addEventListener('pointerleave', function (event) { if (drag) endDrag(event, true); });
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  function arrowDown(event) {
    unlockAudio();
    if (boardBlocked() || selected == null) return;
    const d = +event.currentTarget.dataset.dir;
    if (KL.canFall(state.cells, selected, d)) preview = KL.push(state.cells, selected, d);
    else preview = null;
    needPaint = true;
  }
  function arrowUp(event) {
    if (boardBlocked() || selected == null) return;
    const d = +event.currentTarget.dataset.dir;
    preview = null;
    if (!KL.canFall(state.cells, selected, d)) wobble(selected);
    else doPush(selected, d);
    needPaint = true;
  }
  arrowA.addEventListener('pointerdown', arrowDown);
  arrowB.addEventListener('pointerdown', arrowDown);
  arrowA.addEventListener('pointerup', arrowUp);
  arrowB.addEventListener('pointerup', arrowUp);
  arrowA.addEventListener('pointerenter', arrowDown);
  arrowB.addEventListener('pointerenter', arrowDown);
  function clearArrowPreview() {
    if (hintDir == null) preview = null;
    needPaint = true;
  }
  arrowA.addEventListener('pointerleave', clearArrowPreview);
  arrowB.addEventListener('pointerleave', clearArrowPreview);
  function swallowFreshPanel(event) {
    if (nowMs() >= panelLock) return;
    if (event.target.closest && event.target.closest('.overlay')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  stage.addEventListener('pointerdown', swallowFreshPanel, true);
  stage.addEventListener('pointerup', swallowFreshPanel, true);
  stage.addEventListener('click', swallowFreshPanel, true);

  document.getElementById('undo').addEventListener('click', function () { unlockAudio(); doUndo(); });
  document.getElementById('restart').addEventListener('click', function () {
    unlockAudio();
    if (state.used > 0 && !state.won) show(panels.confirm);
    else loadLevel(levelNum);
  });
  document.getElementById('menu').addEventListener('click', function () { renderLevels(); show(panels.menu); });
  document.getElementById('resume').addEventListener('click', function () { hide(panels.menu); });
  document.getElementById('how').addEventListener('click', function () { hide(panels.menu); show(panels.help); });
  document.getElementById('help-close').addEventListener('click', function () { hide(panels.help); show(panels.menu); });
  document.getElementById('hint').addEventListener('click', function () { unlockAudio(); doHint(); });
  document.getElementById('mute').addEventListener('click', function () { unlockAudio(); muted = !muted; saveProgress(); syncHud(); });
  document.getElementById('confirm-yes').addEventListener('click', function () { hide(panels.confirm); loadLevel(levelNum); });
  document.getElementById('confirm-no').addEventListener('click', function () { hide(panels.confirm); });
  document.getElementById('stuck-undo').addEventListener('click', function () { hide(panels.stuck); doUndo(); });
  document.getElementById('stuck-restart').addEventListener('click', function () { hide(panels.stuck); loadLevel(levelNum); });
  document.getElementById('fail-restart').addEventListener('click', function () { hide(panels.fail); loadLevel(levelNum); });
  document.getElementById('fail-menu').addEventListener('click', function () { hide(panels.fail); renderLevels(); show(panels.menu); });
  document.getElementById('win-next').addEventListener('click', function () { hide(panels.win); loadLevel(levelNum + 1); });
  document.getElementById('win-retry').addEventListener('click', function () { hide(panels.win); loadLevel(levelNum); });
  document.getElementById('win-menu').addEventListener('click', function () { hide(panels.win); renderLevels(); show(panels.menu); });

  function renderLevels() {
    const box = document.getElementById('levels');
    box.innerHTML = '';
    KL.LEVELS.forEach(function (item, index) {
      const n = index + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      const stars = progress.stars[n] || 0;
      btn.textContent = n + (stars ? '\u2605' : '');
      btn.disabled = n > progress.unlocked && n !== levelNum;
      btn.addEventListener('click', function () { hide(panels.menu); loadLevel(n); });
      box.appendChild(btn);
    });
  }

  window.addEventListener('keydown', function (event) {
    unlockAudio();
    if (event.key === 'Escape') {
      if (!panels.win.classList.contains('hidden')) {
        (document.getElementById('win-next').disabled ? document.getElementById('win-retry') : document.getElementById('win-next')).focus();
        return;
      }
      if (overlayOpen()) Object.keys(panels).forEach(function (key) { hide(panels[key]); });
      else { renderLevels(); show(panels.menu); }
      return;
    }
    if (overlayOpen() || anim) return;
    if (event.key === 'z' || event.key === 'Z') { doUndo(); return; }
    if (event.key === 'h' || event.key === 'H') { doHint(); return; }
    if (event.key === 'r' || event.key === 'R') {
      if (state.used > 0 && !state.won) show(panels.confirm);
      else loadLevel(levelNum);
      return;
    }
    const keyDir = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[event.key];
    if (keyDir == null) return;
    if (event.shiftKey && selected != null) {
      if (KL.canFall(state.cells, selected, keyDir)) doPush(selected, keyDir);
      else wobble(selected);
      return;
    }
    const list = [];
    state.cells.forEach(function (c, i) { if (c === 'H' || c === 'V') list.push(i); });
    if (!list.length) return;
    const at = selected == null ? -1 : list.indexOf(selected);
    selected = list[(at + 1) % list.length];
    hintDir = null;
    syncHud();
    needPaint = true;
  });

  window.addEventListener('resize', function () { measure(); needPaint = true; });
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); needPaint = true; }).observe(stage);

  function frame(now) {
    requestAnimationFrame(frame);
    music();
    if (anim) updateAnim(now);
    if (!needPaint && !anim && !dust.length) return;
    draw(now || nowMs());
    needPaint = !!anim || !!drag || dust.length > 0;
  }

  window.__knock = {
    ready: true,
    load: loadLevel,
    cellSize: function () { return layout.cell; },
    bufferScale: function () { return dpr; },
    oracleMs: function () { return oracleMs; },
    stuckMs: function () {
      const t0 = nowMs();
      minF(state.cells);
      return nowMs() - t0;
    },
    animating: function () { return !!anim || !!drag; },
    snapshot: function () {
      return {
        cells: state.cells.slice(),
        pushes: state.pushesLeft,
        used: state.used,
        won: state.won,
        failed: state.failed,
        reason: state.reason,
        hint: state.hintUsed,
        stars: state.won ? KL.starsFor(level, state) : 0
      };
    },
    lastRelease: function () { return releaseLog; },
    dismiss: function () { finger.classList.add('hidden'); lessonEl.textContent = ''; },
    cellBox: function (i) {
      const o = cellOrigin(i);
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / W;
      const x = rect.left + o.x * scale;
      const y = rect.top + o.y * (rect.height / H);
      const s = layout.cell * scale;
      return { left: x, top: y, right: x + s, bottom: y + s };
    },
    swipe: function (p, d) {
      const o = cellOrigin(p);
      const s = layout.cell;
      const from = { x: o.x + s / 2, y: o.y + s / 2 };
      const to = { x: from.x + DX[d] * 36, y: from.y + DY[d] * 36 };
      return { from: toViewport(from), to: toViewport(to) };
    },
    fastCommit: function (p, d) {
      const result = KL.commit(state, p, d, minF);
      if (!result.ok) return result.reason;
      poseStack.push(pose);
      fellMarks.push(fellOrder.length);
      pose = poseAfter(pose, result.result);
      result.result.log.forEach(function (event) {
        if (event[1] === 'fall' || event[1] === 'turn' || event[1] === 'split') fellOrder.push(event[2]);
      });
      anim = null;
      if (result.outcome === 'win') openWin();
      else if (result.outcome === 'stuck') openStuck();
      else if (result.outcome === 'pushes') openFail();
      syncHud();
      needPaint = true;
      return result.outcome;
    }
  };

  muted = progress.mute;
  measure();
  const params = new URLSearchParams(location.search);
  loadLevel(params.get('level') ? +params.get('level') : (progress.unlocked || 1));
  requestAnimationFrame(frame);
})();
