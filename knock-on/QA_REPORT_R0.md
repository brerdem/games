# Knock-On: R0 QA Report (first pass)
Game ID GF-20261022-01 v1 · slug `knock-on` · Tester: Game Tester (Grok Bot) · 2026-10-22 (UTC+3)

## A. Verdict
**REVISE: 71/100.** This build cannot pass: three P1 defects are open, and the Feel gate fails (12 < 14).

The rules, levels and solver claims are exact: I reproduced every one independently. The defects sit in the input and hint layer:

**KO-001 (P1): arrow buttons sit on top of neighbouring cells.**
- Any tap, or any cancelled or short swipe, selects a domino and shows its two arrow buttons.
- Each arrow lies over the next cell.
- So a tap or swipe meant for the neighbouring domino pushes the *selected* domino instead.
- This spends a push on the wrong move, reproduced at 360, 390 and 430.

**KO-002 (P1): a cascade-skip tap falls through to the panel it opens.**
- On a stuck push, the finger lands on the banner's **Undo**: a push is spent and the banner is never seen (6/6 runs).
- On the winning push, it lands on **Next**: the level is skipped past the star screen (4 of the 5 runs where the cascade was still animating).
- So a skip can't make a push, but it **can spend one**.

**KO-003 (P1): Undo restores an unused hint.**
- The hint can be refreshed for 2 pushes, which breaks "one hint per level".
- It invalidates D9 in practice: GREEDY2+probe with a refreshed second hint clears L8 and L12 **100%** (exact model) against the ≤ 60% requirement.

This is not a production verdict. A later PASS would authorize human review only.

## B. Build under test
- Commit `3d29e46dabe513635c7d56c9ccbe64acb6383597` (2026-10-22 08:11 UTC+3).
- CI run 39726592432 was reported green. I did not rely on CI numbers.
- Live index.html, game.js and logic.js are byte-identical to the repo.
- The shipped `LEVELS` (rows, par, pushes) equal brief §I.2 exactly.
- `knock-on/QA_REPORT.md` in the repo is the builder's placeholder; this file replaces it in our reports.

## C. Method
**Solver (independent code).**
- `tools/knock-on/krules.mjs` is the §I.4 reference code re-typed from the brief.
- I used it for BFS par, optimal-route counts and reachable states.
- I replayed every §I.3 line and checked load-bearing pieces (each elbow or splitter replaced by floor) and spin necessity (spin-free BFS).
- Isomorphism check: mirror and 180° rotation with elbow and splitter remapping.
- Fidelity: the build's `push()` equals the brief's code on **522,242** pushes (every move in every reachable state of all 12 levels), with 0 mismatches.

**Policy odds (EXACT).**
- `kexact.mjs` is my own exact expectation over uniform tie-breaks: no sampling, so no seeds were needed.
- Policies: RAND, GREEDY, GREEDY2, MAXIMAL, NOSPIN, SAFE1, their +probe variants, D9 at a fixed hint moment and at the adaptive best moment, and MAXIMAL+probe+hint.
- `kexact2.mjs` models the hint-refresh defect (a second hint costs undo + redo = 2 pushes). This is a model of an exploit, not a sample.

**Browser: Playwright with real CDP touch.**
- Full 3★ play by swipe at 360×800, 390×844 and 430×932, plus tap-then-arrow play at 390.
- Gestures: release outside, touchcancel, diagonal, short and back-off swipes.
- Cascade-skip probes, overlay ×2/×3 taps, an arrow-button hazard probe, and layout on 19 sizes.
- Also: resize and rotate, landscape (4 sizes), help, keyboard, reload, file://, idle frames.
- fps over 3 swiped L10 solves (390, DPR 2, 4×), and level-open hitch at 1×, 4× and 6×.

