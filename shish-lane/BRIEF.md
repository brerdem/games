# GF-20261024-01 — Shish Lane — Game Design Brief v1

Date: 2026-10-24 (Europe/Istanbul) · Brief version v1 · Slug `shish-lane` · Author: Game Finder
Evidence labels: **[OBS]** observed today with a source; **[SIM]** rule-sandbox result (simulation, not players); **[HYP]** design hypothesis.

## A. Concept Identity
- **ID / title:** GF-20261024-01 · *Shish Lane* (working title)
- **Genre:** deterministic ordering puzzle (food theme), hypercasual-to-hybridcasual
- **Audience:** sort/jam puzzle players (Skewer Jam, Foodie Sizzle, Arrows, Rotate Rings audience), 25–55, short sessions
- **Target:** mobile iOS + Android · **Prototype:** web in the browser · **Orientation:** portrait
- **Pitch:** Swipe a skewer in from any edge of the grill and it spears the first four foods in its lane, but the kebab has to match an open order exactly, so every thrust you make changes the lanes left for the next one.
- **USP:** the lane is the move. A skewer enters from one edge and takes the first ≤4 foods in a straight line (gaps skipped). It stops at hot coal, and a side-lying *slab* can only be speared along its length. One swipe removes a whole line of food and opens new lanes, so the order you serve tickets in is the whole puzzle. There is no sorting between containers and no free moves.

## B. Market Research
All observed 2026-10-24, 07:04–07:52 UTC+3, by this morning's run (raw files `raw/gp_reviews_1024.txt`, `raw/itunes_kebab_1024.txt`, `snapshot_2026-10-24.md`), plus one web search at ~16:55 UTC+3.

| Reference | Developer | Evidence | Mechanic | Lesson |
|---|---|---|---|---|
| Foodie Sizzle (`com.abi.skewer.sort`) https://play.google.com/store/apps/details?id=com.abi.skewer.sort | ABI | [OBS] Google Play install band 10M+, 4.4★, updated 2026-10-22 | Skewer/grill sort under a timer | The skewer-food theme scales. Reviews complain about the timer, ads and new content arriving "way too fast". |
| Skewer Jam: Food Sort (`com.ig.skewer.jam.food.sort`) https://play.google.com/store/apps/details?id=com.ig.skewer.jam.food.sort | — | [OBS] 1M+, 4.4★ | Skewer sort | Reviews: "after about level 90 … impossible otherwise", "designed to lose". Players resent forced fails. |
| Grill Sort™ (iOS) | Gloryway Puzzle | [OBS] 14,350 US App Store ratings (iTunes search) | Grill/food sort | Another sizeable grill-food sort title |
| Arrows – Puzzle Escape (`com.ecffri.arrows`) https://play.google.com/store/apps/details?id=com.ecffri.arrows | — | [OBS] 100M+; #9 Google Play US GAME_PUZZLE top-free order | Line-direction clear | Clearing whole lines from the edge reads instantly. Review: "nightmare level is just a lot of lines … cleared really fast". Depth is missing. |
| Rotate Rings (`com.nebula.rotaterings`) | Nebula Studio | [OBS] #7 iOS US Top Free Games, #1 Google Play US puzzle order | Deterministic puzzle | Deterministic, readable puzzles are charting now. Review: "impossible without burning a special option" around L160. |

