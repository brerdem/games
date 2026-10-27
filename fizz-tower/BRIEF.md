# GF-20261027-01 — Fizz Tower — Game Design Brief v1
Date: 2026-10-27 (Europe/Istanbul) · Brief version 1.0 · Author: Game Finder (Grok Bot) for Burak Erdem (Clockwork) · For: Game MVP Builder, then Game Tester
Sandbox: `/workspace/game-ideas/sim/fizz/` (rules `core2.py`, solver/policies `solve2.py`, generator `gen2.py`, pack `pack_v1.json` via `build_pack.py`). All odds marked **[SIM]** are exact enumerations over every reachable state (budget par+2), not human data.

---
## A. Concept Identity
- **ID:** GF-20261027-01 · **Slug:** `fizz-tower` · **Working title:** Fizz Tower
- **Genre:** hybridcasual puzzle, deterministic pour-routing / layering (liquid-sort family, new rule set)
- **Audience:** 25–55 puzzle players who play water-sort, Rotate Rings, Magic Sort and Meowdoku; they like calm, readable, no-timer puzzles and "oddly satisfying" pours.
- **Target platform:** Mobile iOS and Android · **Prototype:** web browser, mobile-first · **Orientation:** portrait (a tower is a tall object; bottles at the top, tower below, HUD at the bottom).
- **Elevator pitch:** Tap a bottle to pour fizzy soda onto a party tower of glasses; when a glass is full, the new pour pushes its top layer over the lip onto the glass it leans toward, so every pour sends a visible cascade down the tower, and you must order your pours so every glass ends up with the right layered drink.
- **USP:** *The pour pushes, it doesn't just fill.* Liquid already in the tower gets shoved downward by every new pour (first poured ends lowest), and some glasses sit on rocking coasters that tip the other way each time they overflow. One tap, a big readable chain reaction, and a deterministic answer.

