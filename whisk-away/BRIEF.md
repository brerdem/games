# GF-20261026-01 — Whisk Away — Game Design Brief v1

Date: 2026-10-26 (Europe/Istanbul) · Brief version v1, with the v1.1 amendment (WA-002 ruling and the new L7/L10 boards, 2026-10-26) recorded in `BRIEF-v1.1.md` · Slug `whisk-away` · Author: Game Finder
Evidence labels: **[OBS]** observed today with a source; **[SIM]** rule-sandbox result (simulation, not players); **[HYP]** design hypothesis.
Sandbox: `/workspace/game-ideas/sim/whisk/` (`core2.py` rules, `pack.py` → `pack_v1.json` exact level data, metrics and reference lines).

## A. Concept Identity
- **ID / title:** GF-20261026-01 · *Whisk Away* (working title; "whisk away" = snatch a cloth away fast. Plain "Whisk" avoided: it was the former name of a recipe app.)
- **Genre / subgenre:** deterministic spatial-order puzzle with a physical trick fantasy (the tablecloth trick), hybridcasual
- **Audience:** players of spatial "untangle/escape/slide" puzzles (Rotate Rings, CubeAway, Arrows, Block Out audience), 18–55, short sessions; plus the broad audience that knows the tablecloth trick from videos
- **Target platform:** mobile iOS + Android · **Prototype:** web in the browser, mobile-first · **Orientation:** portrait (5 × 6 table seen from above fills a phone screen)
- **Elevator pitch:** Pull a tablecloth slowly and everything on it comes along; whip it away fast and everything stays put. Use both to slide the dishes onto their place marks and leave a bare, perfectly set table: TA-DA.
- **USP:** two verbs everybody already understands from real life (slow pull = carry, fast whip = leave behind) on **layered cloths**. Dragging a lower cloth carries every cloth and dish on top of it; whipping a cloth "drops" its dishes onto the layer below, which then carries them in a different direction. A whip also needs a **clear lane**: a cloth can't sweep through a dish standing on a lower layer. So the order of pulls and whips is the whole puzzle. Existing tablecloth games are one-flick physics/timing toys; this is a fair, untimed, solver-checked puzzle built on the same fantasy.

## B. Market Research
All observed 2026-10-26 07:09–07:15 UTC+3 (`snapshot_2026-10-26.md`, iTunes lookups, iOS review RSS, web search).

