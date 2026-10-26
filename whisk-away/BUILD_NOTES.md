# Whisk Away — build notes

## Concept

- Game ID: GF-20261026-01
- Brief: v1 in `BRIEF.md`, amendment v1.1 in `BRIEF-v1.1.md` (WA-002 pure whip, and the L10 board), amendment v1.2 in `BRIEF-v1.2.md` (L7 only)
- Pull a cloth slowly and everything stacked on it rides one cell. Whip it and the cloth is gone; dishes drop onto the layer below. Clear every cloth and leave each dish on its mark.

## Implementation

- Tech: Canvas 2D. No build step and no physics library. `logic.js` is the rules and the exact solver. `game.js` draws and handles input.
- A slow pull moves the chosen cloth one cell in its fixed direction. Every higher cloth that overlaps the moving set, and every dish standing on those cloths, rides along. A whip removes the cloth. Dishes and higher cloths stay where they are. A cloth cannot pass through a dish on a lower layer, and a whip whose lane to the table edge contains such a dish is refused.
- The 10 levels are the boards in `tests/pack_v1_2.json`. L7 is seed 112345 (par 7, budget 9, 7,263 states). L10 is seed 121131 (par 10). The other eight boards match `tests/pack_v1.json`, and every level except L7 matches `tests/pack_v1_1.json`. Budget is par + 2. There is no hint and no timer.
- Undo restores the previous position and costs 1. The button reads Undo −1. Restart puts the budget back.
- The stuck banner is exact. It reads "Can't set the table in 1 move" or "in N moves". Restart is always there. Undo is there only when paying for the undo still leaves a winnable position.
- Stars: par is ★★★, par + 1 is ★★, par + 2 is ★. The last whip that sets the table plays the TA-DA card.
- Controls: a drag shows a pull preview and does not commit until release. Release speed uses pointer-up and coalesced samples, but only from the first sample that has actually moved, over the last 60 ms of that movement. A finger that rests before the flick does not dilute the speed. At least 1 px/ms along the pull and at most 250 ms is a pure whip: the cloth leaves and no snapped pull from that gesture is kept. Anything slower commits only the cells that had passed the halfway mark. The top cloth's body wins a touch, including any part drawn off the table. A tassel wins only on empty wood. If a cloth's uncovered body cannot hold a 44 px square, a 44 px handle is drawn in its pull direction. Canvas input stays blocked while the finger that tapped an overlay is down, and for 350 ms after that finger lifts. Another tap during the guard extends the block until that finger lifts and another 350 ms pass. Double-tap also whips. Keys 1–4 select a cloth, the matching arrow or Space pulls once, W whips, U undoes, R restarts.
- A gesture that finishes during a flip is queued and checked again when it plays. A win or a fail clears the queue, and the move counter cannot go below zero. A drag that starts on empty wood does nothing and does not throw. Selection is cleared after every drag, cancel, and pointercancel.
- The largest search, L8, runs in slices after the table is on screen. L7 and L10 are under the slice threshold.
- Audio is synthesized, with a mute button. Nothing is fetched.
- Art is a honey-wood table. Four cloth families: tomato check, teal stripe, mustard dots, cream lace. Dishes are round, square, bowl, and cup, and the marks use the same shape. A cloth that hangs off the table is drawn on the wood.

## Scope

| Item | Status | Note |
| --- | --- | --- |
| M1 Reference lines clear with ★★★ | PASS | All 10 v1.2 lines by trusted touch at 320, 360, 390 and 430. Each cloth's touch target is at least 44 px |
| M2 Engine matches the Python sim | PASS | State count, par, distance, and legal-move sets hash-equal `core2.py` on all 10 v1.2 levels |
| M3 Stuck banner exact, undo only if it still wins | PASS | Distance check over the whole graph. One move is singular. L2's opening whip shows the banner and offers Undo −1 |
| M4 Refused moves are free, undo costs 1, no input after the end | PASS | Win clears a queued drag. Three, four and five taps on Next leave the next table at 0 moves. Triple-tapping stuck Undo undoes once |
| M5 Flick versus pull misfires | PASS | Trusted CDP touch after a 40–80 ms rest: 0/100 flicks and 0/100 pulls at 320, 360, 390 and 430 |
| M6 Cloths start with at least two visible cells | PASS | Counts match the pack. An off-table overhang stays drawn and hittable |
| M7 Frame rate and load | PASS | Mean fps 60.0, 60.0, 60.0. Worst 30-frame window 60.0. At 4× CPU: L8 visible 482 ms / solver 547 ms, L9 198 / 25, L10 199 / 14 |
| M8 Lazy play | PASS | L5–L10 random 20.22, 15.8, 1.65, 5.52, 0.76, 0.05. L7's 1.65 is the pack's 1.6 at one decimal. Every greedy variant on L7 is 0. Every greedy variant on L5–L10 is at most 0.09. Whip-first is 0 from L2 |
| M9 L10 strictly hardest | PASS | Par 10 against 8 or less. Random 0.05 against 0.76 or more. Two-ply greedy 0.09 |
| Haptics | DROPPED | Optional. A short vibrate is sent only when the browser provides it |
| Daily table, new pieces | DROPPED | Not in the MVP |
| Restart fly-back | DROPPED | Restart replaces the table at once. The brief's 300 ms fly-back is not animated |

## QA revision 1

