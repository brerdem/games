# MVP Brief 1 — RING OUT
*Date: 2026-10-18 · Author: Grok Bot for Burak Erdem (Clockwork) · For: Game MVP Builder bot · Score 8/10 (GO) — see `2026-10-18-report.md` §3 Idea 1*

## 1. One-line pitch
Spin concentric rings to line up their gaps, then fire each pin out of the core — in the right order, before you run out of hearts.

## 2. Inspiration (for context only — do not copy art/names)
- **Rotate Rings** (rotate concentric rings to align gaps) — iOS free #6, GP puzzle #2 on 2026-10-18.
- **Amaze GO! / Arrows – Puzzle Escape / CubeAway** (tap a piece to slide it out along its lane; pieces block each other; order is the puzzle).
- **Meowdoku!** (3 hearts; a wrong move costs a heart).
- **Magic Sort! / Block Out!** (color matching → colored gates).

## 3. Target platform & tech
- **Single self-contained `index.html`** (inline `<style>` + `<script>`), plain JavaScript + HTML5 Canvas 2D. No build step, no frameworks, no external files/fonts/images/audio. Must run by double-clicking the file (file://) in desktop Chrome/Safari/Firefox and mobile Safari/Chrome.
- Portrait-first responsive canvas (logical 720×1280, scaled to fit; letterbox on desktop). Use `devicePixelRatio` for crisp lines.
- Audio: WebAudio API synthesized blips (oscillator + gain envelopes), started after first user gesture; mute toggle.
- Persistence: `localStorage` (unlocked level, stars per level, mute setting).

## 4. Board model (rules)
- Center: a **core** (filled circle). Around it **R concentric rings** (MVP: 2–4 rings; ring 0 = innermost).
- Every ring is divided into **S = 12 sectors** (30° each). Each sector of a ring is either **WALL** or **GAP**. A ring has 1–4 gaps.
- **Pins** live on a ring sector that is WALL (a pin is "mounted" on the wall), pointing outward (radially). A pin belongs to its ring and rotates with it.
- Optional (from level 8): pins have a **color** (max 3 colors: coral, teal, gold) and some gaps on the **outermost ring** are **colored gates**. Neutral (white) gaps let any pin pass; a colored gate only lets a pin of the same color pass; neutral (white) pins can pass neutral gaps only, never colored gates. Inner rings only ever have neutral gaps.
- **Rotation:** rotating a ring by one step shifts all its sectors (gaps, walls, pins) by one sector (30°) CW or CCW. One step = **1 move**.
- **Launch:** tapping a pin launches it radially outward at its current angle. For each ring outside the pin's ring (r+1 … R-1), at the same sector index:
  - if that sector is a GAP (and color-compatible) **and** has no pin on it → pass through;
  - otherwise → **blocked**.
  - If it passes all outer rings → pin **escapes** (removed, +score).
  - If blocked → pin animates outward to the blocker, bounces back to its mount, screen shakes slightly, **lose 1 heart**. The pin stays.
- Launching does **not** cost a move. Rotations cost moves.

## 5. Win / lose
- **Win:** all pins escaped.
- **Lose:** hearts reach 0 (start with 3) **or** moves reach 0 while pins remain and no pin currently has a clear path. (If moves = 0 but a pin has a clear path, the player may still launch.)
- On lose: "Out of hearts/moves" panel → Retry (free in MVP). Later: rewarded "continue +5 moves / +1 heart" placeholder button (non-functional, labelled "AD (placeholder)").

## 6. Controls
- **Mouse/touch:** press on a ring band and drag around the center → the ring follows the angle; on release it snaps to the nearest sector; the number of sectors crossed = moves spent (show live counter while dragging). Tap (press+release with < 8 px movement, < 250 ms) on a pin → launch.
- **Keyboard:** `↑/↓` or `W/S` select ring (selected ring glows); `←/→` or `A/D` rotate selected ring one step CCW/CW; `Tab` cycles through pins on the selected ring; `Space/Enter` launches the highlighted pin; `Z` (or `Ctrl+Z`) undo last action (MVP: unlimited undo, costs nothing; restores moves/hearts too); `R` restart; `H` hint; `M` mute; `Esc` pause/menu.
- Hit-testing: ring band = annulus between its inner/outer radius (make bands ≥ 44 px thick on mobile); pins have a ≥ 44 px tap target.

## 7. Core loop
1. Read the board (which pins are free, which are blocked by which ring).
2. Rotate rings to open lanes (spend moves).
3. Launch pins in a working order (wrong order = heart lost).
4. Clear all pins → stars → next level (≈ 30–120 s per level).

## 8. Level design & progression
- **Level data format** (in code):
```js
{ id:1, rings:[ {gaps:[0,6]}, {gaps:[3]} ],          // sector indices that are GAP at rotation 0
  pins:[ {ring:0, sector:3}, {ring:0, sector:9} ],   // must be on WALL sectors
  rot:[0,2],                                          // initial rotation offsets (steps)
  par:4, moves:8 }                                    // par = 3-star threshold; moves = budget
```
  Colored versions add `color:'coral'` on pins and `gates:{sector:'coral'}` on the outermost ring.
- **Handcrafted ladder (12 levels):**
  - L1–2: 2 rings, 1–2 pins, tutorial (L1 needs 1 rotation; L2 introduces blocking order: pin A blocks pin B's lane).
  - L3–5: 3 rings, 3–4 pins, multiple gaps.
  - L6–7: pins on outer rings blocking inner pins (order puzzles).
  - L8–10: colored gates (2 colors).
  - L11–12: 4 rings, 3 colors, tight move budget.
- **Endless mode** (unlocks after L12): procedural generator (below) with difficulty rising every 3 levels (more rings, more pins, more colors, fewer spare moves).
- **Generator (guaranteed solvable) — reverse construction:**
  1. Start with R rings with random gaps (outermost ring gets 1–3 gaps, optionally colored), no pins, random rotation.
  2. Repeat P times: (a) apply 0–2 random rotation steps to a random ring, recording them; (b) choose a random WALL sector (ring r, sector s) such that a pin placed there would have a **clear outward path given the current state** (all pins already placed count as blockers), set its color compatible with the outer gate at that angle; place it, recording "place pin k".
  3. The reverse of this record is a valid solution: launch the last-placed pin first, undo rotations in reverse order, etc. `par` = number of recorded rotation steps (an upper bound); `moves` = par + slack (slack 4 → 1 as difficulty rises).
  4. Reject boards where every pin is free at the start (too easy) — require ≥ 1 blocked pin initially.
  5. Optional: BFS solver (state = rotations of each ring + remaining pins; rings ≤ 4, S = 12 → ≤ 20,736 rotation states × pin subsets) with a node cap (e.g. 50,000) to compute true minimal par when feasible; otherwise use the generator par.
- **Stars:** 3★ if moves used ≤ par and no hearts lost; 2★ if level cleared within par+3 moves or with ≤ 1 heart lost; 1★ otherwise.

## 9. Scoring
- Pin escape: +100. Combo: escaping pins on consecutive launches with no rotation in between: +50 × combo index.
- Level clear bonus: +50 × remaining moves + 200 × remaining hearts.
- Endless: cumulative score + best score saved.

## 10. Game feel & art direction (procedural, no files)
- Dark navy background (#0f1630) with a soft radial vignette; rings as thick rounded arcs (`ctx.arc` with `lineCap='round'`) in muted pastel per ring; gaps are true breaks in the arc.
- Pins: rounded triangles/arrowheads pointing outward, with a small glow; colored pins use coral #ff7a6b, teal #3ecfb2, gold #ffc94d; neutral = #f2f2f2.
- **Lane preview:** while a pin is hovered/selected, draw a faint dotted radial line outward; color it green if clear, red up to the first blocker.
- Rotation: eased snap (≈120 ms, ease-out-back slight overshoot), tick sound per sector crossed (pitch rises per ring).
- Escape: pin flies out with a trail of 8–12 particles, "whoosh" sound, small core pulse.
- Blocked: pin bounces back (spring), red flash on blocker sector, 6 px screen shake 150 ms, low "thunk".
- Level clear: rings spin briefly in alternating directions and fade; star burst particles.
- Optional subtle haptics: `navigator.vibrate(15)` on launch if available.

## 11. Screens & UI
1. **Title:** game name drawn with canvas text (system font stack), animated rings in background; buttons: Play, Endless (locked until L12), Sound on/off.
2. **Level select:** grid of 12 numbered circles showing stars; locked ones dimmed.
3. **Game HUD:** top bar — level number, Moves left (large), Hearts (3 heart icons drawn with paths), Pause; bottom bar — Undo, Hint, Restart. Hint: highlights one pin that is currently free and safe in a solution (use generator/BFS solution), or the ring to rotate and direction.
4. **Win panel:** stars, score, Next / Replay.
5. **Lose panel:** reason, Retry, (placeholder) "Continue (AD)".
6. **Pause:** Resume, Restart, Level Select, Sound.
- First-time tutorial overlay on L1–L2 (hand-pointer drawn with shapes: "Drag a ring", "Tap a pin").

## 12. MVP feature list (build now)
- [ ] Single `index.html`, Canvas rendering, responsive, 60 fps on mid-range phone.
- [ ] Ring/pin/gap model, rotation with move counting, launch with blocking + heart loss.
- [ ] Colored pins & gates.
- [ ] 12 handcrafted levels + Endless generator (guaranteed solvable).
- [ ] Undo, Restart, Hint.
- [ ] Mouse/touch drag rotation + tap launch; full keyboard controls.
- [ ] Stars, score, localStorage progress.
- [ ] WebAudio SFX + mute.
- [ ] Title, level select, HUD, win/lose/pause panels, L1–L2 tutorial.

## 13. Later features (do NOT build in MVP)
- Ring types: geared rings (rotating one turns another), one-way rings, locked rings that open after N escapes, "bomb" pins that clear a sector.
- Boosters economy (coins, hint/undo charges, extra heart), lives timer, rewarded ads, ad-removal IAP.
- Daily puzzle, leaderboards, events (Meowdoku-style streaks), themes/skins.
- Level editor and share codes.

## 14. Acceptance criteria (prototype is "playable" when all pass)
1. Opening `index.html` from disk shows the title screen with no console errors and no network requests (verify in DevTools Network tab: 0 requests after load).
2. L1 can be completed by a new player using only mouse **or** only touch **or** only keyboard.
3. Dragging a ring snaps to 30° steps; the moves counter decreases by exactly the number of steps crossed; undo restores rotation, moves, hearts and pins exactly.
4. Launching a pin whose outward lane is clear removes it; launching a blocked pin returns it to its mount and removes exactly 1 heart; the lane preview color always matches the launch outcome.
5. A pin on an outer ring blocks inner pins at the same sector; colored gates only pass same-colored pins; neutral pins cannot pass colored gates.
6. Win triggers when the last pin escapes; lose triggers at 0 hearts, or at 0 moves when no pin has a clear lane.
7. All 12 handcrafted levels are solvable within their move budget (include a debug key `Shift+S` that auto-plays the stored/BFS solution for the current level).
8. Endless generator produces 20 consecutive levels without a crash or an unsolvable board (auto-verified by the debug solver; log result to console).
9. Stars and unlocked levels persist after page reload.
10. Runs at ≥ 50 fps on a mid-range phone browser with 4 rings and 8 pins (no per-frame allocations in the render loop beyond particles).
11. Tap targets ≥ 44 px on a 375 px-wide viewport; no page scroll/zoom while playing (`touch-action:none`, prevent default on canvas gestures).
