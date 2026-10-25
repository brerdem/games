# Turnover — QA Report R0
Commit `3f184a02fcfaf3174e52b7fe5e5a029f81e7d159` (main, brerdem/games) · live https://brerdem.github.io/games/turnover/ · Tester: Grok Bot (Game Tester) · 2026-10-25 08:35 (UTC+3)
All results come from headless Chrome on the box, using CDP touch drags and the `__turn` hook, plus my own engine (`tools/turnover/teng.mjs`). Everything is a **SIMULATION**: no human testers and no real devices were used. Raw data is in `data/` and screenshots are in `shots/`.

## A. Verdict
**71/100: REVISE.** It misses the 80 bar, and there is one critical defect: P1 TO-001, where input queueing breaks the plate-capacity rule. The puzzle core checks out exactly (pars, solutions, fidelity, banner).

| Category | Score | Gate |
|---|---|---|
| Core | 15/20 | ≥14 ✓ |
| Feel | 14/20 | ≥14 ✓ (borderline) |
| Hook | 10/15 | ≥10 ✓ (borderline) |
| Progression | 11/15 | – |
| Visuals | 7/10 | – |
| Mobile | 8/10 | ≥7 ✓ |
| Originality | 6/10 | ≥6 ✓ (provisional, needs human review) |
| **Total** | **71** | needs 80 ✗, and no critical defects ✗ |

## B. Build verification
The live game.js, index.html and logic.js are byte-identical to the commit (sha256 prefixes 994f233b67d3 / 1e8e68ff9a40 / 915e2638e0c9). Builder tests: **14/14 pass** (`data/o_builder_tests.txt`). Console errors: 0 in every run.

## C. Rules, levels, fidelity (exact)
- I computed par, the number of states within 6 flips, the number of optimal lines, the openings that keep par and the fatal openings for L1–L10 independently. All match the brief (`data/base.json`). All 10 reference lines solve at ★★★ through real touch drags at 320, 360, 390 and 430 px (`data/m1_reference_drags.json`).
- Engine fidelity, logic.js vs my engine: every reachable state was checked for every sided config (2,938,704 states and 46.8M moves in the largest). **0 mismatches** in legal moves, apply or isGoal. L5 uses `sided='all'` where the brief says 'A,B'. This is equivalent because L5 has no C.
- Stuck banner vs exact distance:
  - Exhaustive on L1–L5: 280 / 420 / 2160 / 3240 / 25296 states.
  - 400 sampled boundary states on L6–L10.
  - **507 in-browser spot checks** on L7–L10 after real drags, 128 of them stuck.
  - **0 wrong** across all of these.

## D. Feel and input (390 unless stated)
- **Misfires, 100 drags per cell, random legal move at depth 1–3, L9/L10, 3 px wobble:**
  - Touch in the central 70% of the pancake: **0/100 at 360, 390 and 430**.
  - Touch anywhere in the pancake box (stress test): 6 and 2 (two runs at 360), 3 at 390, 1 at 430. Every one of these was a touch in the top ~6 px of a pancake, which committed one fewer pancake (the one above wins the overlap).
- **Queueing:** a second drag at +0, 100, 200 or 300 ms into a flip was queued and played, 4/4. A drag is never silently dropped, except in TO-001 case b.
- **Gestures:**
  - These commit nothing: an 8 px drag, a drop back on the same plate, a drop in the gap, a drop on a full plate, a drag of the 4th pancake, touchcancel over a valid target, a drag starting on empty counter, and a two-finger touch.
  - These do commit, because the target plate is chosen by x position only: a release over the HUD or over the bottom bar in the target column, and a diagonal drag. This is acceptable.
  - **Tap-pancake then tap-plate does nothing.** It is only implemented for the keyboard (see TO-005).
- **Overlays:**
  - Triple tap on win-Next advances exactly 1 level.
  - Triple tap on lesson-OK dismisses it and the state is unchanged.
  - Triple tap on stuck-Undo performs exactly 1 undo.
  - Double tap on fail-Restart gives one clean restart.