Rules of pull and whip are unchanged. The gesture that chooses between them is the v1.1 amendment. L10 is Game Finder's v1.1 board.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| WA-001 | Release speed over the last movement, including pointer-up and coalesced samples | `game.js` releaseSpeed | Reopened in revision 2: a rest before a short flick was still read as a pull | REVISED |
| WA-002 | A whip commits no snapped pulls | `game.js` endDrag, `BRIEF-v1.1.md` | A 1.2-cell flick on L1 leaves the dish on its mark and removes the cloth. A slow drag commits one cell, then two | PASS |
| WA-003 | Ignore the canvas after an overlay tap until the finger lifts and 350 ms pass | `game.js` input guard | Three taps passed in revision 1. Four and five taps were still open | REVISED |
| WA-004 | New L7 and L10 from Game Finder | `tests/pack_v1_1.json` | L10 seed 121131 still matches. L7 was replaced again in v1.2 | PASS for L10 |
| WA-005 | Worst 30-frame window at least 55 fps | fps test | Worst window 60.0 at 4× CPU | PASS |
| WA-006 | Singular banner | `logic.js` stuckText | "1 move", "4 moves" | PASS |
| WA-007 | A visible top cloth wins over a tassel | `game.js` hitCloth | Body, including overhang, wins. A tassel wins only on empty wood | PASS |
| WA-008 | Do not block the first frame on the search | sliced `stepGraph` for L8 | L8 solver 547 ms, L10 solver 14 ms, both boards visible under 1 s at 4× CPU | PASS |

## QA revision 2

Rules of pull, whip, carry, lane, undo cost and budget are unchanged. L7 is the only board that changed, and it is Game Finder's v1.2 board.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| WA-001 | Speed is measured only after the finger moves, over the last 60 ms of that movement | `game.js` releaseSpeed | 0/100 flick misses and 0/100 pull misses at 320, 360, 390 and 430, with a 40–80 ms rest before the flick | PASS |
| WA-003 | A follow-up tap extends the guard until that finger lifts plus 350 ms | `game.js` block until lift | 3 taps at 70 ms, 4 taps at 150 ms, and 5 taps at 120 ms leave L2 at 0 moves | PASS |
| WA-010 | The same guard covers stuck Undo and any other overlay button | `game.js` window pointer listeners | Triple-tapping stuck Undo at 70 ms and 200 ms, at 320, 360, 390 and 430, undoes once and does not whip | PASS |
| WA-011 | Draw cloth that hangs off the table, and give every cloth a visible target of at least 44 px | `game.js` screen hit test and grab handle. L7 replaced by seed 112345 | Off-table pixels on L1 are cloth, not bare wood, and hit that cloth. Every reference step at four widths starts on a 44 px target that hits the intended cloth | PASS |
| WA-012 | Notes matched the code | this file | The whip is speed-only. A longer flick does not keep snapped pulls. The top cloth body wins the hit test | PASS |

## Design decisions

- The solver is the forward graph from `core2.py`, then distances back from the goals. The JS digest of every state, distance, and legal move matches Python on all 10 levels.
- A whip is chosen only by release speed and duration. Speed is the motion along the pull over the last 60 ms after the finger has started moving. Stationary samples from a rest before the flick are ignored. The whip does not keep snapped pulls. A slower release commits only the cells past the halfway mark.
- The top cloth's body wins the hit test, including the part drawn off the table. A tassel wins only on empty wood. When the uncovered body cannot hold a 44 px square, a 44 px handle is drawn on open wood in the pull direction, and that handle is the touch target.
- Strawberry-red refusal is `#E0524A` from the brief. Cloth red is `#C23B22` so it stays distinct from the wood `#C8955C`.

## Testing

- Install first: `npm install` at the repo root. The browser suite loads Playwright from that install.
- `node --test --test-timeout=180000 whisk-away/tests/logic.test.mjs whisk-away/tests/browser.test.mjs whisk-away/tests/browser-reference.test.mjs whisk-away/tests/misfire-320.test.mjs whisk-away/tests/misfire-360.test.mjs whisk-away/tests/misfire-390.test.mjs whisk-away/tests/misfire-430.test.mjs`
- The long gesture files are separate because the runner's timeout covers a whole file. Each file finishes under 180 s.
- Result: 17 tests, 17 pass, 0 fail. Logic 4, browser interaction 8, touch reference 1, misfire 4.
- FPS: min 60.0 of 60.0, 60.0, 60.0. Worst 30-frame window 60.0. Scale 1.5, buffer 585. Gate is 50, and the window gate is 55.
- Misfires, each after a real rest of 40–80 ms and with several movement samples: 320 flick 0/100 pull 0/100, 360 flick 0/100 pull 0/100, 390 flick 0/100 pull 0/100, 430 flick 0/100 pull 0/100.
- Touch reference lines: L1–L10 pass at 320, 360, 390 and 430 (40/40), including the new L7 line whip c0, drag c1, whip c1, drag c2, drag c2, whip c2, whip c3.
- Lazy play, two decimals: L7 random 1.65 (pack 1.6) and every greedy policy 0. L10 random 0.05, two-ply 0.09. L10 is strictly hardest on par and on random.
- Not claimed from a device lab. The fps gate is the throttled desktop Chrome run the other games use.
- Repro: open `whisk-away/index.html`. `?level=7` opens The Hand-off.

## Delivery

- URL: https://brerdem.github.io/games/whisk-away/
- Gallery card added. The other games were not edited, apart from the shared gallery, copy list, layout gate, and CI job that publish this one.
- Game Tester: ready for a pass against section M. The tablecloth fantasy is shared with small physics toys; this one is an untimed layered puzzle. That flag is for Burak.

Screenshots:

- `/opt/cursor/artifacts/whisk-away-390-l1.png`
- `/opt/cursor/artifacts/whisk-away-390-l7.png`
- `/opt/cursor/artifacts/whisk-away-desktop-1440.png`
