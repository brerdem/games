# GF-20261024-01 — Shish Lane — Brief amendment v1.1

Date: 2026-10-24 (Europe/Istanbul) · Amends brief v1 (`2026-10-24-shish-lane-BRIEF.md`) · Pack: `sim/shish-lane/pack_v1_1.json`
Scope: **only** (1) the undo clarification and (2) the L7 replacement (QA SL-002). Every other rule, level and section of v1 is unchanged.

## 1. Undo clarification (confirmed)
- Budget = tickets + 2 skewers.
- Each served ticket costs 1 skewer. **Undo returns the food and the ticket but not the skewer**. The undone serve's skewer is not refunded, and undo makes no extra charge. **Net cost of an undo = 1 skewer.**
- So a level allows at most 2 undos and can still be cleared. ★★★ = 0 undos, ★★ = 1, ★ = 2 (as in v1 §H).
- All [SIM] numbers below use this model: exact recursion (no sampling), moves de-duplicated by cell set, ties split uniformly, probe = undo plus ban of the fatal thrust, max 2.

## 2. L7 replacement (SL-002)
Old L7 (`ACCCACcCCCCAACCACACbCCAAC`) has an exact RAND+probe of 17.4%, over the 16% limit. It is retired and kept in `7_alts[0]` of the pack.

**New L7** 5x5 · 1 coal · 2 slabs · tickets ABA, ACA, ACB, BCB, CABC, CACC, CBCC · budget 9 skewers
```
CCBCC
#CBcA
BACAB
CBABC
ACcAA
```
Reference line: B3:ABA L3:CABC T1:CACC L0:CBCC R1:ACB L2:BCB L4:ACA

| Metric [SIM, exact] | New L7 | Old L7 | Target |
|---|---|---|---|
| RAND+probe | **9.3%** | 17.4% | ≤16 (ideally ≤14) ✓ |
| RAND | 0.9% | 2.8% | — |
| Lazy max (all 16 lazy policies, plain and +probe) | **21.3%** (MINDIS+probe) | 29.0% | ≤30 ✓ |
| Coal load-bearing | without coal, lazy max 57.7% | (no coal) | required ✓ |
| Slab load-bearing | unsolvable without slabs | without slabs, lazy max 100% | required ✓ |
| Safe openings | 1/6 | 2/11 | — |
| Fatal share (reference path) | 0.333 | 0.325 | — |
| Solutions / states | 24 / 91 | 28 / 218 | — |
| Non-isomorphic to L1–L6, L8–L11 | yes | — | ✓ |

Curve: lazy max goes L6 37.2 → **L7 21.3** → L8 14.3, which is monotone. L7's RAND+probe (9.3) sits between L5 (30.0) and L8 (7.1). L11 is still the hardest level on lazy max (8.2) and on RAND+probe (1.5).
Teaching: L7 is still the first slab level, so the slab card stays at L7. Coal returns from L5 as a stopper on row 1.

### Exact odds, all levels, v1.1 pack (%) [SIM]
The table shows RAND and every +probe policy. The plain (no-undo) policies are never higher than their +probe version; the full 18-column rows are in `sim/shish-lane/exact_odds_v1_1.txt`.

| L | RAND | RAND+probe | PLY1+probe | COVER+probe | MINDIS+probe | LONG+probe | SHORT+probe | ROWS+probe | COLS+probe | PLY2+probe | lazyMax | lazyMaxBy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 70.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | PLY1,PLY1+probe,COVER,COVER+probe,MINDIS,MINDIS+probe,LONG+probe,SHORT+probe,ROWS+probe,COLS,COLS+probe,PLY2,PLY2+probe |
| 2 | 8.3 | 51.1 | 0.0 | 83.3 | 46.7 | 51.1 | 51.1 | 66.7 | 66.7 | 50.0 | 83.3 | COVER+probe |
| 3 | 5.6 | 50.0 | 75.0 | 75.0 | 65.6 | 50.0 | 50.0 | 50.0 | 50.0 | 83.3 | 83.3 | PLY2+probe |
| 4 | 6.2 | 37.5 | 0.0 | 0.0 | 0.0 | 37.5 | 37.5 | 75.0 | 0.0 | 50.0 | 75.0 | ROWS+probe |
| 5 | 5.0 | 30.0 | 0.0 | 0.0 | 50.0 | 30.0 | 30.0 | 50.0 | 0.0 | 75.0 | 75.0 | PLY2+probe |
| 6 | 0.1 | 2.1 | 0.0 | 0.0 | 0.0 | 0.4 | 0.4 | 0.0 | 37.2 | 0.0 | 37.2 | COLS+probe |
| 7 | 0.9 | 9.3 | 0.0 | 10.0 | 21.3 | 0.0 | 13.3 | 0.0 | 0.0 | 0.0 | 21.3 | MINDIS+probe |
| 8 | 0.8 | 7.1 | 0.0 | 0.0 | 0.0 | 7.1 | 7.1 | 0.0 | 14.3 | 0.0 | 14.3 | COLS+probe |
| 9 | 0.6 | 9.0 | 0.0 | 3.3 | 0.0 | 1.2 | 13.8 | 0.0 | 0.0 | 5.6 | 13.8 | SHORT+probe |
| 10 | 0.5 | 7.5 | 5.6 | 16.7 | 0.0 | 1.7 | 1.1 | 0.0 | 2.8 | 10.0 | 16.7 | COVER+probe |
| 11 | 0.1 | 1.5 | 1.7 | 8.2 | 0.0 | 0.0 | 0.3 | 0.0 | 0.0 | 0.0 | 8.2 | COVER+probe |

Known, unchanged by this amendment: L6's RAND+probe (2.1) is lower than L7–L10's, and L10's lazy max (16.7) is above L9's (13.8). Both levels are untouched. The brief's v1 sampled figures (N=300) are superseded by these exact values.

Sources: `sim/shish-lane/exact.py` (exact odds; reproduces the QA `o_odds2.txt` values for the v1 pack), `search_l7.py`, `l7_cands.json` (15 qualifying candidates).