## D. Rubric
| Area | Score | Gate | Basis |
|---|---|---|---|
| Core | **16**/20 | ≥14 ✔ | Exact rules; deep ordering (GREEDY 0%, GREEDY2+probe 0% on L7–L12). D9 is broken in practice by KO-003. |
| Feel | **12**/20 | ≥14 ✘ | Preview, click scale and Knock-on ×N are good. But wrong-domino pushes (KO-001), skip fall-through (KO-002), and a 0.76–1.2 s freeze when L9 opens or restarts under throttling (KO-004). |
| Hook | **10**/15 | ≥10 ✔ | L10's ×11 payoff and the stadium wave work. Unproven with humans. |
| Progression | **12**/15 | – | L12 is strictly hardest; a clean stage ladder. L7 sits at 28.2% on D6 (cap 30%), 3× L6. |
| Visuals | **7**/10 | – | Cosy, readable felt board. The tail is drawn as a second whole plank (KO-006), the pin is a 10 px dot (KO-007), and the hint shows no direction (KO-005). |
| Mobile | **7**/10 | ≥7 ✔ | 0 off-screen buttons on 19 sizes, 57 px cells at 360, rotate prompt, state kept. Arrows overlap neighbours and, on short screens, the bar. |
| Originality | **7**/10 | ≥6 ✔ | Floor-consuming landing plus spin switches is new. The domino theme is shared (flag for Burak). |
| **Total** | **71**/100 | | **REVISE.** Feel gate failed; 3 × P1 open. |

## E. Claims and acceptance criteria
### Builder claims
| Claim | Result | Evidence |
|---|---|---|
| All §I.3 lines clear with matching counts and par | **PASS** | All 12 replays are legal and clear; felled counts are identical. BFS par = brief par. nOpt 1,2,1,9,12,1,60,8,3,20,30,20 = brief. (`data/o_solve.txt`) |
| Preview and commit write the same grid | **PASS** | Both call the same `KL.push`; fidelity 0/522,242 mismatches. A held preview is cancelled by back-off with 0 spent (`shots/m390_E_gest_01_L10_preview_hold.png`). |
| Every elbow and splitter is load-bearing | **PASS** | Floor-replacement par: L4 3→4; L8 4→5; L9 5→6; L10 5→6 (both elbows); L11 and L12 become unsolvable. |
| No mirror or 180° duplicates | **PASS** | 0 pairs, with piece remapping |
| D1–D10 exact | **PASS** (values reproduced exactly) | See the table below |
| L12 hardest: MAXIMAL 2.0%, MAXIMAL+probe 7.0%, only par 6 | **PASS** | 2.02% and 7.03%, both the strict minimum of L7–L12 (next lowest: L10 at 4.76% and 13.92%). Only par 6. |
| 60 fps minimum on swiped L10, 390, DPR 2, 4×, cap 1.5 | **PASS** | 59.8, 60.0 and 60.0 fps (p95 ≤ 16.8 ms, max 33 ms). Buffer 585×1266, scale 1.5. |
| Cells 57 px at 360 | **PASS** | 57 at 360×800. 47 at 320×568 (below the 360 baseline; not in spec). |

### Exact odds on L7–L12 (%, my independent code)
| Policy (criterion) | L7 | L8 | L9 | L10 | L11 | L12 | Result |
|---|---|---|---|---|---|---|---|
| D1 RAND (≤3) | 0.22 | 0.48 | 0.01 | 0.17 | 0.01 | 0.07 | ✔ |
| D2 RAND+probe (≤5) | 0.32 | 1.08 | 0.03 | 0.21 | 0.04 | 0.11 | ✔ |
| D3 GREEDY (0) | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |
| D4 GREEDY2 (≤10) | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |
| D5 GREEDY2+probe (≤15) | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |
| D6 MAXIMAL+probe (≤30) | **28.20** | 26.86 | 15.57 | 13.92 | 16.03 | **7.03** | ✔ (L7 margin 1.8 pts) |
| D7 NOSPIN, L5–L12 (0) | 0 | 0 | 0 | 0 | 0 | 0 | ✔ (no spin-free solution exists on L3 or L5–L12) |
| D8 SAFE1 (≤5) | 0.62 | 3.59 | 0 | 0 | 1.05 | 0 | ✔ |
| D9 GREEDY2+probe + 1 hint, best moment (≤60, never 3★) | 0 | **55.56** | 0 | 0 | 0 | **55.56** | ✔ as specified (adaptive best moment gives the same; 3★ 0%) |
| D9 with the hint refreshed via Undo (KO-003, model) | 16.67 | **100** | 0 | 0 | 33.33 | **100** | **✘ in practice** |
| MAXIMAL (no probe), for P3 | 20.44 | 11.67 | 5.56 | 4.76 | 8.48 | **2.02** | ✔ (L12 lowest) |
| *Info:* MAXIMAL+probe + 1 hint | 34.36 | 44.67 | 43.06 | 28.63 | 28.99 | 13.37 | no criterion |

