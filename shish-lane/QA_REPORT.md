# Shish Lane — QA Report R1 (revision cycle 1 of 2)
Build: brerdem/games `main` @ 43d527e383290d18167e0de4572064b17bd552c1 (merges 065604b). Live: https://brerdem.github.io/games/shish-lane/
Brief: v1 plus amendment v1.1. The repo's `BRIEF-v1.1.md` is byte-identical to `/workspace/game-ideas/amendments/shish-lane-BRIEF-v1.1.md`.
- The R0 report, shots and data are archived as `QA_REPORT_R0.md`, `shots_r0/` and `data_r0/`.
- The repo's `shish-lane/QA_REPORT.md` is byte-identical to my R0 report.
- Game code was not modified.
- All touch input is synthetic (CDP touch events). Headless fps is indicative only. All odds marked SIMULATION are exact recursion, not sampling.

## A. Verdict
**REVISE — 76/100.**
- All gates pass and there are no P0 or P1 issues. SL-001 to SL-006 are all fixed.
- The score stays under 80 because Visuals and Hook are unchanged and unvalidated by humans.
- A PASS would require humans first.

| Category | R0 | R1 | Gate | Why it changed |
|---|---|---|---|---|
| Core | 15 | 17/20 | ≥14 ✓ | The undo economy now matches the brief: 2 undos clear for ★. The banners are exact. |
| Feel | 14 | 15/20 | ≥14 ✓ | No dead-end Undo button. pointercancel is safe. Commit still takes 310–330 ms. |
| Hook | 11 | 11/15 | ≥10 ✓ | Unchanged. Needs H1–H4. |
| Progression | 11 | 12/15 | — | All L7–L11 targets met (exact). Two small curve bumps (see E). |
| Visuals | 6 | 6/10 | — | Unchanged: flat primitives. |
| Mobile | 8 | 8/10 | ≥7 ✓ | The 320 rail overlap is fixed. At 320×568, lane zones on L8–L11 are 38 px (SL-009). |
| Originality | 7 | 7/10 | ≥6 ✓ | — |
| **Total** | 72 | **76** | 80 ✗ | |

## B. Integrity
- The sha256 of the live index.html, game.js and logic.js equals the commit (e7587272…, 3a615344…, eb4a445c…).
- My independent engine, run on the v1.1 pack, found 0 mismatches over 1,687 reachable states and 5,122 legal thrusts (`data/o_fid_v11.txt`).
- New L7 checks:
  - It matches the amendment text.
  - It has 91 states.
  - Its reference line clears.
  - It is non-isomorphic to the other 10 levels (D4 symmetries × letter relabel).
  - It is unsolvable without its slabs and still solvable without its coal. The amendment says the coal matters for lazy play, not for solvability; I did not re-check the 57.7% figure.

## C. SL-001 to SL-006 (real interaction at 360, 390 and 430 unless noted; data in `data/r1_fix_checks.json`)
| ID | Status | Evidence |
|---|---|---|
| SL-001 | **FIXED** | L7 skewers went 9 → fatal 8 → undo 8 → fatal 7 → undo 7. The reference line then won with **★ (1 star), "Cleared with 2 undos."** at all 3 sizes (`shots/m390_r1_02_L7_two_undo_one_star_win.png`). On L1, each serve/undo cycle costs exactly 1. |
| SL-002 | **FIXED** | Exact L7 RAND+probe is 9.3% and the lazy max is 13.3% (see E). |
| SL-003 | **FIXED** | A fatal thrust shows "No remaining sequence…" with Undo enabled (`m390_r1_01…`). After 3 serve/undo cycles on L1 (3 skewers, 4 tickets, solvable board), the banner reads "Not enough skewers to serve the remaining tickets." plus "Nothing left to undo." with Undo disabled (`m390_r1_03…`). Three taps on the disabled Undo changed nothing. M4 regression: 25 states, 0 stuck or banner mismatches. |
| SL-004 | **FIXED** | touchCancel after 0.6, 1.0 and 1.5 cells of inward drag: no thrust at all 3 sizes. A clean probe on T0, L1, R2 and B3 at 390 and 430 also gave no thrust. A normal swipe afterwards still commits. (One run of my older gesture script showed "THRUST on cancel"; that was an artifact of an earlier diagonal thrust in the same session, ruled out by the clean probe.) |
| SL-005 | **FIXED** (needs `npm install`) | `playwright` is now resolved through the repo-root package.json devDependency. From the bare repo without node_modules it still fails (8/9). From a /tmp copy with node_modules, run from `/`, it gives 19/19. |
| SL-006 | **FIXED** | At 320×568, 360×640 and 375×667, on L1–L11: 0 T-zones overlap the rail, 0 B-zones overlap the bar, 0 off-screen. Real swipes on all 24 lane ends of L11 at 320×568 were all correct (`data/sl006_small_screens.json`, `shots/sl006_320x568_L11.png`). |

