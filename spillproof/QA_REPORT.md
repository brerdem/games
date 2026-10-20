# Spillproof: R0 QA Report
Game ID GF-20261020-01 v1 · slug `spillproof` · Tester: Game Tester (Grok Bot) · 2026-10-20 (UTC+3)

## A. Verdict
**REVISE: 68/100.** The puzzle core is sound. My independent solver confirms that all 12 levels have exactly one solution, every pipe is necessary, and the tiers match the brief (L1 T0, L2–6 T1, L7–12 T2). Touch play wins with 3★ on every level I tested. Two things block a PASS:
- **Mobile** is below its gate. Cells are 19–28 px in landscape, and the tutorial bubble covers cells and eats taps.
- **Originality** is below its gate because the game is very close to Aquarium.

There is also one design hole: tier-2 levels can be beaten by a player who uses only single-line logic and guesses the rest, often still earning 3★ by luck (SP-001). Three things are not P0 crashes but must be fixed: the overlay triple-tap ghost pour (SP-002), ghost marks from drag-out and pointercancel (SP-005), and the bubble eating taps (SP-003).

## B. Build under test
- Repo HEAD `a448959` (2026-10-20 07:58:43 UTC+3). The game was added in `8125a08` (07:56:00 UTC+3).
- The live files (index.html, game.js, logic.js) at https://brerdem.github.io/games/spillproof/ are byte-identical to the repo.
- BRIEF.md is identical to `/workspace/game-ideas/2026-10-20-spillproof-BRIEF.md`. The shipped levels match Appendix 1.
- CI run 39372414490 (job `spillproof`) is green. It runs `logic.test.mjs` (8 tests) and `browser.test.mjs` (6 tests). What CI actually covers:
  - **Mouse only:** `page.mouse.click`, with no touch.
  - **Portrait only:** 390 and 360 wide, no landscape.
  - **Tutorial skipped:** it calls `dismissTut()`, so it never sees the bubble.
  - **No lockout or double-tap checks** on overlays.
  - **Perf test is idle:** it measures 1 s of idle rAF and never solves anything.
  - **D6 covers counting players only.** It never tests a single-line-logic player who guesses.

## C. Method
- **Solver:** `tools/spillproof/qsolve.mjs`, an independent model. It counts solutions and runs tier deduction with T0 (counting), T1 (per-line enumeration/GAC) and T2 (what-if).
- **Policy sweeps (SIMULATION):** 300 seeds per random policy (`q_play.mjs`).
- **Browser:** Playwright with real CDP touch across 17 viewports:
  - Portrait 360, 375, 390, 393, 412, 414, 430
  - Tablet 768
  - Landscape 667, 740, 844, 932
  - Desktop 1024, 1280, 1366, 1440, 1920
- **Browser checks:**
  - off-screen sweep of all 12 levels
  - full touch play-throughs
  - lose states
  - overlay double and triple taps
  - gestures (release outside, cancel, long-press, jitter)
  - keyboard
  - file:// and network
  - CPU throttle
  - audio log
- Screenshots are in `shots/` and raw data in `data/`.

## D. Rubric
| Area | Score | Gate | Note |
|---|---|---|---|
| Core | 15/20 | ≥14 ✔ | Unique solutions, logic-solvable, clean frost rule. Guessing still pays on T2 (SP-001). |
| Feel | 14/20 | ≥14 ✔ | Preview, then pour, is clear, and the audio sequence is good. Ghost pour and ghost marks hurt it. |
| Hook | 10/15 | ≥10 ✔ | The tension of the 3-drop limit works. H2–H5 are not measured with humans. |
| Progression | 10/15 | – | T0→T1→T2 is present, but T2 can be skipped by guessing. |
| Visuals | 8/10 | – | Clean, readable "blueprint" look. |
| Mobile | 6/10 | ≥7 ✘ | Landscape cells 19–28 px, bubble occludes cells, 42 px cells at 360. |
| Originality | 5/10 | ≥6 ✘ | Essentially Aquarium (the Nikoli-style tank puzzle) plus a spill penalty. |
| **Total** | **68/100** | | **REVISE** |

