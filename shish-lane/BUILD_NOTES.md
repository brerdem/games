# Shish Lane — build notes

## Concept

- Game ID: GF-20261024-01
- Brief: v1, stored as `BRIEF.md`
- A skewer enters from an edge and spears the first four foods in that lane. The sequence has to match an open ticket, read either way. Coal and slabs stop a thrust. The budget is tickets + 2. A serve spends one skewer. Undo puts the food and the ticket back and does not refund that skewer, and it does not charge a second one.

## Implementation

- Tech: Canvas 2D and DOM chrome. No build step, no physics library. `logic.js` is the rules; `game.js` draws and handles input.
- Rules are the sandbox in `tests/sandbox_lib.py` / `logic.js`: cap 4, empty cells skipped, `#` stops every thrust, a lowercase slab is speared only by a row thrust, and a column thrust stops in front of it. A thrust that matches no open ticket is not applied.
- Loop: swipe inward from a lane end, preview the foods on the pin, release past 40% of a cell to commit. A miss slides back. Serving every ticket wins. An empty budget fails. The stuck banner uses the exact solver.
- Levels: the 11 boards in `tests/pack_final_11.json`, unchanged. No hint.
- Controls: edge swipe or click-drag. Arrow keys and WASD select a lane, Enter thrusts. Undo, Restart, and the grill menu are on screen.
- Animation: the pin eases along the lane, foods stick to it, and a matched kebab flies to its ticket. Commit lock is at most 340 ms. Coal and a blocking slab recoil the tip 4 px. A four-food kebab glints. Restart fades in about 160 ms.
- Audio: short synthesized pierce, serve, mismatch, and stuck tones, with a mute button. Nothing is fetched.

## Scope

| Item | Status | Note |
| --- | --- | --- |
| M1 Reference lines clear with ★★★ | PASS | All 11 lines, 0 undos, 2 skewers left |
| M2 Mismatch costs nothing | PASS | L2 `L2` (AAAB) leaves board, tickets, and skewers unchanged |
| M3 Undo costs 1 net, restart restores the budget | PASS | A serve spends 1. Undo restores the board and the ticket and leaves that skewer spent. Two undos, then the L1 line, earns ★. Restart restores the full budget |
| M4 Stuck banner matches the solver | PASS | "No remaining sequence can serve every ticket." only when the solver says unsolvable. A solvable board with too few skewers says "Not enough skewers to serve the remaining tickets." The banner Undo is disabled when the stack is empty |
| M5 Coal and slab stops | PASS | L8 `L0` stops on coal with `AB`. L8 `T2` stops on coal with nothing. L7 `L1` spears the slab. L7 `T1` stops in front of it |
| M6 44 px lane ends, no thrust under 12 px | PASS | 360×800, 390×844, 430×932. L11 cell is 50 px at 390. An 8 px drag spends nothing |
| M7 60 fps and commit ≤ 350 ms | PASS | Local min 60.0 of 60.0, 60.0, 60.0 at 390×844, DPR cap 1.5, buffer 585, 4× CPU. Commit duration is capped at 340 ms |
| M8 Pack is exact and non-isomorphic | PASS | Boards and tickets match `pack_final_11.json`. 11 distinct mirror / 180° / letter-permutation keys |
| Fidelity, 400 cases | PASS | 1,321 distinct legal thrusts, 0 mismatches, solver agrees |
| Swipe misfires | PASS | 0 / 100 on L11 at 390×844, with 3 px of perpendicular wobble |
| Lazy play from L7 | PASS | v1.1 exact odds, 1-net undo. L7 RAND+probe 9.3%, lazy max 21.3% (MINDIS+probe). L8–L11 lazy max 14.3, 13.8, 16.7, 8.2%. All ≤ 30%. RAND+probe ≤ 16% |
| L11 is strictly hardest | PASS | On state count (549), fatal share (0.442), lazy max, and RAND+probe |
| Portrait frame and DPR cap | PASS | 1440×900 stage 416×900. 1920×1080 stage 499×1080. Buffer scale 1.5 under DPR 2 |
| Hint | DROPPED | The brief forbids a hint in the MVP |
| Level 12, daily grill, new pieces | DROPPED | Not in this pack, and not authorised |

