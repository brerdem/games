# Spillproof: R2 QA Report (FINAL cycle, 2 of 2)
Game ID GF-20261020-01 v1 · Tester: Game Tester (Grok Bot) · 2026-10-20 (UTC+3)

Earlier reports are kept as `QA_REPORT_R0.md` and `QA_REPORT_R1.md`, with their evidence in `shots_r0/`, `data_r0/`, `shots_r1/` and `data_r1/`.

## A. Verdict
**REVISE: 75/100 (R1: 73). Not a PASS after the final cycle.**

What changed:
- SP-012 is fixed and verified: 12 distinct levels, and the new L9 and L12 meet every target.
- SP-007 got worse: frame rate at 4× slowdown dropped from 44 fps (R1 build) to 33–36 fps (R2 build), measured on the same box.

What blocks a PASS:
- Originality (SP-011) is below its gate. That is Burak's decision.
- SP-007 is now a P2 regression.

**Recommendation: HUMAN INTERVENTION.**
- Burak decides on originality (SP-011).
- If he waives or accepts it, approve the game *conditionally*: one targeted perf fix (put back the 1.5× DPR cap, or equivalent), verified in my harness, with no further design cycle.
- If he does not accept it, park or suspend the game rather than reject it. The core puzzle quality is high.

## B. Build under test
- Commit `3937ac53bc8fe30344aec2b6f40f348410d4e607`, 2026-10-20 13:26 UTC+3.
- The level and render changes are in `a793605` (13:22 UTC+3).
- Live index.html, game.js and logic.js are byte-identical to the repo.
- CI run 39407915663 was not inspected in detail. I re-measured everything myself instead of using CI numbers.

## C. Method
- **Levels:** extracted the shipped levels (`data/levels_r2.json`).
- **Solver:** my own solver, plus a what-if depth measure (`r2depth.mjs`).
- **Duplicate check:** canonical tank labelling under all 8 rotations and reflections, across all 66 level pairs. I validated the checker on the R1 levels, where it flags L8~L9 and L11~L12.
- **Policies (SIMULATION):** 300 seeds per random policy, per level.
- **Browser (Playwright, real CDP touch):**
  - Full 3★ play of L1–12 at 360×800, 390×844 and 430×932.
  - Landscape at 844×390.
  - Layout check on 17 sizes × 12 levels; tutorial bubble check on 17 sizes.
  - Overlay ×2/×3 taps and gestures at 360, 390 and 430.
  - Lose states, preview "fishing", keyboard, file:// and network, Pressure Rush audio, help, rotate round-trip.
  - Mis-tap grid on L12 at 360 and 390.
  - Frame rate at 4× CPU slowdown, 390 wide, DPR 2: 3 runs on R2, plus an A/B run of the R1 build on the same box.

