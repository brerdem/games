# GF-20261026-01 — Whisk Away — Brief amendment v1.1
Date: 2026-10-26 (Europe/Istanbul). Replaces only the items below; everything else in brief v1 is unchanged. Pack: `sim/whisk/pack_v1_1.json` (built by `sim/whisk/pack11.py`, metrics `sim/whisk/m11.py`). All odds are **[SIM]**, exact enumeration over every reachable state, budget par+2 (no Monte Carlo).

## WA-002 — rule text (replaces the whip bullet in section F)
- **Whip:** a gesture classified as a whip (release speed ≥ 1.0 px/ms along the pull direction **and** touch duration ≤ 250 ms; or a double-tap) is a **pure whip**: it spends exactly 1 move, and **no snapped pulls from the same gesture are committed**, however far the finger travelled before release. The rubber-band/snap preview during the gesture is cosmetic only. Pulls commit only from a gesture that is *not* classified as a whip.
- Sim: `core2.py` already models moves as atomic `('d',c)` pull-1 or `('w',c)` whip; there is no combined pull+whip move, so the pack's state graphs, pars and odds already match this rule.

## New L7 (replaces v1 L7; QA WA-004) — generator seed 110060
- Cloths (c0 bottom → top): c0 (2,0) 3×2 N; c1 (1,1) 4×2 S; c2 (1,4) 4×2 N; c3 (0,1) 2×4 E
- Dishes A(2,5) B(3,4) C(4,4) → marks a(2,3) b(3,2) c(4,2)
- Par 7 / budget 9 · reachable states 14,470 · **winnable 29.75%** of states · optimal lines 96
- Openings 7: **4 good** (2 keep par), 3 fatal
- Visible cells per cloth 3/6/7/8
- Both verbs required: pulls-only unsolvable, whips-only unsolvable
- Without the lane rule: par 6, lazy 100% (so the lane is load-bearing). Without carry: unsolvable.
- Reference: drag c0, whip c0, whip c1, whip c3, drag c2, drag c2, whip c2

## New L10 (replaces v1 L10; finale) — generator seed 121131
- Cloths: c0 (0,2) 4×4 N; c1 (1,2) 2×4 S; c2 (1,1) 4×2 N
- Dishes A(3,1) B(0,5) → marks a(3,0) b(0,1)
- Par 10 / budget 12 · reachable states 1,308 · **winnable 24.16%** · optimal lines 293
- Openings 6: **3 good** (2 keep par), 3 fatal
- Visible cells 7/6/8
- Both verbs required (pulls-only and whips-only both unsolvable)
- Without carry: par 7, 100% (load-bearing). Without the lane rule: par 10, 0.1% (lane not load-bearing here, as in v1 L10).
- Reference: drag c0, drag c1, drag c0, drag c1, drag c0, drag c1, drag c0, whip c0, whip c1, whip c2
- Still strictly the hardest: highest par (10 vs ≤ 8) and lowest random clear rate (0.048% vs ≥ 0.76%)
- It has 3 cloths (the rest of stage 3 uses 4); its difficulty comes from interleaving the opposed c0/c1 pulls.

## Odds table v1.1 (exact, %, budget par+2)
Greedy = Manhattan×2 + cloths left (sim/builder weighting). Greedy* = Manhattan + cloths left (brief wording). 2-ply variants use the same scores. "Lazy max" = the highest of all 7 policies; the column names the policy, which corrects v1's labels: v1 L1–L4 and L7 were not random rates (v1 L7's 20.8 was 2-ply greedy; random was 0.2).

| L | Par | States | Winnable % | Good / fatal openings | Random | Greedy | 2-ply | Greedy* | 2-ply* | Pulls-first whip-late | Whip-first | Lazy max (policy) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 6 | 33.33 | 1/1 | 50.0 | 100 | 100 | 100 | 100 | 100 | 100 | 100 (greedy, tutorial) |
| L2 | 3 | 10 | 40.00 | 1/1 | 12.5 | 100 | 100 | 25.0 | 100 | 100 | 0 | 100 (greedy, tutorial) |
| L3 | 5 | 164 | 10.37 | 2/2 | 3.1 | 100 | 100 | 50.0 | 55.6 | 100 | 0 | 100 (greedy, tutorial) |
| L4 | 5 | 212 | 3.30 | 2/2 | 1.2 | 16.7 | 50.0 | 8.3 | 33.3 | 0 | 0 | 50.0 (2-ply greedy, teaching) |
| L5 | 5 | 602 | 80.90 | 2/2 | 20.2 | 0 | 0 | 0 | 0 | 0 | 0 | 20.2 (random) |
| L6 | 6 | 6,488 | 53.73 | 6/1 | 15.8 | 0 | 0 | 0 | 0 | 0 | 0 | 15.8 (random) |
| **L7 new** | 7 | 14,470 | 29.75 | 4/3 | 1.3 | 0 | 0 | 0 | 0 | 0 | 0 | 1.3 (random) |
| L8 | 7 | 19,356 | 75.91 | 6/1 | 5.5 | 0 | 0 | 0 | 0 | 0 | 0 | 5.5 (random) |
| L9 | 8 | 1,344 | 22.99 | 2/4 | 0.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0.8 (random) |
| **L10 new** | 10 | 1,308 | 24.16 | 3/3 | 0.05 | 0 | 0.09 | 0 | 0 | 0 | 0 | 0.09 (2-ply greedy) |

Caps on L5–L10: random ≤ 21% (max 20.2, L5), every greedy variant incl. 2-ply ≤ 5% (max 0.09, L10). This tightens v1 M8: 2-ply greedy is now ≤ 5% on L5–L10, not ≤ 21%. Par curve: 5, 5, 6, 7, 7, 8, 10.
- M9 now reads: L10 is strictly hardest on par (10 vs ≤ 8) and random (0.05% vs ≥ 0.76%). The v1 "reachable states" measure no longer applies (L10 has 1,308 states).
- Solver bound in K/L: ≤ 19,356 states.
