# Knock-On — QA Report R2 (FINAL cycle, 2 of 2)
Build fe8936f04ad80653d247d75a7aed95e54b4c8724 · CI run 39732813238 · commit 2026-10-22 09:15 (UTC+3) · tested 2026-10-22 09:18–10:15 (UTC+3)
Previous reports: QA_REPORT_R1.md (76 REVISE), QA_REPORT_R0.md (71). R1 evidence archived in shots_r1/ and data_r1/.

## A. Verdict
**REVISE — 76/100. Final cycle, so the recommendation is HUMAN INTERVENTION, as one scoped fix with a human reviewer (see I).**
- KO-012, 013, 015 and 016 are fixed.
- KO-014's fix (48 px arrows placed outside the selected domino) creates a new **P1, KO-017**. The arrows now lie over neighbouring dominoes. A tap or swipe on the covered part of a neighbour pushes the *selected* domino and spends a push: 12/12 probes wrong at every size tested. This is the R0 KO-001 failure in a new form.
- The Feel gate fails (12 < 14).

## B. Report-copy integrity
- The repo's `knock-on/QA_REPORT.md` is byte-identical to our R1 report (sha256 dcfb9a3f…).
- The repo's `knock-on/QA_REPORT_R1.md` is **our R0 report**, not our R1. It is byte-identical to the R0 copy the repo held at f9e52a5. It differs from our archived R0 only by our own data_r0/ and shots_r0/ path rewrite (verified: no other diff). Its header reads "R0 QA Report".
- **Flag:** the name is wrong (R0 content filed as R1). The content is unaltered and nothing was authored or edited by the builder. The commits are by the builder agent; the content is ours.
- The live game.js equals the repo's (sha256 2967588a…).

## C. Scores
| Cat | R1 | R2 | Gate | Evidence |
|---|---|---|---|---|
| Core | 16 | **17** | ≥14 ✔ | KO-013 fixed. The hint stays spent through Restart, Retry, reload and level re-select. Rules and packs are exact. |
| Feel | 13 | **12** | ≥14 ✘ | KO-012 fixed, but KO-017 means wrong-domino pushes again. Board is silently dead for 0.85–1.24 s when L9 opens at 4×/6× (KO-018). |
| Hook | 11 | **11** | ≥10 ✔ | Unchanged. |
| Progression | 12 | **12** | – | Unchanged. Hinted clears are capped at 2★. |
| Visuals | 9 | **9** | – | The selected domino is visible again. Arrows overlay neighbours. |
| Mobile | 8 | **8** | ≥7 ✔ | Arrows are 48×48, 0 off-screen at 7 sizes. But they cover neighbour cells. |
| Originality | 7 | **7** | ≥6 ✔ | Unchanged. |
| **Total** | **76** | **76** | | REVISE. P1 open and Feel gate fails. |

## D. Verification (real CDP touch; m320, m360, m375, m390, m430, s360 = 360×640 short screen)
1. **Rules and packs: PASS.**
   - logic.js is unchanged vs R1 (0-line diff), and levels equal the brief.
   - My independent decoder plus solver: all 12 packs match every reachable state, 0 missing, 0 mismatched (L9 38,678; L10 24,941; L7 21,048).
   - Total pack size is 3,773,664 B. BUILD_NOTES says 3,781,856 (8,192 B off; trivial). (data/o_pack_r2.txt)
2. **KO-012: FIXED.** Domino L1 (1,3) H, tested from both halves in all 4 directions, in three modes: unselected, selected, and starting on an arrow (24 swipes per size).
   - Along the axis, every swipe pushes the swiped direction. Across the axis: none.
   - The single exception, at all sizes: a drag that starts on the **west arrow** and goes west pushes nothing (0 spent). It does not push the wrong way.
   - Double-tap at the centre or either half: 0 spent, arrows hidden.
   - Jitter: 7 px selects; 8 and 9 px do not. A 7 px jitter on an arrow still commits. (o_r2ko_part1/2)
3. **KO-013: FIXED.** L8 and L12 at m390 and m320:
   - hint → Restart, push + Restart, reload, and menu re-select all keep the button "Used" (disabled).
   - The clean solve afterwards gets **2★**, "with a hint".
   - Retry after that win offers Hint again, and a clean replay gets 3★ (by design: the player has now solved it).
   - Ladder: a hint can no longer be refreshed without a clear, so the R1 ladder is closed.
   - Rules are unchanged, so the exact odds from R1 still hold: hint-fishing 55.56% on L8/L12, 0% elsewhere, 3★-with-hint 0% (SIMULATION, exact model). (o_k13)
4. **KO-014: PARTIAL, with a regression.**
   - Arrows are 48×48 at all sizes, 0 off-screen, and never cover a domino centre (0 of 126 selections at each size).
   - But they overlap other dominoes' cells: 177–305 overlap cases per size across all 12 levels.
   - Real-touch probes on the overlapped part of a neighbour: **12/12 wrong** at every size. Examples on L1: with (0,3) selected, tapping the covered part of (1,3) pushes (0,3) east. With (1,3) selected, a swipe east from (0,3) pushes (1,3) east. 1 push lost each time. → **KO-017 (P1)**.