## D. Regression M1–M8 and method checks
- **M1:** all 11 reference lines ★★★ via swipes at 360, 390 and 430. Each lesson card appears once (L5 coal, L7 slab).
- **M2:** a mismatch is free.
- **M3:** a serve costs 1 and an undo adds 0. Restart restores the budget.
- **M4:** 25 states, 0 mismatches.
- **M5:** checked exhaustively in the engine comparison.
- **M6:** the smallest zone was 44 at 360, 390 and 430. A tap, an 8 px drag and a 30% drag cause no thrust.
- **M7:** commit takes 310–330 ms.
- **M8:** the pack matches, and I checked non-isomorphism independently.
- **Misfires:** 0/350 (L11; 100, 150 and 100 swipes; ±3 px wobble). No missed commits and no wrong lanes.
- **Overlays:**
  - Win "Next" ×2 or ×3 advanced one level.
  - Stuck-undo ×3 applied 1 undo.
  - Disabled Undo ×3 did nothing.
- **Rotate and resize:** mid-L7 state kept, landscape shows the rotate card and ignores swipes, and the level was then won (3 sizes).
- **19 sizes:** no off-screen UI and no scroll. Bar buttons are 48 px.
- **Offline:** file:// play won L1 with ★★★ and 0 network requests (moves made through the game's hook).
- **Keyboard and URL:** `?level=7` loads L7, and Enter thrust R0 (a legal serve, costing 1).
- **Page errors:** 0.
- **fps (390, DPR 2, 4× throttle, swiped L11 solve):** 59.6 / 59.3 / 59.2 avg; p95 16.7–16.8 ms; worst frames 50, 67 and 117 ms. A DPR 3 run gave 59.7 / 60 / 60.

## E. Exact odds, cost-1 undo rule (SIMULATION; `data/o_odds_v11.txt`)
| L | RAND | RAND+probe | Lazy max (policy) | Safe openings |
|---|---|---|---|---|
| 1 | 70 | 100 | 100 | 4/4 |
| 2 | 8.3 | 51.1 | 83.3 COVER+p | 2/6 |
| 3 | 5.6 | 50 | 83.3 PLY2+p | 1/3 |
| 4 | 6.3 | 37.5 | 75 ROWS+p | 1/6 |
| 5 | 5 | 30 | 75 PLY2+p | 1/5 |
| 6 | 0.1 | 2.1 | 37.2 COLS+p | 2/9 |
| 7 | 0.9 | **9.3** ✓ | **13.3** SHORT+p ✓ | 1/6 |
| 8 | 0.8 | 7.1 ✓ | 14.3 COLS+p ✓ | 1/7 |
| 9 | 0.6 | 9.0 ✓ | 13.8 SHORT+p ✓ | 3/8 |
| 10 | 0.5 | 7.5 ✓ | 16.7 COVER+p ✓ | 1/6 |
| 11 | 0.1 | **1.5** | **8.2** COVER+p | 2/6 |

