# Foldprint: R0 QA Report
Game ID GF-20261021-01 v1 · slug `foldprint` · Tester: Game Tester (Grok Bot) · 2026-10-21 (UTC+3)

## A. Verdict
**REVISE: 75/100.** Every rubric gate is met, but one P1 defect blocks a PASS.

**What is strong:**
- The puzzle core is excellent and verified independently.
  - The rule matches the brief's reference fold, and every par equals my BFS minimum.
  - The optimal-route counts match I.3, and every crease and every wax cell is necessary.
  - Exact (non-sampled) probabilities show every lazy policy failing, with L12 the hardest level.
- The build is solid:
  - Touch play reaches 3★ on all 12 levels at 360, 390 and 430, by drag and by tap-then-Press.
  - Overlay lockout works, and touchcancel cancels.
  - file:// play works offline, idle frames are pixel-identical, and the game runs at 59.7 fps under 4× slowdown.

**What blocks PASS:** FP-001 (P1). The target colours are effectively unreadable.
- The pencil outlines on the sheet carry no colour.
- The stencil card draws each target cell as a 3×3 px square.
- From L4 on, the player can't tell green from blue from purple targets. That undermines H5 and the whole planning loop.

**Second issue:** FP-002 (P2). Any viewport resize resets the sheet. An address-bar height change or a rotate round-trip wipes the in-progress sheet.

## B. Build under test
- Commit `8a8db166b559d08c78e21421f96e106ed5e4e18b` (2026-10-21 07:32:51 UTC+3).
- Live index.html, game.js and logic.js are byte-identical to the repo.
- BRIEF.md is identical to `/workspace/game-ideas/2026-10-21-foldprint-BRIEF.md`.
- The shipped level data equals brief §I.2 exactly (parsed and compared).
- CI run 39544640451 is green; the `foldprint` job took 1m11s.
- **What CI actually tests:**
  - fold matches the reference, preview matches commit, solutions reach par;
  - smudge, stuck, undo and hint;
  - the policy table, using a single RNG stream sampled 1000 times;
  - touch drag at 8 sizes, the rotate card, a menu-close lockout check, and fps.
- **CI gaps:**
  - no double/triple taps on win, stuck or fail overlays;
  - no touchcancel or release-outside test;
  - no resize or state-preservation test;
  - no exact policy probabilities (see FP-003);
  - nothing about stencil readability.

## C. Method
- **Independent solver:** `tools/foldprint/fsolve.mjs`, written from brief §I.4. It runs BFS over clean states, counts optimal routes, and tests crease, wax and once-each necessity.
- **Policies, SIMULATION:** `fpolicies.mjs`, 1000 seeds per policy per level, plus a best-moment hint sweep.
- **Policies, EXACT:** `fexact.mjs` enumerates every random tie-break, so there is no sampling error.
- I also ran the builder's own `play()` with the CI seed and 5 other seeds.
- **Browser:** Playwright with real CDP touch.
  - Layout on 17 sizes; full play at 360, 390 and 430, plus the tap-then-Press route at 390.
  - Lose states (stuck, smudge, out of presses, undo).
  - Overlay ×2 and ×3 taps on win-Next, win-Retry, stuck-Fresh, stuck-Undo, fail-Fresh and Resume.
  - Gestures at 360, 390 and 430; keyboard and hint; help at 360, 375 and 390.
  - Resize and rotate; landscape at 667, 844 and 932; file:// and network.
  - Idle pixel check; 3 dragged L12 solves at 390, DPR 2, 4× throttle.

## D. Rubric
| Area | Score | Gate | Note |
|---|---|---|---|
| Core | 16/20 | ≥14 ✔ | Deep, verified-fair ordering puzzle. The rebound and wax are needed. D8 overshoots slightly on L9. |
| Feel | 15/20 | ≥14 ✔ | Drag with live preview, ✕ marks and a cost ghost; cancel works; input locks during the fold. The fold is a flat scale, audio is thin, and resize resets the sheet. |
| Hook | 10/15 | ≥10 ✔ | The payoff is plausible but unproven (H2–H5). FP-001 will hurt it. |
| Progression | 13/15 | – | A clean ladder (order → mixing → rebound → wax), and L12 is the hardest. |
| Visuals | 6/10 | – | Warm, clean desk. But the stencil is unreadable, there is no colour on the outlines, and the flap is flat. |
| Mobile | 7/10 | ≥7 ✔ | Cells 54–70 px, tabs on the canvas, rotate gate, lockout. Resize reset and FP-001 hold it back. |
| Originality | 8/10 | ≥6 ✔ | Contact-print, mixing and permanence rules are new. The fold theme is shared (flagged for Burak). |
| **Total** | **75/100** | | **REVISE** (P1 FP-001 open) |

