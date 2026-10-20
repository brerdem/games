# Spillproof — Game Brief v1

| Field | Value |
|---|---|
| ID | **GF-20261020-01** |
| Slug | `spillproof` (folder `spillproof/` in brerdem/games) |
| Title | **Spillproof** (working title; iTunes search on 2026-10-20 found no game with this name; "Brimful" was dropped because of an existing iOS app "Brimful: Sort & Pack") |
| Version | v1, 2026-10-20 (Game Finder) |
| Orientation | Portrait (390×844 reference frame, same letterbox shell as the other games) |
| Target | Mobile-first web prototype (HTML/JS, single page, no network, no build step required) |
| Genre | Hybridcasual no-guess logic puzzle (deduction + physical water payoff) |
| Score | **71/100 — promising band; evidence confidence medium-low** |
| Recommendation | Build a web prototype for Game Tester validation. Not production-ready. No Unity/native work without Burak. |
| IP flag for Burak | **Rules are close to the public "Aquarium" pen-and-paper logic genre** (as Meowdoku ≈ Star Battle/Queens). The new parts are the pipes (shared waterline), the checked pour with 3 drops, ducks, the auto-dry gauges and the water presentation. Don't use the word "Aquarium" in the title; no cat mascot or Meowdoku-style art. |

---

## A. Concept

**One-sentence pitch:** A no-guess logic puzzle where you pour water into glass tanks that fill flat under gravity, use row and column gauges to work out every waterline, and connect tanks with brass pipes so they share one waterline. Every pour is checked, and a wrong pour spills one of your 3 drops.

**Core fantasy:** "I'm the engineer who never spills." You read a wall of glass tanks, *know* where every waterline sits, and fill them with confident pours. When a pour hits a piped tank, water rushes through the pipes and levels out across the board.

**Player's main goal:** Fill every tank to its exact waterline using ≤2 spills (3rd spill = fail). For 3★: zero spills and no hint.