- **L11 hardest: PASS.** From L7 on it has the lowest RAND+probe and lazy max, the most states (549), and the highest fatal share on the brief's reference-path measure (0.442).
- **Game Finder claims:**
  - L7 RAND+probe 9.3%: ✓
  - L6 RAND+probe 2.1%: ✓
  - L10 lazy max 16.7% vs L9 13.8%: ✓
  - L7 lazy max 21.3%: ✗. I get 13.3%. Their 21.3% comes from MINDIS+probe, and I traced it to their `lib.py` comparing cell tuples in travel order, so a match that is still open but now reached from the other end counts as "broken". In a copy of their code with set comparison, L7 MINDIS+probe is 0.0%, the same as mine (SL-008). Either value is under 30%.
- **Curve bumps, and whether they matter:**
  - **L6:** RAND+probe is 2.1%, below L7–L10. But L6 is the most heuristic-friendly level from L6 on (lazy max 37.2%, COLS+probe). It is a wall for random players and easy for column-minded ones. It is right before the slab level, so it could feel like a spike. This is minor and does not breach any target; flagged for a human check (H3/H4).
  - **L10 vs L9:** lazy max is 16.7% vs 13.8%, driven by one policy. L10 is harder on RAND+probe (7.5% vs 9.0%) and has fewer safe openings (1/6 vs 3/8). Negligible.

## F. Builder claims
| Claim | Result |
|---|---|
| 19/19 tests | **Confirmed 19/19** (from a /tmp copy with Playwright installed). From the bare repo: 8/9, browser suite missing Playwright. |
| min fps 59.6 | **Approximately.** My runs averaged 59.6, 59.3 and 59.2. The builder's own suite gave 59.3, 60.0 and 60.0 on my box today. That is within headless noise, but my lowest run is below 59.6. |
| SL-001–006 PASS | All confirmed (C). |

## G. Issues
| ID | Pri | Owner | Status / evidence |
|---|---|---|---|
| SL-001 to SL-006 | — | — | FIXED (C). SL-005 needs `npm install`. |
| SL-007 (new) | P3 | MVP Builder / Game Finder | The fail card "Out of skewers" can no longer appear. Skewers − tickets = 2 − undos, so the short-budget banner always appears first and play stops there. Observed at all 3 sizes: the L1 path ended at the short banner with Undo disabled; the fail card never showed. Decide whether to remove it or keep it as a safeguard. |
| SL-008 (new) | P3 | Game Finder | The `exact.py` MINDIS tuple-order artifact inflates L7's lazy max to 21.3% (true value 0.0% for that policy; L7 lazy max is 13.3%). No impact on any target. |
| SL-009 (new) | P3 | MVP Builder | At 320×568, L8–L11 cells are 38 px, so lane zones are 38 px along the edge (below 44). The brief only requires 44 at 390. All 24 L11 swipes still landed correctly. |

## H. Human playtest list (not done)
- H1–H4.
- The L6 spike before slabs.
- Whether undo, with no visible "−1" any more (the pip only changes on the serve), is understood.
- Real-finger misfires.
- Real-device fps.

## I. Key artifacts
- **Shots:**
  - `shots/m390_r1_01_L7_unsolvable_banner.png`
  - `m390_r1_02_L7_two_undo_one_star_win.png`
  - `m390_r1_03_L1_short_budget_banner.png`
  - `sl006_320x568_L1.png`, `sl006_320x568_L11.png`
  - `m390_m1_02_L11_win.png`
  - `m390_input_01_landscape_mid_L7.png`
  - `size_*_L11.png` (19 sizes)
  - `m390d2_fps3_01_L11_win_fps_dpr2.png`
- **Data:** `o_tests.txt`, `o_tests_root.txt`, `o_odds_v11.txt`, `o_fid_v11.txt`, `r1_fix_checks.json`, `sl006_small_screens.json`, `m1_reference_swipes.json`, `m2_m4_tap_390.json`, `input_overlays_rotate.json`, `misfire_fail.json`, `misc.json`, `fps_390_dpr2_4x.json`.
- Times are UTC+3. Report written 2026-10-24.