L1–L6 numbers are in `data/o_exact.txt`. They match the sandbox shape: L6 GREEDY 12.5%, nOpt 1.

**The two flagged numbers, judged against the brief:**
- **D9 = 55.6% on L8 and L12.** This is within the brief's ≤ 60% and is exactly reproducible, so it passes as specified. With KO-003 the real-game figure is **100%** on both, a fail. Once KO-003 is fixed, the 4.4-point margin is acceptable. KO-005 (the hint shows no direction) means real players get less than the modelled hint.
- **D6 MAXIMAL+probe = 28.2% on L7.** This is within ≤ 30% (the sandbox showed up to 29.9%), so it passes. Note that L7 is the *most* lazy-friendly level of L7–L12 and 3× L6 (9.38%). The brief calls L7 the "first lazy-fails level"; that is true for GREEDY and GREEDY2 (0%) but not for MAXIMAL+probe. Watch L7 in playtests (H4); no change is required.

### Brief §M checks
| Criterion | Result | Evidence |
|---|---|---|
| M3: L1 stuck banner (3rd domino east) | **PASS** | Banner: "Can't finish from here. Undo or Restart. 2 pushes left." Undo leaves 1 push and restores the board; repeating the push then gives "Out of pushes". (`shots/m390_E_lose_01_L1_stuck.png`, `_02_L1_fail.png`) |
| M2: illegal push is free; cross-axis does nothing | **PASS** | A west push on L1 (0,3) wobbles and spends 0. A north swipe on an H domino spends 0. |
| M4: Undo restores and costs 1; 3★ rules | **PASS** | L2 restored with 2 pushes left. A hinted par clear gives ★★☆ with "with a hint". A last-token clear gives ★☆☆. |
| M8: overlays ignore board input ≥ 300 ms | **PASS** | 340 ms lock. Every overlay button sits over the canvas, and ×2/×3 taps on Next, Retry, stuck Undo/Restart, confirm Yes/No, Undo and Resume all behaved correctly (`data/edge_dbl…json`). |
| M8: swipe-out, touchcancel, release over the bar | **PASS** | At 360, 390 and 430: releases over the bar, in a bar gap, and at all four screen edges spend 0. Board edge +20 px commits (within the 28 px reach); +40 px cancels. Touchcancel, over-and-back, from an empty cell and from an elbow all spend 0. A 30° diagonal commits; 60° does not. |
| M8: 0 off-screen on 17 sizes; landscape prompt | **PASS** | 19 sizes, 0 off-screen buttons, all ≥ 48 px, no scroll. Landscape 667/740/844/932 shows only the rotate card, and a tap spends 0. |
| M9: fps ≥ 50; idle identical; stuck check < 50 ms | **PASS** | 59.8–60 fps. Idle screenshots are identical with 0 draws in 2 s. Per-push lookup ≤ 0.1 ms. |
| M9 / L: precompute cost | **FAIL (feel)** | See KO-004 |
| M10: file:// 0 requests | **PASS** | L1 and L12 won from file:// with 0 HTTP requests. Live loads 3 same-origin files. |
| Resize/rotate keep state | **PASS** | L2 after one push: height 844→780 and a landscape round-trip keep pushes and cells; the next swipe lands and clears. |
| Reload / locks | **PASS** | Reload opens Table 3 after clearing 1–2; 4–12 are locked. |
| Help fits | **PASS** | At 320, 360, 375 and 390 the card and Back are on screen; Back returns to the menu. |
| Keyboard | **PASS** (minor issues) | Arrow keys select, Shift+arrow pushes, Enter on Next, Z, H, R (confirm), Esc. See KO-008 and KO-010. |
| 12/12 at 3★ by touch | **PASS** | Swipe at 360, 390 and 430, plus tap-then-arrow at 390: 48/48 levels at 3★, 0 console errors or warnings. |
| Cascade skip can't make a push | **PASS for pushes / FAIL for panels** | A tap at 600 ms finishes the cascade and spends 0; a swipe at 650 ms is consumed by the skip; taps and swipes before 500 ms are ignored. But see KO-002. |

