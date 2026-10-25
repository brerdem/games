# GF-20261025-01 — Turnover — Game Design Brief v1

Date: 2026-10-25 (Europe/Istanbul) · Brief version v1 · Slug `turnover` · Author: Game Finder
Evidence labels: **[OBS]** observed today with a source; **[SIM]** rule-sandbox result (simulation, not players); **[HYP]** design hypothesis.

## A. Concept Identity
- **ID / title:** GF-20261025-01 · *Turnover* (working title; a turnover is a pastry and a flip)
- **Genre:** deterministic sort puzzle (breakfast/diner theme), hybridcasual
- **Audience:** sort-puzzle players (Magic Sort, Block Out, Loop Sort, Fish Sort audience), 25–55, short sessions, people who like "one clever move" puzzles
- **Target:** mobile iOS + Android · **Prototype:** web in the browser · **Orientation:** portrait (stacks are vertical)
- **Pitch:** Slide the spatula under any pancake and flip that part of the stack onto another plate. It lands upside-down and in reverse order, so getting every plate to one flavour, golden side up, means planning which pancakes get flipped twice.
- **USP:** a new *move rule* for the sort genre, not a new theme. In ball/colour sort you move only the matching top run and the order stays the same. Here you can lift **any 1–3 pancakes from the top**, and every lift **reverses their order and turns each two-sided pancake over**. A pancake's burnt side is a parity you have to manage: a pancake that lands burnt-side-up needs one more flip. Removing that one rule makes the game shallow (see L), so it is the core of the design.

## B. Market Research
All observed 2026-10-25, 07:06–07:15 UTC+3 (`snapshot_2026-10-25.md`, `raw/1025/`), plus web searches at ~07:10–07:12 UTC+3.