5. **KO-015: FIXED.** Taps 80 ms after a panel opens all respond: confirm No closes, confirm Yes restarts, menu Resume closes, menu How opens help.
6. **KO-016: FIXED, with a UX gap.**
   - Startup fetches only pack/1.js. Ready at 221 / 404 / 427 ms (1× / 4× / 6×). One 51 ms long task at 4×, none at 6× in my run. Heap 9.5 MB (R1: 18.4).
   - **Pushing before the L9 pack is ready:** every tap and swipe is silently ignored and 0 pushes are spent (safe).
   - The board becomes playable after 281 ms at 1×, 849 ms at 4× and 1,243 ms at 6×. With a +2.5 s network delay it takes 3,237 ms, ignoring 37 taps.
   - No loading cue (shots/m390_R2_01_L9_blocked_4x_2500.png). → **KO-018 (P2)**.
   - `window.__knock.ready` stays true while a lazy pack loads, so the test hook is misleading.
7. **Hitch (mine; m390 DPR2):**
   - Next into L7 / L9 / L10, max frame: 17/17/17 ms at 1×, 33/17/17 at 4×, 50/17/17 at 6×.
   - **Restart on L9: 16.8 ms at 1×, 4× and 6×.** I could not reproduce the builder's 66.7 ms restart spike.
   - While a pack decodes, max frame is 50.1 ms (L9, 4×), 33.4 ms (L9, 6×) and 49.9 ms (L10, 6×). 0 frames over 100 ms. (o_perf_r2, o_k16)
8. **fps (L10 swipe solves, 4×):**
   - Run 1: 59.5 fps (max 49.9 ms). Run 3: 59.7 fps (max 33.4 ms).
   - Run 2 had one 321 s gap with no animation frame (fps reads 1.1; p95 16.8 ms). Background parallel harness runs earlier stalled similarly at L3. I treat it as an unexplained harness/headless stall and did not count it. It is not shown to be a game defect.
   - The builder's "fps minimum 59.8" is consistent with runs 1 and 3 (59.5–59.7).
9. **Regression vs R1: PASS.**
   - 48/48 3★ solves (swipe at 360, 390, 430 plus tap-arrow at 390), 0 console errors.
   - **file:// offline:** 12/12 3★, lazy packs load from disk, 0 network requests, 0 failures.

## E. Issues
| ID | P | Owner | Status / issue |
|---|---|---|---|
| KO-001…011 | – | – | Fixed in R1, still fixed (KO-011 is a P3 design call). |
| KO-012 | – | Builder | FIXED. |
| KO-013 | – | Builder/Finder | FIXED. |
| KO-014 | – | Builder | Size fixed; caused KO-017. |
| KO-015 | – | Builder | FIXED. |
| KO-016 | – | Builder | FIXED (see KO-018). |
| **KO-017** | **P1** | MVP Builder | The 48 px arrows overlap neighbouring domino cells. A tap or swipe on the covered part pushes the selected domino (12/12 wrong at all 7 sizes). Fix: place arrows only over empty cells or margins, or route drags that start on an arrow but move toward a different domino to that domino. Cheapest option: a swipe starting on an arrow region that overlaps another domino goes to the domino under the finger. |
| KO-018 | P2 | Builder | Silent dead board for up to 1.24 s at 6× (3.2 s on a slow network) while a pack decodes. No cue; taps are dropped. Fix: a loading shimmer, or queue the first input, or prefetch the next pack on the win panel. |
| KO-019 | P3 | Builder | A drag west starting on the west arrow does nothing (0 spent). |
| KO-020 | P3 | Builder | `__knock.ready` is not reset during lazy loads, so CI can't detect the gap. |

## F. Simulations
- Hint-fishing odds are SIMULATION (exact model, unchanged rules).
- Everything else is real-touch measurement.

## G. Hypotheses H2–H5
Unproven; human playtest needed.

## H. Data
data/: o_pack_r2, o_r2ko_part1, o_r2ko_part2 (+ r2ko_m430_s360.json), o_k13/k13.json, o_k16/k16.json, o_play_r2_*, o_perf_r2/perf.json, o_startup_r2/startup.json. Shots in shots/.

## I. Final-cycle recommendation
**Human intervention**, not redesign or rejection.
- The game's core is sound: exact rules, all fixes from R0/R1 verified.
- The only blocker is arrow placement (KO-017), a single, well-localized layout issue.
- Suggested path:
  1. A human reviewer approves a narrowly scoped hotfix of KO-017, plus a KO-018 loading cue.
  2. A short targeted re-check of the overlap probes (not a full cycle).
  3. Then human review.
- If no further fix is allowed, suspend the game rather than ship it. KO-017 spends pushes on the wrong domino.
