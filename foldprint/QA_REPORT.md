# Foldprint: R1 QA Report (cycle 1 of 2)
Game ID GF-20261021-01 v1 · Tester: Game Tester (Grok Bot) · 2026-10-21 (UTC+3)

The R0 report is kept as `QA_REPORT_R0.md`, with its evidence in `shots_r0/` and `data_r0/`.

## A. Verdict
**PASS: 80/100 (R0: 75).** Every gate is met and no P0–P2 defects are open. **This PASS authorizes human review and playtests only, not production.**

What changed:
- **FP-001 (target colours):** fixed. Rings are tinted, and the stencil card is readable and enlarges on tap.
- **FP-002 (resize):** fixed. Resize and rotate keep the sheet.
- **FP-003 (D8 odds):** fixed. The once-each policy on L9 is exactly 1/12.

What is not fixed:
- **FP-004:** "release outside cancels" is not fixed in practice (P3; the builder's claim is incorrect).
  - The check compares the release point with the canvas, and the canvas fills the whole viewport.
  - A real finger released over the bottom bar or at the screen edge still commits.
  - The CI test passes only because it dispatches a synthetic `clientX: -20`.

**Environment note:** the box was reset during this run, so I reinstalled Playwright (Chromium headless shell 156). Absolute fps values are therefore not directly comparable with R0, although both runs are near 60.

## B. Build under test
- Commit `e5205b7472d11d141b43249d4550c33ee35b7667` (2026-10-21 09:51 UTC+3).
- Live index.html, game.js and logic.js are byte-identical to the repo.
- CI run 39558015237 was reported green. I did not rely on CI numbers.
- **Level data vs R0:** only L9 changed. The target cell at row 5, column 5 went from B to empty. L1–L8 and L10–L12 are byte-identical.

## C. Method
- **Solver and policies:**
  - `fsolve.mjs`: par, optimal-route count, and crease and wax necessity.
  - `fexact.mjs`: exact policy odds with no sampling.
  - `fpolicies.mjs`: SIMULATION, 1000 seeds, plus a best-moment hint sweep.
- **Browser, real CDP touch:**
  - Layout on 17 sizes.
  - Full drag play at 360, 390 and 430, plus tap-then-Press at 390.
  - FP-specific checks at 360, 390 and 430 (`r1fp.mjs`, `r1dbg.mjs`).
  - Lose, overlay ×2/×3, gestures, keys, help, resize/rotate, landscape (667, 844, 932), file://, idle, and 3 dragged L12 fps runs.

## D. Rubric
| Area | R0 | R1 | Gate | Note |
|---|---|---|---|---|
| Core | 16 | 17/20 | ≥14 ✔ | All exact D-criteria now pass |
| Feel | 15 | 16/20 | ≥14 ✔ | Resize keeps the sheet, Fresh asks for confirmation, the hint selects the crease. FP-004 remains. |
| Hook | 10 | 10/15 | ≥10 ✔ | Unproven with humans |
| Progression | 13 | 13/15 | – | Unchanged ladder; L12 still the hardest |
| Visuals | 6 | 8/10 | – | Tinted rings and the 28 px zoomed stencil make the target readable |
| Mobile | 7 | 8/10 | ≥7 ✔ | Resize and rotate keep state. Release-outside still commits. |
| Originality | 8 | 8/10 | ≥6 ✔ | Fold theme flag for Burak unchanged |
| **Total** | 75 | **80** | | **PASS** (human review only) |

## E. Verified items
| Item | Builder claim | Verified | Evidence |
|---|---|---|---|
| Par / route count / necessity | – | **PASS** | Par equals brief par on all 12. Optimal routes 1,1,1,1,1,1,4,1,6,12,7,4. Every crease is needed. Every wax cell on L10–12 is needed (the level is unsolvable without it). No once-each order solves L7–12. `data/o_policies_r1.txt` |
| FP-003: D8 L9 = 1/12 | 1/12 | **PASS** | Exact 8.33%. All D1–D9 pass exactly; L9 RAND 3.5%, SAFE1 4.2%, SAFE2 7.4%. `data/o_exact_r1.txt` |
| L12 hardest (SAFE1 1/128, SAFE2 1/80) | yes | **PASS** | Exact 0.78% and 1.25%, the lowest in the ladder |
| FP-001: tinted rings + CB pattern | yes | **PASS** | Rings are drawn in `INK[target]` at 360, 390 and 430 (`shots/m360_R1_01_L12_rings.png`). In CB mode the patterns are drawn inside the rings (`shots/m360_R1_03_L12_cb.png`), though faintly (FP-009). |
| FP-001: card 8 px + tap-to-enlarge + names | yes | **PASS** | The card is 61×79 px with 8 px cells. Tapping opens a zoom with 28 px cells and the legend "Yellow, Purple, Green, Orange, Red" (`shots/m360_R1_02_L12_zoom.png`). |
| Card doesn't block play or eat taps | – | **PASS** | The card's bottom (y 87) sits well above the top tab (≥140), so no tab overlaps it. A drag while the zoom is open is ignored, and a drag within 80 ms of closing is ignored (lockout). A drag 600 ms after closing folds normally (`data/o_r1dbg.txt`). A triple tap on the card opens the zoom once and spends no press. |
| FP-002: resize/rotate keep state | yes | **PASS** | L7 after 2 folds, height 844→780: presses 5→5 and cells kept. A rotate round-trip also keeps them. |
| FP-004: release outside cancels | yes | **FAIL (in practice)** | At 360, 390 and 430, a drag past 50% released at the viewport bottom (over the button bar, outside the sheet) commits (presses 4→3). The same happens at the right screen edge. `releaseOutside()` tests the full-viewport canvas rect. Touchcancel does cancel ✔. |
| FP-005: hint wording + selects | yes | **PASS** | "Try the highlighted crease."; Press becomes enabled; Press then folds V2 on L7, matching a manual V2 fold. |
| FP-006: Fresh confirm + bar ends | yes | **PASS** | No confirm before any press. A confirm appears after a press, and Cancel keeps the sheet (presses 3). Bar order: Fresh at the left end, Press at the right end. |
| FP-007: reload opens last unlocked | yes | **PASS** | After clearing L1–L3, a reload opens "Sheet 4 · Green Thumb" |
| FP-008: CI tests | yes | **PARTIAL** | The tests exist, but the outside-release test uses an impossible synthetic coordinate |
| fps | min 59.5 | **PASS** | 3 dragged L12 solves at 390, DPR 2, 4×: 59.8, 59.9 and 59.9 fps (p95 ≤16.8 ms) |

**Regression against R0: no regressions.**
- 3★ on all 12 levels at 360, 390 and 430 (drag) and at 390 (tap-then-Press); 0 console warnings or errors.
- Layout: cells 58 px at 360 (54–72 elsewhere), 0 off-screen, tabs on the canvas, rotate prompt in landscape.
- Stuck on L3, undo from stuck, smudge revert, out of presses on L4, and undo cost all work.
- Overlay ×2/×3 taps change nothing.
- Gestures: partial or back-off releases cancel, touchcancel cancels, a double tap on a tab doesn't commit, a drag during the animation is ignored.
- Keys work, the win panel focuses Next and Enter advances, help fits, file:// makes 0 requests and wins L1 and L12, and idle frames are identical (buffer 585×1266).

## F. Issues (open)
**FP-004: A release over the bar or at the screen edge still commits**
- Severity: P3. Classification: Spec deviation. Owner: Builder.
- Recommendation: test the release point against the **sheet** (paper) rect, not the canvas, or drop the requirement in the brief.
- Acceptance: a real touch release below the sheet's bottom edge spends no press.

**FP-008: CI outside-release test is ineffective**
- Severity: P3. Classification: Tests. Owner: Builder.
- Recommendation: use CDP touch, releasing at a reachable point outside the sheet.

**FP-009 (NEW): CB-mode ring patterns are very faint**
- Severity: P3. Classification: Accessibility. Owner: Builder.
- The ring outline still relies on colour; the inner pattern is light stipple at low contrast.
- Recommendation: draw the target pattern darker, or as a dashed-pattern ring.

**FP-010 (NEW): The zoom legend lists colour names without swatches, and wax looks like empty**
- Severity: P3. Classification: UX. Owner: Builder.
- In the zoom, wax cells are drawn almost the same beige as empty cells.

**FP-006b (note):** Fresh before any press restarts with no confirm, which is fine because nothing is lost.

**Closed:** FP-001, FP-002, FP-003, FP-005, FP-006, FP-007. FP-008 is partial.

## G. H1–H5
- **H1:** supported (exact odds).
- **H2–H5:** need human testing. H5 is no longer predicted to fail now that target colours are readable.

## H. Playtest readiness
**Ready for an internal portrait playtest (H2–H5).** Suggested protocol: 5 players, think-aloud on L1–L12. Track surprise smudges after L4 (H5) and median attempts on L7–9 (H4).

## I. Artifacts
- `data/`: levels_r1.json, o_policies_r1.txt, o_exact_r1.txt, exact_r1.json, o_layout_r1.txt, o_play_r1_*.txt, o_r1fp.txt, o_r1dbg.txt, o_r1_e1.txt, o_r1_e2.txt, o_r1_perf.txt.
- `shots/`: *_R1_01_L12_rings, *_R1_02_L12_zoom, *_R1_03_L12_cb, play wins, lose states, landscape.
- Tools: `tools/foldprint/` (r1fp.mjs, r1dbg.mjs added). Playwright was reinstalled under `tools/node_modules`.