- **Rotate and resize:** in landscape (844×390) the rotate overlay appears and drags are ignored. Going back to portrait and resizing to 360×640 keeps the state, and drags work afterwards.
- **fps, my measurement (390, DPR 2, CPU 4×, 3 L10 solves):**
  - Mean 58.3 / 58.5 / 58.4. Worst 30-frame window 40.9 / 41.9 / 40.9.
  - One long frame of 233–250 ms per run, right at the first flip (probe: frame indexes 1 and 28; up to 316 ms).
  - The builder's test in my run gave 58.1 / 60 / 60.

## E. Mobile and layout
- 19 sizes, 320×568 to 480×1000, all 10 levels, 4-high stack boxes: nothing off-screen, nothing under the HUD or bar, no scroll (`data/misc_sizes_offline.json`).
- Cell size 54 px (44 px at 320). Plate width 106 / 116 / 130 / 93 px on 3-plate levels and 80 / 87 / 97 / 70 px on 4-plate levels (360 / 390 / 430 / 320).
- file:// with the network offline: it loads, L1 is won (moves via hook), 0 non-file requests.
- The top ~45% of the screen is empty counter at 390×844.

## F. Issues
| ID | Pri | Owner | Issue / evidence |
|---|---|---|---|
| TO-001 | **P1** | MVP Builder | **Queued moves are not re-validated against the state they actually run on** (`beginFlip` has no legality check).<br>(a) L1, three fast drags inside one flip, 2→1 (1 pancake), then 2→3 (0)… exact seq [2,1,1], [2,3,0], [1,2,0], each legal when the drag was made. Result: a plate holding **6 pancakes** `[[0,0,0,2,2,2],[],[]]` and a stuck banner. Reproduced 3/3, and also with keys `3 q 2 3 e 1 2 w 1`. Shot `q2_overcap_390.png`.<br>(b) Seq [2,1,1], [1,2,0], [1,2,2]: the 3rd move was silently dropped (queue 0, only 2 flips logged). Fix: re-check legality when dequeuing, or snapshot the post-animation state at commit time. |
| TO-002 | P2 | MVP Builder | **The second Undo re-applies the undone flip** instead of stepping back. Undo pushes the reverse move onto the stack. On L4, after 2 flips: undo#1 → [1,1,0], undo#2 → [0,1,1], which is the post-flip-2 state again. used=4. Shot `undo_twice_L4_390.png`. |
| TO-003 | P2 | Game Finder + MVP Builder | **The stuck banner's "undo" can never lead to a win.** One flip changes the distance by ≤1. With budget par+2 the banner fires only at slack ≤1, and undo costs 1 more. Observed: stuck-Undo on L1 immediately shows "Can't finish in 2 flips" (`stuck_L1_390.png`). The copy "undo or restart" is misleading, so make the banner restart-only or change the economy. As a side effect, any mistake plus undo = par+2, so the run caps at ★. |
| TO-004 | P2 | MVP Builder | **The 4th pancake in a stack is drawn at alpha 0.45, which washes out the burnt/golden cue.** Pixel measurement on every pancake at level start, 320×568 and 390×844:<br>• Depth 1–3: 100% classified correctly, burnt vs golden contrast ≥6.9:1.<br>• Depth 4: up-band contrast 1.97:1, underside 1.51:1. All 8/300 band misclassifications are depth-4 bands (L5, L8, L9, L10).<br>Planning on L8–L10 needs those bottoms. |
| TO-005 | P3 | MVP Builder | Tap-then-tap is not implemented for touch. BUILD_NOTES claims it as an accessibility alternative, but only the keyboard path uses `selected`. |
| TO-006 | P3 | MVP Builder | The top-edge hit overlap: the top ~6 px of a pancake selects the one above (full-box misfires 1–6/100). |
| TO-007 | P3 | MVP Builder | A 233–316 ms long frame on the first flip at CPU 4×. The fps claim "min 59.5" did not reproduce (58.1 in their own test in my run). It still passes the 50 gate. |
| TO-008 | P3 | MVP Builder | Undo during an animation is silently dropped (used 1, undos 0). A queued move survives under the stuck banner (queue=1, never replayed). |
| TO-009 | P3 | Game Finder | The sim's "+probe" variants (e.g. 61.7 vs 55.0) are pure Monte Carlo noise. Exact computation shows probe ≡ plain, for the reason in TO-003. This is an SL-008-like sim artifact. |
| TO-010 | P3 | MVP Builder | The top ~45% of the portrait screen is unused. The `wobble` variable is computed but never drawn. |

