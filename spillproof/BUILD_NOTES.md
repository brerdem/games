# Spillproof — build notes

## Concept

- Game ID: GF-20261020-01
- Brief: v1, 2026-10-20, copied verbatim to `BRIEF.md`
- Summary: A portrait deduction puzzle. Each tank fills from the bottom to one integer waterline. Row and column gauges count water cells, pipes force two tanks to share a waterline, and a duck marks a surface. Every pour is checked. A wrong pour spends one of three drops and frosts that row and everything above it in the tank group.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, system serif, Canvas 2D, synthesised WebAudio. No build step and no network assets. The rules, the T0/T1/T2 solver, the solution counter, and the D1–D7 policies live in `logic.js`.
- Mechanics: tap previews a waterline, tap again pours it. The pour is correct when the solution waterline is at or above that row. Correct water only rises. A wrong pour frosts every cell of that pipe group on that row and above. Dry marks (long-press or the Mark button) are free and are not treated as facts. A satisfied gauge frosts its remaining cells and never fills them. One hint reveals one cell the solver can prove. Three spills fail the level.
- Loop: 12 levels. L1–L6 are Appendix 1. L7–L12 were retuned after QA, and L9 and L12 are new boards from revision 2. Stars: 3 for a clear with no spills and no hint, 2 for at most one spill (a hint is allowed), 1 for any other clear. Progress is `localStorage` key `spillproof-progress-v1` (stars, best time, unlock, mute, reduced motion, spill-free streak).
- Controls: tap to preview, tap again or the Pour button to pour. Long-press (350 ms) or Mark toggles a dry mark. Right-click marks. Arrow keys move a cursor once the keyboard is used; Space or Enter previews then pours; X marks; H hints; R restarts after a confirm; M mutes; Esc opens the menu.
- Animation and visuals: Night Conservatory. Ink navy, frosted glass, 4 px brass seams, teal water with a meniscus, lavender frost stipple, yellow ducks. A piped pour plays Pressure Rush inside 0.9 s without blocking the next tap: the poured tank rises, a glowing line crosses the board, a bead runs the pipe, the linked tank meets the same line, satisfied gauges pop up a pentatonic, and frost sweeps out. A small shake and `navigator.vibrate` when the device allows. Reduced motion shortens that cascade.
- Physics: none. Water is an integer row animated with an ease and a damped slosh.

## Scope

- Done: every rule in section C, all 12 levels, stars, one hint, retry, level select, the save, tutorial bubbles on L1, L4, and L5, synthesised sound, and the solver policies the CI job re-runs.
- Simplified: the hint picks one proven cell in the least-certain group. It prefers a single dry cell, otherwise the lowest proven water cell, so the hint does not always hand over an entire waterline. Pouring a proven water cell still fills every cell below it, because that is what a pour does.
- Deferred: the Sand skin, hint reason text, ambient room tone, the daily puzzle, and the conservatory meta.
- Limitations: an empty tank that does not reach the bottom of the board uses the reference solver's empty value (one row below that tank), not the board height. The player never pours those tanks. Known-dry cells refuse a second pour, so a drop is not spent on a cell the board has already frosted.

## Design decisions

- L1–L6 are the Appendix 1 JSON. L7–L12 were edited in QA so a single line of counting plus guessing cannot farm them, and revision 2 replaced the L9 and L12 copies with new grids.
- A tap on another cell replaces the preview. The brief says a tap outside the current tank cancels it; the new tap is that cancel plus the next preview.
- Level 1 teaches with four short bubbles in sequence: "5 of 5 → all water", "Tap again to pour", "Line done → rest dries", and "Duck = water surface". Section D asks for the duck line and also says three bubbles. The duck is the only place that rule appears, so the fourth line stays.
- Level 2 has no bubble. The hidden-gauge line is on Level 4 and the pipe line is on Level 5.
- The hint button stays in the top HUD, where section G puts it. Pour, Mark, Retry, and Menu are in the bottom bar.
- The keyboard cursor is hidden until a key is pressed, so a phone does not open with a focus box.
- A new visit opens Level 1, as section D asks. Saved stars and the level list live in the menu.

## Testing

