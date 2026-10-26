# Whisk Away — build notes

## Concept

- Game ID: GF-20261026-01
- Brief: v1 in `BRIEF.md`, amendment v1.1 in `BRIEF-v1.1.md` (WA-002 pure whip, and the new L7 and L10 boards)
- Pull a cloth slowly and everything stacked on it rides one cell. Whip it and the cloth is gone; dishes drop onto the layer below. Clear every cloth and leave each dish on its mark.

## Implementation

- Tech: Canvas 2D. No build step and no physics library. `logic.js` is the rules and the exact solver. `game.js` draws and handles input.
- A slow pull moves the chosen cloth one cell in its fixed direction. Every higher cloth that overlaps the moving set, and every dish standing on those cloths, rides along. A whip removes the cloth. Dishes and higher cloths stay where they are. A cloth cannot pass through a dish on a lower layer, and a whip whose lane to the table edge contains such a dish is refused.
- The 10 levels are the boards in `tests/pack_v1_1.json`. L7 is seed 110060 (par 7) and L10 is seed 121131 (par 10). The other eight boards match `tests/pack_v1.json`. Budget is par + 2. There is no hint and no timer.
- Undo restores the previous position and costs 1. The button reads Undo −1. Restart puts the budget back.
- The stuck banner is exact. It reads "Can't set the table in 1 move" or "in N moves". Restart is always there. Undo is there only when paying for the undo still leaves a winnable position.
- Stars: par is ★★★, par + 1 is ★★, par + 2 is ★. The last whip that sets the table plays the TA-DA card.
- Controls: a drag shows a pull preview and does not commit until release. Release speed is the motion along the tassel over the last 50–100 ms, including the pointer-up point and coalesced samples. At least 1 px/ms and at most 250 ms is a pure whip: the cloth leaves and no snapped pull from that gesture is kept. Anything slower commits only the cells that had passed the halfway mark. A visible top cloth wins a touch over a tassel. Canvas input is ignored for 350 ms after a level loads or an overlay closes. Double-tap also whips. Keys 1–4 select a cloth, the matching arrow or Space pulls once, W whips, U undoes, R restarts.
- A gesture that finishes during a flip is queued and checked again when it plays. A win or a fail clears the queue, and the move counter cannot go below zero. A drag that starts on empty wood does nothing and does not throw. Selection is cleared after every drag, cancel, and pointercancel.
- The largest search, L8, runs in slices after the table is on screen. L10 is the new 1,308-state board, so its search is a few milliseconds.
- Audio is synthesized, with a mute button. Nothing is fetched.
- Art is a honey-wood table. Four cloth families: tomato check, teal stripe, mustard dots, cream lace. Dishes are round, square, bowl, and cup, and the marks use the same shape.

## Scope

| Item | Status | Note |
| --- | --- | --- |
| M1 Reference lines clear with ★★★ | PASS | All 10 v1.1 lines. L1 and L2 use trusted touch. L1 also at 320, 360 and 430 |
| M2 Engine matches the Python sim | PASS | State count, par, distance, and legal-move sets hash-equal `core2.py` on all 10 v1.1 levels |
| M3 Stuck banner exact, undo only if it still wins | PASS | Distance check over the whole graph. One move is singular. L2's opening whip shows the banner and offers Undo −1 |
| M4 Refused moves are free, undo costs 1, no input after the end | PASS | Win clears a queued drag. A triple tap on Next leaves the next table at 0 moves |
| M5 Flick versus pull misfires | PASS | Trusted CDP touch: 0/100 flicks and 0/100 slow pulls at 390. A 1.2-cell flick is a pure whip |
| M6 Cloths start with at least two visible cells | PASS | Counts match the pack on every level. A visible top cloth wins over a tassel |
| M7 Frame rate and load | PASS | Mean fps 60.0, 60.0, 60.0. Worst 30-frame window 60.0. At 4× CPU: L8 visible 472 ms / solver 522 ms, L9 227 / 27, L10 193 / 14 |
| M8 Lazy play | PASS | L5–L10 random 20.22, 15.8, 1.3, 5.52, 0.76, 0.05. Every greedy variant on those levels is at most 0.09 (L10 two-ply). Whip-first is 0 from L2 |
| M9 L10 strictly hardest | PASS | Par 10 against 8 or less. Random 0.05 against 0.76 or more. Two-ply greedy 0.09 |
| Haptics | DROPPED | Optional. A short vibrate is sent only when the browser provides it |
| Daily table, new pieces | DROPPED | Not in the MVP |
| Restart fly-back | DROPPED | Restart replaces the table at once. The brief's 300 ms fly-back is not animated |