## D. Rubric
| Area | R1 | R2 | Gate |
|---|---|---|---|
| Core | 17 | 17/20 | ≥14 ✔ |
| Feel | 16 | 16/20 | ≥14 ✔ |
| Hook | 10 | 10/15 | ≥10 ✔ |
| Progression | 9 | 11/15 | – |
| Visuals | 8 | 8/10 | – |
| Mobile | 8 | 8/10 | ≥7 ✔ |
| Originality | 5 | 5/10 | ≥6 ✘ (Burak's decision) |
| **Total** | 73 | **75** | **REVISE** |

Score notes:
- **Progression:** +2 for 12 distinct puzzles. The finale peak is still modest (SP-013).
- **Mobile:** holds at 8. Touch is accurate, but the frame-rate regression stops it rising.

## E. Claimed vs verified
| Item | Builder | Verified | Evidence |
|---|---|---|---|
| **SP-012: new L9** | 0.7% 3★, 17.3% clear, depth 1 | **PASS** | 1 solution, solved with 0 guesses, both pipes needed. Single-line logic makes no progress at the start; 1 round of what-if is needed. SIMULATION (single-line + random guess): 3★ 0.7%, clear 22% (builder said 17.3%; still ≤25%). |
| **SP-012: new L12** | 1.0% 3★, 17.7% clear, depth 2 | **PASS** | 1 solution, 0 guesses, all 3 pipes needed. 2 sequential what-if rounds (no nested what-if needed). SIMULATION: 3★ 0.7%, clear 18%. |
| **SP-012: no duplicates** | logic test | **PASS** | 0 pairs among L1–12 match under any rotation or reflection (the checker does flag the R1 copies). |
| **L9 and L12 by touch** | – | **PASS** | 3★, 0 spills, the win stamp, and 0 errors at 360, 390 and 430 (all 12 levels). |
| **SP-007: frame rate** | 57.8 / 58.8 fps (CI) | **FAIL, REGRESSED** | My tapped L12 solve at 390, DPR 2, 4× slowdown: 32.8, 35.8 and 36.4 fps (p95 50 ms). R1 build on the same box: 44.1 fps. BUILD_NOTES says the canvas buffer is now the full DPR (780×1688); R1 capped it at 1.5×. |
| **SP-008: 42 px at 360** | declined | **ACCEPTED** | Tapped all 64 cells of L12 at the center and at 30% and 40% offsets in 6 directions: 832 of 832 hit the intended cell at 360 (42 px) and at 390 (44 px), with 0 spills. The gauge-readability reason is credible. |
| SP-001: guessing | – | **PASS** | 3★ ≤2.3% and clear 16–22% on all of L7–12. Counting and random players lose from L4. |
| SP-002: overlay multi-tap | – | **PASS** | 24 of 24 ×2/×3 overlay probes at 360, 390 and 430 left spills at 0 and the board unchanged. |
| SP-003: tutorial bubble | – | **PASS** | 0 cells covered on all 13 portrait/desktop sizes. No bubble in landscape. |
| SP-004: landscape | – | **PASS** | Rotate prompt only on all 4 landscape sizes; taps do nothing there. A mid-level round trip keeps state. |
| SP-005: drag/cancel marks | – | **PASS** | Drag-out leaves 0 marks; a cancelled touch doesn't mark the cell. |
| SP-006: win focus | – | **PASS** | Focus is on Next and Enter advances. On L12, where Next is disabled, focus goes to Retry. |
| SP-009: audio warnings | – | **PASS** | 0 console warnings. |
| SP-010: help | – | **PASS** | Help fits at 360×800 (bottom at 557 of 800 px). |
| Lose states and frost rule | – | **PASS** | On L4, L9 and L12 frost matches the rule and 3 spills open the fail panel. A double tap on Retry gives a clean board. |
| D8: preview fishing | – | **PASS** | Correct and wrong previews are identical. |
| file:// and network | – | **PASS** | 0 HTTP requests and a win offline. Live loads 3 same-origin files. |
| Layout | – | **PASS** | 0 off-screen cells on 17 sizes, buttons ≥48 px. |
| Keys and save | – | **PASS** | Hint costs no drop, R confirm works, Esc opens the menu, progress survives reload, level locks work. |

## F. Issues
**SP-007 (REGRESSED): Frame rate under 4× slowdown is 33–36 fps**
- Severity: P2. Classification: Perf/Regression. Owner: Builder.
- The R1 build measured 44 fps on the same box. Removing the 1.5× DPR cap likely costs more than the dirty-cell repainting saves.
- The CI test does not reproduce my numbers.
- Acceptance: ≥50 fps in my harness, or at least the R1 level, before release.

**SP-011: Very close to Aquarium**
- Severity: P2. Classification: Originality.
- Owner: **Burak** (decision).

**SP-013 (NEW): The finale is not the hardest level**
- Severity: P3. Classification: Progression. Owner: Builder/Finder.
- L12 needs 2 what-if rounds, the same as L10 and L11, and has the most easy starting deductions (16 vs 9–15).
- Its raw search space (74.6M) is below L11's (149M).
- Acceptance (optional): L12 strictly hardest on what-if rounds.

**SP-008: 42 px cells at 360**
- Severity: P3.
- Accepted as declined. Closed.

**Closed:** SP-001 to SP-006, SP-008 (accepted), SP-009, SP-010, SP-012.

## G. H1–H5
- **H1 (deduction over luck):** supported by simulation on all T2 levels.
- **H2–H5:** still need human playtests.

## H. Playtest readiness
- **Ready now for an internal portrait playtest.** No input bugs remain, and play is accurate at 42 px.
- **External or public release:** needs Burak's originality decision and the SP-007 perf fix.

## I. Artifacts
- `data/`: levels_r2.json, o_levels_r2.txt, o_depth_r2.txt, o_policies_r2.txt, o_r2_mistap.txt, o_r2_perf1/2.txt, o_r2_perf_r1build.txt, o_layout_r2.txt, o_bubble_r2.txt, o_play_r2_*.txt, o_r2_dbl_*.txt, o_r2_edge.txt, o_r2_extra.txt.
- `shots/` (81 files), notably m360_P_07_L12_win.png and land844_L_02_L12.png.
- Tools: `tools/spillproof/` (r2depth.mjs, r2mistap.mjs, plus the existing ones).
