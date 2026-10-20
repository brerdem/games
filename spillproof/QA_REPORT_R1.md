# Spillproof: R1 QA Report (revision 1, cycle 1 of 2)
Game ID GF-20261020-01 v1 · Tester: Game Tester (Grok Bot) · 2026-10-20 (UTC+3)
The R0 report is kept as `QA_REPORT_R0.md`, with its evidence moved to `shots_r0/` and `data_r0/`.

## A. Verdict
**REVISE: 73/100 (R0: 68).**
- 9 of 10 builder items are verified with my own harness. SP-007 (frame rate) is not.
- The Mobile gate is now met (8, needs ≥7).
- **Originality still misses its gate (5, needs ≥6).** That is a Finder/human call, not build work.
- New design issue SP-012: L9 and L12 are mirror copies of L8 and L11, so tier 2 has only 4 distinct puzzles and the finale is a repeat.

## B. Build under test
- Commit `367991d`, pushed 2026-10-20 10:32:56 UTC+3.
- The live index.html, game.js and logic.js are byte-identical to the repo.
- CI run 39387237656 is green. The `spillproof` job took 1m32s; GitHub shows the trigger at 07:33 UTC (10:33 UTC+3).
- CI now covers touch, landscape, the bubble, overlay multi-taps and a single-line + guess policy.
- The CI perf test is not what I measure. It calls `__spill.pourNext()` from inside rAF for 1 s; I measure a real tapped solve plus its animations.

## C. Method
- **Solver:** my own `qsolve.mjs` run on the shipped levels (extracted into `data/levels_r1.json`).
- **Policies (SIMULATION):** 300 seeds per random policy.
- **Browser:** Playwright with real CDP touch:
  - Layout off-screen and cell-size sweep on 17 sizes × 12 levels.
  - Bubble sweep on 17 sizes.
  - Full touch play L1–12 at 360×800, 390×844, 430×932 and 844×390.
  - Overlay ×2/×3 taps at 360, 390 and 430.
  - Gestures at 360, 390 and 430.
  - Lose states, keyboard, file:// and network, audio console, help scroll, rotate round-trip.
  - 4× throttle at 390 dpr2, run twice.

## D. Rubric
| Area | R0 | R1 | Gate | Note |
|---|---|---|---|---|
| Core | 15 | 17/20 | ≥14 ✔ | T2 levels now really need what-if reasoning. Unique and guess-free. |
| Feel | 14 | 16/20 | ≥14 ✔ | Ghost pour and ghost marks are fixed. Enter advances on the win panel. |
| Hook | 10 | 10/15 | ≥10 ✔ | Not yet tested with humans. |
| Progression | 10 | 9/15 | – | Tier 2 is harder, but L9/L12 are copies and there is no finale peak (SP-012). |
| Visuals | 8 | 8/10 | – | Unchanged. The rotate prompt is clean. |
| Mobile | 6 | 8/10 | ≥7 ✔ | Portrait is clean, landscape is gated, cells are 42 px only at 360. |
| Originality | 5 | 5/10 | ≥6 ✘ | Still Aquarium plus spills (SP-011). |
| **Total** | 68 | **73** | | **REVISE** (Originality gate) |

## E. Handoff ACs: claimed vs verified
| Item | Builder | Verified | Evidence |
|---|---|---|---|
| SP-002 overlay lockout | PASS | **PASS** | ×2 and ×3 taps on win-Next, win-Retry, confirm-Yes and Resume change no spills, no preview and no committed state, at 360, 390 and 430 (`o_r1_dbl_*.txt`). Landscape has no board to tap because of the rotate gate. |
| SP-003 bubble | PASS | **PASS** | 0 cells covered on L1, L4 and L5 across all 13 portrait/desktop sizes. Landscape shows no bubble (`o_bubble_r1.txt`). L4 and L5 now play through with 3★. |
| SP-001 guessing | "3★ in 1–3/300" | **PASS (SIMULATION), counts differ** | Single-line + random guessing gets 3★ on L7–12 at 1.3/1.3/1.3/0.3/2.3/1.3% (4/4/4/1/7/4 of 300; L11 is above the claimed 3). It clears at 22/18/18/16/18/20%. AC (≤5% 3★, ≤25% clear) is met. T1 makes zero progress at the start of every T2 level. Each level has 1 solution and is solved by T2 with 0 guesses. Every pipe is needed. Counting and random players still lose from L4. |
| SP-004 landscape | rotate prompt | **PASS** | All 4 landscape sizes show only "Turn to portrait" (shot `land844_L_02_L12.png`). Taps under the prompt do nothing. Rotating mid-level and back keeps the board and spills, and L7 continues (`m390_R1_rot_*`). |
| SP-005 drag/cancel marks | PASS | **PASS** | Drag-out leaves 0 marks. Touchcancel does not mark the cell. Long-press still marks. Checked at 360, 390 and 430. |
| SP-006 win focus | PASS | **PASS** | activeElement is `win-next`, and Enter loads L2. |
| SP-007 ≥50 fps at 4× dpr2 | 55.4 | **FAIL** | My tapped L12 solve at 390 dpr2, 4× throttle: 44.5 and 42.4 fps (p95 33.4 ms) across two runs. R0 was 38.1, so it improved. 1×: 59.5 fps. |
| SP-008 cell size | 42/44 | **PARTIAL (as claimed)** | 44 px at 375, 390 and 393, but still 42 px at 360. |
| SP-009 audio on gesture | PASS | **PASS** | 0 console warnings or errors during load and play. |
| SP-010 help scroll | PASS | **PASS** | At 360×800 the help fits: last element bottom at 557 px of 800, no scroll needed. At 740×360 the rotate prompt carries the rules summary. |

