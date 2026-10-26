# GF-20261026-01 — Whisk Away — Brief amendment v1.2 (L7 only; QA WA-011)
Date: 2026-10-26 (Europe/Istanbul). Changes only L7. Everything else in v1.1 (`whisk-away-BRIEF-v1.1.md`) stays the same, including the WA-002 rule, L10 and all other levels. Pack: `sim/whisk/pack_v1_2.json` (built by `sim/whisk/pack12.py`). Visibility check: `sim/whisk/wa011.py`. All odds are **[SIM]**, from an exact enumeration with budget par+2.

## Why: WA-011
I checked every one of v1.1 L7's 96 optimal (par 7) lines (seed 110060) using the core2 rules. Off-table means part of the cloth's rect is outside the 5×6 board. Hidden means every on-board cell is covered by a higher present cloth. **0 of the 96 lines** avoid acting on such a cloth. Every line acts on c0 or another cloth while it is off the table. So redrawing alone cannot give the level a clean intended solution, and L7 is replaced.

## New L7: generator seed 112345
- Cloths, bottom (c0) to top: c0 at (0,2) 3×2 pulls N; c1 at (1,4) 3×2 N; c2 at (1,2) 4×3 S; c3 at (0,0) 2×2 W
- Dishes A(0,1), B(4,3), C(4,4) go to marks a(0,3), b(4,4), c(4,5)
- Par 7, budget 9. 7,263 reachable states. **Winnable from 16.04%** of states. 140 optimal lines.
- **87 of 140 optimal lines never act on a cloth while it is off-table or hidden.**
- Openings: 7. **5 are good** (4 keep par) and 2 are fatal.
- Visible cells per cloth: 2/3/12/4
- Both moves are required: pulls-only and whips-only are both unsolvable.
- Without the lane rule the level is still par 7 at 1.6% (the lane is not load-bearing here; it was in v1.1 L7). The level is unsolvable without carry.
- Reference line (clean): whip c0, drag c1, whip c1, drag c2, drag c2, whip c2, whip c3

## Odds-table row (replaces the v1.1 L7 row)
| L | Par | States | Winnable % | Good / fatal openings | Random | Greedy | 2-ply | Greedy* | 2-ply* | Pulls-first whip-late | Whip-first | Lazy max |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **L7 v1.2** | 7 | 7,263 | 16.04 | 5/2 | 1.6 | 0 | 0 | 0 | 0 | 0 | 0 | 1.6 (random) |

v1.1 targets still hold. Random on L5–L10 is at most 21% (max 20.2, L5). Every greedy variant is at most 5% (max 0.09, L10). Par curve is unchanged: 5, 5, 6, 7, 7, 8, 10. L10 is still strictly the hardest: par 10 vs at most 8, random 0.05% vs at least 0.76%. The solver bound of at most 19,356 states (L8) is unchanged.
