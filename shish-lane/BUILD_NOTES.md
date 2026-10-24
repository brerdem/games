# Shish Lane — build notes

## Concept

- Game ID: GF-20261024-01
- Brief: v1, stored as `BRIEF.md`
- A skewer enters from an edge and spears the first four foods in that lane. The sequence has to match an open ticket, read either way. Coal and slabs stop a thrust. The budget is tickets + 2, and undo costs the skewer it gives back.

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
| M3 Undo costs 1, restart restores the budget | PASS | Fatal L2 `L0`, then Undo, then Restart |
| M4 Stuck banner matches the solver | PASS | Every opening and every legal branch along each reference line. Banner text is "No remaining sequence can serve every ticket." |
| M5 Coal and slab stops | PASS | L8 `L0` stops on coal with `AB`. L8 `T2` stops on coal with nothing. L7 `L1` spears the slab. L7 `T1` stops in front of it |
| M6 44 px lane ends, no thrust under 12 px | PASS | 360×800, 390×844, 430×932. L11 cell is 50 px at 390. An 8 px drag spends nothing |
| M7 60 fps and commit ≤ 350 ms | PASS | Local min 60.0 of 60.0, 60.0, 60.0 at 390×844, DPR cap 1.5, buffer 585, 4× CPU. Commit duration is capped at 340 ms |
| M8 Pack is exact and non-isomorphic | PASS | Boards and tickets match `pack_final_11.json`. 11 distinct mirror / 180° / letter-permutation keys |
| Fidelity, 400 cases | PASS | 1,321 distinct legal thrusts, 0 mismatches, solver agrees |
| Swipe misfires | PASS | 0 / 100 on L11 at 390×844, with 3 px of perpendicular wobble |
| Lazy play from L7 | PASS | Sandbox seed 11, N=300. Lazy max 25.3, 13.0, 14.0, 15.3, 8.3%. Every non-random policy ≤ 30%. RAND+probe 15.3, 7.0, 8.0, 6.3, 1.3% (≤ 16%) |
| L11 is strictly hardest | PASS | On state count (549), fatal share (0.442), lazy max, and RAND+probe |
| Portrait frame and DPR cap | PASS | 1440×900 stage 416×900. 1920×1080 stage 499×1080. Buffer scale 1.5 under DPR 2 |
| Hint | DROPPED | The brief forbids a hint in the MVP |
| Level 12, daily grill, new pieces | DROPPED | Not in this pack, and not authorised |

## Design decisions

- The opening ghost sits on `T0`, the first thrust of the reference line. That thrust spears BAA, which is the open ticket AAB read the other way. The brief's sketch said the left edge of row 2; that lane is ABBB and matches no ticket, so a ghost there would teach a free miss.
- The grill bed is `#1A1412` so tomato `#E8483B` is 4.7:1 against it. `#E8483B` on the brief's `#2B2522` measures 3.9:1. The surround stays `#2B2522`.
- Foods are drawn shapes: round tomato, square pepper, triangle onion. A slab is a wide bar with ⟷. Coal is a dark tile with ember dots.
- The 80 ms food stagger is compressed so the whole commit stays inside 340 ms on a long lane. The pin still eases out and the foods still arrive one after another.
- Stars are undos: 0 → ★★★, 1 → ★★, 2 → ★. An empty budget is the fail card, not the stuck banner, because undo cannot be paid.

## Testing

- `node --test --test-timeout=180000 shish-lane/tests/logic.test.mjs shish-lane/tests/browser.test.mjs`
- Result: 15 tests, 15 pass, 0 fail.
- FPS: min 60.0 of 60.0, 60.0, 60.0. Scale 1.5, buffer 585.
- Misfires: 0 / 100.
- Not claimed from a device lab. The fps gate is the throttled desktop Chrome run the other games use.
- Repro: open `shish-lane/index.html`. `?level=7` opens Slabs. Swipe inward from an edge past 40% of a cell.

## Delivery

- URL: https://brerdem.github.io/games/shish-lane/
- Gallery card added. Knock-On and the other games were not edited.
- Game Tester: ready for a first pass against section M. The pierce-an-order fantasy is shared with other skewer games; the lane, cap, coal, slab, and budget rules are the brief's. That flag is for Burak.

Screenshots:

- `/opt/cursor/artifacts/shish-lane-desktop-1440.png`
- `/opt/cursor/artifacts/shish-lane-desktop-1920.png`
- `/opt/cursor/artifacts/shish-lane-390.png`