## Design decisions

- The opening ghost sits on `T0`, the first thrust of the reference line. That thrust spears BAA, which is the open ticket AAB read the other way. The brief's sketch said the left edge of row 2; that lane is ABBB and matches no ticket, so a ghost there would teach a free miss.
- The grill bed is `#1A1412` so tomato `#E8483B` is 4.7:1 against it. `#E8483B` on the brief's `#2B2522` measures 3.9:1. The surround stays `#2B2522`.
- Foods are drawn shapes: round tomato, square pepper, triangle onion. A slab is a wide bar with ⟷. Coal is a dark tile with ember dots.
- The 80 ms food stagger is compressed so the whole commit stays inside 340 ms on a long lane. The pin still eases out and the foods still arrive one after another.
- Stars are undos: 0 → ★★★, 1 → ★★, 2 → ★. Two undos use the two spare skewers and a clear is still possible, so ★ can be earned. Undo does not spend a second skewer. The button is labelled −1 with a skewer mark, and the spent pip flashes, so the cost that was paid on the serve stays visible.

## QA revision 1

Held for Game Finder. Not pushed. L7 is unchanged.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| SL-001 | An undo costs exactly 1 skewer net. The serve's skewer stays spent, and undo does not charge another | `game.js` undo. Button label is Undo | Serve, undo, serve, undo, then the L1 line. Skewers after the first undo are budget − 1. The clear is ★ | PASS |
| SL-002 | Replace L7 only. 5×5, 1 coal, 2 slabs, tickets ABA ACA ACB BCB CABC CACC CBCC, budget 9 | `logic.js` L7, `BRIEF-v1.1.md`, `tests/pack_v1_1.json` | The reference line clears with ★★★. Exact RAND+probe 9.3%, lazy max 21.3%. L1–L6 and L8–L11 boards unchanged. L11 stays hardest on states, lazy max and RAND+probe | PASS |
| SL-003 | The unsolvable sentence is only for an unsolvable board. A short budget uses other copy. Undo on that card is disabled when the stack is empty | `logic.js` stuckReason, `game.js` showStuck | Three serve-and-undo cycles on L1 show the short-budget sentence and a disabled Undo | PASS |
| SL-004 | pointercancel cancels the drag and does not commit | `game.js` cancelDrag | A touchCancel after a full inward drag leaves L1 unmoved | PASS |
| SL-005 | Browser tests load Playwright from the repo package, and the page URL does not depend on the working directory | `tests/browser.test.mjs` | The suite passes when started from `/tmp` | PASS |
| SL-006 | Top lane zones sit below the ticket rail | `game.js` fit | At 320×568, no T zone intersects the rail on L1–L11 | PASS |

## QA revision 2

No rule changes and no level changes. The 1-net undo rule is unchanged: a serve spends the skewer, and undo does not spend another.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| Visuals | Clearer food, a steel skewer with a wooden handle, larger ticket glyphs, a serve stamp, a pierce burst, and a sweep when a longer lane opens | `game.js` drawing, `index.html` tickets | 19/19 still pass. FPS min 59.6 at 390×844, DPR cap 1.5, buffer 585, 4× CPU | PASS |
| Undo label | The button shows −1 and a skewer mark. The spent pip flashes. The skewer count does not drop again | `index.html`, `game.js` flashSpentPip | Two undos still leave budget − 2 and a ★ clear. The button text contains −1 | PASS |
| SL-007 | Keep the Out of skewers card | No behaviour change | Documented. Under skewers − tickets = 2 − undos, the short-budget banner appears while skewers are still above 0 and then blocks play, so the fail card is not reached. It stays as a safeguard if a later change spends the last skewer with tickets open | PASS |
| SL-009 | 44 px lane zones at 320×568 for L8–L11 | Compact ticket row below 360 px wide | L8 and L10 are 44 px. L9 and L11 stay 38 px. A 6-column board at 44 px is 264 px, and the two 44 px side gutters need 88 px more, which is 352 px and does not fit a 320 px screen. At 390, L11 stays 50 px | PASS |
| Tests | Browser tests need the repo install | Note only | `npm install` provides Playwright. Without `node_modules` the browser file cannot resolve it | PASS |

