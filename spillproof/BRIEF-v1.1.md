# Spillproof (GF-20261020-01): brief amendment v1.1 (CONDITIONAL)
*Game Finder · 2026-10-21 (UTC+3) · Supersedes nothing until Burak chooses to run another cycle. Base: `2026-10-20-spillproof-BRIEF.md` (v1, also at repo `spillproof/BRIEF.md`).*

## Why this exists
Game Tester's final cycle (R2 plus addendum, 2026-10-20 14:08–14:35 UTC+3; `/workspace/game-tester/reports/spillproof/QA_REPORT.md`) scored **77/100, REVISE**, with these findings:
- No build defects above P3 remain. SP-007 (perf) is fixed at commit `64c26ca`: 55–60 fps under 4× slowdown.
- Burak **waived the originality gate** (SP-011). The points still stand at 5/10.
- The remaining shortfall is design-level:
  - originality 5/10 (waived as a gate, not as points);
  - hook 10/15 (heuristic, untested with humans);
  - progression 11/15 — **SP-013, "the finale is not the hardest level"**: L12 needs 2 what-if rounds, like L10/L11, has the most easy openings (16), and has a smaller search space than L11.
- The tester's recommendation is a human decision (extend the waiver, or run human playtests H2–H5). The revision cycles are used up.

Only SP-013 is a concrete design weakness with a testable fix. Hook and originality cannot be fixed by spec without changing the game the waiver was granted for. I am therefore **not** changing the core rules, and not proposing a new mechanic.

## What changes (v1 → v1.1), only if Burak authorizes one more build cycle
1. **L12 "Grand Cistern" is replaced by a strictly-hardest finale.** Generate it with the existing builder generator and filters, then select a level that meets all of the following:
   - **Depth:** at least 3 sequential what-if rounds by the tester's `r2depth.mjs` measure, i.e. strictly more than every other level (L10 and L11 need 2).
   - **Openings:** easy starting deductions ≤ the lower of L10's and L11's counts (by the tester's count; the current L12 has 16, against 9–15 for the other levels).
   - **Search space:** the largest raw search space in the ladder (> L11's 149M).
   - **Unchanged guards:** a unique solution, solvable with 0 guesses by the full solver, all 3 pipes necessary (P2), and the SP-001 thresholds (single-line plus guess: 3★ ≤ 5%, clear ≤ 25%; counting and random lose).
   - **Not isomorphic** to any L1–L11 under the 8 rotations/reflections (SP-012 check).
2. **If no such 8×8 level is found** within the generator's budget, *swap the order* of L11 and L12 when that makes the last level hardest on at least two of the three measures (depth, openings, search space). Report which measures hold in BUILD_NOTES.
3. **Nothing else changes:** rules, UI, hints, pipes, Pressure Rush, levels L1–L11, and perf settings (DPR cap 1.5) stay as in `64c26ca`.

## New hypothesis
- **H-P (progression):** a finale needing 3 what-if rounds gives a felt difficulty peak and a stronger completion payoff, lifting the tester's Progression score from 11 to ≥ 12 without any build risk elsewhere.
- **Hook (H2–H5)** remains a human-playtest question. Recommended protocol (no build change):
  - 5 internal portrait players, L1–L12, think-aloud;
  - measure voluntary "one more level" at L6 and L12;
  - measure median attempts on L7–L12;
  - ask "favourite moment" (looking for Pressure Rush cascades).

## Acceptance (for Game Tester)
- L12 meets item 1, or item 2 is applied with the measures reported.
- Re-run the SP-001 policies and the SP-012 duplicate check on the shipped `levels` data.
- No regressions in the R2-addendum touch/overlay/landscape/perf checks.

## Status
- Conditional proposal only. I have not sent it to anyone.
- Spillproof's waiver/playtest decision belongs to Burak. This amendment authorizes no production, Unity or native work.
