# Spillproof — build notes

## Concept

- Game ID: GF-20261020-01
- Brief: v1, 2026-10-20, copied verbatim to `BRIEF.md`
- Summary: A portrait deduction puzzle. Each tank fills from the bottom to one integer waterline. Row and column gauges count water cells, pipes force two tanks to share a waterline, and a duck marks a surface. Every pour is checked. A wrong pour spends one of three drops and frosts that row and everything above it in the tank group.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, system serif, Canvas 2D, synthesised WebAudio. No build step and no network assets. The rules, the T0/T1/T2 solver, the solution counter, and the D1–D7 policies live in `logic.js`.
- Mechanics: tap previews a waterline, tap again pours it. The pour is correct when the solution waterline is at or above that row. Correct water only rises. A wrong pour frosts every cell of that pipe group on that row and above. Dry marks (long-press or the Mark button) are free and are not treated as facts. A satisfied gauge frosts its remaining cells and never fills them. One hint reveals one cell the solver can prove. Three spills fail the level.
- Loop: the 12 Appendix 1 levels, unchanged. Stars: 3 for a clear with no spills and no hint, 2 for at most one spill (a hint is allowed), 1 for any other clear. Progress is `localStorage` key `spillproof-progress-v1` (stars, best time, unlock, mute, reduced motion, spill-free streak).
- Controls: tap to preview, tap again or the Pour button to pour. Long-press (350 ms) or Mark toggles a dry mark. Right-click marks. Arrow keys move a cursor once the keyboard is used; Space or Enter previews then pours; X marks; H hints; R restarts after a confirm; M mutes; Esc opens the menu.
- Animation and visuals: Night Conservatory. Ink navy, frosted glass, 4 px brass seams, teal water with a meniscus, lavender frost stipple, yellow ducks. A piped pour plays Pressure Rush inside 0.9 s without blocking the next tap: the poured tank rises, a glowing line crosses the board, a bead runs the pipe, the linked tank meets the same line, satisfied gauges pop up a pentatonic, and frost sweeps out. A small shake and `navigator.vibrate` when the device allows. Reduced motion shortens that cascade.
- Physics: none. Water is an integer row animated with an ease and a damped slosh.

## Scope

- Done: every rule in section C, all 12 levels, stars, one hint, retry, level select, the save, tutorial bubbles on L1, L4, and L5, synthesised sound, and the solver policies the CI job re-runs.
- Simplified: the hint picks one proven cell in the least-certain group. It prefers a single dry cell, otherwise the lowest proven water cell, so the hint does not always hand over an entire waterline. Pouring a proven water cell still fills every cell below it, because that is what a pour does.
- Deferred: the Sand skin, hint reason text, ambient room tone, the daily puzzle, and the conservatory meta.
- Limitations: an empty tank that does not reach the bottom of the board uses the reference solver's empty value (one row below that tank), not the board height. The player never pours those tanks. Known-dry cells refuse a second pour, so a drop is not spent on a cell the board has already frosted.

## Design decisions

- The 12 levels are the Appendix 1 JSON, unmodified. The acceptance run reproduced the sandbox counts, so nothing in the ladder was edited.
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
| D5 count + random fails at least 60% on L4–L12 | PASS | 25, 22, 26, 25, 29, 26, 30, 28, 29 out of 30 |
| D6 lucky 3★ at most 3% on L4–L12 | PASS | Seed 77, 300 runs: 3, 2, 3, 1, 1, 4, 1, 0, 0. Max 4/300 |
| D7 count + one hint-bit fails at least 60% on L4–L12 | PASS | 27, 21, 19, 24, 25, 25, 28, 29, 26 out of 30 |
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
| Cells at least 44 px at 390, 42 px at 360 | PASS | Level 12 measures 44 px at 390×844 and 42 px at 360×800. Buttons are at least 48 px |
| Linked waterlines stay equal | PASS | Level 5 pipe pour: both tanks share one committed row and the same drawn line after the rush |
| Win and fail by touch | PASS | Double-taps clear Level 1 with ★★★. Three wrong pours open Spilled. Fail Retry resets |
| Progress survives reload | PASS | The Level 1 star is still 3 after reload |
| No network, file:// | PASS | `file:// play has no http requests` |
| 50 fps at 4× throttle | PASS | Level 12, `Emulation.setCPUThrottlingRate` 4, rAF over 1 s: 60.7 fps |
| Portrait frame | PASS | Shared layout check: 1440×900 and 1920×1080 letterbox at 9:19.5, phones fill 360×800, 390×844, and 430×932, canvas scale is uniform |
| H1–H5 enjoyment | DROPPED | Section M3 is for Game Tester. This build does not claim them |
| Sand skin, hint reasons, daily, meta | DROPPED | Optional or post-MVP in sections I and K |

Unverified: haptic tick on a real phone, and whether the pipe moment is what players talk about. Both need a device and Game Tester.

Repro: `node --test --test-timeout=180000 spillproof/tests/logic.test.mjs spillproof/tests/browser.test.mjs`

## Delivery

- URL: https://brerdem.github.io/games/spillproof/
- Commit: the revision that adds `spillproof/` on `main`
- Build: GitHub Actions workflow `ci`, job `spillproof`, plus the existing Pages workflow
- Game Tester: ready for a first pass. The levels were not edited. Please judge H1–H5, especially whether spills on L4+ feel like the player's own guess and whether Pressure Rush is the moment people name.