## G. Game Finder asks
1. **Lazy clear rate ≤30% on L7–L10, exact (SIMULATION, budget par+2, exact Markov over all states):**
   - Greedy-1 with 2-move lookahead (g1x2): L1–L10 = 76.56 / 75.78 / 63.37 / 24.51 / 25.54 / 41.41 / **8.87 / 11.15 / 1.19 / 2.19 %**. ✓ Max on L7–L10 is 11.15%, on L8. The brief's sampled max of 10.0% understates this slightly.
   - Plain greedy-1: L3 27.6, L4 7.23, L9 0.07, L10 0.12.
   - Random play: ~0 from L4 on.
   - L6 is 41.4%, which is above 30%, but the limit only applies from L7.
   - Sim check: the probe variants are an artifact (TO-009).
2. **Burnt/golden readable mid-stack at 320 and 390:**
   - Method: automated pixel classification of the up band and the underside band of all 150 start-of-level pancakes at each size, from real screenshots, plus my own single-rater visual review (e.g. `crop_s320_L9_stacks.png`).
   - Depth 1–3: 100%, contrast ≥6.9:1. Depth 4: weak (TO-004).
   - **The 5-humans, 5/5-within-2 s test was not run.** That needs people.
3. **Misfires below 3 per 100 drags:** ✓ 0/100 at all three sizes for central touches. The full-box stress test was 1–6/100 (TO-006).
4. **Drags during animation queued, never dropped:** ✓ in 4/4 timing cases. ✗ in one edge case (TO-001b), and queued moves can break rules (TO-001a).
5. **Stuck banner exact over ≥20 spot checks:** ✓ 507 in-browser checks, 0 wrong, plus exhaustive/sampled checks (section C).
6. **L9 vs L10, measurable proxies:**

   | Proxy | L9 | L10 |
   |---|---|---|
   | Par | 8 | 9 |
   | States within 6 flips | 195,417 | 454,449 |
   | Optimal lines | 22 | 73 |
   | Fatal openings | 6 | 0 |
   | Exact g1x2 clear rate | 1.19% | 2.19% |

   L10 is bigger but more forgiving. Whether it *feels* harder is a human call.
7. **Human checks for the playtest (NOT done):** brief H1–H5; the 5-player 2-second face-identification test; the opacity test with 3–5 players on L7–L10; and the originality review.

## H. Builder claim checks
| Claim | Result |
|---|---|
| 14/14 tests | ✓ |
| 10 reference lines at ★★★ | ✓ (real drags, 4 widths) |
| Lazy 5.0 / 12.5 / 2.5 / 2.5% | ≈ consistent. The seeded N=40/80 samples are within noise of the exact 8.87 / 11.15 / 1.19 / 2.19 |
| 0/100 misfires | ✓ for central touches. Their test is weak: it only drags L1's top pancake from its centre |
| Min fps 59.5 | ✗ not reproduced (58.1 in their test, worst 30-frame window 40.9 in mine) |
| Fidelity | ✓ widened to all reachable states, 0 mismatches |
| Tap-then-tap alternative | ✗ keyboard only |

## I. Next steps
Fix TO-001 and TO-002, decide the TO-003 economy/copy, raise depth-4 contrast, then R1. Run the human checks in G7.
Key shots: `q2_overcap_390.png`, `undo_twice_L4_390.png`, `stuck_L1_390.png`, `fail_L1_390.png`, `read_320x568_L9.png`, `crop_s320_L9_stacks.png`, `s390_L10_win.png`, `landscape_844x390.png`.