- **Market signals [OBS]:** the top of the puzzle charts is full of deterministic sort/jam/line puzzles (Meowdoku #1, Block Out, Magic Sort, Sand Blocks, Rotate Rings, Bus Fever, Colony Flow on iOS US top free). Skewer-food sorters are already in the 1M–10M+ install bands on Play.
- **Opportunity [HYP]:** the review complaints repeat across these games: forced fails, timers, power-ups as the only way through, and "lots of lines" that are still easy. A fair, timer-free, filtered puzzle in a proven food theme answers those complaints directly.
- **Adjacency flagged for human review:** *Skewer Time* (Chongda Ltd; "drag to aim and release to pierce pieces in one continuous path", https://a01.meta00s.com/share/p/skewer-time, found by web search, not played) and *Cook Line* (one-stroke path collecting order foods, https://airyarcade.com/games/cook-line/). Shish Lane's rules (straight edge lanes, a first-4 cap, exact ticket match read either way, coal stops, axis-locked slabs, a single skewer budget) are original, but the "pierce food to fill an order" fantasy is shared.
- **Uncertainties:** install bands are Google Play ranges, not downloads or revenue. No paid analytics. The only Skewer Time evidence is one store-mirror page. Reddit, SteamDB, Appfigures and Newgrounds were blocked and not retried.

## C. Core Gameplay Concept
- **Player controls:** a skewer, by swiping inward from any of the four edges along a row or column (lane).
- **Rules:**
  1. The skewer travels along the lane and takes the first foods it meets (empty cells skipped), up to **4**.
  2. It stops early at **coal** (#), at the far edge, or (column thrusts only) at a **slab**. A slab lies along its row: a row thrust spears it, and a column thrust stops in front of it without taking it.
  3. The speared sequence must exactly equal an **open ticket**, read in either direction. If it does, the foods leave the board and the ticket is served. If not, the thrust is **previewed and rejected for free** (the skewer slides back, and no budget is spent).
  4. **Budget = tickets + 2 skewers.** Each served ticket costs 1. **Undo** returns the food and the ticket but not the skewer (it costs 1).
  5. **Stuck banner:** when no remaining sequence can serve every ticket, a banner says so. This is exact (solver-backed) and appears after the thrust that caused it.
- **Win:** every ticket served. **Fail:** budget empty with tickets left.
- **Structure:** level-based, 11 hand-checked levels in the MVP.
- **Improvement:** reading which lanes a thrust opens or ruins, protecting the long tickets, and using coal and slabs as stoppers that shorten a lane on purpose.
- **Why fun [HYP]:** one swipe makes a big, satisfying removal ("shhhk" plus a full kebab). Every thrust changes four or more lanes, so you plan two moves ahead without any hidden information.

## D. First 10 Seconds
A 4x3 grill with two foods (tomato red, pepper green) and four tickets on a rail above. A ghost skewer pulses at the left edge of row 2 and lines up with the matching ticket. The player swipes, the skewer spears AAB, the ticket stamps SERVED, and the foods slide off. Curiosity: the next lane now holds a different sequence. L1 is a 100%-safe opening (all 4 openings are safe) [SIM], so nobody fails in the first ten seconds. The coal and slab rules are each introduced by a one-line contextual card the first time they appear (L5 coal, L7 slab).

## E. Signature Gameplay Moment
The **long lane after a clear**. Serving a short ticket empties cells, so the next thrust in a crossing lane slides through the gaps and spears four foods from far away, finishing a CCCC or AABB order in one swipe. Then the board drops a whole stripe. In the finale (L11) the reference line ends on chains like this, opened by coal and slab stops [SIM: reference lines in §I].

## F. Controls and Interaction
- **Swipe** that starts within 28 px outside or inside the grill edge, along a row or column: thrust in that lane. The direction is decided after 12 px. The lane highlights while you drag.
- **Hold-drag preview:** while dragging, the cells that will be speared glow and the would-be sequence appears on the skewer. Release past 40% of the cell width to commit. Drag back to cancel (free).
- **Mismatch:** the skewer slides back with a soft clunk and the ticket rail shakes. Nothing is spent.
- **Undo** button (bottom left), confirm-free, costs 1 skewer, shows "−1".
- **Touch targets:** each lane end has a ≥44 px hit zone (edge gutter 44 px). Minimum cell 48 px on a 390 px wide frame (6 columns).
- **Accessibility:** every food has a distinct shape (round tomato, square pepper, triangle onion) as well as a distinct colour. Slab = elongated horizontal shape with a ⟷ mark. Coal = dark tile with glowing embers.
- **Desktop:** click-drag from the edge. Arrow keys plus WASD select a lane, and Enter thrusts.

## G. Visual and Audio Direction
- **Style:** top-down charcoal grill, flat-shaded vector food with a thick 3 px dark outline. The grill grate lines double as lane guides.
- **Palette:** dark grate (#2B2522) background. Foods are saturated: tomato #E8483B, pepper #4DB34A, onion #F2C14E. Coal has ember orange #FF7A1A glow. Contrast between foods and the background is ≥ 4.5:1.
- **Camera:** fixed, full board visible, no zoom (this answers the Arrows review complaint about zooming).
- **Animation:** the skewer is a long steel pin that slides in at 900 px/s with an ease-out stop. The foods it spears snap onto it with an 80 ms stagger, so it reads like a "thunk-thunk-thunk". The full kebab then flies to its ticket.
- **Particles:** a sizzle puff on serve, ember sparks when the skewer stops at coal.
- **Audio:** pierce "tk" pitched up per item. Serve = sizzle plus a bell. Mismatch = a dull wooden knock. Stuck = a low hiss as the grill cools.

## H. Game Feel
- **Primary:** the lane preview lights up within 1 frame, and the commit animation runs ≤ 350 ms so the next move isn't blocked.
- **Success:** ticket stamp with an overshoot scale (1.0→1.15→1.0, 180 ms).
- **Combo:** 4-item kebabs give an extra "full skewer" flourish (the pin glints).
- **Impact:** the skewer recoils 4 px when it hits coal or a slab end.
- **Mistake:** a mismatch is free, with a shake only. A fatal thrust (the stuck banner) dims the board and highlights Undo (−1).
- **Level complete:** the grill wipes clean, the remaining skewers count up as stars (★★★ = 0 undos, ★★ = 1, ★ = 2).
- **Restart:** instant, ≤ 200 ms fade, budget fully restored.

## I. Gameplay Progression (sample stages; full pack below)
1. **L2 – Crossing lanes (4x4, 5 tickets):** you learn that a row thrust changes column contents. Only 2 of 6 openings are safe [SIM].
2. **L7 – Slabs (5x5, 7 tickets, 2 slabs):** columns stop at slabs, so the same food is reachable from only two sides. Removing the slabs makes lazy play clear 100% (with slabs 25.3%) [SIM]. The slabs are load-bearing.
3. **L11 – Finale (6x6, 10 tickets, 2 coal, 3 slabs):** coal splits rows into short lanes, and slabs gate the columns. The level is unsolvable without its coals [SIM]. It is the strictly hardest level in the pack on lazy-clear rate, random+probe clear, fatal-move share and state count.

## J. Replayability
Star mastery (0 undos), fastest clear, and multiple valid solutions per level (2–76 [SIM]) for different approaches. Future: a daily generated grill (filtered by the same sandbox) and new food behaviours (see K).

## K. MVP Scope
- **Essential:** the rules in C. The 11 levels below, exactly as given (no regeneration). Free mismatch rejection, a budget of tickets+2, undo costing 1, the exact stuck banner, drag preview, stars, restart, and a level select. **No hint in the MVP** (see N, hint fishing).
- **Optional:** sound, the ember and sizzle particles, a level-complete stat card.
- **Future (not authorised now):** daily grill, new pieces (e.g. sauce that dyes the next item), cosmetics, live-ops. **No production, Unity or native work is authorised.**
- **Permitted simplifications:** emoji or simple shapes for food, no physics, CSS or Canvas animation.
- **Must not be compromised:** the first-≤4-in-lane spearing, exact ticket match read either way, coal/slab stop rules, the single skewer budget with undo = 1, the exact stuck banner.

## L. Technical Considerations
- Canvas 2D or Phaser 3. Pure grid logic, no physics library.
- Port `sim/shish-lane/lib.mjs` (lanes, legal, solver). It is fidelity-tested against the Python sandbox: **400 cases, 1,321 legal thrusts, 0 mismatches** [SIM, re-run 2026-10-24 ~17:05 UTC+3].
- The stuck banner uses a memoised DFS. The largest state space in the pack is 549 states (L11), so it runs in microseconds.
- State: board string, open-ticket multiset, skewers left, undo stack. Save per-level stars in localStorage.
- Tests: assert each level's reference line clears with 0 undos, that the stuck banner fires on a known fatal thrust, and that mismatch costs 0.
- Easy to port to Unity (deterministic grid).

## M. Acceptance Criteria
**Objective (builder plus tester):**
1. Every level L1–L11 is clearable by its reference line with ★★★.
2. A mismatched thrust never changes the budget, board or tickets.
3. Undo restores the board and ticket and reduces skewers by exactly 1. Restart restores the full budget.
4. The stuck banner appears iff the solver says the state is unsolvable (spot-check ≥ 20 states, including each level's start).
5. A column thrust stops at a slab without taking it, and a row thrust spears it. Any thrust stops at coal.
6. Touch: every lane end can be hit at 390x844 with ≥ 44 px zones. No accidental thrust on taps < 12 px.
7. 60 fps on a mid-range phone, commit animation ≤ 350 ms.
8. Levels match the shipped pack exactly (the 11 boards are pairwise non-isomorphic [SIM]).

**Degenerate strategies that must fail (sandbox numbers to re-verify in browser QA) [SIM]:** from L7 on, every lazy policy, with or without undo probing, clears ≤ 30% (measured max 25.3%). Random + probing clears ≤ 16% on L7–L11 (measured max 15.3%). L11 is strictly hardest on ≥ 2 measures (it is on 4).

**Subjective hypotheses (need humans):** H1: the rules are understood without text by L3. H2: the long-lane moment feels satisfying. H3: players plan ≥ 2 thrusts ahead from L6. H4: failures feel fair (no "designed to lose" feeling).

## N. Design Risks and Experiments
| Risk | Experiment |
|---|---|
| **Hint fishing:** [SIM] a single safe-move hint spent at the best moment lets lazy play clear 30.5–100% (100% on L8 and L10, 78% on L7) | No hint in the MVP. Future hint = reveal one *fatal* lane only, and forbid stars, then re-measure ≤ 60%. |
| Difficulty curve not monotone (L9 14.0% / L10 15.3% lazy are easier than L8 13.0%) | The tester judges the perceived order. If needed, swap L8↔L10. |
| Mid-level 12 missing (generator found no finale meeting the target in 200 s) | Ship 11. Generate L12 in a later run. |
| Theme adjacency (Skewer Time, Cook Line, skewer sort) | Originality review by Burak. Prototype art should avoid sort-game skewer racks. |
| Lane swipes misread on small screens | Tester measures misfires per 100 swipes (target < 3). |
| Repetitive in long run | Test whether new pieces add depth in a future sandbox before adding them. |
| Readability of slabs | Shape test: 5 players identify slab vs normal food in < 2 s. |

## O. Concept Score
| Criterion | Max | Score | Reason |
|---|---|---|---|
| Core gameplay & fun | 25 | 19 | Big satisfying removal per swipe. Sandbox shows real order dependence (L7–L11 lazy ≤ 25.3%, fatal share 0.32–0.44). Feel is untested by humans. |
| Originality | 20 | 12 | Rules are original and not a named puzzle genre. But the skewer theme is crowded, and Skewer Time shares the pierce fantasy. |
| Market evidence | 20 | 15 | Skewer-food sorters at 1M–10M+ Play installs, line-clear Arrows 100M+, deterministic puzzles charting today. No revenue data. Adjacency evidence is thin. |
| Web MVP feasibility | 15 | 14 | Pure grid logic, a fidelity-tested JS solver, 11 ready levels. |
| Mobile controls | 10 | 9 | One swipe per move, free preview and cancel. Edge gutters need tuning. |
| Production & commercial | 10 | 7 | Food theme suits cosmetics and daily grills. Hint and booster monetisation is constrained by hint fishing. |
| **Total** | 100 | **76** | **Promising (70–84). Confidence: medium-low.** Recommend a web prototype and tester round. Not production. |

## Level pack (exact; `sim/shish-lane/pack_final_11.json`)
Legend: A/B/C = foods (tomato/pepper/onion), lowercase = slab of that food, # = coal, . = empty. Lane notation: L/R = from the left/right edge of row n, T/B = from the top/bottom of column n (0-based).

**L1** 4x3 · tickets AAB, BAB, BAB, BBB · budget 6 skewers
```
BBBB
AAAB
ABBB
```
Reference line: T0:AAB T1:BAB T2:BAB T3:BBB

**L2** 4x4 · tickets AAB, AAB, ABA, ABAB, ABB · budget 7 skewers
```
ABAB
BABA
AAAB
BABA
```
Reference line: L3:ABAB T2:ABA L0:ABB L1:AAB L2:AAB

**L3** 5x4 · tickets AAA, AAC, BAC, BAC, BBCB, BCBC · budget 8 skewers
```
CCBAC
AAAAA
ABBCB
BBCBC
```
Reference line: R2:BBCB T1:BAC L3:BCBC T0:AAC L0:BAC L1:AAA

**L4** 4x5 · tickets ABA, ABC, ACBB, BABB, BBC, BCB · budget 8 skewers
```
BBAB
BABB
CBBB
ABCC
BCAA
```
Reference line: L1:BABB T3:ACBB L3:ABC T0:BCB T1:BBC T2:ABA

**L5** 5x5 · tickets AABB, ACC, BAB, BBB, BBBC, BBCB, CAC · budget 9 skewers
```
CCAA#
CBAAC
BBBAB
BCBBC
BBBBB
```
Reference line: B1:BBCB L3:BBBC T2:AABB L0:ACC L1:CAC L2:BAB L4:BBB

**L6** 5x5 · tickets ACB, BACB, BBBC, BBCB, BCC, CBC, CBCC · budget 9 skewers
```
BCCBC
BCBCC
BBACB
CCCAB
BBCBB
```
Reference line: T0:BBBC T1:CBCC L2:ACB T3:BACB L4:BBCB T2:CBC T4:BCC

**L7** 5x5 · tickets AAC, AACC, ACC, BCC, CAAC, CACC, CCCC · budget 9 skewers
```
ACCCA
CcCCC
CAACC
ACACb
CCAAC
```
Reference line: R4:CAAC T2:AACC L1:CCCC L2:CACC T0:AAC L0:ACC L3:BCC

**L8** 5x6 · tickets AAAB, AABB, ABBB, ACCC, BACB, BCCB, CCCC · budget 9 skewers
```
AB#CB
BBAAA
ACCCC
AACCC
BBCCB
#ABBB
```
Reference line: R5:ABBB B2:ACCC L1:AABB T0:AAAB T1:BACB T3:CCCC T4:BCCB

**L9** 6x6 · tickets AAB, AAB, ACAC, ACAC, ACB, ACBC, ACC, BABC, BAC, CACC · budget 12 skewers
```
CACAAA
AAaCCB
CACABC
BCCCAC
ABACBA
BC#bAC
```
Reference line: R3:CACC R5:BAC B0:BABC T3:ACAC L2:ACBC T4:ACB L0:ACAC L4:AAB T1:ACC L1:AAB

**L10** 5x6 · tickets AAB, AABB, ABAC, ACB, BAAC, BCAC, BCBC, CBC · budget 10 skewers
```
CCBCB
AABaC
#CBBC
BCBAC
AAAAb
ABACB
```
Reference line: B2:AABB R2:CBC L3:BCAC T1:BAAC L0:BCBC L1:ABAC L4:AAB L5:ACB

**L11** 6x6 · tickets AAA, AAB, AAB, AABA, AABB, AABB, ABCC, ACA, ACB, CAC · budget 12 skewers
```
AAABCC
AAAACA
BAAABB
bbBBaA
A#CAAC
A#BACA
```
Reference line: R2:AABB T1:AAA B3:AABA R4:CAC R5:ACB T2:AAB L0:ABCC L1:ACA L3:AABB T0:AAB

## Sandbox results (N=300 runs per policy, seed 11; probes = undo costing 1 skewer, max 2)
| L | Size | Tickets | Coal | Slab | Lazy max (no hint) | Strongest lazy policy | RAND | RAND+probe | Best hint-timed policy | Fatal share | Solutions | States | Safe openings | Coal/slab load-bearing |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4x3 | 4 | 0 | 0 | 100.0% | SHORT+probe | 69.7% | 100.0% | 100.0% | 0.100 | 24 | 24 | 4/4 | – |
| 2 | 4x4 | 5 | 0 | 0 | 83.7% | COVER+probe | 5.7% | 51.3% | 100.0% | 0.317 | 12 | 77 | 2/6 | – |
| 3 | 5x4 | 6 | 0 | 0 | 80.0% | PLY2+probe | 5.7% | 50.3% | 100.0% | 0.306 | 2 | 35 | 1/3 | – |
| 4 | 4x5 | 6 | 0 | 0 | 73.0% | ROWS+probe | 7.3% | 41.7% | 100.0% | 0.264 | 6 | 44 | 1/6 | – |
| 5 | 5x5 | 7 | 1 | 0 | 60.0% | PLY2+probe | 5.0% | 32.3% | 100.0% | 0.221 | 24 | 77 | 1/5 | coal: lazy max 0.707 without (with 0.600) |
| 6 | 5x5 | 7 | 0 | 0 | 38.7% | COLS+probe | 0.0% | 3.3% | 54.5% | 0.459 | 4 | 231 | 2/9 | – |
| 7 | 5x5 | 7 | 0 | 2 | 25.3% | PLY2+probe | 1.3% | 15.3% | 78.0% | 0.325 | 28 | 218 | 2/11 | slab: lazy max 1.000 without (with 0.253) |
| 8 | 5x6 | 7 | 2 | 0 | 13.0% | COLS+probe | 0.7% | 7.0% | 100.0% | 0.321 | 24 | 202 | 1/7 | coal: lazy max 1.000 without (with 0.130) |
| 9 | 6x6 | 10 | 1 | 2 | 14.0% | SHORT+probe | 0.7% | 8.0% | 68.5% | 0.356 | 52 | 237 | 3/8 | coal: unsolvable without; slab: lazy max 0.533 without (with 0.140) |
| 10 | 5x6 | 8 | 1 | 2 | 15.3% | COVER+probe | 0.0% | 6.3% | 100.0% | 0.365 | 48 | 120 | 1/6 | coal: lazy max 0.413 without (with 0.153); slab: lazy max 0.580 without (with 0.153) |
| 11 | 6x6 | 10 | 2 | 3 | 8.3% | COVER+probe | 0.0% | 1.3% | 30.5% | 0.442 | 76 | 549 | 2/6 | coal: unsolvable without; slab: lazy max 0.320 without (with 0.083) |

Policies: RAND, PLY1 (most options), COVER (most tickets servable), MINDIS (break fewest matches), LONG, SHORT, ROWS, COLS, PLY2 (2-ply), each plain and +probe. "Best hint-timed" = best of PLY1/COVER/MINDIS with probe, where one safe-move hint is spent at the best possible decision (an oracle upper bound). Sandbox: `sim/shish-lane/lib.py`, `build.py`, `final11.py`, output `final_11.json`.