| Item | Result | Evidence |
| --- | --- | --- |
| D1 pure guess fails at least 90% | PASS | Seed 2026, 30 runs: L1 27, L2 29, L3–L12 30. `spillproof/tests/logic.test.mjs` |
| D2 count + lowest loses L4–L12 | PASS | Wins L1–L3, loses L4–L12. Same test |
| D3 count + likeliest loses L4–L12 | PASS | Wins L1–L3, loses L4–L12. Same test |
| D4 count + assume full loses L3–L12 | PASS | Wins L1–L2, loses L3–L12. Same test |
| D5 count + random fails at least 60% on L4–L12 | PASS | After v1.1: 25, 22, 26, 29, 29, 29, 29, 28, 30 out of 30 |
| D6 lucky 3★ at most 3% on L4–L12 | PASS | Seed 77, 300 runs. L4–L12 are 3, 2, 3, 0, 1, 0, 0, 0, 0 |
| D7 count + one hint-bit fails at least 60% on L4–L12 | PASS | Revision 2: 27, 21, 19, 25, 30, 28, 30, 30, 29 out of 30 |
| T1 + random guess on L7–L12 | PASS | Seed 20261020, 300 runs. 3★ is 1, 3, 2, 1, 3, 1. Clears are 55, 64, 52, 47, 68, 35. All under 5% and 25% |
| D8 previews match | PASS | Correct and wrong previews share alpha 0.35, the dashed teal line, no sound, and no spill pixels. Puzzle state does not change. `browser.test.mjs` |
| D9 marks leak nothing | PASS | A mark and a long-press leave frost, committed water, and the hint cell unchanged. Logic test checks gauges too |
| D10 retry resets | PASS | Confirm Retry and the fail-screen Retry both restore a fresh board |
| P1 solver, 0 guesses | PASS | T2 wins all 12 with 0 spills and 0 guesses |
| P2 every pipe is necessary | PASS | L5–L6 1/1, L7 1/1, L8–L10 2/2, L11–L12 3/3 |
| P3 unique solution | PASS | Backtracking count is 1 on all 12 |
| P4 tiers | PASS | T0 solves L1. T1 solves L2–L6. L7–L12 need T2 |
| Gauges match the solutions | PASS | Recomputed row and column totals equal every visible clue |
| Pour, frost, auto-dry, stars | PASS | Wrong frost is only that group at or above the row. The third spill fails. Solution pours clear with 3★. A satisfied line frosts and does not fill |
| Hint is one proven cell and costs no drop | PASS | Fresh hint on all 12 levels. A second hint does nothing |
| Cells at least 44 px at 390 and at 375, 42 px at 360 | PASS | Level 12 is 44 px at 390×844 and at 375×667. At 360×800 the cells are 42 px. 8×44 is 352, and the leftover width cannot hold a readable gauge |
| Linked waterlines stay equal | PASS | Level 5 pipe pour: both tanks share one committed row and the same drawn line after the rush |
| Win and fail by touch | PASS | Double-taps clear Level 1 with ★★★. Three wrong pours open Spilled. Fail Retry resets |
| Progress survives reload | PASS | The Level 1 star is still 3 after reload |
| No network, file:// | PASS | `file:// play has no http requests` |
| 50 fps at 4× throttle during a solve | PASS | 390×844, deviceScaleFactor 2, backing store capped at 1.5× (585×1266). Three tapped solves of the v1.1 finale: minimum 59.6 fps |
| Portrait frame | PASS | Shared layout check: 1440×900 and 1920×1080 letterbox at 9:19.5, phones fill 360×800, 390×844, and 430×932, canvas scale is uniform |
| H1–H5 enjoyment | DROPPED | Section M3 is for Game Tester. This build does not claim them |
| Sand skin, hint reasons, daily, meta | DROPPED | Optional or post-MVP in sections I and K |

Unverified: haptic tick on a real phone, and whether the pipe moment is what players talk about. Both need a device and Game Tester.

Repro: `node --test --test-timeout=180000 spillproof/tests/logic.test.mjs spillproof/tests/browser.test.mjs`

## QA revision 1