## E. Acceptance criteria: claimed vs verified
| AC | Builder claim | Verified | Evidence |
|---|---|---|---|
| P1 logic-solvable with 0 guesses | PASS | **PASS** | T2 solves all 12 with 0 guesses (o_levels.txt) |
| P2 every pipe needed | PASS | **PASS** | Removing any pipe gives 2 solutions |
| P3 unique | PASS | **PASS** | countSolutions = 1 on all 12 |
| P4 tiers | PASS | **PASS** | L1 T0, L2–6 T1, L7–12 T2. T1 makes no opening progress on L10 and L12. |
| D1 random clicker fails | PASS | **PASS** | none+rand clears 0–6% on L4+ |
| D2/D3 counting players lose L4+ | PASS | **PASS** | T0 deterministic policies lose L4–12 |
| D4 | PASS | **PASS** | Matches the brief |
| D5/D7 | PASS | **PASS (sim)** | T0+rand clears 4–25% on L4+ |
| D6 lucky 3★ ≤3% | PASS | **PASS for counting players only; FAIL for T1+guessing** | T1+rand gets 3★ on 51/12/30/26/29/17% of L7–12 (SP-001) |
| D8 preview reveals nothing | PASS | **PASS** | Correct and wrong previews are identical: alpha .35, dashed, same colour, no sound, no state change |
| D9 marks leak nothing | PASS | **PASS (CI)**, with a partial issue | Marks leak no information, but gestures create marks by accident (SP-005) |
| D10 retry fully resets | PASS | **PASS** | Tested via fail-retry and confirm. Hint is reset too. |
| Frost rule | PASS | **PASS** | Expected frost equals observed. 3 spills open the fail panel (L4, L12 in the browser). |
| Frosted cell costs no drop | deviation | **PASS** | Re-tapping a frosted cell left spills unchanged |
| Hint costs no drop, real fact | PASS | **PASS** | The H key gives a fact and spills stay 0. A second hint does nothing (one per attempt). "Prefers dry" was not separately measured. |
| UI: cells ≥44 at 390, ≥42 at 360, buttons ≥48 | PASS | **PASS in portrait; FAIL in landscape** | L12 cells: 21 (667×375), 19 (740×360), 23 (844×390), 28 (932×430) |
| No off-screen elements | PASS | **PASS** | 0 off-screen cells or buttons across 17 viewports × 12 levels |
| file:// works offline | PASS | **PASS** | 0 HTTP requests, win reached. Live load is 3 same-origin requests. |
| ≥50 fps at 4× throttle | 60.7 | **PASS on desktop, FAIL on mobile emulation** | Desktop L12 solve at 4×: 60.0 fps. Mobile emulation 390 dpr2 at 4×: 38.1 fps (p95 33 ms). 6× desktop: 55.5 fps. |
| No page errors | PASS | **PASS** | Only AudioContext autoplay warnings |
| Save/persistence | PASS | **PASS** | Stars, mute and unlocks survive a reload. Locked levels cannot be selected. |
| H1–H5 | tester | See section G | |

## F. Issues
**SP-001: Tier-2 levels can be beaten by single-line logic plus guessing**
- Severity: P1. Classification: Design.
- Observed (SIMULATION, 300 seeds): T1+rand clears L7–12 at 100/58/98/97/97/84% and gets 3★ at 51/12/30/26/29/17%. A deterministic T1 player who always picks the lowest option wins every level. T1+prob gets 3★ on L10 and L12.
- Expected: per H1/H3, the T2 levels should require what-if reasoning, and lucky 3★ should stay ≤3%.
- Repro: `node tools/spillproof/q_play.mjs`.
- Recommendation:
  - Make T2 levels need ≥2 independent what-if steps.
  - Leave fewer drops on T2 levels.
  - Award 3★ only for 0 spills AND a deduction-forced order, or add a T1+guess policy to the M1 and D6 tests.
- Acceptance: T1+rand clears ≤40% and gets 3★ ≤3% on L7–12.
- Owner: Finder + Builder.

**SP-002: Triple tap on an overlay button pours on the board (ghost pour)**
- Severity: P2. Classification: Bug.
- Observed: there is no input lockout after an overlay closes. A triple tap (≈70 ms apart) on win-Retry, confirm-Yes or Resume previews and then pours the cell underneath, recording spills = 1. A triple tap on win-Next poured a cell on the next level.
- Expected: board input is ignored for ≥300 ms after any overlay closes.
- Repro: edge.mjs `dbl` section, m390.
- Evidence: data/edge_dbl.json.
- Recommendation: block board input for 300 ms after any overlay closes, and require a pointerdown that starts after the overlay closed.
- Acceptance: a ×3 tap on every overlay button leaves spills and committed state unchanged.
- Owner: Builder.

