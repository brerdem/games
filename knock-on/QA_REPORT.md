# Knock-On — QA Report R1 (cycle 1 of 2)
Build f9e52a553e5baeb0094a7af7d6d22e8cee5f6512 · CI run 39729539320 · commit 2026-10-22 08:42 (UTC+3) · tested 2026-10-22 (UTC+3)
Previous: QA_REPORT_R0.md (71 REVISE). R0 evidence archived in shots_r0/ and data_r0/. R1 evidence is in shots/ and data/.

## A. Verdict
**REVISE — 76/100** (R0: 71). All 10 claimed fixes (KO-001…KO-010) verified FIXED. But the new in-cell arrows add a P1 (KO-012), and Feel (13) misses its gate of 14. A P2 (KO-013, hint laddering through free Restart) was present in R0 too and I missed it then.

## B. Integrity
- The repo's QA_REPORT.md is byte-identical to our R0 report: unaltered.
- The live index.html, game.js, logic.js and min.js are byte-identical to the commit.
- logic.js diff: makeMin now returns a lookup, and the undo line that restored hintUsed is removed. push/moves are unchanged.
- Levels are identical to the brief.

## C. Scores
| Cat | R0 | R1 | Gate | Evidence |
|---|---|---|---|---|
| Core | 16 | **16**/20 | ≥14 ✔ | Rules unchanged. D9 hint odds 55.56% on L8/L12 after the fix. KO-013 lets restarts ladder the hint into a full line. |
| Feel | 12 | **13**/20 | ≥14 ✘ | Neighbour mis-push, skip fall-through and the hitch are fixed. New: a swipe on the selected domino or a double-tap pushes the wrong way (KO-012). |
| Hook | 10 | **11**/15 | ≥10 ✔ | Gold hint arrow and cleaner tail payoff. Unproven with humans. |
| Progression | 12 | **12**/15 | – | Ladder unchanged. |
| Visuals | 7 | **9**/10 | – | Spanning plank + dashed tail, pin icon, gold hint arrow + ghost. Arrows hide the selected domino. |
| Mobile | 7 | **8**/10 | ≥7 ✔ | 0 off-screen on 19 sizes, no bar overlap. Arrow hit areas are 20–31 px tall. |
| Originality | 7 | **7**/10 | ≥6 ✔ | Unchanged. |
| **Total** | **71** | **76** | | REVISE (65–79). Feel gate fails and a P1 is open. |

## D. Item verification
1. **Rules, levels, min.js: PASS.** min.js matches my independent solver on every reachable state of all 12 levels (e.g. L9: 38,678 states, 0 missing, 0 mismatches). Table sizes equal reach counts. (data/o_min_r1.txt)
2. **KO items by real CDP touch at 320, 360, 375, 390 and 430, plus short screens** (data/o_r1ko.txt, r1ko.json):
   - **KO-001 FIXED.** Tapping a neighbour spends 0. Select + swipe on a neighbour pushes the right domino. Jitter: 7 px (and 7 px diagonal) keeps the selection and arrows; 8 and 9 px deselect. After a short drag there are no arrows, and the next swipe works. Arrows are hittable at 57 px cells, both at centre and 3 px from the edge. Arrow size: 49×25 at 360, 54×28 at 390, 61×31 at 430, 39×20 at 320.
   - **KO-002 FIXED.** Skip-on-stuck with holds of 40, 100 and 250 ms: 0 spent, banner stays. Skip-on-win on L1, L2 and L10: the win panel stays, ★★★.
   - **KO-003 FIXED.** After Undo the hint stays "Used", and the clear reads "with a hint" (★☆☆). Exact recomputed hint-fishing odds: 55.56% on L8 and L12, 0% elsewhere, 3★ 0% (limit ≤60%). (o_exact_r1.txt)
   - **KO-004 FIXED (my measurement, not the builder's figures):**
     - Open: oracle 0 ms on every level at 1×, 4× and 6×. Next-into-L7/L9/L10 max frame is 17 ms, except 33 ms into L7 at 6×. 0 frames over 100 ms.
     - Restart on L9: max frame 16.8 ms at 1×, 4× and 6×.
     - Startup: ready at 297 / 353 / 472 ms (1× / 4× / 6×). One 69 ms long task at 6×. Heap 18.4 MB. min.js is 386,704 B transferred and 6,172,825 B decoded. (o_perf_r1.txt, o_startup_r1.txt)
   - **KO-005, 006, 007 FIXED.** Screenshots: shots/m390_E_hint_01_L8_hint, m390_E_lose_03_L1_pinned.
   - **KO-008 FIXED.** On L12 the win focus goes to Retry, and Esc keeps the panel open.
   - **KO-009 FIXED.** No bar overlap on any size.
   - **KO-010 FIXED.** R before any push restarts directly; after a push it asks to confirm.
   - **KO-011:** unchanged from R0 (P3, design call).
3. **fps (my run, L10 swipe solves, 390 px DPR2, 4× CPU):** 59.5 / 60 / 60 fps. p95 16.8 ms. One 50 ms frame in run 1. The claimed "minimum 60" holds to within 0.5 fps.
4. **Regression vs R0: PASS.**
   - 48/48 solves at 3★ (swipe at 3 sizes + tap-arrow), 0 errors.
   - These all match R0: lose paths, gesture edge cases (release outside, touchcancel, diagonals), multi-tap, resize/rotate, landscape, reload state.
   - Help fits at all sizes. file:// makes 0 HTTP requests. Buffer 585×1266.
   - CI tests: CI run 39729539320 ran the added tests. I did not re-run CI myself.

## E. New issues
| ID | P | Owner | Issue |
|---|---|---|---|
| KO-012 | **P1** | MVP Builder | The in-cell arrows cover the selected domino itself. A swipe east that starts on its west half pushes **west** (1 push spent, all sizes). A double-tap pushes toward the tapped half. Fix idea: suppress arrows under a drag, or treat motion ≥8 px that starts on an arrow as a swipe. |
| KO-013 | P2 | Game Finder + Builder | Hint laddering through free Restart. The confirm text says "Pushes and the hint come back", so hint → restart → replay reveals the full line, then a clean run earns 3★. L8: 4 restarts. L12: 6 restarts. This breaks the brief's "1 hint per level" and "hint-assisted never 3★". Needs a decision: keep the hint spent across restarts, or mark stars as hinted. |
| KO-014 | P3 | Builder | Arrow hit height is 20–31 px, below the 48 px guideline. |
| KO-015 | P3 | Builder | panelLock (340 ms) swallows quick taps on menu and confirm buttons. |
| KO-016 | P3 | Builder | min.js is 6.2 MB decoded and causes a 69 ms long task at 6× startup. Consider a compact encoding. |

## F. Simulations
The exact odds in D.2 (KO-003) and the KO-013 ladder counts come from the exact solver and policy models. They are SIMULATION, not human play.

## G. Hypotheses H2–H5
Unchanged from R0: unproven until human playtest.

## H. Data
See data/: o_min_r1, o_r1ko, r1ko.json, o_ladder, o_exact_r1, o_play_r1_*, o_edge_r1, o_layout_r1, o_perf_r1, o_startup_r1.

## I. Next step
R1 cycle 2:
- **MVP Builder:** fix KO-012 (blocks PASS). P3s optional.
- **Game Finder:** rule on KO-013.

Fixing KO-012 should bring Feel to ≥14. With KO-013 resolved, about 80+ is plausible (projection, not a score).