R0 was REVISE at 68/100 (`QA_REPORT.md`). Originality (SP-011) was not changed.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| SP-002 | Board input is ignored for 340 ms after an overlay closes, and a pointer that moved or started during the lock does nothing | `game.js` hide() and the pointer handlers | Triple taps on Retry, Next, Resume, and confirm-Yes at 390×844 and 1280×800 leave spills at 0. A phone landscape tap does not pour | PASS |
| SP-003 | The tutorial sits in the gap under the board, or in the top band, and it does not receive taps | `index.html`, `game.js` placeTutorial | 17 viewports × L1, L4, L5: 0 cells under the bubble | PASS |
| SP-001 | L7–L12 were retuned so single-line arc consistency plus guessing no longer farms stars. See the level list below | `logic.js` levels, `singleLine` in the logic test | T1+rand, seed 20261020, 300 runs. Clears ≤25% and 3★ ≤5% on every L7–L12 level. P1–P4 and D1–D10 still pass | PASS |
| SP-004 | Phones in landscape (height ≤520) show only a rotate-to-portrait card. The board is not drawn at 19 px | `index.html` `#rotate`, `game.js` | Visible at 844×390, 932×430, 740×360, and 667×375 | PASS |
| SP-005 | A move past 10 px, pointerleave, or pointercancel cancels the hold | `game.js` pointer handlers | Drag-off and a dispatched pointercancel leave marks empty | PASS |
| SP-006 | The win panel focuses Next, or Retry when Next is disabled. Enter activates it | `game.js` showWin and the key handler | Enter after a clear opens level 2 | PASS |
| SP-007 | Static glass, seams, and pipes are cached. Frost is a repeated tile. The device pixel ratio is capped at 1.5. The frame test pours during the second | `game.js`, browser test | 55.4 fps at 390×844, deviceScaleFactor 2, 4× CPU, while pouring Level 12 | PASS |
| SP-008 | Cells go to 44 px from 372 px of width upward, which includes 375 | `game.js` measure | 44 px at 375×667. 360×800 stays 42 px because 8×44 plus a readable gauge does not fit | PASS |
| SP-009 | AudioContext is created on the first pointer or key, not on load | `game.js` unlockAudio | No AudioContext and no autoplay console line before a gesture | PASS |
| SP-010 | Sheets scroll, and the help text ends in `#help-end` | `index.html` | The last help line is inside the sheet after scrolling at 360×800 and 740×360 | PASS |
| SP-011 | No build change | — | Originality is for Game Finder | DROPPED |

### Levels changed

L1–L6 are still Appendix 1. L7–L12 keep a tier-2 what-if solve, the same pipe counts, and the same titles. Hidden gauges went up so a single line of counting gives less away. The table is the revision 1 measurement. Revision 2 replaced the L9 and L12 mirror boards; their shipping numbers are in the revision 2 section.

| Level | What changed | 3★ | Clears |
| --- | --- | --- | --- |
| 7 Short Fuse | Same tanks and the O–D pipe. New waterlines. Hidden gauges 3 → 5 | 1/300 | 55/300 |
| 8 Twin Pipes | Same tanks and both pipes. New waterlines. Hidden gauges 3 → 4 | 3/300 | 64/300 |
| 9 Cross Current | The original grid could not be pushed under a 25% clear rate (best found about 35%). This level is now the horizontal mirror of the retuned Twin Pipes board, so gravity still applies and the shape is flipped. Two pipes. Hidden gauges 4 | 1/300 | 50/300 |
| 10 Deep Cistern | Same tanks and both pipes. New waterlines. Hidden gauges 4 → 5 | 1/300 | 47/300 |
| 11 Three Siphons | Same tanks and all three pipes. New waterlines. Hidden gauges 4 → 7 | 2/300 | 61/300 |
| 12 Grand Cistern | Same situation as level 9. This is the horizontal mirror of the retuned Three Siphons board. Three pipes. Hidden gauges 7 | 1/300 | 35/300 |

Counting players still lose from L4. Those D5–D7 lines are the revision 1 figures. Revision 2 measured them again; see the acceptance table.

## QA revision 2