**What makes it different:**
1. **Gravity makes the cells depend on each other.** In Queens/Meowdoku each cell is its own decision. Here a tank is one number: its waterline. Pouring one cell commits every cell below it in that tank. Each deduction is "how high is this tank?", and the answer arrives as one big physical fill.
2. **Pipes.** Tanks linked by a pipe share one absolute waterline (communicating vessels). A pour in one tank fills the linked tanks to the same height on the board. That creates long-range deductions across the board and the signature "Pressure Rush" moment.
3. **A checked commit with a cost (Meowdoku's hearts, which the market already accepts).** Guessing is possible but punished. Previews and dry marks are free and never leak the answer.
4. **Auto-dry gauges.** When a line's gauge is satisfied, its remaining cells frost over automatically. That gives a chain of visual "pops" without the player doing busywork.

**Why people would want to play it:**
- Meowdoku is the #1 iOS free game in the US today (Apple RSS and Sensor Tower, 2026-10-20). That shows mass-market demand for strict "guessing won't save you" logic puzzles with hearts.
- Players complain that Arrows, Rotate Rings and Pixel Flow are "too easy", "same levels", or "designed to fail without boosters". Spillproof's levels are filtered so lazy strategies lose (see M), and no level needs a booster.
- Water filling is a calming, satisfying visual, as in the water-sort genre's long success. Here it is the payoff for thinking, not a reflex.

## B. Market Reasoning

All observations are 2026-10-20 between 07:06 and 07:50 (UTC+3), US charts unless noted. Ranks were verified on the stated page. Counts are store rating counts, not downloads.

| Reference game | Developer | Platform | Genre | Observed facts | Relevance |
|---|---|---|---|---|---|
| Meowdoku! | Oakever Games | iOS + GP | Queens / Star Battle logic + hearts | **iOS Top Free #1** for the 3rd day (Apple RSS and Sensor Tower). GP puzzle #1 (Sensor Tower). AppBrain popular ▲4 to #16. iOS 349,145 ratings, 4.81★. GP 10M+, 4.7★. Released 2026-05-19, updated 2026-10-19. Store copy: "Guessing won't save you". | Proves the market accepts strict deduction with hearts. |
| Meowdoku player complaints | — | GP reviews, r/puzzles, X | — | GP reviews mention a forced ad every level, scam pop-up ads, and no ad-free option. r/puzzles thread "The ads during Meowdoku are awful" (https://redd.it/1x8cqik). ≥50 Meowdoku-titled r/puzzles posts in about 30 days (Arctic Shift limit hit). X posts complain about AI-made Meowdoku UA video ads (anecdotal). Autocomplete: "meowdoku ads", "meowdoku answers", "meowdoku level 20…79". | Opportunity: lighter ads and level-specific help. Players get stuck on specific levels, which is a hint-monetisation signal (hypothesis). |
| Oakever's other logic ports | Oakever | iOS | Logic skins | iOS ratings: MeowTrail 20 (released 2026-07-15), Molesweeper! 9, Twindoku 21, Connect Tracks 852. | **A cute skin on a classic logic genre is not enough.** Spillproof must win on its new mechanics and payoff, not on a skin. |
| Queens clone wave | many | iOS | Queens | 21 of 45 iTunes results for "queens puzzle" were released in 2026 (Pawdoku 7,905 ratings; Queens Master by Kwalee 13,721). | The Queens space is crowded, so pick a *different* logic family. |
| Amaze GO! | Oakever | iOS + GP | Arrow escape | iOS #14, GP puzzle #4 (Sensor Tower), AppBrain popular #8. GP 100M+ (4.9★). 237,469 iOS ratings. Released 2026-02-13. Complaint: mis-taps cost lives. | Lives-based puzzles scale. **Accidental mis-taps must not cost lives** → Spillproof uses preview-then-confirm. |
| Arrows – Puzzle Escape / Rotate Rings | various | GP | Arrow / rings puzzle | GP 100M+ / 5M+. Reviews: "too easy… nightmare level is just a lot of lines"; "same 4 levels", "so easy, boring". | Depth complaints → levels are filtered against lazy play. |
| Pixel Flow, Magic Sort, Bus Fever Party! | various | iOS + GP | Sort / queue puzzles | Bus Fever ▲4 to iOS #4. Pixel Flow GP puzzle #11. Reviews: levels designed to fail without boosters; hidden colours force guessing. | **Unfair difficulty makes players angry** → no level needs luck or a booster (P1: solvable with 0 guesses). |
| Aquarium-genre and aquarium-themed apps | Ben Miller ("Aquarium Logic Puzzle", io.github.benmiller3.aquifer); Pivot Games ("Puzzle Aquarium", "My Little Aquarium") | GP | Logic | 1K+ (4.6★); 500K+ and 100K+ (4.4★). The Pivot titles are puzzle collections with fish/decor meta, and reviews mention "too many ads". | **The rules are not new.** The genre exists in niche apps with no strong mass-market version (hypothesis). Pipes, checked pours and the presentation are the differentiators. |

**Hypotheses (not facts):** (H-M1) Oakever's success comes from a strict, fair logic core plus hearts and a cute shell, so a different logic family with a stronger physical payoff can reach the same audience. (H-M2) Water filling is a stronger creative hook for ads than a static grid, but this is untested.

**Audience:** 25–55, puzzle and brain-training players (the Queens, Sudoku, Meowdoku and Block Blast audience), with short sessions of 1–4 minutes per level.

## C. Core Gameplay

**Rules (the whole game):**
1. The board is a grid split into **tanks** (regions with thick glass borders). Each tank is either empty or filled **from its bottom up to one flat waterline**. Every cell of the tank at or below that line is water. Every cell above it is dry. Water cannot float.
2. **Row gauges** (right of each row) and **column gauges** (under each column) show how many water cells that line contains. "?" means the gauge is hidden.
3. **Brass pipes** connect some tanks. Connected tanks share **one waterline at the same board height**. If that line is above a tank's top, the tank is brim-full. If it is below the tank's floor, the tank is empty.
4. A **duck** sits on the water surface. It marks the tank's (and its pipe group's) waterline row: the duck's cell is water, and every cell of that tank above that row is dry.
5. Every level has exactly one solution, and it can be reached by pure logic (verified, see M).

**Player actions:**
- **Tap a cell → preview.** A ghost waterline shows that tank (and any tanks piped to it) filled up to this cell's row. The gauges show ghost counts in a faint colour. The preview is **never checked and leaks nothing**.
- **Tap the same cell again (or press the POUR button) → pour.** The pour is checked against the solution.
  - **Correct** (the real waterline is at or above this row): water rises with a glug to this row in the tank and in all linked tanks, permanently. The committed level only ever rises.
  - **Wrong** (the real waterline is lower): the water overflows, the glass cracks, the water drains back to the previous committed level, **one drop is lost**, and every cell of that tank group at or above the attempted row frosts over as known-dry (true information, as in Meowdoku).
- **Long-press a cell (≥350 ms), or tap it in Mark mode → dry mark (✕ frost).** It is free, never checked, and can be toggled off. A later correct pour that covers a marked cell clears the mark.
- **Hint (1 per level):** reveals one cell fact (water or dry) that the full solver can prove from the current state, with a highlight pulse. Using it caps the result at 2★.

**Systems:**
- **Auto-dry:** when a gauge's committed water count equals its number, all its remaining unpoured cells frost automatically. These are true facts. Gauges never auto-fill water: the player has to pour.
- **Drops (hearts):** 3. The third spill fails the level, and Retry restarts the same puzzle fresh.
- **Win:** every water cell has been poured (every group's committed level equals its solution). The player never has to mark dry cells to win.
- **Stars:** 3★ = 0 spills and 0 hints. 2★ = ≤1 spill (hint allowed). 1★ = cleared.
- **No timer** and nothing moves on its own. All pressure comes from the player's own pour decisions.

**Challenge:** working out each tank's waterline from line counts that cross several tanks, using gravity (a tank contributes 0…k cells to a row, in order), hidden gauges, and pipes that tie distant tanks together.

**Failure condition:** 3 spills. **Reward:** stars, a cascade finale, and a level-complete splash showing the "Spillproof!" stamp for 0 spills.

**How players improve (techniques the ladder teaches):**
- full/empty lines;
- "gauge satisfied → the rest is dry";
- a tank's bottom row comes first (gravity order);
- "this row needs 3 and only tanks X and Y can reach it";
- pipe levelling ("if A is at row 4, then B is also at row 4");
- hidden-gauge totals (the sum of all rows = the sum of all columns);
- what-if elimination for tier-2 levels.

**Continuous or level-based:** level-based (12 hand-ordered, sandbox-filtered levels in the MVP). A daily puzzle and an endless generator come later.

## D. First 10 Seconds

1. On load, **Level 1 "First Pour"** (5×5) opens immediately with no menu. The board appears as dark glass tanks. Gauges tick up to their numbers with a brass "tink".
2. A finger icon pulses on the **bottom-row gauge "5"**, with a 4-word bubble: **"5 of 5 → all water"**.
3. The player taps a bottom cell. A ghost water layer appears. The bubble says **"Tap again to pour"**. Second tap → a deep *glug*, water rises across the bottom row of tanks D and F, the gauge goes mint and dings.
4. Next bubble on column 0's gauge "5": the player pours it, and tank A fills with a loud *rush* (it is the first big fill).
5. Row 1's gauge "1" is now satisfied by A's cell → **auto-dry frost sweeps** across the rest of row 1. Bubble: **"Line done → rest dries"**.
6. Duck tip (one bubble, first time a duck is visible): **"Duck = water surface"**.
7. The player finishes the level in about 40–60 s. Finale: all ducks squeak, the board shimmers, 3★.

The player understands the goal within 5 s (fill tanks to match the numbers). There are no text walls. Max 3 tutorial bubbles in Level 1, 1 in Level 2 ("Hidden gauges show ?" appears on Level 4, and the pipe tip on Level 5).

## E. Signature Moment — "Pressure Rush"

When the player pours into a **piped tank**:
1. Water rises in the poured tank (0.25 s).
2. A **bright level line** (a 2-px laser line with a soft glow) shoots out horizontally from the waterline across the whole board (0.2 s).
3. The **brass pipe pulses** (a bead of light travels along it with a whoosh), and the linked tanks fill up to the laser line simultaneously (0.3 s), with water sloshing in each.
4. Every gauge that becomes satisfied pops in sequence, each one a semitone higher (pentatonic). **Auto-dry frost sweeps** fan out along those lines.
5. A mild screen-shake (2 px) and a medium haptic tick.

That makes one deduction look like a chain reaction (a "satisfying cascade" clip for ads). On later levels the player *aims* for it: they work out a pipe group's level and take one pour that resolves 3–4 gauges at once.

## F. Controls

- **Primary input:** tap (preview) → tap again (pour). Accidental single taps never cost a drop (this answers the Amaze GO mis-tap complaint).
- **Secondary:** long-press (350 ms) toggles a dry mark. A **Mark/Pour toggle** button at the bottom (thumb zone) does the same for players who prefer it. Tapping outside the board or on another tank cancels the preview.
- **Touch targets:** cells must be ≥42 px at 360 px width and ≥44 px at 390 px width for 8×8 boards (8×44 = 352 px + 34-px gauge column fits in 390 px). Gauges are display-only. Buttons ≥48 px.
- **Gestures:** none besides tap and long-press. No drag, no timing.
- **One-handed:** yes. All buttons are in the bottom 30% of the screen, and the board sits in the middle.
- **Accessibility:**
  - Tanks are distinguished by thick borders, not colour.
  - Water and frost differ in luminance *and* pattern (bubbles vs stipple).
  - Large numerals.
  - Haptics are optional, sound can be muted, and there is a reduce-motion setting that shortens the cascade.
  - No time pressure. Colour-blind safe.
- **Desktop (testing):**
  - mouse click = tap; right-click = mark;
  - arrow keys move a cursor, Space/Enter = preview, then pour;
  - X = mark, H = hint, R = restart (with confirm), M = mute, Esc = pause/menu.

## G. Visual and Audio Direction

- **Style:** "Night Conservatory".
  - Background: a deep ink-navy gradient (#0B1426 → #14233D) with a faint brass grid.
  - Tanks: frosted glass panes (#1E2E4A at 70%) separated by **4-px brass seams** (#C99A4B) with rivet dots at the corners.
  - Water: luminous teal (#2FD9C9 at the surface, darkening to #0E8C9A at the bottom), with a 2-px bright meniscus line and slow caustic shimmer (a cheap moving gradient is fine).
  - Dry/frost: pale lavender stipple (#B9B6E8 at 35%).
  - Spill crack: amber (#FFB347).
- **Pipes:** brass tubes drawn on top of the seams between linked tanks (Bézier or orthogonal routing along the grid lines), with a small valve wheel at each end. The connected tanks get a matching brass nameplate glyph (●, ▲, ◆) so the links stay readable even when the tubes cross.
- **Ducks:** tiny yellow rubber ducks floating on the meniscus with a 1-px bob.
- **Gauges:** brass tube counters. Each shows a big rounded numeral and a mini fill bar (committed / target). When satisfied, the gauge glows mint (#7CF5B0). "?" gauges are smoked glass.
- **Camera:** fixed orthographic top-down 2D. The board is centred in the middle 60% of the screen.
  - HUD top: level number and title, 3 drop icons, hint button (lightbulb with a "1").
  - Bottom bar: Pour/Mark toggle, Restart, Menu.
- **Distinctive visual element:** the **waterline laser** during Pressure Rush, plus sloshing water (spring settle with 2–3 damped oscillations) on every pour.
- **Audio:**
  - glug pitch tied to pour height (higher row = higher pitch);
  - pipe whoosh plus a metallic ring;
  - gauge "tink" (rising pentatonic in cascades);
  - frost crackle on auto-dry;
  - glass crack plus drip on a spill;
  - a finale chord plus duck squeaks;
  - an optional soft ambient room-tone loop (off by default if it is the only audio file).
- **Optional A/B skin "Sand" (a toggle in settings, same rules):** tanks become hourglass glass and the water becomes fine coloured sand with a pouring stream. This is only to test whether the theme matters; it is not essential.

## H. Game Feel

- **Pour:** water height tweens with ease-out-back (0.22–0.30 s) and settles with a slosh (spring k≈180, damping≈14). Bubbles rise in newly filled cells. Light haptic (10 ms).
- **Preview:** the ghost water is 35% opacity with a dashed waterline. Ghost gauge numbers appear in grey next to the targets (e.g. "3/4"). There is no cue that hints whether the preview is correct.
- **Gauge satisfied:** the numeral pops (scale 1→1.25→1, 0.15 s), turns mint and tinks. The auto-dry frost sweeps cell by cell (30 ms stagger) with a crackle.
- **Spill:** water overshoots 6 px, a crack line draws across the tank (0.12 s), the screen shakes 4 px, a drop icon shatters, the water drains back (0.35 s), frost appears on the cells now known to be dry, and a heavy haptic fires (30 ms). No "Game over" sting until the 3rd spill.
- **Pressure Rush:** see E. Total ≤0.9 s, and input stays responsive: the next tap can queue during the animation.
- **Win:** all gauges flash in a wave from the top-left. Water across the board does one synchronised slosh, then ducks squeak, then stars drop in, then a "Spillproof!" stamp if there were 0 spills.
- **Fail:** remaining water drains with a sad descending glug. Retry is one tap.
- **Performance:** 60 fps target on mid-range phones, ≥50 fps on desktop with 4× CPU throttle.

## I. Progression

**MVP ladder (12 levels, embedded in this brief, Appendix 1):**

| # | Title | Size | Pipes | Hidden gauges | Solve tier | Teaches |
|---|---|---|---|---|---|---|
| 1 | First Pour | 5×5 | 0 | 0 | 0 (counting) | full lines, auto-dry, duck |
| 2 | Two Gauges | 5×5 | 0 | 0 | 1 | a row count that only certain tanks can supply |
| 3 | Hidden Floor | 6×6 | 0 | 0 | 1 | empty tanks; gravity order |
| 4 | Blind Row | 6×6 | 0 | 2 | 1 | hidden "?" gauges; using totals |
| 5 | First Pipe | 7×7 | 1 | 2 | 1 | shared waterline |
| 6 | Long Pipe | 7×7 | 1 | 3 | 1 | a pipe across the board |
| 7 | Short Fuse | 7×7 | 1 | 3 | 2 | first what-if (contradiction) level |
| 8 | Twin Pipes | 7×7 | 2 | 3 | 2 | two pipe groups |
| 9 | Cross Current | 7×7 | 2 | 3 | 2 | pipes crossing deductions |
| 10 | Deep Cistern | 8×8 | 2 | 4 | 2 | bigger board |
| 11 | Three Siphons | 8×8 | 3 | 4 | 2 | three pipe groups |
| 12 | Grand Cistern | 8×8 | 3 | 4 | 2 | finale |

**Three sample levels:**
- **Level 1 "First Pour" (onboarding):** 5×5, 6 tanks, all gauges visible, and a duck on tank E. The deduction chain the tutorial follows:
  1. Bottom row 5/5 → pour D and F.
  2. Column 0 is 5 → A is full.
  3. Row 1 = 1 is satisfied by A → C and B are dry in row 1.
  4. Row 0 = 4 → B's top is dry.
  5. The duck fixes E at row 3, so row 3 = 4 → F's upper cell is dry → column 4 forces B's row-2 cell to be water.
  6. Row 2 = 4 → C is water at row 2.
  The whole chain needs counting only (tier 0).
- **Level 5 "First Pipe" (first new mechanic):** 7×7, 14 tanks. Tank I (the row-4 pair) is piped to tank N (right edge, rows 5–6). Column 6's gauge is hidden.
  - The solution has a shared waterline at row 4: I is filled at row 4, and N is brim-full because the line is above its top.
  - What it teaches: "pouring N's top won't tell you about I, but I's level decides N".
  - The pipe is necessary: without it the puzzle is no longer unique.
- **Level 12 "Grand Cistern" (mastery):** 8×8, 16 tanks, 3 pipe groups (B–J, K–I, C–E) and 4 hidden gauges. It needs tier-2 what-if reasoning (contradiction probing), and all 3 pipes are necessary. A lazy counting player who guesses at random fails 29/30 runs.

**Difficulty curve:** sizes go 5×5 → 8×8; hidden gauges 0 → 4; pipes 0 → 3; solve tier 0 → 1 (from L2) → 2 (from L7). L7 is the intended first "aha, what-if" spike, and L8 is a short breather.

**New elements later (not MVP):**
- **bubble** = a known dry cell;
- **fish** = a known water cell;
- **one-way valve** (a pipe that equalises only if the source tank is higher; this needs a sandbox test first);
- **cracked tank** (always empty);
- 9×9 and 10×10 boards for the daily puzzle.

**Meta (later):** restore a night conservatory or aquarium hall. Stars buy decorations (plants, fish, lights). This is a light collection layer and must never gate levels.

## J. Replayability

- **Mastery:** 3★ (0 spills, 0 hints) is hard to get by luck. A counting player who guesses at random gets a 0-spill clear in ≤4/300 runs on L4–L12 (sandbox).
- **Daily puzzle (post-MVP):** a generator plus the same filters as the MVP levels, with a streak counter. Autocomplete shows demand for "queens game unlimited / archive" (observed 2026-10-20).
- **Endless mode (post-MVP):** precomputed level packs (generation is offline; see L for yields).
- **Personal best:** solve time is recorded quietly (shown on the results screen, never as a countdown), plus a "spill-free streak".
- **Variety:** pipe layouts, hidden-gauge patterns, ducks, and later clue types (I).

## K. MVP Scope

**Essential (must ship in the prototype):**
1. All rules in C: tanks, gravity fill, row/column gauges with hidden "?", pipes (shared waterline), ducks.
2. Tap-preview → tap-pour, the checked commit, 3 drops, the spill reveal (frosting cells at or above the attempted row in that group), auto-dry, free dry marks (long-press + Mark toggle).
3. The 12 levels from Appendix 1 **exactly as given** (do not regenerate or tweak them without re-running the M tests).
4. Stars (3/2/1), 1 bit-hint per level (the 3★ cap), Retry, level select with stars, progress saved in localStorage.
5. Pressure Rush (E), pour/spill/win feel (H), and sound (synthesised WebAudio is fine).
6. Tutorial bubbles (D) on L1, L4 and L5.
7. A logic module (`logic.js`) with: the rules, a solver (T0/T1/T2 plus a solution counter), the policies D1–D7, and a CI test script that reproduces the M tables (see Appendix 2).
8. Portrait letterbox shell (390×844 frame on desktop, full screen on phones), as the other games already use.

**Optional:** Sand skin toggle; hint reason text ("Row 4 needs 2 more; only G can reach it"); a reduce-motion toggle; a level generator to experiment with endless mode.

**Future (not in MVP):** daily puzzle, conservatory meta, new clue types, ads/fail offer (+1 drop), IAP hints, leaderboards, cloud save.

## L. Technical Implementation

- **Engine:** plain HTML + Canvas 2D (or SVG/DOM, since the grid is small) + vanilla JS. **No physics engine:** water is a per-group integer level animated with tweens. Fully deterministic.
- **Data model:**
  - Level: `grid` (rows of tank letters), `pipes` (pairs of tank letters → union-find groups), `rowClues` / `colClues` (null = hidden), `ducks` ([row, col]), `solutionFirstWaterRow` (per tank; row 0 = top; a value equal to the row count means the tank is empty; piped tanks have equal values).
  - State per group: `committedLevel` (starts at "empty"; only decreases numerically, i.e. water rises), the `frost` set (known-dry cells), the `marks` set (player marks), `spills`, `hintsUsed`.
- **Rules check:** a pour at cell (r, c) of group g is correct iff `solution[g] <= r`.
  - If correct: `committedLevel[g] = min(committedLevel[g], r)`.
  - If wrong: spills++, and frost every cell of group g with row ≤ r.
  - Auto-dry: for each line with a visible clue, if the committed water count equals the clue, frost all non-water cells in that line.
  - Win: `committedLevel[g] == solution[g]` for every g.
- **Solver (for CI and the hint):** a domain per group, i.e. the set of possible levels {each row the group occupies} ∪ {empty}. Ducks fix their group's domain.
  - **T0 (counting):** per line, compute min/max possible water. If max == clue, push every group to its max contribution; if min == clue, push to its min.
  - **T1 (arc consistency):** per line, a subset-sum DP over the groups' possible contributions removes unsupported values.
  - **T2 (what-if):** for each remaining value, assume it, run T1, and remove it on contradiction.
  - **Uniqueness:** backtracking with T1 propagation, capped at 2 solutions.
  - The reference code is in Appendix 2 (about 70 lines from the sandbox).
- **Hint:** take the current knowledge state (committed water, frost from spills and auto-dry, ducks), run the full solver, choose one undecided cell whose state is now provable (prefer the group with the largest domain), reveal it as water (pour it) or dry (frost it), and pulse it.
- **Performance:** trivial (≤8×8, ≤17 tanks). The solver runs in under 5 ms per level in Node. Animation is a handful of tweens.
- **Level generation:** offline only, never at runtime in the MVP. Sandbox yields with full filters were 0.02–0.2% for small piped boards and up to about 31% for unpiped 7×7 boards with 3 hidden gauges → precomputed packs.
- **Unity/native later:** a direct port (data-driven, no physics). Only if Burak approves.

## M. Acceptance Criteria

### M1. Objective tests (CI must reproduce them; the numbers are sandbox results with seed 2026)

A "counting player" = a player who applies T0 (min/max line counting, including auto-dry equivalents and ducks) and then guesses when stuck. Each guess is a checked pour (3 drops). Cells already known to be water are poured for free.

| ID | Degenerate strategy that must FAIL | Objective test | Threshold | Sandbox result |
|---|---|---|---|---|
| D1 | Pure guessing (no deduction, pour random or lowest cells) | 30 runs per level | fail ≥90% on every level | L1 27/30, L2 29/30, L3–L12 30/30 ✅ |
| D2 | Count + always pour the **lowest** undecided cell | deterministic | must lose on L4–L12 | loses L4–L12 ✅ (wins L1–L3, tutorial) |
| D3 | Count + pour the **most likely** cell (largest share of possible levels) | deterministic | must lose on L4–L12 | loses L4–L12 ✅ (wins L1–L3) |
| D4 | Count + **assume full** (pour the highest undecided cell) | deterministic | must lose on L3–L12 | loses L3–L12 ✅ (wins L1–L2) |
| D5 | Count + random guess | 30 runs per level | fail ≥60% on L4–L12 | L4 25, L5 22, L6 26, L7 25, L8 29, L9 26, L10 30, L11 28, L12 29 (/30) ✅ |
| D6 | Getting **3★ by luck** (counting + random guesses, 0 spills) | 300 runs per level | ≤3% on L4–L12 | L4 3, L5 2, L6 3, L7 1, L8 1, L9 4, L10 1, L11 0, L12 0 (/300) ✅ (max 1.3%) |
| D7 | Counting + the **1 hint** + random guesses (hint used as a crutch) | 30 runs per level | fail ≥60% on L4–L12 | L4 27, L5 21, L6 19, L7 24, L8 25, L9 25, L10 28, L11 29, L12 26 (/30) ✅ (min 63%) |
| D8 | **Preview fishing** (using the ghost preview to detect the answer) | UI test: preview a correct row and a wrong row in the same tank | identical rendering, sounds and timing; no network; no state change | to verify in the build |
| D9 | **Mark fishing** (marks or auto-dry leaking unproven info) | UI test: marking any cell never changes gauges, frost or hints; auto-dry fires only from *committed* water | 0 leaks | to verify in the build |
| D10 | **Spill-and-retry memorising** (fail on purpose to learn cells, then retry) | Retry resets the board (frost, water, drops). Memorised replays can clear for 1–2★ only if the player plays perfectly. | allowed path, but 3★ needs 0 spills in that run | design rule, verify in the build |

| ID | Positive control that must PASS | Test | Result |
|---|---|---|---|
| P1 | The full solver (T2) clears every level with **0 guesses / 0 spills** | deterministic | 0 guesses on all 12 ✅ |
| P2 | Every pipe is **necessary** (removing it breaks uniqueness) | per pipe | L5 1/1, L6 1/1, L7 1/1, L8 2/2, L9 2/2, L10 2/2, L11 3/3, L12 3/3 ✅ |
| P3 | Unique solution | backtracking count = 1 | 12/12 ✅ |
| P4 | Tier ladder | T0 solves L1; T1 solves L2–L6; L7–L12 need T2 | ✅ |

### M2. Build and UI objective checks
- All 12 levels load from embedded data. The stored solutions match the gauges (CI recomputes the gauges from the solutions).
- Touch targets as in F. Every action can be done with taps only. Long-press and the Mark toggle are equivalent.
- A spill frosts exactly the cells with row ≤ the attempted row in that group. Auto-dry is correct.
- Linked tanks always show the same waterline height.
- Win and fail are reachable by touch. Stars follow the rules. Progress persists across reloads.
- No network requests, works from file:// and GitHub Pages. ≥50 fps on desktop with 4× CPU throttle. No console errors.

### M3. Enjoyment hypotheses (Game Tester judges; not CI)
- **H1 (core):** players feel "I *knew* that" on most pours, and spills feel like their own fault, not bad luck. Target: ≥70% of spills on L4+ happen on cells the solver could not yet prove (i.e. real guesses), not on UI errors.
- **H2:** Pressure Rush is the moment testers mention first. Target: ≥3 of 5 testers name the pipe surge, or the laser and cascade, as the best moment.
- **H3:** the difficulty ramp feels fair. Target: median L7 solve without a hint by first-time logic-puzzle players. L7 should be the first level where some players use the hint.
- **H4:** "one more level". Target: in testing sessions, ≥60% of players who clear L5 voluntarily continue to L8.
- **H5:** the water theme beats a flat grid. A/B with the Sand skin or a plain grid; the hypothesis is that water scores highest on "satisfying".

## N. Design Risks

| Risk | Why it matters | Mitigation / experiment |
|---|---|---|
| R1. **Genre closeness (Aquarium)** | The rules are a known public genre, so originality is moderate and clones are easy. | Flagged for Burak. Pipes, the checked pour and Pressure Rush are the distinct parts. Experiment: testers rate "feels new" with and without pipes (P2 already proves pipes matter logically). |
| R2. **Lazy play wins** (the documented failure pattern) | Unfiltered random boards were won 87–99% of the time by counting + guessing in the sandbox. | Levels are filtered (D2–D7). CI must re-run the tests on any level change. Never ship unfiltered generated levels. |
| R3. **Pipes are cosmetic** | Linking alone does not add depth (yield fell from 31% to 19.5% when 2 pipes were added without a necessity filter). | The P2 necessity filter. Tester checks that pipe deductions are noticed (H2). |
| R4. **Too abstract or hard for casual players** | Aquarium is less known than Queens, and tier-2 levels could feel like a wall. | Tutorial bubbles, the ladder ramp, 1 hint. Measure the L4/L7 clear rate without a hint; if it is too low, move L7 later or add a duck. |
| R5. **Repetitive single verb** | Every action is the same "pour". | New elements every 3–4 levels post-MVP (I). The tester rates boredom at L10–12. |
| R6. **Readability on 8×8** | Thin borders and crossing pipes get confusing. | 4-px seams, nameplate glyphs on piped tanks, a squint test on a 360-px screenshot. |
| R7. **Monetisation backlash** | Meowdoku's ad complaints. | Later: lighter ads plus paid hints, a fail offer, and no forced ad every level (an untested business hypothesis). |
| R8. **Level supply** | Strict filters have low yield (0.02–0.2% for small piped boards). | Offline generation of packs; the generator is already proven in the sandbox. |

## O. Score

| Category | Max | Score | Reason |
|---|---|---|---|
| Core fun potential | 25 | 18 | The strict-deduction core is proven by Meowdoku; gravity, a physical payoff and pipe cascades add satisfaction. The fun itself is untested (sandbox tests only check logic). |
| Originality | 20 | 10 | Built on the public Aquarium genre. Pipes, the checked pour, ducks and auto-dry are new combinations, but the core rule is known. Flagged. |
| Market evidence | 20 | 15 | #1 iOS free is a strict logic-and-hearts puzzle. Strong complaints about easy or unfair puzzles in other top titles. But Oakever's other logic skins flopped, and the Aquarium apps are niche. |
| Web MVP feasibility | 15 | 14 | Tiny grid, no physics, levels and solver already done and embedded. |
| Mobile controls | 10 | 8 | Tap-to-preview, tap-to-pour is simple and mis-tap safe. Long-press marks are slightly hidden, so a toggle is provided. |
| Production / commercial | 10 | 6 | Cheap content pipeline (generator); hints and fail offers fit. Retention depends on new mechanics after the MVP; no live data. |
| **Total** | **100** | **71** | **Promising (70–84).** Confidence: **medium-low** (market evidence is indirect; the fun hypothesis is unvalidated). |

---

## Appendix 1 — Level data (v1, must be used verbatim)

Format: `grid` rows are listed top to bottom (row 0 = top), and each letter is a tank. `pipes` are pairs of tanks sharing one waterline. `rowClues` and `colClues` use `null` for hidden "?". `ducks` = [row, col] surface markers. `solutionFirstWaterRow[T]` = the first (topmost) water row of tank T: every cell of T with row ≥ that value is water. A value equal to the row count (e.g. 5 on a 5×5 board) means empty. Piped tanks always share the same value.

```json
[
{"level":1,"title":"First Pour","size":[5,5],"grid":["AAAAB","ACCCB","DCCEB","DEEEF","DDDFF"],"pipes":[],"rowClues":[4,1,4,4,5],"colClues":[5,4,4,3,2],"ducks":[[3,1]],"solutionFirstWaterRow":{"A":0,"B":2,"C":2,"D":2,"E":3,"F":4}},
{"level":2,"title":"Two Gauges","size":[5,5],"grid":["AABBB","CABBB","CCBDE","CCDDE","FFFDD"],"pipes":[],"rowClues":[2,2,3,3,2],"colClues":[4,4,1,1,2],"ducks":[],"solutionFirstWaterRow":{"A":0,"B":2,"C":1,"D":4,"E":3,"F":5}},
{"level":3,"title":"Hidden Floor","size":[6,6],"grid":["AABCDD","AABCCC","EABFFF","EGBFFH","EGIIIH","EIIJJH"],"pipes":[],"rowClues":[2,3,1,2,2,2],"colClues":[1,1,2,1,2,5],"ducks":[],"solutionFirstWaterRow":{"A":3,"B":2,"C":1,"D":0,"E":5,"F":4,"G":4,"H":3,"I":6,"J":6}},
{"level":4,"title":"Blind Row","size":[6,6],"grid":["AAABCC","ADEBFF","GDEEHH","GDDHHI","GJKKLI","JJKKLI"],"pipes":[],"rowClues":[2,null,2,4,2,null],"colClues":[3,3,3,4,2,2],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":1,"C":0,"D":3,"E":2,"F":2,"G":4,"H":3,"I":5,"J":4,"K":5,"L":6}},
{"level":5,"title":"First Pipe","size":[7,7],"grid":["AABBBCC","AABDBCC","EEDDFFC","GHHDDFF","GIIDJKK","LMMJJKN","LLMJJKN"],"pipes":[["I","N"]],"rowClues":[3,4,1,2,2,3,null],"colClues":[2,3,4,3,4,1,null],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":0,"C":2,"D":5,"E":3,"F":3,"G":5,"H":4,"I":4,"J":5,"K":7,"L":6,"M":6,"N":4}},
{"level":6,"title":"Long Pipe","size":[7,7],"grid":["AABBCCD","EBBBCCD","EEFBCDD","GEFHHDI","GEFJJJI","KKLJMMN","KLLLMMN"],"pipes":[["I","L"]],"rowClues":[4,4,5,null,4,null,6],"colClues":[3,6,5,6,null,4,4],"ducks":[],"solutionFirstWaterRow":{"A":0,"B":0,"C":3,"D":1,"E":2,"F":4,"G":4,"H":3,"I":4,"J":5,"K":7,"L":4,"M":5,"N":6}},
{"level":7,"title":"Short Fuse","size":[7,7],"grid":["AAABBCD","AEFFBCD","GEHIIJK","GEHHJJK","LMMMNOO","LLMNNOO","LLLPPOO"],"pipes":[["O","D"]],"rowClues":[null,2,2,5,3,3,null],"colClues":[1,3,2,2,null,4,2],"ducks":[],"solutionFirstWaterRow":{"A":2,"B":1,"C":1,"D":6,"E":2,"F":2,"G":3,"H":4,"I":3,"J":2,"K":3,"L":7,"M":4,"N":5,"O":6,"P":7}},
{"level":8,"title":"Twin Pipes","size":[7,7],"grid":["AABCCCD","AABCEDD","AFBBEDD","GFHIEJD","GKHIJJL","MKHINNL","MKHHNNL"],"pipes":[["F","N"],["M","J"]],"rowClues":[null,null,3,1,2,3,7],"colClues":[3,3,4,5,3,null,1],"ducks":[],"solutionFirstWaterRow":{"A":2,"B":1,"C":0,"D":4,"E":3,"F":6,"G":4,"H":5,"I":5,"J":6,"K":4,"L":6,"M":6,"N":6}},
{"level":9,"title":"Cross Current","size":[7,7],"grid":["ABCCDEF","ABCCDEF","AGGCDDD","HGGGDII","HJKKLIM","HJNKLOM","HHNKLOO"],"pipes":[["C","F"],["A","D"]],"rowClues":[2,null,null,4,null,3,5],"colClues":[4,5,1,2,1,4,3],"ducks":[],"solutionFirstWaterRow":{"A":4,"B":0,"C":2,"D":4,"E":0,"F":2,"G":3,"H":3,"I":4,"J":5,"K":7,"L":6,"M":4,"N":7,"O":6}},
{"level":10,"title":"Deep Cistern","size":[8,8],"grid":["AABBCCDD","EEBBCCCD","EEBBFCGG","HEBIFJGG","HEKIJJGG","HKKIILMM","NNKOOLLP","NNKOOLPP"],"pipes":[["J","M"],["H","L"]],"rowClues":[2,3,4,null,null,null,1,6],"colClues":[null,5,2,2,4,3,4,5],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":4,"C":2,"D":0,"E":1,"F":2,"G":4,"H":7,"I":4,"J":4,"K":6,"L":7,"M":4,"N":7,"O":8,"P":7}},
{"level":11,"title":"Three Siphons","size":[8,8],"grid":["AAABBCDD","EEAABCCD","FFGGHHHI","FJGGKHLI","FJMKKHLL","NJMMKKLL","NOOMMPLQ","NOOOPPQQ"],"pipes":[["D","Q"],["A","J"],["I","E"]],"rowClues":[1,4,2,null,4,5,4,8],"colClues":[5,null,3,null,5,5,null,3],"ducks":[],"solutionFirstWaterRow":{"A":5,"B":1,"C":0,"D":1,"E":4,"F":2,"G":3,"H":4,"I":4,"J":5,"K":4,"L":7,"M":5,"N":6,"O":7,"P":7,"Q":1}},
{"level":12,"title":"Grand Cistern","size":[8,8],"grid":["ABCCDDEE","ABBFDDGE","AAFFFFGE","HIJFKLLM","HIJJKLMM","HHHJKKKK","NNNJOPPP","NNNJOPPP"],"pipes":[["B","J"],["K","I"],["C","E"]],"rowClues":[null,5,7,4,6,8,null,8],"colClues":[4,6,null,6,6,5,null,5],"ducks":[],"solutionFirstWaterRow":{"A":1,"B":1,"C":2,"D":1,"E":2,"F":2,"G":3,"H":5,"I":3,"J":1,"K":3,"L":5,"M":4,"N":7,"O":7,"P":6}}
]
```

## Appendix 2 — Reference solver and policies (sandbox code, Node ESM; port as-is to logic.js)

Internally, tanks are merged into **groups** by union-find over the pipes. A group's level `t` is the first water row. Its domain is {every row the group occupies} ∪ {lastRow+1 = empty}. A duck at (r, c) fixes its group's domain to {r}.

```js
const contrib=(rs,t)=>{let n=0;for(const r of rs)if(r>=t)n++;return n}; // rs = rows of this group's cells in one line
// lines: one entry per VISIBLE clue: {count, groups:[{g, rs:[row of each of g's cells in this line]}]}
function propT0(L,D){let changed=true,any=false;           // counting only
  while(changed){changed=false;
    for(const l of L){let mn=0,mx=0;const info=[];
      for(const {g,rs} of l.groups){const cs=[...D[g]].map(t=>contrib(rs,t));const a=Math.min(...cs),b=Math.max(...cs);mn+=a;mx+=b;info.push({g,rs,a,b})}
      if(mn>l.count||mx<l.count)return 'contra';
      if(mx===l.count&&mn<mx){for(const x of info)if(x.a<x.b){D[x.g]=new Set([...D[x.g]].filter(t=>contrib(x.rs,t)===x.b));changed=any=true}}
      else if(mn===l.count&&mn<mx){for(const x of info)if(x.a<x.b){D[x.g]=new Set([...D[x.g]].filter(t=>contrib(x.rs,t)===x.a));changed=any=true}}}
    for(const d of D)if(d.size===0)return 'contra';}
  return any;}
function propT1(L,D){let changed=true,any=false;           // per-line arc consistency (subset-sum DP)
  while(changed){changed=false;
    for(const l of L){const gs=l.groups,k=gs.length;const opts=gs.map(({g,rs})=>[...D[g]].map(t=>[t,contrib(rs,t)]));
      const fw=[new Set([0])];for(let i=0;i<k;i++){const s=new Set();for(const a of fw[i])for(const [,v] of opts[i])if(a+v<=l.count)s.add(a+v);fw.push(s)}
      if(!fw[k].has(l.count))return 'contra';
      const bw=Array(k+1);bw[k]=new Set([0]);for(let i=k-1;i>=0;i--){const s=new Set();for(const a of bw[i+1])for(const [,v] of opts[i])if(a+v<=l.count)s.add(a+v);bw[i]=s}
      for(let i=0;i<k;i++){const keep=opts[i].filter(([t,v])=>{for(const a of fw[i])if(bw[i+1].has(l.count-a-v))return true;return false}).map(x=>x[0]);
        if(keep.length<opts[i].length){D[gs[i].g]=new Set(keep);changed=any=true;if(!keep.length)return 'contra'}}}}
  return any;}
function propT2(L,D){let any=false;                          // what-if probing on top of T1
  for(let g=0;g<D.length;g++){if(D[g].size<2)continue;
    for(const v of [...D[g]]){const E=D.map(s=>new Set(s));E[g]=new Set([v]);
      if(propT1(L,E)==='contra'){D[g].delete(v);any=true;if(propT1(L,D)==='contra')return 'contra'}}}
  return any;}
// Player simulation: deduce with 'none'|'T0'|'T1'|'T2', then guess when stuck.
// A guess = pour at row r of group g (asserts t_g<=r); correct iff sol[g]<=r; wrong => mistake, D[g] keeps only t>r. 3 mistakes = loss.
// Win = for every group max(D[g])==sol[g] (all water cells known/poured).
// Guess rules: 'bottom' = lowest uncertain cell (largest r); 'prob' = cell with the largest share of D[g] values <= r;
// 'top' = highest uncertain cell (smallest r); 'rand' = uniform over uncertain (g,r).
// Uncertain (g,r): r is a row of g with min(D[g]) <= r < max(D[g]).
// D7 hint-bit (sandbox approximation): once, on the group with the largest domain, reveal whether sol[g] <= median-ish row.
```
The sandbox source and outputs (Game Finder box, for reference only) are in `/workspace/game-ideas/sim/spillproof/`: lib.mjs, final.mjs, luck3star.mjs, spillproof_levels_v1.json, spillproof_level_tests.md and luck3star_out.md.

## Appendix 3 — Sandbox evidence for the riskiest rule hypothesis (simulation, not a playtest)

**Riskiest hypothesis:** "Aquarium + pipes + checked pours produces levels where deduction beats lazy counting plus guessing."
- **Unfiltered random boards fail that test.** With all gauges visible, counting + guessing won **87–99%** of random 6×6–8×8 boards. Most random boards are counting-trivial.
- **Hiding gauges + a policy filter fixes it.** A level is kept only if it has a unique solution, the counting + random guess player fails at least 60% of runs (≥0.6), all three fixed lazy policies lose (from L4), and the full solver needs 0 guesses. With these filters, D2–D7 all fail on L4–L12 (table M1).
- **Pipes don't add depth by themselves.** On 7×7 boards with 3 hidden gauges, 31% of boards passed without pipes but 19.5% passed with 2 random pipes. Pipes are therefore filtered for necessity (P2), so every shipped pipe is load-bearing.
- **Hint strength matters.** Revealing a whole tank made a lazy player win too often (as low as 3% fail on some levels). One cell fact (bit) per level keeps D7 fail at 63–97% on L4–L12.
- **Not tested by the sandbox:** whether it is *fun*, how readable it is, how long solves take for humans, and whether the pipe moment lands emotionally (M3).