## F. Issues
**KO-001: Arrow buttons cover neighbouring cells, so a tap or swipe on the neighbour pushes the selected domino**
- Severity: **P1**. Classification: Input / Feel. Owner: Builder.
- Repro at 360, 390 and 430: L3, tap (5,7), then tap the domino above it at (5,6). Result: (5,7) is pushed north and 1 push is spent.
- Second repro: L3, make a short (cancelled) 8 px drag on (0,5), then swipe (1,5) west. Result: (0,5) is pushed east, felling the row; the wrong push is spent.
- Arrows are placed `s/2 + 26` px from the cell centre, which is entirely inside the next cell, and they sit above the canvas.
- They appear after *any* tap or cancelled swipe.
- On 320 and 375-tall screens, edge-row arrows also overlap the button bar.
- Evidence: `data/o_arrows.txt`, `shots/*_E_arrow_*`, `shots/m320_LAY_01_L3_arrows_corner.png`.
- Recommendation:
  - show arrows only after a deliberate tap, never after a drag;
  - draw them inside the selected cell's own ends, or in the bar;
  - dismiss them on any touch elsewhere, and route a touch on another domino to that domino.
- Acceptance: with arrows showing, tapping or swiping any other cell never pushes the selected domino.

**KO-002: The cascade-skip tap falls through to the stuck or win panel it opens**
- Severity: **P1**. Classification: Input. Owner: Builder.
- Mechanism: `pointerdown` after 500 ms calls `finishAnim()`, which opens the panel under the finger, and the touch's click lands on the panel's button.
- **Stuck case:** L9, push (5,2) S (a 7-tick cascade that ends stuck). Tap at 600 ms over the centre: the banner's Undo fires, a push is spent, and the banner is never seen. 6/6 at 360, 390 and 430 (`data/o_skip_stuck.txt`).
- **Win case:** the final push on L1, L2 or L10 with a tap at 550–900 ms → Next fires, and the star screen is skipped (`data/o_skip_win.txt`).
- Recommendation:
  - when a skip opens a panel, ignore panel clicks for ≥ 300 ms, or open the panel on `pointerup`;
  - generally, add an open-lock to `show()`.
- Acceptance: a skip tap never activates a panel button, at any position.

**KO-003: Undo restores an unused hint (hint refresh)**
- Severity: **P1**. Classification: Spec / Balance (D9). Owner: Builder.
- `KL.undo` restores `hintUsed` from the snapshot.
- Repro: L8, push, Hint ("Used"), Undo → the button reads "Hint" again, and a second hint works (`data/edge_lose,hint.json`, `shots/m390_E_hint_02_L8_second_hint.png`).
- A clear after a refreshed hint reads "You used 4." with no hint mention.
- With a second hint costing 2 pushes, GREEDY2+probe clears L8 and L12 100% (D9 ≤ 60% fails) and L11 33% (`data/o_exact_refresh.txt`, model).
- Recommendation: keep `hintUsed` out of the undo snapshot, so it is sticky per attempt and reset only by Restart.
- Acceptance: after any Undo the hint stays used, and D9 is re-measured.

**KO-004: Level-open precompute freezes the page; it repeats on every Restart**
- Severity: **P2**. Classification: Performance / Feel. Owner: Builder.
- `makeMin` runs in full inside `loadLevel` on Next, Restart, Retry and the confirm's Restart.
- Measured oracle time (ms):

  | Throttle | L7 | L9 | L10 | L11 | L12 |
  |---|---|---|---|---|---|
  | 1× | 98 | 179 | 108 | 75 | 49 |
  | 4× | 396 | 759 | 473 | 329 | 267 |
  | 6× | 570 | 1205 | 690 | 520 | 413 |

- Longest single frame across the Next tap into L9: **150 ms (1×), 867 ms (4×), 1483 ms (6×)**. Into L10: 500 ms at 4×. Into L7: 383 ms at 4× (`data/o_perf.txt`).
- The builder's "about 0.25 s on L9" is a desktop figure; a low-end phone freezes for about 1 s on each L9 open or restart.
- Recommendation:
  - cache the min table per level, so Restart is free;
  - build it in idle slices or a Worker after the board paints;
  - or ship precomputed min values.
- Acceptance: max frame < 100 ms at 4× on opening or restarting L9.

**KO-005: The hint shows which domino but not which way**
- Severity: **P2**. Classification: Spec / UX. Owner: Builder.
- The brief says the hint "pulses one push". The build outlines the domino in yellow and shows both arrows the same; `hintDir` is never drawn (`shots/m390_E_hint_01_L8_hint.png`).
- Recommendation: highlight the hinted arrow and show the ghost preview of that push.