R1 was REVISE at 73/100 (`QA_REPORT.md`). R0 is `QA_REPORT_R0.md`. SP-011 was left alone.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| SP-012 | L9 and L12 are new boards. Neither grid matches another level under rotation or reflection. Both stay uniquely solvable with no guesses, and every pipe is necessary | `logic.js`, logic test | L9 Cross Current: what-if depth 1, T1+rand seed 20261020, 2/300 three-star (0.7%), 52/300 clears (17.3%). L12 Grand Cistern: what-if depth 2, 3/300 three-star (1.0%), 53/300 clears (17.7%) | PASS |
| SP-007 | The frame test taps every solution cell of L12. Static glass, seams, and pipes stay cached, and a frame repaints only the cells that changed. The canvas buffer uses the device pixel ratio | `game.js`, browser test | 390×844, deviceScaleFactor 2, buffer 780×1688, 4× CPU, real taps. CI samples 57.8 fps (p95 16.7 ms) and 58.8 fps (p95 16.8 ms) | PASS |
| SP-008 | No layout change. 44 px cells from 372 px of width upward | `game.js` measure | 44 px at 375 and 390. 42 px at 360×800, because 8×44 plus a gauge digit does not fit | PASS |

L9 and L12 keep their titles, sizes, and pipe counts. The tank shapes are new: boundary cells were moved, clues were recomputed from the solution, and the hidden-gauge mask was kept. A logic test rejects any level that matches another under the eight rotations and reflections. L12 needs two what-if passes in `grade()`. Several thousand boundary edits of that board did not produce a third pass that still solved cleanly, so the finale stays at two, which is the bar this cycle set. L1–L8, L10, and L11 were not redrawn.

## Perf fix after revision 2

R2 (`QA_REPORT.md`, commit `3937ac5`) measured 32.8, 35.8 and 36.4 fps on a tapped Level 12 solve at 390×844, DPR 2, 4× CPU. The R1 build on that same box, with the backing store capped at 1.5×, was 44.1 fps. Levels, rules, and layout are unchanged. SP-008 and SP-013 were left alone.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| SP-007 | The canvas buffer scale is `min(devicePixelRatio, 1.5)` on both axes, so the picture stays sharp and is not stretched. Idle frames do not repaint. A pour repaints only the dirty rows, from the cached glass and seam layers, with no per-frame gradient. The frame test is three real tapped solves, including the preview ghost and the pour animation, and it fails if the slowest run is under 50 fps | `game.js` measure and draw, `browser.test.mjs` | Local minimum of three runs: 59.9 fps. Buffer 585×1266 at 390×844 when the device pixel ratio is 2 | PASS |

## Brief v1.1

Burak approved `BRIEF-v1.1.md`. Rules, UI, and levels 1–10 are unchanged. The generator did not produce an 8×8 finale with 3 what-if rounds and a raw search space above Level 11: about 184,000 random boards with 3 pipes never reached 2 rounds, and about 19,000 of those already had a larger search space than Level 11 but only 27 were tier 2, none with 3 rounds. Nudging Level 11’s tanks (4,200 shapes, 321 still tier 2) also stayed at 2 rounds.

The fallback is a swap of the Level 11 and Level 12 puzzles. Titles stay in place. Grand Cistern is now the former Three Siphons board.

| Measure | L7 | L10 | L11 (old L12) | L12 (old L11) | Finale is hardest? |
| --- | --- | --- | --- | --- | --- |
| What-if rounds | 3 | 2 | 2 | 2 | No. Level 7 still needs 3. Level 12 ties Level 10 and Level 11 |
| Raw search space | 15.1M | 93.3M | 74.6M | 149.3M | Yes. 149,299,200 is the largest |
| Easy openings | — | in the tester’s 9–15 band | the old finale, 16 | in the tester’s 9–15 band | Yes versus the old finale, which had the most easy openings (16). Not claimed as the unique minimum of the ladder |

Two of the three measures hold for the swap: search space, and openings against the defect the tester filed. Depth does not, because Level 7 already needs three rounds and no generated board beat that inside the budget.

Single-line plus guessing, seed 20261020, 300 runs: Level 11 is 3/300 three-star and 68/300 clears. Level 12 is 1/300 three-star and 35/300 clears. Both are under 5% and 25%. Each still has one solution, a zero-guess T2 solve, and 3/3 necessary pipes. No level matches another under rotation or reflection.

## Delivery

- URL: https://brerdem.github.io/games/spillproof/
- Commit: perf fix on `main` after QA revision 2
- Build: GitHub Actions workflow `ci`, job `spillproof`
- Game Tester: SP-007 only. Levels and the 42 px cells at 360 are unchanged. SP-011 and SP-013 were left alone.