## QA revision 3

SL-010 only. No rule, level, or other visual changes. Tall screens keep the larger ticket glyphs. When the viewport is 700 px tall or shorter, the rail uses 13 px glyphs and a shorter ticket so the board is not pushed down.

Cell size is the board square in CSS pixels. R1 is commit 43d527e. R3 is this pass. Every R3 cell is at least the R1 cell.

| Viewport | R1 L1–L11 | R3 L1–L11 |
| --- | --- | --- |
| 320×568 | 58, 58, 46, 46, 46, 46, 46, 38, 38, 38, 38 | 58, 58, 46, 58, 46, 46, 46, 45, 38, 45, 38 |
| 360×640 | 68, 68, 54, 68, 54, 54, 54, 50, 45, 50, 45 | 68, 68, 54, 68, 54, 54, 54, 54, 45, 54, 45 |
| 360×800 | 68, 68, 54, 68, 54, 54, 54, 54, 45, 54, 45 | 68, 68, 54, 68, 54, 54, 54, 54, 45, 54, 45 |
| 390×844 | 75, 75, 60, 75, 60, 60, 60, 60, 50, 60, 50 | 75, 75, 60, 75, 60, 60, 60, 60, 50, 60, 50 |
| 430×932 | 85, 85, 68, 85, 68, 68, 68, 68, 57, 68, 57 | 85, 85, 68, 85, 68, 68, 68, 68, 57, 68, 57 |

At 360×640, L9 is 45 px again, with the ten orders still in two rows of coloured glyphs and letters. At 320×568, L9 and L11 stay 38 px, which is the width limit of six columns inside two 44 px side gutters, and matches R1. 360×800 and the taller phones keep the R2 rail.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| SL-010 | Compact the ticket rail when the screen is short, so the board cells recover | `index.html` ticket rules under 700 px of height | The table above. L9 at 360×640 is 45 px. Tickets still show a glyph and the order letters | PASS |

## Testing

- Install first: `npm install` at the repo root. The browser suite loads Playwright from that install.
- `node --test --test-timeout=180000 shish-lane/tests/logic.test.mjs shish-lane/tests/browser.test.mjs`
- Result: 19 tests, 19 pass, 0 fail. Fidelity: 400 cases, 1,321 legal thrusts, 0 mismatches.
- FPS: min 59.6 of 59.6, 60.0, 60.0. Scale 1.5, buffer 585. Gate is 50.
- Misfires: 0 / 100.
- Not claimed from a device lab. The fps gate is the throttled desktop Chrome run the other games use.
- Repro: open `shish-lane/index.html`. `?level=7` opens Slabs. Swipe inward from an edge past 40% of a cell.

## Delivery

- URL: https://brerdem.github.io/games/shish-lane/
- Gallery card added. Knock-On and the other games were not edited.
- Game Tester: ready for a first pass against section M. The pierce-an-order fantasy is shared with other skewer games; the lane, cap, coal, slab, and budget rules are the brief's. That flag is for Burak.

Screenshots:

- `/opt/cursor/artifacts/shish-lane-390-l1.png`
- `/opt/cursor/artifacts/shish-lane-390-l11.png`
- `/opt/cursor/artifacts/shish-lane-390-serve.png`
- `/opt/cursor/artifacts/shish-lane-desktop-1440.png`
- `/opt/cursor/artifacts/shish-lane-desktop-1920.png`