**KO-006: A tail is drawn as a second whole flat domino**
- Severity: P3. Classification: Visual / H2. Owner: Builder.
- Three felled dominoes read as four lying tiles (`shots/m390_E_lose_03_L1_pinned.png`).
- The brief asks for the domino's far half across the next cell; the red dashed square marks the cell well.
- Recommendation: draw one plank spanning the cell boundary, and test it as part of H2.

**KO-007: The pinned marker is a 10 px dot in the cell corner**
- Severity: P3. Classification: Visual / H5. Owner: Builder.
- The brief asks for a pin icon. The dot is easy to miss.

**KO-008: Keyboard and focus edges**
- Severity: P3. Classification: Accessibility. Owner: Builder.
- On L12's win panel, Next is disabled and focus is lost (`activeElement` is none), so it should move to Tables.
- Esc on the win panel closes it and leaves an empty board with no panel.

**KO-009: On short screens (320×568, 375×667), edge-row arrows overlap the bar and HUD band**
- Severity: P3. Classification: Mobile. Owner: Builder.
- Covered by the KO-001 fix.

**KO-010: The R key asks for confirmation even before any push**
- Severity: P3. Classification: Consistency. Owner: Builder.
- The Restart button restarts directly in that state.

**KO-011 (design watch): two balance margins are close to their caps**
- Severity: P3. Classification: Balance. Owner: Game Finder.
- L7 D6 is 28.2% (cap 30%) and 3× L6. D9 is 55.6% on L8 and L12 (cap 60%).
- No change is needed now. Re-check after KO-003 and KO-005, and if H4 shows L7 friction (brief §N bridge level).

**Observations (not filed):**
- Desktop is not letterboxed: the HUD spans the full width while the board is centred. Functional.
- Camera ease and settle bounce (§E) were not seen; they are optional polish.
- The arrows' z-order over Menu at 320 only produces an illegal (free) wobble in my probe.

## G. H1–H5 (honest status)
- **H1, planning beats luck: supported by exact simulation.** Lazy policies fail on L7–L12 (D1–D8 pass). D9 holds only once KO-003 is fixed.
- **H2, landing rule readable by L3: unproven; needs humans.**
  - Positives: the L1 ghost finger, the lesson lines, the dotted preview tail, and the red dashed taken-cell marker.
  - Risks: the extra plank (KO-006) can mislead the count. The pin is tiny.
  - Predicted mixed until KO-006 is fixed.
- **H3, cascade satisfying: plausible; needs humans.** The L10 ×11 payoff renders cleanly with rising clicks and the label; the stadium wave plays on clear. I could not judge the audio feel headless.
- **H4, switches give "aha" not frustration: unproven.** KO-001 and KO-002 would add *non-design* frustration (wrong pushes, lost tokens) and should be fixed before testing H4. L6 → L7 is the brief's own risk.
- **H5, outcomes predictable: preview = commit is verified, but H5 is currently at risk.** A tap on a neighbour can push a different domino (KO-001), which is exactly the kind of "surprise push" H5 counts.

## H. Next step
Return to the Builder for **R1**:
- Must fix: KO-001, KO-002 and KO-003.
- Should fix: KO-004 and KO-005.
- P3 items are optional.

QA will then re-run the arrow and skip probes, re-measure D9 exactly, check the L9 open/restart frame at 4× and 6×, and run full regression. A playtest of H2–H5 should wait until the P1s are fixed, so input defects don't contaminate the results.

**For Burak:** the domino-theme adjacency flag (brief §B/§N) is still open. Rules originality is fine.

## I. Artifacts
- `data/`:
  - solver and odds: o_solve.txt, solve.json, o_exact.txt, exact.json, o_exact_refresh.txt;
  - play: o_play_*.txt, play_*.json;
  - probes: edge_*.json, o_edge2.txt, o_arrows.txt, arrows.json, o_skip_stuck.txt;
  - layout and perf: o_layout*.txt, layout.json, o_perf.txt, perf.json;
  - copies of the solver scripts.
- `shots/`: P_* (play: start, payoff mid-cascade, wins), E_lose_* (stuck, fail, pinned), E_hint_*, E_arrow_*, E_gest_* (preview hold), E_skipstuck_*, E_resize_*, E_help_*, E_land_*, LAY_* (19 sizes).
- Tools: `tools/knock-on/` (krules, ksolve, kexact, kexact2, findstuck, lib, play, edge, layout, perf, arrows, dbg1–3).
