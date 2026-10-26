# Whisk Away — build notes

## Concept

- Game ID: GF-20261026-01
- Brief: v1, stored as `BRIEF.md`
- Pull a cloth slowly and everything stacked on it rides one cell. Whip it and the cloth is gone; dishes drop onto the layer below. Clear every cloth and leave each dish on its mark.

## Implementation

- Tech: Canvas 2D. No build step and no physics library. `logic.js` is the rules and the exact solver. `game.js` draws and handles input.
- A slow pull moves the chosen cloth one cell in its fixed direction. Every higher cloth that overlaps the moving set, and every dish standing on those cloths, rides along. A whip removes the cloth. Dishes and higher cloths stay where they are. A cloth cannot pass through a dish on a lower layer, and a whip whose lane to the table edge contains such a dish is refused.
- The 10 levels are the boards in `tests/pack_v1.json`, unchanged. Budget is par + 2. There is no hint and no timer.
- Undo restores the previous position and costs 1. The button reads Undo −1. Restart puts the budget back.
- The stuck banner is exact. It reads "Can't set the table in N moves". Restart is always there. Undo is there only when paying for the undo still leaves a winnable position.
- Stars: par is ★★★, par + 1 is ★★, par + 2 is ★. The last whip that sets the table plays the TA-DA card.
- Controls: drag along the tassel to pull. A flick at 1 px/ms or faster, lasting at most 250 ms, whips. The caption on the finger says Pull or Whip before release. Double-tap also whips. Keys 1–4 select a cloth, the matching arrow or Space pulls once, W whips, U undoes, R restarts.
- A gesture that finishes during a flip is queued and checked again when it plays. A win or a fail clears the queue, and the move counter cannot go below zero. A drag that starts on empty wood does nothing and does not throw. Selection is cleared after every drag, cancel, and pointercancel.
- L8 and L10 build the solver after the table is already on screen, so the first frame is not the search. L10's search measured 708 ms at 4× CPU.
- Audio is synthesized, with a mute button. Nothing is fetched.
- Art is a honey-wood table. Four cloth families: tomato check, teal stripe, mustard dots, cream lace. Dishes are round, square, bowl, and cup, and the marks use the same shape.

## Scope

| Item | Status | Note |
| --- | --- | --- |
| M1 Reference lines clear with ★★★ | PASS | All 10 lines, real pointer events at 390×844. L1 also at 320, 360 and 430 |
| M2 Engine matches the Python sim | PASS | State count, par, distance, and legal-move sets hash-equal `core2.py` on all 10 levels |
| M3 Stuck banner exact, undo only if it still wins | PASS | Distance check over the whole graph. L2's opening whip shows the banner and offers Undo −1 |
| M4 Refused moves are free, undo costs 1, no input after the end | PASS | Win clears a queued drag. Left stays 2 on L1. Undo after two pulls spends one more and steps back |
| M5 Flick versus pull misfires | PASS | 0/100 flicks and 0/100 slow pulls at 390 |
| M6 Cloths start with at least two visible cells | PASS | Counts match the pack on every level |
| M7 Frame rate and load | PASS | FPS min 60.0 of 60.0, 60.0, 60.0. Scale 1.5, buffer 585. L8 visible 439 ms / solver 252 ms, L9 224 / 28, L10 943 / 708, all at 4× CPU |
| M8 Lazy play | PASS | L5–L10 random 20.2, 15.8, 0.2, 5.5, 0.8, 0.0. Greedy 0, 0, 4.2, 0, 0, 0. Whip-first is 0 from L2. Two-ply greedy max 20.8 on L7. Pull-then-whip max 8.3 |
| M9 L10 strictly hardest | PASS | Par 10 against 8 or less. 57,169 states against 19,356 or less. Lazy max 0 against 0.8 or more on L5–L9 |
| Haptics | DROPPED | Optional. A short vibrate is sent only when the browser provides it |
| Daily table, new pieces | DROPPED | Not in the MVP |
| Restart fly-back | DROPPED | Restart replaces the table at once. The brief's 300 ms fly-back is not animated |

## Design decisions

- The solver is the forward graph from `core2.py`, then distances back from the goals. The JS digest of every state, distance, and legal move matches Python on all 10 levels.
- A flick under half a cell is a pure whip. A longer flick still commits the snapped pulls first, then the whip, as the brief describes.
- Tabs are drawn above the cloths and win the hit test. A grab point for a buried cloth is its tassel.
- Strawberry-red refusal is `#E0524A` from the brief. Cloth red is `#C23B22` so it stays distinct from the wood `#C8955C`.

## Testing

- Install first: `npm install` at the repo root. The browser suite loads Playwright from that install.
- `node --test --test-timeout=180000 whisk-away/tests/logic.test.mjs whisk-away/tests/browser.test.mjs`
- Result: 10 tests, 10 pass, 0 fail.
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