**SP-003: Tutorial bubble covers board cells and eats taps**
- Severity: P2. Classification: UX/Bug.
- Observed: on L1, L4 and L5 at nearly every viewport, the bubble covers 2–4 cells in portrait and 12–21 cells on landscape L5. A tap on a covered cell hits the bubble. This caused my touch play-throughs of L4 and L5 to stall.
- Expected: the bubble never sits over a live cell, or taps pass through to the board.
- Evidence: shots/land844_B_03_L5_bubble.png, data/bubble.json.
- Recommendation: anchor the bubble outside the board rect, or dismiss it on any board tap and forward that tap to the cell.
- Acceptance: 0 covered cells on all 17 viewports.
- Owner: Builder.

**SP-004: Landscape cells are 19–28 px**
- Severity: P2. Classification: Mobile.
- Observed: the stage goes full-screen when width or height is ≤520 px, so the board is limited by the 78+88 px top and bottom bars. L12 cells measure 19–28 px and L5 cells 22–32 px.
- Expected: ≥42 px cells, or a rotate prompt.
- Evidence: shots/land740_L_02_L12.png, data/layout.json.
- Recommendation: in landscape, move the HUD and buttons into side rails, or show "rotate to portrait".
- Acceptance: cells ≥42 px at 667×375 and above, or the rotate gate is shown.
- Owner: Builder.

**SP-005: Ghost marks from drag-out and pointercancel**
- Severity: P3. Classification: Bug.
- Observed: the 350 ms hold timer is not cancelled when the finger moves or on pointercancel. Dragging off a cell and releasing outside leaves a mark. touchCancel followed by a wait also marks the cell. A later long-press then toggles that ghost mark off.
- Expected: movement >10 px or a pointercancel aborts the hold.
- Repro: edge.mjs `gest` section.
- Acceptance: drag-out and cancel leave marks unchanged.
- Owner: Builder.

**SP-006: Win panel has no focus, so Enter does not advance**
- Severity: P3. Classification: A11y.
- Observed: when the win panel opens, `document.activeElement` is BODY and pressing Enter does nothing.
- Recommendation: focus the Next button when the panel opens.
- Owner: Builder.

**SP-007: Below 50 fps under 4× throttle on mobile emulation**
- Severity: P3. Classification: Perf.
- Observed: 38.1 fps (p95 33 ms) at 390 dpr2 during an L12 solve. Desktop holds 60 fps. The CI test measures idle rAF only.
- Recommendation: make the CI perf test measure during pours, at dpr 2.
- Owner: Builder.

**SP-008: Cells are 42 px at 360–375 width**
- Severity: P3. Classification: Mobile.
- Observed: 42 px, below the 44 px guideline. Acceptable, but the margin is thin together with SP-003.
- Owner: Builder.

**SP-009: AudioContext created before a user gesture**
- Severity: P3. Classification: Tech.
- Observed: console autoplay warnings. No functional impact was seen.
- Recommendation: create or resume the AudioContext on the first pointerdown.
- Owner: Builder.

**SP-010: Help panel has no scroll container**
- Severity: P3. Classification: UX.
- Observed: at 1280×800 the help panel has no scroller. I did not measure small viewports, so overflow there is unverified.
- Owner: Builder.

**SP-011: Very close to Aquarium**
- Severity: P2. Classification: Design/Originality.
- Observed: tanks with waterlines, row and column counts, and connected tanks are the Aquarium genre. Only the spill/frost/drop layer is new.
- Recommendation: push a distinct mechanic, e.g. the duck rule, pressure, or drains.
- Owner: Finder.

**Builder deviations, assessed:**
- L1 with 4 bubbles and the duck rule: OK, but the bubbles block cells (SP-003).
- Hint picks a proven cell in the least-certain group: OK; the hint is a real fact and costs no drop.
- Frosted cells cannot be poured and cost no drop: OK.
- Tapping another cell replaces the preview: OK, and a tap on a gauge clears it.
- 42/44 px cells: acceptable in portrait (SP-008). The real problem is landscape (SP-004).

## G. H1–H5
- **H1 (deduction, not luck):** partly refuted by simulation (SP-001). Counting players fail, but single-line logic plus guessing succeeds on T2.
- **H2–H5** (feel, retention, readability of drop tension, session length) need human playtests. My heuristic view: the preview/pour loop and the 3-drop tension read well; the pipe tutorial is understandable; and the frost feedback is clear (shots/m390_E_rush_*).

## H. Playtest readiness
Ready for a **limited portrait-only internal playtest** once SP-002 and SP-003 are fixed, since both corrupt the drop and tap experience. Not ready for an external test until SP-001 and SP-004 are fixed.

## I. Artifacts
- Tools: `tools/spillproof/` (qsolve, q_levels, q_play, layout, play, bubble, edge).
- Data: `reports/spillproof/data/`.
- Screenshots: `reports/spillproof/shots/` (79 files).