## QA revision 1

Rules of pull and whip are unchanged. The gesture that chooses between them is the v1.1 amendment. L7 and L10 are Game Finder's new boards, not a local retune.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| WA-001 | Release speed over the last 50–100 ms, including pointer-up and coalesced samples | `game.js` releaseSpeed | Trusted CDP touch, 0/100 flick misses and 0/100 pull misses | PASS |
| WA-002 | A whip commits no snapped pulls | `game.js` endDrag, `BRIEF-v1.1.md` | A 1.2-cell flick on L1 leaves the dish on its mark and removes the cloth. A slow drag commits one cell, then two | PASS |
| WA-003 | Ignore the canvas for 350 ms after load or an overlay close | `game.js` quiet | Triple-tapping Next opens L2 with 0 moves | PASS |
| WA-004 | New L7 and L10 from Game Finder | `tests/pack_v1_1.json` | The other eight boards match pack v1. L7 seed 110060, L10 seed 121131 | PASS |
| WA-005 | Worst 30-frame window at least 55 fps | fps test | Worst window 60.0 at 4× CPU | PASS |
| WA-006 | Singular banner | `logic.js` stuckText | "1 move", "4 moves" | PASS |
| WA-007 | A visible top cloth wins over a tassel | `game.js` hitCloth | Tassel hit is only used where no cloth body is | PASS |
| WA-008 | Do not block the first frame on the search | sliced `stepGraph` for L8 | L8 solver 522 ms, L10 solver 14 ms, both boards visible under 1 s at 4× CPU | PASS |

## Design decisions

- The solver is the forward graph from `core2.py`, then distances back from the goals. The JS digest of every state, distance, and legal move matches Python on all 10 levels.
- A flick under half a cell is a pure whip. A longer flick still commits the snapped pulls first, then the whip, as the brief describes.
- Tabs are drawn above the cloths and win the hit test. A grab point for a buried cloth is its tassel.
- Strawberry-red refusal is `#E0524A` from the brief. Cloth red is `#C23B22` so it stays distinct from the wood `#C8955C`.

## Testing

- Install first: `npm install` at the repo root. The browser suite loads Playwright from that install.
- `node --test --test-timeout=180000 whisk-away/tests/logic.test.mjs whisk-away/tests/browser.test.mjs`
- Result: 12 tests, 12 pass, 0 fail.
- FPS: min 60.0 of 60.0, 60.0, 60.0. Scale 1.5, buffer 585. Gate is 50.
- Misfires: 0/100 flicks, 0/100 pulls.
- Not claimed from a device lab. The fps gate is the throttled desktop Chrome run the other games use.
- Repro: open `whisk-away/index.html`. `?level=7` opens The Hand-off.

## Delivery

- URL: https://brerdem.github.io/games/whisk-away/
- Gallery card added. The other games were not edited, apart from the shared gallery, copy list, layout gate, and CI job that publish this one.
- Game Tester: ready for a first pass against section M. The tablecloth fantasy is shared with small physics toys; this one is an untimed layered puzzle. That flag is for Burak.

Screenshots:

- `/opt/cursor/artifacts/whisk-away-390-l1.png`
- `/opt/cursor/artifacts/whisk-away-390-l7.png`
- `/opt/cursor/artifacts/whisk-away-320.png`
- `/opt/cursor/artifacts/whisk-away-desktop-1440.png`
- `/opt/cursor/artifacts/whisk-away-desktop-1920.png`
