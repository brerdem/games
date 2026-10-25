# Turnover — build notes

## Concept

- Game ID: GF-20261025-01
- Brief: v1, stored as `BRIEF.md`
- Drag the top one, two, or three pancakes onto another plate. They land in reverse order, and every two-sided pancake turns over. Finish with each flavour on its own plate, golden side up.

## Implementation

- Tech: Canvas 2D. No build step and no physics library. `logic.js` is the rules and the budget-aware solver. `game.js` draws and handles input.
- A flip lifts at most 3 pancakes from the top, reverses them, and turns a pancake over only when its flavour is two-sided on that level. Plates hold 4. The target is a different plate.
- Budget is par + 2. Undo plays the reverse flip and costs 1. The button reads Undo −1.
- The stuck banner is exact: after a flip it says "Can't finish in N flips — restart" when the goal is farther away than the flips left. The card offers Restart only. The solver is a bidirectional search. A goal-side ball of depth 6 is warmed when the plate opens, in small slices, behind "Heating the griddle". Before the plate is shown, the opening position, a 2-flip neighbourhood on the smaller plates (budget at most 7), and the reference line are checked so the first flips do not hitch.
- Levels: the 10 boards in `tests/pack_v1_solved.json`, unchanged. No hint.
- Controls: drag a pancake to a plate, with a ghost of the landing. A tap under 12 px does not flip. Tap a pancake, then a plate, also works. Keys 1–4 pick a plate, Q/W/E pick depth, then 1–4 the target. U undoes, R restarts.
- A drag that finishes during a flip is queued and played next. pointercancel drops the drag.
- Animation: the chunk arcs (apex 120 px) and turns over as one piece in 400 ms, inside the 420 ms cap. A 3-high flip that completes a plate gets a wider gold flourish. Landing throws a short flour burst.
- Audio is synthesized, with a mute button. Nothing is fetched.
- Art is a cream diner counter, white plates with a blue rim, and thick pancakes. Strawberry, blueberry, and matcha are colour plus a glyph. Every pancake shows an up-face band and an underside band, including pancakes in the middle of a stack. A burnt up-face also has a small smoke wisp.

## Scope

| Item | Status | Note |
| --- | --- | --- |
| M1 Reference lines clear with ★★★ | PASS | All 10 lines in `logic.test.mjs`. Each line length is par |
| M2 Reverse and turnover | PASS | A 2-lift reverses order. On L3 the two blueberries turn burnt. A both-sides-golden pancake does not change |
| M3 No deep lift, full plate is free | PASS | A depth of 4 is not a legal move. A full plate is not a drop target and spends nothing |
| M4 Undo costs 1 and restores the plates | PASS | The reverse of every opening move restores the start. In the browser, undo after two flips returns the first-flip plates and spends one more flip |
| M5 Stuck banner is exact | PASS | 40 checks: each start is solvable in par and not in par − 1, and the same after the first reference flip. The L1 line `[0,1,1]` then `[2,1,0]` shows "Can't finish in 3 flips — restart" |
| M6 Faces readable at 320 and 390 | PASS | On L9, a mid-stack burnt pancake samples a dark up-face and a golden underside at 320×568 and 390×844. Plate widths are 70 and 87 |
| M7 60 fps, flip ≤ 420 ms, queued drags | PASS | FPS min 59.5 of 59.5, 60.0, 60.0 at 390×844, DPR cap 1.5, buffer 585, 4× CPU. A second commit during the first flip is played, not dropped. A commit during the winning flip is dropped |
| M8 Pack exact and non-isomorphic | PASS | Starts and reference lines match `pack_v1_solved.json`. The ten starts stay distinct under plate order and same-sidedness flavour relabelling |
| Fidelity | PASS | 12 random flips on each of the 10 levels match `tests/core.py` |
| Lazy L7–L10 | PASS | Re-measured greedy and 2-ply, no probe: L7 5.0%, L8 12.5%, L9 2.5%, L10 2.5%. All ≤ 30% |
| Misfires | PASS | 0 / 100 real drags of L1's first flip at 390×844, with 3 px of wobble |
| pointercancel | PASS | A touchCancel after a full drag spends nothing |
| Short screens | PASS | Pancake height stays at least 36 px. At 320×568 the cakes are 44 px and the plates are 70 px |
| Hint | DROPPED | The brief forbids a hint in the MVP |
| Daily plate, glued pairs, 5-plate tier | DROPPED | Not authorised |

## Design decisions

- Strawberry is `#C42B42` and matcha is `#2F7A28` so both clear 4.5:1 on the cream counter `#FFF4E2`. The brief's `#E8485B` and `#5DAE4B` measure 3.5:1 and 2.5:1 on that counter. Blueberry `#3D63D8` already clears it. Golden `#F2B84B` stays as specified: it is the face colour against burnt `#4A2E1E` and a 2.5 px brown outline, not a label on the counter (it is 1.6:1 on the cream).
- The flip is a tweened arc plus a horizontal-axis squash through zero, not a 3D mesh. The brief allows that. The chunk is drawn reversed and turned over once the arc passes halfway, so the landing order is visible.
- The solver does not ship a distance table. A goal ball of depth 6 is built in slices when the level opens. A check then searches only the remaining flips on the player's side. L10's first "within par" check is a few hundred milliseconds; later checks reuse the ball.
- L1's ghost sits on the reference's first flip: the top blueberry of the tall stack, arcing onto the blueberry plate.
- The burnt-side card appears the first time a two-sided level opens, which is L3 if you play in order. The copy is the brief's sentence.