## E. Acceptance criteria: claimed vs verified
| AC | Builder | Verified | Evidence |
|---|---|---|---|
| M1 rule fidelity / par = BFS | PASS | **PASS** | My solver's par equals brief par on all 12. Optimal routes 1/1/1/1/1/1/4/1/6/12/7/4, matching I.3. Touch replay of every I.3 sequence wins at par. |
| M2 win, out of presses, stuck (L3 V3) | PASS | **PASS** | L3: V3 opens "stuck"; Undo works (presses 3→2). L4: H1, then H4 smudge ×4 opens "Out of presses" at 0. |
| M3 smudge reverts, costs 1 | PASS | **PASS** | L4 H1→H4: sheet unchanged, presses 4→3 |
| M4 preview = commit, ✕ = smudges | PASS | **PASS** (code + visual) | The preview and the commit call the same `preview()`. Shot `m390_V_01` shows the ✕ marks and the ghost stamp. |
| Undo costs a press | PASS | **PASS** | L2: 3→2, back to the start sheet |
| D1 RAND ≤6% on L7–12 | PASS | **PASS** | Exact: 5.8/1.1/5.6/1.7/0.8/0.4% |
| D2 SAFE1 ≤10% on L7–12, ≤20% on L4–6 | PASS | **PASS** | Exact: 8.3/2.1/8.3/3.3/1.9/0.8%; 16.7% on L4–6 |
| D3 SAFE2 ≤20% on L7–12 | PASS | **PASS** | Exact max is L7 at 16.7% |
| D4 Greedy 0% on L3–12 | PASS | **PASS** | 0% exact |
| D5 Min-print ≤30% clear, ≤5% 3★ | PASS | **PASS** | L10 25.0% / 0%; all others 0% |
| D6 Outer/Inner 0% on L6–12, ≤55% on L4–5 | PASS | **PASS** | L5 outer 50.0% exact |
| D7 V/H-first ≤15% on L7–12 | PASS | **PASS** | Max is HFIRST L10 at 12.5% |
| D8 Once-each ≤16% on L7–12, and no once-each solve | PASS | **FAIL (marginal) on L9** | **Exact 16.67% (1/6) on L9.** The builder's own `play()` gives 14.6–15.9% across 6 seeds; the CI seed gives 15.3%, only by sampling. No once-each order solves L7–12 ✔ (FP-003). |
| D9 SAFE2+hint ≤55%, hint never 3★ | PASS | **PASS** | Best-moment hint maximum is L8 at 48.7% (SIMULATION). A hinted par clear on L2 gave ★★☆. |
| P1 OPT 100% at par | PASS | **PASS** | |
| P2 every crease needed | PASS | **PASS** | Removing any crease makes the target unreachable, on all levels |
| P3 every wax cell needed | PASS | **PASS** | Removing any wax cell on L10–12 makes the level unsolvable |
| P4 L12 hardest (0.6% / 1.1%) | PASS | **PASS** | Exact SAFE1 0.8% and SAFE2 1.3%, both the lowest of the ladder |
| M7 cells ≥52 px, tabs ≥48 px at 360 | 58 px | **PASS** | 58 px at 360×800, 54 at 375×667, 63–72 elsewhere. Tabs ≥48 px, every tab centre hits the canvas, buttons are 48 px. |
| M7 0 off-screen on 17 sizes | PASS | **PASS** | 0 off-screen buttons, no scroll, all tabs inside, on 13 portrait/desktop sizes |
| M7 landscape = rotate prompt only | PASS | **PASS** | At 667, 740, 844 and 932, taps and drags spend nothing |
| M7 overlay lockout ≥300 ms | PASS | **PASS** | ×2 and ×3 taps on win-Next, win-Retry, stuck-Fresh, fail-Fresh and Resume give a fresh or unchanged sheet. stuck-Undo ×3 performs exactly one undo. A drag during the fold animation is ignored. |
| M7 drag-out / touchcancel use no press | PASS | **PARTIAL** | touchcancel past 50% uses no press ✔. A release at 35%, or past 50% then back, cancels ✔. **Dragging past 50% and releasing at the screen edge commits** (FP-004). |
| M8 ≥50 fps, 4×, dragged solve | 59–59.8 | **PASS** | 3 tapped/dragged L12 solves: 59.7, 59.8 and 59.7 fps (p95 16.7–16.8 ms) |
| M8 idle pixel-identical | PASS | **PASS** | Two captures 1 s apart are identical. Buffer 585×1266 at 390 DPR 2 (1.5× cap ✔). |
| M9 file:// 0 requests | PASS | **PASS** | L1 and L12 won offline, 0 HTTP requests. Live loads 3 same-origin files. |
| Help reachable | – | **PASS** | Fits on screen at 360×800, 375×667 and 390×844 |
| Win focus / Enter | – | **PASS** | Focus is on win-Next (Retry on L12), and Enter advances |
| Keys | PASS | **PASS** | 1–9 + Enter presses, Z undoes, H hints once, R asks for confirm, Esc opens the menu |
| Hint on a dead sheet | PASS | **PASS** | L4 after H1: "This sheet can't be finished." |
| Console | – | **PASS** | 0 warnings, 0 page errors |