| Reference | Developer | Evidence | Mechanic | Lesson |
|---|---|---|---|---|
| Magic Sort! | Grand Games A.Ş. | [OBS] #3 iOS US Top Free Games; #3 Google Play US puzzle top-free order | Colour sort, deterministic | Classic move rule (top run only) still charts. Turnover keeps the containers and the goal and changes the move. |
| Loop Sort (`com.Garawell.LoopSort`) https://play.google.com/store/apps/details?id=com.Garawell.LoopSort | VOODOO (dev listing) | [OBS] #6 GP US puzzle top-free order; 5M+ installs band, 4.5★, updated 2026-10-22 | Tap truck → cubes auto-sort on a conveyor | Reviews: ads lock the game, "not insanely challenging". Low-agency sorts leave room for a sort with real decisions. |
| Fish Sort Puzzle (`triple.sorting.bubble.fish.match`) | — | [OBS] #8 GP US puzzle; 1M+, 4.8★ | Triple-match sort | Sort variants keep entering the top 10. |
| Royal Smash! (`com.cyphergames.royalsmash`) | Cypher Games | [OBS] #1 GP US casual top-free order; 10M+, 4.6★ | Cannon smash physics | Reviews: "level 234 simply impossible", "never enough … power-ups". Players resent forced fails → keep par+2 fair and solver-checked. |
| Pancake-flip web puzzles: Eigengames *Flapjack* (https://eigengames.com/flapjack/), ujem *Pancake Sort*, Novel Games *Pancake Sorting*, u-ndefined itch.io | small web devs | [OBS] web pages, no chart presence | **One stack, flip in place** (the "pancake sorting" maths problem; Flapjack Hard has burnt sides) | The flip fantasy is readable and textless. They are single-stack size-ordering; Turnover is multi-plate colour sorting with transfers. |
| *Pancake Sort* (`life.belt.ps`) https://play.google.com/store/apps/details?hl=en_US&id=life.belt.ps | Lifebelt Games | [OBS] 1K+ installs, 24 reviews (search result) | "Flip, move and organise pancakes by colour into stacks of 10", then merge (exact move rule not verified) | **Closest adjacency, flagged for human review.** Same theme + sort goal; tiny install base. |

- **Market signals [OBS]:** sort puzzles are the fastest-growing puzzle subgenre in 2026. Netmarvel (citing Sensor Tower): sorting became the #3 puzzle subgenre by IAP revenue in H1 2026, +130% IAP half-over-half, +65% downloads (https://www.netmarvel.com/en/news/1657.html). Friendly GameDev: "2026 is shaping up to be the year of sort puzzlers" (https://friendlygamedev.com/blog/state-of-hybrid-casual-puzzles/). Recruit with Hope (2026-10-22): the top sort games trace back to ~8 mechanical families and "only a handful … introduced a genuinely new way to sort" (https://recruitwithhope.com/articles/execution-over-invention).
- **Opportunity [HYP]:** a genuinely new sort *move* (lift any depth → reverse + turn over) in a fair, timer-free, solver-filtered format.
- **Uncertainties:** install bands are Google Play ranges, not downloads. Revenue figures come from third-party write-ups citing Sensor Tower (not verified by me). I did not play Lifebelt's Pancake Sort, so its move rule is unknown. No gameplay footage reviewed.

## C. Core Gameplay Concept
- **Player controls:** a spatula. Drag from a pancake to another plate.
- **Rules:**
  1. Plates hold **at most 4** pancakes. Each level has 2–3 flavours with **3 pancakes each**, on 3–4 plates.
  2. **Flip move:** touch a pancake that is 1st, 2nd or 3rd from the top of its plate (the spatula lifts **at most 3**). That pancake and everything above it lift off and land on another plate that has room. In the air the chunk turns over, so it lands **in reverse order** (the pancake you touched ends up on top) and every **two-sided** pancake in it is now **the other side up**.
  3. Some flavours are **two-sided** (one side golden, one side burnt). Others are golden on both sides, and turning them over changes nothing. Which flavours are two-sided is fixed per level.
  4. No flipping in place: the target plate must be a different plate.
  5. **Goal:** every flavour stacked on its own plate (3 of one flavour), every pancake golden side up. One plate ends up empty.
  6. **Budget = par + 2 flips.** Every flip costs 1. **Undo** = the reverse flip (it is always legal and restores the exact state), so it also costs 1. There are no free moves.
  7. **Stuck banner (budget-aware, exact):** after a flip, if the solver says the goal can't be reached in the flips left, a banner says "Can't finish in N flips — undo or restart". This is the only oracle, and checking it costs a real flip (pattern 10).
- **Win:** goal state within budget. **Fail:** budget used up (fail card) → restart is instant.
- **Stars:** ★★★ = par, ★★ = par+1, ★ = par+2 (par+1 is reachable: the state graph has odd cycles [SIM]).
- **Structure:** level-based, 10 solver-checked levels in the MVP (exact pack below).
- **How players improve:** reading a chunk's landing order, counting turns per pancake ("this one has been flipped once, it needs one more"), using the empty plate as a turning station, and lifting 2–3 at once to fix several pancakes in one flip.
- **Why fun [HYP]:** the flip is physical and readable (everyone knows what a flipped pancake looks like), and one 3-high flip that lands a whole golden flavour in place feels like a trick shot. Decisions are fully visible, with no hidden info and no timer.

## D. First 10 Seconds
L1 (no burnt sides): three plates — a single strawberry, a single blueberry, and a tall stack B-A-A-B (bottom→top). A ghost spatula pulses under the top blueberry and draws an arc to the blueberry plate. The player drags; the pancake arcs, spins once in the air and lands with a soft "plap". The next ghost (lifting the two strawberries) shows the chunk turning over in the air. By the third flip, two flavours are complete and the stack "sizzles" gold. L1's reference line is 3 flips, budget 5. L3 introduces the burnt side with one contextual card: "This one has a burnt side. Flipping turns it over."

## E. Signature Gameplay Moment
**The triple turnover.** A 3-high lift with a burnt-up pancake on the bottom of the chunk arcs across, spins, and lands so the burnt pancake comes down golden on top of its two matching flavour-mates, completing a plate in one flip. It emerges naturally: L7–L10 reference lines each contain 2–3 two- or three-pancake lifts [SIM: reference lines below], and the finale's par of 9 only works with multi-pancake flips.

## F. Controls and Interaction
- **Drag** from a pancake (or press on it and slide). On touch-down the spatula slides under it and the lift-chunk highlights (pancakes 4th+ from the top grey out with a "too heavy" wobble). Drag over a plate: valid plates glow and a **ghost preview** shows the chunk landed (reversed, sides turned). Release on a valid plate to commit. Release anywhere else = cancel (free).
- **Tap a pancake then tap a plate** works as an alternative (two taps), for accessibility.
- **Invalid targets:** full plates (no room) are dimmed during the drag; releasing on one cancels with a wobble, cost 0.
- **Undo** button (bottom left) labelled "Undo −1" (lesson from SL-012): plays the reverse flip, costs 1. **Restart** (bottom right): full budget restored.
- **Touch targets:** each pancake ≥ 64×28 px hit box (the hit box extends ±10 px vertically); plate drop zones are full-column (≥ 80 px wide on a 390 px frame, 4 columns).
- **Input during animation:** a flip animates ≤ 420 ms; a new drag started during the animation is **queued**, not dropped (lesson from SL-011).
- **Accessibility:** flavours differ in colour *and* glyph (strawberry dot pattern, blueberry ring dots, matcha leaf). Burnt-up vs golden-up is shown by the top crust colour *and* a small smoke-wisp icon on the burnt side; it must read at 320 px width.
- **Desktop:** click-drag; keys 1–4 pick source plate, then depth (Q/W/E = 1/2/3), then 1–4 target; U undo, R restart.

## G. Visual and Audio Direction
- **Style:** warm diner counter seen from the front at a slight 15° top-down tilt, so each pancake shows its rim *and* a sliver of its up-face. Thick, soft pancakes (aspect 4:1) with a 2.5 px dark-brown outline, and a sliver of flavour-coloured filling visible in the rim.
- **Readability rule (critical):** the up-face colour must be unambiguous: golden #F2B84B with a butter highlight, burnt #4A2E1E with char lines. Two-sided pancakes also show their **underside** as a thin band at the bottom edge of the rim (burnt or golden), so the player can predict a turnover. Both-sides-golden pancakes have golden bands top and bottom.
- **Palette:** counter #FFF4E2, plates white with a blue rim (#2E5E9E), flavours strawberry #E8485B, blueberry #3D63D8, matcha #5DAE4B. Contrast ≥ 4.5:1 against the counter.
- **Camera:** fixed, all plates visible, no scroll.
- **Animation:** the lifted chunk arcs (parabola, apex 120 px) and rotates 180° about its horizontal axis during flight, landing with a 6% squash and a tiny bounce. The chunk is flipped as one rigid body, so the reversal is *visible*.
- **Particles:** flour puff on landing; steam curls when a plate completes; a butter pat drops onto each completed stack.
- **Audio:** spatula scrape on lift; "whup" on spin; soft "plap" per pancake on landing (pitched up per pancake); sizzle + bell on plate complete; stuck = a pan cooling hiss.

## H. Game Feel
- **Primary:** highlight within 1 frame of touch; ghost preview updates within 1 frame as the finger crosses plates.
- **Success:** completed plate sizzles, butter drops, stack scales 1.0→1.08→1.0 (160 ms).
- **Combo:** a flip that completes a plate with a 3-pancake lift triggers the "triple turnover" flourish (spatula twirl + bigger steam).
- **Impact:** landing squash 6%, 80 ms, staggered 40 ms per pancake.
- **Mistake:** a flip that leaves you unable to finish shows the stuck banner and pulses Undo. Cancel/invalid drops are free and only wobble.
- **Level complete:** plates slide off, remaining flips turn into stars.
- **Restart:** ≤ 200 ms, budget fully restored.

## I. Gameplay Progression (sample stages; full pack below)
1. **L1–L2 — Plain flips (2 flavours, both sides golden):** you learn that lifting more than one reverses their order. [SIM] Greedy play clears these (tutorial by design).
2. **L3–L5 — The burnt side:** one flavour (then both) is two-sided. A flip now turns pancakes over, so a pancake may need two flips. [SIM] Removing burnt sides makes L3–L5 trivial (lazy max 100%, par −1); with them, lazy max is 61.7% / 33.3% / 16.7%.
3. **L6–L10 — Four plates, three flavours:** the spare plate becomes a turning station; long reference lines need 2–3-pancake lifts. L10 (par 9, every flavour two-sided) is the finale.

## J. Replayability
Star mastery (par), multiple optimal lines (2–73 per level [SIM]) for different approaches, fewest-flips sharing. Future: daily plate (same filter), new pieces (see K).

## K. MVP Scope
- **Essential:** rules C1–C7, the 10 levels below exactly as given, drag + ghost preview, budget par+2, undo = reverse flip costing 1, exact budget-aware stuck banner, stars, restart, level select. **No hint** in the MVP (pattern 14).
- **Optional:** sound, particles, triple-turnover flourish, a level-complete stat card.
- **Future (not authorised now):** syrup-glued pairs (lift together only), a 4-flavour 5-plate tier, daily plate, diner meta (unlock flavours/plates), cosmetics. **No production, Unity or native work is authorised.**
- **Permitted simplifications:** flat 2D pancakes (keep the up-face/underside bands), CSS/Canvas tweened arc instead of 3D rotation (but the reversal must be animated, not teleported), no physics.
- **Must not be compromised:** lift-any-1–3-from-top; landing in reverse order; two-sided pancakes turning over on every flip; capacity 4; budget par+2 with undo costing 1; budget-aware exact stuck banner; burnt/golden readability on every pancake in the stack, not just the top one.

## L. Technical Considerations
- Canvas 2D or Phaser 3; pure discrete logic, no physics library.
- **State:** array of plates, each an array bottom→top of pancakes `p = flavour*2 + face` (face 0 golden-up, 1 burnt-up). Move `(i, d, j)`: `chunk = plate[i].slice(-d)`, remove it, `plate[j].push(...chunk.reverse().map(p => twoSided(p>>1) ? p^1 : p))`. Legal iff `1 ≤ d ≤ min(3, len(i))`, `j ≠ i`, `len(j)+d ≤ 4`. Goal: every non-empty plate has 3 pancakes of one flavour, all `face 0`. Port from `sim/turnover/core.py` (`moves`, `apply`, `is_goal`).
- **Solver for the stuck banner:** BFS from the current state with depth ≤ flips left (largest level: 3 flavours, 4 plates; total canonical state space 2.94M, but a depth-limited bidirectional or IDA* search with par ≤ 9 is fast enough; or precompute a distance table per level offline and ship it). The builder chooses; the banner must be exact.
- Canonicalise by sorting plates for the solver only (plates are interchangeable).
- Tests: each level's reference line clears with ★★★; undo restores the exact state and costs 1; banner fires iff distance > flips left (spot-check ≥ 20 states incl. a known fatal flip on L7–L10); invalid drops cost 0.
- Unity port is straightforward (discrete state).

## M. Acceptance Criteria
**Objective (builder + tester):**
1. L1–L10 clear with ★★★ via the reference lines below.
2. Every flip lands reversed with two-sided pancakes turned over; both-sides-golden pancakes never change.
3. Lifting a pancake 4th or deeper from the top is impossible (greyed); dropping on a full plate is impossible and free.
4. Undo restores the exact previous state and costs exactly 1; restart restores the full budget.
5. Stuck banner appears iff `solverDistance(state) > flipsLeft` (≥ 20 spot checks).
6. Every pancake's up-face and underside readable at 320×568 and 390×844 (5/5 testers identify burnt-up pancakes in a mid-stack within 2 s on L9).
7. 60 fps mid-range phone; flip animation ≤ 420 ms; drags during animation are queued, never dropped.
8. Levels match the pack exactly (pairwise non-isomorphic under plate order and same-sidedness flavour relabelling [SIM]).

**Degenerate strategies that must fail (re-verify in browser QA; numbers from `sim/turnover/pack_v1_solved.json`, budget par+2, N=150 for 1-ply, N=60 for 2-ply) [SIM]:**

| Policy | Description | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 | Limit |
|---|---|---|---|---|---|---|---|---|---|---|
| RAND | random legal flips | 0.7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ≤ 5% L3+ |
| RAND+probe | random, flip back when the banner shows | 0.7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ≤ 5% L3+ |
| G1 | 1-ply greedy: maximise golden same-flavour runs from the plate bottom | 34.0 | 5.3 | 0 | 0 | 0 | 0 | 0 | 0 | ≤ 30% L7+ |
| G2 | "sort player": maximise same-flavour runs, ignores sides | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ≤ 30% L7+ |
| G1×2 (+probe) | 2-ply greedy, with/without banner probing | 61.7 / 55.0 | 18.3 / 33.3 | 16.7 / 13.3 | 35.0 / 35.0 | 10.0 / 5.0 | 8.3 / 10.0 | 1.7 / 0 | 1.7 / 5.0 | ≤ 30% L7+ |
| G2×2 (+probe) | 2-ply sort player | 0 | 0 | 0 | 5.0 / 6.7 | 0 | 0 | 0 | 0 | ≤ 30% L7+ |

Measured max on L7–L10: **10.0%** (limit 30%). L1–L2 are tutorials and greedy clears them by design.

**Load-bearing check (burnt sides) [SIM]:** with all burnt sides removed (same layout), par drops by 1–3 and the strongest lazy policy clears 63–100% on every level L3–L10 (L3 100, L4 100, L5 100, L6 67.3, L7 68.7, L8 70.7, L9 63.3, L10 76.0). The capacity of 4 is structural. The 3-pancake spatula cap is a readability/touch rule (state counts barely change vs unlimited [SIM]); it is not claimed as a depth source.

**Finale strictly hardest [SIM], measured on all 10 levels:** L10 is strictly hardest on **par (9 vs ≤ 8)** and **search space (454,449 states reachable within 6 flips vs ≤ 370,534)**. It is **not** strictly hardest on lazy clear rate (L9 1.7% < L10 5.0%) or fatal-opening share (L10 0.0, every opening keeps the goal reachable), and it has the most optimal lines (73). Tester to judge perceived difficulty; if L10 feels easier than L9, swap them (L9 then fails the par measure, so a new L10 would be needed).

**Hint policy:** no hint in MVP (pattern 14). Any future hint reveals one *fatal* flip only and forbids ★★★.

**Subjective hypotheses (need humans):** H1: the reversal and turnover are understood without text by L3. H2: the triple turnover feels like a trick shot. H3: players plan ≥ 2 flips ahead from L6 ("this one needs one more flip"). H4: par 7–9 levels feel hard but fair, not opaque. H5: burnt/golden reads at a glance mid-stack.

## N. Design Risks and Experiments
| Risk | Experiment |
|---|---|
| **Opacity:** reversal + parity is hard to hold in the head; humans may flail on par 8–9 (sandbox lazy policies are ~0%, which says nothing about humans) | Tester logs median flips and clear rate on L7–L10 for 3–5 humans. If clear rate < 30% within 3 tries, ship v1.1 with budget par+3 and finale par 8. The ghost preview stays free. |
| Readability of sides mid-stack | Underside band + smoke icon; 5-player 2 s identification test on L9 |
| Theme adjacency (Lifebelt Pancake Sort, web pancake-flip puzzles) | Burak originality review; keep the multi-plate transfer + partial two-sidedness rules; consider a non-pancake skin (tortilla, gözleme) only if needed |
| Curve not monotone (L6 2-ply lazy 35% > L5 16.7%) | L6 is the first 3-flavour level (only one two-sided flavour); treat as a breather; tester judges |
| Finale only strictly hardest on 2 measures | See M; generate a par-9/10 alternative later if the tester flags SP-013-type issue |
| Repetitive long-term | Future pieces (glued pairs, 5 plates) must pass the load-bearing filter before being added |
| Drag misfires between adjacent pancakes | Tester misfire count per 100 drags at 360/390/430 (target < 3) |

## O. Concept Score
| Criterion | Max | Score | Reason |
|---|---|---|---|
| Core gameplay & fun | 25 | 19 | Physical, readable flip with real order dependence: burnt sides are load-bearing and L7–L10 lazy ≤ 10% [SIM]. Human opacity risk is untested (−). |
| Originality & differentiation | 20 | 13 | New sort move rule (reverse + turnover transfer) not seen in charted sort games, but the pancake-flip fantasy exists in web puzzles and a 1K+ "Pancake Sort" app; flagged. |
| Market evidence & opportunity | 20 | 16 | Sort is the fastest-growing puzzle subgenre (Sensor Tower via Netmarvel; Friendly GameDev) and several sort titles are top-10 today [OBS]; "few new ways to sort" gap. No direct evidence for this mechanic. |
| Web MVP feasibility | 15 | 14 | Pure discrete logic, tiny boards, tweened arcs; solver sizes known. |
| Mobile control suitability | 10 | 9 | One drag per move with a ghost preview; stacks fit portrait. |
| Production & commercial potential | 10 | 7 | Diner meta, flavour unlocks, daily plate, IAA-friendly short levels; IAP depth unproven. |
| **Total** | 100 | **78** | **Promising (70–84). Evidence confidence: medium-low.** Recommendation: build the MVP; the tester should prioritise H1/H4 (opacity) and the readability of sides. |

## Level pack (exact; `sim/turnover/pack_v1_solved.json`)
Notation: plates listed left→right, each **bottom → top**. Flavours A = strawberry, B = blueberry, C = matcha. `X*` = burnt side up; `X` = golden side up. "Two-sided" lists the flavours that have a burnt side (others are golden on both sides). Move `[i, d, j]` = lift the top `d` pancakes of plate `i` onto plate `j` (plates 1-based). Capacity 4, spatula ≤ 3, budget = par + 2.

| L | Two-sided | Plates (bottom→top) | Par | Reference line |
|---|---|---|---|---|
| 1 | none | [A] [B] [B A A B] | 3 | [3,1,2] [3,2,1] [2,2,3] |
| 2 | none | [ ] [A B] [B A B A] | 5 | [2,1,1] [3,1,2] [3,1,1] [3,1,2] [1,2,3] |
| 3 | B | [A] [A A B B] [B*] | 3 | [2,2,3] [1,1,2] [3,3,1] |
| 4 | B | [A] [A B] [B* B A] | 5 | [3,2,1] [1,1,2] [2,2,3] [1,2,2] [3,3,1] |
| 5 | A, B | [A* A* B* A*] [B] [B] | 5 | [1,1,2] [1,1,3] [2,2,1] [1,1,3] [1,3,2] |
| 6 | C | [A B B B] [A C* A] [C] [C] | 6 | [1,3,3] [2,1,1] [4,1,2] [3,3,4] [2,2,3] [1,2,2] |
| 7 | B, C | [A] [A B* B* A] [C] [C C* B*] | 7 | [2,1,1] [3,1,1] [2,2,3] [4,2,3] [3,1,1] [1,2,4] [1,2,2] |
| 8 | A, B, C | [B] [B A* B*] [C C* A A] [C*] | 7 | [2,1,1] [3,2,2] [1,2,3] [2,3,1] [3,3,2] [2,1,4] [4,2,3] |
| 9 | A, B, C | [B*] [B*] [B* C* C* A*] [C A* A] | 8 | [1,1,4] [3,1,1] [4,2,2] [2,1,1] [4,1,1] [3,3,4] [4,1,2] [2,3,3] |
| 10 | A, B, C | [B A C* A*] [B*] [C* A] [C* B*] | 9 | [1,1,3] [2,1,1] [1,1,4] [1,2,2] [3,2,2] [4,3,1] [1,1,3] [2,3,4] [3,2,2] |

Per-level sandbox data (N=150 1-ply, N=60 2-ply; seeds fixed in scripts):

| L | Optimal lines | Openings that keep par / total | Fatal-opening share | States ≤ 6 flips | Lazy max (all policies) | No-burnt par / lazy max |
|---|---|---|---|---|---|---|
| 1 | 5 | 2/8 | 0.50 | 70 | 100 | — |
| 2 | 27 | 4/7 | 0.00 | 70 | 100 | — |
| 3 | 2 | 1/8 | 0.625 | 504 | 61.7 | 2 / 100 |
| 4 | 4 | 1/10 | 0.30 | 539 | 33.3 | 3 / 100 |
| 5 | 2 | 2/8 | 0.00 | 3,020 | 16.7 | 4 / 100 |
| 6 | 54 | 8/17 | 0.059 | 25,067 | 35.0 | 5 / 67.3 |
| 7 | 19 | 3/17 | 0.235 | 125,247 | 10.0 | 5 / 68.7 |
| 8 | 3 | 2/17 | 0.353 | 370,534 | 10.0 | 5 / 70.7 |
| 9 | 22 | 2/17 | 0.353 | 195,417 | 1.7 | 5 / 63.3 |
| 10 | 73 | 6/17 | 0.00 | 454,449 | 5.0 | 7 / 76.0 |

"Fatal-opening share" = openings that increase the distance to the goal (with budget par+2 one such flip is still recoverable by flipping back). Sandbox: `sim/turnover/` (`core.py` rules, `canon.py` BFS, `evalp.py` 1-ply policies, `deep.py`/`deepsolve.py` 2-ply + reference lines, `pack.py` generator). No JS fidelity port was run today; the builder should port `apply` and assert the 10 reference lines (M1).