## QA revision 1

No change to the stuck-banner sentence or to the flip budget. In-play undo still costs 1 and does not refund the flip. The stuck card offers Restart only.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| TO-001 | Re-check a queued move when it plays. An illegal one shakes and is not applied | `game.js` moveLegal, rejectMove | L1 commits `[2,1,1]`, `[2,3,0]`, `[1,2,0]` inside one flip: max plate 4, the third is rejected. Keys `3 q 2 3 e 1 2 w 1` do the same | PASS |
| TO-002 | Undo pops the history instead of redoing the flip | `game.js` playUndo | L4: two flips, then Undo, then Undo, returns to the start. The first Undo matches the state after one flip | PASS |
| TO-003 | Stuck card has Restart and no Undo | `index.html` | The L1 stuck card has `#stuck-restart` and no `#stuck-undo`. The bar Undo −1 is unchanged | PASS |
| TO-004 | The 4th pancake stays full colour. Depth is a shadow and a dashed rim | `game.js` drawCakes | L9's bottom pancake, up-face versus underside, is at least 4.5:1 at 320 and 390 | PASS |
| TO-005 | Tap a pancake, then tap a plate | `game.js` endDrag | A two-tap on L1 spends one flip | PASS |
| TO-006 | The top of a pancake is not stolen by the one above | `game.js` hitCake | 100 drags on L1, L4, L9 and L10, including the top edge, centre and lower edge: 0 misses | PASS |
| TO-007 | Warm the opening flips before the first drag | `logic.js` prewarm | The solve is measured after ready. FPS min 59.5 | PASS |
| TO-008 | Undo during a flip is queued | `game.js` undo | A queued undo is played when the flip ends, and it steps backward | PASS |
| TO-010 | Raise the stacks into the open counter | `game.js` layoutGeom | Cakes are up to 68 px on a tall phone and sit around the middle of the counter | PASS |

## QA revision 2

No change to the flip rules, the 10 levels, the par + 2 budget, or the cost of an in-play undo. A finished plate, win or fail, ignores further flips until Restart or the next plate.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| TO-011 | On a win or a fail, drop the move queue and the undo queue. Reject anything further until restart or the next plate. At 0 flips, reject the move. The counter never goes negative | `game.js` settled, finishAnim, beginFlip, commit | During L1's winning flip, a queued commit and a drag leave the win card and the winning plates, with 2 flips left. Behind the last allowed flip, two queued commits, Undo, and a drag leave the counter at 0 | PASS |
| TO-012 | A drag that starts off a pancake must not throw | `game.js` endDrag | The 4 px gap, the empty counter, and a spot a flip just emptied: no console error, the reject cue, and no extra flip | PASS |
| TO-013 | The stuck sentence must not offer undo | `logic.js` stuckText, `index.html` | The banner is "Can't finish in 3 flips — restart". The card still has Restart only | PASS |
| TO-014 | A drag that is illegal by release uses the same shake and red flash | `game.js` endDrag calls rejectMove | A 3-lift whose source a queued flip shortens is rejected. The counter flash is the reject tint | PASS |
| TO-005 | In tap-then-tap, a pancake on a valid target plate is that plate | `game.js` remembers the previous tap | Tap the top of the tall stack, then the pancake on the middle plate: one flip. A pancake on the same plate does not flip | PASS |
| TO-007 | Warm one more ply where that stays cheap, and draw a flip once under the loading card | `logic.js` prewarm, `game.js` paintPaths | Plates with budget at most 7 warm two plies and the reference line. Larger plates stay at one ply. FPS min 59.5 of 59.5, 60.0, 60.0 | PASS |

## Testing

- Install first: `npm install` at the repo root. The browser suite loads Playwright from that install.
- `node --test --test-timeout=180000 turnover/tests/logic.test.mjs turnover/tests/browser.test.mjs`
- Result: 21 tests, 21 pass, 0 fail.
- FPS: min 59.5 of 59.5, 60.0, 60.0. Scale 1.5, buffer 585. Gate is 50.
- Misfires: 0 / 100 across L1, L4, L9 and L10, including the top edge of a pancake.
- Fidelity: 12 random flips on each of the 10 levels match `tests/core.py`.
- Lazy L7–L10, re-measured: 5.0%, 12.5%, 2.5%, 2.5%. All ≤ 30%.
- Not claimed from a device lab. The fps gate is the throttled desktop Chrome run the other games use.
- Repro: open `turnover/index.html`. `?level=9` opens Long Order, the burnt mid-stack.

## Delivery

- URL: https://brerdem.github.io/games/turnover/
- Gallery card added. Shish Lane and the other games were not edited.
- Game Tester: ready for a first pass against section M. The pancake-flip fantasy is shared with small web puzzles and one tiny store app; the move is a multi-plate transfer that reverses and turns. That flag is for Burak.

Screenshots:

- `/opt/cursor/artifacts/turnover-390-l1.png`
- `/opt/cursor/artifacts/turnover-390-l9.png`
- `/opt/cursor/artifacts/turnover-320.png`
- `/opt/cursor/artifacts/turnover-desktop-1440.png`
- `/opt/cursor/artifacts/turnover-desktop-1920.png`