## F. Issues
**FP-001: Target colours are unreadable**
- Severity: **P1**. Classification: UX/readability. Owner: Builder.
- Observed:
  - `drawPencil()` ignores the colour and draws grey dashed ellipses (#9C8F7A, 55% alpha) for every target.
  - The stencil card draws the 6×8 target as 3×3 CSS px squares (the grid is about 24×32 px inside a 92×34 card).
  - On L4–L12, where G, O and P targets matter, the only colour information is the card.
- Evidence: `shots/m390_V_L12_card_zoom.png`, `shots/m360_L_02_L12.png`.
- Expected (brief §C, §D, §G): "faint pencil outlines **of the target colours**".
- Recommendation:
  - Tint each outline with its target colour, plus the colour-blind pattern when that mode is on.
  - Make the card ≥8 px per cell, or tap-to-enlarge.
- Acceptance: at 360×800 a tester can name the target colour of every cell on L12 without zooming. Outline colour equals `INK[target]`.

**FP-002: Any resize resets the sheet**
- Severity: P2. Classification: Bug/state loss. Owner: Builder.
- Observed: `resize` calls `loadLevel()`.
  - L7 after 2 folds, then 390×844 → 390×780 (address-bar change): presses went 5 → 7 and the sheet reset.
  - A rotate round-trip did the same.
- Evidence: `data/o_e1.txt` (resize).
- Recommendation: re-measure and repaint only, and keep `state`.
- Acceptance: cells and presses are unchanged after a height change and after a rotate round-trip.

**FP-003: D8 once-each policy is 16.67% on L9, above the 16% cap**
- Severity: P3. Classification: Design/measurement. Owner: Finder (threshold or L9) and Builder (CI).
- The exact value is 1/6. The sandbox (15.3%) and CI (15.3%) are under the cap only by sampling.
- Recommendation: either accept 17% for L9, or retune L9. In CI, compute these probabilities exactly; the state space is tiny.
- Acceptance: the exact value ≤ the cap, or a documented threshold change.

**FP-004: Releasing off-screen after 50% commits**
- Severity: P3. Classification: Spec deviation. Owner: Builder.
- Pointer capture prevents `pointerleave`, so a release at the screen edge commits. Brief §F says pointer-leave cancels.
- Arguably acceptable, since the player did pass 50%.
- Recommendation: decide and document. If keeping the commit, update the brief AC; otherwise cancel when the release point is outside the canvas.

**FP-005: Hint text names an unlabeled crease ("Try V2.")**
- Severity: P3. Classification: UX. Owner: Builder.
- The tab is highlighted red, which works, but "V2" means nothing to a player.
- Recommendation: use "Try the highlighted crease", or pulse the tab only.

**FP-006: Fresh restarts with no confirm, next to Press**
- Severity: P3. Classification: UX. Owner: Builder.
- A mis-tap wipes the sheet. It's free, but the progress is lost.
- Recommendation: confirm when ≥1 press has been spent, the same as the R key.

**FP-007: Reload opens L1, not the last unlocked level**
- Severity: P3. Classification: UX. Owner: Builder.

**FP-008: CI gaps**
- Severity: P3. Classification: Tests. Owner: Builder.
- Add: overlay ×2/×3 tests, touchcancel, release outside, resize preservation, and exact policy probabilities.

**Observation (not filed):** once, a stale "Blue" long-press colour label stayed visible after a level change (`shots/m390_E_hint_02_L7_hint.png`). I could not reproduce it.

**Admitted simplifications** (flat fold, blob paint, synth music, no gallery or generator): accepted for an MVP and reflected in the Visuals and Feel scores.

## G. H1–H5
- **H1 (deduction beats luck):** supported. Exact lazy-policy probabilities are low: L7–12 SAFE1 ≤8.3% and RAND ≤5.8%.
- **H2 (the print rule is understood without text):** needs human testing. The heuristic is positive: the L1 ghost finger, the live preview and the mirror print are clear.
- **H3 (press-and-peel satisfies):** needs human testing. The flat-scale fold and thin audio are a risk.
- **H4 (rebound gives an "aha"):** needs human testing. The sim confirms the rebound is required on L7–12; once-each never solves.
- **H5 (mirror reasoning readable):** needs human testing, but **likely to fail as built** because of FP-001. The preview and ✕ marks help, but the player can't read which colour a target needs.

## H. Playtest readiness
- Not ready for H2–H5 playtests until FP-001 is fixed; it would distort H5 and H4.
- After FP-001 and FP-002: ready for an internal portrait playtest.

## I. Artifacts
- `data/`: o_policies.txt (SIMULATION), o_exact.txt / exact.json (EXACT), o_d8.txt, o_builder_policies.txt, o_layout.txt, layout.json, o_play_*.txt, play_*.json, o_e1.txt, o_e2.txt, edge_*.json, o_perf.txt, levels_ship.json.
- `shots/`:
  - layout L1/L12 on 17 sizes;
  - P_* wins at 360, 390 and 430;
  - E_lose_* (stuck, smudge, fail);
  - V_01 smudge preview, V_02 clean preview, V_L12 card zoom;
  - landscape prompts; help.
- Tools: `tools/foldprint/` (fsolve, fpolicies, fexact, fonce, layout, play, edge, hint, vis).