| Reference | Developer | Evidence | Mechanic | Lesson |
|---|---|---|---|---|
| Rotate Rings (https://apps.apple.com/us/app/rotate-rings/id6793924927) | HURELAX PTE. LTD. (iOS seller) / Nebula Studio (chart artist) | [OBS] #7 iOS US Top Free Games; #1 Google Play US puzzle top-free order; released 2026-08-05; 60,090 iOS US ratings, 4.80 | Rotate interlocked rings to align gaps and free them | A brand-new spatial-order puzzle reached the top in ~12 weeks. Reviews: "dead ends", "too easy", ad after every level of < 1 min. |
| CubeAway – 3DPuzzle (https://apps.apple.com/us/app/cubeaway-3dpuzzle/id6760325543) | GOODROID, Inc. | [OBS] #10 Applyra App Store US puzzle free; released 2026-03-13; 135,842 ratings, 4.66 | Arrow escape: tap pieces out in arrow order without collisions | Order-of-removal puzzles are a top-chart family; the monotone "any free piece is safe" rule makes them relaxing but shallow. |
| Block Out! (https://apps.apple.com/us/app/block-out-color-sort-puzzle/id6752672568) and Sand Blocks (https://apps.apple.com/us/app/sand-blocks-drop-puzzle/id6757140488) | Grand Games; Rollic | [OBS] #2 and #4 iOS US Top Free Games; 327,403 / 11,286 ratings | Slide blocks / pull sand to matching targets under a **timer** | Most recent low reviews (10-22…10-24) attack the **timer** ("add a zen mode", "timer ruins it", "impossible without buying time"). Whisk Away is untimed with a visible move budget. |
| Perfect Pull! (https://apps.apple.com/tt/app/perfect-pull/id6806810305), SAT-BOX "There's no tablecloth I can't pull!!" (https://apps.apple.com/us/app/theres-no-tablecloth-i-cant-pull/id1055571047, 16 ratings, 2.1★), Pull a Tablecloth!! (GP, 2018), Tablecloth Magician (S-Troupe), yayplays *Tablecloth Pull* (https://yayplays.com/en/tablecloth-pull/) | small devs | [OBS] store/web pages via search, no chart presence seen | **One flick under 3D physics**; score = how little dishes moved; random tables | The fantasy exists and reads instantly, but every version found is a timing/physics toy (pattern 3 risk for us). **Closest adjacency, flagged for human review**; rules and goal differ (see section F of the report). |
| Sensor Tower via GameDev Reports (https://gamedevreports.substack.com/p/sensor-tower-game-advertising-in, 2026-10-22) | — | [OBS, second-hand] original games get 39.8% of downloads from paid ads vs 16.7% for IP games; puzzle buys most traffic in-app; 70% of US Facebook game spend now in Reels | — | Original puzzles live on ad creatives. A real-world trick with a TA-DA payoff is very ad-readable [HYP]. |

**Market signals:** spatial order/escape puzzles dominate puzzle top-free (Rotate Rings, Block Out, CubeAway, Arrows #9 GP); timer complaints on the top sliders; no tablecloth puzzle in any chart. **Uncertainties:** no download/revenue data of our own; no evidence that the tablecloth theme alone converts; the toy versions have tiny footprints (that is weak evidence *against* the theme as a pure toy, not against a puzzle).

## C. Core Gameplay Concept
- **What the player controls:** cloths (napkins, runners, tablecloths) on a 5 × 6 table seen from above. Each cloth has **one pull direction**, shown by a tassel tab on that edge. Cloths lie in layers.
- **Two actions (each costs 1 move):**
  - **Pull (slow drag):** the cloth moves **1 cell** in its pull direction per cell dragged. **Everything on top rides along**: every cloth above it that overlaps it (transitively) and every dish standing on any of those cloths.
  - **Whip (fast flick):** the cloth leaves the table instantly in its pull direction. **Everything on it stays put**: dishes drop onto whatever is below (lower cloth or bare table), cloths above it drop down a layer.
- **Rules that make it a puzzle:**
  1. A riding dish can't leave the table, land on another dish, or end up under a higher cloth → the pull is refused.
  2. **A moving cloth can't pass through a dish standing on a lower layer** (or on the bare table) → a pull into it is refused; a whip whose **lane** (the cloth's area swept to the table edge) contains such a dish is refused ("it would knock it over").
  3. A cloth pulled completely off the table is gone.
- **Immediate objective / win:** every dish on its matching place mark **and** no cloth left on the table → TA-DA.
- **Fail:** budget = **par + 2** moves (pulls, whips and undos all count). Exact stuck banner (see F). No timer.
- **Structure:** level-based, short (par 1–10, 20–90 s).
- **How players improve:** they learn to read layers ("what rides with what"), to time the whip as a hand-off ("drop these dishes here, then the cloth below carries them the other way"), and to clear whip lanes first.
- **Why enjoyable [HYP]:** every move is a tiny magic trick with physical, predictable feedback; the solution is a satisfying choreography of carry → drop → carry; the final whip produces a clean, set table.

## D. First 10 Seconds
- **Screen:** a wooden table, one checked napkin with a tassel arrow pointing right, a white plate on it, and a glowing place mark *under* the plate (L1, par 1).
- **Understanding:** a hand icon flicks the tassel once (no text). The napkin whooshes off to the right; the plate wobbles, stays on its mark; confetti, "TA-DA!" from an off-screen audience.
- **First action:** the player flicks. If they instead pull slowly, the plate rides off its mark: the move counter ticks, the mark glows red, a small "Undo" chip pulses → they learn the two verbs in one level.
- **Curiosity:** L2 immediately needs the *slow* pull (plate 2 cells from its mark), then a whip. L3 shows a napkin riding on a runner.
- Tutorials are gameplay only: one hand-icon per new verb (L1 flick, L2 slow pull, L3 "pull the lower cloth", L4 "lane blocked" shake). No text beyond 2-word captions.

## E. Signature Gameplay Moment
**The hand-off whip:** a stack of three cloths carries two plates across the table on one slow pull; the player whips the middle cloth mid-route; the top napkin and its plates drop onto the runner below, which the next pull carries sideways onto the marks; the final whip clears the last cloth and the table is bare and perfectly set: plates clink down, cutlery jingles, applause. It comes straight from the rules (carry + drop), not from a bonus.

## F. Controls and Interaction
- **Pull:** touch any visible cell of a cloth (touch on a dish = the cloth under it) and drag **along its pull direction**. The cloth and its riders follow the finger, snapping per cell (with 20% rubber-band preview between cells). On release, each snapped cell commits as one pull (k cells = k moves, applied one at a time with full legality per step; stop at the first refused step).
- **Whip (v1.1, WA-002, 2026-10-26):** a gesture whose release speed is ≥ 1.0 px/ms along the pull direction and whose touch lasts ≤ 250 ms is a pure whip. It spends one move and commits none of the pulls that the finger snapped along the way. The snap preview during the drag is cosmetic until release. A double-tap is also a pure whip. Keyboard: number keys select cloth, `→`/`Space` = pull 1, `W` = whip, `U` = undo, `R` = restart.
- **Dragging against or across the pull direction** does nothing (cloth wiggles). A drag that ends with < 50% of a cell commits nothing.
- **Refused moves (free, no move spent):** cloth resists like a rubber band, the blocking dish wobbles and its cell flashes red; for a whip, the blocked lane is tinted red for 400 ms.
- **Undo:** button with the visible word "Undo" and "−1"; costs 1 move; reverts one move exactly. Restart: free, resets the budget.
- **Stuck banner (exact, budget-aware):** shown when the minimum remaining moves to win > moves left: "Can't set the table in N moves". It offers **Restart** always and **Undo** only if undoing reaches a state that can still finish in the moves left after paying for the undo (TO-003 lesson: otherwise restart-only).
- **Stars:** par = 3★, par+1 = 2★, par+2 = 1★. No hint (pattern 14).
- **Touch targets:** cell ≥ 56 px at 390 px width (5 columns), ≥ 48 px at 320 px. Every cloth has ≥ 2 visible cells at level start (pack filter). Tabs are drawn on the UI layer above all cloths.
- **Accessibility:** cloths differ by pattern (check, stripe, dots, lace) and hue, not hue alone; dishes and marks pair by shape + colour (round plate, square plate, bowl, cup) — marks carry the same icon.
- **Desktop:** mouse drag/flick, double-click = whip, keys above.

## G. Visual and Audio Direction
- **Style:** warm top-down "magician's dinner table": honey-wood table with grain, cloths as soft fabric with visible pattern, hems and slight drop shadows (each layer casts a 3 px shadow so the stack order is obvious). Dishes are chunky porcelain with a coloured rim.
- **Palette:** wood #C8955C base; cloths in saturated but distinct families (tomato red check, teal stripe, mustard dots, cream lace); place marks are dashed gold outlines with the dish icon; refused = soft red #E0524A.
- **Signature visual:** the whip — the cloth snaps away with a motion-blur ribbon and a fabric "flap" curl at its tail; dishes do a 2-frame hop and a wobble, and stay. The pull — fabric bunches slightly at the trailing edge.
- **Camera:** fixed, whole table visible, small "audience" silhouettes at the top edge reacting (gasp on refused, applause on TA-DA).
- **Animation:** pull 120 ms per cell ease-out; whip 160 ms with overshoot of the cloth off-screen; dish drop 80 ms squash.
- **Audio:** pull = soft cloth slide; whip = sharp "fwip!" + porcelain clink when dishes settle; refused = cup rattle; TA-DA = drum roll on the last whip + cymbal + applause; stars = cutlery chimes.

## H. Game Feel
- **Primary interaction:** finger-locked drag with per-cell snap and haptic tick (if available) per committed cell.
- **Success (dish on mark):** mark fills gold with a little shine sweep.
- **Combo/chain:** a whip that drops 2+ dishes onto marks at once → "Clean!" stamp + bigger clink chord; the last whip that completes the level → drum roll + TA-DA.
- **Impact:** dishes squash 6% on landing after a whip; riders sway 2° during pulls.
- **Mistake:** refused move = rubber band + wobble, no cost. Real mistakes (legal but bad) are visible only through the stuck banner and the board.
- **Level complete:** applause, stars land on the table as napkin rings, Next button appears after 600 ms.
- **Restart:** all cloths fly back in reverse in 300 ms.

## I. Gameplay Progression (sample stages; full pack below)
1. **Stage 1 – Two verbs (L1–L2):** whip leaves things; slow pull carries. One cloth, one dish. Learns: speed is the choice.
2. **Stage 2 – Layers (L3–L5):** a napkin on a runner; pulling the runner carries the napkin; whipping the runner leaves the napkin behind. **L4 introduces the whip lane** (a standing dish blocks a whip), which turns order into the main decision. Learns: who rides with whom; clear lanes first.
3. **Stage 3 – Hand-offs (L6–L10):** 4 cloths in four directions, 2–3 dishes. Dishes must change carriers (whip to drop, pull the layer below). L7 has 5 of 8 openings fatal; L10 needs 10 moves with only 2 of 7 openings keeping par. Learns: plan the route of each dish as a chain of carriers.
Future pieces (not MVP; each must pass the load-bearing filter): heavy pot (never rides: a pulled cloth slides out from under it), tall glass (topples on a whip, must ride to the table edge stop), two-tab cloths (two directions), stacked plates (count 2 marks).

## J. Replayability
Par stars (3★ = par), the choreography is different on every level (300–690 optimal lines on L6/L9/L10 but only 2 par openings on L10), daily table from the generator (filtered with the same tests), themed tables later (picnic, wedding, magician's stage). No randomness during play.

## K. MVP Scope
- **Essential:** the 10-level pack exactly as below; pull/whip/undo/restart; all rules in C; exact solver in JS (state spaces ≤ 57,169) for the banner; stars; the refused-move feedback; the TA-DA moment; portrait layout 320–430 px.
- **Optional:** haptics; audience reactions; double-tap whip setting toggle; level select.
- **Future:** new pieces (I), generator daily mode, cosmetics (cloth patterns), themes.
- **Permitted simplifications:** flat 2D art; cloths as rounded rectangles with a pattern fill; no fabric simulation (use the bunch/flap as sprite tweens); sound can be synthesized.

## L. Technical Considerations
- Canvas 2D or Phaser; **no physics engine** (everything is grid-discrete). The "physical" look is tweening.
- **State:** cloth offsets (vector), present flags, dish (x, y, support cloth). Support = topmost present cloth covering the dish's cell (invariant kept by rules 1–2). Port `core2.py` `moves()` exactly; it is ~70 lines.
- **Carry set:** {pulled cloth} ∪ every present cloth with higher z that overlaps any cloth already in the set (closure in z order).
- **Whip lane:** the cloth's current rectangle extended to the table edge in its direction; refused if any dish with support z < whipped cloth's z (table = −1) lies in it.
- **Solver:** BFS from the start + reverse BFS from goal states for exact distance; precompute on load (≤ 57k states, ~0.3 s in Python; JS should be faster). Lesson TO-016: precompute in a worker or lazily; target load ≤ 2 s at 4× CPU throttle.
- **Input:** per-gesture state machine; clear selection on every drag end and touchcancel (TO-015 lesson); queue gestures during animations and **re-validate on dequeue** (TO-001 lesson).
- **Testing:** fidelity test of the JS engine vs `pack_v1.json` reference lines and exact par; replay every reference line through real pointer events.
- **Unity note:** trivially portable (discrete grid); the only feel-critical part is the flick classifier.

## M. Acceptance Criteria
**Objective (must pass):**
1. All 10 reference lines in the pack clear at 3★ through real touch gestures at 320, 360, 390 and 430 px.
2. JS engine: par, reachable state count and the legal-move sets match `pack_v1.json` for every level (exhaustive over reachable states).
3. Stuck banner exact on ≥ 200 sampled states (0 wrong); Undo offered only when it can still win.
4. Refused moves never spend a move; undo always costs exactly 1; budget never goes negative; no input accepted after win/fail.
5. Flick vs pull misfires < 3 per 100 gestures for each verb at 390 px (scripted flicks at 1.2–2 px/ms, pulls at ≤ 0.4 px/ms).
6. Every cloth has ≥ 2 visible cells at level start; layer order readable (shadow + overlap) in screenshots at 320 px.
7. 55+ fps at 390 px, DPR 2, 4× CPU throttle; level load ≤ 2 s at 4×.
8. **Degenerate strategies that must fail (exact, budget par+2; [SIM] values from the sandbox):** random play ≤ 21% on L5–L10 (measured max 20.2% on L5, 0.0–15.8% on L6–L10); greedy distance (min Manhattan + cloths left) ≤ 5% on L5–L10 (measured 0–4.2%); 2-ply greedy ≤ 21% on L7–L10 (max 20.8% L7); "whip everything first" 0% from L2; "do everything with pulls, whip last" ≤ 8.3% from L5. Re-measure in JS.
9. Finale L10 strictly hardest on ≥ 2 measures: par (10 vs ≤ 8), lazy max (0.0% vs ≥ 0.8%), reachable states (57,169 vs ≤ 19,356).
**Subjective hypotheses (Game Tester / humans):**
- H1: players understand pull vs whip within L1–L2 without text (5/5 testers).
- H2: layer reading is clear: players predict "what rides" correctly ≥ 80% before pulling (L3–L6).
- H3: the hand-off whip (E) is reported as the best moment.
- H4: L7–L10 clear rates within the budget are 30–80% for first-time players (not opaque). If < 30%, v1.1 = budget par+3.
- H5: the flick feels like the trick (not like a button).

## N. Design Risks and Experiments
| Risk | Experiment |
|---|---|
| **Opacity**: lazy play ≈ 0% from L6 may mean humans can't see the plan | Human clear rate on L6–L10 (H4); fallback v1.1 budget par+3 and a gentler L9/L10 swap |
| **Layer readability** (hidden cloth edges) | Pack filter ≥ 2 visible cells; screenshot test at 320 px; 5-person "which cloths ride" quiz |
| **Flick vs slow pull misfires** | Scripted gesture sweep (M5); expose a double-tap alternative; if misfires ≥ 3/100, switch whip to "drag past the table edge" |
| **Repetitive interaction** | Stage-3 hand-offs + future pieces (I) each pass a load-bearing filter |
| **Whip-lane rule not load-bearing on L10** [SIM] | Accepted: lane is load-bearing on L4–L9; v1.1 can swap L10 for a generator board where it is |
| **Insufficient differentiation** (tablecloth toys) | Human/Burak review; differentiate by layers, marks, lanes, untimed puzzle |
| **Many optimal lines on L6/L9 (690/672)** → may feel loose | Fine for stars; human H4 decides |

## O. Concept Score
| Criterion | Score | Reason |
|---|---|---|
| Core gameplay & fun | **19/25** | Two real-world verbs + layers give real order dependence ([SIM]: lazy ≤ 21% on L5–L10, carry load-bearing L4–L10, lane L4–L9); opacity untested |
| Originality | **15/20** | Not a named puzzle genre; rules (carry-above, whip-drop, lane) original; theme exists as physics toys |
| Market evidence | **14/20** | Indirect: spatial-order puzzles top the charts; timer complaints; ad-readable fantasy; no direct tablecloth-puzzle signal |
| Web MVP feasibility | **14/15** | Discrete grid, tiny exact solver, no physics |
| Mobile controls | **8/10** | Drag + flick is natural; flick classifier misfire risk |
| Production & commercial | **8/10** | Strong TA-DA ad moment; themes, cosmetics, daily generator; IAA-friendly short levels |
| **Total** | **78/100** | **Promising (70–84).** Evidence confidence **medium-low** (no player data; sandbox only). Recommendation: build the MVP; tester to prioritise H1 (two verbs), H2 (layer reading) and the flick classifier. |

## Level pack v1 (exact; `sim/whisk/pack_v1.json`)
Coordinates: x = 0…4 left→right, y = 0…5 top→bottom. Cloth = (x, y) top-left, w×h, pull direction (N = up the screen). **z = cloth index; higher index lies on top.** Dishes A–C go to marks a–c. Budget = par + 2. "no lane"/"no carry" = (par, lazy max %) with that rule removed (None = unsolvable).

| L | Table | Cloths (c0 bottom → top) | Dishes | Marks | Par / budget | States | Optimal lines | Openings | Lazy max % | no lane | no carry | Reference line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 5×6 | c0 (1,2) 3×2 E | A(2,3) | a(2,3) | 1 / 3 | 6 | 1 | 2 (1 keep par, 1 fatal) | 100.0 | [1, 100.0] | [1, 100.0] | whip c0 |
| L2 | 5×6 | c0 (0,1) 3×3 S | A(1,1) | a(1,3) | 3 / 5 | 10 | 1 | 2 (1 keep par, 1 fatal) | 100.0 | [3, 100.0] | [3, 100.0] | drag c0, drag c0, whip c0 |
| L3 | 5×6 | c0 (0,0) 3×4 S; c1 (0,0) 2×2 E | A(0,0) B(2,2) | a(1,2) b(2,4) | 5 / 7 | 164 | 10 | 4 (2 keep par, 2 fatal) | 100.0 | [5, 100.0] | [5, 0.8] | drag c0, drag c0, whip c0, drag c1, whip c1 |
| L4 | 5×6 | c0 (2,2) 3×3 W; c1 (2,3) 3×2 N; c2 (0,3) 3×2 W | A(2,4) B(0,4) | a(2,2) b(0,3) | 5 / 7 | 212 | 2 | 4 (2 keep par, 2 fatal) | 50.0 | [5, 100.0] | None | whip c0, drag c1, whip c2, drag c1, whip c1 |
| L5 | 5×6 | c0 (1,0) 4×4 W; c1 (0,2) 3×2 S; c2 (2,1) 2×3 W | A(3,0) B(1,1) | a(2,0) b(0,1) | 5 / 7 | 602 | 20 | 4 (2 keep par, 2 fatal) | 20.2 | [4, 100.0] | None | drag c0, whip c0, drag c1, whip c1, whip c2 |
| L6 | 5×6 | c0 (1,2) 4×4 E; c1 (0,3) 4×2 E; c2 (1,3) 4×2 E; c3 (2,1) 2×3 S | A(2,5) B(1,2) | a(3,5) b(2,2) | 6 / 8 | 6488 | 690 | 7 (5 keep par, 1 fatal) | 15.8 | [5, 100.0] | None | drag c0, whip c0, whip c1, drag c2, whip c2, whip c3 |
| L7 | 5×6 | c0 (2,1) 2×4 E; c1 (2,4) 3×2 N; c2 (1,0) 4×3 S; c3 (0,4) 4×2 W | A(2,2) B(2,0) C(1,5) | a(4,2) b(3,0) c(2,5) | 6 / 8 | 10664 | 2 | 8 (2 keep par, 5 fatal) | 20.8 | [6, 66.7] | None | drag c0, whip c1, whip c2, whip c3, drag c0, whip c0 |
| L8 | 5×6 | c0 (3,1) 2×4 N; c1 (1,0) 2×3 S; c2 (0,2) 2×3 N; c3 (0,0) 2×4 E | A(3,2) B(3,1) | a(3,1) b(3,0) | 7 / 9 | 19356 | 182 | 7 (3 keep par, 1 fatal) | 5.5 | [5, 100.0] | None | drag c0, whip c0, drag c1, drag c1, whip c1, whip c2, whip c3 |
| L9 | 5×6 | c0 (0,0) 4×2 E; c1 (0,2) 3×3 W; c2 (3,3) 2×2 S; c3 (2,2) 2×3 W | A(1,1) B(1,3) C(0,1) | a(2,1) b(0,3) c(1,1) | 8 / 10 | 1344 | 672 | 6 (2 keep par, 4 fatal) | 0.8 | [6, 100.0] | None | drag c0, whip c0, drag c2, drag c2, drag c1, whip c1, whip c2, whip c3 |
| L10 | 5×6 | c0 (1,1) 4×2 N; c1 (3,0) 2×4 S; c2 (1,3) 4×3 W; c3 (2,2) 3×2 E | A(4,3) B(4,4) C(3,2) | a(1,1) b(1,2) c(3,1) | 10 / 12 | 57169 | 300 | 7 (2 keep par, 4 fatal) | 0.0 | [10, 0.0] | None | drag c0, drag c0, whip c0, whip c3, drag c2, drag c2, drag c1, whip c1, drag c2, whip c2 |

Per-policy lazy rates (exact, %): see `lazy_pct` in `pack_v1.json` (RAND, GREEDY, GREEDY2, WHIP_FIRST, GREEDY_WHIPLATE). L3 (tutorial) lets greedy through by design; L4 50% and L5 20.2% are teaching levels.
Isomorphism: all levels have different cloth sets (no mirrored copies checked formally; builder may add a canonical-form check).

## Handoff to Game MVP Builder
- **Mechanic that must not be compromised:** the two verbs on layers: slow pull carries everything on top (cloths and dishes, transitively), whip leaves everything on top in place, and a moving/whipped cloth can't pass through a dish standing on a lower layer. Goal = dishes on marks **and** a bare table.
- **Key entertainment hypothesis:** turning the tablecloth trick into deliberate hand-offs between layers (carry → drop → carry) is instantly readable and creates real planning without a timer.
- **Signature moment:** the hand-off whip (section E), ending in the TA-DA whip on a bare, set table.
- **Minimum viable experience:** L1–L10 exactly as specified, both verbs, undo (−1), exact banner, stars, TA-DA.
- **Permitted simplifications:** see K (flat art, tweened fabric, synthesized audio, no physics).
- **Game Tester must validate:** H1 (two verbs without text), H2 (layer reading), flick/pull misfires (M5), banner exactness, lazy-policy rates in JS (M8), L10 strictly hardest (M9), opacity on L7–L10 (H4).
