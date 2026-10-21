# Foldprint — build notes

## Concept

- Game ID: GF-20261021-01
- Brief: v1, 2026-10-21, copied verbatim to `BRIEF.md`
- Summary: Fold a cream sheet along its creases. Wet paint prints onto the mirror cell, both sides keep the union, and primaries mix. Paint never comes off. A crease can be pressed again. Match the pencil stencil before the stamps run out.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, Palatino/Georgia, Canvas 2D, synthesised WebAudio. No build step and no network assets. The fold rule, the policies, and the solver live in `logic.js`.
- Mechanics: drag a crease tab across the line. Past halfway, the smaller side folds, presses, and peels open. A ghost print shows the result while the finger moves, with a red cross on any cell that would smudge. Release early and the flap springs back, no stamp spent. Tap a tab, then Press, does the same commit. Smudge and undo each spend a stamp. Fresh sheet is free. One hint per sheet pulses the next crease on a shortest safe path, or says the sheet cannot be finished. A hinted clear is never three stars.
- Loop: the 12 brief levels, named for flavour only. Presses = par + 2. Stars: 3 with two stamps left and no hint, 2 with one left (or two left after a hint), 1 with none left. Progress is `localStorage` key `foldprint-progress-v1`.
- Controls: drag, or tap then Press. Undo, Fresh, Menu. Keys 1–9 select a crease, Enter presses, Z undoes, R asks before a fresh sheet, H hints, Esc opens the menu. Long-press a blob to read its colour. Patterns in the menu draw dots, stripes, and waves for red, yellow, and blue.
- Animation and visuals: a printmaker’s desk. Cream paper, gouache blobs, dashed creases, wax tiles with a drop. The flap scales flat around the crease (about 0.35 s shut, 0.12 s squash, 0.30 s peel). The last press is heavier, the outlines drop away, and the sheet lifts toward a peg line. A second press of the same crease labels “Bounced back”.
- Physics: none. Paint is an integer bitmask. R=1, Y=2, B=4. Wax is −1 and never gives or takes paint.

## Scope

- Done: the twelve levels, the reference fold, live preview, smudge revert, undo, stuck, out of presses, stars, hint, stencil card, colour-blind patterns, portrait lock, save, level select, synth sound, and a quiet tone loop.
- Simplified: the fold is a flat scale, not a 3D hinge. Paint is a soft blob rather than a scanned gouache texture. The music is two quiet synth tones, not a recorded loop. There is no gallery of past prints and no generator. The tutorial line sits under the title instead of a floating bubble.
- Deferred: gallery meta, daily print, stamp cells, masking tape, diagonal creases, boosters.
- Limitations: par is shown on the clear screen, not before the first win. A fold that changes nothing still spends a stamp, matching the reference note.

## Design decisions

- `fold()` reads the pre-press sheet only and writes the union onto both cells, skipping any pair that touches wax. The logic test replays the reference simulator on every crease and on random sequences.
- The smaller side folds onto the larger. A centre crease folds left onto right, or top onto bottom. Direction does not change the print.
- The Fresh button restarts at once. The R key asks first, as the brief separates those two.
- The canvas backing store uses `min(devicePixelRatio, 1.5)` on both axes. Idle frames do not repaint, so they stay pixel-identical.
- Input is ignored during the fold and for 340 ms after an overlay closes.

## Testing

| Item | Result | Evidence |
| --- | --- | --- |
| Rule matches the reference `fold` | PASS | Every crease on all 12 levels, plus 12 random sequences each. `foldprint/tests/logic.test.mjs` |
| Preview equals the committed print | PASS | Same test, including the smudge crosses |
| I.3 solutions finish at par | PASS | All 12 sequences. BFS par equals the brief |
| Smudge reverts and spends a press | PASS | L4: H1, then H4. Sheet unchanged, one stamp gone |
| Stuck on L3 | PASS | V3 first. Undo restores the sheet. Browser opens “No clean fold left” |
| Out of presses | PASS | L4 stamp burn opens “Out of presses” |
| Undo spends a press | PASS | L2 fold then undo returns the start with two stamps spent |
| Hint blocks 3★ | PASS | A par clear with the hint flag is 2★ |
| D1 random, smudges included | PASS | L7–L12 clear ≤ 6% over 1000 seeds. Shared RNG 20261021 |
| D2 one-step safe | PASS | ≤ 10% on L7–L12, ≤ 20% on L4–L6 |
| D3 two-step safe | PASS | ≤ 20% on L7–L12 |
| D4 greedy most-paint | PASS | 0% on L3–L12 |
| D5 least-paint first | PASS | ≤ 30% clear and ≤ 5% 3★ on L4–L12 |
| D6 outer / inner flap | PASS | 0% on L6–L12. L5 outer 51.2% (≤ 55%) |
| D7 vertical / horizontal first | PASS | ≤ 15% on L7–L12 |
| D8 each crease once | PASS | ≤ 16% on L7–L12, and no once-each order solves them |
| D9 hint at the best press | PASS | SAFE2 + one hint ≤ 55% on L7–L12. Highest is L8 at 164/300 |
| D10 preview fishing | DROPPED | Accepted by the brief: the preview is the one-step safe view, which D2 already fails |
| P1 optimal planner | PASS | 100% at par on every level |
| P2 every crease necessary | PASS | Removing any crease makes the target unreachable |
| P3 every wax cell necessary | PASS | L10–L12, both wax cells change par or solvability |
| P4 L12 hardest | PASS | Lowest SAFE1 (0.6%) and SAFE2 (1.1%) on the 1000-seed run |
| Cells ≥ 52 px and tabs on screen at 360 | PASS | 58 px cells at 360×800. Tab centres stay inside. Buttons are 48 px |
| Eight-viewport drag | PASS | 360, 375, 390, 393, 412, 430, 768×1024, 1440. Each solves L1 by a real touch drag |
| Landscape rotate prompt | PASS | 844×390 shows only “Turn to portrait”. A tap spends nothing |
| Overlay lock | PASS | After the menu closes, an immediate press does not fold |
| Idle frames identical | PASS | Two animation frames of a settled L1 match |
| 50 fps at 4× during a dragged solve | PASS | L7 Bounce Back, 390×844, deviceScaleFactor 2, buffer scale 1.5 (585 wide), 4× CPU. Three-run minimums of 59.6 and 59.7 fps |
| Portrait frame | PASS | Desktop letterbox at 9:19.5. Phones fill the screen. Buffer scale is uniform |
| H2–H5 human play | DROPPED | Section M.2 is for Game Tester |
| Gallery meta, generator, recorded music | DROPPED | Optional or future in sections J and K |

Unverified: haptic tick on a real phone, and whether the rebound reads as an “aha” for a person. Both need a device and Game Tester.

Repro: `node --test --test-timeout=180000 foldprint/tests/logic.test.mjs foldprint/tests/browser.test.mjs`

## Delivery

- URL: https://brerdem.github.io/games/foldprint/
- Commit: initial Foldprint on `main`
- Build: GitHub Actions workflow `ci`, job `foldprint`
- Game Tester: ready for a first pass against section M. The fold theme is shared with paper-fold toys; the contact-print rules are not. That flag is for Burak, not a silent change.