**Regression check against R0:**
- Frost rule matches on L4, L9 and L12, and 3 spills open the fail panel on all three. L9 now reaches the fail screen.
- A double tap on fail-retry gives a clean board.
- Frosted re-pour costs no drop.
- D8 preview is still identical for correct and wrong pours.
- Hint costs no drop; a second hint does nothing.
- Save, mute and level locks work.
- file:// makes 0 HTTP requests and can be won.
- Pressure Rush audio is intact.
- 0 off-screen cells, buttons ≥48 px.
- Touch 3★ play of all 12 levels at 360, 390 and 430.
- **No regressions found.**

## F. Issues
**Open:**

**SP-007: Below 50 fps at 4× throttle, dpr2, during a real solve**
- Severity: P3. Classification: Perf. Owner: Builder.
- Observed: 42–45 fps. The CI measure (synthetic `pourNext` over 1 s) does not reproduce this.
- Recommendation: measure a tapped solve including pour animations, and cut the per-frame cost of the water and frost draw.
- AC: ≥50 fps in my harness.

**SP-008: 42 px cells at 360**
- Severity: P3. Classification: Mobile. Owner: Builder.
- Accept as is, or trim the margins at 360.

**SP-011: Very close to Aquarium**
- Severity: P2. Classification: Originality. Owner: Finder/Burak.
- Unchanged. This blocks PASS through the Originality gate.

**SP-012 (NEW): L9 and L12 are mirror copies of L8 and L11**
- Severity: P2. Classification: Design/Progression. Owner: Builder + Finder.
- Observed:
  - L9 is L8 flipped left-to-right, with the same row clues, reversed column clues, the same pipes and the same solution map. L12 is the same copy of L11.
  - My solver and policies give identical results for each pair: same tiers, same 18%/1.3% for L8 and L9, same groups and search space.
  - Tier 2 therefore has 4 distinct puzzles, and the 8×8 "Grand Cistern" finale is a re-skin of L11.
  - A player who notices the flip can solve L9 and L12 from memory, so L12 gives no difficulty peak.
- Expected: 12 distinct puzzles, with L12 the hardest.
- Recommendation: generate new L9 and L12 that meet the same SP-001 AC, and make L12 need ≥2 what-if steps.
- AC: L9 and L12 are not isomorphic to any other level under rotation or reflection; SP-001 thresholds still hold; L12 has the largest search space or the most what-if steps.

**Closed in R1:** SP-001, SP-002, SP-003, SP-004, SP-005, SP-006, SP-009, SP-010.

## G. H1–H5
- **H1 (deduction over luck):** now supported by simulation. Guessing seldom clears T2 levels (16–22%) and almost never earns 3★.
- **H2–H5** still need human playtests. Unchanged from R0.

## H. Playtest readiness
- **Ready for an internal portrait playtest now.** The P2 input bugs are gone, landscape is gated, and every level is beatable with touch.
- **External test:** fix SP-012 first, and get a decision on originality (SP-011).

## I. Artifacts
- `data/`: levels_r1.json, o_levels_r1.txt, o_policies_r1.txt (with o_policies_r0.txt for comparison), o_layout_r1.txt, o_bubble_r1.txt, o_play_r1_*.txt, o_r1_dbl_*.txt, o_r1_edge.txt, o_r1_perf.txt.
- `shots/` (81 files), notably:
  - land844_L_02_L12.png (rotate prompt)
  - m390_R1_rot_01/02 (rotate round-trip)
  - m360_R1_help_01_help_360.png
  - m360_P_*_L*_win.png
- Tools: `tools/spillproof/` (qsolve, q_levels, q_play, layout, bubble, play, edge, r1extra).