## B. Market Research (observed 2026-10-27, 07:06–07:14 UTC+3; details and URLs in `2026-10-27-report.md`)
Reference games:
1. **Water-sort family** (Magic Sort! — Grand Games, iOS US free puzzle #3 on 2026-10-27; Water Sort Zen — Easybrain; Decant; Brimful; Sortl). The liquid/glass/pour fantasy is instantly understood. Their rules (top colour moves onto the same colour) are not used here.
2. **Rotate Rings** (Nebula Studio; iOS US free #6, GP US puzzle #1 on 2026-10-27; 62,684 iOS ratings, 4.80). Players read layered objects. Complaints: ads after every round, "too easy".
3. **Royal Smash!** (Cypher Games; GP US casual #1 on 2026-10-27; 145,241 iOS ratings, 4.70; GP 453K reviews). One input, then a cause-and-effect chain reaction is the payoff. Complaints: "quickly becomes tedious", "waiting for it to get more challenging", ball count cut on hard levels ("invisible paywall").
4. **Sand Blocks / Sand Strata lineage**: build a layered target bottom-up (Sand Strata, GF-20261019-02, is our own earlier concept: one hopper, permanent sand layers). Fizz Tower shares only the layered-target goal format. The tower, the push-down displacement and the rockers are new, and mistakes can be flushed out.
5. **Sparkling Tower Master** (Hanoi Games; TapTap listing, Android release 2026-10-09; 0 listed downloads). The same champagne-tower fantasy as continuous physics (hold to pour, slide to aim, the cradle tilts with weight, glasses shatter). It has no colours, layers, displacement or discrete routing. **Adjacency flag for Burak** (theme, not rules).
Market signals:
- Sorting puzzles: IAP revenue up 130% half-over-half in H1 2026 (Sensor Tower via NetMarvel). **[third-party]**
- "Physics smash = hottest new category of 2026" (Next Big Games, 2026-08-27; Smash Fest ~$4M IAP, Royal Smash ~$1M / 8.9M downloads). **[third-party estimates]** Cause-and-effect spectacle sells.
- GameCatalog (2026-10-04): "the chart is rewarding instantly readable physical propositions — rings, falling sand, traffic, pixel reveals". **[editorial]**
- Our own pipeline: tester Hook stuck at 10/15 on every deterministic grid puzzle (Spillproof, Shish Lane, Turnover, Whisk Away R2–R4), and Visuals at 7 on Whisk Away. **[tester, simulation]**
Opportunities: (a) a pour that moves a lot of liquid across the screen with every tap (hook), (b) no timers (Sand Blocks/Block Out reviews, 10-26), (c) depth that a greedy player can't fake (Royal Smash "too easy/tedious" complaints).
Uncertainties: no download/revenue data for any tower-pour game; whether players read displacement plus rockers without a preview (H2); 2 colours per level may feel thin by level 30+.

## C. Core Gameplay Concept
- **Player controls:** 1–4 bottles hanging above the top glass(es) of a tower.
- **Primary action:** tap a bottle → it tips and pours **one measure** of its colour into the top glass beneath it.
- **Rules (exact; mirror `core2.py`):**
  1. Every glass has a capacity of **1 measure** (a short "coupe") or **2 measures** (a tall "highball", layered bottom-up) and **leans left or right** (drawn tilted, with a little spout on the low lip).
  2. A measure arriving at a glass that has room **settles on top**. The pour ends.
  3. A measure arriving at a **full** glass settles on top, and the glass's **old top layer is pushed out** over the low lip. It falls into the glass below on that side (row r+1: left child = same column, right child = column+1, brick layout). Repeat rule 2/3 with the pushed measure.
  4. If no glass is below the low lip, the pushed measure **drips onto the tablecloth** and is lost (it still counted as a pour).
  5. **Rocker glasses** sit on a brass rocking coaster. Each time a rocker glass pushes a measure out, it **tips to the other side** after the spill. Fixed glasses never change lean.
  6. **Win:** every glass holds exactly its target layers (shown as faint dashed bands inside the glass, bottom to top). Bottles never run out.
  7. **Budget:** pours = par + 2 (shown as bubbles on a straw, "Pours 3/8"). Undo is allowed and costs 1 pour (pattern 10). Restart is free and resets everything.
  8. **Fail:** budget exhausted, or the exact solver proves the target can't be reached in the pours left. Then show a gentle "This tower can't be finished in N pours" card with Undo (only if undoing can still win) and Restart. No hearts, no timer.
- **Structure:** level-based, 10 handmade/filtered towers in the MVP; each level takes 30–120 s.
- **How players improve:** they learn to read the tower backwards. The colour that must end lowest goes in first; a rocker's lean alternates with every overflow, so you count spills; a deliberate drip onto the cloth is a legal way to rock a coaster.
- **Why enjoyable:** each tap is a little Rube Goldberg moment (the pour visibly shoves layers down 1–3 glasses), and the solution is an "aha" about order, not a reflex or a guess.

## D. First 10 Seconds (L1 "First Pour")
- **Screen:** a 3-glass zig-zag tower on a white tablecloth under warm party lights; one cherry-soda bottle hovers above the top glass and bobs gently. The glasses show faint red dashed fill marks. There is no text except a tiny "Pours 0/5".
- **Understanding:** the bottle bobs and has a soft pulsing ring (affordance). The glasses visibly lean, with a spout on the low lip.
- **First action:** tap the bottle. It tips, pours a fizzy stream with bubbles, and the top glass fills with a "glug" and a fizz pop.
- **Second tap (≤5 s):** the glass is full, so the new soda pushes the old soda over the spout. It arcs down into the next glass, and both glasses shimmer. The third tap sends a two-step cascade to the bottom glass. Tower complete → the glasses clink in sequence from top to bottom, foam domes rise, confetti, "Cheers!"
- **Curiosity hook:** in L2 (≤10 s later) a second bottle (lime) appears and the bottom glass's mark is lime. Players who pour red first see red land at the bottom, and they immediately get it: *what I pour first ends lowest.*
- **Contextual hints (no tutorial screens):** L2 shows a one-time ghost arrow from the lime bottle if no pour has been made after 4 s. L3 shows one pulse on the rocker coaster the first time it tips.

## E. Signature Gameplay Moment
**The long push.** Late in a level, with every glass full, one tap sends a measure into the top glass. It shoves a layer out, which tips a rocker, which shoves the next layer, and so on, until the last displaced measure drops into the one glass still waiting. Three glasses change colour in a ripple down the tower, the rockers rock in sequence (tick… tick… tick, rising in pitch), and the final settle completes the tower → the cascade clink. It comes straight from the rules: the reference lines of L5–L10 all end with a 3-glass push (`land3` in `pack_v1.json`).

## F. Controls and Interaction
- **Controls:** tap a bottle. That is the only game verb. There is **no gesture classification** (Whisk Away lesson: WA-001, WA-021).
- **Mapping:** tap on the bottle's hit box (≥ 64×64 CSS px, bottle art inside it) → one pour from that bottle.
- **Response:** the bottle tips within 50 ms, the stream starts at 80 ms, and the whole cascade takes 350 ms + 250 ms per glass travelled (≤ 1.2 s for 3 steps).
- **During an animation:** a tap anywhere **finishes the current animation instantly** and is otherwise consumed (no queued pours, no stray moves; SL-011/WA-018 lessons). Undo/Restart/Next are inactive while an overlay is animating in, and taps for 250 ms after an overlay closes are ignored (taps, not long presses).
- **Undo** (bottom-left, labelled "Undo −1"), **Restart** (bottom-right, free), menu (top-left). Buttons ≥ 48 px and ≥ 24 px away from the lowest bottle row.
- **Failure/cancellation:** there is no partial pour; a tap is atomic. A mis-tap is recoverable by Undo at a cost of 1 pour.
- **Accessibility:** colours are always paired with a pattern (cherry = dots, lime = stripes, blueberry = waves) inside the liquid and on the target bands; leans are drawn by glass tilt + spout + a small chevron on the coaster; rockers have a distinct brass coaster with two feet; optional "show spill path" toggle in the menu (see K Optional). Reduced motion: cascades play at 2× speed with no camera shake.
- **Desktop:** click = tap; keys 1–4 = bottles left to right, Z = undo, R = restart.

## G. Visual and Audio Direction
- **Art style:** clean 2D "soda-party" vector look. Thick-walled glass with a bright rim highlight and a subtle refraction band; liquids are saturated and semi-translucent, with rising bubbles. The tablecloth is white linen and the background a warm out-of-focus party bokeh. **Distinctive signature:** the tower stands in a brick-like zig-zag, every glass visibly tilted with a chrome spout, and brass rockers that rock with a satisfying overshoot. It should read as *a precarious, fun tower*, not a grid.
- **Palette:** cherry red #E8344E (dots), lime #8BD43A (stripes), blueberry #3F6FE0 (waves); glass #FFFFFF at 25% with #FFFFFF rim; tablecloth #F7F3EA; background gradient #2B1B3D → #5A2E5C with warm bokeh. Target bands: 2 px dashed outline in the target colour with a 15% fill.
- **Camera:** fixed, framing the whole tower with ≥ 12% margin; the tower scales to fit width or height (max 7 glasses wide in the MVP).
- **Shapes:** coupe (wide, short, 1 measure) vs highball (tall, 2 measures), so capacity reads from shape alone. Bottles are classic glass soda bottles with a coloured label and pattern.
- **Animation principles:** liquid is a 2D fill with a wobbling surface (spring) and a bezier stream for pours/spills. Each displaced layer **lifts out as a ribbon over the spout** and arcs into the next glass. Rockers tip with ease-out-back (overshoot 8°) over 180 ms. A glass that just reached its target gets a sparkle on the rim and a tiny bounce.
- **Particles/impact:** fizz bubbles on every settle; a splash crown when a stream lands; a dark drip stain on the tablecloth for each lost measure (it stays for the level as a visible cost); confetti + foam domes on win.
- **Audio:** pour glug (pitch by colour), a fizz pop on settle, a wooden "tock" for a rocker tip, rising in pitch with each consecutive step of a cascade, a drip "plip" for loss, and a cascading glass clink chord on win (one note per glass, top to bottom).

## H. Game Feel
- **Primary interaction:** bottle tip with anticipation (2° back-tilt for 40 ms, then pour). The stream is visible within 80 ms; the haptic is a light tick on settle.
- **Success (a glass matches its target):** rim sparkle + soft chime; the band outline turns solid.
- **Chain (push cascade):** each step adds +1 semitone to the tock and a 1-frame glass flash; 3-step pushes get a short slow-mo (0.8× for the last step).
- **Impact:** the splash crown scales with the drop height.
- **Mistake:** wrong colours sitting in a glass are not punished at once (they can be flushed out later). A drip onto the cloth leaves a stain + "plip". The stuck card appears only when the solver proves the tower is unwinnable within the pours left.
- **Level complete:** clink chord top → bottom (80 ms apart), foam domes, stars: 3★ = par, 2★ = par+1, 1★ = par+2 (undos count as pours).
- **Restart:** glasses drain upward in reverse (300 ms), the stains fade, the bottles bob back.
- **Timing/weight:** liquid is heavy and quick, never floaty; the whole cascade is under 1.2 s, so a 10-pour level animates for under 10 s in total.

## I. Gameplay Progression (MVP pack `sim/fizz/pack_v1.json`; colours A = cherry, B = lime, C = blueberry)
Notation: glass (row, col), cap, lean L/R, "rocker" if on a coaster, → target layers bottom→top. Children of (r,c): left (r+1,c), right (r+1,c+1). Bottles hang above row-0 glass `col`.

| L | Name | New interaction | Par/Budget | States | RAND | GREEDY | GREEDY2 | FILLFIRST | Rockers load-bearing |
|---|---|---|---|---|---|---|---|---|---|
| 1 | First Pour | pour + push cascade | 3/5 | 4 | 100 | 100 | 100 | 100 | – (none) |
| 2 | Bottom First | 2 colours: first poured ends lowest | 3/5 | 15 | 37.5 | 0 | 0 | 0 | – |
| 3 | Rock On | rocker coasters; a drip as a tool | 5/7 | 25 | 25.0 | 0 | 0 | 0 | yes (unsolvable without) |
| 4 | Twin Tops | 2 top glasses + 2-layer highball | 6/8 | 106 | 6.01 | 0 | 0 | 0 | yes (par 5 without) |
| 5 | Tall Order | 6-glass tower, one bottle pair, long pushes | 7/9 | 383 | 2.34 | 0 | 0 | 0 | yes (unsolvable) |
| 6 | One Blue | a single-dose colour, 3 bottles | 7/9 | 520 | 4.12 | 0 | 0 | 0 | yes (unsolvable) |
| 7 | Drip on Purpose | deliberate 2-step spill to rock a coaster | 8/10 | 622 | 1.50 | 0 | 0 | 0 | yes (par 7 without) |
| 8 | Rock Garden | 5 rockers | 9/11 | 1,637 | 0.70 | 0 | 0.64 | 0 | yes (unsolvable) |
| 9 | Deep Layers | stacked highballs at the bottom | 9/11 | 2,919 | 0.65 | 0 | 1.47 | 0 | yes (unsolvable) |
| 10 | Grand Toast | 4 bottles over 2 tops (finale) | 10/12 | 8,193 | 0.19 | 0 | 0 | 0 | yes (unsolvable) |
All % are **[SIM]** exact clear rates within par+2. RAND = uniform random bottle; GREEDY = maximise matching layers after the pour; GREEDY2 = 2-ply lookahead on the same score; FILLFIRST = prefer pours that settle without pushing. Every level has ≥2 good openings except L1. **L10 is strictly hardest on 3 measures:** par (10 vs ≤9), search space (8,193 vs ≤2,919) and random clear rate (0.19% vs ≥0.65%). L8 and L9 tie on par 9 but differ in space and structure.

Three sample stages in detail:
- **L2 "Bottom First"** — glasses (0,0) cap1 R → A; (1,1) cap1 L → A; (2,1) cap1 L → B. Bottles A and B over col 0. Reference: B, A, A. *Learns:* the first pour gets pushed all the way down. A greedy "put red in the red-marked glass now" fails (0%).
- **L3 "Rock On"** — (0,0) cap1 L **rocker** → A; (1,1) cap1 R **rocker** → A; (2,2) cap1 R → B. Bottles B, A over col 0. Reference: B (settle), B (pushes, rocker tips, drip off the left), B (pushed to (1,1)), A (drip), A (pushes B down to (2,2)). *Learns:* coasters alternate, and a drip onto the cloth is a legal way to rock one. *Builder note:* if the first playtest shows this is too much for L3, swap it with L4 (H2 experiment).
- **L7 "Drip on Purpose"** — (0,0) cap2 L rocker → A,B; (0,1) cap1 L → B; (1,0) cap1 L → B; (1,1) cap1 L rocker → B; (2,0) cap2 L rocker → B,A. Bottles B, A over col 0; B over col 1. Reference: A, B, B, A, B, B(2-step drip), B, B@1. *Learns:* planning a sacrifice 2 glasses deep, and using the second top glass last.
Full layouts for L1–L10 are in `pack_v1.json` (glasses, bottles, targets, reference line). The builder must load the pack, not re-generate it.

## J. Replayability
- **Mastery:** 3★ = par; players replay to remove their undo/drip.
- **Different approaches:** every level L2–L10 has ≥2 good openings **[SIM]**, so there's more than one line.
- **Discovery:** future elements (K Future) change the routing graph, not just counts.
- **Daily tower:** a generated daily level from the same filters (Future).
- **Not artificial:** stars come from par only; no random drops, no boosters in the MVP.

## K. MVP Scope
**Essential (validates the core hypothesis):**
- The exact rules C1–C8 (port `core2.py` 1:1), the 10-level pack, the budget + costed undo + free restart, the exact solver-based stuck card (state spaces ≤ 8,193, so a BFS per move is cheap), stars.
- The pour/push/rocker animations of G/H, including the ribbon-over-the-spout push and the drip stain. **The cascade must be legible: the player must see which layer leaves which glass and where it lands.**
- Patterned colours, the portrait layout 320–430 px wide, desktop letterbox (390×844) like other repo games.
- Logic tests: replay every reference line → win at par; JS-vs-Python fidelity on ≥ 400 random pour sequences per level (compare final states).
**Optional:**
- "Show spill path" toggle (draws a dotted route from each bottle through full glasses for the current state). An experiment for H2. If built, it must be OFF by default, and the tester measures it separately.
- Haptics, a level select, a reduced-motion setting.
**Future (not in the MVP):** ice-cube glasses (hold 1 but pass every second pour), a fixed splitter jug (alternates outputs like a rocker but never fills), a stirring straw that swaps a highball's two layers, a third colour regularly from L11, daily tower, cosmetic glass sets, party-venue meta.

## L. Technical Considerations
- **Engine:** plain Canvas 2D or Phaser 3; no physics library is needed (the logic is discrete; liquid motion is tweened). Logic is ~80 lines (`core2.py`).
- **State:** `contents[glass] = array of colours`, `lean[glass]`, `poursUsed`, undo stack of full snapshots.
- **Animation:** a pour resolves logically at once; the renderer plays the event list returned by `pour()` (settle / push(from,to,colour) / rock(glass) / drip). This keeps logic and rendering separate and testable.
- **Solver:** BFS/DFS with memo on (state, pours used); max 8,193 reachable states (L10). Run it after each move in a microtask, and paint the board first (Whisk Away WA-008/WA-020 lesson).
- **Performance:** ≤ 7 glasses + bubbles; cap particles at 150; target 60 fps on mid phones, ≥ 50 at 4× CPU throttle.
- **Unity later:** trivial to port; the liquid shader/wobble is the only art-tech item.
- **Testing:** headless reference lines, random-sequence fidelity, input tests (tap during animation, rapid taps after overlays), screen sizes 320×568 … 430×932 + desktop.

## M. Acceptance Criteria
**Objective:**
1. All 10 reference lines in `pack_v1.json` win at exactly par in the build (headless).
2. JS rules match `core2.py` on ≥ 400 random pour sequences per level (0 mismatches).
3. Lazy-policy odds reproduced from the build's own logic within ±0.5 pp: L4–L10 RAND ≤ 6.1%, GREEDY 0%, GREEDY2 ≤ 1.5%, FILLFIRST 0%. L10 strictly hardest on par, states and RAND.
4. Each tap produces exactly one pour; a tap during an animation never produces a second pour; 0 stray pours in a rapid-tap test (3–6 taps at 60–200 ms) after Next/Retry/Restart/Undo.
5. The stuck card appears iff the solver says the remaining pours can't win; Undo is offered only if undoing can still win; budget arithmetic is correct ("1 pour"/"N pours").
6. Bottle hit boxes ≥ 64 px, buttons ≥ 48 px, nothing clipped at 320×568; colours distinguishable in greyscale via patterns.
7. Cascade ≤ 1.2 s; first frame of a level within 1 s at 4× CPU; worst 30-frame window ≥ 50 fps at 4×.
**Subjective hypotheses (Game Tester + human playtest):**
- H1 (depth): players can't win L5+ by tapping whatever looks right **[SIM supports]**; humans can still solve L4–L7 within 2 attempts.
- H2 (readability): after L3, ≥ 4 of 5 players can say what will happen before a pour that pushes one layer; rockers are understood by L5.
- H3 (hook): first-time players do ≥ 3 pours within 10 s and describe the cascade as satisfying; tester Hook ≥ 12/15.
- H4 (aha): players verbalise "pour the bottom colour first" by L2–L3.
- H5 (feel): the push ribbon + rocker tock make cascades feel physical, not like a grid update.

## N. Design Risks (with experiments)
| Risk | Why | Experiment |
|---|---|---|
| Readability of pushes (H2) | Displacement is new; players may expect "overflow = waste". | L1–L2 teach it with 1 colour, then 2. Test the "show spill path" toggle ON vs OFF with 5 players each; if OFF fails, make it a one-shot per-level "peek" that forbids 3★. |
| Rocker overload | Tracking 4–5 alternating coasters is heavy (L8). | Measure think-time per pour on L8; if > 20 s median, cap rockers at 3 per level until L12. |
| Repetitive interaction | One verb for all levels. | New interaction per level (table I); future elements change routing. Tester checks that L4–L10 feel different. |
| Drip-to-rock feels like a trick | A deliberate waste pour may feel "gamey". | Watch whether players discover it on L3/L7 unaided; if not, a one-time L3 ghost hint. |
| Two colours feel thin | All MVP levels use 2 colours. | Ask in the playtest; prototype a 3-colour L11 from the generator if wanted (`gen2.py`, 3-colour branch exists). |
| Lazy play / dominant strategy | Pattern 1. | **[SIM]** done: 4 policies exact (table I). Tester re-measures on the build (M3). |
| Free oracle via stuck card + undo | Pattern 10. | Undo costs 1 pour; the stuck card only fires when it's proven. Measure a "pour, undo when stuck" policy on the build (should be ≤ 30% on L5+). |
| Theme adjacency | Sparkling Tower Master (2026-10), water-sort genre, our Sand Strata layered goal. | Burak decides; the rules are different (see B). The tester scores originality as usual. |
| Animation cost | Liquid ribbons + bubbles on low-end phones. | fps gate M7; reduce bubbles first. |

### Degenerate strategies that must fail (objective, per level, on the build)
- Random bottle taps: ≤ 6.1% on L4–L10 (≤ 1% on L8–L10).
- "Put the colour this glass needs on top right now" (GREEDY): 0% on L2–L10.
- "Prefer pours that don't push anything" (FILLFIRST): 0% on L2–L10.
- 2-ply greedy: ≤ 1.5% on L4–L10.

## O. Concept Score (design hypothesis; see report for evidence)
| Criterion | Max | Score | Reason |
|---|---|---|---|
| Core gameplay and fun potential | 25 | **18** | Anti-greedy "bottom first" insight + rocker parity give real order decisions (lazy ≤ 6% L4+ [SIM]) inside a one-tap spectacle; risk: reading 3-step pushes with 4–5 rockers. |
| Originality and differentiation | 20 | **13** | No game found with displacement routing + rocker glasses; but the glass/pour theme is crowded (water sort), Sparkling Tower Master shares the tower fantasy, and Sand Strata shares the layered goal. |
| Market evidence and opportunity | 20 | **15** | Sorting/liquid is the hottest puzzle segment (H1 2026), cause-and-effect spectacle sells (Royal Smash #1 GP casual); no data on tower-pour games specifically. |
| Web MVP feasibility | 15 | **14** | Tiny discrete logic, ≤ 8,193 states, 2D tweens; the only effort is liquid art. |
| Mobile control suitability | 10 | **9** | A single tap on large bottles; no gestures to classify; atomic moves. |
| Production and commercial potential | 10 | **7** | A generator exists, levels are cheap, skins and daily towers are natural; long-term depth beyond ~50 levels needs the Future elements. |
| **Total** | 100 | **76** | **Promising (70–84): refine readability first.** |
**Evidence confidence:** medium-low (market evidence is genre-level, depth is simulation-only, readability is untested).
**Recommendation:** build the MVP as specified; the tester validates H2 (readability) and H3 (hook) first. If H2 fails with the path toggle OFF, test it ON before any redesign.

### Handoff summary (for the parent to send)
- **Must not be compromised:** the push rule (a pour into a full glass pushes the old top layer out toward the lean) and rocker coasters that flip after every spill, with exact discrete outcomes and readable cascades.
- **Key entertainment hypothesis:** a single tap that visibly shoves liquid down a tower, plus the "pour the bottom colour first / count the rocks" insight, is both instantly satisfying and a real decision puzzle.
- **Signature moment:** the long push (E).
- **Minimum viable experience:** L1–L10 with exact rules, costed undo, an exact stuck card, and legible push/rocker animations.
- **Permitted simplifications:** no physics engine, flat 2D liquid, placeholder audio, no level select, no meta, no haptics.
- **Tester must validate:** M1–M7, the degenerate strategies, H1–H5, especially push readability (H2) and Hook (H3) vs the 10/15 ceiling.
